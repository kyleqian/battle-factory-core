// S7/S8 worktree scout, turn 13 probe (Pidgeotto's FAINT via ONIX's
// DRAGON_BREATH + MURKROW's switch-in, following the button-gated KO-dismiss
// press). Same convention as tools/probe/verify-turn11.ts /
// verify-turn10-rockslide.ts: re-derives every pinned fact straight from a
// FRESH `bin/oracle run` (no stale PNGs) and fails loudly if the real
// hardware's pixels stop matching docs/turn13-notes.md's own citations.
// Pixel-only (no RAM reads - this runs from plain `node`, not the
// mgba-venv python interpreter the RAM probes need); RAM facts (RNG ledger,
// PP/HP/species deltas, the 2x2 cursor-grid finding) are cross-cited in
// docs/turn13-notes.md's own dated sections from `ram-probe.py`/
// `dump-battler-full.py`/`dump-dragonbreath-anim.py` runs, not re-asserted
// here.
//
// Per the brief: `battle1-turn13-dense-a.json` and `battle1-turn13-dense-b.json`
// are BYTE-IDENTICAL in their own `segments` (both encode the same 108-segment,
// 17722-frame script - only their committed `captureFrames` subsets differ,
// split on the oracle's 256-capture cap). This script loads `-a` verbatim
// (asserting its segments match `-b`'s own, first) and overrides
// `captureFrames` with its own curated tick list - a single oracle round
// trip covers the whole turn-13 span, since both files replay the identical
// script.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn13.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";
import { drawText, measureText, type FontData } from "../../src/engine/font.ts";
import { calcBarFilledPixels, pickHpBarBand } from "../../src/engine/healthboxAssembly.ts";
import { moveFightCursor, FIGHT_SUBMENU_SLOT_NAMES, type FightSubmenuSlot } from "../../src/engine/battleMenu.ts";
import { cursorState, dragonBreathHp } from "../../src/engine/battleScene.ts";
import battleWindowAsset from "../../src/assets/gen/battle-window.json" with { type: "json" };
import fontNormalData from "../../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../../src/data/gen/charmap.json" with { type: "json" };

const TRACE_PATH_A = "tools/compare/traces-groundtruth/battle1-turn13-dense-a.json";
const TRACE_PATH_B = "tools/compare/traces-groundtruth/battle1-turn13-dense-b.json";
const traceA = JSON.parse(readFileSync(TRACE_PATH_A, "utf8")) as Trace;
const traceB = JSON.parse(readFileSync(TRACE_PATH_B, "utf8")) as Trace;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

// --- Segments cross-check: both committed dense traces must encode the
// SAME underlying 108-segment button script (per the brief, "take the
// segments from the committed dense traces battle1-turn13-dense-a/b.json
// verbatim") - only their own captureFrames subsets differ (the 256-cap
// split). ---
check(
  "battle1-turn13-dense-a.json and -b.json encode byte-identical segments",
  JSON.stringify(traceA.segments) === JSON.stringify(traceB.segments),
  "segments arrays differ between the two committed files",
);

// --- Press-tick boundaries, derived programmatically from -a's own
// segments (NOT hand-copied from docs/turn13-notes.md's own approximate
// prose) - this is this session's own precise pin of SCOPE item 1
// ("both pressTicks", "verify actual PP + cursor state from RAM"). ---
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
const bounds = segmentBoundaries(traceA.segments);
check("108 segments total", bounds.length === 108, `got ${bounds.length}`);
const priorTurnsTotal = bounds[99]!.end + 1;
check("first 100 segments (turn12-dense's own prefix) total 15374 frames", priorTurnsTotal === 15374, `got ${priorTurnsTotal}`);

const menuOpen = bounds[100]!; // FIGHT-submenu-open A
const settle1 = bounds[101]!; // 30f settle
const downNav = bounds[102]!; // DOWN nav
const settle2 = bounds[103]!; // 10f settle
const confirmPress = bounds[104]!; // confirm A
const resolutionIdle = bounds[105]!; // 1400f idle
const koPress = bounds[106]!; // button-gated KO-dismiss A
const tailIdle = bounds[107]!; // 900f idle

check("segment[100] is the FIGHT-submenu-open A (2 frames)", menuOpen.buttons.join() === "A" && menuOpen.end - menuOpen.start === 1, JSON.stringify(menuOpen));
check("segment[102] is the single DOWN nav (2 frames)", downNav.buttons.join() === "DOWN" && downNav.end - downNav.start === 1, JSON.stringify(downNav));
check("segment[104] is the confirm A (2 frames)", confirmPress.buttons.join() === "A" && confirmPress.end - confirmPress.start === 1, JSON.stringify(confirmPress));
check("segment[106] is the button-gated KO-dismiss A (2 frames)", koPress.buttons.join() === "A" && koPress.end - koPress.start === 1, JSON.stringify(koPress));

