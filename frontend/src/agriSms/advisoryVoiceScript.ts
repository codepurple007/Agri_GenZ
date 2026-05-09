/**
 * Build full Voice / USSD read-along text per language (must match backend `snapshotAdvisoryTexts`).
 */
const VLG = ["Amharic", "Oromo", "English"] as const;
export type VoiceScriptLang = (typeof VLG)[number];

export type VoiceScriptBag = Record<VoiceScriptLang, string>;

function bundleLine(adv: Record<string, unknown>, key: string, lang: string): string {
  const o = adv[key];
  if (o && typeof o === "object" && o !== null) {
    const v = (o as Record<string, unknown>)[lang];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Multilingual fertilizer + agronomy bulletin body for recorder UI (sync with `voiceAdvisoryStore.js`). */
export function buildAdvisoryVoiceScript(adv: Record<string, unknown>): VoiceScriptBag {
  const fb = typeof adv?.fertilizer_by_lang === "object" ? (adv.fertilizer_by_lang as Record<string, unknown>) : {};
  const fo = typeof adv?.forecast_by_lang === "object" ? (adv.forecast_by_lang as Record<string, unknown>) : {};
  const out = {} as VoiceScriptBag;

  for (const lng of VLG) {
    const fertilizer = typeof fb[lng] === "string" ? String(fb[lng]).trim() : "";
    const forecast = typeof fo[lng] === "string" ? String(fo[lng]).trim() : "";
    const fc = fertilizer || String(adv?.fertilizer_recommendation ?? "").trim();
    const fy = forecast || String(adv?.forecast_summary ?? "").trim();

    const rainW = bundleLine(adv, "rain_window_display_by_lang", lng);
    const wx = bundleLine(adv, "weather_alert_by_lang", lng) || String(adv?.weather_alert ?? "").trim();
    const soilC = bundleLine(adv, "soil_condition_by_lang", lng);
    const soilPhL = bundleLine(adv, "soil_ph_by_lang", lng);
    const cropsBlk = bundleLine(adv, "crops_display_by_lang", lng);
    const plantL = bundleLine(adv, "planting_advice_by_lang", lng) || String(adv?.planting_advice ?? "").trim();
    const mkt = bundleLine(adv, "market_prices_display_by_lang", lng);

    const condShown = soilC || String(adv?.soil_condition ?? "").trim();
    const phShown = soilPhL || String(adv?.soil_ph ?? "").trim();
    let soilBody = "";
    if (condShown) soilBody += `· Condition: ${condShown}`;
    if (phShown) soilBody += (soilBody ? "\n" : "") + `· pH: ${phShown}`;
    const soilPart = soilBody ? `Soil\n${soilBody}` : "";

    const parts = [
      `Season\n· ${String(adv?.season ?? "").trim() || "—"}`,
      fc ? `Fertilizer\n· ${fc}` : "",
      fy ? `Rain / season outlook\n· ${fy}` : "",
      rainW ? `Rain start / end\n${rainW.split("\n").map((ln) => `· ${ln}`).join("\n")}` : "",
      wx ? `Weather alert\n· ${wx}` : "",
      soilPart,
      cropsBlk ? `Crops\n${cropsBlk.split("\n").map((ln) => `· ${ln}`).join("\n")}` : "",
      plantL ? `Planting advice\n· ${plantL}` : "",
      mkt ? `Market prices (ETB per quintal)\n${mkt.split("\n").map((ln) => `· ${ln}`).join("\n")}` : "",
    ].filter(Boolean);

    out[lng] = parts.join("\n\n");
  }

  return out;
}
