// Configuration for the schedule site.
//
// The sheet must be shared as "Anyone with the link" (Viewer) in Google
// Sheets: Share > General access > Anyone with the link.
//
// SHEET_ID comes from the sheet's URL:
//   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
//
// GID selects a specific tab (visible in the URL as "#gid=..." once that
// tab is selected). Leave empty to use the default/first tab.
//
// This site is built for a specific league-schedule layout: one row per
// team, with repeating week blocks of four columns (Loc, Opponent, Day,
// Time) grouped under club/venue header rows. See app.js for the parser.

const CONFIG = {
  SHEET_ID: "1FHpwECXTL9IcDBE6qKCuv4FUvPFMWRD9Nr5l4N664tE",
  GID: "",
};

CONFIG.CSV_URL = CONFIG.GID
  ? `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&gid=${CONFIG.GID}`
  : `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv`;
