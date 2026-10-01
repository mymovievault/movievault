import { neon } from "@neondatabase/serverless";

let schemaPromise;

function getSql() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Configure POSTGRES_URL in Vercel.");
  return neon(connectionString);
}

async function ready() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = sql`CREATE TABLE IF NOT EXISTS movies (tmdb_id TEXT PRIMARY KEY, record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  }
  await schemaPromise;
  return getSql();
}

export async function listMovies() {
  const sql = await ready();
  const rows = await sql`SELECT record FROM movies ORDER BY created_at DESC`;
  return rows.map((row) => row.record);
}

export async function upsertMovie(record) {
  const sql = await ready();
  await sql`INSERT INTO movies (tmdb_id, record) VALUES (${String(record.tmdbId)}, ${JSON.stringify(record)}::jsonb) ON CONFLICT (tmdb_id) DO UPDATE SET record = EXCLUDED.record, created_at = NOW()`;
  return record;
}

export async function seedMovies(records) {
  await ready();
  for (const record of records) await upsertMovie(record);
  return listMovies();
}
