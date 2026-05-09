import { randomUUID } from "crypto";
import { Router } from "express";
import { authenticateJwt, authorizeRoles } from "../middleware/authJwt.js";
import { buildAdvisorySms, estimateSegments } from "../agriSms/messageBuilder.js";
import {
  agriSmsStore,
  filterTargets,
  insertBroadcast,
  listFarmers,
  registerSmsFarmer,
  saveAdvisory,
  updateFarmer,
  getBroadcast,
  getBroadcastLogs,
} from "../agriSms/agriSmsStore.js";

export const agriSmsPublicRouter = Router();
export const agriSmsWorkerRouter = Router();

function mapSmsErr(res, err) {
  const c = err.code ?? err.message;
  switch (c) {
    case "INVALID_PHONE":
      return res.status(400).json({ error: "invalid_phone", message: "Use 09XXXXXXXX or +251 format." });
    case "DUPLICATE_PHONE":
      return res.status(409).json({ error: "duplicate_phone", message: "This number is already registered." });
    case "INVALID_NAME":
      return res.status(400).json({ error: "invalid_name", message: "Enter full name." });
    case "CONSENT_REQUIRED":
      return res.status(400).json({ error: "consent_required", message: "Consent is required." });
    default:
      console.error(err);
      return res.status(500).json({ error: "server_error", message: "Something went wrong." });
  }
}

/** Public — farmer SMS self-registration */
agriSmsPublicRouter.post("/farmers/register", (req, res) => {
  try {
    const farmer = registerSmsFarmer(req.body ?? {}, null);
    return res.status(201).json({
      ok: true,
      farmer: {
        id: farmer.id,
        farmer_code: farmer.farmer_code,
        full_name: farmer.full_name,
        phone_number: farmer.phone_number,
        language: farmer.language,
        kebele: farmer.kebele,
        crops: farmer.crops,
        registered_at: farmer.registered_at,
      },
      welcome_sms_queued: true,
    });
  } catch (err) {
    return mapSmsErr(res, err);
  }
});

agriSmsWorkerRouter.use(authenticateJwt, authorizeRoles("kebele_worker"));

agriSmsWorkerRouter.get("/farmers", (req, res) => {
  const search = req.query.search;
  const kebele = req.query.kebele;
  const rows = listFarmers({ search: search ?? "", kebele: kebele ?? "all" });
  res.json({ ok: true, farmers: rows, total: rows.length });
});

agriSmsWorkerRouter.post("/farmers", (req, res) => {
  try {
    const farmer = registerSmsFarmer(
      {
        ...req.body,
        phone_number: req.body?.phone ?? req.body?.phone_number,
        consent_given: true,
      },
      req.auth.sub,
    );
    res.status(201).json({
      ok: true,
      farmer,
    });
  } catch (err) {
    return mapSmsErr(res, err);
  }
});

agriSmsWorkerRouter.put("/farmers/:id", (req, res) => {
  try {
    const updated = updateFarmer(req.params.id, req.body ?? {}, true);
    if (!updated) return res.status(404).json({ error: "not_found", message: "Farmer not found." });
    res.json({ ok: true, farmer: updated });
  } catch (err) {
    return mapSmsErr(res, err);
  }
});

agriSmsWorkerRouter.delete("/farmers/:id", (req, res) => {
  const updated = updateFarmer(req.params.id, { is_active: false }, true);
  if (!updated) return res.status(404).json({ error: "not_found", message: "Farmer not found." });
  res.json({ ok: true, farmer: updated });
});

agriSmsWorkerRouter.get("/advisories/current", (_req, res) => {
  res.json({ ok: true, advisory: agriSmsStore.currentAdvisory });
});

agriSmsWorkerRouter.post("/advisories", (req, res) => {
  const advisory = saveAdvisory(req.body ?? {});
  res.json({ ok: true, advisory });
});

/** Preview SMS bodies */
agriSmsWorkerRouter.post("/broadcasts/preview", (req, res) => {
  const advisory = req.body?.advisory ? { ...agriSmsStore.currentAdvisory, ...req.body.advisory } : agriSmsStore.currentAdvisory;
  const kebele = req.body?.kebele ?? "Bako";
  const include = {
    soil: Boolean(req.body?.include?.soil ?? true),
    weather: Boolean(req.body?.include?.weather ?? true),
    crops: Boolean(req.body?.include?.crops ?? true),
    prices: Boolean(req.body?.include?.prices ?? true),
  };
  const am = buildAdvisorySms({ advisory, kebeleLabel: kebele, language: "Amharic", include });
  const om = buildAdvisorySms({ advisory, kebeleLabel: kebele, language: "Oromo", include });
  const en = buildAdvisorySms({ advisory, kebeleLabel: kebele, language: "English", include });
  res.json({
    ok: true,
    messages: {
      Amharic: am,
      Oromo: om,
      English: en,
    },
    segments: {
      Amharic: estimateSegments(am),
      Oromo: estimateSegments(om),
      English: estimateSegments(en),
    },
  });
});

