/**
 * ISSUES #119 -- `forced-switch resume unexpectedly halted on a second
 * player-choice-required opcode`.
 *
 * `BattleScript_HandleFaintedMon` is ONE script that can ask the player for a
 * replacement more than once, because the Spikes tail loops straight back into
 * its own head (`data/battle_scripts_1.s`):
 *
 *     BattleScript_FaintedMonSendOutNew::      @ :2882
 *         ...
 *         switchineffects BS_FAINTED           @ :2892
 *     BattleScript_SpikesOnFaintedBattler::    @ :3418
 *         ...
 *         tryfaintmon_spikes BS_FAINTED, BattleScript_SpikesOnFaintedBattlerFainted
 *     BattleScript_SpikesOnFaintedBattlerFainted:: @ :3427
 *         setbyte sGIVEEXP_STATE, 0
 *         getexp BS_FAINTED
 *         moveendall
 *         goto BattleScript_HandleFaintedMon   @ :3431 -- back to the top
 *
 * `Cmd_switchineffects` (`src/battle_script_commands.c:5229-5256`) pushes
 * `BattleScript_SpikesOnFaintedBattler` whenever the side has SIDE_STATUS_SPIKES
 * and its transient SPIKES_DAMAGED guard is still clear, so the replacement the
 * player just picked can itself faint on entry; the `goto` then re-enters
 * `BattleScript_FaintedMonTryChoose`'s `openpartyscreen BS_FAINTED` (`:2843`)
 * and the script machine simply halts for a SECOND player choice. Source needs
 * no special resume shape for that -- it is a plain jump inside one
 * `BattleScriptExecute`.
 *
 * This port's `resumeBattleScriptFaintedActionsAfterPlayerChoice`
 * (`battleScriptFaintedActionsOrchestration.ts`) threw on that second halt, and
 * both reducers rejected a `player-choice-required` resume result outright.
 *
 * Live repro (fixed by this pin): `node --experimental-strip-types
 * tools/soak/randomRoundSoak.ts --policy winning-swap --seed 130
 * --render-every 0` -- battle 3 turn 29, frame 422497. Three Spikes layers sat
 * on the player's own side (`spikesAmount: 3` => `maxHP / ((5 - 3) * 2)`), the
 * active fainted to the opponent's move, and the 15-HP replacement the policy
 * picked took 40 Spikes damage the instant it landed.
 *
 * The staging below is that shape with no soak prefix: the trainer one-shots the
 * player's active, the player picks the low-HP bench slot, Spikes kills it on
 * entry, and the reducer must surface a SECOND forced-switch request naming the
 * one bench slot left.
 */
import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";

const STRENGTH = 70;
const TACKLE = 33;
/** include/constants/battle.h -- SIDE_STATUS_SPIKES. */
const SIDE_STATUS_SPIKES = 1 << 4;
/** include/constants/battle.h:217 -- the transient per-switch-in guard. */
const SIDE_STATUS_SPIKES_DAMAGED = 1 << 9;
/** The banked KO-scenario seed shared by every full-turn fixture. */
const KO_SCENARIO_RNG_SEED = 919694434;
const PLAYER_ATTACKS = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const });
const TRAINER_ATTACKS = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });

/**
 * `playerForcedSwitchConfig`'s own banked one-shot numbers
 * (factoryBattleScriptFullTurnDecision.test.ts): the trainer is faster (100 vs
 * 50) and kills the player's 90-HP active in one STRENGTH. Both bench slots are
 * alive, and slot 1 sits at 20 HP against 50 Spikes damage (200 / ((5-3)*2)).
 */
function spikesSecondChoiceConfig(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    player: {
      species: 43, moveId: STRENGTH, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 90,
    },
    trainer: {
      species: 1, moveId: STRENGTH, attack: 200, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 100,
    },
    playerBenchHp: [20, 145],
    playerBenchOverride: [
      {
        species: 23, abilityNum: 0, moves: [TACKLE, 0, 0, 0],
        maxHP: 200, attack: 80, defense: 200, speed: 50, spAttack: 40, spDefense: 100,
      },
      {
        species: 27, abilityNum: 0, moves: [TACKLE, 0, 0, 0],
        maxHP: 150, attack: 80, defense: 200, speed: 50, spAttack: 40, spDefense: 100,
      },
    ],
  };
}

