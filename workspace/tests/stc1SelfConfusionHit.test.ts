// stc1 (docs/aud251-s11-scoreboard-refresh.md "stc1"): Scene OFF's confusion self-hit. BattleScript_DoSelfConfusionDmg (battle_scripts_1.s:3796-3804) runs 5 script
// rows before the "hurt itself" print; the ROM's effectivenesssound (SE 13) is 204 (T2 seed 7295, decision 4) / 199 (seed 7682, decision 2) frames after the decision's
// commit, the engine's was 197 / 192. ohr1: both heads are u = 5 (7295) / 5 (7682) prints that now start on commit + 6 + u + 1 (12 / 11), 3 rows before the print's first glyph
// (the lead was 5 while the head started 2 rows early); the used-print sound lead puts the hit command one tick after SE 13. Fixture = the two ROM sound passes' frames + each seed's setup; the engine side is a live soundCensusRomReplay run.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Fixture = { seeds: Array<{ seed: number; scene: string; decision: number; romSe13: number; setup: unknown }> };
const fixture = JSON.parse(readFileSync(new URL("./fixtures/stc1-selfconfusion-off.json", import.meta.url), "utf8")) as Fixture;
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

function engineRun(seed: number, scene: string, setup: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "stc1-sc-"));
  writeFileSync(join(dir, "setup.json"), JSON.stringify(setup));
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", `--seed=${seed}`, `--scene=${scene}`, `--setup=${join(dir, "setup.json")}`, "--cmdtrace=1", `--out=${join(dir, "engine.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
  return JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")) as { decisions: Array<{ commitFrame?: number }>; sound: Array<[number, string, number]>; cmds: Array<[number, number, number, string, ...unknown[]]> };
}

describe("Scene OFF confusion self-hit (stc1)", () => {
  for (const { seed, scene, decision, romSe13, setup } of fixture.seeds) {
    it(`seed ${seed} decision ${decision}: SE 13 at the ROM's frame ${romSe13} after the commit, the print's first glyph 3 script rows after its command start`, { timeout: 120_000 }, () => {
      const run = engineRun(seed, scene, setup);
      const commit = run.decisions.filter((d) => d.commitFrame !== undefined)[decision]!.commitFrame!;
      const se = run.sound.filter((r) => r[1] === "se" && r[2] === 13 && r[0] - commit > 0 && r[0] - commit < 400).map((r) => r[0] - commit);
      expect(se).toEqual([romSe13]);
      // the print command starts on the row after "is confused!" ends (105 / 100 after the commit); its first glyph is 3 script rows later (`leadFrames`), the hit command on SE 13 + 1
      const hit = run.cmds.find((c) => c[3] === "hit-animation" && c[0] - commit === romSe13 + 1)!;
      const print = run.cmds.filter((c) => c[3] === "message" && c[0] < hit[0]).at(-1)!;
      expect(print[0] - commit).toBe(romSe13 - 99);
    });
  }
});
