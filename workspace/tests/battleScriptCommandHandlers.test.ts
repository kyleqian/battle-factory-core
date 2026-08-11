import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogData from "../src/data/gen/battle-script-command-handlers.json" with { type: "json" };
import topologyData from "../src/data/gen/battle-script-topology.json" with { type: "json" };

type Definition = { symbol: string; file: string; startLine: number; openingBraceLine: number; endLine: number; signatureLine: number; signatureRaw: string };
type Slot = {
  index: number;
  opcode: string;
  enum: { file: string; line: number; raw: string };
  table: null | { file: string; rowIndex: number; line: number; raw: string; designatorExpression: string; handlerExpression: string };
  handler: null | { symbol: string; definition: Definition | null };
};

const catalog = catalogData as {
  source: { enum: { file: string; sha256: string; declarationLine: number; openingBraceLine: number; closingBraceLine: number }; dispatchTable: { file: string; sha256: string; declarationLine: number; openingBraceLine: number; closingBraceLine: number } };
  counts: { enumRows: number; tableRows: number; slots: number; handlerDefinitions: number; handlerAliases: number };
  slots: Slot[];
  structuralAudit: Record<string, unknown[]>;
};
const topology = topologyData as { opcodes: Array<{ id: number; opcode: string; dispatcher: string }> };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("Battle Script command-handler catalog", () => {
  it("regenerates byte-for-byte in an isolated directory", () => {
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-battle-script-command-handlers-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-script-command-handlers.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    expect(readFileSync(join(outputDirectory, "battle-script-command-handlers.json"), "utf8")).toBe(
      readFileSync("src/data/gen/battle-script-command-handlers.json", "utf8"),
    );
  });

  it("ties every one of the 249 topology opcode values to its exact enum/table source order", () => {
    expect(catalog.counts).toMatchObject({ enumRows: 249, tableRows: 249, slots: 249 });
    expect(catalog.slots).toHaveLength(249);
    expect(catalog.slots.map((slot) => [slot.index, slot.opcode])).toEqual(topology.opcodes.map((opcode) => [opcode.id, opcode.opcode]));
    for (const slot of catalog.slots) {
      expect(slot.enum).toMatchObject({ file: "include/constants/battle_script_commands.h" });
      expect(slot.enum.raw.trim()).toBe(`${slot.opcode},`);
      expect(slot.table).not.toBeNull();
      expect(slot.table).toMatchObject({ file: "src/battle_script_commands.c", rowIndex: slot.index, designatorExpression: slot.opcode });
      expect(slot.table!.raw).toContain(`[${slot.opcode}]`);
      expect(slot.handler).not.toBeNull();
      expect(slot.handler!.symbol).toBe(slot.table!.handlerExpression);
      expect(slot.handler!.definition).not.toBeNull();
    }
  });

  it("preserves source hashes, raw evidence, and exact C definition spans without interpreting handlers", () => {
    const enumSource = readFileSync("reference/pokeemerald/include/constants/battle_script_commands.h", "utf8");
    const commandSource = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const commandLines = commandSource.split("\n");
    expect(catalog.source.enum.sha256).toBe(sha256(enumSource));
    expect(catalog.source.dispatchTable.sha256).toBe(sha256(commandSource));
    expect(catalog.source.enum).toMatchObject({ declarationLine: 4, openingBraceLine: 5 });
    expect(catalog.source.dispatchTable).toMatchObject({ declarationLine: 329, openingBraceLine: 330, closingBraceLine: 580 });
    for (const slot of catalog.slots) {
      const definition = slot.handler!.definition!;
      expect(definition).toMatchObject({ symbol: slot.handler!.symbol, file: "src/battle_script_commands.c", signatureLine: definition.startLine });
      expect(definition.endLine).toBeGreaterThanOrEqual(definition.startLine);
      expect(commandLines[definition.startLine - 1]!.trim()).toBe(definition.signatureRaw);
      expect(commandLines[definition.openingBraceLine - 1]).toBe("{");
      expect(commandLines[definition.endLine - 1]).toBe("}");
      expect(commandLines[slot.table!.line - 1]).toBe(slot.table!.raw);
    }
    expect(catalog.slots[0]).toMatchObject({
      index: 0,
      opcode: "B_SCR_OP_ATTACKCANCELER",
      handler: { symbol: "Cmd_attackcanceler", definition: { startLine: 915, signatureRaw: "static void Cmd_attackcanceler(void)" } },
    });
    expect(catalog.slots.at(-1)).toMatchObject({
      index: 248,
      opcode: "B_SCR_OP_TRAINERSLIDEOUT",
      handler: { symbol: "Cmd_trainerslideout" },
    });
  });

  it("reports aliases, duplicates, absent table rows, and absent definitions as structural findings", () => {
    expect(catalog.counts.handlerDefinitions).toBe(249);
    expect(catalog.counts.handlerAliases).toBe(0);
    for (const findings of Object.values(catalog.structuralAudit)) expect(findings).toEqual([]);
  });
});
