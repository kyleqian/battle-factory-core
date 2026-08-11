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
import {
  BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const MOVE_PROTECT = 182; // EFFECT_PROTECT
const MOVE_ENDURE = 203; // EFFECT_ENDURE
const TACKLE = 33; // EFFECT_HIT, accuracy 95, FLAG_PROTECT_AFFECTED
const POUND = 1; // EFFECT_HIT, accuracy 100, FLAG_PROTECT_AFFECTED -- removes accuracy-roll variance from the Endure proof

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([MOVE_PROTECT, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([10, 0, 0, 0]),
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
    protected: changes.protected ?? 0,
    protectUses: changes.protectUses ?? 0,
    endured: changes.endured,
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

function context(
  attacker: 0 | 1,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const battlers: BattleScriptRulesBattler[] = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  battlers[target] = battler({ side: target, ...targetChanges });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: target },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_PROTECT,
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
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
    ...overrides,
  });
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const SETPROTECTLIKE_PC = program.instructions.find(
  (instruction) => instruction.opcodeName === "B_SCR_OP_SETPROTECTLIKE",
)!.programCounter;

/** Lands directly on the committed program's one B_SCR_OP_SETPROTECTLIKE instruction. */
function stepAtProtectlike(
  rulesContext: BattleScriptRulesContext,
  rngSeed = 1,
  ports = externalPorts(),
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectProtect",
    rulesContext,
    rngSeed,
    ports,
  );
  const patched = Object.freeze({ ...execution.state, programCounter: SETPROTECTLIKE_PC });
  const result = stepBattleScriptMachine(program, patched, execution.handlers);
  return { execution, result };
}

/** Modular inverse of ISO_RANDOMIZE1's multiplier (1103515245) mod 2**32 (src/engine/rng.ts's own constants). */
const RNG_MULTIPLIER_INVERSE = 4005161829n;
const RNG_MOD = 1n << 32n;

