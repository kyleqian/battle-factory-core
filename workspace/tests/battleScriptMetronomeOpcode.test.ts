import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HITMARKER_OBEYS,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import { METRONOME_FORBIDDEN_MOVE_TABLE } from "../src/engine/battleScriptMetronomeOpcode.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const METRONOME = 118;
const RECEIPT_MOVE_55 = 55;
const BONE_CLUB = 125;
const HITMARKER_UNRELATED = 1 << 18;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(({ opcodeName }) => opcodeName === "B_SCR_OP_METRONOME")!;
const forbiddenRealMoves = METRONOME_FORBIDDEN_MOVE_TABLE.filter((move) => move < 0xfffe);
const forbiddenSet = new Set(forbiddenRealMoves);

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 160,
    maxHP: changes.maxHP ?? changes.hp ?? 160,
    moves: changes.moves ?? ([METRONOME, 0, 0, 0] as const),
    pp: changes.pp ?? ([10, 0, 0, 0] as const),
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
    encoreTimer: changes.encoreTimer ?? 0,
    encoredMove: changes.encoredMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 113,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 80,
    defense: changes.defense ?? 80,
    spAttack: changes.spAttack ?? 80,
    spDefense: changes.spDefense ?? 80,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    speed: changes.speed ?? 100,
  });
}

function rules(): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(),
      battler({ side: 1, species: 35, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
      battler({ hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: METRONOME,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker:
      HITMARKER_UNRELATED
      | BATTLE_SCRIPT_HITMARKER_OBEYS
      | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
    multiHitCounter: 0,
    chosenMove: METRONOME,
    calledMove: 0,
    party: {
      player: [{ species: 113, hp: 160, moves: [METRONOME, 0, 0, 0], pp: [10, 0, 0, 0] }, {}, {}, {}, {}, {}],
      opponent: [{ species: 35, hp: 160, moves: [33, 0, 0, 0] }, {}, {}, {}, {}, {}],
    },
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) => Object.freeze({
      kind: "message" as const,
      messageId: operand.expression,
      substitutions: Object.freeze([]),
    }),
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0 as const,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64
        : operand.expression === "B_WAIT_TIME_SHORT" ? 32
        : null,
    resolveByteOperand: () => null,
  });
}

function executionAt(source: BattleScriptRulesContext, seed: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    instruction.source.label,
    source,
    seed,
    externalPorts(),
  );
  return {
    ...execution,
    state: Object.freeze({ ...execution.state, programCounter: instruction.programCounter }),
  };
}

function stepAt(seed: number) {
  const source = rules();
  const execution = executionAt(source, seed);
  const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`Metronome did not advance: ${result.kind}`);
  return { source, state: result.state };
}

function candidateFromSeed(seed: number): number {
  return ((advanceRngValue(seed) >>> 16) & 0x1ff) + 1;
}

function findSeed(firstCandidate: number): number {
  for (let seed = 0; seed < 2_000_000; seed += 1) {
    if (candidateFromSeed(seed) !== firstCandidate) continue;
    const second = candidateFromSeed(advanceRngValue(seed));
    if (second < 355 && !forbiddenSet.has(second)) return seed;
  }
  throw new Error(`no bounded two-draw seed found for candidate ${firstCandidate}`);
}

function acknowledgePending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runSelectedEffectToEnd(seed: number): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = executionAt(rules(), seed);
  let state = execution.state;
  for (let guard = 0; guard < 5000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    if (result.kind === "halted") return result.state;
    if (result.kind === "unsupported") {
      throw new Error(`unexpected unsupported ${result.instruction.opcodeName}`);
    }
    state = result.kind === "blocked" ? acknowledgePending(result.state) : result.state;
  }
  throw new Error("Metronome-selected effect did not reach END");
}

