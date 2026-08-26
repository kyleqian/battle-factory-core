import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  reduceFactoryFullTurnDecision,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import receipt from "../tools/probe/receipts/issue140-getmovetarget-off.json" with { type: "json" };

/**
 * ISSUES #140 -- `HandleAction_UseMove`'s four re-target branches run
 * `GetMoveTarget`'s `MOVE_TARGET_SELECTED` do/while (`battle_util.c:119-122`),
 * a geometric(1/2) `Random()` cost the port used to skip entirely.
 *
 * The stock-ROM receipt these assertions replay lives in
 * `tools/probe/receipts/issue140-getmovetarget-off.json` (Battle Scene OFF,
 * each arm run twice, byte-identical; draw counts cross-checked against BOTH
 * the ROM's own `sRandCount` and an independent `gRngValue` LCG replay). Frame
 * attribution is exact because `BattleMainCB2` runs `gBattleMainFunc()` once
 * per frame, so `HandleAction_UseMove` owns its frame and the move script's
 * first opcode only runs on the next one.
 */
const POUND = 1; // EFFECT_HIT, TYPE_NORMAL, MOVE_TARGET_SELECTED -- the receipt's opponent move `M`.
const SPLASH = 150; // EFFECT_SPLASH, MOVE_TARGET_USER -- the receipt's no-op player move.
const DRAW_REASON = "GetMoveTarget(MOVE_TARGET_SELECTED)";

// SPLASH is MOVE_TARGET_USER, so its selection-time target is the user itself.
const PLAYER_MOVE = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });
const TRAINER_MOVE = Object.freeze({ kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const });

type BattlerOverrides = Partial<FactoryFullTurnConfig["trainer"]>;

/**
 * One full turn through the public kernel, recording every RNG draw reason in
 * order. `reconcileFullTurnRng` replays the machine ledger through the
 * decision boundary's own cursor, so this sees the action-prologue draws in
 * exactly the position the turn spent them.
 */
function runTurn(
  rngSeed: number,
  player: BattlerOverrides,
  trainer: BattlerOverrides,
): { reasons: readonly string[]; trainerHp: number; playerHp: number } {
  const config: FactoryFullTurnConfig = {
    requestId: 1,
    rngSeed,
    // The receipt's shape: the player is slow (moves second) and bulky, the
    // opponent is fast and carries the one MOVE_TARGET_SELECTED attack.
    player: {
      species: 202, moveId: SPLASH, attack: 50, defense: 63, spAttack: 50, spDefense: 63,
      speed: 38, hp: 265, maxHp: 265, ...player,
    },
    trainer: {
      species: 169, moveId: POUND, attack: 142, defense: 80, spAttack: 50, spDefense: 80,
      speed: 150, hp: 160, maxHp: 160, ...trainer,
    },
  };
  const initial = createFactoryFullTurnBattleState(config);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: PLAYER_MOVE,
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected the trainer's command request");
  const reasons: string[] = [];
  let rngValue = afterPlayer.state.rng.value;
  let rngCalls = afterPlayer.state.rng.calls;
  const reduced = reduceFactoryFullTurnDecision({
    rules: afterPlayer.state.rules,
    request: afterPlayer.nextRequest,
    decision: TRAINER_MOVE,
    rng: {
      draw(reason) {
        reasons.push(reason);
        rngValue = advanceRngValue(rngValue);
        rngCalls += 1;
        return rngValue >>> 16;
      },
      snapshot: () => ({ value: rngValue, calls: rngCalls }),
    },
  });
  return {
    reasons,
    trainerHp: reduced.rules.rulesContext.battlers[1].hp,
    playerHp: reduced.rules.rulesContext.battlers[0].hp,
  };
}

/** Draws spent before the acting battler's first in-script draw (`accuracycheck`). */
function prologueDraws(reasons: readonly string[]): number {
  const firstScriptDraw = reasons.indexOf("accuracycheck");
  const window = firstScriptDraw === -1 ? reasons : reasons.slice(0, firstScriptDraw);
  return window.filter((reason) => reason === DRAW_REASON).length;
}

