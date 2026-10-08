(() => {
  const byId = (id) => document.getElementById(id);
  const stationSelect = byId("station-select");
  const favoriteToggle = byId("favorite-toggle");
  const favoriteStations = byId("favorite-stations");
  const results = byId("results");
  const stationTitle = byId("station-title");
  const status = byId("feed-status");
  const dayMode = byId("day-mode");

  const directionLabels = {
    towardVillaRosa: "Villa Rosa",
    towardRetiro: "Retiro",
  };
  const stationAliases = {
    "Aristóbulo del Valle": ["A. del Valle", "Aristobulo del Valle"],
    "Boulogne Sur Mer": ["Boulogne", "Montes"],
    "Manuel Alberti": ["M. Alberti"],
  };

  let timetable = null;
  let selectedStationIndex = null;
  let direction = "towardVillaRosa";
  const favoritesKey = "anden-belgrano-norte-favorites";
  let favorites = loadFavorites();

  function loadFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(favoritesKey) || "[]");
      return Array.isArray(saved) ? saved.filter((name) => typeof name === "string") : [];
    } catch {
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function normalize(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function setStatus(message, isReady = false) {
    status.innerHTML = `<span class="statusdot ${isReady ? "live" : ""}"></span><span>${escapeHtml(message)}</span>`;
  }

  function getServiceDay(date) {
    if (dayMode.value !== "auto") return dayMode.value;
    const weekday = date.getDay();
    if (weekday === 0) return "sundayHoliday";
    if (weekday === 6) return "saturday";
    return "weekday";
  }

  function chooseStation(index) {
    selectedStationIndex = index;
    stationSelect.value = String(index);
    favoriteToggle.disabled = false;
    updateFavoriteControls();
    renderSchedule();
  }

  function updateFavoriteControls() {
    const selectedName = selectedStationIndex === null ? null : timetable.stations[selectedStationIndex];
    const isFavorite = selectedName !== null && favorites.includes(selectedName);
    favoriteToggle.textContent = isFavorite ? "★" : "☆";
    favoriteToggle.setAttribute("aria-pressed", String(isFavorite));
    favoriteToggle.setAttribute("aria-label", isFavorite ? "Quitar estación de Favoritas" : "Marcar estación como favorita");

    favoriteStations.innerHTML = favorites.length
      ? favorites.map((name) => `<button class="chip favorite-chip${name === selectedName ? " active-favorite" : ""}" data-favorite="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")
      : '<span class="favorites-empty">Tus estaciones favoritas aparecerán aquí.</span>';
    favoriteStations.querySelectorAll("[data-favorite]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = timetable.stations.indexOf(button.dataset.favorite);
        if (index >= 0) chooseStation(index);
      });
    });
  }

  function toggleFavorite() {
    if (selectedStationIndex === null) return;
    const name = timetable.stations[selectedStationIndex];
    favorites = favorites.includes(name) ? favorites.filter((favorite) => favorite !== name) : [...favorites, name];
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
    updateFavoriteControls();
  }

  function localDateLabel(date, offset) {
    if (offset === 0) return "Hoy";
    if (offset === 1) return "Mañana";
    return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date);
  }

  function getUpcomingDepartures(now) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const departures = [];

    for (let offset = 0; offset < 8 && departures.length < 4; offset += 1) {
      const date = new Date(midnight);
      date.setDate(midnight.getDate() + offset);
      const serviceDay = getServiceDay(date);
      const services = timetable.days[serviceDay][direction];

      for (const service of services) {
        const time = service.times[selectedStationIndex];
        if (!time) continue; // Blank cells in the PDF mean this train does not stop here.

        const [hour, minute] = time.split(":").map(Number);
        const departureAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
        if (departureAt < now) continue;

        departures.push({
          train: service.train,
          time,
          departureAt,
          dayLabel: localDateLabel(date, offset),
          serviceDay,
        });
      }
      departures.sort((a, b) => a.departureAt - b.departureAt);
    }

    return departures.slice(0, 4);
  }

  function formatWait(minutes) {
    if (minutes <= 0) return "Ahora";
    if (minutes < 60) return `en ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `en ${hours} h ${remainder} min` : `en ${hours} h`;
  }

  function renderSchedule() {
    if (!timetable || selectedStationIndex === null) return;

    const now = new Date();
    const station = timetable.stations[selectedStationIndex];
    const destination = directionLabels[direction];
    const dayLabel = dayMode.value === "auto"
      ? timetable.dayTypes[getServiceDay(now)]
      : `${timetable.dayTypes[dayMode.value]} · selección manual`;
    const departures = getUpcomingDepartures(now);

    stationTitle.textContent = station;
    byId("local-clock").innerHTML = `Hora local <span class="clock-reading">${new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(now)}</span>`;
    setStatus(`${dayLabel} · hacia ${destination}`, true);

    if (!departures.length) {
      results.innerHTML = '<div class="empty"><strong>No encontramos horarios futuros</strong>Revisa el día de servicio seleccionado o consulta el PDF de referencia.</div>';
      return;
    }

    results.innerHTML = `<div class="arrivals">${departures.map((departure) => {
      const wait = Math.max(0, Math.ceil((departure.departureAt.getTime() - now.getTime()) / 60000));
      return `<article class="arrival">
        <div class="time">${escapeHtml(departure.time)}</div>
        <div><div class="destination">Tren ${escapeHtml(departure.train)} · hacia ${escapeHtml(destination)}</div>
        <div class="arrival-date">${escapeHtml(departure.dayLabel)} · ${escapeHtml(timetable.dayTypes[departure.serviceDay])}</div></div>
        <div class="countdown"><strong>${escapeHtml(formatWait(wait))}</strong>horario previsto</div>
      </article>`;
    }).join("")}</div>`;
  }

  function updateDirectionButtons(activeButton) {
    document.querySelectorAll("[data-direction]").forEach((button) => {
      const isSelected = button === activeButton;
      button.setAttribute("aria-pressed", String(isSelected));
      button.classList.toggle("selected-direction", isSelected);
    });
  }

  async function loadTimetable() {
    try {
      const response = await fetch("data/schedule.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      timetable = await response.json();
      if (timetable.stations.length !== 23) throw new Error("La tabla no tiene 23 estaciones.");
      stationSelect.innerHTML = '<option value="">Elige una estación…</option>' + timetable.stations
        .map((name, index) => `<option value="${index}">${escapeHtml(name)}</option>`).join("");
      favorites = favorites.filter((name) => timetable.stations.includes(name));
      updateFavoriteControls();
      setStatus(`Horario ${timetable.source.title} cargado · ${timetable.stations.length} estaciones`, true);
    } catch (error) {
      setStatus("No se pudo cargar el horario local.");
      results.innerHTML = '<div class="error"><strong>No pudimos abrir la tabla de horarios.</strong><br>Comprueba que src/data/schedule.json esté en la carpeta del proyecto.</div>';
    }
  }

  stationSelect.addEventListener("change", () => {
    if (stationSelect.value === "") {
      selectedStationIndex = null;
      favoriteToggle.disabled = true;
      favoriteToggle.textContent = "☆";
      favoriteToggle.setAttribute("aria-pressed", "false");
      stationTitle.textContent = "Elige una estación";
      results.innerHTML = '<div class="empty"><strong>Tu tren, desde tu estación</strong>Selecciona una parada para ver las próximas salidas según el horario local de tu dispositivo.</div>';
      updateFavoriteControls();
      return;
    }
    chooseStation(Number(stationSelect.value));
  });
  favoriteToggle.addEventListener("click", toggleFavorite);
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      direction = button.dataset.direction;
      updateDirectionButtons(button);
      renderSchedule();
    });
  });
  dayMode.addEventListener("change", renderSchedule);

  if (document.modelContext?.registerTool) {
    const controller = new AbortController();
    try {
      document.modelContext.registerTool({
        name: "select_belgrano_norte_station",
        title: "Consultar próximo tren",
        description: "Elige una estación del Belgrano Norte y muestra los siguientes horarios programados desde el reloj local del dispositivo.",
        inputSchema: {
          type: "object",
          properties: {
            station: { type: "string", description: "Nombre de una estación" },
            direction: { type: "string", enum: ["towardVillaRosa", "towardRetiro"] },
            serviceDay: { type: "string", enum: ["auto", "weekday", "saturday", "sundayHoliday"] },
          },
          required: ["station"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          if (!timetable) await loadTimetable();
          if (input.direction) {
            direction = input.direction;
            const directionButton = document.querySelector(`[data-direction="${direction}"]`);
            if (directionButton) updateDirectionButtons(directionButton);
          }
          if (input.serviceDay) dayMode.value = input.serviceDay;
          const match = timetable.stations.findIndex((name) => normalize(name) === normalize(String(input.station || ""))
            || (stationAliases[name] || []).some((alias) => normalize(alias) === normalize(String(input.station || ""))));
          if (match >= 0) chooseStation(match);
          return { station: stationTitle.textContent, direction, departures: results.innerText.slice(0, 1200) };
        },
      }, { signal: controller.signal });
    } catch {
      // WebMCP is optional; the visible controls continue to work.
    }
  }

  loadTimetable().then(() => {
    window.setInterval(renderSchedule, 30_000);
  });
})();