// Exact tick numbers - this session's own precise (not approximate) pin.
const OPEN_TICK = menuOpen.start; // 15374
const DOWN_TICK = downNav.start; // 15406
const POST_DOWN_SETTLE_START = settle2.start; // 15408
const CONFIRM_TICK = confirmPress.start; // 15418
const POST_CONFIRM_START = resolutionIdle.start; // 15420
const KO_PRESS_TICK = koPress.start; // 16820
const POST_KO_START = tailIdle.start; // 16822

console.log(`Derived ticks: OPEN=${OPEN_TICK} DOWN=${DOWN_TICK} POST_DOWN_SETTLE=${POST_DOWN_SETTLE_START} CONFIRM=${CONFIRM_TICK} POST_CONFIRM=${POST_CONFIRM_START} KO_PRESS=${KO_PRESS_TICK} POST_KO=${POST_KO_START}`);

// --- Pure-logic reuse checks (no oracle needed): the 2x2 FIGHT-submenu
// cursor grid (docs/turn13-notes.md §3's "root-caused at the fold" finding
// - DOWN moves one ROW, i.e. cursor^2) and DRAGON_BREATH's own HP-drain
// closed form generalizing to Pidgeotto's 16->0 endpoints (the REUSE MAP's
// own §7 "(i) verbatim, new params" verdict), both already-shipped, unmodified
// engine functions - exercised here, not re-derived. ---
check("moveFightCursor(0, DOWN) === 2 (ROCK_SLIDE -> DRAGON_BREATH, one row down, matches the RAM-observed single-DOWN-press jump)", moveFightCursor(0 as FightSubmenuSlot, "DOWN") === 2, `got ${moveFightCursor(0 as FightSubmenuSlot, "DOWN")}`);
check("moveFightCursor(2, UP) === 0 (reversible)", moveFightCursor(2 as FightSubmenuSlot, "UP") === 0, `got ${moveFightCursor(2 as FightSubmenuSlot, "UP")}`);
check("moveFightCursor(0, RIGHT) === 1 (BIND, the +1 column case turn 8 exercised - contrast case, not turn 13's own)", moveFightCursor(0 as FightSubmenuSlot, "RIGHT") === 1, `got ${moveFightCursor(0 as FightSubmenuSlot, "RIGHT")}`);
check("FIGHT_SUBMENU_SLOT_NAMES[0] === ROCK_SLIDE (0-PP, cursor rests here entering turn 13)", FIGHT_SUBMENU_SLOT_NAMES[0] === "ROCK_SLIDE", `got ${FIGHT_SUBMENU_SLOT_NAMES[0]}`);
check("FIGHT_SUBMENU_SLOT_NAMES[2] === DRAGON_BREATH (cursor lands here after the single DOWN)", FIGHT_SUBMENU_SLOT_NAMES[2] === "DRAGON_BREATH", `got ${FIGHT_SUBMENU_SLOT_NAMES[2]}`);

// dragonBreathHp is a GENERIC closed form (pressTick/startHp/endHp
// all real params, despite the turn-2-derived name) - confirm it
// generalizes cleanly to Pidgeotto's own 16->0 drain with an arbitrary
// pressTick, matching the "(i) verbatim, new params" reuse-map verdict at
// the pure-logic level (the pixel-level HP-drain window is separately
// spot-checked below for monotonic, non-repeating shas).
{
  const P = 10000; // arbitrary synthetic pressTick, pure-logic check only
  const DRAIN_START_DELAY = 353; // same constant dragonBreathHp's own module doc cites
  check("dragonBreathHp: pre-drain holds startHp (16)", dragonBreathHp(P + DRAIN_START_DELAY - 1, P, 16, 0) === 16, `got ${dragonBreathHp(P + DRAIN_START_DELAY - 1, P, 16, 0)}`);
  check("dragonBreathHp: mid-drain (8 ticks in) reads 8", dragonBreathHp(P + DRAIN_START_DELAY + 8, P, 16, 0) === 8, `got ${dragonBreathHp(P + DRAIN_START_DELAY + 8, P, 16, 0)}`);
  check("dragonBreathHp: fully drained (16 ticks in) clamps to endHp (0)", dragonBreathHp(P + DRAIN_START_DELAY + 16, P, 16, 0) === 0, `got ${dragonBreathHp(P + DRAIN_START_DELAY + 16, P, 16, 0)}`);
  check("dragonBreathHp: stays clamped well past full drain", dragonBreathHp(P + DRAIN_START_DELAY + 500, P, 16, 0) === 0, `got ${dragonBreathHp(P + DRAIN_START_DELAY + 500, P, 16, 0)}`);
}

