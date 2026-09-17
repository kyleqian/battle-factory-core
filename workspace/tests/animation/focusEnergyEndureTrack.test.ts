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
  readonly soundStartAge: number;
  readonly soundPan: number;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: Side } };
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
  readonly move: "MOVE_FOCUS_ENERGY" | "MOVE_ENDURE";
  readonly schema: string;
  readonly orientation: string;
  readonly side: Side;
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly soundPan: number;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
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

const topology: Topology = {
  tasks: ["AnimTask_BlendColorCycleLoop", "AnimTask_ShakeMon2_Step"],
  templates: [
    "gEndureEnergySpriteTemplate", "gMultiuseSpriteTemplate",
    "gSpriteTemplate_EnemyShadow", "sHealthbarSpriteTemplates",
    "sHealthboxOpponentSpriteTemplates", "sHealthboxPlayerSpriteTemplates",
  ],
  callbacks: [
    "AnimEndureEnergy_Step", "SpriteCB_HealthBar", "SpriteCB_HealthBoxOther",
    "SpriteCB_SetInvisible", "SpriteCallbackDummy",
  ],
};

const trackGoal = "FULFILLED: This exact five-component boundary remains fulfilled only because MOVE_FOCUS_ENERGY and MOVE_ENDURE independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. MOVE_FOCUS_ENERGY independently owns its complete unthinned 122/122 Move_FOCUS_ENERGY 0x082d36cf..Move_BIDE 0x082d370f body from first source-active display through first inactive cleanup in both orientations: legal set-44 TAILLOW parties, ANIM_TAG_FOCUS_ENERGY, three literal EndureEffect calls / fifteen gEndureEnergySpriteTemplate lifecycles, white BlendColorCycle(2,2,0,11), attacker ShakeMon2(1,0,32,1), move-owned in-window offsets, OAM/matrix/palette/register/audio/immutable-state proofs, and receipts 949eb21875d5e28e302eaa93fe43227276b3aed3b041a03b6350aa81f9d80ae4/45e757153f886b06888d366d722e8d712e4bc13dac061ecd18534d8b487049c5 and 67990c21bf1701db9438607a2092418f936c4ab52733ba8b7e11a069b8782cc7/a0e387e67c4c0ff6330bf472d9a9d480d571c9259053f1350f068cffd40c9ad5. MOVE_ENDURE independently owns its distinct complete unthinned 122/122 Move_ENDURE 0x082cd687..Move_CHARM 0x082cd71b body from first source-active display through first inactive cleanup in both orientations: legal set-113 EEVEE parties, its own ANIM_TAG_FOCUS_ENERGY/EndureEffect/fifteen-sprite body, red BlendColorCycle(2,2,0,11), attacker ShakeMon2(1,0,32,1), own in-window offsets, OAM/matrix/palette/register/audio/immutable-state proofs, and receipts 5ffe4994c6309b84567bbc7042861001df3275b1f8b2c330e0fa7dc6b5030024/941937cba7a24982a921510a31582ae4fb2bc927ce18d04b9ddd1a61ecf9ce3a and 3fc347ae124e95c51bf7975169ac6a59c1734f1f5b111776cca088531726c1d2/19b16868e0184521c3514ebc73a47235400bc06a09a7f216a93b8d0e29972ffd. Shared source components are source-audited separately in both bodies: no blend, ShakeMon2, EndureEffect, sprite, affine/OAM, timing, or latch fact transfers between moves. MOVE_FOCUS_PUNCH is not a Focus Energy/Endure effect-track body: its independently exact FocusPunch fist/four-hitsplat/ShakeMon target-impact-BG body transfers no Focus Energy or Endure component, timing, palette, or latch fact.";

