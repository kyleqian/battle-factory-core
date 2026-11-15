// hie2 (ISSUES #220 step 2): the Scene ON HELD_ITEM_EFFECT general-animation's render view (battleScene.ts generalAnimationRenderView).
import { describe, expect, it } from "vitest";
import { sitrusRotationAtAge, sitrusStarPlacementAtAge, sitrusTintCoeffAtAge } from "../src/animation/heldItemHeal.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../src/engine/liveMoveAnimation.ts";
import type { BattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { generalAnimationRenderView } from "../src/engine/battleScene.ts";

const RATTATA = 19, ONIX = 95;
const fieldArt = createBattleCommandFieldArtView({ player: { species: RATTATA }, opponent: { species: ONIX } } as never);

function view(battler: 0 | 1, age: number, animation = "HELD_ITEM_EFFECT"): BattleResolutionPresentationRenderView {
  return { fieldArt, effect: { type: "general-animation", battler, animation, age } } as unknown as BattleResolutionPresentationRenderView;
}

describe("hie2: HELD_ITEM_EFFECT render view", () => {
  it("is null before age 0 and for an unknown general animation", () => {
    expect(generalAnimationRenderView(view(0, -1))).toBeNull();
    expect(generalAnimationRenderView(view(0, 10, "NOT_AN_ANIMATION"))).toBeNull();
  });

  it("player: rotation from the table, centre at the pic offset point, no tint before age 168, no extra sprites", () => {
    const row = generalAnimationRenderView(view(0, 5))!;
    expect(row.sprites).toEqual([]);
    expect(row.heldItem).toEqual({ side: "player", rotation: sitrusRotationAtAge(5), center: liveBattlerAnchors("player", fieldArt).picOffsetPoint, age: 5 });
    expect(row.view.fieldArt.player.pic.palette).toBe(fieldArt.player.pic.palette);
  });

  it("opponent mirrors the player's rotation (pb / pc negated, y2 equal) and hides the shadow while the script runs", () => {
    for (const age of [3, 20, 40, 70]) {
      const p = sitrusRotationAtAge(age, false), o = sitrusRotationAtAge(age, true);
      if (p === null) { expect(o).toBeNull(); continue; }
      expect(o).toEqual({ pa: p.pa, pb: -p.pb, pc: -p.pc, pd: p.pd, y2: p.y2 });
    }
    const row = generalAnimationRenderView(view(1, 30))!;
    expect(row.heldItem!.side).toBe("opponent");
    expect(row.heldItem!.center).toEqual(liveBattlerAnchors("opponent", fieldArt).picOffsetPoint);
    expect(row.view.postBodyShadowHidden).toBe(true);
    expect(generalAnimationRenderView(view(1, 199))!.view.postBodyShadowHidden).toBeFalsy();
    expect(generalAnimationRenderView(view(0, 30))!.view.postBodyShadowHidden).toBeFalsy();
  });

  it("the stars flip dx on the opponent side; the tint blends only the animated battler's palette (ages 168..187)", () => {
    const center = { x: 72, y: 88 };
    const player = sitrusStarPlacementAtAge(110, 0, center, false), opponent = sitrusStarPlacementAtAge(110, 0, center, true);
    expect(player).not.toBeNull();
    expect(player!.cx - 72 + 16).toBe(-(opponent!.cx - 72 + 16));
    const age = [168, 169, 175, 180, 186].find((a) => sitrusTintCoeffAtAge(a) > 0)!;
    const tinted = generalAnimationRenderView(view(0, age))!;
    expect(tinted.view.fieldArt.player.pic.palette).not.toBe(fieldArt.player.pic.palette);
    expect(tinted.view.fieldArt.opponent.pic.palette).toBe(fieldArt.opponent.pic.palette);
    const opp = generalAnimationRenderView(view(1, age))!;
    expect(opp.view.fieldArt.opponent.pic.palette).not.toBe(fieldArt.opponent.pic.palette);
    expect(opp.view.fieldArt.player.pic.palette).toBe(fieldArt.player.pic.palette);
  });
});
