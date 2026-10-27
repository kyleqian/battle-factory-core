/**
 * Randomized play against the BUILT browser bundle (docs/finish-plan.md Phase 1d).
 *
 * Serves dist/ with a tiny node http server, drives headless Chromium with seeded random key presses
 * (mostly A, some directions/B/START) and collects pageerror events, console errors, contained
 * presentation errors (__POKEBENCH_SESSION__().containedErrors) and the crash overlay. On a pageerror or
 * overlay it saves the session JSON + screenshot, reloads and continues. Exits 1 on any pageerror/overlay.
 *
 * One-time setup (Playwright lives OUTSIDE package.json, in the git-ignored .integration/browser/):
 *   mkdir -p .integration/browser && cd .integration/browser && npm init -y && npm install playwright
 *   npx playwright install chromium            # default PLAYWRIGHT_BROWSERS_PATH (~/.cache/ms-playwright)
 *   # Linux needs system libs; on Ubuntu/Debian (root): npx playwright install-deps chromium, or at least
 *   #   apt-get install libnspr4 libnss3 libatk1.0-0t64 libatspi2.0-0t64 libxcomposite1 libxdamage1 libxrandr2 libgbm1
 *   # Without root: cd .integration/browser && mkdir -p syslibs/debs && cd syslibs/debs && apt-get download <those> libxi6
 *   #   && cd .. && for d in debs/*.deb; do dpkg -x $d root; done   (picked up automatically, see launchEnv below)
 *   # check with: find ~/.cache/ms-playwright -name chrome-headless-shell -type f | xargs ldd | grep 'not found'
 * Run:
 *   npm run build && npm run play:random -- --minutes 10 --scene both --seed 1
 *   npm run play:random -- --self-test        # plants a page error, expects it to be caught + saved
 * Flags: --minutes N (per scene, default 10) --scene on|off|both (default both) --seed N|0xHEX (default 1)
 *        --out DIR (default .integration/random-play/<timestamp>) --dist DIR (default dist)
 *        --no-replay-stats (skip the offline engine replay that counts battles) --headed
 * The browser-side input is wall-clock timed, so a run is not bit-reproducible; the saved session JSON is
 * (tools/replay-session-trace.ts). Battles reached are derived by replaying the session traces in node.
 */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { KEY_FOR_BUTTON, createInputGenerator, parseSeed, presentationSeedHex } from "./randomPlayInput.ts";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
};

function parseArgs(argv) {
  const options = { minutes: 10, scene: "both", seed: 1, out: null, dist: "dist", selfTest: false, replayStats: true, headed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const v = argv[(i += 1)];
      if (v === undefined) throw new Error(`${arg} needs a value`);
      return v;
    };
    if (arg === "--minutes") options.minutes = Number(value());
    else if (arg === "--scene") options.scene = value();
    else if (arg === "--seed") options.seed = parseSeed(value());
    else if (arg === "--out") options.out = value();
    else if (arg === "--dist") options.dist = value();
    else if (arg === "--self-test") options.selfTest = true;
    else if (arg === "--no-replay-stats") options.replayStats = false;
    else if (arg === "--headed") options.headed = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!(options.minutes > 0)) throw new Error("--minutes must be > 0");
  if (!["on", "off", "both"].includes(options.scene)) throw new Error("--scene must be on|off|both");
  if (options.selfTest && !argvHas(argv, "--minutes")) options.minutes = 0.25;
  if (options.selfTest && !argvHas(argv, "--scene")) options.scene = "on";
  return options;
}
const argvHas = (argv, flag) => argv.includes(flag);

/** Static server for dist/; port 0 = a free localhost port. */
export function serveDist(distDir) {
  const root = resolve(distDir);
  if (!existsSync(join(root, "index.html"))) throw new Error(`${root}/index.html missing -- run npm run build first`);
  const server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      let file = normalize(join(root, pathname === "/" ? "index.html" : pathname));
      if (file !== root && !file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!existsSync(file)) {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
      response.end(readFileSync(file));
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveServer({ server, port: server.address().port }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const POLL_MS = 1000;
const STALL_POLLS = 8;

async function pollPage(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="game-surface"]');
    let hash = 0;
    if (canvas) {
      const data = canvas.getContext("2d").getImageData(0, 0, 240, 160).data;
      for (let i = 0; i < data.length; i += 4) hash = (Math.imul(hash, 31) + (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16))) | 0;
    }
    const session = typeof window.__POKEBENCH_SESSION__ === "function" ? window.__POKEBENCH_SESSION__() : null;
    return {
      overlay: !!document.querySelector('[data-testid="crash-overlay"]'),
      frame: session ? session.frame : null,
      contained: session ? (session.containedErrors ?? []).length : 0,
      hash,
    };
  });
}

