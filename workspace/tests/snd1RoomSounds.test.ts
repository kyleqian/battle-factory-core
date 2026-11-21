// snd1 (Kyle's 2026-11-20 live play): the first walk from the pre-battle room into the battle room had no SE_EXIT; the later walks did.
// ROM window: tools/audio/fixtures/snd1-first-walk-window.json, tools/audio/soundEventProbe.py step mode over the canonical
// battle1-swapyes-b trace from frame 300 (the draft's last A is 261): EnterBattleRoom's warp plays DoWarp's PlaySE(SE_EXIT)
// (field_screen_effect.c:490) at 484, then the battle BGM, the ball tray, the intro text A, the send-outs and the turn-1 menus.
// The live route (generated orchestrator, Scene ON) replays the same inputs; every effective ROM event of the window must match.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { frontierTransitionPresentationForTableIndex } from "../src/engine/battleTransition.ts";

interface RomEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean; volume?: number }
const rom = JSON.parse(readFileSync(new URL("../tools/audio/fixtures/snd1-first-walk-window.json", import.meta.url), "utf8")) as {
  from: number;
  frames: number;
  events: RomEvent[];
};
const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces-groundtruth/battle1-swapyes-b.json", import.meta.url), "utf8")) as {
  segments: Array<{ frames: number; buttons?: string[] }>;
};

/**
 * tri1 (docs/tri1-transition-intro-handoff.md "Open"): the recording's battle 1 drew CIRCLES_MEET (table index 4); for these inputs the
 * engine's room draws CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ (its RNG at the draw is not the recording's). Since tri1 the battle intro starts on
 * the drawn transition's own frame, so the replay carries the recording's transition (the draw's RNG step is kept).
 */
function withRecordedTransition(state: EngineState): EngineState {
  const drawn = state.battleRoom?.transitionPresentation;
  if (drawn === undefined || drawn.tableIndex === 4) return state;
  return { ...state, battleRoom: { ...state.battleRoom!, transitionPresentation: frontierTransitionPresentationForTableIndex(4, drawn.rngAfterDraw) } };
}

function ours(): string[] {
  let state = createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" });
  const out: string[] = [];
  for (const advance of traceAdvances(trace.segments)) {
    if (advance.frame > rom.from + rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = withRecordedTransition(result.result);
    if (advance.frame <= rom.from) continue;
    // hcr2c: rows carry the stamped (ROM-clock) frame, the same basis as the T1/T2 scoreboards; the tick frame runs the hcr2 action-dispatch hold later.
    // ROM duck rows carry the BGM song id and a volume; ours do too (`volume`); the probe's duck pan is null.
    for (const e of result.events) out.push(`${e.frame}:${e.kind}:${e.id}:${e.kind === "duck" ? null : e.pan}`);
  }
  return out;
}

describe("first walk into the battle room through turn 1 (Scene ON, live route)", () => {
  it("SE_EXIT on the first warp, and every other sound of the window, on the ROM frame", () => {
    const romRows = rom.events.filter((e) => !e.noop).map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}`);
    expect(romRows[0]).toBe("484:se:9:null");
    expect(ours()).toEqual(romRows);
  });
});
