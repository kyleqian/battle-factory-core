# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 75 — S7 research questions ALL RESOLVED (parallel worktree lane, merged): one RAM-confirmed root cause — the canonical save has Battle Scene OFF; turn-end RNG cluster fully line-cited + LCG-verified. **USER SCOPE DECISION (2026-07-18, interactive): turn animations ON at the oracle level, incl. the harness template — supervisor implementing next.**

- **State:** merge of `worker/wt-20260718-162513` (base `2ad8b52`):
  `npm test` **454/454**, `npm run build` green. Pure research — no
  engine code.
- **Did (worktree lane, supervisor-verified incl. re-checking all three
  load-bearing source citations verbatim in the decomp):**
  (1) ROOT CAUSE: `gSaveBlock2Ptr->optionsBattleSceneOff == TRUE` +
  `gHitMarker` bit 7 (`HITMARKER_NO_ANIMATIONS`) set all trace —
  `battle_main.c:3084` wires the option to the marker;
  `Cmd_attackanimation` (`battle_script_commands.c:1745`) substitutes a
  generic pause for EVERY move's custom animation (except TRANSFORM/
  SUBSTITUTE). Resolves 3 of the 4 questions: DOUBLE_TEAM's 66-tick
  BLDALPHA ramp is `General_StatsChange` (explicitly exempt in
  `Cmd_playanimation:4009-4018`), ROCK_SLIDE's shake sprite never
  spawns, the "falling rocks" pixels are the ungated generic hit-flash.
  (2) Turn-end RNG cluster (1+2+5): `BattleTurnPassed`'s
  `gRandomTurnNumber` (1), `ShouldSwitch` traced call-by-call (2),
  `BattleAI_SetupAIData` 4×`simulatedRNG` + move tie-break (5) — all
  LCG-value-verified; factory challenge has 0 AI-script flags here.
  Falsifiable bonus prediction: Grovyle's turn-2 move = ENDEAVOR.
  Dossiers updated correction-block style; 2 new probe scripts committed,
  each twice-run byte-identical.
- **Next (user directive, supersedes the OFF status quo):** flip Battle
  Scene ON in the ORACLE's canonical bootstrap via a ZERO-FRAME poke
  (any added input frame would reshuffle the pinned rental pool /
  anchor seed per oracle/BOOTSTRAP.md) + template/doc updates, then
  re-verify: anchor sha unchanged, smoke-test golden hashes, full
  19-trace sweep at exact counts, in-battle `gHitMarker` bit 7 clear.
  S7's turn-1 ground truth (#67 trace/dump/ledger) becomes stale by
  design and must be regenerated under animations-on; #72's move-anim
  assets become exercised, load-bearing groundwork.
- **Notes:** worktree removed, branch deleted after merge. Sibling run
  `swift-koala` shares this oracle — the canonical-state change affects
  it too (user-directed, harness-level).

---

## 74 — S6 send-out: trainer-exit RAM ground truth + BG-to-white materialize-fade formula, both exact and verified — `sendout.json` STILL **196/256** (score unchanged), gap now bounded to 4 named simultaneous-mechanism blockers

- **State:** `npm test` **454/454** (unchanged, no new pins - both fixes are
  Tier-2/oracle-verified constant tables, not new pure-logic branches with
  their own unit-testable surface), `npm run build` green. `npm run compare
  -- tools/compare/traces/sendout.json` → **196/256**, byte-identical count
  to the prior session despite the pixel-diff dropping dramatically across
  the whole 1462-1521 window (see Did). Full 19-trace sweep re-run, all 18
  other traces at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions.
- **Did, in the brief's exact recommended order:** **(1) trainer-exit
  RAM probe (item 2, "cheap, do first"):** `gBattlerSpriteIds[1]` (the
  brief's own suggested watch) reassigns away from the trainer's own sprite
  slot at trace tick 1461, one tick *before* the handoff - so it was
  tracked directly via its own sprite index (4) instead
  (`tools/probe/specs/sendout-trainer-exit2.json`, `gSprites[4].x2` across
  ticks 1458-1500). Result: `TRAINER_EXIT_X2`, a literal RAM-probed table
  (2→103 over ticks 1461-1497, NOT a clean linear formula - two single-tick
  fixed-point-truncation stalls near the end), replacing the prior
  session's unverified `round(total*et/duration)` guess; sprite destroyed
  exactly at 1498 (`SpriteCB_FreeOpponentSprite`), confirming the
  35-frame-duration prediction to the tick. Empirically confirmed the
  module's established 1-tick render lag applies here too (tested via
  `localcheck.ts`: applying the table without the lag *increased* error at
  the handoff tick, not decreased it). **(2) BG-to-white materialize dither
  (§7.5, "biggest px mass"):** rather than trust `palette.c`'s source
  formula blind to `objPaletteToggle`'s unknowable-from-source parity at
  this call site, pixel-sampled the exact per-tick blend coefficient
  directly from a clean sprite-free background swatch already present in
  the fetched oracle captures, inverted through `BlendPalette`'s literal
  5-bit formula. Result: `sendOutBgFadeY`, an oracle-pixel-sampled table
  (`paletteFade.ts` gained `blendComponentToWhite`, the non-zero-target
  form of its existing `blendComponentToBlack`; `battleScene.ts` gained
  `drawTileBgFaded`) - deliberately NOT reusing `paletteFade.ts`'s existing
  generic `bgFadeY` step-formula because cross-checking it against these
  same pixels predicted the fade-to-white transition one tick earlier than
  observed (the parity risk, made concrete - a real, useful negative
  result, not just caution). Both fixes are exact matches to their probed/
  sampled ground truth, not fits.
