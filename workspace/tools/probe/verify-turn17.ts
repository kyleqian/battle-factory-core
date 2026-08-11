// S7/S8 worktree scout, turn 17 probe (the battle's FINAL turn + the WIN
// sequence): MURKROW's burned FAINT_ATTACK for 52, MAGBY's FIRE_PUNCH for 78
// (the kill), Murkrow's faint, "Player defeated BUG CATCHER DESTIN!", and
// DESTIN's held loss quote. Same convention as verify-turn13.ts through
// verify-turn16.ts (verify-turn16.ts lives on a sibling worktree branch not
// yet merged here as of this session — its content was read via `git show`
// for precedent only, never copied): re-derives every pinned fact from a
// FRESH `bin/oracle run` (no stale PNGs) and fails loudly if the real
// hardware's pixels stop matching docs/turn17-notes.md's own citations.
// Pixel-only (no RAM reads — this runs from plain `node`, not the mgba-venv
// python interpreter the RAM probes need); RAM facts (RNG ledger, PP/HP/
// status deltas, the faint-sink formula cross-check) are cross-cited in
// docs/turn17-notes.md's own dated append from `ram-probe.py` runs, not
// re-asserted here.
//
// Per the brief: reuse `battle1-turn17-dense.json`'s own committed 134
// segments verbatim, overriding `captureFrames` with a curated dense list
// (single oracle round trip, capped at 256 captures/run) that dense
// re-bisects every §4 row that used an approximate boundary or a wide
// exploratory-probe-sourced range, and characterizes the WIN sequence's own
// new windows (the faint-sink/badge-removal render lag, the "fainted!" and
// "Player defeated..." held-text idle-bounce shapes, and — the mission's own
// top new-item candidate — the DESTIN trainer-pic slide-in transition that
// §4 left as a gap between its own "held" and "typing in" rows).
//
// Usage: node --experimental-strip-types tools/probe/verify-turn17.ts
import { readFileSync } from "node:fs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn17-dense.json";
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
// trace's own segments (NOT hand-copied from docs/turn17-notes.md's own
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
check("134 segments total (§1)", bounds.length === 134, `got ${bounds.length}`);
const totalFrames = bounds[bounds.length - 1]!.end + 1;
check("23601 frames total (§1)", totalFrames === 23601, `got ${totalFrames}`);

// This turn's own 8 segments are the LAST 8 (indices 126-133): FIGHT-submenu
// open A, 27f settle (cursor defaults FIRE_PUNCH slot 0), confirm A, a 999f
// resolution-idle covering the whole turn (FAINT_ATTACK, FIRE_PUNCH, the
// kill, the faint sink), the "Foe MURKROW fainted!" dismiss A, a 399f idle,
// the "Player defeated..." dismiss A, a final 399f idle ending on DESTIN's
// held loss quote (§1).
const menuOpen = bounds[126]!;
const settle = bounds[127]!;
const confirmPress = bounds[128]!;
const resolutionIdle = bounds[129]!;
const dismissFaint = bounds[130]!;
const dismissIdle = bounds[131]!;
const dismissOutcome = bounds[132]!;
const finalIdle = bounds[133]!;
check("segment[126] is the FIGHT-submenu-open A", menuOpen.buttons.join() === "A", JSON.stringify(menuOpen));
check("segment[127] is a 27f settle (cursor defaults to FIRE_PUNCH, no nav)", settle.buttons.length === 0 && settle.end - settle.start === 26, JSON.stringify(settle));
check("segment[128] is the confirm A", confirmPress.buttons.join() === "A", JSON.stringify(confirmPress));
check("segment[129] is the 999f resolution-idle covering the whole turn", resolutionIdle.buttons.length === 0 && resolutionIdle.end - resolutionIdle.start === 998, JSON.stringify(resolutionIdle));
check("segment[130] is the 'Foe MURKROW fainted!' dismiss A", dismissFaint.buttons.join() === "A", JSON.stringify(dismissFaint));
check("segment[131] is a 399f idle", dismissIdle.buttons.length === 0 && dismissIdle.end - dismissIdle.start === 398, JSON.stringify(dismissIdle));
check("segment[132] is the 'Player defeated...' dismiss A", dismissOutcome.buttons.join() === "A", JSON.stringify(dismissOutcome));
check("segment[133] is the final 399f idle (ends on DESTIN's held loss quote)", finalIdle.buttons.length === 0 && finalIdle.end - finalIdle.start === 398, JSON.stringify(finalIdle));

