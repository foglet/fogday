# fogday.com/ucsf: UCSF shuttles on one map

Single-file mobile web app. Edit `template.html`, run `python3 build.py`, commit `../index.html`.

## What it shows
- Every UCSF shuttle route (14 routes, 32 stops) from the official GTFS feed.
- Shuttles running now. Without a live feed, positions are estimated from the schedule
  (hollow dots, "Sched"). With the live proxy set, GPS positions replace the estimates
  route by route (filled dots, "Live").
- "Show shuttles near me": asks for location, sorts shuttles by distance, lists the 5
  nearest stops with the next departures (90 minutes ahead, two per route).
- Tap a route to show only that route; tap again for all. Choice is kept in localStorage (`ucsf:route`).

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
