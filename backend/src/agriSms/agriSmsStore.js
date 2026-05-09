import { randomUUID } from "crypto";
import { isValidRegionId, normalizeDistrictNumber, smsHeaderAreaEnglish } from "./ethiopiaRegions.js";

/** In-memory SMS registry & advisories — demo aligned with Agricultural Advisory SRS (no PostgreSQL required). */

let codeSeq = 42;

export const agriSmsStore = {
  farmers: [],

  currentAdvisory: {
    id: randomUUID(),
    season: "Meher 2026",
    soil_condition: "Normal",
    fertilizer_recommendation: "Apply NPS at planting, 100kg/hectare",
    fertilizer_by_lang: {
      Amharic: "",
      Oromo: "",
      English: "Apply NPS at planting, 100kg/hectare",
    },
    soil_ph: "Neutral",
    rain_start: "2026-06-15",
    rain_end: "2026-09-30",
    forecast_summary: "Normal rainfall expected. No extreme weather.",
    forecast_by_lang: {
      Amharic: "",
      Oromo: "",
      English: "Normal rainfall expected. No extreme weather.",
    },
    weather_alert: "None",
    recommended_crops: ["Wheat", "Teff", "Maize"],
    not_recommended_crops: ["Barley (rust risk)"],
    planting_advice: "Start land preparation early. Use certified seed.",
    wheat_price_etb: 4200,
    teff_price_etb: 5800,
    maize_price_etb: 2500,
    barley_price_etb: 3200,
    market_trend: "Stable",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  broadcasts: [],

  smsLogsByBroadcastId: new Map(),
};

function nextFarmerCode() {
  codeSeq += 1;
  return `ETH-${String(codeSeq).padStart(4, "0")}`;
}

function normalizeSmsPhone(raw) {
  let s = String(raw ?? "").trim().replace(/[\s-]/g, "");
  if (/^09\d{8}$/.test(s)) s = `+251${s.slice(1)}`;
  else if (/^9\d{8}$/.test(s)) s = `+251${s}`;
  else if (s.startsWith("251")) s = `+${s}`;
  else if (!s.startsWith("+251")) return null;
  const rest = s.slice(4);
  if (!/^[1-9]\d{8}$/.test(rest)) return null;
  return `+251${rest}`;
}

export function normalizeFarmerRegistrationPhone(raw) {
  return normalizeSmsPhone(raw);
}

export function registrationPhoneTaken(phoneE164) {
  return agriSmsStore.farmers.some((f) => f.phone_number === phoneE164);
}

export function registerSmsFarmer(body, registeredById) {
  const phoneE164 = normalizeSmsPhone(body.phone_number ?? body.phone);
  if (!phoneE164) {
    const err = new Error("invalid_phone");
    err.code = "INVALID_PHONE";
    throw err;
  }
  if (registrationPhoneTaken(phoneE164)) {
    const err = new Error("duplicate");
    err.code = "DUPLICATE_PHONE";
    throw err;
  }
  const name = String(body.full_name ?? "").trim();
  if (name.length < 2) {
    const err = new Error("invalid_name");
    err.code = "INVALID_NAME";
    throw err;
  }
  const langIn = String(body.language ?? "Amharic");
  const language =
    langIn === "Oromo" || langIn.startsWith("Afaan") ? "Oromo" : langIn === "English" ? "English" : "Amharic";

  const regionRaw = String(body.region_state ?? "").trim();
  if (!isValidRegionId(regionRaw)) {
    const err = new Error("bad_region");
    err.code = "INVALID_REGION_STATE";
    throw err;
  }
  const distr = normalizeDistrictNumber(body.district_number ?? body.district);
  if (distr == null) {
    const err = new Error("bad_district");
    err.code = "INVALID_DISTRICT";
    throw err;
  }

  const farmer = {
    id: randomUUID(),
    farmer_code: nextFarmerCode(),
    full_name: name,
    phone_number: phoneE164,
    language,
    region_state: regionRaw,
    district_number: distr,
    kebele: `${regionRaw}-d${distr}`,
    crops: Array.isArray(body.crops) ? body.crops.map(String) : [],
    is_active: true,
    registered_by: registeredById ?? null,
    registered_at: new Date().toISOString(),
    consent_given: Boolean(body.consent_given),
    last_sms_sent_at: null,
  };
  if (!farmer.consent_given) {
    const err = new Error("consent");
    err.code = "CONSENT_REQUIRED";
    throw err;
  }
  agriSmsStore.farmers.push(farmer);
  return farmer;
}

export function buildGeminiContextForScope(region, district) {
  const r = String(region ?? "").trim();
  const d = normalizeDistrictNumber(district);
  const rows = agriSmsStore.farmers.filter(
    (f) =>
      f.is_active &&
      f.consent_given &&
      f.region_state === r &&
      (d == null ? true : Number(f.district_number) === d),
  );
  const crops = new Map();
  for (const f of rows) {
    for (const c of f.crops ?? []) {
      crops.set(c, (crops.get(c) ?? 0) + 1);
    }
  }
  return {
    region_state: r,
    district_number: d,
    legacy_area_tag: `${r}-d${d}`,
    area_summary: d != null ? smsHeaderAreaEnglish(r, d) : r,
    active_farmer_count: rows.length,
    language_breakdown: rows.reduce((acc, f) => {
      acc[f.language] = (acc[f.language] ?? 0) + 1;
      return acc;
    }, {}),
    crop_counts: Object.fromEntries(crops),
    signup_locations_sample: [],
    note:
      "Synthesize regional season timing, fertilizer guidance, and a cautious rain outlook for SMS to mixed literacy farmers.",
  };
}

export function listFarmers(filters) {
  let rows = [...agriSmsStore.farmers];
  const scope = filters.workerScope;
  if (scope?.region) {
    rows = rows.filter((f) => f.region_state === scope.region);
  }
  if (scope?.district != null && scope.district !== "") {
    const dn = normalizeDistrictNumber(scope.district);
    if (dn != null) rows = rows.filter((f) => Number(f.district_number) === dn);
  }
  const q = String(filters.search ?? "").trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (f) =>
        f.full_name.toLowerCase().includes(q) ||
        f.phone_number.includes(q) ||
        f.farmer_code.toLowerCase().includes(q),
    );
  }
  return rows;
}

