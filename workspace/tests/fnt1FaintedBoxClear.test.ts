// fnt1 (docs/fnt1-fainted-box-clear.md; fcm1 finding 4): the "{X} fainted!" box after its press, pinned against the ROM.
//
// ROM (frame catcher, fcm1 ROM runs: 1,502 "fainted!" boxes in 32 rounds, both scenes; G = the frame its last glyph shows; a press at
// P is the frame the button is new, the frame its SE_SELECT plays):
//   - the press is taken from G + 1 (120 boxes pressed there, all taken; 93 pressed at G, none taken): text.c reads the `\p` on the
//     frame after the last glyph and checks A / B from the next one (RENDER_STATE_CLEAR);
//   - the down arrow first shows at G + 2 and is redrawn every 9 frames (G + 11, G + 20, ...: TextPrinterDrawDownArrow, delay 8);
//   - wait frame k = P - G - 1.  k % 9 == 0 (the press frame redraws the arrow, whose CopyWindowToVram carries the `\p` clear): the
//     box is blank from P + 1 until the next print (231 boxes, all blank).  Otherwise the print stays with the arrow frozen at the
//     phase shown on P (1,271 boxes, all kept).  Examples: s247-on-ws 43,141 / 43,142 (k 0) blank 43,143; s247 50,479 / 50,489 (k 9)
//     phase 0 on P, blank P + 1; s247 61,098 / 61,100 (k 1) phase 0 from P, frozen; s247 46,861 / 46,872 (k 10) phase 1 from P, frozen;
//     your Pokemon's faint s100-on-wc 245,087 / 245,088 (k 0) blank, the party menu's fade from P + 21; s247 17,467 / 17,710 (k 242)
//     frozen arrow until the fade.  "Player defeated ...!\p" follows the same rule (354 ROM boxes).
import { describe, expect, it } from "vitest";
import {
  messageCommandTypedRows,
  promptGatedMessageCommands,
} from "../src/engine/battleResolutionPresentation";
import {
  DOWN_ARROW_REDRAW_PERIOD,
  createBattleResolutionPresentationRenderView,
  isBattleResolutionButtonMessageAcceptable,
  promptClearPressBlanksBox,
} from "../src/engine/battleResolutionPresentationRender";
import type { FactoryRoundBattleOrchestratorState } from "../src/engine/factoryRoundBattleOrchestrator";
import { currentMessage, playCensusBattleUntil } from "./helpers/btn1Battle";

type Box = "typing" | "text" | "blank" | `arrow${number}`;

/** What the message box shows on this frame (the render view the scene draws; the forced party menu draws it while it holds). */
function boxOf(state: FactoryRoundBattleOrchestratorState): Box {
  const resolution = state.battleResolutionPresentation;
  if (resolution === null) return "blank";
  const view = createBattleResolutionPresentationRenderView(resolution);
  if (view.bottom !== "message" || view.message === null) return "blank";
  const total = view.message.lines.reduce((n, line) => n + [...line].length, 0);
  if (view.message.visibleCharacters < total) return "typing";
  return view.waitCursor === null ? "text" : `arrow${Math.floor(view.waitCursor.age / 9) % 4}`;
}

