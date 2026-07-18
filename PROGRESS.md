# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 72 — S7 move-anim groundwork banked (parallel worktree lane, merged): ROCK_SLIDE assets + both turn-1 moves' script decode + oracle phase timelines — `docs/battle-move-anim-notes.md`

- **State:** merge of `worker/wt-20260718-154328` (base `1f63f82`, merged
  onto #71's `42d2258`): `npm test` **449/449** (442+7), `npm run build`
  green.
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `extract-battle-move-anim-assets.ts` (twice-run byte-identical) →
  `battle-anim-rocks.json` (rocks.png tiles/palette, the 3 frames
  `gFallingRockSpriteTemplate` uses labeled); DOUBLE_TEAM needs ZERO new
  art (clones are struct-copies of Grovyle's extracted front sprite via
  `CloneBattlerSpriteWithBlend` — changes that move's "asset" shape
  entirely). (2) `battle-move-anim-scripts.json` — decoded step lists
  for both moves (20 rock spawns; DOUBLE_TEAM's 9-cue sound schedule);
  `battle-move-anim-tables.json` — per-tick formulas (rock ellipse arc,
  shake tasks, generic hit-flash shared by every damaging move). +7 pins.
  (3) Oracle register watch + phase boundaries for both windows in new
  `docs/battle-move-anim-notes.md` (did not touch battle-anim-assets.md).
- **Open (dossier §5, honestly flagged not chased):** DOUBLE_TEAM's
  66-tick BLDALPHA envelope isn't produced by the script's own single
  `setalpha` (mechanism unidentified — the oracle envelope is the
  trustworthy number); ROCK_SLIDE's unconditional `gBattle_BG3_Y` shake
  never showed in RAM; falling-rocks visible window shorter than naive
  spawn cadence predicts.
- **Notes:** worktree removed, branch deleted after merge. No PAPERCUT.

---

## 71 — S6 send-out slice STARTED: idle-hold + A-press #3 + "sent out GROVYLE!" text cadence byte-exact — NEW `sendout.json` **162/256**; visual handoff (trainer exit/ball/particles/materialize/healthbox) not yet implemented, precisely scoped for the next session

- **State:** `npm test` **442/442** (438→442, +4 pins), `npm run build`
  green. NEW committed trace `tools/compare/traces/sendout.json` (dense,
  every tick 1300-1555, 256 captures, mirrors
  `traces-groundtruth/battle1-sendout-dense.json`'s own segments/captures
  exactly) → **162/256** via `npm run compare -- tools/compare/traces/
  sendout.json`. Full 19-trace sweep re-run (all 18 prior + this new one),
  every prior trace at its exact prior count (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
  67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry
  110/110, room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  scene-assembly 256/256, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95) — zero regressions, confirmed not just argued (the
  change surface is one new field on `BattleSceneState` and one new branch
  in `core.ts`'s existing `if (battleScene)` block, inert for every trace
  that never presses A after entering this phase - but re-run rather than
  trusted).
- **Did:** Implemented `docs/battle-scene-notes.md` §7.1-7.3 exactly
  against the dossier's own cited evidence, independently re-verified this
  session (not just trusted) by re-extracting sha256 transitions directly
  from the committed groundtruth trace's own oracle captures
  (`tools/compare/out/sendout-baseline/oracle-*.png`, fetched once via a
  baseline `npm run compare` run, then diffed locally/offline with a
  scratch python script - no repeat network calls needed): idle 9-tick
  cursor-bob cadence continues unbroken through tick 1418 exactly as the
  dossier states; screen frozen through tick 1424 (5-tick registration lag
  off the A-press at 1420, matching press #2's own lag); message-box clear
  + char-0 of "BUG CATCHER DESTIN sent" at 1425; the 4 predicted space-hold
  ticks (1428/1436/1443/1451) all land exactly; last text change at 1459;
  static through 1461; first post-text-handoff pixel change at 1462 - every
  cited tick matched with no adjustment needed. Engine changes: extended
  `BattleSceneState` with `sendOutPressElapsed: number | null` (the elapsed
  value of A-press #3 once registered, folded into the existing flat
  `elapsed`-only state per this module's "no phase enum" convention rather
  than adding one just for this - see the field's own doc comment for why);
  `core.ts` captures it directly (same "created directly, same tick already
  reflects it" idiom every other press-gated window in this codebase uses)
  gated on `sendOutPressEligible` (the idle wait-cursor must actually be
  showing); `renderBattleScene` now branches on press-tick-derived
  `sendOutTextStartTick`/`sendOutHandoffTick` to render the idle hold, then
  the new "sent out GROVYLE!" text (`sendOutTextVisibleChars`,
  `drawMessageTextLines` - generalized the existing single-string
  `drawMessageText` to take arbitrary line pairs), then hands off to
  `drawSendOutHandoff` for the visual window. Added a scratch (but
  committed, reusable) dev aid `tools/compare/localcheck.ts` - diffs the
  app engine locally against already-fetched oracle PNGs with no network
  round-trip, the same role as `ram-probe.py` but for pixel-level oracle
  ground truth instead of RAM.
- **Also started (not yet pixel-exact):** `drawSendOutHandoff` renders the
  §7.4.1 trainer-pic exit slide structurally (linear translation over the
  source-exact 35-tick duration, `TRAINER_EXIT_DELTA`/`TRAINER_EXIT_DURATION`,
  this module's established one-tick render lag) - a quick bg-diff pixel
  probe of the trainer's own right edge in the cached oracle frames showed
  roughly the expected ~3px/tick growth from tick 1463 on (matching the
  dossier's own cited lag), but with enough noise from the ball/particle
  pixels already appearing in the same crop region that the exact per-tick
  fixed-point rounding was NOT confirmed to pixel-exactness - flagged
  honestly rather than guessed-and-shipped. The ball spawn/open-frame anim
  (§7.4.2), particle burst (§7.5), materialize palette-fade/affine-scale-in
  (§7.5), party-status-summary despawn fade (§7.4.3), and opponent
  healthbox slide-in + content assembly (§7.6) are NOT rendered at all yet -
  all fully documented in the dossier and their assets already extracted
  (`battle-anim-ball-open.json`, `battle-anim-particles.json`,
  `battle-anim-tables.json`, `battle-healthbox.json`,
  `battle-opponent-front-sprites.json`), just not yet composed into this
  module. One concrete open question surfaced this session for whoever
  picks this up: the healthbox's *internal* content (name/level/HP-bar
  tile arrangement) was flagged by its own extractor
  (`extract-battle-healthbox.ts`'s header comment) as not fully solved even
  for a single static frame ("the real sprite is assembled from a HP/EXP-
  fill-level-dependent subset of each sheet's tiles in a different
  on-screen arrangement than the sheet's own raster order... a rendering-
  code concern for a later engine slice") - that later slice is this one,
  and it's real, non-trivial remaining work, not just wiring.
- **Next:** close the visual handoff (§7.4-7.6) to reach 256/256 - in
  priority order: (1) opponent healthbox internal tile-assembly + slide-in
  (§7.6, source-exact linear 23-tick slide once the content-assembly
  question above is resolved) - this is the highest-value target since the
  window settles to a STATIC composite from ~tick 1522 through the trace's
  end (1555, 34 frames) once every animation finishes, so solving healthbox
  content + Grovyle's final materialized position alone (without needing
  the transient particle/fade animations pixel-exact) would recover those
  34 frames outright; (2) trainer-pic exit slide's exact rounding (RAM-probe
  `gSprites[gBattlerSpriteIds[1]].x/x2` directly across ticks 1461-1497
  rather than the noisy bg-diff this session used); (3) party-summary
  despawn fade (§7.4.3, alpha blend + per-icon staggered exit); (4) ball
  spawn/open/particle-burst/materialize (§7.4.2/§7.5) - the hardest piece
  (radial trig motion + BlendPalette ramp), lowest priority since it's
  transient (never produces a standalone matching frame on its own - every
  frame in that sub-window also needs the trainer slide + party-summary
  fade + healthbox slide all correct simultaneously to score as a match).
- **Notes:** PAPERCUT: none new - `tools/compare/localcheck.ts` (committed)
  turned what would have been a slow per-iteration network round-trip into
  an instant local diff against one cached oracle fetch, worth keeping for
  whoever continues this slice. Scratch python analysis (sha-transition
  extraction, bg-diff edge probes) was ad hoc and not committed (same
  convention as prior sessions' `ram-probe.py` scratch use) - re-derivable
  from `tools/compare/out/sendout-baseline` if regenerated via `npm run
  compare -- tools/compare/traces/sendout.json tools/compare/out/
  sendout-baseline` (gitignored, not itself committed).

---

