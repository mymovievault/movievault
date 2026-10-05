import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { canonicalMediaId, mediaAliases, splitMediaRecord, mergeMediaRecord } from "./media-records.js";

let schemaPromise;

function getSql() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Configure POSTGRES_URL in Vercel.");
  return neon(connectionString);
}

export async function claimMigration(sql, version) {
  for (let attempt = 0; attempt < 360; attempt += 1) {
    const [completed] = await sql`SELECT version FROM schema_migrations WHERE version = ${version}`;
    if (completed) return null;
    const [lock] = await sql`SELECT locked_until > NOW() AS active FROM schema_migration_locks WHERE version = ${version}`;
    if (!lock?.active) {
      const token = crypto.randomUUID();
      const claimed = await sql`INSERT INTO schema_migration_locks (version, lock_token, locked_until) VALUES (${version}, ${token}, NOW() + INTERVAL '10 minutes') ON CONFLICT (version) DO UPDATE SET lock_token = EXCLUDED.lock_token, locked_until = EXCLUDED.locked_until WHERE schema_migration_locks.locked_until < NOW() RETURNING lock_token`;
      if (claimed[0]?.lock_token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Database migration ${version} is still running; retry the request.`);
}

async function ready() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS movies (tmdb_id TEXT NOT NULL, owner_login TEXT, record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (owner_login, tmdb_id))`;
      await sql`ALTER TABLE movies ADD COLUMN IF NOT EXISTS owner_login TEXT`;
      await sql`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', role TEXT NOT NULL DEFAULT 'member', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number TEXT`;
      await sql`UPDATE users SET status = 'approved', role = 'admin' WHERE username = ${process.env.ADMIN_USERNAME || "abilash9007"} AND (status IS DISTINCT FROM 'approved' OR role IS DISTINCT FROM 'admin')`;
      await sql`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ)`;
      await sql`CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_username TEXT, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS watchlists (id TEXT PRIMARY KEY, owner_username TEXT NOT NULL, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (owner_username, name))`;
      await sql`CREATE TABLE IF NOT EXISTS watchlist_shares (watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE, viewer_username TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (watchlist_id, viewer_username))`;
      await sql`CREATE TABLE IF NOT EXISTS watchlist_items (watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE, tmdb_id TEXT NOT NULL, record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (watchlist_id, tmdb_id))`;
      await sql`CREATE TABLE IF NOT EXISTS media_catalog (media_id TEXT PRIMARY KEY, record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS media_aliases (provider TEXT NOT NULL, external_id TEXT NOT NULL, media_id TEXT NOT NULL REFERENCES media_catalog(media_id) ON DELETE CASCADE, PRIMARY KEY (provider, external_id))`;
      await sql`CREATE TABLE IF NOT EXISTS media_people (person_id TEXT PRIMARY KEY, provider TEXT NOT NULL, external_id TEXT NOT NULL, record JSONB NOT NULL, UNIQUE (provider, external_id))`;
      await sql`CREATE TABLE IF NOT EXISTS media_credits (media_id TEXT NOT NULL REFERENCES media_catalog(media_id) ON DELETE CASCADE, person_id TEXT NOT NULL REFERENCES media_people(person_id), role TEXT NOT NULL, character TEXT NOT NULL DEFAULT '', credit_order INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (media_id, person_id, role, character))`;
      await sql`ALTER TABLE movies ADD COLUMN IF NOT EXISTS catalog_id TEXT`;
      await sql`ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS catalog_id TEXT`;
      await sql`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS schema_migration_locks (version TEXT PRIMARY KEY, lock_token TEXT NOT NULL, locked_until TIMESTAMPTZ NOT NULL)`;
      const migrationVersion = "media_catalog_normalization_v2";
      const migrationToken = await claimMigration(sql, migrationVersion);
      if (migrationToken) {
        try {
      await sql`UPDATE movies SET owner_login = COALESCE(owner_login, ${process.env.GITHUB_SEED_OWNER || "abilash9007"}) WHERE owner_login IS NULL`;
      await sql`ALTER TABLE movies ALTER COLUMN owner_login SET NOT NULL`;
      await sql`DO $$
        DECLARE current_primary_key TEXT;
        BEGIN
          LOCK TABLE movies IN ACCESS EXCLUSIVE MODE;
          SELECT conname INTO current_primary_key
          FROM pg_constraint
          WHERE conrelid = 'movies'::regclass AND contype = 'p';
          IF current_primary_key IS DISTINCT FROM 'movies_owner_tmdb_pkey' THEN
            IF current_primary_key IS NOT NULL THEN
              EXECUTE format('ALTER TABLE movies DROP CONSTRAINT %I', current_primary_key);
            END IF;
            ALTER TABLE movies ADD CONSTRAINT movies_owner_tmdb_pkey PRIMARY KEY (owner_login, tmdb_id);
          END IF;
        END
      $$`;
      await sql`DO $$
        BEGIN
          LOCK TABLE movies IN ACCESS EXCLUSIVE MODE;
          LOCK TABLE watchlist_items IN ACCESS EXCLUSIVE MODE;
          UPDATE movies SET catalog_id = COALESCE(
            NULLIF(catalog_id, ''),
            NULLIF(record->>'canonicalId', ''),
            CASE
              WHEN NULLIF(record #>> '{externalIds,imdb}', '') IS NOT NULL THEN 'imdb:' || lower(record #>> '{externalIds,imdb}')
              WHEN record->>'metadataSource' = 'Wikidata' AND NULLIF(record #>> '{externalIds,tmdb}', '') IS NOT NULL THEN 'tmdb:' || CASE WHEN record->>'mediaType' = 'tv' THEN 'tv' ELSE 'movie' END || ':' || (record #>> '{externalIds,tmdb}')
              WHEN record->>'metadataSource' = 'Wikidata' THEN 'wikidata:' || COALESCE(NULLIF(record->>'wikidataId', ''), regexp_replace(record->>'tmdbId', '^wikidata:', ''))
              WHEN record->>'metadataSource' = 'manual' THEN 'manual:' || COALESCE(record->>'tmdbId', tmdb_id)
              ELSE 'tmdb:' || CASE WHEN record->>'mediaType' = 'tv' THEN 'tv' ELSE 'movie' END || ':' || COALESCE(NULLIF(record #>> '{externalIds,tmdb}', ''), record->>'tmdbId', tmdb_id)
            END
          );
          UPDATE watchlist_items SET catalog_id = COALESCE(
            NULLIF(catalog_id, ''),
            NULLIF(record->>'canonicalId', ''),
            CASE
              WHEN NULLIF(record #>> '{externalIds,imdb}', '') IS NOT NULL THEN 'imdb:' || lower(record #>> '{externalIds,imdb}')
              WHEN record->>'metadataSource' = 'Wikidata' AND NULLIF(record #>> '{externalIds,tmdb}', '') IS NOT NULL THEN 'tmdb:' || CASE WHEN record->>'mediaType' = 'tv' THEN 'tv' ELSE 'movie' END || ':' || (record #>> '{externalIds,tmdb}')
              WHEN record->>'metadataSource' = 'Wikidata' THEN 'wikidata:' || COALESCE(NULLIF(record->>'wikidataId', ''), regexp_replace(record->>'tmdbId', '^wikidata:', ''))
              WHEN record->>'metadataSource' = 'manual' THEN 'manual:' || COALESCE(record->>'tmdbId', tmdb_id)
              ELSE 'tmdb:' || CASE WHEN record->>'mediaType' = 'tv' THEN 'tv' ELSE 'movie' END || ':' || COALESCE(NULLIF(record #>> '{externalIds,tmdb}', ''), record->>'tmdbId', tmdb_id)
            END
          );
          CREATE TEMP TABLE movie_catalog_merge ON COMMIT DROP AS
            SELECT owner_login, catalog_id, MAX(created_at) AS created_at,
              jsonb_object_agg(entry.key, entry.value ORDER BY movies.created_at, movies.tmdb_id) || jsonb_build_object('tmdbId', catalog_id) AS record
            FROM movies CROSS JOIN LATERAL jsonb_each(movies.record) AS entry(key, value)
            GROUP BY owner_login, catalog_id;
          DELETE FROM movies;
          INSERT INTO movies (tmdb_id, owner_login, record, created_at, catalog_id)
            SELECT catalog_id, owner_login, record, created_at, catalog_id FROM movie_catalog_merge;
          DROP TABLE movie_catalog_merge;
          CREATE TEMP TABLE watchlist_catalog_merge ON COMMIT DROP AS
            SELECT watchlist_id, catalog_id, MAX(created_at) AS created_at,
              jsonb_object_agg(entry.key, entry.value ORDER BY watchlist_items.created_at, watchlist_items.tmdb_id) || jsonb_build_object('tmdbId', catalog_id) AS record
            FROM watchlist_items CROSS JOIN LATERAL jsonb_each(watchlist_items.record) AS entry(key, value)
            GROUP BY watchlist_id, catalog_id;
          DELETE FROM watchlist_items;
          INSERT INTO watchlist_items (watchlist_id, tmdb_id, catalog_id, record, created_at)
            SELECT watchlist_id, catalog_id, catalog_id, record, created_at FROM watchlist_catalog_merge;
          DROP TABLE watchlist_catalog_merge;
        END
      $$`;
      await sql`WITH legacy_records AS (
          SELECT catalog_id AS media_id, record FROM movies
          UNION ALL
          SELECT catalog_id AS media_id, record FROM watchlist_items
        ), catalog_records AS (
          SELECT DISTINCT ON (media_id) media_id,
            (record - ARRAY['status', 'rating', 'watchedDate', 'notes', 'tags', 'watchingMode', 'ottPlatform', 'ottAvailability', 'theatreName', 'watchedWith', 'listId', 'curatedNote']::text[] - 'tmdbId')
              || jsonb_build_object('canonicalId', media_id, 'externalIds', COALESCE(record->'externalIds', '{}'::jsonb) || jsonb_build_object('tmdb', CASE WHEN record->>'metadataSource' = 'manual' THEN NULL WHEN record->>'metadataSource' = 'Wikidata' THEN NULLIF(record #>> '{externalIds,tmdb}', '') ELSE COALESCE(NULLIF(record #>> '{externalIds,tmdb}', ''), record->>'tmdbId') END)) AS metadata
          FROM legacy_records
          WHERE media_id IS NOT NULL
          ORDER BY media_id, CASE WHEN record->>'metadataSource' = 'TMDB' THEN 0 ELSE 1 END
        )
        INSERT INTO media_catalog (media_id, record)
        SELECT media_id, metadata FROM catalog_records
        ON CONFLICT (media_id) DO NOTHING`;
       await sql`WITH aliases AS (
          SELECT
          CASE WHEN record->>'metadataSource' = 'Wikidata' THEN 'wikidata'
            WHEN record->>'metadataSource' = 'manual' THEN 'manual'
            ELSE 'tmdb:' || CASE WHEN record->>'mediaType' = 'tv' THEN 'tv' ELSE 'movie' END END AS provider,
          CASE WHEN record->>'metadataSource' = 'Wikidata' THEN COALESCE(NULLIF(record->>'wikidataId', ''), regexp_replace(media_id, '^wikidata:', ''))
            WHEN record->>'metadataSource' = 'manual' THEN media_id
            ELSE COALESCE(NULLIF(record #>> '{externalIds,tmdb}', ''), media_id) END AS external_id,
          media_id
        FROM media_catalog
        )
        INSERT INTO media_aliases (provider, external_id, media_id)
        SELECT DISTINCT ON (provider, external_id) provider, external_id, media_id
        FROM aliases
        WHERE external_id IS NOT NULL
        ORDER BY provider, external_id, media_id
        ON CONFLICT (provider, external_id) DO NOTHING`;
      await sql`INSERT INTO media_aliases (provider, external_id, media_id)
        SELECT DISTINCT ON (record #>> '{externalIds,tmdb}') 'tmdb:' || CASE WHEN record->>'mediaType' = 'tv' THEN 'tv' ELSE 'movie' END,
          record #>> '{externalIds,tmdb}', media_id
        FROM media_catalog
        WHERE record->>'metadataSource' = 'Wikidata' AND NULLIF(record #>> '{externalIds,tmdb}', '') IS NOT NULL
        ORDER BY record #>> '{externalIds,tmdb}', media_id
        ON CONFLICT (provider, external_id) DO NOTHING`;
      await sql`INSERT INTO media_aliases (provider, external_id, media_id)
        SELECT DISTINCT ON (lower(record #>> '{externalIds,imdb}')) 'imdb', lower(record #>> '{externalIds,imdb}'), media_id
        FROM media_catalog
        WHERE NULLIF(record #>> '{externalIds,imdb}', '') IS NOT NULL
        ORDER BY lower(record #>> '{externalIds,imdb}'), media_id
        ON CONFLICT (provider, external_id) DO NOTHING`;
      await sql`WITH normalized_people AS (
          SELECT lower(COALESCE(NULLIF(person->>'source', ''), NULLIF(c.record->>'metadataSource', ''), 'TMDB')) AS provider,
            person->>'id' AS external_id,
            (person - 'character') || jsonb_build_object('id', person->>'id', 'source', COALESCE(NULLIF(person->>'source', ''), NULLIF(c.record->>'metadataSource', ''), 'TMDB')) AS person_record
          FROM media_catalog c
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.record->'cast', '[]'::jsonb)) AS cast_data(person)
          WHERE NULLIF(person->>'id', '') IS NOT NULL AND NULLIF(person->>'name', '') IS NOT NULL
          UNION ALL
          SELECT lower(COALESCE(NULLIF(c.record->'directorPerson'->>'source', ''), NULLIF(c.record->>'metadataSource', ''), 'TMDB')) AS provider,
            c.record->'directorPerson'->>'id' AS external_id,
            c.record->'directorPerson' || jsonb_build_object('source', COALESCE(NULLIF(c.record->'directorPerson'->>'source', ''), NULLIF(c.record->>'metadataSource', ''), 'TMDB')) AS person_record
          FROM media_catalog c
          WHERE NULLIF(c.record->'directorPerson'->>'id', '') IS NOT NULL AND NULLIF(c.record->'directorPerson'->>'name', '') IS NOT NULL
        )
        INSERT INTO media_people (person_id, provider, external_id, record)
        SELECT DISTINCT ON (provider || ':' || external_id) provider || ':' || external_id, provider, external_id, person_record
        FROM normalized_people
        ORDER BY provider || ':' || external_id
        ON CONFLICT (person_id) DO UPDATE SET record = media_people.record || EXCLUDED.record`;
      await sql`WITH credits AS (
          SELECT c.media_id,
            lower(COALESCE(NULLIF(person->>'source', ''), NULLIF(c.record->>'metadataSource', ''), 'TMDB')) || ':' || (person->>'id') AS person_id,
            'cast' AS role,
            COALESCE(person->>'character', '') AS character,
            cast_data.ordinality::INTEGER AS credit_order
          FROM media_catalog c
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.record->'cast', '[]'::jsonb)) WITH ORDINALITY AS cast_data(person, ordinality)
          WHERE NULLIF(person->>'id', '') IS NOT NULL AND NULLIF(person->>'name', '') IS NOT NULL
          UNION ALL
          SELECT c.media_id,
            lower(COALESCE(NULLIF(c.record->'directorPerson'->>'source', ''), NULLIF(c.record->>'metadataSource', ''), 'TMDB')) || ':' || (c.record->'directorPerson'->>'id'),
            'director', '', 0
          FROM media_catalog c
          WHERE NULLIF(c.record->'directorPerson'->>'id', '') IS NOT NULL AND NULLIF(c.record->'directorPerson'->>'name', '') IS NOT NULL
        )
        INSERT INTO media_credits (media_id, person_id, role, character, credit_order)
        SELECT media_id, person_id, role, character, credit_order FROM credits
        ON CONFLICT (media_id, person_id, role, character) DO UPDATE SET credit_order = EXCLUDED.credit_order`;
      await sql`UPDATE media_catalog SET record = record - 'cast' - 'directorPerson' WHERE record ? 'cast' OR record ? 'directorPerson'`;
      await sql`UPDATE movies SET record = (record - ARRAY['canonicalId', 'mediaType', 'metadataSource', 'wikidataId', 'title', 'name', 'year', 'releaseDate', 'poster', 'backdrop', 'overview', 'tagline', 'genres', 'runtime', 'tmdbRating', 'director', 'directorPerson', 'cast', 'productionCompanies', 'externalIds']::text[]) || jsonb_build_object('tmdbId', catalog_id)`;
      await sql`UPDATE watchlist_items SET record = (record - ARRAY['canonicalId', 'mediaType', 'metadataSource', 'wikidataId', 'title', 'name', 'year', 'releaseDate', 'poster', 'backdrop', 'overview', 'tagline', 'genres', 'runtime', 'tmdbRating', 'director', 'directorPerson', 'cast', 'productionCompanies', 'externalIds']::text[]) || jsonb_build_object('tmdbId', catalog_id)`;
      await sql`ALTER TABLE movies ALTER COLUMN catalog_id SET NOT NULL`;
      await sql`ALTER TABLE watchlist_items ALTER COLUMN catalog_id SET NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS movies_owner_catalog_unique ON movies (owner_login, catalog_id)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS watchlist_items_catalog_unique ON watchlist_items (watchlist_id, catalog_id)`;
      await sql`CREATE OR REPLACE VIEW media_catalog_details AS
        SELECT c.media_id,
          c.record || jsonb_build_object(
            'cast', COALESCE((SELECT jsonb_agg(p.record || jsonb_build_object('character', cr.character) ORDER BY cr.credit_order) FROM media_credits cr JOIN media_people p ON p.person_id = cr.person_id WHERE cr.media_id = c.media_id AND cr.role = 'cast'), '[]'::jsonb),
            'directorPerson', (SELECT p.record FROM media_credits cr JOIN media_people p ON p.person_id = cr.person_id WHERE cr.media_id = c.media_id AND cr.role = 'director' ORDER BY cr.credit_order LIMIT 1)
          ) AS record
        FROM media_catalog c`;
      await sql`INSERT INTO watchlists (id, owner_username, name) SELECT md5(username || ':main'), username, 'My Library' FROM users ON CONFLICT (owner_username, name) DO NOTHING`;
      await sql`INSERT INTO watchlist_items (watchlist_id, tmdb_id, catalog_id, record) SELECT md5(m.owner_login || ':main'), m.catalog_id, m.catalog_id, m.record FROM movies m ON CONFLICT DO NOTHING`;
      await sql`DO $$
        BEGIN
          LOCK TABLE schema_migrations IN ACCESS EXCLUSIVE MODE;
          IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'dedupe_media_aliases_v1') THEN
          CREATE TEMP TABLE catalog_alias_candidates ON COMMIT DROP AS
            SELECT media_id, provider,
              CASE WHEN provider LIKE 'tmdb:%' THEN regexp_replace(external_id, '^tmdb:(movie|tv):', '')
                   WHEN provider = 'imdb' THEN lower(external_id)
                   ELSE external_id END AS external_id
            FROM media_aliases
            WHERE NULLIF(external_id, '') IS NOT NULL
            UNION
            SELECT media_id,
              'tmdb:' || CASE WHEN record->>'mediaType' = 'tv' THEN 'tv' ELSE 'movie' END,
              regexp_replace(COALESCE(NULLIF(record #>> '{externalIds,tmdb}', ''), record->>'tmdbId', ''), '^tmdb:(movie|tv):', '')
            FROM media_catalog
            WHERE NULLIF(COALESCE(record #>> '{externalIds,tmdb}', record->>'tmdbId', ''), '') IS NOT NULL
              AND record->>'metadataSource' IS DISTINCT FROM 'manual'
            UNION
            SELECT media_id, 'imdb', lower(record #>> '{externalIds,imdb}')
            FROM media_catalog
            WHERE NULLIF(record #>> '{externalIds,imdb}', '') IS NOT NULL
            UNION
            SELECT media_id, 'wikidata', COALESCE(NULLIF(record->>'wikidataId', ''), NULLIF(record #>> '{externalIds,wikidata}', ''), regexp_replace(media_id, '^wikidata:', ''))
            FROM media_catalog
            WHERE record->>'metadataSource' = 'Wikidata' OR record ? 'wikidataId'
            UNION
            SELECT media_id, 'manual', regexp_replace(media_id, '^manual:', '')
            FROM media_catalog
            WHERE record->>'metadataSource' = 'manual';

          CREATE TEMP TABLE catalog_canonical_map ON COMMIT DROP AS
            WITH alias_winners AS (
              SELECT provider, external_id,
                (array_agg(media_id ORDER BY CASE WHEN media_id LIKE 'imdb:%' THEN 0 WHEN media_id LIKE 'tmdb:%' THEN 1 WHEN media_id LIKE 'wikidata:%' THEN 2 ELSE 3 END, media_id))[1] AS canonical_id
              FROM catalog_alias_candidates
              WHERE NULLIF(external_id, '') IS NOT NULL
              GROUP BY provider, external_id
            ), candidates AS (
              SELECT DISTINCT aliases.media_id, winners.canonical_id
              FROM catalog_alias_candidates aliases
              JOIN alias_winners winners USING (provider, external_id)
            ), resolved AS (
              SELECT media_id,
                (array_agg(canonical_id ORDER BY CASE WHEN canonical_id LIKE 'imdb:%' THEN 0 WHEN canonical_id LIKE 'tmdb:%' THEN 1 WHEN canonical_id LIKE 'wikidata:%' THEN 2 ELSE 3 END, canonical_id))[1] AS canonical_id
              FROM candidates
              GROUP BY media_id
            )
            SELECT catalog.media_id, COALESCE(resolved.canonical_id, catalog.media_id) AS canonical_id
            FROM media_catalog catalog
            LEFT JOIN resolved ON resolved.media_id = catalog.media_id;

          CREATE TEMP TABLE normalized_catalog_aliases ON COMMIT DROP AS
            SELECT DISTINCT aliases.provider, aliases.external_id, mapping.canonical_id AS media_id
            FROM catalog_alias_candidates aliases
            JOIN catalog_canonical_map mapping ON mapping.media_id = aliases.media_id
            WHERE NULLIF(aliases.external_id, '') IS NOT NULL;

          CREATE TEMP TABLE merged_catalog_records ON COMMIT DROP AS
            WITH mapped AS (
              SELECT mapping.canonical_id, catalog.media_id, catalog.record, catalog.created_at, catalog.updated_at
              FROM media_catalog catalog
              JOIN catalog_canonical_map mapping ON mapping.media_id = catalog.media_id
            ), preferred AS (
              SELECT DISTINCT ON (canonical_id) canonical_id, record, created_at, updated_at
              FROM mapped
              ORDER BY canonical_id,
                CASE WHEN record->>'metadataSource' = 'TMDB' THEN 0 WHEN record->>'metadataSource' = 'Wikidata' THEN 1 ELSE 2 END,
                CASE WHEN NULLIF(record->>'poster', '') IS NULL THEN 1 ELSE 0 END,
                updated_at DESC, media_id
            ), identifiers AS (
              SELECT media_id AS canonical_id,
                MIN(external_id) FILTER (WHERE provider = 'imdb') AS imdb_id,
                MIN(external_id) FILTER (WHERE provider LIKE 'tmdb:%') AS tmdb_id,
                MIN(external_id) FILTER (WHERE provider = 'wikidata') AS wikidata_id
              FROM normalized_catalog_aliases
              GROUP BY media_id
            )
            SELECT preferred.canonical_id AS media_id,
              preferred.record || jsonb_build_object(
                'canonicalId', preferred.canonical_id,
                'externalIds', COALESCE(preferred.record->'externalIds', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('imdb', identifiers.imdb_id, 'tmdb', identifiers.tmdb_id, 'wikidata', identifiers.wikidata_id))
              ) AS record,
              preferred.created_at,
              preferred.updated_at
            FROM preferred
            LEFT JOIN identifiers USING (canonical_id);

          CREATE TEMP TABLE merged_movie_rows ON COMMIT DROP AS
            SELECT movie.owner_login, mapping.canonical_id AS catalog_id, MAX(movie.created_at) AS created_at,
              jsonb_object_agg(entry.key, entry.value ORDER BY movie.created_at, movie.tmdb_id) || jsonb_build_object('tmdbId', mapping.canonical_id) AS record
            FROM movies movie
            JOIN catalog_canonical_map mapping ON mapping.media_id = movie.catalog_id
            CROSS JOIN LATERAL jsonb_each(movie.record) AS entry(key, value)
            GROUP BY movie.owner_login, mapping.canonical_id;

          CREATE TEMP TABLE merged_watchlist_rows ON COMMIT DROP AS
            SELECT item.watchlist_id, mapping.canonical_id AS catalog_id, MAX(item.created_at) AS created_at,
              jsonb_object_agg(entry.key, entry.value ORDER BY item.created_at, item.tmdb_id) || jsonb_build_object('tmdbId', mapping.canonical_id) AS record
            FROM watchlist_items item
            JOIN catalog_canonical_map mapping ON mapping.media_id = item.catalog_id
            CROSS JOIN LATERAL jsonb_each(item.record) AS entry(key, value)
            GROUP BY item.watchlist_id, mapping.canonical_id;

          INSERT INTO media_credits (media_id, person_id, role, character, credit_order)
            SELECT mapping.canonical_id, credit.person_id, credit.role, credit.character, MIN(credit.credit_order)
            FROM media_credits credit
            JOIN catalog_canonical_map mapping ON mapping.media_id = credit.media_id
            GROUP BY mapping.canonical_id, credit.person_id, credit.role, credit.character
            ON CONFLICT (media_id, person_id, role, character) DO UPDATE SET credit_order = LEAST(media_credits.credit_order, EXCLUDED.credit_order);
          DELETE FROM media_credits credit USING catalog_canonical_map mapping
            WHERE credit.media_id = mapping.media_id AND mapping.media_id <> mapping.canonical_id;

          DELETE FROM movies;
          INSERT INTO movies (tmdb_id, owner_login, record, created_at, catalog_id)
            SELECT catalog_id, owner_login, record, created_at, catalog_id FROM merged_movie_rows;
          DELETE FROM watchlist_items;
          INSERT INTO watchlist_items (watchlist_id, tmdb_id, catalog_id, record, created_at)
            SELECT watchlist_id, catalog_id, catalog_id, record, created_at FROM merged_watchlist_rows;

          UPDATE media_catalog catalog
            SET record = merged.record, created_at = merged.created_at, updated_at = merged.updated_at
            FROM merged_catalog_records merged
            WHERE catalog.media_id = merged.media_id;
          DELETE FROM media_aliases;
          DELETE FROM media_catalog catalog USING catalog_canonical_map mapping
            WHERE catalog.media_id = mapping.media_id AND mapping.media_id <> mapping.canonical_id;
          INSERT INTO media_aliases (provider, external_id, media_id)
            SELECT provider, external_id, media_id FROM normalized_catalog_aliases
            ON CONFLICT (provider, external_id) DO UPDATE SET media_id = EXCLUDED.media_id;
          INSERT INTO schema_migrations (version) VALUES ('dedupe_media_aliases_v1') ON CONFLICT DO NOTHING;
          END IF;
        END
      $$`;
          await sql`INSERT INTO schema_migrations (version) VALUES (${migrationVersion}) ON CONFLICT DO NOTHING`;
        } catch (error) {
          await sql`DELETE FROM schema_migration_locks WHERE version = ${migrationVersion} AND lock_token = ${migrationToken}`;
          throw error;
        }
        await sql`DELETE FROM schema_migration_locks WHERE version = ${migrationVersion} AND lock_token = ${migrationToken}`;
      }
    })();
  }
  await schemaPromise;
  return getSql();
}

