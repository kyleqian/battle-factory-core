import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Branch = {
  power: number;
  shakeAmplitude: number;
  covered: boolean;
  coverageCredit: boolean;
  scenario: string;
  scenarioSha256: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  attacker: { species: number; hp: number; maxHp: number };
  target: { species: number; hp: number; maxHp: number };
  state: {
    stateFields: string[];
    allRequiredFieldsRepeatStable: boolean;
    rowShapeComplete: boolean;
    rowShape: Record<string, boolean>;
    rows: number;
  };
  evidence: Record<string, string | number>;
  hitsplat: Record<string, string | number>;
  latches: Record<string, string | number | boolean | number[]>;
  rng: Record<string, string | number | boolean>;
};

type Fixture = {
  schema: string;
  status: string;
  move: string;
  moveId: number;
  coverageCredit: boolean;
  requiredBranches: Array<Record<string, unknown>>;
  staging: Record<string, unknown>;
  stateContract: { requiredFields: string[]; rowsPerBranchOrientation: number; runsPerBranchOrientation: number };
  orientations: Record<string, { scenario: string; scenarioSha256: string; branchCount: number; frameCounts: number[] }>;
  repeatability: Record<string, boolean | number>;
  latches: { expected: Record<string, string>; measuredAcrossAllBranches: Record<string, string> };
  batchSiblingAudit: Record<string, unknown>;
  branches: Record<string, Branch>;
  boundedRemainder: string;
};

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/flail-natural-hp-evidence.json", "utf8",
)) as Fixture;
const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];

function expectCompletePartyRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([...completeRecordKeys].sort());
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual([
    "attack", "defense", "hp", "spAttack", "spDefense", "speed",
  ]);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

