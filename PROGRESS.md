# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 76 — ORACLE BOOTSTRAP v4 SHIPPED (supervisor, harness-level, user-directed): Battle Scene forced ON via zero-frame poke — anchor byte-identical, 18/19 traces hold exactly, only the send-out window's truth moved (174/256, window 1462-1543)

- **State:** harness commit `aae8b98` (+ template-revert follow-up, per
  user preference the ROADMAPs stay untouched — the oracle speaks for
  itself). Oracle service restarted on v4 (`bin/oracle info` → version 4,
  canonical sha unchanged `9c89c741…`). Smoke test green (version pin
  bumped in lockstep). This run: `npm test` 454/454, build green.
- **Did:** single poke in the bootstrap's previously-unused `pokes` field
  (applied after all 6910 scripted frames, before settle — ZERO frames
  added, RNG stream untouched): `gSaveBlock2Ptr`(deref)+0x15: `0x07→0x03`,
  clearing only `optionsBattleSceneOff` (u16 bit 10). Fixed a latent
  harness bug blocking all pokes (`emerald_core.write_u8` used libmgba-py's
  broken `__setitem__` sugar → now `raw_write`). Full verification chain:
  probe shows bit=0 + anchor sha byte-identical; smoke-test golden hashes
  pass; battle1-turn1 replay vs v3 truth: all pre-battle captures
  identical, first divergence tick 1968, 172/223 differ — animations
  visually confirmed (DOUBLE_TEAM afterimage on screen). Full 19-trace
  sweep: 18 at exact prior counts; `sendout.json` 196→**174/256** with ONE
  contiguous mismatch window **1462-1543** (was 1462-1521) — mechanism
  source-identified: `SpriteCB_OpponentMonFromBall`→`BattleAnimateFrontSprite`
  no longer passes `SKIP_FRONT_ANIM` (`battle_main.c:2837`,
  `pokemon.c:6888`), so the mon front-sprite entrance animation now plays
  post-materialize; settled tail 1544-1555 unchanged.
- **Stale-by-design inventory (v3-truth artifacts to regenerate):**
  `battle1-sendout-dense.json` (1462+), `battle1-turn1.json` + its RAM
  dump + battle-turn-notes.md battle-window tables (first action menu
  itself lands later — player send-out front anim), battle-move-anim-notes
  §4-6 timelines (its Battle-Scene-OFF root-cause finding is historical
  truth of v3; its asset/decode work is now exercised). Two lane briefs
  for exactly this split are DRAFTED but NOT LAUNCHED — the user asked to
  hold new workers (2026-07-18 ~17:45); briefs live in the supervisor
  scratchpad (brief-sendout-v4.txt, brief-s7-v4-regen.txt) and their
  content is re-derivable from this entry alone.
- **Notes:** sibling run `swift-koala` shares this oracle and inherits v4
  (user-directed harness change). `docs/battle-turn-notes.md`/`battle-
  move-anim-notes.md` §-references above are the regen worker's map.

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