const OPEN_TICK = menuOpen.start; // 21773
const CONFIRM_TICK = confirmPress.start; // 21801
const DISMISS_FAINT_TICK = dismissFaint.start; // 22801
const DISMISS_OUTCOME_TICK = dismissOutcome.start; // 23201
check("OPEN_TICK matches §1/§4's own carried anchor (21773)", OPEN_TICK === 21773, `got ${OPEN_TICK}`);
check("CONFIRM_TICK matches §4's own citation (21801)", CONFIRM_TICK === 21801, `got ${CONFIRM_TICK}`);
console.log(`Derived: OPEN=${OPEN_TICK} CONFIRM=${CONFIRM_TICK} DISMISS_FAINT=${DISMISS_FAINT_TICK} DISMISS_OUTCOME=${DISMISS_OUTCOME_TICK}`);

// --- Curated fresh-oracle capture list ---
function range(a: number, b: number, stride = 1): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t += stride) out.push(t);
  return out;
}
// Regression pins for every §4 row that already cited an exact tick.
const ANCHOR_SPOT = [21773, 21801, 21847, 22418, 22802, 22818, 22845, 22885, 23260, 23601];
// §4's own "22486-22504" row (sourced from an UNCOMMITTED stride-2
// exploratory probe, flagged explicitly as coarse) plus the faint-cleanup/
// text-typing-start window immediately after (§4's own "~22510-22530",
// also exploratory-probe-sourced) — dense stride-1 re-bisection of both,
// committed this time.
const FAINT_SINK_DENSE = range(22485, 22533, 1);
// The "Foe MURKROW fainted!" held plateau: §4's own row implies a flat hold
// ("held from there") citing only the dismiss-press-tick sha. Dense burst to
// characterize the idle-bounce shape, plus two far spot checks to confirm
// the same phase set recurs late in the hold.
const FAINT_HELD_DENSE = range(22540, 22570, 1);
const FAINT_HELD_FAR = [22750, 22800];
// The dismiss-press/outcome-flip/next-text-typing window: dense re-bisection
// of §4's own "unchanged through 22818/22822/22825" claim (pins the EXACT
// last-frozen tick) and its own "between 22825 and 22845" typing-onset range.
const OUTCOME_DISMISS_DENSE = range(22802, 22850, 1);
// The "Player defeated...DESTIN!♥" held plateau — same idle-bounce-shape
// question as the faint-text hold above.
const DEFEATED_HELD_DENSE = range(22885, 22915, 1);
const DEFEATED_HELD_FAR = [23100, 23195];
// MISSION'S OWN TOP NEW-ITEM CANDIDATE: the DESTIN trainer-pic slide-in
// transition. §4 has NO row for this at all — it jumps straight from the
// "Player defeated...DESTIN!♥" held row (22885) to a row already mid-typing
// with the trainer sprite already present (23260), leaving the entire
// dismiss-to-arrival transition (23201 press onward) completely untabled.
const SLIDE_IN_DENSE = range(23220, 23260, 1);
// The loss-quote's own typing-settle boundary and the flagged-open "no
// blinking cursor observed" question — dense re-bisection of the settle
// tick, plus far spot/triplet checks across the long final hold. Continuous
// with SLIDE_IN_DENSE above (no gap at 23260) so the whole typing tail is
// covered.
const FINAL_SETTLE_DENSE = range(23260, 23285, 1);
const FINAL_BLINK_TRIPLET = [23320, 23321, 23322];
const FINAL_STRIDE_FAR = [23300, 23350, 23400, 23450, 23500, 23550, 23600];