const receipts: readonly Receipt[] = [
  {
    fixturePath: "tools/compare/fixtures/focus-energy-player-taillow-opponent-onix.json",
    fixtureSha256: "2fd504cb8723042d4e522181b88b7dcd7fc48a94203ce46458ca0c50af7dad4f",
    scenarioPath: "tools/battle-lab/mechanic-focus-energy-player-taillow-opponent-onix.json",
    scenarioSha256: "bb6321f64fb1c0cc205a69514c9560f4ecde44c696ee87a98b1dba2eab8b609a",
    move: "MOVE_FOCUS_ENERGY", schema: "focus-energy-portable-evidence/v2",
    orientation: "player-back Taillow -> opponent-front Onix", side: "player",
    window: { startFrame: 73, endFrame: 194, frameCount: 122 },
    evidence: "949eb21875d5e28e302eaa93fe43227276b3aed3b041a03b6350aa81f9d80ae4",
    raw: "45e757153f886b06888d366d722e8d712e4bc13dac061ecd18534d8b487049c5",
    soundPan: -64, playerSetIds: [156, 149, 180], opponentSetIds: [135, 188, 184],
    attacker: { species: 304, nature: 21, item: 0, friendship: 0, gender: "male", move: 116 },
    target: { species: 95, nature: 2, item: 0, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/focus-energy-opponent-taillow-player-onix.json",
    fixtureSha256: "dc3dda08e1263c07c9e531d6fa32c4beefb31eae6a85f1b71f01320d3663e6b6",
    scenarioPath: "tools/battle-lab/mechanic-focus-energy-opponent-taillow-player-onix.json",
    scenarioSha256: "dc2b714f64ac150355b80cfa1ef91d33c02da7ce526a0e333cddc37d5c0cdef6",
    move: "MOVE_FOCUS_ENERGY", schema: "focus-energy-portable-evidence/v2",
    orientation: "opponent-front Taillow -> player-back Onix", side: "opponent",
    window: { startFrame: 77, endFrame: 198, frameCount: 122 },
    evidence: "67990c21bf1701db9438607a2092418f936c4ab52733ba8b7e11a069b8782cc7",
    raw: "a0e387e67c4c0ff6330bf472d9a9d480d571c9259053f1350f068cffd40c9ad5",
    soundPan: 63, playerSetIds: [135, 188, 184], opponentSetIds: [156, 149, 180],
    attacker: { species: 304, nature: 21, item: 0, friendship: 0, gender: "male", move: 116 },
    target: { species: 95, nature: 2, item: 0, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/endure-player-eevee-opponent-onix.json",
    fixtureSha256: "a4cc693181871682b604fd18fc789a06c50a2450761dfdd51125118ae18b0cc2",
    scenarioPath: "tools/battle-lab/mechanic-endure-player-eevee-opponent-onix.json",
    scenarioSha256: "b8f2116d21c0ac2ed5e94861d9084ef72ed64e4cbdf31672272de61dd17ed109",
    move: "MOVE_ENDURE", schema: "endure-portable-evidence/v2",
    orientation: "player-back Eevee -> opponent-front Onix", side: "player",
    window: { startFrame: 64, endFrame: 185, frameCount: 122 },
    evidence: "5ffe4994c6309b84567bbc7042861001df3275b1f8b2c330e0fa7dc6b5030024",
    raw: "941937cba7a24982a921510a31582ae4fb2bc927ce18d04b9ddd1a61ecf9ce3a",
    soundPan: -64, playerSetIds: [156, 149, 180], opponentSetIds: [135, 188, 184],
    attacker: { species: 133, nature: 6, item: 0, friendship: 0, gender: "male", move: 203 },
    target: { species: 95, nature: 2, item: 0, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/endure-opponent-eevee-player-onix.json",
    fixtureSha256: "752fef29ae1635c8c980e53fff311fbe4b590479d3551078707ec7f95ec09fcd",
    scenarioPath: "tools/battle-lab/mechanic-endure-opponent-eevee-player-onix.json",
    scenarioSha256: "a201c16a2a3231609277f5fddc443aedbdcc56306e47028aedf1b80b57393ff3",
    move: "MOVE_ENDURE", schema: "endure-portable-evidence/v2",
    orientation: "opponent-front Eevee -> player-back Onix", side: "opponent",
    window: { startFrame: 68, endFrame: 189, frameCount: 122 },
    evidence: "3fc347ae124e95c51bf7975169ac6a59c1734f1f5b111776cca088531726c1d2",
    raw: "19b16868e0184521c3514ebc73a47235400bc06a09a7f216a93b8d0e29972ffd",
    soundPan: 63, playerSetIds: [135, 188, 184], opponentSetIds: [156, 149, 180],
    attacker: { species: 133, nature: 6, item: 0, friendship: 0, gender: "male", move: 203 },
    target: { species: 95, nature: 2, item: 0, friendship: 0, gender: "male", moves: [33, 33, 33, 33] },
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

describe("focus-energy-endure standalone fulfilled component-track ratchet", () => {
  it("pins both independent source bodies, their authoritative boundaries, and every source token", () => {
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/focusEnergySourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "Focus Energy source audit: legal set 44/species 304/move 116; "
      + "3 EndureEffect calls × 5 FOCUS_ENERGY sprites; Dragon Rage attacker pan; "
      + "white BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1); "
      + "inactive cleanup\n",
    );
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/endureSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "Endure source audit: legal Level-50 set 113/species 133/move 203; "
      + "3 EndureEffect calls × 5 FOCUS_ENERGY sprites; Dragon Rage attacker pan; "
      + "red BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1); "
      + "inactive cleanup\n",
    );

    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect({
      Move_FOCUS_ENERGY: pointer(symbols, "Move_FOCUS_ENERGY"),
      Move_BIDE: pointer(symbols, "Move_BIDE"),
      Move_ENDURE: pointer(symbols, "Move_ENDURE"),
      EndureEffect: pointer(symbols, "EndureEffect"),
      Move_CHARM: pointer(symbols, "Move_CHARM"),
      gEndureEnergySpriteTemplate: pointer(symbols, "gEndureEnergySpriteTemplate"),
      AnimEndureEnergy: pointer(symbols, "AnimEndureEnergy"),
      AnimTask_BlendColorCycle: pointer(symbols, "AnimTask_BlendColorCycle"),
      AnimTask_ShakeMon2: pointer(symbols, "AnimTask_ShakeMon2"),
    }).toEqual({
      Move_FOCUS_ENERGY: "0x082d36cf", Move_BIDE: "0x082d370f",
      Move_ENDURE: "0x082cd687", EndureEffect: "0x082cd6c7",
      Move_CHARM: "0x082cd71b", gEndureEnergySpriteTemplate: "0x08592d8c",
      AnimEndureEnergy: "0x081020d8", AnimTask_BlendColorCycle: "0x08115a04",
      AnimTask_ShakeMon2: "0x080d52d0",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const focusEnergyBody = scripts.slice(
      scripts.indexOf("Move_FOCUS_ENERGY:"), scripts.indexOf("Move_BIDE:"),
    );
    const endureBody = scripts.slice(
      scripts.indexOf("Move_ENDURE:"), scripts.indexOf("Move_CHARM:"),
    );
    const endureEffect = scripts.slice(
      scripts.indexOf("EndureEffect:"), scripts.indexOf("Move_CHARM:"),
    );
    expect(createHash("sha256").update(focusEnergyBody).digest("hex"))
      .toBe("cc71d075b54779637e3d3af8577eebc09dc8e70b2fc3fa7139a9d5331f0e9b8d");
    expect(createHash("sha256").update(endureBody).digest("hex"))
      .toBe("26a2a66cdbdf7c00b78839802c993d4f725bf8da8be8638602c84cc37f87329c");
    expect(createHash("sha256").update(endureEffect).digest("hex"))
      .toBe("a9a7761b716e04aaefb5d5e8fcf318e9e02d739cb384b31c87859bf50476f99c");
    expect(focusEnergyBody).not.toBe(endureBody);

    const shared = [
      "loadspritegfx ANIM_TAG_FOCUS_ENERGY",
      "playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER",
      "call EndureEffect",
      "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 32, 1",
      "waitforvisualfinish",
      "end",
    ];
    for (const token of shared) {
      expect(focusEnergyBody).toContain(token);
      expect(endureBody).toContain(token);
    }
    expect((focusEnergyBody.match(/call EndureEffect/g) ?? [])).toHaveLength(3);
    expect((endureBody.match(/call EndureEffect/g) ?? [])).toHaveLength(3);
    expect(focusEnergyBody).toContain(
      "blend_color_cycle priority=2, selector=F_PAL_ATTACKER, delay=2, num_blends=2, initial_blend_y=0, target_blend_y=11, color=RGB_WHITE",
    );
    expect(endureBody).toContain(
      "blend_color_cycle priority=2, selector=F_PAL_ATTACKER, delay=2, num_blends=2, initial_blend_y=0, target_blend_y=11, color=RGB_RED",
    );
    expect(focusEnergyBody).not.toContain("color=RGB_RED");
    expect(endureBody).not.toContain("color=RGB_WHITE");
    expect((endureEffect.match(/createsprite gEndureEnergySpriteTemplate/g) ?? []))
      .toHaveLength(5);
    for (const token of [
      "gEndureEnergySpriteTemplate, ANIM_ATTACKER, 2, 0, -24, 26, 2",
      "gEndureEnergySpriteTemplate, ANIM_ATTACKER, 2, 0, 14, 28, 1",
      "gEndureEnergySpriteTemplate, ANIM_ATTACKER, 2, 0, -5, 10, 2",
      "gEndureEnergySpriteTemplate, ANIM_ATTACKER, 2, 0, 28, 26, 3",
      "gEndureEnergySpriteTemplate, ANIM_ATTACKER, 2, 0, -12, 0, 1",
      "return",
    ]) expect(endureEffect).toContain(token);
  });

  it("pins all four untouched bilateral semantic/raw-RGB receipts and every unthinned row", () => {
    const actual = receipts.map((expected) => {
      const stored = fixture(expected.fixturePath);
      return [
        digest(expected.fixturePath), digest(expected.scenarioPath), stored.schema,
        stored.orientation, stored.scenario, stored.sourceWindow,
        stored.evidenceSha256, stored.rawRgbSha256, stored.soundStartAge,
        stored.soundPan, stored.topology,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.fixtureSha256, expected.scenarioSha256, expected.schema,
      expected.orientation, expected.scenarioPath, expected.window,
      expected.evidence, expected.raw, 4, expected.soundPan, topology,
    ]));
    for (const expected of receipts) {
      const stored = fixture(expected.fixturePath);
      expect(stored.sourceWindow.endFrame - stored.sourceWindow.startFrame + 1)
        .toBe(expected.window.frameCount);
    }
    expect(receipts.filter((entry) => entry.move === "MOVE_FOCUS_ENERGY")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(244);
    expect(receipts.filter((entry) => entry.move === "MOVE_ENDURE")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(244);
    expect(receipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(488);
  });

  it("keeps each retained fixture an untouched legal three-Pokemon party-only Scene-ON scenario", () => {
    for (const expected of receipts) {
      const stored = fixture(expected.fixturePath);
      const staged = scenario(expected.scenarioPath);
      expect(stored).toMatchObject({
        schema: expected.schema, orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: expected.move === "MOVE_FOCUS_ENERGY"
          ? "tools/compare/focusEnergyProbe.py"
          : "tools/compare/endureProbe.py",
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence, rawRgbSha256: expected.raw,
        soundStartAge: 4, soundPan: expected.soundPan, topology,
        attacker: {
          species: expected.move === "MOVE_FOCUS_ENERGY" ? "TAILLOW" : "EEVEE",
          geometry: { side: expected.side },
        },
        target: {
          species: "ONIX",
          geometry: { side: expected.side === "player" ? "opponent" : "player" },
        },
      });
      expect(staged).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: 0, battleNum: 0, trainerId: 50, seed: 305419896,
        playerSetIds: expected.playerSetIds, opponentSetIds: expected.opponentSetIds,
      });
      expect(Object.keys(staged.overrides)).toEqual(["parties"]);
      expect(Object.keys(staged.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteParty(staged.overrides.parties.player);
      expectCompleteParty(staged.overrides.parties.opponent);
      expect(Object.keys(staged.trace).sort()).toEqual(["captureFrames", "segments"]);
      expect(staged.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: 500, buttons: [] },
      ]);
      expect(staged.trace.captureFrames).toEqual([0, 534]);

      const attacker = staged.overrides.parties[expected.side][0]!;
      const target = staged.overrides.parties[
        expected.side === "player" ? "opponent" : "player"
      ][0]!;
      expect(attacker).toMatchObject({
        species: expected.attacker.species, level: 50, nature: expected.attacker.nature,
        item: expected.attacker.item, friendship: expected.attacker.friendship,
        gender: expected.attacker.gender, abilitySlot: 0, shiny: false,
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attacker.move));
      expect(target).toMatchObject({
        species: expected.target.species, level: 50, nature: expected.target.nature,
        item: expected.target.item, friendship: expected.target.friendship,
        gender: expected.target.gender, abilitySlot: 0, shiny: false,
      });
      expect(target.moves).toEqual(expected.target.moves);
    }
  });

  it("keeps independent source offsets, lifecycle/topology, and twice-fresh portable obligations load-bearing", () => {
    const focusEnergy = readFileSync("src/animation/focusEnergy.ts", "utf8");
    const endure = readFileSync("src/animation/endure.ts", "utf8");
    for (const token of [
      "function scriptOffsetAtAge(", "attackerPaletteTarget: \"white\"",
      "const paletteTaskActive = age >= 38 && age <= 96;",
      "const shakeTaskActive = age >= 38 && age <= 99;",
      "attackerShakeDisplayAge: age - 2", "attackerDisplayX2: age === 39",
      "Pure source-relative port of Move_FOCUS_ENERGY's complete 122-display",
    ]) expect(focusEnergy).toContain(token);
    for (const token of [
      "function endureScriptOffsetAtAge(", "attackerPaletteTarget: \"red\"",
      "| 0 | 3 | 14 | 57 | 62 | 63 | 81 | 98 | 115 | 132;",
      "Pure source-relative port of Move_ENDURE's complete 122-display",
    ]) expect(endure).toContain(token);

    const portableChecks = [
      [readFileSync("tools/compare/focusEnergyPortable.ts", "utf8"), "focusEnergyAtAge", "sceneOnFocusEnergyView", "white"],
      [readFileSync("tools/compare/endurePortable.ts", "utf8"), "endureAtAge", "sceneOnEndureView", "red"],
    ] as const;
    for (const [portable, reducer, seam, palette] of portableChecks) {
      for (const token of [
        "createScratchDir", "tools/run-mgba-probe.py", "compactSemanticReceiptSha256",
        reducer, seam, "same(probe.sourceWindow, fixture.sourceWindow)",
        "same(probe.topology, fixture.topology)", "evidence !== fixture.evidenceSha256",
        "rawDigest !== fixture.rawRgbSha256", "probe.lifecycleCounts.endureEnergy !== 15",
        "gAnimScriptActive", "visualTaskCount", "softwareOam", "hardwareOam",
        "hardwareMatrices", "fadedPalette", "unfadedPalette", "hardwarePalette",
        "paletteTags", "registers", "actual.se1", "actual.se2",
        "same(actual.hardwareOam", "same(actual.hardwareMatrices",
        "same(actual.hardwarePalette", "same(actual.battlers",
        "const app = render(engine)", "240 * 160", "fresh proof diverged",
        "framebuffer \x24{framebuffers}/\x24{fixture.sourceWindow.frameCount}",
      ]) expect(portable).toContain(token);
      expect(portable).toContain("seam.attackerPaletteTarget === \"" + palette + "\"");
      expect(portable).toContain("for (let repeat = 0; repeat < 2; repeat += 1)");
    }

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured");
    expect(trackGoal).toContain("no blend, ShakeMon2, EndureEffect, sprite, affine/OAM, timing, or latch fact transfers");
  });

  it("fulfills only the exact five-component track at the updated 242/276 acceptance and keeps Focus Punch outside it", () => {
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
      "MOVE_FOCUS_ENERGY", "MOVE_ENDURE",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_ENDURE", status: "exact" }),
      expect.objectContaining({ move: "MOVE_FOCUS_ENERGY", status: "exact" }),
    ]);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_FOCUS_PUNCH"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "focus-energy-endure-effect",
    )).toEqual([{
      id: "focus-energy-endure-effect",
      components: [
        "asset:ANIM_TAG_FOCUS_ENERGY",
        "subroutine:EndureEffect",
        "sprite:gEndureEnergySpriteTemplate",
        "visualCommand:blend_color_cycle",
        "task:AnimTask_ShakeMon2",
      ],
      representatives: ["MOVE_FOCUS_ENERGY", "MOVE_ENDURE"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });
});
