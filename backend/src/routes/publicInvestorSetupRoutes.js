import { Router } from "express";
import {
  completeInvestorSetup,
  getInvitationByToken,
} from "../data/bankTellerMemory.js";

export const publicInvestorSetupRouter = Router();

function sendInvite(res, token) {
  const inv = getInvitationByToken(token);
  if (!inv) {
    return res.status(404).json({ error: "invalid_token", message: "Invalid invitation." });
  }
  if (inv.expired) {
    return res.status(410).json({
      error: "invite_expired",
      message: "Invitation expired. Contact your AgriService Center.",
      org_name: inv.org.org_name,
    });
  }
  return res.json({
    ok: true,
    org_name: inv.org.org_name,
    org_type: inv.org.org_type,
    contact_email: inv.org.contact_email,
    setup_completed: !!inv.org.account_setup_completed_at,
    expires_at: inv.org.invitation_expires_at,
  });
}

publicInvestorSetupRouter.get("/setup", (req, res) => sendInvite(res, req.query.token));
publicInvestorSetupRouter.get("/setup/:token", (req, res) => sendInvite(res, req.params.token));

publicInvestorSetupRouter.post("/setup/:token", (req, res) => {
  try {
    const token = req.params.token;
    const password = req.body?.password;
    const confirm = req.body?.confirm_password;
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: "weak_password", message: "Minimum 8 characters." });
    }
    if (password !== confirm) {
      return res.status(400).json({ error: "mismatch", message: "Passwords do not match." });
    }
    const org = completeInvestorSetup(token, password);
    res.json({
      ok: true,
      account_setup_completed_at: org.account_setup_completed_at,
    });
  } catch (err) {
    const c = err.code || err.message;
    if (c === "INVITE_EXPIRED" || c === "INVALID_TOKEN") {
      return res.status(410).json({ error: "invite_expired", message: String(err.message) });
    }
    if (c === "ALREADY_COMPLETED") {
      return res.status(409).json({ error: "already_completed" });
    }
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});
