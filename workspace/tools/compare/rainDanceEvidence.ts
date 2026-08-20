/** Replay the retained MOVE_RAIN_DANCE Scene-ON evidence without production pixels. */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/rain-dance-evidence.json", "utf8",
)) as Json;
const orientations: Orientation[] = ["player-back", "opponent-front"];
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const fail = (message: string): never => { throw new Error(message); };
const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) fail(message);
};

function ranges(ages: number[]): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (const age of ages) {
    const prior = result.at(-1);
    if (!prior || age !== prior[1] + 1) result.push([age, age]);
    else prior[1] = age;
  }
  return result;
}

function changed(rows: Json[], selector: (row: Json) => unknown): number[] {
  return rows.flatMap((row, age) => age > 0 && !same(selector(row), selector(rows[age - 1]!)) ? [age] : []);
}

const sourceAudit = JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", fixture.source.audit,
], { encoding: "utf8" })) as Json;
assert(sourceAudit.move === "MOVE_RAIN_DANCE" && sourceAudit.moveId === 240, "source move drifted");
assert(same(sourceAudit.sourceBounds, {
  start: "0x082d050a",
  endExclusive: "0x082d0555",
  pointerContract: "half-open-byte-interval-with-even-and-odd-command-pointers-observed",
}), "source pointer contract drifted");
assert(same(sourceAudit.tasks, ["AnimTask_BlendBattleAnimPal", "AnimTask_CreateRaindrops"]), "source tasks drifted");
assert(same(sourceAudit.assets, ["ANIM_TAG_RAIN_DROPS", "gBattleAnimSpriteGfx_RainDrops", "gBattleAnimSpritePal_RainDrops"]), "source assets drifted");
assert(same(sourceAudit.carrier, { frontierMon: "FRONTIER_MON_WOOPER", setId: 14, species: 194 }), "source carrier drifted");
assert(sourceAudit.audio.soundEffect === "SE_M_RAIN_DANCE" && sourceAudit.audio.id === 127, "source audio drifted");

