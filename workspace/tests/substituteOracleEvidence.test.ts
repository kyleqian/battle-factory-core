import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/substitute-off-evidence.json" with { type: "json" };

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
  seed: number;
  overrides: { parties: { player: Mon[]; opponent: Mon[] }; battlers?: unknown };
  trace: { segments: Array<{ frames: number; buttons: string[] }>; captureFrames: number[] };
};

const evidence = evidenceData;
const COMPLETE_MON_KEYS = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const ROOT = new URL("..", import.meta.url);

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Substitute / setsubstitute registration evidence", () => {
  it("pins the one-byte handler, attacker-only fields, strict HP predicate, and PC", () => {
    expect(evidence.instruction).toEqual({
      opcode: 156,
      opcodeHex: "0x9c",
      length: 1,
      operandWidths: [],
      pc: "unconditionally advances by one byte after either handler branch",
    });
    expect(evidence.handler).toMatchObject({
      owner: "gBattlerAttacker",
      failure: {
        predicate: "gBattleMons[gBattlerAttacker].hp <= quarterMaxHp",
        moveDamage: 0,
        messageChooser: "B_MSG_SUBSTITUTE_FAILED",
      },
      success: {
        status2Set: "STATUS2_SUBSTITUTE (1 << 24)",
        status2Cleared: "STATUS2_WRAPPED",
        substituteHp: "gDisableStructs[gBattlerAttacker].substituteHP = gBattleMoveDamage",
        messageChooser: "B_MSG_SET_SUBSTITUTE",
        hitMarkerSet: "HITMARKER_IGNORE_SUBSTITUTE",
      },
    });
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "constants_battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
    }).toEqual(evidence.sourceSha256);

    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    expect(macro).toContain(".macro setsubstitute\n\t.byte B_SCR_OP_SETSUBSTITUTE\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETSUBSTITUTE]                   = Cmd_setsubstitute,                           //0x9C");
    expect(commands).toContain("u32 hp = gBattleMons[gBattlerAttacker].maxHP / 4;");
    expect(commands).toContain("if (gBattleMons[gBattlerAttacker].maxHP / 4 == 0)\n        hp = 1;");
    expect(commands).toContain("if (gBattleMons[gBattlerAttacker].hp <= hp)");
    expect(commands).toContain("gBattleMoveDamage = 0;\n        gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_SUBSTITUTE_FAILED;");
    expect(commands).toContain("gBattleMoveDamage = gBattleMons[gBattlerAttacker].maxHP / 4;");
    expect(commands).toContain("gBattleMons[gBattlerAttacker].status2 |= STATUS2_SUBSTITUTE;");
    expect(commands).toContain("gBattleMons[gBattlerAttacker].status2 &= ~STATUS2_WRAPPED;");
    expect(commands).toContain("gDisableStructs[gBattlerAttacker].substituteHP = gBattleMoveDamage;");
    expect(commands).toContain("gBattleCommunication[MULTISTRING_CHOOSER] = B_MSG_SET_SUBSTITUTE;");
    expect(commands).toContain("gHitMarker |= HITMARKER_IGNORE_SUBSTITUTE;");
    expect(commands).toContain("gBattlescriptCurrInstr++;");
  });

  it("pins the genuine effect routes, message table, hidden lifetime, move, and Factory carrier", () => {
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontierMons = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const frontierIds = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    expect(scripts).toMatch(/BattleScript_EffectSubstitute::[\s\S]*?jumpifstatus2 BS_ATTACKER, STATUS2_SUBSTITUTE, BattleScript_AlreadyHasSubstitute[\s\S]*?setsubstitute[\s\S]*?datahpupdate BS_ATTACKER[\s\S]*?BattleScript_AlreadyHasSubstitute::[\s\S]*?STRINGID_PKMNHASSUBSTITUTE/);
    expect(messages).toContain("[B_MSG_SET_SUBSTITUTE]    = STRINGID_PKMNMADESUBSTITUTE,");
    expect(messages).toContain("[B_MSG_SUBSTITUTE_FAILED] = STRINGID_TOOWEAKFORSUBSTITUTE");
    expect(commands).toContain("case MOVEEND_SUBSTITUTE: // update substitute");
    expect(commands).toContain("if (gDisableStructs[i].substituteHP == 0)\n                    gBattleMons[i].status2 &= ~STATUS2_SUBSTITUTE;");
    expect(moves).toMatch(/\[MOVE_SUBSTITUTE\][\s\S]*?\.effect = EFFECT_SUBSTITUTE,[\s\S]*?\.pp = 10,[\s\S]*?\.target = MOVE_TARGET_USER,/);
    expect(frontierIds).toContain("#define FRONTIER_MON_GOLEM_2        498");
    expect(frontierMons).toMatch(/\[FRONTIER_MON_GOLEM_2\][\s\S]*?MOVE_FOCUS_PUNCH, MOVE_SUBSTITUTE, MOVE_DOUBLE_TEAM, MOVE_REST/);
  });

  it("keeps the complete-party, controller-driven successful and already-live routes reproducible", () => {
    expect(evidence.schema).toBe("substitute-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.repeatability).toEqual({ runsPerCase: 2, comparison: "byte-identical full manifest.json", allMatched: true });
    expect(new Set(evidence.case.runManifestSha256).size).toBe(1);
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));

    const scenario = JSON.parse(file(evidence.case.scenario)) as Scenario;
    expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 1 });
    expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
    expect(scenario.overrides.battlers).toBeUndefined();
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) {
      expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
      expect(mon.level).toBe(50);
      expect(mon).not.toHaveProperty("hp");
      expect(mon).not.toHaveProperty("status2");
    }
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 76, moves: [264, 164, 104, 156] });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 213, moves: [106, 106, 106, 106] });
    expect(scenario.trace.segments.filter(({ buttons }) => buttons.includes("RIGHT"))).toHaveLength(2);
    expect(evidence.case.captures.every(({ frame }) => scenario.trace.captureFrames.includes(frame))).toBe(true);

    const [initial, selected, made, nextMenu, retried, alreadyLive, settled] = evidence.case.captures;
    expect(initial).toMatchObject({ player: { hp: 155, maxHp: 155, pp: [20, 10, 15, 10], status2: 0 } });
    expect(selected).toMatchObject({ currentMove: 164, player: { hp: 155, pp: [20, 9, 15, 10], status2: 1 << 24 } });
    expect(made).toMatchObject({ currentMove: 164, player: { hp: 117, maxHp: 155, pp: [20, 9, 15, 10], status2: 1 << 24 } });
    expect(155 - made.player.hp).toBe(Math.floor(155 / 4));
    expect(nextMenu).toMatchObject({ currentMove: 0, player: { hp: 117, pp: [20, 9, 15, 10], status2: 1 << 24 } });
    expect(retried).toMatchObject({ currentMove: 164, player: { hp: 117, pp: [20, 8, 15, 10], status2: 1 << 24 } });
    expect(alreadyLive).toMatchObject({ currentMove: 164, player: { hp: 117, pp: [20, 8, 15, 10], status2: 1 << 24 } });
    expect(settled).toMatchObject({ currentMove: 0, player: { hp: 117, pp: [20, 8, 15, 10], status2: 1 << 24 } });
  });
});
