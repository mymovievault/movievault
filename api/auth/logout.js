import { sessionCookie } from "../_lib/session.js";

export default function logout(request, response) {
  response.setHeader("Set-Cookie", sessionCookie("", 0));
  response.redirect(process.env.FRONTEND_URL || "/");
}
