// sfa2 (docs/sfa2-summary-front-animations.md): the summary front-sprite animation of every Battle Frontier species, ROM against ours.
//
//   node --experimental-strip-types --no-warnings tools/probe/sfa2SummaryFrontAnim.mjs plan PLAN.json
//   python3 tools/run-mgba-probe.py ROMDIR/done.json -- python3 tools/probe/sfa2-summary-front-anim-rom.py PLAN.json ROMDIR
//   node --experimental-strip-types --no-warnings tools/probe/sfa2SummaryFrontAnim.mjs engine PLAN.json ROMDIR OUTDIR [--game WORKSPACE]
//   node --experimental-strip-types --no-warnings tools/probe/sfa2SummaryFrontAnim.mjs compare PLAN.json ROMDIR OUTDIR
//   node --experimental-strip-types --no-warnings tools/probe/sfa2SummaryFrontAnim.mjs states PLAN.json ROMDIR OUTDIR [--game WORKSPACE]
//   node --experimental-strip-types --no-warnings tools/probe/sfa2SummaryFrontAnim.mjs pixels PLAN.json ROMDIR OUTDIR
//   node --experimental-strip-types --no-warnings tools/probe/sfa2SummaryFrontAnim.mjs fixture PLAN.json ROMDIR tests/fixtures/sfa2-summary-front-anim-rom.json
//
// (docs/sfa2-summary-front-animations.md) states: the sprite state per picture from dispatch against summaryFrontSpritePresentation;
// pixels: the Info page renderer against the ROM's crops; fixture: the test fixture from the receipts.
//
// plan: 63 batches of six rentals (each species' first Battle Frontier set; personality = nature + 25 with OT id 0, so never shiny;
// ability bit = personality & 1). Batch b's first rental opens the summary (the initial path): batches 0..61 open on a different motion
// type each, so every motion type is seen on the initial path, the rest on the replacement path. The ROM side presses DOWN once a
// rental's animation has ended.
// engine: replays each batch on FactorySession (start "draft", the six rentals put into draftScreen.rentals) with the ROM's presses at the
// ROM's frame offsets (frame 0 = the SUMMARY A on both), and writes per frame the crop hash (x 0..111, y 0..127, as the ROM side) and the
// presentation the Info renderer used (summaryFrontSpritePresentation at the session's mon clock).
// compare: per batch and rental, the frames where the ROM's crop and ours differ (whole session, so the dispatch lag shows here).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args[i + 1]; };
const GAME = path.resolve(opt("--game", path.resolve(here, "../..")));
const [cmd, planPath, romDir, outDir] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const CROP_W = 112, CROP_H = 128;
const OT_ID = 0;

const frontier = JSON.parse(fs.readFileSync(path.join(GAME, "src/data/gen/battle-frontier-mons.json"), "utf8"));
const natures = JSON.parse(fs.readFileSync(path.join(GAME, "src/data/gen/natures.json"), "utf8"));
const anim = JSON.parse(fs.readFileSync(path.join(GAME, "src/data/gen/summary-front-animation.json"), "utf8"));

function plan() {
  const natureIndex = new Map(natures.natures.map((n) => [n.name, n.index]));
  const firstSet = new Map();
  frontier.entries.forEach((e, setId) => { if (!firstSet.has(e.species)) firstSet.set(e.species, setId); });
  const byType = new Map();
  for (const e of anim.species) {
    if (!byType.has(e.motion.type)) byType.set(e.motion.type, []);
    byType.get(e.motion.type).push(e.species);
  }
  const rental = (species) => {
    const setId = firstSet.get(species);
    const personality = natureIndex.get(frontier.entries[setId].nature) + 25;
    return { species, setId, personality, otId: OT_ID, fixedIv: 3, abilitySlot: personality & 1 };
  };
  const openers = [...byType.values()].map((list) => list[0]);
  const rest = anim.species.map((e) => e.species).filter((sp) => !openers.includes(sp));
  const batches = [];
  for (const opener of openers) batches.push([opener]);
  let b = 0;
  for (const sp of rest) {
    while (batches[b].length >= 6) { b += 1; if (b >= batches.length) batches.push([]); }
    batches[b].push(sp);
  }
  // pad the last batch with already-planned species (the select screen needs six)
  const pad = anim.species.map((e) => e.species);
  for (const batch of batches) for (let k = 0; batch.length < 6; k += 1) batch.push(pad[k]);
  const out = { schema: "sfa2-plan/v1", profile: "off", batches: batches.map((list) => ({ rentals: list.map(rental) })) };
  fs.writeFileSync(planPath, JSON.stringify(out, null, 1));
  console.log(`${out.batches.length} batches, ${byType.size} motion types`);
}

