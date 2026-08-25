import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import { resolveSingleBattlePosition } from "../src/engine/battleScriptBattlerPositions.ts";
import { advanceBattleScriptAttackCancelerBide } from "../src/engine/battleScriptActionAdmission.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_GRUDGE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE,
  BATTLE_SCRIPT_MOVE_BIDE,
} from "../src/engine/battleScriptSourceConstants.ts";

/**
 * ISSUES #126 -- `DoBattlerEndTurnEffects` raises `gHitMarker |=
 * (HITMARKER_GRUDGE | HITMARKER_IGNORE_BIDE)` at every entry
 * (`battle_util.c:1468`) and clears the pair once the loop finishes
 * (`:1781`). `Cmd_datahpupdate` consumes IGNORE_BIDE instead of running its
 * `gBideDmg[gActiveBattler] += gBattleMoveDamage` /
 * `gBideTarget[gActiveBattler] = ...` block
 * (`battle_script_commands.c:1905-1917`), so **no end-turn damage is ever
 * stored by Bide**.
 *
 * The port raised neither flag, so a storing Bide user that took only
 * end-turn damage accumulated `gBideDmg` from it and wrote `gBideTarget`
 * from the then-stale `gBattlerTarget`. In the varied `winning-swap` soak
 * seed 69 (`--vary-rng --start-carry 0`) that stale value was the storing
 * battler itself, and the release threw
 * `gBideTarget[0] must be the opposing active singles slot 1, got 0`.
 *
 * Ground truth (Battle Scene OFF `mechanicLab`, `overrides.parties`:
 * Shelgon holding four Bide slots vs Lapras holding four Poison Powder
 * slots, `tools/probe/stage-bide-off.py`): across three full store/release
 * cycles with 26 poison damage at the end of every turn, `gBideDmg[0]`
 * stays 0, `gBideTarget[0]` is never written, the release script is
 * `BattleScript_BideNoEnergyToAttack` every time, and the opponent's HP
 * never leaves 237.
 */

const program = loadBattleScriptProgram();

const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_FACTORY_TRAINER = BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY;
const B_WAIT_TIME_LONG = 64;

/** include/constants/battle.h:132-140. */
const STATUS1_POISON = 1 << 3;
const STATUS2_BIDE_TURN_1 = 1 << 8;
const STATUS2_BIDE_TURN_2 = 2 << 8;
const STATUS2_MULTIPLETURNS = 1 << 12;
const STATUS2_WRAPPED_TURN_2 = 2 << 13;

const END_TURN_HIT_MARKERS =
  (BATTLE_SCRIPT_HITMARKER_GRUDGE | BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE) >>> 0;

/** The oracle probe's own Shelgon: 211 max HP, so poison is floor(211/8) = 26. */
const SHELGON_MAX_HP = 211;
const SHELGON_POISON_DMG = 26;

const PC = 0x0800_1234;
const RNG = 0xdead_beef;

function battler(changes: Partial<BattleScriptRulesBattler> & { maxHP?: number } = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
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
    chargeTimer: changes.chargeTimer ?? 0,
    chargeTimerStartValue: changes.chargeTimerStartValue ?? 0,
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
    partyIndex: changes.partyIndex ?? 0,
    wrappedMove: changes.wrappedMove,
    wrappedBy: changes.wrappedBy,
    encoreTimer: changes.encoreTimer ?? 0,
    encoredMove: changes.encoredMove ?? 0,
    encoredMovePos: changes.encoredMovePos ?? 0,
    encoreTimerStartValue: changes.encoreTimerStartValue ?? 0,
    perishSongTimer: changes.perishSongTimer ?? 0,
    perishSongTimerStartValue: changes.perishSongTimerStartValue ?? 0,
  }) as unknown as BattleScriptRulesBattler;
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
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, partyIndex: 2 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
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
    party: { player: sixSlots(SHELGON_MAX_HP), opponent: sixSlots(0, 0, 237) },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY_TRAINER,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    ...contextChanges,
  });
}

function externalPorts(attacker: 0 | 1): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (ctx: Readonly<{ state: { scheduler: { pendingControllerBattlers: readonly unknown[] } } }>) =>
      ctx.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => attacker,
    resolveBattlerAtPosition: resolveSingleBattlePosition,
    resolveHalfwordOperand: (_ctx: unknown, operand: Readonly<{ expression: string }>) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  });
}

function scratchState(rulesContext: BattleScriptRulesContext, attacker: 0 | 1) {
  return createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    919694434,
    externalPorts(attacker),
  ).state;
}

