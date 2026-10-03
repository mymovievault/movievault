import { imageUrl } from "../api/tmdb.js";
import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function movieForm() {
  return `<details class="add-movie-panel"><summary class="button button-primary">Add a movie <span>+</span></summary><form class="movie-form" data-add-movie><div class="form-heading"><p class="eyebrow">NEW ENTRY</p><h2>Log what you are watching</h2><p class="form-hint">Search TMDB by title to fill in the film details, then add your viewing information.</p></div><div class="form-grid"><label class="form-wide">Title or series<input name="title" data-title-search required autocomplete="off" placeholder="Start typing a title..." /><div class="search-results" data-title-results></div></label><label>Status<select name="status"><option value="watching">Watching now</option><option value="watched">Watched</option><option value="wishlist">Want to watch</option><option value="upcoming">Upcoming</option></select></label><label>Where are you watching?<select name="watchingMode" data-watching-mode><option value="ott">OTT / streaming</option><option value="theatre">Theatre</option></select></label><label data-ott-field>Region<select name="watchRegion" data-watch-region><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option></select></label><label data-ott-field>OTT platform<input name="ottPlatform" data-ott-platform placeholder="Select a provider after choosing a title" /><div class="search-results" data-ott-results></div></label><input name="ottAvailability" data-ott-availability type="hidden" /><label data-theatre-field hidden>Theatre name<input name="theatreName" data-theatre-search autocomplete="off" placeholder="Search a theatre..." /><div class="search-results" data-theatre-results></div></label><label>Your rating<input name="rating" type="number" min="1" max="10" step="1" placeholder="1–10" /></label><label>Watched date<input name="watchedDate" type="date" /></label><input name="poster" data-poster type="hidden" /><label class="form-wide">Notes<textarea name="notes" rows="3" placeholder="A quick note for future you..."></textarea></label><label class="form-wide">Tags<input name="tags" placeholder="favourite, rewatch" /></label></div><div class="form-actions"><button class="button button-primary" type="submit">Save to vault <span>↗</span></button><button class="text-link" type="reset">Clear form</button></div></form></details>`;
}

