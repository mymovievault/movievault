import test from "node:test";
import assert from "node:assert/strict";
import { createLibrary } from "../public/js/data/library.js";
import invitations from "../api/_lib/routes/invitations.js";

test("library records remain isolated by the repository instance", () => {
  const firstUser = createLibrary([{ tmdbId: 1, title: "Private one", status: "watched" }]);
  const secondUser = createLibrary([{ tmdbId: 2, title: "Private two", status: "watched" }]);
  assert.equal(firstUser.find(2), undefined);
  assert.equal(secondUser.find(1), undefined);
});

test("library update does not mutate an unrelated record", () => {
  const library = createLibrary([{ tmdbId: 10, title: "Owned", status: "wishlist" }]);
  library.update(10, { status: "watched" });
  assert.equal(library.find(10).status, "watched");
  assert.equal(library.find(11), undefined);
});

test("invitations require a session for both reading and responding", async () => {
  for (const method of ["GET", "POST"]) {
    const response = {
      setHeader() {},
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await invitations({ method, headers: {}, body: { id: "other-user-invitation", action: "accept" } }, response);
    assert.equal(response.code, 401);
    assert.match(response.body.error, /sign in/i);
  }
});
