import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import policyData from "../src/data/gen/factory-ai-policy.json" with { type: "json" };

type Branch = { order: number; id: string; condition: string; flags: string[]; mask: number };
type Flag = { name: string; bit: number; mask: number };
const policy = policyData as { schema: string; constants: { frontierStagesPerChallenge: number; aiScriptFlags: Flag[] }; context: { dispatch: string; selector: string; ordinaryTrainerRows: string; inputs: string[] }; branches: Branch[] };

describe("Battle Factory contextual AI policy extraction", () => {
  it("reproduces the committed generated catalog byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-ai-policy-"));
    const output = join(directory, "policy.json");
    try {
      execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-factory-ai-policy.ts", "--out", output], { stdio: "pipe" });
      expect(readFileSync(output, "utf8")).toBe(readFileSync("src/data/gen/factory-ai-policy.json", "utf8"));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("preserves all named source AI_SCRIPT masks, including the unsigned high-bit flags", () => {
    expect(policy.schema).toBe("factory-ai-policy/v1");
    expect(policy.constants.aiScriptFlags).toEqual([
      { name: "AI_SCRIPT_CHECK_BAD_MOVE", bit: 0, mask: 1 },
      { name: "AI_SCRIPT_TRY_TO_FAINT", bit: 1, mask: 2 },
      { name: "AI_SCRIPT_CHECK_VIABILITY", bit: 2, mask: 4 },
      { name: "AI_SCRIPT_SETUP_FIRST_TURN", bit: 3, mask: 8 },
      { name: "AI_SCRIPT_RISKY", bit: 4, mask: 16 },
      { name: "AI_SCRIPT_PREFER_POWER_EXTREMES", bit: 5, mask: 32 },
      { name: "AI_SCRIPT_PREFER_BATON_PASS", bit: 6, mask: 64 },
      { name: "AI_SCRIPT_DOUBLE_BATTLE", bit: 7, mask: 128 },
      { name: "AI_SCRIPT_HP_AWARE", bit: 8, mask: 256 },
      { name: "AI_SCRIPT_TRY_SUNNY_DAY_START", bit: 9, mask: 512 },
      { name: "AI_SCRIPT_ROAMING", bit: 29, mask: 536870912 },
      { name: "AI_SCRIPT_SAFARI", bit: 30, mask: 1073741824 },
      { name: "AI_SCRIPT_FIRST_BATTLE", bit: 31, mask: 2147483648 },
    ]);
  });

  it("records every GetAiScriptsInBattleFactory branch in source evaluation order", () => {
    expect(policy.constants.frontierStagesPerChallenge).toBe(7);
    expect(policy.context).toMatchObject({
      dispatch: "BATTLE_TYPE_FACTORY",
      selector: "GetAiScriptsInBattleFactory",
      ordinaryTrainerRows: "not consulted for Factory AI flags",
    });
    expect(policy.context.inputs).toEqual([
      "gSaveBlock2Ptr->frontier.lvlMode",
      "VarGet(VAR_FRONTIER_BATTLE_MODE)",
      "gSaveBlock2Ptr->frontier.factoryWinStreaks[battleMode][lvlMode]",
      "gTrainerBattleOpponent_A",
    ]);
    expect(policy.branches).toEqual([
      { order: 0, id: "tent", condition: "lvlMode == FRONTIER_LVL_TENT", flags: [], mask: 0 },
      { order: 1, id: "frontierBrain", condition: "gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN", flags: ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"], mask: 7 },
      { order: 2, id: "challengeBelow2", condition: "challengeNum < 2", flags: [], mask: 0 },
      { order: 3, id: "challengeBelow4", condition: "challengeNum < 4", flags: ["AI_SCRIPT_CHECK_BAD_MOVE"], mask: 1 },
      { order: 4, id: "challengeAtLeast4", condition: "else", flags: ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"], mask: 7 },
    ]);
  });
});
