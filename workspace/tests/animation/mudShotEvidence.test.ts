import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

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

  it("requires and removes only the asserted-empty compact transport field", () => {
    const fresh = {
      schema: "mud-shot-transport-test",
      setup: {
        preCheckpointCaptures: [],
        name: "é",
        nested: { value: 1 },
      },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"mud-shot-transport-test\",\"setup\":{\"name\":\"\\u00e9\",\"nested\":{\"value\":1}},\"rows\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(historic).digest("hex"),
    );
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { name: "é", nested: { value: 1 } },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(readFileSync("tools/compare/mudShotPortableEvidence.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256(probe)");
  });
});
