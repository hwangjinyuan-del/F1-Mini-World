// F1 Live Timing · free historical classifications, standalone Scriptable.
const BUILD = "2026.11.25.2";
const fm = FileManager.local();
const now = new Date();
const tokens = String(args.widgetParameter || "").toLowerCase().split(/[\s,]+/);
const wide = config.widgetFamily === "extraLarge" || tokens.includes("wide");
const choices = {
  race: ["Race"], qualifying: ["Qualifying"], sprint: ["Sprint"],
  "sprint-qualifying": ["Sprint Qualifying", "Sprint Shootout"]
};
const selectedType = Object.keys(choices).find(key => tokens.includes(key)) || "latest";
const supported = ["Race", "Sprint", "Qualifying", "Sprint Qualifying", "Sprint Shootout"];
const accepted = choices[selectedType] || supported;
const cachePath = fm.joinPath(fm.documentsDirectory(), "f1-timing-v3-" + selectedType + ".json");
const widget = new ListWidget();
widget.backgroundColor = new Color("#17232f");
widget.setPadding(14, 16, 14, 16);
widget.url = URLScheme.forRunningScript();

function label(parent, value, size, bold = false, color = "#eef1f4") {
  const item = parent.addText(String(value));
  item.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  item.textColor = new Color(color);
  item.lineLimit = 1;
  item.minimumScaleFactor = 0.65;
  return item;
}

async function get(url) {
  // Stay below OpenF1's free request-per-second limit, including retries.
  await new Promise(resolve => Timer.schedule(450, false, resolve));
  const request = new Request(url);
  request.timeoutInterval = 8;
  const data = await request.loadJSON();
  if (request.response.statusCode !== 200) throw new Error("HTTP " + request.response.statusCode);
  return data;
}

function validRecord(record) {
  return !!record && Array.isArray(record.rows) && record.rows.length > 0 &&
    record.rows.every(row => typeof row.name === "string") &&
    Number.isFinite(Date.parse(record.end)) && Number.isFinite(record.updated);
}

function cachedRecord() {
  if (!fm.fileExists(cachePath)) return null;
  try {
    const record = JSON.parse(fm.readString(cachePath));
    return validRecord(record) ? record : null;
  } catch (error) { console.warn(String(error)); return null; }
}

function phaseValue(value, index) {
  return Array.isArray(value) ? value[index] : value;
}

function durationText(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const minutes = Math.floor(seconds / 60);
  return minutes + ":" + (seconds % 60).toFixed(3).padStart(6, "0");
}

function resultRow(result, drivers) {
  const driver = drivers.find(item => item.driver_number === result.driver_number) || {};
  let index = 0;
  if (Array.isArray(result.duration)) {
    index = result.duration.reduce((last, value, i) => Number.isFinite(value) ? i : last, -1);
  }
  const gap = phaseValue(result.gap_to_leader, index);
  const duration = phaseValue(result.duration, index);
  let gapText = "—";
  if (Number.isFinite(gap)) gapText = gap === 0 ? durationText(duration) : "+" + gap.toFixed(3);
  else if (typeof gap === "string") gapText = gap;
  if (result.dnf) gapText = "DNF";
  if (result.dns) gapText = "DNS";
  if (result.dsq) gapText = "DSQ";
  return {
    pos: Number.isFinite(result.position) && result.position > 0 ? result.position : "—",
    name: driver.name_acronym || String(result.driver_number),
    fullName: driver.full_name || driver.name_acronym || String(result.driver_number),
    color: /^[0-9a-f]{6}$/i.test(driver.team_colour) ? "#" + driver.team_colour : "#9baebf",
    laps: result.number_of_laps ?? "—",
    gap: gapText,
    phase: Array.isArray(result.duration) && index >= 0 ? "Q" + (index + 1) : ""
  };
}

const cached = cachedRecord();
let record = null;
let active = null;
let pending = false;
const api = "https://api.openf1.org/v1/";
try {
  let sessions = await get(api + "sessions?year=" + now.getUTCFullYear());
  if (!Array.isArray(sessions)) throw new Error("Invalid sessions");
  active = sessions.find(session => supported.includes(session.session_name) &&
    Date.parse(session.date_start) <= now.getTime() && Date.parse(session.date_end) > now.getTime());
  let completed = sessions.filter(session => accepted.includes(session.session_name) &&
    Date.parse(session.date_end) <= now.getTime());
  if (!completed.length) {
    sessions = await get(api + "sessions?year=" + (now.getUTCFullYear() - 1));
    if (!Array.isArray(sessions)) throw new Error("Invalid previous season");
    completed = sessions.filter(session => accepted.includes(session.session_name) &&
      Date.parse(session.date_end) <= now.getTime());
  }
  completed.sort((a, b) => Date.parse(b.date_end) - Date.parse(a.date_end));
  for (const session of completed.slice(0, 3)) {
    try {
      const query = "?session_key=" + session.session_key;
      const results = await get(api + "session_result" + query);
      if (!Array.isArray(results) || !results.length ||
          !results.every(result => Number.isFinite(result.driver_number))) throw new Error("Classification pending");
      let drivers = [];
      try { drivers = await get(api + "drivers" + query); } catch (error) { console.warn("Drivers: " + error); }
      if (!Array.isArray(drivers)) drivers = [];
      const rows = results.slice().sort((a, b) => (a.position || 999) - (b.position || 999))
        .map(result => resultRow(result, drivers));
      record = {
        title: session.location + " · " + session.session_name,
        session: session.session_name, end: session.date_end, rows,
        source: "OpenF1", updated: now.getTime(), key: session.session_key
      };
      break;
    } catch (error) { pending = true; console.warn("Results: " + error); }
  }
} catch (error) { console.warn("OpenF1: " + error); }

