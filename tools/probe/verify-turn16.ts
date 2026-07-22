// S7/S8 worktree scout, turn 16 probe (MAGBY vs MURKROW's first real
// speed-order turn: MURKROW's FAINT_ATTACK connects first, MAGBY answers
// with FIRE_PUNCH and procs a 10% burn). Same convention as
// verify-turn13.ts/verify-turn14.ts/verify-turn15.ts: re-derives every
// pinned fact from a FRESH `bin/oracle run` (no stale PNGs) and fails
// loudly if the real hardware's pixels stop matching docs/turn16-notes.md's
// own citations. Pixel-only (no RAM reads — this runs from plain `node`,
// not the mgba-venv python interpreter the RAM probes need); RAM facts
// (RNG ledger, PP/HP/status deltas) are cross-cited in docs/turn16-notes.md's
// own dated sections from `ram-probe.py`/`dump-battler-full.py` runs, not
// re-asserted here.
//
// Per the brief: reuse `battle1-turn16-dense.json`'s own committed 126
// segments verbatim, overriding `captureFrames` with a curated dense list
// (single oracle round trip, capped at 256 captures/run) that:
//   (1) pins the BRN badge's exact appearance tick (ISSUES #16's named
//       sparse-capture gap, 21540 absent -> 21548 present, unread window
//       21541-21547) — the mission's own top priority,
//   (2) dense re-bisects the FAINT_ATTACK dark-tint window and the
//       FIRE_PUNCH cast window, both previously sampled only at stride 18,
//   (3) dense re-bisects the "was burned!" text-typing boundary,
//   (4) spot-checks every already-exact §4 citation as a regression pin.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn16.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn16-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

// --- Segment-structure check, derived programmatically from the committed
// trace's own segments (NOT hand-copied from docs/turn16-notes.md's own
// prose) — pins the exact press ticks the rest of this script anchors to. ---
interface SegBound { index: number; start: number; end: number; buttons: string[] }
function segmentBoundaries(segments: Trace["segments"]): SegBound[] {
  const out: SegBound[] = [];
  let cum = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i] as { frames: number; buttons: string[] };
    const start = cum;
    cum += s.frames;
    out.push({ index: i, start, end: cum - 1, buttons: s.buttons });
  }
  return out;
}
const bounds = segmentBoundaries(trace.segments);
check("126 segments total (§1)", bounds.length === 126, `got ${bounds.length}`);
const totalFrames = bounds[bounds.length - 1]!.end + 1;
check("21773 frames total (§1)", totalFrames === 21773, `got ${totalFrames}`);

// This turn's own 4 segments are the LAST 4 (indices 122-125): FIGHT-submenu
// open A, 27f settle (cursor defaults to FIRE_PUNCH slot 0, no nav), confirm
// A, then a single 999f resolution-idle covering the entire turn: FAINT_ATTACK,
// FIRE_PUNCH, the burn proc, both HP drains, and the settle into turn 17's menu.
const menuOpen = bounds[122]!;
const settle = bounds[123]!;
const confirmPress = bounds[124]!;
const resolutionIdle = bounds[125]!;
check("segment[122] is the FIGHT-submenu-open A", menuOpen.buttons.join() === "A", JSON.stringify(menuOpen));
check("segment[123] is a 27f settle with no press (no nav, cursor defaults to FIRE_PUNCH)", settle.buttons.length === 0 && settle.end - settle.start === 26, JSON.stringify(settle));
check("segment[124] is the confirm A", confirmPress.buttons.join() === "A", JSON.stringify(confirmPress));
check("segment[125] is the 999f resolution-idle covering the whole turn", resolutionIdle.buttons.length === 0 && resolutionIdle.end - resolutionIdle.start === 998, JSON.stringify(resolutionIdle));

const OPEN_TICK = menuOpen.start; // 20745
const CONFIRM_TICK = confirmPress.start; // 20773
check("OPEN_TICK matches §1/§4's own carried anchor (20745)", OPEN_TICK === 20745, `got ${OPEN_TICK}`);
check("CONFIRM_TICK matches §4's own citation (20773)", CONFIRM_TICK === 20773, `got ${CONFIRM_TICK}`);
console.log(`Derived: OPEN=${OPEN_TICK} CONFIRM=${CONFIRM_TICK}`);

