/**
 * dl3 real-time check of the per-species battle pictures (docs/dl3-per-species-pictures.md). `play:random` drives the `?pokebench=1`
 * bench ABI, which reads the full tables; this loads the BUILT page WITHOUT it, so the library's own rAF loop, the picture files and the hold
 * are what run. A node mirror replays the page's exported session trace and plays the soak's "winning" policy through real key events.
 * Reports the picture files the page fetched (and when), page / console errors, contained errors, and how many canvas samples were one flat colour (screen fades; informational).
 *   npm run build && node --experimental-strip-types tools/browser/dl3Pictures.mjs --seconds 120 [--scene on|off] [--seed N]
 * Needs the git-ignored Playwright install (header of randomPlay.mjs).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { FactorySession } from "../../src/factorySession.ts";
import { ActionLog, RandomPlayer, Rng } from "../soak/randomRoundSoakDriver.ts";
import { serveDist } from "./randomPlay.mjs";
import { KEY_FOR_BUTTON, presentationSeedHex } from "./randomPlayInput.ts";

const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const seconds = Number(flag("seconds", "120"));
const scene = flag("scene", "on");
const seed = Number(flag("seed", "1"));

const playwrightPath = resolve(".integration/browser/node_modules/playwright/index.mjs");
if (!existsSync(playwrightPath)) throw new Error(`playwright missing at ${playwrightPath}`);
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const syslibs = resolve(".integration/browser/syslibs/root/usr/lib/aarch64-linux-gnu");
const env = existsSync(syslibs) ? { ...process.env, LD_LIBRARY_PATH: [syslibs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":") } : undefined;
const { server, port } = await serveDist("dist");
const browser = await chromium.launch({ headless: true, ...(env ? { env } : {}) });
const page = await browser.newPage();
const started = Date.now();
const problems = [];
const files = [];
let bytes = 0;
let animBytes = 0;
page.on("pageerror", (error) => problems.push(`pageerror: ${String(error).split("\n")[0]}`));
page.on("console", (message) => message.type() === "error" && problems.push(`console.error: ${message.text().split("\n")[0]}`));
page.on("response", async (response) => {
  const url = new URL(response.url());
  if (!url.pathname.includes("/sprites/")) return;
  const anim = url.pathname.includes("/sprites/anim/");
  files.push({ file: url.pathname.split("/").pop(), at: Date.now() - started, status: response.status(), anim });
  const size = (await response.body().catch(() => Buffer.alloc(0))).length;
  if (anim) animBytes += size;
  else bytes += size;
});
await page.goto(`http://127.0.0.1:${port}/?battleScene=${scene}&presentationSeed=${presentationSeedHex(seed)}`);
await page.waitForFunction(() => typeof window.__POKEBENCH_SESSION__ === "function", null, { timeout: 30_000 });
const firstFrameAt = Date.now() - started;
const filesAtFirstFrame = files.length;

const mirror = new FactorySession({ battleScene: scene, presentationSeed: seed, challengeRequest: "continue" });
const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning");
const down = new Set();
let mirrored = 0;
let battles = 0;
let lastRound = null;
let blank = 0;
let samples = 0;
const deadline = Date.now() + seconds * 1000;
while (Date.now() < deadline) {
  const trace = await page.evaluate(() => window.__POKEBENCH_SESSION__());
  let skip = mirrored;
  for (const segment of trace.segments) {
    for (let at = 0; at < segment.frames; at += 1) {
      if (skip > 0) {
        skip -= 1;
        continue;
      }
      mirror.replayStep(new Set(segment.buttons));
      mirrored += 1;
    }
  }
  const orchestrator = mirror.state.factoryRoundBattleOrchestrator;
  const roundId = orchestrator?.config?.id ?? null;
  if (roundId !== null && roundId !== lastRound) battles += 1;
  lastRound = roundId;
  const wanted = player.decide(mirror.state);
  for (const button of [...down]) {
    if (!wanted.has(button)) {
      await page.keyboard.up(KEY_FOR_BUTTON[button]);
      down.delete(button);
    }
  }
  for (const button of wanted) {
    if (!down.has(button) && KEY_FOR_BUTTON[button]) {
      await page.keyboard.down(KEY_FOR_BUTTON[button]);
      down.add(button);
    }
  }
  const painted = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const first = data[0] | (data[1] << 8) | (data[2] << 16);
    for (let i = 4; i < data.length; i += 4) if ((data[i] | (data[i + 1] << 8) | (data[i + 2] << 16)) !== first) return true;
    return false;
  });
  samples += 1;
  if (!painted) blank += 1;
  await page.waitForTimeout(40);
}
const final = await page.evaluate(() => window.__POKEBENCH_SESSION__());
await browser.close();
server.close();
const failed = files.filter((entry) => entry.status !== 200);
const animNames = new Set(files.filter((entry) => entry.anim).map((entry) => entry.file));
const names = new Set(files.filter((entry) => !entry.anim).map((entry) => entry.file));
const containedErrors = final.containedErrors ?? [];
console.log(
  `dl3 real-time (${scene}, seed ${seed}, ${seconds}s): page frames ${final.frame}, mirror frames ${mirrored}, rounds built ${battles}, picture files ${names.size} ` +
    `animation asset files ${animNames.size} (${(animBytes / 1024).toFixed(1)} KiB raw), ` +
    `(${files.length} responses, ${(bytes / 1024).toFixed(1)} KiB raw; ${filesAtFirstFrame} before the first frame at ${firstFrameAt} ms), failed ${failed.length}, ` +
    `uniform-colour canvas samples (fades) ${blank}/${samples}, contained errors ${containedErrors.length}, page/console errors ${problems.length}`,
);
for (const line of [...new Set(problems)].slice(0, 10)) console.log(`  ${line}`);
console.log(`  files: ${[...names].join(" ")}`);
console.log(`  anim files: ${[...animNames].join(" ")}`);
if (scene === "on" && animNames.size === 0) {
  console.log("  no animation asset file was loaded under Scene ON");
  process.exit(1);
}
process.exit(problems.length > 0 || failed.length > 0 || containedErrors.length > 0 ? 1 : 0);
