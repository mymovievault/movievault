export function releaseReminders(records) {
  const now = Date.now();
  const reminders = records.filter((record) => {
    if (!record.releaseDate) return false;
    const days = (new Date(`${record.releaseDate}T00:00:00`).getTime() - now) / 86400000;
    return days >= 0 && days <= 30;
  });
  if (!reminders.length) return "";
  return `<section class="release-reminders"><p class="eyebrow">RELEASE REMINDERS</p>${reminders.map((record) => `<a href="#/movie/${record.tmdbId}"><strong>${record.title}</strong><span>${formatRelease(record.releaseDate)}</span></a>`).join("")}</section>`;
}

function formatRelease(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}
