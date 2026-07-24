import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import receiptData from "../src/data/gen/battle-script-move-end-delegates.json" with { type: "json" };

const requestedModes = [
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_SYNCHRONIZE" },
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_ON_DAMAGE" },
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_IMMUNITY" },
  { helper: "AbilityBattleEffects", mode: "ABILITYEFFECT_ATK_SYNCHRONIZE" },
  { helper: "ItemBattleEffects", mode: "ITEMEFFECT_MOVE_END" },
  { helper: "ItemBattleEffects", mode: "ITEMEFFECT_KINGSROCK_SHELLBELL" },
] as const;

type SourceRange = {
  startLine: number;
  endLine: number;
  textSha256: string;
  rawLines: Array<{ line: number; raw: string }>;
};
type ReceiptCase = {
  helper: string;
  mode: string;
  source: SourceRange;
  lexicalFacts: {
    randomSites: unknown[];
    controllerEmissions: unknown[];
    pendingMarks: unknown[];
    scriptTransfers: unknown[];
    loops: unknown[];
    durableGlobalReferences: unknown[];
  };
};

const receipt = receiptData as {
  schema: string;
  source: { file: string; sha256: string };
  requestedModes: ReadonlyArray<{ helper: string; mode: string }>;
  helpers: Record<string, { source: SourceRange; sharedPrelude: SourceRange }>;
  cases: ReceiptCase[];
  counts: Record<string, number>;
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function assertSourceRange(sourceLines: string[], range: SourceRange): void {
  expect(range.rawLines.map(({ line }) => line)).toEqual(
    Array.from({ length: range.endLine - range.startLine + 1 }, (_, index) => range.startLine + index),
  );
  expect(range.rawLines.map(({ raw }) => raw)).toEqual(
    sourceLines.slice(range.startLine - 1, range.endLine),
  );
  expect(range.textSha256).toBe(sha256(range.rawLines.map(({ raw }) => raw).join("\n")));
}

describe("Cmd_moveend ability/item delegate source receipt", () => {
  it("regenerates byte-for-byte in a fresh isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-move-end-delegates-"));
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "tools/extract/extract-battle-script-move-end-delegates.ts",
        "--out-dir",
        outputDirectory,
      ],
      { stdio: "pipe" },
    );
    expect(readFileSync(join(outputDirectory, "battle-script-move-end-delegates.json"), "utf8"))
      .toBe(readFileSync("src/data/gen/battle-script-move-end-delegates.json", "utf8"));
  });

  it("pins the six and only six Cmd_moveend-selected helper modes", () => {
    expect(receipt.schema).toBe("battle-script-move-end-delegates/v1");
    expect(receipt.requestedModes).toEqual(requestedModes);
    expect(receipt.cases.map(({ helper, mode }) => ({ helper, mode }))).toEqual(requestedModes);
    expect(new Set(receipt.cases.map(({ mode }) => mode)).size).toBe(6);
    expect(receipt.counts).toMatchObject({
      requestedModes: 6,
      abilityModes: 4,
      itemModes: 2,
      randomSites: 7,
      controllerEmissions: 2,
      pendingMarks: 2,
      scriptTransfers: 42,
      loops: 4,
    });
  });

  it("preserves every selected case and shared helper range with exact source hashes", () => {
    const source = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const sourceLines = source.split("\n");
    expect(receipt.source).toEqual({ file: "src/battle_util.c", sha256: sha256(source) });
    for (const helper of Object.values(receipt.helpers)) {
      assertSourceRange(sourceLines, helper.source);
      assertSourceRange(sourceLines, helper.sharedPrelude);
    }
    for (const entry of receipt.cases) {
      assertSourceRange(sourceLines, entry.source);
      expect(entry.source.rawLines[0]?.raw).toContain(`case ${entry.mode}:`);
      expect(entry.lexicalFacts.durableGlobalReferences.length).toBeGreaterThan(0);
    }
    expect(receipt.cases.find(({ mode }) => mode === "ABILITYEFFECT_ON_DAMAGE")?.lexicalFacts.randomSites)
      .toHaveLength(6);
    expect(receipt.cases.find(({ mode }) => mode === "ITEMEFFECT_KINGSROCK_SHELLBELL")?.lexicalFacts.randomSites)
      .toHaveLength(1);
    expect(receipt.cases.find(({ mode }) => mode === "ABILITYEFFECT_IMMUNITY")?.lexicalFacts.controllerEmissions)
      .toHaveLength(1);
    expect(receipt.cases.find(({ mode }) => mode === "ITEMEFFECT_MOVE_END")?.lexicalFacts.pendingMarks)
      .toHaveLength(1);
  });
});
