/**
 * prep36: MOVE_ERUPTION (284) source-derived profile check (docs/next-adapters-prep36.md). Per window: (1) every profile field of the
 * prep36 model vs the corpus-extracted profile (tools/compare/eruptionReducer.ts eruptionProfileFor, the accepted measured
 * profile); (2) every row: the UNCHANGED reducer fed the model profile vs the ROM row (source cursor, active flag, task counts +
 * tasks, rock / palette sprites, launch battler pose + matrix, palettes, shake battlers + platform latch, source and full sprite
 * order, animation RNG) and vs the reducer fed the corpus profile; (3) --pixels: the UNCHANGED renderer (battleScene.ts ERUPTION)
 * fed only the model profile vs raw ROM RGB, plus the corpus-profile baseline. Negative controls: --neg=wave2|ydelta|anchor|order|palette|sub.
 * usage: npx vite-node tools/integration/prep36EruptionCheck.ts <dense.json[.gz]>:<attackerSide>:<rgbDir|rgb.tar.gz> ... [--pixels] [--neg=..] [--scratch=dir] --out=<receipt.json>
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { type EruptionAnimationProfile, eruptionTimeline } from "../../src/animation/eruption.ts";
import { createSceneOnMovePresentation, type SceneOnEruptionConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { eruptionProfileFor } from "../compare/eruptionReducer.ts";
import { speciesName } from "./prep30Species.ts";
import { type Eruption36Neg, eruptionAnchors36, eruptionFacts36, eruptionProfile36, eruptionWaveEnds36 } from "./prep36EruptionModel.ts";

type Json = Record<string, any>;
type Side = "player" | "opponent";
const args = process.argv.slice(2), opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const negName = opt("neg"), pixels = args.includes("--pixels"), out = opt("out"), scratch = opt("scratch") ?? "/tmp/prep36-scratch";
const neg: Eruption36Neg = negName ? { [negName]: true } : {};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const compress = (rows: number[]) => { const o: string[] = []; for (let i = 0; i < rows.length;) { let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[j]! + 1) j += 1; o.push(i === j ? `${rows[i]}` : `${rows[i]}-${rows[j]}`); i = j + 1; } return o; };
/** Banks the ERUPTION renderer reads: BG 2 / 3 / 4, battler OBJ 16 / 17, warm rock 16 + 7. */
const BANKS = [2, 3, 4, 16, 17, 23], banks = (p: readonly number[], set = BANKS) => set.map((k) => p.slice(k * 16, k * 16 + 16));
/** Bank 23 (warm-rock slot 7) holds the previous body's residue until the load is displayed (H, rows 0-1; no rock is drawn before row 21). */
const FIELD_BANKS = [2, 3, 4, 16, 17];
const ROCK = ["gEruptionLaunchRockSpriteTemplate", "gEruptionFallingRockSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"];
const TASKS = ["AnimTask_EruptionLaunchRocks_Step", "Task_WaitAndPlaySE", "AnimTask_ShakePlatforms", "AnimTask_ShakeBattlers", "Task_LoopAndPlaySE"];
const DEFAULT = ["tools/compare/evidence/eruption-player-dense-state.json.gz:player:tools/compare/evidence/eruption-player-raw-rgb.tar.gz",
  "tools/compare/evidence/eruption-opponent-dense-state.json.gz:opponent:tools/compare/evidence/eruption-opponent-raw-rgb.tar.gz"];

