import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import audit from "../src/data/gen/printfromtable-family-audit.json" with { type: "json" };

describe("Cmd_printfromtable family audit", () => {
  it("pins the complete source pointer universe and finite table shapes", () => {
    expect(audit.schema).toBe("printfromtable-family-audit/v1");
    expect(audit.counts).toEqual({
      printfromtableOccurrences: 73,
      tablePointers: 43,
      entries: 145,
      producers: 73,
    });
    expect(audit.families).toHaveLength(43);
    expect(audit.families.every((family) => family.length === family.entries.length)).toBe(true);
    for (const family of audit.families) {
      expect(family.entries.map((entry) => entry.index)).toEqual(
        [...Array(family.length).keys()],
      );
      expect(family.entries.every((entry) => entry.stringId.id >= 0)).toBe(true);
      expect(family.producers.length).toBeGreaterThan(0);
      expect(family.producers.every((producer) => producer.citations.length > 0)).toBe(true);
    }
    expect(audit.families.find((family) => family.pointer === "gMistUsedStringIds")?.producers[0]?.scope)
      .toBe("legal-widened-scope-factory-singles");
    expect(audit.families.find((family) => family.pointer === "gWeatherStartsStringIds")?.length).toBe(16);
    expect(audit.families.find((family) => family.pointer === "gNoEscapeStringIds")?.producers[0]?.scope)
      .toBe("excluded-wild");
    expect(audit.families.find((family) => family.pointer === "gBattlePalaceFlavorTextTable")?.producers[0]?.scope)
      .toBe("excluded-palace");
  });

  it("regenerates the committed JSON byte-for-byte", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-printfromtable-audit-"));
    const output = join(outputDirectory, "audit.json");
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "tools/extract/extract-printfromtable-family-audit.ts", "--out", output],
      { stdio: "pipe" },
    );
    expect(readFileSync(output, "utf8")).toBe(
      readFileSync("src/data/gen/printfromtable-family-audit.json", "utf8"),
    );
  });

  // Scout-time (2026-08-08) this pinned 40 registered tables with three
  // missing families; all three landed by 2026-08-09, leaving only the short
  // stat-up table below.
  it("pins the remaining production gap as the one short stat-up table", () => {
    const production = readFileSync("src/engine/battleScriptHitChainOpcode.ts", "utf8");
    const registered = [...production.matchAll(/^  (g\w+(?:StringIds|Table)): Object\.freeze\(/gm)].map((match) => match[1]);
    const source = audit.families.map((family) => family.pointer);
    expect(registered).toHaveLength(43);
    expect(source.filter((pointer) => !registered.includes(pointer))).toEqual([]);
    const statUpStart = production.indexOf("gStatUpStringIds: Object.freeze([");
    const statUpEnd = production.indexOf("  ]),", statUpStart);
    expect(statUpStart).toBeGreaterThanOrEqual(0);
    expect(production.slice(statUpStart, statUpEnd).match(/STRINGID_/g)).toHaveLength(5);
    expect(audit.families.find((family) => family.pointer === "gStatUpStringIds")?.entries).toHaveLength(6);
  });
});
