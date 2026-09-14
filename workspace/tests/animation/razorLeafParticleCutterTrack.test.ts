import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RAZOR_LEAF_BODY_LAST_AGE,
  RAZOR_LEAF_CUTTER_FIRST_AGE,
  RAZOR_LEAF_PARTICLE_FIRST_AGE,
  RAZOR_LEAF_SHAKE_FIRST_AGE,
  razorLeafAtAge,
} from "../../src/animation/razorLeaf.ts";
import {
  MAGICAL_LEAF_BLEND_COLORS,
  MAGICAL_LEAF_CONTACT_AGE,
  MAGICAL_LEAF_DISPLAY_LAG,
  MAGICAL_LEAF_FIRST_INACTIVE_AGE,
  MAGICAL_LEAF_FRAME_COUNT,
  magicalLeafAtAge,
} from "../../src/animation/magicalLeaf.ts";
import {
  leafBladeAtAge,
  leafBladeDisplayedOamOrderAtAge,
  leafBladeDisplayedTargetX2AtAge,
} from "../../src/animation/leafBlade.ts";
import { strengthAtAge } from "../../src/animation/strength.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRazorLeafView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

type Json = Record<string, any>;
type Side = "player" | "opponent";

const root = resolve(import.meta.dirname, "../..");

const trackComponents = [
  "asset:ANIM_TAG_LEAF",
  "asset:ANIM_TAG_RAZOR_LEAF",
  "task:AnimTask_ShakeMon2",
  "visualCommand:create_razor_leaf_particle_sprite",
  "visualCommand:create_razor_leaf_cutter_sprite",
  "visualCommand:monbg",
  "visualCommand:setalpha",
  "visualCommand:clearmonbg",
  "visualCommand:blendoff",
] as const;

const trackGoal = "FULFILLED: This exact nine-component boundary remains fulfilled only because MOVE_RAZOR_LEAF, MOVE_MAGICAL_LEAF, MOVE_LEAF_BLADE, and Factory indoor MOVE_SECRET_POWER -> Move_STRENGTH each independently retain its own authoritative source or Factory-dispatch body, source-derived reducer, typed Scene-ON seam, production compositor, complete legal bilateral party-only Battle Scene ON fixtures, and twice-fresh unthinned source/component/seam/hardware/palette/register/audio/raw-RGB/framebuffer proof. Razor Leaf independently owns its legal WEEPINBELL/SHUCKLE 139-frame bilateral leaf-particle/cutter, one-display OAM/palette/shake, monbg/alpha, audio, and cleanup body. Magical Leaf independently owns its legal ROSELIA/ONIX 182-frame bilateral palette-cycle/cutter/hitsplat/ShakeMon2 body and transfer maps. Leaf Blade independently owns its legal SCEPTILE/ONIX 224-frame bilateral seven-arc AnimTask_LeafBlade/CROSS_IMPACT body and separately measured split latches. Secret Power independently owns only its legal Factory indoor TEDDIURSA/ONIX 102-frame bilateral Move_STRENGTH dispatch/body. Factory cannot dispatch the grass Move_NEEDLE_ARM or long-grass Move_MAGICAL_LEAF branches and gains no leaf-body credit. Rules 1, 2, and 5 remain per mechanism: shared LEAF/RAZOR_LEAF art or ShakeMon2 transfers no particle, cutter, palette, trail, impact, shake, audio, timing, hardware, latch, framebuffer, or acceptance fact, and one display remains only an unmeasured hypothesis.";

