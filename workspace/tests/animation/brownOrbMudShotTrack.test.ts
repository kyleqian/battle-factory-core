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

type StrengthTopology = {
  readonly tasks: readonly string[];
  readonly templates: readonly string[];
  readonly audio: readonly string[];
};

type Fixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: Window;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly topology?: StrengthTopology;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: Side } };
  readonly status?: string | null;
  readonly acceptance?: Readonly<Record<string, boolean>> | null;
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
  readonly move: "MOVE_MUD_SHOT" | "MOVE_SECRET_POWER";
  readonly schema: string;
  readonly orientation: string;
  readonly side: Side;
  readonly window: Window;
  readonly evidence: string;
  readonly raw: string;
  readonly topology?: StrengthTopology;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly seed: number;
  readonly idleFrames: number;
  readonly captureFrame: number;
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

const strengthTopology: StrengthTopology = {
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
};

const trackGoal = "FULFILLED: This exact nine-component boundary remains fulfilled only because MOVE_MUD_SHOT and Factory indoor MOVE_SECRET_POWER -> Move_STRENGTH independently retain source-derived reducers, typed seams, production compositors, complete legal bilateral Battle Scene ON fixtures, and twice-fresh zero-residual semantic/raw-RGB/actual-core framebuffer receipts. MOVE_MUD_SHOT independently owns its complete unthinned BROWN_ORB body from first source-active display through first inactive cleanup: legal set-111 KRABBY/ONIX player-back 145/145 frames 212..356 and opponent-front 144/144 frames 302..445, 11 MudShotOrbs calls / 22 gMudShotOrbSpriteTemplate lifecycles, StartSinAnimTimer, attacker and target ShakeMon, target monbg/split priority/12:8 alpha, WHIRLPOOL pan sweep, resources/registers/audio/immutable-state proofs, and receipts cef2f4555ed31b7a945d3a04878d2b4e7364fd03fae4b017146a4c58763034c6/a9dcc157dbb3018a70deae84a0522bb650074ba451c5c038c2e47b347dbc0b3f and 85fe40b0e1f3dbc600ed00740f3a8b9a1fa910cc589a27462dabbffd1c901840/52bd4b4b7e590260e7dc06e8ee1726ca690534f7382f28afa3f177ad3549a443. Mud Shot independently retains whole predecessor hardware OAM and matrices on every comparable row and predecessor palette except its source-age-4 same-row Task_UpdateMonBg setup; it borrows no Strength task timing or latch. MOVE_SECRET_POWER independently owns Factory BATTLE_ENVIRONMENT_BUILDING -> Move_STRENGTH's distinct complete unthinned 102/102 player-back and 102/102 opponent-front TEDDIURSA/ONIX body at 222..323 through first inactive cleanup, including its own IMPACT, ShakeAndSinkMon, return slide, side-respecting ellipse, three hitsplats, final ShakeMon2, monbg/alpha, audio, hardware/compositor checks, and receipts 9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3/af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903 and 8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172/f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a. Factory indoor BATTLE_ENVIRONMENT_BUILDING reaches Move_STRENGTH only; Move_MUD_SHOT is the unreachable SAND dispatch and grants Secret Power no BROWN_ORB, projectile, sinus-timer, ShakeMon, Mud Shot impact, monbg, timing, environment, or latch credit. Shared components do not waive either independent move acceptance or transfer any sibling fact.";

