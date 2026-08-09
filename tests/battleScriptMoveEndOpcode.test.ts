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
} from "../src/engine/battleScriptMachine.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33; // EFFECT_HIT, power 35, TYPE_NORMAL
const DOUBLE_TEAM = 104; // non-damaging and not FLAG_KINGS_ROCK_AFFECTED
const HYPER_VOICE = 304; // damaging but excluded from FLAG_KINGS_ROCK_AFFECTED in Gen 3
const KINGS_ROCK = 187; // GetItemHoldEffect -> HOLD_EFFECT_FLINCH, parameter 10
const CHERI_BERRY = 133;
const CHESTO_BERRY = 134;
const PECHA_BERRY = 135;
const RAWST_BERRY = 136;
const ASPEAR_BERRY = 137;
const PERSIM_BERRY = 140;
const LUM_BERRY = 141;
const WHITE_HERB = 180;
const MENTAL_HERB = 185;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
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
    confusionSelfDmg: changes.confusionSelfDmg,
    item: changes.item ?? 0,
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    specialStatus: changes.specialStatus,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    personality: changes.personality ?? 0,
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
    currentMove: TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    moveendState: 0,
    ...contextChanges,
  });
}

function externalPorts(
  overrides: Partial<BattleScriptStatusRulesExternalPorts> = {},
): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze(
            operand.expression === "STRINGID_PKMNSXCUREDITSYPROBLEM"
              && context.state.rulesContext.battleTextBuff1Status !== null
              ? [context.state.rulesContext.battleTextBuff1Status]
              : [],
          ),
        })
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

