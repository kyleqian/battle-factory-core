// Draws the lbr-e PreBattleRoom entry (prebattleEntry.ts): the walking room, the briefing box, the fade to black.
// The draft fade-in is drawn by core (it owns the draft screen).
import { createFramebuffer } from "./framebuffer.ts";
import {
  drawMessageBoxFrame,
  drawMessageBoxFrameFaded,
  drawMessageBoxTextFaded,
  drawMessageBoxWaitArrow,
  renderPrebattleRoomWalkScene,
} from "./prebattleRoomRender.ts";
import { bgFadeY, objFadeY, FADE_IN, type FadeTiming } from "./paletteFade.ts";
import {
  PREBATTLE_ENTRY_TIMING,
  briefingGlyphCount,
  prebattleEntryScene,
  CAMERA_ORIGIN_X,
  type BriefingPage,
  type PrebattleEntryState,
} from "./prebattleEntry.ts";

const TEXT_X = 16;
const ROW1_Y = 121;
const ROW2_Y = 137;
const ARROW_BOB = [0, 1, 2, 1] as const;
/** fadescreen FADE_TO_BLACK: BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, 0), first step on the first tick. */
export const BRIEFING_FADE_OUT: FadeTiming = { startDelay: 0, startY: 0, targetY: 16 };

function drawBriefingPage(fb: Uint8Array, page: BriefingPage, textAge: number, withArrow: boolean, fadeY = 0): void {
  const total = briefingGlyphCount(page);
  const chars = Math.max(0, Math.min(total, textAge + 1));
  const [l1, l2] = [page.lines[0] ?? "", page.lines[1]];
  drawMessageBoxTextFaded(fb, l1.slice(0, chars), TEXT_X, ROW1_Y, fadeY);
  if (l2 !== undefined && chars > l1.length) drawMessageBoxTextFaded(fb, l2.slice(0, chars - l1.length), TEXT_X, ROW2_Y, fadeY);
  if (withArrow && page.end === "p" && textAge >= total + 1) {
    const phase = Math.floor((textAge - (total + 1)) / PREBATTLE_ENTRY_TIMING.arrowGroupFrames) % 4;
    drawMessageBoxWaitArrow(fb, page.lines[page.lines.length - 1]!, ARROW_BOB[phase]!, page.lines.length > 1 ? ROW2_Y : ROW1_Y);
  }
}

function drawRoom(fb: Uint8Array, age: number, bgY: number, objY: number): void {
  const scene = prebattleEntryScene(age);
  renderPrebattleRoomWalkScene(
    fb,
    { x: CAMERA_ORIGIN_X, y: scene.originY },
    scene.playerFrame,
    { x: 112, y: 40, frameIndex: scene.attendantFrame, visible: true },
    bgY,
    objY,
  );
}

/** Frame for every phase except the draft fade-in and the black hold's end (core draws those). */
export function renderPrebattleEntry(state: PrebattleEntryState): Uint8Array {
  const fb = createFramebuffer();
  switch (state.phase) {
    case "intro": {
      const fading = state.age < PREBATTLE_ENTRY_TIMING.fadeInTicks;
      const ticks = state.age;
      drawRoom(fb, state.age, fading ? bgFadeY(ticks, FADE_IN) : 0, fading ? objFadeY(ticks, FADE_IN) : 0);
      return fb;
    }
    case "talk": {
      drawRoom(fb, state.age, 0, 0);
      drawMessageBoxFrame(fb);
      const messages = state.messages!;
      if (state.prev !== null) {
        const prev = state.prev;
        if (prev.kind === "turn") {
          drawBriefingPage(fb, messages[prev.message]![prev.page]!, prev.textAge, true);
        } else if (state.textAge < -1) {
          drawBriefingPage(fb, messages[prev.message]![prev.page]!, prev.textAge, false);
        }
        return fb;
      }
      if (state.textAge >= 0) drawBriefingPage(fb, messages[state.message]![state.page]!, state.textAge, true);
      return fb;
    }
    case "closing": {
      drawRoom(fb, state.age, 0, 0);
      drawMessageBoxFrame(fb);
      const page = state.messages![state.message]![state.page]!;
      drawBriefingPage(fb, page, briefingGlyphCount(page) + state.phaseTick + 1, false);
      return fb;
    }
    case "fadeOut": {
      const ticks = state.phaseTick;
      const bgY = bgFadeY(ticks, BRIEFING_FADE_OUT);
      drawRoom(fb, state.age, bgY, objFadeY(ticks, BRIEFING_FADE_OUT));
      drawMessageBoxFrameFaded(fb, bgY);
      const page = state.messages![state.message]![state.page]!;
      drawBriefingPage(fb, page, briefingGlyphCount(page) + state.phaseTick + 1, false, bgY);
      return fb;
    }
    default:
      return fb;
  }
}
