/**
 * Demo in-memory Agricultural Advisory SMS API (parity with backend/src/agriSms).
 */
import type { AuthUser } from "@/auth/types";
import { ApiError } from "@/api/errors";

export type MockSmsFarmer = {
  id: string;
  farmer_code: string;
  full_name: string;
  phone_number: string;
  language: string;
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

  const row: MockSmsFarmer = {
    id: byId ?? crypto.randomUUID(),
    farmer_code: byId ? String(body.farmer_code ?? "") || nextCode() : nextCode(),
    full_name,
    phone_number: phoneE164,
    language,
    kebele: String(body.kebele ?? "Bako").trim() || "Bako",
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
  [
    ["Bekele T.", "+251912345678", "Amharic", "Bako", ["Wheat", "Teff"]],
    ["Tigist A.", "+251923456789", "Oromo", "Guto Gida", ["Teff"]],
    ["Mulugeta K.", "+251934567890", "Amharic", "Bako", ["Wheat", "Maize"]],
    ["Hana W.", "+251945678901", "Oromo", "Guto Gida", ["Teff", "Maize"]],
    ["Alemitu F.", "+251956789012", "Amharic", "Bako", ["Wheat"]],
  ].forEach(([full_name, phone, language, kebele, crops], idx) => {
    upsertFarmer({
      full_name,
      phone_number: String(phone).replace("+251", "0"),
      language,
      kebele,
      crops,
      consent_given: true,
    });
    if (idx === 2) farmers[farmers.length - 1].is_active = false;
  });
}

function requireKebele(session: AuthUser | null): AuthUser {
  if (!session || session.role !== "kebele_worker") {
    throw new ApiError(403, "Kebele worker session required.", { error: "forbidden" });
  }
  return session;
}

function filterTargets(filters: Record<string, unknown>): MockSmsFarmer[] {
  seedIfEmpty();
  let rows = farmers.filter((f) => f.is_active && f.consent_given);
  if (filters.all_farmers) return rows;
  const kebes = filters.kebeles as string[] | undefined;
  if (kebes?.length) rows = rows.filter((f) => kebes.includes(f.kebele));
  const crops = filters.crops as string[] | undefined;
  if (crops?.length) rows = rows.filter((f) => f.crops.some((c) => crops.includes(c)));
  if (!kebes?.length && !crops?.length) return [];
  return rows;
}

function buildMsg(ad: Advisory, kebele: string, lang: string, include: Record<string, boolean>) {
  const parts: string[] = [];
  if (lang === "Oromo") parts.push(`Gorsa Qonnaa - Ganda ${kebele}`);
  else if (lang === "English") parts.push(`Agri advisory - ${kebele} kebele`);
  else parts.push(`የግብርና ምክር - ${kebele} ቀበሌ`);
  if (include.soil) {
    parts.push(`${lang === "English" ? "Soil:" : lang === "Oromo" ? "Biyyee:" : "አፈር፡"} ${ad.soil_condition} — ${ad.fertilizer_recommendation}`);
  }
  if (include.weather) {
    parts.push(
      `${lang === "English" ? "Rain:" : lang === "Oromo" ? "Bokkaan:" : "ዝናብ፡"} ${ad.rain_start} – ${ad.rain_end}. ${ad.forecast_summary}`,
    );
  }
  if (include.crops) {
    parts.push(
      `${(ad.recommended_crops as string[]).join(", ")} • ${lang === "English" ? "Avoid:" : "—"} ${(ad.not_recommended_crops as string[]).join(", ")}. ${ad.planting_advice}`,
    );
  }
  if (include.prices) {
    parts.push(
      `ETB/Q: Wheat ${ad.wheat_price_etb}, Teff ${ad.teff_price_etb}, Maize ${ad.maize_price_etb}. ${ad.market_trend}`,
    );
  }
  parts.push(lang === "English" ? "Contact kebele office." : lang === "Oromo" ? "Bilisummaa keessatti gaafadhu." : "ወደ ቀበሌ ቢሮ ይጠይቁ።");
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
    const row = upsertFarmer({ ...json, consent_given: true });
    return {
      ok: true,
      farmer: {
        id: row.id,
        farmer_code: row.farmer_code,
        full_name: row.full_name,
        phone_number: row.phone_number,
        language: row.language,
        kebele: row.kebele,
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
    let rows = [...farmers];
    if (q) {
      rows = rows.filter(
        (f) =>
          f.full_name.toLowerCase().includes(q) ||
          f.phone_number.includes(q) ||
          f.farmer_code.toLowerCase().includes(q),
      );
    }
    const kb = params.get("kebele");
    if (kb && kb !== "all") rows = rows.filter((f) => f.kebele === kb);
    return { ok: true, farmers: rows, total: rows.length } as T;
  }

  if (method === "POST" && pathname === "/api/v1/agri-sms/farmers") {
    const row = upsertFarmer({ ...json, consent_given: true });
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
    advisory = { ...advisory, ...json, updated_at: new Date().toISOString() };
    return { ok: true, advisory } as T;
  }

  if (method === "POST" && pathname === "/api/v1/agri-sms/broadcasts/preview") {
    const incl = {
      soil: Boolean((json.include as Record<string, boolean> | undefined)?.soil ?? true),
      weather: Boolean((json.include as Record<string, boolean> | undefined)?.weather ?? true),
      crops: Boolean((json.include as Record<string, boolean> | undefined)?.crops ?? true),
      prices: Boolean((json.include as Record<string, boolean> | undefined)?.prices ?? true),
    };
    const k = String(json.kebele ?? "Bako");
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
    const targets = filterTargets(filters);
    const incl = {
      soil: Boolean((json.include as Record<string, boolean> | undefined)?.soil ?? true),
      weather: Boolean((json.include as Record<string, boolean> | undefined)?.weather ?? true),
      crops: Boolean((json.include as Record<string, boolean> | undefined)?.crops ?? true),
      prices: Boolean((json.include as Record<string, boolean> | undefined)?.prices ?? true),
    };
    const k = String((filters.kebeles as string[] | undefined)?.[0] ?? "Bako");
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
