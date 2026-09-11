import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHARM_BODY_FRAME_COUNT,
  CHARM_HEART_CREATION_AGES,
  CHARM_TEARDOWN_AGE,
  charmAtAge,
} from "../../src/animation/charm.ts";
import {
  COVET_CLEANUP_AGE,
  COVET_FRAME_COUNT,
  COVET_ITEM_BAG_LOAD_AGE,
  COVET_SHAKE_START_AGE,
  covetAtAge,
} from "../../src/animation/covet.ts";
import {
  FAKE_TEARS_SOURCE_FRAME_COUNT,
  FAKE_TEARS_SOUND_RESTART_AGES,
  FAKE_TEARS_TEAR_SPAWN_AGES,
  fakeTearsAtAge,
} from "../../src/animation/fakeTears.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCharmView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  TICKLE_FRAME_COUNT,
  tickleAtAge,
  tickleEyesAtAge,
  ticklePaletteBlackCoeffAtAge,
} from "../../src/animation/tickle.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");

const trackComponents = [
  "task:AnimTask_RockMonBackAndForth",
  "asset:ANIM_TAG_MAGENTA_HEART",
  "sprite:gMagentaHeartSpriteTemplate",
] as const;

const trackGoal = "FULFILLED: This exact three-component boundary remains fulfilled only because MOVE_CHARM, MOVE_COVET, MOVE_FAKE_TEARS, and MOVE_TICKLE each independently retain its own authoritative source body, source-derived reducer, typed Scene-ON seam, production compositor, complete legal bilateral party-only Battle Scene ON fixtures, and twice-fresh unthinned source/component/seam/hardware/palette/register/audio/immutable-state/raw-RGB/actual-core framebuffer proof. MOVE_CHARM independently owns its legal set-187 MINUN versus SHUCKLE 93/93 RockMonBackAndForth(attacker,2,0) plus three gMagentaHeartSpriteTemplate body and four clear teardown frames. MOVE_COVET independently owns its legal set-203 LINOONE versus SHUCKLE 113/113 loaded/body plus 1/1 cleanup frame: its Charm-derived prefix, load-only ITEM_BAG, target ShakeMon2, and Dizzy Punch loop. MOVE_FAKE_TEARS independently owns its corrected legal set-267 DELCATTY 87/87 BlendParticle/RockMonBackAndForth(attacker,2,1)/eight-tear source body and its distinct 322/322 resolved-stat-drop controller/shared-framebuffer window. MOVE_TICKLE independently owns its corrected legal set-138 OMANYTE 205/205 EYE_SPARKLE/palette/SwayMon/RockMonBackAndForth(target,6,2) body. Rules 1, 2, and 5 remain per-mechanism: no rock, heart, palette, shake, audio, timing, hardware, latch, compositor, or acceptance fact transfers; one display is only an unmeasured hypothesis. The asserted-empty setup.preCheckpointCaptures transport normalization belongs only to Fake Tears and Tickle. Historical species-301 Nincada and species-139 Omastar receipts are provenance only and grant no acceptance.";

