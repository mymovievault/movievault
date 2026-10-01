import fs from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set POSTGRES_URL before seeding the database.");

const sql = neon(connectionString);
const records = JSON.parse(await fs.readFile(new URL("../data/movies.json", import.meta.url), "utf8"));
await sql`CREATE TABLE IF NOT EXISTS movies (tmdb_id TEXT PRIMARY KEY, record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
for (const record of records) {
  await sql`INSERT INTO movies (tmdb_id, record) VALUES (${String(record.tmdbId)}, ${JSON.stringify(record)}::jsonb) ON CONFLICT (tmdb_id) DO UPDATE SET record = EXCLUDED.record`;
}
console.log(`Seeded ${records.length} movies.`);
