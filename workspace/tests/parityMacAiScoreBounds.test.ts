import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// docs/parity-mac/ai-scripts-unusable-slots.md, "Not covered": C's final pick (ChooseMoveOrAction_Singles) takes the highest score over all four slots,
// the ones masked by CheckMoveLimitations included (they start at 0, usable ones at 100), and Cmd_score flattens a negative score to 0
// (battle_ai_script_commands.c:703-711). The engine keeps masked slots out of the pool and does not flatten. tools/report/ai-score-bounds.py walks every
// path of the Factory's three AI scripts in data/battle_ai_scripts.s (branch conditions ignored) and bounds what one decision can do to one score:
// a usable slot ends at 77 or more, a masked slot at 25 or less. So a masked slot can never tie with or beat a usable one, and a usable slot never
// reaches 0: the two differences cannot show. This test pins the bounds, so a change of the reference scripts re-opens the question.
const root = fileURLToPath(new URL("..", import.meta.url));
const source = `${root}reference/pokeemerald/data/battle_ai_scripts.s`;

describe("AI score bounds: a masked move slot cannot reach a usable slot's score", () => {
  it.skipIf(!existsSync(source))("holds for every path of AI_CheckBadMove, AI_TryToFaint and AI_CheckViability", () => {
    const out = execFileSync("python3", [`${root}tools/report/ai-score-bounds.py`], { encoding: "utf8" });
    expect(out.trim().split("\n")).toEqual([
      "AI_CheckBadMove: lowest -12, highest +5",
      "AI_TryToFaint: lowest -1, highest +6",
      "AI_CheckViability: lowest -10, highest +14",
      "a usable slot ends a decision at 77 or more; a masked slot at 25 or less",
      "a masked slot can never reach a usable slot's score",
    ]);
  });
});
