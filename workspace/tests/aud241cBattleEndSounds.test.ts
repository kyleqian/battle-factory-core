// aud241c: the battle end's sounds (victory BGM, the A-accepted terminal boxes, the end fade, the battle-return BGM, SE_EXIT, the loss's
// opponent ball return) against the committed step-mode ROM windows tools/audio/fixtures/aud241c-*-window.json. The ROM windows are lab
// runs whose A cadence is part of the evidence; the engine is staged on the same last faint (APP_STAGES["aud241c-*"]) and driven with
// the A presses at the ROM's SE_SELECT offsets from SE_FAINT. See docs/aud241c-battle-end-sounds.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { beginScreenSoundTick, handleLowHpMusicChange, stopLowHpSound } from "../src/engine/screenSounds.ts";
import type { GbaButton } from "../src/input.ts";

interface FixtureEvent {
  frame: number;
  kind: string;
  id: number | null;
  pan: number | null;
  noop?: boolean;
  speed?: number;
}
interface Fixture {
  profile: string;
  frames: number;
  events: FixtureEvent[];
}
const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

const SE_FAINT = 16;
const SE_SELECT = 5;
// The battle-end family: SE_FAINT (the anchor), the dismiss SE_SELECTs, the effective low-HP stop, victory / return BGM, the end fade, SE_EXIT, SE_BALL_OPEN.
const inFamily = (e: { kind: string; id: number | null }): boolean =>
  (e.kind === "se" && [SE_FAINT, SE_SELECT, 9, 15].includes(e.id as number)) ||
  (e.kind === "stop" && e.id === 90) ||
  e.kind === "bgm" ||
  e.kind === "fade";

interface Window {
  stage: string;
  scene: "on" | "off";
  /** How many of the ROM's SE_SELECT presses the engine's resolution owns (the lobby / heal SE_SELECTs belong to aud240d). */
  dismisses: number;
}

function run(window: Window, buttonFrames: ReadonlySet<number>, frames: number, collect = true): { events: SoundEvent[]; state: string } {
  let state = APP_STAGES[window.stage]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: window.scene }));
  const events: SoundEvent[] = [];
  for (let frame = 1; frame <= frames; frame += 1) {
    const buttons = new Set<GbaButton>(buttonFrames.has(frame) || buttonFrames.has(frame - 1) ? ["A"] : []);
    if (collect) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, buttons));
      state = result.result;
      events.push(...result.events);
    } else {
      state = tick(state, buttons);
    }
  }
  return { events: events.filter(inFamily), state: JSON.stringify(state) };
}

const OPENING_A = [1, 21];

type Row = { rel: number; kind: string; id: number | null; pan: number | null; speed?: number };

/** Our events, with frames relative to our SE_FAINT, for the ROM fixture's cadence. */
function ours(window: Window, rom: Fixture): Row[] {
  const romFaint = rom.events.filter((e) => e.kind === "se" && e.id === SE_FAINT).at(-1)!.frame;
  const selects = rom.events.filter((e) => e.kind === "se" && e.id === SE_SELECT).map((e) => e.frame - romFaint);
  const probe = run(window, new Set(OPENING_A), 700, true);
  const faint = probe.events.filter((e) => e.kind === "se" && e.id === SE_FAINT).at(-1)!.frame;
  const presses = new Set([...OPENING_A, ...selects.slice(0, window.dismisses).map((rel) => faint + rel)]);
  const result = run(window, presses, Math.max(...presses) + 400, true);
  return result.events
    .filter((e) => e.frame >= faint)
    .map((e) => ({ rel: e.frame - faint, kind: e.kind, id: e.id, pan: e.pan, ...(e.speed === undefined ? {} : { speed: e.speed }) }));
}

