export function filterBar() {
  return `<div class="filter-bar"><button class="filter-button is-active" data-filter="all">All</button><button class="filter-button" data-filter="favourite">Favourites</button><button class="filter-button" data-filter="rewatch">Rewatch</button></div>`;
}

export function bindFilters(root) {
  const cards = [...root.querySelectorAll(".movie-card")];
  const apply = (value) => {
    const type = root.querySelector("[data-library-type]")?.value || "all";
    const genre = root.querySelector("[data-library-genre]")?.value || "all";
    cards.forEach((card) => {
      const matchesTag = value === "all" || card.dataset.tags?.split(",").includes(value);
      const matchesType = type === "all" || (type === "anime" ? card.dataset.anime === "true" : card.dataset.mediaType === type);
      const matchesGenre = genre === "all" || card.dataset.genres?.split(",").includes(genre);
      card.hidden = !(matchesTag && matchesType && matchesGenre);
    });
  };
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
    const tag = root.querySelector("[data-filter].is-active")?.dataset.filter || "all";
    const cards = [...root.querySelectorAll(".movie-card")];
    cards.forEach((card) => {
      const matchesTag = tag === "all" || card.dataset.tags?.split(",").includes(tag);
      const matchesType = type === "all" || (type === "anime" ? card.dataset.anime === "true" : card.dataset.mediaType === type);
      const matchesGenre = genre === "all" || card.dataset.genres?.split(",").includes(genre);
      card.hidden = !(matchesTag && matchesType && matchesGenre);
    });
    const count = root.querySelector("[data-library-count]");
    if (count) count.textContent = `Showing ${cards.filter((card) => !card.hidden).length} of ${cards.length} titles`;
  };
  root.querySelectorAll("[data-library-type], [data-library-genre]").forEach((control) => control.addEventListener("change", apply));
}