describe("MOVE_FLAIL natural HP/power evidence checkpoint", () => {
  it("keeps all five natural branches unsupported and gives no Luster Purge credit", () => {
    expect(fixture).toMatchObject({
      schema: "flail-natural-hp-bilateral-evidence/v1",
      status: "unsupported",
      move: "MOVE_FLAIL",
      moveId: 175,
      coverageCredit: false,
    });
    expect(fixture.requiredBranches).toEqual([
      { power: 20, shakeAmplitude: 1, covered: true, coverageCredit: false, coveredBy: "tools/compare/fixtures/flail-full-hp-evidence.json" },
      { power: 40, shakeAmplitude: 3, covered: true, coverageCredit: false },
      { power: 80, shakeAmplitude: 6, covered: true, coverageCredit: false },
      { power: 100, shakeAmplitude: 8, covered: true, coverageCredit: false },
      { power: 150, shakeAmplitude: 12, covered: true, coverageCredit: false },
      { power: 200, shakeAmplitude: 16, covered: true, coverageCredit: false },
    ]);
    expect(Object.keys(fixture.branches)).toHaveLength(10);
    expect(fixture.batchSiblingAudit).toMatchObject({
      move: "MOVE_LUSTER_PURGE", status: "unsupported", coverageCredit: false,
      receipt: false, reducer: false,
    });
    expect(fixture.boundedRemainder).toMatch(/no reducer, typed seam, compositor/i);
    expect(fixture.boundedRemainder).toMatch(/Luster Purge remains independently unsupported/);
  });

  it.each(["player-back", "opponent-front"] as const)("pins complete legal natural staging for %s", (orientation) => {
    const row = fixture.orientations[orientation];
    const scenarioBytes = readFileSync(row.scenario);
    const scenario = JSON.parse(scenarioBytes.toString("utf8")) as Record<string, any>;
    expect(sha256(scenarioBytes)).toBe(row.scenarioSha256);
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(scenario.trace.segments).toHaveLength(40);
    expect(scenario.trace.captureFrames).toEqual([0, 7340]);
    expect(scenario.trace.segments.reduce((sum: number, segment: { frames: number }) => sum + segment.frames, 0)).toBe(7340);
    const parties = scenario.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    [...parties.player, ...parties.opponent].forEach(expectCompletePartyRecord);
    const attacker = orientation === "player-back" ? parties.player[0]! : parties.opponent[0]!;
    const reducer = orientation === "player-back" ? parties.opponent[0]! : parties.player[0]!;
    expect(attacker).toMatchObject({ species: 98, moves: [175, 175, 175, 175], evs: { attack: 0, hp: 255 } });
    expect(reducer).toMatchObject({ species: 95, moves: [162, 162, 162, 162] });
    expect(scenario.overrides).not.toHaveProperty("battlers");
    expect(scenario.overrides).not.toHaveProperty("outcome");
    expect(scenario.overrides).not.toHaveProperty("weather");
    expect(scenario.overrides).not.toHaveProperty("sideConditions");
  });

  it.each(Object.entries(fixture.branches))("pins full state/RGB/change-map receipts for %s", (branchId, branch) => {
    expect(branch.covered).toBe(true);
    expect(branch.coverageCredit).toBe(false);
    expect(branch.sourceWindow.frameCount).toBe(114);
    expect(branch.state.rows).toBe(114);
    expect(branch.state.stateFields).toEqual(fixture.stateContract.requiredFields);
    expect(branch.state.allRequiredFieldsRepeatStable).toBe(true);
    expect(branch.state.rowShapeComplete).toBe(true);
    expect(Object.values(branch.state.rowShape).every(Boolean)).toBe(true);
    expect(branch.rng).toMatchObject({
      animationWithinWindowUniqueValues: 112,
      gameplayWithinWindowUniqueValues: 1,
      immutableStateWithinWindow: true,
      battlersWithinWindow: true,
      partiesWithinWindow: true,
      engineWithinWindow: true,
      gameplayRngUnchangedWithinWindow: true,
      repeatStable: true,
    });

    const statePath = branch.evidence.stateGzip as string;
    const mapPath = branch.evidence.changeMap as string;
    const rawPath = branch.evidence.rawRgbArchive as string;
    const stateBytes = readFileSync(statePath);
    expect(sha256(stateBytes)).toBe(branch.evidence.stateGzipSha256);
    expect(sha256(readFileSync(mapPath))).toBe(branch.evidence.changeMapSha256);
    expect(sha256(readFileSync(rawPath))).toBe(branch.evidence.rawRgbArchiveSha256);
    const members = execFileSync("tar", ["-tzf", rawPath], { encoding: "utf8" })
      .trim().split("\n").filter((name) => name.endsWith(".rgb"));
    expect(members).toHaveLength(114);
    expect(members.some((name) => name.includes("._"))).toBe(false);

    const probe = JSON.parse(gunzipSync(stateBytes).toString("utf8")) as Record<string, any>;
    expect(probe).toMatchObject({
      schema: "flail-dense-evidence/v2", moveId: 175, expectedPower: branch.power,
      sourceWindow: branch.sourceWindow,
    });
    expect(probe.frames).toHaveLength(114);
    expect(probe.frames.every((frame: Record<string, unknown>) =>
      branch.state.stateFields.every((field) => field in frame)
        && frame.animMovePower === branch.power,
    )).toBe(true);
    expect(probe.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
    expect(probe.frames.every((frame: Record<string, any>) => frame.softwareOam.length === 128 && frame.hardwareOam.length === 128 && frame.softwareMatrices.length === 32 && frame.hardwareMatrices.length === 32 && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512 && frame.hardwarePalette.length === 512 && frame.paletteTags.length === 16 && frame.tileTags.length === 128 && Object.keys(frame.registers).length === 10 && frame.se1 && frame.se2 && frame.battlers.player && frame.battlers.opponent && frame.parties.player.length === 3 && frame.parties.opponent.length === 3)).toBe(true);
    expect(new Set(probe.frames.map((frame: Record<string, unknown>) => frame.gameplayRng)).size).toBe(1);
    expect(new Set(probe.frames.map((frame: Record<string, unknown>) => frame.animationRng)).size).toBe(112);
    expect(branch.evidence.rawRgbFrameCount).toBe(114);
    expect(branch.evidence.rawRgbFrameBytes).toBe(240 * 160 * 3);
    expect(branch.evidence.rawRgbArchiveMemberCount).toBe(114);
    expect(branch.evidence.probeJsonSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(branch.evidence.repeatProbeJsonSha256).toBe(branch.evidence.probeJsonSha256);
    expect(branch.evidence.repeatRawRgbSequenceSha256).toBe(branch.evidence.rawRgbSequenceSha256);
    expect(branchId).toMatch(/^(player-back|opponent-front)-power-(40|80|100|150|200)$/);
  });

  it("pins the measured shake, hitsplat, and transfer latches for every branch", () => {
    const expectedOffsets: Record<string, Record<number, [number, number]>> = {
      "player-back": { 40: [-20, -9], 80: [22, 2], 100: [-2, -5], 150: [-10, -11], 200: [10, -8] },
      "opponent-front": { 40: [-20, -9], 80: [21, 2], 100: [-4, 9], 150: [-11, 10], 200: [11, 1] },
    };
    for (const [branchId, branch] of Object.entries(fixture.branches)) {
      const [orientation, powerText] = branchId.split("-power-");
      const power = Number(powerText);
      expect(branch.shakeAmplitude).toBe(Math.min(16, Math.max(1, Math.floor(power / 12))));
      expect(branch.latches).toMatchObject({
        wholeHardwareOamEqualsPrecedingSoftware: "113/113",
        liveAttackerMatrixEqualsSoftwareTwoRowsEarlier: "112/112",
        liveAttackerMatrixLag: "RAM+2",
        hardwarePaletteEqualsPrecedingFaded: power === 40 ? "112/113" : "113/113",
        sameRowMonbgSetupAge: 4,
        sameRowMonbgSetupObserved: true,
        hitsplatOamLag: "ordinary OAM RAM+1",
        hitsplatAffinePaintLag: "fresh-affine paint RAM+2",
        hitsplatTeardownLag: "RAM+1",
      });
      expect(branch.hitsplat).toMatchObject({
        sourceRowIndex: 49, sourceAge: 49, slot: 3,
        template: "gRandomPosHitSplatSpriteTemplate",
        callback: "RunStoredCallbackWhenAffineAnimEnds",
        matrixNum: 0, matrix: [512, 0, 0, 512], animation: 3, liveRows: 10,
        x: orientation === "player-back" ? 177 : 71,
        y: orientation === "player-back" ? 43 : 83,
        x2: expectedOffsets[orientation]![power]![0],
        y2: expectedOffsets[orientation]![power]![1],
      });
    }
    expect(fixture.latches.expected).toMatchObject({
      wholeHardwareOam: "preceding software on 113/113 comparable rows per orientation",
      liveAttackerRotationMatrix: "RAM+2",
      hitsplatOam: "ordinary OAM RAM+1",
      hitsplatAffinePaint: "fresh-affine paint RAM+2",
      hitsplatTeardown: "RAM+1",
      hardwarePalette: "preceding faded with same-row monbg setup at age 4",
    });
  });
});
