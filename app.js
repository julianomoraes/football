// Fetches the league schedule from the public Google Sheets CSV export and
// renders it into the page. No build step, no API key.
//
// SHEET LAYOUT this parser expects (see README for details):
//
//   Row 0:  ...,"Week 0 (8/23)",,,, "Week 1 (8/29,30)",,,, ...
//   Row 1:  "Alvarez",,,"Loc","Opponent","Day","Time","Loc",...   <- club header
//   Row 2:  "Alvarez HS",  "Flex", "ALV Navy", vs, "LGC White", Sun, 8:00am, ...
//   Row 3:  "",            "Flex", "ALV Gold", vs, "LGC Orange", Sun, 8:00am, ...
//   ...
//   "Team Counts" row and everything after it is a summary footer — ignored.
//
// Column A carries either a club name (immediately followed by a "Loc"
// sub-header row) or a venue name (its own row, applying to the team rows
// that follow until the next venue/club row). Column B is division/age
// group, column C is the team code. From column D onward, four columns
// repeat per week: Loc ("vs"/"at" [+ optional venue code]), Opponent, Day,
// Time.

// Week labels list every date the week could fall on (e.g. "Week 4
// (9/19,20)" — Sat the 19th or Sun the 20th, depending on the team's
// division). Since each game row also records its actual weekday, we can
// resolve that down to one specific calendar date. Update this if the site
// is ever reused for a different season.
const SEASON_YEAR = 2026;
const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const statusEl = document.getElementById("status");
const clubFilter = document.getElementById("club-filter");
const teamFilter = document.getElementById("team-filter");
const searchInput = document.getElementById("search-input");
const scheduleBody = document.getElementById("schedule-body");
const teamHeading = document.getElementById("team-heading");

let allGames = [];
let teamsByClub = new Map(); // club -> [{team, division, venue}]
let venueByTeam = new Map(); // team code -> home venue
let clubByTeamCode = new Map(); // team code (e.g. "ALV Navy") -> club full name (e.g. "Alvarez")

init();

