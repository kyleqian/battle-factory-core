import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { advanceBattleScriptAttackCancelerInLove } from "../src/engine/battleScriptActionAdmission.ts";
import { BATTLE_SCRIPT_ATTACK_CANCELER_PHASES } from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const ATTRACT = 213; // EFFECT_ATTRACT, MOVE_TARGET_SELECTED, accuracy 100
const ABILITY_OBLIVIOUS = 12;

// species-stats.json genderRatio: PIKACHU=127 (50/50 threshold), NIDORAN_M=0
// (MON_MALE literal), NIDORAN_F=254 (MON_FEMALE literal), MAGNEMITE=255
// (MON_GENDERLESS literal).
const PIKACHU = 25;
const NIDORAN_M = 32;
const NIDORAN_F = 29;
const MAGNEMITE = 81;
const MALE_PERSONALITY = 200; // 127 > 200 is false -> male
const FEMALE_PERSONALITY = 0; // 127 > 0 is true -> female

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? Object.freeze([ATTRACT, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([15, 0, 0, 0]),
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
    species: changes.species ?? PIKACHU,
    personality: changes.personality ?? MALE_PERSONALITY,
    attack: changes.attack ?? 50,
    defense: changes.defense ?? 50,
    spAttack: changes.spAttack ?? 50,
    spDefense: changes.spDefense ?? 50,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, species: PIKACHU, personality: MALE_PERSONALITY, ...attackerChanges }),
    battler({ side: 1, species: PIKACHU, personality: FEMALE_PERSONALITY, ...targetChanges }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 0 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: ATTRACT,
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

function externalPorts(
  overrides: Partial<BattleScriptStatusRulesExternalPorts> = {},
): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT" ? 1 : null,
    resolveByteOperand: () => null,
    ...overrides,
  });
}

function ackAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function runToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
  budget = 100,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while ((result.kind === "advanced" || result.kind === "scheduler-progressed" || result.kind === "blocked") && steps < budget) {
    const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
    result = stepBattleScriptMachine(program, nextState, execution.handlers);
    steps++;
  }
  return { result, steps };
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const TRYINFATUATING_PC = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_TRYINFATUATING",
)!.programCounter;

/** Lands directly on the committed program's one B_SCR_OP_TRYINFATUATING instruction. */
function stepAtTryinfatuating(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectAttract",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: TRYINFATUATING_PC });
  return stepBattleScriptMachine(program, patched, execution.handlers);
}

describe("production tryinfatuating (Cmd_tryinfatuating) dispatch", () => {
  it("registers exactly one B_SCR_OP_TRYINFATUATING concrete call site", () => {
    expect(
      program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_TRYINFATUATING"),
    ).toHaveLength(1);
  });

  it("target ability Oblivious: jumps to BattleScript_ObliviousPreventsAttraction (hardcoded, not the operand ptr), sets lastUsedAbility, target status2 untouched, draws no RNG", () => {
    const rc = context({}, { ability: ABILITY_OBLIVIOUS });
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ObliviousPreventsAttraction"));
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_OBLIVIOUS);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_OBLIVIOUS);
    expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    expect(result.state.rng.calls).toBe(0);
  });

  it("same gender (both male): jumps to the operand's fail pointer (BattleScript_ButItFailed), status2 untouched", () => {
    const rc = context({ personality: MALE_PERSONALITY }, { personality: MALE_PERSONALITY });
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
    expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
    expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
  });

  it("attacker genderless (Magnemite): fails via BattleScript_ButItFailed even though the target has a distinct gender", () => {
    const rc = context({ species: MAGNEMITE, personality: 0 }, { species: PIKACHU, personality: FEMALE_PERSONALITY });
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
  });

  it("target genderless (Magnemite): fails via BattleScript_ButItFailed", () => {
    const rc = context({ species: PIKACHU, personality: MALE_PERSONALITY }, { species: MAGNEMITE, personality: 0 });
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
  });

  it("target already infatuated with a THIRD battler (not this attacker): still fails via BattleScript_ButItFailed -- STATUS2_INFATUATION is checked as \"nonzero\", not \"infatuated with this attacker\"", () => {
    const alreadyInfatuatedWithBattler2 = 1 << (16 + 2);
    const rc = context({}, { status2: alreadyInfatuatedWithBattler2 });
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_ButItFailed"));
    expect(result.state.rulesContext.battlers[1]!.status2).toBe(alreadyInfatuatedWithBattler2); // untouched by this failed attempt
  });

  it("fixed-gender literals (NIDORAN_M vs NIDORAN_F, opposite genders regardless of personality): succeeds, writes STATUS2_INFATUATED_WITH(attacker) on the target, advances past the instruction, draws no RNG", () => {
    const rc = context(
      { species: NIDORAN_M, personality: 0xffff_ffff },
      { species: NIDORAN_F, personality: 0 },
    );
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.programCounter).toBe(TRYINFATUATING_PC + 1);
    expect(result.state.rulesContext.battlers[1]!.status2).toBe(1 << (16 + 0)); // STATUS2_INFATUATED_WITH(battler 0)
    expect(result.state.rng.calls).toBe(0);
  });

  it("opposite genders via the threshold formula (both Pikachu, genderRatio 127): succeeds, target's other fields are untouched, attacker is untouched", () => {
    const rc = context({ species: PIKACHU, personality: MALE_PERSONALITY }, { species: PIKACHU, personality: FEMALE_PERSONALITY });
    const before = rc.battlers[1]!;
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      ...before,
      status2: 1 << 16,
    });
    expect(result.state.rulesContext.battlers[0]).toBe(rc.battlers[0]);
  });

  it("succeeding attracts a target already tracking unrelated status2 bits (OR, not overwrite)", () => {
    const preexisting = (1 << 3) | (1 << 20); // arbitrary unrelated bits, well outside the 4-bit infatuation nibble
    const rc = context({}, { status2: preexisting });
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]!.status2).toBe((preexisting | (1 << 16)) >>> 0);
  });
});

