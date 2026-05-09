/**
 * Multi-language advisory SMS bodies (SRS §3.3.2).
 * Sectioned layout — easier to read on low-end phones than long comma‑joined lines.
 */

function dash(val) {
  const t = String(val ?? "").trim();
  return t || "—";
}

/** Prefer language-specific Gemini/worker text; fall back across languages then legacy fields. */
function pickLangParagraph(advisory, bundleKey, legacyKey, language) {
  const prefs = [language, "English", "Amharic", "Oromo"];
  const bundle = advisory[bundleKey];
  if (bundle && typeof bundle === "object") {
    for (const p of prefs) {
      const v = bundle[p];
      if (typeof v === "string" && v.trim()) return dash(v);
    }
  }
  return dash(advisory[legacyKey]);
}

const TEMPLATES = {
  Amharic: {
    header: (kebele) => `የግብርና ምክር — ${kebele} ቀበሌ`,
    season: (s) => `ወቅት\n· ${s}`,
    soilBlock: (condition, ph, fertilizer) =>
      `አፈር እና ማዕድን\n· ሁኔታ፡ ${condition}\n· pH፡ ${ph}\n· ማስፋፋያ / ፔርቲላይዜሽን፡ ${fertilizer}`,
    weatherBlock: (start, end, sum, alert) => {
      const range =
        start !== "—" && end !== "—" ? `ከ ${start} እስከ ${end}` : "—";
      let b = `ዝናብ እና አየር\n· ጊዜ፡ ${range}\n· ${sum}`;
      if (alert && alert !== "None") b += `\n· ማስጠንቀቂያ፡ ${alert}`;
      return b;
    },
    cropsBlock: (plant, notPlant, advice) =>
      `መከር\n· ይትከሉ፡ ${plant}\n· አይትከሉ፡ ${notPlant}\n· ምክር፡ ${advice}`,
    pricesBlock: (wheat, teff, maize, barley, trend) =>
      `ዋጋ (ብር / ኩንታል)\n· ስንዴ ${wheat}\n· ጤፍ ${teff}\n· ማሽ ${maize}\n· ገብስ ${barley}\n· አካባቢ ዋጋ፡ ${trend}`,
    footer: "የበለጠ መረጃ ወደ ቀበሌ ቢሮ ይጠይቁ።",
  },
  Oromo: {
    header: (kebele) => `Gorsa Qonnaa — Ganda ${kebele}`,
    season: (s) => `Yeroo\n· ${s}`,
    soilBlock: (condition, ph, fertilizer) =>
      `Biyyee fi xaa'oo\n· Haala: ${condition}\n· pH: ${ph}\n· Xurii/fertilizer: ${fertilizer}`,
    weatherBlock: (start, end, sum, alert) => {
      const range =
        start !== "—" && end !== "—" ? `${start} irraa ${end}tti` : "—";
      let b = `Roobaa fi qilleensaa\n· Yeroo: ${range}\n· ${sum}`;
      if (alert && alert !== "None") b += `\n· Akeekkachiisa: ${alert}`;
      return b;
    },
    cropsBlock: (plant, notPlant, advice) =>
      `Midhaan\n· Facuuf: ${plant}\n· Hin facin: ${notPlant}\n· Gorsa: ${advice}`,
    pricesBlock: (wheat, teff, maize, barley, trend) =>
      `Gatii (Birr / q)\n· Qamadii ${wheat}\n· Taffii ${teff}\n· Micira ${maize}\n· Garbuu ${barley}\n· Haala gatii: ${trend}`,
    footer: "Odeeffannoo dabalataa bilisummaa kee irraa gaafadhu.",
  },
  English: {
    header: (kebele) => `Agri advisory — ${kebele} kebele`,
    season: (s) => `Season\n· ${s}`,
    soilBlock: (condition, ph, fertilizer) =>
      `Soil & fertilizer\n· Condition: ${condition}\n· pH: ${ph}\n· Fertilizer: ${fertilizer}`,
    weatherBlock: (start, end, sum, alert) => {
      const range =
        start !== "—" && end !== "—" ? `${start} → ${end}` : "—";
      let b = `Rain & weather\n· Window: ${range}\n· ${sum}`;
      if (alert && alert !== "None") b += `\n· Alert: ${alert}`;
      return b;
    },
    cropsBlock: (plant, notPlant, advice) =>
      `Crops\n· Plant: ${plant}\n· Avoid: ${notPlant}\n· Advice: ${advice}`,
    pricesBlock: (wheat, teff, maize, barley, trend) =>
      `Prices (ETB / q)\n· Wheat ${wheat}\n· Teff ${teff}\n· Maize ${maize}\n· Barley ${barley}\n· Trend: ${trend}`,
    footer: "Contact your kebele office for more information.",
  },
};

export function buildAdvisorySms({ advisory, kebeleLabel, language, include }) {
  const lang = TEMPLATES[language] ? language : "Amharic";
  const t = TEMPLATES[lang];
  const k = kebeleLabel || "Bako";
  const parts = [t.header(k)];

  const season = dash(advisory.season);
  if (season !== "—") parts.push(t.season(season));

  if (include.soil) {
    const fert = pickLangParagraph(
      advisory,
      "fertilizer_by_lang",
      "fertilizer_recommendation",
      lang,
    );
    const soilCond = pickLangParagraph(advisory, "soil_condition_by_lang", "soil_condition", lang);
    const soilPhPick = pickLangParagraph(advisory, "soil_ph_by_lang", "soil_ph", lang);
    parts.push(t.soilBlock(dash(soilCond), dash(soilPhPick), fert));
  }
  if (include.weather) {
    const fc = pickLangParagraph(advisory, "forecast_by_lang", "forecast_summary", lang);
    const alertPick =
      pickLangParagraph(advisory, "weather_alert_by_lang", "weather_alert", lang) ||
      advisory.weather_alert ||
      "None";
    parts.push(
      t.weatherBlock(
        dash(advisory.rain_start),
        dash(advisory.rain_end),
        fc,
        alertPick,
      ),
    );
  }
  if (include.crops) {
    parts.push(
      t.cropsBlock(
        (advisory.recommended_crops || []).join(", ") || "—",
        (advisory.not_recommended_crops || []).join(", ") || "—",
        dash(advisory.planting_advice),
      ),
    );
  }
  if (include.prices) {
    parts.push(
      t.pricesBlock(
        advisory.wheat_price_etb ?? "—",
        advisory.teff_price_etb ?? "—",
        advisory.maize_price_etb ?? "—",
        advisory.barley_price_etb ?? "—",
        dash(advisory.market_trend),
      ),
    );
  }
  parts.push(t.footer);
  return parts.join("\n\n");
}

export function estimateSegments(text) {
  const len = [...text].length;
  return Math.max(1, Math.ceil(len / 160));
}
