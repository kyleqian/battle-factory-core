/**
 * Fail-closed portable verifier for the bilateral Scene-ON Giga Drain
 * receipt. It consumes only the retained state/RGB evidence and source
 * metadata; production code is checked separately by gigaDrainFramebuffer.ts.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

type Row = Record<string, any>;
type Evidence = Record<string, any>;
type Orientation = "player-back" | "opponent-front";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/giga-drain-evidence.json", "utf8",
)) as Evidence;
const sha256 = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value);
const RGB_BYTES = 240 * 160 * 3;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`GIGA_DRAIN evidence: ${message}`);
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

function archiveRgbRows(archive: string, rows: Row[]): Buffer[] {
  const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb"));
  const expected = rows.map((row) => String(row.frame).padStart(5, "0") + ".rgb");
  assert(stable(members) === stable(expected), `${archive}: ordered RGB members`);
  const bytes = execFileSync("tar", ["-xOzf", archive], { maxBuffer: 64 * 1024 * 1024 });
  assert(bytes.length === rows.length * RGB_BYTES, `${archive}: RGB byte length`);
  return rows.map((_, age) => bytes.subarray(age * RGB_BYTES, (age + 1) * RGB_BYTES));
}

function deriveChangeMap(orientation: Orientation, probe: Evidence, rgbRows: Buffer[]): Evidence {
  const rows = probe.frames as Row[];
  const targetKey = orientation === "player-back" ? "opponentSprite" : "playerSprite";
  const targetBank = orientation === "player-back" ? 1 : 2;
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
      minX = Math.min(minX, pixel % 240); minY = Math.min(minY, Math.floor(pixel / 240));
      maxX = Math.max(maxX, pixel % 240); maxY = Math.max(maxY, Math.floor(pixel / 240));
    }
    return {
      age, scriptOwner: row.scriptOwner, scriptOwnerOffset: row.scriptOwnerOffset,
      scriptOffset: row.scriptOffset, animScriptActive: row.animScriptActive,
      sha256: row.sha256, changedPixels,
      bounds: changedPixels ? [minX, minY, maxX, maxY] : null,
    };
  });
  return {
    schema: "giga-drain-normalized-change-map/v1",
    orientation, sourceWindow: probe.sourceWindow, rows: changeRows,
    events: {
      sourceOwners: compactOwners(rows),
      spriteStarts: {
        impactAnimation0: starts(rows, (row) => row.sprites.some((sprite: Row) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate")),
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

const required = fixture.stateContract.requiredFrameFields as string[];
function assertDenseRow(row: Row, orientation: Orientation): void {
  for (const field of required) assert(field in row, `${orientation}: missing ${field}`);
  assert(/^[a-f0-9]{64}$/.test(row.sha256), `${orientation}: framebuffer SHA`);
  assert(row.tasks.every((task: Row) => task.raw.length === 0x50 && task.data.length === 16 && task.func.symbol), `${orientation}: task surface`);
  assert(row.sprites.every((sprite: Row) => sprite.raw.length === 0x88 && sprite.data.length === 8
    && sprite.template && sprite.callback && sprite.matrix.length === 4 && sprite.hardwareMatrix.length === 4), `${orientation}: sprite surface`);
  assert(row.softwareOam.length === 128 && row.hardwareOam.length === 128, `${orientation}: OAM surface`);
  assert(row.matrices.software.length === 32 && row.matrices.hardware.length === 32, `${orientation}: matrix surface`);
  assert(row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512, `${orientation}: palette surface`);
  assert(row.paletteTags.length === 16 && row.tileTags.length === 128 && Object.keys(row.registers).length === 20, `${orientation}: tags/registers`);
  assert(Object.keys(row.backgroundMemory).sort().join(",") === "bg0,bg1,bg2,bg3", `${orientation}: BG memory`);
  for (const bank of Object.values(row.backgroundMemory) as Row[]) assert(bank.tiles.length === 0x1000 && bank.tilemap.length === 0x1000, `${orientation}: BG bank bytes`);
  assert(row.scanline.state.length === 0x38 && row.scanline.buffers.length === 2 && row.scanline.buffers.every((b: number[]) => b.length === 320), `${orientation}: scanline`);
  for (const audio of [row.se1, row.se2]) assert(audio.rawInfo.length === 0x80 && audio.tracks.length === 4 && audio.tracks.every((t: Row) => t.raw.length === 0xa0 && t.pan !== undefined && t.panX !== undefined), `${orientation}: audio`);
  assert(Object.keys(row.battlers).sort().join(",") === "opponent,player" && row.parties.player.length === 3 && row.parties.opponent.length === 3, `${orientation}: party state`);
}

function signed9(value: number): number {
  const v = value & 0x1ff;
  return v >= 0x100 ? v - 0x200 : v;
}

function verifyOrientation(orientation: Orientation, evidence: Evidence, writeMap: boolean): number {
  for (const [path, digest] of [[evidence.scenario, evidence.scenarioSha256], [fixture.source.probe, fixture.source.probeSha256], [evidence.denseState, evidence.denseStateSha256], [evidence.rawRgbArchive, evidence.rawRgbArchiveSha256]] as const) assert(sha256(readFileSync(path)) === digest, `${orientation}: pinned ${path}`);
  if (!writeMap) assert(sha256(readFileSync(evidence.changeMap)) === evidence.changeMapSha256, `${orientation}: pinned change map`);
  assert(evidence.repeatProbeJsonSha256 === evidence.probeJsonSha256, `${orientation}: fresh repeat proof`);
  const decoded = gunzipSync(readFileSync(evidence.denseState));
  assert(sha256(decoded) === evidence.probeJsonSha256, `${orientation}: decoded probe digest`);
  const probe = JSON.parse(decoded.toString("utf8")) as Evidence;
  assert(probe.schema === "mega-drain-dense-evidence/v1" && probe.moveId === 202, `${orientation}: probe schema`);
  const rows = probe.frames as Row[];
  assert(stable(probe.sourceWindow) === stable(evidence.sourceWindow) && rows.length === 230, `${orientation}: source window`);
  assert(rows[0]!.scriptPtr === 0x082d1242 && rows[0]!.scriptOwner === "Move_GIGA_DRAIN" && rows[0]!.animScriptActive, `${orientation}: first pointer`);
  const last = rows.at(-1)!;
  assert(last.scriptPtr === 0x082d1242 + 110 && last.scriptOwner === "Move_GIGA_DRAIN" && last.scriptOffset === 110 && !last.animScriptActive && last.visualTaskCount === 0 && last.soundTaskCount === 0, `${orientation}: cleanup pointer`);
  rows.forEach((row, age) => {
    assert(row.frame === evidence.sourceWindow.startFrame + age && row.scriptEven === (row.scriptPtr % 2 === 0), `${orientation} age ${age}: dense pointer sequence`);
    assertDenseRow(row, orientation);
  });
  const rgbRows = archiveRgbRows(evidence.rawRgbArchive, rows);
  const derivedMap = deriveChangeMap(orientation, probe, rgbRows);
  if (writeMap) writeFileSync(evidence.changeMap, JSON.stringify(derivedMap, null, 2) + "\n");
  else assert(stable(derivedMap) === stable(JSON.parse(readFileSync(evidence.changeMap, "utf8"))), `${orientation}: change map`);
  const map = writeMap ? derivedMap : JSON.parse(readFileSync(evidence.changeMap, "utf8")) as Evidence;
  let oam = 0, matrices = 0, palettes = 0, background = 0; const paletteExceptions: number[] = [];
  const bank = evidence.latches.activeBackground === "BG1" ? 1 : 2;
  for (let age = 1; age < rows.length; age += 1) {
    const current = rows[age]!, prior = rows[age - 1]!;
    if (stable(current.hardwareOam) === stable(prior.softwareOam)) oam += 1;
    if (stable(current.matrices.hardware) === stable(prior.matrices.software)) matrices += 1;
    if (stable(current.hardwarePalette) === stable(prior.fadedPalette)) palettes += 1; else paletteExceptions.push(age);
    if (signed9(current.registers[`bg${bank}hofs`]) === prior.backgroundPositions[`gBattle_BG${bank}_X`] && signed9(current.registers[`bg${bank}vofs`]) === prior.backgroundPositions[`gBattle_BG${bank}_Y`]) background += 1;
  }
  assert(`${oam}/${rows.length - 1}` === evidence.latches.hardwareOamEqualsPrecedingSoftware && `${matrices}/${rows.length - 1}` === evidence.latches.hardwareMatricesEqualsPrecedingSoftware && `${palettes}/${rows.length - 1}` === evidence.latches.hardwarePaletteEqualsPrecedingFaded && `${background}/${rows.length - 1}` === evidence.latches.activeBackgroundOffsetsEqualPrecedingSource, `${orientation}: latches`);
  assert(stable(paletteExceptions) === stable([10]), `${orientation}: monbg palette exception`);
  const expectedTarget = orientation === "player-back" ? [42, 44, 46, 48, 50, 225, 229] : [44, 46, 48, 50, 229];
  assert(stable(map.events.spriteStarts) === stable({ impactAnimation0: [38], absorptionOrbs: [56], healingStars: [151], simplePaletteBlend: [13, 200] }), `${orientation}: sprite starts`);
  assert(stable(map.events.taskStarts) === stable({ shakeMon: [42], monbg: [10], clearMonbg: [225] }), `${orientation}: task starts`);
  assert(stable(map.events.targetSoftwareTransitions) === stable(expectedTarget), `${orientation}: target transitions`);
  assert(stable(map.events.palette) === stable({ fadedTransitions: [1, 4, 7, 10, 15, 18, 21, 24, 27, 30, 202, 205, 208, 211, 214, 217], hardwareTransitions: [2, 5, 8, 10, 16, 19, 22, 25, 28, 31, 203, 206, 209, 212, 215, 218] }), `${orientation}: palette transitions`);
  assert(stable(map.events.blend) === stable({ bldcntTransitions: [13, 225], bldalphaTransitions: [13, 225], bldyTransitions: [] }), `${orientation}: blend lifecycle`);
  const pan = orientation === "player-back" ? [63, -64, 0, 0] : [-63, 63, 0, 0];
  const healingPan = orientation === "player-back" ? [-64, -64, 0, 0] : [63, 63, 0, 0];
  assert(stable(map.events.audioRestarts.se1.map((entry: Row) => [entry.age, entry.identity, entry.panX])) === stable([
    [38, "se_m_absorb", pan], [56, "se_m_giga_drain", pan], [62, "se_m_giga_drain", pan], [68, "se_m_giga_drain", pan], [74, "se_m_giga_drain", pan], [80, "se_m_giga_drain", pan], [86, "se_m_giga_drain", pan], [92, "se_m_giga_drain", pan], [98, "se_m_giga_drain", pan], [151, "se_m_absorb_2", healingPan],
  ]), `${orientation}: audio restarts`);
  assert(map.events.audioRestarts.se2.length === 0, `${orientation}: SE2 silence`);
  for (const field of ["immutableState", "battlers", "parties", "engine"]) assert(new Set(rows.map((row) => stable(row[field]))).size === 1, `${orientation}: immutable ${field}`);
  assert(new Set(rows.map((row) => row.immutableState.rngValue)).size === 1 && new Set(rows.map((row) => row.animationRng)).size === 228, `${orientation}: RNG surfaces`);
  assert(rows.every((row) => row.animationBattlers.attacker === evidence.attacker && row.animationBattlers.target === evidence.target), `${orientation}: direction`);
  return rows.length;
}

const writeMap = process.argv.includes("--write");
const playerRows = verifyOrientation("player-back", fixture.orientations["player-back"], writeMap);
const opponentRows = verifyOrientation("opponent-front", fixture.orientations["opponent-front"], writeMap);
if (!writeMap) {
  assert(fixture.status === "exact" && fixture.coverageCredit && fixture.coverageCounts === "Level 50: 187/276 exact, 0 partial, 0 staged, 89 unsupported", "fixture scope");
  console.log(`GIGA_DRAIN portable evidence ${playerRows + opponentRows}/${playerRows + opponentRows}; player ${playerRows}, opponent ${opponentRows}`);
} else {
  console.log(`wrote GIGA_DRAIN normalized maps for ${playerRows + opponentRows} rows`);
}
