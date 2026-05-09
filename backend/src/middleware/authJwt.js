import { verifyToken } from "../auth/authService.js";

export function authenticateJwt(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized", message: "Bearer token required." });
  }
  const payload = verifyToken(h.slice(7));
  if (!payload) {
    return res.status(401).json({ error: "invalid_token", message: "Invalid or expired token." });
  }
  req.auth = payload;
  next();
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        error: "forbidden",
        message: "You do not have permission for this action.",
      });
    }
    next();
  };
}