/** Leaf-by-leaf profile diff (palette arrays at age 0 compared on the rendered banks; full 512 reported separately). */
function profileDiff(model: Json, corpus: Json): { leaves: number; equal: number; differing: string[] } {
  const diffs: string[] = []; let leaves = 0, equal = 0;
  const walk = (a: any, b: any, path: string) => {
    if (/AtAge0$/.test(path) && Array.isArray(a)) { leaves += 1; if (same(banks(a, FIELD_BANKS), banks(b, FIELD_BANKS))) equal += 1; else diffs.push(`${path}[banks 2/3/4/16/17]`); return; }
    if (a && typeof a === "object" && !(Array.isArray(a) && a.every((x: unknown) => typeof x !== "object"))) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b ?? {})])) walk(a?.[k], b?.[k], `${path}.${k}`); return;
    }
    leaves += 1; if (same(a, b)) equal += 1; else diffs.push(`${path}: model ${JSON.stringify(a)} corpus ${JSON.stringify(b)}`);
  };
  walk(model, corpus, "profile");
  return { leaves, equal, differing: diffs };
}

function findRgb(dir: string, name: string): string | null {
  const direct = join(dir, name); if (existsSync(direct)) return direct;
  for (const e of readdirSync(dir)) { const c = join(dir, e); if (statSync(c).isDirectory()) { const r = findRgb(c, name); if (r) return r; } }
  return null;
}

