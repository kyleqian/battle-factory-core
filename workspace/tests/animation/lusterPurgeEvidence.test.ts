import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Row = Record<string, any>;
type Orientation = Record<string, any>;

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/luster-purge-evidence.json", "utf8",
)) as Record<string, any>;
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const stable = (value: unknown): string => JSON.stringify(value);
const signed9 = (value: number): number => value >= 0x100 ? value - 0x200 : value;

function expectCompletePartyRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([
    "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
    "moves", "nature", "ppUps", "shiny", "species",
  ]);
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

function expectCapturedPartyRecord(mon: Record<string, unknown>): void {
  for (const key of [
    "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
    "moves", "nature", "ppUps", "shiny", "species",
  ]) expect(mon).toHaveProperty(key);
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

function expectDenseRow(row: Row): void {
  for (const field of fixture.stateContract.requiredFrameFields) expect(row).toHaveProperty(field);
  expect(row.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(row.tasks.every((task: Row) => task.raw.length === 0x50 && task.data.length === 16 && task.func)).toBe(true);
  expect(row.sprites.every((sprite: Row) =>
    sprite.raw.length === 0x88 && sprite.data.length === 8 && sprite.template && sprite.callback &&
    sprite.matrix.length === 4 && sprite.hardwareMatrix.length === 4,
  )).toBe(true);
  expect(row.softwareOam).toHaveLength(128);
  expect(row.hardwareOam).toHaveLength(128);
  expect(row.matrices.software).toHaveLength(32);
  expect(row.matrices.hardware).toHaveLength(32);
  expect(row.matrices.software.every((matrix: number[]) => matrix.length === 4)).toBe(true);
  expect(row.matrices.hardware.every((matrix: number[]) => matrix.length === 4)).toBe(true);
  expect(row.fadedPalette).toHaveLength(512);
  expect(row.unfadedPalette).toHaveLength(512);
  expect(row.hardwarePalette).toHaveLength(512);
  expect(row.paletteTags).toHaveLength(16);
  expect(row.tileTags).toHaveLength(128);
  expect(Object.keys(row.registers)).toHaveLength(20);
  expect(row.backgroundPositions).toMatchObject({
    gBattle_BG0_X: expect.any(Number), gBattle_BG0_Y: expect.any(Number),
    gBattle_BG1_X: expect.any(Number), gBattle_BG1_Y: expect.any(Number),
    gBattle_BG2_X: expect.any(Number), gBattle_BG2_Y: expect.any(Number),
    gBattle_BG3_X: expect.any(Number), gBattle_BG3_Y: expect.any(Number),
  });
  expect(row.bg1Tiles).toHaveLength(0x1000);
  expect(row.bg1Tilemap).toHaveLength(0x1000);
  expect(row.scanline.state).toHaveLength(0x38);
  expect(row.scanline.buffers).toHaveLength(2);
  expect(row.scanline.buffers.every((buffer: number[]) => buffer.length === 320)).toBe(true);
  for (const audio of [row.se1, row.se2]) {
    expect(audio.rawInfo).toHaveLength(0x80);
    expect(audio.tracks).toHaveLength(4);
    expect(audio.tracks.every((track: Row) => track.raw.length === 0xa0)).toBe(true);
  }
  expect(Object.keys(row.battlers)).toEqual(["player", "opponent"]);
  expect(row.parties.player).toHaveLength(3);
  expect(row.parties.opponent).toHaveLength(3);
  [...row.parties.player, ...row.parties.opponent].forEach(expectCapturedPartyRecord);
}

function transitionRows(rows: Row[], field: string): number[] {
  return rows.map((row, index) => index > 0 && row.registers[field] !== rows[index - 1]!.registers[field] ? index : -1)
    .filter((index) => index >= 0);
}

describe("MOVE_LUSTER_PURGE dense Scene-ON evidence checkpoint", () => {
  it("remains evidence-only and leaves coverage/siblings independent", () => {
    expect(fixture).toMatchObject({
      schema: "luster-purge-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_LUSTER_PURGE",
      moveId: 295,
      status: "unsupported",
      coverageCredit: false,
      source: {
        scriptStart: "0x082ce517", evenPointerStart: "0x082ce516", exclusiveEnd: "0x082ce62e",
        unsetPsychicBackground: "0x082d7cdd..0x082d7ce5", componentCount: 19,
        randomDraws: { hitsplatCalls: 6, visualRandom2PerHitsplat: 2, visualRandom2Total: 12 },
        soundTaskPlaySE1WithPanningCalls: 6, blendParticleTasks: 2,
      },
      productionScope: {
        productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false,
        compositorAdded: false, framebufferLookupAdded: false, coveragePromotion: false,
        boundaryOrBarrierChanged: false, gameplayStateOwned: false,
      },
      coverageCounts: "Level 50: 184/276 exact, 0 partial, 0 staged, 92 unsupported",
    });
    expect(fixture.batchSiblingAudit).toMatchObject({
      MOVE_MIST_BALL: "independent control",
      MOVE_FLAIL: "independent control",
      MOVE_HEAT_WAVE: "independent control",
      MOVE_CALM_MIND: "independent control",
      coverageCredit: false,
    });
  });

  it.each(Object.entries(fixture.orientations))("pins full retained state and RGB/change-map receipts for %s", (orientation, evidence: Orientation) => {
    const stateBytes = readFileSync(evidence.denseState);
    expect(sha256(stateBytes)).toBe(evidence.denseStateSha256);
    expect(sha256(readFileSync(evidence.rawRgbArchive))).toBe(evidence.rawRgbArchiveSha256);
    expect(sha256(readFileSync(evidence.changeMap))).toBe(evidence.changeMapSha256);
    const members = execFileSync("tar", ["-tzf", evidence.rawRgbArchive], { encoding: "utf8" })
      .trim().split("\n").filter((name) => name.endsWith(".rgb"));
    expect(members).toHaveLength(evidence.rawRgbArchiveMemberCount);
    expect(members.some((name) => name.includes("._"))).toBe(false);
    expect(evidence.repeatProbeJsonSha256).toBe(evidence.probeJsonSha256);
    expect(evidence.rawRgbFrameCount).toBe(evidence.sourceWindow.frameCount);
    const probeBytes = gunzipSync(stateBytes);
    expect(sha256(probeBytes)).toBe(evidence.probeJsonSha256);
    const probe = JSON.parse(probeBytes.toString("utf8")) as Record<string, any>;
    const rows = probe.frames as Row[];
    expect(probe).toMatchObject({
      schema: "luster-purge-dense-evidence/v1",
      moveId: 295,
      sourceWindow: evidence.sourceWindow,
      sourceSymbols: {
        Move_LUSTER_PURGE: 0x082ce517,
        evenPointerStart: 0x082ce516,
        Move_MIST_BALL: 0x082ce62e,
      },
    });
    expect(rows).toHaveLength(evidence.sourceWindow.frameCount);
    rows.forEach(expectDenseRow);
    expect(rows[0]).toMatchObject({
      frame: evidence.sourceWindow.startFrame,
      scriptPtr: 0x082ce516,
      scriptOffset: 0,
      scriptEven: true,
      animScriptActive: true,
    });
    expect(rows.at(-1)).toMatchObject({
      frame: evidence.sourceWindow.endFrame,
      scriptPtr: 0x082ce62c,
      scriptOffset: 278,
      scriptEven: true,
      animScriptActive: false,
      visualTaskCount: 0,
      soundTaskCount: 0,
    });
    expect(rows.every((row) => row.scriptEven && row.scriptPtr % 2 === 0 &&
      row.scriptOffset >= 0 && row.scriptOffset <= 278)).toBe(true);
    expect(rows.every((row) => row.animationBattlers.attacker === evidence.attacker &&
      row.animationBattlers.target === evidence.target)).toBe(true);
    expect(probe.topology).toEqual(fixture.topology);
    expect(rows.filter((row) => row.sprites.some((sprite: Row) =>
      sprite.template.symbol === "gLusterPurgeCircleSpriteTemplate")).length).toBe(evidence.visualEvents.circleRows);
    expect(rows.filter((row) => row.sprites.some((sprite: Row) =>
      sprite.template.symbol === "gRandomPosHitSplatSpriteTemplate")).length).toBe(evidence.visualEvents.hitsplatRows);
    expect(rows.reduce((count, row) => count + row.sprites.filter((sprite: Row) =>
      sprite.template.symbol === "gRandomPosHitSplatSpriteTemplate").length, 0)).toBe(evidence.visualEvents.hitsplatSprites);
    const soundStarts = rows.map((row, index) => index > 0 && row.se1.status === 0 &&
      rows[index - 1]!.se1.status !== 0 ? index : -1).filter((index) => index >= 0);
    expect(soundStarts).toEqual(evidence.visualEvents.soundTaskStartRows);
    expect(new Set(rows.map((row) => stable(row.immutableState))).size).toBe(1);
    expect(new Set(rows.map((row) => stable(row.battlers))).size).toBe(1);
    expect(new Set(rows.map((row) => stable(row.parties))).size).toBe(1);
    expect(new Set(rows.map((row) => stable(row.engine))).size).toBe(1);
    expect(new Set(rows.map((row) => row.immutableState.rngValue)).size).toBe(evidence.stateProof.gameplayRngUniqueValues);
    expect(new Set(rows.map((row) => row.animationRng)).size).toBe(evidence.stateProof.animationRngUniqueValues);
  });

  it.each(Object.entries(fixture.orientations))("pins exact source/display latches for %s", (orientation, evidence: Orientation) => {
    const rows = JSON.parse(gunzipSync(readFileSync(evidence.denseState)).toString("utf8")).frames as Row[];
    let oam = 0;
    let matrices = 0;
    let palettes = 0;
    let background = 0;
    const bank = evidence.latches.activeBackground === "BG1" ? 1 : 2;
    for (let index = 1; index < rows.length; index += 1) {
      if (stable(rows[index]!.hardwareOam) === stable(rows[index - 1]!.softwareOam)) oam += 1;
      if (stable(rows[index]!.matrices.hardware) === stable(rows[index - 1]!.matrices.software)) matrices += 1;
      if (stable(rows[index]!.hardwarePalette) === stable(rows[index - 1]!.fadedPalette)) palettes += 1;
      const current = rows[index]!.registers;
      const previousSource = rows[index - 1]!.backgroundPositions;
      if (signed9(current[`bg${bank}hofs`]) === previousSource[`gBattle_BG${bank}_X`] &&
        signed9(current[`bg${bank}vofs`]) === previousSource[`gBattle_BG${bank}_Y`]) background += 1;
    }
    expect(oam).toBe(Number(evidence.latches.hardwareOamEqualsPrecedingSoftware.split("/")[0]));
    expect(matrices).toBe(Number(evidence.latches.hardwareMatricesEqualsPrecedingSoftware.split("/")[0]));
    expect(palettes).toBe(Number(evidence.latches.hardwarePaletteEqualsPrecedingFaded.split("/")[0]));
    expect(background).toBe(Number(evidence.latches.activeBackgroundOffsetsEqualPrecedingSource.split("/")[0]));
    for (const field of ["bldcnt", "bldalpha", "bldy"]) {
      expect(transitionRows(rows, field)).toHaveLength(evidence.latches[{
        bldcnt: "blendCntChanges", bldalpha: "blendAlphaChanges", bldy: "blendYChanges",
      }[field]]);
    }
    expect(transitionRows(rows, "bldcnt")).toEqual(evidence.latches.blendCntTransitionRows);
    expect(transitionRows(rows, "bldalpha")).toEqual(evidence.latches.blendAlphaTransitionRows);
    expect(transitionRows(rows, `bg${bank}hofs`)).toEqual(evidence.latches.activeBackgroundTransitionRows);
  });

  it.each(Object.entries(fixture.orientations))("retains only legal complete parties and no transient staging for %s", (orientation, evidence: Orientation) => {
    const stage = JSON.parse(readFileSync(evidence.scenario, "utf8")) as Record<string, any>;
    expect(sha256(readFileSync(evidence.scenario))).toBe(evidence.scenarioSha256);
    expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, seed: 305419897 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const parties = stage.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    [...parties.player, ...parties.opponent].forEach(expectCompletePartyRecord);
    expect(stage.overrides).not.toHaveProperty("battlers");
    expect(stage.overrides).not.toHaveProperty("hp");
    expect(stage.overrides).not.toHaveProperty("status");
    expect(stage.overrides).not.toHaveProperty("stages");
    expect(stage.overrides).not.toHaveProperty("weather");
    expect(stage.overrides).not.toHaveProperty("outcome");
    expect(stage.overrides).not.toHaveProperty("sideConditions");
    const carrier = [...parties.player, ...parties.opponent].find((mon) => mon.species === 381)!;
    expect(carrier).toMatchObject({ species: 381, level: 50, nature: 15, item: 141, moves: [295, 295, 295, 295] });
  });
});
