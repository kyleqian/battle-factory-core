import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import {
  LIVE_MOVE_NO_HIDDEN_SIDES, liveMoveAnimationPresentation, liveMoveAnimationPresentationProven, liveMoveHiddenSides, liveMoveHiddenTargetDeclines,
} from "../src/engine/liveMoveAnimation.ts";
import type { BattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// hide66 (ISSUES #159, docs/hide66-hidden-battler.md): while a Fly / Bounce / Dig / Dive charger is semi-invulnerable its ROM sprite is
// `invisible`; the live body of the OTHER battler must not draw it. Audit-17 consumer fixtures (SNORLAX hidden, CHANSEY consumer).
const FIXTURES = "tools/integration/fixtures/audit-17/fixtures";
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, "utf8")) as Fixture & { denseWindow: { startFrame: number; endFrame: number } };
// A known first-body order lend (the dt60 test's), so the order-dependent consumer presents live without replaying the history.
const ORDER = { known: true as const, free: [4, 3, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] };

type View = BattleResolutionPresentationRenderView;
const withHidden = (view: View, side: "player" | "opponent", hidden: boolean): View => ({
  ...view,
  visibility: { ...view.visibility, [side]: { ...view.visibility[side], sprite: !hidden } },
  effect: view.effect?.type === "move" ? { ...view.effect, spriteOrderInput: ORDER } : view.effect,
});
const render = (view: View) => {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return fb;
};

describe("hide66: live bodies do not draw a hidden (semi-invulnerable) battler", () => {
  it("hides only the non-attacker side (a hidden battler's own strike body reveals itself)", () => {
    const shown = { sprite: true }, hidden = { sprite: false };
    const request = { attacker: 0, target: 1, moveId: 215 } as never;
    expect(liveMoveHiddenSides({ player: shown, opponent: shown }, request)).toBe(LIVE_MOVE_NO_HIDDEN_SIDES);
    expect(liveMoveHiddenSides({ player: shown, opponent: hidden }, request)).toEqual({ player: false, opponent: true });
    expect(liveMoveHiddenSides({ player: hidden, opponent: shown }, request)).toBe(LIVE_MOVE_NO_HIDDEN_SIDES);
    expect(liveMoveHiddenSides({ player: hidden, opponent: hidden }, { attacker: 1, target: 0, moveId: 19 } as never))
      .toEqual({ player: true, opponent: false });
  });

  for (const [name, hiddenSide, box] of [
    // CHANSEY (player) Heal Bell while the opponent SNORLAX is in the air: audit 17's 610,164-px window.
    ["fly-heal-bell-ply-c0", "opponent", { x0: 144, x1: 207, y0: 19, y1: 71 }],
    // CHANSEY (opponent) Double Team while the player SNORLAX is in the air: audit 17's 256,149-px window.
    ["fly-double-team-opp-c0", "player", { x0: 41, x1: 102, y0: 71, y1: 111 }],
  ] as const) {
    it(`${name}: the live body leaves the hidden ${hiddenSide} battler's pixels out`, () => {
      const f = fixture(name);
      const rows = f.denseWindow.endFrame - f.denseWindow.startFrame + 1;
      const v0 = withHidden(liveView(f, 0), hiddenSide, true);
      const e = v0.effect!;
      if (e.type !== "move") throw new Error("expected a move effect");
      const hiddenSides = liveMoveHiddenSides(v0.visibility, e.request);
      expect(hiddenSides[hiddenSide]).toBe(true);
      expect(liveMoveAnimationPresentation(e.request, v0.field, 0, e.paletteInput, e.spriteAllocatorInput, ORDER, e.presentationRng,
        e.battlerX2Input, hiddenSides)).not.toBeNull();
      let framesWithBattler = 0;
      for (let age = 0; age < rows; age += 5) {
        const view = liveView(f, age);
        const shown = render(withHidden(view, hiddenSide, false)), hidden = render(withHidden(view, hiddenSide, true));
        let differing = 0;
        for (let p = 0; p < 240 * 160; p++) {
          if (shown[p * 4] === hidden[p * 4] && shown[p * 4 + 1] === hidden[p * 4 + 1] && shown[p * 4 + 2] === hidden[p * 4 + 2]) continue;
          differing++;
          const x = p % 240, y = (p / 240) | 0;
          // Only the hidden battler's own sprite pixels may change.
          expect(x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1, `age ${age} pixel ${x},${y}`).toBe(true);
        }
        if (differing > 0) framesWithBattler++;
      }
      // Without hide66 the live path ignored view.visibility: every hidden frame equalled the shown one.
      expect(framesWithBattler).toBeGreaterThan(0);
    });
  }

  it("fails Sky Uppercut closed at a hidden target (the ROM skips its age-148/149 lag frames: no D4 phase policy)", () => {
    const f = fixture("fly-sky-uppercut-ply-c0");
    const v = liveView(f, 0);
    const e = v.effect!;
    if (e.type !== "move") throw new Error("expected a move effect");
    expect(e.request.moveId).toBe(327);
    const hidden = { player: false, opponent: true };
    expect(liveMoveHiddenTargetDeclines(e.request, hidden)).toBe(true);
    expect(liveMoveHiddenTargetDeclines(e.request, LIVE_MOVE_NO_HIDDEN_SIDES)).toBe(false);
    expect(liveMoveHiddenTargetDeclines({ ...e.request, moveId: 215 }, hidden)).toBe(false);
    expect(liveMoveAnimationPresentationProven(e.request, v.field, 0, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
      e.presentationRng, e.battlerX2Input, hidden)).toBeNull();
    // apx222: the production presentation draws the body approximately (the hidden battler stays hidden).
    expect(liveMoveAnimationPresentation(e.request, v.field, 0, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
      e.presentationRng, e.battlerX2Input, hidden)).not.toBeNull();
    // The fallback (scene-off) view renders, without the hidden battler.
    expect(() => render(withHidden(v, "opponent", true))).not.toThrow();
  });
});
