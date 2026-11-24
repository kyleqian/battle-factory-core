// swi1 (docs/swi1-swap-popup-input-timing.md): when the swap screen's SUMMARY/SWAP/RECHOOSE popup takes A / B / DOWN, as on the ROM.
// After a SUMMARY visit the engine let every later popup of the same swap screen take input from +1: `returnedFromSummary` is never
// cleared and the post-summary readiness read it. On the ROM only the popup CB2_InitSwapScreen rebuilds skips OpenMonPic
// (Swap_Task_HandleMenu STATE_MENU_INIT, battle_factory_screen.c:2589-2593); Swap_ShowMenuOptions clears fromSummaryScreen (:3706-3707),
// so a popup a later A on a ball opens waits for OpenMonPic in STATE_MENU_SHOW_OPTIONS (:2594-2600) like the screen's first one.
//
// ROM numbers (the frame catcher's ROM driver with a press sweep, .integration/evidence/swi1/romsweep.py, seed 28 Scene ON, the
// `reopendown` trace): from the A that opens a popup (P), a one-frame A, B or DOWN at P+k is taken from k = 58 on, ignored before, for
// the screen's first popup and for a popup opened after a summary visit alike (A at +1 is the opening A still held, on both sides). The
// popup rebuilt after the summary takes input from the summary B's +42 on the ROM; the engine takes it from +61 (handover +60, then +1):
// a difference this change keeps (the doc's "Seen, not fixed"), pinned below as the engine's so that a change to it is deliberate.
//
// Driven by state, not frame numbers: seed 28, Scene ON, the soak's RandomPlayer ("winning-swap") outside the swap screen and a scripted
// swap screen (makeSwi1.mjs `reopendown`'s prefix): slot 1 (SEALEO), its SUMMARY, back, B closes the rebuilt popup, A opens slot 1 again.
// At each press the test branches the engine state: the press, k - 1 empty frames, then a one-frame A / B / DOWN at +k, against the same
// frame without it. Fails on the base 1c0d55b82 (the popup after the summary takes input from +1).
import { beforeAll, describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { tick, type EngineState } from "../src/engine/core.ts";
import { FactorySession } from "../src/factorySession.ts";
import type { GbaButton } from "../src/input.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

/** The ROM's first frame a fresh popup (OpenMonPic) takes A / B / DOWN, from the A that opened it. */
const ROM_FRESH_POPUP_FIRST_INPUT = 58;
/** The engine's first frame the popup rebuilt after a summary takes input, from the summary's B (the ROM's: +42). */
const ENGINE_REBUILT_POPUP_FIRST_INPUT = 61;

const NONE: ReadonlySet<GbaButton> = new Set();
type Press = "A" | "B" | "DOWN";
interface Step { readonly when: (st: EngineState) => boolean; readonly press: GbaButton | null; readonly wait: number; readonly mark?: string }

const sw = (st: EngineState) => st.factorySwap!;
const ready = (st: EngineState) => st.factorySwap?.controller.inputReady === true;
const ph = (st: EngineState) => st.factorySwap?.controller.phase;
const summaryOpen = (st: EngineState) => st.summaryScreen.onInfoPage && !st.summaryScreen.transition && st.summaryScreen.openElapsed > 60;
const STEPS: readonly Step[] = [
  { when: (st) => ready(st) && ph(st) === "playerPicker" && sw(st).controller.cursor === 0, press: "RIGHT", wait: 12 },
  { when: (st) => ready(st) && ph(st) === "playerPicker" && sw(st).controller.cursor === 1, press: "A", wait: 10, mark: "first popup" },
  { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: null, wait: 30 },
  { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: "A", wait: 10 },
  { when: summaryOpen, press: "B", wait: 10, mark: "summary B" },
  { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).returnedFromSummary, press: null, wait: 40 },
  { when: (st) => ready(st) && ph(st) === "playerOptions", press: "B", wait: 10 },
  { when: (st) => ready(st) && ph(st) === "playerPicker", press: null, wait: 30 },
  { when: (st) => ready(st) && ph(st) === "playerPicker" && sw(st).controller.cursor === 1, press: "A", wait: 10, mark: "popup after the summary" },
];

