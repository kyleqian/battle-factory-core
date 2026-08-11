import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const SUMMARY = join(process.cwd(), "tools/opencode-stream-summary.mjs");

function summarize(events: readonly object[]) {
  return spawnSync(process.execPath, [SUMMARY], {
    input: `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    encoding: "utf8",
  });
}

describe("OpenCode worker stream summary", () => {
  it("summarizes tools, aggregate usage, cost, and the final message", () => {
    const result = summarize([
      {
        type: "tool_use",
        part: { tool: "bash", state: { status: "completed" } },
      },
      {
        type: "step_finish",
        part: {
          reason: "tool-calls",
          tokens: {
            input: 10,
            output: 2,
            reasoning: 0,
            cache: { read: 100, write: 3 },
          },
          cost: 0.001,
        },
      },
      { type: "text", part: { text: "Work complete." } },
      {
        type: "step_finish",
        part: {
          reason: "stop",
          tokens: {
            input: 4,
            output: 3,
            reasoning: 1,
            cache: { read: 50, write: 0 },
          },
          cost: 0.002,
        },
      },
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("=== worker finished ===");
    expect(result.stdout).toContain(
      "tokens: input 14 · cached 150 · cache-write 3 · output 5 · reasoning 1 · cost $0.0030",
    );
    expect(result.stdout).toContain("tools: bash×1");
    expect(result.stdout).toContain("--- final message ---\nWork complete.");
  });

  it("surfaces structured rate-limit failures without scanning tool output", () => {
    const result = summarize([
      {
        type: "tool_use",
        part: {
          tool: "read",
          state: { status: "completed", output: "docs mention a rate limit" },
        },
      },
      { type: "error", error: { message: "DeepSeek rate limit exceeded" } },
    ]);

    expect(result.status).toBe(42);
    expect(result.stdout).toContain("=== worker FAILED (DeepSeek rate limit exceeded) ===");
    expect(result.stdout).toContain("USAGE LIMIT");
  });
});
