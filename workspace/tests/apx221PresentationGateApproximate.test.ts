// apx221 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts): the remaining presentation-gate classes are promoted to
// approximate. A body that declines ONLY for one of these provenance reasons is drawn (liveMoveAnimationPresentation retries the proven
// call with the reason's approximation flag, liveMoveAnimationPresentationProven's `approximations`) with its own live duration and
// classified approx:<reason>. One staged census command per class through the production live renderer
// (tools/integration/apx217TransformStrips.ts, the lsd194Census.ts battle loop).
import { describe, expect, it } from "vitest";
import { LIVE_MOVE_APPROXIMATE_OTHER_REASONS, LIVE_MOVE_APPROXIMATE_POLICY } from "../src/engine/liveMovePlayback.ts";
import { apx217Strip } from "../tools/integration/apx217TransformStrips.ts";

describe("apx221: the policy", () => {
  it("promotes castform-form and the named other: reasons on top of apx215 / apx217 / apx219", () => {
    expect(Object.entries(LIVE_MOVE_APPROXIMATE_POLICY).filter(([, p]) => p === "approximate").map(([c]) => c).sort())
      .toEqual(PROMOTED_CLASSES.slice().sort());
    expect([...LIVE_MOVE_APPROXIMATE_OTHER_REASONS].sort()).toEqual(PROMOTED_OTHER.slice().sort());
  });
});

const PROMOTED_CLASSES = ["substitute-doll", "sprite-order-unknown", "allocator-unknown", "transform", "castform-form", "endeavor-power"];
const PROMOTED_OTHER: string[] = ["other:extrasensory-player-later-target", "other:later-body-idle-rest", "other:seismic-toss-damage-branch"];

describe("apx221: one staged command per class draws non-static rows, classifies approx, deterministic on replay", () => {
  it.each([
    // [name, census seed, moveId, attacker, code, presented rows (the body's own live duration)]
    ["castform-form: Icy Wind 196 by the player's rain-form CASTFORM (residual key 196:by:2)", 651, 196, 0, "approx:castform-form", 290],
    ["castform-form: Fly 19 by the opponent at a hail-form CASTFORM (19:at:3 not proven)", 950, 19, 1, "approx:castform-form", 46],
    ["extrasensory-player-later-target: Extrasensory 326 by the player's later body (target top line < 27 / scanline history unknown)", 19, 326, 0,
      "approx:other:extrasensory-player-later-target", 165],
    ["endeavor-power: Endeavor 283 with the stale battleMovePower register unknown (census seed 415)", 415, 283, 0, "approx:endeavor-power", 73],
    ["endeavor-power: Endeavor 283, a second census battle", 419, 283, 0, "approx:endeavor-power", 73],
    ["later-body-idle-rest: Signal Beam 324 by the player's later body at a battler off its rest offset", 312, 324, 0, "approx:other:later-body-idle-rest", 148],
    ["later-body-idle-rest: Fury Cutter 210 (hardware-row model with zeroed frontIdleRest)", 851, 210, 0, "approx:other:later-body-idle-rest", 46],
    ["later-body-idle-rest: Extrasensory 326 (later body, idle rest)", 731, 326, 0, "approx:other:later-body-idle-rest", 165],
    ["seismic-toss-damage-branch: Seismic Toss 69 by the opponent whose damage is outside the proven 33..65 branch", 567, 69, 1, "approx:other:seismic-toss-damage-branch", 233],
    ["extrasensory-player-later-target: Extrasensory 326, a second census battle", 767, 326, 0, "approx:other:extrasensory-player-later-target", 165],
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
