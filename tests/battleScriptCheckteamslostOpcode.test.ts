import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
/** include/constants/battle.h:78 -- Factory always sets this bit. */
const BATTLE_TYPE_FACTORY = 1 << 19;
/** include/constants/battle.h:81. */
const BATTLE_TYPE_INGAME_PARTNER = 1 << 22;
/** include/constants/battle.h:77. */
const BATTLE_TYPE_ARENA = 1 << 18;
/** include/constants/battle.h:60. */
const BATTLE_TYPE_LINK = 1 << 1;

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
    battlers: [battler({ side: 0 }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
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

const checkteamslostPc = program.instructions.findIndex(
  (instruction) => instruction.opcodeName === "B_SCR_OP_CHECKTEAMSLOST",
);

function stepAtProgramCounter(rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: checkteamslostPc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production checkteamslost (Cmd_checkteamslost) dispatch -- the real party-HP terminal-outcome decision", () => {
  it("registers B_SCR_OP_CHECKTEAMSLOST", () => {
    expect(checkteamslostPc).toBeGreaterThanOrEqual(0);
  });

  it("both parties alive: battleOutcome stays 0, falls through to the next instruction", () => {
    const rc = context({ party: { player: sixSlots(100), opponent: sixSlots(90) } });
    const { result } = stepAtProgramCounter(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleOutcome).toBe(0);
    const next = resolveBattleScriptLabel(program, "BattleScript_HandleFaintedMon");
    expect(result.state.programCounter).toBe(checkteamslostPc + 1);
    expect(next).toBeDefined();
  });

  it("opponent party wiped (last slot 0 HP, no others alive): battleOutcome flips to B_OUTCOME_WON (1) -- the real terminal WIN transition", () => {
    const rc = context({ party: { player: sixSlots(100), opponent: sixSlots(0, 0, 0) } });
    const { result } = stepAtProgramCounter(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleOutcome).toBe(1);
  });

  it("player party wiped: battleOutcome flips to B_OUTCOME_LOST (2)", () => {
    const rc = context({ party: { player: sixSlots(0), opponent: sixSlots(90) } });
    const { result } = stepAtProgramCounter(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleOutcome).toBe(2);
  });

  it("both parties wiped simultaneously: battleOutcome becomes B_OUTCOME_DREW (3, the OR of both bits)", () => {
    const rc = context({ party: { player: sixSlots(0), opponent: sixSlots(0) } });
    const { result } = stepAtProgramCounter(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleOutcome).toBe(3);
  });

  it("a non-last opponent slot at 0 HP with two slots still alive does not flip the outcome (party-wide sum, not active-battler HP)", () => {
    const rc = context({ party: { player: sixSlots(100), opponent: sixSlots(0, 90, 90) } });
    const { result } = stepAtProgramCounter(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleOutcome).toBe(0);
  });

  it("species-0 slots are excluded from the sum even with nonzero hp (matches GetMonData(MON_DATA_SPECIES) gate)", () => {
    const rc = context({
      party: {
        player: sixSlots(100),
        opponent: [{ species: 0, isEgg: false, hp: 90 }, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
      },
    });
    const { result } = stepAtProgramCounter(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleOutcome).toBe(1);
  });

  it("egg slots are excluded from the sum even with nonzero species/hp (matches GetMonData(MON_DATA_IS_EGG) gate)", () => {
    const rc = context({
      party: {
        player: sixSlots(100),
        opponent: [{ species: 261, isEgg: true, hp: 90 }, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
      },
    });
    const { result } = stepAtProgramCounter(rc);
    if (result.kind !== "advanced") throw new Error("expected advance");
    expect(result.state.rulesContext.battleOutcome).toBe(1);
  });

  it("blocks (controller-busy) instead of computing anything while a controller is still pending", () => {
    const rc = context({ party: { player: sixSlots(100), opponent: sixSlots(0) } });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_HandleFaintedMon",
      rc,
      1,
      externalPorts(),
    );
    let state = Object.freeze({ ...execution.state, programCounter: checkteamslostPc });
    state = Object.freeze({
      ...state,
      scheduler: Object.freeze({ ...state.scheduler, pendingControllerBattlers: Object.freeze([1 as const]) }),
    });
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    expect(result.kind).toBe("blocked");
    const acknowledged = acknowledgeBattleScriptMachineController(state, 1);
    const resumed = stepBattleScriptMachine(program, acknowledged, execution.handlers);
    if (resumed.kind !== "advanced") throw new Error("expected advance after acknowledgement");
    expect(resumed.state.rulesContext.battleOutcome).toBe(1);
  });

  describe("(b) unsupported-branch barriers", () => {
    it("halts under BATTLE_TYPE_INGAME_PARTNER (Steven-partner exclusion needs gPartnerTrainerId, unmodeled)", () => {
      const rc = context({
        party: { player: sixSlots(100), opponent: sixSlots(90) },
        battleTopology: {
          battlersCount: 2,
          battleTypeFlags: BATTLE_TYPE_FACTORY | BATTLE_TYPE_INGAME_PARTNER,
          battlerPositions: [0, 1, 0xff, 0xff],
        },
      });
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts under BATTLE_TYPE_ARENA (per-mon exclusion needs gBattleStruct arena-lost bitfields, unmodeled)", () => {
      const rc = context({
        party: { player: sixSlots(100), opponent: sixSlots(90) },
        battleTopology: {
          battlersCount: 2,
          battleTypeFlags: BATTLE_TYPE_ARENA,
          battlerPositions: [0, 1, 0xff, 0xff],
        },
      });
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("halts under BATTLE_TYPE_LINK when the outcome is still undecided (empty-battler-spot counting needs gSpecialStatuses, unmodeled)", () => {
      const rc = context({
        party: { player: sixSlots(100), opponent: sixSlots(90) },
        battleTopology: {
          battlersCount: 2,
          battleTypeFlags: BATTLE_TYPE_LINK,
          battlerPositions: [0, 1, 0xff, 0xff],
        },
      });
      const { result } = stepAtProgramCounter(rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("pass-through: the real Factory battle type never trips any of the three barriers, win or not", () => {
      const winRc = context({ party: { player: sixSlots(100), opponent: sixSlots(0) } });
      const { result: winResult } = stepAtProgramCounter(winRc);
      expect(winResult.kind).toBe("advanced");

      const ongoingRc = context({ party: { player: sixSlots(100), opponent: sixSlots(90) } });
      const { result: ongoingResult } = stepAtProgramCounter(ongoingRc);
      expect(ongoingResult.kind).toBe("advanced");
    });
  });

  describe("staged integration: BattleScript_GiveExp -> BattleScript_HandleFaintedMon", () => {
    it("computes a REAL battleOutcome 0 -> 1 transition from the party slice through jumpifbyte / getexp (short-circuit) / checkteamslost", () => {
      // The opponent's 3-mon Factory roster is entirely fainted (party HP, not
      // active-battler HP) -- this is the precondition the doc's own KO
      // scenario ends on; battleOutcome itself starts at 0 and is never
      // injected, only computed by checkteamslost below.
      const rc = context({
        giveExpState: 0,
        party: { player: sixSlots(100), opponent: sixSlots(0, 0, 0) },
      });
      expect(rc.battleOutcome).toBe(0);

      // Stage 1: BattleScript_GiveExp -- setbyte sGIVEEXP_STATE,0 / getexp
      // BS_TARGET / end2. Real hardware dispatches Cmd_getexp twice (states
      // 0 -> 6) before its own end2 finishes this BattleScriptExecute call.
      const giveExp = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_GiveExp",
        rc,
        1,
        externalPorts(),
      );
      let step = stepBattleScriptMachine(program, giveExp.state, giveExp.handlers); // setbyte
      if (step.kind !== "advanced") throw new Error("expected setbyte to advance");
      expect(step.state.rulesContext.giveExpState).toBe(0);

      step = stepBattleScriptMachine(program, step.state, giveExp.handlers); // getexp state 0 -> 6
      if (step.kind !== "advanced") throw new Error("expected getexp state 0 to advance");
      expect(step.state.rulesContext.giveExpState).toBe(6);
      expect(step.state.rulesContext.battleOutcome).toBe(0); // getexp never touches battleOutcome

      step = stepBattleScriptMachine(program, step.state, giveExp.handlers); // getexp state 6 -> advance
      if (step.kind !== "advanced") throw new Error("expected getexp state 6 to advance");
      expect(step.state.rulesContext.giveExpState).toBe(0);
      expect(step.state.rulesContext.battlers[1]).toMatchObject({ item: 0, ability: 0 });

      const giveExpEnd = stepBattleScriptMachine(program, step.state, giveExp.handlers); // end2
      expect(giveExpEnd.kind).toBe("halted");
      if (giveExpEnd.kind !== "halted") throw new Error("expected end2 to halt terminal");
      expect(giveExpEnd.state.haltReason).toMatchObject({ kind: "terminal" });
      expect(giveExpEnd.state.rulesContext.battleOutcome).toBe(0);

      // Stage 2: HandleFaintedMonActions would now BattleScriptExecute
      // BattleScript_HandleFaintedMon (docs/faint-outcome-ground-truth.md
      // §1) -- that C-side orchestration loop is out of this rung's scope,
      // so this test stages the next script entry directly, carrying the
      // same rulesContext forward exactly as the KO scenario's own prior
      // rungs staged entries.
      const handleFainted = createBattleScriptStatusRulesExecution(
        program,
        "BattleScript_HandleFaintedMon",
        giveExpEnd.state.rulesContext,
        1,
        externalPorts(),
      );

      const afterCheckteamslost = stepBattleScriptMachine(program, handleFainted.state, handleFainted.handlers);
      if (afterCheckteamslost.kind !== "advanced") throw new Error("expected checkteamslost to advance");
      expect(afterCheckteamslost.state.rulesContext.battleOutcome).toBe(1); // B_OUTCOME_WON -- the real transition

      const afterJumpifbyte = stepBattleScriptMachine(
        program,
        afterCheckteamslost.state,
        handleFainted.handlers,
      );
      if (afterJumpifbyte.kind !== "advanced") throw new Error("expected jumpifbyte to advance");
      const faintedMonEnd = resolveBattleScriptLabel(program, "BattleScript_FaintedMonEnd");
      expect(faintedMonEnd).toBeDefined();
      expect(afterJumpifbyte.state.programCounter).toBe(faintedMonEnd!.programCounter);
    });
  });
});