async function init() {
  if (!CONFIG.SHEET_ID || CONFIG.SHEET_ID === "YOUR_SHEET_ID_HERE") {
    showStatus(
      "No Google Sheet configured yet. Edit config.js and set SHEET_ID.",
      "warning"
    );
    return;
  }

  try {
    showStatus("Loading schedule…", "info");
    const csvText = await fetchCsv(CONFIG.CSV_URL);
    const rows = parseCsv(csvText);
    const parsed = parseLeagueGrid(rows);
    allGames = parsed.games;
    teamsByClub = parsed.teamsByClub;
    venueByTeam = parsed.venueByTeam;
    clubByTeamCode = parsed.clubByTeamCode;

    if (allGames.length === 0) {
      showStatus("The sheet loaded but no games were found.", "warning");
      return;
    }

    populateClubFilter();
    restoreFromUrl();
    render();
    hideStatus();
  } catch (err) {
    console.error(err);
    showStatus(
      "Couldn't load the schedule. Make sure the sheet is shared as " +
        "'Anyone with the link can view', and that SHEET_ID in config.js " +
        "is correct.",
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
  return rows;
}

function cell(row, i) {
  return (row[i] ?? "").trim();
}

// Turns the raw grid rows into a flat list of {club, venue, division, team,
// week, weekLabel, homeAway, opponent, day, time, isBye} game records.
function parseLeagueGrid(rows) {
  if (rows.length < 2) {
    return { games: [], teamsByClub: new Map(), venueByTeam: new Map(), clubByTeamCode: new Map() };
  }

  // Count week blocks using the first club header row (has literal "Loc"
  // repeated every 4 columns starting at column D).
  const headerRow = rows[1] || [];
  let weekCount = 0;
  while (cell(headerRow, 3 + weekCount * 4) === "Loc") weekCount++;

  const weekLabels = [];
  for (let w = 0; w < weekCount; w++) {
    weekLabels.push(cell(rows[0], 3 + w * 4) || `Week ${w + 1}`);
  }

  const games = [];
  const teamsByClub = new Map();
  const venueByTeam = new Map();
  const clubByTeamCode = new Map();

  let currentClub = "";
  let currentVenue = "";

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const col0 = cell(row, 0);
    const col1 = cell(row, 1);
    const col2 = cell(row, 2);
    const col3 = cell(row, 3);

    if (col0 === "Team Counts") break; // summary footer — stop parsing

    if (col0 !== "") {
      if (col3 === "Loc") {
        // Club header row (e.g. "Alvarez", followed by "Loc/Opponent/Day/Time...")
        currentClub = col0;
        continue;
      }
      // A dedicated venue row, or a venue row that also carries the first
      // team's data.
      currentVenue = col0;
      if (col1 === "" && col2 === "") continue;
    }

    const division = col1;
    const team = col2;
    if (!team) continue; // blank separator / stray note row

    // A team code alone isn't unique — e.g. Coyote Creek uses "CCW" for its
    // 8U through 13U squads, distinguished only by division. Use team+division
    // as the real identity for dropdown/filtering purposes.
    const teamKey = `${team}::${division}`;

    if (!teamsByClub.has(currentClub)) teamsByClub.set(currentClub, []);
    teamsByClub.get(currentClub).push({ teamKey, team, division, venue: currentVenue });
    if (!venueByTeam.has(team)) venueByTeam.set(team, currentVenue);
    if (currentClub && !clubByTeamCode.has(team)) clubByTeamCode.set(team, currentClub);

    for (let w = 0; w < weekCount; w++) {
      const base = 3 + w * 4;
      const locRaw = cell(row, base);
      const opponent = cell(row, base + 1);
      const day = cell(row, base + 2);
      const time = cell(row, base + 3);
      if (!locRaw && !opponent && !day && !time) continue;

      let homeAway = "other";
      if (/^vs\b/i.test(locRaw)) homeAway = "home";
      else if (/^at\b/i.test(locRaw)) homeAway = "away";

      games.push({
        club: currentClub,
        venue: currentVenue,
        division,
        team,
        teamKey,
        week: w,
        weekLabel: weekLabels[w],
        locRaw,
        homeAway,
        opponent,
        day,
        time,
        isBye: /^bye$/i.test(opponent),
      });
    }
  }

  return { games, teamsByClub, venueByTeam, clubByTeamCode };
}

// Turns a raw opponent code (e.g. "ALV Navy", "CCW Red", or a "/"-separated
// pair of possible opponents like "GYB/CSW") into a human-readable name
// using the club names collected while parsing (e.g. "Alvarez Navy").
// Codes we don't recognize (external teams, "BYE", "3PH -..." notes) are
// left as-is.
function formatOpponentCode(code) {
  const trimmed = code.trim();
  if (!trimmed) return trimmed;

  const club = clubByTeamCode.get(trimmed);
  if (!club) return trimmed;

  const spaceIdx = trimmed.indexOf(" ");
  const qualifier = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
  return qualifier ? `${club} ${qualifier}` : club;
}

function formatOpponent(opponent) {
  if (!opponent) return opponent;
  if (/^bye$/i.test(opponent)) return "BYE";
  return opponent.split("/").map(formatOpponentCode).join(" / ");
}

// Pulls {month, days: [...]} out of a week label like "Week 4 (9/19,20)".
// Handles the occasional sheet typo where a day got an extra digit (e.g.
// "10/10,111" meaning the 11th) by subtracting 100 from anything > 31.
function parseWeekLabel(label) {
  const m = label.match(/\((\d{1,2})\/([\d,]+)\)/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const days = m[2]
    .split(",")
    .map((s) => {
      let d = parseInt(s, 10);
      if (d > 31) d -= 100;
      return d;
    })
    .filter((d) => d >= 1 && d <= 31);
  return days.length ? { month, days } : null;
}

function weekdayOf(month, day) {
  return WEEKDAY_ABBR[new Date(SEASON_YEAR, month - 1, day).getDay()];
}

function formatDate(month, day) {
  return `${weekdayOf(month, day)}, ${MONTH_ABBR[month - 1]} ${day}`;
}

// A week label carries every date the week could land on; the game's own
// Day field ("Sun"/"Sat") tells us which one actually applies. Returns
// {month, day} in calendar terms, or null if the label couldn't be parsed.
function resolveGameDay(weekLabel, dayText) {
  const parsed = parseWeekLabel(weekLabel);
  if (!parsed) return null;

  const dayPrefix = (dayText || "").trim().slice(0, 3).toLowerCase();
  for (const d of parsed.days) {
    if (dayPrefix && weekdayOf(parsed.month, d).toLowerCase().startsWith(dayPrefix)) {
      return { month: parsed.month, day: d };
    }
  }

  // Day text didn't match any candidate (typo, TBD, etc.) — best guess.
  return { month: parsed.month, day: parsed.days[0] };
}

function resolveGameDate(weekLabel, dayText) {
  const resolved = resolveGameDay(weekLabel, dayText);
  return resolved ? formatDate(resolved.month, resolved.day) : weekLabel;
}

// Parses "8:00am" / "10:45am" style times into {hour, minute} (24h). Returns
// null for anything unparseable (blank, "TBD", etc.).
function parseTime(timeText) {
  const m = (timeText || "").trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const ampm = m[3].toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

// Best-effort kickoff Date for a game, used only to compare against "now" —
// unparseable times default to end-of-day so the game isn't marked past
// while its date is still today.
function gameDateTime(game) {
  const resolved = resolveGameDay(game.weekLabel, game.day);
  if (!resolved) return null;
  const time = parseTime(game.time);
  return new Date(
    SEASON_YEAR,
    resolved.month - 1,
    resolved.day,
    time ? time.hour : 23,
    time ? time.minute : 59
  );
}

function populateClubFilter() {
  const clubs = [...teamsByClub.keys()].filter(Boolean).sort();
  clubs.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    clubFilter.appendChild(opt);
  });
}

function populateTeamFilter() {
  teamFilter.innerHTML = '<option value="">Select a team…</option>';

  const club = clubFilter.value;
  const seen = new Set();
  const entries = [];

  teamsByClub.forEach((teams, c) => {
    if (club && c !== club) return;
    teams.forEach((t) => {
      if (seen.has(t.teamKey)) return;
      seen.add(t.teamKey);
      entries.push(t);
    });
  });

  entries
    .sort((a, b) => a.team.localeCompare(b.team) || a.division.localeCompare(b.division))
    .forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.teamKey;
      opt.textContent = t.division ? `${t.team} (${t.division})` : t.team;
      teamFilter.appendChild(opt);
    });
}