const receipts = [
  {
    move: "RAZOR_LEAF", moveId: 75, side: "player" as Side, attacker: 70, target: 213,
    fixture: "tools/compare/fixtures/razor-leaf-player-weepinbell-opponent-shuckle.json",
    fixtureSha256: "515af5a638b3a09dca54ccfab78d0f1d41ca35e13671821faaaa6d5b0ac36f38",
    scenario: "tools/battle-lab/mechanic-razor-leaf-player-weepinbell-opponent-shuckle.json",
    scenarioSha256: "8aa959a15d06b8bea135764dc4e66fcad10db0ae5a4f88eaa703967188e43ac2",
    schema: "scene-on-portable-component/v1", window: { startFrame: 91, endFrame: 229, frameCount: 139 },
    tailFrames: 500, terminalCapture: 534,
  },
  {
    move: "RAZOR_LEAF", moveId: 75, side: "opponent" as Side, attacker: 70, target: 213,
    fixture: "tools/compare/fixtures/razor-leaf-opponent-weepinbell-player-shuckle.json",
    fixtureSha256: "9bd6860dd168bc5198af07129506a810e1ce7a52a08b01894f32b59dc7952d91",
    scenario: "tools/battle-lab/mechanic-razor-leaf-opponent-weepinbell-player-shuckle.json",
    scenarioSha256: "0ab4f168c83e234c1d6e7ea28108f3b76b8e7f8035c08e54fd3d04848f0858a7",
    schema: "scene-on-portable-component/v1", window: { startFrame: 95, endFrame: 233, frameCount: 139 },
    tailFrames: 500, terminalCapture: 534,
  },
  {
    move: "MAGICAL_LEAF", moveId: 345, side: "player" as Side, attacker: 363, target: 95,
    fixture: "tools/compare/fixtures/magical-leaf-player-roselia-opponent-onix.json",
    fixtureSha256: "539f244d407d4b2b2f3f8e6a54e7e23e7857a64f8876078f83c34844446a867c",
    scenario: "tools/battle-lab/mechanic-magical-leaf-player-roselia-opponent-onix.json",
    scenarioSha256: "e4b2bdf77fbb17d9c0dc50b7c4566c041bb6ee31ac6b6dc7ca4eb7ef6af57c10",
    schema: "scene-on-portable-evidence/v1", window: { startFrame: 77, endFrame: 258, frameCount: 182 },
    tailFrames: 500, terminalCapture: 534,
  },
  {
    move: "MAGICAL_LEAF", moveId: 345, side: "opponent" as Side, attacker: 363, target: 95,
    fixture: "tools/compare/fixtures/magical-leaf-opponent-roselia-player-onix.json",
    fixtureSha256: "bf2db8648515e4bac2c90a0fbe3b741fc86b36b85b00f14567bf1d3d20fbb484",
    scenario: "tools/battle-lab/mechanic-magical-leaf-opponent-roselia-player-onix.json",
    scenarioSha256: "03f0c03f3b54b9e4531d69264e0ee2db69c62bd99cd16813be11a643539db1bd",
    schema: "scene-on-portable-evidence/v1", window: { startFrame: 81, endFrame: 262, frameCount: 182 },
    tailFrames: 500, terminalCapture: 534,
  },
  {
    move: "LEAF_BLADE", moveId: 348, side: "player" as Side, attacker: 279, target: 95,
    fixture: "tools/compare/fixtures/leaf-blade-player-sceptile-opponent-onix.json",
    fixtureSha256: "3886db3b8010c256a9ccada714889798b4a165cf1a5dbfe566dfec630351d8ea",
    scenario: "tools/battle-lab/mechanic-leaf-blade-player-sceptile-opponent-onix.json",
    scenarioSha256: "f14f16a230e3031fd8ab5f13482fc97b3337a0ab408a1e1c7b977886665aa71a",
    schema: "leaf-blade-portable-evidence/v2", window: { startFrame: 76, endFrame: 299, frameCount: 224 },
    tailFrames: 800, terminalCapture: 834,
  },
  {
    move: "LEAF_BLADE", moveId: 348, side: "opponent" as Side, attacker: 279, target: 95,
    fixture: "tools/compare/fixtures/leaf-blade-opponent-sceptile-player-onix.json",
    fixtureSha256: "f73d9520e5702eed81d2b417a59df3a9a8620a40b571a7ea5921dd4b197539b1",
    scenario: "tools/battle-lab/mechanic-leaf-blade-opponent-sceptile-player-onix.json",
    scenarioSha256: "19d287810059768f9a164a591bd45553097bfc775655b8db41eae97c5918c65f",
    schema: "leaf-blade-portable-evidence/v2", window: { startFrame: 80, endFrame: 303, frameCount: 224 },
    tailFrames: 800, terminalCapture: 834,
  },
  {
    move: "SECRET_POWER", moveId: 290, side: "player" as Side, attacker: 216, target: 95,
    fixture: "tools/compare/fixtures/secret-power-strength-player-teddiursa-opponent-onix.json",
    fixtureSha256: "dbef17560a3d27f9613327f5a192ecc3ea9dfe0fa9453489457adff0dc404f84",
    scenario: "tools/battle-lab/mechanic-secret-power-player-teddiursa-opponent-onix.json",
    scenarioSha256: "5e27e1eb75e376e57d88ac8769ff28fa32ba8b7102a884a5865245e7142d4dda",
    schema: "secret-power-strength-portable-evidence/v1", window: { startFrame: 222, endFrame: 323, frameCount: 102 },
    tailFrames: 700, terminalCapture: 734,
  },
  {
    move: "SECRET_POWER", moveId: 290, side: "opponent" as Side, attacker: 216, target: 95,
    fixture: "tools/compare/fixtures/secret-power-strength-opponent-teddiursa-player-onix.json",
    fixtureSha256: "139cfef38498fbe7aff791738c05ad31cc0a23642ec415ab77f03f9ed8dd074f",
    scenario: "tools/battle-lab/mechanic-secret-power-opponent-teddiursa-player-onix.json",
    scenarioSha256: "28cd3c73e0d0a67254951d38093bef22b162015934bcd060fde19da43a78e694",
    schema: "secret-power-strength-portable-evidence/v1", window: { startFrame: 222, endFrame: 323, frameCount: 102 },
    tailFrames: 700, terminalCapture: 734,
  },
] as const;

const monKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
] as const;
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"] as const;

function json<T = Json>(path: string): T {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
}

function sourceBody(source: string, start: string, end: string): string {
  const first = source.indexOf(`${start}:`);
  const last = source.indexOf(`${end}:`, first + 1);
  if (first < 0 || last < 0) throw new Error(`missing ${start}..${end}`);
  return source.slice(first, last);
}