/** Stops at the first frame of the first matching button message, steps to its G, then presses A at G + `press` (null: never). */
function playFaintBox(
  seed: number,
  scene: "on" | "off",
  match: (messageId: string | null, command: any, resolution: any) => boolean,
  press: number | null,
  frames: number,
) {
  const { cursor, found } = playCensusBattleUntil(seed, scene, (state) => {
    const message = currentMessage(state);
    return message !== null && message.resolution.lifecycle.phase === "presenting" && message.resolution.lifecycle.phaseElapsed === 0
      && match(message.messageId, message.command, message.resolution);
  });
  expect(found).toBe(true);
  const start = currentMessage(cursor.state())!;
  const typed = messageCommandTypedRows(start.command);
  // the step that produces frame G + d carries the press when d === press (d = 0 is the frame G itself)
  for (let row = 1; row <= typed - 1; row += 1) cursor.step(press === row - (typed - 1) ? ["A"] : []);
  const rows: { box: Box; onMessage: boolean; phase: string }[] = [];
  const record = () => {
    const resolution = cursor.state().battleResolutionPresentation as any;
    rows.push({
      box: boxOf(cursor.state()),
      onMessage: resolution !== null && resolution.segmentIndex === start.resolution.segmentIndex
        && resolution.commandIndex === start.resolution.commandIndex,
      phase: resolution?.lifecycle.phase ?? "none",
    });
  };
  record(); // G
  for (let d = 1; d <= frames; d += 1) {
    cursor.step(press === d ? ["A"] : []);
    record();
  }
  return { rows, lines: start.command.lines as readonly string[], command: start.command };
}

const foeFaint = (_id: string | null, command: any, resolution: any) => command.faintBattler === 1 && resolution.forcedRequest === null
  && resolution.pendingBoundary.kind !== "terminal";
const yourFaint = (_id: string | null, command: any, resolution: any) => command.faintBattler === 0 && resolution.forcedRequest !== null;
const lastFoeFaint = (_id: string | null, command: any, resolution: any) => command.faintBattler === 1
  && resolution.pendingBoundary.kind === "terminal";
const lastYourFaint = (_id: string | null, command: any, resolution: any) => command.faintBattler === 0
  && resolution.pendingBoundary.kind === "terminal";
const playerDefeated = (id: string | null) => id === "STRINGID_PLAYERDEFEATEDTRAINER1";

describe("fnt1: the `\\p` press rule (text.c RENDER_STATE_CLEAR + TextPrinterDrawDownArrow)", () => {
  it("the arrow is redrawn every 9 wait frames; a press clears the box only on a redraw frame", () => {
    expect(DOWN_ARROW_REDRAW_PERIOD).toBe(9);
    for (let k = 0; k < 40; k += 1) expect(promptClearPressBlanksBox(k)).toBe(k % 9 === 0);
  });

  it("the `\\p`-ended button messages carry promptClear (fainted, Player defeated, a gated string's last page); others do not", () => {
    const base = { type: "message", eventSequence: 1, advance: "automatic", noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } } as const;
    const one = (id: string, lines: readonly string[], noCursor = false) =>
      promptGatedMessageCommands({ ...base, lines, noCursor } as any, id);
    expect(one("STRINGID_TARGETFAINTED", ["Foe GLOOM", "fainted!"])).toMatchObject([{ advance: "button", promptClear: true }]);
    expect(one("STRINGID_ATTACKERFAINTED", ["KABUTO", "fainted!"])).toMatchObject([{ advance: "button", promptClear: true }]);
    expect(one("STRINGID_PLAYERDEFEATEDTRAINER1", ["MEMORY defeated", "LADY GILLIAN!"])).toMatchObject([{ advance: "button", promptClear: true }]);
    // the trainers' speech waits on PAUSE_UNTIL_PRESS (TextPrinterWait: no arrow, no clear)
    expect(one("STRINGID_TRAINER1LOSETEXT", ["A", "B"], true)[0]!.promptClear).toBeUndefined();
    expect(one("STRINGID_TRAINER1WINTEXT", ["A", "B"], true)[0]!.promptClear).toBeUndefined();
    // "{X} was dragged out!\p": one page, its gate the string's end
    expect(one("STRINGID_PKMNWASDRAGGEDOUT", ["MAGNETON was", "dragged out!"])).toMatchObject([{ advance: "button", promptGate: true, promptClear: true }]);
    // Trick's mid-string `\p`: the first page is not the string's end
    const trick = one("STRINGID_PKMNOBTAINEDXYOBTAINEDZ", ["FURRET obtained", "a LEFTOVERS.", "CHANSEY obtained", "a CHOICE BAND."]);
    expect(trick[0]!.promptClear).toBeUndefined();
    // Static's `\l` scroll is not a clear
    const scroll = one("STRINGID_PKMNWASPARALYZEDBY", ["Foe PIKACHU’s STATIC", "paralyzed RATTATA!", "It may be unable to move!"]);
    expect(scroll.every((piece) => piece.promptClear === undefined)).toBe(true);
  });

  it("a faint box takes the press from its first wait row (the row after its last glyph shows), as the gated pages", () => {
    const command = promptGatedMessageCommands({
      type: "message", eventSequence: 1, advance: "automatic", noCursor: false, lines: ["Foe GLOOM", "fainted!"],
      timing: { minimumFrames: 24, holdFrames: 0 },
    } as any, "STRINGID_TARGETFAINTED")[0]!;
    const T = messageCommandTypedRows(command);
    const at = (phaseElapsed: number) => ({
      segmentIndex: 0, commandIndex: 0, lifecycle: { phase: "presenting", phaseElapsed }, segments: [{ commands: [command] }],
    }) as any;
    // a press read on the tick after phaseElapsed T - 1 (G, the last glyph's row) lands on G + 1
    expect(isBattleResolutionButtonMessageAcceptable(at(T - 2))).toBe(false);
    expect(isBattleResolutionButtonMessageAcceptable(at(T - 1))).toBe(true);
  });
});

