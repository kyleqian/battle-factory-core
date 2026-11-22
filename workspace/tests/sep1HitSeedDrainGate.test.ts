// sep1: the Scene ON Leech Seed drain launched right after a hit starts at max(script row, end of the hit's still-playing effectiveness SE) -- the ROM's
// IsBattleSEPlaying gate on HandleBattleAnimation (battle_controller_player/opponent.c; one gate with shb1's Shell Bell `73 - (49 + bar)`). The hit SE 13 plays
// 73 rows (src/data/gen/se-song-rows.json), so a short bar (SE end 670 > script exec 663) is gated, a long bar (SE end 677 < exec 708) is not.
// ROM: tools/integration/hcr3mProbe.py + soundEventProbe.py on tools/battle-lab/etp1-leechseed-on (short bar) and etp1-leechseedc-on (long bar); the pinned frames are the
// LeechSeedDrain SE 180 / final 179 rows of those windows. Scene OFF is not touched (its labs keep their own pins).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => any;
};

function drainSeFrames(name: string): { first180: number; last179: number } {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on");
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  const f180: number[] = [];
  const f179: number[] = [];
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se") (e.id === 180 ? f180 : e.id === 179 ? f179 : []).push(e.frame);
  }
  return { first180: f180[0]!, last179: f179[f179.length - 1]! };
}

describe("sep1: hit -> Leech Seed drain follows the IsBattleSEPlaying gate (Scene ON)", () => {
  it("short bar (etp1-leechseed-on): the drain starts at the hit SE's end (ROM SE 180 at 697, 179 at 810)", () => {
    expect(drainSeFrames("etp1-leechseed-on")).toEqual({ first180: 697, last179: 810 });
  });
  it("long bar (etp1-leechseedc-on): the drain starts at the script row, not gated (ROM SE 180 at 735, 179 at 848)", () => {
    expect(drainSeFrames("etp1-leechseedc-on")).toEqual({ first180: 735, last179: 848 });
  });
});
