// srt1 (docs/srt1-swap-summary-return-input.md): the swap screen's popup rebuilt after a SUMMARY takes input when the ROM's does, and a
// press made inside the summary return's palette fade-in does what it does on the ROM.
// CloseSummaryScreen returns to CB2_InitSwapScreen, whose state 14 starts the fade-in (+38 from the summary's B) and state 15 installs
// Swap_Task_HandleMenu; it skips OpenMonPic (fromSummaryScreen) and reaches STATE_MENU_HANDLE_INPUT at +41, which checks only
// `monPicAnimating` (HideMonPic cleared it), so A / B / UP / DOWN are taken from +42 while the fade still runs (battle_factory_screen.c
// :2585-2631, :3349-3461, :4112-4118). Before srt1 the engine took them from +61.
//
// ROM numbers: .integration/evidence/srt1/srt1rom.py (the frame catcher's ROM driver to seed 28's swap-screen summary B, then branches from
// the saved state: the B, k - 1 empty frames and the presses), Scene ON:
//   - A, B, UP and DOWN are first taken at +42;
//   - DOWN / UP inside the fade move the cursor (SE_SELECT on the press frame), drawn inside the fade;
//   - B or RECHOOSE inside the fade: the close runs under the fade, the picker takes input 56 frames after the press, as after the fade;
//   - SWAP inside the fade: the enemy picker's first input comes as long after the A as after the fade (ROM +134; the engine's +133 is
//     one frame early for every SWAP, the doc's "Seen, not fixed");
//   - SUMMARY (A at +42..+59): Swap_Task_OpenSummaryScreen's BeginNormalPaletteFade is refused while the fade-in runs (palette.c:161-164)
//     and STATE_SUMMARY_CLEAN waits for its end (+61): the popup goes on fading in to +62, and the summary opens exactly as after an A at
//     +38, the fade-in's start (its first input and its cry at +101, whatever the A's frame); an A at +60 fades out as usual (A+63).
// Picture pins: the sha256 of the ROM frame's RGB888 at the same frame from the summary B, with the balls' row (y 48..79) zeroed on both
// sides (the balls rock on Random() draws the catcher does not sync).
//
// Driven by state, not frame numbers: seed 28, Scene ON, the soak's RandomPlayer ("winning-swap") outside the swap screen and a scripted
// swap screen (slot 1 SEALEO, its SUMMARY, the summary's B). Fails on the base bcacf9026 (every press inside the fade is ignored there).
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { render, tick, type EngineState } from "../src/engine/core.ts";
import { FactorySession } from "../src/factorySession.ts";
import type { GbaButton } from "../src/input.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

/** ROM: the first frame after the summary's B at which the rebuilt popup takes each button. */
const ROM_FIRST_INPUT = { A: 42, B: 42, UP: 42, DOWN: 42 } as const;
/** ROM: the picker's first input after B / RECHOOSE on the rebuilt popup, from the press, inside the fade or after it. */
const ROM_PICKER_AFTER_CLOSE = 56;
/** ROM: a SUMMARY taken at +42..+59 opens the summary on the timeline of an A at +38: its first B and its cry at +101. */
const ROM_IN_FADE_SUMMARY_FIRST_INPUT = 101;
/** ROM: a SUMMARY after the fade (the normal open): the summary's first input 63 frames after the A. */
const ROM_SUMMARY_OPEN_INPUT = 63;
/** The engine's enemy picker takes its first input 133 frames after SWAP (the ROM's: 134, for every SWAP; not srt1's). */
const ENGINE_SWAP_TO_ENEMY_PICKER = 133;

