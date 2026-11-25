// Regression tests use clearly synthetic fixtures. No test values are shipped as race data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const path = require("node:path");
const root = path.join(__dirname, "..");
let passed = 0;
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const epoch = Date.parse("2026-11-25T09:00:00Z");

async function execute(file, options = {}) {
  const logs = [], requests = [], widgets = [], drawings = [], html = [];
  const storage = new Map(Object.entries(options.storage || {}));
  const fixed = options.now || epoch;
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  }
  class Element {
    constructor(type = "stack", value) { this.type = type; this.value = value; this.children = []; }
    addText(value) { const child = new Element("text", value); this.children.push(child); return child; }
    addStack() { const child = new Element(); this.children.push(child); return child; }
    addSpacer(value) { this.children.push(new Element("spacer", value)); }
    addImage(value) { const child = new Element("image", value); this.children.push(child); return child; }
    addDate(value) { const child = new Element("date", value); this.children.push(child); return child; }
    layoutVertically() { this.vertical = true; }
    setPadding(...value) { this.padding = value; }
    applyFittingContentMode() { this.fitting = true; }
    applyRelativeStyle() {}
    async presentLarge() {}
    async presentExtraLarge() {}
  }
  class Color { constructor(value) { this.value = value; } static white() { return new Color("#fff"); } }
  class Point { constructor(x, y) { this.x = x; this.y = y; } }
  class Size { constructor(width, height) { this.width = width; this.height = height; } }
  class Path {
    constructor() { this.points = []; }
    move(point) { this.points.push(point); }
    addLine(point) { this.points.push(point); }
  }
  class DrawContext {
    constructor() { this.paths = []; drawings.push(this); }
    addPath(value) { this.paths.push(value); }
    setStrokeColor() {}
    setLineWidth() {}
    strokePath() {
      for (const point of this.paths.at(-1).points) {
        assert(Number.isFinite(point.x) && Number.isFinite(point.y));
        assert(point.x >= 6 && point.x <= this.size.width - 6, "uncropped horizontal bounds");
        assert(point.y >= 6 && point.y <= this.size.height - 6, "uncropped vertical bounds");
      }
    }
    getImage() { return { size: this.size, paths: this.paths }; }
  }
  const fileManager = {
    documentsDirectory: () => "/docs", joinPath: (base, name) => base + "/" + name,
    fileExists: file => storage.has(file),
    readString(file) { if (!storage.has(file)) throw Error("missing"); return storage.get(file); },
    writeString(file, data) { if (options.failWrites) throw Error("disk full"); storage.set(file, data); },
    writeImage(file, data) { storage.set(file, data); }, readImage: file => storage.get(file)
  };
  const context = {
    Date: Clock, Intl, console: { warn: value => logs.push(value), error: value => logs.push(value) },
    args: { widgetParameter: options.parameter || "" },
    config: { runsInWidget: options.inWidget !== false, widgetFamily: options.family || "large" },
    FileManager: { local: () => fileManager }, Color, Size, Point, Path, DrawContext,
    ListWidget: Element,
    URLScheme: { forRunningScript: () => "scriptable:///run?scriptName=fixture" },
    Font: { boldSystemFont: value => value, systemFont: value => value, mediumSystemFont: value => value },
    Timer: { schedule: (delay, repeats, callback) => { callback(); } },
    Script: { setWidget: value => widgets.push(value), complete() {} },
    Request: class {
      constructor(url) { this.url = url; this.response = { statusCode: 200 }; requests.push(url); }
      async loadJSON() {
        const result = options.resolve ? await options.resolve(this.url) : null;
        if (result instanceof Error || result == null) throw result || Error("offline");
        if (result.http) this.response.statusCode = result.http;
        return result;
      }
      async loadImage() { throw Error("no image fixture"); }
    },
    WebView: class { async loadHTML(value) { html.push(value); } async present() {} }
  };
  const suffix = file === "mini-world.js"
    ? "return {selected, referenceMap, weatherState, localTime, validWeather, verifiedArtwork};"
    : "return {record, stale, resultRow, durationText};";
  const result = await vm.runInNewContext("(async()=>{" + read(file) + "\n" + suffix + "})()", context);
  const flatten = item => [item, ...item.children.flatMap(flatten)];
  return { result, storage, requests, widgets, drawings, html, logs, elements: widgets.flatMap(flatten) };
}
function race(id = "losail", date = "2026-11-29", season = "2026") {
  return { season, date, time: "16:00:00Z", raceName: "Fixture Grand Prix", Circuit: {
    circuitId: id, circuitName: "Fixture Circuit", Location: { locality: "Fixture City", lat: "25", long: "51" }
  }};
}
const weather = { timezone: "Asia/Qatar", utc_offset_seconds: 10800,
  current: { temperature_2m: 28, weather_code: 3, is_day: 1 } };
