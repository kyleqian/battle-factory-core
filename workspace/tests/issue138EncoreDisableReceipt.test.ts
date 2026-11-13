import { describe, expect, it } from "vitest";
import receipt from "../tools/probe/receipts/issue138-encore-disable-off.json" with { type: "json" };
import struggleFixture from "../tools/battle-lab/issue138-encore-disable-struggle-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/issue138-encore-disable-control-off.json" with { type: "json" };
import {
  battlerUsesForcedStruggle,
  createFactoryFullTurnBattleState,
  createFactoryFullTurnBattleStateFromRulesContext,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";

// LIVE stock-ROM receipt for ISSUES #138. `battle_main.c:4183-4197` runs
// `AreAllMovesUnusable()` BEFORE `else if (gDisableStructs[b].encoredMove != 0)`
// auto-confirms the encored move, and `CheckMoveLimitations`' own Encore bit
// (`battle_util.c:1116-1117`) masks every slot that is not the encored move --
// so an Encored battler whose encored move is itself unusable masks all four
// slots, takes the `noValidMoves` branch, and Struggles
// (`battle_util.c:99-106`). The port used to consult its Encore lock first and
// would have executed the locked (disabled) move instead.
//
// The ROM arms live in tools/probe/receipts/issue138-encore-disable-off.json:
// player DEWGONG [BLIZZARD, DOUBLE_EDGE, ENCORE, DISABLE] (Speed IV/EV 0),
// opponent JOLTEON with TACKLE in all four slots.
//   struggle arm turn 3: noValidMoves := 1 at BattleScript_NoMovesLeft+3,
//     gCurrentMove := 165 MOVE_STRUGGLE, HITMARKER_NO_PPDEDUCT set, opponent
//     PP [34,34,35,35] unchanged, DEWGONG 139 -> 102, JOLTEON 140 -> 131.
//   control arm turn 3: ordinary TACKLE, PP slot 0 34 -> 33, no recoil.
const TACKLE = 33;
const BLIZZARD = 59;
const DOUBLE_EDGE = 38;
const ENCORE = 227;
const DISABLE = 50;
const MOVE_STRUGGLE = 165;
const SPECIES_DEWGONG = 87;
const SPECIES_JOLTEON = 135;

type TurnThreeArm = {
  readonly playerHp: number;
  readonly trainerHp: number;
  readonly trainerPp: readonly [number, number, number, number];
  readonly disabledMove: number;
  readonly disableTimer: number;
  readonly encoredMove: number;
  readonly encoreTimer: number;
};

// The ROM's own turn-3 entry state, read back out of the committed receipt so
// this test cannot drift from the oracle run that produced it.
const STRUGGLE_ARM: TurnThreeArm = {
  playerHp: 139,
  trainerHp: 140,
  trainerPp: [34, 34, 35, 35],
  disabledMove: TACKLE,
  disableTimer: 3,
  encoredMove: TACKLE,
  encoreTimer: 1,
};
const CONTROL_ARM: TurnThreeArm = {
  playerHp: 139,
  trainerHp: 140,
  trainerPp: [34, 34, 35, 35],
  disabledMove: 0,
  disableTimer: 0,
  encoredMove: TACKLE,
  encoreTimer: 1,
};

function turnThreeConfig(arm: TurnThreeArm): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 305419897,
    player: {
      species: SPECIES_DEWGONG,
      moveId: ENCORE,
      attack: 60, defense: 80, spAttack: 70, spDefense: 95,
      speed: 75, hp: arm.playerHp,
    },
    trainer: {
      species: SPECIES_JOLTEON,
      moveId: TACKLE,
      attack: 65, defense: 60, spAttack: 110, spDefense: 95,
      speed: 150, hp: arm.trainerHp,
    },
  };
}

function turnThreeContext(arm: TurnThreeArm): BattleScriptRulesContext {
  const base = createFactoryFullTurnBattleState(turnThreeConfig(arm)).rules.rulesContext;
  return Object.freeze({
    ...base,
    battlers: Object.freeze(
      base.battlers.map((battler, index) => {
        if (index === 1) {
          return Object.freeze({
            ...battler,
            moves: Object.freeze([TACKLE, TACKLE, TACKLE, TACKLE] as const),
            pp: Object.freeze([...arm.trainerPp] as const),
            disabledMove: arm.disabledMove,
            encoredMove: arm.encoredMove,
            encoreTimer: arm.encoreTimer,
            encoredMovePos: 0,
          });
        }
        if (index === 0) {
          return Object.freeze({
            ...battler,
            moves: Object.freeze([BLIZZARD, DOUBLE_EDGE, ENCORE, DISABLE] as const),
            pp: Object.freeze([5, 15, 4, 19] as const),
          });
        }
        return battler;
      }),
    ) as unknown as BattleScriptRulesContext["battlers"],
  }) as BattleScriptRulesContext;
}


