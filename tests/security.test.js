import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../js/utils/escape.js";
import { validWatchedWith } from "../api/_lib/watched-with.js";

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
