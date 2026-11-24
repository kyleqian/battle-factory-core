// swp1 (docs/swp1-swap-popup.md): two picture bugs of the Battle Factory swap screen, pinned to what the ROM shows.
// 1. After a SUMMARY visit the engine kept drawing the SUMMARY/SWAP/RECHOOSE popup and its pic for the rest of the swap screen. The ROM
//    rebuilds that popup once (CB2_InitSwapScreen -> Swap_ShowSummaryMonSprite, battle_factory_screen.c:3356-3362, 4075-4097) and closes it
//    on B / RECHOOSE / SWAP like any other (CloseMonPic, :2609-2619, :3989-4013): the close, then the picker or the party switch.
// 2. On SWAP the closing popup, the species name and the arrow jumped to the party's slot 0 (the controller resets its cursor for the enemy
//    screen on the press). The ROM keeps cursorPos on the chosen mon until Swap_Task_SwitchPartyScreen state 3's Swap_InitActions
//    (:3218-3225, :3961-3980), and the category until ScreenInfoTransitionIn state 7 (:3167-3176).
//
// The game is driven by state, not by frame numbers (so a change of when screens arrive does not desync it): seed 28, Scene ON, the soak's
// RandomPlayer ("winning-swap") for the draft, rooms and battles, and scripted swap screens (.integration/evidence/swp1/makeSpinda.mjs,
// spd2's driver plus a `swapsum` mode). A checkpoint is the first frame of a swap-screen state: `<swap>:<phase><* after a summary>:<phase
// elapsed>`. Its pin is the sha256 of the ROM frame's RGB888 at the same point (the frame catcher, tools/frame-catcher, KEEP=1, mGBA in
// process; ROM frame = our frame + the offset between the two sides' presses that entered the window), with the balls' row (y 48..79) zeroed
// on both sides: the balls rock on Random() draws and the catcher syncs gRngValue only at battle starts. In the post-summary picker and quit
// prompt the species name window (152..239 x 16..31) is zeroed too: its breathe runs in another phase on the ROM (pre-existing, the doc's
// "Seen, not fixed").
//   "swap": swap 1 picks the player's slot 1 (SEALEO; slot 0 is MURKROW), SWAP (no summary), takes the enemy's SPINDA; swap 2 opens the
//           player's SPINDA, its SUMMARY and back, B (closes the rebuilt popup), then quits. Catcher trace spd-swap-s28.json (spd2's).
//   "swapsum": swap 1 opens slot 1, its SUMMARY and back, then SWAP from the rebuilt popup (Kyle's 11-24 path) and takes SPINDA.
// Fails on the base a866d9ddc: 0 of the 34 pins.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { render, type EngineState } from "../src/engine/core.ts";
import { FactorySession } from "../src/factorySession.ts";
import type { GbaButton } from "../src/input.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

type Mask = "balls" | "balls+species";
/** [checkpoint, ROM frame (catcher run), mask, sha256 of the masked ROM RGB888]. */
type Pin = readonly [string, number, Mask, string];

