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

type Window = {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameCount: number;
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile?: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly appStage?: { readonly presentationAge: number };
  readonly attacker: {
    readonly species: string;
    readonly geometry: { readonly side: Side };
  };
  readonly target: {
    readonly species: string;
    readonly geometry: { readonly side: Side };
  };
  readonly sourceWindow: Window;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly lifecycleCounts?: Readonly<Record<string, number>>;
  readonly status?: string;
  readonly acceptance?: Readonly<Record<string, boolean>>;
  readonly topology?: Readonly<Record<string, readonly string[]>>;
};

type Receipt = {
  readonly fixturePath: string;
  readonly fixtureSha256: string;
  readonly scenarioPath: string;
  readonly scenarioSha256: string;
  readonly move: "MOVE_NEEDLE_ARM" | "MOVE_SECRET_POWER";
  readonly schema: string;
  readonly orientation: string;
  readonly side: Side;
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly tailFrames: number;
  readonly terminalCapture: number;
  readonly attacker: {
    readonly species: number;
    readonly nature: number;
    readonly item: number;
    readonly move: number;
    readonly friendship: number;
  };
  readonly target: {
    readonly friendship: number;
  };
};

const trackGoal = "FULFILLED: This exact 5-component boundary remains fulfilled only because MOVE_NEEDLE_ARM and Factory indoor MOVE_SECRET_POWER independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. Needle Arm independently owns its complete unthinned 108/108 Move_NEEDLE_ARM 0x082ce92f..0x082ceadf body from first source-active frame through first inactive cleanup in both orientations, using legal challenge-0 set-125 CACNEA parties, 20 gNeedleArmSpikeSpriteTemplate lives, GREEN_SPIKE/IMPACT/HANDS_AND_FEET resources, target ShakeMon2, and move-owned source/hardware OAM/matrix/palette/register/audio/immutable-state receipts, retaining f6f26ca98a0aea08c1bd5c9fef4553443c93c260d829ed0609c41ef26935d10c/bbb4ea8404fbde111de1c1dfe91d45d47033b2f0522754695d4d7ed5f21db0f6 and 75a2df84d96ea99f2cb2b584a67a338d419c565a14c7bc726f7bf7a8aaf20470/291b07d72166df08330fd95741f84ea0d14918c57602114968143ca9bd48d1e1. Factory MOVE_SECRET_POWER independently owns its sole BATTLE_ENVIRONMENT_BUILDING -> Move_STRENGTH 0x082c9862..0x082c98f6 first-active through first-inactive 102/102 body in both orientations, including IMPACT, ShakeAndSinkMon, return slide, side-respecting ellipse, three hitsplats, final ShakeMon2, monbg/alpha/audio, and move-owned source/hardware OAM/matrix/palette/register/audio/immutable-state receipts, retaining 9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3/af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903 and 8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172/f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a. Secret Power's grass-only dispatch to Move_NEEDLE_ARM is unreachable in Factory and gives MOVE_SECRET_POWER no GREEN_SPIKE or ShakeMon2 component/latch credit; no shared component, latch, or timing transfers between the moves.";

