# fogday.com/sh: San Francisco Shuttles (Mission Bay TMA, UCSF, PresidiGo, Golden Gate Park) on one map (was /mb/ and /ucsf/, which now redirect here)

Single-file mobile web app. Edit `shell.html` (page, styles) and `app_head.js` / `engine.js` / `app_tail.js` (script), run `python3 build.py`, commit `../index.html`. The page has Jekyll front matter (for the maps menu, `_data/maps.yml`), so the script must hold no Liquid; build.py checks.

## What it shows
Full-screen map in the /treesf/ and /transit/ interface: title + all-maps menu top left; light/dark toggle and bento (to /works/) top right, as in the site header; legend bottom left; Mapbox controls bottom right.
- Mission Bay | UCSF switch (segmented control as on /treesf/) above Info: shows one operator (lines, stops, shuttles, service lines, next departures) and zooms to its routes. Mission Bay is the default; not remembered.
- No color legend. Tap a route line to select it; it stays selected (another line switches). The title, or a reload, brings back all routes (the selection is not remembered).
- Bottom left, bottom up: the Info toggle (starts shut, `ucsf:info`), the service lines, and (open) the notes.
- Weekends: one line only, "No weekend service"; no next-departure line and no near-you departures in Info.
- Routes sharing a street are drawn side by side (offset slots per stretch, computed in the page).
- Shuttles running now: hollow dots are schedule estimates; filled dots are live GPS once the proxy is set.
- Location: starts by itself (watchPosition, blue dot); the crosshair above the compass flies back to you (same place as /treesf/). Info lists the 3 nearest stops with departures.
- Dark mode quiets the Spy style: its lime-to-green lines (paths, tunnels) are muted and faded at load (quietBasemap), and routes use a night palette (NIGHT in engine.js).
- Light / dark: sun or moon above the crosshair. Shares `fogday-theme` with the site header toggle; with no saved choice it follows the system. Switching reloads the Mapbox style (light-v11 / the Spy map style, fogfish/cilhmh2ah00959gm3fy54zuik) and re-adds the layers.
- Info (inside the legend): near-you departures, how positions are made, data sources.

## Data
- Static: `https://ucsf.tripshot.com/v1/gtfs.zip` (Transitland `f-ucsf~shuttle~ca~us`).
  `data/gtfs-compact.json` is a compacted copy: shapes simplified to 3 m and delta encoded
  (lat/lon x 1e5), trips stored as stop patterns plus start time, calendar dates from
  2026-11-01 on. Times are seconds after midnight, America/Los_Angeles.
- Live: GTFS-realtime `https://ucsf.tripshot.com/v1/gtfs/realtime/vehiclePositions?regionId=CA558DDC-D7F2-4B48-9CAC-DEEA1134F820`.
  No CORS header, so the page needs `worker.js` (Cloudflare Worker) in between. Set its URL in
  `build.py` (`config["live"]`), or test with `?live=https://...` on the page.
  Vehicles are matched to routes by `trip.route_id`, falling back to the vehicle label prefix
  (labels look like "Gold D", "Grey E").
- Other UCSF endpoints seen: `https://ucsf.tripshot.com/v1/p/liveStatus` (vehicles + rides JSON),
  `https://campuslifeservices.ucsf.edu/nexus/api/shuttle/tripshot/v1/getRouteGroups.php` and
  `getFullGroupFeed.php?routeGroupId=` (used by liveshuttle.ucsf.edu). All CORS-restricted.

- Mission Bay TMA: `https://data.trilliumtransit.com/gtfs/missionbaytma-ca-us/missionbaytma-ca-us.zip` (Transitland
  `f-9q8yy-missionbaytma~ca~us`, version 6de76c21, service 2026-09-25 to 2027-02-12). 4 routes (East, Transbay-Caltrain,
  CCA/Adobe, West), 19 stops, weekdays, holiday exceptions and a reduced Christmas-week schedule. Compacted to
  `data/mbtma-compact.json` (same layout, route ids prefixed `mbtma:`, `ag: "mbtma"`); build.py merges it into the UCSF
  data, shifting its indices. Fetched through a browser (the sandbox can't reach Trillium); frequencies.txt is empty.

- PresidiGo: `https://presidiobus.com/gtfs` (GMV Syncromatics; Transitland `f-presidigo~ca~us`, version 42b15793,
  service from 2026-06-27). Routes Downtown (express to Embarcadero BART) and South Hills; weekdays and weekends.
  `data/presidigo-compact.json`, `ag: "presidio"`. Transitland also lists GTFS-realtime for it (`f-presidigo~ca~us~rt`).
- Golden Gate Park Free Shuttle: GTFS linked from https://sfrecpark.org/1617/Golden-Gate-Park-Free-Shuttle
  (`/DocumentCenter/View/25114/gtfs-1`, SHA1 7899384a). Its calendar ended 2025-12-31; the page still describes the same
  service (weekends and holidays 9 to 6 every 15 min, weekdays noon to 6 every 25 min), so `data/ggp-compact.json`
  extends the end date to 2027-12-31 and Info says so. Holidays are not in the file (they run as weekdays here).
  `ag: "ggp"`. Replace the file when Rec and Park publishes a current one.
- Switch order: Mission Bay | UCSF | Presidio | GG Park (`data-ag` mbtma, ucsf, presidio, ggp). Weekend line
  "No weekend service" shows only for an operator with no trips that day.

- Oyster Point BART (Commute.org): Trillium GTFS `https://data.trilliumtransit.com/gtfs/commute-ca-us/commute-ca-us.zip`
  (Transitland `f-9q9j-commute~ca~us`), route 76230 only, compacted in the browser pane with `/home/claude/tools/gtfs_compact.js`
  (copy in this README's history). `data/opb-compact.json`, `ag: "oyster"`. Thanksgiving 2026-11-26/27 added to the
  exceptions (commute.org lists them; the feed does not). The feed also has Oyster Point Caltrain (76231) and Ferry (76232).
- Free South City Shuttle (City of South San Francisco): no GTFS. `data/ssf_build.py` builds `data/ssf-compact.json`
  (`ag: "ssf"`) from `data/ssf-timetable.json` (every time in the city's 2025-2027 schedule PDF, read from the PDF's
  text in the browser pane) and `data/ssf-ips.json` (stops and route lines from the city's live tracker, IPS Sentry
  site 19, `/MobileSentryAPI/Settings`). Blue clockwise, Green counterclockwise, Orange western; weekdays, city holidays off
  (2027 observed dates are my reading of the city's holiday list). Tracker lines are coarse, so lines cut some corners.
- Picker (replaced the switch): the system's name in the tides blue, bold slab serif (Roboto Slab), 1.5em; tap for the next. Order: Mission Bay (default),
  UCSF, Presidio, Golden Gate Park, Oyster Point, South City (`OPS` in app_tail.js).

## Refresh the schedule
The sandbox cannot reach tripshot.com. Open `https://ucsf.tripshot.com/` in a browser, then in its
console fetch `/v1/gtfs.zip`, unzip, and rebuild the compact JSON with the same layout
(see the keys in `data/gtfs-compact.json`). The feed covers service to 2027-10-19.

## Known limits
- Weekday service only (no weekend trips in the feed).
- Schedule estimates do not know about delays, detours or cancelled runs.
