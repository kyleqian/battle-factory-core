import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

describe("MOVE_NEEDLE_ARM complete dense evidence", () => {
  it("pins both legal Level-50 Scene-ON orientation receipts", () => {
    for (const [path, evidence, raw] of [
      [
        "tools/compare/fixtures/needle-arm-player-cacnea-opponent-onix.json",
        "f6f26ca98a0aea08c1bd5c9fef4553443c93c260d829ed0609c41ef26935d10c",
        "bbb4ea8404fbde111de1c1dfe91d45d47033b2f0522754695d4d7ed5f21db0f6",
      ],
      [
        "tools/compare/fixtures/needle-arm-opponent-cacnea-player-onix.json",
        "75a2df84d96ea99f2cb2b584a67a338d419c565a14c7bc726f7bf7a8aaf20470",
        "291b07d72166df08330fd95741f84ea0d14918c57602114968143ca9bd48d1e1",
      ],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("needle-arm-portable-evidence/v1");
      expect(fixture.sourceWindow).toEqual({
        startFrame: 223, endFrame: 330, frameCount: 108,
      });
      expect(fixture.lifecycleCounts).toEqual({
        gNeedleArmSpikeSpriteTemplate: 20,
      });
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
      expect(fixture.attacker.species).toBe("CACNEA");
      expect(fixture.target.species).toBe("ONIX");
    }
  });

  it("normalizes only the asserted-empty compact transport capture list", () => {
    const fresh = {
      schema: "needle-arm-test",
      setup: {
        preCheckpointCaptures: [],
        name: "é",
        nested: { value: 1 },
      },
      rows: [0, true, "line\n"],
    };
    const compact = "{\"schema\":\"needle-arm-test\",\"setup\":{\"name\":\"\\u00e9\",\"nested\":{\"value\":1}},\"rows\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(compact).digest("hex"),
    );
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });
});
