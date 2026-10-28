import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation, type LiveMoveDeclineSink } from "../../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

// docs/spark62-spark-opponent.md: Spark (209) with an OPPONENT attacker. The flashing sprites' "initial callback advance"
// is where the VBlank edge falls inside the overrunning creation iteration's AnimateSprites (RAM: opponent MINUN / CHINCHOU
// [1,1,0..], VOLTORB [1,0..], player [0..]); that iteration is a lag frame, so the advance is never displayed. Dense proofs:
// tools/integration/fixtures/spark62-live/*.json (receipt tools/integration/fixtures/spark62-live-receipt.json).
const request = (attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId: 209, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 65, damage: 0, friendship: 70, multihit: 0,
});
function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({
    species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none",
  });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}
const knownOrder = (): LiveMoveSpriteOrderInput =>
  prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!;
const presentation = (field: BattleResolutionDisplayedField, attacker: 0 | 1, age: number, order?: LiveMoveSpriteOrderInput) =>
  liveMoveAnimationPresentation(request(attacker), field, age, undefined, undefined, order);
function frames(field: BattleResolutionDisplayedField, attacker: 0 | 1, callback?: number[], affine?: number[]): string[] {
  const order = knownOrder();
  return Array.from({ length: 115 }, (_, age) => {
    const state = presentation(field, attacker, age, order)!;
    const config = {
      ...state.config,
      ...(callback ? { flashingInitialCallbackAdvances: callback } : {}),
      ...(affine ? { flashingInitialAffineAdvances: affine } : {}),
    };
    const fb = new Uint8Array(240 * 160 * 4);
    renderSceneOnMovePresentation(fb, { ...state, config } as typeof state, true);
    return createHash("sha256").update(fb).digest("hex");
  });
}

describe("spark62: Spark opponent-attacker live adapter", () => {
  it("has a 115-row live body for BOTH attackers (window activation + 9; prep10 s3.5)", () => {
    expect(liveMoveAnimationDuration(request(0))).toBe(115);
    expect(liveMoveAnimationDuration(request(1))).toBe(115);
  });

  it("keeps the known-order lend gate for the opponent attacker (the tie order is history, not derived)", () => {
    const field = displayed("SHUCKLE", "VOLTORB");
    expect(presentation(field, 1, 0, knownOrder())).not.toBeNull();
    // apx219: an unknown order still declines the proven body; it is drawn approximately with the known-entry first-action order.
    for (const unknown of [undefined, { known: false } as never]) {
      const sink: LiveMoveDeclineSink = {};
      expect(liveMoveAnimationPresentation(request(1), field, 0, undefined, undefined, unknown, undefined, undefined, undefined, sink))
        .not.toBeNull();
      expect(sink.approximate).toBe("sprite-order-unknown");
    }
    const config = presentation(field, 1, 0, knownOrder())!.config as any;
    expect(config.attacker.geometry.side).toBe("opponent");
    expect(config.flashingInitialCallbackAdvances).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(config.flashingInitialAffineAdvances).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(config.hardwareTieSlotOrder).toEqual([12, 7, 3, 4, 5, 9, 10, 11]);
  });

  it("records the RAM advances measured by the probe grid (VBlank edge inside AnimateSprites; lag frame on every row)", () => {
    const analysis = JSON.parse(readFileSync("tools/integration/fixtures/spark62-analysis.json", "utf8")) as {
      rows: { scenario: string; creationAge: number; creationContext: string[]; creatorCallers: string[]; initialCallbackAdvances: number[];
        lagFrame: Record<string, boolean> }[];
    };
    const adv = Object.fromEntries(analysis.rows.map(r => [r.scenario.replace(/^spark62-|\.json$/g, ""), r.initialCallbackAdvances]));
    expect(adv["opponent-minun-player-shuckle"]).toEqual([1, 1, 0, 0, 0, 0, 0, 0]);
    expect(adv["opponent-chinchou-player-snorlax"]).toEqual([1, 1, 0, 0, 0, 0, 0, 0]);
    expect(adv["opponent-voltorb-player-shuckle"]).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(adv["player-minun-opponent-shuckle"]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    for (const r of analysis.rows) {
      expect(r.creationAge, r.scenario).toBe(51);
      expect(r.creationContext, r.scenario).toEqual(["BattleMainCB1"]);
      expect(r.creatorCallers, r.scenario).toEqual(["Cmd_createsprite+0xda"]);
      expect(Object.values(r.lagFrame).every(Boolean), r.scenario).toBe(true);
    }
  });

  // The advance only changes the spriteAge-0 state (reducer age 42); the renderer draws view(age - 1) and blanks the effect
  // sprites at age 43 (the lag frame), so any advance in {0,1} is pixel-identical on every row. An advance of 2 would change
  // the first displayed flashing row (non-vacuity control).
  it.each([
    { name: "opponent MINUN -> SHUCKLE", field: displayed("SHUCKLE", "MINUN"), attacker: 1 as const },
    { name: "opponent VOLTORB -> SNORLAX", field: displayed("SNORLAX", "VOLTORB"), attacker: 1 as const },
    { name: "player CHINCHOU -> SHUCKLE", field: displayed("CHINCHOU", "SHUCKLE"), attacker: 0 as const },
  ])("renders identical frames for every measured advance vector: $name", ({ field, attacker }) => {
    const zero = frames(field, attacker);
    expect(new Set(zero).size).toBeGreaterThan(20);
    expect(frames(field, attacker, [1, 1, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0])).toEqual(zero);
    expect(frames(field, attacker, [1, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0])).toEqual(zero);
    expect(frames(field, attacker, [1, 1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1])).toEqual(zero);
    const two = frames(field, attacker, [2, 0, 0, 0, 0, 0, 0, 0]);
    expect(two.map((h, age) => (h === zero[age] ? -1 : age)).filter(age => age >= 0)).toEqual([44]);
  }, 240000);
});
