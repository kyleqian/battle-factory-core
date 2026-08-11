import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_SWORDS_DANCE source contract", () => {
  it("pins its exclusive interval, first flash-tag representative, and lowest carrier", () => {
    const output = execFileSync("node", ["--experimental-strip-types", "tools/compare/swordsDanceSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("0x082caaa4..0x082caaea (0x46 bytes)");
    expect(output).toContain("lowest legal Level-50 carrier set 137 FRONTIER_MON_FARFETCHD");
  });

  it("re-extracts the source sword asset byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-swords-dance-asset-"));
    const output = join(scratch, "battle-anim-sword.json");
    execFileSync("node", ["--experimental-strip-types", "tools/extract/extract-swords-dance-assets.ts", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/assets/gen/battle-anim-sword.json"));
  });

  it("pins complete bilateral dense Scene-ON receipts", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/swords-dance-receipts.json", "utf8"));
    expect(receipt).toMatchObject({
      schema: "swords-dance-exact-receipts/v1",
      oracleProfile: "battle-scene-on",
      move: "SWORDS_DANCE",
      status: "exact",
    });
    expect(receipt.orientations.map((entry: { orientation: string; frameCount: number }) => [entry.orientation, entry.frameCount])).toEqual([
      ["player-back", 70],
      ["opponent-front", 70],
    ]);
    for (const entry of receipt.orientations) {
      expect(readFileSync(entry.changeMap, "utf8")).toContain("70 frames");
    }
  });
});