export async function listMovies(ownerLogin) {
  const sql = await ready();
  const rows = await sql`SELECT m.catalog_id, m.record AS user_record, c.record AS catalog_record FROM movies m LEFT JOIN media_catalog_details c ON c.media_id = m.catalog_id WHERE m.owner_login = ${ownerLogin} ORDER BY m.created_at DESC`;
  return rows.map((row) => mergeMediaRecord(row.catalog_record, row.user_record, row.catalog_id));
}

export async function getMovie(ownerLogin, mediaId) {
  const sql = await ready();
  const rows = await sql`SELECT entry.catalog_id, entry.record AS user_record, c.record AS catalog_record
    FROM (
      SELECT m.catalog_id, m.record, 0 AS priority FROM movies m
      WHERE m.owner_login = ${ownerLogin} AND m.catalog_id = ${mediaId}
      UNION ALL
      SELECT i.catalog_id, i.record, 1 AS priority FROM watchlist_items i
      JOIN watchlists w ON w.id = i.watchlist_id
      WHERE i.catalog_id = ${mediaId} AND (w.owner_username = ${ownerLogin} OR EXISTS (
        SELECT 1 FROM watchlist_shares s WHERE s.watchlist_id = w.id AND s.viewer_username = ${ownerLogin}
      ))
    ) entry LEFT JOIN media_catalog_details c ON c.media_id = entry.catalog_id
    ORDER BY entry.priority LIMIT 1`;
  return rows[0] ? mergeMediaRecord(rows[0].catalog_record, rows[0].user_record, rows[0].catalog_id) : null;
}

