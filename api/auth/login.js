export default function login(request, response) {
  const callback = process.env.GITHUB_CALLBACK_URL || `${process.env.APP_URL}/api/auth/callback`;
  const params = new URLSearchParams({ client_id: process.env.GITHUB_CLIENT_ID, redirect_uri: callback, scope: "repo" });
  response.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
