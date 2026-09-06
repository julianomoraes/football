// Configuration for the schedule site.
//
// 1. In Google Sheets: File > Share > "Anyone with the link" (Viewer).
// 2. Get your Sheet ID from the URL:
//    https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
// 3. Find the GID of the specific tab/sheet you want (visible in the URL
//    after "gid=" when that tab is selected).
// 4. Paste both values below.
//
// Expected columns in the sheet (first row = headers, exact names matter):
//   Date | Time | Home Team | Away Team | Location | Division
//
// Example row:
//   2026-09-12 | 6:00 PM | Sharks | Eagles | Field 3 | U10

const CONFIG = {
  SHEET_ID: "YOUR_SHEET_ID_HERE",
  GID: "0",
};

// Built from the values above — the CSV export endpoint requires no API key
// as long as the sheet is shared as "Anyone with the link can view".
CONFIG.CSV_URL = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&gid=${CONFIG.GID}`;
