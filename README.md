# Youth Football League Schedule

A simple static site that displays a youth football league's game schedule,
pulled live from a Google Sheet — no backend, no build step.

## Setup

1. Create a Google Sheet with a tab containing these column headers in row 1:

   | Date | Time | Home Team | Away Team | Location | Division |
   |------|------|-----------|-----------|----------|----------|

   Example row: `2026-09-12 | 6:00 PM | Sharks | Eagles | Field 3 | U10`

2. Share the sheet: **File → Share → General access → Anyone with the link
   (Viewer)**.

3. Grab the Sheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

4. Grab the tab's `gid` (visible in the URL when that tab is selected, e.g.
   `...edit#gid=123456`).

5. Edit [`config.js`](./config.js) and set `SHEET_ID` and `GID`.

6. Open `index.html` in a browser, or deploy via GitHub Pages (Settings →
   Pages → Deploy from branch `main`, folder `/`).

## How it works

The site fetches the sheet's public CSV export
(`.../export?format=csv&gid=...`), parses it client-side, and renders it into
a searchable, filterable table (`app.js`). Whenever the sheet is updated,
reloading the page shows the latest schedule — no redeploy needed.

## Local development

Just open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