function romRelative(rom: Fixture, upTo: number): Row[] {
  const romFaint = rom.events.filter((e) => e.kind === "se" && e.id === SE_FAINT).at(-1)!.frame;
  return rom.events
    .filter((e) => e.noop !== true && inFamily(e) && e.frame >= romFaint && e.frame - romFaint <= upTo)
    .map((e) => ({ rel: e.frame - romFaint, kind: e.kind, id: e.id, pan: e.pan, ...(e.speed === undefined ? {} : { speed: e.speed }) }));
}

const describeWindow = (name: string, window: Window, upTo: number, count: number, deltas: number[] = new Array<number>(count).fill(0)) => {
  it(`${name}: the end sounds are the ROM's, in order, with the listed frame deltas`, () => {
    const rom = fixture(name);
    expect(rom.profile).toBe(window.scene === "on" ? "battle-scene-on" : "battle-scene-off");
    const mine = ours(window, rom).filter((e) => e.rel <= upTo + 20);
    const theirs = romRelative(rom, upTo);
    expect(theirs).toHaveLength(count);
    expect(mine.map((e) => ({ ...e, rel: 0 }))).toEqual(theirs.map((e) => ({ ...e, rel: 0 })));
    expect(mine.map((e, index) => e.rel - theirs[index]!.rel)).toEqual(deltas);
  });
};

describe("battle-end sounds match the ROM windows (aud241c)", () => {
  describeWindow("aud241c-win-on-window", { stage: "aud241c-win-on", scene: "on", dismisses: 3 }, 400, 8);
  describeWindow("aud241c-win-off-window", { stage: "aud241c-win-off", scene: "off", dismisses: 3 }, 400, 8);
  describeWindow("aud241c-brain-on-window", { stage: "aud241c-brain-on", scene: "on", dismisses: 3 }, 400, 7);
  describeWindow("aud241c-brain-off-window", { stage: "aud241c-brain-off", scene: "off", dismisses: 3 }, 400, 7);
  // lrm1: the ROM fixtures are the player's own Explosion (SE_BALL_OPEN = faint box A + 24, engine lead 22); these stages are a target faint (the foe's
  // Seismic Toss), whose ROM A -> SE_BALL_OPEN is 28 (lrm1-loss-targetfaint labs), so the third row (SE_BALL_OPEN) is +4 against the Explosion
  // fixture: the stage / fixture mismatch, not an engine error (the lab pair and tests/lrc1LossRecall.test.ts pin the 28).
  const targetFaintBall = [0, 0, 4, 0, 0, 0, 0, 0];
  describeWindow("aud241c-loss-on-window", { stage: "aud241c-loss-on", scene: "on", dismisses: 3 }, 1400, 8, targetFaintBall);
  describeWindow("aud241c-loss-off-window", { stage: "aud241c-loss-off", scene: "off", dismisses: 3 }, 700, 8, targetFaintBall);
});

describe("write-only and the low-HP loop (aud241c)", () => {
  it("collecting sounds does not change the engine state through the whole battle end (win, Brain win, loss; both scenes)", () => {
    for (const [stage, scene] of [["aud241c-win-on", "on"], ["aud241c-win-off", "off"], ["aud241c-brain-on", "on"], ["aud241c-loss-off", "off"]] as const) {
      const window: Window = { stage, scene, dismisses: 3 };
      const presses = new Set([1, 21, 501, 601, 701, 801, 1100]);
      expect(run(window, presses, 1300, true).state, stage).toBe(run(window, presses, 1300, false).state);
    }
  });

  it("BattleStopLowHpSound is a real stop only while the loop plays, and clears it", () => {
    const events = (calls: () => void) => collectSoundTick(1, () => { beginScreenSoundTick(1); calls(); }).events.map((e) => `${e.kind}:${e.id}`);
    expect(events(() => { stopLowHpSound(); })).toEqual([]);
    expect(events(() => { handleLowHpMusicChange(11, 61); stopLowHpSound(); stopLowHpSound(); })).toEqual(["se:90", "stop:90"]);
  });
});
