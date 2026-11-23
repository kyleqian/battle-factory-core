// obr2 (ISSUES #200 a / b): the "Foe X fainted!" box across an opponent faint replacement, pinned to the ROM frames of
// tools/compare/traces/obr251-opponent-faint-{on,off}.json (A on 500..501; `npm run compare` 0 px over 495..710 on both scenes).
//   ON : the faint text keeps its frozen down-arrow until the first glyph of "<trainer> sent out <mon>!" at 626 (the ROM's `\p` press landed on a
//        non-redraw frame, so no blank: text.c RENDER_STATE_CLEAR, fnt1);
//   OFF: the press landed on a redraw frame (k % 9 == 0), the box is blank from 502 (A + 1) to 625.
// Both were open residuals of obr251 (37 px / 608 px constant); fnt1's `\p` model closed them, this pins it for the opponent bar window.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

type Box = "faint-text" | "faint-text+arrow" | "blank" | "sent-out";

function boxes(scene: "on" | "off"): Map<number, Box> {
  const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/obr251-opponent-faint-${scene}.json`, import.meta.url), "utf8")) as {
    appRoute: "generated-orchestrator";
    appStage: { id: string };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
  let state = APP_STAGES[trace.appStage.id]!(createInitialState({ appRoute: trace.appRoute, battleScene: scene }));
  const out = new Map<number, Box>();
  for (const advance of traceAdvances(trace.segments)) {
    if (advance.frame > 640) break;
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (!resolution || advance.frame < 495) continue;
    const view = createBattleResolutionPresentationRenderView(resolution);
    const text = view.message?.lines.join(" ") ?? null;
    out.set(
      advance.frame,
      text === null ? "blank" : text.includes("sent") ? "sent-out" : view.waitCursor === null ? "faint-text" : "faint-text+arrow",
    );
  }
  return out;
}

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, index) => from + index);

describe("opponent faint box before the replacement's party bar (obr2)", () => {
  it("Scene ON: the faint text keeps its down-arrow through A + 125 (495..625), the sent-out print starts at 626", () => {
    const frames = boxes("on");
    for (const frame of range(495, 625)) expect(frames.get(frame), `ON frame ${frame}`).toBe("faint-text+arrow");
    for (const frame of range(626, 640)) expect(frames.get(frame), `ON frame ${frame}`).toBe("sent-out");
  });

  it("Scene OFF: the box is blank from 502 (A + 1) until the sent-out print at 626", () => {
    const frames = boxes("off");
    for (const frame of range(495, 501)) expect(frames.get(frame), `OFF frame ${frame}`).toBe("faint-text+arrow");
    for (const frame of range(502, 625)) expect(frames.get(frame), `OFF frame ${frame}`).toBe("blank");
    for (const frame of range(626, 640)) expect(frames.get(frame), `OFF frame ${frame}`).toBe("sent-out");
  });
});