function worldResolver(races, next = []) {
  return url => {
    if (url.includes("open-meteo")) return weather;
    if (url.includes("2027.json")) return { MRData: { RaceTable: { Races: next } } };
    if (url.includes("2026.json")) return { MRData: { RaceTable: { Races: races } } };
    if (url.endsWith("manifest.json")) return { version: 2, circuits: {} };
    throw Error("unavailable");
  };
}
async function test(name, action) {
  await action();
  passed++;
  console.log("PASS " + name);
}
const session = { session_key: 100, session_name: "Race", location: "Fixture",
  date_start: "2026-11-22T14:00:00Z", date_end: "2026-11-22T16:00:00Z" };
const results = Array.from({ length: 22 }, (_, index) => ({
  driver_number: index + 1, position: index + 1, number_of_laps: 55,
  duration: 5400 + index, gap_to_leader: index, dnf: false, dns: false, dsq: false
}));
const drivers = results.map(result => ({
  driver_number: result.driver_number, name_acronym: "T" + result.driver_number,
  full_name: "Fixture " + result.driver_number, team_colour: "AABBCC"
}));
const timingResolver = url => {
  if (url.includes("/sessions?")) return [session];
  if (url.includes("/session_result?")) return results;
  if (url.includes("/drivers?")) return drivers;
  throw Error("offline");
};

