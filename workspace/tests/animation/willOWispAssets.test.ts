import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_WILL_O_WISP source assets", () => {
  it("reproduces both Wisp sheets from the pinned source checkout", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractWillOWispAssets.ts", "--check"], { encoding: "utf8" }))
      .toContain("match authoritative sources");
  });
});
