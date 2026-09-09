import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";
describe("MOVE_LEAF_BLADE source and asset checkpoint", () => {
  it("pins legal set 453 and its distinct complete source body", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/leafBladeSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("set 453/species 279/move 348; LEAF + CROSS_IMPACT");
  });
  it("re-extracts only Sceptile, Leaf, and Cross Impact byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "leaf-blade-assets-")); const output = join(directory, "leaf-blade.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractLeafBladeAssets.ts", "--out", output], { stdio: "pipe" });
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/leaf-blade.json"));
  });
  it("requires and removes only the asserted-empty compact transport field", () => {
    const fresh = {
      schema: "leaf-blade-transport-test",
      setup: { preCheckpointCaptures: [], name: "\u00e9" },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"leaf-blade-transport-test\",\"setup\":{\"name\":\"\\u00e9\"},\"rows\":[0,true,\"line\\n\"]}\n";
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
    expect(readFileSync("tools/compare/leafBladePortable.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256(probe)");
  });
  it("pins bilateral exact receipts, normalized maps, and the sole promotion", () => {
    const cases = [
      ["player-sceptile-opponent-onix", "5dcb5555738c51baf01032b7be3e67fa2f65c43ee133d7a440ae3f921c741369", "6ba2d80fc47d05832114a857ab1bacbed1e69352d577adadfbcd26d49e74f4ad"],
      ["opponent-sceptile-player-onix", "c2a599b0d4adaf7f807100908cf4d2a79210ccf38c00acc2aa88181db43578b5", "b85563f61d8681263728ac4becdf524b329854db31ca3a122257590e00285bed"],
    ] as const;
    for (const [name, evidence, raw] of cases) {
      const fixture = JSON.parse(readFileSync(`tools/compare/fixtures/leaf-blade-${name}.json`, "utf8"));
      expect(fixture).toMatchObject({
        schema: "leaf-blade-portable-evidence/v2",
        sourceWindow: { frameCount: 224 },
        evidenceSha256: evidence,
        rawRgbSha256: raw,
        lifecycleCounts: { leafBlade: 45, crossImpact: 1 },
      });
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(fixture.changeMapSha256);
    }
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(242);
    expect(coverage.entries.filter((entry: { move: string }) => entry.move === "MOVE_LEAF_BLADE"))
      .toEqual([expect.objectContaining({ status: "exact" })]);
  });
});
