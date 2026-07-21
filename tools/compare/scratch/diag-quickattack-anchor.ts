// Scratch diagnostic (S7 slice R rung (c) attempt 3): confirm the LIVE
// pressTick this dispatcher computes for turn 9's QUICK_ATTACK window,
// per docs/battle-turn-notes.md §37's mandatory first step.
import { createInitialState, tick } from "../../../src/engine/core.ts";
import { normalizeButtons } from "../../../src/input.ts";
import fs from "node:fs";

const trace = JSON.parse(fs.readFileSync(new URL("../traces-groundtruth/battle1-turn9-dense.json", import.meta.url), "utf8"));

let state = createInitialState();
let frame = 0;
for (const segment of trace.segments) {
  const buttons = new Set(normalizeButtons(segment.buttons ?? []));
  for (let i = 0; i < segment.frames; i += 1) {
    state = tick(state, buttons);
    frame += 1;
    if (frame === 10929 || frame === 10933 || frame === 10940 || frame === 10946) {
      const sm = (state as any).battleScene?.fightSubmenu;
      console.log(`frame=${frame} confirmElapsed=${sm?.confirmElapsed} openElapsed=${sm?.openElapsed} closeElapsed=${sm?.closeElapsed}`);
    }
  }
}