const receipts = [
  {
    move: "CHARM", side: "player", moveId: 204, attacker: 354, target: 213,
    fixture: "tools/compare/fixtures/charm-player-minun-opponent-shuckle.json",
    fixtureSha256: "0fa79b8808d26600c739cb26a041e82c5dbd62ee687ad1d71d015f70ba5a7003",
    scenario: "tools/battle-lab/mechanic-charm-player-minun-opponent-shuckle.json",
    scenarioSha256: "c1ff8caca15c31b469823cdf3eec19c381216e34877a9ff477c4eb844f236718",
    window: { startFrame: 72, endFrame: 164, frameCount: 93 },
  },
  {
    move: "CHARM", side: "opponent", moveId: 204, attacker: 354, target: 213,
    fixture: "tools/compare/fixtures/charm-opponent-minun-player-shuckle.json",
    fixtureSha256: "ee4d466c5a84f5d2a6e08d410158869912d6dc52521baa3bd048a1f3c40660d3",
    scenario: "tools/battle-lab/mechanic-charm-opponent-minun-player-shuckle.json",
    scenarioSha256: "1d396c8d2f1eda6ca79a0acd07429f7c0376abf0776ab1f6606e8f9910f4f872",
    window: { startFrame: 76, endFrame: 168, frameCount: 93 },
  },
  {
    move: "COVET", side: "player", moveId: 343, attacker: 289, target: 213,
    fixture: "tools/compare/fixtures/covet-player-linoone-opponent-shuckle.json",
    fixtureSha256: "1326b7d2a85c944d660648cbf2d98916d3ce0b4b684b92f59fcdc6e03b3fbcd3",
    scenario: "tools/battle-lab/mechanic-covet-player-linoone-opponent-shuckle.json",
    scenarioSha256: "36f9649df284113ece79622817c78862a7da78ceb93f818322454eb6a1cb4aef",
    window: { startFrame: 73, endFrame: 186, frameCount: 114 },
  },
  {
    move: "COVET", side: "opponent", moveId: 343, attacker: 289, target: 213,
    fixture: "tools/compare/fixtures/covet-opponent-linoone-player-shuckle.json",
    fixtureSha256: "7d2c75bfd52197ddec188037247255a9cefc45ac0f033e9a863ddde25cda59f5",
    scenario: "tools/battle-lab/mechanic-covet-opponent-linoone-player-shuckle.json",
    scenarioSha256: "8615fff4fe6a3ebac9b28297f0a5e44c7b099b3900756c84bebdb95a4d852137",
    window: { startFrame: 77, endFrame: 190, frameCount: 114 },
  },
  {
    move: "FAKE_TEARS", side: "player", moveId: 313, attacker: 316, target: 213,
    fixture: "tools/compare/fixtures/fake-tears-player-delcatty-opponent-shuckle.json",
    fixtureSha256: "e8abd82ef6deeeeb54cd3779d7878cfc1d1e2f8c2fd6f99c0f15231cdc2718b6",
    scenario: "tools/compare/fixtures/mechanic-fake-tears-player-delcatty-opponent-shuckle.json",
    scenarioSha256: "06665953df32c4e638d414406545ee3751ed990e5e6d9fb333b684020e30e820",
    window: { startFrame: 76, endFrame: 162, frameCount: 87 },
  },
  {
    move: "FAKE_TEARS", side: "opponent", moveId: 313, attacker: 316, target: 213,
    fixture: "tools/compare/fixtures/fake-tears-opponent-delcatty-player-shuckle.json",
    fixtureSha256: "36b73e1411e6f7e2a58abf06e2e097e55022d535d0311da82b9e48783d4b9b15",
    scenario: "tools/compare/fixtures/mechanic-fake-tears-opponent-delcatty-player-shuckle.json",
    scenarioSha256: "a06c6d4edde5d01ae4bdd3502352b83a3a9cc328e0becee80eeda32a3b02dcda",
    window: { startFrame: 80, endFrame: 166, frameCount: 87 },
  },
  {
    move: "TICKLE", side: "player", moveId: 321, attacker: 138, target: 95,
    fixture: "tools/compare/fixtures/tickle-player-omanyte-opponent-onix.json",
    fixtureSha256: "10a22f40edbcae9b666ef7fa306c0905cfccd8e076ed2cd8e75f01aa82d7cd8e",
    scenario: "tools/battle-lab/mechanic-tickle-player-omanyte-opponent-onix.json",
    scenarioSha256: "6b89802aea10967dcf994da3a842403ba53fd320b2cc7fd701886a2aa849292a",
    window: { startFrame: 288, endFrame: 492, frameCount: 205 },
  },
  {
    move: "TICKLE", side: "opponent", moveId: 321, attacker: 138, target: 95,
    fixture: "tools/compare/fixtures/tickle-opponent-omanyte-player-onix.json",
    fixtureSha256: "311ba32aebe105ac708ee48eb141a5465af3dfdeecb5f6583f71259a1017c4ea",
    scenario: "tools/battle-lab/mechanic-tickle-opponent-omanyte-player-onix.json",
    scenarioSha256: "05fc36b025dfec8fb0516138acfe176aa84968a7c67b004e17d92ac513b07446",
    window: { startFrame: 288, endFrame: 492, frameCount: 205 },
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

function body(source: string, start: string, end: string): string {
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

describe("rock-mon-back-and-forth-magenta-heart standalone fulfilled component-track ratchet", () => {
  it("pins the exact three-component boundary plus four authoritative source bodies, ELF intervals, ROM hashes, and source tokens", () => {
    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    expect({
      Move_CHARM: pointer(symbols, "Move_CHARM"), Move_ROLLOUT: pointer(symbols, "Move_ROLLOUT"),
      Move_COVET: pointer(symbols, "Move_COVET"), Move_VOLT_TACKLE: pointer(symbols, "Move_VOLT_TACKLE"),
      Move_FAKE_TEARS: pointer(symbols, "Move_FAKE_TEARS"), Move_AIR_CUTTER: pointer(symbols, "Move_AIR_CUTTER"),
      Move_TICKLE: pointer(symbols, "Move_TICKLE"), Move_WATER_SPOUT: pointer(symbols, "Move_WATER_SPOUT"),
      AnimTask_RockMonBackAndForth: pointer(symbols, "AnimTask_RockMonBackAndForth"),
      AnimTask_RockMonBackAndForth_Step: pointer(symbols, "AnimTask_RockMonBackAndForth_Step"),
      AnimMagentaHeart: pointer(symbols, "AnimMagentaHeart"),
      gMagentaHeartSpriteTemplate: pointer(symbols, "gMagentaHeartSpriteTemplate"),
      gEyeSparkleSpriteTemplate: pointer(symbols, "gEyeSparkleSpriteTemplate"),
      AnimTask_BlendParticle: pointer(symbols, "AnimTask_BlendParticle"),
      AnimTask_SwayMon: pointer(symbols, "AnimTask_SwayMon"),
    }).toEqual({
      Move_CHARM: "0x082cd71b", Move_ROLLOUT: "0x082cd75e",
      Move_COVET: "0x082cf137", Move_VOLT_TACKLE: "0x082cf194",
      Move_FAKE_TEARS: "0x082cecc8", Move_AIR_CUTTER: "0x082ced58",
      Move_TICKLE: "0x082ceef7", Move_WATER_SPOUT: "0x082cef63",
      AnimTask_RockMonBackAndForth: "0x0815c478",
      AnimTask_RockMonBackAndForth_Step: "0x0815c548",
      AnimMagentaHeart: "0x08105e60",
      gMagentaHeartSpriteTemplate: "0x08593970",
      gEyeSparkleSpriteTemplate: "0x08593a84",
      AnimTask_BlendParticle: "0x08116848",
      AnimTask_SwayMon: "0x080d5eb8",
    });

    const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
    const bodies = [
      {
        move: "CHARM", text: body(scripts, "Move_CHARM", "Move_ROLLOUT"), bytes: rom.subarray(0x2cd71b, 0x2cd75e),
        sourceSha256: "d3f31fed0b2bf6975869b365182fd7f4692fe2b7e41b48e1ef454d5e0fac7215",
        romSha256: "fcda126ee94de8d6fa83937f42ae6aa81267026a34dffcb678c9562b45263748", byteLength: 67,
      },
      {
        move: "COVET", text: body(scripts, "Move_COVET", "Move_VOLT_TACKLE"), bytes: rom.subarray(0x2cf137, 0x2cf194),
        sourceSha256: "0cc5a958cfc37507450b06ddf2933f480602e93e020579b722dd420294fd72ee",
        romSha256: "d56e0959a59de29554f1db7cea6146bca27dde73b1e37a8f26e27038cded8d96", byteLength: 93,
      },
      {
        move: "FAKE_TEARS", text: body(scripts, "Move_FAKE_TEARS", "Move_AIR_CUTTER"), bytes: rom.subarray(0x2cecc8, 0x2ced58),
        sourceSha256: "18455d81ec7438108d0920fba959cfa4c5b9dd5c43e159718d71ce794fef4740",
        romSha256: "a1d5fe03cf1e2995d36c8669fa99ccfaa46f7da06d27c8843df0296d06d59d2c", byteLength: 144,
      },
      {
        move: "TICKLE", text: body(scripts, "Move_TICKLE", "Move_WATER_SPOUT"), bytes: rom.subarray(0x2ceef7, 0x2cef63),
        sourceSha256: "0575d3d853f12c3aa075aa72ac41748f86d818056d82d5d3ebf3a9a2e5fd92d9",
        romSha256: "68b4d9f676c7a7aad4c4d8fe2c961079fb541948bc6ae1509eb1d5c92faca2bc", byteLength: 108,
      },
    ] as const;
    for (const source of bodies) {
      expect(createHash("sha256").update(source.text).digest("hex")).toBe(source.sourceSha256);
      expect([source.bytes.length, createHash("sha256").update(source.bytes).digest("hex")])
        .toEqual([source.byteLength, source.romSha256]);
    }
    expect(new Set(bodies.map((source) => source.sourceSha256)).size).toBe(4);

    const [charm, covet, fakeTears, tickle] = bodies.map((source) => source.text);
    for (const token of [
      "loadspritegfx ANIM_TAG_MAGENTA_HEART",
      "AnimTask_RockMonBackAndForth, 5, ANIM_ATTACKER, 2, 0",
      "createsprite gMagentaHeartSpriteTemplate, ANIM_ATTACKER, 3, 0, 20",
      "playsewithpan SE_M_CHARM, SOUND_PAN_ATTACKER",
      "waitforvisualfinish",
    ]) expect(charm).toContain(token);
    expect((charm.match(/gMagentaHeartSpriteTemplate/g) ?? [])).toHaveLength(3);

    for (const token of [
      "loadspritegfx ANIM_TAG_MAGENTA_HEART", "loadspritegfx ANIM_TAG_ITEM_BAG",
      "AnimTask_RockMonBackAndForth, 5, ANIM_ATTACKER, 2, 0",
      "AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "loopsewithpan SE_M_DIZZY_PUNCH, SOUND_PAN_TARGET, 4, 3",
    ]) expect(covet).toContain(token);
    expect((covet.match(/gMagentaHeartSpriteTemplate/g) ?? [])).toHaveLength(3);

    for (const token of [
      "AnimTask_BlendParticle, 5, ANIM_TAG_SMALL_BUBBLES, 0, 4, 4, RGB(12, 11, 31)",
      "AnimTask_RockMonBackAndForth, 5, ANIM_ATTACKER, 2, 1",
      "loopsewithpan SE_M_TAIL_WHIP, SOUND_PAN_ATTACKER, 12, 4",
    ]) expect(fakeTears).toContain(token);
    expect((fakeTears.match(/create_tear_drop_sprite/g) ?? [])).toHaveLength(8);

    for (const token of [
      "loadspritegfx ANIM_TAG_EYE_SPARKLE",
      "AnimTask_SwayMon, 3, 0, 6, 1280, 3, ANIM_ATTACKER",
      "AnimTask_RockMonBackAndForth, 3, ANIM_TARGET, 6, 2",
      "loopsewithpan SE_M_TAIL_WHIP, SOUND_PAN_TARGET, 8, 8",
    ]) expect(tickle).toContain(token);
    expect((tickle.match(/gEyeSparkleSpriteTemplate/g) ?? [])).toHaveLength(2);
  });

  it("pins all eight untouched complete legal three-Pokemon party-only bilateral fixtures, scenarios, and byte hashes", () => {
    expect(receipts).toHaveLength(8);
    for (const expected of receipts) {
      const fixture = json<Json>(expected.fixture);
      const stage = json<Json>(expected.scenario);
      expect(digest(expected.fixture)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenario)).toBe(expected.scenarioSha256);
      expect(fixture.scenario).toBe(expected.scenario);
      expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expect(Object.keys(stage.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteLegalParty(stage.overrides.parties.player);
      expectCompleteLegalParty(stage.overrides.parties.opponent);
      expect(stage.trace.segments.every((segment: Json) => segment.buttons.every(
        (button: string) => button === "A",
      ))).toBe(true);

      const attacker = stage.overrides.parties[expected.side][0];
      const otherSide = expected.side === "player" ? "opponent" : "player";
      const target = stage.overrides.parties[otherSide][0];
      expect(attacker.species).toBe(expected.attacker);
      expect(target.species).toBe(expected.target);
      expect(attacker.moves).toEqual([expected.moveId, expected.moveId, expected.moveId, expected.moveId]);
      expect(target.moves).toEqual([33, 33, 33, 33]);
      expect(fixture.attacker.geometry.side).toBe(expected.side);
      expect(fixture.target.geometry.side).toBe(otherSide);
    }
    const legalSpecies = receipts.flatMap((expected) => {
      const staged = json<Json>(expected.scenario);
      return [...staged.overrides.parties.player, ...staged.overrides.parties.opponent]
        .map((mon: Json) => mon.species);
    });
    expect(legalSpecies).not.toContain(301); // historical Nincada is never set-267 acceptance.
    expect(legalSpecies).not.toContain(139); // historical Omastar is never set-138 acceptance.
  });

  it("keeps Charm's own 93/93 body plus four clear teardown rows, three hearts, sound restarts, hardware/palette, and raw framebuffer receipt separate", () => {
    const charmReceipts = receipts.filter((receipt) => receipt.move === "CHARM");
    expect(charmReceipts.map((receipt) => receipt.window)).toEqual([
      { startFrame: 72, endFrame: 164, frameCount: 93 },
      { startFrame: 76, endFrame: 168, frameCount: 93 },
    ]);
    expect(CHARM_BODY_FRAME_COUNT).toBe(93);
    expect(CHARM_TEARDOWN_AGE).toBe(92);
    expect(CHARM_HEART_CREATION_AGES).toEqual([0, 17, 34]);
    expect(charmAtAge(34, "player", { x: 72, y: 80 }).hearts).toHaveLength(3);
    expect(charmAtAge(CHARM_TEARDOWN_AGE - 1, "player", { x: 72, y: 80 })).toMatchObject({ visualActive: true });
    expect(charmAtAge(CHARM_TEARDOWN_AGE, "player", { x: 72, y: 80 })).toMatchObject({
      visualActive: false, hearts: [], rock: { active: false, x2: 0, y2: 0 },
    });

    const portable = readFileSync(resolve(root, "tools/compare/charmPortable.ts"), "utf8");
    for (const token of [
      "charm-dense-evidence/v2", "rows.slice(93)", "93 body, four clear frames, then stat task",
      "magentaHeartTemplate", "hardwareOam", "hardwareMatrices", "fadedPalette", "unfadedPalette",
      "hardwarePalette", "paletteTags", "oracle.se1", "teardown", "createHash(\"sha256\").update(rgb)",
      "render(engine)", "for (let runNumber = 1; runNumber <= 2; runNumber++)",
      "${body}/93 body + ${cleanup}/4 clear teardown frames exact",
    ]) expect(portable).toContain(token);
    expect(portable).not.toContain("ANIM_TAG_ITEM_BAG");
  });

  it("keeps Covet's own 113/113 loaded/body plus 1/1 cleanup receipt, ITEM_BAG load-only palette, ShakeMon2, Dizzy Punch, and hardware/raw framebuffer proof separate", () => {
    const covetReceipts = receipts.filter((receipt) => receipt.move === "COVET");
    expect(covetReceipts.map((receipt) => receipt.window)).toEqual([
      { startFrame: 73, endFrame: 186, frameCount: 114 },
      { startFrame: 77, endFrame: 190, frameCount: 114 },
    ]);
    expect(COVET_FRAME_COUNT).toBe(114);
    expect(COVET_ITEM_BAG_LOAD_AGE).toBe(3);
    expect(covetAtAge(COVET_ITEM_BAG_LOAD_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({ heartAssetLoaded: true, itemBagAssetLoaded: true });
    expect(covetAtAge(COVET_SHAKE_START_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({ shakeActive: true, targetOffset: { x2: -2, y2: 0 }, soundRestart: "SE_M_DIZZY_PUNCH" });
    expect(covetAtAge(COVET_CLEANUP_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({ active: true, shakeActive: false, targetOffset: { x2: 0, y2: 0 } });

    const portable = readFileSync(resolve(root, "tools/compare/covetPortable.ts"), "utf8");
    for (const token of [
      "covet-dense-evidence/v2", "complete 114-frame load/cleanup envelope", "paletteTags.includes(10210)",
      "itemBagAssetLoaded", "shakeActive", "dizzyPunchSongHeader", "hardwareOam", "hardwareMatrices",
      "fadedPalette", "hardwarePalette", "paletteTags[8]", "oracle.se1", "teardown",
      "createHash(\"sha256\").update(rgb)", "render(engine)", "fresh evidence did not reproduce",
      "${body}/113 loaded/body + ${cleanup}/1 clear cleanup frames exact",
    ]) expect(portable).toContain(token);
    expect(portable).not.toContain("create_tear_drop_sprite");
    const covetCoverage = json<Json>("ANIMATION_COVERAGE.json").entries
      .find((entry: Json) => entry.move === "MOVE_COVET").covered.join(" ");
    expect(covetCoverage).toContain("af4e7838ff518aad3eccb9a78ea2f9a474a1982fddfbb2c4733d3173fcf61df7");
    expect(covetCoverage).toContain("cd62d0bd923c42f92c773c3bbe4c49f5450c2086e98e5df1e4127d0fdbeebc17");
  });

  it("keeps Fake Tears' corrected DELCATTY 87/87 source body and independent 322/322 resolved-stat-drop controller receipt, raw hashes, topology, palette/audio/hardware, and transport normalization separate", () => {
    const fakeTears = receipts.filter((receipt) => receipt.move === "FAKE_TEARS");
    const expected = [
      {
        controller: { startFrame: 39, endFrame: 360, frameCount: 322 },
        phases: {
          preAnimation: { startFrame: 39, endFrame: 75, frameCount: 37 }, sourceAnimation: { startFrame: 76, endFrame: 162, frameCount: 87 },
          statDropStatus: { startFrame: 163, endFrame: 251, frameCount: 89 }, messagePostAnimation: { startFrame: 252, endFrame: 359, frameCount: 108 }, cleanup: { startFrame: 360, endFrame: 360, frameCount: 1 },
        }, evidence: "3b2470bdd96c77c68cf1f66686324335c078651b41e0c5d3ca2699a3bee1c5a9", raw: "4aaf80e8cc8bdc94a0c369fce50893cfd6d84fd5f9dc7e565b2ed625a8cde8e1",
      },
      {
        controller: { startFrame: 39, endFrame: 360, frameCount: 322 },
        phases: {
          preAnimation: { startFrame: 39, endFrame: 79, frameCount: 41 }, sourceAnimation: { startFrame: 80, endFrame: 166, frameCount: 87 },
          statDropStatus: { startFrame: 167, endFrame: 255, frameCount: 89 }, messagePostAnimation: { startFrame: 256, endFrame: 359, frameCount: 104 }, cleanup: { startFrame: 360, endFrame: 360, frameCount: 1 },
        }, evidence: "c9b2f3d8ad20833d39e7f8cd73c0908e9c64c72b2dcf41ba0c86abc7615221ff", raw: "e7828c486bd06f3a5db51c186fa84542397dfc44ef7a570f9b47c8e8fe2938fc",
      },
    ] as const;
    for (const [index, receipt] of fakeTears.entries()) {
      const fixture = json<Json>(receipt.fixture);
      expect(fixture.controllerWindow).toEqual(expected[index]!.controller);
      expect(fixture.phaseWindows).toEqual(expected[index]!.phases);
      expect(fixture.sourceVisualWindow).toEqual({
        startFrame: receipt.window.startFrame,
        endFrame: receipt.window.endFrame,
      });
      expect(fixture.sourceVisualWindow.endFrame - fixture.sourceVisualWindow.startFrame + 1).toBe(87);
      expect([fixture.evidenceSha256, fixture.rawRgbSha256]).toEqual([
        expected[index]!.evidence, expected[index]!.raw,
      ]);
      const phases = Object.values(fixture.phaseWindows) as Json[];
      expect(phases.reduce((sum, phase) => sum + phase.frameCount, 0)).toBe(322);
    }
    expect(FAKE_TEARS_SOURCE_FRAME_COUNT).toBe(87);
    expect(FAKE_TEARS_TEAR_SPAWN_AGES).toEqual([20, 30, 40, 50]);
    expect(FAKE_TEARS_SOUND_RESTART_AGES).toEqual([10, 22, 35, 48]);
    expect(fakeTearsAtAge(51, "player", { left: 40, right: 104, top: 72 }).tears).toHaveLength(8);
    expect(fakeTearsAtAge(83, "player", { left: 40, right: 104, top: 72 }))
      .toMatchObject({ active: false, smallBubblesLoaded: false });

    const portable = readFileSync(resolve(root, "tools/compare/fakeTearsPortable.ts"), "utf8");
    for (const token of [
      "fake-tears-blend-particle-dense-evidence/v1", "corrected-species controller window is not dense",
      "source window is not dense", "FAKE_TEARS_SOURCE_FRAME_COUNT", "currentMove !== 313", "hardwareOam",
      "hardwareMatrices", "fadedPalette", "hardwarePalette", "paletteTags", "oracle.se2", "framebufferAudit",
      "322/322 controller receipts", "compactSemanticReceiptSha256(probe)", "raw RGB", "render(engine)",
      "for (let runNumber = 1; runNumber <= 2; runNumber += 1)",
    ]) expect(portable).toContain(token);
    expect(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/fakeTearsControllerWindowSourceAudit.ts"], {
      cwd: root, encoding: "utf8",
    })).toContain("animation-owned: Move_FAKE_TEARS source body only");
    expect(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/fakeTearsBlendParticleSourceAudit.ts"], {
      cwd: root, encoding: "utf8",
    })).toContain("task:AnimTask_BlendParticle");

    const fresh = {
      schema: "fake-tears-transport-test", setup: { preCheckpointCaptures: [], label: "fake-tears" }, frames: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"fake-tears-transport-test\",\"setup\":{\"label\":\"fake-tears\"},\"frames\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(createHash("sha256").update(historic).digest("hex"));
    expect(() => compactSemanticReceiptSha256({ ...fresh, setup: { label: "fake-tears" } })).toThrow("setup.preCheckpointCaptures must be []");
    expect(() => compactSemanticReceiptSha256({
      ...fresh, setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });

  it("keeps Tickle's corrected OMANYTE 205/205 EYE_SPARKLE/palette/Sway/target-Rock receipt, raw hashes, topology, hardware, cleanup, and source audit separate", () => {
    const tickle = receipts.filter((receipt) => receipt.move === "TICKLE");
    const expected = [
      ["509f6618b019cb189b602d56100209797b1c9fa798bea3d7e5ec1472007e41c4", "5b6253ce26a3db3c078c5c9b175c28bc51d5ff7687f797828b04b3440b12da8c"],
      ["c4327c31510a8673b215646204184b6346c84323790815d0f80eff26b93e5447", "b06ea14f4dc50dd8750f01611d3dcc9dc83ad4748dee5484e122176f689323a5"],
    ] as const;
    for (const [index, receipt] of tickle.entries()) {
      const fixture = json<Json>(receipt.fixture);
      expect(fixture.sourceWindow).toEqual(receipt.window);
      expect([fixture.evidenceSha256, fixture.rawRgbSha256]).toEqual(expected[index]);
      expect(fixture.lifecycleCounts).toEqual({ eyeSparkle: 2 });
      expect(fixture.topology).toEqual({
        tasks: ["AnimTask_RockMonBackAndForth_Step", "AnimTask_SwayMonStep", "Task_LoopAndPlaySE"],
        templates: [
          "gEyeSparkleSpriteTemplate", "gMultiuseSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
          "gSpriteTemplate_EnemyShadow", "sHealthbarSpriteTemplates", "sHealthboxOpponentSpriteTemplates", "sHealthboxPlayerSpriteTemplates",
        ],
        callbacks: [
          "AnimEyeSparkle_Step", "AnimSimplePaletteBlend_Step", "SpriteCB_HealthBar",
          "SpriteCB_HealthBoxOther", "SpriteCB_SetInvisible", "SpriteCallbackDummy",
        ],
      });
    }
    expect(TICKLE_FRAME_COUNT).toBe(205);
    expect([4, 6, 20, 48, 50, 64].map(ticklePaletteBlackCoeffAtAge)).toEqual([0, 2, 16, 16, 14, 0]);
    expect(tickleEyesAtAge(27, "player", { x: 72, y: 96 })).toHaveLength(2);
    expect(tickleAtAge(107, "player", { x: 72, y: 96 }).targetRock)
      .toMatchObject({ active: true, x2: -4, rotation: 512 });
    expect(tickleAtAge(203, "player", { x: 72, y: 96 }).targetRock).toMatchObject({ active: false });

    const portable = readFileSync(resolve(root, "tools/compare/ticklePortable.ts"), "utf8");
    for (const token of [
      "tickle-dense-evidence/v1", "compactSemanticReceiptSha256(probe)", "softwareOam.length === 128",
      "hardwareOam.length === 128", "hardwareMatrices.length === 32", "fadedPalette.length === 512",
      "hardwarePalette.length === 512", "paletteTags.length === 16", "sourceWindow", "lifecycleCounts", "topology",
      "raw RGB window digest", "render(engine)", "fresh proof diverged",
      "${probe.frames.length}/${TICKLE_FRAME_COUNT} component/seam/framebuffer exact",
    ]) expect(portable).toContain(token);
    expect(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/tickleSourceAudit.ts"], {
      cwd: root, encoding: "utf8",
    })).toBe("set 138/FRONTIER_MON_OMANYTE -> SPECIES_OMANYTE 138 (SPECIES_OMASTAR 139)/move 321; EYE_SPARKLE; palette fade; SwayMon(0,6,1280,3); RockMonBackAndForth(target,6,2); DETECT + TAIL_WHIP; cleanup\n");
  });

  it("keeps the portable/source/evidence/production obligations move-owned, exposes a material live-geometry control, preserves the boundary, and grants no transfer or historical credit", () => {
    const portablePaths = [
      "tools/compare/charmPortable.ts", "tools/compare/covetPortable.ts",
      "tools/compare/fakeTearsPortable.ts", "tools/compare/ticklePortable.ts",
    ];
    for (const path of portablePaths) {
      const portable = readFileSync(resolve(root, path), "utf8");
      for (const token of ["tools/run-mgba-probe.py", "createScratchDir", "render(engine)"]) {
        expect(portable).toContain(token);
      }
    }
    const fakeTearsPortable = readFileSync(resolve(root, portablePaths[2]!), "utf8");
    const ticklePortable = readFileSync(resolve(root, portablePaths[3]!), "utf8");
    for (const portable of [fakeTearsPortable, ticklePortable]) {
      expect(portable).toContain("compactSemanticReceiptSha256(probe)");
    }
    expect(readFileSync(resolve(root, "tools/compare/semanticReceipt.ts"), "utf8"))
      .toContain("setup.preCheckpointCaptures");
    for (const path of portablePaths.slice(0, 2)) {
      expect(readFileSync(resolve(root, path), "utf8")).not.toContain("compactSemanticReceiptSha256");
    }

    const attacker = (geometry: SceneOnPresentationBattler["geometry"]): SceneOnPresentationBattler => ({
      species: "MINUN", geometry,
    });
    const target: SceneOnPresentationBattler = {
      species: "SHUCKLE",
      geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 17 }, animationCenter: { x: 176, y: 49 }, battlePositionCenter: { x: 176, y: 40 },
      },
    };
    const canonical = createSceneOnMovePresentation({
      move: "CHARM",
      attacker: attacker({
        side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 },
      }),
      target,
      fieldProfile: { playerHp: 167, playerMaxHp: 167, opponentHp: 127, opponentMaxHp: 127 },
    });
    const altered = createSceneOnMovePresentation({
      move: "CHARM",
      attacker: attacker({
        side: "player", spriteCorner: { x: 48, y: 60 }, animationCenter: { x: 80, y: 92 }, battlePositionCenter: { x: 80, y: 84 },
      }),
      target,
      fieldProfile: { playerHp: 167, playerMaxHp: 167, opponentHp: 127, opponentMaxHp: 127 },
    });
    const canonicalView = sceneOnCharmView({ ...canonical, age: 34 });
    const alteredView = sceneOnCharmView({ ...altered, age: 34 });
    expect(alteredView.hearts.map((heart) => [heart.x, heart.y]))
      .not.toEqual(canonicalView.hearts.map((heart) => [heart.x, heart.y]));
    const canonicalFrame = render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...canonical, age: 34 },
    });
    const alteredFrame = render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...altered, age: 34 },
    });
    expect(alteredFrame).not.toEqual(canonicalFrame);

    const coverage = json<Json>("ANIMATION_COVERAGE.json");
    expect(coverage.entries.filter((entry: Json) => entry.status === "exact")).toHaveLength(247);
    expect(coverage.entries.filter((entry: Json) => [
      "MOVE_CHARM", "MOVE_COVET", "MOVE_FAKE_TEARS", "MOVE_TICKLE",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_CHARM", status: "exact" }),
      expect.objectContaining({ move: "MOVE_COVET", status: "exact" }),
      expect.objectContaining({ move: "MOVE_FAKE_TEARS", status: "exact" }),
      expect.objectContaining({ move: "MOVE_TICKLE", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: Json) => track.id === "rock-mon-back-and-forth-magenta-heart"))
      .toEqual([{
        id: "rock-mon-back-and-forth-magenta-heart",
        components: [...trackComponents],
        representatives: ["MOVE_CHARM", "MOVE_FAKE_TEARS", "MOVE_TICKLE", "MOVE_COVET"],
        fulfilled: true,
        goal: trackGoal,
      }]);

    const source = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const charm = body(source, "Move_CHARM", "Move_ROLLOUT");
    const covet = body(source, "Move_COVET", "Move_VOLT_TACKLE");
    const fakeTears = body(source, "Move_FAKE_TEARS", "Move_AIR_CUTTER");
    const tickle = body(source, "Move_TICKLE", "Move_WATER_SPOUT");
    expect(charm).not.toContain("ANIM_TAG_ITEM_BAG");
    expect(charm).not.toContain("create_tear_drop_sprite");
    expect(covet).not.toContain("create_tear_drop_sprite");
    expect(fakeTears).not.toContain("gMagentaHeartSpriteTemplate");
    expect(fakeTears).not.toContain("gEyeSparkleSpriteTemplate");
    expect(tickle).not.toContain("gMagentaHeartSpriteTemplate");
    expect(tickle).not.toContain("create_tear_drop_sprite");
    const latches = readFileSync(resolve(root, "ANIMATION_LATCHES.md"), "utf8");
    expect(latches).toContain("The latch is per-MECHANISM");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured");
  });
});
