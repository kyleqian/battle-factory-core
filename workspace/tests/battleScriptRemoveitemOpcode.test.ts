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

/** include/constants/battle.h:78 -- Factory always sets this bit. */
const BATTLE_TYPE_FACTORY = 1 << 19;
/** Any nonzero item id, distinct from ITEM_NONE(0) -- Cmd_removeitem doesn't branch on which item. */
const ITEM_HELD_FOR_TEST = 200;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0]),
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
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    item: changes.item ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  } as BattleScriptRulesBattler);
}

function context(
  battlers: readonly [BattleScriptRulesBattler, BattleScriptRulesBattler, BattleScriptRulesBattler, BattleScriptRulesBattler],
  selectorRoles: BattleScriptRulesContextInput["selectorRoles"],
  scriptingBattler: 0 | 1 | 2 | 3,
  party?: BattleScriptRulesContextInput["party"],
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles,
    scriptingBattler,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    weather: 0,
    battleTopology: { battlersCount: 2, battleTypeFlags: BATTLE_TYPE_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    party,
  } satisfies BattleScriptRulesContextInput);
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

const removeitemStarts = program.instructions.filter(
  (instruction) => instruction.opcodeName === "B_SCR_OP_REMOVEITEM",
);
const scriptingInstance = removeitemStarts.find((instruction) => instruction.operands[0]?.expression === "BS_SCRIPTING");
const attackerInstance = removeitemStarts.find((instruction) => instruction.operands[0]?.expression === "BS_ATTACKER");

function stepAtProgramCounter(rulesContext: BattleScriptRulesContext, programCounter: number) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_BerryCurePrlzEnd2",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production removeitem (Cmd_removeitem) dispatch -- battle_script_commands.c:5901-5915", () => {
  it("registers B_SCR_OP_REMOVEITEM with all 13 concrete instances, only BS_SCRIPTING/BS_ATTACKER selectors", () => {
    expect(removeitemStarts.length).toBe(13);
    expect(removeitemStarts.every((instruction) => instruction.operands[0]?.expression === "BS_SCRIPTING" || instruction.operands[0]?.expression === "BS_ATTACKER")).toBe(true);
    expect(scriptingInstance).toBeDefined();
    expect(attackerInstance).toBeDefined();
  });

  describe("(a) source-complete pass-through", () => {
    it("BS_SCRIPTING: clears the scripting battler's item to ITEM_NONE and emits set-battler-item", () => {
      const rc = context(
        [battler({ side: 0, item: ITEM_HELD_FOR_TEST }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
        { attacker: 1, target: 1, effectBattler: 1 },
        0,
      );
      const { result } = stepAtProgramCounter(rc, scriptingInstance!.programCounter);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[0]!.item).toBe(0);
      expect(result.state.rulesContext.usedHeldItems).toEqual([ITEM_HELD_FOR_TEST, 0, 0, 0]);
      expect(result.state.scheduler.pendingControllerBattlers).toEqual([0]);
      expect(result.state.events).toEqual([
        expect.objectContaining({ kind: "set-battler-item", battler: 0, item: 0 }),
      ]);
    });

    it("BS_ATTACKER: clears the attacking battler's item, distinct from the scripting battler", () => {
      const rc = context(
        [battler({ side: 0 }), battler({ side: 1, item: ITEM_HELD_FOR_TEST }), battler({ side: 0 }), battler({ side: 1 })],
        { attacker: 1, target: 0, effectBattler: 0 },
        0,
      );
      const { result } = stepAtProgramCounter(rc, attackerInstance!.programCounter);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.battlers[1]!.item).toBe(0);
      expect(result.state.rulesContext.usedHeldItems).toEqual([0, ITEM_HELD_FOR_TEST, 0, 0]);
      expect(result.state.scheduler.pendingControllerBattlers).toEqual([1]);
    });

    it("writes a non-White-Herb removal through to the active player's exact party slot", () => {
      const rc = context(
        [
          battler({ side: 0, item: ITEM_HELD_FOR_TEST, partyIndex: 2 }),
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        { attacker: 1, target: 1, effectBattler: 1 },
        0,
        {
          player: [
            { species: 1, item: 101 },
            { species: 2, item: 102 },
            { species: 3, item: ITEM_HELD_FOR_TEST },
            {},
            {},
            {},
          ],
        },
      );
      const { result } = stepAtProgramCounter(rc, scriptingInstance!.programCounter);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.party.player.map(({ item }) => item)).toEqual([
        101, 102, 0, 0, 0, 0,
      ]);
      expect(result.state.rulesContext.party.opponent.map(({ item }) => item)).toEqual([
        0, 0, 0, 0, 0, 0,
      ]);
    });

    it("writes removal through to the active opponent's exact party slot", () => {
      const rc = context(
        [
          battler({ side: 0 }),
          battler({ side: 1, item: ITEM_HELD_FOR_TEST, partyIndex: 4 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        { attacker: 1, target: 0, effectBattler: 0 },
        0,
        {
          player: [{ species: 1, item: 103 }, {}, {}, {}, {}, {}],
          opponent: [
            { species: 1, item: 111 },
            { species: 2, item: 112 },
            { species: 3, item: 113 },
            { species: 4, item: 114 },
            { species: 5, item: ITEM_HELD_FOR_TEST },
            {},
          ],
        },
      );
      const { result } = stepAtProgramCounter(rc, attackerInstance!.programCounter);
      expect(result.kind).toBe("advanced");
      if (result.kind !== "advanced") throw new Error("expected advance");
      expect(result.state.rulesContext.party.opponent.map(({ item }) => item)).toEqual([
        111, 112, 113, 114, 0, 0,
      ]);
      expect(result.state.rulesContext.party.player.map(({ item }) => item)).toEqual([
        103, 0, 0, 0, 0, 0,
      ]);
    });
  });

  describe("(b) unsupported-branch barrier -- selector resolves to no live battler role", () => {
    it("halts when BS_ATTACKER is reached with no attacker role assigned yet", () => {
      const rc = context(
        [battler({ side: 0 }), battler({ side: 1 }), battler({ side: 0 }), battler({ side: 1 })],
        { target: 0, effectBattler: 0 },
        0,
      );
      const { result } = stepAtProgramCounter(rc, attackerInstance!.programCounter);
      expect(result.kind).toBe("halted");
      if (result.kind !== "halted") throw new Error("expected halt");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });
  });
});
