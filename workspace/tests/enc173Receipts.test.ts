import { describe, expect, it } from "vitest";
import thr from "../tools/probe/receipts/enc173-thr.json" with { type: "json" };
import upr from "../tools/probe/receipts/enc173-upr.json" with { type: "json" };
import rol from "../tools/probe/receipts/enc173-rol.json" with { type: "json" };
import { verifyReceipt } from "../tools/probe/verify-rcp154.ts";

/**
 * STEP enc173 (ISSUES #171 Encore residuals after act156), part (b): a mid-turn
 * Encore into a move that locks the user (Thrash family, Uproar, Rollout).
 * Receipts: stock ROM, Scene OFF, two byte-identical runs each. The port PASSes
 * at the base commit with no engine change; these pin that. Part (a)
 * (overwritten Encore) is unreachable at a turn start -- see
 * docs/enc173-encore-residuals.md.
 */
type Receipt = Parameters<typeof verifyReceipt>[0];
type RomDraw = Readonly<{ rngBefore: number; value: number; callerFunction: string }>;

const LCG = (value: number) => (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
const MOVE = { TACKLE: 33, THRASH: 37, ENCORE: 227, UPROAR: 253, ROLLOUT: 205 } as const;

const RECEIPTS = [
  ["enc173-thr: Encore into THRASH (locked + Encored)", thr],
  ["enc173-upr: Encore into UPROAR", upr],
  ["enc173-rol: Encore into ROLLOUT", rol],
] as const;

const attackerAction = (receipt: (typeof RECEIPTS)[number][1], turn: number) =>
  receipt.rom.turns[turn - 1]!.actions.find((action) => action.attacker === 0)!;
const getMoveTargetDraws = (receipt: (typeof RECEIPTS)[number][1], turn: number) =>
  receipt.rom.turns[turn - 1]!.draws.filter((draw) => draw.callerFunction === "GetMoveTarget").length;

describe("enc173 receipts -- provenance (committed JSON only)", () => {
  it.each(RECEIPTS)("%s is a reproducible Scene OFF ROM capture", (_name, receipt) => {
    expect(receipt.schema).toBe("rcp154-action-time-receipt/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.byteIdenticalAcrossRuns).toBe(true);
    expect(receipt.probeOutputSha256).toBe(receipt.probeOutputSha256Rerun);
    expect(receipt.drawCountCrossChecked).toBe(true);
    expect(receipt.attributionReconciled).toBe(true);
    for (const turn of receipt.rom.turns) {
      expect(turn.drawCount).toBe(turn.draws.length);
      expect(turn.draws.at(-1)?.callerFunction).toBe("BattleTurnPassed");
      for (const draw of turn.draws as readonly RomDraw[]) expect(draw.value).toBe(LCG(draw.rngBefore) >>> 16);
    }
    expect(receipt.comparison.verdictToday).toBe("PASS");
    expect(receipt.comparison.firstDivergence).toBeNull();
    expect(receipt.portSitesAtHead.preFix).toEqual({ firstDivergence: null, verdict: "PASS" });
  });

  it("rol: a free ROLLOUT user Encored mid-turn with a differing chosen move runs ROLLOUT and pays one GetMoveTarget (turns 13, 19)", () => {
    for (const turn of [13, 19]) {
      expect(attackerAction(rol, turn)).toMatchObject({ currentMove: MOVE.ROLLOUT, chosenMoveByBattler: MOVE.TACKLE });
      expect(getMoveTargetDraws(rol, turn)).toBe(1);
    }
  });

  it("upr: a free UPROAR user Encored mid-turn with a differing chosen move runs UPROAR (turn 13)", () => {
    expect(attackerAction(upr, 13)).toMatchObject({ currentMove: MOVE.UPROAR, chosenMoveByBattler: 1 });
    expect(upr.rom.turns[12]!.messages.map((message) => message.text)).toEqual(expect.arrayContaining(["WHISMUR got\nan ENCORE!"]));
  });

  it("thr: the locked + Encored THRASH user takes the locked arm; the Encore turn itself pays no GetMoveTarget (turn 2)", () => {
    expect(attackerAction(thr, 2)).toMatchObject({ currentMove: MOVE.THRASH });
    expect(getMoveTargetDraws(thr, 2)).toBe(0);
  });
});

describe("enc173 -- the full-turn kernel replays each receipt draw for draw", () => {
  it.each(RECEIPTS)("%s", (_name, receipt) => {
    const result = verifyReceipt(receipt as unknown as Receipt);
    expect(result.port.stoppedEarly).toBeNull();
    expect(result.comparison.firstDivergence).toBeNull();
    expect(result.comparison.portActiveHp).toEqual(result.comparison.romActiveHp);
    expect(result.comparison.portUsedMoveMessages).toEqual(result.comparison.romMoveDispatches);
    expect(result.pass).toBe(true);
  });
});
