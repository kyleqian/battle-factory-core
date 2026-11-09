// sub260 (ISSUES #201; docs/sub260-ignore-substitute.md): Cmd_datahpupdate's no-substitute branch clears
// HITMARKER_IGNORE_SUBSTITUTE (battle_script_commands.c:1893-1895). Without it an end-of-turn `orword ... IGNORE_SUBSTITUTE`
// heal (Leftovers, data/battle_scripts_1.s:4377-4384) leaks the bit into the next turn and its first attack bypasses a Substitute.
import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import { BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE } from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const BATTLE_TYPE_FACTORY = 1 << 19;
const STATUS2_SUBSTITUTE = 1 << 24;
const MOVE_RESULT_NO_EFFECT = 1 << 3;
const HITMARKER_IGNORE_BIDE = 1 << 5;
const HITMARKER_PASSIVE_HP_UPDATE = 1 << 20;
const ITEM_LEFTOVERS = 200;
const TACKLE = 33;
const IGNORE_SUB = BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE;

function battler(changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: Object.freeze([35, 0, 0, 0] as const),
    status1: 0,
    status2: changes.status2 ?? 0,
    status3: 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: changes.item ?? 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 40,
    defense: changes.defense ?? 40,
    spAttack: 40,
    spDefense: 40,
    level: 50,
    friendship: 70,
    partyIndex: 0,
  });
}

const slot = (species: number, hp: number): BattleScriptPartyMemberInput => ({ species, isEgg: false, hp });
const EMPTY: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

const ports = Object.freeze({
  isControllerIdle: (context) => context.state.scheduler.pendingControllerBattlers.length === 0,
  prepareMessage: (_context, operand) =>
    operand.expression.startsWith("STRINGID_")
      ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
      : null,
  prepareSelectionMessage: () => null,
  prepareSelectionMessageFromTable: () => null,
  resolveAttackerBattler: () => 0 as const,
  resolveBattlerAtPosition: () => null,
  resolveHalfwordOperand: (_context, operand) => (operand.expression === "B_WAIT_TIME_LONG" ? 64 : null),
  resolveByteOperand: () => null,
} satisfies BattleScriptStatusRulesExternalPorts);

/** Battler 0 attacks Tackle; battler 1 (the target) is the Substitute holder, hit points 100 / 160. */
function context(
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Record<string, unknown> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, species: 74, hp: 100, maxHP: 160, types: ["TYPE_ROCK", "TYPE_GROUND"], ...targetChanges }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
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
    battlerByTurnOrder: [0, 1, 2, 3],
    party: {
      player: [slot(1, 100), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      opponent: [slot(74, targetChanges.hp ?? 100), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    },
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    ...contextChanges,
  } as never);
}

function ack(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  let next = state;
  for (const b of state.scheduler.pendingControllerBattlers) next = acknowledgeBattleScriptMachineController(next, b);
  return next;
}

function stepDatahpupdate(rulesContext: BattleScriptRulesContext, battlerOperand: "BS_TARGET" | "BS_ATTACKER" = "BS_TARGET") {
  const startPc = resolveBattleScriptLabel(program, "BattleScript_HitFromCritCalc")!.programCounter;
  const found = program.instructions.find(
    (i, index) => index >= startPc && i.opcodeName === "B_SCR_OP_DATAHPUPDATE" && i.operands[0]?.expression === battlerOperand,
  )!;
  const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_HitFromCritCalc", rulesContext, 1, ports);
  const patched = Object.freeze({ ...execution.state, programCounter: found.programCounter });
  const result = stepBattleScriptMachine(program, patched, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`datahpupdate did not advance: ${result.kind}`);
  return result.state;
}

