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
  ] as [string, number, number, number, string, number][])("%s", (_name, seed, moveId, attacker, code, rows) => {
    const first = apx217Strip(seed, moveId, attacker, code)!;
    expect(first).not.toBeNull();
    expect(first.code).toBe(code);
    expect(first.rows).toBe(rows);
    expect(first.nonStaticRows).toBeGreaterThan(rows * 0.5);
    const again = apx217Strip(seed, moveId, attacker, code)!;
    expect(again.rows).toBe(first.rows);
    expect(again.nonStaticRows).toBe(first.nonStaticRows);
    expect(again.sha256).toBe(first.sha256);
  }, 240000);
});
