const routes = new Map();

export function registerRoute(path, render) {
  routes.set(path, render);
}

export function startRouter(onRoute) {
  const renderRoute = () => {
    const path = window.location.hash.slice(1) || "/";
    const route = routes.get(path) || [...routes].find(([pattern]) => path.startsWith(`${pattern}/`))?.[1] || routes.get("/");
    onRoute(route, path);
  };
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

export function navigate(path) {
  window.location.hash = path;
}
