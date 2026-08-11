import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("MOVE_MUD_SHOT source evidence", () => {
  it("pins the legal carrier, 22-orb body, sinus task, shakes, and Secret Power branch", () => {
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/compare/mudShotSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain(
      "set 111/species 98/move 341; 11×2 BROWN_ORB",
    );
    expect(output).toContain("Secret Power building->Strength");
  });
});
