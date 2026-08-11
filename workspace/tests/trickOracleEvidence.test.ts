import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/trick-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Trick / tryswapitems evidence", () => {
  it("pins opcode 0xd2's pointer width, all guard branches, Sticky Hold route, success writes, and zero local RNG", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 210,
      opcodeHex: "0xd2",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }],
      failurePc: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)",
      successPc: "gBattlescriptCurrInstr += 5",
      localRngCalls: 0,
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const constants = file("reference/pokeemerald/include/constants/battle_script_commands.h");
    const start = commands.lastIndexOf("static void Cmd_tryswapitems(void)");
    const handler = commands.slice(start, commands.indexOf("// Role Play", start));
    expect(macro).toContain(".macro tryswapitems ptr:req\n\t.byte B_SCR_OP_TRYSWAPITEMS\n\t.4byte \\ptr");
    expect(constants).toContain("    B_SCR_OP_TRYSWAPITEMS,");
    expect(commands).toContain("[B_SCR_OP_TRYSWAPITEMS]                    = Cmd_tryswapitems,                            //0xD2");
    expect(handler).toMatch(/BATTLE_TYPE_TRAINER_HILL[\s\S]*?GetBattlerSide\(gBattlerAttacker\) == B_SIDE_OPPONENT[\s\S]*?BATTLE_TYPE_RECORDED_LINK[\s\S]*?knockedOffMons\[sideAttacker\][\s\S]*?knockedOffMons\[sideTarget\][\s\S]*?ITEM_NONE && gBattleMons\[gBattlerTarget\]\.item == ITEM_NONE[\s\S]*?ITEM_ENIGMA_BERRY[\s\S]*?IS_ITEM_MAIL\(gBattleMons\[gBattlerAttacker\]\.item\)[\s\S]*?IS_ITEM_MAIL\(gBattleMons\[gBattlerTarget\]\.item\)[\s\S]*?ABILITY_STICKY_HOLD[\s\S]*?BattleScript_StickyHoldActivates[\s\S]*?gLastUsedAbility[\s\S]*?RecordAbilityBattle/);
    expect(handler).toMatch(/changedItems\[gBattlerAttacker\][\s\S]*?gBattleMons\[gBattlerAttacker\]\.item = ITEM_NONE;[\s\S]*?REQUEST_HELDITEM_BATTLE[\s\S]*?REQUEST_HELDITEM_BATTLE[\s\S]*?choicedMove\[gBattlerTarget\][\s\S]*?choicedMove\[gBattlerAttacker\][\s\S]*?gBattlescriptCurrInstr \+= 5;[\s\S]*?B_MSG_ITEM_SWAP_BOTH[\s\S]*?B_MSG_ITEM_SWAP_TAKEN[\s\S]*?B_MSG_ITEM_SWAP_GIVEN/);
    expect(handler).not.toContain("Random(");
  });

  it("pins source ordering, persistence controllers, Factory carrier, and later item-read seams", () => {
    expect(Object.fromEntries(Object.keys(evidence.sourceSha256).map((key) => [key, sha256({
      "battle_script_commands.c": "reference/pokeemerald/src/battle_script_commands.c", "battle_scripts_1.s": "reference/pokeemerald/data/battle_scripts_1.s", "battle_script.inc": "reference/pokeemerald/asm/macros/battle_script.inc", "battle_script_commands.h": "reference/pokeemerald/include/constants/battle_script_commands.h", "battle_move_effects.h": "reference/pokeemerald/include/constants/battle_move_effects.h", "battle_moves.h": "reference/pokeemerald/src/data/battle_moves.h", "battle_frontier_mons.h": "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h", "battle_frontier_mons.constants.h": "reference/pokeemerald/include/constants/battle_frontier_mons.h", "battle_frontier.h": "reference/pokeemerald/include/constants/battle_frontier.h", "battle_tower.c": "reference/pokeemerald/src/battle_tower.c", "battle_main.c": "reference/pokeemerald/src/battle_main.c", "battle_controller_player.c": "reference/pokeemerald/src/battle_controller_player.c", "battle_controller_opponent.c": "reference/pokeemerald/src/battle_controller_opponent.c", "battle_message.c": "reference/pokeemerald/src/battle_message.c", "battle_util.c": "reference/pokeemerald/src/battle_util.c", "moves.h": "reference/pokeemerald/include/constants/moves.h", "items.h": "reference/pokeemerald/include/constants/items.h", "pokemon.h": "reference/pokeemerald/include/constants/pokemon.h",
    }[key]!)]))).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const playerController = file("reference/pokeemerald/src/battle_controller_player.c");
    const opponentController = file("reference/pokeemerald/src/battle_controller_opponent.c");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    expect(scripts).toContain("BattleScript_EffectTrick::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tjumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed\n\taccuracycheck BattleScript_ButItFailed, ACC_CURR_MOVE\n\ttryswapitems BattleScript_ButItFailed");
    expect(scripts).toContain("BattleScript_StickyHoldActivates::\n\tpause B_WAIT_TIME_SHORT\n\tprintstring STRINGID_PKMNSXMADEYINEFFECTIVE");
    expect(commands).toMatch(/case MOVEEND_CHANGED_ITEMS:[\s\S]*?gBattleMons\[i\]\.item = \*changedItem;[\s\S]*?\*changedItem = ITEM_NONE;/);
    expect(playerController).toContain("SetMonData(&gPlayerParty[monId], MON_DATA_HELD_ITEM, &gBattleBufferA[gActiveBattler][3]);");
    expect(opponentController).toContain("SetMonData(&gEnemyParty[monId], MON_DATA_HELD_ITEM, &gBattleBufferA[gActiveBattler][3]);");
    expect(util).toMatch(/HOLD_EFFECT_CHOICE_BAND[\s\S]*?gLastUsedItem = gBattleMons\[gActiveBattler\]\.item/);
    expect(util).toMatch(/case ITEMEFFECT_MOVE_END:[\s\S]*?gLastUsedItem = gBattleMons\[battler\]\.item/);
    expect(frontier).toMatch(/\[FRONTIER_MON_FURRET_2\][\s\S]*?\.species = SPECIES_FURRET,[\s\S]*?\.moves = \{MOVE_TRICK, MOVE_FRUSTRATION, MOVE_SHADOW_BALL, MOVE_FOLLOW_ME\},[\s\S]*?BATTLE_FRONTIER_ITEM_CHOICE_BAND,[\s\S]*?NATURE_ADAMANT/);
  });

  it("keeps the complete-party unequal-item success receipt reproducible and bounded", () => {
    expect(evidence.schema).toBe("trick-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "165501dd788331d27b42a4f9cc449c2231fc273364ea28cb7bf40b5dce1adf37" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarrier).toEqual({ setId: 304, name: "FRONTIER_MON_FURRET_2", level50Eligible: true, species: 162, moves: [271, 218, 247, 266], item: 186, itemTableId: 16, nature: 3 });
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 162, moves: [271, 218, 247, 266], item: 186, nature: 3 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [33, 33, 33, 33], item: 200 });
    for (let frame = evidence.case.denseWindow.start; frame <= evidence.case.denseWindow.end; frame += evidence.case.denseWindow.step) expect(scenario.trace.captureFrames).toContain(frame);
    const before = evidence.case.observed[0];
    const ppAndControllerSeam = evidence.case.observed[1];
    const settledSwap = evidence.case.observed[2];
    expect(before).toMatchObject({ currentMove: 0, player: { pp: [10, 20, 15, 20], activeItem: 186, partyItem: 186 }, opponent: { activeItem: 200, partyItem: 200 } });
    expect(ppAndControllerSeam).toMatchObject({ frame: 600, currentMove: 271, player: { pp: [9, 20, 15, 20], activeItem: 0, partyItem: 200 }, opponent: { activeItem: 186, partyItem: 186 } });
    expect(settledSwap).toMatchObject({ frame: 740, currentMove: 271, player: { activeItem: 200, partyItem: 200 }, opponent: { activeItem: 186, partyItem: 186 } });
    expect(evidence.case.observed.at(-1)).toMatchObject({ frame: 1268, player: { hp: 158, pp: [9, 20, 15, 20], activeItem: 200, partyItem: 200 }, opponent: { pp: [35, 35, 35, 34], activeItem: 186, partyItem: 186 } });
    expect(evidence.boundedRemainder).toContain("Sticky Hold");
  });
});
