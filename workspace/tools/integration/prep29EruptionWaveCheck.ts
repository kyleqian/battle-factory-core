// prep29: does the accepted Eruption launch reducer derive the wave END ages (hence the body length) from battler geometry alone?
// Builds the accepted opponent/player launch profile from the retained dense corpus (as tools/compare/eruptionLaunchAudit.ts does), then re-runs
// eruptionLaunchTimeline with only attackerY changed to the ROM attacker Y of the alternate scenarios (probe state battlerXY) and reports the launch task run ends.
// usage: node --experimental-strip-types tools/integration/prep29EruptionWaveCheck.ts STATE_DIR OUT.json
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { eruptionLaunchTimeline, type EruptionLaunchProfile } from "../../src/animation/eruptionLaunch.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const [stateDir, outPath] = process.argv.slice(2);
type J = Record<string, any>;
const rowsOf = (side: string): J[] => (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/eruption-${side}-dense-state.json.gz`))).toString()) as J).frames;
const runs = (rows: J[], pred: (r: J) => boolean) => { const out: [number, number][] = []; let s: number | null = null; rows.forEach((r, i) => { if (pred(r)) { if (s === null) s = i; } else if (s !== null) { out.push([s, i - 1]); s = null; } }); if (s !== null) out.push([s, rows.length - 1]); return out; };
const launch = (r: J) => r.tasks.find((t: J) => t.func.symbol === "AnimTask_EruptionLaunchRocks_Step");
const out: J = {};
for (const side of ["player", "opponent"] as const) {
  const rows = rowsOf(side), first = rows[0]!, att = first.battlerSprites.attacker as J;
  const taskRuns = runs(rows, (r) => launch(r) !== undefined), soundRuns = runs(rows, (r) => r.tasks.some((t: J) => t.func.symbol === "Task_WaitAndPlaySE"));
  const flr = rows.findIndex((r) => r.sprites.some((s: J) => s.template.symbol === "gEruptionLaunchRockSpriteTemplate"));
  const occ = new Set((rows[flr - 1]!.sprites as J[]).map((s) => s.slot));
  const freed = rows.findIndex((r) => r.allocators.tileTags[6] !== 10201 && r.frame > rows[1]!.frame);
  const prof = (dy: number, w2 = taskRuns[1]![0]): EruptionLaunchProfile => ({
    side, geometry: { attackerSpriteSlot: att.slot, attackerX: att.x, attackerY: att.y + dy, centerToCornerVecY: -64, battlerPicHeight: 64, battlerYDelta: side === "player" ? 10 : 11, matrixNum: rows[19]!.battlerSprites.attacker.matrixNum },
    allocator: { freeSpriteSlots: Array.from({ length: 64 }, (_, i) => i).filter((i) => !occ.has(i)), tileTag: 10201, paletteTag: 10201, tileRange: rows[flr]!.allocators.tileRanges[6], tileRangeBeforeLoad: rows[0]!.allocators.tileRanges[6],
      paletteSlot: (rows[flr]!.allocators.paletteTags as number[]).indexOf(10201), loadedAge: rows.findIndex((r) => r.allocators.tileTags[6] === 10201), freedAge: freed < 0 ? null : freed },
    taskSlot: launch(rows[flr]!).slot,
    waves: [{ taskStartAge: taskRuns[0]![0], sourceOffset: rows[taskRuns[0]![0]]!.scriptOffset, companionTaskSlot: 1, companionTaskEndAge: soundRuns[0]![1] }, { taskStartAge: w2, sourceOffset: rows[taskRuns[1]![0]]!.scriptOffset, companionTaskSlot: 1, companionTaskEndAge: soundRuns[1]![1] }],
    startingAnimationRng: first.animationRng, endAge: rows.length + 30 });
  const ends = (p: EruptionLaunchProfile) => { const f = eruptionLaunchTimeline(p); const r = runs(f as unknown as J[], (x) => x.task !== null); return r; };
  const res: J = { attackerXY: [att.x, att.y], romTaskRuns: taskRuns, dyResults: {} };
  for (const dy of [0, -9, -6, -3, 3, 9]) { try { res.dyResults[dy] = ends(prof(dy)); } catch (e) { res.dyResults[dy] = String(e).slice(0, 120); } }
  if (side === "opponent") { // ROM alternate (Torkoal, attacker Y 42 = Y 51 - 9): the ROM launch task runs are [19,112],[113,205]; the reducer is given only the ROM wave-2 start
    res.torkoalDy9 = { romTaskRuns: [[19, 112], [113, 205]], reducerWithRomWave2Start: ends(prof(-9, 113)) };
  }
  out[side] = res;
}
// ROM attacker Y in the four probe scenarios (state probe battlerXY at activation)
const rom: J = {};
for (const sc of ["mechanic-eruption-player-camerupt-opponent-onix", "prep29-eruption-alt-player-torkoal-golem", "mechanic-eruption-opponent-camerupt-player-onix", "prep29-eruption-alt-opponent-torkoal-golem"]) {
  const d = JSON.parse(readFileSync(resolve(stateDir, `${sc}-r1.json`), "utf8")); const b = d.bodies.find((x: J) => x.move === 284); const a = /eruption-(alt-)?player/.test(sc) ? 0 : 1;
  rom[sc] = { attackerXY: b.atActivation.battlerXY[a], bodyFrames: b.end - b.start };
}
out.romScenarios = rom;
writeFileSync(outPath, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