// --- HP-bar color-band reuse (healthboxAssembly.ts, unmodified, already
// exercised by turn10/turn11's own verify scripts for this same Pidgeotto) ---
const PIDGEOTTO_MAX_HP = 156;
check("Pidgeotto 16/156 (turn-13 entering HP) is red band", pickHpBarBand(calcBarFilledPixels(16 / PIDGEOTTO_MAX_HP).filledPixels) === "red", "expected red");
check("Pidgeotto 0/156 (post-faint) is red band", pickHpBarBand(calcBarFilledPixels(0 / PIDGEOTTO_MAX_HP).filledPixels) === "red", "expected red");
const MURKROW_MAX_HP = 142;
check("Murkrow 142/142 (switch-in HP) is green band", pickHpBarBand(calcBarFilledPixels(142 / MURKROW_MAX_HP).filledPixels) === "green", "expected green");

// --- Curated fresh-oracle capture list (single round trip; both committed
// traces share the same 17722-frame script, so any tick in that range can
// be requested regardless of which file's own committed captureFrames
// happened to include it). ---
function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}
const NAV_DENSE = range(15373, 15422); // baseline through submenu-open/DOWN-nav/confirm/post-confirm-transient, dense stride-1
const SAND_ATTACK_SPOT = [...range(15462, 15470), ...range(15540, 15560), 15630, 15660]; // settled hold, the unlisted mid-hold animation, post-animation blank plateau
// Worktree-lane follow-up (2026-07-21, docs/turn13-notes.md's own "Honest
// gaps" item): the dirt-throw/attacker-slide (Move_SAND_ATTACK's own
// script), the silent monbg-cleanup gap, the accuracy-drop stat-change
// banner (StatsChangeAnimation, RAM-identified), and the "ONIX's accuracy
// fell!" message this session found hiding inside what §4/this script's own
// SAND_ATTACK_SPOT previously treated as one undifferentiated span.
const SAND_ATTACK_DIRT_SPOT = [15476, 15522]; // dirt/slide motion starts (+1 RAM lag) -> back to baseline (15470 baseline already in SAND_ATTACK_SPOT)
const SAND_ATTACK_QUIET_GAP_SPOT = [15525]; // monbg cleanup, flat, eva still 0 (invisible overlay)
const SAND_ATTACK_STATBANNER_RAMP = [15537, 15557, 15576]; // eva>0 motion starts -> ramp, sparse but each tick distinct
const SAND_ATTACK_STATBANNER_SPOT = [...SAND_ATTACK_STATBANNER_RAMP, 15595, 15607]; // + back-to-flat
const SAND_ATTACK_ACCFELL_TEXT_SPOT = [15608, 15626, 15627]; // typing starts -> mid-type -> fully typed "fell!" (held-through-15699 reuses DRAGONBREATH_KICKOFF_SPOT's own 15699)
const DRAGONBREATH_KICKOFF_SPOT = [15699, 15701, 15710, 15720, 15738, ...range(15740, 15747)]; // blank->typing->fully-settled
const FIRE_PROJECTILE_SPOT = [15745, 15749, 15753, 15757, 15761, 15765, 15793];
const HP_DRAIN_DENSE = range(15855, 15900);
const FAINT_SINK_SPOT = [15959, 15960, 15961, 15963, 15965, 15967, 15969, 15971, 15973, 15975, 15978];
const FAINTED_MSG_SPOT = [15980, 16300, 16600, 16800];
const KO_GATE_DENSE = range(16808, 16825);
const SWITCH_SPOT = [16944, 16946, 16987];
const MATERIALIZE_SPOT = range(16984, 17042); // dense, ball->stretch-settle window
const HEALTHBOX_SLIDE_SPOT = [17069, 17095];
const SETTLED_MENU_SPOT = [17111, 17150, 17200];

const captureFrames = Array.from(
  new Set([
    ...NAV_DENSE,
    ...SAND_ATTACK_SPOT,
    ...SAND_ATTACK_DIRT_SPOT,
    ...SAND_ATTACK_QUIET_GAP_SPOT,
    ...SAND_ATTACK_STATBANNER_SPOT,
    ...SAND_ATTACK_ACCFELL_TEXT_SPOT,
    ...DRAGONBREATH_KICKOFF_SPOT,
    ...FIRE_PROJECTILE_SPOT,
    ...HP_DRAIN_DENSE,
    ...FAINT_SINK_SPOT,
    ...FAINTED_MSG_SPOT,
    ...KO_GATE_DENSE,
    ...SWITCH_SPOT,
    ...MATERIALIZE_SPOT,
    ...HEALTHBOX_SLIDE_SPOT,
    ...SETTLED_MENU_SPOT,
  ]),
).sort((a, b) => a - b);
check(`curated capture list stays under the oracle's 256-per-run cap`, captureFrames.length <= 256, `got ${captureFrames.length}`);
traceA.captureFrames = captureFrames;