describe("Metronome source-complete direct effect dispatch", () => {
  it("pins the shell opcode and exact 18-move array while scanning past Mimic's 0xfffe sentinel", () => {
    expect(instruction).toMatchObject({
      opcodeId: 0x9e,
      dispatcher: "Cmd_metronome",
      source: { label: "BattleScript_EffectMetronome", statementLine: 1155 },
      operands: [],
    });
    expect(METRONOME_FORBIDDEN_MOVE_TABLE).toEqual([
      118, 165, 166, 102, 0xfffe, 68, 243, 182, 197, 203, 194, 214,
      168, 266, 289, 270, 343, 271, 264, 0xffff,
    ]);
    expect(forbiddenRealMoves).toHaveLength(18);
  });

  it.each([355, 461, 512])("rejects out-of-range candidate %i with exactly one draw before retry", (candidate) => {
    const { state } = stepAt(findSeed(candidate));
    const candidateDraws = state.rng.ledger.filter(({ reason }) => reason === "metronome-candidate");
    expect((((candidateDraws[0]!.randomValue & 0x1ff) + 1))).toBe(candidate);
    expect(candidateDraws).toHaveLength(2);
  });

  it.each(forbiddenRealMoves)("rejects forbidden move %i and accepts the next legal candidate", (move) => {
    const { state } = stepAt(findSeed(move));
    const draws = state.rng.ledger.filter(({ reason }) => reason === "metronome-candidate");
    expect((draws[0]!.randomValue & 0x1ff) + 1).toBe(move);
    expect(draws).toHaveLength(2);
    expect(forbiddenSet.has(state.rulesContext.currentMove)).toBe(false);
  });

  it("reproduces the one-draw receipt and performs a direct tail jump without gCalledMove or a continuation", () => {
    const { source, state } = stepAt(0xa160_0022);
    expect(state.rng.ledger.map(({ reason, randomValue }) => ({ reason, randomValue }))).toEqual([
      { reason: "metronome-candidate", randomValue: 45622 },
      { reason: "metronome-selected-target", randomValue: 45942 },
      { reason: "metronome-selected-target", randomValue: 64516 },
      { reason: "metronome-selected-target", randomValue: 9709 },
    ]);
    expect(state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_EffectHit")!.programCounter,
    );
    expect(state.callStack).toEqual([]);
    expect(state.rulesContext).toMatchObject({
      currentMove: RECEIPT_MOVE_55,
      chosenMove: METRONOME,
      calledMove: 0,
      currentMovePosition: 0,
      selectorRoles: { target: 1 },
    });
    expect(state.rulesContext.hitMarker).toBe(
      source.hitMarker & ~BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
    );
  });

  it("reproduces seed 4's double rejection stream before accepting Bone Club 125", () => {
    const { state } = stepAt(0x4bd6_2378);
    expect(state.rng.ledger
      .filter(({ reason }) => reason === "metronome-candidate")
      .map(({ randomValue }) => [randomValue, (randomValue & 0x1ff) + 1])).toEqual([
        [28620, 461],
        [14233, 410],
        [33916, BONE_CLUB],
      ]);
    expect(state.rulesContext.currentMove).toBe(BONE_CLUB);
    expect(state.rulesContext.selectorRoles.target).toBe(1);
  });

  it("executes the selected effect through END, debits Metronome's slot, and splits printed/original from resulting/landed histories", () => {
    const final = runSelectedEffectToEnd(0x4bd6_2378);
    expect(final.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(final.rulesContext).toMatchObject({
      currentMove: BONE_CLUB,
      chosenMove: METRONOME,
      calledMove: 0,
      currentMovePosition: 0,
    });
    expect(final.rulesContext.battlers[0].pp).toEqual([9, 0, 0, 0]);
    expect(final.rulesContext.party.player[0].pp).toEqual([9, 0, 0, 0]);
    expect(final.rulesContext.moveHistory.lastPrintedMoves[0]).toBe(METRONOME);
    expect(final.rulesContext.moveHistory.lastMoves[0]).toBe(METRONOME);
    expect(final.rulesContext.moveHistory.lastResultingMoves[0]).toBe(BONE_CLUB);
    expect(final.rulesContext.moveHistory.lastLandedMoves[1]).toBe(BONE_CLUB);
  });
});
