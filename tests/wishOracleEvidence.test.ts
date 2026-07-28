import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/wish-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Wish / trywish registration evidence", () => {
  it("pins the 0xd4 encoding, both operand modes, PC branches, and every Cmd_trywish mutation", () => {
    expect(evidence.instruction).toEqual({
      opcode: 212,
      opcodeHex: "0xd4",
      length: 6,
      operands: [
        { width: 1, encoding: "literal turn selector", values: { setup: 0, heal: 1 } },
        { width: 4, encoding: "little-endian relocation pointer", value: "failure/full-HP script target" },
      ],
      pc: {
        setupSuccess: "gBattlescriptCurrInstr += 6",
        setupPendingWish: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2)",
        healNeedsHp: "gBattlescriptCurrInstr += 6",
        healAtFullHp: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 2)",
      },
    });
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    expect(macro).toContain(".macro trywish turnNumber:req, ptr:req\n\t.byte B_SCR_OP_TRYWISH\n\t.byte \\turnNumber\n\t.4byte \\ptr");
    expect(commands).toContain("[B_SCR_OP_TRYWISH]                         = Cmd_trywish,                                 //0xD4");
    expect(commands).toContain("if (gWishFutureKnock.wishCounter[gBattlerAttacker] == 0)");
    expect(commands).toContain("gWishFutureKnock.wishCounter[gBattlerAttacker] = 2;");
    expect(commands).toContain("gWishFutureKnock.wishMonId[gBattlerAttacker] = gBattlerPartyIndexes[gBattlerAttacker];");
    expect(commands).toContain("PREPARE_MON_NICK_WITH_PREFIX_BUFFER(gBattleTextBuff1, gBattlerTarget, gWishFutureKnock.wishMonId[gBattlerTarget])");
    expect(commands).toContain("gBattleMoveDamage = gBattleMons[gBattlerTarget].maxHP / 2;");
    expect(commands).toContain("if (gBattleMoveDamage == 0)\n            gBattleMoveDamage = 1;\n        gBattleMoveDamage *= -1;");
    expect(commands).toContain("if (gBattleMons[gBattlerTarget].hp == gBattleMons[gBattlerTarget].maxHP)");
  });

  it("pins the delayed positional ownership, scripts, messages, carrier, and source revision", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "pokemon.h": sha256("reference/pokeemerald/include/constants/pokemon.h"),
      "items.h": sha256("reference/pokeemerald/include/constants/items.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const frontierIds = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    expect(scripts).toContain("BattleScript_EffectWish::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\ttrywish 0, BattleScript_ButItFailed");
    expect(scripts).toContain("BattleScript_WishComesTrue::\n\ttrywish 1, BattleScript_WishButFullHp");
    expect(scripts).toContain("printstring STRINGID_PKMNWISHCAMETRUE\n\twaitmessage B_WAIT_TIME_LONG\n\torword gHitMarker, HITMARKER_IGNORE_SUBSTITUTE\n\thealthbarupdate BS_TARGET\n\tdatahpupdate BS_TARGET\n\tprintstring STRINGID_PKMNREGAINEDHEALTH");
    expect(scripts).toContain("BattleScript_WishButFullHp::\n\tprintstring STRINGID_PKMNWISHCAMETRUE");
    expect(util).toContain("case ENDTURN_WISH:");
    expect(util).toContain("&& --gWishFutureKnock.wishCounter[gActiveBattler] == 0");
    expect(util).toContain("gBattlerTarget = gActiveBattler;\n                    BattleScriptExecute(BattleScript_WishComesTrue);");
    expect(messages).toContain('static const u8 sText_PkmnWishCameTrue[] = _("{B_BUFF1}\'s WISH\\ncame true!");');
    expect(messages).toContain('static const u8 sText_PkmnRegainedHealth[] = _("{B_DEF_NAME_WITH_PREFIX} regained\\nhealth!");');
    expect(messages).toContain('static const u8 sText_ButItFailed[] = _("But it failed!");');
    expect(moves).toMatch(/\[MOVE_WISH\][\s\S]*?\.effect = EFFECT_WISH,[\s\S]*?\.pp = 10,[\s\S]*?\.target = MOVE_TARGET_USER,/);
    expect(frontierIds).toContain("#define FRONTIER_MON_ESPEON_3       638");
    expect(frontier).toMatch(/\[FRONTIER_MON_ESPEON_3\][\s\S]*?\.moves = \{MOVE_PSYCHIC, MOVE_BITE, MOVE_WISH, MOVE_REFLECT\},[\s\S]*?BATTLE_FRONTIER_ITEM_LUM_BERRY,[\s\S]*?NATURE_MODEST/);
  });

  it("keeps the complete-party OFF scenario, genuine damage, delayed heal, and pending-Wish failure reproducible", () => {
    expect(evidence.schema).toBe("wish-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.repeatability).toEqual({ runsPerCase: 2, comparison: "byte-identical full manifest.json", allMatched: true });
    expect(new Set(evidence.case.runManifestSha256).size).toBe(1);
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    const scenario = JSON.parse(file(evidence.case.scenario)) as { overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 196, nature: 15, moves: [94, 44, 273, 115], item: 141 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 135, moves: [33, 33, 33, 33] });
    expect(evidence.case.captures.every(({ frame }) => scenario.trace.captureFrames.includes(frame))).toBe(true);
    const [initial, damaged, wishSet, nextMenu, secondDamage, pendingFailure, healed] = evidence.case.captures;
    expect(initial).toMatchObject({ player: { hp: 140, maxHp: 140, pp: [10, 25, 10, 20] } });
    expect(damaged).toMatchObject({ currentMove: 33, player: { hp: 123, maxHp: 140, pp: [10, 25, 10, 20] }, opponent: { pp: [35, 34, 35, 35] } });
    expect(wishSet).toMatchObject({ currentMove: 0, player: { hp: 123, pp: [10, 25, 9, 20] } });
    expect(nextMenu).toMatchObject({ currentMove: 0, player: { hp: 123, pp: [10, 25, 9, 20] } });
    expect(secondDamage).toMatchObject({ currentMove: 273, player: { hp: 106, pp: [10, 25, 9, 20] }, opponent: { pp: [35, 34, 35, 34] } });
    expect(pendingFailure).toMatchObject({ currentMove: 273, player: { hp: 106, pp: [10, 25, 8, 20] } });
    expect(healed).toMatchObject({ currentMove: 0, player: { hp: 140, maxHp: 140, pp: [10, 25, 8, 20] } });
    expect(healed.player.hp - pendingFailure.player.hp).toBe(healed.player.maxHp - pendingFailure.player.hp);
    expect(Math.floor(healed.player.maxHp / 2)).toBe(70); // source-pinned requested heal magnitude, capped by current HP.
  });
});
