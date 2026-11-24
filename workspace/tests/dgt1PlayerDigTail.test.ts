// dgt1 (docs/aud251-s11-scoreboard-refresh.md "dgt1"; ttb1 / mmc1 "Left": the player's Dig first-turn tail, T2 s3738 d47): the PLAYER's first charging turn after a modelled action
// (Light Screen) opens its dug-hole glyph 10 rows later with 3 more hold rows, and the second turn drops the press lead like the foe's (mmc1), so the second turn's SEs sit on the
// ROM rows. ROM (labCompare, Scene ON): chg4-dig-lightscreen-on SE 141 808 / 1756, SE 13 846 / 1794 (engine same), the charge SE 175 292 .. 428 (engine 290 .. 426, the lab's
// standing 2-row opener offset); mass 44 -> 20. stm1-sd-dig-on 50 -> 24.
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

function seFrames(name: string, scene: "on" | "off", id: number): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
  const out: number[] = [];
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id === id) out.push(e.frame);
  }
  return out;
}

describe("dgt1: the player's Dig after another action (Scene ON)", () => {
  it("chg4-dig-lightscreen-on: the second turn's hit SEs are on the ROM rows", () => {
    expect(seFrames("chg4-dig-lightscreen-on", "on", 141)).toEqual([808, 1756]);
    expect(seFrames("chg4-dig-lightscreen-on", "on", 13).filter(f => f > 800)).toEqual([846, 1794]);
  }, 120000);
});
