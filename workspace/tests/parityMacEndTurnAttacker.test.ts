import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

// docs/parity-mac/end-turn-attacker.md (fix 40). DoFieldEndTurnEffects sets gBattlerAttacker to the first present battler on every entry
// (battle_util.c:1186-1191), and BattleTurnPassed enters it again after every end-of-turn script. So when a Pokemon faints from poison at the end of
// the turn and its replacement faints from Spikes as it comes in, the `moveendall` of BattleScript_SpikesOnFaintedBattlerFainted writes
// gLastMoves[first present battler] = MOVE_UNAVAILABLE: the player's last move is forgotten, the fainted side's is not touched.
// ROM: staged battle spikes-faint-at-turn-end (gLastMoves ends as [0xFFFF, 0]; the engine had [61, 0xFFFF]).

const SPIKES = 191;
const SPLASH = 150;
const SPECIES_WOBBUFFET = 202;
const STATUS1_POISON = 1 << 3;
const MOVE_UNAVAILABLE = 0xffff;

function config(): FactoryFullTurnConfig {
  return Object.freeze({
    requestId: 1,
    rngSeed: 9,
    player: {
      species: SPECIES_WOBBUFFET, moveId: SPIKES,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100, hp: 300,
    },
    // poisoned, 10 HP of 300: the poison step at the end of the turn takes it
    trainer: {
      species: SPECIES_WOBBUFFET, moveId: SPLASH, status1: STATUS1_POISON,
      attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 50, hp: 10, maxHp: 300,
    },
    trainerBenchHp: [10, 0] as [number, number], // the one replacement has 10 of 200 HP: one layer of Spikes (25) takes it as it comes in
    trainerBenchOverride: [{
      species: SPECIES_WOBBUFFET, abilityNum: 0, moves: [SPLASH, 0, 0, 0], item: 0,
      maxHP: 200, attack: 80, defense: 100, speed: 50, spAttack: 40, spDefense: 100,
    }, undefined] as FactoryFullTurnConfig["trainerBenchOverride"],
  }) as FactoryFullTurnConfig;
}

describe("the attacker the game holds when an end-of-turn replacement faints from Spikes", () => {
  it("forgets the last move of the first present Pokemon (the player's), not of the fainted side", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const first = initial.boundary;
    if (first?.kind !== "decision-required" || first.request.kind !== "command") throw new Error("expected the player's command");
    const afterPlayer = submitFactoryFullTurnDecision(initial, { requestId: 1, side: "player", decision: first.request.legalDecisions.find((d) => d.kind === "use-move")! });
    if (afterPlayer.kind !== "decision-required" || afterPlayer.nextRequest.kind !== "command") throw new Error("expected the trainer's command");
    const done = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer", decision: afterPlayer.nextRequest.legalDecisions.find((d) => d.kind === "use-move")!,
    });
    if (done.kind === "machine-barrier") throw new Error(`unexpected machine-barrier: ${JSON.stringify(done.barrier)}`);
    const rules = done.state.rules.rulesContext;
    // both of the trainer's Pokemon are down: the poisoned one, then its replacement on the Spikes
    expect(rules.party.opponent[0]!.hp).toBe(0);
    expect(rules.party.opponent[1]!.hp).toBe(0);
    const messages = done.events.flatMap(({ payload }) => (payload.kind === "message" ? [payload.messageId] : []));
    expect(messages).toContain("STRINGID_PKMNHURTBYPOISON");
    expect(messages).toContain("STRINGID_PKMNHURTBYSPIKES");
    expect(rules.moveHistory.lastMoves[0]).toBe(MOVE_UNAVAILABLE);
    expect(rules.moveHistory.lastMoves[1]).not.toBe(MOVE_UNAVAILABLE);
  });
});
