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
import {
  resumeBattleScriptFaintedActionsAfterPlayerChoice,
  runBattleScriptFaintedActionsOrchestration,
} from "../src/engine/battleScriptFaintedActionsOrchestration.ts";

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
    // The forced-switch dance's own STRINGID_SWITCHINMON (printstring) needs a real message,
    // not the terminal/non-terminal-barrier tests' own never-reached default of null.
    prepareMessage: (_context: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG"
        ? 64
        : operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
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
    "non-terminal sole replacement: opponent still has one healthy bench slot -- checkteamslost's jumpifbyte does NOT "
      + "take the FaintedMonEnd branch; jumpifbattletype (a jumpifword macro expansion, "
      + "asm/macros/battle_script.inc:1434-1436) is now registered (docs/forced-switch-ground-truth.md §4 "
      + "slice 1) and takes Factory's real BATTLE_TYPE_TRAINER-taken jump straight to "
      + "BattleScript_FaintedMonTryChoose; the only legal candidate is selected without entering the "
      + "irrelevant pass-2 damage fallback, and the battle genuinely resumes",
    () => {
      const rc = context({
        party: { player: sixSlots(100), opponent: sixSlots(90, 0, 0) },
      });
      const initial = haltedAtOwnEnd(rc);
      const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
      expect(result.kind).toBe("resumed");
      if (result.kind !== "resumed") throw new Error("expected resumed");
      expect(result.state.rulesContext.battleOutcome).toBe(0); // genuinely undecided, not fabricated
      expect(result.state.rulesContext.battlers[1]).toMatchObject({
        species: 261,
        hp: 90,
        partyIndex: 0,
      });
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

  it(
    "player-choice-required: player-side faint with a healthy bench halts mid-script naming the legal "
      + "slots -- a real, named boundary (docs/forced-switch-ground-truth.md §3/§4 slice 10), not a fake "
      + "barrier or a fabricated terminal",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0, hp: 0, partyIndex: 0, species: 261 }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        selectorRoles: { attacker: 1, target: 0, effectBattler: 0 },
        party: { player: sixSlots(0, 100, 90), opponent: sixSlots(100) },
      });
      const initial = haltedAtOwnEnd(rc);
      const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
      expect(result.kind).toBe("player-choice-required");
      if (result.kind !== "player-choice-required") throw new Error("expected player-choice-required");
      expect(result.battler).toBe(0);
      expect(result.faintedPartyIndex).toBe(0);
      expect(result.legalPartyIndexes).toEqual([1, 2]);
      // A halt, not a controller round trip -- zero Random() draws (docs §3d).
      expect(result.state.rng.calls).toBe(initial.rng.calls);
      expect(result.state.rulesContext.battleOutcome).toBe(0); // genuinely undecided, not fabricated

      const resumed = resumeBattleScriptFaintedActionsAfterPlayerChoice(program, handlers, result.state, 2);
      expect(resumed.kind).toBe("resumed");
      if (resumed.kind !== "resumed") throw new Error("expected resumed");
      expect(resumed.state.rulesContext.battlers[0]).toMatchObject({ species: 261, hp: 90, partyIndex: 2 });
      expect(resumed.state.rng.calls).toBe(initial.rng.calls); // still zero further draws

      // Rejects a chosen index outside the halt's own legalPartyIndexes.
      expect(() => resumeBattleScriptFaintedActionsAfterPlayerChoice(program, handlers, result.state, 0)).toThrow();
      expect(() => resumeBattleScriptFaintedActionsAfterPlayerChoice(program, handlers, result.state, 1))
        .not.toThrow();
    },
  );

  it(
    "simultaneous Rough Skin double faint: player replacement resumes the persisted cursor before the opponent replacement",
    () => {
      const rc = context({
        battlers: [
          battler({ side: 0, hp: 0, partyIndex: 0, species: 261 }),
          battler({ side: 1, hp: 0, partyIndex: 0, species: 261 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
        party: {
          player: sixSlots(0, 100, 90),
          opponent: sixSlots(0, 90),
        },
      });
      const initial = haltedAtOwnEnd(rc);
      const halted = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
      expect(halted.kind).toBe("player-choice-required");
      if (halted.kind !== "player-choice-required") throw new Error("expected player choice");

      const resumed = resumeBattleScriptFaintedActionsAfterPlayerChoice(
        program,
        handlers,
        halted.state,
        2,
      );
      expect(resumed.kind).toBe("resumed");
      expect(resumed.state.rulesContext.battlers[0]).toMatchObject({
        hp: 90,
        partyIndex: 2,
      });
      expect(resumed.state.rulesContext.battlers[1]).toMatchObject({
        hp: 90,
        partyIndex: 1,
      });
      expect(resumed.state.rulesContext.battleOutcome).toBe(0);
      expect(resumed.state.rulesContext.selectorRoles.fainted).toBe(1);
      expect(resumed.state.rulesContext.selectorRoles.target).toBe(1);
      expect(resumed.state.rng.calls).toBe(initial.rng.calls);
    },
  );

  it("simultaneous Rough Skin double faint: the opponent's last mon produces the source terminal outcome", () => {
    const rc = context({
      battlers: [
        battler({ side: 0, hp: 0, partyIndex: 0, species: 261 }),
        battler({ side: 1, hp: 0, partyIndex: 0, species: 261 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
      party: {
        player: sixSlots(0, 100),
        opponent: sixSlots(0),
      },
    });
    const initial = haltedAtOwnEnd(rc);
    const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
    expect(result.kind).toBe("terminal");
    expect(result.state.rulesContext.battleOutcome).toBe(1);
    expect(result.state.rulesContext.battlers[1]!.hp).toBe(0);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });

  it("state 6 resolves pending replacement Intimidate before White Herb and clears the pending bit", () => {
    const rc = context({
      battlers: [
        battler({
          side: 0,
          item: 180,
          statStages: [6, 5, 6, 6, 6, 6, 6, 6],
        }),
        battler({ side: 1, ability: 22, status3: 1 << 19 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
    });
    const initial = haltedAtOwnEnd(rc);
    const result = runBattleScriptFaintedActionsOrchestration(program, handlers, initial);
    expect(result.kind).toBe("no-fainted-battlers");
    expect(result.state.rulesContext.battlers[0].statStages[1]).toBe(6);
    expect(result.state.rulesContext.battlers[0].item).toBe(0);
    expect(result.state.rulesContext.battlers[1].status3 & (1 << 19)).toBe(0);
    expect(result.state.events.filter((event) => event.kind === "message").map((event) => event.messageId))
      .toEqual(["STRINGID_PKMNCUTSATTACKWITH", "STRINGID_PKMNSITEMRESTOREDSTATUS"]);
    expect(result.state.rng.calls).toBe(initial.rng.calls);
  });
});