export function bindMovieForm(root, onSubmit, tmdbClient, theatreClient, watchlists = [], approvedUsers = []) {
  const form = root.querySelector("[data-add-movie]");
  if (!form) return;
  form.querySelector("[data-watch-region]")?.closest("label")?.remove();
  const status = form.querySelector('[name="status"]');
  status?.querySelector('option[value="watching"]')?.remove();
  const wishlistOption = status?.querySelector('option[value="wishlist"]');
  if (wishlistOption) wishlistOption.textContent = "Want to watch / Watchlist";
  const listOptions = watchlists.filter((list) => list.is_owner).map((list) => `<option value="${escapeAttr(list.id)}">${escapeHtml(list.name)}</option>`).join("");
  form.querySelector('[name="status"]')?.insertAdjacentHTML("beforebegin", `<label>Save to list<select name="listId" required>${listOptions}</select></label>`);
  const collaborators = approvedUsers.map((username) => `<label class="watched-with-option"><input type="checkbox" name="watchedWith" value="${escapeAttr(username)}" /><span>${escapeHtml(username)}</span></label>`).join("");
  form.querySelector('[name="status"]')?.insertAdjacentHTML("afterend", `<fieldset class="watched-with-field" data-watched-with hidden><legend>Watched with</legend><div class="watched-with-options">${collaborators || `<span class="form-hint">No other approved users yet.</span>`}</div></fieldset>`);
  const mode = form.querySelector("[data-watching-mode]");
  const watchedWith = form.querySelector("[data-watched-with]");
  const ottField = form.querySelector("[data-ott-field]");
  const theatreField = form.querySelector("[data-theatre-field]");
  const updateLocationFields = () => {
    const isTheatre = mode.value === "theatre";
    ottField.hidden = isTheatre;
    theatreField.hidden = !isTheatre;
  };
  mode.addEventListener("change", updateLocationFields);
  const updateWatchedWith = () => { watchedWith.hidden = status.value !== "watched"; };
  status.addEventListener("change", updateWatchedWith);
  updateWatchedWith();
  bindTitleSearch(form, tmdbClient);
  bindProviderSearch(form, tmdbClient);
  bindTheatreSearch(form, theatreClient);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const metadata = form.dataset.metadata ? JSON.parse(form.dataset.metadata) : {};
    const formData = new FormData(form);
    onSubmit({ ...Object.fromEntries(formData), watchedWith: formData.getAll("watchedWith") }, metadata);
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
        results.innerHTML = matches.length ? matches.map((place, index) => `<button type="button" class="search-result theatre-result" data-theatre-index="${index}"><span><strong>${escapeHtml(place.name || place.display_name.split(",")[0])}</strong><small>${escapeHtml(place.display_name)}</small></span></button>`).join("") : `<p class="search-status">No theatres found.</p>`;
        results.querySelectorAll("[data-theatre-index]").forEach((button) => button.addEventListener("click", () => {
          const place = matches[Number(button.dataset.theatreIndex)];
          input.value = place.display_name;
          results.innerHTML = `<p class="search-status is-selected">Selected ${escapeHtml(input.value)}</p>`;
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
        results.innerHTML = matches.length ? matches.slice(0, 6).map((item, index) => `<button type="button" class="search-result" data-result-index="${index}"><img src="${escapeAttr(imageUrl(item.poster_path, "w92"))}" alt="" /><span><strong>${escapeHtml(item.title || item.name)}</strong><small>${escapeHtml((item.release_date || item.first_air_date || "").slice(0, 4))} / ${item.media_type === "tv" ? "Series" : "Movie"}</small></span></button>`).join("") : `<p class="search-status">No titles found.</p>`;
        results.querySelectorAll("[data-result-index]").forEach((button) => button.addEventListener("click", async () => {
          const details = await tmdbClient.details(matches[Number(button.dataset.resultIndex)]);
          form.dataset.metadata = JSON.stringify(details);
          input.value = details.title;
          form.querySelector("[data-poster]").value = details.poster || "";
          results.innerHTML = `<p class="search-status is-selected">Selected ${escapeHtml(details.title)}</p><p class="metadata-preview">${escapeHtml(details.year || "")} ${details.genres?.length ? `• ${escapeHtml(details.genres.join(" / "))}` : ""} ${details.runtime ? `• ${escapeHtml(details.runtime)} min` : ""}</p>`;
          loadProviders(form, tmdbClient, details);
        }));
      } catch {
        if (currentRequest !== requestId) return;
        results.innerHTML = `<p class="search-status">TMDB search is unavailable. You can still enter the title manually.</p>`;
      }
    }, 300);
  });
}

function bindProviderSearch(form, tmdbClient) {
  if (!tmdbClient) return;
}

async function loadProviders(form, tmdbClient, metadata) {
  const results = form.querySelector("[data-ott-results]");
  const region = "IN";
  results.innerHTML = `<p class="search-status">Checking OTT availability...</p>`;
  try {
    const providers = await tmdbClient.providers(metadata, region);
    results.innerHTML = providers.length ? providers.map((provider, index) => `<button type="button" class="search-result provider-result" data-provider-index="${index}"><span><strong>${escapeHtml(provider.provider_name)}</strong><small>${escapeHtml(provider.availability)} / India</small></span></button>`).join("") : `<p class="search-status">No India provider data found.</p>`;
    results.querySelectorAll("[data-provider-index]").forEach((button) => button.addEventListener("click", () => {
      const provider = providers[Number(button.dataset.providerIndex)];
      form.querySelector("[data-ott-platform]").value = provider.provider_name;
      form.querySelector("[data-ott-availability]").value = provider.availability;
      results.innerHTML = `<p class="search-status is-selected">Selected ${escapeHtml(provider.provider_name)} / ${escapeHtml(provider.availability)}</p>`;
    }));
  } catch {
    results.innerHTML = `<p class="search-status">OTT availability is unavailable. Enter the platform manually.</p>`;
  }
}
