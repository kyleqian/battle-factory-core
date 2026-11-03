import { describe, expect, it } from "vitest";
import { BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY } from "../src/engine/battleScriptSourceConstants.ts";
import { GbaRng } from "../src/engine/rng.ts";
import { getWhoStrikesFirst, type TurnOrderBattler } from "../src/engine/turnOrder.ts";
import {
  binomialZ,
  runObserved,
  seedList,
  singlesContext,
  type ObservedDraw,
  type ObservedRun,
} from "./helpers/rngRateHarness.ts";

/**
 * rng244 -- permanent rate check for random battle outcomes
 * (docs/cax31-session-handoff.md item 4b(c)).
 *
 * Context: a player saw Double Kick crit on hit 2 twice in a row. A 200,000-run
 * sweep of the committed BattleScript_EffectDoubleHit found no bug (draw order
 * acc > crit > dmg > crit > dmg > effect; hit 2's crit is a fresh 1/16 roll).
 * This file keeps that check for every cheap RNG draw site. Each site runs the
 * REAL committed battle script through the production handler composition from
 * N fixed, well-mixed random gRngValue starts (seedList, so it is deterministic)
 * and compares the ENGINE's observed outcome (critMultiplier, battleMoveDamage,
 * multiHitCounter, status1, target HP) with the pokeemerald formula, using an
 * exact expected probability (counted over the 65536 values of Random()) and a
 * 5-SD binomial bound. Where the formula is a pure function of the roll, each
 * run's outcome is also compared exactly against it (catches wrong modulus or
 * a stale roll), and the rate bound catches a non-fresh roll.
 *
 * Formulas (vendor/pokeemerald/src, line numbers of the committed checkout):
 *   crit            battle_script_commands.c:1282   !(Random() % sCriticalHitChance[stage]), table {16,8,4,3,2} :606
 *   accuracy        battle_script_commands.c:1149-1176   calc = ratio[stage]*acc/div; miss iff (Random() % 100 + 1) > calc
 *   damage roll     battle_script_commands.c:1639-1650   ApplyRandomDmgMultiplier: dmg = dmg * (100 - Random() % 16) / 100
 *   multi-hit count battle_script_commands.c:7139-7153   Random()&3; >1 -> (Random()&3)+2 else +2  => P(2,3,4,5)=3/8,3/8,1/8,1/8
 *   secondary       battle_script_commands.c:2923   Random() % 100 < secondaryEffectChance
 *   Quick Claw      battle_main.c:4653 / :4687   gRandomTurnNumber < (0xFFFF * holdEffectParam) / 100
 *                   (Emerald compares the per-turn Random(), not a fresh Random() % 100 -- the 20 % is 13107/65536)
 *
 * Not covered (reason):
 *   - AI score roll: factoryAiDecisionPolicy's draws sit behind a BattleDecisionRequest + FactoryAiMaskZeroView
 *     + selectFactoryAiMask staging with no cheap per-run entry point; skipped rather than faked.
 *   - Quick Claw's gRandomTurnNumber DRAW SITE (BattleTurnPassed, battle_main.c:3140/3923/4013) lives inside
 *     the sealed full-turn reducer; here Random() is drawn from the same GbaRng LCG and fed to the real
 *     getWhoStrikesFirst/effectiveSpeed path, so the proc formula and strike order are covered, the boundary
 *     draw's placement is already pinned in factoryBattleScriptFullTurnDecision.test.ts.
 *
 * Runtime (measured, see commit message). Each `it` below is independent; the Double Kick runs are shared.
 */

const SIGMAS = 5;
const MOVE_DOUBLE_KICK = 24; // EFFECT_DOUBLE_HIT, 100 acc, Fighting
const MOVE_SPIKE_CANNON = 131; // EFFECT_MULTI_HIT, 100 acc
const MOVE_SLASH = 163; // EFFECT_HIGH_CRITICAL, 100 acc
const MOVE_MEGA_PUNCH = 5; // EFFECT_HIT, 85 acc
const MOVE_THUNDER = 87; // EFFECT_THUNDER, 70 acc, 30 % paralysis
const MOVE_BODY_SLAM = 34; // EFFECT_PARALYZE_HIT, 100 acc, 30 %
const MOVE_THUNDERBOLT = 85; // EFFECT_PARALYZE_HIT, 100 acc, 10 %
const STATUS1_PARALYSIS = 1 << 6;
/** A big-hitting attacker and a tanky target so every hit lands a large, invertible damage value. */
const STRONG = { attack: 500, level: 100 } as const;
const TANK = { hp: 9999, maxHP: 9999 } as const;

