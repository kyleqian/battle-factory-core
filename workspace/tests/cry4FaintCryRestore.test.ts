// cry4: playFaintCry's BGM restore and cry1's cry-task lengths come from cry3's derived tables (src/data/cryModeFrames.ts). aud241b's linear fit was wrong on 24 species; the ROM rows of those
// 24 (tests/fixtures/cry4-lengths.json, tools/audio/cryLengthProbe.py) pin the new restore frames. Roar's ROAR_2 for species 390 was the one cry1 fit miss (33; ROM 32).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { CRY_FAINT_FRAMES, CRY_ROAR_2_FRAMES } from "../src/data/cryModeFrames.ts";
import { beginScreenSoundTick, BGM_BATTLE, playFaintCry, runScheduledScreenSounds } from "../src/engine/screenSounds.ts";

const rom = JSON.parse(readFileSync(new URL("./fixtures/cry4-lengths.json", import.meta.url), "utf8")) as { FAINT: [number, number][]; ROAR_2: [number, number][] };

describe("cry4 faint cry restore", () => {
  it("the fixture is the 24 species aud241b's fit missed", () => {
    expect(rom.FAINT.map(([species]) => species)).toEqual([31, 39, 47, 65, 103, 114, 122, 124, 144, 146, 157, 158, 210, 217, 234, 242, 307, 313, 314, 329, 331, 343, 369, 397]);
  });

  it("playFaintCry restores the BGM on the ROM's frame for each of them (and the cry / duck rows are unchanged)", () => {
    for (const [species, restore] of rom.FAINT) {
      const events: SoundEvent[] = [];
      for (let frame = 1; frame <= 170; frame += 1) {
        events.push(...collectSoundTick(frame, () => {
          beginScreenSoundTick(frame);
          if (frame === 1) playFaintCry(BGM_BATTLE, species, 25);
          runScheduledScreenSounds();
        }).events);
      }
      expect(events.filter((e) => e.kind === "duck").map((e) => [e.frame, (e as { volume?: number }).volume]), `${species}`).toEqual([[1, 85], [1 + restore, 256]]);
      expect(events.filter((e) => e.kind === "cry").map((e) => [e.frame, e.id, (e as { mode?: number }).mode]), `${species}`).toEqual([[1, species, 5]]);
    }
  });

  it("the derived faint length + 1 is the ROM restore", () => {
    for (const [species, restore] of rom.FAINT) expect(CRY_FAINT_FRAMES[species]! + 1, `${species}`).toBe(restore);
  });
});

describe("cry4 cry-task lengths", () => {
  it("ROAR_2 species 390: ROM 32, not the fitted 33", () => {
    expect(rom.ROAR_2).toEqual([[390, 32]]);
    expect(CRY_ROAR_2_FRAMES[390]! + 1).toBe(32);
  });
});