async function runScene(browser, port, scene, options, outDir, log) {
  const result = {
    scene,
    wallMs: 0,
    frames: 0,
    reloads: 0,
    pageErrors: [],
    consoleErrors: [],
    containedErrors: [],
    overlays: 0,
    saved: [],
    traces: [],
    plantedCaught: false,
  };
  const generator = createInputGenerator(options.seed);
  const url = `http://127.0.0.1:${port}/?battleScene=${scene}&presentationSeed=${presentationSeedHex(options.seed)}`;
  let page = null;
  let incidents = [];

  const open = async () => {
    page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    page.on("pageerror", (error) => incidents.push({ kind: "pageerror", text: String(error?.stack ?? error) }));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      // main.ts logs contained throws and the crash overlay itself; they are counted from the session trace/overlay.
      if (text.startsWith("POKEBENCH contained presentation error") || text.startsWith("POKEBENCH CRASH")) return;
      result.consoleErrors.push(text.slice(0, 500));
    });
    await page.goto(url, { waitUntil: "load", timeout: 120_000 });
    await page.waitForFunction(() => typeof window.__POKEBENCH_SESSION__ === "function", null, { timeout: 60_000 });
    await page.locator('[data-testid="game-surface"]').click({ position: { x: 5, y: 5 } }).catch(() => {});
  };

  const harvest = async () => {
    const trace = await page.evaluate(() => window.__POKEBENCH_SESSION__()).catch(() => null);
    if (trace) {
      result.traces.push(trace);
      result.frames += trace.frame;
    }
    return trace;
  };

  const saveIncident = async (kind, detail, trace) => {
    const base = join(outDir, `${scene}-${String(result.saved.length + 1).padStart(2, "0")}-${kind}`);
    const files = [];
    try {
      writeFileSync(`${base}.session.json`, JSON.stringify({ kind, detail, url, session: trace }, null, 2) + "\n");
      files.push(`${base}.session.json`);
    } catch (error) {
      log(`  could not write session: ${error}`);
    }
    try {
      await page.screenshot({ path: `${base}.png` });
      files.push(`${base}.png`);
    } catch (error) {
      log(`  could not take screenshot: ${error}`);
    }
    result.saved.push(...files);
    log(`  [${scene}] ${kind}: ${String(detail).split("\n")[0].slice(0, 160)} -> ${files.join(", ")}`);
  };

  const reload = async () => {
    await page.close().catch(() => {});
    result.reloads += 1;
    incidents = [];
    await open();
  };

  await open();
  const start = Date.now();
  const deadline = start + options.minutes * 60_000;
  let nextPoll = start + POLL_MS;
  let lastHash = null;
  let unchangedPolls = 0;
  let containedSeen = 0;
  let planted = false;

  while (Date.now() < deadline) {
    if (options.selfTest && !planted && Date.now() - start > Math.min(3000, options.minutes * 20_000)) {
      planted = true;
      await page.evaluate(() => {
        setTimeout(() => {
          throw new Error("planted");
        }, 0);
      });
    }
    const input = generator.next(unchangedPolls >= STALL_POLLS);
    const key = KEY_FOR_BUTTON[input.button];
    await page.keyboard.down(key);
    await sleep(input.holdMs);
    await page.keyboard.up(key);
    await sleep(input.gapMs);

    if (Date.now() < nextPoll && incidents.length === 0) continue;
    nextPoll = Date.now() + POLL_MS;
    let snapshot;
    try {
      snapshot = await pollPage(page);
    } catch (error) {
      incidents.push({ kind: "pageerror", text: `poll failed (page gone?): ${error}` });
      snapshot = { overlay: false, contained: containedSeen, hash: lastHash };
    }
    unchangedPolls = snapshot.hash === lastHash ? unchangedPolls + 1 : 0;
    lastHash = snapshot.hash;

    if (snapshot.contained > containedSeen) {
      const trace = await page.evaluate(() => window.__POKEBENCH_SESSION__()).catch(() => null);
      for (const entry of (trace?.containedErrors ?? []).slice(containedSeen)) result.containedErrors.push(entry);
      containedSeen = snapshot.contained;
      await saveIncident("contained", JSON.stringify(trace?.containedErrors?.[snapshot.contained - 1] ?? {}).slice(0, 300), trace);
    }
    if (snapshot.overlay || incidents.length > 0) {
      const trace = await page.evaluate(() => window.__POKEBENCH_SESSION__()).catch(() => null);
      if (snapshot.overlay) {
        result.overlays += 1;
        // The overlay's own textarea holds the crash trace WITH the error (the live session export has none).
        const overlayTrace = await page.evaluate(() => {
          const text = document.querySelector('[data-testid="crash-overlay"] textarea')?.value;
          try { return text ? JSON.parse(text) : null; } catch { return null; }
        }).catch(() => null);
        const crash = overlayTrace ?? trace;
        const message = crash?.error ? (typeof crash.error === "string" ? crash.error : `${crash.error.name ?? "Error"}: ${crash.error.message ?? JSON.stringify(crash.error)}`) : "crash overlay";
        result.overlayMessages = [...(result.overlayMessages ?? []), message];
        await saveIncident("overlay", message, crash);
      }
      for (const incident of incidents) {
        result.pageErrors.push(incident.text);
        if (options.selfTest && incident.text.includes("planted")) result.plantedCaught = true;
        await saveIncident(incident.kind, incident.text, trace);
      }
      await harvest();
      await reload();
      containedSeen = 0;
      lastHash = null;
      unchangedPolls = 0;
    }
  }
  await harvest();
  await page.close().catch(() => {});
  result.wallMs = Date.now() - start;
  return result;
}

