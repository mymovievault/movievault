# Movie Vault

A framework-free personal film archive designed for GitHub Pages.

## Data model

The app reads `data/movies.json` as its canonical flat file. Each record keeps TMDB-style metadata beside personal information such as status, rating, date, notes, and tags. The repository interface in `js/data/library.js` keeps the UI independent from the storage mechanism, so the flat file can later become GitHub JSON or a database.

The add form can search TMDB for movies and series. To enable it on GitHub Pages, add a repository Actions secret named `TMDB_READ_TOKEN` under **Settings > Secrets and variables > Actions**, containing your TMDB API Read Access Token. The Pages workflow injects it into `js/config.js` during deployment. This token is visible in a GitHub Pages site, so use a restricted read-only token and never use a server credential with write permissions. Without a token, manual entry remains available.

GitHub Pages is read-only from the browser. The **Export JSON** action downloads the current in-memory records; replace `data/movies.json` with that file and commit it to persist changes.

## Run locally

Because browsers block `fetch()` from `file://` pages, serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Push the repository to GitHub, enable GitHub Actions as the Pages source, and set the repository Pages source to **GitHub Actions**. `.github/workflows/pages.yml` deploys the root folder on pushes to `main`.
