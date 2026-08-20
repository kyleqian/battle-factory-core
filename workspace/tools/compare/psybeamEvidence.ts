import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/psybeam-evidence.json", "utf8",
));
const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const expectedTasks = new Set([
  "SetPsychicBackground_Step", "Task_FadeToBg",
  "SoundTask_LoopSEAdjustPanning_Step", "AnimTask_SwayMonStep",
  "AnimTask_BlendColorCycleLoop",
]);

const result: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const config = fixture.orientations[orientation];
  for (const [path, expected] of [
    [config.scenario, config.scenarioSha256],
    [fixture.source.audit, fixture.source.auditSha256],
    [fixture.source.probe, fixture.source.probeSha256],
    [config.denseState, config.denseStateSha256],
    [config.rawRgbArchive, config.rawRgbArchiveSha256],
    [config.changeMap, config.changeMapSha256],
  ] as const) {
    if (sha(readFileSync(path)) !== expected) throw new Error(`${path} receipt drifted`);
  }
  if (config.probeJsonSha256 !== config.repeatProbeJsonSha256) {
    throw new Error(`${orientation} twice-fresh probe mismatch`);
  }
  const json = gunzipSync(readFileSync(config.denseState));
  if (sha(json) !== config.probeJsonSha256) throw new Error(`${orientation} probe JSON drifted`);
  const probe = JSON.parse(json.toString("utf8"));
  const frames = probe.frames as any[];
  if (probe.schema !== "psybeam-dense-evidence/v1"
    || !same(probe.sourceWindow, config.sourceWindow)
    || !same(probe.topology.tasks, [...expectedTasks].sort())
    || frames.length !== 160 || frames[0].scriptOffset !== 0
    || frames.at(-1).animScriptActive !== false) {
    throw new Error(`${orientation} complete even-pointer window drifted`);
  }
  const immutable = JSON.stringify(frames[0].immutableState);
  const parties = JSON.stringify(frames[0].parties);
  let oamLatch = 0;
  let matrixLatch = 0;
  let paletteLatch = 0;
  const creationAges: number[] = [];
  let prior = new Set<string>();
  for (let age = 0; age < frames.length; age += 1) {
    const row = frames[age];
    if (row.softwareOam.length !== 128 || row.hardwareOam.length !== 128
      || row.softwareMatrices.length !== 32 || row.hardwareMatrices.length !== 32
      || row.fadedPalette.length !== 512 || row.unfadedPalette.length !== 512
      || row.hardwarePalette.length !== 512 || row.paletteTags.length !== 16
      || row.tileTags.length !== 128 || row.parties.player.length !== 3
      || row.parties.opponent.length !== 3
      || JSON.stringify(row.immutableState) !== immutable
      || JSON.stringify(row.parties) !== parties) {
      throw new Error(`${orientation} retained state drift at age ${age}`);
    }
    const current = new Set<string>(row.sprites
      .filter((sprite: any) => sprite.template.symbol === "gGoldRingSpriteTemplate")
      .map((sprite: any) => `${sprite.slot}:gGoldRingSpriteTemplate`));
    for (const identity of current) if (!prior.has(identity)) creationAges.push(age);
    prior = current;
    for (const task of row.tasks.filter((task: any) => expectedTasks.has(task.func.symbol))) {
      if (!expectedTasks.has(task.func.symbol)) throw new Error(`${orientation} task drift`);
    }
    if (age > 0) {
      if (same(row.hardwareOam, frames[age - 1].softwareOam)) oamLatch += 1;
      if (same(row.hardwareMatrices, frames[age - 1].softwareMatrices)) matrixLatch += 1;
      if (same(row.hardwarePalette, frames[age - 1].fadedPalette)) paletteLatch += 1;
    }
  }
  if (!same(creationAges, [42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102])) {
    throw new Error(`${orientation} eleven-ring schedule drifted`);
  }
  const ages = (symbol: string): number[] => frames.flatMap((row, age) =>
    row.tasks.some((task: any) => task.func.symbol === symbol) ? [age] : []);
  const range = (symbol: string): [number, number] => {
    const found = ages(symbol);
    return [found[0], found.at(-1)];
  };
  if (!same(range("SoundTask_LoopSEAdjustPanning_Step"), [42, 88])
    || !same(range("AnimTask_SwayMonStep"), [54, 116])
    || !same(range("AnimTask_BlendColorCycleLoop"), [54, 112])
    || !same(frames.flatMap((row, age) => row.sprites.some((sprite: any) =>
      sprite.template.symbol === "gGoldRingSpriteTemplate") ? [age] : []).slice(0, 1), [42])) {
    throw new Error(`${orientation} component lifetime drifted`);
  }
  const bldyEdges = frames.flatMap((row, age) =>
    age === 0 || row.registers.bldy !== frames[age - 1].registers.bldy
      ? [[age, row.registers.bldy]] : []);
  if (!same(bldyEdges.slice(0, 3), [[0, 0], [6, 1], [7, 2]])
    || !same(bldyEdges.slice(-3), [[155, 2], [156, 1], [157, 0]])) {
    throw new Error(`${orientation} psychic BLDY program drifted`);
  }
  if (oamLatch !== 159 || matrixLatch !== 159 || paletteLatch !== 159
    || new Set(frames.map((row) => row.immutableState.rngValue)).size !== 1
    || new Set(frames.map((row) => row.animationRng)).size !== 160
    || frames[159].visualTaskCount !== 0 || frames[159].soundTaskCount !== 0
    || frames[159].tileTags.includes(10163) || frames[159].paletteTags.includes(10163)) {
    throw new Error(`${orientation} latch/RNG/resource cleanup drifted`);
  }
  const scratch = createScratchDir("psybeam-rgb-");
  const untar = spawnSync("tar", ["-xzf", config.rawRgbArchive, "-C", scratch], { encoding: "utf8" });
  if (untar.status !== 0) throw new Error(untar.stderr);
  const raw = createHash("sha256");
  for (const row of frames) {
    const rgb = readFileSync(join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== row.sha256) throw new Error(`${orientation} RGB ${row.frame} drifted`);
    raw.update(rgb);
  }
  if (raw.digest("hex") !== config.rawRgbSha256) throw new Error(`${orientation} RGB sequence drifted`);
  result[orientation] = {
    sourceWindow: probe.sourceWindow,
    ringCreationAges: creationAges,
    latches: { oam: "159/159", matrices: "159/159", palette: "159/159" },
    bldyEdges: bldyEdges.length,
    orientationShift: 0,
    rng: { gameplayDistinct: 1, animationDistinct: 160 },
    cleanup: { age: 159, active: false, visualTasks: 0, soundTasks: 0 },
  };
}
console.log(JSON.stringify(result, null, 2));