/** Replay the recorded browser sessions headlessly to count battles; null when the engine cannot be loaded. */
export async function replayStats(traces, scene, log) {
  let core;
  let rngHost;
  let inputMod;
  try {
    core = await import(pathToFileURL(resolve("src/engine/core.ts")).href);
    rngHost = await import(pathToFileURL(resolve("src/engine/presentationRngHost.ts")).href);
    inputMod = await import(pathToFileURL(resolve("src/input.ts")).href);
  } catch (error) {
    log(`  replay stats unavailable: ${String(error).split("\n")[0]}`);
    return null;
  }
  const stats = { battleRoomEntries: 0, orchestratorBattles: 0, maxWinStreak: 0, replayThrows: 0, frames: 0 };
  for (const trace of traces) {
    const rng = rngHost.presentationRngFromTrace(trace);
    let state = core.createInitialState({ battleScene: scene, presentationSeed: rng.seed, presentationRngPolicy: rng.policy });
    let battleRoom = false;
    let battle = false;
    try {
      for (const segment of trace.segments) {
        const buttons = new Set(inputMod.normalizeButtons(segment.buttons ?? []));
        for (let i = 0; i < segment.frames; i += 1) {
          state = core.tick(state, buttons);
          stats.frames += 1;
          const inRoom = state.battleRoom !== null;
          const inBattle = state.factoryRoundBattleOrchestrator?.battle != null;
          if (inRoom && !battleRoom) stats.battleRoomEntries += 1;
          if (inBattle && !battle) stats.orchestratorBattles += 1;
          battleRoom = inRoom;
          battle = inBattle;
        }
      }
    } catch (error) {
      stats.replayThrows += 1;
      log(`  replay of a ${scene} session threw in node at frame ${stats.frames}: ${String(error).split("\n")[0]}`);
    }
    stats.maxWinStreak = Math.max(stats.maxWinStreak, state.factoryCarry?.factoryWinStreak ?? 0);
  }
  return stats;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = resolve(options.out ?? join(".integration", "random-play", stamp));
  mkdirSync(outDir, { recursive: true });
  const log = (line) => console.log(line);
  const playwrightPath = resolve(".integration/browser/node_modules/playwright/index.mjs");
  if (!existsSync(playwrightPath)) throw new Error(`playwright missing at ${playwrightPath}; see the install steps in this file's header`);
  const { chromium } = await import(pathToFileURL(playwrightPath).href);
  const { server, port } = await serveDist(options.dist);
  const manifest = existsSync(join(options.dist, "build.json")) ? JSON.parse(readFileSync(join(options.dist, "build.json"), "utf8")) : null;
  log(`random play: dist=${options.dist} port=${port} seed=${options.seed} minutes/scene=${options.minutes} scenes=${options.scene} out=${outDir}`);
  if (manifest) log(`build: ${manifest.build ?? manifest.commit ?? JSON.stringify(manifest).slice(0, 80)}`);
  const scenes = options.scene === "both" ? ["on", "off"] : [options.scene];
  // Hosts without root (CAX31): system libraries unpacked from their .debs into .integration/browser/syslibs/root
  // (apt-get download <pkgs> && dpkg -x <deb> root) are put on the browser's library path automatically.
  const syslibs = resolve(".integration/browser/syslibs/root/usr/lib/aarch64-linux-gnu");
  const launchEnv = existsSync(syslibs)
    ? { ...process.env, LD_LIBRARY_PATH: [syslibs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":") }
    : undefined;
  const browser = await chromium.launch({ headless: !options.headed, ...(launchEnv ? { env: launchEnv } : {}) });
  const results = [];
  try {
    for (const scene of scenes) {
      log(`-- scene ${scene}: ${options.minutes} min`);
      const result = await runScene(browser, port, scene, options, outDir, log);
      result.replay = options.replayStats ? await replayStats(result.traces, scene, log) : null;
      results.push(result);
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }

  log("\n=== random play summary ===");
  let failed = false;
  for (const r of results) {
    const fps = r.wallMs > 0 ? (r.frames / (r.wallMs / 1000)).toFixed(1) : "n/a";
    log(
      `scene ${r.scene}: ${(r.wallMs / 60_000).toFixed(2)} min, frames ${r.frames} (${fps}/s), reloads ${r.reloads}, ` +
        `pageerrors ${r.pageErrors.length}, console errors ${r.consoleErrors.length}, contained ${r.containedErrors.length}, overlays ${r.overlays}` +
        (r.replay
          ? `, battle-room entries ${r.replay.battleRoomEntries}, orchestrator battles ${r.replay.orchestratorBattles}, max win streak ${r.replay.maxWinStreak}` +
            (r.replay.replayThrows ? `, REPLAY THROWS ${r.replay.replayThrows}` : "")
          : ", battles n/a"),
    );
    for (const text of r.pageErrors) log(`  pageerror: ${text.split("\n")[0]}`);
    for (const text of r.overlayMessages ?? []) log(`  overlay: ${text.split("\n")[0]}`);
    for (const text of [...new Set(r.consoleErrors)].slice(0, 10)) log(`  console.error: ${text.split("\n")[0]}`);
    for (const entry of r.containedErrors.slice(0, 10)) log(`  contained: ${JSON.stringify(entry).slice(0, 200)}`);
    for (const file of r.saved) log(`  saved: ${file}`);
    if (options.selfTest) {
      if (!r.plantedCaught || !r.saved.some((f) => f.endsWith(".session.json"))) {
        failed = true;
        log("  SELF-TEST FAILED: planted page error was not caught and saved");
      } else log("  self-test: planted page error caught and saved");
    } else if (r.pageErrors.length > 0 || r.overlays > 0) failed = true;
  }
  const digest = createHash("sha256").update(JSON.stringify(results.map((r) => [r.scene, r.frames, r.pageErrors.length, r.overlays]))).digest("hex").slice(0, 12);
  writeFileSync(
    join(outDir, "summary.json"),
    JSON.stringify(results.map(({ traces: _traces, ...rest }) => rest), null, 2) + "\n",
  );
  log(`summary.json -> ${join(outDir, "summary.json")} (${digest})`);
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`randomPlay: ${error?.stack ?? error}`);
    process.exit(2);
  });
}
