import test from "node:test";
import assert from "node:assert/strict";
import { routeKey } from "../api/_lib/route-key.js";

test("route key prefers the requested path over a query parameter", () => {
  assert.equal(routeKey({ url: "/api/auth/login?route=signup" }, "/api/auth/"), "login");
});

test("route key reads Vercel catch-all parameters after an internal rewrite", () => {
  assert.equal(routeKey({ url: "/api/[...route]?route=movies", query: { route: "movies" } }, "/api/"), "movies");
  assert.equal(routeKey({ url: "/api/auth/[...route]?route=login", query: { route: "login" } }, "/api/auth/"), "login");
});