const mix = (v: number) => {
  let x = Math.imul(v ^ (v >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

/** Plays seed 28 to swap 1's marked presses; hands back the state before each one (the press is the step's own). */
function marks(): Map<string, { state: EngineState; press: GbaButton }> {
  const seed = 28;
  const session = new FactorySession({ battleScene: "on", gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft", challengeRequest: "hold" });
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning-swap");
  const out = new Map<string, { state: EngineState; press: GbaButton }>();
  let i = 0;
  let wait = 0;
  for (let f = 0; f < 40_000 && i < STEPS.length; f += 1) {
    const st = session.state;
    let buttons: ReadonlySet<GbaButton>;
    if (!st.factorySwap) buttons = player.decide(st);
    else if (wait > 0) { wait -= 1; buttons = NONE; }
    else if (STEPS[i]!.when(st)) {
      const s = STEPS[i]!;
      i += 1;
      wait = s.wait;
      buttons = s.press ? new Set([s.press]) : NONE;
      if (s.mark && s.press) out.set(s.mark, { state: st, press: s.press });
    } else buttons = NONE;
    session.tick(buttons);
  }
  return out;
}

const seen = (st: EngineState) => {
  const c = st.factorySwap?.controller;
  return JSON.stringify([c?.phase, c?.playerOptionCursor, c?.cursor, st.summaryScreen.isOpen, st.summaryScreen.transition?.direction ?? null]);
};

/** The k (1..max) at which a one-frame press is taken, after `press` on the frame after `before`. */
function takenAt(before: EngineState, press: GbaButton, x: Press, max: number): number[] {
  let st = tick(before, new Set([press]));
  const ks: number[] = [];
  for (let k = 1; k <= max; k += 1) {
    const without = tick(st, NONE);
    if (seen(tick(st, new Set([x]))) !== seen(without)) ks.push(k);
    st = without;
  }
  return ks;
}

const from = (first: number, max: number) => Array.from({ length: max - first + 1 }, (_, i) => first + i);

describe("swi1: the swap screen's popup takes input when the ROM's does", () => {
  let found: Map<string, { state: EngineState; press: GbaButton }>;
  beforeAll(() => {
    found = marks();
  }, 120_000);

  it("finds the presses by state (seed 28, swap 1, SEALEO in slot 1)", () => {
    expect([...found.keys()]).toEqual(["first popup", "summary B", "popup after the summary"]);
    const after = found.get("popup after the summary")!.state.factorySwap!;
    expect(after.returnedFromSummary).toBe(true);
    expect(after.controller.playerParty[1]!.species).toBe("SEALEO");
  });

  it("the screen's first popup takes A / B / DOWN from +58 (OpenMonPic), as on the ROM", () => {
    const { state, press } = found.get("first popup")!;
    for (const x of ["A", "B", "DOWN"] as const) expect(takenAt(state, press, x, 75), x).toEqual(from(ROM_FRESH_POPUP_FIRST_INPUT, 75));
  });

  it("a popup opened after a summary visit waits for its own OpenMonPic too: ignored at +1..+57, taken from +58", () => {
    const { state, press } = found.get("popup after the summary")!;
    for (const x of ["A", "B", "DOWN"] as const) expect(takenAt(state, press, x, 75), x).toEqual(from(ROM_FRESH_POPUP_FIRST_INPUT, 75));
  });

  it("the popup rebuilt after the summary needs no OpenMonPic: input one frame after the handover (summary B +61)", () => {
    const { state, press } = found.get("summary B")!;
    for (const x of ["A", "B", "DOWN"] as const) expect(takenAt(state, press, x, 90), x).toEqual(from(ENGINE_REBUILT_POPUP_FIRST_INPUT, 90));
  });

  it.todo("the popup rebuilt after the summary takes input from the summary B's +42 as on the ROM (the doc's \"Seen, not fixed\")");
});