agriSmsWorkerRouter.post("/broadcasts", (req, res) => {
  const advisory = agriSmsStore.currentAdvisory;
  const filters = req.body?.target_filters ?? { all_farmers: true };
  const targets = filterTargets(filters);
  const include = {
    soil: Boolean(req.body?.include?.soil ?? true),
    weather: Boolean(req.body?.include?.weather ?? true),
    crops: Boolean(req.body?.include?.crops ?? true),
    prices: Boolean(req.body?.include?.prices ?? true),
  };
  const kebeleFocus = filters.kebeles?.[0] ?? "Bako";

  const message_amharic = buildAdvisorySms({
    advisory,
    kebeleLabel: kebeleFocus,
    language: "Amharic",
    include,
  });
  const message_oromo = buildAdvisorySms({
    advisory,
    kebeleLabel: kebeleFocus,
    language: "Oromo",
    include,
  });
  const message_english = buildAdvisorySms({
    advisory,
    kebeleLabel: kebeleFocus,
    language: "English",
    include,
  });

  /** Weight segment estimate by farmer language distribution */
  const segAm = estimateSegments(message_amharic);
  const segOr = estimateSegments(message_oromo);
  const segEn = estimateSegments(message_english);

  let weightedSeg = segAm;
  if (targets.length) {
    const nAm = targets.filter((f) => f.language !== "Oromo" && f.language !== "English").length;
    const nOr = targets.filter((f) => f.language === "Oromo").length;
    const nEn = targets.filter((f) => f.language === "English").length;
    weightedSeg =
      (nAm * segAm + nOr * segOr + nEn * segEn) / Math.max(targets.length, 1);
  }
  weightedSeg = Math.ceil(weightedSeg);

  const target_count = targets.length;
  const costPerSms = Number(process.env.AGRI_SMS_COST_ETB ?? 1);
  const estimated_cost_etb = target_count * weightedSeg * costPerSms;

  const id = randomUUID();
  const external_id = `BC-${new Date().toISOString().slice(0, 10)}-${String(agriSmsStore.broadcasts.length + 1).padStart(3, "0")}`;

  const logs = targets.map((farmer, i) => {
    const msg =
      farmer.language === "Oromo"
        ? message_oromo
        : farmer.language === "English"
          ? message_english
          : message_amharic;
    let status = "SENT";
    if (i >= Math.floor(target_count * 0.55)) status = "QUEUED";
    if (i === target_count - 1 && target_count > 3) status = "FAILED";
    return {
      id: randomUUID(),
      broadcast_id: id,
      farmer_id: farmer.id,
      farmer_name: farmer.full_name,
      phone_number: farmer.phone_number,
      message: msg,
      language: farmer.language,
      sms_segments: farmer.language === "Oromo" ? segOr : farmer.language === "English" ? segEn : segAm,
      status,
      error_message: status === "FAILED" ? "Aggregator timeout (demo)" : null,
      sent_at: status === "SENT" ? new Date(Date.now() - (target_count - i) * 900).toISOString() : null,
      cost_etb: status === "SENT" ? costPerSms * (farmer.language === "Oromo" ? segOr : farmer.language === "English" ? segEn : segAm) : null,
    };
  });

  const sent = logs.filter((l) => l.status === "SENT").length;
  const queued = logs.filter((l) => l.status === "QUEUED").length;
  const failed = logs.filter((l) => l.status === "FAILED").length;

  const broadcast = {
    id,
    external_id,
    advisory_id: advisory.id,
    created_by: req.auth.sub,
    message_amharic,
    message_oromo,
    message_english,
    target_filters: filters,
    target_count,
    sms_segments: weightedSeg,
    estimated_cost_etb,
    status: queued > 0 ? "SENDING" : failed && !sent ? "FAILED" : "COMPLETED",
    created_at: new Date().toISOString(),
    completed_at: queued === 0 ? new Date().toISOString() : null,
    progress: target_count ? sent / target_count : 0,
    log_summary: { sent, queued, failed, total: logs.length },
  };

  insertBroadcast(broadcast, logs);
  res.status(201).json({ ok: true, broadcast });
});

agriSmsWorkerRouter.get("/broadcasts/:id/status", (req, res) => {
  const b = getBroadcast(req.params.id);
  if (!b) return res.status(404).json({ error: "not_found", message: "Broadcast not found." });
  const logs = getBroadcastLogs(b.id);
  res.json({ ok: true, broadcast: b, log: logs });
});

agriSmsWorkerRouter.post("/broadcasts/:id/retry", (req, res) => {
  const b = getBroadcast(req.params.id);
  if (!b) return res.status(404).json({ error: "not_found", message: "Broadcast not found." });
  const logs = getBroadcastLogs(b.id);
  const retried = logs.map((l) =>
    l.status === "FAILED"
      ? { ...l, status: "QUEUED", error_message: null }
      : l,
  );
  agriSmsStore.smsLogsByBroadcastId.set(b.id, retried);
  res.json({ ok: true, message: "Failed messages re-queued (demo).", log: retried });
});

agriSmsWorkerRouter.get("/reports/sms-cost", (_req, res) => {
  const total = agriSmsStore.broadcasts.reduce((s, b) => s + Number(b.estimated_cost_etb ?? 0), 0);
  res.json({
    ok: true,
    broadcasts: agriSmsStore.broadcasts.length,
    estimated_total_etb: total,
  });
});

agriSmsWorkerRouter.get("/reports/delivery", (_req, res) => {
  const rows = agriSmsStore.broadcasts.slice(0, 10).map((b) => ({
    id: b.id,
    external_id: b.external_id,
    status: b.status,
    target_count: b.target_count,
    created_at: b.created_at,
  }));
  res.json({ ok: true, recent_broadcasts: rows });
});