const SWAP_PINS: readonly Pin[] = [
  // Bug 2: SWAP from slot 1. Close, switch and the slide of the balls show SEALEO (pic, name, arrow, then its category) until +84.
  ["1:enemySwitch:0", 12880, "balls", "d6154440529a040a5ca1d5a2790ca37c6acc8550364a5be53ccd4b8eecdc9b6d"],
  ["1:enemySwitch:1", 12881, "balls", "52cf694b3643f7e8aac5e7fbfcd0d74b99b14f33c9e479ccb5d992eee7febcea"],
  ["1:enemySwitch:3", 12883, "balls", "9e530f8be696b7d4eb74ecb26f02a12535a7247c24fdc5eb8876f25bd4e2a604"],
  ["1:enemySwitch:10", 12890, "balls", "663b27c4ee891cd7b55b0515ec703b56190692aac382e53f15b874e94eda3943"],
  ["1:enemySwitch:21", 12901, "balls", "663b27c4ee891cd7b55b0515ec703b56190692aac382e53f15b874e94eda3943"],
  ["1:enemySwitch:22", 12902, "balls", "efaa609bd1f53785b15ca5c93fef6e82d14d9dfc6bbde9b0fed444e8cdc69cd5"],
  ["1:enemySwitch:60", 12940, "balls", "06a66c1a1b6b11e9c3b930289b8b1f9ff7e5e0e124e34d0a296f2f9ddcc12fb7"],
  ["1:enemySwitch:83", 12963, "balls", "cf7ad0213c98d50db4118940026eb8079c91682149e2ec4404b012a130e520c7"],
  ["1:enemySwitch:84", 12964, "balls", "bee8a0266e833196c906f370a3fa6b58c4b1ffddb8faa2fe367ba7a451cf4280"],
  ["1:enemySwitch:132", 13012, "balls", "4a37d5fe68e21526af7712ac369dcdcc8d638e72f48ee306e557646abc4b77bc"],
  // Bug 1: B on the popup rebuilt after SPINDA's summary closes it; the picker, then "Quit swapping?".
  ["2:playerPickerReturn*:1", 26912, "balls", "70a56ee6e522e07a119c30e38d88b1e9ff5c56d02c75869e6bec8de02201a279"],
  ["2:playerPickerReturn*:5", 26916, "balls", "a9281491ae602e2a89ce499c521f7950dd5eb12845f4c897b515357ec26c3cfa"],
  ["2:playerPickerReturn*:20", 26931, "balls", "a9281491ae602e2a89ce499c521f7950dd5eb12845f4c897b515357ec26c3cfa"],
  ["2:playerPickerReturn*:40", 26951, "balls", "ce103351cbb74fa7000bfc81ffb67143233bda66793a7a6c5ec5b60d01a8250f"],
  ["2:playerPickerReturn*:54", 26965, "balls", "9195f2ad4168a16ac55de30fc0ae90e314c170c9afede34a319062944bdeedeb"],
  ["2:playerPicker*:0", 26966, "balls+species", "934c360982f2527503f75602c2dfa4aab51f559f851399de4ecdea1a4b1b2787"],
  ["2:playerPicker*:1", 26967, "balls+species", "934c360982f2527503f75602c2dfa4aab51f559f851399de4ecdea1a4b1b2787"],
  ["2:quitPrompt*:20", 27020, "balls+species", "b948e979d2656a49984a115d24d699b084288eec38942d65f42b383ffd5999d9"],
  ["2:quitPrompt*:36", 27036, "balls+species", "d691bbb05dd6ca930aec142c39b803e7a4d229d44ae288507560166b98440d0c"],
];

const SWAPSUM_PINS: readonly Pin[] = [
  // Bugs 1 and 2 together: SWAP from the rebuilt popup. The ROM shows the same switch as without the summary (the same hashes).
  ["1:enemySwitch*:0", 13113, "balls", "d6154440529a040a5ca1d5a2790ca37c6acc8550364a5be53ccd4b8eecdc9b6d"],
  ["1:enemySwitch*:1", 13114, "balls", "52cf694b3643f7e8aac5e7fbfcd0d74b99b14f33c9e479ccb5d992eee7febcea"],
  ["1:enemySwitch*:3", 13116, "balls", "9e530f8be696b7d4eb74ecb26f02a12535a7247c24fdc5eb8876f25bd4e2a604"],
  ["1:enemySwitch*:10", 13123, "balls", "663b27c4ee891cd7b55b0515ec703b56190692aac382e53f15b874e94eda3943"],
  ["1:enemySwitch*:60", 13173, "balls", "06a66c1a1b6b11e9c3b930289b8b1f9ff7e5e0e124e34d0a296f2f9ddcc12fb7"],
  ["1:enemySwitch*:83", 13196, "balls", "cf7ad0213c98d50db4118940026eb8079c91682149e2ec4404b012a130e520c7"],
  ["1:enemySwitch*:84", 13197, "balls", "bee8a0266e833196c906f370a3fa6b58c4b1ffddb8faa2fe367ba7a451cf4280"],
  ["1:enemySwitch*:132", 13245, "balls", "4a37d5fe68e21526af7712ac369dcdcc8d638e72f48ee306e557646abc4b77bc"],
  // The enemy screen, the accept prompt and its exit (Kyle's game drew the popup through all of them).
  ["1:enemyPicker*:0", 13246, "balls", "1dd12fbaf7cdb09d1302d09e1773551c075e9ec42ee258d5eb74f69273b1407a"],
  ["1:enemyPicker*:31", 13277, "balls", "786ecd18e16a5ecebefcdf05e80ad8309f66ca8a9c7daa8ade6c0330aa673ae3"],
  ["1:acceptPrompt*:1", 13280, "balls", "786ecd18e16a5ecebefcdf05e80ad8309f66ca8a9c7daa8ade6c0330aa673ae3"],
  ["1:acceptPrompt*:64", 13343, "balls", "8afe83109adfbd4f20925c408ed78bafce1d8505a36104fcabfd3d0d889b7508"],
  ["1:acceptPrompt*:120", 13399, "balls", "a97d176aae7b4b18108079af64f3aaec34f9dae0e40f1ac6a9b61f348c6ac884"],
  ["1:acceptExit*:1", 13447, "balls", "a97d176aae7b4b18108079af64f3aaec34f9dae0e40f1ac6a9b61f348c6ac884"],
  ["1:acceptExit*:40", 13486, "balls", "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
];

/** sha256 of the frame's RGB888 with the balls' row (and the species window) zeroed. */
function maskedSha256(fb: Uint8Array, mask: Mask): string {
  const rgb = Buffer.alloc(240 * 160 * 3);
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const hidden = (y >= 48 && y < 80) || (mask === "balls+species" && x >= 152 && y >= 16 && y < 32);
      if (hidden) continue;
      const o = (y * 240 + x) * 4;
      rgb.set([fb[o]!, fb[o + 1]!, fb[o + 2]!], (y * 240 + x) * 3);
    }
  }
  return createHash("sha256").update(rgb).digest("hex");
}

