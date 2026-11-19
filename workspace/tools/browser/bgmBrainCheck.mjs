/**
 * bgm1 browser check (ISSUES #224, docs/aud244b-bgm-fanfare-loops.md "bgm1"): a Factory Head battle starts MUS_VS_FRONTIER_BRAIN (471),
 * loops it and fades it on the result, in real Chromium, with the built bundle's real player chunk and the shipped bgm-471 file.
 *
 *   npm run build && POKEBENCH_BROWSER_DIR=<dir with playwright> node tools/browser/bgmBrainCheck.mjs [--wrap-seconds 100] [--format ogg|aac]
 *
 * The Brain battle's own sound events come from the engine's real emitters (battleStartSounds `emitBattleStartBgm(true)`, the forfeit end
 * `emitForfeitEndSounds(.., true)`), collected node-side through `collectSoundTick` and pushed into the page's `createAudioPlayer` at
 * their real-time frame offsets (59.7275 frames/s). A headless browser cannot be heard, so the checks read the audio graph:
 *   - the decoded buffer of bgm-471 (duration, offset 0), the scheduled sources and their `start(when, offset)` args (loop schedule),
 *   - an AnalyserNode on the destination (signal present while playing, silent after the fade, continuous across the loop wrap),
 *   - the gain automation (the 16-step linear fade, speed 5 frames per step).
 */
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { emitBattleStartBgm } from "../../src/engine/battleStartSounds.ts";
import { emitForfeitEndSounds } from "../../src/engine/battleEndSounds.ts";
import { beginScreenSoundTick, runScheduledScreenSounds } from "../../src/engine/screenSounds.ts";

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const FORMAT = opt("format", "ogg");
const WRAP_SECONDS = Number(opt("wrap-seconds", 100));
const DIST = resolve(opt("dist", "dist"));
const FRAME_HZ = 16_777_216 / 280_896;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".png": "image/png" };
const manifest = JSON.parse(readFileSync("src/assets/gen/audio/manifest.json", "utf8"));
const song = manifest.sounds["bgm:471"];
const SONG_RATE = song.sampleRate;

/** Run the real emitters frame by frame and keep what they push. */
function collectFrames(first, last, run) {
  const events = [];
  for (let frame = first; frame <= last; frame += 1) {
    events.push(...collectSoundTick(frame, () => {
      beginScreenSoundTick(frame);
      if (frame === first) run();
      runScheduledScreenSounds();
    }).events);
  }
  return events;
}
const START_FRAME = 60;
const startEvents = collectFrames(START_FRAME, START_FRAME, () => emitBattleStartBgm(true));
const FORFEIT_FRAME = START_FRAME + Math.round(8 * FRAME_HZ);
const endEvents = collectFrames(FORFEIT_FRAME, FORFEIT_FRAME + 120, () => emitForfeitEndSounds("forfeit-message", true, true));
const rowOf = (e) => `${e.kind}${e.id === null ? "" : ` ${e.id}`}${e.player ? ` ${e.player}` : ""}${e.speed ? ` speed ${e.speed}` : ""} @${e.frame}`;
console.log("engine events (real emitters):", [...startEvents, ...endEvents].map(rowOf).join(" | "));

const serverRequests = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  serverRequests.push(url.pathname);
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST + sep) && file !== DIST) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;
const playerChunk = readdirSync(join(DIST, "assets")).find((f) => /^player-[\w-]+\.js$/.test(f));
if (!playerChunk) throw new Error("no player chunk in dist/assets (npm run build first)");

const browserDir = resolve(process.env.POKEBENCH_BROWSER_DIR ?? ".integration/browser");
const { chromium } = await import(pathToFileURL(join(browserDir, "node_modules/playwright/index.mjs")).href);
const syslibs = join(browserDir, "syslibs/root/usr/lib/aarch64-linux-gnu");
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"], ...(existsSync(syslibs) ? { env: { ...process.env, LD_LIBRARY_PATH: syslibs } } : {}) });