/**
 * Drives the kernel through the receipt's turn 3 from the ROM's own turn-3
 * entry state: the slower DEWGONG picks ENCORE (slot 2) while the faster
 * JOLTEON's action is whatever action selection resolves for it.
 */
function runReceiptTurnThree(arm: TurnThreeArm) {
  const initial = createFactoryFullTurnBattleStateFromRulesContext({
    requestId: 1,
    rngSeed: 305419897,
    rulesContext: turnThreeContext(arm),
  });
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 2, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected the trainer command to still be required");
  }
  if (afterPlayer.nextRequest.side === "player") {
    // The trainer's action was auto-confirmed by the Encore lock
    // (`battle_main.c:4192`), so the turn already resolved and the next
    // request belongs to the following turn's player command.
    return { trainerAutoConfirmed: true, trainerDecisions: null, resolved: afterPlayer };
  }
  if (afterPlayer.nextRequest.kind !== "command") {
    throw new Error("expected a command request, not a forced switch");
  }
  const trainerDecisions = afterPlayer.nextRequest.legalDecisions;
  const resolved = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: afterPlayer.nextRequest.requestId,
    side: "trainer",
    decision: trainerDecisions[0]!,
  });
  return { trainerAutoConfirmed: false, trainerDecisions, resolved };
}