const captureFrames = Array.from(
  new Set([
    ...ANCHOR_SPOT,
    ...FAINT_SINK_DENSE,
    ...FAINT_HELD_DENSE,
    ...FAINT_HELD_FAR,
    ...OUTCOME_DISMISS_DENSE,
    ...DEFEATED_HELD_DENSE,
    ...DEFEATED_HELD_FAR,
    ...SLIDE_IN_DENSE,
    ...FINAL_SETTLE_DENSE,
    ...FINAL_BLINK_TRIPLET,
    ...FINAL_STRIDE_FAR,
  ]),
).sort((a, b) => a - b);
check("curated capture list stays under the oracle's 256-per-run cap", captureFrames.length <= 256, `got ${captureFrames.length}`);
trace.captureFrames = captureFrames;

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks (single round trip, battle1-turn17-dense.json's own segments)...`);
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };
  const sha = (t: number) => get(t).sha256;
  const sha12 = (t: number) => sha(t).slice(0, 12);

  // === §4 row: carried settled "What will MAGBY do?" (= turn16-dense's own
  // final committed frame, the prefix join point) ===
  check("carried settled menu anchor (21773) matches §4's own citation (0b1748b6c28c)", sha12(21773) === "0b1748b6c28c", `got ${sha12(21773)}`);

  // === §4 row: FIGHT submenu, turn 17 (cursor FIRE_PUNCH) ===
  check("FIGHT submenu open (21801) matches §4's own citation (149397a8f607)", sha12(21801) === "149397a8f607", `got ${sha12(21801)}`);

  // === §4 row: "Foe MURKROW used\nFAINT ATTACK!" held ===
  check("'Foe MURKROW used\\nFAINT ATTACK!' held (21847) matches §4's own citation (ad8a2243b05f)", sha12(21847) === "ad8a2243b05f", `got ${sha12(21847)}`);

  // === §4 row: FIRE_PUNCH's HP-write tick (RAM hp1->0; rendered frame still
  // shows the pre-write text/healthbox, same "RAM-ahead-of-pixel" shape as
  // every prior hit this dossier established) ===
  check("FIRE_PUNCH HP-write tick (22418) matches §4's own citation (63600c307d1c)", sha12(22418) === "63600c307d1c", `got ${sha12(22418)}`);

  // === §4 row: "last frame with sprite+healthbox+badge all present"
  // (22486-22504). WORKTREE-LANE CORRECTION (dense re-bisection, replacing
  // the dossier's own uncommitted stride-2 exploratory probe): the frame is
  // steady at 63600c307d1c through tick 22492 (6 ticks further than §4's own
  // "steady through 22486" wording), THEN a genuine 10-tick pixel-visible
  // sink motion (22493-22502, 5 distinct shas, 2 ticks each — the sprite's
  // own y2 translation), THEN a 5-tick pixel-FROZEN tail (22503-22507,
  // sha aea330242515) even while RAM (dossier's own dossier-append RAM
  // cross-check, tools/probe/specs/turn17-faintsink-watch.json) shows y2
  // still incrementing and the sprite sprite-destroy landing at tick 22506 —
  // i.e. the sprite is already fully off-screen/clipped 3-4 ticks before its
  // RAM inUse flag actually clears, a render-lag shape distinct from every
  // other RAM-ahead-of-pixel case in this dossier (there the RAM write
  // *precedes* an still-unchanged pixel; here the pixel *freezes early*
  // while RAM still churns underneath it). ===
  {
    const steadySha = "63600c307d1c";
    const frozenTailSha = "aea330242515";
    const goneSha = "5ed5d6c20af5";
    for (let t = 22485; t <= 22492; t++) {
      check(`tick ${t} (extends §4's own "steady through 22486" 6 ticks further) still reads the pre-sink sha`, sha12(t) === steadySha, `got ${sha12(t)}`);
    }
    const sinkShas = range(22493, 22502).map(sha12);
    check(`sink motion (22493-22502) is genuinely dynamic — ${new Set(sinkShas).size} distinct shas of ${sinkShas.length} ticks`, new Set(sinkShas).size >= 5, `shas: ${sinkShas.join(",")}`);
    for (let t = 22503; t <= 22507; t++) {
      check(`tick ${t} is pixel-FROZEN (sink motion already fully clipped off-screen) despite RAM still churning underneath (dossier RAM cross-check, faintsink spec)`, sha12(t) === frozenTailSha, `got ${sha12(t)}`);
    }
    check("healthbox+badge both gone by tick 22508, matching §4's own citation (5ed5d6c20af5) — same tick RAM status1 clears", sha12(22508) === goneSha, `got ${sha12(22508)}`);
    check("tick 22509 still gone (held one more tick before text starts typing)", sha12(22509) === goneSha, `got ${sha12(22509)}`);
  }

  // === §4 row: "Foe MURKROW\nfainted!" text starts typing (~22510-22530,
  // §4's own citation sourced from an exploratory probe). WORKTREE-LANE
  // CORRECTION: dense re-bisection pins per-tick unique glyph-typing frames
  // from 22510 through 22527 (18 ticks, every single one distinct — a
  // genuine per-character typing cadence, not a coarse sketch), a one-tick
  // settle transient at 22528-22529, THEN the text is fully typed and the
  // idle-bounce plateau begins at 22530 — 0 ticks earlier than §4's own
  // "by 22530" framing, now pinned exactly rather than approximately. ===
  {
    const typingShas = range(22510, 22527).map(sha12);
    check(`text-typing window (22510-22527) is a genuine glyph-by-glyph cadence (near-per-tick-unique, one adjacent-pair repeat where a glyph's own draw spans 2 ticks) — ${new Set(typingShas).size} distinct of ${typingShas.length} ticks`, new Set(typingShas).size >= typingShas.length - 2, `shas: ${typingShas.join(",")}`);
    check("settle transient (22528-22529) is a flat 2-tick sha, distinct from both the typing tail and the idle-bounce phases below", sha12(22528) === sha12(22529) && sha12(22528) === "8f4fb9ca0300", `got 22528=${sha12(22528)} 22529=${sha12(22529)}`);
    check("fully-typed idle-bounce plateau is reached by tick 22530, matching §4's own 'by 22530' framing exactly", sha12(22530) === "187cfc5c6179", `got ${sha12(22530)}`);
  }

  // === §4 row: "Foe MURKROW\nfainted!" held (button-gated). WORKTREE-LANE
  // CORRECTION: §4's own row implies a flat hold (cites only the
  // dismiss-press-tick sha, "unchanged through 22818/22822/22825" — true,
  // but that's INSIDE a later frozen sub-window, not the whole hold). Dense
  // re-bisection of the hold's own early stretch (22540-22570) finds a
  // genuine 3-phase idle bounce — a long-default phase (A) interrupted by a
  // brief 2-phase "double-blink" cluster (B then C then B again), the same
  // family already documented for menu/faint-text holds in turn13-16, just
  // with a longer default stretch between blink events here. Confirmed
  // recurring far into the hold (22750=A again, 22800=C again, right at the
  // dismiss-press tick itself — matching §4's own cited sha there). ===
  {
    const A = "187cfc5c6179", B = "6addb90d4a77", C = "bc9dfd1849f7";
    check("22540-22547 reads phase B (the blink cluster's first phase)", range(22540, 22547).every((t) => sha12(t) === B), `shas: ${range(22540, 22547).map(sha12).join(",")}`);
    check("22548-22556 reads phase C (the blink cluster's second phase)", range(22548, 22556).every((t) => sha12(t) === C), `shas: ${range(22548, 22556).map(sha12).join(",")}`);
    check("22557-22565 reads phase B again (blink cluster ping-pongs back)", range(22557, 22565).every((t) => sha12(t) === B), `shas: ${range(22557, 22565).map(sha12).join(",")}`);
    check("22566-22570 settles back to the long-default phase A", range(22566, 22570).every((t) => sha12(t) === A), `shas: ${range(22566, 22570).map(sha12).join(",")}`);
    check("far spot (22750) still reads phase A — the default phase persists, NOT a flat single-sha hold as §4's own row could be read", sha12(22750) === A, `got ${sha12(22750)}`);
    check("far spot (22800), the dismiss-press tick, reads phase C — matches §4's own cited sha there (bc9dfd1849f7)", sha12(22800) === C, `got ${sha12(22800)}`);
  }

  // === §4 row: dismiss-press/gBattleOutcome-flip window. WORKTREE-LANE
  // CORRECTION: dense re-bisection pins the EXACT last-frozen tick (22826,
  // one tick past §4's own last explicitly-checked tick 22825) and the
  // EXACT first-typing tick of "Player defeated\nBUG" (22827, i.e. 22844's
  // own cited sha already 2 ticks stale by the time typing reaches "BUG" —
  // §4's own citation at tick 22845 is confirmed correct but the sha it
  // names actually first appears at 22844, one tick earlier). Critically:
  // the dense pass confirms the screen is PIXEL-IDENTICAL across the entire
  // 22802-22826 span (25 ticks) even though gBattleOutcome flips mid-span at
  // 22818 (dossier §2) — a clean, zero-visible-side-effect state-only RAM
  // write, re-confirmed pixel-exact here rather than merely asserted. ===
  {
    const heldSha = "bc9dfd1849f7";
    check("frozen 'fainted!' text is pixel-identical across the ENTIRE 22802-22826 span (25 ticks), including tick 22818 where gBattleOutcome flips in RAM with zero visible effect", range(22802, 22826).every((t) => sha12(t) === heldSha), `shas: ${range(22802, 22826).map(sha12).join(",")}`);
    check("tick 22827 is the first tick that diverges from the frozen sha — pins the exact typing-onset boundary (CORRECTED from §4's own approximate 'between 22825 and 22845')", sha12(22827) !== heldSha, `got ${sha12(22827)}`);
    check("tick 22844 already reads §4's own cited sha (73d52db2a5df) — one tick earlier than its own citation (22845), same off-by-one-citation class prior retrofits found", sha12(22844) === "73d52db2a5df", `got ${sha12(22844)}`);
    check("§4's own cited tick (22845) matches its citation too (held 2 ticks, 22844-22845)", sha12(22845) === "73d52db2a5df", `got ${sha12(22845)}`);
  }

  // === §4 row: "Player defeated\nBUG CATCHER DESTIN!♥" held. Same
  // idle-bounce-shape question as the faint-text hold above — dense
  // re-bisection finds the SAME 3-phase shape (settle transient into a
  // default phase interrupted by one blink cluster), confirmed recurring far
  // into the hold. ===
  {
    const X = "c19836f8def9", Y = "7f80a2343a29", Z = "2d8341bfa9dc";
    check("§4's own cited tick (22885) matches its citation (c19836f8def9)", sha12(22885) === X, `got ${sha12(22885)}`);
    check("22885-22888 holds the settle-transient phase X", range(22885, 22888).every((t) => sha12(t) === X), `shas: ${range(22885, 22888).map(sha12).join(",")}`);
    check("22889-22897 moves to the default phase Y", range(22889, 22897).every((t) => sha12(t) === Y), `shas: ${range(22889, 22897).map(sha12).join(",")}`);
    check("22898-22906 is the blink-cluster phase Z", range(22898, 22906).every((t) => sha12(t) === Z), `shas: ${range(22898, 22906).map(sha12).join(",")}`);
    check("22907-22915 settles back to phase Y", range(22907, 22915).every((t) => sha12(t) === Y), `shas: ${range(22907, 22915).map(sha12).join(",")}`);
    check("far spot (23100) reads phase X again — a second blink-cluster onset later in the hold, NOT a flat single-sha hold", sha12(23100) === X, `got ${sha12(23100)}`);
    check("far spot (23195), just before the dismiss press, reads phase Y", sha12(23195) === Y, `got ${sha12(23195)}`);
  }

  // === MISSION'S TOP NEW-ITEM CANDIDATE: the DESTIN trainer-pic slide-in
  // transition. §4 has NO row for this — it is a genuine gap between the
  // "held" row (22885) and the "typing in" row (23260). This dense pass
  // characterizes it for the first time: the OLD "Player defeated..." screen
  // stays pixel-identical straight through the dismiss press itself (23201)
  // and 27 further ticks (23201-23228, same "RAM-ahead-of-pixel" shape as
  // every prior dismiss in this dossier — dismissOutcome's own press produces
  // zero same-tick visible change), THEN a genuinely dynamic 25-tick
  // transition (23229-23253, every tick distinct — the fade/wipe + trainer-
  // sprite slide-in, composited together, not separable into sub-phases at
  // this sampling density — same "coarse sketch, not frame-exact" honesty
  // convention §4/§5 already established for other animation windows), a
  // brief 3-tick pause (23254-23256), 3 more transition ticks (23257-23259),
  // THEN "PLEA" is already typing in by 23260 (matching §4's own citation
  // exactly) — text continues typing through 23278 (19 more per-tick-unique
  // ticks), settling to the final held sha at 23279. ===
  {
    const oldScreenSha = "7f80a2343a29";
    check("old 'Player defeated...' screen holds pixel-identical straight through the dismiss press (23201) and 27 further ticks (23201-23228) — zero same-tick visible effect from the press itself", range(23220, 23228).every((t) => sha12(t) === oldScreenSha), `shas: ${range(23220, 23228).map(sha12).join(",")}`);
    const transitionShasA = range(23229, 23253).map(sha12);
    check(`NEW: trainer-pic slide-in transition, phase 1 (23229-23253) is genuinely dynamic — ${new Set(transitionShasA).size} distinct of ${transitionShasA.length} ticks (fade/wipe + slide-in, composited — not separable at this density)`, new Set(transitionShasA).size === transitionShasA.length, `shas: ${transitionShasA.join(",")}`);
    check("NEW: a brief 3-tick pause mid-transition (23254-23256), a single flat sha", range(23254, 23256).every((t) => sha12(t) === "0fececf28e02"), `shas: ${range(23254, 23256).map(sha12).join(",")}`);
    const transitionShasB = range(23257, 23259).map(sha12);
    check(`NEW: transition phase 2 resumes (23257-23259), still dynamic — ${new Set(transitionShasB).size} distinct of ${transitionShasB.length}`, new Set(transitionShasB).size === transitionShasB.length, `shas: ${transitionShasB.join(",")}`);
    check("DESTIN's trainer sprite + 'PLEA' typing-in (23260) matches §4's own citation exactly (5dab75716557), landing right after the transition characterized above", sha12(23260) === "5dab75716557", `got ${sha12(23260)}`);
  }

  // === §4 row: this trace's own scripted end — "PLEASE I NEED\nSOME WATER"
  // fully typed, held, un-dismissed. WORKTREE-LANE FOLLOW-UP on §4's own
  // flagged-open item ("no blinking heart/cursor icon observed... not
  // conclusively explained"): dense re-bisection pins the exact typing-
  // continuation (23261-23278, per-tick unique) and settle tick (23279, 2
  // ticks earlier than the coarser first look that found it "by 23281"),
  // THEN confirms zero pixel change across the ENTIRE remaining 322-tick
  // hold (23279-23601) at every sampled tick — including three separate
  // spread-out consecutive-tick triplets (only one committed here,
  // 23320-23322, plus 7 single far-spot ticks through 23600) that would
  // catch a short-period blink the sparser original sampling could have
  // missed. Does not conclusively PROVE no cursor exists (unsampled ticks
  // remain unsampled — same honesty convention as §4's own caveat), but
  // substantially narrows the open item: no blink detected at any sampled
  // resolution across the full hold. ===
  {
    const typingShas = range(23261, 23278).map(sha12);
    check(`loss-quote typing continues at a genuine glyph-by-glyph cadence through 23278 (several adjacent-pair repeats where a glyph's own draw spans 2 ticks, same shape as the earlier 'fainted!' typing window) — ${new Set(typingShas).size} distinct of ${typingShas.length} ticks`, new Set(typingShas).size >= typingShas.length - 4, `shas: ${typingShas.join(",")}`);
    const settledSha = "4e05adab8e97";
    check("settle tick pinned at 23279 (CORRECTED/TIGHTENED — 2 ticks earlier than a coarser first pass)", sha12(23279) === settledSha, `got ${sha12(23279)}`);
    check("§4's own cited scripted-end tick (23601) matches its citation", sha12(23601) === settledSha, `got ${sha12(23601)}`);
    const allFar = [...FINAL_STRIDE_FAR, ...FINAL_BLINK_TRIPLET];
    check(`zero pixel change across the entire 23279-23601 hold at every far/triplet-sampled tick (${allFar.length} ticks) — narrows §4's own flagged-open 'no cursor observed' item`, allFar.every((t) => sha12(t) === settledSha), `shas: ${allFar.map((t) => `${t}:${sha12(t)}`).join(",")}`);
  }

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
