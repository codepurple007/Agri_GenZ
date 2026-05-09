import { Router } from "express";
import { authenticateJwt, authorizeRoles } from "../middleware/authJwt.js";
import {
  getFarmerByAnonymousCode,
  listClerkDisbursementQueue,
  recordFarmerAccess,
} from "../data/bankTellerMemory.js";

export const clerkApiRouter = Router();

clerkApiRouter.get(
  "/disbursement-queue",
  authenticateJwt,
  authorizeRoles("clerk"),
  (_req, res) => {
    res.json({ ok: true, items: listClerkDisbursementQueue() });
  },
);

clerkApiRouter.post(
  "/farmer/:farmerId/verify-for-disbursement",
  authenticateJwt,
  authorizeRoles("clerk"),
  (req, res) => {
    const farmerId = req.params.farmerId;
    const code = req.body?.anonymous_code ?? req.body?.qr_payload;
    if (!code) {
      return res.status(400).json({ error: "bad_request", message: "anonymous_code required." });
    }
    const farmer = getFarmerByAnonymousCode(code);
    if (!farmer || farmer.id !== farmerId) {
      return res.status(403).json({
        error: "verification_failed",
        message: "Code does not match this farmer record.",
      });
    }
    const out = recordFarmerAccess(req.auth.sub, farmer.id, "DISBURSEMENT");
    res.json({
      ok: true,
      access_token: out.access_token,
      expires_at: out.expires_at,
      farmer: {
        id: farmer.id,
        full_name: farmer.full_name,
        phone_e164: farmer.phone_e164,
        anonymous_code: farmer.anonymous_code,
        photo_url: farmer.photo_url,
      },
    });
  },
);
