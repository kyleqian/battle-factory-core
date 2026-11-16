import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { firstMismatch, replaySweepFixture, type SweepFixture } from "./helpers/lbwPlayerReplay.ts";

// ROM dumps (Scene OFF) branched at lbw4-woman-block-off frame 5254 (player idle at map (4,8) = grid (11,15), facing south):
// tools/probe/lbw5-sweep.py; each fixture row is [held mask, gRngValue, player cur / prv (grid), woman row, fat man row].
const all = JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/lbw5/player-npc.json.gz", import.meta.url))).toString()) as SweepFixture[];
const fx = (name: string): SweepFixture => all.find((f) => f.name === name) ?? (() => { throw new Error(`no fixture ${name}`); })();

interface Stats {
  bumpFrames: number;
  firstBump: number;
  firstOnTile: (x: number, y: number) => number;
  blockedByFatMan: number;
}

function stats(f: SweepFixture): Stats {
  let bumpFrames = 0;
  let firstBump = -1;
  let blockedByFatMan = 0;
  replaySweepFixture(f, (fr) => {
    if (fr.player.bumpElapsed > 0) {
      bumpFrames += 1;
      if (firstBump < 0) firstBump = fr.index;
      const fat = fr.before.fatMan;
      if (fr.player.x + 7 === fat.x && fr.player.y + 8 === fat.y) blockedByFatMan += 1;
    }
  });
  return { bumpFrames, firstBump, blockedByFatMan, firstOnTile: (x, y) => f.frames.findIndex((r) => r[2] === x && r[3] === y) };
}

describe("lbw5: every ROM branch replays exactly (player ROM object, woman, fat man, gRngValue on every frame)", () => {
  for (const f of all) {
    it(f.name!, () => {
      expect(firstMismatch(f)).toBeNull();
      expect(f.frames.length).toBeGreaterThan(200);
    });
  }
});

describe("lbw5 case 1: the fat man in the player's way (LOOK_AROUND, never moves, never gives way)", () => {
  it("a held DOWN from the north bumps against (13,17) for the whole hold and the player never enters it", () => {
    const f = fx("fatN-j0-g24");
    const s = stats(f);
    expect(f.frames.some((r) => r[2] === 13 && r[3] === 17)).toBe(false);
    expect(f.frames.every((r) => r[7][0] === 13 && r[7][1] === 17 && r[7][2] === 13 && r[7][3] === 17)).toBe(true);
    expect(f.frames[f.frames.length - 1]!.slice(2, 6)).toEqual([13, 16, 13, 16]);
    expect(s.firstBump).toBe(88);
    expect(s.bumpFrames).toBe(112);
    expect(s.blockedByFatMan).toBe(112);
  });
});

describe("lbw5 case 2: a different held direction during a bump interrupts at once (no turn in place)", () => {
  const step = (name: string, mask: number, to: [number, number]) => {
    const f = fx(name);
    const at = f.frames.findIndex((r, i) => i > 0 && r[0] === mask && f.frames[i - 1]![0] === 2);
    expect(at).toBeGreaterThan(0);
    // The ROM's player cur is the new tile on the very frame the new direction is first held, and the engine's bump ends that frame.
    expect(f.frames[at]!.slice(2, 4)).toEqual(to);
    let bumping = true;
    replaySweepFixture(f, (fr) => {
      if (fr.index === at) bumping = fr.player.bumpElapsed > 0;
      if (fr.index === at - 1) expect(fr.player.bumpElapsed).toBeGreaterThan(0);
    });
    expect(bumping).toBe(false);
  };
  it("LEFT / RIGHT held after the fat-man bump starts the west / east step on that frame", () => {
    step("chg-LEFT-d75", 4, [12, 16]);
    step("chg-RIGHT-d75", 8, [14, 16]);
    step("chg-LEFT-d60", 4, [12, 16]);
  });
});

describe("lbw5 case 3: a turn-commit refusal by the woman (the bump starts at the ROM frame that decides)", () => {
  it("the woman's departing tile: the bump lasts 2 / 1 / 0 ticks as the press moves one frame later; the step starts on the same ROM frame", () => {
    const refused = (name: string) => stats(fx(name));
    const a = refused("tdep-P5855");
    const b = refused("tdep-P5856");
    const c = refused("tdep-P5857");
    expect(a.firstBump).toBe(609);
    expect(b.firstBump).toBe(610);
    expect(c.firstBump).toBeGreaterThan(611);
    for (const name of ["tdep-P5855", "tdep-P5856", "tdep-P5857"]) expect(refused(name).firstOnTile(11, 17), name).toBe(611);
  });
  it("the woman's arriving tile: a press one frame later is refused (the woman is already on the tile)", () => {
    const early = stats(fx("tarr-P5952"));
    const late = stats(fx("tarr-P5953"));
    expect(early.firstOnTile(11, 17)).toBe(706);
    expect(late.firstOnTile(11, 17)).toBe(-1);
    expect(late.firstBump).toBe(707);
  });
});

describe("lbw5 case 4: a same-frame race for one tile (player first up to P5944, woman first from P5945)", () => {
  it("the player takes (11,17) and the woman turns away", () => {
    const f = fx("race-P5944");
    expect(stats(f).firstOnTile(11, 17)).toBe(706);
    expect(f.frames[f.frames.length - 1]!.slice(2, 4)).toEqual([11, 18]);
    expect(f.frames[f.frames.length - 1]![6].slice(0, 2)).toEqual([10, 17]);
  });
  it("the woman takes (11,17) and the held DOWN bumps against her", () => {
    const f = fx("race-P5945");
    const s = stats(f);
    expect(s.firstOnTile(11, 17)).toBe(-1);
    expect(s.firstBump).toBe(707);
    expect(f.frames[f.frames.length - 1]!.slice(2, 4)).toEqual([11, 16]);
    expect(f.frames[f.frames.length - 1]![6].slice(0, 2)).toEqual([11, 17]);
  });
});
