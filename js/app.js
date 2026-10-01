import { startRouter, registerRoute } from "./router.js";
import { loadFlatFile, saveMovie, downloadFlatFile } from "./data/storage.js";
import { createLibrary } from "./data/library.js";
import { homePage } from "./pages/home.js";
import { libraryPage } from "./pages/library.js";
import { wishlistPage } from "./pages/wishlist.js";
import { upcomingPage } from "./pages/upcoming.js";
import { movieModal } from "./components/movie-modal.js";
import { bindFilters } from "./components/filters.js";
import { bindMovieForm } from "./components/movie-form.js";
import { createTmdbClient } from "./api/tmdb.js";
import { TMDB_READ_TOKEN, MOVIE_API_URL } from "./config.js";
import { createTheatreClient } from "./api/places.js";

const app = document.querySelector("#app");

async function boot() {
  try {
    const library = createLibrary(await loadFlatFile(MOVIE_API_URL ? `${MOVIE_API_URL}/api/movies` : ""));
    const tmdbClient = TMDB_READ_TOKEN ? createTmdbClient({ token: TMDB_READ_TOKEN }) : null;
    const theatreClient = createTheatreClient();
    const render = (content, active) => {
      app.innerHTML = shell(content, active, library);
      bindNavigation();
      bindShelfControls(library, render, tmdbClient, theatreClient);
    };

    registerRoute("/", () => render(homePage(library), "/"));
    registerRoute("/library", () => render(libraryPage(library, ["watched", "watching"], "Watched & Watching"), "/library"));
    registerRoute("/wishlist", () => render(wishlistPage(library, "wishlist", "Wishlist"), "/wishlist"));
    registerRoute("/upcoming", () => render(upcomingPage(library, "upcoming", "Upcoming"), "/upcoming"));
    registerRoute("/movie", (path) => render(movieModal(library.find(path.split("/").pop())), ""));
    startRouter((route, path) => route(path));

    window.addEventListener("click", (event) => {
      if (event.target.closest("[data-export]")) downloadFlatFile(library.all());
    });
  } catch (error) {
    app.innerHTML = `<main class="error-state"><p>Could not open the vault.</p><code>${error.message}</code></main>`;
  }
}

function shell(content, active, library) {
  const stats = library.stats();
  return `<header class="topbar"><a class="brand" href="#/">MOVIE <span>VAULT</span></a><nav>${navItem("/", "Overview", active)}${navItem("/library", "Watched", active)}${navItem("/wishlist", "Wishlist", active)}${navItem("/upcoming", "Upcoming", active)}</nav><button class="button button-quiet" data-export>Export JSON</button></header>${content}<footer><span>PERSONAL CINEMA ARCHIVE</span><span>${stats.total} TITLES / FLAT FILE STORAGE</span></footer>`;
}

function navItem(route, label, active) {
  return `<a data-route="${route}" class="nav-link ${active === route ? "is-active" : ""}" href="#${route}">${label}</a>`;
}

function bindNavigation() {
  document.querySelectorAll("[data-route]").forEach((link) => link.addEventListener("click", () => { window.location.hash = link.dataset.route; }));
}

function bindShelfControls(library, render, tmdbClient, theatreClient) {
  const root = document.querySelector("main");
  if (!root) return;
  bindFilters(root);
  bindMovieForm(root, async (formData, metadata) => {
    const record = library.add({
      ...metadata,
      title: formData.title.trim(),
      year: formData.year ? Number(formData.year) : null,
      poster: formData.poster.trim(),
      genres: metadata.genres || ["Uncategorized"],
      runtime: metadata.runtime || 0,
      status: formData.status,
      rating: formData.rating ? Number(formData.rating) : null,
      watchedDate: formData.watchedDate || null,
      notes: formData.notes.trim(),
      tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      watchingMode: formData.watchingMode,
      ottPlatform: formData.ottPlatform.trim(),
      theatreName: formData.theatreName.trim(),
    });
    try {
      await saveMovie(record, MOVIE_API_URL ? `${MOVIE_API_URL}/api/movies` : "");
      const shelf = formData.status === "wishlist" ? "/wishlist" : formData.status === "upcoming" ? "/upcoming" : "/library";
      const page = shelf === "/wishlist" ? wishlistPage(library, "wishlist", "Wishlist") : shelf === "/upcoming" ? upcomingPage(library, "upcoming", "Upcoming") : libraryPage(library, ["watched", "watching"], "Watched & Watching");
      render(page, shelf);
    } catch (error) {
      library.remove(record.tmdbId);
      window.alert(error.message);
    }
  }, tmdbClient, theatreClient);
  const search = root.querySelector("[data-search]");
  if (search) search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    root.querySelectorAll(".movie-card").forEach((card) => { card.hidden = !card.textContent.toLowerCase().includes(query); });
  });
}

boot();
