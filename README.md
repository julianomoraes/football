# Youth Football League Schedule

A simple static site that displays a youth football league's game schedule,
pulled live from a Google Sheet — no backend, no build step.

## Live site

https://julianomoraes.github.io/football/

## How it works

The site fetches the sheet's public CSV export
(`.../export?format=csv`), parses it client-side, and renders a
searchable, per-team schedule (`app.js`). Whenever the sheet is updated,
reloading the page shows the latest schedule — no redeploy needed.

## Expected sheet layout

This isn't a simple flat "one row per game" sheet — it mirrors a real
league schedule grid:

- **Row 1**: week labels (e.g. `Week 3 (9/12,13)`) spanning 4 columns each.
- **Row 2 of each club section**: the club name in column A, followed by
  repeating `Loc | Opponent | Day | Time` sub-headers.
- **Following rows**: one row per team. Column A holds the venue (only
  filled in on the first row for that venue — it applies to every team row
  below it until the next venue/club row). Column B is the division/age
  group (e.g. `10U`, `Flex`). Column C is the team code (e.g. `ALV Navy`).
  From column D onward, each week repeats 4 columns: `Loc` (`vs`/`at`,
  optionally plus a venue code), `Opponent`, `Day`, `Time`.
- A `Team Counts` row (and everything after it) marks the summary footer
  and is ignored by the parser.

The parser in `app.js` (see `parseLeagueGrid`) walks this structure and
flattens it into one record per game, also building a team → home-venue
lookup so away games can show the opponent's venue.

If your sheet's layout differs, adjust `parseLeagueGrid` in `app.js`
accordingly.

## URLs

Picking a team updates the URL to `/football/<TEAM_CODE>/<DIVISION>` (e.g.
`/football/CCW/12U`, `/football/ALV-Navy/Flex` — spaces become dashes). A
search term rides along as `?q=`. Refreshing, bookmarking, or sharing that
URL restores the same view.

GitHub Pages only serves static files, so there's no real server-side route
for those pretty URLs — a direct hit or hard refresh on one would normally
404. `404.html` catches that and redirects to `index.html` with the
intended path stashed in `?redirect=`, which `app.js` restores via
`history.replaceState` before rendering (`normalizeRedirectedUrl` /
`restoreFromUrl`). If you rename the repo/site, update `BASE_PATH` in
`app.js` and the path prefix in `404.html` to match.

## Setup

1. Share the sheet: **File → Share → General access → Anyone with the
   link (Viewer)**.
2. Grab the Sheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
3. Edit [`config.js`](./config.js) and set `SHEET_ID` (and `GID` if you
   need a specific tab other than the default).
4. Open `index.html` in a browser, or deploy via GitHub Pages (Settings →
   Pages → Deploy from branch `main`, folder `/`).

## Local development

Just open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