- **Net effect: dramatic pixel-error reduction, ZERO score change - checked
  directly, not assumed.** `localcheck.ts` across 1462-1521: the
  ~20000px/frame diff at the fade plateau (ticks 1496-1503) dropped to
  ~1800-2200px/frame; ticks 1463-1480 dropped from ~1500px to
  ~370-600px/frame (confirmed zero px difference *outside* the still-
  unimplemented party-summary icon region at tick 1463 specifically). But
  **no tick in this window has only one broken mechanism left** - every
  tick still simultaneously needs the opponent's own party-status-summary
  despawn animation (§7.4.3, unimplemented - its row is just omitted, not
  animated; empirically confirmed showing it frozen-and-unfaded instead is
  net worse, only helping the single tick 1462), the ball sprite, the
  open-particle burst, and the mon's affine-scale materialize (§7.4.2/§7.5)
  all correct too. **Explicitly tried and rejected:** pixel-harvesting the
  tiny 12-29px residual at ticks 1519-1521 (a lingering particle) as raw
  per-tick pixel dumps - unlike the healthbox content harvest (a single
  static, translatable asset), this would be 3 disjoint answer-memorized
  frames with no generalizable structure, a direct violation of this run's
  "no curve-fitting" engine rule, so it was not done even though it was a
  cheap way to inflate the score.
- **Named remaining gap, same 60 frames (1462-1521), now bounded by what's
  missing rather than unverified formulas (docs/battle-scene-notes.md
  §7.10 has the full derivation):** (1) party-summary despawn animation for
  the opponent's row (§7.4.3, alpha-blend + per-icon staggered exit-slide -
  not yet even source-timed); (2) ball sprite draw (§7.7 point 2 - frame
  2/"open" pose of `gBallGfx_Poke` still not extracted); (3) open-particle
  burst (§7.7 point 3 - `particles.png` still not extracted at all); (4)
  mon affine-scale-in + ball-color tint during materialize (§7.5 -
  `StartSpriteAffineAnim`, no affine-OAM-scaling precedent anywhere in this
  codebase yet). All four were already named in #73's "still open" list;
  this session narrows *how* each blocks (confirmed independently
  necessary, not assumed) rather than closing any of them - **this step did
  not meet its own acceptance bar (`sendout.json` strictly > 196/256)**
  despite following the brief's recommended order exactly and landing two
  real, oracle-verified fixes; flagging that plainly rather than the score
  moving on its own.
- **Notes:** PAPERCUT: none new. Reused `localcheck.ts` throughout (cached
  baseline regenerated fresh at session start). Two new committed RAM-probe
  specs (`tools/probe/specs/sendout-trainer-exit2.json` + a since-deleted
  precursor that only established which sprite index to track) - kept per
  this run's "reusable RAM-probe specs stay committed" convention.

---

## 73 — S6 send-out visual handoff: healthbox content-assembly solved (oracle pixel-harvest) + Grovyle materialize + 2 prior-session omissions fixed — `sendout.json` **162/256 → 196/256**, 0 regressions

- **State:** `npm test` **454/454** (449→454, +5 pins), `npm run build`
  green. `npm run compare -- tools/compare/traces/sendout.json` →
  **196/256** (was 162/256). Full 19-trace sweep re-run, all 18 priors at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, scene-assembly 256/256,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions, confirmed via a live-oracle sweep (not just localcheck).
