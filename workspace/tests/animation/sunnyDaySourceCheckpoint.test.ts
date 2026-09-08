import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
let cached: Json | undefined;
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/sunnyDaySourceAudit.ts"], { cwd: root, encoding: "utf8" });
const audit = (): Json => cached ??= JSON.parse(auditText());
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function oracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate pinned battle_lab.py");
    candidate = parent;
  }
}

function validateStage(path: string) {
  return spawnSync("python3", ["-c", [
    "import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

describe("MOVE_SUNNY_DAY source and legal staging checkpoint", () => {
  it("is byte-identical across two source-only audit runs and pins the complete pointer-owned interval", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(JSON.parse(first)).toMatchObject({
      move: "MOVE_SUNNY_DAY", moveId: 241, status: "unsupported", coverageCredit: false,
      source: {
        start: "0x082d2707", endExclusive: "0x082d275d", byteLength: 86,
        romSha256: "071e826f54008cdf3600067e74cf318a4dfd513e93bc41b1cf8797723dcf6f36",
        sourceByteLength: 663,
        sourceSha256: "01e605c9208c0c681cf47a20bb371ef0472bb506db66d0fb909cc8f4560b6155",
        commandRows: 19,
        pointerContract: "odd-aligned half-open Move_SUNNY_DAY interval includes the pointer-owned SunnyDayLightRay subroutine",
      },
      graph: {
        blocks: ["Move_SUNNY_DAY", "SunnyDayLightRay"],
        components: [
          "asset:ANIM_TAG_SUNLIGHT", "sprite:gSunlightRaySpriteTemplate", "subroutine:SunnyDayLightRay",
          "task:AnimTask_BlendBattleAnimPal", "visualCommand:blendoff", "visualCommand:clearmonbg",
          "visualCommand:monbg", "visualCommand:panse_adjustnone", "visualCommand:setalpha",
        ],
      },
      subroutine: { name: "SunnyDayLightRay", start: "0x082d2753", calls: 4, delayFrames: 6 },
    });
  });

  it("pins all script commands, Sunlight resources/callbacks, palette fades, weather route, and cleanup intent", () => {
    const result = audit();
    expect(result.commands).toEqual([
      "loadspritegfx ANIM_TAG_SUNLIGHT", "monbg ANIM_ATK_PARTNER", "setalpha 13, 3",
      "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG | F_PAL_BATTLERS_2, 1, 0, 6, RGB_WHITE",
      "waitforvisualfinish", "panse_adjustnone SE_M_PETAL_DANCE, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +1, 0",
      "call SunnyDayLightRay", "call SunnyDayLightRay", "call SunnyDayLightRay", "call SunnyDayLightRay",
      "waitforvisualfinish", "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG | F_PAL_BATTLERS_2, 1, 6, 0, RGB_WHITE",
      "waitforvisualfinish", "clearmonbg ANIM_ATK_PARTNER", "blendoff", "end",
      "createsprite gSunlightRaySpriteTemplate, ANIM_ATTACKER, 40", "delay 6", "return",
    ]);
    expect(result.resources).toEqual({
      tag: "ANIM_TAG_SUNLIGHT", tagValue: 10157, tileBytes: 512,
      gfx: { start: "0x08c1b988", endExclusive: "0x08c1b9ec", byteLength: 100, romSha256: "a745eeaa10fae93c00554f4d119dca7e5fa5d69466c120dbeaa31d1695f7cfb8" },
      palette: { start: "0x08c1b9ec", endExclusive: "0x08c1ba04", byteLength: 24, romSha256: "249a368488db226c3ece9919fc5df22be0d7d03b1f05f8fe4ce1d4a4e7031adb" },
      template: { start: "0x085954a0", endExclusive: "0x085954b8", byteLength: 24, romSha256: "ae593c3db2f9a98aa6eddef31b755b880f22b3878af0fba37da60b62a3b588c1" },
      oam: "gOamData_AffineNormal_ObjBlend_32x32",
      affine: ["AFFINEANIMCMD_FRAME(0x50, 0x50, 0, 0)", "AFFINEANIMCMD_FRAME(0x2, 0x2, 10, 1)", "AFFINEANIMCMD_JUMP(1)"],
    });
    expect(result.callbacks).toEqual({
      AnimSunlight: { start: "0x0810916c", endExclusive: "0x08109198", byteLength: 44, romSha256: "ce019cd8619416b907fddf0a62be5f818cab6b4bb6d3e83b67168a5051a56e64" },
      StartAnimLinearTranslation: { start: "0x080a6eec", endExclusive: "0x080a6f14", byteLength: 40, romSha256: "257fab42a2ac8222b89ad33c5a1fbf80a9dafc83092c0b7c61b425d6e13735f7" },
      StoreSpriteCallbackInData6: { start: "0x080a62d4", endExclusive: "0x080a62dc", byteLength: 8, romSha256: "19ede8ca3eff986acb41c118f86c617962417f6807f3abb0923ce546e808cfad" },
      DestroyAnimSprite: { start: "0x080a3bfc", endExclusive: "0x080a3c1c", byteLength: 32, romSha256: "0091976a9f39b4de3157011fbf4f0140713a42d177d4227726c3f1e536fb8fe6" },
      AnimTask_BlendBattleAnimPal: { start: "0x08116620", endExclusive: "0x08116664", byteLength: 68, romSha256: "975e324bde253daeee7691503316df123b98c1269fb52a92f887476d321b21f7" },
      StartBlendAnimSpriteColor: { start: "0x08116874", endExclusive: "0x081168b8", byteLength: 68, romSha256: "5f89360f6596e1276579dad6a67f41136ab92bab3b23e46858d213a72b4a510a" },
      AnimTask_BlendSpriteColor_Step2: { start: "0x081168b8", endExclusive: "0x08116960", byteLength: 168, romSha256: "6dc34db55f4f0983d35aa117996a7a8dad3d0a7a03436b2f517bf3024c075759" },
      DestroyAnimVisualTask: { start: "0x080a3c1c", endExclusive: "0x080a3c38", byteLength: 28, romSha256: "7a15376984e9f5be2039329a51b466c5d4d5ea1486be304df5bf96a617428b23" },
    });
    expect(result.behavior).toMatchObject({
      palette: { selector: "F_PAL_BG | F_PAL_BATTLERS_2", color: "RGB_WHITE", delay: 1, rampIn: { initial: 0, target: 6 }, rampOut: { initial: 6, target: 0 } },
      background: { command: "monbg ANIM_ATK_PARTNER", cleanup: "clearmonbg ANIM_ATK_PARTNER" },
      blend: { setalpha: { eva: 13, evb: 3 }, cleanup: "blendoff" },
      audio: { command: "panse_adjustnone", sound: "SE_M_PETAL_DANCE", id: 202, from: "SOUND_PAN_ATTACKER", to: "SOUND_PAN_TARGET", increment: 1, delay: 0 },
      weather: { continuedWeatherEntry: "General_Sun: goto Move_SUNNY_DAY", ownership: "presentation reuses this script; weather state itself is not staged or owned here" },
      resourceLifetime: { explicitUnload: false },
    });
  });

  it("derives the complete 25-set/23-species Level-50 carrier census and lowest legal carrier", () => {
    const carriers = audit().carriers;
    expect(carriers).toMatchObject({ level50Range: { first: 110, last: 849 }, setCount: 25, speciesCount: 23 });
    expect(carriers.all.map((entry: Json) => [entry.index, entry.label])).toEqual([
      [255, "FRONTIER_MON_BELLOSSOM_1"], [272, "FRONTIER_MON_GLOOM_2"], [348, "FRONTIER_MON_TROPIUS_2"],
      [360, "FRONTIER_MON_BELLOSSOM_2"], [438, "FRONTIER_MON_EXEGGUTOR_1"], [441, "FRONTIER_MON_VENUSAUR_1"],
      [445, "FRONTIER_MON_MEGANIUM_1"], [451, "FRONTIER_MON_BLAZIKEN_1"], [454, "FRONTIER_MON_CHARIZARD_1"],
      [455, "FRONTIER_MON_TYPHLOSION_1"], [493, "FRONTIER_MON_EXPLOUD_2"], [526, "FRONTIER_MON_NINETALES_2"],
      [532, "FRONTIER_MON_PORYGON2_2"], [536, "FRONTIER_MON_FLYGON_2"], [560, "FRONTIER_MON_ARCANINE_2"],
      [590, "FRONTIER_MON_SHIFTRY_3"], [608, "FRONTIER_MON_CRADILY_3"], [611, "FRONTIER_MON_RAPIDASH_3"],
      [620, "FRONTIER_MON_CLAYDOL_3"], [682, "FRONTIER_MON_VILEPLUME_4"], [714, "FRONTIER_MON_HOUNDOOM_4"],
      [729, "FRONTIER_MON_VENUSAUR_4"], [732, "FRONTIER_MON_FLAREON_4"], [771, "FRONTIER_MON_ENTEI_2"], [780, "FRONTIER_MON_MOLTRES_3"],
    ]);
    expect(carriers.lowest).toMatchObject({
      index: 255, label: "FRONTIER_MON_BELLOSSOM_1", species: "SPECIES_BELLOSSOM",
      moves: ["MOVE_PETAL_DANCE", "MOVE_SAFEGUARD", "MOVE_SUNNY_DAY", "MOVE_SYNTHESIS"],
      itemName: "BATTLE_FRONTIER_ITEM_PERSIM_BERRY", nature: "NATURE_QUIET",
      evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
    });
    expect(carriers.lowestLegalRoute).toEqual({ challengeNum: 1, level50Range: [162, 266], trainerId: 80, regularTrainerRange: [80, 119] });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-sunny-day-player-bellossom-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-sunny-day-opponent-bellossom-player-onix.json", false],
  ])("validates the %s complete legal transient-free party-only stage", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 1, battleNum: 0, trainerId: 80,
      playerSetIds: playerAttacker ? [255, 256, 259] : [260, 261, 262],
      opponentSetIds: playerAttacker ? [260, 261, 262] : [255, 256, 259],
      seed: playerAttacker ? 305420241 : 305420242,
    });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).toEqual({ segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
    ] });
    expect(stage).not.toHaveProperty("preCheckpointCaptureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    const attacker = playerAttacker ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    const constrainedOpponent = playerAttacker ? stage.overrides.parties.opponent[0] : stage.overrides.parties.opponent[0];
    expect(attacker).toMatchObject({ species: 182, level: 50, nature: 17, moves: [241, 241, 241, 241], abilitySlot: 0, friendship: 70, gender: "female", shiny: false });
    expect(constrainedOpponent.moves).toEqual([playerAttacker ? 33 : 241, playerAttacker ? 33 : 241, playerAttacker ? 33 : 241, playerAttacker ? 33 : 241]);
  });

  it("keeps Sunny Day explicitly unsupported with no component/latch/coverage credit while weather controls stay independent", () => {
    expect(audit().checkpoint).toEqual({
      sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: false, productionChanged: false,
      coveragePromotion: false, componentTrackCredit: false, latchPromotion: false, unsupportedNoCreditBoundary: true,
    });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(237);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SUNNY_DAY")).toBeUndefined();
    for (const move of ["MOVE_RAIN_DANCE", "MOVE_SANDSTORM", "MOVE_HAIL"]) {
      expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
    }
  });
});
