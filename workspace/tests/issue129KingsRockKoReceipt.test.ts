import { describe, expect, it } from "vitest";
import ohkoFixture from "../tools/battle-lab/issue129-kingsrock-ohko-off.json" with { type: "json" };
import noItemFixture from "../tools/battle-lab/issue129-noitem-ohko-off.json" with { type: "json" };
import eqKoFixture from "../tools/battle-lab/issue129-kingsrock-eq-ko-off.json" with { type: "json" };
import eqSurviveFixture from "../tools/battle-lab/issue129-kingsrock-eq-survive-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/issue129-kingsrock-ko-off.json" with { type: "json" };
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

// ISSUES #129 closed: the stock ROM DOES spend a King's Rock Random() at
// MOVEEND_KINGSROCK_SHELLBELL on a KO. The premise came from a truncated trace
// (gate6-ohko-hit-off.json stalls at frame 443 on the faint message's 0xFB
// prompt, before Cmd_moveend ever ran). These arms pin the ROM's measurement
// and drive the same shapes -- KO and non-KO -- through the kernel.
const program = loadBattleScriptProgram();
const KINGS_ROCK = 187;
const SHELL_BELL = 219; // ITEM_SHELL_BELL, include/constants/items.h:249
const EARTHQUAKE = 89;
const FISSURE = 90;
const SPECIES_DUGTRIO = 51;
const SPECIES_METAPOD = 11;
const SPECIES_MAGNETON = 82;
const MOVEEND_KINGSROCK_SHELLBELL = 12;
const MOVEEND_COUNT = 17;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: Object.freeze([EARTHQUAKE, 0, 0, 0] as const),
    pp: Object.freeze([10, 0, 0, 0] as const),
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    confusionSelfDmg: undefined,
    item: changes.item ?? 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6] as const,
    specialStatus: changes.specialStatus,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
    species: 0,
    personality: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    level: 50,
    friendship: 0,
    partyIndex: 0,
  });
}

function moveendContext(
  attackerChanges: Partial<BattleScriptRulesBattler>,
  targetChanges: Partial<BattleScriptRulesBattler>,
  contextChanges: Partial<BattleScriptRulesContextInput>,
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, ...attackerChanges }),
      battler({ side: 1, ...targetChanges }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
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
    moveendState: MOVEEND_KINGSROCK_SHELLBELL,
    ...contextChanges,
  });
}

/** Steps the single B_SCR_OP_MOVEEND instruction starting at state 12. */
function stepMoveend(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_MoveEnd",
    rulesContext,
    rngSeed,
    Object.freeze({
      isControllerIdle: () => true,
      prepareMessage: () => null,
      prepareSelectionMessage: () => null,
      prepareSelectionMessageFromTable: () => null,
      resolveAttackerBattler: () => null,
      resolveBattlerAtPosition: () => null,
      resolveHalfwordOperand: () => null,
      resolveByteOperand: () => null,
    }),
  );
  const moveendPc = execution.state.programCounter + 1;
  const patched = Object.freeze({ ...execution.state, programCounter: moveendPc });
  const result = stepBattleScriptMachine(program, patched, execution.handlers);
  if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
  return result;
}