export function updateFarmer(id, patch, allowDeactivate) {
  const f = agriSmsStore.farmers.find((x) => x.id === id);
  if (!f) return null;
  if (patch.full_name != null) f.full_name = String(patch.full_name).trim();
  if (patch.language != null) f.language = String(patch.language);
  if (patch.region_state != null && isValidRegionId(String(patch.region_state).trim())) {
    f.region_state = String(patch.region_state).trim();
  }
  if (patch.district_number != null) {
    const dn = normalizeDistrictNumber(patch.district_number);
    if (dn != null) f.district_number = dn;
  }
  if (patch.kebele != null) {
    /* legacy compound */
    const s = String(patch.kebele).trim();
    if (s) f.kebele = s;
    const m = s.match(/^([\w]+)-d(\d)$/i);
    if (m && isValidRegionId(m[1])) {
      f.region_state = m[1];
      f.district_number = Number(m[2]);
    }
  }
  if (f.region_state != null && f.district_number != null) {
    f.kebele = `${f.region_state}-d${f.district_number}`;
  }
  if (patch.crops != null) f.crops = Array.isArray(patch.crops) ? patch.crops : [];
  if (patch.is_active != null && allowDeactivate) f.is_active = Boolean(patch.is_active);
  const np = normalizeSmsPhone(patch.phone_number ?? patch.phone);
  if (np && np !== f.phone_number) {
    const taken = agriSmsStore.farmers.some((x) => x.phone_number === np && x.id !== id);
    if (taken) {
      const err = new Error("duplicate");
      err.code = "DUPLICATE_PHONE";
      throw err;
    }
    f.phone_number = np;
  }
  return f;
}

