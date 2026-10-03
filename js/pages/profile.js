import { changePassword, loadProfile, logout, saveProfile } from "../data/storage.js";
import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function profilePage(session) {
  return `<main class="profile-page"><section class="page-heading"><p class="eyebrow">ACCOUNT</p><h1>Profile &amp; settings</h1><p>Signed in as ${escapeHtml(session.login)}</p></section><div class="profile-settings"><section class="profile-section"><p class="eyebrow">YOUR DETAILS</p><h2>Profile</h2><form data-profile-form><label>Username<input value="${escapeAttr(session.login)}" readonly /></label><label>Display name<input name="displayName" maxlength="80" autocomplete="name" /></label><label>Email<input name="email" type="email" maxlength="254" autocomplete="email" /></label><label>Mobile number<input name="mobileNumber" type="tel" maxlength="32" autocomplete="tel" /></label><p class="profile-note">Email and mobile are unverified contact details and cannot be used to sign in or recover your account.</p><button class="button button-primary" type="submit">Save profile</button><p class="profile-status" data-profile-status role="status"></p></form></section><section class="profile-section"><p class="eyebrow">SECURITY</p><h2>Change password</h2><form data-password-form><label>Current password<input name="currentPassword" type="password" required autocomplete="current-password" /></label><label>New password<input name="newPassword" type="password" required minlength="8" autocomplete="new-password" /></label><label>Confirm new password<input name="confirmPassword" type="password" required minlength="8" autocomplete="new-password" /></label><p class="profile-note">Changing your password signs out all active sessions.</p><button class="button button-quiet" type="submit">Update password</button><p class="profile-status" data-password-status role="status"></p></form></section></div></main>`;
}

export function bindProfile(root, apiUrl) {
  const profileForm = root.querySelector("[data-profile-form]");
  const passwordForm = root.querySelector("[data-password-form]");
  const profileStatus = root.querySelector("[data-profile-status]");
  const passwordStatus = root.querySelector("[data-password-status]");
  const setFields = (profile) => {
    profileForm.elements.displayName.value = profile.display_name || "";
    profileForm.elements.email.value = profile.email || "";
    profileForm.elements.mobileNumber.value = profile.mobile_number || "";
  };

  if (!apiUrl) {
    profileStatus.textContent = "Profile settings require an online account.";
    profileForm.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    passwordForm.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    return;
  }

  loadProfile(apiUrl).then(setFields).catch((error) => { profileStatus.textContent = error.message; });
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = profileForm.querySelector('[type="submit"]');
    button.disabled = true;
    profileStatus.textContent = "Saving...";
    try {
      const result = await saveProfile(apiUrl, Object.fromEntries(new FormData(profileForm)));
      setFields(result);
      profileStatus.textContent = "Profile saved.";
    } catch (error) {
      profileStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(passwordForm));
    if (values.newPassword !== values.confirmPassword) {
      passwordStatus.textContent = "New passwords do not match.";
      return;
    }
    const button = passwordForm.querySelector('[type="submit"]');
    button.disabled = true;
    passwordStatus.textContent = "Updating...";
    try {
      await changePassword(apiUrl, values.currentPassword, values.newPassword);
      passwordStatus.textContent = "Password updated. Signing you out...";
      await logout(apiUrl);
      window.location.reload();
    } catch (error) {
      passwordStatus.textContent = error.message;
      button.disabled = false;
    }
  });
}