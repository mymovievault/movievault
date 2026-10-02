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

export function bindLibraryFilters(root) {
  const apply = () => {
    const type = root.querySelector("[data-library-type]")?.value || "all";
    const genre = root.querySelector("[data-library-genre]")?.value || "all";
    root.querySelectorAll(".movie-card").forEach((card) => {
      const matchesType = type === "all" || (type === "anime" ? card.dataset.anime === "true" : card.dataset.mediaType === type);
      const matchesGenre = genre === "all" || card.dataset.genres?.split(",").includes(genre);
      card.hidden = !(matchesType && matchesGenre);
    });
  };
  root.querySelectorAll("[data-library-type], [data-library-genre]").forEach((control) => control.addEventListener("change", apply));
}
