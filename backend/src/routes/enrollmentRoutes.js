import { Router } from "express";
import { authenticateJwt, authorizeRoles } from "../middleware/authJwt.js";
import {
  createInvestorEnrollment,
  listPendingInvestorsForEnroller,
} from "../data/bankTellerMemory.js";

export const enrollmentRouter = Router();

enrollmentRouter.post(
  "/investors",
  authenticateJwt,
  authorizeRoles("enrollment_clerk", "district_admin"),
  (req, res) => {
    try {
      const body = req.body ?? {};
      const required = [
        "org_name",
        "org_type",
        "tin_number",
        "contact_name",
        "contact_phone",
        "contact_email",
        "registration_doc_url",
      ];
      for (const k of required) {
        if (!body[k] || String(body[k]).trim() === "") {
          return res.status(400).json({ error: "validation", message: `Missing ${k}` });
        }
      }
      const out = createInvestorEnrollment(body, req.auth.sub);
      res.status(201).json({
        ok: true,
        investor_org_id: out.investor_org.id,
        invitation_token: out.invitation_token,
        invitation_expires_at: out.investor_org.invitation_expires_at,
        magic_link_preview: out.magic_link_path,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "server_error" });
    }
  },
);

enrollmentRouter.get(
  "/pending-investors",
  authenticateJwt,
  authorizeRoles("enrollment_clerk", "district_admin"),
  (req, res) => {
    const isAdmin = req.auth.role === "district_admin";
    const list = listPendingInvestorsForEnroller(req.auth.sub, isAdmin);
    res.json({ ok: true, investors: list });
  },
);
