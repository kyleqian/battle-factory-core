// wtl1 (docs/wtl1-win-tail-timing.md): the win tail's two waits. ROM (frame catcher, 22 wins, both scenes; CATCHER_WATCH on t2off):
// after the last "fainted!" press P the script runs moveend, the exp script and the fainted-mon checks, HandleEndTurn_BattleWon plays the
// victory BGM at P + 21 / 22, and "Player defeated ...!" shows its first glyph 4 frames after the BGM (P + 25 / 26; ours was P + 2). After
// the press P2 on it, trainerslidein is dispatched at P2 + 4, the slide's 48 callbacks end at P2 + 52 and the lose text's first glyph
// shows at P2 + 55 (ours 38).
import { describe, expect, it } from "vitest";
import {
  LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES,
  WIN_BGM_AFTER_ANCHOR_ROWS,
  WIN_PRINT_AFTER_BGM_ROWS,
  WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  createBattleResolutionPresentationRenderView,
  isBattleResolutionButtonMessageAcceptable,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { VICTORY_BGM_AFTER_AUTOMATIC_MESSAGE, VICTORY_BGM_AFTER_CONTROLLER_COMMAND, VICTORY_BGM_AFTER_FAINT_DISMISS } from "../src/engine/battleEndSounds.ts";
import { currentMessage, playCensusBattleUntil } from "./helpers/btn1Battle";

type Row = { message: string | null; chars: number; arrow: number | null; slideX2: number | null };

/** From the last foe "fainted!" box's first acceptable frame: presses there (k = 0), then on "Player defeated" at its first acceptable
 *  frame + `defeatedK`, and records each frame's box and slide until the lose text has 3 glyphs. Row 0 is the faint press frame. */
function winTail(seed: number, scene: "on" | "off", faintK: number, defeatedK = 0) {
  const { cursor, found } = playCensusBattleUntil(seed, scene, (state) => {
    const m = currentMessage(state);
    return m !== null && m.command.faintBattler === 1 && m.resolution.pendingBoundary.kind === "terminal"
      && isBattleResolutionButtonMessageAcceptable(m.resolution);
  });
  expect(found).toBe(true);
  for (let k = 0; k < faintK; k += 1) cursor.step();
  const rows: Row[] = [];
  const record = () => {
    const resolution = cursor.state().battleResolutionPresentation;
    const view = resolution === null ? null : createBattleResolutionPresentationRenderView(resolution);
    const m = currentMessage(cursor.state());
    rows.push({
      message: view?.message ? (m?.command.lines === view.message.lines ? m!.messageId : "previous") : null,
      chars: view?.message?.visibleCharacters ?? 0,
      arrow: view?.waitCursor ? view.waitCursor.age : null,
      slideX2: view?.trainerSlide ? view.trainerSlide.offscreenX2 : null,
    });
  };
  cursor.step(["A"]);
  record();
  let defeatedPress: number | null = null;
  let acceptable = 0;
  for (let i = 1; i < 300; i += 1) {
    const m = currentMessage(cursor.state());
    let press = false;
    if (defeatedPress === null && m?.messageId === "STRINGID_PLAYERDEFEATEDTRAINER1" && isBattleResolutionButtonMessageAcceptable(m.resolution)) {
      if (acceptable++ === defeatedK) { press = true; defeatedPress = i; }
    }
    cursor.step(press ? ["A"] : []);
    record();
    if (rows.at(-1)!.message === "STRINGID_TRAINER1LOSETEXT" && rows.at(-1)!.chars >= 3) break;
  }
  const firstGlyph = (id: string) => rows.findIndex((r) => r.message === id && r.chars >= 1);
  return { rows, defeatedPress: defeatedPress!, defeatedGlyph: firstGlyph("STRINGID_PLAYERDEFEATEDTRAINER1"), loseGlyph: firstGlyph("STRINGID_TRAINER1LOSETEXT") };
}

describe("wtl1: the win tail's waits", () => {
  it("the print's delays are lha1's victory BGM delays + 4; the slide's lead 14, its print gap the loss tail's 3", () => {
    expect(WIN_BGM_AFTER_ANCHOR_ROWS).toEqual({
      button: VICTORY_BGM_AFTER_FAINT_DISMISS, automatic: VICTORY_BGM_AFTER_AUTOMATIC_MESSAGE, controller: VICTORY_BGM_AFTER_CONTROLLER_COMMAND,
    });
    expect(WIN_PRINT_AFTER_BGM_ROWS).toBe(4);
    expect(WIN_TAIL_TRAINER_SLIDE_LEAD_FRAMES + 38 + LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES).toBe(55);
  });

  for (const [seed, scene] of [[0, "off"], [10, "on"]] as const) {
    it(`seed ${seed} Scene ${scene.toUpperCase()}: "Player defeated" at P + 26 (BGM + 4), the lose text at P2 + 55, the slide from P2 + 14`, () => {
      const t = winTail(seed, scene, 4);
      expect(t.defeatedGlyph).toBe(VICTORY_BGM_AFTER_FAINT_DISMISS + WIN_PRINT_AFTER_BGM_ROWS);
      // until then the released "fainted!" box stays, its arrow frozen (a press off a redraw frame, fnt1)
      expect(t.rows.slice(1, t.defeatedGlyph).every((r) => r.message === "previous" && r.arrow !== null)).toBe(true);
      expect(t.loseGlyph - t.defeatedPress).toBe(55);
      const slide = t.rows.slice(t.defeatedPress);
      // off screen (x2 76, el 0) through the lead, then 2 px a row, settled at el 38, 3 rows before the print
      expect(slide.slice(1, 15).every((r) => r.slideX2 === 76)).toBe(true);
      expect(slide[15]!.slideX2).toBe(74);
      expect(slide[52]!.slideX2).toBe(0);
    }, 120000);
  }

  it("seed 0 Scene OFF: a faint press on a redraw frame (k 0) keeps the box blank through the wait", () => {
    const t = winTail(0, "off", 0);
    expect(t.defeatedGlyph).toBe(26);
    expect(t.rows.slice(2, 26).every((r) => r.message === null)).toBe(true);
  }, 120000);
});
