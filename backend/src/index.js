import express from "express";
import cors from "cors";
import { dbHealth } from "./db.js";
import { runMigrations } from "./migrate.js";
import { authRouter } from "./auth/authRoutes.js";

await runMigrations().catch((err) => console.error("[migrate]", err));

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

/**
 * GET /api/health — liveness + optional PostgreSQL check.
 */
app.get("/api/health", async (_req, res) => {
  const db = await dbHealth();
  res.json({
    status: "ok",
    service: "agri-genz-api",
    postgres: db.ok ? "connected" : "not_configured",
    ...(db.detail ? { postgres_detail: db.detail } : {}),
  });
});

/**
 * GET /api/v1/landing — optional server-driven USSD hints.
 */
app.get("/api/v1/landing", (_req, res) => {
  res.json({
    ussdCodePlaceholder: "*___#",
    partnerMessage:
      "USSD short codes are assigned per district. Your cooperative registers the active code.",
    updatedAt: new Date().toISOString(),
  });
});

/** Pages 2–3 — SMS OTP registration & login (JWT session). */
app.use("/api/v1/auth", authRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