/** Finds an RNG seed whose *next* drawBattleScriptRng call yields exactly targetU16. */
function rngValueBeforeU16(targetU16: number): number {
  const after = BigInt(targetU16) * 65536n;
  const before = (((after - 24691n) % RNG_MOD + RNG_MOD) % RNG_MOD * RNG_MULTIPLIER_INVERSE) % RNG_MOD;
  return Number(before);
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

describe("production setprotectlike (Cmd_setprotectlike) dispatch", () => {
  it("registers B_SCR_OP_SETPROTECTLIKE", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_SETPROTECTLIKE")).toBeDefined();
  });

  it("EFFECT_PROTECT, first use (protectUses 0, sProtectSuccessRates[0] === USHRT_MAX): always succeeds, sets protected=1, increments protectUses, PROTECTED_ITSELF chooser, exactly one RNG call", () => {
    const rc = context(0, { protectUses: 0 }, { currentMove: MOVE_PROTECT, currentTurnActionNumber: 0 });
    const { result } = stepAtProtectlike(rc, 12345);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.protected).toBe(1);
    expect(result.state.rulesContext.battlers[0]!.endured).toBeUndefined();
    expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(1);
    expect(result.state.rulesContext.multistringChooser).toBe(0); // B_MSG_PROTECTED_ITSELF
    expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).toBe(0);
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rng.ledger[0]!.reason).toBe("setprotectlike");
  });

  it("EFFECT_ENDURE, first use: always succeeds, sets endured=1 (not protected), BRACED_ITSELF chooser", () => {
    const rc = context(0, { protectUses: 0 }, { currentMove: MOVE_ENDURE, currentTurnActionNumber: 0 });
    const { result } = stepAtProtectlike(rc, 999);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.endured).toBe(1);
    expect(result.state.rulesContext.battlers[0]!.protected).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(1);
    expect(result.state.rulesContext.multistringChooser).toBe(1); // B_MSG_BRACED_ITSELF
  });

  it("gCurrentTurnActionNumber == gBattlersCount - 1 (last action of the turn): always fails regardless of protectUses' success rate, but the Random() roll is STILL a real left-operand-of-&& evaluation -- it still spends an RNG call even though notLastTurn guarantees failure", () => {
    const rc = context(0, { protectUses: 0 }, { currentMove: MOVE_PROTECT, currentTurnActionNumber: 1 }); // battlersCount defaults to 2, so action 1 is the last
    const { result } = stepAtProtectlike(rc, 42);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.protected).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(0);
    expect(result.state.rulesContext.multistringChooser).toBe(2); // B_MSG_PROTECT_FAILED
    expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).not.toBe(0);
    expect(result.state.rng.calls).toBe(1); // spent despite guaranteed failure
  });

  it("resets the streak before rolling when the user's own last move wasn't Protect/Detect/Endure, even with a stale nonzero protectUses stored -- rolls at tier 0 (succeeds), not the stale tier", () => {
    // tier 0 (65535) succeeds at this roll; tier 2 (16383, what a buggy no-reset read of protectUses=2 would use) would fail.
    const rngSeed = rngValueBeforeU16(50000);
    const rc = context(
      0,
      { protectUses: 2 },
      {
        currentMove: MOVE_PROTECT,
        currentTurnActionNumber: 0,
        moveHistory: { lastResultingMoves: [TACKLE, 0, 0, 0] },
      },
    );
    const { result } = stepAtProtectlike(rc, rngSeed);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rng.ledger[0]!.randomValue).toBe(50000);
    expect(result.state.rulesContext.battlers[0]!.protected).toBe(1);
    expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(1); // reset to 0, then incremented -- NOT 3
  });

  it("keeps the stored streak (skips the reset) when the user's own last move WAS Protect-like, so the roll uses the next success-rate tier and can fail where tier 0 would have succeeded", () => {
    // tier 0 (65535) would succeed at this roll; tier 1 (32767, the correct tier for a stored protectUses of 1) fails.
    const rngSeed = rngValueBeforeU16(50000);
    const rc = context(
      0,
      { protectUses: 1 },
      {
        currentMove: MOVE_PROTECT,
        currentTurnActionNumber: 0,
        moveHistory: { lastResultingMoves: [MOVE_PROTECT, 0, 0, 0] },
      },
    );
    const { result } = stepAtProtectlike(rc, rngSeed);
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rng.ledger[0]!.randomValue).toBe(50000);
    expect(result.state.rulesContext.battlers[0]!.protected).toBe(0);
    expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(0); // failure resets to 0, proving tier 1 (not tier 0) was used
    expect(result.state.rulesContext.multistringChooser).toBe(2);
  });

  it("MOVE_DETECT (the second Protect-like move) also preserves the streak instead of resetting it", () => {
    const rc = context(
      0,
      { protectUses: 1 },
      {
        currentMove: MOVE_PROTECT,
        currentTurnActionNumber: 0,
        moveHistory: { lastResultingMoves: [197 /* MOVE_DETECT */, 0, 0, 0] },
      },
    );
    const { result } = stepAtProtectlike(rc, rngValueBeforeU16(0)); // tier 1 (32767) still succeeds at roll 0
    if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.protected).toBe(1);
    expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(2); // 1 -> 2, not reset to 0 -> 1
  });

  describe("sProtectSuccessRates regression: the four real table entries (65535, 32767, 16383, 8191) each drive the roll exactly at their boundary", () => {
    const RATES = [65535, 32767, 16383, 8191];

    it.each([0, 1, 2, 3])(
      "protectUses %i: a draw exactly at its rate succeeds; the next draw (rate+1) fails -- pinning the exact table value",
      (protectUses) => {
        const rate = RATES[protectUses]!;

        const { result: hit } = stepAtProtectlike(
          context(0, { protectUses }, {
            currentMove: MOVE_PROTECT,
            currentTurnActionNumber: 0,
            moveHistory: { lastResultingMoves: [MOVE_PROTECT, 0, 0, 0] },
          }),
          rngValueBeforeU16(rate),
        );
        if (hit.kind !== "advanced") throw new Error(`did not advance: ${hit.kind}`);
        expect(hit.state.rng.ledger[0]!.randomValue).toBe(rate);
        expect(hit.state.rulesContext.battlers[0]!.protected).toBe(1);
        expect(hit.state.rulesContext.battlers[0]!.protectUses).toBe(protectUses + 1);

        if (rate < 65535) {
          const { result: miss } = stepAtProtectlike(
            context(0, { protectUses }, {
              currentMove: MOVE_PROTECT,
              currentTurnActionNumber: 0,
              moveHistory: { lastResultingMoves: [MOVE_PROTECT, 0, 0, 0] },
            }),
            rngValueBeforeU16(rate + 1),
          );
          if (miss.kind !== "advanced") throw new Error(`did not advance: ${miss.kind}`);
          expect(miss.state.rng.ledger[0]!.randomValue).toBe(rate + 1);
          expect(miss.state.rulesContext.battlers[0]!.protected).toBe(0);
          expect(miss.state.rulesContext.battlers[0]!.protectUses).toBe(0);
          expect(miss.state.rulesContext.multistringChooser).toBe(2);
        }
      },
    );
  });

  describe("fifth consecutive Protect-like use (protectUses 4): the measured OOB constant 118 (MOVE_METRONOME, sMovesForbiddenToCopy[0] at 0x0831c3e0, per docs/protectlike-oob-adjacent-byte.md)", () => {
    const fifthUseContext = () =>
      context(0, { protectUses: 4 }, {
        currentMove: MOVE_PROTECT,
        currentTurnActionNumber: 0,
        moveHistory: { lastResultingMoves: [MOVE_PROTECT, 0, 0, 0] },
      });

    it("Random() draw 118 (<= constant) succeeds the way the ROM would: protected=1, protectUses 4 -> 5, PROTECTED_ITSELF, no miss", () => {
      const { result } = stepAtProtectlike(fifthUseContext(), rngValueBeforeU16(118));
      if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
      expect(result.state.rng.ledger[0]!.randomValue).toBe(118);
      expect(result.state.rulesContext.battlers[0]!.protected).toBe(1);
      expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(5);
      expect(result.state.rulesContext.multistringChooser).toBe(0);
      expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).toBe(0);
    });

    it("Random() draw 119 (> constant) fails the way the ROM would: protectUses reset to 0, PROTECT_FAILED, MOVE_RESULT_MISSED", () => {
      const { result } = stepAtProtectlike(fifthUseContext(), rngValueBeforeU16(119));
      if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
      expect(result.state.rng.ledger[0]!.randomValue).toBe(119);
      expect(result.state.rulesContext.battlers[0]!.protected).toBe(0);
      expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(0);
      expect(result.state.rulesContext.multistringChooser).toBe(2);
      expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).not.toBe(0);
    });

    it("the notLastTurn gate still gates independently on the fifth use: a would-win draw (118) fails when this is the turn's last action, and the RNG call is still spent", () => {
      const rc = context(0, { protectUses: 4 }, {
        currentMove: MOVE_PROTECT,
        currentTurnActionNumber: 1, // battlersCount 2 -> action 1 is the last
        moveHistory: { lastResultingMoves: [MOVE_PROTECT, 0, 0, 0] },
      });
      const { result } = stepAtProtectlike(rc, rngValueBeforeU16(118));
      if (result.kind !== "advanced") throw new Error(`did not advance: ${result.kind}`);
      expect(result.state.rng.ledger[0]!.randomValue).toBe(118);
      expect(result.state.rulesContext.battlers[0]!.protected).toBe(0);
      expect(result.state.rulesContext.battlers[0]!.protectUses).toBe(0);
      expect(result.state.rulesContext.multistringChooser).toBe(2);
      expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).not.toBe(0);
      expect(result.state.rng.calls).toBe(1); // spent despite guaranteed failure
    });
  });

  describe("(b) unsupported-branch barrier RETIRED (the OOB read is now the measured constant, not a halt)", () => {
    it("protectUses 4 advances and rolls normally instead of halting (old barrier site is source-exact now)", () => {
      const rc = context(
        0,
        { protectUses: 4 },
        {
          currentMove: MOVE_PROTECT,
          currentTurnActionNumber: 0,
          moveHistory: { lastResultingMoves: [MOVE_PROTECT, 0, 0, 0] },
        },
      );
      const { result } = stepAtProtectlike(rc, 1);
      expect(result.kind).toBe("advanced");
    });
  });
});

