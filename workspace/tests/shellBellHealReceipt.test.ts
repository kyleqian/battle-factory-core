import { describe, expect, it } from "vitest";
import healFixture from "../tools/battle-lab/issue129-shellbell-ko-heal-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/issue129-shellbell-ko-control-off.json" with { type: "json" };
import nonKoFixture from "../tools/battle-lab/issue129-shellbell-nonko-heal-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/shell-bell-ko-heal-off.json" with { type: "json" };
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";

// LIVE stock-ROM receipt for the one Shell Bell arm PROGRESS 1402 could not
// stage: the HEAL on a KO. 1402 pinned that gSpecialStatuses[target].shellBellDmg
// survives the faint into MOVEEND_KINGSROCK_SHELLBELL (state 12), but its
// attacker sat at full HP, so src/battle_util.c:3792
// (`gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP`)
// was false and the heal never fired. The two-turn fixtures here chip the
// holder below maxHP on turn 1, then KO on turn 2, and the ROM heals.
const program = loadBattleScriptProgram();
const SHELL_BELL = 219; // ITEM_SHELL_BELL, include/constants/items.h:249
const SHELL_BELL_DIVISOR = 8; // holdEffectParam, src/data/gen/item-hold-effects.json
const SPLASH = 150;
const EARTHQUAKE = 89;
const TACKLE = 33;
const SPECIES_DUGTRIO = 51;
const SPECIES_MAGNETON = 82;
const SPECIES_METAPOD = 11;
const MOVEEND_KINGSROCK_SHELLBELL = 12;
const MOVEEND_COUNT = 17;
// include/constants/battle_string_ids.h:301 -- "restored a little HP using its SHELL BELL!"
const STRINGID_PKMNSITEMRESTOREDHPALITTLE = 301;

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
    speed: changes.side === 1 ? 50 : 100,
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

function acknowledgeAll(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const id of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, id);
  }
  return next;
}

/**
 * Runs `BattleScript_MoveEnd` (`moveendall`; end) from MOVEEND_KINGSROCK_SHELLBELL
 * to termination, so the Shell Bell branch's script transfer to
 * BattleScript_ItemHealHP_Ret (data/battle_scripts_1.s:4377-4384) actually runs
 * its printstring/healthbarupdate/datahpupdate -- that is what applies the heal.
 */
function runMoveendFromStateTwelve(rulesContext: BattleScriptRulesContext, rngSeed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_MoveEnd",
    rulesContext,
    rngSeed,
    Object.freeze({
      isControllerIdle: () => true,
      prepareMessage: (_context, operand) =>
        operand.expression.startsWith("STRINGID_")
          ? Object.freeze({
              kind: "message" as const,
              messageId: operand.expression,
              substitutions: Object.freeze([]),
            })
          : null,
      prepareSelectionMessage: () => null,
      prepareSelectionMessageFromTable: () => null,
      resolveAttackerBattler: () => null,
      resolveBattlerAtPosition: () => null,
      resolveHalfwordOperand: (_context, operand) =>
        operand.expression === "B_WAIT_TIME_LONG"
        || operand.expression === "B_WAIT_TIME_SHORT"
          ? 1
          : null,
      resolveByteOperand: () => null,
    }),
  );
  let result = stepBattleScriptMachine(program, execution.state, execution.handlers);
  let steps = 1;
  while (result.kind !== "halted" && steps < 500) {
    result = stepBattleScriptMachine(program, acknowledgeAll(result.state), execution.handlers);
    steps += 1;
  }
  if (result.kind !== "halted") throw new Error(`moveend did not terminate after ${steps} steps`);
  if (result.state.haltReason?.kind !== "terminal") {
    throw new Error(`moveend halted non-terminally: ${JSON.stringify(result.state.haltReason)}`);
  }
  return result.state;
}

const koHeal = receipt.measurements.koHeal;
const koControl = receipt.measurements.koControl;
const nonKo = receipt.measurements.nonKoHeal;