describe("ISSUES #129 -- King's Rock draws at moveend on a KO (Battle Scene OFF receipt)", () => {
  it("keeps the four staged arms exactly as the receipt names them", () => {
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.freshRunCountPerArm).toBe(2);
    expect(receipt.byteIdenticalAcrossFreshRuns).toBe(true);
    expect(ohkoFixture.overrides.parties.player[0]!.species).toBe(SPECIES_DUGTRIO);
    expect(ohkoFixture.overrides.parties.player[0]!.item).toBe(KINGS_ROCK);
    expect(ohkoFixture.overrides.parties.player[0]!.moves).toEqual([FISSURE, FISSURE, FISSURE, FISSURE]);
    expect(noItemFixture.overrides.parties.player[0]!.item).toBe(0);
    expect(eqKoFixture.overrides.parties.player[0]!.item).toBe(KINGS_ROCK);
    expect(eqKoFixture.overrides.parties.player[0]!.moves)
      .toEqual([EARTHQUAKE, EARTHQUAKE, EARTHQUAKE, EARTHQUAKE]);
    expect(eqKoFixture.overrides.parties.opponent[0]!.species).toBe(SPECIES_MAGNETON);
    expect(eqSurviveFixture.overrides.parties.opponent[0]!.species).toBe(SPECIES_METAPOD);
  });

  it("pins the ROM's draw frames: the OHKO KO spends a third draw at moveend, the no-item control does not", () => {
    const ohko = receipt.arms.ohkoKingsRock.rngLedger;
    expect(ohko.slice(0, 3).map((entry) => entry.frame)).toEqual([67, 359, 642]);
    // States 12..16 all run inside frame 642; only MOVEEND_KINGSROCK_SHELLBELL
    // calls Random() among them, so the frame-642 draw is the item's.
    expect(ohko[2]!.moveendState).toBe(MOVEEND_COUNT);
    expect(ohko[2]!.battleMoveDamage).toBe(125);
    const control = receipt.arms.ohkoNoItemControl.rngLedger;
    expect(control.slice(0, 2).map((entry) => entry.frame)).toEqual([67, 359]);
    expect(control[2]!.frame).toBeGreaterThan(700); // next draw is the send-out, not moveend
  });

  it("pins the ROM's scope: a NON-OHKO KO and a plain non-KO hit both draw once at moveend", () => {
    const ko = receipt.arms.earthquakeKoKingsRock.rngLedger;
    expect(ko.slice(0, 4).map((entry) => entry.frame)).toEqual([72, 73, 76, 642]);
    const survives = receipt.arms.earthquakeSurvivesKingsRock.rngLedger;
    expect(survives.slice(0, 4).map((entry) => entry.frame)).toEqual([72, 73, 76, 299]);
    expect(receipt.scopeVerdict.kingsRock).toContain("GENERIC");
  });

  it("pins the ROM's guard state at MOVEEND_ITEM_EFFECTS_ALL, one state before the draw", () => {
    const koState = receipt.arms.earthquakeKoKingsRock.atMoveendState11;
    expect(koState.targetHp).toBe(0);
    expect(koState.targetPhysicalDmg).toBe(125);
    expect(koState.attackerItem).toBe(KINGS_ROCK);
    // Shell Bell's damage record survives the faint into state 12, so a KO does
    // not suppress the HOLD_EFFECT_SHELL_BELL branch either.
    expect(koState.targetShellBellDmg).toBe(125);
    const ohkoState = receipt.arms.ohkoKingsRock.atMoveendState11;
    expect(ohkoState.targetHp).toBe(0);
    expect(ohkoState.battleMoveDamage).toBe(125);
    expect(ohkoState.targetShellBellDmg).toBe(125);
    // Cmd_resultmessage cleared gMoveResultFlags before moveend, so the
    // `!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)` gate is TRUE, not false.
    expect(ohkoState.moveResultFlags).toBe(0);
    expect(receipt.scopeVerdict.shellBell).toContain("NOT suppressed by a KO");
  });

  it("drives the kernel: a King's Rock holder draws once whether the target fainted or survived", () => {
    const fainted = stepMoveend(moveendContext(
      { item: KINGS_ROCK },
      { hp: 0, specialStatus: { physicalDmg: 125, shellBellDmg: 125 } },
      { battleMoveDamage: 125 },
    ));
    expect(fainted.state.rng.calls).toBe(1);
    expect(fainted.state.rng.ledger[0]!.reason).toContain("King's Rock");
    expect(fainted.state.rulesContext.moveendState).toBe(MOVEEND_COUNT);

    const survived = stepMoveend(moveendContext(
      { item: KINGS_ROCK },
      { hp: 76, maxHP: 125, specialStatus: { physicalDmg: 49, shellBellDmg: 49 } },
      { battleMoveDamage: 49 },
    ));
    expect(survived.state.rng.calls).toBe(1);
    expect(survived.state.rng.ledger[0]!.reason).toContain("King's Rock");
  });

  it("drives the kernel: a Shell Bell holder spends no draw and still heals off a KO", () => {
    const koHeal = stepMoveend(moveendContext(
      { item: SHELL_BELL, hp: 60, maxHP: 100 },
      { hp: 0, specialStatus: { physicalDmg: 125, shellBellDmg: 125 } },
      { battleMoveDamage: 125 },
    ));
    expect(koHeal.state.rng.calls).toBe(0);
    // battle_util.c:3798 -- gBattleMoveDamage = -(shellBellDmg / 8), consumed by
    // BattleScript_ItemHealHP_Ret, and the record is cleared behind it (:3801).
    expect(koHeal.state.rulesContext.battleMoveDamage)
      .toBe(-Math.trunc(125 / 8));
    expect(koHeal.state.rulesContext.battlers[1]!.specialStatus.shellBellDmg).toBe(0);

    const fullHp = stepMoveend(moveendContext(
      { item: SHELL_BELL, hp: 100, maxHP: 100 },
      { hp: 0, specialStatus: { physicalDmg: 125, shellBellDmg: 125 } },
      { battleMoveDamage: 125 },
    ));
    expect(fullHp.state.rng.calls).toBe(0);
    expect(fullHp.state.rulesContext.battlers[1]!.specialStatus.shellBellDmg).toBe(125);
  });
});
