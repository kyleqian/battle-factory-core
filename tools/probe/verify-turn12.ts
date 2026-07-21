// S7/S8 worktree PROBE (turn 12: Pidgeotto's 2nd AERIAL_ACE use + the arc's
// FIRST ROCK_SLIDE MISS) — same convention as verify-turn10-rockslide.ts/
// verify-turn10-aerialace.ts: re-derives every pinned fact straight from a
// FRESH `bin/oracle run` (no stale PNGs, no trusting docs/turn12-notes.md's
// own prose) and fails loudly if the real hardware's pixels stop matching
// this session's own findings. Pixel-only (no RAM reads — this runs from
// plain `node`, not the mgba-venv python interpreter the RAM probes need);
// RAM facts (the AERIAL_ACE mechanism-table +2068-tick offset from turn 10,
// the ROCK_SLIDE-miss zero-rocks/zero-shake/zero-hit-flash/zero-wobble
// result) are cross-cited in docs/turn12-notes.md's dated section from
// fresh dump-aerialace-anim.py/dump-rockslide-sprites.py/dump-battle-bars.py
// runs, not re-asserted here.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn12.ts
import { readFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { composePlayerHealthboxHpOverlay, calcBarFilledPixels, pickHpBarBand } from "../../src/engine/healthboxAssembly.ts";
import battleHealthboxAsset from "../../src/assets/gen/battle-healthbox.json" with { type: "json" };

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn12-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

// AERIAL_ACE half: this session's own live-dispatcher instrument
// (tools/compare/scratch/diag-turn12-anchor.ts) found `confirmElapsed`
// FROZEN at turn 10's own value across the whole turn-12 window — the
// engine's dispatch simply doesn't extend past turn 10 yet, so (unlike
// turn 10's own live-instrument derivation) that method is unavailable
// here. Falls back to the fit method instead, cross-validated three
// independent ways (all converge on the SAME value, not just one):
//   (a) TURN10_AERIALACE_TEXT_DELAY(11) fit to this session's own fresh
//       kickoff-text-typing-start tick (14384, PNG-read) -> 14384-11=14373
//   (b) gBattlerAttacker's own flip tick (14378, RAM-cross-cited from
//       docs/turn12-notes.md's own predecessor session) is exactly
//       pressTick+5, the SAME offset turn 10's own 12310(=12305+5) shows
//   (c) the AERIAL_ACE mechanism RAM tables (mechanisms 1/2/3/4/5, this
//       session's own fresh dump-aerialace-anim.py run, RAM ticks
//       14400-14460) are IDENTICAL to turn 10's own tables
//       (docs/aerial-ace-notes.md) shifted by a CONSTANT +2068 RAM ticks
//       at every single sampled value (slice sprite: 14428-14451 vs.
//       turn 10's 12360-12383; palette-pulse darkened window: 14436-14438
//       vs. turn 10's 12368-12370; Onix shake 3,3,0,0 square wave onset
//       14437 vs. turn 10's 12369; lunge/clone onset 14428 vs. turn 10's
//       12360) — 12305+2068=14373, matching (a) and (b) exactly.
const TURN12_AERIALACE_PRESS_TICK = 14373;

// ROCK_SLIDE half: fit the SAME way `TURN10_ROCKSLIDE_PRESS_TICK` was (a
// synthetic anchor satisfying battleMenu.ts's shared `ROCK_SLIDE_TEXT_DELAY`
// (393) against this session's own fresh box-transition-begin tick, 14630 —
// verified below, not just cited from the predecessor dossier).
// `ROCK_SLIDE_TEXT_DELAY`(393)->14630. The OTHER shared rockSlide* delay
// constants (RAM_ANCHOR_DELAY=428, MON_SHAKE_START/END=443/536,
// HIT_FLASH_RAM_ANCHOR=562, HP_DRAIN_START=597) do NOT fit anything on this
// turn — this turn's own fresh dump-rockslide-sprites.py run (RAM
// 14615-14790) shows ZERO rocks/shakes/hit-flash-blink/healthbox-wobble the
// ENTIRE window, confirming the miss diverges immediately after the shared
// kickoff-text delay and never reaches the hit-consequence mechanisms at
// all — bit-exact to turn 8's own BIND-miss finding ("misses divert BEFORE
// the roll"), now confirmed on a second, structurally different move.
const TURN12_ROCKSLIDE_PRESS_TICK = 14237;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

const AERIALACE_KICKOFF_RANGE = range(14370, 14392); // press-transient + kickoff text typing-in start
const HP_DRAIN_RANGE = [14508, 14520]; // Onix 14->4 (pre-drain settle, post-drain settle)
const ROCKSLIDE_KICKOFF_RANGE = range(14620, 14692); // kickoff-text box transition through the miss-text box transition
const ROCKSLIDE_MISS_HOLD_RANGE = [14705, 14740, 14780]; // the held "attack missed!" text — must stay pixel-flat
const TURNEND_RANGE = [14774, 14775, 14780, 14781, 14787, 14788, 14789, 14790, 14798, 14799, 14800, 15374];
const captureFrames = Array.from(new Set([...AERIALACE_KICKOFF_RANGE, ...HP_DRAIN_RANGE, ...ROCKSLIDE_KICKOFF_RANGE, ...ROCKSLIDE_MISS_HOLD_RANGE, ...TURNEND_RANGE])).sort((a, b) => a - b);
trace.captureFrames = captureFrames;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };
  const sha = (t: number) => get(t).sha256;

  // --- AERIAL_ACE half: press-transient plateau, then the kickoff text box
  // transition begins at pressTick+11 (TURN10_AERIALACE_TEXT_DELAY, reused
  // unchanged), matching the (a)/(b)/(c) triple cross-validation above. ---
  const aaTextStart = TURN12_AERIALACE_PRESS_TICK + 11;
  check(`AERIAL_ACE: press-transient plateau static through ${aaTextStart - 1}`, sha(14376) === sha(aaTextStart - 1), `14376 and ${aaTextStart - 1} unexpectedly differ`);
  check(`AERIAL_ACE: kickoff text box transition begins at pressTick+11=${aaTextStart}`, sha(aaTextStart - 1) !== sha(aaTextStart), `${aaTextStart - 1} and ${aaTextStart} unexpectedly match`);

  // --- Onix HP drain (14->4): stays in the RED band throughout (already
  // red entering the turn per docs/turn11-notes.md, no zone crossing this
  // turn) — verified BOTH via the pure calcBarFilledPixels/pickHpBarBand
  // math AND via a real pixel-composited overlay diff against the fresh
  // oracle capture, same double-check discipline verify-turn10-rockslide.ts
  // established. ---
  const ONIX_MAX_HP = 117;
  check("Onix HP=14 (pre-drain) is RED band (calcBarFilledPixels)", pickHpBarBand(calcBarFilledPixels(14 / ONIX_MAX_HP).filledPixels) === "red", "expected red");
  check("Onix HP=4 (post-drain) is RED band (calcBarFilledPixels), no zone crossing", pickHpBarBand(calcBarFilledPixels(4 / ONIX_MAX_HP).filledPixels) === "red", "expected red");
  check("Onix HP=14 fill is 5px (calcBarFilledPixels)", calcBarFilledPixels(14 / ONIX_MAX_HP).filledPixels === 5, `got ${calcBarFilledPixels(14 / ONIX_MAX_HP).filledPixels}`);
  check("Onix HP=4 fill is 1px (calcBarFilledPixels)", calcBarFilledPixels(4 / ONIX_MAX_HP).filledPixels === 1, `got ${calcBarFilledPixels(4 / ONIX_MAX_HP).filledPixels}`);

  const hpOverlayAssets = {
    hpbar: (battleHealthboxAsset as { hpbar: unknown }).hpbar as Parameters<typeof composePlayerHealthboxHpOverlay>[0]["hpbar"],
    hpbarAnim: (battleHealthboxAsset as { hpbarAnim: unknown }).hpbarAnim as Parameters<typeof composePlayerHealthboxHpOverlay>[0]["hpbarAnim"],
    textPalette: (battleHealthboxAsset as { singlesPlayer: { palette: unknown } }).singlesPlayer.palette as Parameters<typeof composePlayerHealthboxHpOverlay>[0]["textPalette"],
  };
  const HB = { x: 127, y: 74 }; // menu-healthbox-player.json's own screen corner
  function diffInBox(a: Buffer, b: Buffer, box: { x: number; y: number; w: number; h: number }): number {
    let diffs = 0;
    for (let py = 0; py < box.h; py++) {
      for (let px = 0; px < box.w; px++) {
        const i = ((box.y + py) * 240 + (box.x + px)) * 4;
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diffs += 1;
      }
    }
    return diffs;
  }
  function buildHpExpected(baseRgba: Buffer, hp: number): Buffer {
    const out = Buffer.from(baseRgba);
    const { width, height, pixels } = composePlayerHealthboxHpOverlay(hpOverlayAssets, hp, ONIX_MAX_HP);
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const color = pixels[py * width + px];
        if (!color) continue;
        const i = ((HB.y + py) * 240 + (HB.x + px)) * 4;
        out[i] = color.r;
        out[i + 1] = color.g;
        out[i + 2] = color.b;
        out[i + 3] = 255;
      }
    }
    return out;
  }
  const { PNG } = await import("pngjs");
  const onixBaseRgba = PNG.sync.read(get(14508).png).data as unknown as Buffer;
  const preDrainActual = PNG.sync.read(get(14508).png).data as unknown as Buffer;
  const preDrainExpected = buildHpExpected(onixBaseRgba, 14);
  check("Onix HP bar: render 14508 (hp=14) matches composePlayerHealthboxHpOverlay exactly", diffInBox(preDrainActual, preDrainExpected, { ...HB, w: 103, h: 36 }) === 0, `mismatch=${diffInBox(preDrainActual, preDrainExpected, { ...HB, w: 103, h: 36 })}`);
  const postDrainActual = PNG.sync.read(get(14520).png).data as unknown as Buffer;
  const postDrainExpected = buildHpExpected(onixBaseRgba, 4);
  check("Onix HP bar: render 14520 (hp=4) matches composePlayerHealthboxHpOverlay exactly", diffInBox(postDrainActual, postDrainExpected, { ...HB, w: 103, h: 36 }) === 0, `mismatch=${diffInBox(postDrainActual, postDrainExpected, { ...HB, w: 103, h: 36 })}`);

  // --- ROCK_SLIDE half: the miss. Kickoff text box transition begins at
  // pressTick+393 (ROCK_SLIDE_TEXT_DELAY, the shared constant already
  // established turns 6/7/9/10 — reused verbatim, not re-fit). ---
  const rsTextStart = TURN12_ROCKSLIDE_PRESS_TICK + 393;
  check(`ROCK_SLIDE: pre-kickoff hold static through ${rsTextStart - 1}`, sha(14625) === sha(rsTextStart - 1), `14625 and ${rsTextStart - 1} unexpectedly differ`);
  check(`ROCK_SLIDE: kickoff text box transition begins at pressTick+393=${rsTextStart}`, sha(rsTextStart - 1) !== sha(rsTextStart), `${rsTextStart - 1} and ${rsTextStart} unexpectedly match`);

  // --- The miss itself: NO rock/shake/hit-flash/wobble animation plays —
  // the ENTIRE "ONIX used\nROCK SLIDE!" held window (kickoff text settled
  // through the accuracy-miss roll) must be perfectly pixel-FLAT, since
  // this session's own fresh dump-rockslide-sprites.py run (RAM 14615-14790)
  // shows zero active rocks/shakes/blink/wobble the whole time — bit-exact
  // to turn 8's BIND-miss "misses divert before the roll" finding, now
  // confirmed on ROCK_SLIDE too. ---
  check("ROCK_SLIDE miss: kickoff text HOLD is pixel-flat 14649-14685 (no rock/shake/flash animation)", sha(14649) === sha(14685), `14649 and 14685 unexpectedly differ — an animation may be playing`);
  for (const t of [14655, 14660, 14670, 14680]) {
    check(`ROCK_SLIDE miss: tick ${t} matches the flat kickoff-hold sha (no mid-window animation)`, sha(t) === sha(14649), `${t} differs from the 14649 kickoff-hold baseline`);
  }

  // --- Transition into "ONIX's\nattack missed!" — pressTick+449 (fit fresh
  // this session; turn 8's own BIND-miss used a different offset, 471, off
  // its own differently-timed BIND_TEXT_DELAY, so this is NOT assumed
  // transferable, only independently re-fit). ---
  const missTextStart = TURN12_ROCKSLIDE_PRESS_TICK + 449;
  check(`ROCK_SLIDE miss: transition into "attack missed!" begins at pressTick+449=${missTextStart}`, sha(missTextStart - 1) !== sha(missTextStart), `${missTextStart - 1} and ${missTextStart} unexpectedly match`);
  check('ROCK_SLIDE miss: "ONIX\'s\\nattack missed!" held, pixel-flat 14705-14780', sha(14705) === sha(14780), "14705 and 14780 unexpectedly differ");

  // --- Turn-end: text clear at pressTick+544, matching turn 8's OWN
  // miss->clear gap of 95 ticks exactly (471->566 there; 449->544 here) —
  // the "message held then clear" duration for a miss looks like a fixed
  // ~95-tick constant regardless of which move misses, a genuinely new
  // cross-move data point. Menu redraw settle at pressTick+551 (a 7-tick
  // clear-to-redraw gap, the STANDARD gap turns 6/7/9/10 established —
  // turn 8's own 6-tick gap is the outlier, not this turn). ---
  const textClearTick = TURN12_ROCKSLIDE_PRESS_TICK + 544;
  const menuRedrawTick = TURN12_ROCKSLIDE_PRESS_TICK + 551;
  check(`ROCK_SLIDE miss: text clears at pressTick+544=${textClearTick}`, sha(textClearTick - 1) !== sha(textClearTick), `${textClearTick - 1} and ${textClearTick} unexpectedly match`);
  check(`ROCK_SLIDE miss: resettled turn-13 menu visible by pressTick+551=${menuRedrawTick}`, sha(menuRedrawTick) === sha(14790), `${menuRedrawTick} does not match the settled turn-13 menu frame at 14790`);

  // --- Turn-13 menu: idle-bounce, NOT flat (matching the established
  // correction pattern for every prior turn's own resettled menu) — two
  // distinct shas recur across the idle tail, not a single static one. ---
  check("turn-13 menu idle: NOT a single flat sha across its own tail (idle-bounce, matching the established correction)", sha(14790) !== sha(15374), "14790 and 15374 unexpectedly match — would suggest a flat idle, contradicting the established idle-bounce rule");

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} (${captureFrames.length} ticks captured)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