describe("EFFECT_PROTECT / EFFECT_ENDURE: full committed script (BattleScript_EffectProtect/_EffectEndure alias one script), the census's next-ranked blocker after EFFECT_EARTHQUAKE (B_SCR_OP_SETPROTECTLIKE, 61 weighted)", () => {
  const B_WAIT_TIME_LONG = 64;
  const B_WAIT_TIME_SHORT = 32;

  function protectOrEndurePorts() {
    return externalPorts({
      resolveHalfwordOperand: (_context, operand) => {
        if (operand.expression === "B_WAIT_TIME_LONG") return B_WAIT_TIME_LONG;
        if (operand.expression === "B_WAIT_TIME_SHORT") return B_WAIT_TIME_SHORT;
        return null;
      },
    });
  }

  /**
   * Cmd_moveend's own controller-busy precondition is a real scheduler check
   * (not the injectable isControllerIdle port every other opcode here uses),
   * so any battler attackanimation left pending -- and any moveend leaves
   * pending mid-cycle at its own states 9/10 -- must be genuinely acknowledged
   * before the next dispatch, exactly like battleScriptMoveEndOpcode.test.ts's
   * own runMoveendToCompletion. This step() wraps every dispatch so
   * scheduler-progressed (waitmessage/pause ticks) and blocked
   * (controller-busy) both resolve transparently.
   */
  function step(
    state: BattleScriptMachineState<BattleScriptRulesContext>,
    handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
  ) {
    let result = stepBattleScriptMachine(program, state, handlers);
    let guard = 0;
    while (result.kind === "scheduler-progressed" || result.kind === "blocked") {
      guard += 1;
      if (guard > 200) throw new Error("step() did not converge");
      const nextState = result.kind === "blocked" ? ackAllPending(result.state) : result.state;
      result = stepBattleScriptMachine(program, nextState, handlers);
    }
    return result;
  }

  function stepUntilPc(
    state: BattleScriptMachineState<BattleScriptRulesContext>,
    handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
    targetPc: number,
    maxSteps = 20,
  ) {
    let result = step(state, handlers);
    let count = 0;
    while (result.kind === "advanced" && result.state.programCounter !== targetPc) {
      count += 1;
      if (count > maxSteps) throw new Error(`did not reach program counter ${targetPc} within ${maxSteps} steps`);
      result = step(result.state, handlers);
    }
    return result;
  }

  /**
   * Runs the real committed script from its own entry through setprotectlike
   * and on to its own terminal end. The tail (attackanimation/[Pausex20 no-
   * animation detour on failure]/waitanimation/printfromtable/waitmessage/
   * goto BattleScript_MoveEnd/moveendall/end) is driven generically by step
   * count rather than a fixed per-opcode script, because the failure path's
   * own Pausex20 detour (battle_script_commands.c's real MOVE_RESULT_NO_EFFECT
   * check on Cmd_attackanimation) makes the exact instruction count differ
   * from the success path -- both are real source branches, not test noise.
   */
  function runProtectlikeScript(
    entryLabel: string,
    rc: BattleScriptRulesContext,
    rngSeed: number,
  ) {
    const execution = createBattleScriptStatusRulesExecution(
      program,
      entryLabel,
      rc,
      rngSeed,
      protectOrEndurePorts(),
    );
    const handlers = execution.handlers;

    let result = stepUntilPc(execution.state, handlers, SETPROTECTLIKE_PC); // attackcanceler, attackstring, ppreduce
    if (result.kind !== "advanced") throw new Error(`did not reach setprotectlike: ${result.kind}`);
    expect(result.state.rulesContext.battlers[0]!.pp[0]).toBe(9); // 10 -> 9

    result = step(result.state, handlers); // setprotectlike itself (NEW)
    if (result.kind !== "advanced") throw new Error(`setprotectlike did not advance: ${result.kind}`);
    const afterProtectlike = result.state;

    let steps = 0;
    while (result.kind === "advanced" && steps < 60) {
      steps += 1;
      result = step(result.state, handlers);
    }
    if (result.kind !== "halted") throw new Error(`script did not reach its own end: ${result.kind}`);
    expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(result.state.rulesContext.moveendState).toBe(17);

    return { afterProtectlike, finished: result };
  }

  it("EFFECT_PROTECT succeeds end to end: protected=1 persists all the way through attackanimation/printfromtable/moveend to the script's own end, exactly one RNG call total (setprotectlike's own roll)", () => {
    const rc = context(0, { protectUses: 0 }, { currentMove: MOVE_PROTECT, currentTurnActionNumber: 0 });
    const { afterProtectlike, finished } = runProtectlikeScript("BattleScript_EffectProtect", rc, 12345);
    expect(afterProtectlike.rulesContext.battlers[0]!.protected).toBe(1);
    expect(afterProtectlike.rulesContext.multistringChooser).toBe(0);
    expect(finished.state.rulesContext.battlers[0]!.protected).toBe(1); // moveend never touches it
    expect(finished.state.rng.calls).toBe(1);
    expect(finished.state.rng.ledger.map((entry) => entry.reason)).toEqual(["setprotectlike"]);
  });

  it("EFFECT_ENDURE succeeds end to end: endured=1 persists through to the script's own end", () => {
    const rc = context(0, { protectUses: 0 }, { currentMove: MOVE_ENDURE, currentTurnActionNumber: 0 });
    const { afterProtectlike, finished } = runProtectlikeScript("BattleScript_EffectEndure", rc, 999);
    expect(afterProtectlike.rulesContext.battlers[0]!.endured).toBe(1);
    expect(afterProtectlike.rulesContext.multistringChooser).toBe(1);
    expect(finished.state.rulesContext.battlers[0]!.endured).toBe(1);
    expect(finished.state.rng.calls).toBe(1);
  });

  it("EFFECT_PROTECT fails on the turn's last action end to end: PROTECT_FAILED's own printfromtable/waitmessage entry is equally live, MOVE_RESULT_MISSED reaches the script's own end via genuine fallthrough (not a fake block)", () => {
    const rc = context(0, { protectUses: 0 }, { currentMove: MOVE_PROTECT, currentTurnActionNumber: 1 });
    const { afterProtectlike, finished } = runProtectlikeScript("BattleScript_EffectProtect", rc, 42);
    expect(afterProtectlike.rulesContext.battlers[0]!.protected).toBe(0);
    expect(afterProtectlike.rulesContext.multistringChooser).toBe(2);
    expect(afterProtectlike.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).not.toBe(0);
    expect(finished.state.rng.calls).toBe(1); // still spent, per the guaranteed-failure unit test above
  });
});