const initScript = (forceAac) => {
  const tap = { contexts: 0, decodes: [], decodeFail: 0, starts: [], stops: [], ramps: [], peaks: [] };
  window.__TAP__ = tap;
  const Native = window.AudioContext ?? window.webkitAudioContext;
  if (forceAac) {
    const can = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type) { return /ogg|vorbis/i.test(type) ? "" : can.call(this, type); };
  }
  const nativeRamp = AudioParam.prototype.linearRampToValueAtTime;
  AudioParam.prototype.linearRampToValueAtTime = function (value, time) { tap.ramps.push({ kind: "ramp", value, time }); return nativeRamp.call(this, value, time); };
  const nativeSet = AudioParam.prototype.setValueAtTime;
  AudioParam.prototype.setValueAtTime = function (value, time) { tap.ramps.push({ kind: "set", value, time }); return nativeSet.call(this, value, time); };
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
        tap.peaks.push({ t: this.currentTime, peak });
      }, 50);
    }
    createBufferSource() {
      const node = super.createBufferSource();
      const start = node.start.bind(node);
      const id = (tap.nextId = (tap.nextId ?? 0) + 1);
      const stop = node.stop.bind(node);
      node.stop = (when) => {
        if (node.buffer && node.buffer.duration > 30) tap.stops.push({ id, ctxNow: this.currentTime, when: when ?? 0, bufferSeconds: node.buffer.duration });
        return stop(when);
      };
      node.start = (when, offset, duration) => {
        if (node.buffer && node.buffer.duration > 30) tap.starts.push({ id, ctxNow: this.currentTime, when: when ?? 0, offset: offset ?? 0, duration: duration ?? null, bufferSeconds: node.buffer.duration, loop: node.loop, loopStart: node.loopStart, loopEnd: node.loopEnd });
        return start(when, offset, duration);
      };
      return node;
    }
    decodeAudioData(...a) {
      const p = super.decodeAudioData(...a);
      p.then((b) => tap.decodes.push({ seconds: b.duration, rate: b.sampleRate, channels: b.numberOfChannels }), () => { tap.decodeFail += 1; });
      return p;
    }
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

