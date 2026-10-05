import { imageUrl } from "../api/tmdb.js";
import { escapeAttr, escapeHtml } from "../utils/escape.js";

export function movieForm() {
  return `<details class="add-movie-panel"><summary class="button button-primary">Add a movie <span>+</span></summary><form class="movie-form" data-add-movie><div class="form-heading"><p class="eyebrow">NEW ENTRY</p><h2>Log what you are watching</h2><p class="form-hint">Search TMDB by title to fill in the film details, then add your viewing information.</p></div><div class="form-grid"><label class="form-wide">Title or series<input name="title" data-title-search required autocomplete="off" placeholder="Start typing a title..." /><div class="search-results" data-title-results></div></label><label>Status<select name="status"><option value="watching">Watching now</option><option value="watched">Watched</option><option value="wishlist">Want to watch</option><option value="upcoming">Upcoming</option></select></label><label>Where are you watching?<select name="watchingMode" data-watching-mode><option value="ott">OTT / streaming</option><option value="theatre">Theatre</option></select></label><label data-ott-field>Region<select name="watchRegion" data-watch-region><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option></select></label><label data-ott-field>OTT platform<input name="ottPlatform" data-ott-platform placeholder="Select a provider after choosing a title" /><div class="search-results" data-ott-results></div></label><input name="ottAvailability" data-ott-availability type="hidden" /><label data-theatre-field hidden>Theatre name<input name="theatreName" data-theatre-search autocomplete="off" placeholder="Search a theatre..." /><div class="search-results" data-theatre-results></div></label><label>Your rating<input name="rating" type="number" min="1" max="10" step="1" placeholder="1–10" /></label><label>Watched date<input name="watchedDate" type="date" /></label><input name="poster" data-poster type="hidden" /><label class="form-wide">Notes<textarea name="notes" rows="3" placeholder="A quick note for future you..."></textarea></label><label class="form-wide">Tags<input name="tags" placeholder="favourite, rewatch" /></label></div><div class="form-actions"><button class="button button-primary" type="submit">Save to vault <span>↗</span></button><button class="text-link" type="reset">Clear form</button></div></form></details>`;
}

