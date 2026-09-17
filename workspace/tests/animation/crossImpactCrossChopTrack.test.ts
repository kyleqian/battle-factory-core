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
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: Window;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts?: Readonly<Record<string, number>>;
  readonly topology: Topology;
  readonly changeMap?: string;
  readonly changeMapSha256?: string;
  readonly targetPan?: number;
  readonly soundAges?: Readonly<Record<string, number>>;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: Side } };
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
  readonly move: "MOVE_CROSS_CHOP" | "MOVE_LEAF_BLADE";
  readonly schema: string;
  readonly orientation: string;
  readonly side: Side;
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly lifecycle: Readonly<Record<string, number>>;
  readonly topology: Topology;
  readonly changeMap?: string;
  readonly changeMapSha256?: string;
  readonly targetPan?: number;
  readonly challengeNum: number;
  readonly trainerId: number;
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

const crossChopTopology: Topology = {
  tasks: ["AnimTask_ShakeMon_Step", "Task_ClearMonBg", "Task_UpdateMonBg"],
  templates: [
    "gComplexPaletteBlendSpriteTemplate", "gCrossChopHandSpriteTemplate",
    "gCrossImpactSpriteTemplate", "gMultiuseSpriteTemplate",
    "gSpriteTemplate_EnemyShadow", "sHealthbarSpriteTemplates",
    "sHealthboxOpponentSpriteTemplates", "sHealthboxPlayerSpriteTemplates",
  ],
  callbacks: [
    "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2",
    "AnimCrossChopHand_Step", "AnimTranslateLinear_WithFollowup",
    "DestroyAnimSprite", "SpriteCB_HealthBar", "SpriteCB_HealthBoxOther",
    "SpriteCB_SetInvisible", "SpriteCallbackDummy", "StartAnimLinearTranslation",
    "WaitAnimForDuration",
  ],
};

const leafBladeTopology: Topology = {
  tasks: [
    "AnimTask_LeafBlade_Step", "AnimTask_ShakeMon2_Step",
    "Task_ClearMonBg", "Task_UpdateMonBg",
  ],
  templates: [
    "gCrossImpactSpriteTemplate", "gLeafBladeSpriteTemplate",
    "gMultiuseSpriteTemplate", "gSpriteTemplate_EnemyShadow",
    "sHealthbarSpriteTemplates", "sHealthboxOpponentSpriteTemplates",
    "sHealthboxPlayerSpriteTemplates",
  ],
  callbacks: [
    "AnimTask_LeafBlade_Step2_Callback", "DestroyAnimSprite",
    "SpriteCB_HealthBar", "SpriteCB_HealthBoxOther", "SpriteCB_SetInvisible",
    "SpriteCallbackDummy", "WaitAnimForDuration",
  ],
};

