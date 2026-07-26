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
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();

/** docs/primary-stat-ground-truth.md §2.1's own carriers. */
const SWORDS_DANCE = 14; // EFFECT_ATTACK_UP_2
const TAIL_WHIP = 39; // EFFECT_DEFENSE_DOWN, accuracy 100
const ABILITY_CLEAR_BODY = 29;
/** src/data/gen/moves.json MOVE_DOUBLE_TEAM -- EFFECT_EVASION_UP, MOVE_TARGET_USER (self-target). */
const DOUBLE_TEAM = 104;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([SWORDS_DANCE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([20, 0, 0, 0]),
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
    protected: changes.protected,
    ppNotAffectedByPressure: changes.ppNotAffectedByPressure,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
    endured: changes.endured,
    helpingHand: changes.helpingHand,
  });
}

function context(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0, ...attackerChanges }),
    battler({ side: 1, ...targetChanges }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: SWORDS_DANCE,
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

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

/** Walks the real committed script from `entryLabel` until `targetLabel`'s own programCounter is reached (goto never executes its target, only jumps to it), or the step budget runs out. */
function runUntilLabel(
  entryLabel: string,
  targetLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
  budget = 100,
) {
  const execution = createBattleScriptStatusRulesExecution(program, entryLabel, rulesContext, rngSeed, ports);
  const targetPc = labelPc(targetLabel);
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while (
    (result.kind === "advanced" || result.kind === "scheduler-progressed")
    && result.state.programCounter !== targetPc
    && steps < budget
  ) {
    result = stepBattleScriptMachine(program, result.state, execution.handlers);
    steps++;
  }
  return { execution, result, steps };
}

describe("primary-effect stat-change route (Cmd_statbuffchange + SETGRAPHICALSTATCHANGEVALUES + PLAYANIMATION + JUMPIFSTATUS2 + ORBYTE)", () => {
  it("registers all five opcodes", () => {
    for (const name of [
      "B_SCR_OP_STATBUFFCHANGE",
      "B_SCR_OP_SETGRAPHICALSTATCHANGEVALUES",
      "B_SCR_OP_PLAYANIMATION",
      "B_SCR_OP_JUMPIFSTATUS2",
      "B_SCR_OP_ORBYTE",
    ]) {
      expect(program.instructions.find((i) => i.opcodeName === name), name).toBeDefined();
    }
  });

  it("Swords Dance (EFFECT_ATTACK_UP_2): raises ATK 6 -> 8 in exactly two stages, zero RNG (no accuracycheck in this script), reaches BattleScript_MoveEnd", () => {
    const rc = context({}, { currentMove: SWORDS_DANCE });
    const { result, steps } = runUntilLabel("BattleScript_EffectAttackUp2", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.statStages[1]).toBe(8); // STAT_ATK
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(19); // 20 -> 19
    expect(result.state.rng.calls).toBe(0);
    // Cmd_setgraphicalstatchangevalues: animArg1 = GET_STAT_BUFF_ID(statChanger) + value - 1,
    // value = STAT_ANIM_PLUS2(38) + 1 = 39 for a +2 increase; statId(STAT_ATK)=1 -> 1 + 39 - 1 = 39.
    expect(result.state.rulesContext.animArg1).toBe(39);
    expect(steps).toBeLessThan(100);
  });

  /**
   * S10 presentation-seam step (docs/presentation-seam-scout.md §8.3's
   * "STAT_ROSE_LINE1/2" row, ISSUES #39/#41 path): pins that `changeStatBuffs`'
   * own `stat-stage-change` event (battleScriptStatBuffs.ts:296-303, already
   * threaded through by this file's `Cmd_statbuffchange` handler,
   * battleScriptStatbuffchangeOpcode.ts:112-116) is genuinely reachable from
   * a real move's own script entry label through the production opcode
   * registry -- not merely constructed and discarded. No test before this one
   * ever inspected `.events` for this route (the Swords Dance/Tail Whip cases
   * above only assert `.rulesContext`); this is the first. DOUBLE_TEAM
   * (EFFECT_EVASION_UP, MOVE_TARGET_USER) is the self-target shape the
   * DOUBLE_TEAM evasion-rise banner (STAT_ROSE_LINE1/2, "Foe GROVYLE's
   * evasiveness rose!") needs: `target === attacker` makes `isAttackerActive`
   * true, so the multistring-chooser picks index 1 (STRINGID_DEFENDERSSTATROSE,
   * not index 0 STRINGID_ATTACKERSSTATROSE Swords Dance's own distinct-target
   * fixture happens to pick) -- a genuinely different branch than the
   * already-covered Swords Dance case, confirmed live here rather than assumed.
   */
  it("Double Team (EFFECT_EVASION_UP, self-target): raises EVASION 6 -> 7 and emits a real stat-stage-change event + STRINGID_DEFENDERSSTATROSE, reaches BattleScript_MoveEnd", () => {
    const rc = context(
      {},
      { currentMove: DOUBLE_TEAM, selectorRoles: { attacker: 0, target: 0, effectBattler: null } },
    );
    const { result } = runUntilLabel("BattleScript_EffectEvasionUp", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.statStages[7]).toBe(7); // STAT_EVASION 6 -> 7
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(19); // 20 -> 19
    const statEvent = result.state.events.find((e) => e.kind === "stat-stage-change");
    expect(statEvent).toMatchObject({ battler: 0, stat: "evasion", from: 6, to: 7 });
    const messageEvents = result.state.events.filter((e) => e.kind === "message").map((e) => e.messageId);
    expect(messageEvents).toContain("STRINGID_DEFENDERSSTATROSE");
    expect(messageEvents).not.toContain("STRINGID_ATTACKERSSTATROSE");
  });

  it("Tail Whip (EFFECT_DEFENSE_DOWN, guaranteed 100-accuracy hit): lowers the target's DEF 6 -> 5, exactly one RNG call (the accuracy roll), reaches BattleScript_MoveEnd", () => {
    const rc = context({}, { currentMove: TAIL_WHIP, currentMovePosition: 0 });
    const { result } = runUntilLabel("BattleScript_EffectDefenseDown", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.statStages[2]).toBe(5); // STAT_DEF
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(19);
  });

  /**
   * Cmd_accuracycheck's own "not-failed" branch barriers on any nonzero
   * target ability (AbilityBattleEffects(ABILITYEFFECT_ABSORBING) is not
   * modeled, a pre-existing limitation unrelated to this registration -- see
   * "halts when the target holds a nonzero ability on a hit" in
   * battleScriptHitChainOpcode.test.ts). A live Clear Body block can
   * therefore not be walked from the script's literal entry today; this
   * enters at the committed STATBUFFCHANGE instruction directly instead,
   * which is exactly the boundary this registration owns.
   */
  it("Tail Whip blocked by Clear Body: real ability-reveal message path (ALLOW_PTR set), stat stage unchanged, still reaches BattleScript_MoveEnd", () => {
    const rc = context({}, { currentMove: TAIL_WHIP, statChanger: 0x92 }, { ability: ABILITY_CLEAR_BODY });
    const statbuffchangePc = program.instructions.find(
      (i, index) =>
        i.opcodeName === "B_SCR_OP_STATBUFFCHANGE"
        && index >= labelPc("BattleScript_EffectDefenseDown")
        && index < labelPc("BattleScript_EffectHaze"),
    )!.programCounter;
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectDefenseDown",
      rc,
      1,
      externalPorts(),
    );
    const patched = Object.freeze({ ...execution.state, programCounter: statbuffchangePc });
    let result = stepBattleScriptMachine(program, patched, execution.handlers);
    const targetPc = labelPc("BattleScript_MoveEnd");
    let steps = 1;
    while (
      (result.kind === "advanced" || result.kind === "scheduler-progressed")
      && result.state.programCounter !== targetPc
      && steps < 40
    ) {
      result = stepBattleScriptMachine(program, result.state, execution.handlers);
      steps++;
    }
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[1]!.statStages[2]).toBe(6); // unchanged
    expect(result.state.rulesContext.lastUsedAbility).toBe(ABILITY_CLEAR_BODY);
    // The block is NOT free: it runs the real BattleScript_AbilityNoStatLoss sub-script
    // (pause/printstring/waitmessage/return), landing back via the pushed BS_ptr
    // (BattleScript_StatDownEnd) rather than a bare silent advance.
    expect(result.state.callStack.length).toBe(0); // the sub-script's own `return` already popped it
  });

  it("stat already at MAX_STAT_STAGE (12): Swords Dance sets MOVE_RESULT_MISSED, prints the 'wont go higher' message, skips the animation trio, still reaches BattleScript_MoveEnd", () => {
    const rc = context({ statStages: [6, 12, 6, 6, 6, 6, 6, 6] }, { currentMove: SWORDS_DANCE });
    const { result } = runUntilLabel("BattleScript_EffectAttackUp2", "BattleScript_MoveEnd", rc);
    expect(result.kind).toBe("advanced");
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battlers[0]!.statStages[1]).toBe(12);
    expect(result.state.rulesContext.moveResultFlags & 1).toBe(1); // MOVE_RESULT_MISSED
  });

  describe("PLAYANIMATION widened for B_ANIM_RAIN_CONTINUES/B_ANIM_SUN_CONTINUES (F7/F9 field-loop)", () => {
    it.each([
      ["BattleScript_RainContinuesOrEnds", "RAIN_CONTINUES"],
      ["BattleScript_SunlightContinues", "SUN_CONTINUES"],
    ] as const)("%s's own playanimation call now emits a real %s animation event instead of halting", (label, animationId) => {
      const found = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_PLAYANIMATION" && i.source.label === label,
      );
      expect(found, label).toBeDefined();
      const rc = context();
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_EffectAttackUp2",
        rc,
        1,
        externalPorts(),
      );
      const patched = Object.freeze({ ...execution.state, programCounter: found!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      expect(result.kind).not.toBe("halted");
      if (result.kind === "halted") throw new Error("expected no halt");
      const animEvent = result.state.events.find((e) => e.kind === "animation");
      expect(animEvent).toMatchObject({ animationId, arguments: [] });
    });
  });

  describe("(b) unsupported-branch barriers", () => {
    it("Cmd_playanimation halts on a non-B_ANIM_STATS_CHANGE animType", () => {
      const found = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_PLAYANIMATION" && i.operands[1]?.expression !== "B_ANIM_STATS_CHANGE",
      );
      expect(found).toBeDefined();
      const rc = context();
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_EffectAttackUp2",
        rc,
        1,
        externalPorts(),
      );
      const patched = Object.freeze({ ...execution.state, programCounter: found!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 4011 });
    });

    it("Cmd_jumpifstatus2 halts on a status2 value other than STATUS2_SUBSTITUTE", () => {
      const found = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_JUMPIFSTATUS2" && i.operands[1]?.expression !== "STATUS2_SUBSTITUTE",
      );
      expect(found).toBeDefined();
      const rc = context();
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_EffectAttackUp2",
        rc,
        1,
        externalPorts(),
      );
      const patched = Object.freeze({ ...execution.state, programCounter: found!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 3096 });
    });
  });
});
