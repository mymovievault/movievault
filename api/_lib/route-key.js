export function routeKey(request, prefix) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname.startsWith(prefix)) {
    const pathKey = pathname.slice(prefix.length).replace(/\/$/, "");
    if (pathKey && !pathKey.includes("[...")) return pathKey;
  }
  const parameter = request.query?.route;
  return typeof parameter === "string" ? parameter.replace(/^\/+|\/+$/g, "") : "";
}