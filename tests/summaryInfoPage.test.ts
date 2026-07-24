// Hermetic Tier-1 regression test for the S4 Info-page compositor
// (src/engine/summaryInfoPage.ts): pins the engine's output against
// committed src/assets/gen + src/data/gen artifacts only - no oracle, no
// emulator. Complements (does not replace) the oracle pixel comparison in
// `npm run compare -- tools/compare/traces/summary-info-onix.json`.

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  renderSummaryBattleMovesPage,
  renderSummaryInfoPage,
  renderSummaryInfoPageFaded,
} from "../src/engine/summaryInfoPage.ts";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../src/engine/framebuffer.ts";

describe("summary Info page render", () => {
  it("renders a fully-opaque 240x160 RGBA frame for every anchor rental slot", () => {
    for (let slot = 0; slot < 6; slot += 1) {
      const fb = renderSummaryInfoPage(slot);
      expect(fb.length).toBe(SCREEN_WIDTH * SCREEN_HEIGHT * 4);
      for (let i = 3; i < fb.length; i += 4) {
        expect(fb[i]).toBe(255);
      }
    }
  });

  it("is deterministic across repeated renders of the same slot", () => {
    const a = renderSummaryInfoPage(0);
    const b = renderSummaryInfoPage(0);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("renders a different frame per slot (species-specific art/text)", () => {
    const onix = renderSummaryInfoPage(0);
    const magby = renderSummaryInfoPage(1);
    expect(Buffer.from(onix).equals(Buffer.from(magby))).toBe(false);
  });

  it("owns a deterministic, fully opaque Battle Moves page for the selected rental", () => {
    const onix = renderSummaryBattleMovesPage(0, 30);
    const onixAgain = renderSummaryBattleMovesPage(0, 30);
    const magby = renderSummaryBattleMovesPage(1, 30);
    expect(onix.length).toBe(SCREEN_WIDTH * SCREEN_HEIGHT * 4);
    expect(Buffer.from(onix).equals(Buffer.from(onixAgain))).toBe(true);
    expect(Buffer.from(onix).equals(Buffer.from(magby))).toBe(false);
    for (let i = 3; i < onix.length; i += 4) expect(onix[i]).toBe(255);
  });

  it("renderSummaryInfoPageFaded(slot, 0, 0) matches the unfaded render exactly", () => {
    const flat = renderSummaryInfoPage(2);
    const faded = renderSummaryInfoPageFaded(2, 0, 0);
    expect(Buffer.from(flat).equals(Buffer.from(faded))).toBe(true);
  });

  it("fading toward black (bgY=16, objY=16) darkens every opaque pixel", () => {
    const flat = renderSummaryInfoPage(0);
    const faded = renderSummaryInfoPageFaded(0, 16, 16);
    for (let i = 0; i < flat.length; i += 4) {
      expect(faded[i]!).toBeLessThanOrEqual(flat[i]!);
      expect(faded[i + 1]!).toBeLessThanOrEqual(flat[i + 1]!);
      expect(faded[i + 2]!).toBeLessThanOrEqual(flat[i + 2]!);
    }
  });

  it("pins slot 0 (ONIX)'s current render byte-for-byte (update deliberately, not accidentally)", () => {
    const fb = renderSummaryInfoPage(0);
    const hash = createHash("sha256").update(fb).digest("hex");
    expect(hash).toBe("b9d8ab9c6363ea204a036a11e73e78dd084a9ece300ccd69b1f67093b23f76a3");
  });
});