describe("composition: Cmd_tryinfatuating's write lands in the exact bit advanceBattleScriptAttackCancelerInLove's admission phase reads", () => {
  it("battler 1, freshly infatuated with battler 0 by tryinfatuating, is later read by the in-love admission phase as infatuationSource === 0 when battler 1 itself attacks", () => {
    const rc = context({}, {});
    const result = stepAtTryinfatuating(rc);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    const infatuatedTargetState = result.state.rulesContext.battlers[1]!;
    expect(infatuatedTargetState.status2 & 0x000f_0000).toBe(1 << 16);

    // Battler 1 now takes its own turn: it becomes the admission phase's
    // own "attacker" role (the battler whose own infatuation might cancel
    // its move), independent of Attract's own attacker/target roles above.
    const nextTurnContext = Object.freeze({
      ...result.state.rulesContext,
      selectorRoles: Object.freeze({ attacker: 1 as const, target: 0 as const, effectBattler: 1 as const, fainted: null }),
      atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IN_LOVE,
    });
    const admission = advanceBattleScriptAttackCancelerInLove(nextTurnContext, 0x1000, 4);
    if (admission.kind !== "advance") throw new Error(`expected phase advance: ${admission.kind}`);
    expect(admission.receipt.infatuation.sourceBattler).toBe(0); // reads back the exact attacker tryinfatuating wrote
    expect(admission.reason).toBe("love-check-passed"); // rngValue=4 -> Random()&1 == 1 on this LCG, matching battleScriptAttackCancelerInLove.test.ts's own pinned case
  });
});

describe(
  "EFFECT_ATTRACT: full committed script, the census's top-ranked blocker (B_SCR_OP_TRYINFATUATING, 45 weighted)",
  () => {
    it("succeeds end to end: opposite genders, STATUS2_INFATUATED_WITH(attacker) set on the target, STRINGID_PKMNFELLINLOVE printed, exactly one RNG roll (accuracycheck only -- tryinfatuating itself draws none), genuine terminal end", () => {
      const rc = context();
      const { result } = runToTerminal("BattleScript_EffectAttract", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.status2 & 0x000f_0000).toBe(1 << 16);
      expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(14); // 15 -> 14
      expect(result.state.rng.calls).toBe(1);
      const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
      expect(messageEvents).toContain("STRINGID_PKMNFELLINLOVE");
    });

    it("fails end to end on same gender via BattleScript_ButItFailed (STRINGID_BUTITFAILED, MOVE_RESULT_FAILED), target status2 untouched", () => {
      const rc = context({ personality: MALE_PERSONALITY }, { personality: MALE_PERSONALITY });
      const { result } = runToTerminal("BattleScript_EffectAttract", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
      expect(result.state.rulesContext.moveResultFlags & (1 << 5)).toBe(1 << 5); // MOVE_RESULT_FAILED
      const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
      expect(messageEvents).toContain("STRINGID_BUTITFAILED");
    });

    it("fails end to end when either battler is genderless (Magnemite target) via the identical BattleScript_ButItFailed tail", () => {
      const rc = context({}, { species: MAGNEMITE, personality: 0 });
      const { result } = runToTerminal("BattleScript_EffectAttract", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
      const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
      expect(messageEvents).toContain("STRINGID_BUTITFAILED");
    });

    it("fails end to end when the target is already infatuated (with a third battler) via the identical BattleScript_ButItFailed tail", () => {
      const rc = context({}, { status2: 1 << (16 + 2) });
      const { result } = runToTerminal("BattleScript_EffectAttract", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(1 << (16 + 2)); // untouched by this failed attempt
      const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
      expect(messageEvents).toContain("STRINGID_BUTITFAILED");
    });

    it("fails end to end on target ability Oblivious via its own distinct tail (STRINGID_PKMNPREVENTSROMANCEWITH), not BattleScript_ButItFailed", () => {
      const rc = context({}, { ability: ABILITY_OBLIVIOUS });
      const { result } = runToTerminal("BattleScript_EffectAttract", rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
      expect(result.state.rulesContext.battlers[1]!.status2).toBe(0);
      expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_OBLIVIOUS);
      const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
      expect(messageEvents).toContain("STRINGID_PKMNPREVENTSROMANCEWITH");
      expect(messageEvents).not.toContain("STRINGID_BUTITFAILED");
    });
  },
);