export function saveAdvisory(input) {
  const cur = agriSmsStore.currentAdvisory;
  const merged = {
    ...cur,
    ...input,
    fertilizer_by_lang:
      input.fertilizer_by_lang != null && typeof input.fertilizer_by_lang === "object"
        ? { ...(cur.fertilizer_by_lang ?? {}), ...input.fertilizer_by_lang }
        : cur.fertilizer_by_lang,
    forecast_by_lang:
      input.forecast_by_lang != null && typeof input.forecast_by_lang === "object"
        ? { ...(cur.forecast_by_lang ?? {}), ...input.forecast_by_lang }
        : cur.forecast_by_lang,
    recommended_crops: input.recommended_crops ?? cur.recommended_crops,
    not_recommended_crops: input.not_recommended_crops ?? cur.not_recommended_crops,
    wheat_price_etb: input.wheat_price_etb != null ? Number(input.wheat_price_etb) : cur.wheat_price_etb,
    teff_price_etb: input.teff_price_etb != null ? Number(input.teff_price_etb) : cur.teff_price_etb,
    maize_price_etb: input.maize_price_etb != null ? Number(input.maize_price_etb) : cur.maize_price_etb,
    barley_price_etb: input.barley_price_etb != null ? Number(input.barley_price_etb) : cur.barley_price_etb,
    updated_at: new Date().toISOString(),
    id: cur.id,
  };
  agriSmsStore.currentAdvisory = merged;
  return merged;
}

export function insertBroadcast(broadcast, logs) {
  agriSmsStore.broadcasts.unshift(broadcast);
  agriSmsStore.smsLogsByBroadcastId.set(broadcast.id, logs);
  return broadcast;
}

export function getBroadcast(id) {
  return agriSmsStore.broadcasts.find((x) => x.id === id) ?? null;
}

export function getBroadcastLogs(id) {
  return agriSmsStore.smsLogsByBroadcastId.get(id) ?? [];
}

export function filterTargets(filters, workerScope = null) {
  let rows = agriSmsStore.farmers.filter((f) => f.is_active && f.consent_given);
  if (workerScope?.region) {
    rows = rows.filter((f) => f.region_state === workerScope.region);
  }
  if (workerScope?.district != null && workerScope.district !== "") {
    const dn = normalizeDistrictNumber(workerScope.district);
    if (dn != null) rows = rows.filter((f) => Number(f.district_number) === dn);
  }
  if (filters.all_farmers) return rows;

  const crops = filters.crops ?? [];
  if (crops.length) {
    rows = rows.filter((f) => f.crops.some((c) => crops.includes(c)));
    return rows;
  }
  return [];
}

/** Demo clerks (`kebele` login) scope: Amhara, district 3 — seed matched + a few outsiders */
const DEMO_RG = "amhara";
const DEMO_D = 3;

[
  ["Bekele T.", "+251912345678", "Amharic"],
  ["Tigist A.", "+251923456789", "Oromo"],
  ["Mulugeta K.", "+251934567890", "Amharic"],
  ["Hana W.", "+251945678901", "Oromo"],
  ["Alemitu F.", "+251956789012", "Amharic"],
].forEach(([full_name, phone, language], idx) => {
  try {
    registerSmsFarmer(
      {
        full_name,
        phone_number: phone.replace("+251", "0"),
        language,
        region_state: DEMO_RG,
        district_number: DEMO_D,
        crops: [["Wheat", "Teff"], ["Teff"], ["Wheat", "Maize"], ["Teff", "Maize"], ["Wheat"]][idx],
        consent_given: true,
      },
      null,
    );
    if (idx === 2) {
      agriSmsStore.farmers[agriSmsStore.farmers.length - 1].is_active = false;
    }
  } catch {
    /* ignore duplicate on hot reload */
  }
});

try {
  registerSmsFarmer(
    {
      full_name: "Out Of Scope Demo",
      phone_number: "0977777777",
      language: "Amharic",
      region_state: "oromia",
      district_number: 1,
      crops: [],
      consent_given: true,
    },
    null,
  );
} catch {
  /* dup */
}

try {
  registerSmsFarmer(
    {
      full_name: "Wrong District Demo",
      phone_number: "0966666666",
      language: "Amharic",
      region_state: DEMO_RG,
      district_number: 7,
      crops: ["Teff"],
      consent_given: true,
    },
    null,
  );
} catch {
  /* dup */
}