for (const scene of ["off", "on"] as const) {
  describe(`fnt1: the foe's "fainted!" box, live (census seed 10, Scene ${scene.toUpperCase()})`, () => {
    it("no press: the arrow shows from G + 2 and is redrawn at G + 11 and G + 20 (ROM s247 17,469 / 17,478 / 17,487)", () => {
      const { rows } = playFaintBox(10, scene, foeFaint, null, 30);
      expect(rows.slice(0, 3).map((r) => r.box)).toEqual(["text", "text", "arrow0"]);
      expect(rows[10]!.box).toBe("arrow0");
      expect(rows[11]!.box).toBe("arrow1");
      expect(rows[19]!.box).toBe("arrow1");
      expect(rows[20]!.box).toBe("arrow2");
      expect(rows[29]!.box).toBe("arrow3");
      expect(rows.every((r) => r.onMessage)).toBe(true);
    });

    it("a press on G is not taken; G + 1 is (k 0): the print shows on the release frame, the box is blank from G + 2 to the next print", () => {
      const early = playFaintBox(10, scene, foeFaint, 0, 3);
      expect(early.rows.every((r) => r.onMessage)).toBe(true);
      const { rows } = playFaintBox(10, scene, foeFaint, 1, 200);
      expect(rows[0]!.onMessage).toBe(true);
      expect(rows[1]!.onMessage).toBe(false);
      expect(rows[1]!.box).toBe("text");
      const next = rows.findIndex((r, d) => d > 1 && r.box === "typing");
      expect(next).toBeGreaterThan(100); // the tray slides in, then "X sent out Y!" (ROM s247: blank 43,143 .. 43,267, print 43,268)
      expect(rows.slice(2, next).every((r) => r.box === "blank")).toBe(true);
    });

    it("k 9 (G + 10): phase 0 on the release frame, then blank (ROM s247 50,489 / 50,490)", () => {
      const { rows } = playFaintBox(10, scene, foeFaint, 10, 40);
      expect(rows[9]!.box).toBe("arrow0");
      expect(rows[10]!.box).toBe("arrow0");
      expect(rows[10]!.onMessage).toBe(false);
      expect(rows.slice(11).every((r) => r.box === "blank")).toBe(true);
    });

    it("k 1 (G + 2): the first arrow shows on the release frame and stays frozen until the next print (ROM s247 61,100)", () => {
      const { rows } = playFaintBox(10, scene, foeFaint, 2, 200);
      expect(rows[2]!.onMessage).toBe(false);
      const next = rows.findIndex((r, d) => d > 2 && r.box === "typing");
      expect(next).toBeGreaterThan(100);
      expect(rows.slice(2, next).every((r) => r.box === "arrow0")).toBe(true);
    });

    it("k 10 (G + 11): the redrawn phase 1 shows on the release frame and stays frozen (ROM s247 46,872); k 11 the same", () => {
      for (const press of [11, 12]) {
        const { rows } = playFaintBox(10, scene, foeFaint, press, 60);
        expect(rows[press - 1]!.box).toBe(press === 11 ? "arrow0" : "arrow1");
        expect(rows.slice(press).every((r) => r.box === "arrow1")).toBe(true);
      }
    });

    it("k 18 (G + 19) and k 27 (G + 28) blank the box too", () => {
      for (const press of [19, 28]) {
        const { rows } = playFaintBox(10, scene, foeFaint, press, press + 20);
        expect(rows[press]!.box).toBe(press === 19 ? "arrow1" : "arrow2");
        expect(rows.slice(press + 1).every((r) => r.box === "blank")).toBe(true);
      }
    });
  });

  describe(`fnt1: your Pokemon's "fainted!" box before the party menu (census seed 0, Scene ${scene.toUpperCase()})`, () => {
    it("k 0 (G + 1): blank from G + 2 through the held frames (ROM s100 245,088 / 245,089, fade from P + 21)", () => {
      const { rows } = playFaintBox(0, scene, yourFaint, 1, 40);
      expect(rows[1]!.box).toBe("text");
      expect(rows.slice(2).every((r) => r.box === "blank")).toBe(true);
      expect(rows.some((r) => r.phase === "forced-party-handoff")).toBe(true);
    });

    it("k 4 (G + 5): the arrow stays frozen through the held frames, the party menu's hand-off included (ROM s247 17,710)", () => {
      const { rows } = playFaintBox(0, scene, yourFaint, 5, 40);
      const handoff = rows.findIndex((r) => r.phase === "forced-party-handoff");
      expect(handoff).toBeGreaterThan(5);
      expect(rows.slice(5).every((r) => r.box === "arrow0")).toBe(true);
    });
  });
}

