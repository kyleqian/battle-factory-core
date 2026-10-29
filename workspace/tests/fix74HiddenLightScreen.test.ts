import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_NO_HIDDEN_SIDES, liveMoveAnimationPresentation, liveMoveAnimationPresentationProven, liveMoveHiddenSides, liveMoveHiddenTargetDeclines,
} from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// fix74 (docs/fix74-bulk-up-light-screen.md): Light Screen 113 by the PLAYER while the opponent is hidden (audit 18's Dive setup span)
// is a TIMING-PHASE: the ROM skips the age-68 / 69 lag frames when the opponent sprite is invisible (audit-18 receipts/lag.txt: [] vs
// [68, 69]), 148 px over ages 69..81. It fails closed like Sky Uppercut at a hidden target; the opponent's Light Screen with the player
// hidden keeps the visible lag profile (0 px in audit 18) and stays live. apx222: the PROVEN body still declines; the production
// presentation draws the body approximately (hidden battler kept hidden).
const FIXTURES = "tools/integration/fixtures/audit-18/fixtures";
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, "utf8")) as Fixture & { rom: { invisible: boolean[] } };

const presents = (name: string, hidden: { player: boolean; opponent: boolean }, present = liveMoveAnimationPresentationProven) => {
  const v = liveView(fixture(name), 0);
  const e = v.effect!;
  if (e.type !== "move") throw new Error("expected a move effect");
  expect(e.request.moveId).toBe(113);
  // A known order lend so the presentation's own gates do not decline first (Light Screen is order-independent either way).
  const order = { known: true as const, free: [4, 3, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] };
  return present(e.request, v.field, 0, e.paletteInput, e.spriteAllocatorInput, order, e.presentationRng,
    e.battlerX2Input, hidden) !== null;
};

describe("fix74: Light Screen by the player at a hidden opponent fails closed", () => {
  for (const name of ["dive-snorlax-light-screen-ply-c0", "dive-golem-light-screen-ply-c0"]) {
    it(`${name}: the ROM hid the opponent; the body declines (live with no hide)`, () => {
      expect(fixture(name).rom.invisible).toEqual([false, true]);
      const v = liveView(fixture(name), 0);
      const e = v.effect!;
      if (e.type !== "move") throw new Error("expected a move effect");
      const hidden = liveMoveHiddenSides({ player: { sprite: true }, opponent: { sprite: false } }, e.request);
      expect(hidden).toEqual({ player: false, opponent: true });
      expect(liveMoveHiddenTargetDeclines(e.request, hidden)).toBe(true);
      expect(presents(name, hidden)).toBe(false);
      // apx222: the production presentation retries with the approximate hidden-target flag and draws the body.
      expect(presents(name, hidden, liveMoveAnimationPresentation)).toBe(true);
      expect(presents(name, LIVE_MOVE_NO_HIDDEN_SIDES)).toBe(true);
    });
  }

  for (const name of ["dive-snorlax-light-screen-opp-c0", "dive-golem-light-screen-opp-c0"]) {
    it(`${name}: the opponent's Light Screen with the player hidden stays live`, () => {
      expect(fixture(name).rom.invisible).toEqual([true, false]);
      const hidden = { player: true, opponent: false };
      const e = liveView(fixture(name), 0).effect!;
      if (e.type !== "move") throw new Error("expected a move effect");
      expect(liveMoveHiddenTargetDeclines(e.request, hidden)).toBe(false);
      expect(presents(name, hidden)).toBe(true);
    });
  }

  it("the decline is keyed on the hidden opponent, not on which two-turn move hid it, and on Light Screen / Sky Uppercut only", () => {
    const ply = { attacker: 0, target: 0, moveId: 113 } as never, opp = { attacker: 1, target: 1, moveId: 113 } as never;
    expect(liveMoveHiddenTargetDeclines(ply, { player: false, opponent: true })).toBe(true);
    expect(liveMoveHiddenTargetDeclines(ply, LIVE_MOVE_NO_HIDDEN_SIDES)).toBe(false);
    expect(liveMoveHiddenTargetDeclines(opp, { player: true, opponent: false })).toBe(false);
    for (const moveId of [215, 219, 334, 339]) {
      expect(liveMoveHiddenTargetDeclines({ attacker: 0, target: 0, moveId } as never, { player: false, opponent: true })).toBe(false);
    }
  });
});