const trackGoal = "FULFILLED: This exact ten-component boundary remains fulfilled only because MOVE_CROSS_CHOP and MOVE_LEAF_BLADE independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. MOVE_CROSS_CHOP independently owns its complete unthinned 88/88 Move_CROSS_CHOP 0x082d2105..Move_JUMP_KICK 0x082d216e body from first source-active display through first inactive cleanup in both orientations: legal set-283 MACHOKE parties, ANIM_TAG_HANDS_AND_FEET and ANIM_TAG_CROSS_IMPACT, two gCrossChopHandSpriteTemplate two-stage translations, complex_palette_blend, target monbg 12:8 alpha, target AnimTask_ShakeMon(7,0,9,1), a 20-frame CROSS_IMPACT, audio, OAM/matrix/palette/register/immutable-state proofs, and receipts 7be7a5bb02c477873c77bec6162f0c9dc0f92e3f1ec3ec8572037c4a44888bc7/9d38ec1582d17fea8c5103c90f904fbf983793b0e3aa26e2cf1df2cec5cd3d04 and a556199025d17c28ddc9429216daff80afad1f29d92f15324dd563092010d23f/528e9ed15d9e9926f92e5e6e4ce8bbc0d157f34c8e6a05372561d004b76f900f. Cross Chop independently retains its own predecessor hardware OAM/matrix/palette transfer, including only its source-observed target-monbg setup palette handoff; it does not borrow Leaf Blade timing or latches. MOVE_LEAF_BLADE independently owns its distinct complete unthinned 224/224 Move_LEAF_BLADE 0x082cf330..Move_DRAGON_DANCE 0x082cf3b3 body from first source-active display through first inactive cleanup in both orientations: legal set-453 SCEPTILE parties, ANIM_TAG_LEAF and ANIM_TAG_CROSS_IMPACT, its seven-arc AnimTask_LeafBlade plus 77 blinking trails, three short and one target-monbg ShakeMon2 schedules, a 36-frame CROSS_IMPACT, CUT/LEER audio, OAM/matrix/palette/register/immutable-state proofs, normalized maps, and receipts 5dcb5555738c51baf01032b7be3e67fa2f65c43ee133d7a440ae3f921c741369/6ba2d80fc47d05832114a857ab1bacbed1e69352d577adadfbcd26d49e74f4ad/ec5984b0761e0c724bbbf6d2c10ba069035ac495db876e4a2ef249dfd3313cbd and c2a599b0d4adaf7f807100908cf4d2a79210ccf38c00acc2aa88181db43578b5/b85563f61d8681263728ac4becdf524b329854db31ca3a122257590e00285bed/8a776614bf459d95e0b6de17f4253813f7400ef2583ae80a91acca34e69e333b. Shared CROSS_IMPACT does not transfer impact, slash, translation, shake, blend, BG, sprite, timing, or latch facts between the two moves; no move promotion, fixture or receipt refresh, sibling/component credit, or non-boundary acceptance is granted.";

