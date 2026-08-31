import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

/**
 * ISSUES #135 receipt test -- Pursuit's x2 switch-interception multiplier.
 *
 * Ground truth: `tools/probe/receipts/issue135-pursuit-switch-off.json`, built
 * from `tools/battle-lab/issue135-pursuit-switch-{intercept,control}-off.json`
 * by `tools/probe/probe-issue135-pursuit-switch-off.py`. Each arm was run twice
 * from a fresh Battle Scene OFF oracle and is byte-identical
 * (intercept b989aef8..., control b348acfd...).
 *
 * On the stock ROM `BattleScript_ActionSwitch` runs
 * `setbyte sDMG_MULTIPLIER, 2` (data/battle_scripts_1.s:3091) before the loop
 * this port enters at, and `BattleScript_PursuitDmgOnSwitchOut`'s `damagecalc`
 * consumes it (`Cmd_damagecalc`, src/battle_script_commands.c:1296). Pursuit is
 * TYPE_DARK, which is > TYPE_MYSTERY and therefore SPECIAL in Gen 3, so the
 * fixture's base damage is 85 spAttack vs 50 spDefense = 31.
 *
 * ROM numbers, per arm:
 *   INTERCEPT  dmgMultiplier 1 -> 2 at BattleScript_ActionSwitch+11 (frame 388);
 *              gBattleMoveDamage 62 after damagecalc (frame 456), 54 after
 *              adjustnormaldamage's variance draw (458); gPlayerParty[0].hp
 *              125 -> 71 at datahpupdate (586). Two Random() draws in the hit
 *              (critcalc + variance -- that script has no accuracycheck).
 *   CONTROL    dmgMultiplier never leaves 1; the same Pursuit lands as an
 *              ordinary attack for 31 after damagecalc (frame 109), 30 after
 *              the variance draw (111); gPlayerParty[0].hp 125 -> 95 (215).
 *              Three Random() draws in the hit (accuracycheck 80, critcalc 108,
 *              variance 111).
 *   62 == 2 x 31 exactly: the interception's only difference is the multiplier.
 *
 * The kernel's RNG stream is not the ROM's, so each arm pins the seed whose
 * 85-100% roll reproduces the ROM's roll for that arm: the intercept arm uses
 * the receipt card's own seed 305419897 (roll 88% -> 54), and the control arm
 * uses seed 6 (roll 97-99% -> 30). Both then land on the ROM's exact damage and
 * party HP.
 *
 * Mutation-checked: setting `dmgMultiplier` back to 1 in
 * `stageVoluntarySwitchRules` (factoryBattleScriptFullTurnDecision.ts) drops the
 * intercept arm to 27 damage / 98 HP and fails this file.
 */

const MOVE_PURSUIT = 228;
const DEFENSE_CURL = 111; // player slot 0: non-damaging, and PERSIAN moves first anyway.

/** ROM measurements, transcribed from the receipt. */
const ROM = {
  playerMaxHp: 125,
  // `turnDraws` = every Random() the ROM spent in turn 1, from the receipt's
  // randomEvents: intercept 3 (critcalc 455, variance 458, BattleTurnPassed's
  // gRandomTurnNumber 780); control 5 (accuracycheck 80, critcalc 108,
  // variance 111, moveend 220, gRandomTurnNumber 477).
  intercept: { damageAfterDamagecalc: 62, damage: 54, partyHp: 71, hitDraws: 2, turnDraws: 3 },
  control: { damageAfterDamagecalc: 31, damage: 30, partyHp: 95, hitDraws: 3, turnDraws: 5 },
} as const;

/** Seed per arm -- see the header: each reproduces its arm's ROM variance roll. */
const INTERCEPT_SEED = 305419897; // the receipt card's own seed
const CONTROL_SEED = 6;

/**
 * The receipt's fixture, transcribed from the stock ROM's derived stats:
 * SANDSHREW (GROUND, single ability SAND_VEIL) 125 HP / 105 Def / 50 SpDef vs
 * PERSIAN (base speed 115, single ability LIMBER) 90 Atk / 85 SpAtk / 135 Spe
 * with all four slots MOVE_PURSUIT; bench SLUGMA / WOOPER.
 */
function fixture(rngSeed: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    player: {
      species: 27, moveId: DEFENSE_CURL, moves: [DEFENSE_CURL, 10, 28, 91],
      abilityNum: 0, attack: 95, defense: 105, spAttack: 40, spDefense: 50,
      speed: 60, hp: ROM.playerMaxHp, maxHp: ROM.playerMaxHp,
    },
    trainer: {
      species: 53, moveId: MOVE_PURSUIT,
      moves: [MOVE_PURSUIT, MOVE_PURSUIT, MOVE_PURSUIT, MOVE_PURSUIT],
      abilityNum: 0, attack: 90, defense: 80, spAttack: 85, spDefense: 85,
      speed: 135, hp: 140, maxHp: 140,
    },
    playerBenchHp: [115, 130],
    playerBenchOverride: [
      {
        species: 218, abilityNum: 0, moves: [52, 157, 281, 34],
        maxHP: 115, attack: 60, defense: 60, speed: 40, spAttack: 90, spDefense: 60,
      },
      {
        species: 194, abilityNum: 0, moves: [281, 91, 352, 240],
        maxHP: 130, attack: 65, defense: 65, speed: 35, spAttack: 45, spDefense: 45,
      },
    ],
  };
}

