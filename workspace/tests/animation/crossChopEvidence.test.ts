import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

describe("MOVE_CROSS_CHOP source and asset checkpoint", () => {
  it("pins legal set 283 and the complete source component body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/crossChopSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("set 283/species 67/move 238; 2 HANDS_AND_FEET + 1 CROSS_IMPACT");
  });

  it("re-extracts only Machoke, hands, and Cross Impact byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "cross-chop-assets-"));
    const output = join(directory, "cross-chop.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractCrossChopAssets.ts", "--out", output], { stdio: "pipe" });
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/cross-chop.json"));
  });

  it("requires and removes only the asserted-empty compact transport field", () => {
    const fresh = {
      schema: "cross-chop-transport-test",
      setup: { preCheckpointCaptures: [], name: "\u00e9" },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"cross-chop-transport-test\",\"setup\":{\"name\":\"\\u00e9\"},\"rows\":[0,true,\"line\\n\"]}\n";
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
    expect(readFileSync("tools/compare/crossChopPortable.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256(probe)");
  });
});
