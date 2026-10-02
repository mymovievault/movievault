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
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS movies (tmdb_id TEXT NOT NULL, owner_login TEXT, record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (owner_login, tmdb_id))`;
      await sql`ALTER TABLE movies ADD COLUMN IF NOT EXISTS owner_login TEXT`;
      await sql`UPDATE movies SET owner_login = COALESCE(owner_login, ${process.env.GITHUB_SEED_OWNER || "abilash9007"}) WHERE owner_login IS NULL`;
      await sql`ALTER TABLE movies ALTER COLUMN owner_login SET NOT NULL`;
      await sql`ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_pkey`;
      await sql`ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_owner_tmdb_pkey`;
      await sql`ALTER TABLE movies ADD CONSTRAINT movies_owner_tmdb_pkey PRIMARY KEY (owner_login, tmdb_id)`;
      await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', role TEXT NOT NULL DEFAULT 'member', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'`;
      await sql`UPDATE users SET status = 'approved', role = 'admin' WHERE username = ${process.env.ADMIN_USERNAME || "abilash9007"}`;
      await sql`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`;
    })();
  }
  await schemaPromise;
  return getSql();
}

export async function listMovies(ownerLogin) {
  const sql = await ready();
  const rows = await sql`SELECT record FROM movies WHERE owner_login = ${ownerLogin} ORDER BY created_at DESC`;
  return rows.map((row) => row.record);
}

export async function upsertMovie(record, ownerLogin) {
  const sql = await ready();
  await sql`INSERT INTO movies (tmdb_id, owner_login, record) VALUES (${String(record.tmdbId)}, ${ownerLogin}, ${JSON.stringify(record)}::jsonb) ON CONFLICT (owner_login, tmdb_id) DO UPDATE SET record = EXCLUDED.record, created_at = NOW()`;
  return record;
}

export async function updateMovie(tmdbId, changes, ownerLogin) {
  const sql = await ready();
  const rows = await sql`UPDATE movies SET record = record || ${JSON.stringify(changes)}::jsonb, created_at = NOW() WHERE tmdb_id = ${String(tmdbId)} AND owner_login = ${ownerLogin} RETURNING record`;
  return rows[0]?.record || null;
}

export async function deleteMovie(tmdbId, ownerLogin) {
  const sql = await ready();
  const rows = await sql`DELETE FROM movies WHERE tmdb_id = ${String(tmdbId)} AND owner_login = ${ownerLogin} RETURNING record`;
  return rows[0]?.record || null;
}

export async function seedMovies(records, ownerLogin) {
  await ready();
  for (const record of records) await upsertMovie(record, ownerLogin);
  return listMovies(ownerLogin);
}

export async function createUser(id, username, passwordHash) {
  const sql = await ready();
  const rows = await sql`INSERT INTO users (id, username, password_hash, status, role) VALUES (${id}, ${username}, ${passwordHash}, 'pending', 'member') RETURNING id, username, status, role`;
  return rows[0];
}

export async function reopenUser(id, passwordHash) {
  const sql = await ready();
  const rows = await sql`UPDATE users SET password_hash = ${passwordHash}, status = 'pending', role = 'member' WHERE id = ${id} AND status = 'rejected' RETURNING id, username, status, role`;
  return rows[0] || null;
}

export async function findUser(username) {
  const sql = await ready();
  const rows = await sql`SELECT id, username, password_hash, status, role FROM users WHERE username = ${username}`;
  return rows[0] || null;
}

export async function saveSession(tokenHash, userId, expiresAt) {
  const sql = await ready();
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, ${expiresAt})`;
}

export async function findSession(tokenHash) {
  const sql = await ready();
  const rows = await sql`SELECT users.id, users.username, users.role FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ${tokenHash} AND sessions.expires_at > NOW()`;
  return rows[0] || null;
}

export async function deleteSession(tokenHash) {
  const sql = await ready();
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}

export async function listPendingUsers() {
  const sql = await ready();
  return sql`SELECT id, username, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC`;
}

export async function updateUserStatus(userId, status) {
  const sql = await ready();
  const rows = await sql`UPDATE users SET status = ${status} WHERE id = ${userId} RETURNING id, username, status`;
  return rows[0] || null;
}
