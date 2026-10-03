const routes = new Map();
let currentPath = null;
let routeHistory = [];
let resetRouteHistory = false;

export function registerRoute(path, render) {
  routes.set(path, render);
}

export function startRouter(onRoute) {
  const renderRoute = () => {
    const path = window.location.hash.slice(1) || "/";
    if (path === "/") {
      routeHistory = [path];
      resetRouteHistory = false;
    } else if (resetRouteHistory) {
      routeHistory = [path];
      resetRouteHistory = false;
    } else if (currentPath === null) {
      routeHistory = [path];
    } else if (path !== currentPath) {
      if (routeHistory.length > 1 && routeHistory.at(-2) === path) routeHistory.pop();
      else routeHistory.push(path);
    }
    currentPath = path;
    const route = routes.get(path) || [...routes].find(([pattern]) => path.startsWith(`${pattern}/`))?.[1] || routes.get("/");
    onRoute(route, path);
  };
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

export function navigate(path) {
  window.location.hash = path;
}

export function canGoBack() {
  return routeHistory.length > 1 || (routeHistory.length === 1 && routeHistory[0] !== "/");
}

export function goBack() {
  const previousPath = routeHistory.at(-2);
  if (previousPath) {
    window.location.hash = previousPath;
  } else if (routeHistory[0] && routeHistory[0] !== "/") {
    resetRouteHistory = true;
    window.location.hash = "/";
  }
}
