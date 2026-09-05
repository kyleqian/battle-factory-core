import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const coverage = JSON.parse(readFileSync(resolve(import.meta.dirname,
  "../../ANIMATION_COVERAGE.json"), "utf8")) as Record<string, any>;

describe("two-turn-semi-invulnerable independent acceptance track", () => {
  it("fulfills only after Fly, Bounce, and Dive each retain exact acceptance", () => {
    const statuses = Object.fromEntries(coverage.entries
      .filter((entry: any) => ["MOVE_FLY", "MOVE_BOUNCE", "MOVE_DIVE"].includes(entry.move))
      .map((entry: any) => [entry.move, entry.status]));
    expect(statuses).toEqual({ MOVE_DIVE: "exact", MOVE_BOUNCE: "exact", MOVE_FLY: "exact" });

    const track = coverage.componentTracks
      .find((entry: any) => entry.id === "two-turn-semi-invulnerable");
    expect(track).toMatchObject({
      representatives: ["MOVE_FLY", "MOVE_BOUNCE", "MOVE_DIVE"],
      fulfilled: true,
    });
    expect(track.goal).toContain("No body, latch, or acceptance transfers");
    expect(track.goal).toContain("all 419 rows twice with zero residual pixels");
  });
});
