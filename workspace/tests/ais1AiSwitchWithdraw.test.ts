// ais1: the opponent's AI mid-battle switch (BattleScript_ActionSwitch) gets the RETURNMON message and the return-to-ball presentation, synthesized ahead of the
// DoSwitchOut party-summary draw like the player's recall (docs/ais1-ai-switch-withdraw.md). Seed 2741 Scene OFF, the aud253 fixture's setup.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Cmd = { type: string; seq: number; battler?: number; frames?: number };
const fixture = JSON.parse(readFileSync(new URL("./fixtures/aud253-ai-switch-lowhp.json", import.meta.url), "utf8")) as { seeds: Record<string, { scene: string; setup: unknown }> };
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

function replay(scene: "on" | "off") {
  const dir = mkdtempSync(join(tmpdir(), "ais1-"));
  writeFileSync(join(dir, "setup.json"), JSON.stringify(fixture.seeds["2741"]!.setup));
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", "--seed=2741", `--scene=${scene}`, `--setup=${join(dir, "setup.json")}`, "--events=1", `--out=${join(dir, "e.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
  return JSON.parse(readFileSync(join(dir, "e.json"), "utf8")) as { turnEvents: Array<{ commands: Cmd[] }>; sound: Array<[number, string, number | null, number | null]> };
}

describe("AI switch withdraw (ais1)", () => {
  for (const scene of ["off", "on"] as const) {
    it(`seed 2741 Scene ${scene.toUpperCase()}: RETURNMON, return-to-ball switch-out, healthbox hide, then the summary draw; one recall per command list`, { timeout: 120_000 }, () => {
      const r = replay(scene);
      const turns = r.turnEvents.filter((t) => t.commands.some((c) => c.type === "switch-out" && c.battler === 1));
      // the player's faint replacement that follows re-presents the same resolution, so its command list repeats the one recall
      expect(turns).toHaveLength(2);
      for (const t of turns) expect(t.commands.filter((c) => c.type === "switch-out" && c.battler === 1)).toHaveLength(1);
      const cmds = turns[0]!.commands;
      const at = cmds.findIndex((c) => c.type === "switch-out" && c.battler === 1);
      expect(cmds.slice(at - 1, at + 3).map((c) => [c.type, c.battler ?? null, c.frames])).toEqual([["message", null, 24], ["switch-out", 1, 32], ["sprite-visibility", 1, 1], ["party-summary", 1, 102]]);
      expect(cmds[at - 1]!.seq).toBeLessThan(0);
      expect(cmds[at]!.seq).toBeLessThan(0);
    });
  }
});
