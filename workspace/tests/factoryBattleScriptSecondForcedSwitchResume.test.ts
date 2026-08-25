/**
 * ISSUES #127 -- a SECOND forced switch inside a mid-action resume must
 * re-publish, not throw.
 *
 * `BattleScript_EffectBatonPass` ends in `switchineffects BS_ATTACKER`
 * (`data/battle_scripts_1.s:1713`). `Cmd_switchineffects`
 * (`src/battle_script_commands.c:5219`) applies Spikes under the `:5228-5231`
 * guard and picks the damage script by its OWN operand at `:5248-5253`, so the
 * mon the player just passed to takes `BattleScript_SpikesOnAttacker` ->
 * `tryfaintmon_spikes BS_ATTACKER, BattleScript_SpikesOnAttackerFainted` ->
 * `goto BattleScript_HandleFaintedMon` (`:3390-3400`), whose `openpartyscreen
 * BS_FAINTED` halts for a SECOND player choice INSIDE the same script run --
 * the run this reducer restarted for the ISSUES #89 mid-action resume
 * (`resumeAt` "run-action1"/"run-action2").
 *
 * ORACLE RECEIPT (stock ROM, Battle Scene OFF):
 * `docs/issue127-baton-pass-spikes-ko-ground-truth.md` /
 * `tools/battle-lab/mechanic-issue127-batonpass-spikes-ko-off.json`. Aipom
 * Swords Dance (+2 Atk), opponent Cloyster lays one Spikes layer, Aipom Baton
 * Passes to Shedinja (maxHP 1, so `gBattleMoveDamage == 0 -> 1` at `:5245`).
 * RAM: `playerControllerCommand` reaches 22 (CHOOSEPOKEMON) TWICE inside the
 * one Baton Pass action (frames 880 and 2220, `currentMove` 226, no new turn
 * between them); the passed +2 Atk lands on Shedinja (frame 1380), Shedinja
 * faints on entry (frame 1540), and after the SECOND choice the replacement
 * comes in with stat stages back at 6 and takes its own Spikes hit
 * (130 -> 114, frame 3060) before the turn completes normally.
 *
 * This port modelled the whole branch (`battleScriptSwitchinOpcode.ts:1143-1160`)
 * and then threw at the seam. The fainted-dance sibling in the same function
 * already re-publishes exactly this halt (ISSUES #119); these pins hold the
 * mid-action path to the same contract.
 */
import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";

const BATON_PASS = 226;
const TACKLE = 33;
/** include/constants/battle.h -- SIDE_STATUS_SPIKES / its transient per-switch-in guard. */
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SPIKES_DAMAGED = 1 << 9;
/** The banked KO-scenario seed shared by every full-turn fixture. */
const KO_SCENARIO_RNG_SEED = 919694434;
const PLAYER_BATON_PASSES = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });
const TRAINER_ATTACKS = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });

/**
 * The player is FASTER, so Baton Pass is action 1 and the trainer's Tackle is
 * the banked `pendingSecondAction` the resume must still run. Bench slot 1 sits
 * at 20 HP against 200/((5-3)*2) = 50 Spikes damage, so it faints on entry; slot
 * 2 (150 maxHP) survives its own 37.
 */
