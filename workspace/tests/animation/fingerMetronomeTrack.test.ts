import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Side = "player" | "opponent";

type BattleMon = {
  readonly species: number;
  readonly level: number;
  readonly nature: number;
  readonly ivs: Readonly<Record<string, number>>;
  readonly evs: Readonly<Record<string, number>>;
  readonly moves: readonly number[];
  readonly ppUps: readonly number[];
  readonly item: number;
  readonly abilitySlot: number;
  readonly friendship: number;
  readonly gender: "male" | "female";
  readonly shiny: boolean;
};

type Window = {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
};

type Topology = {
  readonly tasks: readonly string[];
  readonly templates: readonly string[];
  readonly callbacks: readonly string[];
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile?: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly sourceWindow: Window;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly topology: Topology;
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

type Receipt = {
  readonly fixturePath: string;
  readonly fixtureSha256: string;
  readonly scenarioPath: string;
  readonly scenarioSha256: string;
  readonly move: "MOVE_METRONOME" | "MOVE_FOLLOW_ME";
  readonly orientation: string;
  readonly side: Side;
  readonly schema: string;
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly lifecycle: Readonly<Record<string, number>>;
  readonly topology: Topology;
  readonly challengeNum: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly seed: number;
  readonly attacker: {
    readonly species: number;
    readonly nature: number;
    readonly item: number;
    readonly friendship: number;
    readonly gender: "male" | "female";
    readonly move: number;
  };
  readonly target: {
    readonly species: number;
    readonly nature: number;
    readonly item: number;
    readonly friendship: number;
    readonly gender: "male" | "female";
    readonly moves: readonly number[];
  };
};

const metronomeTopology: Topology = {
  tasks: ["Task_LoopAndPlaySE"],
  templates: [
    "gMetronomeFingerSpriteTemplate", "gMultiuseSpriteTemplate",
    "gSpriteTemplate_EnemyShadow", "gThoughtBubbleSpriteTemplate",
    "sHealthbarSpriteTemplates", "sHealthboxOpponentSpriteTemplates",
    "sHealthboxPlayerSpriteTemplates",
  ],
  callbacks: [
    "AnimMetronomeFinger_Step", "AnimThoughtBubble_Step", "DestroyAnimSprite",
    "DestroySpriteAndMatrix", "RunStoredCallbackWhenAffineAnimEnds",
    "RunStoredCallbackWhenAnimEnds", "SpriteCB_HealthBar", "SpriteCB_HealthBoxOther",
    "SpriteCB_SetInvisible", "SpriteCallbackDummy",
  ],
};

const followMeTopology: Topology = {
  tasks: ["Task_LoopAndPlaySE"],
  templates: [
    "gFollowMeFingerSpriteTemplate", "gMultiuseSpriteTemplate",
    "gSpriteTemplate_EnemyShadow", "sHealthbarSpriteTemplates",
    "sHealthboxOpponentSpriteTemplates", "sHealthboxPlayerSpriteTemplates",
  ],
  callbacks: [
    "AnimFollowMeFinger_Step1", "AnimFollowMeFinger_Step2", "AnimMetronomeFinger_Step",
    "DestroySpriteAndMatrix", "RunStoredCallbackWhenAffineAnimEnds",
    "SpriteCB_HealthBar", "SpriteCB_HealthBoxOther", "SpriteCB_SetInvisible",
    "SpriteCallbackDummy",
  ],
};

const trackGoal = "FULFILLED: This exact five-component boundary remains fulfilled only because MOVE_METRONOME and MOVE_FOLLOW_ME independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. MOVE_METRONOME independently owns its complete unthinned 127/127 Move_METRONOME 0x082ccf65..Move_SKULL_BASH 0x082ccf8f source body from first source-active frame through first inactive cleanup in both orientations: ANIM_TAG_FINGER, ANIM_TAG_THOUGHT_BUBBLE, gThoughtBubbleSpriteTemplate's forward/hold/reverse lifecycle, gMetronomeFingerSpriteTemplate's double-affine grow/three-wag/shrink program, tagged resources, OAM/matrix/order, registers, audio, immutable state, cleanup, and semantic/raw receipts 01f259da1179263438c721865ce1e5e534652004336a887ea9d9b91f07666e02/24940bca0b95034ff2e8b9b5b2e450996df581c70b6622fb72cb5ad360d176af and cdae46f8d3b37b4603314f96fe268621df779aee72066a272b90d8f709be6881/06e94878ed92007e98d7fe26e6f6e3404e8e76fb93273fc903a98a69b254f8f6. Its own predecessor OAM/FINGER-matrix transfer is 126/126 in each orientation at slot 4: an ordinary one-VBlank transfer, not a durable exception. MOVE_FOLLOW_ME independently owns its distinct complete unthinned 185/185 Move_FOLLOW_ME 0x082cddb1..Move_CHARGE 0x082cddd0 source body from first source-active frame through first inactive cleanup in both orientations: ANIM_TAG_FINGER, gFollowMeFingerSpriteTemplate's normal-affine grow, top-center clamp, 13-frame delay, sine/subpriority traversal, move-owned TAIL_WHIP/ATTRACT audio, shared three-wag/shrink terminal callback, tagged resources, OAM/matrix/order, registers, immutable state, cleanup, and semantic/raw receipts 5aefcc2e260438071df5776ec35ff02a9c4540e4913fcab8db5d4018892cb871/99d4031b7dc1aa40e2f68ba177e7617283a9873603b3d962db0e4cc1c33ffd96 and 74485aa1de9e13cc0721a99d78c2cacfd4bf2c456d91a0a844ae20cb1c7be0e0/7518f7d53c9d83f9ee9e5711a6082b169d56026ce037575878d7092fd1bea1bf. Its own predecessor OAM/FINGER-matrix transfer is 184/184 in each orientation at slot 3: an ordinary one-VBlank transfer, not a durable exception. Metronome's thought-bubble/finger lifecycle is not transferred to Follow Me, and Follow Me's top-center 13-frame delay/sine/subpriority path is not transferred to Metronome. No move promotion, fixture or receipt refresh, sibling/component/latch credit, or non-FINGER acceptance is granted.";

const receipts: readonly Receipt[] = [
  {
    fixturePath: "tools/compare/fixtures/metronome-player-chansey-opponent-onix.json",
    fixtureSha256: "4d5d958ddc0161ef9da577e7c449254ee742657c724049b862935ccad89899de",
    scenarioPath: "tools/battle-lab/mechanic-metronome-player-chansey-opponent-onix.json",
    scenarioSha256: "584a82a6045537a3f43e2d3dbdd56960571fa9d9ae75a8a8ba0aaa10b5cbff48",
    move: "MOVE_METRONOME", orientation: "player-back Chansey -> opponent-front Onix", side: "player",
    schema: "metronome-portable-evidence/v1",
    window: { startFrame: 245, endFrame: 371, frameCount: 127 },
    evidence: "01f259da1179263438c721865ce1e5e534652004336a887ea9d9b91f07666e02",
    raw: "24940bca0b95034ff2e8b9b5b2e450996df581c70b6622fb72cb5ad360d176af",
    lifecycle: { gThoughtBubbleSpriteTemplate: 1, gMetronomeFingerSpriteTemplate: 1 },
    topology: metronomeTopology,
    challengeNum: 1, playerSetIds: [227, 180, 190], opponentSetIds: [184, 188, 191], seed: 305419897,
    attacker: { species: 113, nature: 7, item: 0, friendship: 140, gender: "female", move: 118 },
    target: { species: 95, nature: 0, item: 0, friendship: 70, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/metronome-opponent-chansey-player-onix.json",
    fixtureSha256: "17f7f2eb79546224149fec38278b79742d8801c7b6497f847182df04dc2c1e46",
    scenarioPath: "tools/battle-lab/mechanic-metronome-opponent-chansey-player-onix.json",
    scenarioSha256: "4d4b7b386a42b467e52e80988bbe1ad1086663c3a76fda846a755a4393b8e37a",
    move: "MOVE_METRONOME", orientation: "opponent-front Chansey -> player-back Onix", side: "opponent",
    schema: "metronome-portable-evidence/v1",
    window: { startFrame: 244, endFrame: 370, frameCount: 127 },
    evidence: "cdae46f8d3b37b4603314f96fe268621df779aee72066a272b90d8f709be6881",
    raw: "06e94878ed92007e98d7fe26e6f6e3404e8e76fb93273fc903a98a69b254f8f6",
    lifecycle: { gThoughtBubbleSpriteTemplate: 1, gMetronomeFingerSpriteTemplate: 1 },
    topology: metronomeTopology,
    challengeNum: 1, playerSetIds: [184, 188, 191], opponentSetIds: [227, 180, 190], seed: 12,
    attacker: { species: 113, nature: 7, item: 0, friendship: 140, gender: "female", move: 118 },
    target: { species: 95, nature: 0, item: 0, friendship: 70, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/follow-me-player-togetic-opponent-onix.json",
    fixtureSha256: "189372dc61f94ca696e19c88c91f68d28c7700f57c1fca96668465922ef3482b",
    scenarioPath: "tools/battle-lab/mechanic-follow-me-player-togetic-opponent-onix.json",
    scenarioSha256: "15b7395739ea583e87eefac04cc9350a6b55acece495d7c757072d3e94bc1246",
    move: "MOVE_FOLLOW_ME", orientation: "player-back Togetic -> opponent-front Onix", side: "player",
    schema: "follow-me-portable-evidence/v1",
    window: { startFrame: 69, endFrame: 253, frameCount: 185 },
    evidence: "5aefcc2e260438071df5776ec35ff02a9c4540e4913fcab8db5d4018892cb871",
    raw: "99d4031b7dc1aa40e2f68ba177e7617283a9873603b3d962db0e4cc1c33ffd96",
    lifecycle: { gFollowMeFingerSpriteTemplate: 1 },
    topology: followMeTopology,
    challengeNum: 0, playerSetIds: [183, 185, 188], opponentSetIds: [156, 157, 158], seed: 305419897,
    attacker: { species: 176, nature: 7, item: 221, friendship: 0, gender: "male", move: 266 },
    target: { species: 95, nature: 0, item: 142, friendship: 0, gender: "male", moves: [157, 20, 225, 201] },
  },
  {
    fixturePath: "tools/compare/fixtures/follow-me-opponent-togetic-player-onix.json",
    fixtureSha256: "35a43f20559ef97dce1f00b35a28e6823c1409d83e67bb9f66d477a626c93cf3",
    scenarioPath: "tools/battle-lab/mechanic-follow-me-opponent-togetic-player-onix.json",
    scenarioSha256: "e45ea058fd4b2e4a52882a6e4ba2cad50ebf6e20b35ab453f3cc2f7e7a970de9",
    move: "MOVE_FOLLOW_ME", orientation: "opponent-front Togetic -> player-back Onix", side: "opponent",
    schema: "follow-me-portable-evidence/v1",
    window: { startFrame: 73, endFrame: 257, frameCount: 185 },
    evidence: "74485aa1de9e13cc0721a99d78c2cacfd4bf2c456d91a0a844ae20cb1c7be0e0",
    raw: "7518f7d53c9d83f9ee9e5711a6082b169d56026ce037575878d7092fd1bea1bf",
    lifecycle: { gFollowMeFingerSpriteTemplate: 1 },
    topology: followMeTopology,
    challengeNum: 0, playerSetIds: [156, 157, 158], opponentSetIds: [183, 185, 188], seed: 305419897,
    attacker: { species: 176, nature: 7, item: 221, friendship: 0, gender: "male", move: 266 },
    target: { species: 95, nature: 0, item: 142, friendship: 0, gender: "male", moves: [157, 20, 225, 201] },
  },
];

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function readFixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function readScenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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
    expect(mon.abilitySlot).toBe(0);
    expect(mon.gender === "male" || mon.gender === "female").toBe(true);
    expect(mon.shiny).toBe(false);
  }
}

describe("finger-metronome standalone fulfilled component-track ratchet", () => {
  it("pins both distinct source bodies, authoritative intervals, and the five-component boundary", () => {
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/metronomeSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "set 227/FRONTIER_MON_CHANSEY_1 -> SPECIES_CHANSEY 113/move 118; "
      + "THOUGHT_BUBBLE + FINGER; AnimThoughtBubble; AnimMetronomeFinger; "
      + "SE_M_METRONOME + looped SE_M_TAIL_WHIP; Follow Me sibling has "
      + "gFollowMeFingerSpriteTemplate/AnimFollowMeFinger and distinct top-center "
      + "sine/subpriority lifecycle with SE_M_ATTRACT\n",
    );
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/followMeSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "lowest Level-50 carrier set 183/FRONTIER_MON_TOGETIC_1 -> "
      + "SPECIES_TOGETIC 176/move 266/LAX_INCENSE/DEFENSE+HP/RELAXED; "
      + "gFollowMeFingerSpriteTemplate/AnimFollowMeFinger; top-center, "
      + "13-frame delay, sine/subpriority traversal, shared Metronome terminal\n",
    );

    const nm = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    const pointer = (symbol: string): string => {
      const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
      if (!match) throw new Error(`missing ${symbol}`);
      return `0x${match[1]!.toLowerCase()}`;
    };
    expect({
      Move_METRONOME: pointer("Move_METRONOME"),
      Move_SKULL_BASH: pointer("Move_SKULL_BASH"),
      Move_FOLLOW_ME: pointer("Move_FOLLOW_ME"),
      Move_CHARGE: pointer("Move_CHARGE"),
      gThoughtBubbleSpriteTemplate: pointer("gThoughtBubbleSpriteTemplate"),
      gMetronomeFingerSpriteTemplate: pointer("gMetronomeFingerSpriteTemplate"),
      gFollowMeFingerSpriteTemplate: pointer("gFollowMeFingerSpriteTemplate"),
    }).toEqual({
      Move_METRONOME: "0x082ccf65", Move_SKULL_BASH: "0x082ccf8f",
      Move_FOLLOW_ME: "0x082cddb1", Move_CHARGE: "0x082cddd0",
      gThoughtBubbleSpriteTemplate: "0x08593114",
      gMetronomeFingerSpriteTemplate: "0x085931bc",
      gFollowMeFingerSpriteTemplate: "0x085931d4",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const metronomeBody = scripts.slice(
      scripts.indexOf("Move_METRONOME:"), scripts.indexOf("Move_SKULL_BASH:"),
    );
    const followMeBody = scripts.slice(
      scripts.indexOf("Move_FOLLOW_ME:"), scripts.indexOf("Move_CHARGE:"),
    );
    expect(createHash("sha256").update(metronomeBody).digest("hex"))
      .toBe("edab5a1f30c36f5b7b16b84cc87aa4bd60224087f85316582e68cab9a324c294");
    expect(createHash("sha256").update(followMeBody).digest("hex"))
      .toBe("be2b89978519d1872ebdfd97384279399eed2c0df8be7d9bfe657bf9190dad7c");
    for (const token of [
      "loadspritegfx ANIM_TAG_FINGER", "loadspritegfx ANIM_TAG_THOUGHT_BUBBLE",
      "gThoughtBubbleSpriteTemplate", "gMetronomeFingerSpriteTemplate",
      "playsewithpan SE_M_METRONOME", "loopsewithpan SE_M_TAIL_WHIP",
      "waitforvisualfinish", "end",
    ]) expect(metronomeBody).toContain(token);
    expect(metronomeBody).not.toContain("gFollowMeFingerSpriteTemplate");
    for (const token of [
      "loadspritegfx ANIM_TAG_FINGER", "gFollowMeFingerSpriteTemplate",
      "playsewithpan SE_M_TAIL_WHIP", "playsewithpan SE_M_ATTRACT", "delay 18",
      "delay 71", "loopsewithpan SE_M_TAIL_WHIP", "end",
    ]) expect(followMeBody).toContain(token);
    expect(followMeBody).not.toContain("ANIM_TAG_THOUGHT_BUBBLE");
    expect(followMeBody).not.toContain("gMetronomeFingerSpriteTemplate");

    const effects = readFileSync("reference/pokeemerald/src/battle_anim_effects_1.c", "utf8");
    for (const token of [
      "gThoughtBubbleSpriteTemplate", "ANIM_TAG_THOUGHT_BUBBLE",
      "gMetronomeFingerSpriteTemplate", "gOamData_AffineDouble_ObjNormal_32x32",
      "AnimMetronomeFinger_Step", "gFollowMeFingerSpriteTemplate",
      "gOamData_AffineNormal_ObjNormal_32x32", "AnimFollowMeFinger_Step1",
      "if (++sprite->data[4] > 12)", "BATTLER_COORD_ATTR_TOP",
      "sprite->callback = AnimMetronomeFinger_Step", "gSineTable",
    ]) expect(effects).toContain(token);
  });

  it("pins all four complete unthinned bilateral semantic/raw-RGB lifecycle and topology receipts", () => {
    const actual = receipts.map((expected) => {
      const fixture = readFixture(expected.fixturePath);
      const scenario = readScenario(fixture.scenario);
      return [
        digest(expected.fixturePath), digest(fixture.scenario), fixture.schema,
        fixture.oracleProfile ?? scenario.profile, fixture.orientation, fixture.scenario,
        fixture.appStage, fixture.sourceWindow, fixture.evidenceSha256, fixture.rawRgbSha256,
        fixture.lifecycleCounts, fixture.topology,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.fixtureSha256, expected.scenarioSha256, expected.schema,
      "battle-scene-on", expected.orientation, expected.scenarioPath,
      { presentationAge: 0 }, expected.window, expected.evidence, expected.raw,
      expected.lifecycle, expected.topology,
    ]));
    for (const expected of receipts) {
      const fixture = readFixture(expected.fixturePath);
      expect(fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1)
        .toBe(expected.window.frameCount);
    }
    expect(receipts.filter((receipt) => receipt.move === "MOVE_METRONOME")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(254);
    expect(receipts.filter((receipt) => receipt.move === "MOVE_FOLLOW_ME")
      .reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(370);
    expect(receipts.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(624);
  });

  it("keeps every retained fixture an untouched legal three-Pokemon bilateral Scene-ON scenario", () => {
    for (const expected of receipts) {
      const fixture = readFixture(expected.fixturePath);
      const scenario = readScenario(fixture.scenario);
      expect(fixture).toMatchObject({
        schema: expected.schema, orientation: expected.orientation,
        scenario: expected.scenarioPath, probe: "tools/compare/metronomeProbe.py",
        appStage: { presentationAge: 0 }, sourceWindow: expected.window,
        evidenceSha256: expected.evidence, rawRgbSha256: expected.raw,
        lifecycleCounts: expected.lifecycle, topology: expected.topology,
        attacker: { geometry: { side: expected.side } },
        target: { geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
      expect(scenario).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: expected.challengeNum, battleNum: 0,
        playerSetIds: expected.playerSetIds, opponentSetIds: expected.opponentSetIds,
        seed: expected.seed,
      });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expectCompleteParty(scenario.overrides.parties.player);
      expectCompleteParty(scenario.overrides.parties.opponent);
      const attacker = scenario.overrides.parties[expected.side][0]!;
      const target = scenario.overrides.parties[expected.side === "player" ? "opponent" : "player"][0]!;
      expect(attacker).toMatchObject({
        species: expected.attacker.species, level: 50, nature: expected.attacker.nature,
        item: expected.attacker.item, friendship: expected.attacker.friendship,
        gender: expected.attacker.gender, abilitySlot: 0,
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attacker.move));
      expect(target).toMatchObject({
        species: expected.target.species, level: 50, nature: expected.target.nature,
        item: expected.target.item, friendship: expected.target.friendship,
        gender: expected.target.gender, abilitySlot: 0,
      });
      expect(target.moves).toEqual(expected.target.moves);
      expect(scenario.trace.segments.map(({ frames, buttons }) => [frames, buttons]))
        .toEqual([[2, ["A"]], [30, []], [2, ["A"]], [500, []]]);
      expect(scenario.trace.captureFrames).toEqual([0, 534]);
    }
  });

  it("keeps the two-fresh portable verifier, transfer proofs, immutable state, and cleanup load-bearing", () => {
    const verifier = readFileSync("tools/compare/metronomePortable.ts", "utf8");
    const metronome = readFileSync("src/animation/metronome.ts", "utf8");
    const followMe = readFileSync("src/animation/followMe.ts", "utf8");
    for (const token of [
      "METRONOME_FRAME_COUNT", "FOLLOW_ME_FRAME_COUNT", "metronomeAtAge", "followMeAtAge",
      "createSceneOnMovePresentation", "sceneOnMetronomeView", "sceneOnFollowMeView",
      "compactSemanticReceiptSha256", "tools/run-mgba-probe.py", "createScratchDir",
      "same(probe.sourceWindow, fixture.sourceWindow)",
      "same(probe.lifecycleCounts, fixture.lifecycleCounts)",
      "same(probe.topology, fixture.topology)", "evidence !== fixture.evidenceSha256",
      "rawDigest !== fixture.rawRgbSha256", "raw RGB window digest",
      "gameplay battlers changed inside presentation window", "softwareOam", "hardwareOam",
      "hardwareMatrices", "fadedPalette", "unfadedPalette", "hardwarePalette",
      "paletteTags", "tileTags", "registers", "frame.se1 !== null", "frame.se2 !== null",
      "hardwareOamTransfer", "same(oracle.hardwareOam, previous.softwareOam)",
      "hardwareMatrixTransfer", "same(oracle.hardwareMatrices[sprite.matrixNum], sprite.matrix)",
      "fingerOrder", "const expectedFingerSlot = isFollowMe ? 3 : 4",
      "const app = render(engine)", "240 * 160", "framebuffer=${diff === 0}",
      "gAnimScriptActive", "visualTaskCount", "const cleanup", "fresh proof diverged",
      "verify(fixturePath, 1)", "verify(fixturePath, 2)",
    ]) expect(verifier).toContain(token);
    expect(metronome).toContain("export const METRONOME_FRAME_COUNT = 127;");
    expect(metronome).toContain("slot: 4");
    expect(followMe).toContain("export const FOLLOW_ME_FRAME_COUNT = 185;");
    expect(followMe).toContain("slot: 3");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured");
    expect(trackGoal).toContain("126/126 in each orientation at slot 4");
    expect(trackGoal).toContain("184/184 in each orientation at slot 3");
    expect(trackGoal).toContain("not a durable exception");
  });

  it("fulfills only the exact five-component track at the unchanged 239/276 count", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const inventory = JSON.parse(readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"));
    const level50Moves = new Set<string>(inventory.tiers.level50.moves
      .map((entry: { move: string }) => entry.move));
    expect(level50Moves.size).toBe(276);
    expect(coverage.entries.filter((entry: { move: string; status: string }) =>
      level50Moves.has(entry.move) && entry.status === "exact",
    )).toHaveLength(239);
    expect(coverage.entries.filter((entry: { move: string; status: string }) =>
      level50Moves.has(entry.move) && (entry.status === "partial" || entry.status === "staged"),
    )).toEqual([]);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_METRONOME", "MOVE_FOLLOW_ME",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_FOLLOW_ME", status: "exact" }),
      expect.objectContaining({ move: "MOVE_METRONOME", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "finger-metronome",
    )).toEqual([
      {
        id: "finger-metronome",
        components: [
          "asset:ANIM_TAG_FINGER",
          "asset:ANIM_TAG_THOUGHT_BUBBLE",
          "sprite:gThoughtBubbleSpriteTemplate",
          "sprite:gMetronomeFingerSpriteTemplate",
          "sprite:gFollowMeFingerSpriteTemplate",
        ],
        representatives: ["MOVE_METRONOME", "MOVE_FOLLOW_ME"],
        fulfilled: true,
        goal: trackGoal,
      },
    ]);
  });
});
