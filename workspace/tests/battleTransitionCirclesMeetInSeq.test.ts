// Slice S2 (docs/brain-transition-wiring-design.md): Tier-1 pins for
// B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ (table idx 8, id 38) - gold's
// real transition per the design's §1 pixel identification + §5's S0 RNG
// cross-check MATCH. Renderer only, landed UNWIRED this slice - no brain
// walk-up window is expected to move (nothing in production yet constructs
// a transitionPresentation with transitionId 38; battleRoom.ts/
// factoryRoundBattleOrchestrator.ts are untouched, see S3).
//
// Source: CirclesMeetInSeq_CreateSprites (battle_transition_frontier.c:
// 537-555) - same 3 targets as plain CIRCLES_MEET (120,45)/(89,97)/(151,97),
// doubled per-tick speed (4px vs MEET's 2px), and each circle created on
// its own task-timer tick (0/16/32, a real 16-tick stagger - the "distinctive
// feature" the design's §1 widened gold captures showed) instead of all
// three at once. Params pre-extracted at
// src/data/gen/battle-transitions-frontier.json table[8].params.sprites -
// asserted against that JSON directly below so this pin can't silently
// drift from the extractor's own output.
//
// Anchor: reuses CIRCLE_ANCHOR_TE (trace tick 921, battleTransition.ts's
// own pixel-verified MEET anchor) as the base "CreateSprites state begins"
// tick - Circles_Init (state 0) is byte-identical source across every
// circles family including this one, so the same relative handoff applies
// once rebased onto a shared clock. This is a source-derived default, NOT
// yet independently pixel-fit against gold's own dense trace (no per-tick
// capture exists yet - see design doc §1's "medium confidence... sparse
// eyeballing" caveat) - S3/S4 tighten this once the renderer is wired and
// oracle-comparable.
import { describe, expect, it } from "vitest";
import meta from "../src/data/gen/battle-transitions-frontier.json" with { type: "json" };
import {
  applyBattleTransitionOverlay,
  circlesMeetInSeqCircleCenter,
  frontierTransitionRenderKind,
} from "../src/engine/battleTransition.ts";

const ANCHOR_TE = 921 - 843; // 78, shared with circleCenter's own anchor (battleTransition.test.ts)

describe("battle-transitions-frontier.json table[8] (CIRCLES_MEET_IN_SEQ) params", () => {
  const entry = meta.table.find((t) => t.id === 38)!;

  it("is CirclesMeetInSeq_CreateSprites, staggered 16 ticks/circle", () => {
    expect(entry.name).toBe("B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ");
    expect(entry.family).toBe("circlesSlideInSeq");
    expect(entry.params.staggerFrames).toBe(16);
  });

  it("has doubled-speed sprites matching this module's own spec table", () => {
    const byAnim = Object.fromEntries(entry.params.sprites!.map((s) => [s.anim, s]));
    expect(byAnim.top).toMatchObject({ startX: 120, startY: -51, speedX: 0, speedY: 4, createOnTimer: 0 });
    expect(byAnim.left).toMatchObject({ startX: -7, startY: 193, speedX: 4, speedY: -4, createOnTimer: 16 });
    expect(byAnim.right).toMatchObject({ startX: 247, startY: 193, speedX: -4, speedY: -4, createOnTimer: 32 });
  });
});

