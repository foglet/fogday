# fogday.com/ucsf: UCSF shuttles on one map

Single-file mobile web app. Edit `shell.html` (page, styles) and `app_head.js` / `engine.js` / `app_tail.js` (script), run `python3 build.py`, commit `../index.html`. The page has Jekyll front matter (for the maps menu, `_data/maps.yml`), so the script must hold no Liquid; build.py checks.

## What it shows
Same interface as /treesf/ and /transit/ (dark map, title + maps menu top left, legend bottom left, Mapbox controls bottom right).
- Shuttle Legend: every route with its color and how many shuttles are running. Tap a route (in the legend or on
  the map) to highlight it; tap again for all. Kept in localStorage (`ucsf:route`).
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

## Refresh the schedule
The sandbox cannot reach tripshot.com. Open `https://ucsf.tripshot.com/` in a browser, then in its
console fetch `/v1/gtfs.zip`, unzip, and rebuild the compact JSON with the same layout
(see the keys in `data/gtfs-compact.json`). The feed covers service to 2027-10-19.

## Known limits
- Weekday service only (no weekend trips in the feed).
- Schedule estimates do not know about delays, detours or cancelled runs.