export function movieEditForm(movie) {
  const watchedWith = (movie.watchedWith || []).map((username) => `<span class="watched-with-chip"><span class="watched-with-name">@${escapeHtml(username)}</span><button type="button" class="watched-with-remove" data-remove-watched-with="${escapeAttr(username)}" aria-label="Remove @${escapeAttr(username)}">×</button></span>`).join("");
  const peopleResultsId = `edit-watched-with-results-${escapeAttr(movie.tmdbId)}`;
  return `<details class="movie-edit"><summary class="button button-quiet">Edit viewing details</summary>
    <form class="movie-edit-form" data-edit-movie="${escapeAttr(movie.tmdbId)}">
      <label>Where did you watch?<select name="watchingMode"><option value="ott"${movie.watchingMode !== "theatre" ? " selected" : ""}>OTT / streaming</option><option value="theatre"${movie.watchingMode === "theatre" ? " selected" : ""}>Theatre</option></select></label>
      <label data-edit-ott${movie.watchingMode === "theatre" ? " hidden" : ""}>Streaming service<input name="ottPlatform" value="${escapeAttr(movie.ottPlatform || "")}" placeholder="e.g. Netflix" /></label>
      <label data-edit-theatre${movie.watchingMode !== "theatre" ? " hidden" : ""}>Theatre name<input name="theatreName" data-theatre-search autocomplete="off" value="${escapeAttr(movie.theatreName || "")}" placeholder="Theatre or venue" /><div class="search-results" data-theatre-results></div></label>
      ${movie.status === "watched" ? `<fieldset class="watched-with-field" data-watched-with><legend>Watched with</legend><div class="watched-with-selected" data-watched-with-selected>${watchedWith}</div><label class="watched-with-search-label">Add people<input type="search" data-watched-with-search autocomplete="off" placeholder="Search people..." role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${peopleResultsId}" /></label><div class="search-results watched-with-results" id="${peopleResultsId}" data-watched-with-results role="listbox" aria-label="People to tag"></div><p class="search-status watched-with-status" data-watched-with-status role="status">Type at least 2 characters.</p></fieldset>` : ""}
      <div class="movie-edit-actions"><button class="button button-primary" type="submit">Save details</button><p class="search-status" data-edit-status role="status"></p></div>
    </form>
  </details>`;
}

export function bindMovieEditForm(form, onSave, searchApprovedUsers, theatreClient) {
  const getWatchedWith = form.querySelector("[data-watched-with]") ? bindWatchedWithSearch(form, searchApprovedUsers, [...form.querySelectorAll("[data-remove-watched-with]")].map((button) => button.dataset.removeWatchedWith)) : () => [];
  const mode = form.elements.watchingMode;
  const ottField = form.querySelector("[data-edit-ott]");
  const theatreField = form.querySelector("[data-edit-theatre]");
  const updateLocationFields = () => {
    ottField.hidden = mode.value === "theatre";
    theatreField.hidden = mode.value !== "theatre";
  };
  mode.addEventListener("change", updateLocationFields);
  bindTheatreSearch(form, theatreClient);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    onSave({ watchingMode: values.watchingMode, ottPlatform: values.ottPlatform.trim(), theatreName: values.theatreName.trim(), ...(form.querySelector("[data-watched-with]") ? { watchedWith: getWatchedWith() } : {}) });
  });
}

export function bindMovieForm(root, onSubmit, tmdbClient, theatreClient, watchlists = [], searchApprovedUsers = async () => []) {
  const form = root.querySelector("[data-add-movie]");
  if (!form) return;
  const watchedDateInput = form.querySelector('[name="watchedDate"]');
  if (watchedDateInput && !watchedDateInput.value) {
    const today = new Date();
    watchedDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
  form.querySelector("[data-watch-region]")?.closest("label")?.remove();
  const status = form.querySelector('[name="status"]');
  status?.querySelector('option[value="watching"]')?.remove();
  const wishlistOption = status?.querySelector('option[value="wishlist"]');
  if (wishlistOption) wishlistOption.textContent = "Want to watch / Watchlist";
  const listOptions = watchlists.filter((list) => list.is_owner).map((list) => `<option value="${escapeAttr(list.id)}">${escapeHtml(list.name)}</option>`).join("");
  const statusLabel = status?.closest("label");
  statusLabel?.insertAdjacentHTML("beforebegin", `<label>Save to list<select name="listId" required>${listOptions}</select></label>`);
  statusLabel?.insertAdjacentHTML("afterend", `<fieldset class="watched-with-field" data-watched-with hidden><legend>Watched with</legend><div class="watched-with-selected" data-watched-with-selected></div><label class="watched-with-search-label">Add people<input type="search" data-watched-with-search autocomplete="off" placeholder="Search people..." role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="watched-with-results" /></label><div class="search-results watched-with-results" id="watched-with-results" data-watched-with-results role="listbox" aria-label="People to tag"></div><p class="search-status watched-with-status" data-watched-with-status role="status">Type at least 2 characters.</p></fieldset>`);
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
  const getWatchedWith = bindWatchedWithSearch(form, searchApprovedUsers);
  bindTitleSearch(form, tmdbClient);
  bindProviderSearch(form, tmdbClient);
  bindTheatreSearch(form, theatreClient);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const metadata = form.dataset.metadata ? JSON.parse(form.dataset.metadata) : {};
    const formData = new FormData(form);
    onSubmit({ ...Object.fromEntries(formData), watchedWith: getWatchedWith() }, metadata);
  });
}

function bindWatchedWithSearch(form, searchApprovedUsers, initialUsers = []) {
  const input = form.querySelector("[data-watched-with-search]");
  const selectedContainer = form.querySelector("[data-watched-with-selected]");
  const results = form.querySelector("[data-watched-with-results]");
  const status = form.querySelector("[data-watched-with-status]");
  const selected = new Set(initialUsers);
  let timer;
  let requestId = 0;

  const initials = (username) => username.split(/[._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || username.slice(0, 2).toUpperCase();
  const renderSelected = () => {
    selectedContainer.innerHTML = [...selected].map((username) => `<span class="watched-with-chip"><span class="watched-with-avatar" aria-hidden="true">${escapeHtml(initials(username))}</span><span class="watched-with-name">@${escapeHtml(username)}</span><button type="button" class="watched-with-remove" data-remove-watched-with="${escapeAttr(username)}" aria-label="Remove @${escapeAttr(username)}">×</button></span>`).join("");
  };
  renderSelected();

  const closeResults = () => {
    results.replaceChildren();
    input.setAttribute("aria-expanded", "false");
  };

  const selectUser = (username) => {
    selected.add(username);
    renderSelected();
    input.value = "";
    input.focus();
    requestId += 1;
    clearTimeout(timer);
    closeResults();
    status.textContent = "Type at least 2 characters to add another person.";
  };

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const currentRequest = ++requestId;
    const query = input.value.trim();
    closeResults();
    if (query.length < 2) {
      status.textContent = "Type at least 2 characters.";
      return;
    }
    status.textContent = "Searching approved users...";
    timer = setTimeout(async () => {
      try {
        const matches = await searchApprovedUsers(query);
        if (currentRequest !== requestId) return;
        const options = matches.filter((username) => !selected.has(username));
        results.innerHTML = options.map((username) => `<button type="button" role="option" aria-selected="false" class="search-result watched-with-result" data-watched-user="${escapeAttr(username)}"><span class="watched-with-avatar" aria-hidden="true">${escapeHtml(initials(username))}</span><span class="watched-with-user"><strong>@${escapeHtml(username)}</strong><small>Movie Vault member</small></span><span class="watched-with-add" aria-hidden="true">+</span></button>`).join("");
        input.setAttribute("aria-expanded", String(options.length > 0));
        status.textContent = options.length ? `${options.length} matching user${options.length === 1 ? "" : "s"}.` : "No matching approved users.";
      } catch {
        if (currentRequest !== requestId) return;
        status.textContent = "User search is unavailable. Try again.";
      }
    }, 250);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeResults();
    if (event.key === "ArrowDown") {
      const firstResult = results.querySelector("[data-watched-user]");
      if (firstResult) {
        event.preventDefault();
        firstResult.focus();
      }
    }
    if (event.key === "Enter") {
      const firstResult = results.querySelector("[data-watched-user]");
      if (firstResult) {
        event.preventDefault();
        selectUser(firstResult.dataset.watchedUser);
      }
    }
  });

  results.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      input.focus();
    }
  });

  results.addEventListener("click", (event) => {
    const option = event.target.closest("[data-watched-user]");
    if (option) selectUser(option.dataset.watchedUser);
  });

  selectedContainer.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-watched-with]");
    if (!remove) return;
    selected.delete(remove.dataset.removeWatchedWith);
    renderSelected();
    input.focus();
  });

  return () => [...selected];
}

function bindTheatreSearch(form, theatreClient) {
  const input = form.querySelector("[data-theatre-search]");
  const results = form.querySelector("[data-theatre-results]");
  if (!input || !theatreClient) return;
  const searchButton = document.createElement("button");
  searchButton.type = "button";
  searchButton.className = "button button-quiet theatre-name-search-button";
  searchButton.textContent = "Search by name";
  const nearbyButton = document.createElement("button");
  nearbyButton.type = "button";
  nearbyButton.className = "button button-quiet nearby-theatre-button";
  nearbyButton.textContent = "Find nearby theatres";
  input.setAttribute("aria-label", "Theatre name");
  input.insertAdjacentElement("afterend", searchButton);
  searchButton.insertAdjacentElement("afterend", nearbyButton);
  let requestId = 0;
  let matches = [];
  const renderMatches = (places) => {
    matches = places;
    results.innerHTML = matches.length ? `${matches.map((place, index) => `<button type="button" class="search-result theatre-result" data-theatre-index="${index}"><span><strong>${escapeHtml(place.name || place.display_name.split(",")[0])}</strong><small>${escapeHtml(place.display_name)}${Number.isFinite(place.distance) ? ` / ${place.distance.toFixed(1)} km` : ""}</small></span></button>`).join("")}<p class="search-status theatre-attribution">Venue data: © OpenStreetMap contributors.</p>` : `<p class="search-status">No theatres found.</p>`;
  };
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theatre-index]");
    if (!button) return;
    const place = matches[Number(button.dataset.theatreIndex)];
    if (!place) return;
    input.value = place.display_name;
    results.innerHTML = `<p class="search-status is-selected">Selected ${escapeHtml(input.value)}</p>`;
  });
  const searchByName = async () => {
    const query = input.value.trim();
    if (query.length < 3) {
      results.innerHTML = `<p class="search-status">Enter at least 3 characters to search.</p>`;
      return;
    }
    const currentRequest = ++requestId;
    searchButton.disabled = true;
    results.innerHTML = `<p class="search-status">Searching theatres...</p>`;
    try {
      const places = await theatreClient.search(query);
      if (currentRequest === requestId) renderMatches(places);
    } catch {
      if (currentRequest === requestId) results.innerHTML = `<p class="search-status">Theatre search is unavailable. You can enter the name manually.</p>`;
    } finally {
      searchButton.disabled = false;
    }
  };
  searchButton.addEventListener("click", searchByName);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    searchByName();
  });
  nearbyButton.addEventListener("click", () => {
    const geolocation = globalThis.navigator?.geolocation;
    if (!geolocation) {
      results.innerHTML = `<p class="search-status">Location is unavailable. Search by theatre name instead.</p>`;
      return;
    }
    const currentRequest = ++requestId;
    nearbyButton.disabled = true;
    results.innerHTML = `<p class="search-status">Getting your location...</p>`;
    geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const places = await theatreClient.nearby(coords.latitude, coords.longitude);
        if (currentRequest === requestId) renderMatches(places);
      } catch {
        if (currentRequest === requestId) results.innerHTML = `<p class="search-status">Nearby search is unavailable. Search by theatre name instead.</p>`;
      } finally {
        nearbyButton.disabled = false;
      }
    }, (error) => {
      if (currentRequest === requestId) {
        const message = error.code === 1 ? "Location access was denied. Search by theatre name instead." : "Could not get your location. Search by theatre name instead.";
        results.innerHTML = `<p class="search-status">${message}</p>`;
      }
      nearbyButton.disabled = false;
    }, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 });
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
        results.innerHTML = matches.length ? matches.slice(0, 6).map((item, index) => `<button type="button" class="search-result" data-result-index="${index}">${item.poster_path ? `<img src="${escapeAttr(imageUrl(item.poster_path, "w92"))}" alt="" />` : `<span class="search-result-placeholder" aria-hidden="true">MV</span>`}<span><strong>${escapeHtml(item.title || item.name)}</strong><small>${item.media_type === "wikidata" ? `Wikidata / ${escapeHtml(item.description || "Open movie data")}` : `${escapeHtml((item.release_date || item.first_air_date || "").slice(0, 4))} / ${item.media_type === "tv" ? "Series" : "Movie"}`}</small></span></button>`).join("") : `<p class="search-status">No titles found.</p>`;
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
        results.innerHTML = `<p class="search-status">Movie metadata search is unavailable. You can still enter the title manually.</p>`;
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
