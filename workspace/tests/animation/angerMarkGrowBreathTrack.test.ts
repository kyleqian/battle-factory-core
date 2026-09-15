import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { swaggerAtAge } from "../../src/animation/swagger.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFrustrationView,
  type SceneOnFrustrationConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  TORMENT_FIRST_ANGER_AGE,
  TORMENT_FIRST_BUBBLE_AGE,
  TORMENT_LAST_TASK_AGE,
  tormentAtAge,
  tormentBubbleSpawnAges,
} from "../../src/animation/torment.ts";
import {
  TAUNT_FIRST_ANGER_CREATION_AGE,
  TAUNT_TEARDOWN_AGE,
  tauntAtAge,
} from "../../src/animation/taunt.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  frustrationConfigFor,
  frustrationRowsFor,
} from "../../tools/compare/frustrationFramebuffer.ts";

type Json = Record<string, any>;
type Side = "player" | "opponent";

const root = resolve(import.meta.dirname, "../..");

const trackComponents = [
  "asset:ANIM_TAG_ANGER",
  "sprite:gAngerMarkSpriteTemplate",
  "asset:ANIM_TAG_BREATH",
  "sprite:gBreathPuffSpriteTemplate",
  "task:AnimTask_GrowAndShrink",
] as const;

const trackGoal = "Fulfilled by four independent complete move receipts: MOVE_SWAGGER proves GrowAndShrink, breath-puff, and paired anger marks at 161/161 rows per orientation; MOVE_FRUSTRATION proves its Factory friendship-0 strongest branch, two anger marks, shake/sway, six IMPACT hitsplats, palette/monbg/alpha and cleanup at 229/229; MOVE_TORMENT proves its distinct bubbles/wobble/blend/anger body at 177/177; MOVE_TAUNT proves thought-bubble/finger/anger at 125/125. Each is bilateral, dense, actual-core framebuffer exact, and independently accepted; no Metronome, Fake Tears, strength-branch, or other sibling credit is inferred.";

const portableReceipts = [
  {
    move: "SWAGGER", moveId: 207, side: "player" as Side,
    fixture: "tools/compare/fixtures/swagger-player-rattata-opponent-onix.json",
    fixtureSha256: "0800c48d5897d5d5df1275e55bab41ce0f31e1aebbb04e1768d71f669ebe4e78",
    scenario: "tools/battle-lab/mechanic-poison-fang-player-zubat-opponent-onix.json",
    scenarioSha256: "edbc938255b4bc90775ce19e8572d8660c642b79f2e55480bbed42cf9530ef7b",
    window: { startFrame: 76, endFrame: 236, frameCount: 161 },
    fixtureAttacker: "RATTATA", fixtureTarget: "ONIX", stageAttacker: 41, stageMove: 305,
    runtimeAttacker: 19, probe: "tools/compare/poisonFangProbe.py", portable: "tools/compare/swaggerPortable.ts",
  },
  {
    move: "SWAGGER", moveId: 207, side: "opponent" as Side,
    fixture: "tools/compare/fixtures/swagger-opponent-rattata-player-onix.json",
    fixtureSha256: "19ca3a4a31ae018dc5657d3d744138e00f9865026fc94384cc4733428b858c49",
    scenario: "tools/battle-lab/mechanic-poison-fang-opponent-zubat-player-onix.json",
    scenarioSha256: "35c67b759edaea417af559c4004306ad70b3e833db027ba971bb9d40dd4ba308",
    window: { startFrame: 80, endFrame: 240, frameCount: 161 },
    fixtureAttacker: "RATTATA", fixtureTarget: "ONIX", stageAttacker: 41, stageMove: 305,
    runtimeAttacker: 19, probe: "tools/compare/poisonFangProbe.py", portable: "tools/compare/swaggerPortable.ts",
  },
  {
    move: "TORMENT", moveId: 259, side: "player" as Side,
    fixture: "tools/compare/fixtures/torment-player-murkrow-opponent-onix.json",
    fixtureSha256: "2e668c1c23630c7848adacc8609657396a14b7dbde2c04ff6a000f8356674137",
    scenario: "tools/battle-lab/mechanic-torment-player-murkrow-opponent-onix.json",
    scenarioSha256: "93b7cb600f80eb790d815cbb0c7d9bde9c0905db4301a036806fb4216a60ed69",
    window: { startFrame: 68, endFrame: 244, frameCount: 177 },
    fixtureAttacker: "MURKROW", fixtureTarget: "ONIX", stageAttacker: 198, stageMove: 259,
    runtimeAttacker: 198, probe: "tools/compare/tormentProbe.py", portable: "tools/compare/tormentPortable.ts",
  },
  {
    move: "TORMENT", moveId: 259, side: "opponent" as Side,
    fixture: "tools/compare/fixtures/torment-opponent-murkrow-player-onix.json",
    fixtureSha256: "d85db1d0891a1b6585a6af307ed7f0f3af067a0eef01069192b44524b8728477",
    scenario: "tools/battle-lab/mechanic-torment-opponent-murkrow-player-onix.json",
    scenarioSha256: "88480f31a259213fedcf67f355bc82817589715b3388e90f32e4a9c1d32a96bf",
    window: { startFrame: 72, endFrame: 248, frameCount: 177 },
    fixtureAttacker: "MURKROW", fixtureTarget: "ONIX", stageAttacker: 198, stageMove: 259,
    runtimeAttacker: 198, probe: "tools/compare/tormentProbe.py", portable: "tools/compare/tormentPortable.ts",
  },
  {
    move: "TAUNT", moveId: 269, side: "player" as Side,
    fixture: "tools/compare/fixtures/taunt-player-murkrow-opponent-shuckle.json",
    fixtureSha256: "1ec31010dc57a6730fead8ac3824a77545ef6df34cc65fc6ab1a657dc80f6c79",
    scenario: "tools/battle-lab/mechanic-taunt-player-murkrow-opponent-shuckle.json",
    scenarioSha256: "45b1045c5d4a2811a80872a054ee35de81672c0848380ca78c0807c688a47b6b",
    window: { startFrame: 76, endFrame: 200, frameCount: 125 },
    fixtureAttacker: "MURKROW", fixtureTarget: "SHUCKLE", stageAttacker: 198, stageMove: 269,
    runtimeAttacker: 198, probe: "tools/compare/tauntProbe.py", portable: "tools/compare/tauntPortable.ts",
  },
  {
    move: "TAUNT", moveId: 269, side: "opponent" as Side,
    fixture: "tools/compare/fixtures/taunt-opponent-murkrow-player-shuckle.json",
    fixtureSha256: "484c58c1fa0155eb339f1a24c661307cd07256a922e5188f2e0c47e5d3b3c7af",
    scenario: "tools/battle-lab/mechanic-taunt-opponent-murkrow-player-shuckle.json",
    scenarioSha256: "7435139753007db03533e44c402961686fd0e947291b06ad85279d89576b95b9",
    window: { startFrame: 80, endFrame: 204, frameCount: 125 },
    fixtureAttacker: "MURKROW", fixtureTarget: "SHUCKLE", stageAttacker: 198, stageMove: 269,
    runtimeAttacker: 198, probe: "tools/compare/tauntProbe.py", portable: "tools/compare/tauntPortable.ts",
  },
] as const;

