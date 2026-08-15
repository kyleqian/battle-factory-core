/**
 * Fail-closed portable verifier for the banked MOVE_MEGA_DRAIN Scene-ON receipt.
 *
 * This deliberately verifies evidence only.  It does not import a reducer,
 * presentation seam, compositor, framebuffer, or production recording.  Every
 * retained raw RGB row is rehashed and replayed into the normalized map.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Row = Record<string, any>;
type Evidence = Record<string, any>;
type Orientation = "player-back" | "opponent-front";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/mega-drain-evidence.json", "utf8")) as Evidence;
const sha256 = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value);
const RGB_BYTES = 240 * 160 * 3;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MEGA_DRAIN evidence: ${message}`);
}

function wholeRows(value: string): number {
  return Number(value.split("/")[0]);
}

function signed9(value: number): number {
  return value >= 0x100 ? value - 0x200 : value;
}

function starts(rows: Row[], selector: (row: Row) => boolean): number[] {
  return rows.flatMap((row, age) => selector(row) && (!age || !selector(rows[age - 1]!)) ? [age] : []);
}

function transitions(rows: Row[], selector: (row: Row) => unknown): number[] {
  return rows.flatMap((row, age) => age && stable(selector(row)) !== stable(selector(rows[age - 1]!)) ? [age] : []);
}

function compactOwners(rows: Row[]): Array<{ startAge: number; endAge: number; owner: string | null }> {
  const result: Array<{ startAge: number; endAge: number; owner: string | null }> = [];
  for (let start = 0; start < rows.length;) {
    let end = start + 1;
    while (end < rows.length && rows[end]!.scriptOwner === rows[start]!.scriptOwner) end += 1;
    result.push({ startAge: start, endAge: end - 1, owner: rows[start]!.scriptOwner });
    start = end;
  }
  return result;
}

function expectedRawMembers(rows: Row[]): string[] {
  return rows.map((row) => `./${String(row.frame).padStart(5, "0")}.rgb`);
}

function archiveRgbRows(archive: string, rows: Row[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  assert(stable(members) === stable(expectedRawMembers(rows)), `${archive}: archive members`);
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 64 * 1024 * 1024 });
  assert(bytes.length === rows.length * RGB_BYTES, `${archive}: RGB byte length`);
  return rows.map((_, age) => bytes.subarray(age * RGB_BYTES, (age + 1) * RGB_BYTES));
}

function deriveChangeMap(orientation: Orientation, probe: Evidence, rgbRows: Buffer[]): Evidence {
  const rows = probe.frames as Row[];
  const attackerSide = rows[0]!.animationBattlers.attacker === 0 ? "player" : "opponent";
  const targetKey = attackerSide === "player" ? "opponentSprite" : "playerSprite";
  const targetBank = attackerSide === "player" ? 1 : 2;
  const changeRows = rows.map((row, age) => {
    const current = rgbRows[age]!;
    const prior = age ? rgbRows[age - 1]! : current;
    assert(sha256(current) === row.sha256, `${orientation} age ${age}: raw RGB digest`);
    let changedPixels = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let offset = 0; offset < current.length; offset += 3) {
      if (!age || (current[offset] === prior[offset] && current[offset + 1] === prior[offset + 1]
        && current[offset + 2] === prior[offset + 2])) continue;
      changedPixels += 1;
      const pixel = offset / 3;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return {
      age, scriptOwner: row.scriptOwner, scriptOwnerOffset: row.scriptOwnerOffset,
      scriptOffset: row.scriptOffset, animScriptActive: row.animScriptActive,
      sha256: row.sha256, changedPixels,
      bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
    };
  });
  return {
    schema: "mega-drain-normalized-change-map/v1",
    orientation, sourceWindow: probe.sourceWindow, rows: changeRows,
    events: {
      sourceOwners: compactOwners(rows),
      spriteStarts: {
        impactAnimation1: starts(rows, (row) => row.sprites.some((sprite: Row) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate")),
        absorptionOrbs: starts(rows, (row) => row.sprites.some((sprite: Row) => sprite.template.symbol === "gAbsorptionOrbSpriteTemplate")),
        healingStars: starts(rows, (row) => row.sprites.some((sprite: Row) => sprite.template.symbol === "gHealingBlueStarSpriteTemplate")),
        simplePaletteBlend: starts(rows, (row) => row.sprites.some((sprite: Row) => sprite.template.symbol === "gSimplePaletteBlendSpriteTemplate")),
      },
      taskStarts: {
        shakeMon: starts(rows, (row) => row.tasks.some((task: Row) => task.func.symbol === "AnimTask_ShakeMon_Step")),
        monbg: starts(rows, (row) => row.tasks.some((task: Row) => task.func.symbol === "Task_UpdateMonBg")),
        clearMonbg: starts(rows, (row) => row.tasks.some((task: Row) => task.func.symbol === "Task_ClearMonBg")),
      },
      targetSoftwareTransitions: transitions(rows, (row) => [row[targetKey].x2, row[targetKey].y2, row[targetKey].attr]),
      targetBackground: {
        bank: `BG${targetBank}`,
        sourceTransitions: transitions(rows, (row) => [row.backgroundPositions[`gBattle_BG${targetBank}_X`], row.backgroundPositions[`gBattle_BG${targetBank}_Y`]]),
        hardwareTransitions: transitions(rows, (row) => [row.registers[`bg${targetBank}hofs`], row.registers[`bg${targetBank}vofs`]]),
      },
      palette: {
        fadedTransitions: transitions(rows, (row) => row.fadedPalette),
        hardwareTransitions: transitions(rows, (row) => row.hardwarePalette),
      },
      blend: {
        bldcntTransitions: transitions(rows, (row) => row.registers.bldcnt),
        bldalphaTransitions: transitions(rows, (row) => row.registers.bldalpha),
        bldyTransitions: transitions(rows, (row) => row.registers.bldy),
      },
      audioRestarts: Object.fromEntries(["se1", "se2"].map((channel) => [channel,
        rows.flatMap((row, age) => age && row[channel].status === 0 && rows[age - 1]![channel].status !== 0
          ? [{ age, identity: row[channel].songHeaderIdentity.symbol, panX: row[channel].tracks.map((track: Row) => track.panX) }]
          : []),
      ])),
    },
  };
}

function assertDenseRow(row: Row, orientation: Orientation): void {
  for (const field of fixture.stateContract.requiredFrameFields) assert(field in row, `${orientation}: missing ${field}`);
  assert(/^[a-f0-9]{64}$/.test(row.sha256), `${orientation}: framebuffer SHA`);
  assert(row.tasks.every((task: Row) => task.raw.length === 0x50 && task.data.length === 16 && task.func.symbol), `${orientation}: complete tasks`);
  assert(row.sprites.every((sprite: Row) => sprite.raw.length === 0x88 && sprite.data.length === 8
    && sprite.template && sprite.callback && sprite.matrix.length === 4 && sprite.hardwareMatrix.length === 4), `${orientation}: complete sprites`);
  assert(row.softwareOam.length === 128 && row.hardwareOam.length === 128, `${orientation}: complete OAM`);
  assert(row.matrices.software.length === 32 && row.matrices.hardware.length === 32, `${orientation}: complete matrices`);
  assert(row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512, `${orientation}: complete palettes`);
  assert(row.paletteTags.length === 16 && row.tileTags.length === 128, `${orientation}: loaded tag tables`);
  assert(Object.keys(row.registers).length === 20, `${orientation}: GPU register surface`);
  assert(Object.keys(row.backgroundMemory).sort().join(",") === "bg0,bg1,bg2,bg3", `${orientation}: BG memory banks`);
  for (const bank of Object.values(row.backgroundMemory) as Row[]) {
    assert(bank.tiles.length === 0x1000 && bank.tilemap.length === 0x1000, `${orientation}: BG tiles/maps`);
  }
  assert(row.scanline.state.length === 0x38 && row.scanline.buffers.length === 2
    && row.scanline.buffers.every((buffer: number[]) => buffer.length === 320), `${orientation}: scanline buffers`);
  for (const audio of [row.se1, row.se2]) {
    assert(audio.rawInfo.length === 0x80 && audio.tracks.length === 4
      && audio.tracks.every((track: Row) => track.raw.length === 0xa0 && track.pan !== undefined && track.panX !== undefined), `${orientation}: audio surface`);
  }
  assert(Object.keys(row.battlers).sort().join(",") === "opponent,player", `${orientation}: battlers`);
  assert(row.parties.player.length === 3 && row.parties.opponent.length === 3, `${orientation}: complete parties`);
}

function assertPointerRows(orientation: Orientation, evidence: Evidence, probe: Evidence): void {
  const source = probe.sourceSymbols;
  assert(stable(source) === stable({
    Move_MEGA_DRAIN: 0x082d10b2, evenPointerStart: 0x082d10b2,
    MegaDrainAbsorbEffect: 0x082d1121, Move_GIGA_DRAIN: 0x082d1242,
    HealingEffect: 0x082d79df, HealingEffect2: 0x082d7a28,
  }), `${orientation}: source symbols`);
  const ranges = [
    ["Move_MEGA_DRAIN", source.Move_MEGA_DRAIN, source.MegaDrainAbsorbEffect],
    ["MegaDrainAbsorbEffect", source.MegaDrainAbsorbEffect, source.Move_GIGA_DRAIN],
    ["HealingEffect", source.HealingEffect, source.HealingEffect2],
  ] as const;
  const ownerFor = (pointer: number) => ranges.find(([, start, end]) => start <= pointer && pointer < end);
  const rows = probe.frames as Row[];
  assert(stable(probe.sourceWindow) === stable(evidence.sourceWindow), `${orientation}: source window`);
  assert(rows.length === evidence.sourceWindow.frameCount, `${orientation}: row count`);
  assert(stable(rows[0]!) === stable({ ...rows[0], frame: evidence.sourceWindow.startFrame }), `${orientation}: first frame number`);
  assert(rows[0]!.scriptPtr === source.Move_MEGA_DRAIN && rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive, `${orientation}: first source pointer`);
  const last = rows.at(-1)!;
  assert(last.frame === evidence.sourceWindow.endFrame && last.scriptPtr === source.MegaDrainAbsorbEffect - 1
    && last.scriptOffset === 110 && !last.animScriptActive && last.visualTaskCount === 0 && last.soundTaskCount === 0, `${orientation}: first inactive cleanup`);
  rows.forEach((row, age) => {
    assert(row.frame === evidence.sourceWindow.startFrame + age, `${orientation} age ${age}: dense frame sequence`);
    const owner = ownerFor(row.scriptPtr);
    assert(owner && row.scriptOwner === owner[0] && row.scriptOwnerOffset === row.scriptPtr - owner[1], `${orientation} age ${age}: pointer owner`);
    assert(row.scriptEven === (row.scriptPtr % 2 === 0), `${orientation} age ${age}: literal pointer parity`);
    assert(row.scriptOffset === (row.scriptOwner === "Move_MEGA_DRAIN" ? row.scriptPtr - source.Move_MEGA_DRAIN : null), `${orientation} age ${age}: script offset`);
  });
}

function assertLatches(orientation: Orientation, evidence: Evidence, probe: Evidence, map: Evidence): void {
  const rows = probe.frames as Row[];
  let oam = 0, matrices = 0, palettes = 0, background = 0;
  const paletteMismatches: number[] = [];
  const bank = evidence.latches.activeBackground === "BG1" ? 1 : 2;
  for (let age = 1; age < rows.length; age += 1) {
    const current = rows[age]!;
    const prior = rows[age - 1]!;
    if (stable(current.hardwareOam) === stable(prior.softwareOam)) oam += 1;
    if (stable(current.matrices.hardware) === stable(prior.matrices.software)) matrices += 1;
    if (stable(current.hardwarePalette) === stable(prior.fadedPalette)) palettes += 1;
    else paletteMismatches.push(age);
    if (signed9(current.registers[`bg${bank}hofs`]) === prior.backgroundPositions[`gBattle_BG${bank}_X`]
      && signed9(current.registers[`bg${bank}vofs`]) === prior.backgroundPositions[`gBattle_BG${bank}_Y`]) background += 1;
  }
  assert(oam === wholeRows(evidence.latches.hardwareOamEqualsPrecedingSoftware), `${orientation}: OAM latch`);
  assert(matrices === wholeRows(evidence.latches.hardwareMatricesEqualsPrecedingSoftware), `${orientation}: affine latch`);
  assert(palettes === wholeRows(evidence.latches.hardwarePaletteEqualsPrecedingFaded), `${orientation}: palette latch`);
  assert(stable(paletteMismatches) === stable(evidence.latches.hardwarePaletteSameRowMonbgExceptionAges), `${orientation}: monbg palette exception`);
  assert(background === wholeRows(evidence.latches.activeBackgroundOffsetsEqualPrecedingSource), `${orientation}: target BG latch`);
  const expectedTargetTransitions = orientation === "player-back" ? [36, 38, 40, 42, 44, 213, 217] : [38, 40, 42, 44, 217];
  assert(stable(map.events.spriteStarts) === stable({
    impactAnimation1: [32], absorptionOrbs: [50], healingStars: [145], simplePaletteBlend: [13, 194],
  }), `${orientation}: source sprite starts`);
  assert(stable(map.events.taskStarts) === stable({ shakeMon: [36], monbg: [10], clearMonbg: [213] }), `${orientation}: source task starts`);
  assert(stable(map.events.targetSoftwareTransitions) === stable(expectedTargetTransitions), `${orientation}: ShakeMon source rows`);
  assert(stable(map.events.palette) === stable({
    fadedTransitions: [1, 4, 7, 10, 15, 18, 21, 24, 196, 199, 202, 205],
    hardwareTransitions: [2, 5, 8, 10, 16, 19, 22, 25, 197, 200, 203, 206],
  }), `${orientation}: SimplePaletteBlend transfer rows`);
  assert(stable(map.events.blend) === stable({ bldcntTransitions: [13, 213], bldalphaTransitions: [13, 213], bldyTransitions: [] }), `${orientation}: blend lifecycle`);
  const expectedAudioPan = orientation === "player-back" ? [63, 0, 0, 0] : [-63, 0, 0, 0];
  const expectedHealingPan = orientation === "player-back" ? [-64, -64, 0, 0] : [63, 63, 0, 0];
  const audio = map.events.audioRestarts.se1;
  assert(stable(audio.map((entry: Row) => [entry.age, entry.identity, entry.panX])) === stable([
    [32, "se_m_absorb", expectedAudioPan], [50, "se_m_bubble3", expectedAudioPan],
    [56, "se_m_bubble3", expectedAudioPan], [62, "se_m_bubble3", expectedAudioPan],
    [68, "se_m_bubble3", expectedAudioPan], [74, "se_m_bubble3", expectedAudioPan],
    [80, "se_m_bubble3", expectedAudioPan], [86, "se_m_bubble3", expectedAudioPan],
    [92, "se_m_bubble3", expectedAudioPan], [145, "se_m_absorb_2", expectedHealingPan],
  ]), `${orientation}: audio identities/pans/restarts`);
  assert(map.events.audioRestarts.se2.length === 0, `${orientation}: no SE2 restart`);
}

function verifyOrientation(orientation: Orientation, evidence: Evidence): number {
  for (const [path, digest] of [
    [evidence.scenario, evidence.scenarioSha256], [fixture.source.probe, fixture.source.probeSha256],
    [evidence.denseState, evidence.denseStateSha256], [evidence.rawRgbArchive, evidence.rawRgbArchiveSha256],
    [evidence.changeMap, evidence.changeMapSha256],
  ] as const) assert(sha256(readFileSync(path)) === digest, `${orientation}: pinned ${path}`);
  assert(evidence.repeatProbeJsonSha256 === evidence.probeJsonSha256, `${orientation}: fresh repeat proof`);
  const compressed = readFileSync(evidence.denseState);
  const decoded = gunzipSync(compressed);
  assert(sha256(decoded) === evidence.probeJsonSha256, `${orientation}: dense JSON digest`);
  const probe = JSON.parse(decoded.toString("utf8")) as Evidence;
  assert(probe.schema === "mega-drain-dense-evidence/v1" && probe.moveId === 72, `${orientation}: probe schema`);
  assertPointerRows(orientation, evidence, probe);
  const rows = probe.frames as Row[];
  rows.forEach((row) => assertDenseRow(row, orientation));
  const rgbRows = archiveRgbRows(evidence.rawRgbArchive, rows);
  const storedMap = JSON.parse(readFileSync(evidence.changeMap, "utf8")) as Evidence;
  const derivedMap = deriveChangeMap(orientation, probe, rgbRows);
  assert(stable(derivedMap) === stable(storedMap), `${orientation}: normalized change-map replay`);
  assertLatches(orientation, evidence, probe, storedMap);
  for (const field of ["immutableState", "battlers", "parties", "engine"]) {
    assert(new Set(rows.map((row) => stable(row[field]))).size === 1, `${orientation}: immutable ${field}`);
  }
  assert(new Set(rows.map((row) => row.immutableState.rngValue)).size === fixture.stateContract.gameplayRngUniqueValues, `${orientation}: gameplay RNG`);
  assert(new Set(rows.map((row) => row.animationRng)).size === fixture.stateContract.animationRngUniqueValues, `${orientation}: animation RNG`);
  assert(rows.every((row) => row.animationBattlers.attacker === evidence.attacker && row.animationBattlers.target === evidence.target), `${orientation}: attack direction`);
  return rows.length;
}

assert(stable({
  schema: fixture.schema, oracleProfile: fixture.oracleProfile, move: fixture.move, moveId: fixture.moveId,
  status: fixture.status, coverageCredit: fixture.coverageCredit, coverageCounts: fixture.coverageCounts,
}) === stable({
  schema: "mega-drain-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_MEGA_DRAIN", moveId: 72,
  status: "unsupported", coverageCredit: false, coverageCounts: "Level 50: 185/276 exact, 0 partial, 0 staged, 91 unsupported",
}), "fixture scope");
const playerRows = verifyOrientation("player-back", fixture.orientations["player-back"]);
const opponentRows = verifyOrientation("opponent-front", fixture.orientations["opponent-front"]);
console.log(`MEGA_DRAIN portable evidence ${playerRows + opponentRows}/${playerRows + opponentRows}; player ${playerRows}, opponent ${opponentRows}`);
