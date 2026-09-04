import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

describe("MOVE_ENDURE source checkpoint", () => {
  it("pins the legal Eevee source set and distinct red shared-asset body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/endureSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("legal Level-50 set 113/species 133/move 203; 3 EndureEffect calls × 5 FOCUS_ENERGY sprites");
    expect(output).toContain("red BlendColorCycle(2,2,0,11); attacker ShakeMon2(1,0,32,1)");
  });

  it("requires and removes only the asserted-empty compact transport field", () => {
    const fresh = {
      schema: "endure-transport-test",
      setup: { preCheckpointCaptures: [], name: "\u00e9" },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"endure-transport-test\",\"setup\":{\"name\":\"\\u00e9\"},\"rows\":[0,true,\"line\\n\"]}\n";
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
    expect(readFileSync("tools/compare/endurePortable.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256(probe)");
  });
});