function pointer(symbols: string, symbol: string): string {
  const match = symbols.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ELF symbol ${symbol}`);
  return `0x${match[1]!.toLowerCase()}`;
}

function expectCompleteLegalParty(party: readonly Json[]): void {
  expect(party).toHaveLength(3);
  for (const mon of party) {
    expect(Object.keys(mon).sort()).toEqual([...monKeys].sort());
    expect(Object.keys(mon.ivs).sort()).toEqual([...statKeys]);
    expect(Object.keys(mon.evs).sort()).toEqual([...statKeys]);
    expect(mon.level).toBe(50);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.abilitySlot).toBe(0);
    expect(mon.shiny).toBe(false);
    expect(["male", "female", "genderless"]).toContain(mon.gender);
    const ivs = Object.values(mon.ivs) as number[];
    const evs = Object.values(mon.evs) as number[];
    expect(ivs.every((value) => Number.isInteger(value) && value >= 0 && value <= 31)).toBe(true);
    expect(evs.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
    expect(evs.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
    for (const transient of [
      "hp", "currentHp", "status", "status1", "status2", "statStages", "weather", "sideConditions", "outcome",
    ]) expect(mon).not.toHaveProperty(transient);
  }
}

describe("razor-leaf-particle-cutter standalone fulfilled component-track ratchet", () => {
  it("pins the exact nine-component boundary plus four authoritative bodies, Secret Power dispatch, ELF intervals, ROM hashes, and source tokens", () => {
    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    expect({
      Move_RAZOR_LEAF: pointer(symbols, "Move_RAZOR_LEAF"), Move_NATURE_POWER: pointer(symbols, "Move_NATURE_POWER"),
      Move_MAGICAL_LEAF: pointer(symbols, "Move_MAGICAL_LEAF"), Move_ICE_BALL: pointer(symbols, "Move_ICE_BALL"),
      Move_LEAF_BLADE: pointer(symbols, "Move_LEAF_BLADE"), Move_DRAGON_DANCE: pointer(symbols, "Move_DRAGON_DANCE"),
      Move_STRENGTH: pointer(symbols, "Move_STRENGTH"), Move_TACKLE: pointer(symbols, "Move_TACKLE"),
      Move_SECRET_POWER: pointer(symbols, "Move_SECRET_POWER"), Move_TWISTER: pointer(symbols, "Move_TWISTER"),
      AnimTask_ShakeMon2: pointer(symbols, "AnimTask_ShakeMon2"),
      AnimTask_CycleMagicalLeafPal: pointer(symbols, "AnimTask_CycleMagicalLeafPal"),
      AnimTask_LeafBlade: pointer(symbols, "AnimTask_LeafBlade"),
      AnimTask_ShakeAndSinkMon: pointer(symbols, "AnimTask_ShakeAndSinkMon"),
      AnimTask_TranslateMonEllipticalRespectSide: pointer(symbols, "AnimTask_TranslateMonEllipticalRespectSide"),
      gRazorLeafParticleSpriteTemplate: pointer(symbols, "gRazorLeafParticleSpriteTemplate"),
      gRazorLeafCutterSpriteTemplate: pointer(symbols, "gRazorLeafCutterSpriteTemplate"),
      gLeafBladeSpriteTemplate: pointer(symbols, "gLeafBladeSpriteTemplate"),
      gCrossImpactSpriteTemplate: pointer(symbols, "gCrossImpactSpriteTemplate"),
      gBasicHitSplatSpriteTemplate: pointer(symbols, "gBasicHitSplatSpriteTemplate"),
      gSlideMonToOriginalPosSpriteTemplate: pointer(symbols, "gSlideMonToOriginalPosSpriteTemplate"),
    }).toEqual({
      Move_RAZOR_LEAF: "0x082d2954", Move_NATURE_POWER: "0x082d2a5b",
      Move_MAGICAL_LEAF: "0x082d7183", Move_ICE_BALL: "0x082d72a4",
      Move_LEAF_BLADE: "0x082cf330", Move_DRAGON_DANCE: "0x082cf3b3",
      Move_STRENGTH: "0x082c9862", Move_TACKLE: "0x082c98f6",
      Move_SECRET_POWER: "0x082d6fd0", Move_TWISTER: "0x082d7024",
      AnimTask_ShakeMon2: "0x080d52d0", AnimTask_CycleMagicalLeafPal: "0x081007c4",
      AnimTask_LeafBlade: "0x080fffc0", AnimTask_ShakeAndSinkMon: "0x080d5644",
      AnimTask_TranslateMonEllipticalRespectSide: "0x080d5830",
      gRazorLeafParticleSpriteTemplate: "0x08592390", gRazorLeafCutterSpriteTemplate: "0x085923d8",
      gLeafBladeSpriteTemplate: "0x08592778", gCrossImpactSpriteTemplate: "0x085973d0",
      gBasicHitSplatSpriteTemplate: "0x08597358", gSlideMonToOriginalPosSpriteTemplate: "0x0857fe58",
    });

    const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
    const bodies = [
      {
        move: "RAZOR_LEAF", text: sourceBody(scripts, "Move_RAZOR_LEAF", "Move_NATURE_POWER"),
        bytes: rom.subarray(0x2d2954, 0x2d2a5b), sourceSha256: "d53d2e5ea601b04166785e96e7a9204fa30b2e51a96bbf53eb6edead46754d54",
        romSha256: "5f6b69a4424f7bf9f090d393593a2d7a47c356be7b8fa612b177ae5f7da63063", byteLength: 263,
      },
      {
        move: "MAGICAL_LEAF", text: sourceBody(scripts, "Move_MAGICAL_LEAF", "Move_ICE_BALL"),
        bytes: rom.subarray(0x2d7183, 0x2d72a4), sourceSha256: "d5dc5fe70286b329795e8a647d8549592c197f495a26cb9aedaa87779bad4869",
        romSha256: "f69b8da4861af7cc7e9ca90f126065a3ae3dd4c89d9e20731fe3f8f826d59f7a", byteLength: 289,
      },
      {
        move: "LEAF_BLADE", text: sourceBody(scripts, "Move_LEAF_BLADE", "Move_DRAGON_DANCE"),
        bytes: rom.subarray(0x2cf330, 0x2cf3b3), sourceSha256: "73d83fb9786e8f3dc6dd9d1b29b9aa5888c27d497e63611fad01fb82e45e1257",
        romSha256: "b7543ad7a8c8bafc5f60f3ae78a3786360c3a5d8dfc5f2079212677d3cedb295", byteLength: 131,
      },
      {
        move: "STRENGTH", text: sourceBody(scripts, "Move_STRENGTH", "Move_TACKLE"),
        bytes: rom.subarray(0x2c9862, 0x2c98f6), sourceSha256: "a53060ce8edde9b8dd11cef571a6bd1a82531692df755134050fd66464054bf9",
        romSha256: "8467403371fe81f2d71c062c039ebd27d179793011ee92361d957636300a4116", byteLength: 148,
      },
    ] as const;
    for (const body of bodies) {
      expect(createHash("sha256").update(body.text).digest("hex")).toBe(body.sourceSha256);
      expect([body.bytes.length, createHash("sha256").update(body.bytes).digest("hex")])
        .toEqual([body.byteLength, body.romSha256]);
    }
    expect(new Set(bodies.map((body) => body.sourceSha256)).size).toBe(4);

    const dispatch = sourceBody(scripts, "Move_SECRET_POWER", "Move_TWISTER");
    const dispatchRom = rom.subarray(0x2d6fd0, 0x2d7024);
    expect([createHash("sha256").update(dispatch).digest("hex"), dispatchRom.length,
      createHash("sha256").update(dispatchRom).digest("hex")]).toEqual([
      "d462cabaadfb298a08c5d3fbbbbc66892d503b9bd4bd8f765ae413cf0288925f", 84,
      "299beee5be8272e9fa99cc8cfe11ebccd5e01ef8f66806d29f2c40f9800c4e12",
    ]);

    const [razor, magical, leafBlade, strength] = bodies.map((body) => body.text);
    for (const token of [
      "loadspritegfx ANIM_TAG_LEAF", "loadspritegfx ANIM_TAG_RAZOR_LEAF", "monbg ANIM_DEF_PARTNER",
      "setalpha 12, 8", "duration=22, wave_amplitude=20, target_both=TRUE",
      "duration=22, wave_amplitude=-20, target_both=TRUE", "SE_M_POISON_POWDER",
      "SE_M_RAZOR_WIND2", "SE_M_RAZOR_WIND", "clearmonbg ANIM_DEF_PARTNER", "blendoff",
    ]) expect(razor).toContain(token);
    expect((razor.match(/create_razor_leaf_particle_sprite/g) ?? [])).toHaveLength(10);
    expect((razor.match(/create_razor_leaf_cutter_sprite/g) ?? [])).toHaveLength(2);
    expect((razor.match(/AnimTask_ShakeMon2/g) ?? [])).toHaveLength(2);

    for (const token of [
      "createvisualtask AnimTask_CycleMagicalLeafPal, 5", "duration=32, wave_amplitude=20, target_both=FALSE",
      "duration=32, wave_amplitude=-20, target_both=FALSE", "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "setarg 7, 0xFFFF", "clearmonbg ANIM_DEF_PARTNER", "blendoff",
    ]) expect(magical).toContain(token);
    expect((magical.match(/create_razor_leaf_particle_sprite/g) ?? [])).toHaveLength(10);
    expect((magical.match(/create_razor_leaf_cutter_sprite/g) ?? [])).toHaveLength(2);
    expect((magical.match(/create_basic_hitsplat_sprite/g) ?? [])).toHaveLength(2);

    for (const token of [
      "loadspritegfx ANIM_TAG_LEAF", "loadspritegfx ANIM_TAG_CROSS_IMPACT", "create_leaf_blade_task",
      "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1", "monbg ANIM_TARGET",
      "setalpha 12, 8", "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 8, 0, 18, 1",
      "create_cross_impact_sprite ANIM_TARGET, 2, x=0, y=0, relative_to=ANIM_TARGET, duration=36",
      "SE_M_CUT", "SE_M_LEER", "clearmonbg ANIM_TARGET", "blendoff",
    ]) expect(leafBlade).toContain(token);
    expect((leafBlade.match(/AnimTask_ShakeMon2/g) ?? [])).toHaveLength(4);
    expect((leafBlade.match(/SE_M_CUT/g) ?? [])).toHaveLength(3);

    for (const token of [
      "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
      "AnimTask_ShakeAndSinkMon, 5, ANIM_ATTACKER, 2, 0, 96, 30",
      "gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 4",
      "AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_TARGET, 18, 6, 2, 4",
      "x=16, y=12, relative_to=ANIM_TARGET, animation=1", "x=-16, y=-12, relative_to=ANIM_TARGET, animation=1",
      "x=3, y=4, relative_to=ANIM_TARGET, animation=1", "AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "clearmonbg ANIM_DEF_PARTNER", "blendoff",
    ]) expect(strength).toContain(token);
    expect((strength.match(/create_basic_hitsplat_sprite/g) ?? [])).toHaveLength(3);

    for (const token of [
      "createvisualtask AnimTask_GetBattleEnvironment, 5", "BATTLE_ENVIRONMENT_GRASS,      Move_NEEDLE_ARM",
      "BATTLE_ENVIRONMENT_LONG_GRASS, Move_MAGICAL_LEAF", "BATTLE_ENVIRONMENT_BUILDING,   Move_STRENGTH",
      "goto Move_SLAM",
    ]) expect(dispatch).toContain(token);
  });

  it("pins all eight untouched complete legal three-Pokemon party-only bilateral fixtures, scenarios, and byte hashes", () => {
    expect(receipts).toHaveLength(8);
    for (const expected of receipts) {
      const fixture = json<Json>(expected.fixture);
      const stage = json<Json>(expected.scenario);
      expect(digest(expected.fixture)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenario)).toBe(expected.scenarioSha256);
      expect(fixture).toMatchObject({
        schema: expected.schema, scenario: expected.scenario,
        attacker: { geometry: { side: expected.side } },
        target: { geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
      if (fixture.oracleProfile !== undefined) expect(fixture.oracleProfile).toBe("battle-scene-on");
      const window = fixture.denseWindow ?? fixture.sourceWindow;
      expect(window).toMatchObject({ startFrame: expected.window.startFrame, endFrame: expected.window.endFrame });
      expect(window.endFrame - window.startFrame + 1).toBe(expected.window.frameCount);
      expect(stage).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, battleNum: 0,
      });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expect(Object.keys(stage.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteLegalParty(stage.overrides.parties.player);
      expectCompleteLegalParty(stage.overrides.parties.opponent);
      expect(stage.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: expected.tailFrames, buttons: [] },
      ]);
      expect(stage.trace.captureFrames).toEqual(expected.move === "RAZOR_LEAF"
        ? [0, 70, 80, 90, 100, 120, 150, 200, expected.terminalCapture]
        : [0, expected.terminalCapture]);
      const attacker = stage.overrides.parties[expected.side][0];
      const target = stage.overrides.parties[expected.side === "player" ? "opponent" : "player"][0];
      expect(attacker.species).toBe(expected.attacker);
      expect(attacker.moves).toEqual(Array(4).fill(expected.moveId));
      expect(target.species).toBe(expected.target);
      expect(target.moves).toEqual([33, 33, 33, 33]);
    }
  });

  it("keeps Razor Leaf's own 139/139 bilateral WEEPINBELL body, one-display OAM/palette/shake, monbg/alpha, audio, and cleanup separate", () => {
    const own = receipts.filter((receipt) => receipt.move === "RAZOR_LEAF");
    expect(own.map((receipt) => receipt.window)).toEqual([
      { startFrame: 91, endFrame: 229, frameCount: 139 },
      { startFrame: 95, endFrame: 233, frameCount: 139 },
    ]);
    expect(own.reduce((total, receipt) => total + receipt.window.frameCount, 0)).toBe(278);
    for (const expected of own) {
      const fixture = json<Json>(expected.fixture);
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-component/v1", move: "RAZOR_LEAF", attackerSide: expected.side,
        probe: "tools/compare/razorLeafProbe.py", appStage: { presentationAge: 0 },
        attacker: { species: "WEEPINBELL", geometry: { side: expected.side } },
        target: { species: "SHUCKLE", geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
    }
    expect({
      particle: RAZOR_LEAF_PARTICLE_FIRST_AGE, cutter: RAZOR_LEAF_CUTTER_FIRST_AGE,
      shake: RAZOR_LEAF_SHAKE_FIRST_AGE, last: RAZOR_LEAF_BODY_LAST_AGE,
    }).toEqual({ particle: 3, cutter: 101, shake: 123, last: 138 });
    const player = (age: number) => razorLeafAtAge(age, "player", { x: 72, y: 97 }, { x: 176, y: 49 });
    expect(player(3).particles).toHaveLength(1);
    expect(player(39).particles).toHaveLength(10);
    expect(player(101).cutters).toHaveLength(2);
    expect(player(123)).toMatchObject({
      targetX2: -2, defenderPartnerShakeRequested: true, defenderPartnerShakeActive: false,
      soundRestart: "SE_M_RAZOR_WIND",
    });
    expect(player(137)).toMatchObject({ defenderPartnerOnMonBg: true, alpha: { eva: 12, evb: 8 }, active: true });
    expect(player(138)).toMatchObject({ defenderPartnerOnMonBg: false, alpha: null, active: true });
    expect(player(139).active).toBe(false);

    const portable = readFileSync(resolve(root, "tools/compare/razorLeafPortable.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "razorLeafAtAge", "sceneOnRazorLeafView",
      "hardwareShape(prior.particles, prior.cutters)", "targetSprite.x2 === expected.targetX2",
      "oracle.hardwarePalette.every", "defenderPartnerShakeRequested", "render(engine)",
      "source components + typed seam ${matches}/${total}; framebuffer ${framebufferMatches}/${total}",
    ]) expect(portable).toContain(token);
  });

  it("keeps Magical Leaf's own unthinned 182/182 bilateral palette-cycle/cutter/hitsplat/ShakeMon2 receipts, raw RGB, maps, and cleanup separate", () => {
    const own = receipts.filter((receipt) => receipt.move === "MAGICAL_LEAF");
    const expectedHashes = [
      {
        evidence: "d8250aaed208f7305154855b6d44a76d2e349ee56e7f516b922aa7386b0741f9",
        raw: "f45745676e1c6383a01619d009f6e7f2e3e553417e39a2267fc81c85b6380f52",
        map: "tools/compare/evidence/magical-leaf-changemap-player.txt",
        mapSha256: "df6be41752421612c4104aaacc73a9615ae3dea2d66cdbd58b4dec65632c8c0a",
      },
      {
        evidence: "cc7fd4818a30ef6e0d38f6a3391e7a24d572d23a52fc3611e0b8267a2ca3a8d3",
        raw: "1e7008151f3308e6e397640ef3e16789a0862f3ca1c5b729b1e847e74beff81f",
        map: "tools/compare/evidence/magical-leaf-changemap-opponent.txt",
        mapSha256: "9eb40c1c44c929935555651fc3b09ac18ad5475dfc843a1a9b027c2d27ae2f7c",
      },
    ] as const;
    for (const [index, expected] of own.entries()) {
      const fixture = json<Json>(expected.fixture);
      const hashes = expectedHashes[index]!;
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-evidence/v1", move: "MAGICAL_LEAF", probe: "tools/compare/magicalLeafProbe.py",
        denseWindow: expected.window, evidenceSchema: "magical-leaf-dense-evidence/v1",
        evidenceSha256: hashes.evidence, secondFreshEvidenceSha256: hashes.evidence,
        rawRgbSequenceSha256: hashes.raw, changeMap: hashes.map, changeMapSha256: hashes.mapSha256,
        acceptance: { status: "exact", componentMatching: 182, framebufferMatching: 182 },
      });
      expect(digest(hashes.map)).toBe(hashes.mapSha256);
    }
    expect(MAGICAL_LEAF_FRAME_COUNT).toBe(182);
    expect(MAGICAL_LEAF_BLEND_COLORS).toHaveLength(7);
    expect(MAGICAL_LEAF_DISPLAY_LAG).toEqual({
      particleSprite: 1, cutterSprite: 1, hitsplatSprite: 1, cycleMagicalLeafPalette: 1, shakeMon2: 1,
      monbg: "ram-only", setalpha: "ram-only", setarg: "ram-only", clearmonbgAndBlendoff: "ram-only",
    });
    const state = (age: number) => magicalLeafAtAge(age, {
      attackerSide: "player", attackerCenter: { x: 72, y: 96 }, targetCenter: { x: 176, y: 42 }, targetIdleX2: 1,
    });
    expect(state(16)).toMatchObject({ particles: [expect.objectContaining({ spawnIndex: 0 })], paletteCycle: { coefficient: 0, colorIndex: 0 } });
    expect(state(114).cutters).toHaveLength(2);
    expect(state(MAGICAL_LEAF_CONTACT_AGE)).toMatchObject({ hitsplats: expect.any(Array), shakeTask: { slot: 0, tick: 1 } });
    expect(state(MAGICAL_LEAF_FIRST_INACTIVE_AGE)).toMatchObject({
      active: false, assetsLoaded: { leaf: false, razorLeaf: false, impact: false }, targetMonbg: false, alpha: null,
    });

    const portable = readFileSync(resolve(root, "tools/compare/magicalLeafPortable.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "for (let repeat = 1; repeat <= 2; repeat += 1)",
      "evidence !== fixture.evidenceSha256", "raw !== fixture.rawRgbSequenceSha256", "normalizedChangeMap",
      "expectedHardware(previous.particles, previous.cutters, previous.hitsplats)", "paletteLatch", "shakeTask",
      "sceneOnMagicalLeafView", "render(engine)",
      "source components + typed seam ${components.matches}/${total}; framebuffer ${framebuffers.matches}/${total}",
    ]) expect(portable).toContain(token);
  });

  it("keeps Leaf Blade's own unthinned 224/224 bilateral seven-arc/trail/CROSS_IMPACT body, split latches, receipts, maps, and cleanup separate", () => {
    const own = receipts.filter((receipt) => receipt.move === "LEAF_BLADE");
    const expectedHashes = [
      {
        evidence: "5dcb5555738c51baf01032b7be3e67fa2f65c43ee133d7a440ae3f921c741369",
        raw: "6ba2d80fc47d05832114a857ab1bacbed1e69352d577adadfbcd26d49e74f4ad",
        map: "tools/compare/evidence/leaf-blade-changemap-player.txt",
        mapSha256: "ec5984b0761e0c724bbbf6d2c10ba069035ac495db876e4a2ef249dfd3313cbd",
      },
      {
        evidence: "c2a599b0d4adaf7f807100908cf4d2a79210ccf38c00acc2aa88181db43578b5",
        raw: "b85563f61d8681263728ac4becdf524b329854db31ca3a122257590e00285bed",
        map: "tools/compare/evidence/leaf-blade-changemap-opponent.txt",
        mapSha256: "8a776614bf459d95e0b6de17f4253813f7400ef2583ae80a91acca34e69e333b",
      },
    ] as const;
    for (const [index, expected] of own.entries()) {
      const fixture = json<Json>(expected.fixture);
      const hashes = expectedHashes[index]!;
      expect(fixture).toMatchObject({
        schema: "leaf-blade-portable-evidence/v2", probe: "tools/compare/leafBladeProbe.py", sourceWindow: expected.window,
        evidenceSha256: hashes.evidence, rawRgbSha256: hashes.raw, changeMap: hashes.map, changeMapSha256: hashes.mapSha256,
        lifecycleCounts: { leafBlade: 45, crossImpact: 1 },
        topology: { tasks: ["AnimTask_LeafBlade_Step", "AnimTask_ShakeMon2_Step", "Task_ClearMonBg", "Task_UpdateMonBg"] },
      });
      expect(digest(hashes.map)).toBe(hashes.mapSha256);
    }
    const target = { pictureOffset: { x: 176, y: 42 }, width: 56, height: 64, subpriority: 40 } as const;
    expect(leafBladeAtAge(7, "player", "opponent", target)).toMatchObject({ taskState: 0, taskChildCount: 1 });
    expect(leafBladeAtAge(125, "player", "opponent", target).sprites.every((sprite) => sprite.kind === "trail")).toBe(true);
    expect(leafBladeAtAge(161, "player", "opponent", target)).toMatchObject({
      crossImpact: { remaining: 35 }, targetMonbg: true, alpha: { eva: 12, evb: 8 },
    });
    expect(leafBladeAtAge(223, "player", "opponent", target)).toMatchObject({ active: false, taskState: null, visualTaskCount: 0 });
    expect([11, 12, 13, 161, 162, 195, 196].map((age) => leafBladeDisplayedTargetX2AtAge(age, "opponent")))
      .toEqual([1, 2, -2, 0, -8, -8, 0]);
    expect(leafBladeDisplayedOamOrderAtAge(44, "player", "opponent", target).slice(0, 2)).toEqual([5, 7]);

    const portable = readFileSync(resolve(root, "tools/compare/leafBladePortable.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "compactSemanticReceiptSha256", "normalizedChangeMap",
      "same(probe.lifecycleCounts, fixture.lifecycleCounts)", "changeMapHash !== fixture.changeMapSha256",
      "currentPaletteSetup = age === 144", "sceneOnLeafBladeView", "render(engine)",
      "for (let repeat = 0; repeat < 2; repeat += 1)", "components ${components}/224; framebuffer ${framebuffers}/224",
    ]) expect(portable).toContain(token);
    const latches = readFileSync(resolve(root, "ANIMATION_LATCHES.md"), "utf8");
    for (const token of [
      "AnimTask_LeafBlade", "task-owned position/creation RAM+2; animation cell/hFlip/blink and ordinary trail destruction RAM+1",
      "task-owned primary terminal destruction retains its RAM+2 display", "Leaf Blade short `AnimTask_ShakeMon2(target,2,0,8,1)` bursts",
      "Leaf Blade monbg `AnimTask_ShakeMon2(target,8,0,18,1)`", "BG-scroll target motion RAM+1, including terminal return",
      "script `create_cross_impact_sprite` during target monbg", "sprite and terminal destroy-callback display RAM+1",
    ]) expect(latches).toContain(token);
  });

  it("keeps Factory indoor Secret Power's own 102/102 bilateral Move_STRENGTH dispatch/body, topology, audio, raw receipts, and cleanup separate", () => {
    const own = receipts.filter((receipt) => receipt.move === "SECRET_POWER");
    const expectedHashes = [
      ["9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3", "af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903"],
      ["8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172", "f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a"],
    ] as const;
    for (const [index, expected] of own.entries()) {
      const fixture = json<Json>(expected.fixture);
      expect(fixture).toMatchObject({
        schema: "secret-power-strength-portable-evidence/v1", oracleProfile: "battle-scene-on",
        probe: "tools/compare/bodySlamProbe.py", sourceWindow: expected.window,
        evidenceSha256: expectedHashes[index]![0], rawRgbSha256: expectedHashes[index]![1], status: "exact",
        acceptance: { reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true },
        topology: {
          tasks: ["AnimTask_ShakeAndSinkMon_Step", "AnimTask_TranslateMonElliptical_Step", "AnimTask_ShakeMon2_Step"],
          templates: ["gSlideMonToOriginalPosSpriteTemplate", "gBasicHitSplatSpriteTemplate"],
          audio: ["SE_M_TAKE_DOWN", "SE_M_MEGA_KICK2"],
        },
      });
    }
    const player = (age: number) => strengthAtAge(age, "player", { x: 176, y: 42 });
    expect(player(7)).toMatchObject({ shakeAndSinkActive: true, monbgActive: true, alpha: { eva: 12, evb: 8 }, impactLoaded: true });
    expect(player(54)).toMatchObject({ returnSlideActive: false, ellipticalTaskActive: true, hitSplats: [{ x: 192, y: 54, animation: 1 }] });
    expect(player(79)).toMatchObject({ shakeMon2Active: true, targetOffset: { x2: -2, y2: 0 } });
    expect(player(101)).toMatchObject({ active: false, monbgActive: false, alpha: null, impactLoaded: false });

    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/secretPowerSourceAudit.ts",
    ], { cwd: root, encoding: "utf8" })) as Json;
    expect(audit).toMatchObject({
      move: "MOVE_SECRET_POWER", moveId: 290,
      carrier: { setId: 117, set: "FRONTIER_MON_TEDDIURSA", species: "SPECIES_TEDDIURSA", legalRange: [110, 199], challengeNum: 0 },
      factory: { mapType: "MAP_TYPE_INDOOR", environment: "BATTLE_ENVIRONMENT_BUILDING", environmentValue: 8, reachableBodies: ["Move_STRENGTH"] },
      visualDispatch: {
        BATTLE_ENVIRONMENT_GRASS: { value: 0, body: "Move_NEEDLE_ARM" },
        BATTLE_ENVIRONMENT_LONG_GRASS: { value: 1, body: "Move_MAGICAL_LEAF" },
        BATTLE_ENVIRONMENT_BUILDING: { value: 8, body: "Move_STRENGTH" },
      },
    });
    const evidence = readFileSync(resolve(root, "tools/compare/secretPowerStrengthEvidence.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "semanticReceiptSha256", "strengthAtAge", "sceneOnSecretPowerView",
      "render(engine)", "for (let run = 1; run <= 2; run += 1)", "framebuffer ${framebufferMatched}/${fixture.sourceWindow.frameCount}",
    ]) expect(evidence).toContain(token);
  });

  it("keeps portable/source/evidence/production verifier obligations move-owned, exposes a material live-geometry control, preserves coverage, and grants no transfer", () => {
    const portableContracts = [
      ["tools/compare/razorLeafPortable.ts", ["razorLeafAtAge", "sceneOnRazorLeafView", "render(engine)"]],
      ["tools/compare/magicalLeafPortable.ts", ["magicalLeafAtAge", "sceneOnMagicalLeafView", "render(engine)", "secondFreshEvidenceSha256"]],
      ["tools/compare/leafBladePortable.ts", ["leafBladeAtAge", "sceneOnLeafBladeView", "render(engine)", "compactSemanticReceiptSha256"]],
      ["tools/compare/secretPowerStrengthEvidence.ts", ["strengthAtAge", "sceneOnSecretPowerView", "render(engine)", "semanticReceiptSha256"]],
    ] as const;
    for (const [path, tokens] of portableContracts) {
      const portable = readFileSync(resolve(root, path), "utf8");
      for (const token of ["createScratchDir", "tools/run-mgba-probe.py", ...tokens]) expect(portable).toContain(token);
    }
    const battleScene = readFileSync(resolve(root, "src/engine/battleScene.ts"), "utf8");
    for (const token of ["sceneOnRazorLeafView", "sceneOnMagicalLeafView", "sceneOnLeafBladeView", "sceneOnSecretPowerView"]) {
      expect(battleScene).toContain(token);
    }

    const attacker = (geometry: SceneOnPresentationBattler["geometry"]): SceneOnPresentationBattler => ({
      species: "WEEPINBELL", geometry,
    });
    const target: SceneOnPresentationBattler = {
      species: "SHUCKLE",
      geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 17 }, animationCenter: { x: 176, y: 49 }, battlePositionCenter: { x: 176, y: 40 },
      },
    };
    const canonical = createSceneOnMovePresentation({
      move: "RAZOR_LEAF",
      attacker: attacker({
        side: "player", spriteCorner: { x: 40, y: 57 }, animationCenter: { x: 72, y: 97 }, battlePositionCenter: { x: 72, y: 80 },
      }),
      target,
      fieldProfile: { playerHp: 172, playerMaxHp: 172, opponentHp: 127, opponentMaxHp: 127 },
    });
    const altered = createSceneOnMovePresentation({
      move: "RAZOR_LEAF",
      attacker: attacker({
        side: "player", spriteCorner: { x: 48, y: 61 }, animationCenter: { x: 80, y: 101 }, battlePositionCenter: { x: 80, y: 84 },
      }),
      target,
      fieldProfile: { playerHp: 172, playerMaxHp: 172, opponentHp: 127, opponentMaxHp: 127 },
    });
    const canonicalView = sceneOnRazorLeafView({ ...canonical, age: 39 });
    const alteredView = sceneOnRazorLeafView({ ...altered, age: 39 });
    expect(alteredView.particles.map((particle) => [particle.x, particle.y, particle.x2, particle.y2]))
      .not.toEqual(canonicalView.particles.map((particle) => [particle.x, particle.y, particle.x2, particle.y2]));
    const canonicalFrame = render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...canonical, age: 39 },
    });
    const alteredFrame = render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...altered, age: 39 },
    });
    expect(alteredFrame).not.toEqual(canonicalFrame);

    const coverage = json<Json>("ANIMATION_COVERAGE.json");
    const inventory = json<Json>("src/data/gen/factory-animation-inventory.json");
    const level50Moves = new Set<string>(inventory.tiers.level50.moves.map((entry: Json) => entry.move));
    expect(level50Moves.size).toBe(276);
    const exactCount = coverage.entries.filter((entry: Json) =>
      level50Moves.has(entry.move) && entry.status === "exact",
    ).length;
    expect(exactCount).toBe(252);
    expect(coverage.entries.filter((entry: Json) => level50Moves.has(entry.move)
      && (entry.status === "partial" || entry.status === "staged"))).toEqual([]);
    expect(level50Moves.size - exactCount).toBe(24);
    expect(coverage.entries.filter((entry: Json) => [
      "MOVE_RAZOR_LEAF", "MOVE_MAGICAL_LEAF", "MOVE_LEAF_BLADE", "MOVE_SECRET_POWER",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_LEAF_BLADE", status: "exact" }),
      expect.objectContaining({ move: "MOVE_MAGICAL_LEAF", status: "exact" }),
      expect.objectContaining({ move: "MOVE_RAZOR_LEAF", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SECRET_POWER", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: Json) => track.id === "razor-leaf-particle-cutter")).toEqual([{
      id: "razor-leaf-particle-cutter", components: [...trackComponents],
      representatives: ["MOVE_RAZOR_LEAF", "MOVE_SECRET_POWER", "MOVE_MAGICAL_LEAF", "MOVE_LEAF_BLADE"],
      fulfilled: true, goal: trackGoal,
    }]);

    const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const razor = sourceBody(scripts, "Move_RAZOR_LEAF", "Move_NATURE_POWER");
    const magical = sourceBody(scripts, "Move_MAGICAL_LEAF", "Move_ICE_BALL");
    const leafBlade = sourceBody(scripts, "Move_LEAF_BLADE", "Move_DRAGON_DANCE");
    const strength = sourceBody(scripts, "Move_STRENGTH", "Move_TACKLE");
    expect(razor).not.toContain("AnimTask_CycleMagicalLeafPal");
    expect(razor).not.toContain("create_leaf_blade_task");
    expect(magical).not.toContain("create_leaf_blade_task");
    expect(leafBlade).not.toContain("ANIM_TAG_RAZOR_LEAF");
    expect(leafBlade).not.toContain("AnimTask_CycleMagicalLeafPal");
    expect(strength).not.toContain("ANIM_TAG_LEAF");
    expect(strength).not.toContain("create_razor_leaf_particle_sprite");
    const latches = readFileSync(resolve(root, "ANIMATION_LATCHES.md"), "utf8");
    for (const token of [
      "The latch is per-MECHANISM", "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured", "visible events display ONE\n   frame after the RAM write.",
    ]) expect(latches).toContain(token);
    expect(trackGoal).toContain("Factory cannot dispatch the grass Move_NEEDLE_ARM or long-grass Move_MAGICAL_LEAF branches");
    expect(trackGoal).toContain("one display remains only an unmeasured hypothesis");
  });
});