function crop(px) {
  const out = Buffer.alloc(CROP_W * CROP_H * 3);
  for (let y = 0; y < CROP_H; y += 1) {
    for (let x = 0; x < CROP_W; x += 1) {
      const p = (y * 240 + x) * 4, q = (y * CROP_W + x) * 3;
      out[q] = px[p]; out[q + 1] = px[p + 1]; out[q + 2] = px[p + 2];
    }
  }
  return out;
}

async function engine() {
  globalThis.__POKEBENCH_PLAYER_NAME__ = process.env.POKEBENCH_HARNESS_PLAYER_NAME ?? "MEMORY";
  const { FactorySession } = await import(`${GAME}/src/factorySession.ts`);
  const { render } = await import(`${GAME}/src/engine/core.ts`);
  const { installBundledMonPicPixels } = await import(`${GAME}/src/engine/monPicPixelsInstall.ts`);
  const { createFactoryRentalPresentation } = await import(`${GAME}/src/engine/factoryRentalPresentation.ts`);
  const sfa = await import(`${GAME}/src/engine/summaryFrontAnimation.ts`);
  installBundledMonPicPixels();
  const p = JSON.parse(fs.readFileSync(planPath, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });
  const cropsFd = fs.openSync(path.join(outDir, "crops.bin"), "w");
  const index = []; const ids = new Map(); let offset = 0;
  for (let bi = 0; bi < p.batches.length; bi += 1) {
    const romPath = path.join(romDir, `batch-${String(bi).padStart(2, "0")}.json`);
    if (!fs.existsSync(romPath)) continue;
    const rom = JSON.parse(fs.readFileSync(romPath, "utf8"));
    const session = new FactorySession({ battleScene: "off", gameplaySeed: 1, presentationSeed: 1, start: "draft", challengeRequest: "hold" });
    const rentals = p.batches[bi].rentals.map((r) => createFactoryRentalPresentation({
      setId: r.setId, personality: r.personality, fixedIv: r.fixedIv, abilitySlot: r.abilitySlot, otId: r.otId,
    }));
    session.state = { ...session.state, draftScreen: { ...session.state.draftScreen, rentals } };
    const tick = (buttons) => session.tick(new Set(buttons));
    const mode = () => session.state.draftScreen.mode;
    for (let i = 0; i < 20; i += 1) tick([]);
    tick(["A"]);
    let waited = 0;
    while (mode() !== "menu" || waited < 60) { tick([]); waited += 1; if (waited > 400) throw new Error(`batch ${bi}: no draft menu`); }
    const presses = new Map(rom.presses.map((q) => [q.j, q.button]));
    const last = rom.frames.length;
    const frames = [];
    for (let j = 0; j < last; j += 1) {
      const b = presses.get(j);
      tick(b ? [b] : []);
      const px = render(session.state);
      const c = crop(px);
      const h = crypto.createHash("sha1").update(c).digest("hex");
      let id = ids.get(h);
      if (id === undefined) {
        const z = zlib.deflateSync(c, { level: 6 });
        fs.writeSync(cropsFd, z); index.push([h, offset, z.length]); offset += z.length;
        id = index.length - 1; ids.set(h, id);
      }
      const summary = session.state.summaryScreen;
      const rec = { j, h, crop: id };
      if (summary?.isOpen || summary?.monTransition) {
        const clock = summary.monAnimClock ?? summary.openElapsed + 1;
        const replacement = summary.monAnimClock !== null;
        const slot = summary.monTransition ? null : summary.selectedSlot;
        rec.slot = slot;
        rec.clock = clock;
        rec.replacement = replacement;
        if (slot !== null) rec.pres = sfa.summaryFrontSpritePresentation(rentals[slot].frontPicSpecies, clock, replacement);
      }
      frames.push(rec);
    }
    fs.writeFileSync(path.join(outDir, `batch-${String(bi).padStart(2, "0")}.json`), JSON.stringify({ batch: bi, frames }));
    console.log(`batch ${bi}: ${frames.length} frames`);
  }
  fs.closeSync(cropsFd);
  fs.writeFileSync(path.join(outDir, "crops.idx.json"), JSON.stringify(index));
}