/** [case, frame from the summary B, sha256 of the ROM frame with the balls' row zeroed]. */
type Pin = readonly [string, number, string];
const PINS: readonly Pin[] = [
  // no press: the rebuilt popup's fade-in (as before srt1)
  ["none", 50, "19cc20901e8810d6a11f3dd4ce7870f4224bb12e9ebb686e647385e295131d25"],
  // DOWN at +42 (SUMMARY -> SWAP): the highlight moves inside the fade
  ["down42", 42, "617a830e01468f0197a022421cad875513008d909375ee1e3e37ccc846e23d9f"],
  ["down42", 43, "f8d71071000d6720c834aaab57bc475f95855d0bd01bb55daa50305af2914006"],
  ["down42", 44, "97957fb6de207c56c3a9f78919d5c5b0611a34e25c1558b817ab295bcfd8d0c2"],
  ["down42", 50, "5903e9c1738515f5fc8b2e23bfa9397765f91a6798d97abbe6561db78a58e7c1"],
  ["down42", 58, "d6154440529a040a5ca1d5a2790ca37c6acc8550364a5be53ccd4b8eecdc9b6d"],
  // UP at +42 (SUMMARY -> RECHOOSE, the wrap)
  ["up42", 44, "ac12d943c0630603db2b0ed57b44f806d5f6f1e87da28995000a1809071b740f"],
  ["up42", 50, "d4a59d331a7d4e67659d8c9dae49e3d34ae1886f32d7fce07e65a4edf92b328b"],
  // B at +42: CloseMonPic and the picker's return under the fade
  ["b42", 42, "617a830e01468f0197a022421cad875513008d909375ee1e3e37ccc846e23d9f"],
  ["b42", 44, "36fe905e3e41ef1f5e8ff9a532045dbe56a01c2872afbf02be550bce4d025947"],
  ["b42", 50, "ec9169ccb1cd4828adc80376b02e198ef6c56f84ebe5c390d2367fad953d1693"],
  ["b42", 56, "0a6ba9ed9e0da534893429d0ee460ec644b90658df5e0c12f8776b2fa89ecfcf"],
  ["b42", 60, "663b27c4ee891cd7b55b0515ec703b56190692aac382e53f15b874e94eda3943"],
  ["b42", 98, "cd66b7cd9752da5aad110ab29c0e7c901a5c5249566e1d09ff31f5ee1d007277"],
  // RECHOOSE (UP +42, A +43)
  ["rechoose43", 44, "526fec924d819648ed76bbf7747086238129308d147d3547452ce5325c88f301"],
  ["rechoose43", 46, "353c9925ac04930bc925360f303b6bdb95cafb84fdde6d13eb912a2a4c25357b"],
  ["rechoose43", 52, "78bccf250f74b6ce71ba21dcfc4857491802ad6e47c0dca299321a4ac7dff01e"],
  // SWAP (DOWN +42, A +43): the close and the start of the party switch under the fade
  ["swap43", 44, "1c7a310049b6fa084b5e6a022b99fb7c3fa66278b8ac31afe8996496d3ec2e5f"],
  ["swap43", 46, "353c9925ac04930bc925360f303b6bdb95cafb84fdde6d13eb912a2a4c25357b"],
  ["swap43", 52, "78bccf250f74b6ce71ba21dcfc4857491802ad6e47c0dca299321a4ac7dff01e"],
  ["swap43", 60, "663b27c4ee891cd7b55b0515ec703b56190692aac382e53f15b874e94eda3943"],
  // SUMMARY at +42 / +59: the popup fades in to +62 (no fade-out), black from +63, the summary from the A-at-+38 timeline
  ["a42", 50, "19cc20901e8810d6a11f3dd4ce7870f4224bb12e9ebb686e647385e295131d25"],
  ["a42", 62, "de345326f937a3102b7c87894a5b6aff4ef7c1efcf3c1fb0066c94d76fd06f29"],
  ["a42", 63, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  ["a42", 82, "7e506e2567efee4e785796f24397188dd0e7c34b2647d346fd77a84348d55889"],
  ["a42", 90, "0f31eec884d504ea8ac80c17219d96f6da20b8298968795811a891fefd581b79"],
  ["a42", 101, "15d360a06268c9294f694b6a4e311cbdc7bf5ed2f6f96e356da7ec41766e6f6e"],
  ["a59", 62, "de345326f937a3102b7c87894a5b6aff4ef7c1efcf3c1fb0066c94d76fd06f29"],
  ["a59", 63, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
];
/** The cases' presses, frame from the summary B -> button (one frame each). */
const CASES: Readonly<Record<string, ReadonlyArray<readonly [number, GbaButton]>>> = {
  none: [],
  down42: [[42, "DOWN"]],
  up42: [[42, "UP"]],
  b42: [[42, "B"]],
  rechoose43: [[42, "UP"], [43, "A"]],
  swap43: [[42, "DOWN"], [43, "A"]],
  a42: [[42, "A"]],
  a59: [[59, "A"]],
};

const NONE: ReadonlySet<GbaButton> = new Set();
const mix = (v: number) => {
  let x = Math.imul(v ^ (v >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};
const ready = (st: EngineState) => st.factorySwap?.controller.inputReady === true;
const ph = (st: EngineState) => st.factorySwap?.controller.phase;

/** Plays seed 28 to swap 1's summary B (slot 1, SEALEO); returns the state before the B frame. */
function beforeSummaryB(): EngineState {
  const seed = 28;
  const session = new FactorySession({ battleScene: "on", gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft", challengeRequest: "hold" });
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning-swap");
  const steps: ReadonlyArray<{ when: (st: EngineState) => boolean; press: GbaButton | null; wait: number; last?: true }> = [
    { when: (st) => ready(st) && ph(st) === "playerPicker" && st.factorySwap!.controller.cursor === 0, press: "RIGHT", wait: 12 },
    { when: (st) => ready(st) && ph(st) === "playerPicker" && st.factorySwap!.controller.cursor === 1, press: "A", wait: 10 },
    { when: (st) => ready(st) && ph(st) === "playerOptions" && st.factorySwap!.controller.playerOptionCursor === 0, press: null, wait: 30 },
    { when: (st) => ready(st) && ph(st) === "playerOptions" && st.factorySwap!.controller.playerOptionCursor === 0, press: "A", wait: 10 },
    { when: (st) => st.summaryScreen.onInfoPage && !st.summaryScreen.transition && st.summaryScreen.openElapsed > 60, press: "B", wait: 0, last: true },
  ];
  let i = 0;
  let wait = 0;
  for (let f = 0; f < 40_000; f += 1) {
    const st = session.state;
    let buttons: ReadonlySet<GbaButton>;
    if (!st.factorySwap) buttons = player.decide(st);
    else if (wait > 0) { wait -= 1; buttons = NONE; }
    else if (steps[i]!.when(st)) {
      if (steps[i]!.last) return st;
      wait = steps[i]!.wait;
      buttons = steps[i]!.press ? new Set([steps[i]!.press!]) : NONE;
      i += 1;
    } else buttons = NONE;
    session.tick(buttons);
  }
  throw new Error("seed 28 did not reach swap 1's summary B");
}

/** The frames from the summary B (t = 0, the B frame) with `presses` (t -> button) made, to +n; the sounds by t. */
function play(before: EngineState, presses: ReadonlyArray<readonly [number, GbaButton]>, n: number) {
  const at = new Map(presses);
  const states: EngineState[] = [];
  const sounds: Array<{ t: number; kind: string; id: number | null }> = [];
  let st = before;
  for (let t = 0; t <= n; t += 1) {
    const x = t === 0 ? "B" : at.get(t);
    const r = collectSoundTick(st.frame + 1, () => tick(st, x ? new Set([x]) : NONE));
    for (const e of r.events) if (e.kind === "se" || e.kind === "cry") sounds.push({ t, kind: e.kind, id: e.id ?? null });
    st = r.result;
    states.push(st);
  }
  return { states, sounds };
}

const seen = (st: EngineState) => {
  const c = st.factorySwap?.controller;
  return JSON.stringify([c?.phase, c?.playerOptionCursor, c?.cursor, st.summaryScreen.isOpen, st.summaryScreen.transition?.direction ?? null]);
};
/** The first frame after `from` (t from the summary B) at which a one-frame `probe` is taken, the presses before it made. */
function firstTaken(before: EngineState, presses: ReadonlyArray<readonly [number, GbaButton]>, from: number, probe: GbaButton, max = 400): number | null {
  const at = new Map(presses);
  let st = tick(before, new Set(["B"]));
  for (let t = 1; t <= max; t += 1) {
    if (t > from && seen(tick(st, new Set([probe]))) !== seen(tick(st, NONE))) return t;
    const x = at.get(t);
    st = tick(st, x ? new Set([x]) : NONE);
  }
  return null;
}

/** sha256 of the frame's RGB888 with the balls' row zeroed. */
function maskedSha256(fb: Uint8Array): string {
  const rgb = Buffer.alloc(240 * 160 * 3);
  for (let y = 0; y < 160; y += 1) {
    if (y >= 48 && y < 80) continue;
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      rgb.set([fb[o]!, fb[o + 1]!, fb[o + 2]!], (y * 240 + x) * 3);
    }
  }
  return createHash("sha256").update(rgb).digest("hex");
}
const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

describe("srt1: the popup rebuilt after a swap-screen summary takes input inside the fade-in, as on the ROM", () => {
  let before: EngineState;
  beforeAll(() => {
    before = beforeSummaryB();
  }, 120_000);

  it("finds the summary's B by state (seed 28, swap 1, SEALEO in slot 1)", () => {
    expect(before.factorySwap!.controller.phase).toBe("summaryFade");
    expect(before.factorySwap!.controller.cursor).toBe(1);
    expect(before.factorySwap!.controller.playerParty[1]!.species).toBe("SEALEO");
  });

  it("takes A, B, UP and DOWN from the summary B's +42 (Swap_Task_HandleMenu at STATE_MENU_HANDLE_INPUT from +41)", () => {
    const { states } = play(before, [], 41);
    expect(states[40]!.factorySwap!.controller.phase).toBe("summaryReturn");
    expect(states[41]!.factorySwap!.controller).toMatchObject({ phase: "playerOptions", inputReady: false });
    for (const [x, k] of Object.entries(ROM_FIRST_INPUT) as Array<[GbaButton, number]>) {
      expect(firstTaken(before, [], 0, x), x).toBe(k);
    }
    // the summary screen's return fade still runs then (it ends at +58)
    expect(states[41]!.summaryScreen.transition).not.toBeNull();
  });

  it("DOWN / UP inside the fade move the cursor and play SE_SELECT on the press frame", () => {
    const down = play(before, CASES.down42!, 44);
    expect(down.states[42]!.factorySwap!.controller).toMatchObject({ playerOptionCursor: 1, playerOptionDisplayCursor: 0 });
    // the highlight's OAM follows two VBlanks later, as after the fade (factorySwapPresentation.test.ts)
    expect(down.states[43]!.factorySwap!.controller.playerOptionDisplayCursor).toBe(0);
    expect(down.states[44]!.factorySwap!.controller.playerOptionDisplayCursor).toBe(1);
    expect(down.sounds.filter((s) => s.t > 0)).toEqual([{ t: 42, kind: "se", id: 5 }]);
    expect(play(before, CASES.up42!, 42).states[42]!.factorySwap!.controller.playerOptionCursor).toBe(2);
  });

  it("B or RECHOOSE inside the fade: the picker takes input 56 frames after the press, as after the fade", () => {
    for (const k of [42, 50, 59, 60, 61]) {
      expect(firstTaken(before, [[k, "B"]], k, "RIGHT"), `B +${k}`).toBe(k + ROM_PICKER_AFTER_CLOSE);
    }
    for (const k of [43, 58, 63]) {
      expect(firstTaken(before, [[42, "UP"], [k, "A"]], k, "RIGHT"), `RECHOOSE +${k}`).toBe(k + ROM_PICKER_AFTER_CLOSE);
    }
  });

  it("SWAP inside the fade: the enemy picker's first input is as long after the A as after the fade", () => {
    for (const k of [43, 57, 63]) {
      expect(firstTaken(before, [[42, "DOWN"], [k, "A"]], k, "RIGHT"), `SWAP +${k}`).toBe(k + ENGINE_SWAP_TO_ENEMY_PICKER);
    }
  });

  it("SUMMARY at +42..+59 opens the summary on the timeline of an A at +38 (first input and cry at +101); at +60 as usual", () => {
    for (let k = 42; k <= 59; k += 1) {
      expect(firstTaken(before, [[k, "A"]], k, "B"), `A +${k}`).toBe(ROM_IN_FADE_SUMMARY_FIRST_INPUT);
    }
    for (const k of [60, 61, 63]) expect(firstTaken(before, [[k, "A"]], k, "B"), `A +${k}`).toBe(k + ROM_SUMMARY_OPEN_INPUT);
    const inFade = play(before, CASES.a42!, 110);
    expect(inFade.sounds.filter((s) => s.t > 0).map((s) => [s.t, s.kind])).toEqual([[42, "se"], [ROM_IN_FADE_SUMMARY_FIRST_INPUT, "cry"]]);
    const late = play(before, [[61, "A"]], 130);
    expect(late.sounds.filter((s) => s.t > 0).map((s) => [s.t, s.kind])).toEqual([[61, "se"], [61 + ROM_SUMMARY_OPEN_INPUT, "cry"]]);
  });

  it("SUMMARY inside the fade draws the popup fading in to +62, then the A-at-+38 summary open (ROM: frame for frame)", () => {
    const none = play(before, [], 62);
    const late = play(before, [[61, "A"]], 150 + 61 - 38);
    for (const k of [42, 50, 59]) {
      const inFade = play(before, [[k, "A"]], 150);
      for (let t = 0; t <= 62; t += 1) expect(same(render(inFade.states[t]!), render(none.states[t]!)), `A +${k}, +${t}`).toBe(true);
      for (let t = 63; t <= 150; t += 1) {
        expect(same(render(inFade.states[t]!), render(late.states[t + 61 - 38]!)), `A +${k}, +${t}`).toBe(true);
      }
    }
  });

  it("draws the presses inside the fade as the ROM does (sha256 pins, balls' row zeroed)", () => {
    const runs = new Map(Object.entries(CASES).map(([name, presses]) => [name, play(before, presses, 101).states]));
    for (const [name, t, sha] of PINS) expect(maskedSha256(render(runs.get(name)![t]!)), `${name} +${t}`).toBe(sha);
  });
});
