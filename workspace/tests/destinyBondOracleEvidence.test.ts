import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/destiny-bond-off-evidence.json" with { type: "json" };

type Mon = {
  species: number;
  level: number;
  nature: number;
  ivs: Record<string, number>;
  evs: Record<string, number>;
  moves: number[];
  ppUps: number[];
  item: number;
  abilitySlot: number;
  friendship: number;
  gender: string;
  shiny: boolean;
};

type Scenario = {
  schemaVersion: number;
  mode: string;
  profile: string;
  overrides: { parties: { player: Mon[]; opponent: Mon[] }; battlers?: unknown };
  trace: { segments: Array<{ frames: number; buttons: string[] }>; captureFrames: number[] };
};

const evidence = evidenceData as {
  schema: string;
  oracleProfile: string;
  sourceSha256: Record<string, string>;
  instruction: { opcode: number; opcodeHex: string; length: number; operandWidths: number[]; pc: string };
  mutation: { target: string; bit: number; bitName: string; lifecycle: string };
  repeatability: { runsPerCase: number; comparison: string; allMatched: boolean };
  case: {
    scenario: string;
    scenarioSha256: string;
    runManifestSha256: string[];
    builtPartyChecksumsValid: boolean[];
    captures: Array<{
      frame: number;
      rngValue: number;
      currentMove: number;
      player: { hp: number; pp: number[]; status2: number };
      opponent: { hp: number; pp: number[]; status2: number };
    }>;
  };
};

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Destiny Bond registration evidence", () => {
  it("pins the one-byte handler, exact attacker-owned status bit, and source lifetime", () => {
    expect(evidence.instruction).toEqual({
      opcode: 170,
      opcodeHex: "0xaa",
      length: 1,
      operandWidths: [],
      pc: "unconditionally advances by one byte",
    });
    expect(evidence.mutation).toMatchObject({
      target: "gBattleMons[gBattlerAttacker].status2",
      bit: 1 << 25,
      bitName: "STATUS2_DESTINY_BOND",
    });

    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "level_up_learnsets.h": sha256("reference/pokeemerald/src/data/pokemon/level_up_learnsets.h"),
      "tutor_learnsets.h": sha256("reference/pokeemerald/src/data/pokemon/tutor_learnsets.h"),
    }).toEqual(evidence.sourceSha256);

    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    expect(macro).toContain(".macro setdestinybond\n\t.byte B_SCR_OP_SETDESTINYBOND\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETDESTINYBOND]                  = Cmd_setdestinybond,                          //0xAA");
    expect(commands).toContain("gBattleMons[gBattlerAttacker].status2 |= STATUS2_DESTINY_BOND;\n    gBattlescriptCurrInstr++;");
    expect(util).toContain("ClearFuryCutterDestinyBondGrudge(gBattlerAttacker);");
    expect(util).toContain("gBattleMons[battler].status2 &= ~STATUS2_DESTINY_BOND;");
    expect(commands).toContain("gHitMarker |= HITMARKER_DESTINYBOND;");
    expect(commands).toContain("gBattlescriptCurrInstr = BattleScript_DestinyBondTakesLife;");
    expect(scripts).toContain("BattleScript_EffectDestinyBond::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tsetdestinybond");
    expect(scripts).toContain("printstring STRINGID_PKMNTRYINGTOTAKEFOE");
    expect(scripts).toContain("BattleScript_DestinyBondTakesLife::\n\tprintstring STRINGID_PKMNTOOKFOE");
  });

  it("keeps the complete, controller-driven Factory scenario and deterministic live-to-KO observations", () => {
    expect(evidence.schema).toBe("destiny-bond-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.repeatability).toEqual({ runsPerCase: 2, comparison: "byte-identical full manifest.json", allMatched: true });
    expect(new Set(evidence.case.runManifestSha256).size).toBe(1);
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));

    const scenario = JSON.parse(file(evidence.case.scenario)) as Scenario;
    expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off" });
    expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
    expect(scenario.overrides.battlers).toBeUndefined();
    expect([...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]).toHaveLength(6);
    for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
      expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
      expect(mon.level).toBe(50);
      expect(mon).not.toHaveProperty("hp");
      expect(mon).not.toHaveProperty("status2");
    }
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 202, moves: [68, 243, 227, 194] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 143, moves: [153, 153, 153, 153] });
    expect(scenario.trace.segments).toContainEqual({ frames: 2, buttons: ["RIGHT"] });
    expect(scenario.trace.segments).toContainEqual({ frames: 2, buttons: ["DOWN"] });
    expect(scenario.trace.captureFrames).toEqual(evidence.case.captures.map(({ frame }) => frame));

    const [start, selected, live, explosion, dualFaint, cleared] = evidence.case.captures;
    expect(start).toMatchObject({ frame: 0, currentMove: 0, player: { hp: 265, pp: [20, 20, 5, 5], status2: 0 } });
    expect(selected).toMatchObject({ frame: 120, currentMove: 194, player: { status2: 0 } });
    expect(live).toMatchObject({ frame: 160, rngValue: 919694434, currentMove: 194, player: { hp: 265, pp: [20, 20, 5, 4], status2: 1 << 25 } });
    expect(explosion).toMatchObject({ frame: 340, currentMove: 153, player: { hp: 265, status2: 1 << 25 }, opponent: { hp: 0, pp: [5, 4, 5, 5] } });
    expect(dualFaint).toMatchObject({ frame: 700, rngValue: 3421819359, player: { hp: 0, status2: 1 << 25 }, opponent: { hp: 0 } });
    expect(cleared).toMatchObject({ frame: 780, rngValue: 3421819359, player: { hp: 0, status2: 0 }, opponent: { hp: 0 } });
  });
});
