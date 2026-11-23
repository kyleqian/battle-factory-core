// ohr1 (docs/aud251-s11-scoreboard-refresh.md "ohr1"): Scene OFF pre-move head prints (MoveUsedIsConfused / ConfusedNoMore, reached from attackcanceler) are `printstring` rows at
// commit + 6 + u like the used print, so the first message starts on commit + 7 + u (the oracle swaps the box a frame after the ROM's text-printer edge), not on the stage walk's fixed commit + 9.
// ROM text-printer edges (hse1m probes, T2 OFF): s499 d11 (SpeedDownHit entry, confusion) 11, s830 d5 (ConfusedNoMore) 11, s7295 d5 (AllStatsUpHit, confusion) 11, s7295 d8 (ConfusedNoMore) 13.
// Fixture = each seed's setup; the engine side is a live soundCensusRomReplay run (as stc1SelfConfusionHit).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Fixture = { seeds: Array<{ seed: number; scene: string; decision: number; headStart: number; head: string; note: string; setup: unknown }> };
const fixture = JSON.parse(readFileSync(new URL("./fixtures/ohr1-head-start-off.json", import.meta.url), "utf8")) as Fixture;
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

function engineRun(seed: number, scene: string, setup: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "ohr1-head-"));
  writeFileSync(join(dir, "setup.json"), JSON.stringify(setup));
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", `--seed=${seed}`, `--scene=${scene}`, `--setup=${join(dir, "setup.json")}`, "--cmdtrace=1", `--out=${join(dir, "engine.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
  return JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")) as { decisions: Array<{ commitFrame?: number }>; cmds: Array<[number, number, number, string, ...unknown[]]> };
}

describe("Scene OFF pre-move head print start (ohr1)", () => {
  for (const { seed, scene, decision, headStart, head, note, setup } of fixture.seeds) {
    it(`seed ${seed} decision ${decision}: ${head} after ${note} starts on commit + ${headStart}`, { timeout: 120_000 }, () => {
      const run = engineRun(seed, scene, setup);
      const commit = run.decisions.filter((d) => d.commitFrame !== undefined)[decision]!.commitFrame!;
      const first = run.cmds.find((c) => c[0] >= commit && c[3] === "message")!;
      expect(first[0] - commit).toBe(headStart);
    });
  }
});