describe("ISSUES #138 -- Encore vs AreAllMovesUnusable ordering (live ROM receipt)", () => {
  it("keeps the receipt's two arms and their fixtures joined", () => {
    expect(receipt.issue).toBe(138);
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.arms.struggle.fixture).toBe(
      "tools/battle-lab/issue138-encore-disable-struggle-off.json",
    );
    expect(receipt.arms.control.fixture).toBe(
      "tools/battle-lab/issue138-encore-disable-control-off.json",
    );
    // Both arms are the same three-legal-mon fixture apart from turn 2's move.
    expect(struggleFixture.overrides.parties.opponent[0]!.moves).toEqual(
      [TACKLE, TACKLE, TACKLE, TACKLE],
    );
    expect(controlFixture.overrides.parties.player[0]!.moves).toEqual(
      [BLIZZARD, DOUBLE_EDGE, ENCORE, DISABLE],
    );
    expect(struggleFixture.overrides.parties.player[0]!.ivs.speed).toBe(0);
  });

  it("struggle arm: the Encored battler whose encored move is Disabled Struggles, as the ROM does", () => {
    const rulesContext = turnThreeContext(STRUGGLE_ARM);
    expect(battlerUsesForcedStruggle(rulesContext, 1)).toBe(true);

    // The ROM's own turn-3 ledger: MOVE_STRUGGLE, PP untouched
    // (HITMARKER_NO_PPDEDUCT), recoil on the attacker.
    const currentMove = receipt.arms.struggle.summary.turn3CurrentMove
      .map((event) => event.to)
      .filter((move) => move !== 0);
    expect(currentMove).toContain(MOVE_STRUGGLE);
    expect(receipt.arms.struggle.summary.turn3PpDeduct.some((e) => e.noPpDeduct)).toBe(true);
    expect(
      receipt.arms.struggle.summary.turn3NoValidMoves
        .some((e) => e.battler === 1 && e.from === 0 && e.to === 1),
    ).toBe(true);
    // gBattlescriptCurrInstr sits inside BattleScript_NoMovesLeft while the
    // selection script runs (the flag flips a few frames earlier, at the
    // AreAllMovesUnusable call itself).
    expect(
      receipt.arms.struggle.summary.turn3Messages
        .some((m) => m.script === "BattleScript_NoMovesLeft+3"),
    ).toBe(true);
    expect(
      receipt.arms.control.summary.turn3Messages
        .some((m) => (m.script ?? "").startsWith("BattleScript_NoMovesLeft")),
    ).toBe(false);
    // No PP event for battler 1 anywhere in turn 3.
    expect(
      receipt.arms.struggle.summary.turn3Pp.filter((e) => e.battler === 1),
    ).toEqual([]);
    expect(receipt.arms.struggle.summary.finalActives.opponent.pp).toEqual([34, 34, 35, 35]);
    // HP: DEWGONG 139 -> 102 (Struggle), JOLTEON 140 -> 131 (recoil).
    expect(receipt.arms.struggle.summary.turn3Hp).toEqual([
      { frame: 2117, turn: 3, battler: 0, from: 139, to: 102 },
      { frame: 2215, turn: 3, battler: 1, from: 140, to: 131 },
    ]);
  });

  it("control arm: the same Encore lock without Disable still uses the locked move", () => {
    const rulesContext = turnThreeContext(CONTROL_ARM);
    expect(battlerUsesForcedStruggle(rulesContext, 1)).toBe(false);

    const currentMove = receipt.arms.control.summary.turn3CurrentMove
      .map((event) => event.to)
      .filter((move) => move !== 0);
    expect(currentMove).toContain(TACKLE);
    expect(currentMove).not.toContain(MOVE_STRUGGLE);
    expect(receipt.arms.control.summary.turn3NoValidMoves).toEqual([]);
    expect(receipt.arms.control.summary.turn3PpDeduct).toEqual([]);
    // TACKLE's own slot is deducted, and nothing takes recoil.
    expect(
      receipt.arms.control.summary.turn3Pp.filter((e) => e.battler === 1),
    ).toEqual([
      { frame: 1944, turn: 3, battler: 1, from: [34, 34, 35, 35], to: [33, 34, 35, 35] },
    ]);
    expect(receipt.arms.control.summary.turn3Hp).toEqual([
      { frame: 2050, turn: 3, battler: 0, from: 139, to: 111 },
    ]);
  });


  it("struggle arm: the kernel's own turn 3 spends no PP and recoils the attacker, as the ROM does", () => {
    const { trainerAutoConfirmed, trainerDecisions, resolved } = runReceiptTurnThree(STRUGGLE_ARM);
    // AreAllMovesUnusable wins over the Encore auto-confirm, so the trainer's
    // command is still collected -- and collapses to the single
    // banked-position Struggle command.
    expect(trainerAutoConfirmed).toBe(false);
    expect(trainerDecisions).toHaveLength(1);
    const after = resolved.state.rules.rulesContext;
    // HITMARKER_NO_PPDEDUCT: the ROM's opponent PP ledger is untouched.
    expect(after.battlers[1].pp).toEqual(
      receipt.arms.struggle.summary.finalActives.opponent.pp,
    );
    expect(after.battlers[1].pp).toEqual([34, 34, 35, 35]);
    // Struggle recoils its user and damages the target; DEWGONG's own ENCORE
    // deals no damage, so both deltas belong to the Struggle action.
    expect(after.battlers[1].hp).toBeLessThan(STRUGGLE_ARM.trainerHp);
    expect(after.battlers[0].hp).toBeLessThan(STRUGGLE_ARM.playerHp);
  });

  it("control arm: the kernel's own turn 3 spends TACKLE's PP and takes no recoil, as the ROM does", () => {
    const { trainerAutoConfirmed, trainerDecisions, resolved } = runReceiptTurnThree(CONTROL_ARM);
    // No slot is masked, so `battle_main.c:4192` fixes the MOVE to the encored
    // one. The ACTION is still asked (`:4166-4170` ChooseAction ->
    // AI_TrySwitchOrUseItem), so the trainer command is collected and lists
    // exactly the encored slot (docs/parity-mac/encore-struggle-selection.md).
    expect(trainerAutoConfirmed).toBe(false);
    expect(trainerDecisions).toHaveLength(1);
    expect(trainerDecisions![0]).toMatchObject({ kind: "use-move", moveSlot: 0 });
    const after = resolved.state.rules.rulesContext;
    expect(after.battlers[1].pp).toEqual([33, 34, 35, 35]);
    expect(after.battlers[1].hp).toBe(CONTROL_ARM.trainerHp);
    expect(after.battlers[0].hp).toBeLessThan(CONTROL_ARM.playerHp);
  });

  it("records the pre-fix kernel's divergent turn-3 action", () => {
    expect(receipt.engineDivergence?.turn3Action).toContain("NOT Struggle");
  });

  // ISSUES #140 (side lane) will change the turn-3 draw counts once
  // GetMoveTarget's MOVE_TARGET_SELECTED loop is wired to
  // HandleAction_UseMove's forced-Struggle/Encore branches; until then this
  // test pins the ROM's HP/PP/action, never the raw draw count.
  it("leaves the ROM's turn-3 draw counts unpinned pending #140", () => {
    expect(receipt.arms.struggle.summary.randomCallsPerTurn["3"]).toBeGreaterThan(0);
    expect(receipt.arms.control.summary.randomCallsPerTurn["3"]).toBeGreaterThan(0);
  });
});
