import { describe, expect, it } from "vitest";
import c1 from "../tools/probe/receipts/rcp154-c1-dragged-in-before-acting-off.json" with { type: "json" };
import c1f from "../tools/probe/receipts/rcp154-c1f-census811-shape-foe-dragged-off.json" with { type: "json" };
import c2 from "../tools/probe/receipts/rcp154-c2-encored-mid-turn-selected-off.json" with { type: "json" };
import c2u from "../tools/probe/receipts/rcp154-c2u-encored-mid-turn-user-target-off.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import type { BattleScriptPartyMemberInput } from "../src/engine/battleScriptRulesContext.ts";
import type { FactoryFullTurnBattlerConfig } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { runPortTurns } from "../tools/probe/rcp154PortDriver.ts";
import { verifyReceipt } from "../tools/probe/verify-rcp154.ts";

/**
 * STEP act156 -- action-time engine fixes in the #140 family, replayed
 * hermetically against the banked rcp154 stock-ROM receipts (committed JSON +
 * the live full-turn kernel; no oracle). See docs/act156-action-time-fixes.md.
 */
type Receipt = Parameters<typeof verifyReceipt>[0];
type PartyMon = (typeof c1f)["parties"]["player"][number];
type Moves = readonly [number, number, number, number];

const MOVE_PP = new Map(movesData.moves.map((move) => [move.id, move.pp]));
const ppOf = (moves: readonly number[]) =>
  moves.map((move) => (move === 0 ? 0 : MOVE_PP.get(move) ?? 0)) as [number, number, number, number];

function active(mon: PartyMon): FactoryFullTurnBattlerConfig {
  const entry = speciesTypes.species[mon.species - 1]!;
  return {
    species: mon.species, moveId: mon.moves[0]!, moves: mon.moves as unknown as Moves, pp: ppOf(mon.moves),
    ability: mon.ability, abilityNum: mon.abilitySlot, item: mon.item, personality: mon.personality,
    attack: mon.stats.attack, defense: mon.stats.defense, spAttack: mon.stats.spAttack,
    spDefense: mon.stats.spDefense, speed: mon.stats.speed, hp: mon.hp, maxHp: mon.maxHp,
    types: [entry.types[0]!, entry.types[1]!],
  };
}

function bench(mon: PartyMon): BattleScriptPartyMemberInput {
  return {
    species: mon.species, isEgg: false, abilityNum: mon.abilitySlot,
    ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
    personality: mon.personality, level: mon.level, maxHP: mon.maxHp, hp: mon.hp,
    attack: mon.stats.attack, defense: mon.stats.defense, speed: mon.stats.speed,
    spAttack: mon.stats.spAttack, spDefense: mon.stats.spDefense, item: mon.item,
    moves: mon.moves as unknown as Moves, pp: ppOf(mon.moves),
  };
}