describe("fnt1: the last faint of a battle and the win text (census, Scene OFF)", () => {
  it("won (seed 0): the foe's last box, k 0, is blank until \"Player defeated\" prints", () => {
    // wtl1 (docs/wtl1-win-tail-timing.md): "Player defeated" now waits for the victory BGM (P + 26 from the press at d = 1), so 40 frames
    const { rows } = playFaintBox(0, "off", lastFoeFaint, 1, 40);
    expect(rows[1]!.box).toBe("text");
    const next = rows.findIndex((r, d) => d > 1 && r.box === "typing");
    expect(next).toBe(1 + 26);
    expect(rows.slice(2, next).every((r) => r.box === "blank")).toBe(true);
  });

  it("lost (seed 3): your last box, k 9, is blank from the frame after the press; k 3 keeps the frozen arrow", () => {
    const cleared = playFaintBox(3, "off", lastYourFaint, 10, 60);
    expect(cleared.rows[10]!.box).toBe("arrow0");
    expect(cleared.rows.slice(11, 40).every((r) => r.box === "blank")).toBe(true);
    const kept = playFaintBox(3, "off", lastYourFaint, 4, 60);
    expect(kept.rows.slice(4, 40).every((r) => r.box === "arrow0")).toBe(true);
  });

  it("\"Player defeated ...!\" (seed 0) is the same `\\p` wait: taken from G + 1, blank after a press on a redraw frame", () => {
    const early = playFaintBox(0, "off", playerDefeated, 0, 2);
    expect(early.rows.every((r) => r.onMessage)).toBe(true);
    const { rows, command } = playFaintBox(0, "off", playerDefeated, 1, 20);
    expect(command.promptClear).toBe(true);
    expect(rows[1]!.onMessage).toBe(false);
    expect(rows[1]!.box).toBe("text");
    expect(rows[2]!.box).toBe("blank");
  });
});
