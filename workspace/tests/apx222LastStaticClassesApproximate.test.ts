// apx222 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts): the last static classes become approximate. One staged census
// command per class / new body through the production live renderer (tools/integration/apx217TransformStrips.ts): non-static rows,
// classified approx, deterministic on replay.
import { describe, expect, it } from "vitest";
import { apx217Strip } from "../tools/integration/apx217TransformStrips.ts";

describe("apx222: one staged command per class / new body draws non-static rows, classifies approx, deterministic on replay", () => {
  it.each([
    // [name, census seed, moveId, attacker, code, presented rows (the body's own live duration)]
    ["hidden-target: Light Screen 113 by the player at a hidden opponent", 41, 113, 0, "approx:hidden-target", 97],
    ["hidden-target: Sky Uppercut 327 by the opponent at a hidden player", 81, 327, 1, "approx:hidden-target", 191],
    // turn-0: Curse's Ghost branch (CURSE_GHOST, Move_CURSE / CurseGhost): the black field, the nail's three scratches, the rising ghost
    ["turn-0: Curse 174 (Ghost branch) by the player", 231, 174, 0, "approx:turn-0", 353],
    ["turn-0: Curse 174 (Ghost branch) by the opponent", 138, 174, 1, "approx:turn-0", 353],
    // no-adapter: each body is built from its source script (src/animation/approxScript.ts); [rows] is its own duration
    ["no-adapter: Peck 64 by the opponent (Move_PECK)", 51, 64, 1, "approx:no-adapter", 20],
    ["no-adapter: Odor Sleuth 316 by the player (Move_ODOR_SLEUTH)", 705, 316, 0, "approx:no-adapter", 85],
    ["no-adapter: False Swipe 206 by the player (Move_FALSE_SWIPE)", 705, 206, 0, "approx:no-adapter", 75],
    ["no-adapter: Gust 16 by the player (Move_GUST)", 197, 16, 0, "approx:no-adapter", 90],
    ["no-adapter: Pay Day 6 by the player (Move_PAY_DAY)", 923, 6, 0, "approx:no-adapter", 85],
    ["no-adapter: Barrage 140 by the opponent (Move_BARRAGE)", 803, 140, 1, "approx:no-adapter", 71],
    ["no-adapter: Conversion 2 176 by the opponent (Move_CONVERSION_2)", 736, 176, 1, "approx:no-adapter", 173],
  ] as [string, number, number, number, string, number][])("%s", (_name, seed, moveId, attacker, code, rows) => {
    const first = apx217Strip(seed, moveId, attacker, code)!;
    expect(first).not.toBeNull();
    expect(first.code).toBe(code);
    expect(first.rows).toBe(rows);
    // apx224: a body may start with idle lead-in rows (the ROM draws nothing for 7-15 frames after the command starts).
    expect(first.nonStaticRows).toBeGreaterThan(rows * 0.3);
    const again = apx217Strip(seed, moveId, attacker, code)!;
    expect(again.rows).toBe(first.rows);
    expect(again.nonStaticRows).toBe(first.nonStaticRows);
    expect(again.sha256).toBe(first.sha256);
  }, 240000);
});
