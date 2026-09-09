import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Side = "player" | "opponent";

type BattleMon = {
  readonly species: number;
  readonly level: number;
  readonly nature: number;
  readonly ivs: Record<string, number>;
  readonly evs: Record<string, number>;
  readonly moves: readonly number[];
  readonly ppUps: readonly number[];
  readonly item: number;
  readonly abilitySlot: number;
  readonly friendship: number;
  readonly gender: "male" | "female";
  readonly shiny: boolean;
};

type Scenario = {
  readonly schemaVersion: number;
  readonly mode: string;
  readonly profile: string;
  readonly level: number;
  readonly challengeNum: number;
  readonly battleNum: number;
  readonly trainerId: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly seed: number;
  readonly overrides: { readonly parties: Record<Side, readonly BattleMon[]> };
  readonly trace: {
    readonly segments: readonly { readonly frames: number; readonly buttons: readonly string[] }[];
    readonly captureFrames: readonly number[];
  };
};

type Window = { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };

type Fixture = {
  readonly schema: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly appStage?: { readonly presentationAge: number };
  readonly sourceWindow: Window;
  readonly sourceSymbols?: Record<string, string>;
  readonly lifecycleCounts: Record<string, number>;
  readonly topology: Record<string, readonly string[]>;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly freshRuns?: number;
  readonly changeMap?: string;
  readonly changeMapSha256?: string;
  readonly attacker?: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target?: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly battleState?: { readonly attackerSide: Side; readonly heldItem: number };
  readonly staging?: { readonly carrierSet: number; readonly carrierSpecies: string };
};

type Receipt = {
  readonly path: string;
  readonly scenarioPath: string;
  readonly move: "MOVE_REST" | "MOVE_SLEEP_TALK";
  readonly schema: string;
  readonly orientation: string;
  readonly side: Side;
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly lifecycle: Record<string, number>;
  readonly seed: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly segments: number;
  readonly aPresses: number;
  readonly captureFrames: readonly number[];
  readonly attacker: Pick<BattleMon, "species" | "nature" | "item" | "moves">;
  readonly target: Pick<BattleMon, "species" | "nature" | "item" | "moves">;
};

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const trackGoal = "FULFILLED: This exact 4-component boundary is fulfilled only because MOVE_REST and MOVE_SLEEP_TALK independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. Rest independently owns its complete 110/110 player-back and opponent-front three-AnimSleepLetterZ body at source ages 4..63, 26..85, and 48..107, its side-signed affine programs, RAM+1 OAM/matrix transfer with 109/109 predecessor rows per orientation, audio/resources/immutable sleep-heal state, and first-inactive cleanup, retaining 747ad02e7af670dc0f33c0333d4378961e5d7a4d96ae841574190d63ec16f0ec/3a9f0a794e93bbb68b485748733866ed27477d59577b7a4905642dd7655f2d63 and 2004fa6cd6fd01c5fd0a50558405783909984431c5d08b9433f4670c52380d03/6caad649f87c5bef7bc1098629addf19981c7ce4ed9d2db4dc0f1e8d25e86a67. Sleep Talk independently owns its complete 186/186 player-back and 189/189 opponent-front nine-AnimLetterZ body, its own RAM+1 OAM/affine transfer, and its separate visible attacker AnimTask_SwayMon RAM+2 axis in both orientations, audio/resources/immutable sleep state, and first-inactive cleanup, retaining 4badf2d5678fc8c329f5a39bff98683d642274cfa630804a089472ea568fe8de/24c97994c4e5f4be9f8ab84cc9db8fe511b2efc360202a4dd9f0e3fa8a101f2a and df68a90c7b4ffddfd86f524bf971fa11df092fd36cf7ce88a2805c5e0c7492a3/5e603acffacda5b4c0f2efdbc835b8028b59463b6e6e251a611b6237666228f7. No sibling, component, or latch transfer is granted: shared ANIM_TAG_LETTER_Z and AnimTask_SwayMon do not promote Frustration, any sibling, or another move, and no Rest/Sleep Talk latch is inherited outside its own current change maps.";

