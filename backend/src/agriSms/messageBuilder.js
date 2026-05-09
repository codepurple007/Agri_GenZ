/**
 * Multi-language advisory SMS bodies (SRS §3.3.2).
 * Ethiopian phone display: digits only preview uses +251 → 0…
 */

const TEMPLATES = {
  Amharic: {
    header: (kebele) => `የግብርና ምክር - ${kebele} ቀበሌ`,
    soil: (c, f) => `አፈር፡ ${c}፣ ${f}`,
    weather: (start, end, sum, alert) =>
      `ዝናብ፡ ${start} ይጀምራል፣ ${end} ያበቃል። ${sum}${alert && alert !== "None" ? ` ማስጠንቀቂያ፡ ${alert}` : ""}`,
    crops: (plant, notPlant, advice) =>
      `ለመትከል፡ ${plant}። አይትከሉ፡ ${notPlant}። ${advice}`,
    prices: (wheat, teff, maize, barley, trend) =>
      `ዋጋ (ብር/ኩንታል)፡ ስንዴ ${wheat}፣ ጤፍ ${teff}፣ ማሽ ${maize}፣ ገብስ ${barley}። ሁኔታ፡ ${trend}`,
    footer: "ተጨማሪ መረጃ ለማግኘት ወደ ቀበሌ ቢሮ ይጠይቁ",
  },
  Oromo: {
    header: (kebele) => `Gorsa Qonnaa - Ganda ${kebele}`,
    soil: (c, f) => `Biyyee: ${c}, ${f} ni gorfama`,
    weather: (start, end, sum, alert) =>
      `Bokkaan: ${start} eegala, ${end} xumurama. ${sum}${alert && alert !== "None" ? ` Akeekkachiisa: ${alert}` : ""}`,
    crops: (plant, notPlant, advice) =>
      `Facuuf: ${plant}. Hin facin: ${notPlant}. ${advice}`,
    prices: (wheat, teff, maize, barley, trend) =>
      `Gatii (Birr/q): Qamadii ${wheat}, Taffii ${teff}, Micira ${maize}, Garbuu ${barley}. Haala: ${trend}`,
    footer: "Odeeffannoo dabalataa af bilisummaa kee irraa gaafadhu",
  },
  English: {
    header: (kebele) => `Agri advisory - ${kebele} kebele`,
    soil: (c, f) => `Soil: ${c}. Fertilizer: ${f}`,
    weather: (start, end, sum, alert) =>
      `Rain: ${start} to ${end}. ${sum}${alert && alert !== "None" ? ` Alert: ${alert}` : ""}`,
    crops: (plant, notPlant, advice) => `Plant: ${plant}. Avoid: ${notPlant}. ${advice}`,
    prices: (wheat, teff, maize, barley, trend) =>
      `Prices (ETB/q): Wheat ${wheat}, Teff ${teff}, Maize ${maize}, Barley ${barley}. Trend: ${trend}`,
    footer: "Contact your kebele office for more information",
  },
};

export function buildAdvisorySms({ advisory, kebeleLabel, language, include }) {
  const lang = TEMPLATES[language] ? language : "Amharic";
  const t = TEMPLATES[lang];
  const k = kebeleLabel || "Bako";
  const parts = [t.header(k)];

  if (include.soil) {
    parts.push(t.soil(advisory.soil_condition || "—", advisory.fertilizer_recommendation || "—"));
  }
  if (include.weather) {
    parts.push(
      t.weather(
        advisory.rain_start || "—",
        advisory.rain_end || "—",
        advisory.forecast_summary || "—",
        advisory.weather_alert || "None",
      ),
    );
  }
  if (include.crops) {
    parts.push(
      t.crops(
        (advisory.recommended_crops || []).join(", ") || "—",
        (advisory.not_recommended_crops || []).join(", ") || "—",
        advisory.planting_advice || "—",
      ),
    );
  }
  if (include.prices) {
    parts.push(
      t.prices(
        advisory.wheat_price_etb ?? "—",
        advisory.teff_price_etb ?? "—",
        advisory.maize_price_etb ?? "—",
        advisory.barley_price_etb ?? "—",
        advisory.market_trend || "—",
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