async function catalogRecordFor(sql, mediaId) {
  const rows = await sql`SELECT record FROM media_catalog WHERE media_id = ${mediaId}`;
  return rows[0]?.record || {};
}

async function fullCatalogRecordFor(sql, mediaId) {
  const rows = await sql`SELECT record FROM media_catalog_details WHERE media_id = ${mediaId}`;
  return rows[0]?.record || {};
}

async function syncMediaCredits(sql, mediaId, record) {
  const credits = [
    ...(record.cast || []).map((person, index) => ({ person, role: "cast", character: person.character || "", order: index })),
    ...(record.directorPerson ? [{ person: record.directorPerson, role: "director", character: "", order: 0 }] : []),
  ].filter(({ person }) => person.id && person.name);
  if (!credits.length) return;

  await sql`DELETE FROM media_credits WHERE media_id = ${mediaId}`;
  for (const { person, role, character, order } of credits) {
    const source = person.source || record.metadataSource || "TMDB";
    const provider = String(source).toLowerCase();
    const personId = `${provider}:${person.id}`;
    const personRecord = { id: person.id, name: person.name, profile: person.profile || "", source };
    await sql`INSERT INTO media_people (person_id, provider, external_id, record) VALUES (${personId}, ${provider}, ${String(person.id)}, ${JSON.stringify(personRecord)}::jsonb) ON CONFLICT (person_id) DO UPDATE SET record = CASE WHEN EXCLUDED.record->>'profile' = '' THEN media_people.record || (EXCLUDED.record - 'profile') ELSE media_people.record || EXCLUDED.record END`;
    await sql`INSERT INTO media_credits (media_id, person_id, role, character, credit_order) VALUES (${mediaId}, ${personId}, ${role}, ${character}, ${order}) ON CONFLICT (media_id, person_id, role, character) DO UPDATE SET credit_order = EXCLUDED.credit_order`;
  }
}

