import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function adminPage() {
  return `<main><section class="page-heading"><p class="eyebrow">ADMINISTRATION</p><h1>Account requests</h1><p>Review people waiting to join Movie Vault.</p><button class="button button-quiet" data-refresh-requests>Refresh requests</button></section><section class="admin-list" data-admin-list><p class="search-status">Loading requests...</p></section></main>`;
}

export async function bindAdmin(root, apiUrl) {
  const list = root.querySelector("[data-admin-list]");
  const refresh = root.querySelector("[data-refresh-requests]");
  const load = async () => {
    const response = await fetch(`${apiUrl}/api/admin/requests`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load requests.");
    const pending = result.pending || [];
    const users = result.users || [];
    list.innerHTML = `<h2>Pending requests</h2>${pending.length ? pending.map((user) => `<article class="admin-request"><div><strong>${escapeHtml(user.username)}</strong><small>${escapeHtml(new Date(user.created_at).toLocaleDateString())}</small></div><div class="admin-actions"><button class="button button-primary" data-user-id="${escapeAttr(user.id)}" data-status="approved">Approve</button><button class="button button-quiet" data-user-id="${escapeAttr(user.id)}" data-status="rejected">Reject</button></div></article>`).join("") : `<div class="empty-state">No pending account requests.</div>`}<h2>Users</h2>${users.map((user) => `<article class="admin-request"><div><strong>${escapeHtml(user.username)}</strong><small>${escapeHtml(user.status)} / ${escapeHtml(user.role)}</small></div><button class="button button-quiet" data-reset-username="${escapeAttr(user.username)}">Issue reset token</button></article>`).join("")}`;
    list.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", async () => {
      const response = await fetch(`${apiUrl}/api/admin/requests`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: button.dataset.userId, status: button.dataset.status }) });
      if (!response.ok) throw new Error((await response.json()).error || "Could not update account.");
      await load();
    }));
    list.querySelectorAll("[data-reset-username]").forEach((button) => button.addEventListener("click", async () => {
      const response = await fetch(`${apiUrl}/api/admin/requests`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "issue-reset", username: button.dataset.resetUsername }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not issue reset token.");
      window.prompt(`Give ${result.username} this one-time recovery token. It expires in ${result.expiresInMinutes} minutes.`, result.resetToken);
    }));
  };
  try {
    await load();
    refresh.addEventListener("click", load);
    window.setInterval(load, 15000);
  } catch (error) {
    list.innerHTML = `<div class="error-state">${error.message}</div>`;
  }
}