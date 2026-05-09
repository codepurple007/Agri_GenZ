import { Router } from "express";
import {
  getUserFromPayload,
  investorLogin,
  loginStart,
  loginVerify,
  registerStart,
  registerVerify,
  staffLogin,
  verifyToken,
} from "./authService.js";

export const authRouter = Router();

function mapErr(res, err) {
  const c = err.code || err.message;
  switch (c) {
    case "INVALID_PHONE":
      return res.status(400).json({ error: "invalid_phone", message: "Use a valid +251 mobile number." });
    case "INVALID_NAME":
      return res.status(400).json({ error: "invalid_name", message: "Enter your full name." });
    case "INVALID_ROLE":
      return res.status(400).json({ error: "invalid_role", message: "Choose farmer, extension agent, or district admin." });
    case "USER_EXISTS":
      return res.status(409).json({ error: "user_exists", message: "This number is already registered." });
    case "USER_NOT_FOUND":
      return res.status(404).json({ error: "user_not_found", message: "No account for this number." });
    case "BAD_REQUEST":
      return res.status(400).json({ error: "bad_request", message: "Missing phone or code." });
    case "NO_CHALLENGE":
    case "BAD_CODE":
      return res.status(401).json({ error: "invalid_code", message: "Incorrect or expired code." });
    case "EXPIRED":
      return res.status(401).json({ error: "expired_code", message: "Code expired. Request a new one." });
    case "INVALID_SESSION":
      return res.status(400).json({ error: "invalid_session", message: "Could not complete registration." });
    case "INVALID_CREDENTIALS":
      return res.status(401).json({ error: "invalid_credentials", message: "Incorrect username or password." });
    default:
      console.error(err);
      return res.status(500).json({ error: "server_error", message: "Something went wrong." });
  }
}

authRouter.post("/register/start", async (req, res) => {
  try {
    const { phone, fullName, role } = req.body ?? {};
    const out = await registerStart({ phone, fullName, role });
    res.json({
      ok: true,
      expiresAt: out.expiresAt,
      ...(out.devOtp ? { devOtp: out.devOtp } : {}),
    });
  } catch (err) {
    mapErr(res, err);
  }
});

authRouter.post("/register/verify", async (req, res) => {
  try {
    const { phone, code } = req.body ?? {};
    const { user, token } = await registerVerify({ phone, code });
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        phone: user.phone_e164,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    mapErr(res, err);
  }
});

authRouter.post("/login/start", async (req, res) => {
  try {
    const { phone } = req.body ?? {};
    const out = await loginStart({ phone });
    res.json({
      ok: true,
      expiresAt: out.expiresAt,
      ...(out.devOtp ? { devOtp: out.devOtp } : {}),
    });
  } catch (err) {
    mapErr(res, err);
  }
});

authRouter.post("/login/verify", async (req, res) => {
  try {
    const { phone, code } = req.body ?? {};
    const { user, token } = await loginVerify({ phone, code });
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        phone: user.phone_e164,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    mapErr(res, err);
  }
});

authRouter.post("/staff/login", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    const out = await staffLogin({ username, password });
    res.json({
      ok: true,
      token: out.token,
      user: out.user,
    });
  } catch (err) {
    mapErr(res, err);
  }
});

authRouter.post("/investor/login", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    const out = await investorLogin({ username, password });
    res.json({
      ok: true,
      token: out.token,
      user: out.user,
    });
  } catch (err) {
    mapErr(res, err);
  }
});

authRouter.get("/me", async (req, res) => {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Missing token." });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "invalid_token", message: "Session expired." });
  }
  const user = await getUserFromPayload(payload);
  if (!user) {
    return res.status(401).json({ error: "invalid_token", message: "User not found." });
  }
  res.json({
    user: {
      id: user.id,
      phone: user.phone_e164,
      fullName: user.full_name,
      role: user.role,
      ...(payload.sms_region != null && String(payload.sms_region)
        ? { smsRegion: String(payload.sms_region) }
        : {}),
      ...(payload.sms_district != null ? { smsDistrict: Number(payload.sms_district) } : {}),
    },
  });
});