// --- Curated fresh-oracle capture list ---
function range(a: number, b: number, stride = 1): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t += stride) out.push(t);
  return out;
}
const ANCHOR_SPOT = [20745, 20770, 20773, 20800, 20951, 21023];
// FAINT_ATTACK's own dark-tint/lunge window (source: Move_FAINT_ATTACK,
// battle_anim_scripts.s:5156 — fadetobg BG_DARK, AnimTask_TranslateMonEllipticalRespectSide
// on the attacker, attacker_fade_to_invisible/_from_invisible, a hitsplat on
// the target, ShakeMon2). §4's own row sampled this only at stride 18
// (20819/20951/21023) and called it "not frame-exact" — dense re-bisect at
// stride 3 up to the HP-write tick (21147).
const FAINT_TINT_DENSE = range(20805, 21146, 3);
const HP_DRAIN_SPOT = [21131];
// FIRE_PUNCH's own cast window (source: Move_FIRE_PUNCH, battle_anim_scripts.s:6959
// — 4x gFireSpiralInwardSpriteTemplate spiraling onto the target, a thrown
// fist sprite, a hitsplat, ShakeMon, then FireSpreadEffect's 7x
// gFireSpreadSpriteTemplate burst, plus a red palette blend on the target).
// §4's own row sampled this at a single spot tick (21218) — dense re-bisect.
const FIRE_CAST_DENSE = range(21170, 21405, 4);
// "Foe MURKROW was burned!" typing-in boundary — §4 says "first appears
// between 21450 (absent) and 21465 (typing)" without pinning the exact tick.
const BURN_TEXT_DENSE = range(21445, 21466, 1);
// MISSION 1: the BRN badge's exact appearance tick. §4/ISSUES #16 leave this
// unpinned inside the 21541-21547 window (21540 absent, 21548 present).
// Dense stride-1 across a slightly wider margin for safety.
const BADGE_DENSE = range(21535, 21555, 1);
const TAIL_SPOT = [21406, 21411, 21553, 21600, 21660, 21714, 21719, 21724, 21725, 21735, 21773];

const captureFrames = Array.from(
  new Set([
    ...ANCHOR_SPOT,
    ...FAINT_TINT_DENSE,
    ...HP_DRAIN_SPOT,
    ...FIRE_CAST_DENSE,
    ...BURN_TEXT_DENSE,
    ...BADGE_DENSE,
    ...TAIL_SPOT,
  ]),
).sort((a, b) => a - b);
check("curated capture list stays under the oracle's 256-per-run cap", captureFrames.length <= 256, `got ${captureFrames.length}`);
trace.captureFrames = captureFrames;

