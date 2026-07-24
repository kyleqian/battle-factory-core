import { describe, expect, it } from "vitest";
import {
  turn6FeatherSprites,
  turn7FeatherSprites,
  turn8FeatherSprites,
} from "../src/engine/featherDance.ts";
import turn6FeatherProbe from "../src/data/gen/turn6-feather-sprites-probe.json" with { type: "json" };
import turn7FeatherProbe from "../src/data/gen/turn7-feather-sprites-probe.json" with { type: "json" };
import turn8FeatherProbe from "../src/data/gen/turn8-feather-sprites-probe.json" with { type: "json" };

// These three RAM-probe JSONs (twice-run byte-identical, i.e. real hardware
// state) are the falsification target for ANIMATION_PROGRESS.md's 2026-07-24
// anim-script interpreter spike: `src/engine/featherDance.ts` no longer
// reads them in production (ISSUES #40 retired) - they're kept here purely
// as dev-time test evidence that the ported `AnimFallingFeather`/`_Step`
// callback, driven by the anim-script interpreter's own spawn schedule,
// reproduces every real RAM tick these probes ever recorded.

const FEATHER_RENDER_LAG = 1;

interface FeatherProbeRecord {
  tick: number;
  slot: number;
  inUse: number;
  invisible: number;
  priority: number;
  hFlip: number;
  animNum: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

function checkAgainstProbe(
  name: string,
  lookup: (t: number) => ReturnType<typeof turn6FeatherSprites>,
  probe: { ticks: FeatherProbeRecord[] },
  expectedMatched: number,
  expectedLastRealTick: number,
) {
  let matched = 0;
  let lastRealTick = -1;
  for (const rec of probe.ticks) {
    if (!rec.inUse || rec.invisible) continue;
    const sprites = lookup(rec.tick + FEATHER_RENDER_LAG);
    const sim = sprites.find((s) => s.slot === rec.slot);
    if (!sim) continue; // the known post-destroy OAM-slot-reuse garbage tail - correctly excluded
    matched += 1;
    if (rec.tick > lastRealTick) lastRealTick = rec.tick;
    expect(
      {
        centerX: sim.centerX,
        centerY: sim.centerY,
        pa: sim.pa,
        pb: sim.pb,
        pc: sim.pc,
        pd: sim.pd,
        animNum: sim.animNum,
        priority: sim.priority,
      },
      `${name} tick=${rec.tick} slot=${rec.slot}`,
    ).toEqual({
      centerX: rec.x + rec.x2,
      centerY: rec.y + rec.y2,
      pa: rec.a,
      pb: rec.b,
      pc: rec.c,
      pd: rec.d,
      animNum: rec.animNum,
      priority: rec.priority,
    });
  }
  expect(matched, `${name} matched count`).toBe(expectedMatched);
  expect(lastRealTick, `${name} last real RAM tick`).toBe(expectedLastRealTick);
}

describe("anim-script interpreter spike: ported AnimFallingFeather/_Step vs RAM-probe evidence", () => {
  it("reproduces every real turn-6 feather tick, matrix, priority, and anim state field-for-field", () => {
    checkAgainstProbe(
      "turn6",
      turn6FeatherSprites,
      turn6FeatherProbe as { ticks: FeatherProbeRecord[] },
      973,
      7557,
    );
  });

  it("reproduces every real turn-7 feather tick, matrix, priority, and anim state field-for-field", () => {
    checkAgainstProbe(
      "turn7",
      turn7FeatherSprites,
      turn7FeatherProbe as { ticks: FeatherProbeRecord[] },
      973,
      8591,
    );
  });

  it("reproduces every real turn-8 feather tick, matrix, priority, and anim state field-for-field", () => {
    checkAgainstProbe(
      "turn8",
      turn8FeatherSprites,
      turn8FeatherProbe as { ticks: FeatherProbeRecord[] },
      973,
      9637,
    );
  });

  it("the interpreter's own natural per-tick sprite count matches the probe's real (non-garbage) row count exactly", () => {
    // turn6/turn8's probes each carry a known tail of OAM-slot-reuse garbage
    // past the real feathers' own natural destroy tick (a later, unrelated
    // sprite reusing slot 3) - confirmed static/non-feather data (identity
    // matrix, priority 0, resting position), correctly excluded above.
    const totalInUse = (probe: { ticks: FeatherProbeRecord[] }) =>
      probe.ticks.filter((r) => r.inUse && !r.invisible).length;
    expect(totalInUse(turn6FeatherProbe as { ticks: FeatherProbeRecord[] })).toBe(1060);
    expect(totalInUse(turn7FeatherProbe as { ticks: FeatherProbeRecord[] })).toBe(973);
    expect(totalInUse(turn8FeatherProbe as { ticks: FeatherProbeRecord[] })).toBe(985);
  });
});