const NONE: ReadonlySet<GbaButton> = new Set();
interface Step { readonly when: (st: EngineState) => boolean; readonly until?: (st: EngineState) => boolean; readonly press: GbaButton | null; readonly wait: number }

/** spd2's script runner (makeSpinda.mjs): a step fires on the first frame `when` holds (an `until` step repeats until that holds). */
function script(steps: readonly Step[]) {
  let i = 0;
  let wait = 0;
  const step = (st: EngineState): ReadonlySet<GbaButton> => {
    if (wait > 0) { wait -= 1; return NONE; }
    const s = steps[i];
    if (!s) return NONE;
    if (s.until?.(st)) { i += 1; return step(st); }
    if (!s.when(st)) return NONE;
    if (!s.until) i += 1;
    wait = s.wait;
    return s.press ? new Set([s.press]) : NONE;
  };
  return { done: () => i >= steps.length, step };
}

const sw = (st: EngineState) => st.factorySwap!;
const ready = (st: EngineState) => st.factorySwap?.controller.inputReady === true;
const ph = (st: EngineState) => st.factorySwap?.controller.phase;
const enemySpinda = (st: EngineState) => sw(st).controller.enemyParty.findIndex((m) => m.species === "SPINDA");
const playerSpinda = (st: EngineState) => sw(st).controller.playerParty.findIndex((m) => m.species === "SPINDA");
const summaryOpen = (st: EngineState) => st.summaryScreen.onInfoPage && !st.summaryScreen.transition && st.summaryScreen.openElapsed > 60;
const toEnemySpinda: readonly Step[] = [
  { until: (st) => ready(st) && ph(st) === "enemyPicker" && sw(st).controller.cursor === enemySpinda(st), when: (st) => ready(st) && ph(st) === "enemyPicker", press: "RIGHT", wait: 12 },
  { when: (st) => ready(st) && ph(st) === "enemyPicker" && sw(st).controller.cursor === enemySpinda(st), press: null, wait: 30 },
  { when: (st) => ready(st) && ph(st) === "enemyPicker" && sw(st).controller.cursor === enemySpinda(st), press: "A", wait: 10 },
  { when: (st) => ready(st) && ph(st) === "acceptPrompt", press: null, wait: 60 },
  { when: (st) => ready(st) && ph(st) === "acceptPrompt" && sw(st).controller.yesNoCursor === 0, press: "A", wait: 10 },
];
const openSlot1: readonly Step[] = [
  { when: (st) => ready(st) && ph(st) === "playerPicker" && sw(st).controller.cursor === 0, press: "RIGHT", wait: 12 },
  { when: (st) => ready(st) && ph(st) === "playerPicker" && sw(st).controller.cursor === 1, press: "A", wait: 10 },
];
const SCRIPTS: Record<"swap" | "swapsum", () => ReturnType<typeof script>[]> = {
  swap: () => [
    script([
      ...openSlot1,
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: "DOWN", wait: 10 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 1, press: "A", wait: 10 },
      ...toEnemySpinda,
    ]),
    script([
      { until: (st) => ready(st) && ph(st) === "playerPicker" && sw(st).controller.cursor === playerSpinda(st), when: (st) => ready(st) && ph(st) === "playerPicker", press: "RIGHT", wait: 12 },
      { when: (st) => ready(st) && ph(st) === "playerPicker" && sw(st).controller.cursor === playerSpinda(st), press: "A", wait: 10 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: null, wait: 60 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: "A", wait: 10 },
      { when: summaryOpen, press: "B", wait: 10 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).returnedFromSummary, press: null, wait: 90 },
      { when: (st) => ready(st) && ph(st) === "playerOptions", press: "B", wait: 10 },
      { when: (st) => ready(st) && ph(st) === "playerPicker", press: null, wait: 30 },
      { when: (st) => ready(st) && ph(st) === "playerPicker", press: "B", wait: 10 },
      { when: (st) => ready(st) && ph(st) === "quitPrompt" && sw(st).controller.yesNoCursor === 0, press: "A", wait: 10 },
    ]),
  ],
  swapsum: () => [
    script([
      ...openSlot1,
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: null, wait: 30 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: "A", wait: 10 },
      { when: summaryOpen, press: "B", wait: 10 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).returnedFromSummary, press: null, wait: 60 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 0, press: "DOWN", wait: 10 },
      { when: (st) => ready(st) && ph(st) === "playerOptions" && sw(st).controller.playerOptionCursor === 1, press: "A", wait: 10 },
      ...toEnemySpinda,
    ]),
  ],
};

