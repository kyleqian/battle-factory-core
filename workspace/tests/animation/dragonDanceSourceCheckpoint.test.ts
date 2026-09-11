import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
let cached: Json | undefined;
const audit = (): Json => cached ??= JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/dragonDanceSourceAudit.ts"], { cwd: root, encoding: "utf8" }));
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

describe("MOVE_DRAGON_DANCE source and legal staging contract", () => {
  it("pins the complete half-open ROM/source body and exact seven-component generated graph", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_DRAGON_DANCE", moveId: 349, status: "exact", coverageCredit: true,
      source: {
        start: "0x082cf3b3", endExclusive: "0x082cf422", byteLength: 111,
        romSha256: "ffc1fe7441a450beeaf621ad3f95b4a70aced93501139ea7867a7d95a941775e",
        sourceByteLength: 875, sourceSha256: "5e33b5ec858eec14c86e90a9462ad92aad8e915be08ad657bd618a6255d1e3c3", commandRows: 22,
      },
      graph: {
        blocks: ["Move_DRAGON_DANCE"],
        components: [
          "asset:ANIM_TAG_HOLLOW_ORB", "task:AnimTask_BlendPalInAndOutByTag", "task:AnimTask_DragonDanceWaver",
          "visualCommand:clearmonbg", "visualCommand:create_dragon_dance_orb_sprite", "visualCommand:monbg", "visualCommand:splitbgprio",
        ],
      },
    });
  });

  it("pins the Hollow Orb resource, template/callback/task intervals, scanline/palette behavior, and audio", () => {
    const result = audit();
    expect(result.resources).toEqual({
      tag: "ANIM_TAG_HOLLOW_ORB", tagValue: 10249, tileBytes: 128,
      gfx: { start: "0x08c2ebd4", endExclusive: "0x08c2ec24", byteLength: 80, romSha256: "b071962a4a4f984180165311c762b888510bacb3c9beb631a79fdefb1f10b974" },
      palette: { start: "0x08c2ec24", endExclusive: "0x08c2ec44", byteLength: 32, romSha256: "9c1c91b9944a2a6034adea92377ae8f929384748751ad1bf6b4bcc08d4ff1cca" },
      template: { start: "0x08596f98", endExclusive: "0x08596fb0", byteLength: 24, romSha256: "e12c7461189e7c08c01c809f5922ffecf91ee8786a68448b6b725e2bdb8b6af5" },
    });
    expect(result.callbacks).toMatchObject({
      AnimDragonDanceOrb: { start: "0x08113250", endExclusive: "0x081132e0", byteLength: 144, romSha256: "fdc0da46178fd0dfd47545c4294d41c1e1404dab8bf62f623242c7e938d9ccf5" },
      AnimDragonDanceOrb_Step: { start: "0x081132e0", endExclusive: "0x081133e8", byteLength: 264, romSha256: "12115c85ec0bf0c030e76de136084bb627e1d12abe9e92ac280e6ad7878e971e" },
      AnimTask_BlendPalInAndOutByTag: { start: "0x080a7cb4", endExclusive: "0x080a7cfc", byteLength: 72, romSha256: "2e144cd894540bef29beadf3e237f2ace8a6e3fbae16a25eb2fea1795837332c" },
      AnimTask_DragonDanceWaver: { start: "0x081133e8", endExclusive: "0x081134b8", byteLength: 208, romSha256: "b7936086a774e623fe10ba74b851a1676fd57b2f6427dd29d37d4f3affe24417" },
      AnimTask_DragonDanceWaver_Step: { start: "0x081134b8", endExclusive: "0x08113572", byteLength: 186, romSha256: "34d7b326630d275e55f512ebc21bd7e80f9aa4d7fea08f0b29acac58476f9d4e" },
      UpdateDragonDanceScanlineEffect: { start: "0x08113574", endExclusive: "0x081135ec", byteLength: 120, romSha256: "4fc3e589bf55b3ed403aa7e9a034c5f9b4b83471e8893cc753b38984cf787f4f" },
    });
    expect(result.behavior.audio).toEqual({ sound: "SE_M_TELEPORT", id: 203, calls: 3, pan: "SOUND_PAN_ATTACKER", delays: [0, 30, 30] });
  });

  it("derives the complete 14-set/10-species Level-50 carrier census and lowest legal carrier", () => {
    const carriers = audit().carriers;
    expect(carriers).toMatchObject({ level50Range: { first: 110, last: 849 }, setCount: 14, speciesCount: 10 });
    expect(carriers.all.map((entry: Json) => [entry.index, entry.label])).toEqual([
      [306, "FRONTIER_MON_DRAGONAIR_2"], [310, "FRONTIER_MON_SHELGON_2"], [324, "FRONTIER_MON_SEADRA_2"],
      [459, "FRONTIER_MON_GYARADOS_1"], [550, "FRONTIER_MON_CHARIZARD_2"], [604, "FRONTIER_MON_ALTARIA_3"],
      [648, "FRONTIER_MON_LAPRAS_3"], [653, "FRONTIER_MON_KINGDRA_3"], [747, "FRONTIER_MON_GYARADOS_4"],
      [749, "FRONTIER_MON_KINGDRA_4"], [753, "FRONTIER_MON_SALAMENCE_4"], [828, "FRONTIER_MON_SALAMENCE_5"],
      [829, "FRONTIER_MON_SALAMENCE_6"], [848, "FRONTIER_MON_LATIOS_7"],
    ]);
    expect(carriers.lowest).toMatchObject({
      index: 306, label: "FRONTIER_MON_DRAGONAIR_2", species: "SPECIES_DRAGONAIR",
      moves: ["MOVE_RETURN", "MOVE_REST", "MOVE_THUNDER_WAVE", "MOVE_DRAGON_DANCE"],
      itemName: "BATTLE_FRONTIER_ITEM_CHESTO_BERRY", nature: "NATURE_ADAMANT",
      evSpreadStats: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_HP"],
    });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-dragon-dance-player-dragonair-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-dragon-dance-opponent-dragonair-player-onix.json", false],
  ])("validates the %s complete legal party-only lowest-carrier stage", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 0, trainerId: 110 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]); expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys); expect(Object.keys(mon.ivs).sort()).toEqual(statKeys); expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
        for (const key of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    const attacker = playerAttacker ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    expect(attacker).toMatchObject({ species: 148, level: 50, nature: 3, moves: [349, 349, 349, 349], item: 134, abilitySlot: 0, friendship: 70, gender: "female", shiny: false });
  });

  it("records move-owned dense, production, and coverage credit without track or latch transfer", () => {
    expect(audit().checkpoint).toEqual({ legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, productionChanged: true, coveragePromotion: true, componentTrackCredit: false, latchPromotion: false });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(249);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_DRAGON_DANCE")).toMatchObject({ status: "exact" });
  });
});
