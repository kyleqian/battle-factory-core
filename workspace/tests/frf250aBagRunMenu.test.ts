// frf250a: BAG and RUN on the battle action menu. BAG prints "Items can't be used now." ({PAUSE 64}, auto-dismissed) and returns to the
// menu with the cursor on BAG; RUN asks the forfeit question with the yes/no box (cursor defaults to NO; A/B = NO). YES is frf250b (tests/frf250bForfeit.test.ts). The windows are measured on the ROM (tools/battle-lab/frf250a-*.json, compared via tools/compare/traces/frf250a-*.json); the SE
// fixtures are committed oracle output of tools/audio/soundEventProbe.py. This test needs no emulator.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import {
  BAG_MESSAGE_FIRST_GLYPH_AT,
  BAG_MESSAGE_RETURN_AT,
  FORFEIT_BOX_AT,
  FORFEIT_BOX_CLEAR_AT,
  FORFEIT_CLOSING_RETURN_AT,
  FORFEIT_QUESTION_FIRST_GLYPH_AT,
} from "../src/engine/battleCommandPresentation.ts";
import { drawBattleCommandYesNoBox } from "../src/engine/battleCommandPresentationRender.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface Fixture {
  frames: number;
  profile: string;
  events: Array<{ frame: number; kind: string; id: number | null; noop?: boolean }>;
  trace: {
    route: "generated-orchestrator";
    battleScene: "on" | "off";
    appStage: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}
const fixture = (lab: string, scene: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/frf250a-${lab}-${scene}-window.json`, import.meta.url), "utf8")) as Fixture;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

/** Replays the lab's key script; returns the SE ids with their frames and the phase/cursor timeline (changes only). */
function replay(rom: Fixture): { ses: string[]; timeline: string[] } {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  state = APP_STAGES[rom.trace.appStage.id]!(state);
  const ses: string[] = [];
  const timeline: string[] = [];
  let last = "";
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) ses.push(`${advance.frame}:${e.kind}:${e.id}`);
    const p = state.factoryRoundBattleOrchestrator?.battleCommandPresentation;
    const desc = p ? `${p.lifecycle.phase}/${p.actionCursor}/${p.forfeitCursor}` : "none";
    if (desc !== last) {
      timeline.push(`${advance.frame}:${desc}`);
      last = desc;
    }
  }
  return { ses, timeline };
}
// Every ROM SE of the window is compared, the action-menu cursor moves included (snd1 added that emitter; tests/snd1BattleMenuSounds.test.ts).
const romSes = (rom: Fixture): string[] =>
  rom.events.filter((e) => !e.noop && e.kind === "se").map((e) => `${e.frame}:${e.kind}:${e.id}`);

const LABS = [
  { lab: "bag", timeline: ["1:action-menu/1/1", "33:bag-message/1/1", "132:action-menu/1/1", "133:action-menu/3/1"] },
  {
    lab: "run-no",
    timeline: [
      "1:action-menu/1/1", "33:action-menu/3/1", "65:forfeit-question/3/1", "131:forfeit-question/3/0", "151:forfeit-question/3/1",
      "171:forfeit-closing/3/1", "178:action-menu/3/1", "179:action-menu/1/1",
    ],
  },
  {
    lab: "run-b",
    timeline: [
      "1:action-menu/1/1", "33:action-menu/3/1", "65:forfeit-question/3/1", "131:forfeit-question/3/0", "141:forfeit-closing/3/0",
      "148:action-menu/3/1", "149:action-menu/1/1",
    ],
  },
] as const;

describe("BAG / RUN state machine and SE_SELECT frames equal the ROM (both scenes)", () => {
  for (const scene of ["on", "off"] as const) {
    for (const { lab, timeline } of LABS) {
      it(`frf250a-${lab}-${scene}: phases, cursors and SE_SELECT frames`, () => {
        const rom = fixture(lab, scene);
        expect(rom.profile).toBe(scene === "on" ? "battle-scene-on" : "battle-scene-off");
        const { ses, timeline: ours } = replay(rom);
        expect(ours).toEqual(timeline);
        expect(ses).toEqual(romSes(rom));
        expect(ses.every((s) => s.endsWith(":se:5"))).toBe(true);
      });
    }
  }
});

describe("measured windows", () => {
  it("pins the ROM-measured tick counts", () => {
    expect({
      bagFirstGlyph: BAG_MESSAGE_FIRST_GLYPH_AT,
      bagReturn: BAG_MESSAGE_RETURN_AT,
      forfeitFirstGlyph: FORFEIT_QUESTION_FIRST_GLYPH_AT,
      forfeitBox: FORFEIT_BOX_AT,
      forfeitBoxClear: FORFEIT_BOX_CLEAR_AT,
      forfeitReturn: FORFEIT_CLOSING_RETURN_AT,
    }).toEqual({ bagFirstGlyph: 3, bagReturn: 99, forfeitFirstGlyph: 3, forfeitBox: 53, forfeitBoxClear: 4, forfeitReturn: 7 });
  });

  it("the BAG message returns to the menu 99 ticks after A (66 + the 33-tick text and PAUSE), with no button needed", () => {
    const { timeline } = replay(fixture("bag", "on"));
    // A pressed at lab frame 33 starts the message; lab frame 132 is back on the menu with no button in between.
    expect(timeline.slice(1, 3)).toEqual(["33:bag-message/1/1", "132:action-menu/1/1"]);
  });
});

describe("yes/no box pixels (HandleBattleWindow(24,8,29,13) + B_WIN_YESNO + BattleCreateYesNoCursorAt)", () => {
  const pixel = (fb: Uint8Array, x: number, y: number) => Array.from(fb.slice((y * 240 + x) * 4, (y * 240 + x) * 4 + 3));
  const draw = (cursor: 0 | 1) => {
    const fb = createFramebuffer();
    fb.fill(0);
    drawBattleCommandYesNoBox(fb, cursor);
    return fb;
  };

  it("the cursor arrow moves 16 px between YES and NO and nothing else changes", () => {
    const yes = draw(0);
    const no = draw(1);
    let diffLeft = Infinity;
    let diffRight = -Infinity;
    let diffTop = Infinity;
    let diffBottom = -Infinity;
    for (let y = 0; y < 160; y++) {
      for (let x = 0; x < 240; x++) {
        const a = pixel(yes, x, y);
        const b = pixel(no, x, y);
        if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) {
          diffLeft = Math.min(diffLeft, x);
          diffRight = Math.max(diffRight, x);
          diffTop = Math.min(diffTop, y);
          diffBottom = Math.max(diffBottom, y);
        }
      }
    }
    // the arrow's opaque pixels lie inside its 8x16 tile column (x 200..207, y 72..111)
    expect([diffLeft, diffRight, diffTop, diffBottom]).toEqual([201, 206, 76, 101]);
  });

  it("the box is 48x48 at (192,64), the text window fill is the battle text palette's bg (index 14) and the frame is the gTextWindowFrame1 art", () => {
    const fb = draw(1);
    expect(pixel(fb, 191, 64)).toEqual([0, 0, 0]);
    expect(pixel(fb, 240 - 1, 64 + 47)).toEqual([0, 0, 0]);
    const fill = pixel(fb, 231, 103);
    expect(fill).toEqual(pixel(fb, 230, 102));
    // the frame's outermost corner pixels are index 0 (transparent) and stay untouched, the next ring is drawn
    let framePixels = 0;
    for (let y = 64; y < 112; y++) for (let x = 192; x < 240; x++) if (pixel(fb, x, y).some((c) => c !== 0)) framePixels++;
    expect(framePixels).toBeGreaterThan(1000);
  });
});
