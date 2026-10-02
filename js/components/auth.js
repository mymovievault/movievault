export function authPage() {
  return `<main class="auth-page"><section class="auth-panel"><p class="eyebrow">YOUR PERSONAL FILM ARCHIVE</p><h1>Welcome to<br /><em>Movie Vault.</em></h1><p class="auth-copy">Create an account to keep your movie and series lists private and available wherever you sign in.</p><form data-auth-form><label>Username<input name="username" required minlength="3" maxlength="24" autocomplete="username" placeholder="your name" /></label><label>Password<input name="password" type="password" required minlength="8" autocomplete="current-password" placeholder="At least 8 characters" /></label><button class="button button-primary" type="submit" data-auth-submit>Sign in <span>↗</span></button><p class="auth-message" data-auth-message></p></form><button class="text-link auth-toggle" type="button" data-auth-toggle>Create a new account</button></section></main>`;
}

export function bindAuth(root, apiUrl) {
  const form = root.querySelector("[data-auth-form]");
  const toggle = root.querySelector("[data-auth-toggle]");
  const submit = root.querySelector("[data-auth-submit]");
  const message = root.querySelector("[data-auth-message]");
  let mode = "login";
  toggle.addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    submit.innerHTML = mode === "login" ? "Sign in <span>↗</span>" : "Create account <span>↗</span>";
    toggle.textContent = mode === "login" ? "Create a new account" : "I already have an account";
    form.querySelector("[name=password]").autocomplete = mode === "login" ? "current-password" : "new-password";
    message.textContent = "";
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
        message.innerHTML = `<strong>Request submitted.</strong><br />${result.message}`;
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