async function runCase(name, events, seconds, { forceAac = false } = {}) {
  serverRequests.length = 0;
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${m.type()}: ${m.text()}`); });
  await page.addInitScript(initScript, forceAac);
  await page.goto(`${base}?nothing=1`);
  await page.mouse.click(10, 10);
  const first = events[0].frame;
  await page.evaluate(async ([chunk, evs, firstFrame, hz]) => {
    const { createAudioPlayer } = await import(`/assets/${chunk}`);
    const player = createAudioPlayer({ enabled: true });
    window.__PLAYER__ = player;
    window.__T0__ = performance.now();
    for (const e of evs) setTimeout(() => player.push(e), ((e.frame - firstFrame) * 1000) / hz);
  }, [playerChunk, events, first, FRAME_HZ]);
  await page.waitForTimeout(seconds * 1000);
  const result = await page.evaluate(() => ({ tap: window.__TAP__, stats: window.__PLAYER__.stats(), state: window.__PLAYER__.state() }));
  await page.close();
  const files = serverRequests.filter((p) => /\.(ogg|m4a)$/.test(p));
  return { name, tap: result.tap, stats: result.stats, state: result.state, files, errors };
}

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const peakIn = (tap, a, b) => Math.max(0, ...tap.peaks.filter((p) => p.t >= a && p.t <= b).map((p) => p.peak));
const report = {};
const ext = FORMAT === "aac" ? "m4a" : "ogg";
const forceAac = FORMAT === "aac";
const songSeconds = (song.lengthSamples / SONG_RATE);
const loopStartSeconds = song.loopStartSamples / SONG_RATE;

// Case 1: the Brain battle starts, then the loss / forfeit result fades it (fade only: no following song, so silence is measurable).
{
  const fade = endEvents.filter((e) => e.kind === "fade");
  const c = await runCase("brain start + result fade", [...startEvents, ...fade], 8 + 6, { forceAac });
  report.fade = { files: c.files, decodes: c.tap.decodes, starts: c.tap.starts.slice(0, 3), stats: { events: c.stats.events, started: c.stats.started, sources: c.stats.sources, missing: c.stats.missing, late: c.stats.late }, errors: c.errors };
  check(c.files.some((f) => new RegExp(`/bgm-471-[\\w-]+\\.${ext}$`).test(f)), `case 1: bgm-471.${ext} was not fetched (${c.files})`);
  check(c.tap.decodes.some((d) => Math.abs(d.seconds - songSeconds * (FORMAT === "aac" ? 1 : 1)) < 0.2), `case 1: no decoded buffer of ~${songSeconds.toFixed(2)} s (${JSON.stringify(c.tap.decodes)})`);
  check(c.tap.decodeFail === 0 && c.stats.missing === 0 && c.stats.fallbacks === 0, "case 1: decode failure / missing asset / ogg->aac fallback");
  const s0 = c.tap.starts[0];
  check(s0 !== undefined && !s0.loop && Math.abs(s0.bufferSeconds - songSeconds) < 0.2, `case 1: first music source is not the 471 file (${JSON.stringify(s0)})`);
  // The file may still be loading at the event: the player then starts late, at the matching offset into the song (stats.late).
  check(s0 !== undefined && s0.offset >= 0 && s0.offset < 1.5, `case 1: start offset ${s0?.offset} s is not a late-load catch-up (< 1.5 s)`);
  const songStart = s0 ? s0.when - s0.offset : 0;
  check(c.stats.started.bgm === 1, `case 1: started.bgm = ${c.stats.started.bgm}`);
  check(peakIn(c.tap, songStart + 2, songStart + 7) > 0.02, "case 1: no signal on the destination while the Brain song plays");
  // The fade event is frame P+6 at speed 5: 16 steps x 5 frames, linear, ending at 0.
  const fadeFrame = endEvents.find((e) => e.kind === "fade").frame;
  const fadeAt = songStart + (fadeFrame - START_FRAME) / FRAME_HZ;
  const fadeLen = (16 * 5) / FRAME_HZ;
  const down = c.tap.ramps.filter((r) => r.kind === "ramp" && r.time >= fadeAt - 0.1 && r.time <= fadeAt + fadeLen + 2);
  report.fade.fadeAt = fadeAt; report.fade.fadeLen = fadeLen; report.fade.rampsInWindow = down.map((r) => [+(r.time - fadeAt).toFixed(4), +r.value.toFixed(4)]);
  check(down.length >= 1 && Math.min(...down.map((r) => r.value)) === 0, `case 1: no gain ramp to 0 after the fade event (${JSON.stringify(down.slice(-3))})`);
  const last = down.reduce((m, r) => Math.max(m, r.time), 0);
  check(Math.abs(last - (fadeAt + fadeLen)) < 0.25, `case 1: the fade ends at ${(last - fadeAt).toFixed(3)} s after the event, expected ${fadeLen.toFixed(3)} s (+-0.25)`);
  check(peakIn(c.tap, fadeAt - 1, fadeAt - 0.05) > 0.02, "case 1: signal missing just before the fade");
  check(peakIn(c.tap, fadeAt + fadeLen + 0.3, fadeAt + fadeLen + 4) < 0.001, "case 1: still audible after the fade finished");
  check(c.errors.length === 0, `case 1: page errors ${JSON.stringify(c.errors)}`);
}

// Case 2: the whole end sequence (fade, return bgm 469 46 frames later, SE_EXIT): 471 is replaced by 469, so the fade is cut.
{
  const c = await runCase("brain start + full forfeit end", [...startEvents, ...endEvents], 8 + 4, { forceAac });
  report.end = { starts: c.tap.starts, stats: { events: c.stats.events, started: c.stats.started, preempted: c.stats.preempted, missing: c.stats.missing }, errors: c.errors };
  const files = c.files.map((f) => f.replace(/^.*\/(bgm-\d+)-.*$/, "$1"));
  check(files.includes("bgm-471") && files.includes("bgm-469"), `case 2: expected bgm-471 and bgm-469 fetched (${files})`);
  check(c.stats.started.bgm === 2 && c.stats.preempted >= 1, `case 2: started.bgm ${c.stats.started.bgm}, preempted ${c.stats.preempted} (469 must replace 471)`);
  const brain = c.tap.starts.filter((x) => Math.abs(x.bufferSeconds - songSeconds) < 0.2);
  const lobby = c.tap.starts.filter((x) => Math.abs(x.bufferSeconds - 2124781 / SONG_RATE) < 0.2);
  check(brain.length >= 1 && lobby.length >= 1 && brain[0].when < lobby[0].when, "case 2: the music starts are not 471 then 469");
  const lobbyStart = lobby[0] ? lobby[0].when - lobby[0].offset : 0;
  // A source may get several stop() calls (the fade end, then the replacing song); the last call wins in Web Audio.
  const finalStop = new Map(c.tap.stops.map((x) => [x.id, x.when]));
  const brainStops = brain.map((x) => ({ id: x.id, stopAt: finalStop.get(x.id) ?? null }));
  check(brainStops.every((x) => x.stopAt !== null && x.stopAt <= lobbyStart + 0.1), `case 2: a 471 source still runs after 469 starts (${JSON.stringify(brainStops)}, 469 at ${lobbyStart})`);
  report.end.brain = brain; report.end.lobby = lobby; report.end.brainStops = brainStops;
  check(c.errors.length === 0, `case 2: page errors ${JSON.stringify(c.errors)}`);
}

// Case 3: nobody ends the battle: the song plays through its loop end and wraps into the loop start (a crossfaded second pass).
{
  const c = await runCase("brain loop wrap", startEvents, WRAP_SECONDS, { forceAac });
  const [a, b] = c.tap.starts;
  const period = (song.loopEndSamples - song.loopStartSamples) / SONG_RATE;
  report.wrap = { starts: c.tap.starts.slice(0, 4), loopStartSeconds, period, stats: { sources: c.stats.sources, started: c.stats.started }, errors: c.errors };
  check(a !== undefined && b !== undefined, `case 3: ${c.tap.starts.length} music source(s) after ${WRAP_SECONDS} s, expected the second pass`);
  if (a && b) {
    const xfade = 0.007;
    const wrapAt = a.when - a.offset + song.loopEndSamples / SONG_RATE;
    check(Math.abs(b.offset - (loopStartSeconds - xfade)) < 0.0015, `case 3: pass 2 starts at file offset ${b.offset}, expected loopStart - 7 ms = ${loopStartSeconds - xfade}`);
    check(Math.abs(b.when - (wrapAt - xfade)) < 0.002, `case 3: pass 2 starts ${(b.when - wrapAt).toFixed(4)} s from the loop end, expected -0.007 (crossfade overlap)`);
    check(Math.abs(b.duration - (period + xfade)) < 0.01, `case 3: pass 2 plays ${b.duration} s, expected one loop period + 7 ms = ${period + xfade}`);
    check(peakIn(c.tap, wrapAt - 0.5, wrapAt + 0.5) > 0.02, "case 3: signal lost around the wrap");
    check(c.tap.peaks.filter((p) => p.t >= wrapAt - 0.3 && p.t <= wrapAt + 0.3 && p.peak < 0.001).length === 0, "case 3: a silent analyser window at the wrap");
    if (c.tap.starts[2]) check(Math.abs(c.tap.starts[2].when - (b.when + period)) < 0.002, "case 3: pass 3 is not one loop period after pass 2");
  }
  check(c.errors.length === 0, `case 3: page errors ${JSON.stringify(c.errors)}`);
}

await browser.close();
server.close();
console.log(JSON.stringify({ format: FORMAT, songSeconds, loopStartSeconds, report }, null, 1));
if (failures.length) { console.error(`FAIL\n${failures.join("\n")}`); process.exit(1); }
console.log("OK");