describe(
  "Consuming sites (already-registered opcodes, not this step's own registration): setprotectlike's "
    + "output genuinely drives attackcanceler/accuracycheck's Protect block and adjustnormaldamage's "
    + "Endure survival clamp -- proving the set + these existing consumers compose, not faking a block",
  () => {
    it("Protect set this turn genuinely blocks a subsequent incoming attack via attackcanceler's + accuracycheck's already-registered DEFENDER_IS_PROTECTED checks", () => {
      // Step 1: run Cmd_setprotectlike for real (battler 0's first-ever Protect, guaranteed success).
      const protectRc = context(0, { protectUses: 0 }, { currentMove: MOVE_PROTECT, currentTurnActionNumber: 0 });
      const { result: protectResult } = stepAtProtectlike(protectRc, 1);
      if (protectResult.kind !== "advanced") throw new Error(`setprotectlike did not advance: ${protectResult.kind}`);
      const protectedBattler = protectResult.state.rulesContext.battlers[0]!;
      expect(protectedBattler.protected).toBe(1);

      // Step 2: battler 1's real TACKLE against the now-protected battler 0, from BattleScript_HitFromAtkCanceler
      // (BattleScript_EffectHit's own entry, minus its Surf-only preamble -- same precedent this file's
      // Kadabra/Magneton SetMoveEffect integration proof already uses).
      const hitRc = createBattleScriptRulesContext({
        battlers: [protectedBattler, battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
        selectorRoles: { attacker: 1, target: 0, effectBattler: 0 },
        scriptingBattler: 1,
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
      });
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HitFromAtkCanceler",
        hitRc,
        1,
        externalPorts(),
      );
      let result = stepBattleScriptMachine(program, execution.state, execution.handlers); // attackcanceler
      if (result.kind !== "advanced") throw new Error(`attackcanceler did not advance: ${result.kind}`);
      expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).not.toBe(0);
      expect(result.state.rulesContext.missType).toBe(1); // B_MSG_PROTECTED
      expect(result.state.programCounter).not.toBe(execution.state.programCounter); // advanced, not jumped yet

      result = stepBattleScriptMachine(program, result.state, execution.handlers); // accuracycheck: DEFENDER_IS_PROTECTED -> jump to fail
      if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_PrintMoveMissed"));
      expect(result.state.rng.calls).toBe(0); // blocked before any accuracy roll at all
    });

    it("Endure set this turn genuinely survives a lethal incoming hit via adjustnormaldamage's already-registered HP clamp + MOVE_RESULT_FOE_ENDURED", () => {
      // Step 1: run Cmd_setprotectlike for real (battler 0's first-ever Endure, guaranteed success).
      const endureRc = context(0, { protectUses: 0, hp: 10, maxHP: 10 }, { currentMove: MOVE_ENDURE, currentTurnActionNumber: 0 });
      const { result: endureResult } = stepAtProtectlike(endureRc, 1);
      if (endureResult.kind !== "advanced") throw new Error(`setprotectlike did not advance: ${endureResult.kind}`);
      const enduredBattler = endureResult.state.rulesContext.battlers[0]!;
      expect(enduredBattler.endured).toBe(1);
      expect(enduredBattler.hp).toBe(10);

      // Step 2: battler 1's real POUND (100 accuracy, removing roll variance) against the now-endured
      // battler 0, overkill attack/defense stats so the raw hit unambiguously exceeds 10 HP.
      const hitRc = createBattleScriptRulesContext({
        battlers: [
          enduredBattler,
          battler({ side: 1, attack: 255, level: 100 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        selectorRoles: { attacker: 1, target: 0, effectBattler: 0 },
        scriptingBattler: 1,
        atkCancelerTracker: 0,
        battleOutcome: 0,
        currentMove: POUND,
        currentMovePosition: 0,
        moveResultFlags: 0,
        dmgMultiplier: 1,
        critMultiplier: 1,
        moveEffectByte: 0,
        missType: 0,
        hitMarker: 0,
        multiHitCounter: 0,
      });
      const execution = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HitFromAtkCanceler",
        hitRc,
        1,
        externalPorts(),
      );
      let result = stepBattleScriptMachine(program, execution.state, execution.handlers); // attackcanceler: not protected, advances
      if (result.kind !== "advanced") throw new Error(`attackcanceler did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // accuracycheck: 100 accuracy, always hits
      if (result.kind !== "advanced") throw new Error(`accuracycheck did not advance: ${result.kind}`);
      expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_MISSED).toBe(0);
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // attackstring
      if (result.kind !== "advanced") throw new Error(`attackstring did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // ppreduce
      if (result.kind !== "advanced") throw new Error(`ppreduce did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // critcalc
      if (result.kind !== "advanced") throw new Error(`critcalc did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // damagecalc
      if (result.kind !== "advanced") throw new Error(`damagecalc did not advance: ${result.kind}`);
      expect(result.state.rulesContext.battleMoveDamage).toBeGreaterThan(10); // the raw hit would have KO'd
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // typecalc
      if (result.kind !== "advanced") throw new Error(`typecalc did not advance: ${result.kind}`);
      result = stepBattleScriptMachine(program, result.state, execution.handlers); // adjustnormaldamage: Endure's own HP clamp
      if (result.kind !== "advanced") throw new Error(`adjustnormaldamage did not advance: ${result.kind}`);
      expect(result.state.rulesContext.battleMoveDamage).toBe(9); // hp(10) - 1, not the raw lethal damage
      expect(result.state.rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED).not.toBe(0);
    });
  },
);
