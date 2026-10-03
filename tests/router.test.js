import test from "node:test";
import assert from "node:assert/strict";

function createWindow(startHash) {
  let hash = startHash;
  const listeners = new Map();
  return {
    location: {
      get hash() { return hash; },
      set hash(value) {
        hash = value.startsWith("#") ? value : `#${value}`;
        listeners.get("hashchange")?.();
      },
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
  };
}

test("in-app back follows route history and sends a direct deep link to overview", async () => {
  const router = await import("../public/js/router.js?history-test");
  globalThis.window = createWindow("#/");
  router.registerRoute("/", () => {});
  router.registerRoute("/library", () => {});
  router.registerRoute("/movie", () => {});
  router.startRouter((route, path) => route(path));

  assert.equal(router.canGoBack(), false);
  window.location.hash = "/library";
  window.location.hash = "/movie/42";
  router.goBack();
  assert.equal(window.location.hash, "#/library");
  router.goBack();
  assert.equal(window.location.hash, "#/");
  assert.equal(router.canGoBack(), false);

  const directRouter = await import("../public/js/router.js?direct-link-test");
  globalThis.window = createWindow("#/movie/42");
  directRouter.registerRoute("/", () => {});
  directRouter.registerRoute("/movie", () => {});
  directRouter.startRouter((route, path) => route(path));
  assert.equal(directRouter.canGoBack(), true);
  directRouter.goBack();
  assert.equal(window.location.hash, "#/");
  assert.equal(directRouter.canGoBack(), false);

  delete globalThis.window;
});