async function upsertMediaCatalog(sql, record) {
  const aliases = mediaAliases(record);
  let mediaId;
  for (const alias of aliases) {
    const rows = await sql`SELECT media_id FROM media_aliases WHERE provider = ${alias.provider} AND external_id = ${alias.externalId}`;
    if (rows[0]?.media_id) {
      mediaId = rows[0].media_id;
      break;
    }
  }
  mediaId ||= canonicalMediaId(record);

  const { catalog } = splitMediaRecord(record, mediaId);
  const existing = await catalogRecordFor(sql, mediaId);
  const preserveExistingCredits = existing.metadataSource === "TMDB" && catalog.metadataSource === "Wikidata";
  let merged = { ...existing, ...catalog };
  if (preserveExistingCredits) merged = { ...catalog, ...existing };
  for (const field of ["poster", "backdrop", "overview", "tagline", "genres", "director", "productionCompanies"]) {
    const value = catalog[field];
    if ((value === "" || value == null || (Array.isArray(value) && !value.length)) && existing[field] != null) merged[field] = existing[field];
  }
  merged.externalIds = { ...(existing.externalIds || {}), ...(catalog.externalIds || {}) };
  merged.canonicalId = mediaId;
  const credits = preserveExistingCredits ? null : { cast: catalog.cast || [], directorPerson: catalog.directorPerson || null, metadataSource: catalog.metadataSource };
  delete merged.cast;
  delete merged.directorPerson;
  await sql`INSERT INTO media_catalog (media_id, record) VALUES (${mediaId}, ${JSON.stringify(merged)}::jsonb) ON CONFLICT (media_id) DO UPDATE SET record = EXCLUDED.record, updated_at = NOW()`;
  for (const alias of aliases) {
    await sql`INSERT INTO media_aliases (provider, external_id, media_id) VALUES (${alias.provider}, ${alias.externalId}, ${mediaId}) ON CONFLICT (provider, external_id) DO NOTHING`;
  }
  if (credits && (credits.cast.length || credits.directorPerson)) await syncMediaCredits(sql, mediaId, credits);
  return { mediaId, catalogRecord: await fullCatalogRecordFor(sql, mediaId) };
}