if (!record && ["latest", "race"].includes(selectedType)) {
  try {
    const data = await get("https://api.jolpi.ca/ergast/f1/current/last/results.json?limit=100");
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race?.Results?.length) throw new Error("No race results");
    record = {
      title: race.raceName + " · Race", session: "Race",
      end: race.date + "T" + (race.time || "00:00:00Z"), source: "Jolpica",
      updated: now.getTime(),
      rows: race.Results.map(result => ({
        pos: result.position, name: result.Driver.code || result.Driver.familyName,
        fullName: result.Driver.givenName + " " + result.Driver.familyName,
        laps: result.laps ?? "—", gap: result.Time?.time || result.status || "—",
        phase: "", color: "#9baebf"
      }))
    };
  } catch (error) { console.warn("Jolpica: " + error); }
}
if (!validRecord(record)) record = null;
// An older fallback must not replace a more recent cached classification.
let stale = false;
if (cached && (!record || Date.parse(cached.end) > Date.parse(record.end))) {
  record = cached;
  stale = true;
}
if (record && !stale) {
  try { fm.writeString(cachePath, JSON.stringify(record)); }
  catch (error) { console.warn("Cache: " + error); }
}

function dateText(value) {
  return new Date(value).toLocaleDateString("zh-TW");
}

label(widget, "F1  /  TIMING", 15, true);
widget.addSpacer(4);
if (record) {
  label(widget, record.title, 12, true);
  label(widget, (stale ? "快取 · " : "") + "歷史賽果 · " + dateText(record.end), 9, true, "#dfb984");
  if (active) label(widget, "場次進行中 · 免費來源未提供即時計時", 9, false, "#dfb984");
  else if (pending) label(widget, "較新場次資料待公布", 9, false, "#dfb984");
  widget.addSpacer(8);
  const columns = widget.addStack();
  const perColumn = config.widgetFamily === "small" ? 3 : 8;
  const columnCount = wide ? 2 : 1;
  let displayed = 0;
  for (let column = 0; column < columnCount; column++) {
    if (column) columns.addSpacer(24);
    const group = columns.addStack();
    group.layoutVertically();
    const rows = record.rows.slice(column * perColumn, (column + 1) * perColumn);
    for (const driver of rows) {
      const row = group.addStack();
      label(row, String(driver.pos).padStart(2, "0"), 11, true, "#8da1b4");
      row.addSpacer(7);
      label(row, driver.name, 12, true, driver.color);
      row.addSpacer(7);
      label(row, driver.laps + "L", 9, false, "#aabcc9");
      row.addSpacer();
      label(row, driver.phase + (driver.phase ? " " : "") + driver.gap, 10);
      group.addSpacer(4);
      displayed++;
    }
  }
  widget.addSpacer();
  label(widget, "前 " + displayed + " / " + record.rows.length + " 位 · 點擊查看全表", 9, false, "#aabcc9");
  label(widget, record.source + " · 讀取 " + dateText(record.updated) + " " +
    new Date(record.updated).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }), 8, false, "#8da1b4");
} else {
  widget.addSpacer();
  label(widget, "目前沒有可驗證賽果", 14, true);
  label(widget, "連線後重試 · " + selectedType, 10);
}
widget.refreshAfterDate = new Date(Date.now() + 15 * 60000);
Script.setWidget(widget);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

if (!config.runsInWidget) {
  if (record) {
    const view = new WebView();
    const rows = record.rows.map(driver => "<tr><td>" + escapeHtml(driver.pos) +
      "</td><td><b style='color:" + driver.color + "'>" + escapeHtml(driver.name) +
      "</b><small>" + escapeHtml(driver.fullName) + "</small></td><td>" +
      escapeHtml(driver.laps) + "</td><td>" + escapeHtml(driver.phase + " " + driver.gap) + "</td></tr>").join("");
    await view.loadHTML("<meta name='viewport' content='width=device-width,initial-scale=1'>" +
      "<style>body{background:#17232f;color:#eef1f4;font:16px -apple-system;padding:20px;margin:0}" +
      "h1{font-size:23px}p,small{color:#aabcc9}small{display:block;font-size:11px;margin-top:4px}" +
      "table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:12px 5px;border-bottom:1px solid #304252}" +
      "td:last-child{text-align:right}th{font-size:12px}</style><h1>" + escapeHtml(record.title) +
      "</h1><p>" + (stale ? "快取 · " : "") + "歷史賽果 · " + escapeHtml(dateText(record.end)) +
      "</p><p>" + escapeHtml(record.source) + " · " + BUILD + "</p>" +
      "<table><thead><tr><th>排名</th><th>車手</th><th>圈數</th><th>成績／差距</th></tr></thead><tbody>" + rows + "</tbody></table>");
    await view.present(true);
  } else if (wide) await widget.presentExtraLarge();
  else await widget.presentLarge();
}
Script.complete();
