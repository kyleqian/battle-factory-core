import { describe, expect, it } from "vitest";
import { createBattleScriptMachine, stepBattleScriptMachine, type BattleScriptOpcodeHandlers } from "../src/engine/battleScriptMachine.ts";
import { executeBattleScriptMoveEndControllerCase } from "../src/engine/battleScriptMoveEndControllers.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import { createBattleScriptRulesContext, type BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS1_FREEZE } from "../src/engine/battleScriptSourceConstants.ts";

// docs/parity-mac/defrost-party-status.md. Cmd_moveend MOVEEND_DEFROST (battle_script_commands.c:4257-4273): a frozen target hit by a damaging Fire move is thawed, and
// BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE) writes the cleared status to the PARTY Pokemon as well. The engine cleared the battler only. A switch-in
// rebuilds status1 from the party record (battleScriptSwitchinOpcode.ts), so the thawed Pokemon was frozen again when it switched out and came back.
// ROM seed 20276 (ai-v1 player): the opponent's Fire Blast thaws the player's Vibrava; the ROM's party status is 0 from then on, the engine's stayed 32.
const program = loadBattleScriptProgram();
const moveEndLabel = resolveBattleScriptLabel(program, "BattleScript_MoveEnd")!;
const moveEnd = program.instructions[moveEndLabel.programCounter + 1]!;
const ZERO = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);
const battler = (changes: object = {}) => Object.freeze({
  side: 0 as const, ability: 0, hp: 100, item: 0, moves: Object.freeze([7, 1, 0, 0] as const), pp: Object.freeze([15, 35, 0, 0] as const), statStages: ZERO,
  status1: 0, status2: 0, status3: 0, specialStatus: Object.freeze({ restoredBattlerSprite: 0 as const, physicalDmg: 0, specialDmg: 0 }), substituteHP: 0,
  rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0 as const, rechargeTimer: 0, flinchImmobility: 0 as const, disabledMove: 0, usedDisabledMove: 0 as const,
  tauntTimer: 0, usedTauntedMove: 0 as const, usedImprisonedMove: 0 as const, chargingTurn: 0 as const, ...changes,
});
const member = (hp: number, status1 = 0) => ({ species: 261, isEgg: false, hp, status1 });
const EMPTY = { species: 0, isEgg: false, hp: 0 };

function rules(moveId: number): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(),
      // the opponent's active Pokemon is its party slot 1, frozen, and took special damage from the move that is ending
      battler({ side: 1, partyIndex: 1, status1: BATTLE_SCRIPT_STATUS1_FREEZE, specialStatus: { restoredBattlerSprite: 0, physicalDmg: 0, specialDmg: 42 } }),
      battler(), battler({ side: 1 }),
    ],
    party: { player: [member(100), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], opponent: [member(80), member(100, BATTLE_SCRIPT_STATUS1_FREEZE), member(90), EMPTY, EMPTY, EMPTY] },
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 }, scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: moveId, currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0, hitMarker: 0,
    multiHitCounter: 0, moveendState: 1, battleTopology: { battlersCount: 2, battleTypeFlags: 0, battlerPositions: [0, 1, 0xff, 0xff] },
  } as never);
}
function step(moveId: number) {
  const initial = createBattleScriptMachine(program, "BattleScript_MoveEnd", rules(moveId), 0x1234_5678);
  const handlers = Object.freeze({ 73: executeBattleScriptMoveEndControllerCase }) as unknown as BattleScriptOpcodeHandlers<BattleScriptRulesContext>;
  return stepBattleScriptMachine(program, Object.freeze({ ...initial, programCounter: moveEnd.programCounter }), handlers);
}

describe("MOVEEND_DEFROST writes the thawed status to the party Pokemon", () => {
  it("a Fire move thaws the battler and its party record (the other party members are untouched)", () => {
    const result = step(7); // MOVE_FIRE_PUNCH
    expect(result.kind).toBe("advanced");
    const rc = result.state.rulesContext;
    expect(rc.battlers[1].status1).toBe(0);
    // Unfixed: 32 (still frozen in the party record).
    expect(rc.party.opponent.slice(0, 3).map((m) => m.status1)).toEqual([0, 0, 0]);
    expect(rc.party.player[0]!.status1).toBe(0);
    expect(result.state.events.map((e) => [e.kind, (e as { status1?: number }).status1])).toEqual([["set-battler-status-data", 0]]);
  });

  it("a move of another type thaws nothing", () => {
    const result = step(8); // MOVE_ICE_PUNCH
    const rc = result.state.rulesContext;
    expect(rc.battlers[1].status1).toBe(BATTLE_SCRIPT_STATUS1_FREEZE);
    expect(rc.party.opponent[1]!.status1).toBe(BATTLE_SCRIPT_STATUS1_FREEZE);
  });
});