export async function upsertMovie(record, ownerLogin) {
  const sql = await ready();
  const { mediaId, catalogRecord } = await upsertMediaCatalog(sql, record);
  const { user } = splitMediaRecord(record, mediaId);
  const rows = await sql`INSERT INTO movies (tmdb_id, owner_login, record, catalog_id) VALUES (${mediaId}, ${ownerLogin}, ${JSON.stringify(user)}::jsonb, ${mediaId}) ON CONFLICT (owner_login, catalog_id) DO UPDATE SET record = EXCLUDED.record, created_at = NOW() RETURNING catalog_id, record`;
  return mergeMediaRecord(catalogRecord, rows[0]?.record || user, mediaId);
}

async function findOwnedMediaId(sql, ownerLogin, tmdbId) {
  const rows = await sql`SELECT catalog_id FROM movies WHERE owner_login = ${ownerLogin} AND (catalog_id = ${String(tmdbId)} OR tmdb_id = ${String(tmdbId)}) LIMIT 1`;
  return rows[0]?.catalog_id || null;
}

export async function updateMovie(tmdbId, changes, ownerLogin) {
  const sql = await ready();
  const mediaId = await findOwnedMediaId(sql, ownerLogin, tmdbId);
  if (!mediaId) return null;
  const rows = await sql`UPDATE movies SET record = record || ${JSON.stringify(changes)}::jsonb, created_at = NOW() WHERE owner_login = ${ownerLogin} AND catalog_id = ${mediaId} RETURNING catalog_id, record`;
  return rows[0] ? mergeMediaRecord(await fullCatalogRecordFor(sql, mediaId), rows[0].record, mediaId) : null;
}

