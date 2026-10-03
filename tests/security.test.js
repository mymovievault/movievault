import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../public/js/utils/escape.js";
import { validWatchedWith } from "../api/_lib/watched-with.js";
import { validateProfile } from "../api/_lib/profile.js";

test("escapes dynamic HTML content", () => {
  assert.equal(escapeHtml(`<script>alert(1)</script>`), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(escapeHtml(`quote & ' apostrophe`), "quote &amp; &#39; apostrophe");
});

test("watched-with input accepts unique usernames and rejects malformed lists", () => {
  assert.equal(validWatchedWith(["alex", "sam"]), true);
  assert.equal(validWatchedWith([]), true);
  assert.equal(validWatchedWith("alex"), false);
  assert.equal(validWatchedWith(["alex", "alex"]), false);
  assert.equal(validWatchedWith([""]), false);
  assert.equal(validWatchedWith(Array(21).fill("alex")), false);
});

test("profile details are normalized and validated", () => {
  assert.deepEqual(validateProfile({ displayName: "  Movie Fan  ", email: " FAN@example.com ", mobileNumber: "+1 (415) 555-0123" }), {
    profile: { displayName: "Movie Fan", email: "fan@example.com", mobileNumber: "+1 (415) 555-0123" },
  });
  assert.match(validateProfile({ email: "not-an-email" }).error, /valid email/i);
  assert.match(validateProfile({ mobileNumber: "123" }).error, /7-15 digits/i);
  assert.match(validateProfile({ displayName: "x".repeat(81) }).error, /80 characters/i);
});
