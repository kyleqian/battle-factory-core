import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

describe("MOVE_FOCUS_ENERGY source checkpoint", () => {
  it("pins the legal Taillow source set and complete shared-asset body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/focusEnergySourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("legal set 44/species 304/move 116; 3 EndureEffect calls × 5 FOCUS_ENERGY sprites");
    expect(output).toContain("white BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1)");
  });

  it("requires and removes only the asserted-empty compact transport field", () => {
    const fresh = {
      schema: "focus-energy-transport-test",
      setup: { preCheckpointCaptures: [], name: "\u00e9" },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"focus-energy-transport-test\",\"setup\":{\"name\":\"\\u00e9\"},\"rows\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(historic).digest("hex"),
    );
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { name: "\u00e9" },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(readFileSync("tools/compare/focusEnergyPortable.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256(probe)");
  });
});