function batonPassIntoSpikesConfig(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    player: {
      species: 43, moveId: BATON_PASS, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 100, hp: 90,
    },
    trainer: {
      species: 1, moveId: TACKLE, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, hp: 100,
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

/** Three Spikes layers on the PLAYER's own side (side 0). */
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
  const initial = createFactoryFullTurnBattleState(batonPassIntoSpikesConfig());
  return Object.freeze({
    ...initial,
    rules: Object.freeze({
      ...initial.rules,
      rulesContext: withPlayerSpikes(initial.rules.rulesContext),
    }),
  }) as typeof initial;
}

/** Plays the turn up to the FIRST forced-switch request -- Baton Pass's own openpartyscreen. */
function toBatonPassChoice() {
  const afterPlayer = submitFactoryFullTurnDecision(stagedBattle(), {
    requestId: 1, side: "player", decision: PLAYER_BATON_PASSES,
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer command request");
  const paused = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2, side: "trainer", decision: TRAINER_ATTACKS,
  });
  if (paused.kind !== "decision-required") throw new Error("expected Baton Pass's forced-switch request");
  return paused;
}

describe("ISSUES #127 -- a mid-action resume can halt for a second forced switch", () => {
  it("(a) Baton Pass halts mid-action on its own openpartyscreen, banking the trainer's second action", () => {
    const paused = toBatonPassChoice();
    expect(paused.nextRequest).toMatchObject({
      kind: "forced-switch",
      side: "player",
      battler: 0,
      legalPartyIndexes: [1, 2],
    });
    expect(paused.state.rules.phase).toBe("forced-switch-pending");
    // ISSUES #89's mid-action bundle, not the fainted dance's.
    const pending = (paused.state.rules as { pendingScript: { resumeAt: string; pendingSecondAction?: unknown } })
      .pendingScript;
    expect(pending.resumeAt).toBe("run-action1");
    expect(pending.pendingSecondAction).toMatchObject({ mover: 1, moveId: TACKLE });
  });

  it("(b) the passed-to mon fainting on entry to Spikes surfaces a SECOND forced-switch request, not a throw", () => {
    const paused = toBatonPassChoice();
    const second = submitFactoryFullTurnDecision(paused.state, {
      requestId: paused.nextRequest.requestId,
      side: "player",
      decision: { kind: "switch", partyIndex: 1 },
    });
    if (second.kind !== "decision-required") throw new Error("expected a second forced-switch request");
    expect(second.nextRequest).toMatchObject({
      kind: "forced-switch",
      side: "player",
      battler: 0,
      faintedPartyIndex: 1,
      // Slot 0 -- the mon that Baton Passed out -- is alive on the bench and a
      // legal choice, exactly as the ROM receipt's second party screen showed.
      legalPartyIndexes: [0, 2],
    });
    expect(second.state.rules.phase).toBe("forced-switch-pending");
    // The re-published bundle keeps THIS pause's own resume point and its
    // banked second action, so the eventual completion lands on the same tail.
    const pending = (second.state.rules as { pendingScript: { resumeAt: string; pendingSecondAction?: unknown } })
      .pendingScript;
    expect(pending.resumeAt).toBe("run-action1");
    expect(pending.pendingSecondAction).toMatchObject({ mover: 1, moveId: TACKLE });

    const rc = second.state.rules.rulesContext as BattleScriptRulesContext;
    expect(rc.party.player[1]!.hp).toBe(0);
    expect(rc.battlers[0]!.hp).toBe(0);
    // Cmd_tryfaintmon's spikes variant clears the transient guard on the way
    // out (battle_script_commands.c:2978) -- the ROM receipt shows the NEXT
    // replacement taking its own Spikes hit too (130 -> 114).
    expect(rc.sideStatuses[0] & SIDE_STATUS_SPIKES_DAMAGED).toBe(0);
  });

  it("(c) the second choice resumes the SAME run, lands the final replacement and completes the turn", () => {
    const paused = toBatonPassChoice();
    const second = submitFactoryFullTurnDecision(paused.state, {
      requestId: paused.nextRequest.requestId, side: "player", decision: { kind: "switch", partyIndex: 1 },
    });
    if (second.kind !== "decision-required") throw new Error("expected a second forced-switch request");
    const resumed = submitFactoryFullTurnDecision(second.state, {
      requestId: second.nextRequest.requestId, side: "player", decision: { kind: "switch", partyIndex: 2 },
    });
    if (resumed.kind !== "decision-required") throw new Error("expected the battle to continue");

    const rc = resumed.state.rules.rulesContext as BattleScriptRulesContext;
    // Slot 2 is the FINAL replacement: it took its own 150/4 = 37 Spikes hit
    // and then the trainer's banked Tackle, so the second action really ran.
    expect(rc.battlers[0]).toMatchObject({ species: 27, partyIndex: 2 });
    expect(rc.party.player[0]!.hp).toBe(90);
    expect(rc.party.player[1]!.hp).toBe(0);
    expect(rc.battlers[0]!.hp).toBe(rc.party.player[2]!.hp);
    expect(rc.battlers[0]!.hp).toBeLessThan(150 - 37);
    // Source-derived (the oracle receipt's ROM run cleared the stages on the
    // faint too): Baton Pass's stat stages do NOT survive the recipient's KO.
    expect([...rc.battlers[0]!.statStages]).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(resumed.nextRequest.kind).toBe("command");
  });
});