describe("circlesMeetInSeqCircleCenter (CirclesMeetInSeq_CreateSprites, anchor trace tick 921 + 0/16/32 stagger)", () => {
  it("is null before its own creation tick (the 16-tick-per-circle stagger)", () => {
    expect(circlesMeetInSeqCircleCenter("top", ANCHOR_TE - 1)).toBeNull();
    expect(circlesMeetInSeqCircleCenter("left", ANCHOR_TE + 15)).toBeNull();
    expect(circlesMeetInSeqCircleCenter("right", ANCHOR_TE + 31)).toBeNull();
  });

  it("appears at its off-screen creation position exactly on its own timer tick", () => {
    expect(circlesMeetInSeqCircleCenter("top", ANCHOR_TE)).toEqual({ x: 120, y: -51 });
    expect(circlesMeetInSeqCircleCenter("left", ANCHOR_TE + 16)).toEqual({ x: -7, y: 193 });
    expect(circlesMeetInSeqCircleCenter("right", ANCHOR_TE + 32)).toEqual({ x: 247, y: 193 });
  });

  it("only top is visible mid-way through the stagger window (te = anchor+10)", () => {
    expect(circlesMeetInSeqCircleCenter("top", ANCHOR_TE + 10)).not.toBeNull();
    expect(circlesMeetInSeqCircleCenter("left", ANCHOR_TE + 10)).toBeNull();
    expect(circlesMeetInSeqCircleCenter("right", ANCHOR_TE + 10)).toBeNull();
  });

  it("moves by its doubled per-tick delta - checkpoint at own-creation+10", () => {
    expect(circlesMeetInSeqCircleCenter("top", ANCHOR_TE + 10)).toEqual({ x: 120, y: -11 });
    expect(circlesMeetInSeqCircleCenter("left", ANCHOR_TE + 16 + 10)).toEqual({ x: 33, y: 153 });
    expect(circlesMeetInSeqCircleCenter("right", ANCHOR_TE + 32 + 10)).toEqual({ x: 207, y: 153 });
  });

  it("reaches its fixed target after a 24-tick slide (halved from MEET's 48, doubled speed) and holds", () => {
    for (const extra of [0, 1, 66]) {
      expect(circlesMeetInSeqCircleCenter("top", ANCHOR_TE + 24 + extra)).toEqual({ x: 120, y: 45 });
      expect(circlesMeetInSeqCircleCenter("left", ANCHOR_TE + 16 + 24 + extra)).toEqual({ x: 89, y: 97 });
      expect(circlesMeetInSeqCircleCenter("right", ANCHOR_TE + 32 + 24 + extra)).toEqual({ x: 151, y: 97 });
    }
  });
});

describe("frontierTransitionRenderKind registration (transitionId 38)", () => {
  it("maps id 38 to circlesMeetInSeq, distinct from the id-34 circlesMeet fallback", () => {
    const presentation = {
      tableIndex: 8,
      transitionId: 38,
      transitionName: "B_TRANSITION_FRONTIER_CIRCLES_MEET_IN_SEQ",
      family: "circlesSlideInSeq",
      raw: 0,
    };
    expect(frontierTransitionRenderKind(presentation, "circlesMeet")).toBe("circlesMeetInSeq");
    expect(frontierTransitionRenderKind(undefined, "circlesMeet")).toBe("circlesMeet");
  });
});

describe("applyBattleTransitionOverlay(\"circlesMeetInSeq\") - same interface as the other registered kinds", () => {
  function blankFramebuffer(): Uint8Array {
    const fb = new Uint8Array(240 * 160 * 4);
    for (let i = 0; i < fb.length; i += 4) {
      fb[0 + i] = 10;
      fb[1 + i] = 20;
      fb[2 + i] = 30;
      fb[3 + i] = 255;
    }
    return fb;
  }

  it("is a no-op pixel-wise before the top circle's own creation tick", () => {
    const before = blankFramebuffer();
    const fb = blankFramebuffer();
    applyBattleTransitionOverlay(fb, ANCHOR_TE - 1, "circlesMeetInSeq");
    expect(fb).toEqual(before);
  });

  it("draws once the top circle exists, without throwing, and stays deterministic", () => {
    const fbA = blankFramebuffer();
    const fbB = blankFramebuffer();
    applyBattleTransitionOverlay(fbA, ANCHOR_TE + 20, "circlesMeetInSeq");
    applyBattleTransitionOverlay(fbB, ANCHOR_TE + 20, "circlesMeetInSeq");
    expect(fbA).toEqual(fbB);
    expect(fbA).not.toEqual(blankFramebuffer());
  });
});