const mix = (v: number) => {
  let x = Math.imul(v ^ (v >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
};

/** Plays seed 28 with the scripted swap screens and hands `at` each pinned checkpoint's first frame, in the order they come. */
function play(mode: "swap" | "swapsum", pins: readonly Pin[], at: (label: string, state: EngineState) => void): string[] {
  const seed = 28;
  const session = new FactorySession({ battleScene: "on", gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft", challengeRequest: "hold" });
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning-swap");
  const scripts = SCRIPTS[mode]();
  const wanted = new Set(pins.map(([label]) => label));
  const seen: string[] = [];
  let swapIndex = 0;
  let wasSwap = false;
  for (let f = 0; f < 40_000 && seen.length < wanted.size; f += 1) {
    const st = session.state;
    if (st.factorySwap && !wasSwap) swapIndex += 1;
    wasSwap = !!st.factorySwap;
    const swapScript = st.factorySwap ? scripts[swapIndex - 1] : undefined;
    session.tick(swapScript && !swapScript.done() ? swapScript.step(st) : player.decide(st));
    const next = session.state;
    const swap = next.factorySwap;
    if (!swap) continue;
    const label = `${swapIndex}:${swap.controller.phase}${swap.returnedFromSummary ? "*" : ""}:${swap.phaseElapsed}`;
    if (wanted.has(label) && !seen.includes(label)) {
      seen.push(label);
      at(label, next);
    }
  }
  return seen;
}

describe("swp1: the swap screen's popup after a summary, and PKMN FOR SWAP's chosen mon, as on the ROM", () => {
  it("SWAP keeps the chosen mon (pic, name, arrow, category) through the switch; B closes the popup rebuilt after a summary", () => {
    const pins = new Map(SWAP_PINS.map((pin) => [pin[0], pin]));
    const seen = play("swap", SWAP_PINS, (label, state) => {
      const swap = state.factorySwap!;
      if (label.startsWith("1:")) {
        // the scenario: the player's slot 1 is SEALEO, the slot 0 the bug drew is MURKROW; the controller is already on slot 0
        expect(swap.controller.playerParty.map((m) => m.species)).toEqual(["MURKROW", "SEALEO", "PLUSLE"]);
        expect(swap.controller.playerMonId).toBe(1);
        expect(swap.controller.cursor).toBe(0);
        expect(swap.returnedFromSummary).toBe(false);
      } else {
        expect(swap.controller.playerParty[swap.controller.cursor as 0]?.species).toBe("SPINDA");
        expect(swap.returnedFromSummary).toBe(true);
      }
      const [, , mask, sha] = pins.get(label)!;
      expect(maskedSha256(render(state), mask), label).toBe(sha);
    });
    expect(seen).toEqual(SWAP_PINS.map(([label]) => label));
  }, 120_000);

  it("SWAP from the popup rebuilt after a summary (Kyle's 11-24 path): the switch, the enemy screen and the accept prompt", () => {
    const pins = new Map(SWAPSUM_PINS.map((pin) => [pin[0], pin]));
    const seen = play("swapsum", SWAPSUM_PINS, (label, state) => {
      const swap = state.factorySwap!;
      expect(swap.returnedFromSummary).toBe(true);
      expect(swap.controller.playerMonId).toBe(1);
      expect(swap.controller.enemyParty.map((m) => m.species)).toEqual(["SPINDA", "FARFETCHD", "QUILAVA"]);
      const [, , mask, sha] = pins.get(label)!;
      expect(maskedSha256(render(state), mask), label).toBe(sha);
    });
    expect(seen).toEqual(SWAPSUM_PINS.map(([label]) => label));
  }, 120_000);
});
