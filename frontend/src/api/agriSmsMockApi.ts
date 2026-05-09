/**
 * Demo in-memory Agricultural Advisory SMS API (parity with backend/src/agriSms).
 */
import { DEMO_KEBELE_SCOPE, ETHIOPIA_REGION_IDS } from "@/agriSms/constants";
import type { AuthUser } from "@/auth/types";
import { ApiError } from "@/api/errors";

const KEBELE_EN_TITLE: Record<string, string> = {
  kebele_1: "Kebele 1",
  kebele_2: "Kebele 2",
  kebele_3: "Kebele 3",
};

function smsAreaEnglish(kebeleUnitId: string, districtNum: number): string {
  const t = KEBELE_EN_TITLE[kebeleUnitId] ?? kebeleUnitId;
  return `${t} · District ${districtNum}`;
}

function isValidEthRegion(id: string): boolean {
  return (ETHIOPIA_REGION_IDS as readonly string[]).includes(id);
}

function normDistrictMock(n: unknown): number | null {
  const x = Number(n);
  if (!Number.isInteger(x) || x < 1 || x > 5) return null;
  return x;
}

function clerkSmsScope(session: AuthUser | null): { region: string; district: number } | null {
  if (!session?.smsRegion || session.smsDistrict == null) {
    return { region: DEMO_KEBELE_SCOPE.region, district: DEMO_KEBELE_SCOPE.district };
  }
  return { region: session.smsRegion, district: Number(session.smsDistrict) };
}

export type MockSmsFarmer = {
  id: string;
  farmer_code: string;
  full_name: string;
  phone_number: string;
  language: string;
  region_state: string;
  district_number: number;
  /** Legacy compound `region-d{n}` — matches backend */
  kebele: string;
  crops: string[];
  is_active: boolean;
  registered_by: string | null;
  registered_at: string;
  consent_given: boolean;
  last_sms_sent_at: string | null;
};

type Advisory = Record<string, unknown>;

let codeSeq = 42;
const farmers: MockSmsFarmer[] = [];
const broadcasts: Array<Record<string, unknown>> = [];
const logsByBroadcast = new Map<string, Array<Record<string, unknown>>>();