/** The receipt's own per-arm prologue draw counts, keyed by arm name. */
function romDraws(arm: string): readonly number[] {
  const entry = receipt.arms.find((candidate) => candidate.arm === arm);
  if (!entry) throw new Error(`receipt has no arm ${arm}`);
  return entry.actionPrologues.map((prologue) => prologue.getMoveTargetDraws);
}

describe("ISSUES #140 -- GetMoveTarget's MOVE_TARGET_SELECTED draw loop on the re-target branches", () => {
  it("charges an Encore-forced action the ROM's own draw count, and the control arm none", () => {
    // The ROM's control arm spent 0 on all eight ordinary chosen-move
    // prologues; its Encore arms spent >= 1 on every Encore-forced action.
    expect(romDraws("control-a").every((count) => count === 0)).toBe(true);
    expect(
      romDraws("encore-a").filter((count) => count > 0),
    ).toEqual([1, 2]);
    expect(
      romDraws("encore-b").filter((count) => count > 0),
    ).toEqual([1, 1]);

    const control = runTurn(305419897, {}, {});
    expect(prologueDraws(control.reasons)).toBe(0);
    expect(control.reasons.filter((reason) => reason === DRAW_REASON)).toEqual([]);

    // Same fixture, opponent Encored onto its own POUND (battle_util.c:112-118).
    const encored = runTurn(305419897, {}, {
      encoredMove: POUND,
      encoredMovePos: 0,
      encoreTimer: 2,
      encoreTimerStartValue: 3,
    });
    expect(prologueDraws(encored.reasons)).toBeGreaterThanOrEqual(1);
    expect(encored.reasons[0]).toBe(DRAW_REASON);
    // The Encore branch still executes the encored move at its own slot.
    expect(encored.playerHp).toBeLessThan(265);
  });

  it("charges a forced Struggle the same draw, and never the ordinary chosen-move path", () => {
    // Receipt struggle arm: 0 on both pre-Disable prologues, then 1 and 3 on
    // the two Struggle-forced ones.
    expect(romDraws("struggle-a")).toEqual([0, 0, 0, 0, 1, 0, 3]);

    const struggling = runTurn(305419897, {}, {
      moves: [POUND, 0, 0, 0],
      pp: [0, 0, 0, 0],
    });
    expect(prologueDraws(struggling.reasons)).toBeGreaterThanOrEqual(1);
    expect(struggling.reasons[0]).toBe(DRAW_REASON);
    // Struggle, not the 0-PP slot: EFFECT_RECOIL takes a quarter of the damage
    // dealt back off the user, which POUND never does.
    expect(struggling.trainerHp).toBeLessThan(160);
    expect(struggling.playerHp).toBeLessThan(265);
  });

  it("spends a geometric number of draws across seeds, always at least one", () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 24; seed += 1) {
      const encored = runTurn(seed, {}, {
        encoredMove: POUND,
        encoredMovePos: 0,
        encoreTimer: 2,
        encoreTimerStartValue: 3,
      });
      const drawn = prologueDraws(encored.reasons);
      expect(drawn).toBeGreaterThanOrEqual(1);
      counts.add(drawn);
      // The ordinary chosen-move path never draws, whatever the seed.
      expect(prologueDraws(runTurn(seed, {}, {}).reasons)).toBe(0);
    }
    // gBattlersCount == 2 makes this geometric(1/2): 1 is the mode, but 2+
    // must occur -- a fixed single draw would be the wrong model.
    expect(counts.has(1)).toBe(true);
    expect([...counts].some((count) => count >= 2)).toBe(true);
  });

  it("keeps the receipt's ROM evidence attached to the fix", () => {
    expect(receipt.issue).toBe(140);
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    for (const arm of receipt.arms) {
      expect(arm.byteIdenticalAcrossRuns).toBe(true);
      expect(arm.receiptSha256).toBe(arm.receiptSha256Rerun);
      for (const prologue of arm.actionPrologues) {
        // Both independent measurements agreed on every frame.
        expect(prologue.lcgReplayDraws).toBe(prologue.getMoveTargetDraws);
      }
    }
  });
});
