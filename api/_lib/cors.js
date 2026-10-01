export function setCors(response) {
  response.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}
