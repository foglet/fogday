// Cloudflare Worker: read-only CORS proxy for the UCSF shuttle GTFS-realtime feed.
// GitHub Pages cannot proxy, and ucsf.tripshot.com sends no CORS header, so the
// browser on fogday.com cannot read the live feed directly.
//
// Deploy: Cloudflare dashboard > Workers > Create > paste this file > Deploy.
// Then put the worker URL (for example https://ucsf-live.<you>.workers.dev) in
// build.py as config["live"] and rebuild. Test first with fogday.com/ucsf/?live=<url>.

const REGION = "CA558DDC-D7F2-4B48-9CAC-DEEA1134F820";
const BASE = "https://ucsf.tripshot.com/v1/gtfs/realtime/";
const FEEDS = new Set(["vehiclePositions", "tripUpdates", "serviceAlerts"]);
const ORIGINS = new Set(["https://fogday.com", "https://www.fogday.com"]);

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://fogday.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "GET") return new Response("GET only", { status: 405, headers: cors });

    const feed = new URL(req.url).pathname.replace(/^\/+/, "");
    if (!FEEDS.has(feed)) return new Response("Not found", { status: 404, headers: cors });

    // a 10 second shared cache keeps load on TripShot to about 6 requests a minute
    const cache = caches.default;
    const key = new Request("https://cache.local/" + feed);
    let res = await cache.match(key);
    if (!res) {
      const up = await fetch(BASE + feed + "?regionId=" + REGION, { headers: { "User-Agent": "fogday.com/ucsf" } });
      if (!up.ok) return new Response("Upstream " + up.status, { status: 502, headers: cors });
      res = new Response(await up.arrayBuffer(), {
        headers: { "Content-Type": "application/x-protobuf", "Cache-Control": "public, max-age=10" },
      });
      ctx.waitUntil(cache.put(key, res.clone()));
    }
    const out = new Response(res.body, res);
    Object.entries(cors).forEach(([k, v]) => out.headers.set(k, v));
    return out;
  },
};
