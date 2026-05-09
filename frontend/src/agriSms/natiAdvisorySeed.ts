/**
 * Canonical Meher / Kebele 3 multilingual defaults from `nati.MD`
 * — keep in sync with `backend/src/agriSms/natiAdvisoryDefaults.js`
 */
export const natiMeherAdvisoryBundles = {
  fertilizer: {
    Amharic:
      "NPS በመዝራት ጊዜ ይጨምሩ፤ ዩሪያ በትልቅ ስር (tillering) ጊዜ ይጨምሩ። (ቀበሌ 3 · ወረዳ 3 — ስንዴ፣ ጤፍ፣ በቆሎ)",
    Oromo:
      "Xaa'oo NPS yeroo facaasan itti dabalaa; (Kebele 3 · Aanaa 3 — Qamadii, Xaafii, Boqqolloo)",
    English:
      "Apply NPS at planting; apply urea at tillering stage. (Kebele 3 · District 3 — Wheat, Teff, Maize)",
  },
  forecast: {
    Amharic:
      "ዝናብ በመደበኛ የክረምት (Kiremt) ጊዜ ሊጀምር ይችላል፤ መጠኑ አብዛኛው መደበኛ ይሆናል፤ አጭር የደረቅ ጊዜ ሊኖር ይችላል።",
    Oromo: "Roobni jabaa yeroo ganna barameen dhufu danda’a; yeroo gabaabaa gogaa ta’uu danda’a.",
    English: "Rain likely to follow normal Kiremt timing; amounts near normal; short dry spells possible.",
  },
  rain_window: {
    Amharic: "መጀመሪያ: 06/15/2026\nመጨረሻ: 09/30/2026",
    Oromo: "Jalqaba: 06/15/2026\nXumura: 09/30/2026",
    English: "Start: 06/15/2026\nEnd: 09/30/2026",
  },
  weather_alert: {
    Amharic: "ማስጠንቀቂያ: የለም",
    Oromo: "Akeekkachiisa: Hin jiru, Googinsa, Loolaa",
    English: "Alert: None",
  },
  soil_condition_lang: {
    Amharic: "መደበኛ",
    Oromo: "Idilee, Googaa",
    English: "Normal",
  },
  soil_ph_lang: {
    Amharic: "መካከለኛ",
    Oromo: "Giddugaleessa",
    English: "Neutral",
  },
  crops: {
    Amharic: "የሚመከሩ: ስንዴ፣ ጤፍ፣ በቆሎ\nያልተመከሩ: ገብስ (የሩስት አደጋ)",
    Oromo: "Kan gorfaman: Qamadii, Xaafii, Boqqolloo\nKan hin gorfamne: Garbuu (balaa danda'u)",
    English: "Recommended: Wheat, Teff, Maize\nNot recommended: Barley (rust risk)",
  },
  planting: {
    Amharic: "መሬት ዝግጅትን ቀድሞ ይጀምሩ።",
    Oromo: "Qophii lafa dura jalqabaa.",
    English: "Start land preparation early.",
  },
  market: {
    Amharic:
      "ስንዴ: 4200\nጤፍ: 5800\nበቆሎ: 2500\nገብስ: 3200\nአቅጣጫ: የተረጋጋ",
    Oromo: "Qamadii: 4200\nXaafii: 5800\nBoqqolloo: 2500\nGarbuu: 3200\nHaala gabaa: Tasgabbaa’aa",
    English: "Wheat: 4200\nTeff: 5800\nMaize: 2500\nBarley: 3200\nTrend: Stable",
  },
} as const;

export function getNatiMeherAdvisoryMockPayload(now = () => new Date().toISOString()): Record<string, unknown> {
  const b = natiMeherAdvisoryBundles;
  const ts = now();
  return {
    id: "adv-mock",
    season: "Meher 2026",
    soil_condition: "Normal",
    fertilizer_recommendation: b.fertilizer.English,
    fertilizer_by_lang: { ...b.fertilizer },
    soil_ph: "Neutral",
    rain_start: "2026-06-15",
    rain_end: "2026-09-30",
    forecast_summary: b.forecast.English,
    forecast_by_lang: { ...b.forecast },
    weather_alert: "Alert: None",
    weather_alert_by_lang: { ...b.weather_alert },
    rain_window_display_by_lang: { ...b.rain_window },
    soil_condition_by_lang: { ...b.soil_condition_lang },
    soil_ph_by_lang: { ...b.soil_ph_lang },
    crops_display_by_lang: { ...b.crops },
    planting_advice: b.planting.English,
    planting_advice_by_lang: { ...b.planting },
    market_prices_display_by_lang: { ...b.market },
    wheat_price_etb: 4200,
    teff_price_etb: 5800,
    maize_price_etb: 2500,
    barley_price_etb: 3200,
    market_trend: "Stable",
    recommended_crops: ["Wheat", "Teff", "Maize"],
    not_recommended_crops: ["Barley (rust risk)"],
    created_at: ts,
    updated_at: ts,
  };
}
