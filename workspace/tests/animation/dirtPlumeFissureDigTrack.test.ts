import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

describe("dirt-plume-fissure-dig component track", () => {
  it("is fulfilled only by independent exact Fissure and Dig acceptance", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Json;
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "dirt-plume-fissure-dig");
    expect(track).toMatchObject({
      components: ["asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate"],
      representatives: ["MOVE_FISSURE", "MOVE_DIG"],
      fulfilled: true,
    });
    expect(track.evidence).toEqual(expect.arrayContaining([
      "tests/animation/fissureEvidence.test.ts",
      "tests/animation/digActualCore.test.ts",
    ]));
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_FISSURE")).toMatchObject({ status: "exact" });
    const dig = coverage.entries.find((entry: Json) => entry.move === "MOVE_DIG");
    expect(dig).toMatchObject({ status: "exact" });
    expect(dig.covered.join("\n")).toContain("526/526");
    expect(dig.covered.join("\n")).toContain("MOVE_DIVE receives no Dig credit");
  });
});
