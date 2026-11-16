// aud253: the opponent's AI mid-battle switch (BattleScript_ActionSwitch: returnatktoball's SE_BALL_OPEN, the tray SE, the send-in's ball open and cry) and the
// player switch-in's HandleLowHpMusicChange (SwitchIn_HandleSoundAndEnd). Fixture = ROM step windows (tests/fixtures/aud253-ai-switch-lowhp.json): seed 2741
// Scene OFF res5 and seed 2 Scene ON res11; the engine side is a live soundCensusRomReplay run on the same setup. Rows are matched in kind:id:pan order.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Row = [number, string, number | null, number | null];
const fixture = JSON.parse(readFileSync(new URL("./fixtures/aud253-ai-switch-lowhp.json", import.meta.url), "utf8")) as {
  seeds: Record<string, { scene: "on" | "off"; kinds: string[]; anchor: { kind: string; id: number; index: number }; setup: unknown; rom: Row[] }>;
};
// engine minus ROM frame offsets, relative to the anchor row. ais1: 2741's recall ball open is now the synthesized RETURNMON + return-to-ball switch-out command's (was the tray-draw stop-gap, 31 frames late), so it is exact; ais2: the opponent tray span is 101 (switchhandleorder), so the send-in ball open and cry are 1 short (a faint replacement shares that 1: the ROM opens the ball 1 later)
const DELTAS: Record<string, number[]> = { "2741": [0, 0, -1, -1], "2": [0, 0, 0, 0, 0] };
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;

function engineRows(seed: string): Row[] {
  const w = fixture.seeds[seed]!;
  const dir = mkdtempSync(join(tmpdir(), "aud253-"));
  writeFileSync(join(dir, "setup.json"), JSON.stringify(w.setup));
  execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "replay", `--seed=${seed}`, `--scene=${w.scene}`, `--setup=${join(dir, "setup.json")}`, `--out=${join(dir, "engine.json")}`], { stdio: "pipe", maxBuffer: 1 << 28 });
  const engine = JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")) as { sound: Array<[number, string, number | null, number | null]> };
  const rows = engine.sound.filter((r) => r[0] >= 0 && w.kinds.includes(r[1])).map((r): Row => [r[0], r[1], r[2], r[3]]);
  const matches = rows.map((r, i) => (r[1] === w.anchor.kind && r[2] === w.anchor.id ? i : -1)).filter((i) => i >= 0);
  const at = matches[w.anchor.index]!;
  const before = w.rom.findIndex((r) => r[0] === 0);
  return rows.slice(at - before, at - before + w.rom.length).map((r): Row => [r[0] - rows[at]![0], r[1], r[2], r[3]]);
}

describe("AI switch and switch-in low-HP sounds (aud253)", () => {
  for (const [seed, w] of Object.entries(fixture.seeds)) {
    it(`seed ${seed} (Scene ${w.scene.toUpperCase()}): same rows in the ROM's order`, { timeout: 120_000 }, () => {
      const ours = engineRows(seed);
      expect(ours.map(([, kind, id, pan]) => `${kind}:${id}:${pan}`)).toEqual(w.rom.map(([, kind, id, pan]) => `${kind}:${id}:${pan}`));
      expect(ours.map((r, i) => r[0] - w.rom[i]![0])).toEqual(DELTAS[seed]);
    });
  }
});
