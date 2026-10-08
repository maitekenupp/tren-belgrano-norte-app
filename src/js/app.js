(() => {
  const byId = (id) => document.getElementById(id);
  const stationSelect = byId("station-select");
  const favoriteToggle = byId("favorite-toggle");
  const favoriteStations = byId("favorite-stations");
  const favoritesTrack = byId("favorites-track");
  const results = byId("results");
  const stationTitle = byId("station-title");
  const fullSchedule = byId("full-schedule");
  const fullTimes = byId("full-times");
  const fullOrigin = byId("full-origin");
  const fullDestination = byId("full-destination");
  const fullTabs = Array.from(document.querySelectorAll("[data-full-day]"));
  const status = byId("feed-status");
  const dayMode = byId("day-mode");

  if (window.matchMedia("(max-width: 760px)").matches) byId("station-settings").open = false;

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
  let fullScheduleDay = null;
  const favoritesKey = "anden-belgrano-norte-favorites";
  const lastStationKey = "anden-belgrano-norte-last-station";
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
    if (fullOrigin) fullOrigin.value = String(index);
    correctDirectionForRoute();
    try {
      localStorage.setItem(lastStationKey, timetable.stations[index]);
    } catch {
      // The station still works when browser storage is unavailable.
    }
    favoriteToggle.disabled = false;
    updateFavoriteControls();
    if (window.matchMedia("(max-width: 760px)").matches) byId("station-settings").open = false;
    renderSchedule();
    renderFullSchedule();
  }

  function correctDirectionForRoute() {
    if (selectedStationIndex === null || !fullDestination?.value) return;
    const destinationIndex = Number(fullDestination.value);
    if (destinationIndex === selectedStationIndex) {
      fullDestination.value = "";
      return;
    }
    direction = destinationIndex > selectedStationIndex ? "towardVillaRosa" : "towardRetiro";
    updateDirectionButtons();
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
    updateFavoritesScrollHints();
  }

  function updateFavoritesScrollHints() {
    const maxScroll = favoriteStations.scrollWidth - favoriteStations.clientWidth;
    const canScroll = window.matchMedia("(max-width: 760px)").matches && maxScroll > 2;
    favoritesTrack.classList.toggle("has-more-left", canScroll && favoriteStations.scrollLeft > 2);
    favoritesTrack.classList.toggle("has-more-right", canScroll && favoriteStations.scrollLeft < maxScroll - 2);
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
        const stationUntil = departureAt.getTime() + 60_000;
        if (stationUntil <= now.getTime()) continue;

        departures.push({
          train: service.train,
          time,
          departureAt,
          stationUntil,
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
    const now = new Date();
    byId("local-clock").textContent = new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(now);

    if (!timetable || selectedStationIndex === null) return;

    const station = timetable.stations[selectedStationIndex];
    const destination = directionLabels[direction];
    const dayLabel = dayMode.value === "auto"
      ? timetable.dayTypes[getServiceDay(now)]
      : `${timetable.dayTypes[dayMode.value]} · selección manual`;
    const departures = getUpcomingDepartures(now);

    stationTitle.textContent = station;
    setStatus(`${dayLabel} · hacia ${destination}`, true);

    if (!departures.length) {
      results.innerHTML = '<div class="empty"><strong>No encontramos horarios futuros</strong>Revisa el día de servicio seleccionado o consulta el PDF de referencia.</div>';
      return;
    }

    results.innerHTML = `<div class="arrivals">${departures.map((departure, index) => {
      const atStation = now.getTime() >= departure.departureAt.getTime() && now.getTime() < departure.stationUntil;
      const wait = Math.max(0, Math.ceil((departure.departureAt.getTime() - now.getTime()) / 60000));
      return `<article class="arrival${index === 0 ? " next-arrival" : ""}">
        <div class="time">${escapeHtml(departure.time)}</div>
        <div class="arrival-info"><div class="destination">Tren ${escapeHtml(departure.train)} · hacia ${escapeHtml(destination)}</div>
        ${departure.dayLabel === "Hoy" ? "" : `<div class="arrival-date">${escapeHtml(departure.dayLabel)} · ${escapeHtml(timetable.dayTypes[departure.serviceDay])}</div>`}</div>
        <div class="countdown"><strong class="${atStation ? "at-station" : ""}">${atStation ? "Tren en estación" : escapeHtml(formatWait(wait))}</strong><span>${atStation ? "salida prevista" : "horario previsto"}</span></div>
      </article>`;
    }).join("")}</div>`;
  }

  function renderFullSchedule(now = new Date()) {
    if (!timetable || selectedStationIndex === null) {
      fullSchedule.hidden = true;
      return;
    }

    const activeDay = fullScheduleDay || getServiceDay(now);
    fullSchedule.hidden = false;
    fullTabs.forEach((tab) => {
      const isSelected = tab.dataset.fullDay === activeDay;
      tab.setAttribute("aria-selected", String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      tab.classList.toggle("active-tab", isSelected);
    });
    byId("full-schedule-panel").setAttribute("aria-labelledby", fullTabs.find((tab) => tab.dataset.fullDay === activeDay).id);

    const originIndex = fullOrigin?.value === "" || fullOrigin?.value === undefined
      ? selectedStationIndex : Number(fullOrigin.value);
    const destinationIndex = fullDestination?.value ? Number(fullDestination.value) : null;
    const services = timetable.days[activeDay][direction];
    const trips = services.map((service) => ({
      departure: service.times[originIndex],
      arrival: destinationIndex === null ? null : service.times[destinationIndex],
    })).filter((trip) => {
      if (!trip.departure) return false;
      if (destinationIndex === null) return true;
      const travelsForward = direction === "towardVillaRosa"
        ? destinationIndex > originIndex : destinationIndex < originIndex;
      return travelsForward && Boolean(trip.arrival);
    }).sort((a, b) => a.departure.localeCompare(b.departure));
    fullTimes.classList.toggle("departure-grid", destinationIndex === null);
    fullTimes.innerHTML = trips.length
      ? trips.map((trip) => destinationIndex === null
        ? `<div class="route-time-row single-departure" tabindex="0" role="button" aria-pressed="false" aria-label="Horario de salida ${escapeHtml(trip.departure)}"><time class="full-time" datetime="${trip.departure}">${escapeHtml(trip.departure)}</time></div>`
        : `<div class="route-time-row" tabindex="0" role="button" aria-pressed="false" aria-label="Salida ${escapeHtml(trip.departure)}, llegada ${escapeHtml(trip.arrival)}"><div class="route-time-point"><span>Salida</span><time class="full-time" datetime="${trip.departure}">${escapeHtml(trip.departure)}</time></div><span class="route-arrow" aria-hidden="true">→</span><div class="route-time-point"><span>Llegada</span><time class="full-time" datetime="${trip.arrival}">${escapeHtml(trip.arrival)}</time></div></div>`).join("")
      : `<p class="full-empty">${destinationIndex === null ? "No hay salidas para esta estación y este sentido." : "No hay viajes directos entre estas estaciones en este sentido."}</p>`;
  }

  function updateDirectionButtons() {
    document.querySelectorAll("[data-direction]").forEach((button) => {
      const isSelected = button.dataset.direction === direction;
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
      fullOrigin.innerHTML = timetable.stations
        .map((name, index) => `<option value="${index}">${escapeHtml(name)}</option>`).join("");
      fullDestination.innerHTML = '<option value="">Elige una estación</option>' + timetable.stations
        .map((name, index) => `<option value="${index}">${escapeHtml(name)}</option>`).join("");
      favorites = favorites.filter((name) => timetable.stations.includes(name));
      setStatus(`Horario ${timetable.source.title} cargado · ${timetable.stations.length} estaciones`, true);
      let savedStation = null;
      try {
        savedStation = localStorage.getItem(lastStationKey);
      } catch {
        // The timetable remains usable when browser storage is unavailable.
      }
      const savedStationIndex = timetable.stations.indexOf(savedStation);
      if (savedStationIndex >= 0) chooseStation(savedStationIndex);
      else updateFavoriteControls();
    } catch (error) {
      setStatus("No se pudo cargar el horario local.");
      results.innerHTML = '<div class="error"><strong>No pudimos abrir la tabla de horarios.</strong><br>Comprueba que src/data/schedule.json esté en la carpeta del proyecto.</div>';
    }
  }

  stationSelect.addEventListener("change", () => {
    if (stationSelect.value === "") {
      selectedStationIndex = null;
      try {
        localStorage.removeItem(lastStationKey);
      } catch {
        // Clearing the selection remains available without browser storage.
      }
      favoriteToggle.disabled = true;
      favoriteToggle.textContent = "☆";
      favoriteToggle.setAttribute("aria-pressed", "false");
      stationTitle.textContent = "Elige una estación";
      results.innerHTML = '<div class="empty"><strong>Tu tren, desde tu estación</strong>Selecciona una parada para ver las próximas salidas según el horario local de tu dispositivo.</div>';
      updateFavoriteControls();
      renderFullSchedule();
      return;
    }
    chooseStation(Number(stationSelect.value));
  });
  favoriteToggle.addEventListener("click", toggleFavorite);
  favoriteStations.addEventListener("scroll", updateFavoritesScrollHints, { passive: true });
  window.addEventListener("resize", updateFavoritesScrollHints);
  document.querySelectorAll("[data-favorite-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const amount = Number(button.dataset.favoriteScroll) * Math.max(120, favoriteStations.clientWidth * 0.7);
      favoriteStations.scrollBy({ left: amount, behavior: "smooth" });
    });
  });
  fullOrigin.addEventListener("change", () => {
    if (fullOrigin.value !== "") chooseStation(Number(fullOrigin.value));
  });
  fullDestination.addEventListener("change", () => {
    correctDirectionForRoute();
    renderSchedule();
    renderFullSchedule();
  });
  fullTimes.addEventListener("click", (event) => {
    const row = event.target.closest(".route-time-row");
    if (!row) return;
    const wasSelected = row.classList.contains("selected-route-time");
    fullTimes.querySelectorAll(".route-time-row").forEach((item) => {
      item.classList.remove("selected-route-time");
      item.setAttribute("aria-pressed", "false");
    });
    if (!wasSelected) {
      row.classList.add("selected-route-time");
      row.setAttribute("aria-pressed", "true");
    }
  });
  fullTimes.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".route-time-row")) {
      event.preventDefault();
      event.target.click();
    }
  });
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextDirection = button.dataset.direction;
      if (nextDirection === direction) return;
      const previousOrigin = selectedStationIndex;
      const previousDestination = fullDestination.value === "" ? null : Number(fullDestination.value);
      direction = nextDirection;
      if (previousOrigin !== null && previousDestination !== null) {
        fullDestination.value = String(previousOrigin);
        chooseStation(previousDestination);
      }
      updateDirectionButtons();
      renderSchedule();
      renderFullSchedule();
    });
  });
  fullTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      fullScheduleDay = tab.dataset.fullDay;
      renderFullSchedule();
    });
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextTab = fullTabs[(index + offset + fullTabs.length) % fullTabs.length];
      nextTab.focus();
      nextTab.click();
    });
  });
  dayMode.addEventListener("change", () => {
    renderSchedule();
    renderFullSchedule();
  });

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
            if (directionButton) updateDirectionButtons();
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

  renderSchedule();
  window.setInterval(renderSchedule, 1_000);
  loadTimetable();
})();
