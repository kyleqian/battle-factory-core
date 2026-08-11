import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixturePaths = [
  "tools/compare/fixtures/night-shade-player-ariados-opponent-onix.json",
  "tools/compare/fixtures/night-shade-opponent-ariados-player-onix.json",
] as const;

describe("MOVE_NIGHT_SHADE bilateral exact evidence", () => {
  it("pins both complete receipts and change maps", () => {
    const fixtures = fixturePaths.map((path) => JSON.parse(readFileSync(path, "utf8")));
    expect(fixtures.map((fixture) => [fixture.orientation, fixture.sourceWindow.startFrame,
      fixture.sourceWindow.endFrame, fixture.sourceWindow.frameCount])).toEqual([
      ["player-back", 217, 444, 228],
      ["opponent-front", 218, 445, 228],
    ]);
    for (const fixture of fixtures) {
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(fixture.changeMapSha256);
    }
  });

  it("keeps the exact twice-fresh portable executable", () => {
    const portable = readFileSync("tools/compare/nightShadePortable.ts", "utf8");
    expect(portable).toContain("runNumber <= 2");
    expect(portable).toContain("framebuffer ${framebuffer}/228");
    expect(portable).toContain("if (failures.length && !checkpoint) throw");
  });
});