export async function deleteMovie(tmdbId, ownerLogin) {
  const sql = await ready();
  const mediaId = await findOwnedMediaId(sql, ownerLogin, tmdbId);
  if (!mediaId) return null;
  const before = await sql`SELECT record FROM movies WHERE owner_login = ${ownerLogin} AND catalog_id = ${mediaId}`;
  const rows = await sql`DELETE FROM movies WHERE owner_login = ${ownerLogin} AND catalog_id = ${mediaId} RETURNING catalog_id`;
  return rows[0] ? mergeMediaRecord(await fullCatalogRecordFor(sql, mediaId), before[0]?.record, mediaId) : null;
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

export async function getUserById(userId) {
  const sql = await ready();
  const rows = await sql`SELECT id, username, status, role FROM users WHERE id = ${userId}`;
  return rows[0] || null;
}

export async function updateUserPassword(userId, passwordHash) {
  const sql = await ready();
  const rows = await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId} RETURNING id, username`;
  return rows[0] || null;
}

export async function getUserProfile(username) {
  const sql = await ready();
  const rows = await sql`SELECT username, role, display_name, email, mobile_number FROM users WHERE username = ${username}`;
  return rows[0] || null;
}

export async function updateUserProfile(username, profile) {
  const sql = await ready();
  const rows = await sql`UPDATE users SET display_name = ${profile.displayName}, email = ${profile.email}, mobile_number = ${profile.mobileNumber} WHERE username = ${username} RETURNING username, role, display_name, email, mobile_number`;
  return rows[0] || null;
}

export async function deleteUserSessions(userId) {
  const sql = await ready();
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
}

export async function savePasswordResetToken(tokenHash, userId, expiresAt) {
  const sql = await ready();
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId} OR expires_at <= NOW()`;
  await sql`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, ${expiresAt})`;
}

