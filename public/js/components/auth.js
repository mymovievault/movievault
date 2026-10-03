import { escapeHtml } from "../utils/escape.js";

export function authPage(notice = "") {
  return `<main class="auth-page"><section class="auth-panel"><p class="eyebrow">YOUR PERSONAL FILM ARCHIVE</p><h1>Welcome to<br /><em>Movie Vault.</em></h1><p class="auth-copy">Create an account to keep your movie and series lists private and available wherever you sign in.</p>${notice ? `<p class="auth-message">${escapeHtml(notice)}</p>` : ""}<form data-auth-form><label>Username<input name="username" data-username required minlength="3" maxlength="24" autocomplete="username" placeholder="your name" /><p class="username-status" data-username-status></p></label><label>Password<input name="password" type="password" required minlength="8" autocomplete="current-password" placeholder="At least 8 characters" /></label><button class="button button-primary" type="submit" data-auth-submit>Sign in <span>↗</span></button><p class="auth-message" data-auth-message></p></form><button class="text-link auth-toggle" type="button" data-auth-toggle>Create a new account</button><button class="text-link" type="button" data-recovery-toggle>Use a recovery token</button><form data-recovery-form hidden><label>Recovery token<input name="resetToken" required autocomplete="one-time-code" /></label><label>New password<input name="newPassword" type="password" required minlength="8" autocomplete="new-password" /></label><button class="button button-quiet" type="submit">Reset password</button><p class="auth-message" data-recovery-message></p></form></section></main>`;
}

export function bindAuth(root, apiUrl) {
  const form = root.querySelector("[data-auth-form]");
  const toggle = root.querySelector("[data-auth-toggle]");
  const submit = root.querySelector("[data-auth-submit]");
  const message = root.querySelector("[data-auth-message]");
  const username = root.querySelector("[data-username]");
  const usernameStatus = root.querySelector("[data-username-status]");
  const recoveryToggle = root.querySelector("[data-recovery-toggle]");
  const recoveryForm = root.querySelector("[data-recovery-form]");
  const recoveryMessage = root.querySelector("[data-recovery-message]");
  let mode = "login";
  let availabilityTimer;
  recoveryToggle.addEventListener("click", () => { recoveryForm.hidden = !recoveryForm.hidden; });
  recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    recoveryMessage.textContent = "Working...";
    const response = await fetch(`${apiUrl}/api/auth/recover`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(recoveryForm))) });
    const result = await response.json();
    recoveryMessage.textContent = response.ok ? result.message : result.error;
    if (response.ok) recoveryForm.reset();
  });
  toggle.addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    submit.innerHTML = mode === "login" ? "Sign in <span>↗</span>" : "Create account <span>↗</span>";
    toggle.textContent = mode === "login" ? "Create a new account" : "I already have an account";
    form.querySelector("[name=password]").autocomplete = mode === "login" ? "current-password" : "new-password";
    message.textContent = "";
    usernameStatus.textContent = "";
  });
  username.addEventListener("input", () => {
    clearTimeout(availabilityTimer);
    usernameStatus.className = "username-status";
    const value = username.value.trim();
    if (mode !== "signup" || value.length < 3) {
      usernameStatus.textContent = "";
      return;
    }
    usernameStatus.textContent = "Checking...";
    availabilityTimer = window.setTimeout(async () => {
      const response = await fetch(`${apiUrl}/api/auth/availability?username=${encodeURIComponent(value)}`, { credentials: "include" });
      const result = await response.json();
      usernameStatus.textContent = result.message;
      usernameStatus.classList.toggle("is-available", result.available);
      usernameStatus.classList.toggle("is-taken", !result.available);
    }, 300);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    message.textContent = "Working...";
    try {
      const response = await fetch(`${apiUrl}/api/auth/${mode}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not authenticate.");
      if (result.pending) {
        mode = "login";
        submit.innerHTML = "Sign in <span>↗</span>";
        toggle.textContent = "Create a new account";
        message.classList.add("is-success");
        message.innerHTML = `<strong>Request submitted.</strong><br />${escapeHtml(result.message)}`;
        form.reset();
      } else {
        window.location.reload();
      }
      submit.disabled = false;
    } catch (error) {
      message.classList.remove("is-success");
      message.textContent = error.message;
      submit.disabled = false;
    }
  });
}