describe("sub260: Cmd_datahpupdate clears HITMARKER_IGNORE_SUBSTITUTE (battle_script_commands.c:1893-1895)", () => {
  it("heal path (damage < 0): HP gain applies and the bit is cleared, alongside PASSIVE_HP_UPDATE", () => {
    const rc = context({}, { battleMoveDamage: -10, hitMarker: IGNORE_SUB | HITMARKER_PASSIVE_HP_UPDATE });
    const state = stepDatahpupdate(rc);
    expect(state.rulesContext.battlers[1]!.hp).toBe(110);
    expect(state.rulesContext.hitMarker & IGNORE_SUB).toBe(0);
    expect(state.rulesContext.hitMarker & HITMARKER_PASSIVE_HP_UPDATE).toBe(0);
  });

  it("damage path: damage applies and the bit is cleared, IGNORE_BIDE handling unchanged", () => {
    const rc = context({}, { battleMoveDamage: 14, hitMarker: IGNORE_SUB | HITMARKER_IGNORE_BIDE });
    const state = stepDatahpupdate(rc);
    expect(state.rulesContext.battlers[1]!.hp).toBe(86);
    expect(state.rulesContext.hitMarker & IGNORE_SUB).toBe(0);
    expect(state.rulesContext.hitMarker & HITMARKER_IGNORE_BIDE).toBe(0);
    expect(state.rulesContext.bideDmg[1]).toBe(0);
  });

  it("an active Substitute with the bit set takes the real-HP branch (source :1865) and clears the bit", () => {
    const rc = context({ status2: STATUS2_SUBSTITUTE, substituteHP: 40 }, { battleMoveDamage: 14, hitMarker: IGNORE_SUB });
    const state = stepDatahpupdate(rc);
    expect(state.rulesContext.battlers[1]!.hp).toBe(86);
    expect(state.rulesContext.battlers[1]!.substituteHP).toBe(40);
    expect(state.rulesContext.hitMarker & IGNORE_SUB).toBe(0);
  });

  it("the Substitute-absorb branch does not touch the marker (source clears it only in the else branch)", () => {
    const rc = context({ status2: STATUS2_SUBSTITUTE, substituteHP: 40 }, { battleMoveDamage: 14, hitMarker: 0 });
    const state = stepDatahpupdate(rc);
    expect(state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(state.rulesContext.battlers[1]!.substituteHP).toBe(26);
    expect(state.rulesContext.hitMarker).toBe(0);
  });

  it("MOVE_RESULT_NO_EFFECT still skips the whole block: HP and the marker are untouched", () => {
    const rc = context({}, { battleMoveDamage: 14, moveResultFlags: MOVE_RESULT_NO_EFFECT, hitMarker: IGNORE_SUB });
    const state = stepDatahpupdate(rc);
    expect(state.rulesContext.battlers[1]!.hp).toBe(100);
    expect(state.rulesContext.hitMarker & IGNORE_SUB).toBe(IGNORE_SUB);
    expect(state.events.length).toBe(0);
  });
});

describe("sub260: a Leftovers heal on the Substitute holder no longer lets the next turn's first attack bypass it", () => {
  function endTurnThenHit() {
    const start = context({ item: ITEM_LEFTOVERS, status2: STATUS2_SUBSTITUTE, substituteHP: 40 });
    const initial = createBattleScriptStatusRulesExecution(program, "BattleScript_HandleFaintedMon", start, 0x1234_5678, ports).state;
    const end = runBattleEndTurnOrchestration(program, createBattleScriptStatusRulesHandlers(program, ports), initial);
    if (end.kind !== "next-turn") throw new Error(`end-turn pass stopped at ${end.kind}`);
    const afterEndTurn = end.state.rulesContext;

    // Next turn's first action: battler 0's Tackle, entered at the literal BattleScript_EffectHit (hit certain: low accuracy roll).
    const hitContext = Object.freeze({ ...afterEndTurn, currentMove: TACKLE, moveResultFlags: 0, battleMoveDamage: 0 }) as BattleScriptRulesContext;
    const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_EffectHit", hitContext, 1, ports);
    const datahp = program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_DATAHPUPDATE");
    let state = execution.state;
    const events: string[] = [];
    for (let n = 0; n < 60; n += 1) {
      const result = stepBattleScriptMachine(program, state, execution.handlers);
      if (result.kind !== "advanced") break;
      state = ack(result.state);
      for (const event of state.events) if (event.kind === "message") events.push(event.messageId);
      if (state.rulesContext.battleMoveDamage > 0 && datahp.some((i) => i.programCounter === state.programCounter - 1)) break;
    }
    return { end, afterEndTurn, state, events };
  }

  it("the end-turn heal leaves no IGNORE_SUBSTITUTE behind and the hit lands on the Substitute", () => {
    const { end, afterEndTurn, state, events } = endTurnThenHit();
    expect(end.state.events.some((e) => e.kind === "hp-change" && e.battler === 1 && e.from === 100 && e.to === 110)).toBe(true);
    expect(afterEndTurn.battlers[1]!.hp).toBe(110);
    expect(afterEndTurn.hitMarker & IGNORE_SUB).toBe(0);

    expect(events).toContain("STRINGID_SUBSTITUTEDAMAGED");
    expect(state.rulesContext.battlers[1]!.hp).toBe(110);
    expect(state.rulesContext.battlers[1]!.substituteHP).toBeLessThan(40);
  });
});
