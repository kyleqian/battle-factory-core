// ssl1 (docs/aud251-s11-scoreboard-refresh.md "ssm1" / "ssl1"): Supersonic (48) joins the c-lead body class (window adjust 28, sound clock lead 4).
// Labs ttf1-supersonic-{opponent-magneton-player-mantine,player-magneton-opponent-mantine}-on: the six SE 184 rings and the six Confusion SE 176 sit on the ROM's frames (labCompare mass 144 / 150 -> 0 / 2).
// ssl1-supersonic-owntempo-on: an Own Tempo target skips `attackanimation` (EffectConfuse+0x1d jumpifability -> OwnTempoPrevents), so there is no Supersonic body and no 28-row tail.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { C_LEAD_WINDOW_ADJUST } from "../src/engine/battleResolutionPresentation.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => any;
};

function seFrames(name: string): Map<number, number[]> {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on");
  const out = new Map<number, number[]>();
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) if (e.kind === "se" && e.id !== null && e.frame !== null) out.set(e.id, [...(out.get(e.id) ?? []), e.frame]);
  }
  return out;
}

describe("ssl1: Supersonic then Confusion, Scene ON", () => {
  it("the c-lead window adjust is 28", () => {
    expect(C_LEAD_WINDOW_ADJUST.get(48)).toBe(28);
  });
  it("the opponent's Supersonic: SE 184 x 6 and the Confusion SE 176 on the ROM's frames", () => {
    const se = seFrames("ttf1-supersonic-opponent-magneton-player-mantine-on");
    expect(se.get(184)).toEqual([86, 90, 94, 98, 102, 106]);
    expect(se.get(176)?.slice(0, 6)).toEqual([158, 172, 186, 200, 214, 228]);
  }, 60000);
  it("the player's Supersonic", () => {
    const se = seFrames("ttf1-supersonic-player-magneton-opponent-mantine-on");
    expect(se.get(184)).toEqual([82, 86, 90, 94, 98, 102]);
    expect(se.get(176)?.slice(0, 6)).toEqual([154, 168, 182, 196, 210, 224]);
  }, 60000);
  it("an Own Tempo target: no Supersonic ring, no Confusion animation", () => {
    const se = seFrames("ssl1-supersonic-owntempo-on");
    expect(se.get(184)).toBeUndefined();
    expect(se.get(176)).toBeUndefined();
  }, 60000);
});
