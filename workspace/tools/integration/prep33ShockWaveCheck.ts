/**
 * prep33: MOVE_SHOCK_WAVE field-by-field check of the reducer fed with the source-derived inputs (prep33ShockWaveModel.ts shockWaveInputs33)
 * against every row of every window, then (--pixels) the UNCHANGED renderer (render(state) -> battleScene.ts SHOCK_WAVE branch) vs raw ROM RGB.
 * Run under `--config tools/integration/prep33.vite.config.ts` with PREP33_SHOCKWAVE=<patched copy> for the proposed timing change (reported as
 * reducer "patched"), or without it for the current reducer ("unchanged").
 * usage: npx vite-node --config tools/integration/prep33.vite.config.ts tools/integration/prep33ShockWaveCheck.ts <dense.json[.gz]>:<attackerSide>[:<rgbDir|rgb.tar.gz>] ...
 *        [--pixels] [--neg=anchor|palette|registers|order] [--scratch=<dir>] --out=<receipt.json>
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnShockWaveView, type SceneOnShockWaveConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { anchors, shockWaveInputs33, shockWaveTiming33, type Side } from "./prep33ShockWaveModel.ts";
import type { ShockWaveLiveInputs } from "../../src/animation/shockWave.ts";

type Json = Record<string, any>;
const args = process.argv.slice(2), opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const neg = opt("neg"), pixels = args.includes("--pixels"), out = opt("out"), scratch = opt("scratch") ?? "/tmp/prep33-scratch";
const reducer = process.env.PREP33_SHOCKWAVE ? "patched" : "unchanged";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const TASKS = ["AnimTask_ElectricChargingParticles_Step", "AnimTask_ShockWaveProgressingBolt", "AnimTask_ShockWaveLightning", "AnimTask_ShakeMon_Step", "AnimTask_BlendSpriteColor_Step2", "Task_UpdateMonBg", "Task_ClearMonBg"];
const OWNED = new Set(["gElectricChargingParticlesSpriteTemplate", "gGrowingShockWaveOrbSpriteTemplate", "gShockWaveProgressingBoltSpriteTemplate", "gLightningSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"]);
const compact = (e: Json) => ({ slot: e.slot, template: e.template, callback: e.callback, attr: e.attr, x: e.x, y: e.y, x2: e.x2, y2: e.y2, animNum: e.animNum, animCmdIndex: e.animCmdIndex, animDelayCounter: e.animDelayCounter, subpriority: e.subpriority, flags: e.flags, matrixNum: e.matrixNum, matrix: e.matrix, data: e.data.slice(0, 8) });
const bank = (p: readonly number[], i: number) => p.slice(i * 16, i * 16 + 16);
const DEFAULT = ["tools/compare/evidence/shock-wave-player-dense-state.json.gz:player:tools/compare/evidence/shock-wave-player-raw-rgb.tar.gz",
  "tools/compare/evidence/shock-wave-opponent-dense-state.json.gz:opponent:tools/compare/evidence/shock-wave-opponent-raw-rgb.tar.gz"];
const windows = args.filter((a) => !a.startsWith("--"));
const report: Json = { schema: "prep33-shock-wave-check/v1", reducer, neg: neg ?? null, pixels, windows: [] };
for (const spec of windows.length ? windows : DEFAULT) {
  const [path, side, rgb] = spec.split(":") as [string, Side, string | undefined];
  const buf = readFileSync(path), frames: Json[] = JSON.parse((path.endsWith(".gz") ? gunzipSync(buf) : buf).toString()).frames;
  const r0 = frames[0]!, targetSide: Side = side === "player" ? "opponent" : "player";
  const attackerSpecies = r0.battlers[side].species as number, targetSpecies = r0.battlers[targetSide].species as number;
  const order = neg === "order" ? [...r0.spriteOrder].reverse() : r0.spriteOrder;
  const input = shockWaveInputs33(attackerSpecies, targetSpecies, side, { spriteOrder: order, registers0: r0.registers, battleBg0: r0.battleBg, animationRng: r0.animationRng, gameplayRng: r0.rawBattleState?.gameplayRng }, neg);
  const a = anchors(attackerSpecies, side), t = anchors(targetSpecies, targetSide), timing = shockWaveTiming33(a.pic, t.pic, t.battleY);
  const { attackerSide, targetSide: ts, attackerSpecies: an, targetSpecies: tn, attackerPictureOrigin, targetPictureOrigin, targetBattlePosition, ...animationInputs } = input as ShockWaveLiveInputs;
  void ts;
  const config: SceneOnShockWaveConfig = { move: "SHOCK_WAVE",
    attacker: { species: an as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: attackerPictureOrigin, battlePositionCenter: attackerPictureOrigin } },
    target: { species: tn as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: targetPictureOrigin, battlePositionCenter: targetBattlePosition } },
    fieldProfile: { playerHp: r0.parties.player[0].hp, playerMaxHp: r0.parties.player[0].maxHp, opponentHp: r0.parties.opponent[0].hp, opponentMaxHp: r0.parties.opponent[0].maxHp, playerGender: r0.parties.player[0].gender, opponentGender: r0.parties.opponent[0].gender },
    animationInputs };
  const fields = ["cursor", "animArgs", "tasks", "sprites", "battlers", "painterOrder", "matrixBitmap", "resources", "paletteRendererBanks", "paletteReducerBanks", "paletteBank1", "bgValues", "monbgRegisters", "blendRegisters", "win0", "otherRegisters", "cleanup", "animationRngEcho"] as const;
  const ok: Record<string, number> = Object.fromEntries(fields.map((f) => [f, 0])), bad: Record<string, number[]> = Object.fromEntries(fields.map((f) => [f, []]));
  const stage = createSceneOnMovePresentation(config), bg0 = input.background;
  let rgbDir = rgb;
  if (pixels && rgb?.endsWith(".tar.gz")) { rgbDir = resolve(scratch, basename(rgb, ".tar.gz")); if (!existsSync(rgbDir)) { mkdirSync(rgbDir, { recursive: true }); execFileSync("tar", ["-xzf", rgb, "-C", rgbDir]); } }
  let pxRows = 0, pxExact = 0, pxTotal = 0; const pxBad: string[] = [];
  for (const [age, row] of frames.entries()) {
    const st = sceneOnShockWaveView({ ...stage, age } as never) as Json;
    const mark = (f: (typeof fields)[number], good: boolean) => { if (good) ok[f] += 1; else bad[f]!.push(age); };
    mark("cursor", st.active === row.animScriptActive && st.source.pointerOffset === row.scriptOffset && st.source.wait === row.scriptWait && st.source.pointer === row.scriptPtr);
    mark("animArgs", same(st.animArgs, row.animArgs));
    const et = row.tasks.filter((e: Json) => TASKS.includes(e.func?.symbol)).map((e: Json) => [e.slot, e.func.symbol, e.data]).sort((x: any, y: any) => x[0] - y[0] || x[1].localeCompare(y[1]));
    mark("tasks", same(et, st.tasks.map((e: Json) => [e.slot, e.callback, e.data]).sort((x: any, y: any) => x[0] - y[0] || x[1].localeCompare(y[1]))));
    const es = row.sprites.filter((e: Json) => OWNED.has(e.template?.symbol)).map((e: Json) => compact({ ...e, template: e.template.symbol, callback: e.callback.symbol })).sort((x: Json, y: Json) => x.slot - y.slot);
    mark("sprites", same(es, st.sprites.map(compact)));
    const bOk = (["attacker", "target"] as const).every((role) => { const s = st.battlers[role].sprite, e = row.battlerSprites[role];
      return s.x === e.x && s.y === e.y && s.x2 === e.x2 && s.y2 === e.y2 && (age >= timing.cleanupAge || same([s.attr, s.subpriority, s.matrixNum, s.matrix], [e.attr, e.subpriority, e.matrixNum, e.matrix])); });
    mark("battlers", bOk);
    mark("painterOrder", same(st.painterOrder, row.spriteOrder));
    mark("matrixBitmap", st.resources.matrixBitmap === row.resourceAllocators.matrixBitmap);
    mark("resources", Object.values(st.resources.tags).every((r: any) => r.loaded === row.tileTags.includes(r.tag) && r.loaded === row.paletteTags.includes(r.tag)
      && (!r.loaded || (row.tileTags[r.tileSlot] === r.tag && row.paletteTags[r.paletteAllocatorSlot] === r.tag && same(row.resourceAllocators.tileRanges[r.tileSlot], r.tileRange)))));
    // banks the SHOCK_WAVE renderer branch reads at this age: static BG 2/3/4, attacker / target OBJ bank, a resource bank once its sheet is
    // loaded (hardware one row after the load row), the monbg copy once the attacker is on the BG (age >= 14)
    const loads: Record<string, number> = { electricOrbs: 1, circleOfLight: 4, spark: 7, lightning: 10 };
    const rb = [...new Set([2, 3, 4, 16 + (input.attackerSprite.attr[2] >>> 12 & 15), 16 + (input.targetSprite.attr[2] >>> 12 & 15),
      ...Object.entries(input.resources).filter(([n]) => age > loads[n]!).map(([, r]) => r.hardwarePaletteBank), ...(age >= 14 ? [bg0.monbgPaletteBank] : [])])];
    mark("paletteReducerBanks", st.palette.banks.filter((b: number) => b !== 1).every((b: number) => same(bank(st.palette.hardware, b), bank(row.hardwarePalette, b)) && same(bank(st.palette.faded, b), bank(row.fadedPalette, b)) && same(bank(st.palette.unfaded, b), bank(row.unfadedPalette, b))));
    mark("paletteRendererBanks", rb.every((b) => same(bank(st.palette.hardware, b), bank(row.hardwarePalette, b)) && same(bank(st.palette.faded, b), bank(row.fadedPalette, b)) && same(bank(st.palette.unfaded, b), bank(row.unfadedPalette, b))));
    mark("paletteBank1", same(bank(st.palette.hardware, 1), bank(row.hardwarePalette, 1)) && same(bank(st.palette.faded, 1), bank(row.fadedPalette, 1)));
    const bg = input.background;
    mark("bgValues", st.background.values[bg.xKey] === row.battleBg[bg.xKey] && st.background.values[bg.yKey] === row.battleBg[bg.yKey]);
    mark("monbgRegisters", [bg.controlRegister, bg.horizontalRegister, bg.verticalRegister].every((k) => st.registers[k] === row.registers[k]));
    mark("blendRegisters", st.registers.bldcnt === row.registers.bldcnt && st.registers.bldalpha === row.registers.bldalpha);
    // win0h / win0v: the ROM zeroes them at row 1 (first body); the reducer keeps the activation values and the SHOCK_WAVE branch never reads them
    mark("win0", st.registers.win0h === row.registers.win0h && st.registers.win0v === row.registers.win0v);
    mark("otherRegisters", Object.keys(row.registers).filter((k) => ![bg.controlRegister, bg.horizontalRegister, bg.verticalRegister, "bldcnt", "bldalpha", "win0h", "win0v"].includes(k)).every((k) => st.registers[k] === row.registers[k]));
    mark("cleanup", st.cleanup.visualTasks === row.visualTaskCount && st.cleanup.ownedSprites === es.length && st.cleanup.firstInactive === (age === timing.cleanupAge));
    mark("animationRngEcho", st.rng.animation === row.animationRng);
    if (pixels && rgbDir) {
      const raw = readFileSync(resolve(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
      const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } } as never);
      let d = 0; for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) d += 1;
      pxRows += 1; pxTotal += d; if (d === 0) pxExact += 1; else pxBad.push(`${age}:${d}`);
    }
  }
  const compress = (rows: number[]) => { const o: string[] = []; for (let i = 0; i < rows.length;) { let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[j]! + 1) j += 1; o.push(i === j ? `${rows[i]}` : `${rows[i]}-${rows[j]}`); i = j + 1; } return o; };
  const w = { window: basename(path).replace(/(-dense-state)?\.json(\.gz)?$/, ""), attackerSide: side, species: [an, tn], rows: frames.length, derivedTiming: timing,
    reducerFirstInactive: frames.findIndex((_, age) => (sceneOnShockWaveView({ ...stage, age } as never) as Json).cleanup.firstInactive),
    fields: Object.fromEntries(fields.map((f) => [f, `${ok[f]}/${frames.length}`])), mismatchRows: Object.fromEntries(fields.filter((f) => bad[f]!.length).map((f) => [f, compress(bad[f]!).slice(0, 12)])),
    ...(pixels ? { pixels: { rows: pxRows, exact: pxExact, residualPixels: pxTotal, failures: pxBad.slice(0, 16) } } : {}) };
  report.windows.push(w);
  console.error(`${w.window} ${side}: ${JSON.stringify(w.fields)}${pixels ? ` px ${pxExact}/${pxRows} (${pxTotal})` : ""}`);
}
if (out) writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