describe("Shell Bell's HEAL on a KO -- live stock-ROM receipt (Battle Scene OFF)", () => {
  it("keeps the three staged arms exactly as the receipt names them", () => {
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.freshRunCountPerArm).toBe(2);
    expect(receipt.byteIdenticalAcrossFreshRuns).toBe(true);
    expect(receipt.holdEffectParam).toBe(SHELL_BELL_DIVISOR);
    expect(receipt.stringIdRestoredHpALittle).toBe(STRINGID_PKMNSITEMRESTOREDHPALITTLE);

    for (const fixture of [healFixture, controlFixture, nonKoFixture]) {
      expect(fixture.profile).toBe("battle-scene-off");
      expect(fixture.overrides.parties.player[0]!.species).toBe(SPECIES_DUGTRIO);
      // turn 1 takes slot 0 (SPLASH -- no damage, no accuracy roll, no stat change),
      // turn 2 presses RIGHT onto slot 1 (EARTHQUAKE).
      expect(fixture.overrides.parties.player[0]!.moves)
        .toEqual([SPLASH, EARTHQUAKE, EARTHQUAKE, EARTHQUAKE]);
      // one legal AI choice, and it damages the holder on turn 1
      expect(fixture.overrides.parties.opponent[0]!.moves).toEqual([TACKLE, TACKLE, TACKLE, TACKLE]);
    }
    expect(healFixture.overrides.parties.player[0]!.item).toBe(SHELL_BELL);
    expect(controlFixture.overrides.parties.player[0]!.item).toBe(0);
    expect(nonKoFixture.overrides.parties.player[0]!.item).toBe(SHELL_BELL);
    expect(healFixture.overrides.parties.opponent[0]!.species).toBe(SPECIES_MAGNETON);
    expect(nonKoFixture.overrides.parties.opponent[0]!.species).toBe(SPECIES_METAPOD);
    // heal and control must differ ONLY in the holder's item so no draw shifts
    expect({
      ...controlFixture,
      overrides: {
        parties: {
          ...controlFixture.overrides.parties,
          player: [
            { ...controlFixture.overrides.parties.player[0], item: SHELL_BELL },
            ...controlFixture.overrides.parties.player.slice(1),
          ],
        },
      },
    }).toEqual(healFixture);
  });

  it("the ROM's KO arm opens the gate 1402 could not: attacker below maxHP when state 12 runs", () => {
    // turn 1 chip: the AI's TACKLE takes the holder off maxHP
    expect(koHeal.holderHpBeforeHit).toBe(koHeal.holderMaxHp);
    expect(koHeal.turn1ChipDamage).toBeGreaterThan(0);
    expect(koHeal.holderHpAtStateEleven).toBe(koHeal.holderMaxHp - koHeal.turn1ChipDamage);
    expect(koHeal.holderHpAtStateEleven).toBeLessThan(koHeal.holderMaxHp); // battle_util.c:3792
    expect(koHeal.holderHpAtStateEleven).toBeGreaterThan(0); // battle_util.c:3793
    // turn 2 is a KO, and the damage record survives the faint into state 12
    expect(koHeal.foeHpAtStateEleven).toBe(0);
    expect(koHeal.recordedShellBellDmg).toBe(125);
    expect(koHeal.rawBattleMoveDamage).toBe(240); // record clamps to HP actually taken
    expect(koHeal.stateTwelveFrame).toBe(koHeal.stateElevenFrame + 1);
  });

  it("the ROM heals damage/8 on the KO, floored, and clears the record", () => {
    // battle_util.c:3798-3800 -- gBattleMoveDamage = (shellBellDmg / 8) * -1, min 1
    const expected = Math.max(1, Math.floor(koHeal.recordedShellBellDmg / SHELL_BELL_DIVISOR));
    expect(expected).toBe(15);
    expect(koHeal.expectedHeal).toBe(expected);
    expect(koHeal.battleMoveDamageAfterStateTwelve).toBe(-expected);
    expect(koHeal.healDelta).toBe(expected);
    expect(koHeal.holderHpAfterHeal).toBe(koHeal.holderHpAtStateEleven + expected);
    expect(koHeal.holderHpAfterHeal).toBeLessThanOrEqual(koHeal.holderMaxHp);
    // battle_util.c:3801 -- the record is cleared behind the heal, in the same frame
    expect(koHeal.shellBellDmgAfterStateTwelve).toBe(0);
    // the script transfer halts moveend at 13 while BattleScript_ItemHealHP_Ret runs
    expect(koHeal.moveendStateAfterStateTwelve).toBe(13);
    expect(koHeal.stringIdRestoredHpALittleFrames).toHaveLength(1);
    expect(koHeal.healFrame).toBeGreaterThan(koHeal.stringIdRestoredHpALittleFrames[0]!);
    // Shell Bell spends NO Random(): King's Rock is not held, so :3776 never runs
    expect(koHeal.randomCallsBetweenStateElevenAndStateTwelve).toBe(0);
  });

  it("the ROM's item-0 control does not heal and leaves the record standing", () => {
    expect(koControl.holderHpAtStateEleven).toBe(koHeal.holderHpAtStateEleven);
    expect(koControl.recordedShellBellDmg).toBe(koHeal.recordedShellBellDmg);
    expect(koControl.stateTwelveFrame).toBe(koHeal.stateTwelveFrame);
    expect(koControl.healDelta).toBe(0);
    expect(koControl.holderHpAfterHeal).toBe(koControl.holderHpAtStateEleven);
    expect(koControl.healFrame).toBeNull();
    expect(koControl.stringIdRestoredHpALittleFrames).toEqual([]);
    // states 12..16 are all no-ops without the item -- 11 -> 17 inside one frame
    expect(koControl.moveendStateAfterStateTwelve).toBe(MOVEEND_COUNT);
    expect(koControl.shellBellDmgAfterStateTwelve).toBe(koControl.recordedShellBellDmg);
    expect(koControl.randomCallsBetweenStateElevenAndStateTwelve).toBe(0);
    // the item shifts no draw: the heal arm's ledger is a prefix of the control's
    const heal = receipt.arms.koHeal.rngLedger.map((e) => [e.frame, e.randomCalls]);
    const control = receipt.arms.koControl.rngLedger.map((e) => [e.frame, e.randomCalls]);
    expect(control.slice(0, heal.length)).toEqual(heal);
  });

  it("the ROM's non-KO arm heals by the same formula, so the KO changes nothing", () => {
    expect(nonKo.foeHpAtStateEleven).toBeGreaterThan(0);
    expect(nonKo.healDelta).toBe(Math.floor(nonKo.recordedShellBellDmg / SHELL_BELL_DIVISOR));
    expect(nonKo.healDelta).toBe(5);
    expect(nonKo.holderHpAfterHeal).toBe(nonKo.holderHpAtStateEleven + nonKo.healDelta);
    expect(nonKo.shellBellDmgAfterStateTwelve).toBe(0);
    expect(nonKo.randomCallsBetweenStateElevenAndStateTwelve).toBe(0);
  });

  it("drives the kernel through arm (a): same hp-before, damage, hp-after and draw count as the ROM", () => {
    const state = runMoveendFromStateTwelve(moveendContext(
      { item: SHELL_BELL, hp: koHeal.holderHpAtStateEleven, maxHP: koHeal.holderMaxHp },
      { hp: 0, specialStatus: { physicalDmg: koHeal.recordedShellBellDmg, shellBellDmg: koHeal.recordedShellBellDmg } },
      { battleMoveDamage: koHeal.rawBattleMoveDamage },
    ));
    // draw count
    expect(state.rng.calls).toBe(koHeal.randomCallsBetweenStateElevenAndStateTwelve);
    expect(state.rng.calls).toBe(0);
    // damage -> heal amount
    expect(state.rulesContext.battlers[1]!.specialStatus.shellBellDmg)
      .toBe(koHeal.shellBellDmgAfterStateTwelve);
    // hp before / hp after, applied by BattleScript_ItemHealHP_Ret's datahpupdate
    expect(state.rulesContext.battlers[0]!.maxHP).toBe(koHeal.holderMaxHp);
    expect(state.rulesContext.battlers[0]!.hp).toBe(koHeal.holderHpAfterHeal);
    expect(state.rulesContext.battlers[0]!.hp - koHeal.holderHpAtStateEleven)
      .toBe(koHeal.healDelta);
    expect(state.rulesContext.moveendState).toBe(MOVEEND_COUNT);
  });

  it("drives the kernel through arm (b): item 0 heals nothing and leaves the record", () => {
    const state = runMoveendFromStateTwelve(moveendContext(
      { item: 0, hp: koControl.holderHpAtStateEleven, maxHP: koControl.holderMaxHp },
      { hp: 0, specialStatus: { physicalDmg: koControl.recordedShellBellDmg, shellBellDmg: koControl.recordedShellBellDmg } },
      { battleMoveDamage: koControl.rawBattleMoveDamage },
    ));
    expect(state.rng.calls).toBe(koControl.randomCallsBetweenStateElevenAndStateTwelve);
    expect(state.rulesContext.battlers[0]!.hp).toBe(koControl.holderHpAfterHeal);
    expect(state.rulesContext.battlers[0]!.hp - koControl.holderHpAtStateEleven).toBe(0);
    expect(state.rulesContext.battlers[1]!.specialStatus.shellBellDmg)
      .toBe(koControl.shellBellDmgAfterStateTwelve);
    expect(state.rulesContext.moveendState).toBe(MOVEEND_COUNT);
  });

  it("drives the kernel through arm (c): the surviving-target heal matches the ROM too", () => {
    const state = runMoveendFromStateTwelve(moveendContext(
      { item: SHELL_BELL, hp: nonKo.holderHpAtStateEleven, maxHP: nonKo.holderMaxHp },
      {
        hp: nonKo.foeHpAtStateEleven,
        maxHP: 125,
        specialStatus: { physicalDmg: nonKo.recordedShellBellDmg, shellBellDmg: nonKo.recordedShellBellDmg },
      },
      { battleMoveDamage: nonKo.rawBattleMoveDamage },
    ));
    expect(state.rng.calls).toBe(0);
    expect(state.rulesContext.battlers[0]!.hp).toBe(nonKo.holderHpAfterHeal);
    expect(state.rulesContext.battlers[1]!.specialStatus.shellBellDmg).toBe(0);
  });
});
