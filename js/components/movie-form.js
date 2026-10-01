import { imageUrl } from "../api/tmdb.js";

export function movieForm() {
  return `<details class="add-movie-panel"><summary class="button button-primary">Add a movie <span>+</span></summary><form class="movie-form" data-add-movie><div class="form-heading"><p class="eyebrow">NEW ENTRY</p><h2>Log what you are watching</h2><p class="form-hint">Search TMDB by title to fill in the film details, then add your viewing information.</p></div><div class="form-grid"><label class="form-wide">Title or series<input name="title" data-title-search required autocomplete="off" placeholder="Start typing a title..." /><div class="search-results" data-title-results></div></label><label>Status<select name="status"><option value="watching">Watching now</option><option value="watched">Watched</option><option value="wishlist">Want to watch</option><option value="upcoming">Upcoming</option></select></label><label>Where are you watching?<select name="watchingMode" data-watching-mode><option value="ott">OTT / streaming</option><option value="theatre">Theatre</option></select></label><label data-ott-field>OTT platform<input name="ottPlatform" placeholder="Netflix, Prime Video..." /></label><label data-theatre-field hidden>Theatre name<input name="theatreName" data-theatre-search autocomplete="off" placeholder="Search a theatre..." /><div class="search-results" data-theatre-results></div></label><label>Your rating<input name="rating" type="number" min="1" max="10" step="1" placeholder="1–10" /></label><label>Watched date<input name="watchedDate" type="date" /></label><input name="poster" data-poster type="hidden" /><label class="form-wide">Notes<textarea name="notes" rows="3" placeholder="A quick note for future you..."></textarea></label><label class="form-wide">Tags<input name="tags" placeholder="favourite, rewatch" /></label></div><div class="form-actions"><button class="button button-primary" type="submit">Save to vault <span>↗</span></button><button class="text-link" type="reset">Clear form</button></div></form></details>`;
}

export function bindMovieForm(root, onSubmit, tmdbClient, theatreClient) {
  const form = root.querySelector("[data-add-movie]");
  if (!form) return;
  const mode = form.querySelector("[data-watching-mode]");
  const ottField = form.querySelector("[data-ott-field]");
  const theatreField = form.querySelector("[data-theatre-field]");
  const updateLocationFields = () => {
    const isTheatre = mode.value === "theatre";
    ottField.hidden = isTheatre;
    theatreField.hidden = !isTheatre;
  };
  mode.addEventListener("change", updateLocationFields);
  bindTitleSearch(form, tmdbClient);
  bindTheatreSearch(form, theatreClient);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const metadata = form.dataset.metadata ? JSON.parse(form.dataset.metadata) : {};
    onSubmit(Object.fromEntries(new FormData(form)), metadata);
  });
}

function bindTheatreSearch(form, theatreClient) {
  const input = form.querySelector("[data-theatre-search]");
  const results = form.querySelector("[data-theatre-results]");
  if (!input || !theatreClient) return;
  let timer;
  let requestId = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const currentRequest = ++requestId;
    const query = input.value.trim();
    if (query.length < 3) {
      results.innerHTML = "";
      return;
    }
    results.innerHTML = `<p class="search-status">Searching nearby theatres...</p>`;
    timer = setTimeout(async () => {
      try {
        const matches = await theatreClient.search(query);
        if (currentRequest !== requestId) return;
        results.innerHTML = matches.length ? matches.map((place, index) => `<button type="button" class="search-result theatre-result" data-theatre-index="${index}"><span><strong>${place.name || place.display_name.split(",")[0]}</strong><small>${place.display_name}</small></span></button>`).join("") : `<p class="search-status">No theatres found.</p>`;
        results.querySelectorAll("[data-theatre-index]").forEach((button) => button.addEventListener("click", () => {
          const place = matches[Number(button.dataset.theatreIndex)];
          input.value = place.display_name;
          results.innerHTML = `<p class="search-status is-selected">Selected ${input.value}</p>`;
        }));
      } catch {
        if (currentRequest !== requestId) return;
        results.innerHTML = `<p class="search-status">Theatre search is unavailable. You can enter the name manually.</p>`;
      }
    }, 500);
  });
}

function bindTitleSearch(form, tmdbClient) {
  const input = form.querySelector("[data-title-search]");
  const results = form.querySelector("[data-title-results]");
  if (!tmdbClient) return;
  let timer;
  let requestId = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const currentRequest = ++requestId;
    const query = input.value.trim();
    if (query.length < 2) {
      results.innerHTML = "";
      return;
    }
    results.innerHTML = `<p class="search-status">Searching TMDB...</p>`;
    timer = setTimeout(async () => {
      try {
        const matches = await tmdbClient.search(query);
        if (currentRequest !== requestId) return;
        results.innerHTML = matches.length ? matches.slice(0, 6).map((item, index) => `<button type="button" class="search-result" data-result-index="${index}"><img src="${imageUrl(item.poster_path, "w92")}" alt="" /><span><strong>${item.title || item.name}</strong><small>${(item.release_date || item.first_air_date || "").slice(0, 4)} / ${item.media_type === "tv" ? "Series" : "Movie"}</small></span></button>`).join("") : `<p class="search-status">No titles found.</p>`;
        results.querySelectorAll("[data-result-index]").forEach((button) => button.addEventListener("click", async () => {
          const details = await tmdbClient.details(matches[Number(button.dataset.resultIndex)]);
          form.dataset.metadata = JSON.stringify(details);
          input.value = details.title;
          form.querySelector("[data-poster]").value = details.poster || "";
          results.innerHTML = `<p class="search-status is-selected">Selected ${details.title}</p><p class="metadata-preview">${details.year || ""} ${details.genres?.length ? `• ${details.genres.join(" / ")}` : ""} ${details.runtime ? `• ${details.runtime} min` : ""}</p>`;
        }));
      } catch {
        if (currentRequest !== requestId) return;
        results.innerHTML = `<p class="search-status">TMDB search is unavailable. You can still enter the title manually.</p>`;
      }
    }, 300);
  });
}