/** Lands directly on BattleScript_MoveEnd's B_SCR_OP_MOVEEND instruction (past its setbyte). */
function stepAtMoveend(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_MoveEnd",
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  const moveendPc = execution.state.programCounter + 1;
  const instruction = program.instructions[moveendPc];
  if (instruction?.opcodeName !== "B_SCR_OP_MOVEEND") {
    throw new Error("BattleScript_MoveEnd's second instruction is not B_SCR_OP_MOVEEND");
  }
  const patched = Object.freeze({ ...execution.state, programCounter: moveendPc });
  return { execution, moveendPc, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

function labelPc(label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

/**
 * Drives one B_SCR_OP_MOVEEND instruction across its controller-return pauses
 * (ordinarily states 9 and 10, see the vertical audit) to genuine completion,
 * acknowledging between resumptions exactly as a real driver must.
 */
function runMoveendToCompletion(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const { execution, moveendPc, result: first } = stepAtMoveend(rulesContext, rngSeed);
  let result = first;
  let resumptions = 0;
  while (result.kind === "advanced" && result.state.programCounter === moveendPc) {
    resumptions += 1;
    if (resumptions > 17) throw new Error("Cmd_moveend did not converge on MOVEEND_COUNT");
    let state = result.state;
    for (const battler of state.scheduler.pendingControllerBattlers) {
      state = acknowledgeBattleScriptMachineController(state, battler);
    }
    result = stepBattleScriptMachine(program, state, execution.handlers);
  }
  return { execution, moveendPc, result, resumptions };
}

function runMoveendScriptToTerminal(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const { execution, moveendPc } = stepAtMoveend(rulesContext, rngSeed);
  let state = Object.freeze({ ...execution.state, programCounter: moveendPc });
  let result = stepBattleScriptMachine(program, state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 300; steps += 1) {
    state = result.state;
    for (const battlerId of state.scheduler.pendingControllerBattlers) {
      state = acknowledgeBattleScriptMachineController(state, battlerId);
    }
    result = stepBattleScriptMachine(program, state, execution.handlers);
  }
  if (result.kind !== "halted") throw new Error("moveend callback did not reach BattleScript_MoveEnd's own END");
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result;
}

function runCommittedScriptToTerminal(
  entryLabel: string,
  rulesContext: BattleScriptRulesContext,
  rngSeed: number,
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    entryLabel,
    rulesContext,
    rngSeed,
    externalPorts(),
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  for (let steps = 0; result.kind !== "halted" && steps < 500; steps += 1) {
    let state = result.state;
    for (const battlerId of state.scheduler.pendingControllerBattlers) {
      state = acknowledgeBattleScriptMachineController(state, battlerId);
    }
    result = stepBattleScriptMachine(program, state, execution.handlers);
  }
  if (result.kind !== "halted") throw new Error(`${entryLabel} did not reach its own END`);
  expect(result.state.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
  return result;
}

describe("production moveend (Cmd_moveend) registration", () => {
  it("registers B_SCR_OP_MOVEEND", () => {
    const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_MOVEEND");
    expect(instruction).toBeDefined();
  });

  it("moveendall (endMode 0, no barrier states): runs states 0-16 to MOVEEND_COUNT and advances past the instruction", () => {
    const rc = context(0, { attack: 40 }, {}, { defense: 40, hp: 50 });
    const { result, moveendPc, resumptions } = runMoveendToCompletion(rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(resumptions).toBe(2); // controller-returns at states 9 (attacker) and 10 (target)
    expect(result.state.rulesContext.moveendState).toBe(17);
    expect(result.state.programCounter).toBe(moveendPc + 1);
    expect(result.state.rng.calls).toBe(0);
  });

  it("MOVEEND_RAGE applies: increments target Attack, calls BattleScript_RageIsBuilding with the current PC pushed", () => {
    const rc = context(
      0,
      {},
      { moveResultFlags: 0 },
      { status2: 1 << 23, hp: 50, specialStatus: { physicalDmg: 4 } },
    );
    const { result, moveendPc } = stepAtMoveend(rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(result.state.programCounter).toBe(labelPc("BattleScript_RageIsBuilding"));
    expect(result.state.callStack.at(-1)).toBe(moveendPc);
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(7);
    expect(result.state.rulesContext.moveendState).toBe(1);
  });

  it("MOVEEND_RAGE does not apply without STATUS2_RAGE: passes through with no stat change", () => {
    // Ordinary turns pause (controller-return, same PC) at state 9 -- neither
    // battler is semi-invulnerable, so MOVEEND_ATTACKER_VISIBLE always fires
    // its visibility controller command (docs/battle-script-move-end-vertical-audit.md
    // case 9/10); this only isolates RAGE's own no-op branch.
    const rc = context(0, {}, {}, { hp: 50, specialStatus: { physicalDmg: 4 } });
    const { result } = stepAtMoveend(rc);
    if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
    expect(result.state.rulesContext.moveendState).toBe(10); // paused at MOVEEND_ATTACKER_VISIBLE
    expect(result.state.rulesContext.battlers[1]!.statStages[1]).toBe(6);
  });

  describe("MOVEEND_SYNCHRONIZE_TARGET / MOVEEND_SYNCHRONIZE_ATTACKER", () => {
    const ABILITY_SYNCHRONIZE = 28;
    const HITMARKER_STATUS_ABILITY_EFFECT = 1 << 13;
    const HITMARKER_SYNCHRONIZE_EFFECT = 1 << 14;
    const MOVE_EFFECT_AFFECTS_USER = 1 << 6;

    it.each([
      ["poison", 2, 1 << 3],
      ["burn", 3, 1 << 4],
      ["paralysis", 5, 1 << 6],
      ["toxic becomes ordinary poison", 6, 1 << 3],
    ])(
      "target Synchronize reflects %s to the attacker with battle + party controller sync and ability-message selection",
      (_name, synchronizeMoveEffect, expectedStatus1) => {
        const rc = context(
          0,
          { partyIndex: 2 },
          {
            moveendState: 2,
            hitMarker: HITMARKER_SYNCHRONIZE_EFFECT,
            synchronizeMoveEffect,
            party: {
              player: [{}, {}, { species: 95, hp: 100 }, {}, {}, {}],
            },
          },
          { ability: ABILITY_SYNCHRONIZE },
        );
        const { result, moveendPc } = stepAtMoveend(rc);
        if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
        expect(result.state.programCounter).toBe(labelPc("BattleScript_SynchronizeActivates"));
        expect(result.state.callStack.at(-1)).toBe(moveendPc);
        expect(result.state.rulesContext).toMatchObject({
          moveendState: 3,
          moveEffectByte: 2 === synchronizeMoveEffect
            ? MOVE_EFFECT_AFFECTS_USER | 2
            : MOVE_EFFECT_AFFECTS_USER | (synchronizeMoveEffect === 6 ? 2 : synchronizeMoveEffect),
          synchronizeMoveEffect: synchronizeMoveEffect === 6 ? 2 : synchronizeMoveEffect,
          scriptingBattler: 1,
          lastUsedAbility: ABILITY_SYNCHRONIZE,
          multistringChooser: 0,
        });
        expect(result.state.rulesContext.hitMarker & HITMARKER_SYNCHRONIZE_EFFECT).toBe(0);
        expect(result.state.rulesContext.hitMarker & HITMARKER_STATUS_ABILITY_EFFECT).not.toBe(0);
        expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(ABILITY_SYNCHRONIZE);

        const terminal = runMoveendScriptToTerminal(rc);
        expect(terminal.state.rulesContext.battlers[0]!.status1).toBe(expectedStatus1);
        expect(terminal.state.rulesContext.party.player[2]!.status1).toBe(expectedStatus1);
        expect(terminal.state.rulesContext.multistringChooser).toBe(1);
        expect(terminal.state.events).toContainEqual(expect.objectContaining({
          kind: "set-battler-status-data",
          battler: 0,
          status1: expectedStatus1,
        }));
        // The reflected write re-arms the marker. Source leaves it set when
        // the later attacker holder is not itself Synchronize.
        expect(terminal.state.rulesContext.hitMarker & HITMARKER_SYNCHRONIZE_EFFECT).not.toBe(0);
      },
    );

    it("target state runs before attacker state: two Synchronize holders reveal in order, while the second reflection is quiet against the already-statused target", () => {
      const rc = context(
        0,
        { ability: ABILITY_SYNCHRONIZE },
        {
          moveendState: 2,
          hitMarker: HITMARKER_SYNCHRONIZE_EFFECT,
          synchronizeMoveEffect: 3,
        },
        { ability: ABILITY_SYNCHRONIZE, status1: 1 << 4 },
      );
      const terminal = runMoveendScriptToTerminal(rc);
      expect(terminal.state.rulesContext.battlers[0]!.status1).toBe(1 << 4);
      expect(terminal.state.rulesContext.battlers[1]!.status1).toBe(1 << 4);
      expect(terminal.state.rulesContext.aiObservedAbilityIds.slice(0, 2)).toEqual([
        ABILITY_SYNCHRONIZE,
        ABILITY_SYNCHRONIZE,
      ]);
      expect(terminal.state.events.filter((event) => event.kind === "set-battler-status-data"))
        .toHaveLength(1);
    });

    it("attacker Synchronize runs after a quiet target state and reflects to the target", () => {
      const rc = context(
        0,
        { ability: ABILITY_SYNCHRONIZE, status1: 1 << 6 },
        {
          moveendState: 2,
          hitMarker: HITMARKER_SYNCHRONIZE_EFFECT,
          synchronizeMoveEffect: 5,
        },
      );
      const terminal = runMoveendScriptToTerminal(rc);
      expect(terminal.state.rulesContext.battlers[1]!.status1).toBe(1 << 6);
      expect(terminal.state.rulesContext.aiObservedAbilityIds[0]).toBe(ABILITY_SYNCHRONIZE);
      expect(terminal.state.events).toContainEqual(expect.objectContaining({
        kind: "set-battler-status-data",
        battler: 1,
        status1: 1 << 6,
      }));
    });

    it("is quiet for a non-Synchronize holder, an absent marker, and Safari topology", () => {
      const noAbility = context(
        0,
        {},
        {
          moveendState: 2,
          hitMarker: HITMARKER_SYNCHRONIZE_EFFECT,
          synchronizeMoveEffect: 3,
        },
      );
      const noAbilityResult = runMoveendToCompletion(noAbility).result;
      if (noAbilityResult.kind !== "advanced") throw new Error("expected no-ability pass");
      expect(noAbilityResult.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(noAbilityResult.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(noAbilityResult.state.rulesContext.hitMarker & HITMARKER_SYNCHRONIZE_EFFECT).not.toBe(0);

      const noMarker = context(
        0,
        {},
        { moveendState: 2, synchronizeMoveEffect: 3 },
        { ability: ABILITY_SYNCHRONIZE },
      );
      const noMarkerResult = runMoveendToCompletion(noMarker).result;
      if (noMarkerResult.kind !== "advanced") throw new Error("expected no-marker pass");
      expect(noMarkerResult.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(noMarkerResult.state.rulesContext.lastUsedAbility).toBe(0);

      const safari = context(
        0,
        {},
        {
          moveendState: 2,
          hitMarker: HITMARKER_SYNCHRONIZE_EFFECT,
          synchronizeMoveEffect: 3,
          battleTopology: {
            battlersCount: 2,
            battleTypeFlags: 1 << 7,
            battlerPositions: [0, 1, 0xff, 0xff],
          },
        },
        { ability: ABILITY_SYNCHRONIZE },
      );
      const safariResult = runMoveendToCompletion(safari).result;
      if (safariResult.kind !== "advanced") throw new Error("expected Safari pass");
      expect(safariResult.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(safariResult.state.rulesContext.hitMarker & HITMARKER_SYNCHRONIZE_EFFECT).not.toBe(0);
    });
  });

  describe("(b) unsupported-branch barriers", () => {
    it("MOVEEND_ON_DAMAGE_ABILITIES passes through for an unrelated ability", () => {
      const rc = context(0, {}, { moveendState: 3 }, { ability: 62 }); // ABILITY_GUTS
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(10); // paused at MOVEEND_ATTACKER_VISIBLE
    });

    it("MOVEEND_IMMUNITY_ABILITIES passes through when no battler holds a curing ability", () => {
      const rc = context(0, {}, { moveendState: 4 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(10); // paused at MOVEEND_ATTACKER_VISIBLE
    });

    it.each([
      [
        "Cheri/paralysis",
        CHERI_BERRY,
        (1 << 6) | (1 << 4),
        0,
        1 << 4,
        0,
        "BattleScript_BerryCureParRet",
        "STRINGID_PKMNSITEMCUREDPARALYSIS",
        true,
      ],
      [
        "Chesto/sleep",
        CHESTO_BERRY,
        3 | (1 << 3),
        (1 << 27) | 1,
        1 << 3,
        1,
        "BattleScript_BerryCureSlpRet",
        "STRINGID_PKMNSITEMWOKEIT",
        true,
      ],
      [
        "Pecha/poison",
        PECHA_BERRY,
        (1 << 3) | (1 << 7) | (0xf << 8) | (1 << 4),
        0,
        1 << 4,
        0,
        "BattleScript_BerryCurePsnRet",
        "STRINGID_PKMNSITEMCUREDPOISON",
        true,
      ],
      [
        "Rawst/burn",
        RAWST_BERRY,
        (1 << 4) | (1 << 6),
        0,
        1 << 6,
        0,
        "BattleScript_BerryCureBrnRet",
        "STRINGID_PKMNSITEMHEALEDBURN",
        true,
      ],
      [
        "Aspear/freeze",
        ASPEAR_BERRY,
        (1 << 5) | (1 << 6),
        0,
        1 << 6,
        0,
        "BattleScript_BerryCureFrzRet",
        "STRINGID_PKMNSITEMDEFROSTEDIT",
        true,
      ],
      [
        "Persim/confusion",
        PERSIM_BERRY,
        1 << 4,
        3 | (1 << 16),
        1 << 4,
        1 << 16,
        "BattleScript_BerryCureConfusionRet",
        "STRINGID_PKMNSITEMSNAPPEDOUT",
        false,
      ],
      [
        "Mental Herb/infatuation",
        MENTAL_HERB,
        1 << 4,
        (1 << 16) | 3,
        1 << 4,
        3,
        "BattleScript_BerryCureChosenStatusRet",
        "STRINGID_PKMNSITEMCUREDPROBLEM",
        false,
      ],
    ] as const)(
      "%s cures only its selected condition, keeps state 11 through the script, consumes once, then advances on the quiet rescan",
      (
        _name,
        item,
        status1,
        status2,
        expectedStatus1,
        expectedStatus2,
        scriptLabel,
        messageId,
        hasStatusController,
      ) => {
        const rc = context(
          0,
          {},
          {
            moveendState: 11,
            party: {
              opponent: [{ species: 1, hp: 100, status1 }, {}, {}, {}, {}, {}],
            },
          },
          { item, status1, status2 },
        );
        const { result, moveendPc } = stepAtMoveend(rc);
        if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
        expect(result.state.programCounter).toBe(labelPc(scriptLabel));
        expect(result.state.callStack.at(-1)).toBe(moveendPc);
        expect(result.state.rulesContext.moveendState).toBe(11);
        expect(result.state.rulesContext.scriptingBattler).toBe(1);
        expect(result.state.rulesContext.lastUsedItem).toBe(item);
        expect(result.state.rulesContext.battlers[1]).toMatchObject({
          item,
          status1: expectedStatus1,
          status2: expectedStatus2,
        });
        expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(expectedStatus1);
        expect(result.state.scheduler.pendingControllerBattlers).toEqual(
          hasStatusController ? [1] : [],
        );
        expect(
          result.state.events.filter((event) => event.kind === "set-battler-status-data"),
        ).toHaveLength(hasStatusController ? 1 : 0);

        const terminal = runMoveendScriptToTerminal(rc);
        expect(terminal.state.rulesContext.moveendState).toBe(17);
        expect(terminal.state.rulesContext.battlers[1]).toMatchObject({
          item: 0,
          status1: expectedStatus1,
          status2: expectedStatus2,
        });
        expect(terminal.state.rulesContext.usedHeldItems[1]).toBe(item);
        expect(terminal.state.events).toContainEqual(expect.objectContaining({
          kind: "message",
          messageId,
        }));
      },
    );

    it("Lum clears every primary status plus confusion, mirrors status1, and retains unrelated status2 bits", () => {
      const status1 = 3 | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7) | (0xf << 8);
      const status2 = (1 << 27) | 3 | (1 << 16);
      const rc = context(
        0,
        {},
        {
          moveendState: 11,
          party: {
            opponent: [{ species: 1, hp: 100, status1 }, {}, {}, {}, {}, {}],
          },
        },
        { item: LUM_BERRY, status1, status2 },
      );
      const { result, moveendPc } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_BerryCureChosenStatusRet"));
      expect(result.state.callStack.at(-1)).toBe(moveendPc);
      expect(result.state.rulesContext.moveendState).toBe(11);
      expect(result.state.rulesContext).toMatchObject({
        scriptingBattler: 1,
        lastUsedItem: LUM_BERRY,
        battleTextBuff1Status: "confusion",
        multistringChooser: 0,
      });
      expect(result.state.rulesContext.battlers[1]).toMatchObject({
        item: LUM_BERRY,
        status1: 0,
        status2: 1 << 16,
      });
      expect(result.state.rulesContext.party.opponent[0]!.status1).toBe(0);
      expect(result.state.scheduler.pendingControllerBattlers).toEqual([1]);

      const terminal = runMoveendScriptToTerminal(rc);
      expect(terminal.state.rulesContext.moveendState).toBe(17);
      expect(terminal.state.rulesContext.battlers[1]).toMatchObject({
        item: 0,
        status1: 0,
        status2: 1 << 16,
      });
      expect(terminal.state.rulesContext.usedHeldItems[1]).toBe(LUM_BERRY);
      expect(terminal.state.events).toContainEqual(expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNSITEMCUREDPROBLEM",
      }));
    });

    it("White Herb restores all and only negative stages, keeps state 11 during its tail, and consumes once", () => {
      const statStages = [4, 5, 6, 7, 3, 8, 6, 2] as const;
      const expectedStages = [6, 6, 6, 7, 6, 8, 6, 6] as const;
      const rc = context(
        0,
        {},
        { moveendState: 11 },
        { item: WHITE_HERB, statStages: [...statStages] },
      );
      const { result, moveendPc } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.programCounter).toBe(labelPc("BattleScript_WhiteHerbRet"));
      expect(result.state.callStack.at(-1)).toBe(moveendPc);
      expect(result.state.rulesContext.moveendState).toBe(11);
      expect(result.state.rulesContext.scriptingBattler).toBe(1);
      expect(result.state.rulesContext.lastUsedItem).toBe(WHITE_HERB);
      expect(result.state.rulesContext.battlers[1]).toMatchObject({
        item: WHITE_HERB,
        statStages: expectedStages,
      });
      expect(result.state.scheduler.pendingControllerBattlers).toEqual([]);

      const terminal = runMoveendScriptToTerminal(rc);
      expect(terminal.state.rulesContext.moveendState).toBe(17);
      expect(terminal.state.rulesContext.battlers[1]).toMatchObject({
        item: 0,
        statStages: expectedStages,
      });
      expect(terminal.state.rulesContext.usedHeldItems[1]).toBe(WHITE_HERB);
      expect(terminal.state.events).toContainEqual(expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNSITEMRESTOREDSTATUS",
      }));
    });

    it("MOVEEND_ITEM_EFFECTS_ALL passes through when no battler holds a matching item", () => {
      const rc = context(0, {}, { moveendState: 11 }, { item: CHERI_BERRY });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
      expect(result.state.rulesContext.lastUsedItem).toBe(CHERI_BERRY);
      expect(result.state.rulesContext.battlers[1].item).toBe(CHERI_BERRY);
    });

    it("MOVEEND_KINGSROCK_SHELLBELL draws exactly once and applies non-certain flinch for a qualifying landed hit", () => {
      const rc = context(
        0,
        { item: KINGS_ROCK },
        { moveendState: 12, battleMoveDamage: 10 },
        { specialStatus: { physicalDmg: 10 } },
      );
      const { result } = stepAtMoveend(rc, 0); // first Random() is 0, below King's Rock's 10%
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rng.ledger).toMatchObject([{
        call: 1,
        randomValue: 0,
        reason: "ItemBattleEffects King's Rock flinch chance (Random() % 100)",
      }]);
      expect(result.state.rulesContext.battlers[1].status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED)
        .toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });

    it("MOVEEND_KINGSROCK_SHELLBELL consumes one over-threshold draw without flinching or drawing again", () => {
      const rc = context(
        0,
        { item: KINGS_ROCK },
        { moveendState: 12, battleMoveDamage: 10 },
        { specialStatus: { physicalDmg: 10 } },
      );
      const { result } = stepAtMoveend(rc, 1); // first Random() is 16838, 38% >= 10%
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rng.ledger[0]).toMatchObject({ call: 1, randomValue: 16838 });
      expect(result.state.rulesContext.battlers[1].status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED)
        .toBe(0);
    });

    it("MOVEEND_KINGSROCK_SHELLBELL draws zero for a non-damaging, non-qualifying move", () => {
      const rc = context(
        0,
        { item: KINGS_ROCK },
        { currentMove: DOUBLE_TEAM, moveendState: 12, battleMoveDamage: 10 },
      );
      const { result } = stepAtMoveend(rc, 0);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.rulesContext.battlers[1].status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED)
        .toBe(0);
    });

    it("pins source expression order: damaging Gen-3-excluded Hyper Voice draws before its flag rejection", () => {
      const rc = context(
        0,
        { item: KINGS_ROCK },
        { currentMove: HYPER_VOICE, moveendState: 12, battleMoveDamage: 10 },
        { specialStatus: { specialDmg: 10 } },
      );
      const { result } = stepAtMoveend(rc, 0);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(1);
      expect(result.state.rulesContext.battlers[1].status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED)
        .toBe(0);
    });

    it("MOVEEND_KINGSROCK_SHELLBELL does not barrier when battleMoveDamage is zero, even holding King's Rock", () => {
      const rc = context(0, { item: KINGS_ROCK }, { moveendState: 12, battleMoveDamage: 0 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rng.calls).toBe(0);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });

    it("halts on MOVEEND_NEXT_TARGET's doubles replay (unreachable for Level-50 singles)", () => {
      const MOVE_TARGET_BOTH_MOVE = 13; // MOVE_RAZOR_WIND, target MOVE_TARGET_BOTH
      const rc = context(
        0,
        {},
        {
          moveendState: 16,
          currentMove: MOVE_TARGET_BOTH_MOVE,
          battleTopology: { battlersCount: 4, battleTypeFlags: 1 << 0, battlerPositions: [0, 1, 2, 3] },
        },
        { hp: 40 },
      );
      const { result } = stepAtMoveend(rc);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch", sourceLine: 4467 });
    });

    it("MOVEEND_NEXT_TARGET passes through for singles (BATTLE_TYPE_DOUBLE unset)", () => {
      const rc = context(0, {}, { moveendState: 16 });
      const { result } = stepAtMoveend(rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });
  });

  describe("MOVEEND_IMMUNITY_ABILITIES status-curing pass", () => {
    const STATUS1_POISON = 1 << 3;
    const STATUS1_BURN = 1 << 4;
    const STATUS1_FREEZE = 1 << 5;
    const STATUS1_PARALYSIS = 1 << 6;
    const STATUS1_TOXIC_POISON = 1 << 7;
    const STATUS1_TOXIC_COUNTER = (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11);
    const STATUS1_SLEEP = 3;
    const STATUS2_CONFUSION = 5;
    const STATUS2_NIGHTMARE = 1 << 27;
    const STATUS2_INFATUATION = 1 << 16;

    it.each([
      ["Immunity poison", 17, STATUS1_TOXIC_POISON | STATUS1_TOXIC_COUNTER | STATUS1_PARALYSIS, 0, 0, 0, "poison"],
      ["Own Tempo confusion", 20, STATUS1_BURN, STATUS2_CONFUSION | STATUS2_NIGHTMARE, STATUS1_BURN, STATUS2_NIGHTMARE, "confusion"],
      ["Limber paralysis", 7, STATUS1_PARALYSIS | STATUS1_POISON, 0, 0, 0, "paralysis"],
      ["Insomnia sleep", 15, STATUS1_SLEEP | STATUS1_BURN, STATUS2_NIGHTMARE | STATUS2_INFATUATION, 0, STATUS2_INFATUATION, "sleep"],
      ["Vital Spirit sleep", 72, STATUS1_SLEEP | STATUS1_PARALYSIS, STATUS2_NIGHTMARE, 0, 0, "sleep"],
      ["Water Veil burn", 41, STATUS1_BURN | STATUS1_PARALYSIS, 0, 0, 0, "burn"],
      ["Magma Armor freeze", 40, STATUS1_FREEZE | STATUS1_POISON, 0, 0, 0, "ice"],
      ["Oblivious infatuation", 12, STATUS1_BURN, STATUS2_INFATUATION | STATUS2_CONFUSION, STATUS1_BURN, STATUS2_CONFUSION, "love"],
    ])(
      "%s clears the source-selected state, syncs status1, prints the selected problem, and reveals only through the source message",
      (_name, ability, status1, status2, expectedStatus1, expectedStatus2, statusName) => {
        const rc = context(
          0,
          {},
          {
            moveendState: 4,
            party: {
              opponent: [{}, {}, { species: 113, hp: 100, status1 }, {}, {}, {}],
            },
          },
          { ability, status1, status2, partyIndex: 2 },
        );
        const { result, moveendPc } = stepAtMoveend(rc);
        if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
        expect(result.state.programCounter).toBe(labelPc("BattleScript_AbilityCuredStatus"));
        expect(result.state.callStack.at(-1)).toBe(moveendPc);
        expect(result.state.rulesContext.moveendState).toBe(4);
        expect(result.state.rulesContext.battlers[1]).toMatchObject({
          status1: expectedStatus1,
          status2: expectedStatus2,
        });
        expect(result.state.rulesContext.party.opponent[2]!.status1).toBe(expectedStatus1);
        expect(result.state.rulesContext.scriptingBattler).toBe(1);
        expect(result.state.rulesContext.battleTextBuff1Status).toBe(statusName);
        expect(result.state.rulesContext.lastUsedAbility).toBe(0);
        // The successful case returns at battle_util.c:2949, before the
        // common RecordAbilityBattle tail at :3194-3195.
        expect(result.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
        expect(result.state.scheduler.pendingControllerBattlers).toEqual([1]);
        expect(result.state.events.at(-1)).toMatchObject({
          kind: "set-battler-status-data",
          battler: 1,
          status1: expectedStatus1,
        });

        const terminal = runMoveendScriptToTerminal(rc);
        expect(terminal.state.events).toContainEqual(expect.objectContaining({
          kind: "message",
          messageId: "STRINGID_PKMNSXCUREDITSYPROBLEM",
          substitutions: [statusName],
        }));
        expect(terminal.state.events).toContainEqual(expect.objectContaining({
          kind: "status-icon-update",
          battler: 1,
          status1: expectedStatus1,
          status2: expectedStatus2,
        }));
        expect(terminal.state.rulesContext.moveendState).toBe(17);
      },
    );

    it("keeps a non-matching status and party copy unchanged, and a no-status holder is a quiet pass", () => {
      const nonMatching = context(
        0,
        {},
        {
          moveendState: 4,
          party: {
            opponent: [{}, {}, { species: 113, hp: 100, status1: STATUS1_BURN }, {}, {}, {}],
          },
        },
        { ability: 7, status1: STATUS1_BURN, partyIndex: 2 },
      );
      const { result } = stepAtMoveend(nonMatching);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_BURN);
      expect(result.state.rulesContext.party.opponent[2]!.status1).toBe(STATUS1_BURN);
      expect(result.state.rulesContext.moveendState).toBe(10);
      expect(result.state.events.some((event) =>
        event.kind === "set-battler-status-data"
        || event.kind === "message"
        || event.kind === "status-icon-update"
      )).toBe(false);

      const noStatus = context(0, {}, { moveendState: 4 }, { ability: 7 });
      const { result: quiet } = stepAtMoveend(noStatus);
      if (quiet.kind !== "advanced") throw new Error(`expected advanced, got ${quiet.kind}`);
      expect(quiet.state.rulesContext.moveendState).toBe(10);
      expect(quiet.state.rulesContext.battleTextBuff1Status).toBeNull();
      expect(quiet.state.events.some((event) =>
        event.kind === "set-battler-status-data"
        || event.kind === "message"
        || event.kind === "status-icon-update"
      )).toBe(false);

      const safari = context(
        0,
        {},
        {
          moveendState: 4,
          battleTopology: {
            battlersCount: 2,
            battleTypeFlags: 1 << 7,
            battlerPositions: [0, 1, 0xff, 0xff],
          },
        },
        { ability: 7, status1: STATUS1_PARALYSIS },
      );
      const { result: safariQuiet } = stepAtMoveend(safari);
      if (safariQuiet.kind !== "advanced") {
        throw new Error(`expected advanced, got ${safariQuiet.kind}`);
      }
      expect(safariQuiet.state.rulesContext.battlers[1]!.status1).toBe(STATUS1_PARALYSIS);
      expect(safariQuiet.state.rulesContext.moveendState).toBe(10);
    });

    it("returns to state 4 and rescans from battler 0 so two curable battlers are handled one at a time", () => {
      const battlers = [
        battler({ side: 0, ability: 7, status1: STATUS1_PARALYSIS, partyIndex: 1 }),
        battler({ side: 1, ability: 41, status1: STATUS1_BURN, partyIndex: 2 }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ];
      const rc = context(0, {}, {
        battlers,
        moveendState: 4,
        party: {
          player: [{}, { species: 106, hp: 100, status1: STATUS1_PARALYSIS }, {}, {}, {}, {}],
          opponent: [{}, {}, { species: 226, hp: 100, status1: STATUS1_BURN }, {}, {}, {}],
        },
      });
      const terminal = runMoveendScriptToTerminal(rc);
      expect(terminal.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(terminal.state.rulesContext.battlers[1]!.status1).toBe(0);
      expect(terminal.state.rulesContext.party.player[1]!.status1).toBe(0);
      expect(terminal.state.rulesContext.party.opponent[2]!.status1).toBe(0);
      expect(terminal.state.events.filter((event) =>
        event.kind === "set-battler-status-data"
      ).map((event) => event.kind === "set-battler-status-data" ? event.battler : -1))
        .toEqual([0, 1]);
      expect(terminal.state.events.filter((event) =>
        event.kind === "message"
        && event.messageId === "STRINGID_PKMNSXCUREDITSYPROBLEM"
      ).map((event) => event.kind === "message" ? event.substitutions[0] : null))
        .toEqual(["paralysis", "burn"]);
    });
  });

  describe("MOVEEND_ON_DAMAGE_ABILITIES contact family", () => {
const POUND = 1;
const SWIFT = 129;
const KARATE_CHOP = 2;
const THUNDERBOLT = 85;
    const damaged = { physicalDmg: 4 };

    it.each([
      ["Poison Point", 38, 1 << 3],
      ["Static", 9, 1 << 6],
      ["Flame Body", 49, 1 << 4],
    ])("%s proc, no-proc, and already-statused eligibility block", (_name, ability, statusBit) => {
      const proc = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability, specialStatus: damaged }),
        7,
      );
      expect(proc.state.rulesContext.battlers[0]!.status1).toBe(statusBit);
      expect(proc.state.rulesContext.aiObservedAbilityIds[1]).toBe(ability);
      expect(proc.state.rng.calls).toBe(1);

      const miss = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability, specialStatus: damaged }),
        1,
      );
      expect(miss.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(miss.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
      expect(miss.state.rng.calls).toBe(1);

      const blocked = runMoveendScriptToTerminal(
        context(0, { status1: 1 << 5 }, { currentMove: POUND, moveendState: 3 }, { ability, specialStatus: damaged }),
        7,
      );
      expect(blocked.state.rulesContext.battlers[0]!.status1).toBe(1 << 5);
      expect(blocked.state.rng.calls).toBe(1);
    });

    it("Effect Spore selects sleep, draws its duration, and still spends the proc on an ineligible attacker", () => {
      const proc = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        41,
      );
      expect(proc.state.rulesContext.battlers[0]!.status1 & 0x7).toBeGreaterThanOrEqual(2);
      expect(proc.state.rulesContext.aiObservedAbilityIds[1]).toBe(27);
      expect(proc.state.rng.calls).toBe(3); // proc + nonzero selector + sleep duration

      const noProc = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        1,
      );
      expect(noProc.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(noProc.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
      expect(noProc.state.rng.calls).toBe(1);

      const blocked = runMoveendScriptToTerminal(
        context(0, { status1: 1 << 6 }, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        41,
      );
      expect(blocked.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);
      expect(blocked.state.rng.calls).toBe(2); // proc + selector; failed SetMoveEffect does not refund

      const repeatsZero = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, { ability: 27, specialStatus: damaged }),
        13,
      );
      expect(repeatsZero.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);
      expect(repeatsZero.state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "Effect Spore contact proc",
        "Effect Spore status selector",
        "Effect Spore status selector",
      ]);
    });

    it("Cute Charm rolls before eligibility, writes the target-owned infatuation bit, and runs its full script", () => {
      const proc = runMoveendScriptToTerminal(
        context(
          0,
          { species: 32 },
          { currentMove: POUND, moveendState: 3 },
          { ability: 56, species: 29, specialStatus: damaged },
        ),
        7,
      );
      expect(proc.state.rulesContext.battlers[0]!.status2 & (1 << 17)).not.toBe(0);
      expect(proc.state.rulesContext.aiObservedAbilityIds[1]).toBe(56);
      expect(proc.state.rng.calls).toBe(1);

      const noProc = runMoveendScriptToTerminal(
        context(0, { species: 32 }, { currentMove: POUND, moveendState: 3 }, { ability: 56, species: 29, specialStatus: damaged }),
        1,
      );
      expect(noProc.state.rulesContext.battlers[0]!.status2).toBe(0);
      expect(noProc.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);

      const oblivious = runMoveendScriptToTerminal(
        context(0, { species: 32, ability: 12 }, { currentMove: POUND, moveendState: 3 }, { ability: 56, species: 29, specialStatus: damaged }),
        7,
      );
      expect(oblivious.state.rulesContext.battlers[0]!.status2).toBe(0);
      expect(oblivious.state.rng.calls).toBe(1);

      const targetFainted = runMoveendScriptToTerminal(
        context(0, { species: 32 }, { currentMove: POUND, moveendState: 3 }, {
          ability: 56,
          species: 29,
          hp: 0,
          specialStatus: damaged,
        }),
        7,
      );
      expect(targetFainted.state.rng.calls).toBe(0); // target survival precedes the C short-circuit roll
    });

    it.each([
      ["Fighting contact", KARATE_CHOP, "TYPE_FIGHTING", ["TYPE_NORMAL", "TYPE_NORMAL"]],
      ["Electric non-contact", THUNDERBOLT, "TYPE_ELECTRIC", ["TYPE_NORMAL", "TYPE_NORMAL"]],
      ["Normal non-contact", SWIFT, "TYPE_NORMAL", ["TYPE_FIGHTING", "TYPE_FIGHTING"]],
    ] as const)("Color Change mutates both type slots for a real-damage %s move with no RNG", (_kind, move, expectedType, startingTypes) => {
      const changed = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: move, moveendState: 3 }, {
          ability: 16,
          types: startingTypes,
          specialStatus: damaged,
        }),
      );
      expect(changed.state.rulesContext.battlers[1]!.types).toEqual([expectedType, expectedType]);
      expect(changed.state.rulesContext.battleTextBuff1Type).toBe(expectedType);
      expect(changed.state.rulesContext.aiObservedAbilityIds[1]).toBe(16);
      expect(changed.state.rng.calls).toBe(0);
    });

    it("Color Change keeps its source exclusions: already matching type, no real damage, no-effect, and a fainted target", () => {
      const alreadyType = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: KARATE_CHOP, moveendState: 3 }, {
          ability: 16,
          types: ["TYPE_FIGHTING", "TYPE_NORMAL"],
          specialStatus: damaged,
        }),
      );
      expect(alreadyType.state.rulesContext.battlers[1]!.types).toEqual(["TYPE_FIGHTING", "TYPE_NORMAL"]);
      expect(alreadyType.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);

      for (const [label, contextChanges, targetChanges] of [
        ["no real damage", {}, { specialStatus: { physicalDmg: 0, specialDmg: 0 } }],
        ["no-effect", { moveResultFlags: 1 }, {}],
        ["target fainted", {}, { hp: 0 }],
      ] as const) {
        const quiet = runMoveendScriptToTerminal(
          context(0, {}, { currentMove: THUNDERBOLT, moveendState: 3, ...contextChanges }, {
            ability: 16,
            types: ["TYPE_NORMAL", "TYPE_NORMAL"],
            ...targetChanges,
            specialStatus: targetChanges.specialStatus ?? damaged,
          }),
        );
        expect(quiet.state.rulesContext.battlers[1]!.types, label).toEqual(["TYPE_NORMAL", "TYPE_NORMAL"]);
        expect(quiet.state.rulesContext.aiObservedAbilityIds[1], label).toBe(0);
        expect(quiet.state.rng.calls, label).toBe(0);
      }
    });

    it("Rough Skin uses max(1,maxHP/16), can faint the attacker, does not require target survival, and runs its full script", () => {
      const fainted = runMoveendScriptToTerminal(
        context(0, { hp: 1, maxHP: 15 }, { currentMove: POUND, moveendState: 3 }, {
          ability: 24,
          hp: 0,
          specialStatus: damaged,
        }),
      );
      expect(fainted.state.rulesContext.battlers[0]!.hp).toBe(0);
      expect(fainted.state.rulesContext.aiObservedAbilityIds[1]).toBe(24);
      expect(fainted.state.rng.calls).toBe(0);

      const scaled = runMoveendScriptToTerminal(
        context(0, { hp: 100, maxHP: 160 }, { currentMove: POUND, moveendState: 3 }, { ability: 24, specialStatus: damaged }),
      );
      expect(scaled.state.rulesContext.battlers[0]!.hp).toBe(90);

      const confusionBlocked = runMoveendScriptToTerminal(
        context(0, { hp: 100, maxHP: 160, confusionSelfDmg: 1 }, { currentMove: POUND, moveendState: 3 }, {
          ability: 24,
          specialStatus: damaged,
        }),
      );
      expect(confusionBlocked.state.rulesContext.battlers[0]!.hp).toBe(100);

      const nonContact = runMoveendScriptToTerminal(
        context(0, { hp: 100, maxHP: 160 }, { currentMove: SWIFT, moveendState: 3 }, {
          ability: 24,
          specialStatus: damaged,
        }),
      );
      expect(nonContact.state.rulesContext.battlers[0]!.hp).toBe(100);
    });

    it("Substitute-suppressed damage and non-contact Swift never enter contact abilities or draw", () => {
      const substitute = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: POUND, moveendState: 3 }, {
          ability: 9,
          status2: 1 << 24,
          substituteHP: 20,
          specialStatus: { physicalDmg: 0, specialDmg: 0 },
        }),
        7,
      );
      expect(substitute.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(substitute.state.rng.calls).toBe(0);

      const swift = runMoveendScriptToTerminal(
        context(0, {}, { currentMove: SWIFT, moveendState: 3 }, { ability: 9, specialStatus: damaged }),
        7,
      );
      expect(swift.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(swift.state.rng.calls).toBe(0);
    });

    it("ability statuses affect the attacker and bypass Shield Dust plus Safeguard, but keep Limber eligibility", () => {
      const bypass = runMoveendScriptToTerminal(
        context(
          0,
          { ability: 19 },
          { currentMove: POUND, moveendState: 3, sideStatuses: [1 << 5, 0] },
          { ability: 9, specialStatus: damaged },
        ),
        7,
      );
      expect(bypass.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);

      const limber = runMoveendScriptToTerminal(
        context(0, { ability: 7 }, { currentMove: POUND, moveendState: 3 }, { ability: 9, specialStatus: damaged }),
        7,
      );
      expect(limber.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(limber.state.rng.calls).toBe(1);
    });

    it("live-receipt semantics: Pound's Static roll is draw 5 after the four hit-chain draws, success and failure both spend exactly one", () => {
      const staged = context(
        0,
        { species: 305, attack: 100, maxHP: 125, hp: 125 },
        { currentMove: POUND, moveendState: 0 },
        { ability: 9, species: 25, defense: 80, maxHP: 110, hp: 110 },
      );
      const proc = runCommittedScriptToTerminal("BattleScript_EffectHit", staged, 1);
      expect(proc.state.rng.calls).toBe(5);
      expect(proc.state.rng.ledger.map((entry) => entry.reason)).toEqual([
        "accuracycheck",
        "critcalc",
        "adjustnormaldamage",
        "seteffectwithchance",
        "Static contact proc",
      ]);
      expect(proc.state.rulesContext.battlers[0]!.status1).toBe(1 << 6);
      expect(proc.state.rulesContext.aiObservedAbilityIds[1]).toBe(9);

      const failed = runCommittedScriptToTerminal("BattleScript_EffectHit", staged, 0);
      expect(failed.state.rng.calls).toBe(5);
      expect(failed.state.rng.ledger.at(-1)?.reason).toBe("Static contact proc");
      expect(failed.state.rulesContext.battlers[0]!.status1).toBe(0);
      expect(failed.state.rulesContext.aiObservedAbilityIds[1]).toBe(0);
    });
  });

  describe("endMode/endState postlude", () => {
    it("moveendcase (endMode 1): stops after the first no-effect state, regardless of endState", () => {
      const instruction = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_MOVEEND" && i.operands[0]?.expression === "1",
      );
      expect(instruction).toBeDefined();
      const rc = context(0, {}, { moveendState: 2 });
      const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_MoveEnd", rc, 1, externalPorts());
      const patched = Object.freeze({ ...execution.state, programCounter: instruction!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
      expect(result.state.programCounter).toBe(instruction!.programCounter + 1);
    });

    it("moveendto (endMode 2, MOVEEND_NEXT_TARGET): stops exactly at the requested state", () => {
      const instruction = program.instructions.find(
        (i) => i.opcodeName === "B_SCR_OP_MOVEEND" && i.operands[0]?.expression === "2",
      );
      expect(instruction).toBeDefined();
      // Starts past the ordinary attacker/target visibility controller-return
      // pauses (states 9-10, see the RAGE/SYNCHRONIZE tests above) so this
      // isolates the endMode 2 postlude check itself: states 11-15 run, then
      // the loop stops before ever executing state 16's body.
      const rc = context(0, {}, { moveendState: 11 });
      const execution = createBattleScriptStatusRulesExecution(program, "BattleScript_MoveEnd", rc, 1, externalPorts());
      const patched = Object.freeze({ ...execution.state, programCounter: instruction!.programCounter });
      const result = stepBattleScriptMachine(program, patched, execution.handlers);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.moveendState).toBe(17);
    });
  });
});