(async () => {
  await test("world image occupies a dedicated fitted child, never the text background", async () => {
    const run = await execute("mini-world.js", { resolve: worldResolver([race()]) });
    const images = run.elements.filter(item => item.type === "image");
    assert.equal(images.length, 1);
    assert.equal(images[0].fitting, true);
    assert.equal(run.widgets[0].backgroundImage, undefined);
  });
  await test("all 24 reference circuits plus Lusail alias fit both image sizes", async () => {
    const run = await execute("mini-world.js", { resolve: worldResolver([race()]) });
    const atlas = JSON.parse(read("assets/layouts.json"));
    for (const id of [...Object.keys(atlas.routes), "lusail"]) {
      for (const size of [[520, 252], [680, 410]]) assert(run.result.referenceMap(id, weather.current, ...size));
    }
    assert.equal(run.result.referenceMap("unknown-circuit", weather.current, 520, 252), null);
  });
  await test("extra-large automatically uses wide image", async () => {
    const run = await execute("mini-world.js", { family: "extraLarge", resolve: worldResolver([race()]) });
    assert.equal(run.elements.find(item => item.type === "image").imageSize.width, 340);
  });
  await test("future race selected even when weather fails", async () => {
    const resolve = worldResolver([race("monaco")]);
    const run = await execute("mini-world.js", { resolve: url => url.includes("open-meteo") ? Error("offline") : resolve(url) });
    assert.equal(run.result.selected.race.Circuit.circuitId, "monaco");
    assert(run.elements.some(item => item.value === "天氣無資料"));
  });
  await test("offline calendar and weather caches remain usable", async () => {
    const storage = {
      "/docs/f1-calendar-2026.json": JSON.stringify({ races: [race()], updated: epoch - 60000 }),
      "/docs/f1-weather-losail.json": JSON.stringify({ data: weather, updated: epoch - 60000 })
    };
    const run = await execute("mini-world.js", { storage });
    assert(run.result.selected.calendar.cached);
    assert(run.elements.some(item => item.type === "image"));
    assert(run.elements.some(item => String(item.value).includes("天氣快取")));
  });
  await test("legacy combined cache migrates without reading missing files", async () => {
    const run = await execute("mini-world.js", { storage: {
      "/docs/f1-world-data.json": JSON.stringify({ race: race(), weather, updated: epoch })
    } });
    assert.equal(run.result.selected.race.Circuit.circuitId, "losail");
    assert(run.elements.some(item => item.type === "image"));
  });
  await test("empty offline first run renders an honest unavailable state", async () => {
    const run = await execute("mini-world.js");
    assert.equal(run.result.selected, null);
    assert(run.elements.some(item => item.value === "賽程暫時無法取得"));
  });
  await test("corrupt cache cannot crash first run", async () => {
    const run = await execute("mini-world.js", { storage: { "/docs/f1-calendar-2026.json": "{" } });
    assert.equal(run.result.selected, null);
  });
  await test("year rollover selects announced next-season race", async () => {
    const run = await execute("mini-world.js", {
      now: Date.parse("2026-12-31T12:00:00Z"),
      resolve: worldResolver([race()], [race("albert_park", "2027-03-14", "2027")])
    });
    assert.equal(run.result.selected.race.season, "2027");
    assert.equal(run.result.selected.waiting, false);
  });
  await test("off-season retains last circuit and labels pending calendar", async () => {
    const run = await execute("mini-world.js", {
      now: Date.parse("2026-12-31T12:00:00Z"), resolve: worldResolver([race()])
    });
    assert.equal(run.result.selected.waiting, true);
    assert(run.elements.some(item => String(item.value).startsWith("新賽程待公布")));
  });
  await test("unknown circuits never borrow another track", async () => {
    const run = await execute("mini-world.js", { resolve: worldResolver([race("unmapped")]) });
    assert.equal(run.elements.filter(item => item.type === "image").length, 0);
    assert(run.elements.some(item => item.value === "賽道素材待更新"));
  });
  await test("weather code snow is not rain and DST follows IANA timezone", async () => {
    const run = await execute("mini-world.js", { resolve: worldResolver([race()]) });
    assert.equal(run.result.weatherState(75).key, "snow");
    assert.equal(run.result.weatherState(95).key, "storm");
    assert(run.result.localTime(new Date("2026-07-01T12:00:00Z"), "America/New_York").includes("08:00"));
    assert(run.result.localTime(new Date("2026-12-01T12:00:00Z"), "America/New_York").includes("07:00"));
  });
  await test("cache write failure still displays fresh race data", async () => {
    const run = await execute("mini-world.js", { failWrites: true, resolve: worldResolver([race()]) });
    assert(run.elements.some(item => item.type === "image"));
  });
  await test("unverified assets are never requested", async () => {
    const resolve = worldResolver([race()]);
    const run = await execute("mini-world.js", { resolve: url => url.endsWith("manifest.json")
      ? { version: 2, circuits: { losail: { image: "wrong.png" } } } : resolve(url) });
    assert(!run.requests.some(url => url.endsWith("wrong.png")));
  });
  await test("wide timing widget displays 16 real fixture classifications", async () => {
    const run = await execute("live-timing.js", { family: "extraLarge", resolve: timingResolver });
    assert.equal(run.result.record.rows.length, 22);
    assert(run.elements.some(item => String(item.value).startsWith("前 16 / 22")));
  });
  await test("timing excludes practice even if it is the most recent session", async () => {
    const run = await execute("live-timing.js", { resolve: url => url.includes("/sessions?")
      ? [session, { ...session, session_name: "Practice 1", session_key: 101, date_end: "2026-11-24T10:00:00Z" }] : timingResolver(url) });
    assert.equal(run.result.record.key, 100);
  });
  await test("qualifying arrays preserve zero gaps and the last completed phase", async () => {
    const run = await execute("live-timing.js", { resolve: timingResolver });
    const row = run.result.resultRow({ ...results[0], duration: [80.5, 79.5, null], gap_to_leader: [0.3, 0, null] }, drivers);
    assert.equal(row.phase, "Q2");
    assert.equal(row.gap, "1:19.500");
  });
  await test("DNF DNS DSQ statuses take precedence over gap", async () => {
    const run = await execute("live-timing.js", { resolve: timingResolver });
    for (const status of ["dnf", "dns", "dsq"]) assert.equal(run.result.resultRow({ ...results[0], [status]: true }, drivers).gap, status.toUpperCase());
  });
  await test("missing classification tries previous competitive session", async () => {
    const run = await execute("live-timing.js", { resolve: url => {
      if (url.includes("/sessions?")) return [{ ...session, session_key: 102, date_end: "2026-11-24T12:00:00Z" }, session];
      if (url.includes("session_result?session_key=102")) return [];
      return timingResolver(url);
    } });
    assert.equal(run.result.record.key, 100);
    assert(run.elements.some(item => item.value === "較新場次資料待公布"));
  });
  await test("newer cached qualifying survives an older race fallback", async () => {
    const cache = { title: "Cached qualifying", session: "Qualifying", end: "2026-11-24T12:00:00Z",
      rows: [{ name: "T1", pos: 1, laps: 10, gap: "0", phase: "", color: "#ffffff" }], source: "OpenF1", updated: epoch - 60000 };
    const run = await execute("live-timing.js", { storage: { "/docs/f1-timing-v3-latest.json": JSON.stringify(cache) }, resolve: timingResolver });
    assert.equal(run.result.record.title, "Cached qualifying");
    assert.equal(run.result.stale, true);
  });
  await test("active session is labelled unavailable live while preserving historical table", async () => {
    const run = await execute("live-timing.js", { resolve: url => url.includes("/sessions?")
      ? [session, { ...session, date_start: "2026-11-25T08:00:00Z", date_end: "2026-11-25T10:00:00Z" }] : timingResolver(url) });
    assert(run.elements.some(item => item.value === "場次進行中 · 免費來源未提供即時計時"));
  });
  await test("tap view contains all drivers and escapes untrusted names", async () => {
    const run = await execute("live-timing.js", { inWidget: false, resolve: url => url.includes("/drivers?")
      ? drivers.map(driver => ({ ...driver, full_name: "<script>fixture</script>" })) : timingResolver(url) });
    assert.equal((run.html[0].match(/<tr>/g) || []).length, 23);
    assert(!run.html[0].includes("<script>fixture"));
    assert(run.html[0].includes("&lt;script&gt;fixture"));
  });
  await test("timing offline first run never invents results", async () => {
    const run = await execute("live-timing.js");
    assert.equal(run.result.record, null);
    assert(run.elements.some(item => item.value === "目前沒有可驗證賽果"));
  });
  await test("installer SHA-256 matches Node for empty, Unicode and multiblock content", async () => {
    const source = fs.existsSync(path.join(__dirname, "hash-source.js")) ? read("tests/hash-source.js") : read("install-release.js").split("const release =")[0];
    const hash = vm.runInNewContext(source + "\n({sha256,decodeBase64})");
    for (const value of ["", "abc", "繁體中文 🏎️", "x".repeat(10000), read("mini-world.js")]) {
      const bytes = Buffer.from(value);
      assert.equal(hash.sha256(hash.decodeBase64(bytes.toString("base64"))), crypto.createHash("sha256").update(bytes).digest("hex"));
    }
  });
  await test("garage v2 framing, offline cache and stage controls", async () => {
    await require("./garage-v2.cjs")();
  });
  async function install(options = {}) {
    const storage = options.storage || new Map([["/docs/F1 Mini World.js", Buffer.from("original user loader")]]);
    const bytes = value => ({ toBase64String: () => Buffer.from(value).toString("base64") });
    let writes = 0;
    const manager = {
      documentsDirectory: () => "/docs", joinPath: (base, name) => base + "/" + name,
      fileExists: file => storage.has(file), downloadFileFromiCloud: async () => {},
      read: file => bytes(storage.get(file)),
      write(file, data) {
        writes++;
        storage.set(file, Buffer.from(data.toBase64String(), "base64"));
        if (options.failAt === writes) throw Error("simulated disk failure");
      },
      remove: file => storage.delete(file)
    };
    let error;
    try {
      await vm.runInNewContext("(async()=>{" + read("install-release.js") + "})()", {
        console, FileManager: { iCloud: () => manager },
        Request: class {
          constructor(url) { this.url = url; this.response = { statusCode: 200 }; }
          async load() {
            const name = this.url.split("/").at(-1);
            return bytes(read(name) + (options.corrupt === name ? "tampered" : ""));
          }
        },
        Alert: class { addAction() {} async presentAlert() {} },
        Script: { complete() {} }
      });
    } catch (caught) { error = caught; }
    return { storage, writes, error };
  }
  await test("installer verifies all three actual release files before writing", async () => {
    const run = await install();
    assert.equal(run.error, undefined);
    assert.equal(run.writes, 3);
    assert.equal(run.storage.size, 4);
    assert.equal(run.storage.get("/docs/F1 Mini World.js").toString(), "original user loader");
  });
  await test("installer rejects a tampered download without installing any file", async () => {
    const run = await install({ corrupt: "pit-garage.js" });
    assert(run.error);
    assert.equal(run.writes, 0);
    assert.equal(run.storage.size, 1);
  });
  await test("installer rolls back partial writes while preserving original scripts", async () => {
    const run = await install({ failAt: 2 });
    assert(run.error);
    assert.equal(run.storage.size, 1);
    assert(run.storage.has("/docs/F1 Mini World.js"));
  });
  await test("installer repeats safely and installs beside edited files", async () => {
    const first = await install();
    const repeated = await install({ storage: first.storage });
    assert.equal(repeated.error, undefined);
    assert.equal(repeated.writes, 0);
    const installed = [...first.storage.keys()].find(file => file.includes("F1 賽道"));
    first.storage.set(installed, Buffer.from("user changes"));
    const modified = await install({ storage: first.storage });
    assert.equal(modified.error, undefined);
    assert.equal(modified.writes, 1);
    assert.equal(first.storage.get(installed).toString(), "user changes");
    const newPath = installed.replace(/\.js$/, " (2).js");
    assert.equal(first.storage.get(newPath).toString(), read("mini-world.js"));
    const retry = await install({ storage: first.storage });
    assert.equal(retry.error, undefined);
    assert.equal(retry.writes, 0);
    first.storage.set(newPath, Buffer.from("Scriptable metadata and edited content"));
    const again = await install({ storage: first.storage });
    assert.equal(again.error, undefined);
    assert.equal(again.writes, 1);
    assert(first.storage.has(installed.replace(/\.js$/, " (3).js")));
  });
  await test("published release bytes match Git blob IDs and installer SHA-256 values", async () => {
    const release = JSON.parse(read("tests/release-integrity.json"));
    const installer = read("install-release.js");
    assert(installer.includes('const release = "' + release.release + '"'));
    for (const [name, expected] of Object.entries(release.files)) {
      const bytes = fs.readFileSync(path.join(root, name));
      const header = Buffer.from("blob " + bytes.length + "\0");
      assert.equal(crypto.createHash("sha1").update(header).update(bytes).digest("hex"), expected.gitBlob, name + " Git bytes");
      const actual = crypto.createHash("sha256").update(bytes).digest("hex");
      assert.equal(actual, expected.sha256, name + " release SHA-256");
      assert(installer.includes('"' + name + '": "' + actual + '"'));
      const extraNewline = crypto.createHash("sha256").update(bytes).update("\n").digest("hex");
      assert.notEqual(extraNewline, expected.sha256);
    }
  });
  console.log("\n" + passed + " regression tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });

