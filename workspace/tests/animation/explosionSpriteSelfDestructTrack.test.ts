import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SELF_DESTRUCT_EXPLOSION_INTERVAL,
  SELF_DESTRUCT_EXPLOSION_OFFSETS,
  selfDestructAtAge,
} from "../../src/animation/selfDestruct.ts";
import {
  EXPLOSION_BODY_LAST_AGE,
  explosionAtAge,
  explosionBackgroundBlendAtAge,
} from "../../src/animation/explosion.ts";
import {
  DYNAMIC_PUNCH_BODY_LAST_AGE,
  DYNAMIC_PUNCH_EXPLOSION_FIRST_AGE,
  dynamicPunchAtAge,
} from "../../src/animation/dynamicPunch.ts";
import {
  PRESENT_DAMAGE_FRAME_COUNT,
  PRESENT_HEAL_FRAME_COUNT,
  presentAtAge,
} from "../../src/animation/present.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSelfDestructView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

type Json = Record<string, any>;
type Side = "player" | "opponent";

const root = resolve(import.meta.dirname, "../..");

const trackComponents = [
  "asset:ANIM_TAG_EXPLOSION",
  "sprite:gExplosionSpriteTemplate",
  "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_ShakeMon2",
  "subroutine:SelfDestructExplode",
] as const;

const trackGoal = "FULFILLED: MOVE_SELF_DESTRUCT, MOVE_EXPLOSION, MOVE_DYNAMIC_PUNCH, and every MOVE_PRESENT orientation/branch retain independent legal, twice-fresh dense Battle Scene ON receipts through first inactive cleanup. Self Destruct closes 113/113 frames per orientation with its own attacker-red palette, plain EXPLOSION OAM/palette one-display transfer, and neutral-first then two-display ShakeMon2 body; Explosion closes 212/212 per orientation with its own plain EXPLOSION OAM/BG-palette transfer, neutral-first then two-display ShakeMon2 body, and red/black/white background program; Dynamic Punch closes 75/75 per orientation with target monbg alpha target-2, its own ShakeMon and ShakeMon2 target-offset transfers, ordinary fist/explosion OAM, opaque explosion order, and cleanup; Present separately closes player/opponent damage 201/201 and heal 252/252 bodies with its moving ITEM_BAG, five damage EXPLOSIONs, or nine GREEN_SPARKLE plus HealingEffect2 stars, including each branch's OAM/matrix/palette/audio/cleanup receipt. Shared gExplosionSpriteTemplate or ANIM_TAG_EXPLOSION never waives a move-owned source body, latch, framebuffer, branch, or acceptance.";

