import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
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
const TACKLE = 33; // EFFECT_HIT, power 35, TYPE_NORMAL
const EARTHQUAKE = 89; // EFFECT_EARTHQUAKE, power 100, accuracy 100, MOVE_TARGET_FOES_AND_ALLY

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
  });
}

function context(
  attacker: 0 | 1,
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker });
  battlers[target] = battler({ side: target });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: target },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: EARTHQUAKE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
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

function findPc(opcodeName: string, sourceLabel: string): number {
  const found = program.instructions.find(
    (instruction) => instruction.opcodeName === opcodeName && instruction.source.label === sourceLabel,
  );
  if (!found) throw new Error(`no matching ${opcodeName} instruction found in ${sourceLabel}`);
  return found.programCounter;
}

/** Patches straight onto an arbitrary committed programCounter, mirroring battleScriptHitChainOpcode.test.ts's stepAtProgramCounter. */
function stepAtPc(pc: number, rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectEarthquake",
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

const DOUBLES_TOPOLOGY = Object.freeze({
  battlersCount: 4 as const,
  battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  battlerPositions: [0, 1, 2, 3] as const,
});

describe("production selectfirstvalidtarget (Cmd_selectfirstvalidtarget) dispatch", () => {
  it("registers B_SCR_OP_SELECTFIRSTVALIDTARGET", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_SELECTFIRSTVALIDTARGET");
    expect(instruction).toBeDefined();
  });

  const selectFirstValidTargetPc = () => findPc("B_SCR_OP_SELECTFIRSTVALIDTARGET", "BattleScript_EffectEarthquake");

  it("singles: attacker 0 selects the sole other battler (1), overwriting a stale pre-existing target", () => {
    const rc = context(0, { selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: null } });
    const { result } = stepAtPc(selectFirstValidTargetPc(), rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(result.state.rulesContext.selectorRoles.target).toBe(1);
    expect(result.state.programCounter).toBe(selectFirstValidTargetPc() + 1);
  });

  it("singles: attacker 1 selects the sole other battler (0)", () => {
    const rc = context(1);
    const { result } = stepAtPc(selectFirstValidTargetPc(), rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(result.state.rulesContext.selectorRoles.target).toBe(0);
  });

  it("doubles: same loop, no BATTLE_TYPE_DOUBLE branch -- skips an absent battler and lands on the first present one", () => {
    const rc = context(0, {
      battleTopology: DOUBLES_TOPOLOGY,
      absentBattlerFlags: 1 << 1, // battler 1 (the direct opposing slot) is absent
    });
    const { result } = stepAtPc(selectFirstValidTargetPc(), rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    // Loop order 0,1,2,3: 0 is the attacker (skipped), 1 is absent (skipped), 2 is the first match.
    expect(result.state.rulesContext.selectorRoles.target).toBe(2);
  });

  it("throws if every non-attacker battler slot is absent (an invariant the source never guards, unreachable via legal decisions)", () => {
    const rc = context(0, { absentBattlerFlags: 1 << 1 });
    expect(() => stepAtPc(selectFirstValidTargetPc(), rc)).toThrow(/no valid target/);
  });
});

describe("production jumpifnexttargetvalid (Cmd_jumpifnexttargetvalid) dispatch", () => {
  it("registers B_SCR_OP_JUMPIFNEXTTARGETVALID", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_JUMPIFNEXTTARGETVALID");
    expect(instruction).toBeDefined();
  });

  // moveendto's own setbyte+moveend precede this instruction under the same
  // block; EFFECT_EARTHQUAKE's own label is BattleScript_DoHitAllWithUndergroundBonus,
  // not BattleScript_EffectEarthquake (a new concrete block starts at every label).
  const jumpIfNextTargetValidPc = () => findPc("B_SCR_OP_JUMPIFNEXTTARGETVALID", "BattleScript_DoHitAllWithUndergroundBonus");

  it("singles: always falls through to the very next instruction, never jumps to the loop-back label", () => {
    const rc = context(0);
    const { result } = stepAtPc(jumpIfNextTargetValidPc(), rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(result.state.programCounter).toBe(jumpIfNextTargetValidPc() + 1);
  });

  it("doubles: halts on the BATTLE_TYPE_DOUBLE next-target scan (unreachable for Level-50 singles)", () => {
    const rc = context(0, { battleTopology: DOUBLES_TOPOLOGY });
    const { result } = stepAtPc(jumpIfNextTargetValidPc(), rc);
    expect(result.kind).toBe("halted");
    if (result.kind !== "halted") throw new Error("expected halted");
    expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 6594 });
  });
});
