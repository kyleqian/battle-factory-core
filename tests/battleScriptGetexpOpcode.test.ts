import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
/** include/constants/battle.h:78 -- Factory always sets this bit. */
const BATTLE_TYPE_FACTORY = 1 << 19;
/** include/constants/battle.h:63 -- a plain trainer battle, no Frontier/link bits. */
const BATTLE_TYPE_TRAINER = 1 << 3;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 5,
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
    item: changes.item ?? 7,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
  });
}

/**
 * Battler 0 is always the attacker (BS_ATTACKER), battler 1 always the
 * target (BS_TARGET); only their `side` fields vary with `targetSide`.
 */
function context(
  targetSide: 0 | 1,
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const attackerSide = (targetSide ^ 1) as 0 | 1;
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: attackerSide }),
      battler({ side: targetSide }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: 1 },
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

function findGetexpPc(label: string): number {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === "B_SCR_OP_GETEXP" && instruction.source.label === label,
  );
  if (!found) throw new Error(`no B_SCR_OP_GETEXP instruction found under label ${label}`);
  return found.programCounter;
}

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_GiveExp",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production getexp (Cmd_getexp) dispatch -- Frontier short-circuit only", () => {
  it("registers B_SCR_OP_GETEXP", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_GETEXP")).toBeDefined();
  });

  const pc = findGetexpPc("BattleScript_GiveExp");

  it("state 0, Factory battle: short-circuits to state 6 without advancing the instruction (matches the real two-call cadence)", () => {
    const rc = context(1, { giveExpState: 0 });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(pc);
    expect(result.state.rulesContext.giveExpState).toBe(6);
    // state 0 itself never touches item/ability
    expect(result.state.rulesContext.battlers[1]!.item).toBe(7);
    expect(result.state.rulesContext.battlers[1]!.ability).toBe(5);
  });

  it("state 6: zeroes the fainted battler's item/ability and advances past the instruction", () => {
    const rc = context(1, { giveExpState: 6 });
    const { result } = stepAtProgramCounter(pc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(pc + 1);
    expect(result.state.rulesContext.giveExpState).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
    expect(result.state.rulesContext.battlers[1]!.ability).toBe(0);
    // the non-fainted battler is untouched
    expect(result.state.rulesContext.battlers[0]!.item).toBe(7);
    expect(result.state.rulesContext.battlers[0]!.ability).toBe(5);
  });

  it("BS_ATTACKER selector (BattleScript_SpikesOnAttackerFainted) resolves the same way as BS_TARGET", () => {
    const attackerPc = findGetexpPc("BattleScript_SpikesOnAttackerFainted");
    const rc = context(0, { giveExpState: 0 }); // targetSide 0 -> attacker (battler 0) is side 1 (opponent)
    const { result } = stepAtProgramCounter(attackerPc, rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.programCounter).toBe(attackerPc);
    expect(result.state.rulesContext.giveExpState).toBe(6);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("getexp BS_FAINTED (BattleScript_SpikesOnFaintedBattlerFainted) resolves to the fainted role and does not halt", () => {
      const faintedPc = findGetexpPc("BattleScript_SpikesOnFaintedBattlerFainted");
      // selectorRoles.fainted = battler 0, distinct from target (battler 1), so
      // a wrong-battler resolver cannot sneak through.
      const rc = context(1, {
        giveExpState: 0,
        selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: 0 },
      });
      const { result } = stepAtProgramCounter(faintedPc, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(faintedPc);
      expect(result.state.rulesContext.giveExpState).toBe(6);
    });

    it("getexp BS_FAINTED: state 6 zeroes the fainted role's item/ability, not the target's", () => {
      const faintedPc = findGetexpPc("BattleScript_SpikesOnFaintedBattlerFainted");
      const rc = context(1, {
        giveExpState: 6,
        selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: 0 },
      });
      const { result } = stepAtProgramCounter(faintedPc, rc);
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(faintedPc + 1);
      expect(result.state.rulesContext.giveExpState).toBe(0);
      expect(result.state.rulesContext.battlers[0]!.item).toBe(0);
      expect(result.state.rulesContext.battlers[0]!.ability).toBe(0);
      expect(result.state.rulesContext.battlers[1]!.item).toBe(7);
      expect(result.state.rulesContext.battlers[1]!.ability).toBe(5);
    });

    it("halts on a genuinely unsupported selector (BS_SCRIPTING) -- the guard survives", () => {
      const instruction = program.instructions[pc]!;
      const patched = Object.freeze({
        ...instruction,
        operands: Object.freeze([
          Object.freeze({ ...instruction.operands[0]!, expression: "BS_SCRIPTING" }),
        ]),
      });
      const patchedProgram = Object.freeze({
        ...program,
        instructions: Object.freeze(
          program.instructions.map((i, index) => (index === pc ? patched : i)),
        ),
      });
      const execution = createBattleScriptStatusRulesExecution(
        patchedProgram,
        "BattleScript_GiveExp",
        context(1, { giveExpState: 0 }),
        1,
        externalPorts(),
      );
      const state = Object.freeze({ ...execution.state, programCounter: pc });
      const result = stepBattleScriptMachine(patchedProgram, state, execution.handlers);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts on state 0's else branch for a non-Frontier trainer battle against the opponent (general EXP machinery, states 1-5)", () => {
      const rc = context(1, {
        giveExpState: 0,
        battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_TRAINER, battlerPositions: [0, 1, 0xff, 0xff] },
      });
      const { result } = stepAtProgramCounter(pc, rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("pass-through: the same non-Frontier-machinery gate short-circuits cleanly for the real Factory battle type", () => {
      const rc = context(1, { giveExpState: 0 });
      const { result } = stepAtProgramCounter(pc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance, not a barrier");
      expect(result.state.rulesContext.giveExpState).toBe(6);
    });

    it("pass-through: a fainted battler on the player's own side also short-circuits regardless of battle type", () => {
      const rc = context(0, {
        giveExpState: 0,
        battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_TRAINER, battlerPositions: [0, 1, 0xff, 0xff] },
      });
      const targetPc = findGetexpPc("BattleScript_GiveExp");
      const { result } = stepAtProgramCounter(targetPc, rc);
      if (result.kind !== "advanced") throw new Error("expected advance, not a barrier");
      expect(result.state.rulesContext.giveExpState).toBe(6);
    });
  });
});
