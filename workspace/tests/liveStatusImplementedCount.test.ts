import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LIVE_MOVE_ANIMATION_IDS } from "../src/engine/liveMoveAnimation.ts";

// The preview manifest and the remaining-adapters census read `implementedCount`;
// it must agree with the entry list and the production registry.
describe("animation-integration live status count", () => {
  it("implementedCount equals the implemented entries and LIVE_MOVE_ANIMATION_IDS", () => {
    const status = JSON.parse(readFileSync(join(import.meta.dirname, "../docs/animation-integration-live-status.json"), "utf8"));
    const ids = (status.implementedAdapters as { id: number }[]).map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(status.implementedCount).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual([...LIVE_MOVE_ANIMATION_IDS].sort((a, b) => a - b));
  });
});
