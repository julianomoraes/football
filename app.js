// Fetches schedule data from the public Google Sheets CSV export and
// renders it into the page. No build step, no API key.

const scheduleBody = document.getElementById("schedule-body");
const statusEl = document.getElementById("status");
const divisionFilter = document.getElementById("division-filter");
const searchInput = document.getElementById("search-input");

let allGames = [];

init();

async function init() {
  if (CONFIG.SHEET_ID === "YOUR_SHEET_ID_HERE") {
    showStatus(
      "No Google Sheet configured yet. Edit config.js and set SHEET_ID / GID.",
      "warning"
    );
    return;
  }

  try {
    showStatus("Loading schedule…", "info");
    const csvText = await fetchCsv(CONFIG.CSV_URL);
    allGames = parseCsv(csvText);

    if (allGames.length === 0) {
      showStatus("The sheet loaded but no rows were found.", "warning");
      return;
    }

    populateDivisionFilter(allGames);
    render();
    hideStatus();
  } catch (err) {
    console.error(err);
    showStatus(
      "Couldn't load the schedule. Make sure the sheet is shared as " +
        "'Anyone with the link can view', and that SHEET_ID / GID in " +
        "config.js are correct.",
      "error"
    );
  }
}

async function fetchCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// Minimal CSV parser that handles quoted fields with commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

function populateDivisionFilter(games) {
  const divisions = [
    ...new Set(games.map((g) => g["Division"]).filter(Boolean)),
  ].sort();

  divisions.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    divisionFilter.appendChild(opt);
  });
}

function render() {
  const division = divisionFilter.value;
  const query = searchInput.value.trim().toLowerCase();

  const filtered = allGames.filter((g) => {
    const matchesDivision = !division || g["Division"] === division;
    const haystack = `${g["Home Team"]} ${g["Away Team"]} ${g["Location"]}`
      .toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    return matchesDivision && matchesSearch;
  });

  scheduleBody.innerHTML = "";

  if (filtered.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="empty">No games match.</td>`;
    scheduleBody.appendChild(tr);
    return;
  }

  filtered
    .sort((a, b) => (a["Date"] + a["Time"]).localeCompare(b["Date"] + b["Time"]))
    .forEach((g) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(g["Date"])}</td>
        <td>${escapeHtml(g["Time"])}</td>
        <td>${escapeHtml(g["Home Team"])}</td>
        <td>${escapeHtml(g["Away Team"])}</td>
        <td>${escapeHtml(g["Location"])}</td>
        <td>${escapeHtml(g["Division"])}</td>
      `;
      scheduleBody.appendChild(tr);
    });
}

function escapeHtml(str) {
  if (str == null) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = false;
}

function hideStatus() {
  statusEl.hidden = true;
}

divisionFilter.addEventListener("change", render);
searchInput.addEventListener("input", render);
