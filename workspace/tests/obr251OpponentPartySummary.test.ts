// obr251: the opponent's faint-replacement party-status bar (hold, slide, mirrored balls, BLDALPHA fade, SE_BALL_TRAY_ENTER).
// ROM frames come from tools/compare/traces/obr251-opponent-faint-{on,off}.json (A pressed at 501) and the committed STEP-mode probe
// fixtures tools/audio/fixtures/obr251-opponent-faint-{on,off}-window.json. No emulator needed.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { ballDisplay, OPP_BAR_X2 } from "../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import {
  drawOpponentPartySummary,
  opponentPartySummaryFrame,
} from "../src/engine/midBattleOpponentPartySummary.ts";
import {
  OPPONENT_SUMMARY_FADE_DELAY_FRAMES,
  OPPONENT_SUMMARY_FADE_FRAMES,
  OPPONENT_SUMMARY_FAINT_LEAD_FRAMES,
  OPPONENT_SUMMARY_HOLD_FRAMES,
  opponentPartySummaryDrawTiming,
} from "../src/engine/midBattleOpponentPartySummaryTiming.ts";
import { SE_BALL_TRAY_ENTER } from "../src/engine/screenSounds.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

interface Fixture {
  frames: number;
  profile: string;
  events: Array<{ frame: number; kind: string; id: number | null; pan: number | null; player?: string }>;
  trace: { route: "generated-orchestrator"; battleScene: "on" | "off"; appStage: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> };
}
const fixture = (scene: "on" | "off"): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/obr251-opponent-faint-${scene}-window.json`, import.meta.url), "utf8")) as Fixture;

type Timeline = {
  starts: Array<{ name: string; frame: number }>;
  summary: Map<number, { createAge: number; fadeAge: number | null } | null>;
  sounds: SoundEvent[];
};

function replay(scene: "on" | "off"): Timeline {
  const rom = fixture(scene);
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  state = APP_STAGES[rom.trace.appStage.id]!(state);
  const timeline: Timeline = { starts: [], summary: new Map(), sounds: [] };
  let previous = "";
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    timeline.sounds.push(...result.events);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (!resolution || advance.frame < 495) continue;
    const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
    const name = command === undefined ? "end" : command.type === "party-summary" ? `party-summary:${command.battler}:${command.visible}` : command.type;
    const key = `${resolution.segmentIndex}/${resolution.commandIndex}/${name}`;
    if (key !== previous) timeline.starts.push({ name, frame: advance.frame });
    previous = key;
    const view = createBattleResolutionPresentationRenderView(resolution).partySummary;
    timeline.summary.set(advance.frame, view === null ? null : { createAge: view.createAge, fadeAge: view.fadeAge });
  }
  return timeline;
}

describe("opponent mid-battle party-status summary (obr251)", () => {
  it("timing constants: 100-frame controller hold, 23-frame script lead after an opponent faint", () => {
    expect(OPPONENT_SUMMARY_HOLD_FRAMES).toBe(100);
    expect(OPPONENT_SUMMARY_FAINT_LEAD_FRAMES).toBe(23);
    expect(opponentPartySummaryDrawTiming(true)).toEqual({ minimumFrames: 123, leadFrames: 23 });
    expect(opponentPartySummaryDrawTiming(false)).toEqual({ minimumFrames: 100, leadFrames: 0 });
    expect(OPP_BAR_X2.length).toBe(20);
    expect(OPPONENT_SUMMARY_FADE_FRAMES).toBe(16);
  });

  for (const scene of ["on", "off"] as const) {
    describe(`Scene ${scene.toUpperCase()} (A at 501)`, () => {
      const timeline = replay(scene);

      it("the draw starts at A+2 (503) and holds to the first glyph of the next print at 626, the ROM's first-glyph frame", () => {
        const startOf = (name: string, after = 0) => timeline.starts.find((entry) => entry.name === name && entry.frame > after)?.frame;
        expect(startOf("party-summary:1:true")).toBe(503);
        expect(startOf("message", 503)).toBe(626);
        expect(startOf("party-summary:1:false", 503)).toBe(651);
        expect(startOf("switch-in", 503)).toBe(652);
      });

      it("the bar exists from 527 (ROM first pixels), slides by OPP_BAR_X2 to settled at 546, then fades 16 steps after the hide", () => {
        const frames = [...timeline.summary.entries()].filter(([, view]) => view !== null).map(([frame, view]) => ({ frame, frame2: opponentPartySummaryFrame(view!) }));
        const visible = frames.filter((entry) => entry.frame2 !== null);
        expect(visible[0]!.frame).toBe(527);
        expect(visible[0]!.frame2).toEqual({ x2: OPP_BAR_X2[0], eva: null });
        const byFrame = new Map(visible.map((entry) => [entry.frame, entry.frame2!]));
        for (let index = 0; index < OPP_BAR_X2.length; index += 1) expect(byFrame.get(527 + index)!.x2).toBe(OPP_BAR_X2[index]);
        expect(byFrame.get(546)).toEqual({ x2: 0, eva: null });
        expect(byFrame.get(625)).toEqual({ x2: 0, eva: null });
        expect(byFrame.get(653)).toEqual({ x2: 0, eva: null });
        const fade: number[] = [];
        for (let frame = 654; byFrame.has(frame); frame += 1) fade.push(byFrame.get(frame)!.eva!);
        expect(fade).toEqual([15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
        expect(byFrame.has(669)).toBe(false);
        expect(OPPONENT_SUMMARY_FADE_DELAY_FRAMES + OPPONENT_SUMMARY_FADE_FRAMES).toBe(18);
      });

      it("SE_BALL_TRAY_ENTER pan 0 on SE12 at bar creation, on the ROM's STEP-mode frame, once", () => {
        const rom = fixture(scene);
        const romTray = rom.events.filter((event) => event.kind === "se" && event.id === SE_BALL_TRAY_ENTER);
        expect(romTray).toEqual([expect.objectContaining({ frame: 526, pan: 0 })]);
        const ours = timeline.sounds.filter((event) => event.kind === "se" && event.id === SE_BALL_TRAY_ENTER);
        expect(ours.map((event) => ({ frame: event.frame, pan: event.pan, player: event.player }))).toEqual([{ frame: 526, pan: 0, player: "SE12" }]);
      });
    });
  }

  it("draws the bar and balls riding on it: mirrored order states[5-index], ROM tile offsets (fainted 3, status 2, empty 1), no stagger", () => {
    const states = ["fainted", "healthy", "status", "empty", "empty", "empty"] as const;
    const draw = (createAge: number): Uint8Array => {
      const fb = new Uint8Array(240 * 160 * 4).fill(7);
      drawOpponentPartySummary(fb, { states, createAge, fadeAge: null });
      return fb;
    };
    const iconPixel = (fb: Uint8Array, x: number, y: number) => [...fb.subarray((y * 240 + x) * 4, (y * 240 + x) * 4 + 3)];
    const rgb = (index: number) => [ballDisplay.palette[index]!.r, ballDisplay.palette[index]!.g, ballDisplay.palette[index]!.b];
    const settled = draw(200);
    // Row 1, column 3 of each tile (a distinguishing pixel): index 5 -> states[0] fainted (tile 3), 4 -> healthy (0), 3 -> status (2), 0..2 -> empty (1).
    const tileAt = (offset: number) => ballDisplay.tileset.tiles[offset]![1 * 8 + 3]!;
    expect(iconPixel(settled, 26 + 5 * 10 + 3, 32 + 1)).toEqual(rgb(tileAt(3)));
    expect(iconPixel(settled, 26 + 4 * 10 + 3, 32 + 1)).toEqual(rgb(tileAt(0)));
    expect(iconPixel(settled, 26 + 3 * 10 + 3, 32 + 1)).toEqual(rgb(tileAt(2)));
    expect(tileAt(3)).not.toBe(tileAt(2));
    // Mid-slide: every ball is shifted by the same x2 as the bar (index 9 of the table is -50: icons at 26 + 10 * index - 50).
    const mid = draw(1 + 9);
    expect(iconPixel(mid, 26 + 5 * 10 + 3 + OPP_BAR_X2[9]!, 32 + 1)).toEqual(rgb(tileAt(3)));
    expect(iconPixel(mid, 26 + 4 * 10 + 3 + OPP_BAR_X2[9]!, 32 + 1)).toEqual(rgb(tileAt(0)));
    // Nothing before creation, nothing after the fade.
    expect(draw(-5).every((value) => value === 7)).toBe(true);
    const faded = new Uint8Array(240 * 160 * 4).fill(7);
    drawOpponentPartySummary(faded, { states, createAge: 300, fadeAge: OPPONENT_SUMMARY_FADE_DELAY_FRAMES + OPPONENT_SUMMARY_FADE_FRAMES });
    expect(faded.every((value) => value === 7)).toBe(true);
  });
});