const receipts = [
  {
    move: "SELF_DESTRUCT", moveId: 120, side: "player" as Side,
    attacker: "SUDOWOODO", attackerId: 185, target: "SHUCKLE", targetId: 213,
    fixture: "tools/compare/fixtures/self-destruct-player-sudowoodo-opponent-shuckle.json",
    fixtureSha256: "0bb6623ef4122c62bfa23ea51365ebd55fb7b1a9506eeb8342c94e6f42cb6e1f",
    scenario: "tools/battle-lab/mechanic-self-destruct-player-sudowoodo-opponent-shuckle.json",
    scenarioSha256: "938338569fe828829d8d68a3d30e4dc0dd8487da668006c49b58c9a88b603d5a",
    schema: "scene-on-portable-component/v1", window: { startFrame: 82, endFrame: 194, frameCount: 113 }, terminalCapture: 534,
  },
  {
    move: "SELF_DESTRUCT", moveId: 120, side: "opponent" as Side,
    attacker: "SUDOWOODO", attackerId: 185, target: "SHUCKLE", targetId: 213,
    fixture: "tools/compare/fixtures/self-destruct-opponent-sudowoodo-player-shuckle.json",
    fixtureSha256: "0317e06582fcc02fee81f115aa02dfbb374c70ee4051af0ffcb55e7c0ffc1b9b",
    scenario: "tools/battle-lab/mechanic-self-destruct-opponent-sudowoodo-player-shuckle.json",
    scenarioSha256: "3a9de04f04462fcf4000546358ff48c206f350f7366e8f63da8c68802ff19901",
    schema: "scene-on-portable-component/v1", window: { startFrame: 86, endFrame: 198, frameCount: 113 }, terminalCapture: 534,
  },
  {
    move: "EXPLOSION", moveId: 153, side: "player" as Side,
    attacker: "GLALIE", attackerId: 347, target: "SHUCKLE", targetId: 213,
    fixture: "tools/compare/fixtures/explosion-player-glalie-opponent-shuckle.json",
    fixtureSha256: "2fab962e1bf60a709155b9a3f2ccb01e81be3e9fa64c3f495db1c2d9e1ccb7cd",
    scenario: "tools/battle-lab/mechanic-explosion-player-glalie-opponent-shuckle.json",
    scenarioSha256: "cb05be69e149e2c1aea88ec93ed63a95ccb6943cba9d6b13f192c70d0a16bbd6",
    schema: "scene-on-portable-component/v1", window: { startFrame: 76, endFrame: 287, frameCount: 212 }, terminalCapture: 534,
  },
  {
    move: "EXPLOSION", moveId: 153, side: "opponent" as Side,
    attacker: "GLALIE", attackerId: 347, target: "SHUCKLE", targetId: 213,
    fixture: "tools/compare/fixtures/explosion-opponent-glalie-player-shuckle.json",
    fixtureSha256: "7afa42a6735dc15c16ae3ded7bb904be4cfe7e4f33408fadfe118250cbeff45a",
    scenario: "tools/battle-lab/mechanic-explosion-opponent-glalie-player-shuckle.json",
    scenarioSha256: "747fd968355d7842c6b272ee31e78bde71f430c4aa89b679e3c1ce9ba368ccdd",
    schema: "scene-on-portable-component/v1", window: { startFrame: 80, endFrame: 291, frameCount: 212 }, terminalCapture: 534,
  },
  {
    move: "DYNAMIC_PUNCH", moveId: 223, side: "player" as Side,
    attacker: "HITMONCHAN", attackerId: 107, target: "SHUCKLE", targetId: 213,
    fixture: "tools/compare/fixtures/dynamic-punch-player-hitmonchan-opponent-shuckle.json",
    fixtureSha256: "83b5b45af0ad85589faaafa65c1aa4ca574ca27de62a9cbae811628d304b9614",
    scenario: "tools/battle-lab/mechanic-dynamic-punch-player-hitmonchan-opponent-shuckle.json",
    scenarioSha256: "f9381763eeea8c61561befefe76b8ba5a5fd151a6e2011f0c5ade94854821bb0",
    schema: "scene-on-portable-component/v1", window: { startFrame: 101, endFrame: 175, frameCount: 75 }, terminalCapture: 434,
  },
  {
    move: "DYNAMIC_PUNCH", moveId: 223, side: "opponent" as Side,
    attacker: "HITMONCHAN", attackerId: 107, target: "SHUCKLE", targetId: 213,
    fixture: "tools/compare/fixtures/dynamic-punch-opponent-hitmonchan-player-shuckle.json",
    fixtureSha256: "08863ad7b6cdad960f9840e0aa509496dc5b49d7f515d47322081478f873f65e",
    scenario: "tools/battle-lab/mechanic-dynamic-punch-opponent-hitmonchan-player-shuckle.json",
    scenarioSha256: "75720da5b5f33b8b9d88563519a384eea97170e83276469f1dfb572337677bf0",
    schema: "scene-on-portable-component/v1", window: { startFrame: 105, endFrame: 179, frameCount: 75 }, terminalCapture: 434,
  },
  {
    move: "PRESENT", moveId: 217, side: "player" as Side, branch: "damage",
    attacker: "DELIBIRD", attackerId: 225, target: "ONIX", targetId: 95,
    fixture: "tools/compare/fixtures/present-player-damage.json",
    fixtureSha256: "6621a04228724f02bfe4b0dd747431a0c951b241b40d58612556762d194b443b",
    scenario: "tools/battle-lab/mechanic-present-player-delibird-opponent-onix.json",
    scenarioSha256: "c3db737a2f38bb92c68f73c90f0297968e746193b827c577c7f928059b592969",
    schema: "present-source-evidence/v1", window: { startFrame: 1012, endFrame: 1212, frameCount: 201 }, terminalCapture: 1468,
    evidenceSha256: "a2cc09d1f2e3424c16412095b63bb028fdae781f3c0d4b9ad7330fc2b18dd6dd",
    rawRgbSha256: "0507c4120384abae357322f65905bb7426d14d55a426853670e18814748e903f",
  },
  {
    move: "PRESENT", moveId: 217, side: "player" as Side, branch: "heal",
    attacker: "DELIBIRD", attackerId: 225, target: "ONIX", targetId: 95,
    fixture: "tools/compare/fixtures/present-player-heal.json",
    fixtureSha256: "5533cc9d2d266bcb560a68fd98f6f19027661b60a64a3df691e95e52a8b82056",
    scenario: "tools/battle-lab/mechanic-present-player-delibird-opponent-onix-heal.json",
    scenarioSha256: "9385b4648aa2ec6607fcac121435603fba9ef5495ffe7f04c25e99cbc87560de",
    schema: "present-source-evidence/v1", window: { startFrame: 1946, endFrame: 2197, frameCount: 252 }, terminalCapture: 3130,
    evidenceSha256: "bbb023fe5b5bfa1ef06cf14a22fddc994f1af61ed4e3c39175d2d65e44406359",
    rawRgbSha256: "b2fe7f30fa358dd7255026be702920ea977afabaf7517cddecdc78feea2e75c7",
  },
  {
    move: "PRESENT", moveId: 217, side: "opponent" as Side, branch: "damage",
    attacker: "DELIBIRD", attackerId: 225, target: "ONIX", targetId: 95,
    fixture: "tools/compare/fixtures/present-opponent-damage.json",
    fixtureSha256: "2472ccf57b2e441407cc3dccede732b6ddf95b382ac7afae1b2038ab12e02d7d",
    scenario: "tools/battle-lab/mechanic-present-opponent-delibird-player-onix.json",
    scenarioSha256: "6c907884d464b02ed369fb1e9a80869c72e810fa4a8321171aa56d272464f561",
    schema: "present-source-evidence/v1", window: { startFrame: 78, endFrame: 278, frameCount: 201 }, terminalCapture: 1468,
    evidenceSha256: "9d752ec604a8d2e7f5f871b156ceb72e6f65902f9f03625787a15f5b8a0a4779",
    rawRgbSha256: "8e9f36a7cd0858ed4d05c13be30fdc24e156df67b23f6d1445d89be3b1948442",
  },
  {
    move: "PRESENT", moveId: 217, side: "opponent" as Side, branch: "heal",
    attacker: "DELIBIRD", attackerId: 225, target: "ONIX", targetId: 95,
    fixture: "tools/compare/fixtures/present-opponent-heal.json",
    fixtureSha256: "67b088416a2c0a67ee6435d8bf73b1267cdd579894c1a12b3d7aae045d943e61",
    scenario: "tools/battle-lab/mechanic-present-opponent-delibird-player-onix-heal.json",
    scenarioSha256: "fdfd65fe906ad14a29773011789726f9ad5b7fee374858573016498846c89f6d",
    schema: "present-source-evidence/v1", window: { startFrame: 1404, endFrame: 1655, frameCount: 252 }, terminalCapture: 1868,
    evidenceSha256: "9a76aeeb3b5ea1f21ab38903d9d3f025c38f2501a76001b7560743faebc13fd5",
    rawRgbSha256: "2e5b78ad63f1968c74a51f7366a1b2267ebfdbd41420bfb3f70a588303cc11e0",
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
    expect(mon.abilitySlot).toBeGreaterThanOrEqual(0);
    expect(mon.abilitySlot).toBeLessThanOrEqual(1);
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

describe("explosion-sprite-self-destruct standalone fulfilled component-track ratchet", () => {
  it("pins the exact five-component boundary plus four distinct source/ELF/ROM bodies and their source tokens", () => {
    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    expect({
      Move_SELF_DESTRUCT: pointer(symbols, "Move_SELF_DESTRUCT"),
      SelfDestructExplode: pointer(symbols, "SelfDestructExplode"),
      Move_SLAM: pointer(symbols, "Move_SLAM"),
      Move_EXPLOSION: pointer(symbols, "Move_EXPLOSION"),
      Explosion1: pointer(symbols, "Explosion1"),
      Move_DEFENSE_CURL: pointer(symbols, "Move_DEFENSE_CURL"),
      Move_DYNAMIC_PUNCH: pointer(symbols, "Move_DYNAMIC_PUNCH"),
      Move_COUNTER: pointer(symbols, "Move_COUNTER"),
      Move_PRESENT: pointer(symbols, "Move_PRESENT"),
      Move_BATON_PASS: pointer(symbols, "Move_BATON_PASS"),
      AnimTask_BlendBattleAnimPal: pointer(symbols, "AnimTask_BlendBattleAnimPal"),
      AnimTask_ShakeMon: pointer(symbols, "AnimTask_ShakeMon"),
      AnimTask_ShakeMon2: pointer(symbols, "AnimTask_ShakeMon2"),
      gExplosionSpriteTemplate: pointer(symbols, "gExplosionSpriteTemplate"),
      gFistFootSpriteTemplate: pointer(symbols, "gFistFootSpriteTemplate"),
      gPresentSpriteTemplate: pointer(symbols, "gPresentSpriteTemplate"),
      gPresentHealParticleSpriteTemplate: pointer(symbols, "gPresentHealParticleSpriteTemplate"),
    }).toEqual({
      Move_SELF_DESTRUCT: "0x082cae19", SelfDestructExplode: "0x082cae9f", Move_SLAM: "0x082caf09",
      Move_EXPLOSION: "0x082cb275", Explosion1: "0x082cb312", Move_DEFENSE_CURL: "0x082cb37c",
      Move_DYNAMIC_PUNCH: "0x082d235a", Move_COUNTER: "0x082d2422",
      Move_PRESENT: "0x082d4191", Move_BATON_PASS: "0x082d42e8",
      AnimTask_BlendBattleAnimPal: "0x08116620", AnimTask_ShakeMon: "0x080d51ac",
      AnimTask_ShakeMon2: "0x080d52d0", gExplosionSpriteTemplate: "0x0859371c",
      gFistFootSpriteTemplate: "0x08595e98", gPresentSpriteTemplate: "0x08592610",
      gPresentHealParticleSpriteTemplate: "0x08592658",
    });

    const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
    const bodies = [
      {
        move: "SELF_DESTRUCT", text: sourceBody(scripts, "Move_SELF_DESTRUCT", "Move_SLAM"),
        bytes: rom.subarray(0x2cae19, 0x2caf09), sourceSha256: "c30c3a1165a6891ee093a509c9f66713415c965867c21caf601fcebb88260be7",
        romSha256: "435511ec024af148297eec62515588cd4725bde6cbd4f719cb2a7df4172eea4a", byteLength: 240,
      },
      {
        move: "EXPLOSION", text: sourceBody(scripts, "Move_EXPLOSION", "Move_DEFENSE_CURL"),
        bytes: rom.subarray(0x2cb275, 0x2cb37c), sourceSha256: "f2669c87edc40e0aa32bfcad1601b286da2f7ec80689f8432b2b6ce2338e8437",
        romSha256: "07568769a9ef558800c0e03f0e2bb388753d98d0a06da2e5e13f69869a317875", byteLength: 263,
      },
      {
        move: "DYNAMIC_PUNCH", text: sourceBody(scripts, "Move_DYNAMIC_PUNCH", "Move_COUNTER"),
        bytes: rom.subarray(0x2d235a, 0x2d2422), sourceSha256: "e7bb3e73a8dd4e3eea230e33b7246da97bf9e20d165c68ddf660793c28598a0d",
        romSha256: "159ab4d2789f7027087f76dfe753534acda0a2b0200302648c3ab5d5be41923b", byteLength: 200,
      },
      {
        move: "PRESENT", text: sourceBody(scripts, "Move_PRESENT", "Move_BATON_PASS"),
        bytes: rom.subarray(0x2d4191, 0x2d42e8), sourceSha256: "0b9ce67d350a42a60c575603cd2c7d0aa7c79e1783f73866a21986312cec54bd",
        romSha256: "f3ea2686ca03253a893f85ad12221a4ddf399c54321247392fff451c0b327166", byteLength: 343,
      },
    ] as const;
    for (const body of bodies) {
      expect(createHash("sha256").update(body.text).digest("hex")).toBe(body.sourceSha256);
      expect([body.bytes.length, createHash("sha256").update(body.bytes).digest("hex")])
        .toEqual([body.byteLength, body.romSha256]);
    }
    expect(new Set(bodies.map((body) => body.sourceSha256)).size).toBe(4);

    const selfDestructExplode = sourceBody(scripts, "SelfDestructExplode", "Move_SLAM");
    const selfDestructExplodeRom = rom.subarray(0x2cae9f, 0x2caf09);
    expect([
      createHash("sha256").update(selfDestructExplode).digest("hex"), selfDestructExplodeRom.length,
      createHash("sha256").update(selfDestructExplodeRom).digest("hex"),
    ]).toEqual([
      "2ab4c467445243c0bc567f2a53ff1fe152c4ce72533d73f996bcf038bb2099f5", 106,
      "5f8476f3d6d69329b4d7a767f731e01f751077a2fcca8b2dcd4bb3fe6fc01b8c",
    ]);

    const [selfDestruct, explosion, dynamicPunch, present] = bodies.map((body) => body.text);
    for (const token of [
      "loadspritegfx ANIM_TAG_EXPLOSION", "AnimTask_BlendBattleAnimPal, 10, F_PAL_ATTACKER, 1, 0, 9, RGB_RED",
      "AnimTask_BlendBattleAnimPal, 10, F_PAL_ATTACKER, 1, 9, 0, RGB_RED",
      "AnimTask_ShakeMon2, 5, ANIM_ATTACKER_FORCE, 6, 0, 38, 1", "waitforvisualfinish",
    ]) expect(selfDestruct).toContain(token);
    expect((selfDestruct.match(/call SelfDestructExplode/g) ?? [])).toHaveLength(2);
    expect((selfDestructExplode.match(/createsprite gExplosionSpriteTemplate/g) ?? [])).toHaveLength(5);
    expect((selfDestructExplode.match(/playsewithpan SE_M_SELF_DESTRUCT/g) ?? [])).toHaveLength(5);

    for (const token of [
      "complex_palette_blend", "selector=F_PAL_BG", "color1=RGB(26, 8, 8)", "color2=RGB_BLACK",
      "AnimTask_ShakeMon2, 5, ANIM_ATTACKER_FORCE, 8, 0, 40, 1",
      "AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 1, 16, 16, RGB_WHITE",
      "AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 3, 16, 0, RGB_WHITE",
    ]) expect(explosion).toContain(token);
    expect((explosion.match(/call Explosion1/g) ?? [])).toHaveLength(2);
    expect((explosion.match(/createsprite gExplosionSpriteTemplate/g) ?? [])).toHaveLength(5);

    for (const token of [
      "loadspritegfx ANIM_TAG_HANDS_AND_FEET", "loadspritegfx ANIM_TAG_IMPACT", "loadspritegfx ANIM_TAG_EXPLOSION_6",
      "monbg ANIM_DEF_PARTNER", "setalpha 12, 8", "create_fist_sprite ANIM_TARGET, 3, x=0, y=0, duration=20",
      "create_basic_hitsplat_sprite ANIM_TARGET, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=0",
      "AnimTask_ShakeMon, 5, ANIM_TARGET, 5, 0, 7, 1", "AnimTask_ShakeMon2, 5, ANIM_TARGET, 5, 0, 28, 1",
      "clearmonbg ANIM_DEF_PARTNER", "blendoff",
    ]) expect(dynamicPunch).toContain(token);
    expect((dynamicPunch.match(/createsprite gExplosionSpriteTemplate/g) ?? [])).toHaveLength(5);

    for (const token of [
      "loadspritegfx ANIM_TAG_ITEM_BAG", "createvisualtask AnimTask_IsHealingMove, 2",
      "create_present_sprite ANIM_TARGET, 2", "jumpretfalse PresentDamage", "jumprettrue PresentHeal",
      "loadspritegfx ANIM_TAG_GREEN_SPARKLE", "loadspritegfx ANIM_TAG_BLUE_STAR", "call HealingEffect2",
    ]) expect(present).toContain(token);
    expect((present.match(/createsprite gExplosionSpriteTemplate/g) ?? [])).toHaveLength(5);
    expect((present.match(/create_present_heal_particle_sprite/g) ?? [])).toHaveLength(9);
  });

  it("pins all ten untouched complete legal three-Pokemon party-only bilateral/branch fixtures, scenarios, hashes, and unthinned windows", () => {
    expect(receipts).toHaveLength(10);
    expect(new Set(receipts.map((receipt) => `${receipt.move}/${receipt.side}/${
      "branch" in receipt ? receipt.branch : "body"
    }`)).size).toBe(10);
    for (const expected of receipts) {
      const fixture = json<Json>(expected.fixture);
      const stage = json<Json>(expected.scenario);
      expect(digest(expected.fixture)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenario)).toBe(expected.scenarioSha256);
      expect(fixture.schema).toBe(expected.schema);
      expect(fixture.scenario).toBe(expected.scenario);
      expect(fixture.oracleProfile ?? "battle-scene-on").toBe("battle-scene-on");
      expect(fixture.denseWindow).toMatchObject({
        startFrame: expected.window.startFrame,
        endFrame: expected.window.endFrame,
      });
      expect(fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1)
        .toBe(expected.window.frameCount);
      if (expected.move === "PRESENT") {
        expect(fixture).toMatchObject({
          orientation: expected.side === "player" ? "player-to-opponent" : "opponent-to-player",
          branch: expected.branch, occurrence: expect.any(Number),
          evidenceSha256: expected.evidenceSha256, rawRgbSha256: expected.rawRgbSha256,
        });
      } else {
        expect(fixture).toMatchObject({
          move: expected.move, attackerSide: expected.side, appStage: { presentationAge: 0 },
          attacker: { species: expected.attacker, geometry: { side: expected.side } },
          target: { species: expected.target, geometry: { side: expected.side === "player" ? "opponent" : "player" } },
        });
      }
      expect(stage).toMatchObject({
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, battleNum: 0,
      });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expect(Object.keys(stage.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteLegalParty(stage.overrides.parties.player);
      expectCompleteLegalParty(stage.overrides.parties.opponent);
      expect(stage.trace.segments.length).toBeGreaterThanOrEqual(4);
      expect(stage.trace.segments.every((segment: Json) =>
        Number.isInteger(segment.frames) && segment.frames > 0 && Array.isArray(segment.buttons),
      )).toBe(true);
      expect(stage.trace.captureFrames[0]).toBe(0);
      expect(stage.trace.captureFrames.at(-1)).toBe(expected.terminalCapture);
      const attacker = stage.overrides.parties[expected.side][0];
      const target = stage.overrides.parties[expected.side === "player" ? "opponent" : "player"][0];
      expect(attacker.species).toBe(expected.attackerId);
      expect(target.species).toBe(expected.targetId);
      expect(attacker.moves).toContain(expected.moveId);
    }
  });

  it("keeps Self Destruct's own 113/113 bilateral ordinary EXPLOSION/palette transfer, neutral-first ShakeMon2 body, audio, and cleanup separate", () => {
    const own = receipts.filter((receipt) => receipt.move === "SELF_DESTRUCT");
    expect(own.map((receipt) => receipt.window)).toEqual([
      { startFrame: 82, endFrame: 194, frameCount: 113 },
      { startFrame: 86, endFrame: 198, frameCount: 113 },
    ]);
    expect(own.reduce((sum, receipt) => sum + receipt.window.frameCount, 0)).toBe(226);
    for (const expected of own) {
      const fixture = json<Json>(expected.fixture);
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-component/v1", move: "SELF_DESTRUCT", attackerSide: expected.side,
        probe: "tools/compare/selfDestructProbe.py", appStage: { presentationAge: 0 },
        attacker: { species: "SUDOWOODO", geometry: { side: expected.side } },
        target: { species: "SHUCKLE", geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
    }
    const player = (age: number) => selfDestructAtAge(age, "player", { x: 72, y: 80 });
    expect({ interval: SELF_DESTRUCT_EXPLOSION_INTERVAL, offsets: SELF_DESTRUCT_EXPLOSION_OFFSETS.length })
      .toEqual({ interval: 8, offsets: 10 });
    expect(player(0).explosions).toEqual([{ spawnIndex: 0, age: 0, x: 72, y: 80, frame: 0 }]);
    expect(player(72).explosions).toContainEqual(expect.objectContaining({ spawnIndex: 9, x: 88, y: 96 }));
    expect(player(92).explosions).toEqual([]);
    expect([0, 1, 2, 3, 74, 75, 76].map((age) => player(age).battlerX2))
      .toEqual([-6, -6, 6, 6, 0, 0, 0]);
    expect([0, 1, 2, 17, 18, 94, 95, 109, 110, 111, 112].map((age) => player(age).attackerPaletteY))
      .toEqual([0, 0, 1, 8, 9, 9, 8, 1, 1, 0, 0]);
    expect(player(112)).toMatchObject({ explosions: [], battlerX2: 0, attackerPaletteY: 0 });

    const portable = readFileSync(resolve(root, "tools/compare/selfDestructPortable.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "selfDestructAtAge", "sceneOnSelfDestructView",
      "activeHardwareExplosionCount", "prior.explosions.length", "priorFrame.fadedPalette", "soundShape",
      "render(engine)", "SELF_DESTRUCT source components ${matches}/${total}; framebuffer ${framebufferMatches}/${total}",
    ]) expect(portable).toContain(token);
  });

  it("keeps Explosion's own 212/212 bilateral plain EXPLOSION/BG-palette transfer, red/black/white program, ShakeMon2, audio, and cleanup separate", () => {
    const own = receipts.filter((receipt) => receipt.move === "EXPLOSION");
    expect(own.map((receipt) => receipt.window)).toEqual([
      { startFrame: 76, endFrame: 287, frameCount: 212 },
      { startFrame: 80, endFrame: 291, frameCount: 212 },
    ]);
    expect(own.reduce((sum, receipt) => sum + receipt.window.frameCount, 0)).toBe(424);
    for (const expected of own) {
      const fixture = json<Json>(expected.fixture);
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-component/v1", move: "EXPLOSION", attackerSide: expected.side,
        probe: "tools/compare/selfDestructProbe.py", appStage: { presentationAge: 0 },
        attacker: { species: "GLALIE", geometry: { side: expected.side } },
        target: { species: "SHUCKLE", geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
    }
    const player = (age: number) => explosionAtAge(age, "player", { x: 72, y: 80 });
    expect(EXPLOSION_BODY_LAST_AGE).toBe(211);
    expect(player(72).explosions).toContainEqual(expect.objectContaining({ spawnIndex: 9, x: 88, y: 96 }));
    expect([0, 1, 2, 3, 76, 77, 78, 79].map((age) => player(age).battlerX2))
      .toEqual([-8, -8, 8, 8, -8, -8, 0, 0]);
    expect([0, 7, 8, 16, 17, 89, 90, 92, 93, 150, 151, 207, 211].map(explosionBackgroundBlendAtAge))
      .toEqual([
        { kind: "red", coefficient: 8 }, { kind: "red", coefficient: 8 },
        { kind: "black", coefficient: 8 }, { kind: "black", coefficient: 8 },
        { kind: "red", coefficient: 8 }, { kind: "black", coefficient: 8 },
        { kind: "none", coefficient: 0 }, { kind: "none", coefficient: 0 },
        { kind: "white", coefficient: 16 }, { kind: "white", coefficient: 16 },
        { kind: "white", coefficient: 15 }, { kind: "white", coefficient: 1 },
        { kind: "none", coefficient: 0 },
      ]);
    expect(player(211)).toMatchObject({ active: true, explosions: [], battlerX2: 0, backgroundBlend: { kind: "none", coefficient: 0 } });
    expect(player(212).active).toBe(false);

    const portable = readFileSync(resolve(root, "tools/compare/explosionPortable.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "explosionAtAge", "sceneOnExplosionView",
      "hardwarePalette", "previous.explosions.length", "shakeTasks.length === 2", "backgroundBlend",
      "SE_M_EXPLOSION", "render(engine)",
      "EXPLOSION source components ${matches}/${total}; seam ${seamMatches}/${total}; framebuffer ${framebufferMatches}/${total}",
    ]) expect(portable).toContain(token);
  });

  it("keeps Dynamic Punch's own 75/75 bilateral monbg-alpha target-2, ShakeMon/ShakeMon2, opaque fist/explosion order, audio, and cleanup separate", () => {
    const own = receipts.filter((receipt) => receipt.move === "DYNAMIC_PUNCH");
    expect(own.map((receipt) => receipt.window)).toEqual([
      { startFrame: 101, endFrame: 175, frameCount: 75 },
      { startFrame: 105, endFrame: 179, frameCount: 75 },
    ]);
    expect(own.reduce((sum, receipt) => sum + receipt.window.frameCount, 0)).toBe(150);
    for (const expected of own) {
      const fixture = json<Json>(expected.fixture);
      expect(fixture).toMatchObject({
        schema: "scene-on-portable-component/v1", move: "DYNAMIC_PUNCH", attackerSide: expected.side,
        probe: "tools/compare/dynamicPunchProbe.py", appStage: { presentationAge: 0 },
        attacker: { species: "HITMONCHAN", geometry: { side: expected.side } },
        target: { species: "SHUCKLE", geometry: { side: expected.side === "player" ? "opponent" : "player" } },
      });
    }
    const player = (age: number) => dynamicPunchAtAge(age, "player", { x: 176, y: 49 }, { x: 176, y: 40 });
    expect(DYNAMIC_PUNCH_EXPLOSION_FIRST_AGE).toBe(19);
    expect(player(0)).toMatchObject({
      fistVisible: true, hitsplatVisible: true, targetOnMonBg: true, alpha: { eva: 12, evb: 8 }, sound: "SE_M_VITAL_THROW2",
    });
    expect([0, 1, 2, 3, 12, 13].map((age) => player(age).targetX2)).toEqual([0, 0, 5, 5, 0, 0]);
    expect(player(19).explosions).toEqual([{ spawnIndex: 0, age: 0, x: 176, y: 40, frame: 0 }]);
    expect(player(27).explosions).toContainEqual(expect.objectContaining({ spawnIndex: 1, x: 200, y: 16 }));
    expect([19, 20, 21, 22, 71, 72, 73].map((age) => player(age).targetX2))
      .toEqual([-5, -5, 5, 5, -5, -5, 0]);
    expect([19, 27, 35, 43, 51].map((age) => player(age).sound))
      .toEqual(Array(5).fill("SE_M_SELF_DESTRUCT"));
    expect(DYNAMIC_PUNCH_BODY_LAST_AGE).toBe(74);
    expect(player(74)).toMatchObject({ targetOnMonBg: false, alpha: null, active: true });
    expect(player(75).active).toBe(false);

    const portable = readFileSync(resolve(root, "tools/compare/dynamicPunchPortable.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "dynamicPunchAtAge", "sceneOnDynamicPunchView",
      "oracle.bldcnt === 16192 && oracle.bldalpha === 2060", "targetSprite.x2 === expected.targetX2",
      "hardwareFists === Number(prior.fistVisible)", "hardwareExplosions === prior.explosions.length",
      "SE_M_VITAL_THROW2", "SE_M_SELF_DESTRUCT", "render(engine)",
      "DYNAMIC_PUNCH source components + typed seam ${matches}/${total}; framebuffer ${framebufferMatches}/${total}",
    ]) expect(portable).toContain(token);
  });

  it("keeps all four Present orientation/branch bodies at 201/201 or 252/252 with their own bag, branch effects, matrices, palette/audio topology, semantic/raw receipts, and cleanup", () => {
    const own = receipts.filter((receipt) => receipt.move === "PRESENT");
    expect(own.map((receipt) => [receipt.side, receipt.branch, receipt.window])).toEqual([
      ["player", "damage", { startFrame: 1012, endFrame: 1212, frameCount: 201 }],
      ["player", "heal", { startFrame: 1946, endFrame: 2197, frameCount: 252 }],
      ["opponent", "damage", { startFrame: 78, endFrame: 278, frameCount: 201 }],
      ["opponent", "heal", { startFrame: 1404, endFrame: 1655, frameCount: 252 }],
    ]);
    expect(own.reduce((sum, receipt) => sum + receipt.window.frameCount, 0)).toBe(906);
    for (const expected of own) {
      const fixture = json<Json>(expected.fixture);
      expect(fixture).toMatchObject({
        schema: "present-source-evidence/v1", probe: "tools/compare/presentProbe.py",
        orientation: expected.side === "player" ? "player-to-opponent" : "opponent-to-player",
        branch: expected.branch, denseWindow: expected.window,
        evidenceSha256: expected.evidenceSha256, rawRgbSha256: expected.rawRgbSha256,
      });
      expect(fixture.lifecycleCounts).toEqual(expected.branch === "damage"
        ? {
            gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 0,
            gExplosionSpriteTemplate: 5, gHealingBlueStarSpriteTemplate: 0,
          }
        : {
            gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 9,
            gExplosionSpriteTemplate: 0, gHealingBlueStarSpriteTemplate: 4,
          });
    }
    const player = { x: 72, y: 80 } as const;
    const opponent = { x: 176, y: 40 } as const;
    expect(PRESENT_DAMAGE_FRAME_COUNT).toBe(201);
    expect(PRESENT_HEAL_FRAME_COUNT).toBe(252);
    expect(presentAtAge(4, "damage", "player", player, opponent).bag)
      .toMatchObject({ x: 72, y: 75, y2: -5, callback: "AnimItemSteal_Step1" });
    expect(presentAtAge(63, "damage", "player", player, opponent).bag)
      .toMatchObject({ x: 174, y: 51, callback: "AnimItemSteal_Step2" });
    expect([118, 126, 134, 142, 150].map((age) =>
      presentAtAge(age, "damage", "player", player, opponent).explosions.at(-1)?.sourceIndex,
    )).toEqual([0, 1, 2, 3, 4]);
    expect([121, 126, 131, 136, 141, 146, 151, 156, 161].map((age) =>
      presentAtAge(age, "heal", "player", player, opponent).greenSparkles.at(-1)?.sourceIndex,
    )).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect([198, 207, 216, 225].map((age) =>
      presentAtAge(age, "heal", "player", player, opponent).blueStars.at(-1)?.sourceIndex,
    )).toEqual([0, 1, 2, 3]);
    expect(presentAtAge(126, "damage", "opponent", opponent, player).explosions.at(-1))
      .toMatchObject({ sourceIndex: 1, x: 48, y: 56, callback: "AnimSpriteOnMonPos" });
    expect(presentAtAge(200, "damage", "player", player, opponent))
      .toMatchObject({ active: false, itemBagLoaded: false, explosionLoaded: false, explosions: [] });
    expect(presentAtAge(251, "heal", "player", player, opponent))
      .toMatchObject({ active: false, itemBagLoaded: false, greenSparkleLoaded: false, blueStarLoaded: false, greenSparkles: [], blueStars: [] });

    const audit = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/presentSourceAudit.ts",
    ], { cwd: root, encoding: "utf8" });
    expect(audit).toContain("set 118 DELIBIRD is the sole/lowest");
    expect(audit).toContain("Present bag -> 5 EXPLOSION damage or 9 GREEN_SPARKLE + target HealingEffect2");
    const presentPortable = readFileSync(resolve(root, "tools/compare/presentPortable.ts"), "utf8");
    const presentEvidence = readFileSync(resolve(root, "tools/compare/presentEvidence.ts"), "utf8");
    for (const token of [
      "createScratchDir", "tools/run-mgba-probe.py", "for (let run = 1; run <= freshCount; run += 1)",
      "compactSemanticReceiptSha256(probe)", "raw RGB receipt drift", "sceneOnPresentView", "render(engine)",
      "component ${componentMatches}/${total}; seam ${seamMatches}/${total}; framebuffer ${framebufferMatches}/${total}",
    ]) expect(presentPortable).toContain(token);
    for (const token of [
      "compactSemanticReceiptSha256(probe)", "frame.hardwareOam.length !== 128", "frame.hardwareMatrices.length !== 32",
      "frame.se1 === undefined || frame.se2 === undefined", "const receipts = [verify(\"fresh-1\"), verify(\"fresh-2\")]",
    ]) expect(presentEvidence).toContain(token);
    const fresh = {
      schema: "present-transport-test",
      setup: { preCheckpointCaptures: [], name: "é", nested: { value: 1 } },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"present-transport-test\",\"setup\":{\"name\":\"\\u00e9\",\"nested\":{\"value\":1}},\"rows\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(createHash("sha256").update(historic).digest("hex"));
    expect(() => compactSemanticReceiptSha256({ ...fresh, setup: { name: "é", nested: { value: 1 } } }))
      .toThrow("setup.preCheckpointCaptures must be []");
  });

  it("keeps portable/source/evidence/production obligations move-owned, proves live geometry reaches the compositor, preserves exact coverage, and grants no transfer", () => {
    const contracts = [
      ["tools/compare/selfDestructPortable.ts", ["selfDestructAtAge", "sceneOnSelfDestructView", "render(engine)"]],
      ["tools/compare/explosionPortable.ts", ["explosionAtAge", "sceneOnExplosionView", "render(engine)"]],
      ["tools/compare/dynamicPunchPortable.ts", ["dynamicPunchAtAge", "sceneOnDynamicPunchView", "render(engine)"]],
      ["tools/compare/presentPortable.ts", ["presentAtAge", "sceneOnPresentView", "compactSemanticReceiptSha256", "render(engine)"]],
      ["tools/compare/presentEvidence.ts", ["compactSemanticReceiptSha256", "tools/run-mgba-probe.py"]],
    ] as const;
    for (const [path, tokens] of contracts) {
      const source = readFileSync(resolve(root, path), "utf8");
      for (const token of ["createScratchDir", ...tokens]) expect(source).toContain(token);
    }
    const battleScene = readFileSync(resolve(root, "src/engine/battleScene.ts"), "utf8");
    for (const token of ["sceneOnSelfDestructView", "sceneOnExplosionView", "sceneOnDynamicPunchView", "sceneOnPresentView"]) {
      expect(battleScene).toContain(token);
    }
    expect(readFileSync(resolve(root, "src/engine/core.ts"), "utf8")).toContain("sceneOnPresentation");

    const attacker = (geometry: SceneOnPresentationBattler["geometry"]): SceneOnPresentationBattler => ({
      species: "SUDOWOODO", geometry,
    });
    const target: SceneOnPresentationBattler = {
      species: "SHUCKLE",
      geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 17 }, animationCenter: { x: 176, y: 49 }, battlePositionCenter: { x: 176, y: 40 },
      },
    };
    const canonical = createSceneOnMovePresentation({
      move: "SELF_DESTRUCT",
      attacker: attacker({
        side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 },
      }),
      target,
      fieldProfile: { playerHp: 0, playerMaxHp: 177, opponentHp: 95, opponentMaxHp: 95 },
    });
    const altered = createSceneOnMovePresentation({
      move: "SELF_DESTRUCT",
      attacker: attacker({
        side: "player", spriteCorner: { x: 48, y: 60 }, animationCenter: { x: 80, y: 92 }, battlePositionCenter: { x: 80, y: 84 },
      }),
      target,
      fieldProfile: { playerHp: 0, playerMaxHp: 177, opponentHp: 95, opponentMaxHp: 95 },
    });
    const canonicalView = sceneOnSelfDestructView({ ...canonical, age: 8 });
    const alteredView = sceneOnSelfDestructView({ ...altered, age: 8 });
    expect(alteredView.explosions.map((sprite) => [sprite.x, sprite.y]))
      .not.toEqual(canonicalView.explosions.map((sprite) => [sprite.x, sprite.y]));
    const canonicalFrame = render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...canonical, age: 8 },
    });
    const alteredFrame = render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...altered, age: 8 },
    });
    expect(alteredFrame).not.toEqual(canonicalFrame);

    const coverage = json<Json>("ANIMATION_COVERAGE.json");
    const inventory = json<Json>("src/data/gen/factory-animation-inventory.json");
    const level50Moves = new Set<string>(inventory.tiers.level50.moves.map((entry: Json) => entry.move));
    expect(level50Moves.size).toBe(276);
    const exactCount = coverage.entries.filter((entry: Json) => level50Moves.has(entry.move) && entry.status === "exact").length;
    expect(exactCount).toBe(232);
    expect(coverage.entries.filter((entry: Json) => level50Moves.has(entry.move)
      && (entry.status === "partial" || entry.status === "staged"))).toEqual([]);
    expect(level50Moves.size - exactCount).toBe(44);
    expect(coverage.entries.filter((entry: Json) => [
      "MOVE_SELF_DESTRUCT", "MOVE_EXPLOSION", "MOVE_PRESENT", "MOVE_DYNAMIC_PUNCH",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_DYNAMIC_PUNCH", status: "exact" }),
      expect.objectContaining({ move: "MOVE_EXPLOSION", status: "exact" }),
      expect.objectContaining({ move: "MOVE_PRESENT", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SELF_DESTRUCT", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: Json) => track.id === "explosion-sprite-self-destruct")).toEqual([{
      id: "explosion-sprite-self-destruct", components: [...trackComponents],
      representatives: ["MOVE_SELF_DESTRUCT", "MOVE_EXPLOSION", "MOVE_PRESENT", "MOVE_DYNAMIC_PUNCH"],
      fulfilled: true, goal: trackGoal,
    }]);

    const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const selfDestruct = sourceBody(scripts, "Move_SELF_DESTRUCT", "Move_SLAM");
    const explosion = sourceBody(scripts, "Move_EXPLOSION", "Move_DEFENSE_CURL");
    const dynamicPunch = sourceBody(scripts, "Move_DYNAMIC_PUNCH", "Move_COUNTER");
    const present = sourceBody(scripts, "Move_PRESENT", "Move_BATON_PASS");
    expect(selfDestruct).not.toContain("complex_palette_blend");
    expect(explosion).not.toContain("F_PAL_ATTACKER");
    expect(dynamicPunch).not.toContain("SelfDestructExplode");
    expect(present).not.toContain("AnimTask_ShakeMon2");
    const latches = readFileSync(resolve(root, "ANIMATION_LATCHES.md"), "utf8");
    for (const token of [
      "The latch is per-MECHANISM", "Never inherit a latch from a sibling move.",
      "Default expectation where nothing is measured", "visible events display ONE\n   frame after the RAM write.",
    ]) expect(latches).toContain(token);
    expect(trackGoal).toContain("Shared gExplosionSpriteTemplate or ANIM_TAG_EXPLOSION never waives a move-owned source body, latch, framebuffer, branch, or acceptance.");
  });
});
