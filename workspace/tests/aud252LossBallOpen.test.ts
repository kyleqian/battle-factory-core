// aud252: the loss path's `returnopponentmon1toball` (BattleScript_LocalBattleLostPrintTrainersWinText) runs after the turn's remaining commands, so its
// SE_BALL_OPEN follows an opponent held-item effect (Shell Bell heal) instead of falling inside it. Fixture = the ROM sound pass of two Scene ON T2 seeds
// (tests/fixtures/aud252-loss-itemeffect.json); the engine side is a live soundCensusRomReplay run on the same setup.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Row = [number, string, number, number | null];
const fixture = JSON.parse(readFileSync(new URL("./fixtures/aud252-loss-itemeffect.json", import.meta.url), "utf8")) as {
  seeds: Record<string, { scene: "on" | "off"; setup: unknown; rom: Row[] }>;
};
// engine minus ROM frame offsets (relative to the last decision's commit): the item effect and the faint sit in the presentation-length residual
// hie4 (2026-11-16) dropped the 28-row floor on the item-heal HP command: the loss SE_BALL_OPEN after the held-item heal moved 20 / 21 rows earlier and
// now sits at the same engine-minus-ROM offset as the item effect's SEs before it (-19 / -19; -7 / -6), where aud252 pinned it over-held (+1 / +14).
// sta3: seed 2230's turn has a pre-move print (the action transition into it is now the ROM's, trn176 rule extended): the rows after the faint move 1 closer to 0.
// hpd8: seed 2230's Scene ON turn ends on a shape-A body (the lead + hit tail now sit in the command): rows after the faint, engine minus ROM, -3 / -5 x5 / -6 -> +2 / 0 x5 / -1 (every row toward the ROM).
// hpf3 (hpf1 / hpf2 hp lengths): seed 1914 [-5, -11, -19 x6] -> [0, 1, -7 x6] (every row toward the ROM); seed 2230 [7, 2, 0 x5, -1] -> [7, 3, 1 x5, 0] (the item effect rows +1, the SE_BALL_OPEN row exact; one frame, direction mixed).
// lfx1: seed 1914's last turn opens with the player's Icy Wind (196, a lead2 body: lead 5 + tail 3 = +8 presentation rows). The faint SE (battleHitSounds subtracts moveBodyExtraRows from its
// command-start anchors, hpd4) stays on the ROM frame 999 (0), the select SE (the accepted A of the loss message, battleEndSounds, no subtraction) and everything after it follow the command
// starts: +8, so [0, 1, -7 x6] -> [0, 9, 1 x6] (lead2), then pau5 -1 from the select on (measured by reverting pau5's src: select 1042 -> 1041) -> [0, 8, 0 x6]: the item effect's five SEs and SE_BALL_OPEN land
// exactly on the ROM (1060 / 1092 / 1124 / 1156 / 1228 / 1410), the select SE is 8 late (ROM 1033, ours 1041; rule off it was exact). Sum |offset| 56 -> 8.
// hcr2c: hcr2's Scene ON action-dispatch hold (u - 2 frames before the first used-move print; seed 1914 u = 6 -> 4, seed 2230 u = 5 -> 3) delays every later row of the turn: seed 1914 [0, 8, 0 x6] -> [3, 12, 4 x6]
// (the faint SE keeps its 1-tick hit lead, so +3), seed 2230 [7, 3, 1 x5, 0] -> [10, 6, 4 x5, 3] (+3 each). Uniform shifts of rows that were ROM-exact (1914), carried by the presentation hold, not by a sound lead; a general-animation lead of the hold was tried and rejected (T2 mass 24,219 -> 24,863, seed 2230 mixed).
const DELTAS: Record<string, number[]> = { "1914": [3, 12, 4, 4, 4, 4, 4, 4], "2230": [10, 6, 4, 4, 4, 4, 4, 3] };
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

function engineRows(seed: string, scene: string, setup: unknown): Row[] {
  const dir = mkdtempSync(join(tmpdir(), "aud252-"));
  writeFileSync(join(dir, "setup.json"), JSON.stringify(setup));
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", `--seed=${seed}`, `--scene=${scene}`, `--setup=${join(dir, "setup.json")}`, `--out=${join(dir, "engine.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
  const engine = JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")) as { decisions: Array<{ commitFrame: number | null }>; sound: Array<[number, string, number, number | null]> };
  const commit = engine.decisions.filter((d) => d.commitFrame !== null).at(-1)!.commitFrame!;
  const rows = engine.sound.filter((r) => r[0] >= commit && (r[1] === "se" || r[1] === "cry")).map((r): Row => [r[0] - commit, r[1], r[2], r[3]]);
  const faint = rows.map((r) => r[1] === "se" && r[2] === 16).lastIndexOf(true);
  return rows.slice(faint, faint + fixture.seeds[seed]!.rom.length);
}

describe("loss SE_BALL_OPEN after an opponent held-item effect (aud252)", () => {
  for (const [seed, w] of Object.entries(fixture.seeds)) {
    it(`seed ${seed}: faint, select, the item effect's five SEs, then SE_BALL_OPEN last, as the ROM`, { timeout: 120_000 }, () => {
      const ours = engineRows(seed, w.scene, w.setup);
      expect(ours.map(([, kind, id, pan]) => `${kind}:${id}:${pan}`)).toEqual(w.rom.map(([, kind, id, pan]) => `${kind}:${id}:${pan}`));
      expect(w.rom.at(-1)![2]).toBe(15);
      expect(ours.map((r, i) => r[0] - w.rom[i]![0])).toEqual(DELTAS[seed]);
    });
  }
});
