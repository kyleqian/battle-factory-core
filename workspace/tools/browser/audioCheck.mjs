/**
 * aud245 browser check of the built bundle's audio (docs/aud245-audio-player.md).
 *
 *   npm run build && node tools/browser/audioCheck.mjs [--frames 3000] [--seed 3] [--scene off] [--format ogg|aac]
 *
 * Case 1 (?audio=1): a node-side session plays a seeded 'winning' run; its per-frame button sets are replayed in the page through
 *   the ?pokebench=1 __POKEBENCH__.advance() ABI at real time (6 frames per 100.5 ms, rAF stubbed), after one real click (the user
 *   gesture). The page wraps AudioContext to count createBufferSource()/start() and taps the destination with an AnalyserNode;
 *   it then reads window.__POKEBENCH_AUDIO__() and compares the player's per-kind event counts with the node-side sink's.
 * Case 2 (no audio option): same play, zero requests under /assets/ for .ogg/.m4a, no AudioContext constructed.
 * Playwright lives outside package.json (see tools/browser/randomPlay.mjs); POKEBENCH_BROWSER_DIR overrides .integration/browser.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { FactorySession } from "../../src/factorySession.ts";
import { DEFAULT_PRESENTATION_RNG_SEED } from "../../src/engine/presentationRngHost.ts";
import { ActionLog, RandomPlayer, Rng } from "../soak/randomRoundSoakDriver.ts";

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const FRAMES = Number(opt("frames", 3000));
const SEED = Number(opt("seed", 3));
const SCENE = opt("scene", "off");
const FORMAT = opt("format", "ogg");
const DIST = resolve(opt("dist", "dist"));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".png": "image/png" };

// Node-side run: the buttons per frame, and the sink's event counts by kind.
const session = new FactorySession({ battleScene: SCENE, presentationSeed: DEFAULT_PRESENTATION_RNG_SEED });
const nodeEvents = {};
session.attachSoundSink({ push: (e) => { nodeEvents[e.kind] = (nodeEvents[e.kind] ?? 0) + 1; } });
const player = new RandomPlayer(new Rng(SEED), new ActionLog(false), "winning");
const perFrame = [];
for (let frame = 1; frame <= FRAMES; frame += 1) {
  const buttons = player.decide(session.state);
  perFrame.push([...buttons]);
  session.tick(buttons, frame);
}
const segments = [];
for (const buttons of perFrame) {
  const key = buttons.join("+");
  const last = segments[segments.length - 1];
  if (last && last.key === key) last.frames += 1;
  else segments.push({ key, frames: 1, buttons });
}

const requests = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  requests.push(url.pathname);
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST + sep) && file !== DIST) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const browserDir = resolve(process.env.POKEBENCH_BROWSER_DIR ?? ".integration/browser");
const { chromium } = await import(pathToFileURL(join(browserDir, "node_modules/playwright/index.mjs")).href);
const syslibs = join(browserDir, "syslibs/root/usr/lib/aarch64-linux-gnu");
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=document-user-activation-required"], ...(existsSync(syslibs) ? { env: { ...process.env, LD_LIBRARY_PATH: syslibs } } : {}) });

const initScript = (forceAac) => {
  window.requestAnimationFrame = () => 0;
  const tap = { contexts: 0, sources: 0, starts: 0, loopSources: 0, startedSeconds: 0, decodes: 0, decodeFail: 0, peakMax: 0, peakNonZero: 0, samples: 0, resumes: 0, states: [], musicStarts: [] };
  window.__AUDIO_TAP__ = tap;
  const Native = window.AudioContext ?? window.webkitAudioContext;
  if (!Native) return;
  if (forceAac) {
    const can = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type) { return /ogg|vorbis/i.test(type) ? "" : can.call(this, type); };
  }
  const wrapped = class extends Native {
    constructor(...a) {
      super(...a);
      tap.contexts += 1;
      const analyser = this.createAnalyser();
      analyser.fftSize = 1024;
      const data = new Float32Array(analyser.fftSize);
      this.__analyser = analyser;
      setInterval(() => {
        analyser.getFloatTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v));
        tap.samples += 1;
        if (peak > 0.001) tap.peakNonZero += 1;
        tap.peakMax = Math.max(tap.peakMax, peak);
        tap.states.push(this.state);
        if (tap.states.length > 4) tap.states.shift();
      }, 50);
    }
    createBufferSource() {
      const node = super.createBufferSource();
      tap.sources += 1;
      const start = node.start.bind(node);
      node.start = (...a) => {
        tap.starts += 1;
        if (node.loop) tap.loopSources += 1;
        // Music (a buffer longer than 30 s): when the page asked for it and at which file offset (aud247: the BGM at mount).
        if (node.buffer && node.buffer.duration > 30 && tap.musicStarts.length < 8) tap.musicStarts.push({ wallMs: Math.round(performance.now()), ctxTime: this.currentTime, offset: a[1] ?? 0, loop: node.loop });
        return start(...a);
      };
      return node;
    }
    decodeAudioData(...a) {
      tap.decodes += 1;
      const p = super.decodeAudioData(...a);
      p.catch(() => { tap.decodeFail += 1; });
      return p;
    }
    resume() { tap.resumes += 1; return super.resume(); }
  };
  const nativeConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    const r = nativeConnect.call(this, target, ...rest);
    if (target instanceof AudioDestinationNode && this.context.__analyser && this !== this.context.__analyser) nativeConnect.call(this, this.context.__analyser);
    return r;
  };
  window.AudioContext = wrapped;
  window.webkitAudioContext = wrapped;
};

async function runCase(name, query, { forceAac = false, gesture = true } = {}) {
  requests.length = 0;
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // Chromium warns when a context is constructed before a gesture; the player resumes it on the first one (that is the design).
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/not allowed to start/.test(m.text())) errors.push(`${m.type()}: ${m.text()}`); });
  await page.addInitScript(initScript, forceAac);
  await page.goto(`${base}?pokebench=1&battleScene=${SCENE}${query}`);
  await page.waitForFunction(() => typeof window.__POKEBENCH__ === "object", null, { polling: 100 });
  await page.evaluate(() => window.__POKEBENCH__.reset());
  if (gesture) await page.mouse.click(10, 10);
  const startedAt = Date.now();
  const CHUNK = 6;
  const flat = [];
  for (const s of segments) for (let i = 0; i < s.frames; i += 1) flat.push(s.buttons);
  for (let f = 0; f < flat.length; f += CHUNK) {
    const chunk = [];
    for (const buttons of flat.slice(f, f + CHUNK)) {
      const last = chunk[chunk.length - 1];
      if (last && last.buttons.join("+") === buttons.join("+")) last.frames += 1;
      else chunk.push({ frames: 1, buttons });
    }
    const due = startedAt + ((f + CHUNK) * 1000) / (16777216 / 280896);
    await page.evaluate((c) => window.__POKEBENCH__.advance(c), chunk);
    const wait = due - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
  }
  await page.waitForTimeout(1500);
  const result = await page.evaluate(() => ({ tap: window.__AUDIO_TAP__, audio: typeof window.__POKEBENCH_AUDIO__ === "function" ? window.__POKEBENCH_AUDIO__() : null, hasCtor: typeof AudioContext }));
  const audioRequests = requests.filter((p) => /\.(ogg|m4a)$/.test(p));
  const playerChunkRequests = requests.filter((p) => /\/assets\/(player|audio-data)-/.test(p));
  await page.close();
  return { name, wallSeconds: (Date.now() - startedAt) / 1000, ...result, audioRequests: audioRequests.length, audioFilesFetched: new Set(audioRequests).size, ogg: audioRequests.filter((p) => p.endsWith(".ogg")).length, m4a: audioRequests.filter((p) => p.endsWith(".m4a")).length, playerChunkRequests, errors };
}

const cases = [];
cases.push(await runCase("audio=1 (ogg)", "&audio=1"));
if (FORMAT === "aac" || args.includes("--also-aac")) cases.push(await runCase("audio=1 (aac forced)", "&audio=1", { forceAac: true }));
cases.push(await runCase("no audio option", ""));
await browser.close();
server.close();

console.log(JSON.stringify({ scene: SCENE, seed: SEED, frames: FRAMES, nodeEvents, cases }, null, 2));
const on = cases[0];
const off = cases[cases.length - 1];
const failures = [];
if (!on.audio || on.audio.stats.sources < 1) failures.push("audio=1: no buffer sources were created");
if (on.tap.contexts !== 1) failures.push(`audio=1: expected exactly one AudioContext, saw ${on.tap.contexts}`);
if (on.tap.starts < 1) failures.push("audio=1: no source.start()");
if (on.audio) for (const kind of Object.keys(nodeEvents)) if ((on.audio.stats.events[kind] ?? 0) !== nodeEvents[kind]) failures.push(`audio=1: ${kind} events ${on.audio.stats.events[kind]} != node ${nodeEvents[kind]}`);
if (off.tap.contexts !== 0 || off.audioRequests !== 0 || off.playerChunkRequests.length !== 0) failures.push("no audio option: an AudioContext was made or audio / player chunk was fetched");
for (const c of cases) if (c.errors.length) failures.push(`${c.name}: page errors/warnings ${JSON.stringify(c.errors.slice(0, 3))}`);
if (failures.length) { console.error(`FAIL\n${failures.join("\n")}`); process.exit(1); }
console.log("OK");
