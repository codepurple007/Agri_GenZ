/**
 * Offline suggest/reverse mimic — Ethiopia-focused place names only.
 */
import { ApiError } from "@/api/errors";

const SAMPLE: Array<{ display_name: string; lat: number; lon: number }> = [
  { display_name: "Addis Ababa, Ethiopia", lat: 9.0054, lon: 38.7636 },
  { display_name: "Bahir Dar, Amhara, Ethiopia", lat: 11.6, lon: 37.3833 },
  { display_name: "Hawassa, Sidama, Ethiopia", lat: 7.059, lon: 38.4783 },
  { display_name: "Mekelle, Tigray, Ethiopia", lat: 13.4973, lon: 39.4753 },
  { display_name: "Dire Dawa, Ethiopia", lat: 9.5931, lon: 41.8661 },
  { display_name: "Jimma, Oromia, Ethiopia", lat: 7.6667, lon: 36.8333 },
  { display_name: "Bako, Oromia, Ethiopia", lat: 9.15, lon: 37.05 },
  { display_name: "Guji Zone, Oromia, Ethiopia", lat: 5.7, lon: 38.95 },
];

export function tryHandleGeo<T>(
  pathname: string,
  search: string,
  method: string,
): T | undefined {
  if (!pathname.startsWith("/api/v1/geo")) return undefined;

  const params = new URLSearchParams(search);

  if (method === "GET" && pathname === "/api/v1/geo/suggest") {
    const q = (params.get("q") ?? "").trim().toLowerCase();
    if (q.length < 2) {
      return { ok: true, results: [], attribution: "mock places" } as T;
    }
    const results = SAMPLE.filter((p) => p.display_name.toLowerCase().includes(q)).slice(0, 8);
    return {
      ok: true,
      results,
      attribution: "mock/offline demo",
    } as T;
  }

  if (method === "GET" && pathname === "/api/v1/geo/reverse") {
    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new ApiError(400, "Missing coordinates.", { error: "bad_coords" });
    }
    const nearest = SAMPLE.reduce<{ d: number; row: (typeof SAMPLE)[0] } | null>((acc, row) => {
      const d = (row.lat - lat) ** 2 + (row.lon - lon) ** 2;
      if (!acc || d < acc.d) return { d, row };
      return acc;
    }, null);
    const label =
      nearest && nearest.d < 25
        ? nearest.row.display_name
        : `${lat.toFixed(4)}, ${lon.toFixed(4)} — Ethiopia (approx.)`;
    return {
      ok: true,
      display_name: label,
      lat,
      lon,
      attribution: "mock reverse",
    } as T;
  }

  return undefined;
}