function runArm(rngSeed: number, playerAction: "switch" | "move") {
  const initial = createFactoryFullTurnBattleState(fixture(rngSeed));
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: playerAction === "switch"
      ? { kind: "switch", partyIndex: 1 }
      : { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error(`expected trainer command, got ${afterPlayer.kind}`);
  }
  const result = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  if (result.kind !== "decision-required") {
    throw new Error(`expected next player command, got ${result.kind}`);
  }
  return { initial, result, rulesContext: result.state.rules.rulesContext };
}

describe("ISSUES #135 -- Pursuit's x2 switch-interception multiplier (ROM receipt)", () => {
  it("intercept arm: the doubled Pursuit deals the ROM's 54 and leaves the departed mon on the ROM's 71 HP", () => {
    const { result, rulesContext } = runArm(INTERCEPT_SEED, "switch");
    // datahpupdate synced the outgoing mon's party record on the way out.
    expect(rulesContext.party.player[0]!.hp).toBe(ROM.intercept.partyHp);
    expect(ROM.playerMaxHp - rulesContext.party.player[0]!.hp).toBe(ROM.intercept.damage);
    // The incoming mon actually took the field and is untouched.
    expect(rulesContext.battlers[0]).toMatchObject({ species: 218, partyIndex: 1 });
    expect(rulesContext.party.player[1]!.hp).toBe(115);
    // BattleScript_ActionSwitch's setbyte sDMG_MULTIPLIER, 2 is still live at
    // the end of the turn, exactly as on the ROM (which only resets it at
    // frame 787, inside the NEXT turn's HandleAction_UseMove).
    expect(rulesContext.dmgMultiplier).toBe(2);
    // Turn 1 spent the ROM's three draws: the Pursuit hit's two (critcalc +
    // variance -- BattleScript_PursuitDmgOnSwitchOut has no accuracycheck)
    // plus BattleTurnPassed's gRandomTurnNumber.
    expect(ROM.intercept.hitDraws + 1).toBe(ROM.intercept.turnDraws);
    expect(result.state.rng.calls).toBe(ROM.intercept.turnDraws);
  });

  it("control arm: the same Pursuit un-doubled deals the ROM's 30 and leaves 95 HP", () => {
    const { result, rulesContext } = runArm(CONTROL_SEED, "move");
    expect(rulesContext.party.player[0]!.hp).toBe(ROM.control.partyHp);
    expect(ROM.playerMaxHp - rulesContext.party.player[0]!.hp).toBe(ROM.control.damage);
    expect(rulesContext.battlers[0]).toMatchObject({ species: 27, partyIndex: 0 });
    // HandleAction_UseMove (battle_util.c:92) reset it for the move action.
    expect(rulesContext.dmgMultiplier).toBe(1);
    // Turn 1 spent the ROM's five draws: the hit's three (accuracycheck,
    // critcalc, variance) plus moveend plus gRandomTurnNumber.
    expect(result.state.rng.calls).toBe(ROM.control.turnDraws);
  });

  it("the two arms differ by exactly the x2: the intercept damage is twice the control's base", () => {
    // 62 == 2 x 31 after damagecalc on the ROM; both arms then take their own
    // 85-100% roll, which the seeds above reproduce.
    expect(ROM.intercept.damageAfterDamagecalc).toBe(2 * ROM.control.damageAfterDamagecalc);
    const intercept = runArm(INTERCEPT_SEED, "switch").rulesContext;
    const control = runArm(CONTROL_SEED, "move").rulesContext;
    const interceptDamage = ROM.playerMaxHp - intercept.party.player[0]!.hp;
    const controlDamage = ROM.playerMaxHp - control.party.player[0]!.hp;
    expect(interceptDamage).toBeGreaterThan(controlDamage);
    // Each arm's damage is its pre-variance value times an 85-100% roll.
    expect(interceptDamage).toBeGreaterThanOrEqual(Math.floor(ROM.intercept.damageAfterDamagecalc * 85 / 100));
    expect(interceptDamage).toBeLessThanOrEqual(ROM.intercept.damageAfterDamagecalc);
    expect(controlDamage).toBeGreaterThanOrEqual(Math.floor(ROM.control.damageAfterDamagecalc * 85 / 100));
    expect(controlDamage).toBeLessThanOrEqual(ROM.control.damageAfterDamagecalc);
  });
});
