import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_HYPNOSIS portable dense evidence", () => {
  it("keeps both immutable complete-window receipts wired", () => {
    const fixtures = [
      "tools/compare/fixtures/hypnosis-player-politoed-opponent-onix.json",
      "tools/compare/fixtures/hypnosis-opponent-politoed-player-onix.json",
    ].map((path) => JSON.parse(readFileSync(path, "utf8")));
    expect(fixtures.map((value) => value.sourceWindow.frameCount))
      .toEqual([169, 168]);
    expect(fixtures.map((value) => value.evidenceSha256))
      .toEqual([
        "6b164293b9a3ad086504808422b0f95ab07ccd84595eb87b3ca908e34189b0c4",
        "8baa59de6a99008bebd74e72b4089c6146f5f98fefd03ca7805a84412b4f100b",
      ]);
  });

  it.skip("reruns both orientations twice fresh (manual oracle acceptance)", () => {
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/hypnosisPortable.ts",
      "tools/compare/fixtures/hypnosis-player-politoed-opponent-onix.json",
      "tools/compare/fixtures/hypnosis-opponent-politoed-player-onix.json",
    ]);
  });
});