/** Exact P(pred(Random())) with Random() uniform over its 16-bit output. */
function u16Rate(pred: (v: number) => boolean): number {
  let n = 0;
  for (let v = 0; v < 0x10000; v += 1) if (pred(v)) n += 1;
  return n / 0x10000;
}

function expectRate(label: string, count: number, trials: number, p: number): void {
  const z = binomialZ(count, trials, p);
  expect(
    Math.abs(z),
    `${label}: ${count}/${trials} = ${(count / trials).toFixed(5)}, expected ${p.toFixed(5)} (z=${z.toFixed(2)})`,
  ).toBeLessThanOrEqual(SIGMAS);
}

const critDraws = (run: ObservedRun): ObservedDraw[] => run.draws.filter((d) => d.reason === "critcalc");
const damageDraws = (run: ObservedRun): ObservedDraw[] => run.draws.filter((d) => d.reason === "adjustnormaldamage");

/** Draw order for the 2-hit moves: acc, crit, dmg, crit, dmg (the effect-chance roll follows and is cut off). */
const DOUBLE_HIT_ORDER = ["accuracycheck", "critcalc", "adjustnormaldamage", "critcalc", "adjustnormaldamage"];

function critRateCheck(
  label: string,
  runs: readonly ObservedRun[],
  critDivisor: number,
): void {
  const p = u16Rate((v) => v % critDivisor === 0);
  const n = runs.length;
  let hit1 = 0;
  let hit2 = 0;
  let both = 0;
  let formulaMismatch = 0;
  for (const run of runs) {
    expect(run.draws.map((d) => d.reason)).toEqual(DOUBLE_HIT_ORDER);
    const [c1, c2] = critDraws(run) as [ObservedDraw, ObservedDraw];
    const crit1 = c1.critMultiplier === 2;
    const crit2 = c2.critMultiplier === 2;
    if (crit1 !== (c1.randomValue % critDivisor === 0)) formulaMismatch += 1;
    if (crit2 !== (c2.randomValue % critDivisor === 0)) formulaMismatch += 1;
    if (crit1) hit1 += 1;
    if (crit2) hit2 += 1;
    if (crit1 && crit2) both += 1;
  }
  expect(formulaMismatch, `${label}: engine crit outcome must equal !(Random() % ${critDivisor}) of its own roll`).toBe(0);
  expectRate(`${label} hit 1 crit`, hit1, n, p);
  expectRate(`${label} hit 2 crit`, hit2, n, p);
  expectRate(`${label} both hits crit`, both, n, p * p);
  // Independence (catches a reused roll: a copied hit-1 roll gives P(hit2 | hit1) = 1).
  expectRate(`${label} P(hit 2 crit | hit 1 crit)`, both, hit1, p);
  expectRate(`${label} P(hit 2 crit | hit 1 no crit)`, hit2 - both, n - hit1, p);
}

/** Double Kick, no crit boost, from 10000 starts. Shared by the crit, independence, damage and accuracy checks. */
const DOUBLE_KICK_STARTS = 10_000;
let doubleKickRuns: ObservedRun[] | null = null;
function doubleKickStage0(): ObservedRun[] {
  doubleKickRuns ??= seedList(244_01, DOUBLE_KICK_STARTS).map((seed) =>
    runObserved("BattleScript_EffectDoubleHit", singlesContext(MOVE_DOUBLE_KICK, STRONG, TANK), seed, 5),
  );
  return doubleKickRuns;
}

