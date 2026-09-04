import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

describe("ANIM_TAG_FINGER source checkpoint", () => {
  it("pins the lowest suitable Level-50 set and distinguishes Follow Me", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/metronomeSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 227/FRONTIER_MON_CHANSEY_1 -> SPECIES_CHANSEY 113/move 118",
    );
    expect(output).toContain(
      "Follow Me sibling has gFollowMeFingerSpriteTemplate/AnimFollowMeFinger",
    );
  });

  it("normalizes only asserted-empty compact transport captures", () => {
    const fresh = {
      schema: "finger-metronome-test",
      setup: {
        preCheckpointCaptures: [],
        name: "é",
        nested: { value: 1 },
      },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"finger-metronome-test\",\"setup\":{\"name\":\"\\u00e9\",\"nested\":{\"value\":1}},\"rows\":[0,true,\"line\\n\"]}\n";
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
  });
});
