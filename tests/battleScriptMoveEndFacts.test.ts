import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import factsData from "../src/data/gen/battle-script-move-end-facts.json" with { type: "json" };

type MoveEndCase = {
  state: { name: string; value: number };
  source: {
    startLine: number;
    endLine: number;
    textSha256: string;
    rawLines: Array<{ line: number; raw: string }>;
  };
  lexicalFacts: {
    callCandidates: string[];
    globalReferences: string[];
    battleScriptTargets: string[];
    controllerCallCandidates: string[];
    explicitReturnLines: Array<{ line: number; raw: string }>;
    mutationCandidateLines: Array<{ line: number; raw: string }>;
  };
};

const facts = factsData as {
  schema: string;
  source: {
    commandSource: { file: string; sha256: string };
    constantsSource: { file: string; sha256: string };
    handler: { symbol: string; startLine: number; endLine: number; textSha256: string };
  };
  counts: {
    constants: number;
    executableStates: number;
    switchCases: number;
    opcodeStarts: number;
    endModes: Record<string, number>;
    wrappers: Record<string, number>;
  };
  constants: Array<{ name: string; value: number; line: number; raw: string }>;
  handlerStructure: {
    prelude: { rawLines: Array<{ line: number; raw: string }>; callCandidates: string[] };
    cases: MoveEndCase[];
    postlude: { rawLines: Array<{ line: number; raw: string }> };
  };
  opcodeStarts: Array<{
    instructionStartIndex: number;
    source: { label: string; line: number; mnemonic: string };
    operands: { endModeExpression: string; endStateExpression: string; widths: number[] };
    wrapperPath: string[];
  }>;
  registration: { implemented: boolean; rationale: string };
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("Cmd_moveend source/dependency receipt", () => {
  it("regenerates byte-for-byte in a fresh isolated directory", () => {
    const outputDirectory = mkdtempSync(
      join(tmpdir(), "pokeemerald-factory-battle-script-move-end-facts-"),
    );
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "tools/extract/extract-battle-script-move-end-facts.ts",
        "--out-dir",
        outputDirectory,
      ],
      { stdio: "pipe" },
    );
    expect(
      readFileSync(join(outputDirectory, "battle-script-move-end-facts.json"), "utf8"),
    ).toBe(readFileSync("src/data/gen/battle-script-move-end-facts.json", "utf8"));
  });

  it("pins the exact source span, contiguous 0..16 states, and sentinel 17", () => {
    const commandSource = readFileSync(
      "reference/pokeemerald/src/battle_script_commands.c",
      "utf8",
    );
    const constantsSource = readFileSync(
      "reference/pokeemerald/include/constants/battle_script_commands.h",
      "utf8",
    );
    expect(facts.schema).toBe("battle-script-move-end-facts/v1");
    expect(facts.source.commandSource.sha256).toBe(sha256(commandSource));
    expect(facts.source.constantsSource.sha256).toBe(sha256(constantsSource));
    expect(facts.source.handler).toMatchObject({
      symbol: "Cmd_moveend",
      startLine: 4210,
      endLine: 4498,
    });
    expect(facts.counts).toMatchObject({
      constants: 18,
      executableStates: 17,
      switchCases: 18,
      opcodeStarts: 24,
    });
    expect(facts.constants.map(({ value }) => value)).toEqual(
      Array.from({ length: 18 }, (_, index) => index),
    );
    expect(facts.constants.at(-1)?.name).toBe("MOVEEND_COUNT");
    expect(
      [...facts.handlerStructure.cases.map(({ state }) => ({
        name: state.name,
        value: state.value,
      }))]
        .sort((left, right) => left.value - right.value),
    ).toEqual(
      facts.constants.map(({ name, value }) => ({ name, value })),
    );
    expect(facts.handlerStructure.cases.map(({ state }) => state.name)).toEqual([
      "MOVEEND_RAGE",
      "MOVEEND_DEFROST",
      "MOVEEND_SYNCHRONIZE_TARGET",
      "MOVEEND_ON_DAMAGE_ABILITIES",
      "MOVEEND_IMMUNITY_ABILITIES",
      "MOVEEND_SYNCHRONIZE_ATTACKER",
      "MOVEEND_CHOICE_MOVE",
      "MOVEEND_CHANGED_ITEMS",
      "MOVEEND_ITEM_EFFECTS_ALL",
      "MOVEEND_KINGSROCK_SHELLBELL",
      "MOVEEND_ATTACKER_INVISIBLE",
      "MOVEEND_ATTACKER_VISIBLE",
      "MOVEEND_TARGET_VISIBLE",
      "MOVEEND_SUBSTITUTE",
      "MOVEEND_UPDATE_LAST_MOVES",
      "MOVEEND_MIRROR_MOVE",
      "MOVEEND_NEXT_TARGET",
      "MOVEEND_COUNT",
    ]);
  });

  it("preserves every case body verbatim and exposes its lexical hook boundary", () => {
    const sourceLines = readFileSync(
      "reference/pokeemerald/src/battle_script_commands.c",
      "utf8",
    ).split("\n");
    for (const entry of facts.handlerStructure.cases) {
      expect(entry.source.rawLines.map(({ line }) => line)).toEqual(
        Array.from(
          { length: entry.source.endLine - entry.source.startLine + 1 },
          (_, index) => entry.source.startLine + index,
        ),
      );
      expect(entry.source.rawLines.map(({ raw }) => raw)).toEqual(
        sourceLines.slice(entry.source.startLine - 1, entry.source.endLine),
      );
      expect(entry.source.textSha256).toBe(
        sha256(entry.source.rawLines.map(({ raw }) => raw).join("\n")),
      );
    }
    for (const entry of facts.handlerStructure.cases.slice(0, -1)) {
      expect(entry.lexicalFacts.mutationCandidateLines.length).toBeGreaterThan(0);
    }
    expect(facts.handlerStructure.cases.at(-1)?.state.name).toBe("MOVEEND_COUNT");
    expect(facts.handlerStructure.cases.at(-1)?.lexicalFacts.mutationCandidateLines)
      .toEqual([]);

    const byName = new Map(
      facts.handlerStructure.cases.map((entry) => [entry.state.name, entry]),
    );
    expect(byName.get("MOVEEND_DEFROST")?.lexicalFacts.controllerCallCandidates)
      .toEqual(["BtlController_EmitSetMonData", "MarkBattlerForControllerExec"]);
    for (const state of [
      "MOVEEND_ATTACKER_INVISIBLE",
      "MOVEEND_ATTACKER_VISIBLE",
      "MOVEEND_TARGET_VISIBLE",
    ]) {
      expect(byName.get(state)?.lexicalFacts.controllerCallCandidates).toEqual([
        "BtlController_EmitSpriteInvisibility",
        "MarkBattlerForControllerExec",
      ]);
      expect(byName.get(state)?.lexicalFacts.explicitReturnLines).toHaveLength(1);
    }
    expect(byName.get("MOVEEND_NEXT_TARGET")?.lexicalFacts.callCandidates)
      .toEqual(expect.arrayContaining([
        "GetBattlerAtPosition",
        "BATTLE_PARTNER",
        "GetBattlerPosition",
        "MoveValuesCleanUp",
        "BattleScriptPush",
      ]));
    expect(byName.get("MOVEEND_NEXT_TARGET")?.lexicalFacts.battleScriptTargets)
      .toEqual(["BattleScript_FlushMessageBox"]);
  });

  it("pins every assembled mode/wrapper form and the two-byte operand contract", () => {
    expect(facts.counts.endModes).toEqual({ "0": 6, "1": 4, "2": 14 });
    expect(facts.counts.wrappers).toEqual({
      moveendall: 4,
      moveendcase: 4,
      moveendfrom: 2,
      moveendfromto: 2,
      moveendto: 12,
    });
    expect(facts.opcodeStarts).toHaveLength(24);
    for (const start of facts.opcodeStarts) {
      expect(start.operands.widths).toEqual([1, 1]);
      expect(["0", "1", "2"]).toContain(start.operands.endModeExpression);
      expect(start.wrapperPath.at(-1)).toBe("moveend");
    }
    expect(facts.opcodeStarts[0]).toMatchObject({
      source: {
        label: "BattleScript_MoveEnd",
        line: 268,
        mnemonic: "moveendall",
      },
      operands: {
        endModeExpression: "0",
        endStateExpression: "0",
      },
    });
  });

  it("S10 step (iii): records opcode 73 as registered under the (a)/(b) policy", () => {
    expect(facts.registration.implemented).toBe(true);
    expect(facts.registration.rationale).toContain("(a)/(b) policy");
    const rulesBundle = readFileSync(
      "src/engine/battleScriptRulesContext.ts",
      "utf8",
    );
    expect(rulesBundle).toContain("createBattleScriptMoveEndOpcodeHandlers");
  });
});