describe("rng244: critical hit per hit index of a multi-hit move", () => {
  it("Double Kick at crit stage 0: hit 1 and hit 2 each crit at 1/16, independently (the 'twice in a row' report)", () => {
    critRateCheck("Double Kick stage 0 (1/16)", doubleKickStage0(), 16);
  }, 120_000);

  it("Double Kick with Focus Energy (stage 2, 1/4): both hit indexes follow the raised table entry", () => {
    const runs = seedList(244_02, 3_000).map((seed) =>
      runObserved(
        "BattleScript_EffectDoubleHit",
        singlesContext(MOVE_DOUBLE_KICK, { ...STRONG, status2: BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY }, TANK),
        seed,
        5,
      ),
    );
    critRateCheck("Double Kick Focus Energy (1/4)", runs, 4);
  }, 120_000);

  it("Slash (EFFECT_HIGH_CRITICAL, stage 1): crits at 1/8", () => {
    const p = u16Rate((v) => v % 8 === 0);
    const runs = seedList(244_03, 6_000).map((seed) =>
      runObserved("BattleScript_EffectHit", singlesContext(MOVE_SLASH, STRONG, TANK), seed, 2),
    );
    let crits = 0;
    let mismatch = 0;
    for (const run of runs) {
      expect(run.draws.map((d) => d.reason)).toEqual(["accuracycheck", "critcalc"]);
      const c = run.draws[1]!;
      if (c.critMultiplier === 2) crits += 1;
      if ((c.critMultiplier === 2) !== (c.randomValue % 8 === 0)) mismatch += 1;
    }
    expect(mismatch).toBe(0);
    expectRate("Slash crit (1/8)", crits, runs.length, p);
  }, 120_000);
});

describe("rng244: damage roll (85..100 random factor)", () => {
  it("Double Kick damage factor 100 - Random() % 16 is uniform over its 16 values, for both hit indexes", () => {
    const runs = doubleKickStage0();
    const p = 1 / 16; // 65536 % 16 === 0, exactly uniform
    const buckets = [new Array<number>(16).fill(0), new Array<number>(16).fill(0)];
    let samples = 0;
    for (const run of runs) {
      damageDraws(run).forEach((d, hitIndex) => {
        // Invert dmg = floor(before * (100 - r) / 100): before >= 100 makes every r distinct.
        expect(d.battleMoveDamageBefore).toBeGreaterThanOrEqual(100);
        const r = Array.from({ length: 16 }, (_, k) => k).filter(
          (k) => Math.trunc((d.battleMoveDamageBefore * (100 - k)) / 100) === d.battleMoveDamageAfter,
        );
        expect(r, `hit ${hitIndex + 1}: unique factor for ${d.battleMoveDamageBefore} -> ${d.battleMoveDamageAfter}`).toHaveLength(1);
        expect(r[0], "engine factor must be Random() % 16 of its own roll").toBe(d.randomValue % 16);
        buckets[hitIndex]![r[0]!]! += 1;
        samples += 1;
      });
    }
    expect(samples).toBe(runs.length * 2);
    buckets.forEach((counts, hitIndex) => {
      counts.forEach((count, k) => expectRate(`hit ${hitIndex + 1} factor ${100 - k}%`, count, runs.length, p));
    });
  }, 120_000);
});

describe("rng244: accuracy", () => {
  it("a 100 % move (Double Kick) never misses: (Random() % 100 + 1) > 100 is impossible", () => {
    for (const run of doubleKickStage0()) {
      expect(run.draws[0]!.reason).toBe("accuracycheck");
      expect(run.draws[1]!.reason).toBe("critcalc"); // a miss would branch away before any crit roll
    }
  }, 120_000);

  const landRate = (move: number, label: string, calc: number, attacker: Record<string, unknown> = {}, effect = "BattleScript_EffectHit") => {
    const p = u16Rate((v) => (v % 100) + 1 <= calc);
    const starts = seedList(244_10 + move, 4_000);
    let landed = 0;
    for (const seed of starts) {
      const run = runObserved(effect, singlesContext(move, { ...attacker }, TANK), seed);
      expect(run.draws[0]!.reason).toBe("accuracycheck");
      if (run.hp < TANK.hp) landed += 1;
    }
    expectRate(label, landed, starts.length, p);
  };

  it("Mega Punch (85 acc): lands at 85 %", () => {
    landRate(MOVE_MEGA_PUNCH, "Mega Punch accuracy (85)", 85);
  }, 120_000);

  it("Thunder (70 acc, the 70 %-class move): lands at 70 %", () => {
    landRate(MOVE_THUNDER, "Thunder accuracy (70)", 70, {}, "BattleScript_EffectThunder");
  }, 120_000);

  it("a 100-acc move at accuracy stage -1 uses sAccuracyStageRatios {75,100}: lands at 75 %", () => {
    landRate(MOVE_SLASH, "Slash at acc stage -1 (75)", 75, { statStages: [6, 6, 6, 6, 6, 6, 5, 6] });
  }, 120_000);
});

