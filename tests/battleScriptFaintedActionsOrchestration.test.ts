import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleScriptFaintedActionsOrchestration } from "../src/engine/battleScriptFaintedActionsOrchestration.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
/** include/constants/battle.h:78 -- Factory always sets this bit. */
const BATTLE_TYPE_FACTORY = 1 << 19;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function fullSlot(hp: number): BattleScriptPartyMemberInput {
  return { species: 261, isEgg: false, hp };
}
const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

function sixSlots(...alive: number[]): BattleScriptPartyMemberInput[] {
  const slots = [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT];
  alive.forEach((hp, index) => {
    slots[index] = fullSlot(hp);
  });
  return slots;
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, hp: 0, partyIndex: 2, species: 261 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    ...contextChanges,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());

/**
 * Builds an already-halted "terminal" machine state, as if the acting
 * battler's own move script had just reached its own `end` -- the real
 * seam `runBattleScriptFaintedActionsOrchestration` is driven from
 * (docs/faint-outcome-ground-truth.md §3.1).
 */
function haltedAtOwnEnd(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon", // any committed label works as a scratch entry point
    rulesContext,
    919694434,
    externalPorts(),
  );
  return Object.freeze({
    ...execution.state,
    haltReason: Object.freeze({
      kind: "terminal" as const,
      programCounter: execution.state.programCounter,
      opcodeId: 0,
      opcodeName: "B_SCR_OP_END",
    }),
  });
}

describe("runBattleScriptFaintedActionsOrchestration (HandleFaintedMonActions equivalent)", () => {
  it("no fainted battlers: returns no-fainted-battlers unchanged (HandleFaintedMonActions returns FALSE)", () => {
    const rc = context({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 90, partyIndex: 2, species: 261 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const initial = haltedAtOwnEnd(rc);
    const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
    expect(result.kind).toBe("no-fainted-battlers");
    expect(result.state).toBe(initial);
  });

  it(
    "terminal WIN: last opponent party slot just fainted, both bench slots already 0 -- runs GiveExp then "
      + "HandleFaintedMon and computes a REAL battleOutcome 0 -> 1 from checkteamslost, no fabrication",
    () => {
      const rc = context({
        party: { player: sixSlots(100), opponent: sixSlots(0, 0, 0) },
      });
      expect(rc.battleOutcome).toBe(0);
      const initial = haltedAtOwnEnd(rc);
      const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
      expect(result.kind).toBe("terminal");
      if (result.kind !== "terminal") throw new Error("expected terminal");
      expect(result.state.rulesContext.battleOutcome).toBe(1); // B_OUTCOME_WON
      // getexp's item/ability zeroing on the fainted battler (state 6, Frontier short-circuit) really ran.
      expect(result.state.rulesContext.battlers[1]).toMatchObject({ item: 0, ability: 0 });
      // gBattlerFainted = gBattlerTarget = faintedActionsBattlerId (battle_util.c:1915).
      expect(result.state.rulesContext.selectorRoles.fainted).toBe(1);
      expect(result.state.rulesContext.selectorRoles.target).toBe(1);
      // Neither BattleScript_GiveExp nor BattleScript_HandleFaintedMon has a Random( call site
      // (docs/faint-outcome-ground-truth.md §2b) -- the orchestration draws zero further RNG.
      expect(result.state.rng.calls).toBe(initial.rng.calls);
      expect(result.state.rng.value).toBe(initial.rng.value);
    },
  );

  it(
    "non-terminal barrier: opponent still has a healthy bench slot -- checkteamslost's jumpifbyte does NOT "
      + "take the FaintedMonEnd branch; jumpifbattletype (a jumpifword macro expansion, "
      + "asm/macros/battle_script.inc:1434-1436) is now registered (docs/forced-switch-ground-truth.md §4 "
      + "slice 1) and takes Factory's real BATTLE_TYPE_TRAINER-taken jump straight to "
      + "BattleScript_FaintedMonTryChoose, so the barrier now surfaces one opcode deeper, at the genuinely "
      + "unregistered openpartyscreen -- a named machine boundary instead of a fake terminal or silent fallthrough",
    () => {
      const rc = context({
        party: { player: sixSlots(100), opponent: sixSlots(90, 0, 0) },
      });
      const initial = haltedAtOwnEnd(rc);
      const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
      expect(result.kind).toBe("non-terminal-barrier");
      if (result.kind !== "non-terminal-barrier") throw new Error("expected non-terminal-barrier");
      expect(result.state.rulesContext.battleOutcome).toBe(0); // genuinely undecided, not fabricated
      expect(result.instruction.opcodeName).toBe("B_SCR_OP_OPENPARTYSCREEN"); // openpartyscreen BS_FAINTED
      expect(result.state.rng.calls).toBe(initial.rng.calls);
    },
  );

  it("player-side faint (attacker down): terminal LOSS computed the same way, symmetric with the WIN path", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 0, partyIndex: 2, species: 261 }),
        battler({ side: 1, hp: 90, partyIndex: 2, species: 261 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
      party: { player: sixSlots(0, 0, 0), opponent: sixSlots(90) },
    });
    const initial = haltedAtOwnEnd(rc);
    const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
    expect(result.kind).toBe("terminal");
    if (result.kind !== "terminal") throw new Error("expected terminal");
    expect(result.state.rulesContext.battleOutcome).toBe(2); // B_OUTCOME_LOST
    expect(result.state.rulesContext.selectorRoles.fainted).toBe(0);
  });
});