const frustrationReceipts = [
  {
    side: "player" as Side, orientation: "player-back", scenario: "tools/battle-lab/mechanic-frustration-player-furret-opponent-onix.json",
    scenarioSha256: "3f0ffd7656d83835287d5c743b0a28a5b116ab857890b6336cf73d28e925199f",
    window: { startFrame: 76, endFrame: 304, frameCount: 229 }, raw: "afb46068a1261ce69415eb2c48fc463530ecbf7a48768c200c39d127dd1eed1d",
    evidence: "9df200d518cc1bd00db7a6a5358a1fef9b2b6fb888a75f812ee97a1bb48103eb",
    map: "tools/compare/evidence/frustration-changemap-player.json", mapSha256: "4f62a3a3c80d633938a3724e0df65a608c9f3f1aa49d659dc968209ede6feeae",
    mapText: "tools/compare/evidence/frustration-changemap-player.txt", mapTextSha256: "2a5ff4ebcae25eebb50a10427bcace3cc412c607edced945d8ac5f5841f0278d",
  },
  {
    side: "opponent" as Side, orientation: "opponent-front", scenario: "tools/battle-lab/mechanic-frustration-opponent-furret-player-onix.json",
    scenarioSha256: "9f391d871280b78b7965465980916e64899ec1492c718627158dcc2904b6c68d",
    window: { startFrame: 80, endFrame: 308, frameCount: 229 }, raw: "6aa8982388664eb0c8f2f4cc5ff70c1f1104d80f683bde3e8b95950f696772b6",
    evidence: "513ccac15143577412f994b9514a7889e282c2adfe8c8d32f9bdc6143299688a",
    map: "tools/compare/evidence/frustration-changemap-opponent.json", mapSha256: "20acae5a624f2e6903418a073f906369c717ccd20c5e2207675c9bf01933a52c",
    mapText: "tools/compare/evidence/frustration-changemap-opponent.txt", mapTextSha256: "a0a125a30b490baba073ac188a7c0c5b47eb4cd10c6ff93b49f674891186aa7c",
  },
] as const;

const partyKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature",
  "ppUps", "shiny", "species",
] as const;
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"] as const;

function json<T = Json>(path: string): T {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

function sha(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digest(path: string): string {
  return sha(readFileSync(resolve(root, path)));
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
    expect(Object.keys(mon).sort()).toEqual([...partyKeys].sort());
    expect(mon.level).toBe(50);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
    expect(mon.abilitySlot).toBeGreaterThanOrEqual(0);
    expect(mon.abilitySlot).toBeLessThanOrEqual(1);
    expect(mon.shiny).toBe(false);
    expect(["male", "female", "genderless"]).toContain(mon.gender);
    expect(Object.keys(mon.ivs).sort()).toEqual([...statKeys]);
    expect(Object.keys(mon.evs).sort()).toEqual([...statKeys]);
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

describe("anger-mark-grow-breath standalone fulfilled component-track ratchet", () => {
  it("pins the exact five-component boundary, exact counts/statuses, fulfilled goal, and four independent representatives", () => {
    const coverage = json<Json>("ANIMATION_COVERAGE.json");
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "anger-mark-grow-breath");
    expect(coverage.entries).toHaveLength(255);
    expect(coverage.entries.filter((entry: Json) => entry.status === "exact")).toHaveLength(255);
    expect(276 - coverage.entries.filter((entry: Json) => entry.status === "exact").length).toBe(21);
    expect(track).toEqual({
      id: "anger-mark-grow-breath",
      components: [...trackComponents],
      representatives: ["MOVE_SWAGGER", "MOVE_FRUSTRATION", "MOVE_TORMENT", "MOVE_TAUNT"],
      fulfilled: true,
      goal: trackGoal,
    });
    for (const move of ["MOVE_SWAGGER", "MOVE_FRUSTRATION", "MOVE_TORMENT", "MOVE_TAUNT"]) {
      expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
    }
  });

  it("pins four distinct authoritative script/ELF/ROM bodies plus their relevant component and callback ownership", () => {
    const symbols = execFileSync("arm-none-eabi-nm", [
      "-a", resolve(root, "reference/pokeemerald/pokeemerald.elf"),
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    expect({
      Move_SWAGGER: pointer(symbols, "Move_SWAGGER"), Move_MILK_DRINK: pointer(symbols, "Move_MILK_DRINK"),
      Move_FRUSTRATION: pointer(symbols, "Move_FRUSTRATION"), Move_SAFEGUARD: pointer(symbols, "Move_SAFEGUARD"),
      Move_TORMENT: pointer(symbols, "Move_TORMENT"), Move_MEMENTO: pointer(symbols, "Move_MEMENTO"),
      Move_TAUNT: pointer(symbols, "Move_TAUNT"), Move_HELPING_HAND: pointer(symbols, "Move_HELPING_HAND"),
      AnimTask_GrowAndShrink: pointer(symbols, "AnimTask_GrowAndShrink"), AnimBreathPuff: pointer(symbols, "AnimBreathPuff"),
      AnimAngerMark: pointer(symbols, "AnimAngerMark"), AnimTask_TormentAttacker: pointer(symbols, "AnimTask_TormentAttacker"),
      TormentAttacker_Step: pointer(symbols, "TormentAttacker_Step"), AnimThoughtBubble: pointer(symbols, "AnimThoughtBubble"),
      AnimTauntFinger: pointer(symbols, "AnimTauntFinger"), AnimTask_GetFrustrationPowerLevel: pointer(symbols, "AnimTask_GetFrustrationPowerLevel"),
      AnimTask_StrongFrustrationGrowAndShrink: pointer(symbols, "AnimTask_StrongFrustrationGrowAndShrink"),
      AnimTask_SwayMon: pointer(symbols, "AnimTask_SwayMon"), AnimTask_BlendBattleAnimPal: pointer(symbols, "AnimTask_BlendBattleAnimPal"),
      gBreathPuffSpriteTemplate: pointer(symbols, "gBreathPuffSpriteTemplate"), gAngerMarkSpriteTemplate: pointer(symbols, "gAngerMarkSpriteTemplate"),
      gThoughtBubbleSpriteTemplate: pointer(symbols, "gThoughtBubbleSpriteTemplate"), gTauntFingerSpriteTemplate: pointer(symbols, "gTauntFingerSpriteTemplate"),
    }).toEqual({
      Move_SWAGGER: "0x082cd826", Move_MILK_DRINK: "0x082cd86e", Move_FRUSTRATION: "0x082cb430", Move_SAFEGUARD: "0x082cb6f7",
      Move_TORMENT: "0x082cdcae", Move_MEMENTO: "0x082cdcf2", Move_TAUNT: "0x082cde6b", Move_HELPING_HAND: "0x082cdebf",
      AnimTask_GrowAndShrink: "0x08104ab4", AnimBreathPuff: "0x08104b1c", AnimAngerMark: "0x08104bac",
      AnimTask_TormentAttacker: "0x0815aff0", TormentAttacker_Step: "0x0815b054", AnimThoughtBubble: "0x08103164", AnimTauntFinger: "0x08103390",
      AnimTask_GetFrustrationPowerLevel: "0x080a8140", AnimTask_StrongFrustrationGrowAndShrink: "0x0815c3a8", AnimTask_SwayMon: "0x080d5eb8", AnimTask_BlendBattleAnimPal: "0x08116620",
      gBreathPuffSpriteTemplate: "0x08593658", gAngerMarkSpriteTemplate: "0x0859368c", gThoughtBubbleSpriteTemplate: "0x08593114", gTauntFingerSpriteTemplate: "0x0859324c",
    });

    const scripts = readFileSync(resolve(root, "reference/pokeemerald/data/battle_anim_scripts.s"), "utf8");
    const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
    const bodies = [
      { move: "SWAGGER", start: "Move_SWAGGER", end: "Move_MILK_DRINK", romStart: 0x2cd826, romEnd: 0x2cd86e, sourceSha256: "9c7acef385548cd77472b9772584e17f387e597f77ebc5bc01368717a4a08b10", romSha256: "0b602b657f1b006f1bf39bac3abfdb6d1d43150ec31cdaca78f41d64b45a0759" },
      { move: "FRUSTRATION", start: "Move_FRUSTRATION", end: "Move_SAFEGUARD", romStart: 0x2cb430, romEnd: 0x2cb6f7, sourceSha256: "319ff215abce58a0cb07d6039321e3bf24ab56f218251e15043e764361fb3419", romSha256: "901d9a9d4ee45e9ba47d97a9a452a102dcdab95596499e70fac9b5ca3fc29200" },
      { move: "TORMENT", start: "Move_TORMENT", end: "Move_MEMENTO", romStart: 0x2cdcae, romEnd: 0x2cdcf2, sourceSha256: "1128cf33502173b5005d320e185d99953ec2b75a9e1db0e0b378df97af6cda2f", romSha256: "788e63ba714dec4d036ba00e47a4d10a9134c3cd1d57999c9fc6edca59ab5d59" },
      { move: "TAUNT", start: "Move_TAUNT", end: "Move_HELPING_HAND", romStart: 0x2cde6b, romEnd: 0x2cdebf, sourceSha256: "b252716d7527cebf6fbdd8ddc2286679c23e4df4a848cc2f235b3795ad4e14df", romSha256: "34a135c13fb7871df7332ec359e45dff51a87c8d19242ba130396a3b68ae8108" },
    ] as const;
    for (const body of bodies) {
      const source = sourceBody(scripts, body.start, body.end);
      const bytes = rom.subarray(body.romStart, body.romEnd);
      expect(sha(source)).toBe(body.sourceSha256);
      expect(sha(bytes)).toBe(body.romSha256);
    }
    expect(new Set(bodies.map((body) => body.sourceSha256)).size).toBe(4);

    const [swagger, frustration, torment, taunt] = bodies.map((body) => sourceBody(scripts, body.start, body.end));
    for (const token of ["loadspritegfx ANIM_TAG_BREATH", "loadspritegfx ANIM_TAG_ANGER", "AnimTask_GrowAndShrink", "gBreathPuffSpriteTemplate", "SE_M_SWAGGER", "gAngerMarkSpriteTemplate", "SE_M_SWAGGER2"]) expect(swagger).toContain(token);
    for (const token of ["AnimTask_GetFrustrationPowerLevel", "Frustration_Strongest", "Frustration_Strong", "Frustration_Medium", "Frustration_Weak", "AnimTask_SwayMon", "create_basic_hitsplat_sprite", "Frustration_Continue"]) expect(frustration).toContain(token);
    for (const token of ["ANIM_TAG_THOUGHT_BUBBLE", "AnimTask_TormentAttacker", "AnimTask_BlendMonInAndOut", "gAngerMarkSpriteTemplate", "SE_M_SWAGGER2"]) expect(torment).toContain(token);
    for (const token of ["ANIM_TAG_FINGER_2", "ANIM_TAG_THOUGHT_BUBBLE", "gThoughtBubbleSpriteTemplate", "gTauntFingerSpriteTemplate", "SE_M_METRONOME", "SE_M_TAIL_WHIP", "gAngerMarkSpriteTemplate"]) expect(taunt).toContain(token);

    const effects1 = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_effects_1.c"), "utf8");
    const effects2 = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_effects_2.c"), "utf8");
    const effects3 = readFileSync(resolve(root, "reference/pokeemerald/src/battle_anim_effects_3.c"), "utf8");
    for (const token of ["gBreathPuffSpriteTemplate", "gAngerMarkSpriteTemplate", "AnimTask_GrowAndShrink", "AnimBreathPuff", "AnimAngerMark"]) expect(effects2).toContain(token);
    for (const token of ["AnimTask_TormentAttacker", "TormentAttacker_Step", "gThoughtBubbleSpriteTemplate", "SpriteCallbackDummy"]) expect(effects3).toContain(token);
    for (const token of ["gThoughtBubbleSpriteTemplate", "gTauntFingerSpriteTemplate", "AnimThoughtBubble", "AnimTauntFinger", "SetSpriteNextToMonHead"]) expect(effects1).toContain(token);

    const audit = json<Json>("tools/compare/fixtures/frustration-evidence.json");
    expect(digest(audit.source.audit)).toBe(audit.source.auditSha256);
    const result = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", audit.source.audit], { cwd: root, encoding: "utf8" })) as Json;
    expect(result).toMatchObject({
      move: "MOVE_FRUSTRATION", moveId: 218, status: "exact", coverageCredit: true,
      pointerOwned: { root: { start: "0x82cb430", endExclusive: "0x82cb6f7", byteLength: 711, romSha256: bodies[1].romSha256 }, blocks: {
        Frustration_Strongest: { commandCount: 35 }, Frustration_Strong: { commandCount: 25 }, Frustration_Medium: { commandCount: 16 }, Frustration_Weak: { commandCount: 9 },
      } },
      branches: { selector: { returnArgIndex: 7 }, strongest: { label: "Frustration_Strongest", angerMarks: 2, hitSplats: 6 }, strong: { strongGrowShrink: true }, medium: { horizontalLunges: 2 }, weak: { weakAngerMarks: 1 } },
    });
    for (const callback of ["AnimTask_GetFrustrationPowerLevel", "AnimTask_SwayMon", "AnimTask_BlendBattleAnimPal", "AnimAngerMark", "AnimHitSplatBasic"]) {
      expect(result.callbacks[callback]).toMatchObject({ sourceSha256: expect.stringMatching(/^[0-9a-f]{64}$/), rom: { romSha256: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    }
  });

  it("pins every complete legal bilateral fixture/scenario identity, party-only staging, unthinned window, and orientation-owned move", () => {
    const poisonFangProbe = readFileSync(resolve(root, "tools/compare/poisonFangProbe.py"), "utf8");
    expect(portableReceipts).toHaveLength(6);
    for (const expected of portableReceipts) {
      const fixture = json<Json>(expected.fixture);
      const stage = json<Json>(expected.scenario);
      expect(digest(expected.fixture)).toBe(expected.fixtureSha256);
      expect(digest(expected.scenario)).toBe(expected.scenarioSha256);
      const fixtureIdentity = {
        oracleProfile: "battle-scene-on", scenario: expected.scenario, move: expected.move, probe: expected.probe,
        attacker: { species: expected.fixtureAttacker, geometry: { side: expected.side } },
        target: { species: expected.fixtureTarget, geometry: { side: expected.side === "player" ? "opponent" : "player" } },
        denseWindow: { startFrame: expected.window.startFrame, endFrame: expected.window.endFrame }, appStage: { presentationAge: 0 },
      };
      if (expected.move === "TORMENT") {
        expect(fixture).toMatchObject({
          ...fixtureIdentity, schema: "scene-on-portable-evidence/v1",
          orientation: expected.side === "player" ? "player-to-opponent" : "opponent-to-player",
        });
      } else {
        expect(fixture).toMatchObject({ ...fixtureIdentity, schema: "scene-on-portable-component/v1", attackerSide: expected.side });
      }
      expect(fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1).toBe(expected.window.frameCount);
      expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expect(Object.keys(stage.overrides.parties).sort()).toEqual(["opponent", "player"]);
      expectCompleteLegalParty(stage.overrides.parties.player);
      expectCompleteLegalParty(stage.overrides.parties.opponent);
      const attacker = stage.overrides.parties[expected.side][0];
      const target = stage.overrides.parties[expected.side === "player" ? "opponent" : "player"][0];
      expect(attacker.species).toBe(expected.stageAttacker);
      expect(attacker.moves).toEqual(Array(4).fill(expected.stageMove));
      expect(target.species).toBe(expected.move === "TAUNT" ? 213 : 95);
      expect(stage.trace.segments.every((segment: Json) => Number.isInteger(segment.frames) && segment.frames > 0 && Array.isArray(segment.buttons))).toBe(true);
      if (expected.move === "SWAGGER") {
        // Swagger's portable fixture deliberately has a source-legal Zubat staging shell.
        // The committed probe turns only the first active carrier into real Factory Rattata before validation;
        // it never adds transient battle state and is therefore not a retained raw-RGB fixture claim.
        expect(poisonFangProbe).toContain("elif MOVE_ID == 207:");
        expect(poisonFangProbe).toContain('mon.update({"species": 19, "nature": 6, "moves": [207] * 4,');
        expect(expected.runtimeAttacker).toBe(19);
      } else {
        expect(expected.runtimeAttacker).toBe(expected.stageAttacker);
      }
    }

    const evidence = json<Json>("tools/compare/fixtures/frustration-evidence.json");
    expect(digest("tools/compare/fixtures/frustration-evidence.json")).toBe("1b6f9645cd24f3f29e7bd9de9acae3bea95d831a44d79b458bd7dff5104dba38");
    for (const expected of frustrationReceipts) {
      const stage = json<Json>(expected.scenario);
      const receipt = evidence.orientations[expected.orientation];
      expect(digest(expected.scenario)).toBe(expected.scenarioSha256);
      expect(receipt).toMatchObject({ scenario: expected.scenario, sourceWindow: expected.window, attacker: `${expected.side}/FURRET`, target: `${expected.side === "player" ? "opponent" : "player"}/ONIX` });
      expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, battleNum: 2 });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expectCompleteLegalParty(stage.overrides.parties.player);
      expectCompleteLegalParty(stage.overrides.parties.opponent);
      const attacker = stage.overrides.parties[expected.side][0];
      const target = stage.overrides.parties[expected.side === "player" ? "opponent" : "player"][0];
      expect(attacker).toMatchObject({ species: 162, moves: [218, 218, 218, 218], friendship: 0 });
      expect(target).toMatchObject({ species: 95, moves: [33, 33, 33, 33], friendship: 0 });
      expect(stage.trace.captureFrames).toEqual([0, 112, 160, 934]);
    }
  });

  it("retains Frustration/Torment evidence and raw-RGB/change-map hashes while making portable-only Swagger/Taunt obligations explicit", () => {
    const frustration = json<Json>("tools/compare/fixtures/frustration-evidence.json");
    expect(frustration).toMatchObject({
      schema: "frustration-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_FRUSTRATION", moveId: 218,
      evidenceScope: { freshRunsPerOrientation: 2, completeDenseRowsPerOrientation: 229, rawRgbRowsPerOrientation: 229, sourceEntryThroughFirstInactiveCleanup: true, transientOverrides: [] },
    });
    for (const expected of frustrationReceipts) {
      const receipt = frustration.orientations[expected.orientation];
      expect(receipt).toMatchObject({ probeJsonSha256: expected.evidence, repeatProbeJsonSha256: expected.evidence, rawRgbSequenceSha256: expected.raw, repeatRawRgbSequenceSha256: expected.raw, changeMap: expected.map, changeMapSha256: expected.mapSha256, changeMapText: expected.mapText, changeMapTextSha256: expected.mapTextSha256 });
      expect(digest(expected.map)).toBe(expected.mapSha256);
      expect(digest(expected.mapText)).toBe(expected.mapTextSha256);
      expect(receipt.hardwareLatches).toEqual({ oam: "228/228", matrices: "228/228", palette: "227/228", paletteExceptions: [7] });
    }

    const tormentHashes = [
      ["tools/compare/fixtures/torment-player-murkrow-opponent-onix.json", "7d0bb71dd247c76d20df02f70742f0fa8fa590f352b1ca8b1a9599860a0d87de", "805da7f5651230a3fbf2fee1b8f65bda039c79aa49e1e42679efde60ef5f816a"],
      ["tools/compare/fixtures/torment-opponent-murkrow-player-onix.json", "0116cb14698bb95f5b5912d0fdd0cbdef76dc0a056edc5d56b3a0720a50c3153", "82f08073ddf3f4b97e6b7d46b44d4a06f0c1e2b4a786eddc63048081b8bc0612"],
    ] as const;
    for (const [path, evidenceSha256, rawRgbSha256] of tormentHashes) {
      const fixture = json<Json>(path);
      expect(fixture).toMatchObject({ evidenceSchema: "torment-dense-evidence/v1", evidenceSha256, secondFreshEvidenceSha256: evidenceSha256, rawRgbSha256, acceptance: { status: "exact", componentMatching: 177, framebufferMatching: 177 } });
    }

    for (const expected of portableReceipts.filter((receipt) => receipt.move === "SWAGGER" || receipt.move === "TAUNT")) {
      const fixture = json<Json>(expected.fixture);
      expect(fixture).not.toHaveProperty("evidenceSha256");
      expect(fixture).not.toHaveProperty("rawRgbSha256");
      expect(fixture).not.toHaveProperty("changeMapSha256");
      const portable = readFileSync(resolve(root, expected.portable), "utf8");
      for (const token of ["createScratchDir", "tools/run-mgba-probe.py", "render(engine)"]) expect(portable).toContain(token);
      // The absence of retained hash fields is intentional: twice-fresh portable reruns are the acceptance obligation.
      expect(portable).toContain(expected.move === "SWAGGER" ? "framebufferMatches" : "framebufferMatches");
    }
  });

  it("keeps each move's topology, lifecycle, cleanup, palette/OAM/hardware/audio, and current verifier obligation move-owned", () => {
    const swagger = (age: number) => swaggerAtAge(age, "player", { x: 72, y: 101 }, "opponent", { x: 176, y: 42 });
    expect(swagger(0)).toMatchObject({ attackerScale: { x: 252, y: 251 }, breath: null, angerMarks: [] });
    expect(swagger(49).breath).toMatchObject({ frame: 0, hFlip: true });
    expect(swagger(129).angerMarks).toHaveLength(1);
    expect(swagger(143).angerMarks).toHaveLength(2);
    expect(swagger(160)).toMatchObject({ breath: null, angerMarks: [], attackerScale: { x: 256, y: 256 } });

    expect(tormentBubbleSpawnAges()).toEqual([7, 32, 57, 72, 87, 102]);
    const torment = (age: number) => tormentAtAge(age, { x: 72, y: 97 }, 48, "opponent", { x: 176, y: 42 });
    expect(torment(TORMENT_FIRST_BUBBLE_AGE).bubbles).toHaveLength(1);
    expect(torment(102).bubbles.map((bubble) => [bubble.subpriority, bubble.hFlip])).toEqual([[6, false], [5, true], [4, false], [3, true], [2, false], [1, true]]);
    expect(torment(TORMENT_FIRST_ANGER_AGE)).toMatchObject({ blendCoeff: 1, angerMarks: [{ x: 196, y: 14 }] });
    expect(torment(TORMENT_LAST_TASK_AGE + 1)).toMatchObject({ visualTaskCount: 0, bubbles: [] });

    const taunt = (age: number) => tauntAtAge(age, "opponent", { x: 144, y: 39 }, "player", { x: 72, y: 99 });
    expect(taunt(0)).toMatchObject({ thoughtBubble: { frame: 0 }, finger: null, angerMarks: [], soundRestart: "SE_M_METRONOME" });
    expect(taunt(14)).toMatchObject({ soundRestart: "SE_M_TAIL_WHIP", soundPanSide: "opponent" });
    expect(taunt(TAUNT_FIRST_ANGER_CREATION_AGE)).toMatchObject({ angerMarks: [{ x: 52, y: 71, xScale: 278 }] });
    expect(taunt(TAUNT_TEARDOWN_AGE)).toEqual({ thoughtBubble: null, finger: null, angerMarks: [], soundRestart: null, soundPanSide: null, blend: { bldcnt: 0, bldalpha: 0, bldy: 0 } });

    const contracts = [
      ["tools/compare/swaggerPortable.ts", ["createScratchDir", "swaggerAtAge", "sceneOnSwaggerView", "AnimTask_GrowAndShrink_Step", "hardwareMatrix", "SE_M_SWAGGER2", "framebufferMatches"]],
      ["tools/compare/frustrationEvidence.ts", ["verifySide", "hardwareOamEqualsPrecedingSoftware", "hardwarePaletteEqualsPrecedingFaded", "sourceWindow", "animationRng"]],
      ["tools/compare/frustrationSourceAudit.ts", ["AnimTask_StrongFrustrationGrowAndShrink", "AnimTask_SwayMon", "SE_M_COMET_PUNCH"]],
      ["tools/compare/frustrationFramebuffer.ts", ["createScratchDir", "frustrationConfigFor", "render", "residualPixels", "peakResidualPixels"]],
      ["tools/compare/tormentPortable.ts", ["createScratchDir", "TormentAttacker_Step", "matrix", "bldcnt", "bldalpha", "bldy", "rawRgbSha256", "framebufferMatches"]],
      ["tools/compare/tauntPortable.ts", ["createScratchDir", "expectedHardware", "hardwarePalette", "SE_M_TAIL_WHIP", "SE_M_SWAGGER2", "framebufferMatches"]],
    ] as const;
    for (const [path, tokens] of contracts) {
      const source = readFileSync(resolve(root, path), "utf8");
      for (const token of tokens) expect(source).toContain(token);
    }
    // Torment's portable probe has no fabricated direct hardware/audio payload: its retained RGB and actual-core
    // framebuffer obligations are the owned acceptance axes, while the source body above owns its palette/audio commands.
    const tormentPortable = readFileSync(resolve(root, "tools/compare/tormentPortable.ts"), "utf8");
    expect(tormentPortable).not.toContain("hardwareOam");
    expect(tormentPortable).not.toContain("hardwarePalette");
    const battleScene = readFileSync(resolve(root, "src/engine/battleScene.ts"), "utf8");
    for (const token of ["sceneOnSwaggerView", "sceneOnFrustrationView", "sceneOnTormentView", "sceneOnTauntView"]) expect(battleScene).toContain(token);
    expect(readFileSync(resolve(root, "src/engine/core.ts"), "utf8")).toContain("sceneOnPresentation");
  });

  it("routes a material altered-species/reversed-geometry/allocator control through the actual core compositor", () => {
    const base = frustrationConfigFor("player-back", frustrationRowsFor("player-back"));
    const altered: SceneOnFrustrationConfig = {
      ...base,
      attacker: { species: "ARON", geometry: { side: "opponent", spriteCorner: { x: 141, y: 7 }, animationCenter: { x: 173, y: 39 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "GROVYLE", geometry: { side: "player", spriteCorner: { x: 37, y: 55 }, animationCenter: { x: 69, y: 87 }, battlePositionCenter: { x: 72, y: 80 } } },
      targetInitialX2: 3,
      attackerEffectCenter: { x: 173, y: 39 }, targetEffectCenter: { x: 69, y: 91 },
      animationProfile: { angerSlot: 12, angerMatrix: 7, impactSlots: [13, 15], impactMatrices: [8, 11], impactOrders: [9, 4], impactSubpriority: 22, attackerSubpriority: 39, targetSubpriority: 31 },
    };
    const canonicalStage = createSceneOnMovePresentation(base);
    const alteredStage = createSceneOnMovePresentation(altered);
    const canonicalView = sceneOnFrustrationView({ ...canonicalStage, age: 133 });
    const alteredView = sceneOnFrustrationView({ ...alteredStage, age: 133 });
    expect(alteredView).toMatchObject({ attacker: { species: "ARON", geometry: { side: "opponent" } }, target: { species: "GROVYLE", geometry: { side: "player" } } });
    expect(alteredView.impacts.map((impact) => [impact.slot, impact.matrixNum, impact.order, impact.x, impact.y]))
      .toEqual([[13, 8, 9, 69, 91], [15, 11, 4, 45, 99]]);
    expect(alteredView.impacts.map((impact) => [impact.x, impact.y]))
      .not.toEqual(canonicalView.impacts.map((impact) => [impact.x, impact.y]));
    const canonicalFrame = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...canonicalStage, age: 133 } });
    const alteredFrame = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...alteredStage, age: 133 } });
    expect(sha(alteredFrame)).not.toBe(sha(canonicalFrame));
  });

  it("excludes Metronome, Fake Tears, non-Factory Frustration branches, and every sibling from transfer credit", () => {
    const coverage = json<Json>("ANIMATION_COVERAGE.json");
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "anger-mark-grow-breath");
    expect(track.goal).toContain("no Metronome, Fake Tears, strength-branch, or other sibling credit is inferred");
    expect(track.representatives).not.toContain("MOVE_METRONOME");
    expect(track.representatives).not.toContain("MOVE_FAKE_TEARS");
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/frustrationSourceAudit.ts"], { cwd: root, encoding: "utf8" })) as Json;
    expect(audit.factoryFriendship).toMatchObject({
      animationResult: expect.stringContaining("Frustration_Strongest (result 0) only"),
    });
    expect(audit.factoryFriendship.animationResult).toContain("other three source branches remain pointer-owned and pinned but need non-Factory evidence");
    expect(audit.sourceContract?.siblings).toBeUndefined();
    const frustrationEvidence = json<Json>("tools/compare/fixtures/frustration-evidence.json");
    expect(frustrationEvidence.sourceContract.siblings).toEqual({ MOVE_SWAGGER: "exact", MOVE_TORMENT: "exact", MOVE_TAUNT: "exact", independentCredit: true, inferredFrustrationCredit: false });
    expect(["MOVE_SWAGGER", "MOVE_FRUSTRATION", "MOVE_TORMENT", "MOVE_TAUNT"].map((move) =>
      coverage.entries.find((entry: Json) => entry.move === move).status,
    )).toEqual(["exact", "exact", "exact", "exact"]);
  });
});