function compare() {
  const p = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const romIdx = JSON.parse(fs.readFileSync(path.join(romDir, "crops.idx.json"), "utf8"));
  const rows = [];
  for (let bi = 0; bi < p.batches.length; bi += 1) {
    const name = `batch-${String(bi).padStart(2, "0")}.json`;
    if (!fs.existsSync(path.join(romDir, name)) || !fs.existsSync(path.join(outDir, name))) continue;
    const rom = JSON.parse(fs.readFileSync(path.join(romDir, name), "utf8"));
    const eng = JSON.parse(fs.readFileSync(path.join(outDir, name), "utf8"));
    const starts = [0, ...rom.presses.filter((q) => q.button === "DOWN").map((q) => q.j), rom.frames.length];
    for (let slot = 0; slot < 6; slot += 1) {
      const from = starts[slot], to = starts[slot + 1];
      const diff = [];
      for (let j = from; j < to; j += 1) if (romIdx[rom.frames[j].crop][0] !== eng.frames[j]?.h) diff.push(j);
      const r = p.batches[bi].rentals[slot];
      const type = anim.species.find((e) => e.species === r.species).motion.type;
      rows.push({ batch: bi, slot, species: r.species, type, path: slot === 0 ? "initial" : "replacement", frames: to - from, differ: diff.length, first: diff[0] ?? null, diff });
    }
  }
  fs.writeFileSync(path.join(outDir, "compare.json"), JSON.stringify(rows, null, 1));
  const byType = new Map();
  for (const r of rows) {
    const t = byType.get(r.type) ?? { species: 0, exact: 0, frames: 0, differ: 0 };
    t.species += 1; t.exact += r.differ === 0 ? 1 : 0; t.frames += r.frames; t.differ += r.differ;
    byType.set(r.type, t);
  }
  const lines = [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([t, v]) => `${t.padEnd(40)} ${v.exact}/${v.species} exact, ${v.differ}/${v.frames} frames differ`);
  fs.writeFileSync(path.join(outDir, "compare.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  console.log(`rentals exact: ${rows.filter((r) => r.differ === 0).length}/${rows.length}`);
}

// The ROM's picture j shows the sprite state recorded after frame j - 1 (the hardware OAM read after frame j is that state's OAM).
// elapsed e of our clock is the picture dispatch + e, dispatch being the frame SpriteCB_Pokemon left for the motion (or the delay
// task's dummy callback). Compared per picture: x2, y2, the affine matrix (null when not in affine mode), the frame program's
// image, invisibility and the 16 blended colours (BGR555).
function romVisible(frames, j, lastImage) {
  const m = frames[j - 1]?.mon;
  if (!m || m.cb === undefined) return null;
  let image = m.imageValue;
  if (image === undefined || image >= 0xfff0) image = lastImage;
  return {
    x2: m.x2, y2: m.y2,
    matrix: (m.attr[0] & 0x100) ? m.matrix : null,
    frame: image,
    invisible: (m.flags & 4) !== 0,
    blended: m.blended ?? null,
  };
}

/** The first frame of slot's sprite whose callback is no longer SpriteCB_Pokemon (the motion, or the delay task's dummy). */
function dispatchFrame(fr, from, to, slot) {
  let seen = false;
  for (let j = from; j < to; j += 1) {
    const m = fr[j].mon;
    if (!m || m.curMon !== slot || m.cb === undefined) continue;
    if (m.cb === "SpriteCB_Pokemon") { seen = true; continue; }
    if (seen) return j;
  }
  return null;
}

// pixels: the Info page renderer at our clock (start + e) against the ROM's picture dispatch + e, over the crop, from e = 1 to the
// rental's last recorded frame. This checks the renderer (double-size affine box, matrix, flip, blend) as well as the state.
async function pixels() {
  globalThis.__POKEBENCH_PLAYER_NAME__ = process.env.POKEBENCH_HARNESS_PLAYER_NAME ?? "MEMORY";
  const sfa = await import(`${GAME}/src/engine/summaryFrontAnimation.ts`);
  const { renderSummaryInfoPage } = await import(`${GAME}/src/engine/summaryInfoPage.ts`);
  const { installBundledMonPicPixels } = await import(`${GAME}/src/engine/monPicPixelsInstall.ts`);
  const { createFactoryRentalPresentation } = await import(`${GAME}/src/engine/factoryRentalPresentation.ts`);
  installBundledMonPicPixels();
  const p = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const romIdx = JSON.parse(fs.readFileSync(path.join(romDir, "crops.idx.json"), "utf8"));
  const romBin = fs.readFileSync(path.join(romDir, "crops.bin"));
  const romCrop = (id) => zlib.inflateSync(romBin.subarray(romIdx[id][1], romIdx[id][1] + romIdx[id][2]));
  const rows = [];
  fs.mkdirSync(outDir, { recursive: true });
  for (let bi = 0; bi < p.batches.length; bi += 1) {
    const name = `batch-${String(bi).padStart(2, "0")}.json`;
    if (!fs.existsSync(path.join(romDir, name))) continue;
    const rom = JSON.parse(fs.readFileSync(path.join(romDir, name), "utf8"));
    const fr = rom.frames;
    const starts = [0, ...rom.presses.filter((q) => q.button === "DOWN").map((q) => q.j), fr.length];
    const rentals = p.batches[bi].rentals.map((r) => createFactoryRentalPresentation({
      setId: r.setId, personality: r.personality, fixedIv: r.fixedIv, abilitySlot: r.abilitySlot, otId: r.otId,
    }));
    for (let slot = 0; slot < 6; slot += 1) {
      const species = p.batches[bi].rentals[slot].species.replace("SPECIES_", "");
      const D = dispatchFrame(fr, starts[slot], starts[slot + 1], slot);
      if (D === null) { rows.push({ batch: bi, slot, species, error: "no dispatch" }); continue; }
      const replacement = slot !== 0;
      const start = replacement ? sfa.SUMMARY_REPLACEMENT_MON_ANIMATION_START : sfa.SUMMARY_INITIAL_MON_ANIMATION_START;
      const diff = [];
      let frames = 0;
      for (let e = 1; D + e < starts[slot + 1] + (slot === 5 ? 0 : 1); e += 1) {
        const ours = crop(renderSummaryInfoPage(rentals, slot, start + e, replacement));
        frames += 1;
        if (!ours.equals(romCrop(fr[D + e].crop))) diff.push(e);
      }
      const type = anim.species.find((x) => x.species === `SPECIES_${species}`).motion.type;
      rows.push({ batch: bi, slot, species, type, dispatch: D, frames, differ: diff.length, diff: diff.slice(0, 20) });
    }
    process.stdout.write(".");
  }
  console.log();
  fs.writeFileSync(path.join(outDir, "pixels.json"), JSON.stringify(rows, null, 1));
  const byType = new Map();
  for (const r of rows) {
    const t = byType.get(r.type) ?? { species: 0, exact: 0, frames: 0, examples: [] };
    t.species += 1; t.frames += r.frames ?? 0;
    if (r.differ === 0) t.exact += 1; else if (t.examples.length < 3) t.examples.push(`${r.species}@${r.diff?.[0]}(${r.differ})`);
    byType.set(r.type, t);
  }
  const lines = [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([t, v]) => `${String(t).padEnd(40)} ${String(v.exact).padStart(3)}/${String(v.species).padEnd(3)} ${String(v.frames).padStart(6)} frames ${v.examples.join(" ")}`);
  fs.writeFileSync(path.join(outDir, "pixels.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  console.log(`species pixel-exact: ${rows.filter((r) => r.differ === 0).length}/${rows.length}, frames ${rows.reduce((a, r) => a + (r.frames ?? 0), 0)}`);
}

// fixture: tests/fixtures/sfa2-summary-front-anim-rom.json from the ROM receipts. Per species, the ROM's picture sequence from
// dispatch + 1 to its sprite's SpriteCallbackDummy + 2 (motion and frame program both over), each picture
// [x2, y2, matrix | null, frame, invisible, blended BGR555 colours 1..15 | null]: the full sequence for one species per motion type
// (the batch opener: the initial path) and a sha256 of it for every species.
function fixture() {
  const p = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const representatives = {};
  const digests = {};
  for (let bi = 0; bi < p.batches.length; bi += 1) {
    const name = `batch-${String(bi).padStart(2, "0")}.json`;
    if (!fs.existsSync(path.join(romDir, name))) continue;
    const rom = JSON.parse(fs.readFileSync(path.join(romDir, name), "utf8"));
    const fr = rom.frames;
    const starts = [0, ...rom.presses.filter((q) => q.button === "DOWN").map((q) => q.j), fr.length];
    for (let slot = 0; slot < 6; slot += 1) {
      const r = p.batches[bi].rentals[slot];
      const species = r.species.replace("SPECIES_", "");
      if (digests[species]) continue; // the plan's two padding repeats
      const entry = anim.species.find((e) => e.species === r.species);
      const D = dispatchFrame(fr, starts[slot], starts[slot + 1], slot);
      let settled = null;
      for (let j = D; j < starts[slot + 1]; j += 1) if (fr[j].mon?.cb === "SpriteCallbackDummy") { settled = j; break; }
      if (D === null || settled === null) throw new Error(`fixture: ${species} has no dispatch / end`);
      const frames = [];
      let lastImage = 0;
      for (let e = 1; D + e <= settled + 2; e += 1) {
        const v = romVisible(fr, D + e, lastImage);
        lastImage = v.frame;
        frames.push([v.x2, v.y2, v.matrix, v.frame, v.invisible ? 1 : 0, v.blended ? v.blended.slice(1) : null]);
      }
      const pathName = slot === 0 ? "initial" : "replacement";
      digests[species] = { path: pathName, frames: frames.length, sha256: crypto.createHash("sha256").update(JSON.stringify(frames)).digest("hex") };
      if (slot === 0 && !representatives[entry.motion.type]) {
        // run-length: [count, ...picture] for each run of equal consecutive pictures
        const runs = [];
        for (const f of frames) {
          const last = runs[runs.length - 1];
          if (last && JSON.stringify(last.slice(1)) === JSON.stringify(f)) last[0] += 1;
          else runs.push([1, ...f]);
        }
        representatives[entry.motion.type] = { species, path: pathName, runs };
      }
    }
  }
  const out = {
    schema: "sfa2-summary-front-anim-rom/v1",
    source: "tools/probe/sfa2-summary-front-anim-rom.py over tools/probe/sfa2SummaryFrontAnim.mjs plan (Battle Scene OFF draft summary, Info page); docs/sfa2-summary-front-animations.md",
    picture: "picture dispatch + e for e = 1.., each [x2, y2, matrix [pa, pb, pc, pd] | null, frame, invisible, blended BGR555 colours 1..15 | null]; representatives' runs are [count, ...picture]; digests hash the expanded list",
    representatives,
    digests,
  };
  const text = JSON.stringify(out).replace(/\],\[/g, "],\n[");
  fs.writeFileSync(outDir, text + "\n");
  console.log(`${Object.keys(representatives).length} motion types, ${Object.keys(digests).length} species, ${text.length} bytes`);
}

async function states() {
  const sfa = await import(`${GAME}/src/engine/summaryFrontAnimation.ts`);
  const { frontPixels } = await import(`${GAME}/src/engine/monPicPixels.ts`);
  const { installBundledMonPicPixels } = await import(`${GAME}/src/engine/monPicPixelsInstall.ts`);
  installBundledMonPicPixels();
  const fronts = JSON.parse(fs.readFileSync(path.join(GAME, "src/assets/gen/front-sprites.json"), "utf8"));
  const p = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const rows = [];
  for (let bi = 0; bi < p.batches.length; bi += 1) {
    const name = `batch-${String(bi).padStart(2, "0")}.json`;
    if (!fs.existsSync(path.join(romDir, name))) continue;
    const rom = JSON.parse(fs.readFileSync(path.join(romDir, name), "utf8"));
    const fr = rom.frames;
    const starts = [0, ...rom.presses.filter((q) => q.button === "DOWN").map((q) => q.j), fr.length];
    for (let slot = 0; slot < 6; slot += 1) {
      const r = p.batches[bi].rentals[slot];
      const species = r.species.replace("SPECIES_", "");
      const entry = anim.species.find((e) => e.species === r.species);
      const D = dispatchFrame(fr, starts[slot], starts[slot + 1], slot);
      if (D === null) { rows.push({ batch: bi, slot, species, error: "no dispatch" }); continue; }
      const own = fronts.species?.[species] ?? fronts[species];
      const palette = (own?.palette ?? frontPixels(species)?.palette ?? []).map((c) => (c.r >> 3) | ((c.g >> 3) << 5) | ((c.b >> 3) << 10));
      const replacement = slot !== 0;
      const start = replacement ? sfa.SUMMARY_REPLACEMENT_MON_ANIMATION_START : sfa.SUMMARY_INITIAL_MON_ANIMATION_START;
      const diffs = [];
      let lastImage = 0, imageBase = null, end = null;
      for (let e = 0; D + e < starts[slot + 1]; e += 1) {
        const want = romVisible(fr, D + e, lastImage);
        if (!want) continue;
        lastImage = want.frame;
        if (imageBase === null) imageBase = want.frame; // image 0 = frame 0 (the template's first frame)
        const ours = sfa.summaryFrontSpritePresentation(species, start + e, replacement);
        const blended = ours.blend && ours.blend.coefficient > 0
          ? palette.map((c) => {
            let out = 0;
            for (const sh of [0, 5, 10]) { const a = (c >> sh) & 31, t = (ours.blend.color >> sh) & 31; out |= (a + (((t - a) * ours.blend.coefficient) >> 4)) << sh; }
            return out;
          })
          : null;
        const romBlended = want.blended;
        // an older build (--game) presents { affine: { xScale, yScale } } with the flip applied by the renderer
        const matrix = ours.matrix !== undefined ? ours.matrix
          : ours.affine ? [entry.noFlip ? ours.affine.xScale : -ours.affine.xScale, 0, 0, ours.affine.yScale] : null;
        const got = { x2: ours.x2, y2: ours.y2, matrix: matrix ? [...matrix] : null, frame: ours.frame, invisible: ours.invisible ?? false,
          blended: blended ? blended.slice(1) : null };
        const exp = { x2: want.x2, y2: want.y2, matrix: want.matrix, frame: want.frame, invisible: want.invisible,
          blended: romBlended ? romBlended.slice(1) : null };
        // a blend back to coefficient 0 leaves gPlttBufferFaded == unfaded: the ROM side records no blend then
        if (JSON.stringify(got) !== JSON.stringify(exp)) diffs.push({ e, ours: got, rom: exp });
        if (end === null && fr[D + e - 1]?.mon?.cb === "SpriteCallbackDummy") end = e;
      }
      rows.push({ batch: bi, slot, species, type: entry.motion.type, delay: entry.delay, noFlip: entry.noFlip === true,
        path: replacement ? "replacement" : "initial", dispatch: D, settledAt: end, differ: diffs.length, diffs: diffs.slice(0, 12) });
    }
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "states.json"), JSON.stringify(rows, null, 1));
  const byType = new Map();
  for (const r of rows) {
    const t = byType.get(r.type) ?? { species: 0, exact: 0, examples: [] };
    t.species += 1;
    if (r.differ === 0) t.exact += 1; else if (t.examples.length < 3) t.examples.push(`${r.species}@${r.diffs?.[0]?.e}`);
    byType.set(r.type, t);
  }
  const lines = [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([t, v]) => `${String(t).padEnd(40)} ${String(v.exact).padStart(3)}/${String(v.species).padEnd(3)} ${v.examples.join(" ")}`);
  fs.writeFileSync(path.join(outDir, "states.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  console.log(`species exact: ${rows.filter((r) => r.differ === 0).length}/${rows.length}`);
}

if (cmd === "plan") plan();
else if (cmd === "engine") await engine();
else if (cmd === "compare") compare();
else if (cmd === "states") await states();
else if (cmd === "pixels") await pixels();
else if (cmd === "fixture") fixture();
else { console.error("usage: sfa2SummaryFrontAnim.mjs plan|engine|compare ..."); process.exit(2); }
