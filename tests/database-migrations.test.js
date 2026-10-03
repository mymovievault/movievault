import test from "node:test";
import assert from "node:assert/strict";
import { claimMigration } from "../api/_lib/database.js";

test("completed database migration is skipped without acquiring a lock", async () => {
  const calls = [];
  const sql = async (strings, ...values) => {
    calls.push({ query: strings.join("?"), values });
    return [{ version: "media_catalog_normalization_v2" }];
  };

  assert.equal(await claimMigration(sql, "media_catalog_normalization_v2"), null);
  assert.equal(calls.length, 1);
  assert.match(calls[0].query, /SELECT version FROM schema_migrations/);
});

test("an unclaimed database migration returns its unique lock token", async () => {
  let lockToken;
  const sql = async (strings, ...values) => {
    const query = strings.join("?");
    if (query.includes("SELECT version FROM schema_migrations")) return [];
    if (query.includes("SELECT locked_until")) return [];
    if (query.includes("INSERT INTO schema_migration_locks")) {
      lockToken = values[1];
      return [{ lock_token: lockToken }];
    }
    throw new Error(`Unexpected migration query: ${query}`);
  };

  const claimed = await claimMigration(sql, "media_catalog_normalization_v2");
  assert.match(claimed, /^[0-9a-f-]{36}$/);
  assert.equal(claimed, lockToken);
});