describe("act156 F1 (ISSUES #169) -- a battler dragged in before acting takes no action", () => {
  it.each([
    ["C1: the player's ZIGZAGOON / POOCHYENA dragged in by PIDGEOT's faster Whirlwind", c1],
    ["C1f: census 811's shape, the foe's VOLBEAT / GLOOM dragged in by BEAUTIFLY's Whirlwind", c1f],
  ] as const)("%s replays the stock-ROM receipt draw for draw", (_name, receipt) => {
    const result = verifyReceipt(receipt as unknown as Receipt);
    expect(result.port.stoppedEarly).toBeNull();
    expect(result.comparison.firstDivergence).toBeNull();
    expect(result.comparison.portActiveHp).toEqual(result.comparison.romActiveHp);
    // The per-turn announced-move count is the ROM's HandleAction_UseMove
    // dispatch count: the dragged turns have one, the following turns two
    // (SetActionsAndBattlersTurnOrder rewrites the cancelled slot next turn).
    expect(result.comparison.portUsedMoveMessages).toEqual(result.comparison.romMoveDispatches);
    expect(result.pass).toBe(true);
  });

  it("a dragged-in Intimidate holder still intimidates (HandleFaintedMonActions case 6) but does not act", () => {
    // Synthetic variant of the C1f card: the foe's bench is two GROWLITHE
    // (ability slot 0 = Intimidate). Intimidate's switch-in hook sets
    // STATUS3_INTIMIDATE_POKES and AbilityBattleEffects returns 0, so
    // Cmd_switchineffects still takes the :5270-5274 cancel arm; the pokes bit
    // is consumed after action 1 by HandleAction_TryFinish ->
    // HandleFaintedMonActions case 6 (battle_util.c:1959), before
    // HandleAction_ActionFinished loads the cancelled slot.
    const [player0, player1, player2] = c1f.parties.player;
    const [rhyhorn, gloom] = c1f.parties.opponent;
    const growlithe = (personality: number): PartyMon => ({
      ...gloom!, species: 58, ability: 22, abilitySlot: 0, personality,
      hp: 130, maxHp: 130, stats: { attack: 90, defense: 65, speed: 80, spAttack: 90, spDefense: 70 },
    });
    const run = runPortTurns(
      {
        requestId: 1,
        rngSeed: 0x1234_5678,
        player: active(player0!),
        trainer: active(rhyhorn!),
        playerBenchHp: [player1!.hp, player2!.hp],
        playerBenchOverride: [bench(player1!), bench(player2!)],
        trainerBenchHp: [130, 130],
        trainerBenchOverride: [bench(growlithe(0x0101_0101)), bench(growlithe(0x0202_0202))],
      },
      [
        // Turn 1: BEAUTIFLY's WHIRLWIND (slot 0) vs RHYHORN's banked ROAR.
        { injectAiDraws: 0, playerMoveSlot: 0, playerTargetBattler: 1 },
        // Turn 2: BEAUTIFLY's MEGA DRAIN; the GROWLITHE acts normally.
        { injectAiDraws: 0, playerMoveSlot: 2, playerTargetBattler: 1 },
      ],
    );
    expect(run.stoppedEarly).toBeNull();
    const ids = (turn: number) => run.events.filter((event) => event.turn === turn).map((event) => event.id);
    expect(ids(1)).toContain("STRINGID_PKMNWASDRAGGEDOUT");
    expect(ids(1)).toContain("STRINGID_PKMNCUTSATTACKWITH");
    expect(ids(1).indexOf("STRINGID_PKMNCUTSATTACKWITH")).toBeGreaterThan(ids(1).indexOf("STRINGID_PKMNWASDRAGGEDOUT"));
    expect(ids(1).filter((id) => id === "STRINGID_USEDMOVE")).toHaveLength(1);
    expect(ids(1)).not.toContain("STRINGID_PKMNHPFULL");
    // The cancel does not leak: turn 2 dispatches both actions.
    expect(ids(2).filter((id) => id === "STRINGID_USEDMOVE")).toHaveLength(2);
  });
});

describe("act156 F2 (ISSUES #170) -- a battler Encored mid-turn before acting uses the encored move", () => {
  it.each([
    ["C2: SNORLAX banked DEFENSE CURL, Encored into TACKLE (MOVE_TARGET_SELECTED: one GetMoveTarget draw)", c2],
    ["C2u: SNORLAX banked TACKLE, Encored into DEFENSE CURL (MOVE_TARGET_USER: no draw of its own)", c2u],
  ] as const)("%s replays the stock-ROM receipt draw for draw", (_name, receipt) => {
    const result = verifyReceipt(receipt as unknown as Receipt);
    expect(result.port.stoppedEarly).toBeNull();
    expect(result.comparison.firstDivergence).toBeNull();
    expect(result.comparison.portActiveHp).toEqual(result.comparison.romActiveHp);
    expect(result.comparison.portUsedMoveMessages).toEqual(result.comparison.romMoveDispatches);
    expect(result.pass).toBe(true);
  });

  it("C2 turn 2 pays the Encore arm's GetMoveTarget right after the Encore timer draw", () => {
    const result = verifyReceipt(c2 as unknown as Receipt);
    expect(result.port.turns[1]!.draws.slice(0, 3).map((draw) => draw.reason)).toEqual([
      "accuracycheck", "Encore duration ((Random() & 3) + 3)", "GetMoveTarget(MOVE_TARGET_SELECTED)",
    ]);
    expect(result.port.turns[1]!.events).not.toContain("message:STRINGID_DEFENDERSSTATROSE");
  });
});