describe("rng244: multi-hit count (Cmd_setmultihitcounter, 2-5 hits)", () => {
  it("Spike Cannon hit count is 2/3/4/5 with probability 3/8, 3/8, 1/8, 1/8", () => {
    const starts = seedList(244_20, 8_000);
    const counts = new Map<number, number>();
    for (const seed of starts) {
      const run = runObserved("BattleScript_EffectMultiHit", singlesContext(MOVE_SPIKE_CANNON, {}, TANK), seed, 3);
      const setters = run.draws.filter((d) => d.reason.startsWith("setmultihitcounter"));
      const last = setters[setters.length - 1]!;
      // initial roll r: 0,1 -> 2,3 hits (one draw); 2,3 -> reroll (r2 & 3) + 2 (two draws)
      const expected = (setters[0]!.randomValue & 3) <= 1
        ? (setters[0]!.randomValue & 3) + 2
        : (setters[1]!.randomValue & 3) + 2;
      expect(last.multiHitCounter).toBe(expected);
      counts.set(last.multiHitCounter, (counts.get(last.multiHitCounter) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([2, 3, 4, 5]);
    expectRate("2 hits", counts.get(2)!, starts.length, 3 / 8);
    expectRate("3 hits", counts.get(3)!, starts.length, 3 / 8);
    expectRate("4 hits", counts.get(4)!, starts.length, 1 / 8);
    expectRate("5 hits", counts.get(5)!, starts.length, 1 / 8);
  }, 120_000);
});

describe("rng244: secondary effect chance (seteffectwithchance)", () => {
  const effectRate = (move: number, label: string, percent: number) => {
    const p = u16Rate((v) => v % 100 < percent);
    const starts = seedList(244_30 + move, 5_000);
    let procs = 0;
    let mismatch = 0;
    for (const seed of starts) {
      const run = runObserved("BattleScript_EffectParalyzeHit", singlesContext(move, {}, TANK), seed);
      const roll = run.draws.find((d) => d.reason === "seteffectwithchance");
      expect(roll, `${label}: effect roll present`).toBeDefined();
      const paralyzed = (run.status1 & STATUS1_PARALYSIS) !== 0;
      if (paralyzed) procs += 1;
      if (paralyzed !== roll!.randomValue % 100 < percent) mismatch += 1;
    }
    expect(mismatch, `${label}: paralysis must equal Random() % 100 < ${percent} of its own roll`).toBe(0);
    expectRate(label, procs, starts.length, p);
  };

  it("Body Slam paralysis (30 %)", () => {
    effectRate(MOVE_BODY_SLAM, "Body Slam paralysis (30)", 30);
  }, 120_000);

  it("Thunderbolt paralysis (10 %)", () => {
    effectRate(MOVE_THUNDERBOLT, "Thunderbolt paralysis (10)", 10);
  }, 120_000);
});

describe("rng244: Quick Claw", () => {
  it("a slower Quick Claw holder (param 20) strikes first at 13107/65536 of fresh gRandomTurnNumber draws", () => {
    const holder: TurnOrderBattler = { speed: 40, speedStage: 6, movePriority: 0, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 };
    const other: TurnOrderBattler = { speed: 100, speedStage: 6, movePriority: 0 };
    const starts = seedList(244_40, 100_000);
    const p = u16Rate((v) => v < Math.trunc((0xffff * 20) / 100));
    expect(p).toBe(13107 / 65536);
    let procs = 0;
    for (const seed of starts) {
      const randomTurnNumber = new GbaRng(seed).next(); // one Random() from a random start, as BattleTurnPassed draws it
      const holderFirst = getWhoStrikesFirst(holder, other, 0, {}, randomTurnNumber) === 0;
      expect(holderFirst).toBe(randomTurnNumber < 13107);
      if (holderFirst) procs += 1;
    }
    expectRate("Quick Claw proc", procs, starts.length, p);
  });
});
