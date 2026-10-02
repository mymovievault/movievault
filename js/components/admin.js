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
    list.innerHTML = `<h2>Pending requests</h2>${pending.length ? pending.map((user) => `<article class="admin-request"><div><strong>${user.username}</strong><small>${new Date(user.created_at).toLocaleDateString()}</small></div><div class="admin-actions"><button class="button button-primary" data-user-id="${user.id}" data-status="approved">Approve</button><button class="button button-quiet" data-user-id="${user.id}" data-status="rejected">Reject</button></div></article>`).join("") : `<div class="empty-state">No pending account requests.</div>`}<h2>Users</h2>${users.map((user) => `<article class="admin-request"><div><strong>${user.username}</strong><small>${user.status} / ${user.role}</small></div></article>`).join("")}`;
    list.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", async () => {
      await fetch(`${apiUrl}/api/admin/requests`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: button.dataset.userId, status: button.dataset.status }) });
      await load();
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