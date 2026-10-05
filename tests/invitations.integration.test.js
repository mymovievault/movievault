import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import {
  listMovies,
  listWatchedInvitations,
  resetDatabaseClientForTests,
  respondToWatchedInvitation,
  setDatabaseClientForTests,
  syncWatchedInvitations,
  upsertMovie,
} from "../api/_lib/database.js";

const { Pool } = pg;
const connectionString = process.env.TEST_DATABASE_URL;

test("watched invitations respect recipient consent and preserve existing movie details", {
  skip: !connectionString,
}, async (context) => {
  const databaseUrl = new URL(connectionString);
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(databaseUrl.hostname), "TEST_DATABASE_URL must point to local PostgreSQL");
  assert.match(databaseUrl.pathname, /_test$/, "TEST_DATABASE_URL database name must end with _test");

  const pool = new Pool({ connectionString });
  const sql = async (strings, ...values) => {
    const text = strings.reduce((query, part, index) => `${query}${part}${index < values.length ? `$${index + 1}` : ""}`, "");
    return (await pool.query(text, values)).rows;
  };
  setDatabaseClientForTests(sql);
  context.after(async () => {
    resetDatabaseClientForTests();
    await pool.end();
  });

  const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const sender = `it_${runId}_sender`;
  const newRecipient = `it_${runId}_new`;
  const existingRecipient = `it_${runId}_existing`;
  const decliningRecipient = `it_${runId}_declining`;
  const otherUser = `it_${runId}_other`;
  await listMovies(sender);
  for (const username of [sender, newRecipient, existingRecipient, decliningRecipient, otherUser]) {
    await sql`INSERT INTO users (id, username, password_hash, status, role) VALUES (${crypto.randomUUID()}, ${username}, 'integration-test', 'approved', 'member')`;
  }

  const tmdbId = `it-${runId}`;
  const watchedDate = "2026-01-14";
  const senderMovie = {
    tmdbId,
    externalIds: { tmdb: tmdbId },
    mediaType: "movie",
    metadataSource: "TMDB",
    title: "Invitation integration fixture",
    year: 2026,
    status: "watched",
    watchedDate,
    watchedWith: [newRecipient, existingRecipient, decliningRecipient],
  };
  const saved = await upsertMovie(senderMovie, sender);
  await syncWatchedInvitations(sender, saved.canonicalId, senderMovie.watchedWith, watchedDate);

  const newRecipientInvites = await listWatchedInvitations(newRecipient);
  assert.equal(newRecipientInvites.length, 1);
  assert.equal(newRecipientInvites[0].title, senderMovie.title);
  assert.deepEqual(await listMovies(newRecipient), []);
  assert.equal(await respondToWatchedInvitation(otherUser, newRecipientInvites[0].id, "accept"), false);
  assert.equal((await listWatchedInvitations(newRecipient)).length, 1);

  await upsertMovie({ ...senderMovie, status: "watched", watchedDate: "2025-08-01", rating: 9, notes: "private notes", watchedWith: [] }, existingRecipient);
  const existingInvite = await listWatchedInvitations(existingRecipient);
  assert.equal(await respondToWatchedInvitation(existingRecipient, existingInvite[0].id, "accept"), true);
  const existingMovie = (await listMovies(existingRecipient))[0];
  assert.equal(existingMovie.rating, 9);
  assert.equal(existingMovie.notes, "private notes");
  assert.equal(existingMovie.watchedDate, "2025-08-01");

  const decliningInvite = await listWatchedInvitations(decliningRecipient);
  assert.equal(await respondToWatchedInvitation(decliningRecipient, decliningInvite[0].id, "decline"), true);
  assert.deepEqual(await listMovies(decliningRecipient), []);
  assert.deepEqual(await listWatchedInvitations(decliningRecipient), []);
  assert.equal(await respondToWatchedInvitation(decliningRecipient, decliningInvite[0].id, "accept"), false);

  assert.equal(await respondToWatchedInvitation(newRecipient, newRecipientInvites[0].id, "accept"), true);
  const newRecipientMovies = await listMovies(newRecipient);
  assert.equal(newRecipientMovies.length, 1);
  assert.equal(newRecipientMovies[0].status, "watched");
  assert.equal(newRecipientMovies[0].watchedDate, watchedDate);
  assert.equal(await respondToWatchedInvitation(newRecipient, newRecipientInvites[0].id, "accept"), false);
});