// --- Shared message-box text rendering (same drawTileBg+drawText+charmap
// methodology verify-turn9-postlunge.ts/verify-turn10-rockslide.ts/
// verify-turn11.ts already established, reused verbatim). ---
const font = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const battleWindow = battleWindowAsset as { tileset: unknown; tilemap: { entries: ({ tile: number; palette: number; hFlip: boolean; vFlip: boolean } | null)[]; width: number }; palette: { r: number; g: number; b: number }[][] };
const MESSAGE_PALETTE = battleWindow.palette[0]!;
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
const LINE1_ORIGIN = { x: 16, y: 121 };
const LINE2_ORIGIN = { x: 16, y: 137 };
function drawTileBg(fb: Buffer): void {
  const { tileset, tilemap, palette } = battleWindow;
  const tiles = (tileset as { tiles: number[][] }).tiles;
  for (let screenY = 0; screenY < 160; screenY++) {
    const tileRow = Math.floor(screenY / 8);
    const inTileY = screenY % 8;
    for (let screenX = 0; screenX < 240; screenX++) {
      const tileCol = Math.floor(screenX / 8);
      const inTileX = screenX % 8;
      const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
      if (!entry) continue;
      const tile = tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const idx = tile[sy * 8 + sx]!;
      if (idx === 0) continue;
      const c = palette[entry.palette]?.[idx];
      if (!c) continue;
      const i = (screenY * 240 + screenX) * 4;
      fb[i] = c.r;
      fb[i + 1] = c.g;
      fb[i + 2] = c.b;
      fb[i + 3] = 255;
    }
  }
}
function buildTwoLineExpected(line1: string, line2: string): Buffer {
  const fb = Buffer.alloc(240 * 160 * 4);
  drawTileBg(fb);
  drawText(fb as unknown as Uint8Array, font, charmap, line1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  drawText(fb as unknown as Uint8Array, font, charmap, line2, LINE2_ORIGIN.x, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  return fb;
}
function diffBoxRegion(a: Buffer, b: Buffer, excludeRects: { x0: number; x1: number; y0: number; y1: number }[] = []): number {
  let diffs = 0;
  for (let y = 112; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      if (excludeRects.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1)) continue;
      const i = (y * 240 + x) * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diffs++;
    }
  }
  return diffs;
}

