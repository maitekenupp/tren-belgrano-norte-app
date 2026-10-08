#!/usr/bin/env python3
"""Extract the 16 timetable tables in Horario N° 21 into app JSON.

Usage:
  python scripts/import_schedule.py path/to/timetable.pdf

Requires pdfplumber (see requirements-import.txt). The PDF is read-only; only
src/data/schedule.json is written.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import pdfplumber


STATIONS = [
    "Retiro",
    "Saldías",
    "Ciudad Universitaria",
    "Aristóbulo del Valle",
    "M. M. Padilla",
    "Florida",
    "Munro",
    "Carapachay",
    "Villa Adelina",
    "Boulogne Sur Mer",
    "Vice Alte. Montes",
    "Don Torcuato",
    "A. Sourdeaux",
    "Villa de Mayo",
    "Los Polvorines",
    "Ing. Pablo Nogués",
    "Grand Bourg",
    "Tierras Altas",
    "Tortuguitas",
    "Manuel Alberti",
    "Del Viso",
    "Cecilia Grierson",
    "Villa Rosa",
]

PAGE_TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "snap_tolerance": 4,
    "join_tolerance": 4,
    "intersection_tolerance": 6,
}
TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
TRAIN_PATTERN = re.compile(r"^\d{4}$")


def normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn").upper()


def classify_page(title: str) -> tuple[str, str]:
    heading = normalize(title)
    if "DOMINGOS Y FERIADOS" in heading:
        day = "sundayHoliday"
    elif "SABADOS" in heading:
        day = "saturday"
    elif "LUNES A VIERNES" in heading:
        day = "weekday"
    else:
        raise ValueError(f"Unknown service-day heading: {title!r}")

    if "TRENES HACIA VILLA ROSA" in heading:
        direction = "towardVillaRosa"
    elif "TRENES HACIA RETIRO" in heading:
        direction = "towardRetiro"
    else:
        raise ValueError(f"Unknown direction in heading: {title!r}")
    return day, direction


def read_services(pdf_path: Path) -> dict:
    groups = {
        "weekday": {"towardVillaRosa": [], "towardRetiro": []},
        "saturday": {"towardVillaRosa": [], "towardRetiro": []},
        "sundayHoliday": {"towardVillaRosa": [], "towardRetiro": []},
    }
    pages_seen: set[tuple[str, str]] = set()
    source_version = None

    with pdfplumber.open(pdf_path) as pdf:
        if len(pdf.pages) != 16:
            raise ValueError(f"Expected 16 timetable pages; found {len(pdf.pages)}")

        for page_number, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables(table_settings=PAGE_TABLE_SETTINGS)
            if len(tables) != 1:
                raise ValueError(f"Page {page_number}: expected one table, found {len(tables)}")

            table = tables[0]
            if not table or len(table[0]) != len(STATIONS) + 1:
                actual = len(table[0]) if table else 0
                raise ValueError(
                    f"Page {page_number}: expected {len(STATIONS) + 1} columns; found {actual}"
                )

            title = table[0][0] or ""
            day, direction = classify_page(title)
            pages_seen.add((day, direction))
            if source_version is None:
                text = page.extract_text() or ""
                match = re.search(r"VIGENTE DESDE EL (\d{1,2}) DE MAYO DE (\d{4})", normalize(text))
                if match:
                    source_version = f"{int(match.group(2)):04d}-05-{int(match.group(1)):02d}"

            for row in table[2:]:  # first row is the section title, second is the station header
                train = (row[0] or "").strip()
                if not TRAIN_PATTERN.fullmatch(train):
                    continue

                cells = [(value or "").strip() for value in row[1:]]
                invalid = [value for value in cells if value and not TIME_PATTERN.fullmatch(value)]
                if invalid:
                    raise ValueError(f"Page {page_number}, train {train}: invalid cells {invalid}")
                if len(cells) != len(STATIONS):
                    raise ValueError(f"Page {page_number}, train {train}: wrong number of stations")

                times = [value or None for value in cells]
                if direction == "towardRetiro":
                    # The PDF prints the return direction from Villa Rosa to Retiro.
                    times.reverse()
                if not any(times):
                    raise ValueError(f"Page {page_number}, train {train}: no station times")

                groups[day][direction].append({"train": train, "times": times})

    expected = {
        ("weekday", "towardVillaRosa"),
        ("weekday", "towardRetiro"),
        ("saturday", "towardVillaRosa"),
        ("saturday", "towardRetiro"),
        ("sundayHoliday", "towardVillaRosa"),
        ("sundayHoliday", "towardRetiro"),
    }
    if pages_seen != expected:
        raise ValueError(f"Missing timetable sections: {expected - pages_seen}")

    for day, directions in groups.items():
        for direction, services in directions.items():
            if len({service["train"] for service in services}) != len(services):
                raise ValueError(f"Duplicate train numbers in {day}/{direction}")
            services.sort(key=lambda service: service["train"])

    return {
        "source": {
            "title": "Horario N° 21",
            "effectiveFrom": source_version or "2026-05-19",
            "note": "Horarios programados extraídos del PDF proporcionado; no son posiciones ni predicciones en tiempo real.",
        },
        "timezone": "local",
        "stations": STATIONS,
        "dayTypes": {
            "weekday": "Lunes a viernes",
            "saturday": "Sábados",
            "sundayHoliday": "Domingos y feriados",
        },
        "days": groups,
    }


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import_schedule.py <horario.pdf>")

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.is_file():
        raise SystemExit(f"PDF not found: {pdf_path}")

    project_root = Path(__file__).resolve().parents[1]
    output_path = project_root / "src" / "data" / "schedule.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    data = read_services(pdf_path)
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {output_path}")
    for day, directions in data["days"].items():
        counts = ", ".join(f"{direction}: {len(services)}" for direction, services in directions.items())
        print(f"{data['dayTypes'][day]} — {counts}")
    print(f"Stations: {len(data['stations'])}; effective from: {data['source']['effectiveFrom']}")


if __name__ == "__main__":
    main()