// --- Pixel-diff helpers (bbox of changed pixels between two frames, used to
// characterize the BRN badge's own geometry/layout-shift question without
// hardcoding screen coordinates). ---
function bboxDiff(a: Buffer, b: Buffer): { minX: number; minY: number; maxX: number; maxY: number; count: number } | null {
  let minX = 240, minY = 160, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count === 0) return null;
  return { minX, minY, maxX, maxY, count };
}
function cropDiffCount(a: Buffer, b: Buffer, x0: number, y0: number, x1: number, y1: number): number {
  let count = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * 240 + x) * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) count++;
    }
  }
  return count;
}

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks (single round trip, battle1-turn16-dense.json's own segments)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };
  const sha = (t: number) => get(t).sha256;
  const sha12 = (t: number) => sha(t).slice(0, 12);
  const png = (t: number) => PNG.sync.read(get(t).png).data as unknown as Buffer;

  // === §4 row 1: carried settled "What will MAGBY do?" menu (entering) ===
  check("carried settled menu anchor (20745) matches §4's own citation (5950e7b3d8ba)", sha12(20745) === "5950e7b3d8ba", `got ${sha12(20745)}`);

  // === §4 row 2: FIGHT submenu open ===
  check("FIGHT submenu open (20770) matches §4's own citation (533d43f7a773)", sha12(20770) === "533d43f7a773", `got ${sha12(20770)}`);

  // === §4 row 3: "Foe MURKROW used" typing in ===
  check("'Foe MURKROW used' typing-in (20800) matches §4's own citation (557d261b5dba)", sha12(20800) === "557d261b5dba", `got ${sha12(20800)}`);

  // === §4 row 4: FAINT_ATTACK's dark-tint/lunge window — dense re-bisection.
  // Source (Move_FAINT_ATTACK) confirms this is fadetobg BG_DARK (a genuine
  // full background-palette fade, not a sprite flash) layered with
  // AnimTask_TranslateMonEllipticalRespectSide moving the attacker's own
  // sprite toward the target along an elliptical path, then fading it back
  // in after a hitsplat/ShakeMon2 on the target. This dense pass finds the
  // tint's own onset/peak/clear ticks precisely instead of the dossier's
  // stride-18 sketch. ===
  {
    const shas = FAINT_TINT_DENSE.map((t) => ({ t, sha: sha12(t) }));
    const distinct = new Set(shas.map((r) => r.sha));
    check(`FAINT_ATTACK tint/lunge window (20805-21146): genuinely dynamic across the dense pass (source-confirmed elliptical translate + bg fade, not a static hold) — ${distinct.size} distinct frames of ${shas.length} sampled`, distinct.size >= 10, `shas: ${JSON.stringify(shas)}`);
    check("§4's own cited tick 20951 still reads its cited sha (9042f3f1afe1), regression pin", sha12(20951) === "9042f3f1afe1", `got ${sha12(20951)}`);
    check("§4's own cited tick 21023 still reads its cited sha (e4a415cb85ad), regression pin", sha12(21023) === "e4a415cb85ad", `got ${sha12(21023)}`);
  }

  // === §4 row 5: MAGBY's HP bar mid-drain ===
  check("HP bar mid-drain (21131) matches §4's own citation (d28dd01e52fd)", sha12(21131) === "d28dd01e52fd", `got ${sha12(21131)}`);

  // === §4 row 6: FIRE_PUNCH's cast window — dense re-bisection. Source
  // (Move_FIRE_PUNCH) confirms 4 spiral-inward fire sprites + a thrown fist +
  // FireSpreadEffect's own 7-sprite burst + a red target-palette blend — a
  // genuinely multi-sprite composite, not a simple linear-translation
  // projectile (contrast the ISSUES-#23 family). ===
  {
    const shas = FIRE_CAST_DENSE.map((t) => ({ t, sha: sha12(t) }));
    const distinct = new Set(shas.map((r) => r.sha));
    check(`FIRE_PUNCH cast window (21170-21405): genuinely dynamic across the dense pass (source-confirmed multi-sprite spiral+spread composite, not a static hold) — ${distinct.size} distinct frames of ${shas.length} sampled`, distinct.size >= 8, `shas: ${JSON.stringify(shas)}`);
    check("§4's own cited tick 21218 still reads its cited sha (5123afd2b167), regression pin", sha12(21218) === "5123afd2b167", `got ${sha12(21218)}`);
  }

  // === §4 row 7: FIRE_PUNCH's own HP write / burn-proc tick (same rendered frame) ===
  check("FIRE_PUNCH HP write (21406) matches §4's own citation (84551bcb11c3)", sha12(21406) === "84551bcb11c3", `got ${sha12(21406)}`);
  check("burn-proc tick (21411) identical sha to 21406 (roll invisible until the message prints)", sha12(21411) === "84551bcb11c3", `got ${sha12(21411)}`);

  // === §4 row 8: "Foe MURKROW was burned!" typing-in — dense re-bisection of
  // the "first appears between 21450 (absent) and 21465 (typing)" window. ===
  {
    const absentSha = "4417d12683c8" === sha12(21465) ? undefined : sha12(21450); // baseline read below
    const typingSha = "4417d12683c8"; // §4's own cited "typing" sha at 21465
    const firstTyping = BURN_TEXT_DENSE.find((t) => sha12(t) === typingSha);
    check(`"Foe MURKROW was burned!" typing-in: dense-bisected first tick pinned at ${firstTyping} (§4's own row only bracketed 21450-21465)`, firstTyping !== undefined, `no match for ${typingSha} found in 21445-21466; shas: ${BURN_TEXT_DENSE.map(sha12).join(",")}`);
    check("tick 21445 (before the bracket) does NOT yet show the typing sha", sha12(21445) !== typingSha, `got ${sha12(21445)}`);
  }

  // === MISSION 1: the BRN badge — exact appearance tick, bbox, blink/static,
  // and layout-shift characterization. ===
  {
    const absentSha = "b8c88efbcf21"; // §4's own cited "absent" sha at 21540
    const presentSha = "2c52a3119ee4"; // §4's own cited "present" sha at 21548
    check("tick 21535 (well before the bracket) still shows the badge-absent sha", sha12(21535) === absentSha, `got ${sha12(21535)}`);
    check("tick 21540 (§4's own cited absent tick) matches its citation", sha12(21540) === absentSha, `got ${sha12(21540)}`);
    const firstPresent = BADGE_DENSE.find((t) => sha12(t) === presentSha);
    check(`BRN badge: exact first-present tick pinned at ${firstPresent} (CLOSES ISSUES #16's named sparse-capture gap, previously only bracketed 21540-21548)`, firstPresent !== undefined, `no match for ${presentSha} found in 21535-21555; shas: ${BADGE_DENSE.map((t) => `${t}:${sha12(t)}`).join(",")}`);
    // Every tick strictly between "last absent" and "first present" must be
    // one or the other (a clean instantaneous swap, not a fade/wipe) —
    // confirms the badge draw is a single-frame blit, not an animated reveal.
    const lastAbsent = [...BADGE_DENSE].reverse().find((t) => t < (firstPresent ?? Infinity) && sha12(t) === absentSha);
    check(`badge transition is a clean single-tick swap: last-absent tick (${lastAbsent}) is exactly one tick before first-present tick (${firstPresent})`, lastAbsent !== undefined && firstPresent !== undefined && firstPresent - lastAbsent === 1, `lastAbsent=${lastAbsent} firstPresent=${firstPresent}`);
    for (const t of BADGE_DENSE) {
      const s = sha12(t);
      if (firstPresent !== undefined && t >= firstPresent) {
        check(`tick ${t} (>= first-present) shows the present sha, no third transitional state`, s === presentSha, `got ${s}`);
      } else {
        check(`tick ${t} (< first-present) shows the absent sha, no third transitional state`, s === absentSha, `got ${s}`);
      }
    }

    // Badge bbox + layout-shift check: diff the absent frame against the
    // present frame directly (bbox of changed pixels). If the healthbar
    // itself shifted/compressed, the diff bbox would include bar-region
    // pixels far from the badge; if it's purely additive, the bbox should
    // be small and localized left-of-level-number per the dossier's own
    // "small orange badge left of the level number" description.
    const beforePng = png(21540);
    const afterPng = png(21548);
    const bbox = bboxDiff(beforePng, afterPng);
    check("badge appearance produces a non-empty pixel diff between 21540 and 21548", bbox !== null, "frames identical — badge not actually rendered?");
    if (bbox) {
      const w = bbox.maxX - bbox.minX + 1;
      const h = bbox.maxY - bbox.minY + 1;
      console.log(`BRN badge bbox: x=[${bbox.minX},${bbox.maxX}] y=[${bbox.minY},${bbox.maxY}] (${w}x${h}), ${bbox.count} changed px`);
      // CORRECTS docs/turn16-notes.md §4's own "small orange badge left of
      // the level number" description: pixel evidence shows the badge is
      // NOT a new element near "Lv" — it REPLACES the "HP" icon-label glyph
      // in the SAME fixed-width box immediately left of the health bar. The
      // bar's own leftmost rendered pixel (x=52, the first green texel) is
      // bit-identical before/after, so there is NO layout shift/compression
      // of the bar itself — only the label-box interior content changes.
      const barDiff = cropDiffCount(beforePng, afterPng, 52, 29, 239, 39);
      check("healthbar region (x>=52, the bar itself) is completely unaffected by the badge swap — NO layout shift/compression", barDiff === 0, `got ${barDiff} changed px at x>=52`);
      check("badge diff bbox stays entirely within the label-icon box, left of the bar (maxX < 52)", bbox.maxX < 52, `got maxX=${bbox.maxX}`);
    }

    // Static-vs-blinking check: once shown, does the badge's own local region
    // change across a long hold (21548 -> 21714 -> 21725 -> 21773), or does
    // it stay pixel-identical while only the message-box/menu area changes?
    if (bbox) {
      const region = (t: number) => cropDiffCount(png(21548), png(t), bbox.minX, bbox.minY, bbox.maxX, bbox.maxY);
      const r21600 = region(21600);
      const r21714 = region(21714);
      const r21725 = region(21725);
      const r21773 = region(21773);
      check(`badge region is STATIC (0 diff px) across the entire hold once shown, at 21600/21714/21725/21773 (no blink)`, r21600 === 0 && r21714 === 0 && r21725 === 0 && r21773 === 0, `region-diffs vs 21548: 21600=${r21600} 21714=${r21714} 21725=${r21725} 21773=${r21773}`);
    }
  }

  // === §4 row 9 (post-badge): gCurrentMove resets, same rendered frame as 21548 ===
  check("gCurrentMove-reset tick (21553) identical sha to 21548 (2c52a3119ee4)", sha12(21553) === "2c52a3119ee4", `got ${sha12(21553)}`);

  // === §4 row 10: "Foe MURKROW is hurt by its burn!" (burn residual) ===
  check("burn-residual message (21714) matches §4's own citation (06888de6033d)", sha12(21714) === "06888de6033d", `got ${sha12(21714)}`);

  // === §4 row 11: settled "What will MAGBY do?" (turn 17), BRN badge still visible ===
  check("settled turn-17 menu (21725) matches §4's own citation (74fd1d0f11f9)", sha12(21725) === "74fd1d0f11f9", `got ${sha12(21725)}`);
  check("held through 21735, same sha", sha12(21735) === "74fd1d0f11f9", `got ${sha12(21735)}`);

  // === §4 row 12: this trace's own scripted end ===
  check("scripted end (21773) matches §4's own citation (0b1748b6c28c)", sha12(21773) === "0b1748b6c28c", `got ${sha12(21773)}`);

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