const receipts: readonly Receipt[] = [
  {
    fixturePath: "tools/compare/fixtures/cross-chop-player-machoke-opponent-onix.json",
    fixtureSha256: "fd56b7440a91288bc5e868ebdb57501308d562f6a572e01dcf502203bf1f551d",
    scenarioPath: "tools/battle-lab/mechanic-cross-chop-player-machoke-opponent-onix.json",
    scenarioSha256: "32238a08fac265f60bacfeb39757d243fc5bae3a53b99839ebf7b9443a6c9df3",
    move: "MOVE_CROSS_CHOP", schema: "cross-chop-portable-evidence/v1",
    orientation: "player-back Machoke -> opponent-front Onix", side: "player",
    window: { startFrame: 216, endFrame: 303, frameCount: 88 },
    evidence: "7be7a5bb02c477873c77bec6162f0c9dc0f92e3f1ec3ec8572037c4a44888bc7",
    raw: "9d38ec1582d17fea8c5103c90f904fbf983793b0e3aa26e2cf1df2cec5cd3d04",
    lifecycle: { crossChopHand: 2, crossImpact: 1 }, topology: crossChopTopology,
    targetPan: 63, challengeNum: 2, trainerId: 100,
    playerSetIds: [283, 267, 268], opponentSetIds: [280, 281, 282], seed: 305419898,
    attacker: { species: 67, nature: 3, item: 0, friendship: 0, gender: "male", move: 238 },
    target: { species: 95, nature: 2, item: 0, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/cross-chop-opponent-machoke-player-onix.json",
    fixtureSha256: "2d0a17bca2f0e22243ed72f3cb95b4f6051659fe15fadd5e5699237c74901a69",
    scenarioPath: "tools/battle-lab/mechanic-cross-chop-opponent-machoke-player-onix.json",
    scenarioSha256: "ba5f5435cee53592d49fd76eeb51ca024fbc602f1d934519c12d3a6dc2ba5572",
    move: "MOVE_CROSS_CHOP", schema: "cross-chop-portable-evidence/v1",
    orientation: "opponent-front Machoke -> player-back Onix", side: "opponent",
    window: { startFrame: 217, endFrame: 304, frameCount: 88 },
    evidence: "a556199025d17c28ddc9429216daff80afad1f29d92f15324dd563092010d23f",
    raw: "528e9ed15d9e9926f92e5e6e4ce8bbc0d157f34c8e6a05372561d004b76f900f",
    lifecycle: { crossChopHand: 2, crossImpact: 1 }, topology: crossChopTopology,
    targetPan: -63, challengeNum: 2, trainerId: 100,
    playerSetIds: [280, 281, 282], opponentSetIds: [283, 267, 268], seed: 305419899,
    attacker: { species: 67, nature: 3, item: 0, friendship: 0, gender: "male", move: 238 },
    target: { species: 95, nature: 2, item: 0, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/leaf-blade-player-sceptile-opponent-onix.json",
    fixtureSha256: "3886db3b8010c256a9ccada714889798b4a165cf1a5dbfe566dfec630351d8ea",
    scenarioPath: "tools/battle-lab/mechanic-leaf-blade-player-sceptile-opponent-onix.json",
    scenarioSha256: "f14f16a230e3031fd8ab5f13482fc97b3337a0ab408a1e1c7b977886665aa71a",
    move: "MOVE_LEAF_BLADE", schema: "leaf-blade-portable-evidence/v2",
    orientation: "player-back Sceptile -> opponent-front Onix", side: "player",
    window: { startFrame: 76, endFrame: 299, frameCount: 224 },
    evidence: "5dcb5555738c51baf01032b7be3e67fa2f65c43ee133d7a440ae3f921c741369",
    raw: "6ba2d80fc47d05832114a857ab1bacbed1e69352d577adadfbcd26d49e74f4ad",
    lifecycle: { leafBlade: 45, crossImpact: 1 }, topology: leafBladeTopology,
    changeMap: "tools/compare/evidence/leaf-blade-changemap-player.txt",
    changeMapSha256: "ec5984b0761e0c724bbbf6d2c10ba069035ac495db876e4a2ef249dfd3313cbd",
    challengeNum: 3, trainerId: 120,
    playerSetIds: [453, 372, 375], opponentSetIds: [373, 376, 377], seed: 305420120,
    attacker: { species: 279, nature: 15, item: 1, friendship: 0, gender: "male", move: 348 },
    target: { species: 95, nature: 2, item: 1, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/leaf-blade-opponent-sceptile-player-onix.json",
    fixtureSha256: "f73d9520e5702eed81d2b417a59df3a9a8620a40b571a7ea5921dd4b197539b1",
    scenarioPath: "tools/battle-lab/mechanic-leaf-blade-opponent-sceptile-player-onix.json",
    scenarioSha256: "19d287810059768f9a164a591bd45553097bfc775655b8db41eae97c5918c65f",
    move: "MOVE_LEAF_BLADE", schema: "leaf-blade-portable-evidence/v2",
    orientation: "opponent-front Sceptile -> player-back Onix", side: "opponent",
    window: { startFrame: 80, endFrame: 303, frameCount: 224 },
    evidence: "c2a599b0d4adaf7f807100908cf4d2a79210ccf38c00acc2aa88181db43578b5",
    raw: "b85563f61d8681263728ac4becdf524b329854db31ca3a122257590e00285bed",
    lifecycle: { leafBlade: 45, crossImpact: 1 }, topology: leafBladeTopology,
    changeMap: "tools/compare/evidence/leaf-blade-changemap-opponent.txt",
    changeMapSha256: "8a776614bf459d95e0b6de17f4253813f7400ef2583ae80a91acca34e69e333b",
    challengeNum: 3, trainerId: 120,
    playerSetIds: [373, 376, 377], opponentSetIds: [453, 372, 375], seed: 305420121,
    attacker: { species: 279, nature: 15, item: 1, friendship: 0, gender: "male", move: 348 },
    target: { species: 95, nature: 2, item: 1, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
  },
];

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function fixture(path: string): Fixture {
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

function scenario(path: string): Scenario {
  return JSON.parse(readFileSync(path, "utf8")) as Scenario;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function pointer(symbols: string, symbol: string): string {
  const match = symbols.match(new RegExp("^([0-9a-fA-F]+)\\s+\\w\\s+" + symbol + "$", "m"));
  if (!match) throw new Error("missing " + symbol);
  return "0x" + match[1]!.toLowerCase();
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

describe("cross-impact-cross-chop standalone fulfilled component-track ratchet", () => {
  it("pins both distinct source bodies, authoritative pointers, and source tokens", () => {
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/crossChopSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "set 283/species 67/move 238; 2 HANDS_AND_FEET + 1 CROSS_IMPACT; "
      + "alpha 12:8; target ShakeMon(7,0,9,1); cleanup\n",
    );
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/leafBladeSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "set 453/species 279/move 348; LEAF + CROSS_IMPACT; states 0..13/0xFF; "
      + "7 arcs + 5-tick pauses; blinking child trails; 4 ShakeMon2; "
      + "3 CUT + LEER; cleanup\n",
    );

    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect({
      Move_CROSS_CHOP: pointer(symbols, "Move_CROSS_CHOP"),
      Move_JUMP_KICK: pointer(symbols, "Move_JUMP_KICK"),
      Move_LEAF_BLADE: pointer(symbols, "Move_LEAF_BLADE"),
      Move_DRAGON_DANCE: pointer(symbols, "Move_DRAGON_DANCE"),
      gCrossChopHandSpriteTemplate: pointer(symbols, "gCrossChopHandSpriteTemplate"),
      gCrossImpactSpriteTemplate: pointer(symbols, "gCrossImpactSpriteTemplate"),
      gLeafBladeSpriteTemplate: pointer(symbols, "gLeafBladeSpriteTemplate"),
      AnimCrossChopHand: pointer(symbols, "AnimCrossChopHand"),
      AnimTask_ShakeMon: pointer(symbols, "AnimTask_ShakeMon"),
      AnimTask_LeafBlade: pointer(symbols, "AnimTask_LeafBlade"),
      AnimTask_ShakeMon2: pointer(symbols, "AnimTask_ShakeMon2"),
    }).toEqual({
      Move_CROSS_CHOP: "0x082d2105", Move_JUMP_KICK: "0x082d216e",
      Move_LEAF_BLADE: "0x082cf330", Move_DRAGON_DANCE: "0x082cf3b3",
      gCrossChopHandSpriteTemplate: "0x08595ec8",
      gCrossImpactSpriteTemplate: "0x085973d0",
      gLeafBladeSpriteTemplate: "0x08592778",
      AnimCrossChopHand: "0x0810d10c", AnimTask_ShakeMon: "0x080d51ac",
      AnimTask_LeafBlade: "0x080fffc0", AnimTask_ShakeMon2: "0x080d52d0",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const crossChopBody = scripts.slice(
      scripts.indexOf("Move_CROSS_CHOP:"), scripts.indexOf("Move_JUMP_KICK:"),
    );
    const leafBladeBody = scripts.slice(
      scripts.indexOf("Move_LEAF_BLADE:"), scripts.indexOf("Move_DRAGON_DANCE:"),
    );
    expect(createHash("sha256").update(crossChopBody).digest("hex"))
      .toBe("f43433bff1786bf0124fe85a4c2f3e6a5a11ee830e908044516c37d1f3775df2");
    expect(createHash("sha256").update(leafBladeBody).digest("hex"))
      .toBe("73d83fb9786e8f3dc6dd9d1b29b9aa5888c27d497e63611fad01fb82e45e1257");
    expect(crossChopBody).not.toBe(leafBladeBody);

    for (const token of [
      "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
      "loadspritegfx ANIM_TAG_CROSS_IMPACT",
      "monbg ANIM_DEF_PARTNER",
      "setalpha 12, 8",
      "playsewithpan SE_M_MEGA_KICK, SOUND_PAN_TARGET",
      "createsprite gCrossChopHandSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 0",
      "createsprite gCrossChopHandSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 1",
      "delay 40",
      "playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET",
      "complex_palette_blend",
      "create_cross_impact_sprite ANIM_ATTACKER, 3, x=0, y=0, relative_to=ANIM_TARGET, duration=20",
      "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 7, 0, 9, 1",
      "clearmonbg ANIM_DEF_PARTNER",
      "blendoff",
      "end",
    ]) expect(crossChopBody).toContain(token);
    expect((crossChopBody.match(/gCrossChopHandSpriteTemplate/g) ?? [])).toHaveLength(2);
    expect(crossChopBody).not.toContain("create_leaf_blade_task");
    expect(crossChopBody).not.toContain("AnimTask_ShakeMon2");

    for (const token of [
      "loadspritegfx ANIM_TAG_LEAF",
      "loadspritegfx ANIM_TAG_CROSS_IMPACT",
      "create_leaf_blade_task",
      "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "playsewithpan SE_M_CUT, SOUND_PAN_TARGET",
      "monbg ANIM_TARGET",
      "setalpha 12, 8",
      "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 8, 0, 18, 1",
      "create_cross_impact_sprite ANIM_TARGET, 2, x=0, y=0, relative_to=ANIM_TARGET, duration=36",
      "playsewithpan SE_M_LEER, SOUND_PAN_TARGET",
      "clearmonbg ANIM_TARGET",
      "blendoff",
      "end",
    ]) expect(leafBladeBody).toContain(token);
    expect((leafBladeBody.match(/AnimTask_ShakeMon2/g) ?? [])).toHaveLength(4);
    expect((leafBladeBody.match(/SE_M_CUT/g) ?? [])).toHaveLength(3);
    expect(leafBladeBody).not.toContain("gCrossChopHandSpriteTemplate");
    expect(leafBladeBody).not.toContain("complex_palette_blend");
  });

  it("pins all four untouched semantic/raw-RGB receipts, normalized maps, topology, lifecycle, and unthinned rows", () => {
    for (const expected of receipts) {
      const stored = fixture(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(stored).toMatchObject({
        schema: expected.schema,
        orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: expected.move === "MOVE_CROSS_CHOP"
          ? "tools/compare/crossChopProbe.py"
          : "tools/compare/leafBladeProbe.py",
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        topology: expected.topology,
        attacker: {
          species: expected.move === "MOVE_CROSS_CHOP" ? "MACHOKE" : "SCEPTILE",
          geometry: { side: expected.side },
        },
        target: {
          species: "ONIX",
          geometry: { side: expected.side === "player" ? "opponent" : "player" },
        },
      });
      expect(stored.sourceWindow.endFrame - stored.sourceWindow.startFrame + 1)
        .toBe(expected.window.frameCount);
      if (expected.move === "MOVE_CROSS_CHOP") {
        expect(stored.targetPan).toBe(expected.targetPan);
        expect(stored.soundAges).toEqual({ megaKick: 10, razorWind: 52 });
      } else {
        expect(stored.lifecycleCounts).toEqual(expected.lifecycle);
        expect(stored.changeMap).toBe(expected.changeMap);
        expect(stored.changeMapSha256).toBe(expected.changeMapSha256);
        expect(digest(expected.changeMap!)).toBe(expected.changeMapSha256);
      }
    }
    expect(receipts.filter((entry) => entry.move === "MOVE_CROSS_CHOP")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(176);
    expect(receipts.filter((entry) => entry.move === "MOVE_LEAF_BLADE")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(448);
    expect(receipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(624);
  });

  it("keeps every retained scenario a complete legal three-Pokemon party-only Scene-ON fixture", () => {
    for (const expected of receipts) {
      const stored = fixture(expected.fixturePath);
      const staged = scenario(expected.scenarioPath);
      expect(stored.scenario).toBe(expected.scenarioPath);
      expect(staged).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: expected.challengeNum,
        battleNum: 0,
        trainerId: expected.trainerId,
        playerSetIds: expected.playerSetIds,
        opponentSetIds: expected.opponentSetIds,
        seed: expected.seed,
      });
      expect(Object.keys(staged.overrides)).toEqual(["parties"]);
      expect(Object.keys(staged.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteParty(staged.overrides.parties.player);
      expectCompleteParty(staged.overrides.parties.opponent);
      expect(Object.keys(staged.trace).sort()).toEqual(["captureFrames", "segments"]);
      expect(staged.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] },
        { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] },
        { frames: 800, buttons: [] },
      ]);
      expect(staged.trace.captureFrames).toEqual([0, 834]);

      const attacker = staged.overrides.parties[expected.side][0]!;
      const target = staged.overrides.parties[
        expected.side === "player" ? "opponent" : "player"
      ][0]!;
      expect(attacker).toMatchObject({
        species: expected.attacker.species,
        level: 50,
        nature: expected.attacker.nature,
        item: expected.attacker.item,
        friendship: expected.attacker.friendship,
        gender: expected.attacker.gender,
        abilitySlot: 0,
        shiny: false,
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attacker.move));
      expect(target).toMatchObject({
        species: expected.target.species,
        level: 50,
        nature: expected.target.nature,
        item: expected.target.item,
        friendship: expected.target.friendship,
        gender: expected.target.gender,
        abilitySlot: 0,
        shiny: false,
      });
      expect(target.moves).toEqual(expected.target.moves);
    }
  });

  it("keeps current portable cleanup, raw framebuffer, transfer, and move-owned latch obligations load-bearing", () => {
    const crossChop = readFileSync("src/animation/crossChop.ts", "utf8");
    const leafBlade = readFileSync("src/animation/leafBlade.ts", "utf8");
    for (const token of [
      "Pure source-relative port of the complete 88-display Move_CROSS_CHOP",
      "function scriptOffsetAtAge(",
      "function paletteBlendAtAge(",
      "function targetShakeX2(",
      "battlerDisplayAge: age - 1",
      "handsAndFeet: age >= 1 && age <= 86",
      "crossImpact: age >= 4 && age <= 86",
    ]) expect(crossChop).toContain(token);
    for (const token of [
      "Pure source-relative reducer for the complete Move_LEAF_BLADE envelope",
      "function leafBladeDisplayedTargetX2AtAge(",
      "function leafBladeDisplayedOamOrderAtAge(",
      "shakeAtAge(age - 2)",
      "shakeAtAge(age - 1)",
      "const FIRST_INACTIVE_AGE = 223;",
    ]) expect(leafBlade).toContain(token);

    const portableChecks = [
      [
        readFileSync("tools/compare/crossChopPortable.ts", "utf8"),
        "crossChopAtAge",
        "sceneOnCrossChopView",
        "probe.lifecycleCounts.crossChopHand !== 2",
        "probe.lifecycleCounts.crossImpact !== 1",
      ],
      [
        readFileSync("tools/compare/leafBladePortable.ts", "utf8"),
        "leafBladeAtAge",
        "sceneOnLeafBladeView",
        "same(probe.lifecycleCounts, fixture.lifecycleCounts)",
        "changeMapHash !== fixture.changeMapSha256",
      ],
    ] as const;
    for (const [portable, reducer, seam, lifecycle, extraReceipt] of portableChecks) {
      for (const token of [
        "createScratchDir",
        "tools/run-mgba-probe.py",
        "compactSemanticReceiptSha256",
        reducer,
        seam,
        "same(probe.sourceWindow, fixture.sourceWindow)",
        "same(probe.topology, fixture.topology)",
        "evidence !== fixture.evidenceSha256",
        "gAnimScriptActive",
        "visualTaskCount",
        "softwareOam",
        "hardwareOam",
        "hardwareMatrices",
        "fadedPalette",
        "unfadedPalette",
        "hardwarePalette",
        "paletteTags",
        "registers",
        "actual.se1",
        "actual.se2",
        "same(actual.hardwareOam",
        "same(actual.hardwareMatrices",
        "same(actual.hardwarePalette",
        "same(actual.battlers",
        "const app = render(engine)",
        "240 * 160",
        "const firstInactiveCleanup = cleanup !== undefined",
        "probe.frames[0]?.gAnimScriptActive !== 1",
        "fresh proof diverged",
        "for (let repeat = 0; repeat < 2; repeat += 1)",
      ]) expect(portable).toContain(token);
      expect(portable).toContain(lifecycle);
      expect(portable).toContain(extraReceipt);
    }
    const crossPortable = portableChecks[0][0];
    const leafPortable = portableChecks[1][0];
    expect(crossPortable).toContain("Cross Chop's target-monbg setup is the one measured same-row palette");
    expect(crossPortable).not.toContain("leafBladeAtAge");
    expect(leafPortable).toContain("The target-monbg setup at age 144 is Leaf Blade's one measured");
    expect(leafPortable).toContain("currentPaletteSetup = age === 144");
    expect(leafPortable).not.toContain("crossChopAtAge");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    for (const token of [
      "The latch is per-MECHANISM",
      "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured",
      "AnimTask_LeafBlade",
      "task-owned position/creation RAM+2; animation cell/hFlip/blink and ordinary trail destruction RAM+1",
      "task-owned primary terminal destruction retains its RAM+2 display",
      "Leaf Blade short",
      "creation display is the positive amplitude at RAM+1, then the ordinary body is RAM+2",
      "Leaf Blade monbg",
      "BG-scroll target motion RAM+1, including terminal return",
      "script \`create_cross_impact_sprite\` during target monbg",
      "sprite and terminal destroy-callback display RAM+1",
    ]) expect(latches).toContain(token);
    expect(trackGoal).toContain("Cross Chop independently retains its own predecessor hardware OAM/matrix/palette transfer");
    expect(trackGoal).toContain("does not borrow Leaf Blade timing or latches");
    expect(trackGoal).toContain("does not transfer impact, slash, translation, shake, blend, BG, sprite, timing, or latch facts");
  });

  it("fulfills only the unchanged exact ten-component boundary at 242/276 and grants no transfer credit", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const inventory = JSON.parse(readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"));
    const level50Moves = new Set<string>(inventory.tiers.level50.moves
      .map((entry: { move: string }) => entry.move));
    expect(level50Moves.size).toBe(276);
    expect(coverage.entries).toHaveLength(258);
    expect(coverage.entries.filter((entry: { move: string; status: string }) =>
      level50Moves.has(entry.move) && entry.status === "exact",
    )).toHaveLength(258);
    expect(coverage.entries.filter((entry: { move: string; status: string }) =>
      level50Moves.has(entry.move) && (entry.status === "partial" || entry.status === "staged"),
    )).toEqual([]);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_CROSS_CHOP", "MOVE_LEAF_BLADE",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_CROSS_CHOP", status: "exact" }),
      expect.objectContaining({ move: "MOVE_LEAF_BLADE", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "cross-impact-cross-chop",
    )).toEqual([{
      id: "cross-impact-cross-chop",
      components: [
        "asset:ANIM_TAG_HANDS_AND_FEET",
        "asset:ANIM_TAG_CROSS_IMPACT",
        "sprite:gCrossChopHandSpriteTemplate",
        "task:AnimTask_ShakeMon",
        "visualCommand:complex_palette_blend",
        "visualCommand:create_cross_impact_sprite",
        "visualCommand:monbg",
        "visualCommand:setalpha",
        "visualCommand:clearmonbg",
        "visualCommand:blendoff",
      ],
      representatives: ["MOVE_CROSS_CHOP", "MOVE_LEAF_BLADE"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });
});