let advisory: Advisory = {
  id: "adv-mock",
  season: "Meher 2026",
  soil_condition: "Normal",
  fertilizer_recommendation: "Apply NPS at planting, 100kg/hectare",
  fertilizer_by_lang: {
    Amharic: "በመትከያ ጊዜ ኤንፒኤስ ይጠቀሙ፤ በአንቀሳቃሽ ደረጃ ዩሪያ የላይ ሽፋን እንደ ምክር ይጠቀሙ።",
    Oromo: "Yeroo facaa NPS fayyadami; yeroo dafinsa urea akka gorsa ol'aanaa irratti dabaladhu.",
    English: "Apply NPS at planting, 100kg/hectare",
  },
  soil_ph: "Neutral",
  rain_start: "2026-06-15",
  rain_end: "2026-09-30",
  forecast_summary: "Normal rainfall expected. No extreme weather.",
  forecast_by_lang: {
    Amharic: "ዝናብ በተለምዶው ኪረምት ውስጥ ሊታይ ይችላል፤ ጠብታዎች ሊኖሩ ይችላሉ።",
    Oromo: "Bokkaan yeroo abbootiin yeroo amalaatiin ni dhufu; yeroo goggogaa ni uumama.",
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
};

function normPhone(raw: unknown): string | null {
  let s = String(raw ?? "").trim().replace(/[\s-]/g, "");
  if (/^09\d{8}$/.test(s)) s = `+251${s.slice(1)}`;
  else if (/^9\d{8}$/.test(s)) s = `+251${s}`;
  else if (s.startsWith("251") && !s.startsWith("+")) s = `+${s}`;
  if (!s.startsWith("+251")) return null;
  const rest = s.slice(4);
  if (!/^[1-9]\d{8}$/.test(rest)) return null;
  return `+251${rest}`;
}

function nextCode() {
  codeSeq += 1;
  return `ETH-${String(codeSeq).padStart(4, "0")}`;
}

function upsertFarmer(body: Record<string, unknown>, byId?: string | null): MockSmsFarmer {
  if (byId) {
    const prev = farmers.find((x) => x.id === byId);
    if (!prev) throw new ApiError(404, "Farmer not found.", { error: "not_found" });
    body = { ...prev, ...body };
  }
  const phoneE164 = normPhone(body.phone_number ?? body.phone);
  if (!phoneE164) {
    throw new ApiError(400, "Use 09XXXXXXXX or +251.", { error: "invalid_phone" });
  }
  const duplicatePhone = farmers.some((f) => {
    if (f.phone_number !== phoneE164) return false;
    if (!byId) return true;
    return f.id !== byId;
  });
  if (duplicatePhone) {
    throw new ApiError(409, "This number is already registered.", { error: "duplicate_phone" });
  }
  const full_name = String(body.full_name ?? "").trim();
  if (full_name.length < 2) {
    throw new ApiError(400, "Enter full name.", { error: "invalid_name" });
  }
  const crops = Array.isArray(body.crops) ? body.crops.map(String) : [];
  const langRaw = String(body.language ?? "Amharic");
  const language = langRaw.startsWith("Oromo") || langRaw === "Afaan Oromoo" ? "Oromo" : langRaw === "English" ? "English" : "Amharic";

  const regionRaw = String(body.region_state ?? "").trim();
  if (!isValidEthRegion(regionRaw)) {
    throw new ApiError(400, "Pick a kebele (1–3) from the list.", { error: "invalid_region_state" });
  }
  const dNum = normDistrictMock(body.district_number ?? body.district);
  if (dNum == null) {
    throw new ApiError(400, "Pick District 1–5.", { error: "invalid_district" });
  }

  const row: MockSmsFarmer = {
    id: byId ?? crypto.randomUUID(),
    farmer_code: byId ? String(body.farmer_code ?? "") || nextCode() : nextCode(),
    full_name,
    phone_number: phoneE164,
    language,
    region_state: regionRaw,
    district_number: dNum,
    kebele: `${regionRaw}-d${dNum}`,
    crops,
    is_active: body.is_active != null ? Boolean(body.is_active) : true,
    registered_by: null,
    registered_at: new Date().toISOString(),
    consent_given: Boolean(body.consent_given ?? true),
    last_sms_sent_at: null,
  };
  if (!row.consent_given) {
    throw new ApiError(400, "Consent is required.", { error: "consent_required" });
  }
  if (byId) {
    const i = farmers.findIndex((x) => x.id === byId);
    if (i < 0) throw new ApiError(404, "Farmer not found.", { error: "not_found" }); // should not occur after merge-from-prev
    const prev = farmers[i];
    row.farmer_code = prev.farmer_code;
    row.registered_at = prev.registered_at;
    row.registered_by = prev.registered_by;
    row.last_sms_sent_at = prev.last_sms_sent_at;
    Object.assign(prev, row);
    return prev;
  }
  farmers.push(row);
  return row;
}

function seedIfEmpty() {
  if (farmers.length) return;
  const R = DEMO_KEBELE_SCOPE.region;
  const D = DEMO_KEBELE_SCOPE.district;
  [
    ["Bekele T.", "+251912345678", "Amharic", ["Wheat", "Teff"]],
    ["Tigist A.", "+251923456789", "Oromo", ["Teff"]],
    ["Mulugeta K.", "+251934567890", "Amharic", ["Wheat", "Maize"]],
    ["Hana W.", "+251945678901", "Oromo", ["Teff", "Maize"]],
    ["Alemitu F.", "+251956789012", "Amharic", ["Wheat"]],
  ].forEach(([full_name, phone, language, crops], idx) => {
    upsertFarmer(
      {
        full_name,
        phone_number: String(phone).replace("+251", "0"),
        language,
        region_state: R,
        district_number: D,
        crops,
        consent_given: true,
      },
      undefined,
    );
    if (idx === 2) farmers[farmers.length - 1].is_active = false;
  });
  try {
    upsertFarmer(
      {
        full_name: "Out Of Scope Demo",
        phone_number: "0977777777",
        language: "Amharic",
        region_state: "kebele_1",
        district_number: 1,
        crops: [],
        consent_given: true,
      },
      undefined,
    );
  } catch {
    /* dup reload */
  }
  try {
    upsertFarmer(
      {
        full_name: "Wrong District Demo",
        phone_number: "0966666666",
        language: "Amharic",
        region_state: R,
        district_number: 5,
        crops: ["Teff"],
        consent_given: true,
      },
      undefined,
    );
  } catch {
    /* dup reload */
  }
}

function requireKebele(session: AuthUser | null): AuthUser {
  if (!session || session.role !== "kebele_worker") {
    throw new ApiError(403, "Kebele worker session required.", { error: "forbidden" });
  }
  return session;
}

function filterTargets(filters: Record<string, unknown>, workerScope: { region: string; district: number } | null) {
  seedIfEmpty();
  let rows = farmers.filter((f) => f.is_active && f.consent_given);
  if (workerScope) {
    rows = rows.filter((f) => f.region_state === workerScope.region && Number(f.district_number) === workerScope.district);
  }
  if (filters.all_farmers) return rows;
  const crops = filters.crops as string[] | undefined;
  if (crops?.length) return rows.filter((f) => f.crops.some((c) => crops.includes(c)));
  return [];
}

function d(v: unknown): string {
  const t = String(v ?? "").trim();
  return t || "—";
}

function pickLangFromAd(
  ad: Advisory,
  bundleKey: "fertilizer_by_lang" | "forecast_by_lang",
  legacyKey: string,
  uiLang: string,
): string {
  const prefs =
    uiLang === "Oromo"
      ? ["Oromo", "English", "Amharic"]
      : uiLang === "English"
        ? ["English", "Amharic", "Oromo"]
        : ["Amharic", "English", "Oromo"];
  const bundle = ad[bundleKey];
  if (bundle && typeof bundle === "object") {
    for (const p of prefs) {
      const v = (bundle as Record<string, unknown>)[p];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return String(ad[legacyKey] ?? "").trim();
}

/** Mirrors `backend/src/agriSms/messageBuilder.js` for mock previews */
function buildMsg(ad: Advisory, kebele: string, lang: string, include: Record<string, boolean>) {
  const cropRec = Array.isArray(ad.recommended_crops) ? (ad.recommended_crops as string[]).join(", ") : "";
  const cropAvoid = Array.isArray(ad.not_recommended_crops) ? (ad.not_recommended_crops as string[]).join(", ") : "";
  const parts: string[] = [];
  if (lang === "Oromo") parts.push(`Gorsa Qonnaa — Ganda ${kebele}`);
  else if (lang === "English") parts.push(`Agri advisory — ${kebele} kebele`);
  else parts.push(`የግብርና ምክር — ${kebele} ቀበሌ`);

  const season = d(ad.season);
  if (season !== "—") {
    if (lang === "Oromo") parts.push(`Yeroo\n· ${season}`);
    else if (lang === "English") parts.push(`Season\n· ${season}`);
    else parts.push(`ወቅት\n· ${season}`);
  }

  const fertLine = d(pickLangFromAd(ad, "fertilizer_by_lang", "fertilizer_recommendation", lang));
  const foreLine = d(pickLangFromAd(ad, "forecast_by_lang", "forecast_summary", lang));

  if (include.soil) {
    if (lang === "Oromo") {
      parts.push(`Biyyee fi xaa'oo\n· Haala: ${d(ad.soil_condition)}\n· pH: ${d(ad.soil_ph)}\n· Xurii/fertilizer: ${fertLine}`);
    } else if (lang === "English") {
      parts.push(`Soil & fertilizer\n· Condition: ${d(ad.soil_condition)}\n· pH: ${d(ad.soil_ph)}\n· Fertilizer: ${fertLine}`);
    } else {
      parts.push(`አፈር እና ማዕድን\n· ሁኔታ፡ ${d(ad.soil_condition)}\n· pH፡ ${d(ad.soil_ph)}\n· ማስፋፋያ / ፔርቲላይዜሽን፡ ${fertLine}`);
    }
  }
  if (include.weather) {
    const rs = d(ad.rain_start);
    const re = d(ad.rain_end);
    const range = rs !== "—" && re !== "—" ? (lang === "Oromo" ? `${rs} irraa ${re}tti` : lang === "English" ? `${rs} → ${re}` : `ከ ${rs} እስከ ${re}`) : "—";
    let w =
      lang === "Oromo"
        ? `Roobaa fi qilleensaa\n· Yeroo: ${range}\n· ${foreLine}`
        : lang === "English"
          ? `Rain & weather\n· Window: ${range}\n· ${foreLine}`
          : `ዝናብ እና አየር\n· ጊዜ፡ ${range}\n· ${foreLine}`;
    const alert = String(ad.weather_alert ?? "None");
    if (alert && alert !== "None") {
      w += lang === "Oromo" ? `\n· Akeekkachiisa: ${alert}` : lang === "English" ? `\n· Alert: ${alert}` : `\n· ማስጠንቀቂያ፡ ${alert}`;
    }
    parts.push(w);
  }
  if (include.crops) {
    parts.push(
      lang === "Oromo"
        ? `Midhaan\n· Facuuf: ${cropRec || "—"}\n· Hin facin: ${cropAvoid || "—"}\n· Gorsa: ${d(ad.planting_advice)}`
        : lang === "English"
          ? `Crops\n· Plant: ${cropRec || "—"}\n· Avoid: ${cropAvoid || "—"}\n· Advice: ${d(ad.planting_advice)}`
          : `መከር\n· ይትከሉ፡ ${cropRec || "—"}\n· አይትከሉ፡ ${cropAvoid || "—"}\n· ምክር፡ ${d(ad.planting_advice)}`,
    );
  }
  if (include.prices) {
    parts.push(
      lang === "Oromo"
        ? `Gatii (Birr / q)\n· Qamadii ${ad.wheat_price_etb ?? "—"}\n· Taffii ${ad.teff_price_etb ?? "—"}\n· Micira ${ad.maize_price_etb ?? "—"}\n· Garbuu ${ad.barley_price_etb ?? "—"}\n· Haala gatii: ${d(ad.market_trend)}`
        : lang === "English"
          ? `Prices (ETB / q)\n· Wheat ${ad.wheat_price_etb ?? "—"}\n· Teff ${ad.teff_price_etb ?? "—"}\n· Maize ${ad.maize_price_etb ?? "—"}\n· Barley ${ad.barley_price_etb ?? "—"}\n· Trend: ${d(ad.market_trend)}`
          : `ዋጋ (ብር / ኩንታል)\n· ስንዴ ${ad.wheat_price_etb ?? "—"}\n· ጤፍ ${ad.teff_price_etb ?? "—"}\n· ማሽ ${ad.maize_price_etb ?? "—"}\n· ገብስ ${ad.barley_price_etb ?? "—"}\n· አካባቢ ዋጋ፡ ${d(ad.market_trend)}`,
    );
  }
  parts.push(
    lang === "English"
      ? "Contact your kebele office for more information."
      : lang === "Oromo"
        ? "Odeeffannoo dabalataa bilisummaa kee irraa gaafadhu."
        : "የበለጠ መረጃ ወደ ቀበሌ ቢሮ ይጠይቁ።",
  );
  return parts.join("\n\n");
}

function segLen(text: string) {
  return Math.max(1, Math.ceil([...text].length / 160));
}

export function tryHandleAgriSms<T>(
  pathname: string,
  search: string,
  method: string,
  rawBody: string | undefined,
  parseJson: (b: string | undefined) => Record<string, unknown>,
  session: AuthUser | null,
): T | undefined {
  seedIfEmpty();

  if (!pathname.startsWith("/api/v1/agri-sms")) return undefined;

  const json = parseJson(rawBody);

  if (method === "POST" && pathname === "/api/v1/agri-sms/farmers/register") {
    const row = upsertFarmer({ ...json, consent_given: true }, undefined);
    return {
      ok: true,
      farmer: {
        id: row.id,
        farmer_code: row.farmer_code,
        full_name: row.full_name,
        phone_number: row.phone_number,
        language: row.language,
        kebele: row.kebele,
        region_state: row.region_state,
        district_number: row.district_number,
        crops: row.crops,
        registered_at: row.registered_at,
      },
      welcome_sms_queued: true,
    } as T;
  }

  requireKebele(session);

  if (method === "GET" && pathname === "/api/v1/agri-sms/farmers") {
    const params = new URLSearchParams(search);
    const q = (params.get("search") ?? "").trim().toLowerCase();
    const sc = clerkSmsScope(session)!;
    let rows = farmers.filter((f) => f.region_state === sc.region && Number(f.district_number) === sc.district);
    if (q) {
      rows = rows.filter(
        (f) =>
          f.full_name.toLowerCase().includes(q) ||
          f.phone_number.includes(q) ||
          f.farmer_code.toLowerCase().includes(q),
      );
    }
    return { ok: true, farmers: rows, total: rows.length } as T;
  }

  if (method === "POST" && pathname === "/api/v1/agri-sms/farmers") {
    const sc = clerkSmsScope(session)!;
    const row = upsertFarmer(
      {
        ...json,
        region_state: json.region_state ?? sc.region,
        district_number: json.district_number ?? sc.district,
        consent_given: true,
      },
      undefined,
    );
    return { ok: true, farmer: row } as T;
  }

  const farmerById = pathname.match(/^\/api\/v1\/agri-sms\/farmers\/([^/]+)$/);
  if (method === "PUT" && farmerById) {
    const id = decodeURIComponent(farmerById[1]);
    const row = upsertFarmer({ ...json, consent_given: true }, id);
    return { ok: true, farmer: row } as T;
  }

  if (method === "DELETE" && farmerById) {
    const id = decodeURIComponent(farmerById[1]);
    const prev = farmers.find((f) => f.id === id);
    if (!prev) throw new ApiError(404, "Farmer not found.", { error: "not_found" });
    prev.is_active = false;
    return { ok: true, farmer: prev } as T;
  }

  if (method === "GET" && pathname === "/api/v1/agri-sms/advisories/current") {
    return { ok: true, advisory } as T;
  }

  if (method === "POST" && pathname === "/api/v1/agri-sms/advisories") {
    const cur = advisory;
    const input = json;
    advisory = {
      ...cur,
      ...input,
      fertilizer_by_lang:
        input.fertilizer_by_lang != null && typeof input.fertilizer_by_lang === "object"
          ? { ...(cur.fertilizer_by_lang as object), ...(input.fertilizer_by_lang as object) }
          : cur.fertilizer_by_lang,
      forecast_by_lang:
        input.forecast_by_lang != null && typeof input.forecast_by_lang === "object"
          ? { ...(cur.forecast_by_lang as object), ...(input.forecast_by_lang as object) }
          : cur.forecast_by_lang,
      updated_at: new Date().toISOString(),
    };
    return { ok: true, advisory } as T;
  }

  if (method === "POST" && pathname === "/api/v1/agri-sms/advisories/ai-draft") {
    seedIfEmpty();
    const sc = clerkSmsScope(session)!;
    const rows = farmers.filter(
      (f) =>
        f.region_state === sc.region &&
        Number(f.district_number) === sc.district &&
        f.is_active &&
        f.consent_given,
    );
    const kb = smsAreaEnglish(sc.region, sc.district);
    const cropCounts: Record<string, number> = {};
    for (const r of rows) {
      for (const c of r.crops) {
        cropCounts[c] = (cropCounts[c] ?? 0) + 1;
      }
    }
    const y = new Date().getFullYear();
    const cropsLine = Object.keys(cropCounts).join(", ") || "typical cereals";
    const fertEn = `NPS at planting; top-dress urea at tillering per extension. Fits ${kb} (${cropsLine}).`;
    const foreEn = `Rain may follow usual Kiremt timing; totals often near normal; short dry spells still possible.`;
    const draft = {
      season: `Meher ${y}`,
      fertilizer_recommendation: fertEn,
      fertilizer_by_lang: {
        Amharic: `በመትከያ ኤንፒኤስ ይጠቀሙ፤ በአማራጭ ደረጃ ዩሪያ እንደ ምክር። ${kb} (${cropsLine})።`,
        Oromo: `NPS yeroo facaa; urea yeroo dafinsa akka gorsa. ${kb} (${cropsLine}).`,
        English: fertEn,
      },
      forecast_summary: foreEn,
      forecast_by_lang: {
        Amharic: `ዝናብ የተለመደውን ኪረምት ሊያምን ይችላል፤ አጠገናው ተለዋዋጭ ሊሆን ይችላል።`,
        Oromo: `Roobni yeroo kireemtii akka barbaachisummaa ol'aanaatti dhufuu danda'a; gagaa gagaa akka jiru.`,
        English: foreEn,
      },
      rain_start: `${y}-06-15`,
      rain_end: `${y}-09-30`,
      weather_alert: "None" as const,
    };
    const context_used = {
      region_state: sc.region,
      district_number: sc.district,
      area_summary: kb,
      active_farmer_count: rows.length,
      crop_counts: cropCounts,
      signup_locations_sample: [],
    };
    return { ok: true, provider: "mock", context_used, draft } as T;
  }

  if (method === "POST" && pathname === "/api/v1/agri-sms/broadcasts/preview") {
    const incl = {
      soil: Boolean((json.include as Record<string, boolean> | undefined)?.soil ?? true),
      weather: Boolean((json.include as Record<string, boolean> | undefined)?.weather ?? true),
      crops: Boolean((json.include as Record<string, boolean> | undefined)?.crops ?? true),
      prices: Boolean((json.include as Record<string, boolean> | undefined)?.prices ?? true),
    };
    const sc = clerkSmsScope(session)!;
    const k = smsAreaEnglish(sc.region, sc.district);
    const ad = json.advisory ? { ...advisory, ...json.advisory } : advisory;
    const am = buildMsg(ad, k, "Amharic", incl);
    const om = buildMsg(ad, k, "Oromo", incl);
    const en = buildMsg(ad, k, "English", incl);
    return {
      ok: true,
      messages: { Amharic: am, Oromo: om, English: en },
      segments: { Amharic: segLen(am), Oromo: segLen(om), English: segLen(en) },
    } as T;
  }

  if (method === "POST" && pathname === "/api/v1/agri-sms/broadcasts") {
    const filters = (json.target_filters as Record<string, unknown>) ?? { all_farmers: true };
    const targets = filterTargets(filters, clerkSmsScope(session));
    const incl = {
      soil: Boolean((json.include as Record<string, boolean> | undefined)?.soil ?? true),
      weather: Boolean((json.include as Record<string, boolean> | undefined)?.weather ?? true),
      crops: Boolean((json.include as Record<string, boolean> | undefined)?.crops ?? true),
      prices: Boolean((json.include as Record<string, boolean> | undefined)?.prices ?? true),
    };
    const sc = clerkSmsScope(session)!;
    const k = smsAreaEnglish(sc.region, sc.district);
    const message_amharic = buildMsg(advisory, k, "Amharic", incl);
    const message_oromo = buildMsg(advisory, k, "Oromo", incl);
    const message_english = buildMsg(advisory, k, "English", incl);
    const seg = Math.max(segLen(message_amharic), segLen(message_oromo), segLen(message_english));
    const target_count = targets.length;
    const estimated_cost_etb = target_count * seg * 1;
    const id = crypto.randomUUID();
    const external_id = `BC-${new Date().toISOString().slice(0, 10)}-001`;
    const logs = targets.map((farmer, i) => {
      const msg = farmer.language === "Oromo" ? message_oromo : farmer.language === "English" ? message_english : message_amharic;
      let status = "SENT";
      if (i >= Math.floor(target_count * 0.55)) status = "QUEUED";
      if (i === target_count - 1 && target_count > 3) status = "FAILED";
      return {
        id: crypto.randomUUID(),
        broadcast_id: id,
        farmer_id: farmer.id,
        farmer_name: farmer.full_name,
        phone_number: farmer.phone_number,
        message: msg,
        language: farmer.language,
        sms_segments: seg,
        status,
        error_message: status === "FAILED" ? "Aggregator timeout (demo)" : null,
        sent_at: status === "SENT" ? new Date().toISOString() : null,
        cost_etb: status === "SENT" ? seg : null,
      };
    });
    const sent = logs.filter((l) => l.status === "SENT").length;
    const queued = logs.filter((l) => l.status === "QUEUED").length;
    const failed = logs.filter((l) => l.status === "FAILED").length;
    const bc = {
      id,
      external_id,
      advisory_id: advisory.id,
      created_by: requireKebele(session).id,
      message_amharic,
      message_oromo,
      message_english,
      target_filters: filters,
      target_count,
      sms_segments: seg,
      estimated_cost_etb,
      status: queued > 0 ? "SENDING" : "COMPLETED",
      created_at: new Date().toISOString(),
      completed_at: null,
      progress: target_count ? sent / target_count : 0,
      log_summary: { sent, queued, failed, total: logs.length },
    };
    broadcasts.unshift(bc);
    logsByBroadcast.set(id, logs);
    return { ok: true, broadcast: bc } as T;
  }

  const st = pathname.match(/^\/api\/v1\/agri-sms\/broadcasts\/([^/]+)\/status$/);
  if (method === "GET" && st) {
    const bid = decodeURIComponent(st[1]);
    const bc = broadcasts.find((b) => b.id === bid) ?? null;
    if (!bc) throw new ApiError(404, "Broadcast not found.", { error: "not_found" });
    const log = logsByBroadcast.get(bid) ?? [];
    return { ok: true, broadcast: bc, log } as T;
  }

  const retryM = pathname.match(/^\/api\/v1\/agri-sms\/broadcasts\/([^/]+)\/retry$/);
  if (method === "POST" && retryM) {
    const bid = decodeURIComponent(retryM[1]);
    const log = logsByBroadcast.get(bid) ?? [];
    const mapped = log.map((l) => (l.status === "FAILED" ? { ...l, status: "QUEUED", error_message: null } : l));
    logsByBroadcast.set(bid, mapped);
    return { ok: true, message: "Re-queued (demo).", log: mapped } as T;
  }

  if (method === "GET" && pathname === "/api/v1/agri-sms/reports/sms-cost") {
    const total = broadcasts.reduce((s, b) => s + Number(b.estimated_cost_etb ?? 0), 0);
    return { ok: true, broadcasts: broadcasts.length, estimated_total_etb: total } as T;
  }

  if (method === "GET" && pathname === "/api/v1/agri-sms/reports/delivery") {
    return {
      ok: true,
      recent_broadcasts: broadcasts.slice(0, 10).map((b) => ({
        id: b.id,
        external_id: b.external_id,
        status: b.status,
        target_count: b.target_count,
        created_at: b.created_at,
      })),
    } as T;
  }

  return undefined;
}
