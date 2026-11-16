// aud252: Scene ON Double Team presents its STATS_CHANGE inside the live move window (sc106: no stats-change command), so General_StatsChange's
// SE_M_STAT_INCREASE (239, pan SOUND_PAN_ATTACKER) is emitted from the move body: script row 131 (last SE_M_DOUBLE_TEAM) + 34. Fixture = the ROM sound pass of T2 seed 2
// (tests/fixtures/aud252-doubleteam-statse.json); the engine side is a live soundCensusRomReplay run on the same setup.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Row = [number, number, number | null];
const fixture = JSON.parse(readFileSync(new URL("./fixtures/aud252-doubleteam-statse.json", import.meta.url), "utf8")) as { seed: number; scene: string; setup: unknown; rom: Row[] };
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

function engineRows(): Row[] {
  const dir = mkdtempSync(join(tmpdir(), "aud252-dt-"));
  writeFileSync(join(dir, "setup.json"), JSON.stringify(fixture.setup));
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", `--seed=${fixture.seed}`, `--scene=${fixture.scene}`, `--setup=${join(dir, "setup.json")}`, `--out=${join(dir, "engine.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
  const engine = JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")) as { sound: Array<[number, string, number, number | null]> };
  return engine.sound.filter((r) => r[1] === "se" && (r[2] === 135 || r[2] === 239)).map((r): Row => [r[0], r[2], r[3]]);
}

describe("Scene ON Double Team stat-increase SE (aud252)", () => {
  it("plays SE 239 on the opponent pan 34 frames after the last SE 135 of each Double Team, as the ROM", { timeout: 120_000 }, () => {
    const ours = engineRows();
    expect(ours.map(([, id, pan]) => `${id}:${pan}`)).toEqual(fixture.rom.map(([, id, pan]) => `${id}:${pan}`));
    const gaps = (rows: Row[]): number[] => rows.flatMap((r, i) => (r[1] === 239 && i > 0 && rows[i - 1]![1] === 135 ? [r[0] - rows[i - 1]![0]] : []));
    expect(gaps(fixture.rom)).toEqual([34, 34, 34]);
    expect(gaps(ours)).toEqual([34, 34, 34]);
  });
});
