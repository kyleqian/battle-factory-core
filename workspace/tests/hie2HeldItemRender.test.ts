// hie2 (ISSUES #220 step 2): the Scene ON HELD_ITEM_EFFECT general-animation's render view (battleScene.ts generalAnimationRenderView).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
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

  it("opponent: mirrored pb / pc, the entry one even step before (out) / after (back) on odd steps, y2 of that entry; shadow hidden while the script runs", () => {
    const mirror = (p: NonNullable<ReturnType<typeof sitrusRotationAtAge>>) => ({ pa: p.pa, pb: -p.pb, pc: -p.pc, pd: p.pd, y2: p.y2 });
    for (const age of [2, 14, 16, 18, 30, 34, 66]) {
      const p = sitrusRotationAtAge(age, false)!;
      expect(sitrusRotationAtAge(age, true), `even age ${age}`).toEqual(mirror(p));
    }
    expect(sitrusRotationAtAge(1, true)).toBeNull();
    expect(sitrusRotationAtAge(31, true)).toBeNull();
    expect(sitrusRotationAtAge(15, true)).toEqual(mirror(sitrusRotationAtAge(14, false)!));
    expect(sitrusRotationAtAge(17, true)).toEqual(mirror(sitrusRotationAtAge(18, false)!));
    expect(sitrusRotationAtAge(29, true)).toEqual(mirror(sitrusRotationAtAge(30, false)!));
    expect(sitrusRotationAtAge(96, true)).toBeNull();
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

// hie2b: the animation's age 0 is the command's length less the ROM's first-glyph age (204), measured on each lab's drift-free alignment
// (docs/hie2-held-item-render.md); the cure berry's is negative (its animation starts inside the preceding status command).
describe("hie2b: HELD_ITEM_EFFECT epoch", () => {
  const appTracePath = "../tools/compare/appTrace.ts";
  async function ageAtCommandStart(id: string): Promise<number> {
    const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: never) => never> };
    const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8"));
    let state: ReturnType<typeof createInitialState> = createInitialState({ appRoute: trace.appRoute, battleScene: "on" });
    state = APP_STAGES[id]!(state as never) as never;
    for (const advance of traceAdvances(trace.segments)) {
      state = tick(state, advance.buttons);
      const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      const command = resolution?.segments[0]?.commands[resolution.commandIndex];
      if (resolution !== undefined && resolution !== null && command?.type === "general-animation" && command.animation === "HELD_ITEM_EFFECT"
        && resolution.lifecycle.phaseElapsed === 0) {
        return (createBattleResolutionPresentationRenderView(resolution).effect as { age: number }).age;
      }
    }
    throw new Error(`${id}: no HELD_ITEM_EFFECT command`);
  }

  for (const [id, age] of [
    ["hie1-sitrus-on", -25], ["hie2-sitrus-opp-on", -25], ["hie1-leftovers-on", -25], ["hie1-shellbell-on", -19], ["hie1-cheri-on", 12],
  ] as const) {
    it(`${id}: age ${age} at the command's first frame`, async () => {
      expect(await ageAtCommandStart(id)).toBe(age);
    }, 60000);
  }
});
