import { startRouter, registerRoute } from "./router.js";
import { loadFlatFile, loadUpcoming, saveMovie, updateMovie, deleteMovie, getSession, loadWatchlists, logout } from "./data/storage.js";
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
import { authPage, bindAuth } from "./components/auth.js";
import { adminPage, bindAdmin } from "./components/admin.js";
import { listsPage, bindLists } from "./pages/lists.js";

const app = document.querySelector("#app");

async function boot() {
  try {
    const session = MOVIE_API_URL ? await getSession(MOVIE_API_URL) : { authenticated: true, login: "local" };
    if (!session.authenticated) {
      app.innerHTML = authPage();
      bindAuth(app, MOVIE_API_URL);
      return;
    }
    const library = createLibrary(await loadFlatFile(MOVIE_API_URL ? `${MOVIE_API_URL}/api/movies` : ""));
    let watchlists = MOVIE_API_URL ? await loadWatchlists(MOVIE_API_URL) : [];
    let curatedUpcoming = [];
    try {
      curatedUpcoming = await loadUpcoming(MOVIE_API_URL);
    } catch {
      try {
        curatedUpcoming = await loadUpcoming();
      } catch {}
    }
    const tmdbClient = TMDB_READ_TOKEN ? createTmdbClient({ token: TMDB_READ_TOKEN }) : null;
    const theatreClient = createTheatreClient();
    const render = (content, active) => {
      app.innerHTML = shell(content, active, library, session);
      bindNavigation();
      if (active === "/admin") bindAdmin(app, MOVIE_API_URL);
      else if (active === "/lists") bindLists(app, MOVIE_API_URL, (lists) => { watchlists = lists; });
      else if (active === "/upcoming") bindUpcoming(app, curatedUpcoming, library, render);
      else bindShelfControls(library, render, tmdbClient, theatreClient, active, watchlists);
    };

    registerRoute("/", () => render(homePage(library, watchlists), "/"));
    registerRoute("/library", () => render(libraryPage(library, ["watched", "watching"], "Watched & Watching"), "/library"));
    registerRoute("/wishlist", () => render(wishlistPage(library, "wishlist", "Wishlist"), "/wishlist"));
    registerRoute("/upcoming", () => render(upcomingPage(curatedUpcoming), "/upcoming"));
    registerRoute("/admin", () => render(adminPage(), "/admin"));
    registerRoute("/lists", () => render(listsPage(library), "/lists"));
    registerRoute("/movie", (path) => render(movieModal(library.find(path.split("/").pop())), ""));
    startRouter((route, path) => route(path));

  } catch (error) {
    app.innerHTML = `<main class="error-state"><p>Could not open the vault.</p><code>${error.message}</code></main>`;
  }
}

function shell(content, active, library, session) {
  const stats = library.stats();
  const adminLink = session.role === "admin" ? navItem("/admin", "Admin", active) : "";
  return `<header class="topbar"><a class="brand" href="#/">MOVIE <span>VAULT</span></a><nav>${navItem("/", "Overview", active)}${navItem("/library", "Watched", active)}${navItem("/lists", "Watchlists", active)}${navItem("/upcoming", "Upcoming", active)}${adminLink}</nav><span class="account-name">${session.login}</span><button class="button button-quiet" data-logout>Sign out</button></header>${content}<footer><span>PERSONAL CINEMA ARCHIVE</span><span>${stats.total} TITLES / DATABASE STORAGE</span></footer>`;
}

function navItem(route, label, active) {
  return `<a data-route="${route}" class="nav-link ${active === route ? "is-active" : ""}" href="#${route}">${label}</a>`;
}

function bindNavigation() {
  document.querySelectorAll("[data-route]").forEach((link) => link.addEventListener("click", () => { window.location.hash = link.dataset.route; }));
  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await logout(MOVIE_API_URL);
    window.location.reload();
  });
}

function bindShelfControls(library, render, tmdbClient, theatreClient, active, watchlists) {
  const root = document.querySelector("main");
  if (!root) return;
  bindFilters(root);
  bindMovieForm(root, async (formData, metadata) => {
    const record = library.add({
      ...metadata,
      title: formData.title.trim(),
      year: metadata.year || null,
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
      ottAvailability: formData.ottAvailability,
      theatreName: formData.theatreName.trim(),
      listId: formData.listId,
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
  }, tmdbClient, theatreClient, watchlists);
  const search = root.querySelector("[data-search]");
  if (search) search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    root.querySelectorAll(".movie-card").forEach((card) => { card.hidden = !card.textContent.toLowerCase().includes(query); });
  });
  bindLibraryActions(root, library, render, active);
}

function bindLibraryActions(root, library, render, active) {
  root.querySelectorAll("[data-movie-action]").forEach((button) => button.addEventListener("click", async () => {
    const tmdbId = Number(button.dataset.movieId);
    button.disabled = true;
    try {
      if (button.dataset.movieAction === "watched") {
        const changes = { status: "watched", watchedDate: new Date().toISOString().slice(0, 10) };
        const updated = await updateMovie(tmdbId, changes, `${MOVIE_API_URL}/api/movies`);
        library.update(tmdbId, updated);
        render(libraryPage(library, ["watched", "watching"], "Watched & Watching"), "/library");
      } else {
        await deleteMovie(tmdbId, `${MOVIE_API_URL}/api/movies`);
        library.remove(tmdbId);
        render(libraryPage(library, "wishlist", "Wishlist"), active);
      }
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  }));
}

function bindUpcoming(root, entries, library, render) {
  root.querySelector("[data-upcoming-filter]")?.addEventListener("change", (event) => {
    const selected = event.target.value;
    root.querySelectorAll("[data-upcoming-section]").forEach((section) => { section.hidden = selected !== "All" && section.dataset.upcomingSection !== selected; });
  });
  root.querySelectorAll("[data-add-upcoming]").forEach((button) => button.addEventListener("click", async () => {
    const source = entries.find((entry) => String(entry.tmdbId) === button.dataset.addUpcoming);
    if (!source) return;
    const record = library.add({ ...source, status: "wishlist", tags: [...(source.tags || []), "curated upcoming"], notes: source.curatedNote || "" });
    button.disabled = true;
    try {
      await saveMovie(record, MOVIE_API_URL ? `${MOVIE_API_URL}/api/movies` : "");
      render(wishlistPage(library, "wishlist", "Wishlist"), "/wishlist");
    } catch (error) {
      library.remove(record.tmdbId);
      button.disabled = false;
      window.alert(error.message);
    }
  }));
}

boot();