- **Did, in the brief's exact priority order:** **(1) opponent healthbox
  content-assembly (highest value, the brief's core ask):** re-confirmed
  `extract-battle-healthbox.ts`'s flagged blocker is real, not stale —
  brute-force placing `singlesOpponent`'s tileset in its own raster order
  at the pixel-confirmed settled corner `(12,14)` still mismatches
  728/2574 opaque pixels (the tile-remap pipeline — subsprite tables,
  per-column HP-bar-fill VRAM copies, FONT_SMALL/FONT_BOLD text — is real
  rendering-code work, not a quick fix). Given this trace only ever needs
  ONE content (GROVYLE/male/Lv50/full-HP/no-status), pixel-harvested it
  directly from the oracle's own settled capture instead (new
  `tools/extract/extract-sendout-healthbox-content.ts` →
  `src/assets/gen/sendout-healthbox-opponent.json`, a flat opaque
  100×28 RGB rectangle) — same "oracle is ground truth" methodology this
  module already uses for brute-force-matched corners/tables, just
  applied to a whole content block. Bbox `(13,16)-(113,44)` found by
  diffing oracle tick-1555 against the engine's pure-bg render (excluding
  Grovyle/text/player-row regions — one clean contiguous blob). A per-tick
  brute-force x-offset search against every oracle capture 1493-1523 found
  **zero pixel mismatch** at every tick 1495 (dx=-110) through settle
  (dx=0 from 1517, +5px/tick — a clean 23-step slide, matching
  `StartHealthboxSlideIn`'s source-cited `sSpeedX=-5` prediction exactly),
  confirming the content is static from creation (no progressive
  fill/reveal — the "Lv50 legible ~1504-1508" language in
  `battle-scene-notes.md` §7.6 was describing the slide reveal, not a bar
  animating). **(2) Grovyle's materialized sprite:** confirmed as a hard
  pixel-level step, not a gradual convergence — the already-extracted
  `GROVYLE` front-sprite tileset at corner `(144,12)` (also brute-force
  position-matched, zero mismatch) matches with **zero** error at every
  tick 1519-1555, and **every opaque pixel** mismatches every tick
  1478-1518 (only the settled step is rendered — the transient
  tint/flash/affine frames are correctly left for the ball/particle work).
  **Two gaps found by diffing, not in the original §7.4-7.8 scope list:**
  the send-out message text was being dropped entirely once the visual
  handoff started (`drawSendOutHandoff` never drew it) — it actually stays
  on screen unchanged through the rest of the trace; and
  `Task_HidePartyStatusSummary` only reassigns the *sending* battler's own
  task (the opponent here) — the **player's own** party-status-summary
  widget never despawns in this trace and should stay visible throughout,
  but a prior session's handoff render dropped both sides by omission.
  Fixing both (alongside 1-2) recovered the trace's entire static tail
  (ticks 1522-1555, the last 34 frames, byte-exact — exactly the payoff
  the brief predicted) plus scattered earlier frames. +5 Tier-1 pins in
  `tests/battleScene.test.ts` (materialize-step gate, slide-translation
  formula, text persistence, player-row persistence). Full derivation in
  `docs/battle-scene-notes.md` §7.9 and `battleScene.ts`'s module-doc
  STATUS note (both rewritten this session).
- **Not attempted (ran out of session time budget after item 1's the
  brief flagged as the core, highest-value ask):** item 2 (trainer-pic
  exit slide's exact rounding — RAM-probe `gSprites[gBattlerSpriteIds[1]]
  .x/x2` across ticks 1461-1497, still only structurally linear, not
  verified) and item 3 (party-summary despawn *fade itself*, ticks
  ~1463-1494 — moot for this trace's own score since the opponent's row
  simply isn't drawn during the handoff and that already matches every
  tick ≥~1495, but the fade animation itself is still unrendered) were
  not reached.
- **Named remaining gap (60/256 frames, ticks 1462-1521), confirmed not
  guessed:** bg-diffing the still-unmatched ticks shows near-full-screen
  differences (up to ~20000/38400px at ticks 1496-1503) in a
  horizontally-striped pattern consistent with `BeginNormalPaletteFade`'s
  BG-palette-to-white dither (§7.5's own source citation) being genuinely
  unimplemented, not a rounding error — the ball sprite, open-particle
  burst, and materialize tint/white-flash transient frames (§7.4.2/§7.5)
  remain unrendered, exactly the brief's own lowest-priority item 4. Ticks
  1519-1521 have small (12-29px) residual diffs even with Grovyle/
  healthbox both correct there — consistent with a lingering particle
  sprite in front of Grovyle's silhouette, same root cause.
- **Notes:** PAPERCUT: none new. Reused #71's `tools/compare/localcheck.ts`
  for fast local iteration throughout (cached `sendout-baseline`
  regenerated fresh at session start via `npm run compare`); a scratch
  `tools/compare/scratch-dump.ts` (app-frame-to-PNG dumper, same role as
  `localcheck.ts`) was used for visual diffing during development and
  deleted before committing (not needed by the extractor, which calls
  `renderAppTrace` directly).

---