/** Three Spikes layers on the PLAYER's own side (side 0) -- the soak seed's own board. */
function withPlayerSpikes(base: BattleScriptRulesContext): BattleScriptRulesContext {
  return Object.freeze({
    ...base,
    sideStatuses: Object.freeze([
      (base.sideStatuses[0] | SIDE_STATUS_SPIKES) >>> 0,
      base.sideStatuses[1],
    ]) as unknown as BattleScriptRulesContext["sideStatuses"],
    sideTimers: Object.freeze([
      Object.freeze({ ...base.sideTimers[0], spikesAmount: 3 }),
      base.sideTimers[1],
    ]) as unknown as BattleScriptRulesContext["sideTimers"],
  });
}

function stagedBattle() {
  const initial = createFactoryFullTurnBattleState(spikesSecondChoiceConfig());
  return Object.freeze({
    ...initial,
    rules: Object.freeze({
      ...initial.rules,
      rulesContext: withPlayerSpikes(initial.rules.rulesContext),
    }),
  }) as typeof initial;
}

/** Plays the turn up to the FIRST forced-switch request (the ordinary KO halt). */
function toFirstForcedSwitch() {
  const afterPlayer = submitFactoryFullTurnDecision(stagedBattle(), {
    requestId: 1, side: "player", decision: PLAYER_ATTACKS,
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer command request");
  const paused = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
  });
  if (paused.kind !== "decision-required") throw new Error("expected the first forced-switch request");
  return paused;
}

describe("ISSUES #119 -- HandleFaintedMon can ask the player twice in one script run", () => {
  it("the killing blow halts on the ordinary first forced-switch request over both living bench slots", () => {
    const paused = toFirstForcedSwitch();
    expect(paused.nextRequest).toMatchObject({
      kind: "forced-switch",
      side: "player",
      battler: 0,
      faintedPartyIndex: 0,
      legalPartyIndexes: [1, 2],
    });
    expect(paused.state.rules.phase).toBe("forced-switch-pending");
  });

  it("a replacement that faints to Spikes on entry surfaces a SECOND forced-switch request, not a throw", () => {
    const paused = toFirstForcedSwitch();
    if (paused.kind !== "decision-required") throw new Error("expected the first forced-switch request");

    const second = submitFactoryFullTurnDecision(paused.state, {
      requestId: paused.nextRequest.requestId,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (second.kind !== "decision-required") throw new Error("expected a second forced-switch request");
    // BattleScript_SpikesOnFaintedBattlerFainted's `goto BattleScript_HandleFaintedMon`
    // re-entered openpartyscreen BS_FAINTED for the freshly fainted slot 1.
    expect(second.nextRequest).toMatchObject({
      kind: "forced-switch",
      side: "player",
      battler: 0,
      faintedPartyIndex: 1,
      legalPartyIndexes: [2],
    });
    expect(second.state.rules.phase).toBe("forced-switch-pending");

    const rc = second.state.rules.rulesContext as BattleScriptRulesContext;
    expect(rc.party.player[1]!.hp).toBe(0);
    expect(rc.battlers[0]!.hp).toBe(0);
    // Cmd_tryfaintmon's own spikes variant clears the transient
    // SIDE_STATUS_SPIKES_DAMAGED guard on the way out
    // (battle_script_commands.c:2978), so the NEXT replacement is hurt too.
    expect(rc.sideStatuses[0] & SIDE_STATUS_SPIKES_DAMAGED).toBe(0);
  });

  it("submitting the last living slot finishes the same script run and resumes the battle", () => {
    const paused = toFirstForcedSwitch();
    if (paused.kind !== "decision-required") throw new Error("expected the first forced-switch request");
    const second = submitFactoryFullTurnDecision(paused.state, {
      requestId: paused.nextRequest.requestId, side: "player", decision: { kind: "switch", partyIndex: 1 },
    });
    if (second.kind !== "decision-required") throw new Error("expected a second forced-switch request");

    const resumed = submitFactoryFullTurnDecision(second.state, {
      requestId: second.nextRequest.requestId, side: "player", decision: { kind: "switch", partyIndex: 2 },
    });
    if (resumed.kind !== "decision-required") throw new Error("expected the battle to continue");
    const rc = resumed.state.rules.rulesContext as BattleScriptRulesContext;
    // Slot 2 is out and took its own 150/4 = 37 Spikes hit (the guard was
    // cleared by Cmd_tryfaintmon, battle_script_commands.c:2978), surviving it.
    expect(rc.battlers[0]).toMatchObject({ species: 27, partyIndex: 2, hp: 108 });
    expect(rc.party.player[2]!.hp).toBe(108);
    expect(rc.party.player[0]!.hp).toBe(0);
    expect(rc.party.player[1]!.hp).toBe(0);
    expect(resumed.nextRequest.kind).toBe("command");
  });
});