const result: Json = {};
for (const orientation of orientations) {
  const config = fixture.orientations[orientation] as Json;
  for (const [path, expected] of [
    [config.scenario, config.scenarioSha256],
    [fixture.source.audit, fixture.source.auditSha256],
    [fixture.source.probe, fixture.source.probeSha256],
    [config.denseState, config.denseStateSha256],
    [config.rawRgbArchive, config.rawRgbArchiveSha256],
    [config.changeMap, config.changeMapSha256],
  ] as const) assert(sha(readFileSync(path)) === expected, `${path} receipt drifted`);
  assert(config.probeJsonSha256 === config.repeatProbeJsonSha256, `${orientation}: dense repeat drifted`);
  assert(config.rawRgbSha256 === config.repeatRawRgbSha256, `${orientation}: RGB repeat drifted`);

  const dense = gunzipSync(readFileSync(config.denseState));
  assert(sha(dense) === config.probeJsonSha256, `${orientation}: dense JSON hash drifted`);
  const probe = JSON.parse(dense.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  assert(probe.schema === "rain-dance-dense-evidence/v1", `${orientation}: probe schema drifted`);
  assert(probe.sourceWindow.startFrame === config.sourceWindow.startFrame
    && probe.sourceWindow.endFrame === config.sourceWindow.endFrame
    && probe.sourceWindow.frameCount === config.sourceWindow.frameCount,
  `${orientation}: source window drifted`);
  assert(rows.length === 187 && probe.sourceWindow.sourceFrameCount === 187, `${orientation}: incomplete dense window`);
  assert(rows[0]!.scriptOffset === 0, `${orientation}: source start offset drifted`);
  const last = rows.at(-1)!;
  assert(last.animScriptActive === false && last.visualTaskCount === 0 && last.soundTaskCount === 0,
    `${orientation}: first inactive cleanup is not retained`);
  assert(last.scriptPtr === 137168212 && last.scriptPtrParity === 0, `${orientation}: final source pointer drifted`);
  assert(same(probe.sourcePointerContract.observedParities, [0, 1])
    && probe.sourcePointerContract.sourceRowsAllEven === false,
  `${orientation}: even/odd pointer evidence drifted`);
  assert(same(probe.topology.tasks, ["AnimTask_BlendSpriteColor_Step2", "AnimTask_CreateRaindrops"]),
    `${orientation}: task topology drifted`);
  assert(probe.topology.templates.includes("gRainDropSpriteTemplate")
    && probe.topology.callbacks.includes("AnimRainDrop_Step"), `${orientation}: rain sprite topology drifted`);

  const immutable = JSON.stringify(rows[0]!.immutableState);
  const parties = JSON.stringify(rows[0]!.parties);
  const battlers = JSON.stringify(rows[0]!.battlers);
  let oamLatch = 0;
  let matrixLatch = 0;
  let paletteLatch = 0;
  let maxDrops = 0;
  let createCount = 0;
  let destroyCount = 0;
  let previousDrops = new Set<number>();
  const rainTaskAges: number[] = [];
  const blendTaskAges: number[] = [];
  const audioStarts: Array<[number, string]> = [];
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    assert(row.scriptOwner === "Move_RAIN_DANCE" && row.scriptPtr >= 137168138 && row.scriptPtr < 137168213,
      `${orientation}: source owner/range drift at age ${age}`);
    assert(row.scriptPtrParity === row.scriptPtr % 2, `${orientation}: pointer parity drift at age ${age}`);
    assert(row.softwareOam.length === 128 && row.hardwareOam.length === 128
      && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32
      && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512
      && row.hardwarePalette.length === 512 && row.paletteTags.length === 16
      && row.tileTags.length === 128, `${orientation}: retained buffer shape drift at age ${age}`);
    assert(row.parties.player.length === 3 && row.parties.opponent.length === 3,
      `${orientation}: complete party rows drift at age ${age}`);
    assert(row.parties.player.every((mon: Json) => mon.checksumValid === true)
      && row.parties.opponent.every((mon: Json) => mon.checksumValid === true),
    `${orientation}: legal party checksum drift at age ${age}`);
    assert(JSON.stringify(row.immutableState) === immutable
      && JSON.stringify(row.parties) === parties
      && JSON.stringify(row.battlers) === battlers,
    `${orientation}: gameplay/party state changed at age ${age}`);

    const rainTasks = row.tasks.filter((task: Json) => task.func.symbol === "AnimTask_CreateRaindrops");
    const blendTasks = row.tasks.filter((task: Json) => task.func.symbol === "AnimTask_BlendSpriteColor_Step2");
    if (rainTasks.length) rainTaskAges.push(age);
    if (blendTasks.length) blendTaskAges.push(age);
    if (age >= 18 && age <= 135) {
      assert(rainTasks.length === 2, `${orientation}: two rain tasks missing at age ${age}`);
      assert(rainTasks.every((task: Json) => same(task.data.slice(1, 4), [0, 3, 120])),
        `${orientation}: rain task payload drift at age ${age}`);
    }
    if (age === 4 || age === 172) {
      assert(blendTasks.length === 1 && same(blendTasks[0]!.data.slice(0, 5), age === 4
        ? [14, 3, 2, 0, 4]
        : [14, 3, 2, 4, 0]),
        `${orientation}: palette blend task setup drift at age ${age}`);
    }

    const drops = row.rainDrops as Json[];
    const currentDrops = new Set(drops.map((drop) => drop.slot as number));
    createCount += [...currentDrops].filter((slot) => !previousDrops.has(slot)).length;
    destroyCount += [...previousDrops].filter((slot) => !currentDrops.has(slot)).length;
    previousDrops = currentDrops;
    maxDrops = Math.max(maxDrops, drops.length);
    for (const drop of drops) {
      assert(drop.template.symbol === "gRainDropSpriteTemplate"
        && ["AnimRainDrop", "AnimRainDrop_Step"].includes(drop.callback.symbol)
        && same(drop.matrix, [256, 0, 0, 256])
        && drop.subpriority === 4 && drop.invisible === false,
      `${orientation}: rain sprite identity/OAM drift at age ${age}`);
    }
    if (age > 0) {
      if (same(row.hardwareOam, rows[age - 1]!.softwareOam)) oamLatch += 1;
      if (same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices)) matrixLatch += 1;
      if (same(row.hardwarePalette, rows[age - 1]!.fadedPalette)) paletteLatch += 1;
    }
    for (const player of ["SE1", "SE2"]) {
      const current = row.audio[player].songHeaderIdentity.symbol;
      const prior = age ? rows[age - 1]!.audio[player].songHeaderIdentity.symbol : null;
      if (current !== prior) audioStarts.push([age, current]);
    }
  }
  assert(same(ranges(rainTaskAges), [[18, 135]]), `${orientation}: rain task lifetime drifted`);
  assert(same(ranges(blendTaskAges), [[4, 16], [172, 184]]), `${orientation}: blend task lifetime drifted`);
  assert(createCount === 80 && destroyCount === 80 && maxDrops === 14,
    `${orientation}: rain allocator lifecycle drifted`);
  assert(oamLatch === 186 && matrixLatch === 186 && paletteLatch === 186,
    `${orientation}: source-to-hardware latch drifted`);
  assert(same(changed(rows, (row) => row.fadedPalette), [1, 8, 11, 14, 17, 176, 179, 182, 185]),
    `${orientation}: palette blend edges drifted`);
  assert(same(changed(rows, (row) => row.unfadedPalette), [1]), `${orientation}: unfaded palette edge drifted`);
  assert(same(changed(rows, (row) => row.registers), []), `${orientation}: register timing drifted`);
  assert(same(audioStarts, [[0, "se_effective"], [0, "se_select"], [4, "se_m_rain_dance"]]),
    `${orientation}: audio starts drifted`);
  assert(new Set(rows.map((row) => row.immutableState.rngValue)).size === 1
    && new Set(rows.map((row) => row.animationRng)).size === 187,
  `${orientation}: RNG-domain measurement drifted`);
  assert(rows[1]!.paletteTags.includes(10115) && rows[185]!.paletteTags.includes(10115)
    && !rows[186]!.paletteTags.includes(10115)
    && rows[1]!.tileTags.includes(10115) && !rows[186]!.tileTags.includes(10115),
  `${orientation}: rain resource tag lifetime drifted`);

  const scratch = createScratchDir("rain-dance-rgb-");
  const untar = spawnSync("tar", ["-xzf", config.rawRgbArchive, "-C", scratch], { encoding: "utf8" });
  assert(untar.status === 0, `${orientation}: raw RGB archive extraction failed`);
  const prefix = orientation === "player-back" ? "player-rgb" : "opponent-rgb";
  const raw = createHash("sha256");
  for (const row of rows) {
    const rgb = readFileSync(join(scratch, prefix, `${String(row.frame).padStart(5, "0")}.rgb`));
    assert(rgb.length === 240 * 160 * 3 && sha(rgb) === row.sha256,
      `${orientation}: raw RGB row ${row.frame} drifted`);
    raw.update(rgb);
  }
  assert(raw.digest("hex") === config.rawRgbSha256, `${orientation}: raw RGB sequence drifted`);
  result[orientation] = {
    sourceWindow: probe.sourceWindow,
    pointer: probe.sourcePointerContract,
    lifecycle: { taskRanges: ranges(rainTaskAges), creates: createCount, destroys: destroyCount, peak: maxDrops },
    latches: { hardwareOamEqualsPrecedingSoftware: "186/186", hardwareMatricesEqualsPrecedingSoftware: "186/186", hardwarePaletteEqualsPrecedingFaded: "186/186" },
    paletteBlendEdges: changed(rows, (row) => row.fadedPalette),
    audioStarts,
    state: { gameplayRngDistinct: 1, animationRngDistinct: 187, partiesStable: true },
    cleanup: { age: 186, active: false, visualTasks: 0, soundTasks: 0, rainDrops: 0, rainPaletteTag: false, rainTileTag: false },
  };
}

assert(fixture.acceptance.productionFramebufferRows === 0
  && fixture.acceptance.reducerRows === 374
  && fixture.acceptance.typedSeamRows === 374
  && fixture.boundedRemainder.reducer.startsWith("implemented")
  && fixture.boundedRemainder.typedSeam.startsWith("implemented")
  && fixture.boundedRemainder.productionCompositor === "not implemented",
"partial remainder was widened");
console.log(JSON.stringify(result, null, 2));
