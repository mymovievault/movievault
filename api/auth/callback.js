import { createSession, sessionCookie } from "../_lib/session.js";

export default async function callback(request, response) {
  try {
    const callback = process.env.GITHUB_CALLBACK_URL || `${process.env.APP_URL}/api/auth/callback`;
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code: request.query.code, redirect_uri: callback }) });
    const token = await tokenResponse.json();
    if (!token.access_token) throw new Error("GitHub login failed");
    const userResponse = await fetch("https://api.github.com/user", { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token.access_token}` } });
    const user = await userResponse.json();
    if (process.env.GITHUB_ALLOWED_USER && user.login !== process.env.GITHUB_ALLOWED_USER) throw new Error("This GitHub account is not allowed");
    response.setHeader("Set-Cookie", sessionCookie(createSession({ login: user.login, accessToken: token.access_token })));
    response.redirect(process.env.FRONTEND_URL || "/");
  } catch (error) {
    response.status(401).send(error.message);
  }
}
