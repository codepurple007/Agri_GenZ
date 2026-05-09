import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  if (!pool) {
    console.warn("[migrate] DATABASE_URL not set — using in-memory auth store.");
    return;
  }
  const sqlPath = path.join(__dirname, "..", "sql", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("[migrate] schema applied.");
  } finally {
    client.release();
  }
}
