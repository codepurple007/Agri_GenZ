/**
 * Gemini: draft season + fertilizer + weather-only fields from aggregated farmer signup data.
 * Uses REST (no SDK) — set GEMINI_API_KEY + optional GEMINI_MODEL (default gemini-2.0-flash).
 * Fertilizer + forecast are generated in Amharic, Oromo, and English for SMS language matching.
 */

const LANG_KEYS = ["Amharic", "Oromo", "English"];
const MAX_FERT_LEN = 260;
const MAX_FORE_LEN = 240;

function safeJsonSlice(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** @param {Record<string, unknown> | null} raw */
function normalizeLangBundle(raw, maxLen) {
  const out = { Amharic: "", Oromo: "", English: "" };
  if (!raw || typeof raw !== "object") return out;
  for (const k of LANG_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, maxLen);
  }
  return out;
}

/** @param {Record<string, unknown>} context */
export function buildGeminiPrompt(context) {
  const today = new Date().toISOString().slice(0, 10);
  return `You advise Ethiopian smallholder farmers at district level. Ground advice in plausible Horn-of-Africa agronomy. Do not claim exact weather-station numbers; hedge with may / often / likely.

Registration aggregate (region, district cohort, crop mix):
${JSON.stringify(context, null, 2)}

Return ONLY valid JSON (no markdown) with these keys exactly:
"season": string — e.g. "Belg ${new Date().getFullYear()}" or "Meher ${new Date().getFullYear()}" using calendar context ${today};
"rain_start": string — YYYY-MM-DD plausible main rain window start;
"rain_end": string — YYYY-MM-DD end;
"weather_alert": one of "None","Flood","Drought","Hail";
"fertilizer_by_lang": object with keys "Amharic","Oromo","English" — each value: practical fertilizer guidance (timing, split application if useful, follow extension). Max ${MAX_FERT_LEN} characters per language. Short, precise, informative (about 2 tight sentences or 3 short phrases). No marketing filler.
"forecast_by_lang": object with keys "Amharic","Oromo","English" — each value: qualitative seasonal rain outlook. Max ${MAX_FORE_LEN} characters per language. Two short clauses; hedged wording.

Language rules:
- Amharic values MUST be in Ethiopic (Geʽez) script.
- Oromo values MUST be in Latin Afaan Oromoo (no Ethiopic).
- English values: plain, simple words.

Do not include soil chemistry lab data or market prices.`;
}

/**
 * @param {Record<string, unknown>} farmerContextFromStore
 */
export async function generateAdvisoryDraftWithGemini(farmerContextFromStore) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    const err = new Error("no_gemini_key");
    err.code = "NO_GEMINI";
    throw err;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: buildGeminiPrompt(farmerContextFromStore) }],
      },
    ],
    generationConfig: {
      temperature: 0.32,
      responseMimeType: "application/json",
    },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = raw?.error?.message || r.statusText;
    const err = new Error(`gemini_http_${msg}`);
    err.code = "GEMINI_HTTP";
    err.status = r.status;
    throw err;
  }

  let text =
    raw?.candidates?.[0]?.content?.parts?.map((p) => p?.text ?? "").join("") ?? "";

  if (!text && typeof raw?.candidates?.[0]?.output === "string") {
    text = raw.candidates[0].output;
  }

  /** @type {Record<string, unknown> | null} */
  let parsed = safeJsonSlice(text.trim());
  if (!parsed || typeof parsed !== "object") {
    parsed = typeof raw?.candidates?.[0]?.output === "object" ? raw.candidates[0].output : null;
  }

  if (!parsed || typeof parsed !== "object") {
    const err = new Error("gemini_bad_json");
    err.code = "GEMINI_PARSE";
    throw err;
  }

  const alerts = ["None", "Flood", "Drought", "Hail"];
  let weather_alert = alerts.includes(parsed.weather_alert) ? parsed.weather_alert : "None";

  const fertilizer_by_lang = normalizeLangBundle(
    /** @type {Record<string, unknown>} */ (parsed.fertilizer_by_lang),
    MAX_FERT_LEN,
  );
  const forecast_by_lang = normalizeLangBundle(
    /** @type {Record<string, unknown>} */ (parsed.forecast_by_lang),
    MAX_FORE_LEN,
  );

  const season = String(parsed.season ?? "").trim() || `Meher ${new Date().getFullYear()}`;

  return {
    season,
    fertilizer_by_lang,
    forecast_by_lang,
    fertilizer_recommendation: fertilizer_by_lang.English || fertilizer_by_lang.Amharic || "",
    forecast_summary: forecast_by_lang.English || forecast_by_lang.Amharic || "",
    rain_start: String(parsed.rain_start ?? "").trim().slice(0, 10),
    rain_end: String(parsed.rain_end ?? "").trim().slice(0, 10),
    weather_alert,
  };
}