const normSprite = (s: Json) => ({ slot: s.slot, x: s.x, y: s.y, x2: s.x2, y2: s.y2, subpriority: s.subpriority, data: s.data, attr: s.attr });
const report: Json = { schema: "prep36-eruption-check/v1", neg: negName ?? null, pixels, windows: [] };
const windows = args.filter((a) => !a.startsWith("--"));
for (const spec of windows.length ? windows : DEFAULT) {
  const [path, side, rgb] = spec.split(":") as [string, Side, string | undefined];
  const buf = readFileSync(path), rows: Json[] = JSON.parse((path.endsWith(".gz") ? gunzipSync(buf) : buf).toString()).frames;
  const r0 = rows[0]!, orientation = side === "player" ? "player-back" as const : "opponent-front" as const;
  const facts = eruptionFacts36(r0, side);
  const model = eruptionProfile36(facts, neg);
  const corpus = eruptionProfileFor(orientation, rows);
  const pd = profileDiff(model as Json, corpus as Json);
  const full512 = ["unfadedPaletteAtAge0", "fadedPaletteAtAge0", "hardwarePaletteAtAge0"].every((k) => same((model.palette as Json)[k], (corpus.palette as Json)[k]));
  const mt = eruptionTimeline(model).frames, ct = eruptionTimeline(corpus).frames;
  const fields = ["rowCount", "source", "active", "taskCounts", "tasks", "sprites", "launchBattler", "paletteBanks2_3_4_16_17", "paletteBank23FromRow2", "paletteAll512", "shakeBattlers",
    "platformLatch", "sourceOrder", "fullSourceOrder", "fullSourceOrderCorpusProfile", "animationRng", "reducerEqualsCorpusProfileReducer"] as const;
  const ok: Record<string, number> = Object.fromEntries(fields.map((f) => [f, 0])), bad: Record<string, number[]> = Object.fromEntries(fields.map((f) => [f, []]));
  const n = Math.max(rows.length, mt.length);
  const anchors = eruptionAnchors36(facts);
  for (let age = 0; age < n; age += 1) {
    const row = rows[age], fr = mt[age];
    const mark = (f: (typeof fields)[number], good: boolean) => { if (good) ok[f] += 1; else bad[f]!.push(age); };
    mark("rowCount", !!row && !!fr);
    if (!row || !fr) continue;
    mark("source", same([fr.source.owner, fr.source.offset, fr.source.pointer, fr.source.pointerParity, fr.source.wait, fr.source.args], [row.scriptOwner, row.scriptOffset, row.scriptPtr, row.scriptPtrParity, row.scriptWait, row.animArgs]));
    mark("active", fr.active === row.animScriptActive);
    mark("taskCounts", fr.visualTaskCount === row.visualTaskCount && fr.soundTaskCount === row.soundTaskCount);
    const expTasks = row.tasks.filter((t: Json) => TASKS.includes(t.func.symbol)).map((t: Json) => ({ slot: t.slot, priority: t.priority, callback: t.func.symbol, data: t.data }));
    mark("tasks", same(fr.tasks.map((t) => ({ slot: t.slot, priority: t.priority, callback: t.callback, data: t.data })), expTasks));
    const expSprites = row.sprites.filter((s: Json) => ROCK.includes(s.template.symbol)).map((s: Json) => ({ t: s.template.symbol, ...normSprite(s) })).sort((a: Json, b: Json) => a.slot - b.slot);
    const mySprites = fr.sprites.map((s) => ({ t: ROCK[["launch", "falling", "palette"].indexOf(s.kind)], ...normSprite(s) })).sort((a, b) => a.slot - b.slot);
    mark("sprites", same(mySprites, expSprites));
    // the attacker pose the renderer draws: launch battler state while the task owns it, else the idle sprite centre (+ idle rest)
    const att = row.battlerSprites.attacker, lb = fr.launch.battler;
    const idle = anchors[side];
    mark("launchBattler", lb ? same([lb.spriteSlot, lb.x, lb.y, lb.x2, lb.y2, lb.matrixNum, lb.matrix], [att.slot, att.x, att.y, att.x2, att.y2, att.matrixNum, att.matrix])
      : (att.x === idle.spriteCenter.x && att.y === idle.spriteCenter.y && att.y2 === idle.frontIdleRest.y2));
    const pp = fr.palette.palette;
    const pal = (set: number[]) => same(banks(pp.unfaded, set), banks(row.unfadedPalette, set)) && same(banks(pp.softwareFaded, set), banks(row.fadedPalette, set)) && same(banks(pp.hardware, set), banks(row.hardwarePalette, set));
    mark("paletteBanks2_3_4_16_17", pal(FIELD_BANKS));
    mark("paletteBank23FromRow2", age < 2 || pal([23]));
    mark("paletteAll512", same(pp.unfaded, row.unfadedPalette) && same(pp.softwareFaded, row.fadedPalette) && same(pp.hardware, row.hardwarePalette));
    const shakeOk = fr.horizontalShake.battlers.every((b) => {
      const exp = b.battlerId === row.animationBattlers.attacker ? row.battlerSprites.attacker : row.battlerSprites.target;
      return same([b.spriteSlot, b.x, b.y, b.x2, b.y2], [exp.slot, exp.x, exp.y, exp.x2, exp.y2]);
    });
    mark("shakeBattlers", age < model.horizontalShake.taskCreationAge || age > model.horizontalShake.taskCreationAge + 201 || shakeOk);
    mark("platformLatch", fr.horizontalShake.platform.sourceX === row.battleBg.gBattle_BG3_X && (fr.horizontalShake.platform.displayedX & 0x1ff) === row.registers.bg3hofs);
    mark("sourceOrder", same(fr.order.sourceOrder, row.spriteOrder.filter((s: number) => expSprites.some((e: Json) => e.slot === s))));
    mark("fullSourceOrder", same(fr.order.fullSourceOrder, row.spriteOrder));
    // attribution: the same rows fail with the corpus profile (reducer-inherent, not a model input; the renderer reads fullPainterOrder)
    mark("fullSourceOrderCorpusProfile", !!ct[age] && same(ct[age]!.order.fullSourceOrder, row.spriteOrder));
    mark("animationRng", fr.animationRng === row.animationRng);
    const strip = (x: Json) => ({ ...x, palette: { ...x.palette, palette: null }, gameplay: null });
    mark("reducerEqualsCorpusProfileReducer", !!ct[age] && same(strip(fr as Json), strip(ct[age] as Json)) && same(banks(fr.palette.palette.hardware, FIELD_BANKS), banks(ct[age]!.palette.palette.hardware, FIELD_BANKS)));
  }
  const [e1, e2] = eruptionWaveEnds36(model);
  const w: Json = { window: basename(path).replace(/(-r1)?(-dense-state)?\.json(\.gz)?$/, ""), attackerSide: side,
    species: [speciesName(r0.battlers[side].species), speciesName(r0.battlers[side === "player" ? "opponent" : "player"].species)],
    romRows: rows.length, modelRows: mt.length, attackerY: model.launch.geometry.attackerY, waveEnds: [e1, e2], wave2Start: model.launch.waves[1].taskStartAge,
    profile: { leaves: pd.leaves, equal: pd.equal, differing: pd.differing, full512PaletteAtAge0Equal: full512 },
    fields: Object.fromEntries(fields.map((f) => [f, `${ok[f]}/${n}`])),
    mismatchRows: Object.fromEntries(fields.filter((f) => bad[f]!.length).map((f) => [f, compress(bad[f]!).slice(0, 12)])) };
  if (pixels && rgb) {
    let rgbDir = rgb;
    if (rgb.endsWith(".tar.gz")) { rgbDir = resolve(scratch, basename(rgb, ".tar.gz")); if (!existsSync(rgbDir)) { mkdirSync(rgbDir, { recursive: true }); execFileSync("tar", ["-xzf", rgb, "-C", rgbDir]); } }
    const pm = r0.parties.player[r0.battlers.player.partyIndex], om = r0.parties.opponent[r0.battlers.opponent.partyIndex];
    const geo = (s: Side) => { const a = anchors[s]; return { side: s, spriteCorner: { x: a.spriteCenter.x - 32, y: a.spriteCenter.y - 32 }, animationCenter: a.spriteCenter, battlePositionCenter: a.battlePositionCenter }; };
    const tside: Side = side === "player" ? "opponent" : "player";
    const config = (profile: EruptionAnimationProfile): SceneOnEruptionConfig => ({
      move: "ERUPTION",
      attacker: { species: speciesName(r0.battlers[side].species), geometry: geo(side) },
      target: { species: speciesName(r0.battlers[tside].species), geometry: geo(tside) },
      fieldProfile: { playerHp: r0.battlers.player.hp, playerMaxHp: r0.battlers.player.maxHp, opponentHp: r0.battlers.opponent.hp, opponentMaxHp: r0.battlers.opponent.maxHp,
        playerGender: pm.gender === "genderless" ? "none" : pm.gender, opponentGender: om.gender === "genderless" ? "none" : om.gender },
      animationProfile: profile,
    } as SceneOnEruptionConfig);
    const run = (profile: EruptionAnimationProfile) => {
      const stage = createSceneOnMovePresentation(config(profile));
      let zero = 0, total = 0; const bad: Array<[number, number]> = [];
      for (const [age, row] of rows.entries()) {
        const file = findRgb(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`); if (!file) throw new Error(`missing rgb ${row.frame}`);
        const raw = readFileSync(file); if (sha256(raw) !== row.sha256) throw new Error(`rgb hash ${row.frame}`);
        if (age > profile.endAge) { bad.push([age, -1]); continue; }
        const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } } as EngineState);
        let px = 0;
        for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) px += 1;
        if (px === 0) zero += 1; else { bad.push([age, px]); total += px; }
      }
      return { rows: rows.length, zeroPx: zero, residualPx: total, worst: [...bad].sort((a, b) => b[1] - a[1]).slice(0, 8), mismatchRows: compress(bad.map((b) => b[0])).slice(0, 12) };
    };
    w.pixels = { model: run(model) };
    if (!negName) w.pixels.corpusProfileBaseline = run(corpus);
  }
  report.windows.push(w);
  console.log(JSON.stringify({ window: w.window, profile: `${pd.equal}/${pd.leaves}`, fields: w.fields, px: w.pixels ? { model: `${w.pixels.model.zeroPx}/${rows.length} (${w.pixels.model.residualPx})`, corpus: w.pixels.corpusProfileBaseline ? `${w.pixels.corpusProfileBaseline.zeroPx}/${rows.length}` : null } : null }));
}
if (out) writeFileSync(out, `${JSON.stringify(report, null, 1)}\n`);