/** The storing Bide user (battler 0), plus a healthy opponent that never acts. */
function storingBideContext(
  status2: number,
  extra: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return context({
    battlers: [
      battler({
        side: 0,
        hp: SHELGON_MAX_HP,
        maxHP: SHELGON_MAX_HP,
        status2: STATUS2_MULTIPLETURNS | status2,
        ...extra,
      }),
      battler({ side: 1, hp: 237, maxHP: 237, partyIndex: 2 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    ...contextChanges,
  });
}

describe("ISSUES #126: end-turn damage is invisible to Bide (HITMARKER_IGNORE_BIDE)", () => {
  it("stores nothing from two turns of end-turn poison, then releases through BideNoEnergyToAttack", () => {
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));

    // Turn N (Cmd_setbide has just zeroed gBideDmg and set BIDE_TURN(2)).
    const first = runBattleEndTurnOrchestration(
      program,
      handlers,
      scratchState(storingBideContext(STATUS2_BIDE_TURN_2, { status1: STATUS1_POISON }), 0),
    );
    if (first.kind !== "next-turn") throw new Error(`expected next-turn, got ${first.kind}`);
    expect(first.state.rulesContext.battlers[0].hp).toBe(SHELGON_MAX_HP - SHELGON_POISON_DMG);
    expect(first.state.rulesContext.bideDmg[0]).toBe(0);
    expect(first.state.rulesContext.bideTarget[0]).toBe(0);
    // battle_util.c:1781/1887 -- the pair does not leak past the end-turn pass.
    expect(first.state.rulesContext.hitMarker & END_TURN_HIT_MARKERS).toBe(0);

    // Turn N+1: CANCELER_BIDE already decremented 2 -> 1 and printed
    // BattleScript_BideStoringEnergy, so the second end-turn pass sees TURN(1).
    const storing = runBattleEndTurnOrchestration(
      program,
      handlers,
      scratchState(
        storingBideContext(STATUS2_BIDE_TURN_1, {
          status1: STATUS1_POISON,
          hp: first.state.rulesContext.battlers[0].hp,
        }),
        0,
      ),
    );
    if (storing.kind !== "next-turn") throw new Error(`expected next-turn, got ${storing.kind}`);
    expect(storing.state.rulesContext.battlers[0].hp)
      .toBe(SHELGON_MAX_HP - 2 * SHELGON_POISON_DMG); // 211 -> 185 -> 159, the probe's own ladder
    expect(storing.state.rulesContext.bideDmg[0]).toBe(0);
    expect(storing.state.rulesContext.bideTarget[0]).toBe(0);

    // Turn N+2: CANCELER_BIDE decrements 1 -> 0 with nothing stored.
    const release = advanceBattleScriptAttackCancelerBide(
      Object.freeze({
        ...storing.state.rulesContext,
        atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE,
      }),
      PC,
      RNG,
    );
    if (release.kind !== "advance") throw new Error(`expected advance, got ${release.kind}`);
    expect(release.reason).toBe("released-with-no-energy");
    expect(release.receipt.script).toMatchObject({
      kind: "handoff",
      targetLabel: "BattleScript_BideNoEnergyToAttack",
    });
    // The opponent is untouched -- the probe's Lapras never left 237 HP.
    expect(release.rulesContext.battlers[1].hp).toBe(237);
    expect(release.rulesContext.scriptingBideDmg).toBe(0);
  });

  it("stores nothing from seed 69's own damage kind either (end-turn Wrap, a BS_ATTACKER update)", () => {
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts(0));
    const result = runBattleEndTurnOrchestration(
      program,
      handlers,
      scratchState(
        storingBideContext(STATUS2_BIDE_TURN_2 | STATUS2_WRAPPED_TURN_2, {
          wrappedMove: 35,
          wrappedBy: 1,
        }),
        0,
      ),
    );
    if (result.kind !== "next-turn") throw new Error(`expected next-turn, got ${result.kind}`);
    // ENDTURN_WRAP decrements TURN(2) -> TURN(1) first, then deals
    // floor(211/16) = 13 -- exactly seed 69's own 0x3200 shape.
    expect(result.state.rulesContext.battlers[0].hp).toBe(SHELGON_MAX_HP - 13);
    // ...and none of it reaches Bide's accumulator or its saved target.
    expect(result.state.rulesContext.bideDmg[0]).toBe(0);
    expect(result.state.rulesContext.bideTarget[0]).toBe(0);
    expect(result.state.rulesContext.hitMarker & END_TURN_HIT_MARKERS).toBe(0);
  });

  it("regression guard: an opponent-hit release still targets the opponent with 2x the stored damage", () => {
    const stored = 61;
    const release = advanceBattleScriptAttackCancelerBide(
      storingBideContext(STATUS2_BIDE_TURN_1, {}, {
        atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE,
        selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: null },
        bideDmg: [stored, 0, 0, 0],
        bideTarget: [1, 0, 0, 0],
      }),
      PC,
      RNG,
    );
    if (release.kind !== "advance") throw new Error(`expected advance, got ${release.kind}`);
    expect(release.reason).toBe("released-attack");
    expect(release.receipt.script).toMatchObject({
      kind: "handoff",
      targetLabel: "BattleScript_BideAttack",
    });
    expect(release.rulesContext.selectorRoles.target).toBe(1);
    expect(release.rulesContext.currentMove).toBe(BATTLE_SCRIPT_MOVE_BIDE);
    expect(release.rulesContext.scriptingBideDmg).toBe(2 * stored);
  });

  it("takes gBideTarget verbatim -- a self-target release resolves instead of throwing", () => {
    // battle_util.c:2236 imposes no shape on the saved battler; only an ABSENT
    // one is re-targeted (through GetMoveTarget, which stays barriered here).
    const release = advanceBattleScriptAttackCancelerBide(
      storingBideContext(STATUS2_BIDE_TURN_1, {}, {
        atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE,
        selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
        bideDmg: [19, 0, 0, 0],
        bideTarget: [0, 0, 0, 0],
      }),
      PC,
      RNG,
    );
    if (release.kind !== "advance") throw new Error(`expected advance, got ${release.kind}`);
    expect(release.reason).toBe("released-attack");
    expect(release.rulesContext.selectorRoles.target).toBe(0);
    expect(release.rulesContext.scriptingBideDmg).toBe(38);
  });
});
