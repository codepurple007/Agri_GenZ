import pg from "pg";

const { Pool } = pg;

/** PostgreSQL pool — uses DATABASE_URL when Page 1+ APIs persist data. */
export const pool =
  process.env.DATABASE_URL != null && process.env.DATABASE_URL !== ""
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30_000,
      })
    : null;

export async function dbHealth() {
  if (!pool) return { ok: false, detail: "DATABASE_URL not set" };
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    return { ok: true };
  } finally {
    client.release();
  }
}
