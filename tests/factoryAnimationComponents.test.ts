import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import components from "../src/data/gen/battle-animation-components.json" with { type: "json" };

describe("battle animation component graph", () => {
  it("covers every move with a source-derived many-to-many dependency graph", () => {
    expect(components.schema).toBe("battle-animation-components/v1");
    expect(components.summary).toMatchObject({
      moves: 354,
      scriptBlocks: 658,
      components: 935,
      dependencyEdges: 3190,
    });
    const firePunch = components.moves.find((move) => move.move === "MOVE_FIRE_PUNCH");
    expect(firePunch?.componentIds).toEqual(expect.arrayContaining([
      "asset:ANIM_TAG_HANDS_AND_FEET",
      "sprite:gFireSpreadSpriteTemplate",
      "subroutine:FireSpreadEffect",
      "task:AnimTask_ShakeMon",
      "visualCommand:create_fist_sprite",
    ]));
  });

  it("reproduces the committed graph byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "animation-components-"));
    const output = join(directory, "components.json");
    try {
      execFileSync(
        process.execPath,
        [
          "--experimental-strip-types",
          "tools/extract/extract-battle-animation-components.ts",
          "--out",
          output,
        ],
        { stdio: "pipe" },
      );
      expect(readFileSync(output)).toEqual(
        readFileSync("src/data/gen/battle-animation-components.json"),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
