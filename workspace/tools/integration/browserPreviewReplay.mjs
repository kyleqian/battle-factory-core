/** Run ordinary recorded input through the shipped browser's public bench ABI. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [url, evidencePath, outputDir = ".integration/browser-evidence"] = process.argv.slice(2);
if (!url || !evidencePath) throw new Error("usage: browserPreviewReplay.mjs <preview-url> <evidence.json> [output-dir]");
const { chromium } = await import(pathToFileURL(resolve(".integration/browser/node_modules/playwright/index.mjs")).href);
const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
const trace = evidence.trace;
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  // Hold browser time fixed; every engine step comes from the public input ABI.
  await page.clock.install({ time: new Date("2026-09-23T00:00:00Z") });
  const benchUrl = new URL(url);
  benchUrl.searchParams.set("pokebench", "1");
  benchUrl.searchParams.set("battleScene", trace.battleScene);
  await page.goto(benchUrl.toString(), { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => typeof window.__POKEBENCH__?.advance === "function");
  const prefix = (frames) => {
    const result = [];
    for (const segment of trace.segments) {
      if (frames === 0) break;
      const count = Math.min(frames, segment.frames);
      result.push({ ...segment, frames: count });
      frames -= count;
    }
    assert.equal(frames, 0, "trace covers requested sample");
    return result;
  };
  const samples = [];
  for (const sample of [...evidence.samples, { frame: trace.frame, sha256: evidence.finalSha256, label: "command-prompt" }]) {
    const result = await page.evaluate((segments) => {
      window.__POKEBENCH__.reset();
      window.__POKEBENCH__.advance(segments);
      const canvas = document.querySelector('[data-testid="game-surface"]');
      return {
        trace: window.__POKEBENCH_SESSION__(),
        pixels: Array.from(canvas.getContext("2d").getImageData(0, 0, 240, 160).data),
        crash: !!document.querySelector('[data-testid="crash-overlay"]'),
      };
    }, prefix(sample.frame));
    const sha256 = createHash("sha256").update(Buffer.from(result.pixels)).digest("hex");
    assert.equal(sha256, sample.sha256, sample.label + " browser/engine pixels");
    assert.equal(result.trace.build, evidence.build, "served revision matches expected build");
    assert.equal(result.trace.battleScene, trace.battleScene);
    assert.equal(result.trace.frame, sample.frame);
    assert.equal(result.crash, false);
    const image = resolve(outputDir, sample.label + ".png");
    await page.locator('[data-testid="game-surface"]').screenshot({ path: image });
    samples.push({ ...sample, browserSha256: sha256, image });
    if (sample.label === "command-prompt") {
      assert.deepEqual(result.trace.segments, trace.segments, "browser export preserves full input");
      writeFileSync(resolve(outputDir, "session.json"), JSON.stringify(result.trace, null, 2) + "\n");
    }
  }
  assert.deepEqual(errors, []);
  const normal = new URL(url);
  normal.searchParams.delete("pokebench");
  normal.searchParams.delete("battleScene");
  await page.goto(normal.toString(), { waitUntil: "networkidle" });
  assert.equal(await page.locator('[data-testid="build-stamp"]').innerText(), "build " + evidence.build);
  await page.getByRole("link", { name: "Battle Scene ON · restart with OFF" }).click();
  await page.waitForURL(/battleScene=off/);
  assert.equal(await page.evaluate(() => window.__POKEBENCH_SESSION__().battleScene), "off");
  assert.deepEqual(errors, []);
  writeFileSync(resolve(outputDir, "receipt.json"), JSON.stringify({ url, build: evidence.build, samples, errors, modeControl: "passed", sessionExport: "passed" }, null, 2) + "\n");
  console.log(JSON.stringify({ build: evidence.build, samples: samples.length, modeControl: "passed", sessionExport: "passed" }));
} finally {
  await browser.close();
}
