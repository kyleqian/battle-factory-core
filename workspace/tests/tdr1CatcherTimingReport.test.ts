// tdr1 (docs/tdr1-catcher-timing-report.md): the frame catcher's sound timing report (tools/frame-catcher/timing.py) on a hand-made run,
// tests/fixtures/tdr1-timing-fixture.json. Python, no emulator.
//
// Worked answers (drift = ROM minus ours, from the stretch start; a gap = the change in drift since the paired sound before):
//   stretch 0 is skipped (the draft's fade-in), its se 1 is not paired.
//   stretch 1 (ours 100, ROM 110), menu battle.fight:
//     press 0 / 0 (the same press of ours: the driver's) -> se 10 20 / 23: gap 3, all the game's
//     se 10 -> press 40 / 42 (same press, -1: the driver's) -> se 11 50 / 52 (0): gap -1, game 0, driver -1
//       (ours logs se 11 twice on frame 150, a direct and an se: one sound)
//     se 11 -> se 10 (the 2nd) 60 / 65: gap 3;  se 10 -> cry 5 70 / 76: gap 1 (a cry of species 5 is no SE_SELECT)
//     ours' se 99 has no partner; the pan, the duck and the cry stop are not compared.
//   stretch 2 (ours 200, ROM 215), from the battle room walk:
//     start -> se 20 10 / 10: gap 0
//     se 20 -> press 30 / 45: the ROM took a later press of ours (replay of our 245, ours took 230): +15, the game's ("via another press");
//       -> se 21 40 / 57: +2; gap 17, all the game's. The ROM's steer SE_SELECT at 228 (index 8) is left out.
//     se 21 -> press 60 / 85: a rescue A, +8, the driver's -> bgm 300 70 / 97: +2; gap 10, game 2, driver 8.
//   7 gaps: 3, -1, 3, 1, 0, 17, 10 -> within 1: 3, off by 6+: 2.  Game parts 3, 0, 3, 1, 0, 17, 2 -> within 1: 3, off by 6+: 1,
//   frames off (gaps off by 2+): 25.  Driver parts: 8 in 1 gap.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const fixturePath = new URL("fixtures/tdr1-timing-fixture.json", import.meta.url);

interface Row { gap: string; times: number; seen: number; frames: number; median: number; viaOther: number | null; first: Record<string, unknown> }
interface Report {
  gaps: number; battles: number;
  all: { within1: number; off6: number };
  game: { within1: number; off6: number; frames: number };
  driver: { gaps: number; frames: number };
  presses: Record<string, number>; pressLog: boolean;
  seen: Record<string, number>; ranked: Row[]; driverRanked: Row[]; topGame: string[];
}

function report(fixture: string): Report {
  return JSON.parse(execFileSync("python3", ["tools/frame-catcher/timing.py", "--fixture", fixture], { cwd: root, encoding: "utf8" })) as Report;
}

describe("tdr1 frame catcher sound timing report", () => {
  it("counts each gap once and splits it into the game's and the driver's part", () => {
    const t = report(fixturePath.pathname);
    expect(t.gaps).toBe(7);
    expect(t.all).toEqual({ within1: 3, off6: 2 });
    expect(t.game).toEqual({ within1: 3, off6: 1, frames: 25 });
    expect(t.driver).toEqual({ gaps: 1, frames: 8 });
    expect(t.presses).toEqual({ other: 1, rescue: 1, same: 2 });
    expect(t.pressLog).toBe(true);
    expect(Object.keys(t.seen)).toEqual([
      "menu battle.fight -> se 10", "menu battleRoom:walk -> se 20", "se 10 -> cry 5", "se 10 -> se 11", "se 11 -> se 10", "se 20 -> se 21", "se 21 -> bgm 300",
    ]);
  });

  it("ranks the game's gaps by the frames off, with the press they went through", () => {
    const t = report(fixturePath.pathname);
    expect(t.ranked.map((r) => [r.gap, r.times, r.seen, r.frames, r.median, r.viaOther])).toEqual([
      ["se 20 -> se 21", 1, 1, 17, 17, 1],
      ["menu battle.fight -> se 10", 1, 1, 3, 3, 0],
      ["se 11 -> se 10", 1, 1, 3, 3, 0],
      ["se 21 -> bgm 300", 1, 1, 2, 2, 0],
    ]);
    expect(t.ranked[0]!.first).toEqual({ stretch: 2, where: "battle room before battle 2", engine: 240, rom: 272, game: 17 });
    expect(t.driverRanked.map((r) => [r.gap, r.frames, r.median])).toEqual([["se 21 -> bgm 300", 8, 8]]);
  });

  it("counts every press as the driver's when the run has no press log (runs made before tdr1)", () => {
    const fx = JSON.parse(readFileSync(fixturePath, "utf8")) as { rom: Record<string, unknown> };
    delete fx.rom.pressReplays;
    const p = join(mkdtempSync(join(tmpdir(), "tdr1-")), "no-log.json");
    writeFileSync(p, JSON.stringify(fx));
    const t = report(p);
    expect(t.pressLog).toBe(false);
    expect(t.presses).toEqual({ unknown: 4 });
    expect(t.all).toEqual({ within1: 3, off6: 2 }); // the jumps themselves do not depend on the log
    expect(t.game).toEqual({ within1: 3, off6: 0, frames: 10 }); // 3, 3, 2, 2
    expect(t.driver).toEqual({ gaps: 2, frames: 23 }); // 15 (se 20 -> se 21) + 8
  });
});