const receipts: readonly Receipt[] = [
  {
    fixturePath: "tools/compare/fixtures/needle-arm-player-cacnea-opponent-onix.json",
    fixtureSha256: "68509d0bc4bd71cad7f3d0e4d66c19678edc78ca4c45b5ca1f7715baa40bad08",
    scenarioPath: "tools/battle-lab/mechanic-needle-arm-player-cacnea-opponent-onix.json",
    scenarioSha256: "a97ed19243a6c91ec2a1eb521ac4aa18f2af8b55139ed10563b933d988a4abf1",
    move: "MOVE_NEEDLE_ARM", schema: "needle-arm-portable-evidence/v1",
    orientation: "player-back Cacnea -> opponent-front Onix", side: "player",
    window: { startFrame: 223, endFrame: 330, frameCount: 108 },
    evidence: "f6f26ca98a0aea08c1bd5c9fef4553443c93c260d829ed0609c41ef26935d10c",
    raw: "bbb4ea8404fbde111de1c1dfe91d45d47033b2f0522754695d4d7ed5f21db0f6",
    playerSetIds: [125, 185, 188], opponentSetIds: [156, 157, 158],
    tailFrames: 500, terminalCapture: 534,
    attacker: { species: 344, nature: 24, item: 142, move: 302, friendship: 0 },
    target: { friendship: 0 },
  },
  {
    fixturePath: "tools/compare/fixtures/needle-arm-opponent-cacnea-player-onix.json",
    fixtureSha256: "455924b0076e915eda3c59049593041c73661d7218a99834da2ef16a2764c7f5",
    scenarioPath: "tools/battle-lab/mechanic-needle-arm-opponent-cacnea-player-onix.json",
    scenarioSha256: "feffd8afd5c02586de43ce17ee6ff94f0c31540df3c0f515f859f00668be51a8",
    move: "MOVE_NEEDLE_ARM", schema: "needle-arm-portable-evidence/v1",
    orientation: "opponent-front Cacnea -> player-back Onix", side: "opponent",
    window: { startFrame: 223, endFrame: 330, frameCount: 108 },
    evidence: "75a2df84d96ea99f2cb2b584a67a338d419c565a14c7bc726f7bf7a8aaf20470",
    raw: "291b07d72166df08330fd95741f84ea0d14918c57602114968143ca9bd48d1e1",
    playerSetIds: [156, 157, 158], opponentSetIds: [125, 185, 188],
    tailFrames: 500, terminalCapture: 534,
    attacker: { species: 344, nature: 24, item: 142, move: 302, friendship: 0 },
    target: { friendship: 0 },
  },
  {
    fixturePath: "tools/compare/fixtures/secret-power-strength-player-teddiursa-opponent-onix.json",
    fixtureSha256: "dbef17560a3d27f9613327f5a192ecc3ea9dfe0fa9453489457adff0dc404f84",
    scenarioPath: "tools/battle-lab/mechanic-secret-power-player-teddiursa-opponent-onix.json",
    scenarioSha256: "5e27e1eb75e376e57d88ac8769ff28fa32ba8b7102a884a5865245e7142d4dda",
    move: "MOVE_SECRET_POWER", schema: "secret-power-strength-portable-evidence/v1",
    orientation: "player-back Teddiursa -> opponent-front Onix", side: "player",
    window: { startFrame: 222, endFrame: 323, frameCount: 102 },
    evidence: "9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3",
    raw: "af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903",
    playerSetIds: [117, 185, 188], opponentSetIds: [156, 157, 158],
    tailFrames: 700, terminalCapture: 734,
    attacker: { species: 216, nature: 7, item: 134, move: 290, friendship: 70 },
    target: { friendship: 70 },
  },
  {
    fixturePath: "tools/compare/fixtures/secret-power-strength-opponent-teddiursa-player-onix.json",
    fixtureSha256: "139cfef38498fbe7aff791738c05ad31cc0a23642ec415ab77f03f9ed8dd074f",
    scenarioPath: "tools/battle-lab/mechanic-secret-power-opponent-teddiursa-player-onix.json",
    scenarioSha256: "28cd3c73e0d0a67254951d38093bef22b162015934bcd060fde19da43a78e694",
    move: "MOVE_SECRET_POWER", schema: "secret-power-strength-portable-evidence/v1",
    orientation: "opponent-front Teddiursa -> player-back Onix", side: "opponent",
    window: { startFrame: 222, endFrame: 323, frameCount: 102 },
    evidence: "8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172",
    raw: "f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a",
    playerSetIds: [156, 157, 158], opponentSetIds: [117, 185, 188],
    tailFrames: 700, terminalCapture: 734,
    attacker: { species: 216, nature: 7, item: 134, move: 290, friendship: 70 },
    target: { friendship: 70 },
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

function sourceAudit(path: string): Record<string, unknown> {
  return JSON.parse(execFileSync(process.execPath, [
    "--experimental-strip-types", path,
  ], { encoding: "utf8" })) as Record<string, unknown>;
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

describe("green-spike-needle-arm standalone fulfilled component-track ratchet", () => {
  it("pins both distinct source/dispatch bodies and their authoritative pointers", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/needleArmSourceAudit.ts"], { encoding: "utf8" })).toBe(
      "lowest Level-50 carrier set 125/FRONTIER_MON_CACNEA -> "
        + "SPECIES_CACNEA 344/move 302/SITRUS_BERRY/ATTACK+HP/QUIRKY; "
        + "20 gNeedleArmSpikeSpriteTemplate lifecycles; Factory Secret Power "
        + "dispatches to Strength, not Needle Arm\n",
    );

    const secretPower = sourceAudit("tools/compare/secretPowerSourceAudit.ts");
    expect(secretPower).toMatchObject({
      move: "MOVE_SECRET_POWER", moveId: 290,
      carrier: {
        setId: 117, set: "FRONTIER_MON_TEDDIURSA", species: "SPECIES_TEDDIURSA",
        legalRange: [110, 199], challengeNum: 0,
      },
      factory: {
        mapType: "MAP_TYPE_INDOOR", environment: "BATTLE_ENVIRONMENT_BUILDING",
        environmentValue: 8, reachableBodies: ["Move_STRENGTH"],
      },
      factoryBody: {
        label: "Move_STRENGTH",
        components: [
          "ANIM_TAG_IMPACT", "AnimTask_ShakeAndSinkMon",
          "gSlideMonToOriginalPosSpriteTemplate",
          "AnimTask_TranslateMonEllipticalRespectSide",
          "three gBasicHitSplatSpriteTemplate animation-1 lifecycles",
          "AnimTask_ShakeMon2", "ANIM_DEF_PARTNER monbg", "12:8 alpha",
          "SE_M_TAKE_DOWN", "three SE_M_MEGA_KICK2", "cleanup",
        ],
      },
    });
    expect(secretPower.visualDispatch).toEqual({
      BATTLE_ENVIRONMENT_GRASS: { value: 0, body: "Move_NEEDLE_ARM" },
      BATTLE_ENVIRONMENT_LONG_GRASS: { value: 1, body: "Move_MAGICAL_LEAF" },
      BATTLE_ENVIRONMENT_SAND: { value: 2, body: "Move_MUD_SHOT" },
      BATTLE_ENVIRONMENT_UNDERWATER: { value: 3, body: "Move_WATERFALL" },
      BATTLE_ENVIRONMENT_WATER: { value: 4, body: "Move_SURF" },
      BATTLE_ENVIRONMENT_POND: { value: 5, body: "Move_BUBBLE_BEAM" },
      BATTLE_ENVIRONMENT_MOUNTAIN: { value: 6, body: "Move_ROCK_THROW" },
      BATTLE_ENVIRONMENT_CAVE: { value: 7, body: "Move_BITE" },
      BATTLE_ENVIRONMENT_BUILDING: { value: 8, body: "Move_STRENGTH" },
      BATTLE_ENVIRONMENT_PLAIN: { value: 9, body: "Move_SLAM" },
    });
    expect(secretPower.verdict).toBe(
      "Factory dispatch exact: Factory reaches sole body, Move_STRENGTH; "
        + "grass-only Move_NEEDLE_ARM is unreachable and receives no Factory "
        + "GREEN_SPIKE credit",
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
      Move_NEEDLE_ARM: pointer("Move_NEEDLE_ARM"),
      Move_SLACK_OFF: pointer("Move_SLACK_OFF"),
      Move_SECRET_POWER: pointer("Move_SECRET_POWER"),
      Move_TWISTER: pointer("Move_TWISTER"),
      Move_STRENGTH: pointer("Move_STRENGTH"),
      Move_TACKLE: pointer("Move_TACKLE"),
      gNeedleArmSpikeSpriteTemplate: pointer("gNeedleArmSpikeSpriteTemplate"),
      AnimTask_ShakeMon2: pointer("AnimTask_ShakeMon2"),
    }).toEqual({
      Move_NEEDLE_ARM: "0x082ce92f", Move_SLACK_OFF: "0x082ceadf",
      Move_SECRET_POWER: "0x082d6fd0", Move_TWISTER: "0x082d7024",
      Move_STRENGTH: "0x082c9862", Move_TACKLE: "0x082c98f6",
      gNeedleArmSpikeSpriteTemplate: "0x08592888", AnimTask_ShakeMon2: "0x080d52d0",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const needleArmBody = scripts.slice(
      scripts.indexOf("Move_NEEDLE_ARM:"), scripts.indexOf("Move_SLACK_OFF:"),
    );
    for (const token of [
      "loadspritegfx ANIM_TAG_GREEN_SPIKE", "loadspritegfx ANIM_TAG_IMPACT",
      "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
      "loopsewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 2, 16",
      "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 18, 1",
      "create_basic_hitsplat_sprite ANIM_TARGET, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
      "create_fist_sprite ANIM_TARGET, 4, x=0, y=0, duration=8",
      "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
    ]) expect(needleArmBody).toContain(token);
    expect(needleArmBody.match(/gNeedleArmSpikeSpriteTemplate/g)).toHaveLength(20);
    expect(needleArmBody).not.toContain("Move_STRENGTH");

    const strengthBody = scripts.slice(
      scripts.indexOf("Move_STRENGTH:"), scripts.indexOf("Move_TACKLE:"),
    );
    for (const token of [
      "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
      "AnimTask_ShakeAndSinkMon, 5, ANIM_ATTACKER, 2, 0, 96, 30",
      "gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 4",
      "AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_TARGET, 18, 6, 2, 4",
      "create_basic_hitsplat_sprite ANIM_ATTACKER, 3, x=16, y=12, relative_to=ANIM_TARGET, animation=1",
      "create_basic_hitsplat_sprite ANIM_ATTACKER, 3, x=-16, y=-12, relative_to=ANIM_TARGET, animation=1",
      "create_basic_hitsplat_sprite ANIM_ATTACKER, 3, x=3, y=4, relative_to=ANIM_TARGET, animation=1",
      "AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "clearmonbg ANIM_DEF_PARTNER", "blendoff",
    ]) expect(strengthBody).toContain(token);
    expect(strengthBody).not.toContain("ANIM_TAG_GREEN_SPIKE");
    expect(strengthBody).not.toContain("gNeedleArmSpikeSpriteTemplate");
  });

  it("pins all four complete unthinned semantic/raw-RGB receipts", () => {
    const actual = receipts.map((expected) => {
      const stored = fixture(expected.fixturePath);
      return [
        stored.schema, stored.oracleProfile ?? "battle-scene-on", stored.orientation,
        stored.scenario, stored.sourceWindow, stored.evidenceSha256, stored.rawRgbSha256,
      ];
    });
    expect(actual).toEqual(receipts.map((expected) => [
      expected.schema, "battle-scene-on", expected.orientation, expected.scenarioPath,
      expected.window, expected.evidence, expected.raw,
    ]));
    for (const expected of receipts) {
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(expected.window.endFrame - expected.window.startFrame + 1)
        .toBe(expected.window.frameCount);
    }
    expect(receipts.filter((entry) => entry.move === "MOVE_NEEDLE_ARM")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(216);
    expect(receipts.filter((entry) => entry.move === "MOVE_SECRET_POWER")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(204);
    expect(receipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(420);
  });

  it("keeps every retained fixture a complete legal bilateral three-Pokemon Scene-ON scenario", () => {
    for (const expected of receipts) {
      const stored = fixture(expected.fixturePath);
      const staged = scenario(expected.scenarioPath);
      expect(stored).toMatchObject({
        schema: expected.schema, orientation: expected.orientation,
        scenario: expected.scenarioPath,
        probe: expected.move === "MOVE_NEEDLE_ARM"
          ? "tools/compare/needleArmProbe.py"
          : "tools/compare/bodySlamProbe.py",
        sourceWindow: expected.window,
        evidenceSha256: expected.evidence, rawRgbSha256: expected.raw,
        attacker: {
          species: expected.move === "MOVE_NEEDLE_ARM" ? "CACNEA" : "TEDDIURSA",
          geometry: { side: expected.side },
        },
        target: {
          species: "ONIX",
          geometry: { side: expected.side === "player" ? "opponent" : "player" },
        },
      });
      if (expected.move === "MOVE_NEEDLE_ARM") {
        expect(stored).toMatchObject({
          appStage: { presentationAge: 0 },
          lifecycleCounts: { gNeedleArmSpikeSpriteTemplate: 20 },
        });
      } else {
        expect(stored).toMatchObject({
          oracleProfile: "battle-scene-on", status: "exact",
          acceptance: {
            reducerPinned: true, typedSeam: true,
            productionFramebuffer: true, exact: true,
          },
          topology: {
            tasks: [
              "AnimTask_ShakeAndSinkMon_Step",
              "AnimTask_TranslateMonElliptical_Step",
              "AnimTask_ShakeMon2_Step",
            ],
            templates: [
              "gSlideMonToOriginalPosSpriteTemplate",
              "gBasicHitSplatSpriteTemplate",
            ],
            audio: ["SE_M_TAKE_DOWN", "SE_M_MEGA_KICK2"],
          },
        });
      }

      expect(staged).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: 0, battleNum: 0, trainerId: 50, seed: 305419897,
        playerSetIds: expected.playerSetIds, opponentSetIds: expected.opponentSetIds,
      });
      expect(Object.keys(staged.overrides)).toEqual(["parties"]);
      expect(Object.keys(staged.trace)).toEqual(["segments", "captureFrames"]);
      expectCompleteParty(staged.overrides.parties.player);
      expectCompleteParty(staged.overrides.parties.opponent);
      expect(staged.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: expected.tailFrames, buttons: [] },
      ]);
      expect(staged.trace.captureFrames).toEqual([0, expected.terminalCapture]);

      const attacker = staged.overrides.parties[expected.side][0]!;
      const target = staged.overrides.parties[expected.side === "player" ? "opponent" : "player"][0]!;
      expect(attacker).toMatchObject({
        species: expected.attacker.species, nature: expected.attacker.nature,
        item: expected.attacker.item, friendship: expected.attacker.friendship,
        abilitySlot: 0, gender: "male", shiny: false,
      });
      expect(attacker.moves).toEqual(Array(4).fill(expected.attacker.move));
      expect(target).toMatchObject({
        species: 95, nature: 0, item: 142, friendship: expected.target.friendship,
        abilitySlot: 0, gender: "male", shiny: false,
      });
      expect(target.moves).toEqual([33, 33, 33, 33]);
    }
  });

  it("fulfills only the exact five-component track at the unchanged 238/276 acceptance", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const inventory = JSON.parse(readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"));
    expect(inventory.tiers.level50.moves).toHaveLength(276);
    expect(coverage.entries).toHaveLength(238);
    expect(inventory.tiers.level50.moves.length - coverage.entries.length).toBe(39);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(238);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "partial"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "staged"))
      .toHaveLength(0);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_NEEDLE_ARM", "MOVE_SECRET_POWER",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_NEEDLE_ARM", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SECRET_POWER", status: "exact" }),
    ]);
    const needleArm = coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_NEEDLE_ARM",
    );
    const secretPower = coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_SECRET_POWER",
    );
    expect(needleArm.covered.join("\n")).toContain("all twenty gNeedleArmSpikeSpriteTemplate");
    expect(needleArm.covered.join("\n")).toContain("no GREEN_SPIKE credit");
    expect(secretPower.covered.join("\n")).toContain("Move_STRENGTH");
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "green-spike-needle-arm",
    )).toEqual([{
      id: "green-spike-needle-arm",
      components: [
        "asset:ANIM_TAG_GREEN_SPIKE",
        "sprite:gNeedleArmSpikeSpriteTemplate",
        "task:AnimTask_ShakeMon2",
        "asset:ANIM_TAG_IMPACT",
        "asset:ANIM_TAG_HANDS_AND_FEET",
      ],
      representatives: ["MOVE_NEEDLE_ARM", "MOVE_SECRET_POWER"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });

  it("keeps both move-owned portable verifier obligations and non-transferable latch scope load-bearing", () => {
    const needleArmPortable = readFileSync("tools/compare/needleArmPortable.ts", "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "compactSemanticReceiptSha256",
      "needleArmAtAge", "sceneOnNeedleArmView", "sourceTaskMatch", "audioMatch",
      "hardwareTransfer", "hardwareMatrices", "immutableState", "Task_LoopAndPlaySE",
      "AnimTask_ShakeMon2_Step", "HORN_ATTACK_HEADER", "VITAL_THROW2_HEADER",
      "softwareOam", "hardwareOam", "fadedPalette", "hardwarePalette", "battlers",
      "diff !== 0", "fresh proof diverged", "NEEDLE_ARM_FRAME_COUNT",
    ]) expect(needleArmPortable).toContain(token);

    const strengthPortable = readFileSync("tools/compare/secretPowerStrengthEvidence.ts", "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "semanticReceiptSha256",
      "strengthAtAge", "sceneOnSecretPowerView", "oamWords", "hardwareTransfer",
      "paletteTransfer", "hardwareMatrices", "immutableState", "softwareOam",
      "hardwareOam", "fadedPalette", "hardwarePalette", "actual.se1", "actual.se2",
      "AnimTask_ShakeAndSinkMon_Step", "AnimTask_TranslateMonElliptical_Step",
      "AnimTask_ShakeMon2_Step", "framebuffer.count === 0", "rawRgbSha256",
    ]) expect(strengthPortable).toContain(token);

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured: visible events display ONE");
    expect(latches).toContain("`AnimTask_ShakeMon2` (usual longer schedules) | RAM+2");
    expect(latches).not.toContain("Needle Arm `AnimTask_ShakeMon2`");
    expect(latches).not.toContain("Secret Power Strength `AnimTask_ShakeMon2`");
    expect(trackGoal).toContain("no GREEN_SPIKE or ShakeMon2 component/latch credit");
    expect(trackGoal).toContain("no shared component, latch, or timing transfers");
  });
});
