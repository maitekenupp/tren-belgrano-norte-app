# Andén — Belgrano Norte

[![Open the app](https://img.shields.io/badge/demo-open%20app-2563eb)](https://tren-belgrano-norte-app.pages.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) · [GitHub repository](https://github.com/maitekenupp/tren-belgrano-norte-app)

Andén is an independent web app designed to make Belgrano Norte train schedules quicker to check. It shows upcoming departures from a selected station and lets you look up future timetable entries for a trip between two stations, without searching through a long timetable by hand.

> **Open the app:** [tren-belgrano-norte-app.pages.dev](https://tren-belgrano-norte-app.pages.dev)
>
> The app uses scheduled timetable data stored in the project. It does not receive live train positions or delay predictions. Check official information before traveling.

## Features

- View upcoming departures from a station using the device's local clock.
- Browse future schedules by service day: weekdays, Saturdays, and Sundays/holidays.
- Choose an origin and destination to compare scheduled departure and arrival times.
- Automatically select the train direction based on station order.
- Save favorite stations in the browser.
- Use the responsive interface on desktop and mobile.

## Run locally

**Requirements:** Node.js 18 or later. The app has no external dependencies.

```bash
git clone https://github.com/maitekenupp/tren-belgrano-norte-app.git
cd tren-belgrano-norte-app
npm run dev
```

Open [http://localhost:4173](http://localhost:4173). Press `Ctrl+C` in the terminal to stop the server.

To test on a phone connected to the same Wi-Fi network, open the local network address printed by the server in your terminal. Keep the computer and server running while testing.

## How the timetable works

The timetable is stored in `src/data/schedule.json`, organized by station, direction, and service day. The app compares these scheduled times with the device's local clock to calculate countdowns and show future departures. Origin-to-destination results use the scheduled times for the same train at both stations.

The data currently included was transcribed from **Horario N° 21**, which states an effective date of May 19, 2026. These are scheduled times, not live train movements, and the timetable may become outdated.

## Built with

- HTML, CSS, and vanilla JavaScript
- Node.js built-in modules for the local development server
- JSON timetable data

## License

The original app code is released under the MIT License. You may use, copy, modify, and redistribute it under the terms in [LICENSE](LICENSE). `src/data/schedule.json` contains timetable entries transcribed from a third-party railway schedule; check the original source's terms before reusing or redistributing that data.
