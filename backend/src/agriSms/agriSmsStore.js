import { randomUUID } from "crypto";

/** In-memory SMS registry & advisories — demo aligned with Agricultural Advisory SRS (no PostgreSQL required). */

let codeSeq = 42;

export const agriSmsStore = {
  farmers: [],

  currentAdvisory: {
    id: randomUUID(),
    season: "Meher 2026",
    soil_condition: "Normal",
    fertilizer_recommendation: "Apply NPS at planting, 100kg/hectare",
    soil_ph: "Neutral",
    rain_start: "2026-06-15",
    rain_end: "2026-09-30",
    forecast_summary: "Normal rainfall expected. No extreme weather.",
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

  const farmer = {
    id: randomUUID(),
    farmer_code: nextFarmerCode(),
    full_name: name,
    phone_number: phoneE164,
    language,
    kebele: String(body.kebele ?? "Bako").trim() || "Bako",
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

export function listFarmers(filters) {
  let rows = [...agriSmsStore.farmers];
  const q = String(filters.search ?? "").trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (f) =>
        f.full_name.toLowerCase().includes(q) ||
        f.phone_number.includes(q) ||
        f.farmer_code.toLowerCase().includes(q),
    );
  }
  const kebele = filters.kebele;
  if (kebele && kebele !== "all") rows = rows.filter((f) => f.kebele === kebele);
  return rows;
}

export function updateFarmer(id, patch, allowDeactivate) {
  const f = agriSmsStore.farmers.find((x) => x.id === id);
  if (!f) return null;
  if (patch.full_name != null) f.full_name = String(patch.full_name).trim();
  if (patch.language != null) f.language = String(patch.language);
  if (patch.kebele != null) f.kebele = String(patch.kebele).trim();
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

export function filterTargets(filters) {
  let rows = agriSmsStore.farmers.filter((f) => f.is_active && f.consent_given);
  if (filters.all_farmers) return rows;

  const kebes = filters.kebeles ?? [];
  if (kebes.length) rows = rows.filter((f) => kebes.includes(f.kebele));

  const crops = filters.crops ?? [];
  if (crops.length) {
    rows = rows.filter((f) => f.crops.some((c) => crops.includes(c)));
  }
  if (!kebes.length && !crops.length) return [];
  return rows;
}

/** Seed demo farmers row so UI is populated */
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
        kebele: idx % 2 === 0 ? "Bako" : "Guto Gida",
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
