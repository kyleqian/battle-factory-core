// hpf5 (docs/hpd1-hp-hold.md "hpf5"): the end-of-turn tick / weather / wrap-hit / Substitute-cost hp commands carry the ROM-measured lengths (hpf4m labs, both scenes).
// Each case replays the app stage the ROM lab was measured on (per turn: A, A, then a 1100-frame wait; faintpoison 7 turns, toxic 3, the rest 2) and reads the presented hp commands' timing objects.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};
const TURNS: Record<string, number> = { faintpoison: 7, toxic: 3 };
const segments = (name: string) => Array.from({ length: TURNS[name] ?? 2 }, () => [{ frames: 2, buttons: ["A"] }, { frames: 18, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1100, buttons: [] }]).flat();

function hpTimings(name: string, scene: "on" | "off"): Array<Record<string, number>> {
  let state: any = createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
  state = APP_STAGES[`hpf4m-${name}-${scene}`]!(state);
  const seen = new Set<unknown>();
  const timings: Array<Record<string, number>> = [];
  for (const advance of traceAdvances(segments(name) as never)) {
    state = tick(state, advance.buttons);
    const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const segment = r?.segments[r.segmentIndex];
    if (segment === undefined || seen.has(segment)) continue;
    seen.add(segment);
    for (const c of segment.commands as any[]) if (c.type === "hp") timings.push({ ...c.timing });
  }
  return timings;
}

const has = (timings: Array<Record<string, number>>, want: Record<string, number>) => timings.some((t) => Object.entries(want).every(([k, v]) => t[k] === v));

describe("hpf5 hp lengths", () => {
  for (const scene of ["on", "off"] as const) {
    it(`${scene}: poison / toxic / burn / wrap-family tick hp is floor-free (T1)`, () => {
      for (const name of ["poison", "toxic", "burn", "bind"]) expect(has(hpTimings(name, scene), { minimumFrames: 0 }), name).toBe(true);
    });
    it(`${scene}: the faint-next tick holds 2 frames before the faint chain (T4)`, () => {
      expect(has(hpTimings("faintpoison", scene), { minimumFrames: 0, tailFrames: 2 })).toBe(true);
    });
    it(`${scene}: the sandstorm tick has the message tail 10 or the last-tick tail 4 (T3)`, () => {
      const t = hpTimings("sandstorm", scene);
      expect(has(t, { minimumFrames: 0, tailFrames: 10 }) || has(t, { minimumFrames: 0, tailFrames: 4 })).toBe(true);
    });
    it(`${scene}: the wrap-family hit holds 7 frames before its secondary message (T2)`, () => {
      for (const name of ["wrap", "bind", "firespin"]) expect(has(hpTimings(name, scene), { minimumFrames: 0, tailFrames: 7 }), name).toBe(true);
    });
    it(`${scene}: the Substitute cost keeps tail 3 and drops the 28 floor (S1)`, () => {
      expect(has(hpTimings("substitute", scene), { minimumFrames: 0, tailFrames: 3 })).toBe(true);
    });
  }
});
