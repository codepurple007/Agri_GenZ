/**
 * Proxies OSM Nominatim (cannot be called directly from browsers — CORS + policy).
 * Autocomplete-as-you-type: GET /api/v1/geo/suggest?q=add
 * Reverse: GET /api/v1/geo/reverse?lat=&lon=
 */
import { Router } from "express";

const GEO_UA = "AgriGenZ/1.0 (district agri SMS demo; contact: local admin)";

const router = Router();

async function nominatimJson(urlObj) {
  const r = await fetch(urlObj, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": GEO_UA,
    },
  });
  if (!r.ok) throw new Error(`nom_${r.status}`);
  return r.json();
}

router.get("/suggest", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    return res.json({ ok: true, results: [] });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "10");
    url.searchParams.set("countrycodes", "et");
    const data = await nominatimJson(url);
    const results = (Array.isArray(data) ? data : []).map((item) => ({
      display_name: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon),
    }));
    return res.json({
      ok: true,
      results: results.filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon)),
      attribution: "© OpenStreetMap contributors (Nominatim)",
    });
  } catch (e) {
    console.error("[geo suggest]", e);
    return res.status(502).json({ ok: false, error: "geocode_upstream", results: [] });
  }
});

router.get("/reverse", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ ok: false, error: "bad_coords", message: "Missing lat/lon." });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));

    const data = await nominatimJson(url);
    const label = typeof data.display_name === "string" ? data.display_name : "";
    return res.json({
      ok: true,
      display_name: label,
      lat,
      lon,
      attribution: "© OpenStreetMap contributors (Nominatim)",
    });
  } catch (e) {
    console.error("[geo reverse]", e);
    return res.status(502).json({ ok: false, error: "geocode_upstream" });
  }
});

export default router;