const receipts: readonly Receipt[] = [
  {
    path: "tools/compare/fixtures/rest-player-teddiursa-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-rest-player-teddiursa-opponent-onix.json",
    move: "MOVE_REST", schema: "rest-portable-evidence/v1",
    orientation: "player-back Teddiursa -> opponent-front Onix", side: "player",
    window: { startFrame: 334, endFrame: 443, frameCount: 110 },
    evidence: "747ad02e7af670dc0f33c0333d4378961e5d7a4d96ae841574190d63ec16f0ec",
    raw: "3a9f0a794e93bbb68b485748733866ed27477d59577b7a4905642dd7655f2d63",
    lifecycle: { gSleepLetterZSpriteTemplate: 3 }, seed: 305419897,
    playerSetIds: [117, 185, 188], opponentSetIds: [156, 157, 158],
    segments: 4, aPresses: 2, captureFrames: [0, 734],
    attacker: { species: 216, nature: 7, item: 134, moves: [156, 156, 156, 156] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
  },
  {
    path: "tools/compare/fixtures/rest-opponent-teddiursa-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-rest-opponent-teddiursa-player-onix.json",
    move: "MOVE_REST", schema: "rest-portable-evidence/v1",
    orientation: "opponent-front Teddiursa -> player-back Onix", side: "opponent",
    window: { startFrame: 338, endFrame: 447, frameCount: 110 },
    evidence: "2004fa6cd6fd01c5fd0a50558405783909984431c5d08b9433f4670c52380d03",
    raw: "6caad649f87c5bef7bc1098629addf19981c7ce4ed9d2db4dc0f1e8d25e86a67",
    lifecycle: { gSleepLetterZSpriteTemplate: 3 }, seed: 305419897,
    playerSetIds: [156, 157, 158], opponentSetIds: [117, 185, 188],
    segments: 4, aPresses: 2, captureFrames: [0, 734],
    attacker: { species: 216, nature: 7, item: 134, moves: [156, 156, 156, 156] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
  },
  {
    path: "tools/compare/fixtures/sleep-talk-player-seaking-opponent-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-sleep-talk-player-seaking-opponent-onix.json",
    move: "MOVE_SLEEP_TALK", schema: "sleep-talk-evidence/v1",
    orientation: "player-back", side: "player",
    window: { startFrame: 1356, endFrame: 1541, frameCount: 186 },
    evidence: "4badf2d5678fc8c329f5a39bff98683d642274cfa630804a089472ea568fe8de",
    raw: "24c97994c4e5f4be9f8ab84cc9db8fe511b2efc360202a4dd9f0e3fa8a101f2a",
    lifecycle: { gLetterZSpriteTemplate: 9 }, seed: 305419898,
    playerSetIds: [333, 268, 269], opponentSetIds: [280, 281, 282],
    segments: 11, aPresses: 4, captureFrames: [0, 2074],
    attacker: { species: 119, nature: 8, item: 183, moves: [32, 224, 214, 156] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
  },
  {
    path: "tools/compare/fixtures/sleep-talk-opponent-seaking-player-onix.json",
    scenarioPath: "tools/battle-lab/mechanic-sleep-talk-opponent-seaking-player-onix.json",
    move: "MOVE_SLEEP_TALK", schema: "sleep-talk-evidence/v1",
    orientation: "opponent-front", side: "opponent",
    window: { startFrame: 4570, endFrame: 4758, frameCount: 189 },
    evidence: "df68a90c7b4ffddfd86f524bf971fa11df092fd36cf7ce88a2805c5e0c7492a3",
    raw: "5e603acffacda5b4c0f2efdbc835b8028b59463b6e6e251a611b6237666228f7",
    lifecycle: { gLetterZSpriteTemplate: 9 }, seed: 305419899,
    playerSetIds: [280, 281, 282], opponentSetIds: [333, 268, 269],
    segments: 28, aPresses: 14, captureFrames: [0, 6138],
    attacker: { species: 119, nature: 8, item: 183, moves: [32, 224, 214, 156] },
    target: { species: 95, nature: 0, item: 142, moves: [33, 33, 33, 33] },
  },
];

function readFixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function expectCompleteParty(party: readonly BattleMon[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual(monKeys.slice().sort());
    expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
    expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
    expect(mon.level).toBe(50);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.friendship).toBe(0);
    expect(mon.gender === "male" || mon.gender === "female").toBe(true);
    expect(mon.shiny).toBe(false);
  }
}

describe("letter-z-rest standalone fulfilled component-track ratchet", () => {
  it("pins both source audits and the distinct script pointers/bodies", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/restSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "lowest challenge-0 Level-50 carrier set 117/FRONTIER_MON_TEDDIURSA -> "
      + "SPECIES_TEDDIURSA 216/move 156/CHESTO_BERRY/ATTACK+HP/RELAXED; "
      + "Rest owns 3 gSleepLetterZSpriteTemplate/AnimSleepLetterZ lifecycles "
      + "after trysetrest sleep/status setup; Sleep Talk remains distinct with "
      + "9 gLetterZSpriteTemplate lifecycles plus AnimTask_SwayMon\n",
    );
    expect(JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/sleepTalkSourceAudit.ts"], { encoding: "utf8" }))).toEqual({
      move: "MOVE_SLEEP_TALK", moveId: 214, carrier: 333, letterSprites: 9, snoreCues: 3,
      symbols: { move: "0x082d4473", template: "0x085ce190", callback: "0x0815a7ec" },
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const restBody = scripts.slice(scripts.indexOf("Move_REST:"), scripts.indexOf("Move_CONFUSION:"));
    const sleepTalkBody = scripts.slice(
      scripts.indexOf("Move_SLEEP_TALK:"), scripts.indexOf("Move_HYPER_FANG:"),
    );
    expect(restBody).toContain("loadspritegfx ANIM_TAG_LETTER_Z");
    expect(restBody.match(/gSleepLetterZSpriteTemplate/g)).toHaveLength(3);
    expect(restBody).not.toContain("AnimTask_SwayMon");
    expect(sleepTalkBody).toContain(
      "createvisualtask AnimTask_SwayMon, 5, 0, 4, 4096, 2, ANIM_ATTACKER",
    );
    expect(sleepTalkBody.match(/gLetterZSpriteTemplate/g)).toHaveLength(9);
    expect(sleepTalkBody).not.toContain("gSleepLetterZSpriteTemplate");
  });

  it("pins the exact track goal and unchanged 242/276 Level-50 acceptance", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const inventory = JSON.parse(readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(242);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "partial"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "staged"))
      .toHaveLength(0);
    expect(inventory.tiers.level50.moves).toHaveLength(276);
    expect(inventory.tiers.level50.moves.length - coverage.entries.length).toBe(35);
    expect(coverage.entries.filter((entry: { move: string }) =>
      ["MOVE_REST", "MOVE_SLEEP_TALK"].includes(entry.move),
    )).toEqual([
      expect.objectContaining({ move: "MOVE_REST", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SLEEP_TALK", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "letter-z-rest",
    )).toEqual([{
      id: "letter-z-rest",
      components: [
        "asset:ANIM_TAG_LETTER_Z",
        "sprite:gSleepLetterZSpriteTemplate",
        "sprite:gLetterZSpriteTemplate",
        "task:AnimTask_SwayMon",
      ],
      representatives: ["MOVE_REST", "MOVE_SLEEP_TALK"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });

  it("pins four complete unthinned semantic and raw-RGB receipts", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      return [
        fixture.schema, scenario.profile, fixture.orientation, fixture.sourceWindow,
        fixture.lifecycleCounts, fixture.evidenceSha256, fixture.rawRgbSha256,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema, "battle-scene-on", expected.orientation, expected.window,
      expected.lifecycle, expected.evidence, expected.raw,
    ]));
    for (const receipt of receipts) {
      expect(receipt.window.endFrame - receipt.window.startFrame + 1)
        .toBe(receipt.window.frameCount);
    }
    expect(receipts.filter((receipt) => receipt.move === "MOVE_REST")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(220);
    expect(receipts.filter((receipt) => receipt.move === "MOVE_SLEEP_TALK")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(375);
    expect(receipts.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(595);
  });

  it("keeps every retained fixture a complete legal bilateral three-Pokemon Scene-ON scenario", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.path);
      const scenario = readScenario(fixture.scenario);
      expect(fixture).toMatchObject({
        schema: expected.schema, orientation: expected.orientation, scenario: expected.scenarioPath,
        probe: "tools/compare/metronomeProbe.py", sourceWindow: expected.window,
        evidenceSha256: expected.evidence, rawRgbSha256: expected.raw,
        lifecycleCounts: expected.lifecycle,
      });
      expect(scenario).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        battleNum: 0, seed: expected.seed, playerSetIds: expected.playerSetIds,
        opponentSetIds: expected.opponentSetIds,
      });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expectCompleteParty(scenario.overrides.parties.player);
      expectCompleteParty(scenario.overrides.parties.opponent);
      const attacker = scenario.overrides.parties[expected.side][0]!;
      const target = scenario.overrides.parties[expected.side === "player" ? "opponent" : "player"][0]!;
      expect(attacker).toMatchObject(expected.attacker);
      expect(target).toMatchObject(expected.target);
      expect(scenario.trace.segments).toHaveLength(expected.segments);
      expect(scenario.trace.segments.filter((segment) => segment.buttons.includes("A")))
        .toHaveLength(expected.aPresses);
      expect(scenario.trace.captureFrames).toEqual(expected.captureFrames);
      if (expected.move === "MOVE_REST") {
        expect(fixture.appStage).toEqual({ presentationAge: 0 });
        expect(fixture.attacker).toMatchObject({ species: "TEDDIURSA", geometry: { side: expected.side } });
        expect(fixture.target).toMatchObject({ species: "ONIX", geometry: {
          side: expected.side === "player" ? "opponent" : "player",
        } });
        expect(fixture.battleState).toMatchObject({ attackerSide: expected.side, heldItem: 134 });
      } else {
        expect(fixture.staging).toMatchObject({ carrierSet: 333, carrierSpecies: "SEAKING" });
        expect(fixture.sourceSymbols).toEqual({
          Move_SLEEP_TALK: "0x082d4473", Move_HYPER_FANG: "0x082d452e",
          gLetterZSpriteTemplate: "0x085ce190", AnimLetterZ: "0x0815a7ec",
          AnimTask_SwayMon: "0x080d5f3c",
        });
        expect(fixture.topology).toEqual({
          tasks: ["AnimTask_SwayMonStep"], callbacks: ["AnimLetterZ"],
          templates: ["gLetterZSpriteTemplate"],
        });
        expect(fixture.freshRuns).toBe(2);
        expect(createHash("sha256").update(readFileSync(fixture.changeMap!)).digest("hex"))
          .toBe(fixture.changeMapSha256);
      }
    }
  });

  it("keeps both move-owned acceptance verifiers and row-127 latches load-bearing", () => {
    const restPortable = readFileSync("tools/compare/restPortable.ts", "utf8");
    for (const token of [
      "restAtAge", "sceneOnRestView", "hardwareOamLagMatch", "hardwareMatrixLagMatch",
      "battleStateMatch", "gSleepLetterZSpriteTemplate", "framebuffer=${diff === 0}",
      "tileTags", "paletteTags", "se1", "se2", "REST_FRAME_COUNT",
    ]) expect(restPortable).toContain(token);
    const sleepTalkPortable = readFileSync("tools/compare/sleepTalkPortable.ts", "utf8");
    for (const token of [
      "sleepTalkAtAge", "sceneOnSleepTalkView", "hardwareOamLagMatch", "hardwareMatrixMatch",
      "perLetterHardwareMatch", "taskMatch", "registerMatch", "audioMatch", "tagsMatch",
      "gLetterZSpriteTemplate", "framebuffer=${diff === 0}", "SLEEP_TALK_FRAME_COUNT",
    ]) expect(sleepTalkPortable).toContain(token);
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Rest `gSleepLetterZSpriteTemplate` and Sleep Talk `gLetterZSpriteTemplate` / `AnimTask_SwayMon`");
    expect(latches).toContain("source ages **4..63**, **26..85**, **48..107**");
    expect(latches).toContain("**109/109** comparable rows");
    expect(latches).toContain("visible attacker `AnimTask_SwayMon` axis is a separate RAM+2 path");
    expect(latches).toContain("This is not Frustration's SwayMon evidence");
    expect(trackGoal).toContain("No sibling, component, or latch transfer is granted");
  });
});
