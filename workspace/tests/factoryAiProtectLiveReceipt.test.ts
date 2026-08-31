import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #137 live receipt -- `AI_CV_Protect`'s AI_USER status routes.
 *
 * Ground truth: `tools/probe/receipts/factory-ai-protect-live.json`, produced
 * by `tools/probe/verify-factory-ai-protect-live.ts` from
 * `tools/battle-lab/mechanic-factory-ai-cv-protect-{control,reach}-off.json`
 * on the Battle Scene OFF oracle. Every arm was run twice and is
 * byte-identical (`captureDigest`).
 *
 * The two arms are the same two-turn Level-50 Factory matchup -- AI Dusclops
 * (pure Ghost, single-ability Pressure) holding [Protect, Splash, Splash,
 * Splash] against a single-ability Gengar whose four move slots are all
 * Splash (control) or all Curse (reach) -- so they enter the turn-2 decision
 * at the IDENTICAL RNG value and differ in exactly one bit of battle state:
 * `status2 & STATUS2_CURSED` on the AI user. Turn 1 the AI protects (101-102
 * beats Splash's flat 100 whatever the roll) and Protect's priority +3 makes
 * `sProtectSuccessRates[0] == 0xFFFF` succeed, so `protectUses == 1` in both
 * arms; MOVE_CURSE has `.flags == 0`, so the Ghost Curse lands through the
 * Protect.
 *
 *   control  ROM 7 draws = setup 4 + `AI_CV_Protect2`/`Protect4`'s two rolls
 *            + tie 1.
 *   reach    ROM 5 draws = setup 4 + tie 1: `if_status2 AI_USER,
 *            STATUS2_CURSED, AI_CV_Protect3` (`:1898`) exits with ZERO CV
 *            draws.
 *
 * `engineDivergence` banks what the port did BEFORE the fix: 7 draws on both
 * arms, so every reach row landed on the control's RNG endpoint and picked
 * the control's move. Deleting either new rung from `runCvProtect` makes the
 * three reach rows below fail on draw count and endpoint.
 */
type ReceiptArm = Readonly<{
  seed: number;
  arm: "control" | "reach";
  captureDigest: string;
  romDecisionDraws: number;
  romCvDraws: number;
  romRngBefore: number;
  romRngAfter: number;
  romChosenMoveSlot: number;
  attackerCursed: boolean;
  attackerProtectUses: number;
  view: FactoryAiScoredView;
}>;
type Receipt = Readonly<{
  schema: string;
  issue: number;
  arms: readonly ReceiptArm[];
  engineDivergence: readonly Readonly<{
    seed: number;
    arm: string;
    romDecisionDraws: number;
    preFixEngineDecisionDraws: number;
    preFixEngineRngAfter: number;
    diverges: boolean;
  }>[];
}>;

const receipt = JSON.parse(readFileSync(
  new URL("../tools/probe/receipts/factory-ai-protect-live.json", import.meta.url),
  "utf8",
)) as Receipt;

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    { kind: "use-move", moveSlot: 3, targetBattler: 0 },
  ],
});

describe("AI_CV_Protect live ROM receipt (ISSUES #137, tools/probe/receipts/factory-ai-protect-live.json)", () => {
  it("banks six arms over three seeds, each ROM-run twice byte-identical", () => {
    expect(receipt.schema).toBe("factory-ai-protect-live-receipt/v1");
    expect(receipt.issue).toBe(137);
    expect(receipt.arms).toHaveLength(6);
    expect(receipt.arms.map((arm) => `${arm.seed}/${arm.arm}`)).toEqual([
      "1/control", "1/reach", "5/control", "5/reach", "99/control", "99/reach",
    ]);
    expect(new Set(receipt.arms.map((arm) => arm.captureDigest)).size).toBe(6);
  });

  it.each(receipt.arms.map((arm) => [`seed ${arm.seed} ${arm.arm}`, arm] as const))(
    "%s: the kernel reproduces the ROM's draw count, RNG endpoint and PP-selected slot",
    (_label, arm) => {
      const result = chooseFactoryAiScoredDecision({
        view: arm.view,
        request,
        rng: { value: arm.romRngBefore, calls: 0 },
      });
      expect(result.trace.draws).toHaveLength(arm.romDecisionDraws);
      expect(result.rng.value).toBe(arm.romRngAfter);
      expect(result.trace.tie.chosenDecision).toMatchObject({
        kind: "use-move",
        moveSlot: arm.romChosenMoveSlot,
      });
      // setup 4 + CV + tie 1: the CV draws are the whole arm-to-arm delta.
      const protectRolls = result.trace.draws.filter((draw) => (
        typeof draw.kind === "string" && draw.kind.startsWith("protect-roll")
      ));
      expect(protectRolls).toHaveLength(arm.romCvDraws);
      expect(arm.romDecisionDraws).toBe(5 + arm.romCvDraws);
    },
  );

  it("the cursed arm is the ONLY difference: identical entry RNG per seed, 5 draws vs 7", () => {
    for (const seed of [1, 5, 99]) {
      const control = receipt.arms.find((arm) => arm.seed === seed && arm.arm === "control")!;
      const reach = receipt.arms.find((arm) => arm.seed === seed && arm.arm === "reach")!;
      expect(reach.romRngBefore).toBe(control.romRngBefore);
      expect(control.attackerCursed).toBe(false);
      expect(reach.attackerCursed).toBe(true);
      expect(control.attackerProtectUses).toBe(1);
      expect(reach.attackerProtectUses).toBe(1);
      expect(control.romDecisionDraws).toBe(7);
      expect(reach.romDecisionDraws).toBe(5);
      expect(reach.romRngAfter).not.toBe(control.romRngAfter);
    }
  });

  it("banks the pre-fix divergence: the un-fixed port drew 7 on every reach arm", () => {
    const reach = receipt.engineDivergence.filter((row) => row.arm === "reach");
    expect(reach).toHaveLength(3);
    for (const row of reach) {
      expect(row.diverges).toBe(true);
      expect(row.romDecisionDraws).toBe(5);
      expect(row.preFixEngineDecisionDraws).toBe(7);
      const control = receipt.arms.find((arm) => arm.seed === row.seed && arm.arm === "control")!;
      expect(row.preFixEngineRngAfter).toBe(control.romRngAfter);
    }
    for (const row of receipt.engineDivergence.filter((entry) => entry.arm === "control")) {
      expect(row.diverges).toBe(false);
    }
  });
});
