import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogData from "../src/data/gen/factory-ai-script-catalog.json" with { type: "json" };
import policyData from "../src/data/gen/factory-ai-policy.json" with { type: "json" };

type Opcode = { value: number; hex: string; handler: string };
type Catalog = {
  schema: string;
  source: { policy: { sha256: string; schema: string } };
  masks: Array<{ mask: number; flags: string[]; labels: Array<{ name: string; sourceLine: number }> }>;
  graph: {
    roots: string[];
    labels: Array<{ order: number; name: string; sourceLine: number; root: boolean; instructions: Array<{ order: number; sourceLine: number; macro: string; operands: string[]; opcodes: Opcode[] }> }>;
    edges: Array<{ from: string; sourceLine: number; macro: string; kind: string; to: string }>;
  };
  dependencies: Array<Opcode & { macros: string[] }>;
};

const catalog = catalogData as Catalog;
const policy = policyData as { schema: string; branches: Array<{ mask: number; flags: string[] }> };
const extractor = ["--experimental-strip-types", "tools/extract/extract-factory-ai-script-catalog.ts"];

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("Battle Factory AI script catalogue extraction", () => {
  it("reproduces the committed source catalogue byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-ai-script-catalog-"));
    const output = join(directory, "catalog.json");
    try {
      execFileSync(process.execPath, [...extractor, "--out", output], { stdio: "pipe" });
      expect(readFileSync(output, "utf8")).toBe(readFileSync("src/data/gen/factory-ai-script-catalog.json", "utf8"));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("keeps the existing policy fixture intact while deriving exactly masks 1 and 7", () => {
    expect(policy.schema).toBe("factory-ai-policy/v1");
    expect(catalog.source.policy).toEqual({
      file: "src/data/gen/factory-ai-policy.json",
      sha256: sha256(readFileSync("src/data/gen/factory-ai-policy.json", "utf8")),
      schema: "factory-ai-policy/v1",
    });
    expect(catalog.masks).toEqual([
      { mask: 1, flags: ["AI_SCRIPT_CHECK_BAD_MOVE"], labels: [{ name: "AI_CheckBadMove", sourceLine: 18 }] },
      { mask: 7, flags: ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"], labels: [
        { name: "AI_CheckBadMove", sourceLine: 18 },
        { name: "AI_TryToFaint", sourceLine: 19 },
        { name: "AI_CheckViability", sourceLine: 20 },
      ] },
    ]);
    expect(policy.branches.filter((branch) => branch.mask === 1 || branch.mask === 7).map(({ mask, flags }) => ({ mask, flags }))).toEqual([
      { mask: 7, flags: ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"] },
      { mask: 1, flags: ["AI_SCRIPT_CHECK_BAD_MOVE"] },
      { mask: 7, flags: ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"] },
    ]);
  });

  it("preserves source order and makes only mask-selected scripts roots while retaining shared callees", () => {
    expect(catalog.schema).toBe("factory-ai-script-catalog/v1");
    expect(catalog.graph.roots).toEqual(["AI_CheckBadMove", "AI_TryToFaint", "AI_CheckViability"]);
    expect(catalog.graph.labels.map(({ order }) => order)).toEqual(catalog.graph.labels.map((_, order) => order));
    expect(catalog.graph.labels.filter(({ root }) => root).map(({ name }) => name).sort()).toEqual([...catalog.graph.roots].sort());
    const sharedScore = catalog.graph.labels.find(({ name }) => name === "Score_Minus10");
    expect(sharedScore).toMatchObject({ root: false, sourceLine: 620 });
    expect(catalog.graph.edges).toContainEqual(expect.objectContaining({ to: "Score_Minus10", kind: "branch" }));
    expect(catalog.graph.edges).toContainEqual(expect.objectContaining({ from: "CheckIfWonderGuardCancelsMove", to: "Score_Minus10", kind: "goto" }));
    expect(catalog.graph.edges).toContainEqual(expect.objectContaining({ from: "AI_CheckBadMove", to: "AI_Ret", kind: "branch" }));
  });

  it("records every reachable source instruction with its macro, operands, opcode and native handler", () => {
    const first = catalog.graph.labels[0]!;
    expect(first).toMatchObject({ name: "AI_CheckBadMove", sourceLine: 51, root: true });
    expect(first.instructions.slice(0, 2)).toMatchObject([
      { order: 0, sourceLine: 52, macro: "if_target_is_ally", macroSourceLine: 524, operands: ["AI_Ret"], opcodes: [
        { value: 94, hex: "0x5e", handler: "Cmd_if_target_is_ally" },
      ] },
      { order: 1, sourceLine: 53, macro: "if_move", operands: ["MOVE_FISSURE", "AI_CBM_CheckIfNegatesType"], opcodes: [
        { value: 25, hex: "0x19", handler: "Cmd_if_move" },
      ] },
    ]);
    expect(catalog.dependencies).toContainEqual({ value: 0, hex: "0x00", handler: "Cmd_if_random_less_than", macros: ["if_random_less_than"] });
    expect(catalog.dependencies).toContainEqual(expect.objectContaining({ value: 89, hex: "0x59", handler: "Cmd_goto" }));
    expect(catalog.dependencies).toHaveLength(60);
  });

  it("rejects duplicate labels, missing control targets, and unknown in-label instructions", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-ai-script-catalog-invalid-"));
    const original = readFileSync("reference/pokeemerald/data/battle_ai_scripts.s", "utf8");
    const output = join(directory, "catalog.json");
    const run = (source: string) => {
      const candidate = join(directory, "battle_ai_scripts.s");
      writeFileSync(candidate, source);
      return () => execFileSync(process.execPath, [...extractor, "--source", candidate, "--out", output], { stdio: "pipe" });
    };
    try {
      expect(run(`${original}\nAI_Ret:\n`).bind(null)).toThrow(/duplicate label AI_Ret/);
      expect(run(original.replace("if_target_is_ally AI_Ret", "if_target_is_ally MissingFactoryAiTarget")).bind(null)).toThrow(/missing branch target MissingFactoryAiTarget/);
      expect(run(original.replace("AI_CheckBadMove:\n", "AI_CheckBadMove:\n\tunknown_factory_ai_macro\n")).bind(null)).toThrow(/unsupported instruction unknown_factory_ai_macro/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