export async function consumePasswordResetToken(tokenHash) {
  const sql = await ready();
  const rows = await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > NOW() RETURNING user_id`;
  return rows[0]?.user_id || null;
}

export async function recordAudit(actorUsername, action, targetType, targetId = null, metadata = {}) {
  const sql = await ready();
  await sql`INSERT INTO audit_events (id, actor_username, action, target_type, target_id, metadata) VALUES (${crypto.randomUUID()}, ${actorUsername}, ${action}, ${targetType}, ${targetId}, ${JSON.stringify(metadata)}::jsonb)`;
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

export async function listUsers() {
  const sql = await ready();
  return sql`SELECT id, username, status, role, created_at FROM users ORDER BY created_at ASC`;
}

export async function searchApprovedUsernames(search, exceptUsername) {
  const sql = await ready();
  const rows = await sql`SELECT username FROM users WHERE status = 'approved' AND username <> ${exceptUsername} AND username ILIKE ${`%${search}%`} ORDER BY username LIMIT 20`;
  return rows.map((row) => row.username);
}

export async function areApprovedUsernames(usernames, exceptUsername) {
  const sql = await ready();
  const rows = await Promise.all(usernames.map(async (username) => {
    const matches = await sql`SELECT 1 FROM users WHERE username = ${username} AND status = 'approved' AND username <> ${exceptUsername}`;
    return matches.length > 0;
  }));
  return rows.every(Boolean);
}

export async function listWatchlists(username) {
  const sql = await ready();
  return sql`SELECT w.id, w.name, w.owner_username, w.owner_username = ${username} AS is_owner, COALESCE((SELECT json_agg((COALESCE(c.record, '{}'::jsonb) || i.record) || jsonb_build_object('tmdbId', i.catalog_id) ORDER BY i.created_at DESC) FROM watchlist_items i LEFT JOIN media_catalog_details c ON c.media_id = i.catalog_id WHERE i.watchlist_id = w.id), '[]'::json) AS items, COALESCE((SELECT json_agg(s.viewer_username ORDER BY s.viewer_username) FROM watchlist_shares s WHERE s.watchlist_id = w.id), '[]'::json) AS shared_with FROM watchlists w WHERE w.owner_username = ${username} OR EXISTS (SELECT 1 FROM watchlist_shares s WHERE s.watchlist_id = w.id AND s.viewer_username = ${username}) ORDER BY w.created_at`;
}

export async function listWatchlistItems(username, listId) {
  const sql = await ready();
  const rows = await sql`SELECT i.catalog_id, i.record AS user_record, c.record AS catalog_record FROM watchlist_items i JOIN watchlists w ON w.id = i.watchlist_id LEFT JOIN media_catalog_details c ON c.media_id = i.catalog_id WHERE i.watchlist_id = ${listId} AND (w.owner_username = ${username} OR EXISTS (SELECT 1 FROM watchlist_shares s WHERE s.watchlist_id = w.id AND s.viewer_username = ${username})) ORDER BY i.created_at DESC`;
  return rows.map((row) => mergeMediaRecord(row.catalog_record, row.user_record, row.catalog_id));
}

export async function addWatchlistItem(username, listId, record) {
  const sql = await ready();
  const owned = await sql`SELECT id FROM watchlists WHERE id = ${listId} AND owner_username = ${username}`;
  if (!owned.length) return null;
  const { mediaId, catalogRecord } = await upsertMediaCatalog(sql, record);
  const { user } = splitMediaRecord(record, mediaId);
  const rows = await sql`INSERT INTO watchlist_items (watchlist_id, tmdb_id, catalog_id, record) VALUES (${listId}, ${mediaId}, ${mediaId}, ${JSON.stringify(user)}::jsonb) ON CONFLICT (watchlist_id, catalog_id) DO UPDATE SET record = EXCLUDED.record, created_at = NOW() RETURNING catalog_id, record`;
  return rows[0] ? mergeMediaRecord(catalogRecord, rows[0].record, mediaId) : null;
}

export async function updateWatchlistItem(username, listId, tmdbId, changes) {
  const sql = await ready();
  const rows = await sql`UPDATE watchlist_items i SET record = i.record || ${JSON.stringify(changes)}::jsonb, created_at = NOW() FROM watchlists w WHERE i.watchlist_id = ${listId} AND (i.catalog_id = ${String(tmdbId)} OR i.tmdb_id = ${String(tmdbId)}) AND w.id = i.watchlist_id AND w.owner_username = ${username} RETURNING i.catalog_id, i.record`;
  return rows[0] ? mergeMediaRecord(await fullCatalogRecordFor(sql, rows[0].catalog_id), rows[0].record, rows[0].catalog_id) : null;
}

export async function deleteWatchlistItem(username, listId, tmdbId) {
  const sql = await ready();
  const rows = await sql`DELETE FROM watchlist_items i USING watchlists w WHERE i.watchlist_id = ${listId} AND (i.catalog_id = ${String(tmdbId)} OR i.tmdb_id = ${String(tmdbId)}) AND w.id = i.watchlist_id AND w.owner_username = ${username} RETURNING i.record`;
  return rows[0]?.record || null;
}

export async function createWatchlist(username, name) {
  const sql = await ready();
  const id = crypto.randomUUID();
  const rows = await sql`INSERT INTO watchlists (id, owner_username, name) VALUES (${id}, ${username}, ${name}) ON CONFLICT (owner_username, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, owner_username`;
  return rows[0];
}

export async function shareWatchlist(username, listId, viewerUsername) {
  const sql = await ready();
  const rows = await sql`INSERT INTO watchlist_shares (watchlist_id, viewer_username) SELECT ${listId}, ${viewerUsername} WHERE EXISTS (SELECT 1 FROM watchlists WHERE id = ${listId} AND owner_username = ${username}) RETURNING watchlist_id, viewer_username`;
  return rows[0] || null;
}

export async function revokeWatchlistShare(username, listId, viewerUsername) {
  const sql = await ready();
  const rows = await sql`DELETE FROM watchlist_shares s USING watchlists w WHERE s.watchlist_id = ${listId} AND s.viewer_username = ${viewerUsername} AND w.id = s.watchlist_id AND w.owner_username = ${username} RETURNING s.watchlist_id, s.viewer_username`;
  return rows[0] || null;
}

export async function deleteWatchlist(username, listId) {
  const sql = await ready();
  const rows = await sql`DELETE FROM watchlists WHERE id = ${listId} AND owner_username = ${username} AND name <> 'My Library' RETURNING id, name`;
  return rows[0] || null;
}

export async function updateUserStatus(userId, status) {
  const sql = await ready();
  const rows = await sql`UPDATE users SET status = ${status} WHERE id = ${userId} RETURNING id, username, status`;
  return rows[0] || null;
}
