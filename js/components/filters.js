export function filterBar() {
  return `<div class="filter-bar"><button class="filter-button is-active" data-filter="all">All</button><button class="filter-button" data-filter="favourite">Favourites</button><button class="filter-button" data-filter="rewatch">Rewatch</button></div>`;
}

export function bindFilters(root) {
  const cards = [...root.querySelectorAll(".movie-card")];
  const apply = (value) => cards.forEach((card) => { card.hidden = value !== "all" && !card.dataset.tags?.split(",").includes(value); });
  root.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    root.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    apply(button.dataset.filter);
  }));
}
