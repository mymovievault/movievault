import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../js/utils/escape.js";

test("escapes dynamic HTML content", () => {
  assert.equal(escapeHtml(`<script>alert(1)</script>`), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(escapeHtml(`quote & ' apostrophe`), "quote &amp; &#39; apostrophe");
});
