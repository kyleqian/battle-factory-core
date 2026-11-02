// snd182 (ISSUES #146; docs/snd182-scene-on-forced-player-send-in-live.md, from docs/snd179-scene-on-forced-player-send-in.md): the Scene ON
// forced PLAYER send-in ("X was dragged out!") duration = shift + max(91, cry + 66, T_back + 70), against the snd179 sweep (339 rows, nature 6)
// and the fresh ROM probes (27 cases, nature-dependent species included); production's switchInTiming for it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation";
import {
  backAnimWaitTick, opponentSwitchInDuration, sceneOffPlayerForcedSwitchInDuration, sceneOnPlayerForcedSwitchInDuration,
} from "../src/engine/switchInTail";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../src/data/sendInTailOff";

const NATURE_DOCILE = 6;
// GetNature(mon) = personality % 25: a personality equal to the nature id selects it.
const duration = (species: number, nature: number) => sceneOnPlayerForcedSwitchInDuration(species, nature);

describe("snd182: Scene ON forced player send-in duration", () => {
  it("reproduces the ON player-target sweep: \"dragged out!\" 339 / 339 (nature 6)", () => {
    const rows = readFileSync("tools/integration/fixtures/forced-switch/species-sweep-player-target.txt", "utf8").split("\n")
      .map((l) => /^(\d+) \S+ pidx \[1, 0\] species \[\d+, \d+\] ball (\d+) y2start \S+ hbslide (\d+) ctrlIdle \S+ txtStart (\d+)/.exec(l))
      .filter((m) => m !== null).map((m) => m!.slice(1).map(Number));
    expect(rows).toHaveLength(339);
    const bounds = { slide: 0, cry: 0, back: 0 };
    for (const [species, ball, , text] of rows) {
      expect(duration(species!, NATURE_DOCILE), `species ${species}`).toBe(text! - ball!);
      const cry = (SEND_IN_TAIL_OFF_CRY_FRAMES[species!] ?? 0) + 66;
      const back = (backAnimWaitTick(species!, NATURE_DOCILE) ?? -100) + 70;
      if (back > Math.max(91, cry)) bounds.back += 1; else if (cry > 91) bounds.cry += 1; else bounds.slide += 1;
    }
    expect(bounds.slide).toBeGreaterThan(0);
    expect(bounds.cry).toBeGreaterThan(0);
    expect(bounds.back).toBeGreaterThan(0);
  });

  it.each([
    ["rom-rows-r1.json"], ["rom-rows-attackers-r1.json"],
  ])("reproduces the fresh ROM probes in %s", (file) => {
    const rows = JSON.parse(readFileSync(`tools/integration/fixtures/snd179/${file}`, "utf8")) as { id: string; case: { species: number; nature?: number }; message: number }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(duration(row.case.species, row.case.nature ?? NATURE_DOCILE), row.id).toBe(row.message);
  });

  it("the three bounds, CASTFORM's shift and a nature-dependent species", () => {
    expect(duration(16, NATURE_DOCILE)).toBe(91); // PIDGEY: slide-bound
    expect(duration(11, NATURE_DOCILE)).toBe(132); // METAPOD: cry-bound
    expect(duration(321, NATURE_DOCILE)).toBe(198); // TORKOAL: back-animation-bound
    expect(duration(385, NATURE_DOCILE)).toBe(158); // CASTFORM: back-animation-bound + 1
    expect(duration(1, 0)).toBe(132); // BULBASAUR: nature picks the back animation (ROM probes: 132 / 161)
    expect(duration(1, 10)).toBe(161);
    expect(duration(1, 0 + 25)).toBe(duration(1, 0)); // the nature is personality % 25
    expect(duration(321, 0)).toBe(duration(321, 10));
  });

  it("switchInTiming: Scene ON forced player send-in moves; voluntary (vis243a), OFF-forced and opponent send-ins", () => {
    expect(switchInTiming(0, 321, true, "TORKOAL", true, NATURE_DOCILE)).toEqual({ minimumFrames: 198 - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
    expect(switchInTiming(0, 16, true, "PIDGEY", true, NATURE_DOCILE)).toEqual({ minimumFrames: 91 - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
    expect(switchInTiming(0, 1, true, "BULBASAUR", true, 10)).toEqual({ minimumFrames: 161 - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
    // vis243a: the voluntary player send-in waits for the same chain, with the 11-frame waitstate hold on top (commands carry it separately).
    expect(switchInTiming(0, 321, true, "TORKOAL", false, NATURE_DOCILE)).toEqual({ minimumFrames: 198 });
    expect(switchInTiming(0, 321, false, "TORKOAL", false, NATURE_DOCILE)).toEqual({ minimumFrames: sceneOffPlayerForcedSwitchInDuration(321) });
    expect(switchInTiming(0, 10, true, "CATERPIE", false, 0)).toEqual({ minimumFrames: 91 });
    expect(switchInTiming(0, 321, false, "TORKOAL", true, NATURE_DOCILE))
      .toEqual({ minimumFrames: sceneOffPlayerForcedSwitchInDuration(321) - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
    expect(switchInTiming(1, 321, true, "TORKOAL", false, NATURE_DOCILE))
      .toEqual({ minimumFrames: opponentSwitchInDuration(321) - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
  });
});