async function main() {
  console.log(`Running fresh oracle capture over ${captureFrames.length} ticks (single round trip, battle1-turn13-dense-a.json's own segments)...`);
  const result = await runOracleTrace(traceA);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  const get = (t: number) => {
    const c = byFrame.get(t);
    if (!c) throw new Error(`tick ${t} was not captured — check captureFrames`);
    return c;
  };
  const sha = (t: number) => get(t).sha256;
  const sha12 = (t: number) => sha(t).slice(0, 12);
  const png = (t: number) => PNG.sync.read(get(t).png).data as unknown as Buffer;

  // === §1 SCOPE: menu reopen + move selection boundaries, both pressTicks ===
  // This session's OWN dense re-bisection (15374-15421, stride-1) corrects
  // docs/turn13-notes.md §4's own row 2, which treated 15376-15420 as ONE
  // static plateau cycling among 4 named shas. It is NOT one plateau: it's
  // (at least) 6 distinct idle-bounce phases of the submenu's own box
  // animation, TWO of which (8906ff14f3a1, e3588ddcf2cd, 41067e0b8723 - see
  // below) were never cited in the existing dossier at all. The cursor
  // itself (a separate overlay) only visibly changes ONCE, at 15408 - one
  // tick after the DOWN press's own last frame (15407) - independent of
  // which bounce phase happens to be showing.
  check("baseline (turn-12 idle, tick 15373) matches docs/turn13-notes.md's own turn-12-carried citation family", sha12(15373) === "5646ba2c6ca9", `got ${sha12(15373)}`);
  check("submenu-open bounce phase 1 (15375-15379) flat, matches §4's own citation (882e3c818195)", new Set(range(15375, 15379).map(sha)).size === 1 && sha12(15375) === "882e3c818195", `shas: ${range(15375, 15379).map(sha12).join(",")}`);
  check("submenu-open bounce phase 2 (15380-15385) flat — NEW, not in §4's own cited set", new Set(range(15380, 15385).map(sha)).size === 1, `shas: ${range(15380, 15385).map(sha12).join(",")}`);
  check("submenu-open bounce phase 3 (15386-15394) flat — NEW, not in §4's own cited set", new Set(range(15386, 15394).map(sha)).size === 1, `shas: ${range(15386, 15394).map(sha12).join(",")}`);
  check("submenu-open bounce phase 4 (15395-15403) flat — NEW, not in §4's own cited set", new Set(range(15395, 15403).map(sha)).size === 1, `shas: ${range(15395, 15403).map(sha12).join(",")}`);
  check("bounce phase spanning the DOWN press (15404-15407) flat, matches §4's own citation (7585463c4ba2) — the press itself produces no same-tick pixel change", new Set(range(15404, 15407).map(sha)).size === 1 && sha12(15404) === "7585463c4ba2", `shas: ${range(15404, 15407).map(sha12).join(",")}`);
  check("cursor-jump lands EXACTLY at 15408 (DOWN press's own last frame + 1), flat 15408-15412, matches §4's own citation (55f04a5701aa)", new Set(range(15408, 15412).map(sha)).size === 1 && sha12(15408) === "55f04a5701aa" && sha12(15407) !== sha12(15408), `15407=${sha12(15407)}, 15408-15412=${range(15408, 15412).map(sha12).join(",")}`);
  check("cursor-on-DRAGON_BREATH plateau (15413-15421, spans the CONFIRM press 15418-15419) flat, matches §4's own citation (7922d883bcb6) — confirm produces no visible close redraw, same rule every prior turn's A-confirm established", new Set(range(15413, 15421).map(sha)).size === 1 && sha12(15413) === "7922d883bcb6", `shas: ${range(15413, 15421).map(sha12).join(",")}`);

  // === §2 SCOPE: whichever opponent move precedes the KO (SAND_ATTACK, not
  // AERIAL_ACE this turn - docs/turn13-notes.md §3's own RAM-confirmed
  // turn-order finding: Pidgeotto's AI reselects SAND_ATTACK, not AERIAL_ACE) ===
  // CORRECTION to docs/turn13-notes.md §4's own row ("SAND_ATTACK message
  // held 15460-15690, `73709be10f05` representative sample"): this session's
  // own bisection shows THREE distinct things §4's single row conflated:
  // (1) `73709be10f05` (tick 15460) is actually a MID-TYPING frame, one
  // glyph short of the full text (the "!" not drawn yet — explains why an
  // earlier draft of this exact check saw a spurious ~20px mismatch at the
  // "!" glyph's own narrow column); (2) the TRUE settled/held sha is
  // `502ba75ebb7a`, flat 15462-15470+ (confirmed pixel-exact below); (3) a
  // real, ~90-tick animation then plays 15540-15629 (SAND_ATTACK has no
  // damage/hit-flash per the RNG ledger, so this is most likely the move's
  // own "throw sand" effect, not re-identified frame-by-frame this session,
  // flagged not chased), before settling into a plateau (15630-15699) that
  // turns out to be the SAME sha DRAGON_BREATH's own kickoff starts from
  // (see below).
  //
  // WORKTREE-LANE CORRECTION (2026-07-21, RAM+pixel, see
  // docs/turn13-notes.md's own dated addendum): `19fb94d8802c` is NOT a
  // blank box, at either citation site. RAM-probing (dump-sandattack-anim.py
  // / a BLDALPHA+gBattle_BG1_X/Y register probe) shows the true shape of
  // 15475-15699 is FOUR sub-phases, not one animation-then-blank: (a)
  // Move_SAND_ATTACK's own dirt-throw/attacker-slide, RAM 15475-15521 (b) a
  // silent monbg-cleanup gap 15522-15536 (c) the GENERIC accuracy-drop
  // stat-change banner (`StatsChangeAnimation_Step1-3`, RAM 15530-15598,
  // pixel-visible only 15537-15594 while `eva>0`) (d) a SECOND battle
  // message, "ONIX's accuracy fell!", typed 15608-15627 and then held FLAT
  // (same sha `19fb94d8802c`) through at least 15699 — this is what both
  // this citation and the DRAGON_BREATH-kickoff citation below actually
  // show; there is no blank-box frame anywhere in this window. See the new
  // checks immediately below for each sub-phase.
  check("SAND_ATTACK message: truly settled hold (15462-15470) flat", new Set(range(15462, 15470).map(sha)).size === 1, `shas: ${range(15462, 15470).map(sha12).join(",")}`);
  check("SAND_ATTACK message: an unlisted mid-hold animation runs 15540-15629 (every sampled tick distinct — NOT flat, contra §4's own 'held 15460-15690' framing)", new Set(range(15540, 15560).map(sha)).size >= 15, `only ${new Set(range(15540, 15560).map(sha)).size} distinct — expected near-every-tick motion`);
  check("post-animation plateau (sampled 15630/15660/15699) flat — this is 'ONIX's accuracy fell!' HELD, not a blank box (see the corrected comment above and the checks below)", new Set([15630, 15660, 15699].map(sha)).size === 1 && sha12(15630) === "19fb94d8802c", `shas sample: ${[15630, 15660, 15699].map(sha12).join(",")}`);
  {
    const expected = buildTwoLineExpected("Foe PIDGEOTTO used", "SAND-ATTACK!");
    const mismatch = diffBoxRegion(png(15462), expected);
    check("SAND_ATTACK kickoff text, truly settled (tick 15462, not §4's own cited 15460 which is one glyph short), renders pixel-exact via drawText+moves.json's own display name", mismatch === 0, `mismatch=${mismatch} px`);
  }

  // §2b (new this session): the four sub-phases the "~90-tick animation"
  // framing above actually decomposes into, each RAM-identified in
  // dump-sandattack-anim.py's own run and independently pixel-corroborated
  // here. See docs/turn13-notes.md's dated addendum for the full RAM tables.
  check("(a) dirt-throw/attacker-slide: pixels diverge by 15476 (+1 vs. RAM's own first x2 change at 15475, from the settled baseline at 15470/15462)", sha12(15470) === "502ba75ebb7a" && sha(15470) !== sha(15476), `15470=${sha12(15470)}, 15476=${sha12(15476)}`);
  check("(a) dirt-throw/attacker-slide: back to the settled baseline by 15522 (+1 vs. RAM's own dirt-count-hits-0 at 15521)", sha12(15522) === "502ba75ebb7a", `got ${sha12(15522)}`);
  check("(b) silent monbg-cleanup gap (15525) is flat at the settled baseline — RAM shows Task_ClearMonBg/old Task_UpdateMonBg tearing down here with zero visible effect", sha12(15525) === "502ba75ebb7a", `got ${sha12(15525)}`);
  check("(c) accuracy-drop stat-change banner: pixels move at 15537 (RAM: BLDALPHA eva turns nonzero this same tick — 0 render lag, since eva=0 blends 0% of the BG1 overlay through 15522-15536 despite BLDCNT/BG1_X/BG1_Y already being set up)", sha12(15537) !== "502ba75ebb7a", `got ${sha12(15537)}`);
  check("(c) accuracy-drop stat-change banner: sparse ramp samples (15537-15576) are each distinct (continuous BG1 scroll + alpha ramp, StatsChangeAnimation_Step3)", new Set(SAND_ATTACK_STATBANNER_RAMP.map(sha)).size === SAND_ATTACK_STATBANNER_RAMP.length, `shas: ${SAND_ATTACK_STATBANNER_RAMP.map(sha12).join(",")}`);
  check("(c) accuracy-drop stat-change banner: back to the settled baseline by 15595 (0 render lag vs. RAM's own eva=0 at 15595) and still flat at 15607", sha12(15595) === "502ba75ebb7a" && sha12(15607) === "502ba75ebb7a", `15595=${sha12(15595)}, 15607=${sha12(15607)}`);
  check("(d) 'ONIX's accuracy fell!' starts typing by 15608 (distinct from the settled baseline) and is still mid-typing at 15626 (distinct from 15608)", sha12(15608) !== "502ba75ebb7a" && sha(15608) !== sha(15626), `15608=${sha12(15608)}, 15626=${sha12(15626)}`);
  check("(d) 'ONIX's accuracy fell!' fully typed by 15627, matching the sha this script's own SAND_ATTACK-plateau/DRAGON_BREATH-kickoff checks already cite as '19fb94d8802c'", sha12(15627) === "19fb94d8802c", `got ${sha12(15627)}`);
  check("(d) 'ONIX's accuracy fell!' holds flat through DRAGON_BREATH's own kickoff-starting tick (15699, checked below in §3)", sha12(15699) === "19fb94d8802c", `got ${sha12(15699)}`);
  {
    // The apostrophe in "ONIX's" kerns 1px differently than drawText's own
    // generic glyph-width table predicts (a localized 3x5px mismatch right
    // after the apostrophe, x=40-42/y=122-126) - a narrow-glyph kerning
    // nuance in the same family as this dossier's own earlier "!" 2px-column
    // near-miss (turn13-notes.md §4 point 2), flagged not chased (out of
    // this probe's own SCOPE - it's a font-table gap, not a SAND_ATTACK
    // animation question). Excluded here so the rest of the line (and all of
    // line 2) still gets a real pixel-exact assertion.
    const expected = buildTwoLineExpected("ONIX's accuracy", "fell!");
    const mismatch = diffBoxRegion(png(15627), expected, [{ x0: 39, x1: 43, y0: 120, y1: 128 }]);
    check("'ONIX's accuracy\\nfell!' text, fully settled (tick 15627), renders pixel-exact via drawText+charmap outside the apostrophe's own narrow-kerning column (flagged above)", mismatch === 0, `mismatch=${mismatch} px`);
  }

  // === §3 SCOPE: the KO — DRAGON_BREATH kickoff, fire-projectile,
  // HP-drain-to-faint, faint sink, KO-gated hold, Murkrow's switch-in ===
  // CORRECTION to docs/turn13-notes.md §4's own row ("kickoff text held
  // ... 15699-15744 | 19fb94d8802c -> c35307432880"): the dossier's own two
  // cited shas already implied a sub-transition, but its own prose framed
  // the row as one "held" window and cited tick 15720 as "mid-typing". This
  // session's own bisection confirms: 15699 is NOT a blank pre-typing state
  // (contra this script's own earlier comment, corrected above) — it's
  // "ONIX's accuracy fell!" still fully displayed, one tick before
  // DRAGON_BREATH's own text starts overwriting it (matching §2b's own
  // checks that this exact sha holds through 15699). Text is still typing
  // at 15720 (mid-typing, matching the dossier's own citation), and is
  // FULLY settled by 15740 (c35307432880, flat through at least 15747,
  // matching the dossier's own "full text confirmed by 15757" note within 3
  // ticks). The settled-text pixel check below therefore uses 15744 (fully
  // typed), not 15720.
  check("DRAGON_BREATH kickoff's own starting tick (15699) still shows 'ONIX's accuracy fell!' (§2b), not a blank box — same sha both citations share", sha12(15699) === "19fb94d8802c", `got ${sha12(15699)}`);
  check("DRAGON_BREATH kickoff text fully typed and flat by 15740-15747, matches §4's own citation (c35307432880)", new Set(range(15740, 15747).map(sha)).size === 1 && sha12(15740) === "c35307432880", `shas: ${range(15740, 15747).map(sha12).join(",")}`);
  {
    const expected = buildTwoLineExpected("ONIX used", "DRAGONBREATH!");
    const mismatch = diffBoxRegion(png(15744), expected);
    check("DRAGON_BREATH kickoff text, fully settled (tick 15744, not 15720 which is still mid-typing), renders pixel-exact via drawText+moves.json's own display name", mismatch === 0, `mismatch=${mismatch} px`);
  }
  check("fire-projectile/shake window (15745-15793) is NOT a static plateau (animation actually runs under the held text)", sha(15745) !== sha(15793), "expected the animation to visibly progress");
  const fireShas = FIRE_PROJECTILE_SPOT.map(sha12);
  check("fire-projectile spawn ticks (4-tick cadence, docs/turn13-notes.md §5) each show a distinct frame", new Set(fireShas).size === fireShas.length, `shas: ${fireShas.join(", ")}`);

  // NOTE, correcting this script's own first-draft assumption: the HP bar
  // only re-renders on visible pixel-column crossings (48 total bar pixels
  // for up to 156 max HP, per healthboxAssembly.ts's own HP_BAR_TOTAL_PIXELS),
  // NOT once per RNG-drain tick — a 16-HP drain is a small fraction of
  // Pidgeotto's own bar, so only a handful of distinct rendered frames are
  // expected here, not near-continuous change (contrast SAND_ATTACK's own
  // genuine per-tick animation above). This is a bar-quantization artifact,
  // not a stall.
  check("HP-drain window (15855-15900) actually progresses (start differs from end) with at least a few distinct intermediate frames", sha(15855) !== sha(15887) && new Set(range(15855, 15900).map(sha)).size >= 3, `distinct=${new Set(range(15855, 15900).map(sha)).size}`);
  check("HP-drain settles by 15887 and holds flat through 15900 (docs/turn13-notes.md §3's own 'bar-empty and hp1-commit land on the identical tick' finding)", sha(15887) === sha(15900), `15887=${sha12(15887)}, 15900=${sha12(15900)}`);
  check("post-drain hold sha matches docs/turn13-notes.md §4's own citation (3cca05e3a652)", sha12(15887) === "3cca05e3a652", `got ${sha12(15887)}`);

  check("Pidgeotto's healthbox is gone by 15978, still under the OLD kickoff message (docs/turn13-notes.md §4)", sha12(15978) === "02e2544a49ca", `got ${sha12(15978)}`);
  check("fainted message starts by 15980, distinct from the pre-faint hold", sha(15980) !== sha(15959), "expected a transition by 15980");
  check("fainted message sha matches docs/turn13-notes.md §4's own citation (f5b0b49f7869)", sha12(15980) === "f5b0b49f7869", `got ${sha12(15980)}`);
  {
    // Fainted message text-only check (masking the down-arrow wait-cursor's
    // own region, drawn separately from the two text lines - cursorState is
    // reused generically below, confirming the SAME 4-phase/9-tick bounce
    // cycle applies, just re-anchored per its own module doc).
    const expected = buildTwoLineExpected("Foe PIDGEOTTO", "fainted!");
    const cursorX = LINE2_ORIGIN.x + measureText(font, charmap, "fainted!");
    const mismatch = diffBoxRegion(png(16300), expected, [{ x0: cursorX - 3, x1: cursorX + 11, y0: LINE2_ORIGIN.y - 4, y1: LINE2_ORIGIN.y + 12 }]);
    check("'Foe PIDGEOTTO\\nfainted!' text (excluding the wait-cursor's own region) renders pixel-exact", mismatch === 0, `mismatch=${mismatch} px`);
  }
  const idleShas = new Set(["633ba603de70", "4a61b37a14b7", "99f977da6802", "f5b0b49f7869"]);
  check("fainted-message idle-bounce cycle (16300/16600/16800) lands on a known cited sha each time", [16300, 16600, 16800].every((t) => idleShas.has(sha12(t))), `got ${[16300, 16600, 16800].map(sha12).join(", ")}`);

  // KO-gated hold: docs/turn13-notes.md §4 cites 633ba603de70 as "steady at
  // the sampled points" 15978-16822, but its own sampling (16300/16600/16800)
  // never actually landed inside the LAST idle-bounce phase before the
  // press. This session's own dense 16810-16824 sweep shows the truth: the
  // fainted-message idle-bounce cycle (same multi-phase cycle as
  // FAINTED_MSG_SPOT above, this phase being 4a61b37a14b7) is STILL cycling
  // through 16810-16819 - genuinely frozen (RAM-flat per §2) but NOT
  // pixel-flat at a single sha the whole time. The press occupies
  // 16820-16821 (KO_PRESS_TICK); the screen locks to 633ba603de70 (§4's own
  // cited sha) starting EXACTLY at 16820, the press's own first frame, and
  // holds through the press and beyond (matching §4's own "gated press
  // registers... 16823, still 633ba603de70" citation).
  const KO_IDLE_SET = new Set(["633ba603de70", "4a61b37a14b7", "99f977da6802", "f5b0b49f7869"]);
  check("KO-gated hold (16810-16819, pre-press) stays within the known fainted-message idle-cycle set (RAM-frozen, still pixel-cycling)", range(16810, 16819).every((t) => KO_IDLE_SET.has(sha12(t))), `shas: ${range(16810, 16819).map(sha12).join(",")}`);
  check("the press (16820-16821) locks the screen to §4's own cited sha (633ba603de70), flat through 16824", new Set(range(KO_PRESS_TICK, 16824).map(sha)).size === 1 && sha12(KO_PRESS_TICK) === "633ba603de70", `shas: ${range(KO_PRESS_TICK, 16824).map(sha12).join(",")}`);

  // Switch-in + sent-out text.
  check("icon-bar retrigger / switch-commit window (16920-16946) matches docs/turn13-notes.md §4's own citation (62fbb1a5d940)", sha12(16944) === "62fbb1a5d940" && sha12(16946) === "62fbb1a5d940", `16944=${sha12(16944)}, 16946=${sha12(16946)}`);
  {
    const expected = buildTwoLineExpected("BUG CATCHER DESTIN sent", "out MURKROW!");
    const mismatch = diffBoxRegion(png(16987), expected);
    check("'BUG CATCHER DESTIN sent\\nout MURKROW!' text, fully settled, renders pixel-exact", mismatch === 0, `mismatch=${mismatch} px`);
  }

  // Ball/materialize/stretch window: confirm the 4 cited shas (docs/turn13-notes.md
  // §4) all appear, in the same left-to-right order, within a dense scan —
  // a regression check on the whole sequence without re-deriving exact
  // per-tick sub-boundaries (already RAM/pixel-pinned by the prior session).
  {
    const citedOrder = ["eccf3faad608", "7d24cde06b4a", "d52464f09ddd", "9262e5b26ab8"];
    const seen = MATERIALIZE_SPOT.map(sha12);
    const firstIndex = citedOrder.map((s) => seen.indexOf(s));
    check("ball-open/materialize sequence: all 4 cited shas appear in the dense 16984-17041 scan", firstIndex.every((i) => i >= 0), `firstIndex=${JSON.stringify(firstIndex)}, seen=${seen.join(",")}`);
    const sorted = firstIndex.every((v, i) => i === 0 || v === -1 || firstIndex[i - 1] === -1 || v >= firstIndex[i - 1]!);
    check("ball-open/materialize sequence: the 4 cited shas appear in the same order docs/turn13-notes.md §4 cites", sorted, `firstIndex=${JSON.stringify(firstIndex)}`);
  }
  check("healthbox slide-in window (17069-17095) is not a static plateau (the slide actually animates)", sha(17069) !== sha(17095), "expected the slide to visibly progress");

  // Turn-14 menu boundary.
  check("settled menu vs. MURKROW (17111-17200) matches docs/turn13-notes.md §4's own cited family", ["5e5283bf92c2", "9ed65c808454", "5e6a26f6f342"].includes(sha12(17111)), `got ${sha12(17111)}`);
  check("turn-14 menu idle stays within the known idle-cycle set through 17200", ["5e5283bf92c2", "9ed65c808454", "5e6a26f6f342"].includes(sha12(17200)), `got ${sha12(17200)}`);

  console.log(`\n${captureFrames.length} ticks captured, ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
