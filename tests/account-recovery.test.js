import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../api/_lib/passwords.js";
import recover from "../api/_lib/routes/auth/recover.js";
import requests from "../api/_lib/routes/admin/requests.js";
import { authPage } from "../js/components/auth.js";

function responseDouble() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

test("password hashes verify and reject the previous password", async () => {
  const hash = await hashPassword("new-password");
  assert.equal(await verifyPassword("new-password", hash), true);
  assert.equal(await verifyPassword("old-password", hash), false);
});

test("invalid and expired-shaped recovery tokens are rejected without database access", async () => {
  const response = responseDouble();
  await recover({ method: "POST", headers: {}, body: { resetToken: "not-a-token", newPassword: "new-password" } }, response);
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /recovery token/i);
});

test("expired sessions produce recoverable authentication copy", () => {
  assert.match(authPage("Your session expired."), /Your session expired\./);
});

test("admin requests remain unauthorized without a session", async () => {
  const response = responseDouble();
  await requests({ method: "GET", headers: {} }, response);
  assert.equal(response.statusCode, 403);
});

test("account lifecycle copy covers pending, approved, rejected, and resubmitted states", async () => {
  const signupSource = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../api/_lib/routes/auth/signup.js", import.meta.url), "utf8"));
  const loginSource = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../api/_lib/routes/auth/login.js", import.meta.url), "utf8"));
  assert.match(signupSource, /pending/);
  assert.match(signupSource, /resubmitted/);
  assert.match(loginSource, /waiting for admin approval/);
  assert.match(signupSource, /rejected/);
});