const receipts: readonly Receipt[] = [
  {
    fixturePath: "tools/compare/fixtures/mud-shot-player-krabby-opponent-onix.json",
    fixtureSha256: "47e30fab707f86e649700539a52193b002c2876c62cd063b770fddb95f7b48b8",
    scenarioPath: "tools/battle-lab/mechanic-mud-shot-player-krabby-opponent-onix.json",
    scenarioSha256: "8fd06e7a06a94198ec97c1c7de65443c715906b8815061617b25fb7035e68dc3",
    move: "MOVE_MUD_SHOT", schema: "mud-shot-portable-evidence/v1",
    orientation: "player-back", side: "player",
    window: { startFrame: 212, endFrame: 356, frameCount: 145 },
    evidence: "cef2f4555ed31b7a945d3a04878d2b4e7364fd03fae4b017146a4c58763034c6",
    raw: "a9dcc157dbb3018a70deae84a0522bb650074ba451c5c038c2e47b347dbc0b3f",
    playerSetIds: [156, 149, 180], opponentSetIds: [184, 188, 135],
    seed: 305419897, idleFrames: 400, captureFrame: 434,
    attacker: { species: 98, nature: 0, item: 230, friendship: 70, gender: "male", move: 341 },
    target: { species: 95, nature: 0, item: 0, friendship: 70, gender: "male", moves: [33, 33, 33, 33] },
  },
  {
    fixturePath: "tools/compare/fixtures/mud-shot-opponent-krabby-player-onix.json",
    fixtureSha256: "02468e261d78f2ea71f5579e9e30a6eaced659468983d5880d61bd06994f623c",
    scenarioPath: "tools/battle-lab/mechanic-mud-shot-opponent-krabby-player-onix.json",
    scenarioSha256: "489884c508cda77b9e8e6384fd6195f9ab500bc05f2765e17c6ede7e6239efff",
    move: "MOVE_MUD_SHOT", schema: "mud-shot-portable-evidence/v1",
    orientation: "opponent-front", side: "opponent",
    window: { startFrame: 302, endFrame: 445, frameCount: 144 },
    evidence: "85fe40b0e1f3dbc600ed00740f3a8b9a1fa910cc589a27462dabbffd1c901840",
    raw: "52bd4b4b7e590260e7dc06e8ee1726ca690534f7382f28afa3f177ad3549a443",
    playerSetIds: [184, 188, 135], opponentSetIds: [156, 149, 180],
    seed: 12, idleFrames: 700, captureFrame: 734,
    attacker: { species: 98, nature: 0, item: 230, friendship: 70, gender: "male", move: 341 },
    target: { species: 95, nature: 0, item: 0, friendship: 70, gender: "male", moves: [33, 33, 33, 33] },
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
    topology: strengthTopology,
    playerSetIds: [117, 185, 188], opponentSetIds: [156, 157, 158],
    seed: 305419897, idleFrames: 700, captureFrame: 734,
    attacker: { species: 216, nature: 7, item: 134, friendship: 70, gender: "male", move: 290 },
    target: { species: 95, nature: 0, item: 142, friendship: 70, gender: "male", moves: [33, 33, 33, 33] },
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
    topology: strengthTopology,
    playerSetIds: [156, 157, 158], opponentSetIds: [117, 185, 188],
    seed: 305419897, idleFrames: 700, captureFrame: 734,
    attacker: { species: 216, nature: 7, item: 134, friendship: 70, gender: "male", move: 290 },
    target: { species: 95, nature: 0, item: 142, friendship: 70, gender: "male", moves: [33, 33, 33, 33] },
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

function sourceBody(scripts: string, first: string, next: string): string {
  return scripts.slice(scripts.indexOf(first + ":"), scripts.indexOf(next + ":"));
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

describe("brown-orb-mud-shot standalone fulfilled component-track ratchet", () => {
  it("pins the distinct Mud Shot, Secret Power dispatch, and Strength source bodies", () => {
    expect(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/mudShotSourceAudit.ts",
    ], { encoding: "utf8" })).toBe(
      "Mud Shot source audit: set 111/species 98/move 341; 11×2 BROWN_ORB; "
      + "Secret Power building->Strength\n",
    );
    const dispatch = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/secretPowerSourceAudit.ts",
    ], { encoding: "utf8" })) as Record<string, unknown>;
    expect(dispatch).toMatchObject({
      move: "MOVE_SECRET_POWER", moveId: 290,
      factory: {
        mapType: "MAP_TYPE_INDOOR", environment: "BATTLE_ENVIRONMENT_BUILDING",
        environmentValue: 8, reachableBodies: ["Move_STRENGTH"],
      },
      selectionRoutes: {
        success: "CONTROLLER_MOVEANIMATION -> DoMoveAnim(290) -> Move_SECRET_POWER -> AnimTask_GetBattleEnvironment -> Move_STRENGTH",
      },
      factoryBody: {
        label: "Move_STRENGTH",
        components: expect.arrayContaining([
          "ANIM_TAG_IMPACT", "AnimTask_ShakeAndSinkMon",
          "AnimTask_TranslateMonEllipticalRespectSide", "AnimTask_ShakeMon2", "cleanup",
        ]),
      },
    });
    expect(dispatch.visualDispatch).toEqual({
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

    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", "reference/pokeemerald/pokeemerald.elf",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect({
      Move_MUD_SHOT: pointer(symbols, "Move_MUD_SHOT"),
      Move_METEOR_MASH: pointer(symbols, "Move_METEOR_MASH"),
      Move_SECRET_POWER: pointer(symbols, "Move_SECRET_POWER"),
      Move_TWISTER: pointer(symbols, "Move_TWISTER"),
      Move_STRENGTH: pointer(symbols, "Move_STRENGTH"),
      Move_TACKLE: pointer(symbols, "Move_TACKLE"),
      gMudShotOrbSpriteTemplate: pointer(symbols, "gMudShotOrbSpriteTemplate"),
      AnimTask_StartSinAnimTimer: pointer(symbols, "AnimTask_StartSinAnimTimer"),
      AnimTask_ShakeMon: pointer(symbols, "AnimTask_ShakeMon"),
      AnimToTargetInSinWave: pointer(symbols, "AnimToTargetInSinWave"),
      AnimTask_GetBattleEnvironment: pointer(symbols, "AnimTask_GetBattleEnvironment"),
    }).toEqual({
      Move_MUD_SHOT: "0x082d560d", Move_METEOR_MASH: "0x082d56aa",
      Move_SECRET_POWER: "0x082d6fd0", Move_TWISTER: "0x082d7024",
      Move_STRENGTH: "0x082c9862", Move_TACKLE: "0x082c98f6",
      gMudShotOrbSpriteTemplate: "0x085950fc",
      AnimTask_StartSinAnimTimer: "0x081076c8", AnimTask_ShakeMon: "0x080d51ac",
      AnimToTargetInSinWave: "0x081075ec", AnimTask_GetBattleEnvironment: "0x08117c24",
    });

    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const mudShot = sourceBody(scripts, "Move_MUD_SHOT", "Move_METEOR_MASH");
    const secretPower = sourceBody(scripts, "Move_SECRET_POWER", "Move_TWISTER");
    const strength = sourceBody(scripts, "Move_STRENGTH", "Move_TACKLE");
    expect(createHash("sha256").update(mudShot).digest("hex"))
      .toBe("9e0f0282fb912ecad4013e07d4b32db39548a9c0928bafa9c26ff48fabccf865");
    expect(createHash("sha256").update(secretPower).digest("hex"))
      .toBe("d462cabaadfb298a08c5d3fbbbbc66892d503b9bd4bd8f765ae413cf0288925f");
    expect(createHash("sha256").update(strength).digest("hex"))
      .toBe("a53060ce8edde9b8dd11cef571a6bd1a82531692df755134050fd66464054bf9");
    expect(mudShot).not.toBe(strength);
    for (const token of [
      "loadspritegfx ANIM_TAG_BROWN_ORB", "monbg ANIM_DEF_PARTNER",
      "splitbgprio ANIM_TARGET", "setalpha 12, 8",
      "AnimTask_ShakeMon, 5, ANIM_ATTACKER, 0, 2, 46, 1",
      "AnimTask_StartSinAnimTimer, 5, 100", "panse SE_M_WHIRLPOOL",
      "call MudShotOrbs", "AnimTask_ShakeMon, 5, ANIM_TARGET, 3, 0, 43, 1",
      "clearmonbg ANIM_DEF_PARTNER", "blendoff", "MudShotOrbs:",
      "createsprite gMudShotOrbSpriteTemplate, ANIM_ATTACKER, 3, 10, 10, 0, 16",
    ]) expect(mudShot).toContain(token);
    expect((mudShot.match(/call MudShotOrbs/g) ?? [])).toHaveLength(11);
    expect((mudShot.match(/createsprite gMudShotOrbSpriteTemplate/g) ?? [])).toHaveLength(2);
    for (const token of [
      "createvisualtask AnimTask_GetBattleEnvironment, 5",
      "BATTLE_ENVIRONMENT_SAND,       Move_MUD_SHOT",
      "BATTLE_ENVIRONMENT_BUILDING,   Move_STRENGTH",
      "goto Move_SLAM",
    ]) expect(secretPower).toContain(token);
    for (const token of [
      "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
      "SE_M_TAKE_DOWN, SOUND_PAN_ATTACKER", "AnimTask_ShakeAndSinkMon, 5, ANIM_ATTACKER, 2, 0, 96, 30",
      "gSlideMonToOriginalPosSpriteTemplate", "AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_TARGET, 18, 6, 2, 4",
      "x=16, y=12, relative_to=ANIM_TARGET, animation=1",
      "x=-16, y=-12, relative_to=ANIM_TARGET, animation=1",
      "x=3, y=4, relative_to=ANIM_TARGET, animation=1",
      "AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "clearmonbg ANIM_DEF_PARTNER", "blendoff",
    ]) expect(strength).toContain(token);
    expect(strength).not.toContain("gMudShotOrbSpriteTemplate");
    expect(strength).not.toContain("AnimTask_StartSinAnimTimer");
  });

  it("pins all four untouched semantic/raw-RGB receipts, topology, lifecycle, cleanup window, and every unthinned row", () => {
    for (const expected of receipts) {
      const stored = fixture(expected.fixturePath);
      expect(digest(expected.fixturePath)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenarioPath)).toBe(expected.scenarioSha256);
      expect(stored).toMatchObject({
        schema: expected.schema, oracleProfile: "battle-scene-on",
        orientation: expected.orientation, scenario: expected.scenarioPath,
        probe: expected.move === "MOVE_MUD_SHOT"
          ? "tools/compare/mudShotProbe.py" : "tools/compare/bodySlamProbe.py",
        sourceWindow: expected.window, evidenceSha256: expected.evidence,
        rawRgbSha256: expected.raw,
        attacker: {
          species: expected.move === "MOVE_MUD_SHOT" ? "KRABBY" : "TEDDIURSA",
          geometry: { side: expected.side },
        },
        target: {
          species: "ONIX",
          geometry: { side: expected.side === "player" ? "opponent" : "player" },
        },
      });
      expect(stored.sourceWindow.endFrame - stored.sourceWindow.startFrame + 1)
        .toBe(expected.window.frameCount);
      if (expected.move === "MOVE_MUD_SHOT") {
        expect(stored.topology).toBeUndefined();
        expect(stored.status).toBeUndefined();
        expect(stored.acceptance).toBeUndefined();
      } else {
        expect(stored.topology).toEqual(strengthTopology);
        expect(stored.status).toBe("exact");
        expect(stored.acceptance).toEqual({
          reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true,
        });
      }
    }
    expect(receipts.filter((entry) => entry.move === "MOVE_MUD_SHOT")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(289);
    expect(receipts.filter((entry) => entry.move === "MOVE_SECRET_POWER")
      .reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(204);
    expect(receipts.reduce((total, entry) => total + entry.window.frameCount, 0)).toBe(493);
  });

  it("keeps every retained scenario a complete legal three-Pokemon party-only Scene-ON fixture", () => {
    for (const expected of receipts) {
      const stored = fixture(expected.fixturePath);
      const staged = scenario(expected.scenarioPath);
      expect(stored.scenario).toBe(expected.scenarioPath);
      expect(staged).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: 0, battleNum: 0, trainerId: 50, seed: expected.seed,
        playerSetIds: expected.playerSetIds, opponentSetIds: expected.opponentSetIds,
      });
      expect(Object.keys(staged.overrides)).toEqual(["parties"]);
      expect(Object.keys(staged.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteParty(staged.overrides.parties.player);
      expectCompleteParty(staged.overrides.parties.opponent);
      expect(Object.keys(staged.trace).sort()).toEqual(["captureFrames", "segments"]);
      expect(staged.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: expected.idleFrames, buttons: [] },
      ]);
      expect(staged.trace.captureFrames).toEqual([0, expected.captureFrame]);

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

  it("keeps current portable evidence, cleanup, raw-framebuffer, hardware, and move-owned latch obligations load-bearing", () => {
    const mudReducer = readFileSync("src/animation/mudShot.ts", "utf8");
    for (const token of [
      "Complete source-relative `Move_MUD_SHOT` body through first inactive",
      "const SPAWN_AGES = Array.from({ length: 22 }", "function scriptOffsetAtAge(",
      "AnimToTargetInSinWave_Step", "cleanupAge = side === \"player\" ? 144 : 143",
      "battlerDisplayAge: age - 1", "targetMonbg: age >= 7 && age <= 128",
      "const whirlpoolAudio = age >= 15 && age <= 135",
    ]) expect(mudReducer).toContain(token);
    const strengthReducer = readFileSync("src/animation/strength.ts", "utf8");
    for (const token of [
      "Pure source-relative reducer for Secret Power's sole Factory body",
      "Move_STRENGTH", "function shakeAndSinkAtAge(", "function ellipticalAtAge(",
      "function shakeMon2AtAge(", "const HIT_SPLATS = [",
      "ellipticalTaskActive: age >= 48 && age <= 77",
      "shakeMon2Active: age >= 79 && age <= 92",
    ]) expect(strengthReducer).toContain(token);

    const mudPortable = readFileSync("tools/compare/mudShotPortableEvidence.ts", "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "compactSemanticReceiptSha256",
      "mudShotAtAge", "sceneOnMudShotView", "MUD_SHOT_TOPOLOGY",
      "same(probe.sourceWindow, fixture.sourceWindow)", "same(probe.topology, MUD_SHOT_TOPOLOGY)",
      "probe.lifecycleCounts.mudShotOrb !== 22", "firstInactiveCleanup",
      "hardware OAM", "oamPredecessorTransfers", "matrixPredecessorTransfers",
      "palettePredecessorTransfers", "paletteSameRowSetups", "age === 4",
      "same(actual.hardwareOam, prior.softwareOam)", "same(actual.hardwareMatrices[sprite.matrixNum], sprite.matrix)",
      "same(actual.hardwarePalette, prior.fadedPalette)", "same(actual.hardwarePalette, actual.fadedPalette)",
      "rawDigest !== fixture.rawRgbSha256", "immutableBattlers", "const app = render(engine)",
      "240 * 160", "fresh proof diverged", "for (let repeat = 1; repeat <= 2; repeat += 1)",
    ]) expect(mudPortable).toContain(token);
    expect(mudPortable).toContain("Mud Shot's own target-monbg setup is the only measured same-row");
    expect(mudPortable).not.toContain("strengthAtAge");

    const strengthPortable = readFileSync("tools/compare/secretPowerStrengthEvidence.ts", "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "semanticReceiptSha256",
      "strengthAtAge", "sceneOnSecretPowerView", "secret-power-strength-dense-evidence/v1",
      "hardwareBattlers", "hardwareTransfer", "paletteTransfer", "hardwareMatrices", "immutableState",
      "compareFramebuffer(render(engine), raw)", "framebuffer.count === 0",
      "rawDigest !== fixture.rawRgbSha256", "fresh evidence changed", "fresh raw RGB changed",
      "for (let run = 1; run <= 2; run += 1)",
    ]) expect(strengthPortable).toContain(token);
    expect(strengthPortable).not.toContain("mudShotAtAge");
    expect(strengthPortable).not.toContain("AnimTask_TranslateMonEllipticalRespectSide");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    for (const token of [
      "The latch is per-MECHANISM", "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured", "AnimTask_ShakeMon` | RAM+1",
    ]) expect(latches).toContain(token);
    expect(trackGoal).toContain("Mud Shot independently retains whole predecessor hardware OAM and matrices");
    expect(trackGoal).toContain("it borrows no Strength task timing or latch");
    expect(trackGoal).toContain("own IMPACT, ShakeAndSinkMon, return slide, side-respecting ellipse");
    expect(trackGoal).toContain("Move_MUD_SHOT is the unreachable SAND dispatch");
    expect(trackGoal).toContain("no BROWN_ORB, projectile, sinus-timer, ShakeMon, Mud Shot impact, monbg, timing, environment, or latch credit");
  });

  it("fulfills only the unchanged exact nine-component boundary at 242/276 and grants no transfer credit", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const inventory = JSON.parse(readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"));
    const level50Moves = new Set<string>(inventory.tiers.level50.moves
      .map((entry: { move: string }) => entry.move));
    expect(level50Moves.size).toBe(276);
    expect(coverage.entries).toHaveLength(248);
    expect(coverage.entries.filter((entry: { move: string; status: string }) =>
      level50Moves.has(entry.move) && entry.status === "exact",
    )).toHaveLength(248);
    expect(coverage.entries.filter((entry: { move: string; status: string }) =>
      level50Moves.has(entry.move) && (entry.status === "partial" || entry.status === "staged"),
    )).toEqual([]);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_MUD_SHOT", "MOVE_SECRET_POWER",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_MUD_SHOT", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SECRET_POWER", status: "exact" }),
    ]);
    const secretPower = coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_SECRET_POWER",
    );
    expect(secretPower.covered.join("\n")).not.toContain("BROWN_ORB");
    expect(secretPower.covered.join("\n")).not.toContain("Mud Shot");
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "brown-orb-mud-shot",
    )).toEqual([{
      id: "brown-orb-mud-shot",
      components: [
        "asset:ANIM_TAG_BROWN_ORB",
        "sprite:gMudShotOrbSpriteTemplate",
        "task:AnimTask_StartSinAnimTimer",
        "task:AnimTask_ShakeMon",
        "visualCommand:monbg",
        "visualCommand:splitbgprio",
        "visualCommand:setalpha",
        "visualCommand:clearmonbg",
        "visualCommand:blendoff",
      ],
      representatives: ["MOVE_MUD_SHOT", "MOVE_SECRET_POWER"],
      fulfilled: true,
      goal: trackGoal,
    }]);
  });
});
