import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";
import { buildIceBeamChangeMap } from "./iceBeamChangeMap.ts";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/ice-beam-evidence.json", "utf8"));
const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const templates = [
  "gIceBeamOuterCrystalSpriteTemplate", "gIceBeamInnerCrystalSpriteTemplate",
  "gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate",
] as const;
const expectedTasks = ["AnimTask_ShakeMon2_Step", "SoundTask_LoopSEAdjustPanning_Step", "Task_ClearMonBg", "Task_UpdateMonBg"];
const expectedCallbacks = ["AnimFlickerIceEffectParticle", "AnimSimplePaletteBlend_Step", "AnimTranslateLinear_WithFollowup", "DestroyAnimSprite", "RunStoredCallbackWhenAffineAnimEnds"];

const summary: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const config = fixture.orientations[orientation];
  for (const [path, expected] of [
    [config.scenario, config.scenarioSha256], [fixture.source.audit, fixture.source.auditSha256],
    [fixture.source.assetExtractor, fixture.source.assetExtractorSha256], [fixture.source.asset, fixture.source.assetSha256],
    [fixture.source.probe, fixture.source.probeSha256], [fixture.source.changeMapBuilder, fixture.source.changeMapBuilderSha256],
    [config.denseState, config.denseStateSha256], [config.rawRgbArchive, config.rawRgbArchiveSha256], [config.changeMap, config.changeMapSha256],
  ] as const) if (sha(readFileSync(path)) !== expected) throw new Error(`${path} receipt drifted`);
  if (config.probeJsonSha256 !== config.repeatProbeJsonSha256) throw new Error(`${orientation} twice-fresh probe mismatch`);
  const denseJson = gunzipSync(readFileSync(config.denseState));
  if (sha(denseJson) !== config.probeJsonSha256) throw new Error(`${orientation} dense JSON drifted`);
  const probe = JSON.parse(denseJson.toString("utf8"));
  const frames = probe.frames as any[];
  if (probe.schema !== "ice-beam-dense-evidence/v1" || !same(probe.sourceWindow, config.sourceWindow)
    || frames.length !== 203 || frames[0].scriptOffset !== 0 || frames.at(-1).animScriptActive !== false
    || !same(probe.topology.tasks, expectedTasks) || !expectedCallbacks.every((symbol) => probe.topology.callbacks.includes(symbol))) {
    throw new Error(`${orientation} complete pointer/topology window drifted`);
  }
  const immutable = JSON.stringify(frames[0].immutableState);
  const parties = JSON.stringify(frames[0].parties);
  let oamLatch = 0; let matrixLatch = 0; let paletteLatch = 0;
  for (let age = 0; age < frames.length; age += 1) {
    const row = frames[age];
    if (row.softwareOam.length !== 128 || row.hardwareOam.length !== 128
      || row.softwareMatrices.length !== 32 || row.hardwareMatrices.length !== 32
      || row.fadedPalette.length !== 512 || row.unfadedPalette.length !== 512 || row.hardwarePalette.length !== 512
      || row.paletteTags.length !== 16 || row.tileTags.length !== 128
      || row.parties.player.length !== 3 || row.parties.opponent.length !== 3
      || JSON.stringify(row.immutableState) !== immutable || JSON.stringify(row.parties) !== parties) {
      throw new Error(`${orientation} retained state drift at age ${age}`);
    }
    if (age > 0) {
      if (same(row.hardwareOam, frames[age - 1].softwareOam)) oamLatch += 1;
      if (same(row.hardwareMatrices, frames[age - 1].softwareMatrices)) matrixLatch += 1;
      if (same(row.hardwarePalette, frames[age - 1].fadedPalette)) paletteLatch += 1;
    }
  }
  const creations: Record<string, readonly (readonly [number, number])[]> = {};
  for (const template of templates) {
    const found: [number, number][] = []; let previous = new Set<number>();
    frames.forEach((row, age) => {
      const current = new Set<number>(row.sprites.filter((sprite: any) => sprite.template.symbol === template).map((sprite: any) => sprite.slot));
      for (const slot of current) if (!previous.has(slot)) found.push([age, slot]);
      previous = current;
    });
    creations[template] = found;
  }
  const expectedCreations = {
    gIceBeamOuterCrystalSpriteTemplate: [[26,3],[26,4],[29,5],[29,7],[32,10],[32,11],[35,13],[35,14],[38,17],[38,18],[41,20],[41,21],[44,9],[44,23],[47,12],[47,25],[50,3],[50,4],[53,5],[53,7],[56,10],[56,11],[59,13],[59,14]],
    gIceBeamInnerCrystalSpriteTemplate: [[29,9],[32,12],[35,15],[38,19],[41,22],[44,24],[47,26],[50,15],[53,19],[56,22],[59,16],[62,17],[65,15]],
    gIceCrystalHitLargeSpriteTemplate: [[109,3],[121,5],[145,11]],
    gIceCrystalHitSmallSpriteTemplate: [[115,4],[127,7],[133,9],[139,10]],
  };
  if (!same(creations, expectedCreations)) throw new Error(`${orientation} allocation schedule drifted`);
  const taskAges = (symbol: string): number[] => frames.flatMap((row, age) => row.tasks.some((task: any) => task.func.symbol === symbol) ? [age] : []);
  const range = (symbol: string): [number, number, number] => { const ages = taskAges(symbol); return [ages[0]!, ages.at(-1)!, ages.length]; };
  if (!same(range("SoundTask_LoopSEAdjustPanning_Step"), [26,57,32])
    || !same(range("AnimTask_ShakeMon2_Step"), [38,85,48])
    || !same(range("Task_UpdateMonBg"), [1,200,200]) || !same(range("Task_ClearMonBg"), [198,200,3])) {
    throw new Error(`${orientation} task lifetime drifted`);
  }
  const soundTask = frames[26].tasks.find((task: any) => task.func.symbol === "SoundTask_LoopSEAdjustPanning_Step");
  const pan = orientation === "player-back" ? [-64,63,4] : [63,-63,-4];
  if (!same(soundTask.data.slice(0, 7), [183, pan[0], pan[1], pan[2], 3, 0, 10])
    || frames[57].tasks.find((task: any) => task.func.symbol === "SoundTask_LoopSEAdjustPanning_Step").data[4] !== 1) {
    throw new Error(`${orientation} looped panning payload drifted`);
  }
  const bgHofs = orientation === "player-back" ? "bg1hofs" : "bg2hofs";
  const baseHofs = orientation === "player-back" ? 368 : 472;
  const sourceShakeEdges = frames.flatMap((row, age) => age === 0 || row.battlerSprites.target.x2 !== frames[age - 1].battlerSprites.target.x2 ? [[age, row.battlerSprites.target.x2]] : []);
  const displayShakeEdges = frames.flatMap((row, age) => age === 0 || row.registers[bgHofs] !== frames[age - 1].registers[bgHofs] ? [[age, row.registers[bgHofs]]] : []);
  const expectedSourceShake = [[0,0], ...Array.from({ length: 24 }, (_, index) => [38 + index * 2, index % 2 === 0 ? -2 : 2]), [86,0]];
  const expectedDisplayShake = [[0,0], [2,baseHofs], ...Array.from({ length: 24 }, (_, index) => [39 + index * 2, baseHofs + (index % 2 === 0 ? 2 : -2)]), [87,baseHofs], [202,0]];
  if (!same(sourceShakeEdges, expectedSourceShake) || !same(displayShakeEdges, expectedDisplayShake)) {
    throw new Error(`${orientation} move-specific monbg ShakeMon2 latch drifted`);
  }
  const ownerCounts = Object.fromEntries(["Move_ICE_BEAM", "IceBeamCreateCrystals", "IceCrystalEffectShort"].map((owner) => [owner, frames.filter((row) => row.scriptOwner === owner).length]));
  if (!same(ownerCounts, { Move_ICE_BEAM: 134, IceBeamCreateCrystals: 33, IceCrystalEffectShort: 36 })
    || oamLatch !== 202 || matrixLatch !== 202 || paletteLatch !== 201
    || frames.flatMap((row, age) => age > 0 && !same(row.hardwarePalette, frames[age - 1].fadedPalette) ? [age] : []).join() !== "1"
    || new Set(frames.map((row) => row.immutableState.rngValue)).size !== 1
    || new Set(frames.map((row) => row.animationRng)).size !== 201
    || !frames[4].tileTags.includes(10141) || !frames[201].tileTags.includes(10141)
    || frames[202].tileTags.includes(10141) || frames[202].paletteTags.includes(10141)
    || frames[202].visualTaskCount !== 0 || frames[202].soundTaskCount !== 0
    || !same([frames[4].registers.bldcnt, frames[4].registers.bldalpha, frames[198].registers.bldcnt, frames[198].registers.bldalpha], [16192,2060,0,0])) {
    throw new Error(`${orientation} latch/resource/register/RNG cleanup drifted`);
  }
  const expectedMap = JSON.parse(readFileSync(config.changeMap, "utf8"));
  const actualMap = { schema: "ice-beam-normalized-change-map/v1", rows: buildIceBeamChangeMap(config.denseState, config.rawRgbArchive) };
  if (!same(actualMap, expectedMap)) throw new Error(`${orientation} normalized RGB change map drifted`);
  const scratch = createScratchDir("ice-beam-rgb-");
  const untar = spawnSync("tar", ["-xzf", config.rawRgbArchive, "-C", scratch], { encoding: "utf8" });
  if (untar.status !== 0) throw new Error(untar.stderr);
  const rgbSequence = createHash("sha256");
  for (const row of frames) {
    const rgb = readFileSync(join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (rgb.length !== 240 * 160 * 3 || sha(rgb) !== row.sha256) throw new Error(`${orientation} raw RGB row ${row.frame} drifted`);
    rgbSequence.update(rgb);
  }
  if (rgbSequence.digest("hex") !== config.rawRgbSha256) throw new Error(`${orientation} chronological RGB sequence drifted`);
  summary[orientation] = {
    sourceWindow: probe.sourceWindow, ownerCounts,
    creations: { outer: creations.gIceBeamOuterCrystalSpriteTemplate.length, inner: creations.gIceBeamInnerCrystalSpriteTemplate.length, largeHits: 3, smallHits: 4 },
    tasks: { sound: range("SoundTask_LoopSEAdjustPanning_Step"), shake: range("AnimTask_ShakeMon2_Step"), monbg: range("Task_UpdateMonBg"), clear: range("Task_ClearMonBg") },
    latches: { oam: "202/202 RAM+1", matrices: "202/202 RAM+1", palette: "201/202 RAM+1; age 1 pre-animation exception", monbgShake: "source 38..86 -> display 39..87 RAM+1" },
    rng: { gameplayDistinct: 1, animationDistinct: 201 }, cleanup: { age: 202, active: false, resources: false, visualTasks: 0, soundTasks: 0 },
    changedRgbEdges: actualMap.rows.filter((row) => row[1] > 0).length,
  };
}
console.log(JSON.stringify(summary, null, 2));