function resolveLocation(game) {
  if (game.isBye) return "—";
  if (game.homeAway === "home") return game.venue || "—";
  if (game.homeAway === "away") {
    const venue = venueByTeam.get(game.opponent);
    return venue || "Away";
  }
  return game.locRaw || "—";
}

// All venues in this league are Bay Area, CA schools/fields — appending the
// state disambiguates the Google Maps search without us having to hardcode
// (and risk getting wrong) each venue's exact street address.
function mapsUrl(venueName) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName}, CA`)}`;
}

function renderLocationCell(locationText) {
  const safeText = escapeHtml(locationText);
  if (!locationText || locationText === "—" || locationText === "Away") {
    return safeText;
  }
  return `<a href="${mapsUrl(locationText)}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
}

function render() {
  const team = teamFilter.value;
  const query = searchInput.value.trim().toLowerCase();

  scheduleBody.innerHTML = "";

  if (!team && !query) {
    teamHeading.textContent = "Select a team above to see its schedule, or search all games.";
    return;
  }

  let games;
  if (team) {
    games = allGames.filter((g) => g.teamKey === team);
    const label = games[0] ? `${games[0].team} (${games[0].division})` : team;
    teamHeading.textContent = `Schedule — ${label}`;
  } else {
    games = allGames.filter((g) => {
      const haystack = `${g.team} ${g.opponent} ${formatOpponent(g.opponent)} ${g.venue} ${g.club}`.toLowerCase();
      return haystack.includes(query);
    });
    teamHeading.textContent = `Search results for "${searchInput.value.trim()}"`;
  }

  if (query && team) {
    games = games.filter((g) => {
      const haystack = `${g.team} ${g.opponent} ${g.venue} ${g.club}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  if (games.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="empty">No games match.</td>`;
    scheduleBody.appendChild(tr);
    return;
  }

  games.sort((a, b) => a.week - b.week);

  const now = new Date();
  // Only meaningful for a single team's own timeline — mark the first game
  // that hasn't happened yet so it's easy to spot at a glance.
  const nextGameIndex = team
    ? games.findIndex((g) => {
        const dt = gameDateTime(g);
        return dt && dt >= now;
      })
    : -1;

  games.forEach((g, i) => {
    const tr = document.createElement("tr");
    const dt = gameDateTime(g);
    const isPast = dt && dt < now;
    if (isPast) tr.classList.add("past");
    if (i === nextGameIndex) tr.classList.add("next-game");

    const badge = g.isBye
      ? '<span class="badge bye">BYE</span>'
      : g.homeAway === "home"
      ? '<span class="badge home">Home</span>'
      : g.homeAway === "away"
      ? '<span class="badge away">Away</span>'
      : '<span class="badge other">—</span>';

    tr.innerHTML = `
      <td>${escapeHtml(resolveGameDate(g.weekLabel, g.day))}</td>
      <td>${escapeHtml(g.time)}</td>
      <td>${badge}</td>
      <td>${g.isBye ? "—" : escapeHtml(formatOpponent(g.opponent))}</td>
      <td>${renderLocationCell(resolveLocation(g))}</td>
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

// Reflects the current club/team/search selection into the URL (via
// replaceState, so it doesn't spam browser history) so a page refresh or a
// shared link lands back on the same view.
function syncUrl() {
  const params = new URLSearchParams();
  if (clubFilter.value) params.set("club", clubFilter.value);
  if (teamFilter.value) params.set("team", teamFilter.value);
  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());

  const qs = params.toString();
  const newUrl = qs ? `${location.pathname}?${qs}` : location.pathname;
  history.replaceState(null, "", newUrl);
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  const club = params.get("club") || "";
  const team = params.get("team") || "";
  const q = params.get("q") || "";

  if (club) clubFilter.value = club;
  populateTeamFilter(); // rebuild team options for the (possibly restored) club
  if (team) teamFilter.value = team;
  if (q) searchInput.value = q;
}

clubFilter.addEventListener("change", () => {
  populateTeamFilter();
  render();
  syncUrl();
});
teamFilter.addEventListener("change", () => {
  render();
  syncUrl();
});
searchInput.addEventListener("input", () => {
  render();
  syncUrl();
});
