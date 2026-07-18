# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 70 — S6 scene-assembly slice FULLY CLOSED: last residual (trace tick 1229, player status bar) resolved with a RAM+pixel-confirmed asymmetric fix — `scene-assembly.json` **256/256** (was 255/256), 0 regressions

- **State:** `npm test` **438/438** (437→438, +1 pin replacing 1 corrected),
  `npm run build` green. `npm run compare -- tools/compare/traces/
  scene-assembly.json` → **256/256** (was 255/256) — the whole
  scene-assembly slice is now byte-exact end to end. Full 18-trace sweep
  re-run, all others at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
  67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry
  110/110, room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions.
- **Did — the brief's mandated RAM probe, then the fix:** RAM-probed
  `gSprites[5]` (player bar) and `gSprites[6]` (opponent bar — identified
  by matching each side's known settled corner against
  `docs/battle-interface-assets.md`, same method #64 banked) tick-by-tick
  across 1226-1239 (`tools/probe/ram-probe.py`, full `Sprite` struct:
  callback, `data[]`, oam fields, subpriority, flags). Found the real
  structural asymmetry the brief asked for: the player bar's `x2` STALLS
  for one extra tick right after creation — `x2=95` at BOTH RAM tick 1228
  (its own creation tick) and 1229, only resuming
  `SpriteCB_StatusSummaryBar_Enter`'s ordinary per-tick `x2 += data[0]`
  decrement at RAM tick 1230 — while the opponent bar's `x2` decrements
  every single tick starting immediately at its own creation (`-95` at
  1231, `-90` at 1232, no stall). Every other RAM field checked (callback
  pointer, `subspriteTables` pointer, subpriority, `inUse`/`invisible`
  flags, `data[1..7]`) was byte-identical in kind between the two sides —
  the stall is specifically in `x2`'s per-tick progression, not a
  visibility-flag or ordering difference. Independently pixel-ground-
  truthed the oracle's own captures (re-ran `bin/oracle run` on
  `battle1-scene-dense.json`, diffed consecutive frames in each side's
  screen region) to re-verify both first-visible ticks from scratch rather
  than trust the brief's numbers: player region is byte-identical
  background through trace tick 1229 and first changes at 1230 (22px,
  matching — hand-computed from the actual tileset asset — the bar's
  leading-tile opaque wedge at exactly `x2=95`); opponent region is
  unchanged through 1231 and first changes at 1232 (22px, same shape).
  Both match the brief's cited ticks exactly. Fix: added
  `PLAYER_BAR_VISIBLE_TICK = PLAYER_CREATE_TICK + 1`, gating ONLY the
  player bar's `visible` field in `ballStatusBarPositions` — the table
  lookup itself (and the opponent bar, and both sides' ball icons) is
  untouched, since the RAM-baked `PLAYER_BAR_X2` table already encodes the
  same stall verbatim as a literal repeated value (`[95, 95, 90, ...]`)
  and the icons' own per-icon flat-delay prefix already keeps them fully
  off-screen through this exact tick regardless (so any analogous stall
  there, if present, produces no visible pixel and needs no correction).
  This is the per-side structural fix the brief required, not a blanket
  offset — confirmed it doesn't disturb the opponent's own first-visible
  tick (1232, re-verified above) or any of the other 255 already-matching
  frames (full sweep, 0 regressions). Updated the one existing Tier-1 test
  that pinned the old (buggy) tick-1229-visible behavior, plus added a new
  pin for the corrected asymmetric gate; `battleScene.ts` module doc point
  3 and its top-of-file STATUS note rewritten with the full derivation.
- **Next:** the scene-assembly slice (S6) is fully closed — no further
  action needed there. Remaining S6/roadmap work: the send-out engine
  slice (ticks 1300-1560, `battle-scene-notes.md` §7) and player send-out
  + menu (1560-1810, `battle-menu-notes.md`) — groundwork complete, assets
  ready, per #65's plan. S7 (battle-turn engine) stays behind S6, dossier
  ready per #67/#69.
- **Notes:** PAPERCUT: none new. RAM-probe scratch output went to
  `/tmp/probe-identify*`, `/tmp/probe-deep*`, `/tmp/gt-recap/` (not
  committed, no stale-cache risk).

---

## 69 — S7 data needs closed (parallel worktree lane, merged): battle-message TEMPLATE system extracted + pixel-cross-checked, DOUBLE_TEAM evasion stage RAM-pinned, held-item damage-path inventory exhaustive

- **State:** merge of `worker/wt-20260718-151756` (base `d1072d3`, merged
  onto #68's `a515081`): `npm test` **437/437** (429+8), `npm run build`
  green, anchor 1/1 post-merge.
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `extract-battle-messages.ts` → `battle-message-templates.json`
  (365/369 `gBattleStringsTable` entries as structured segments +
  `STRINGID_USEDMOVE` + 52 `B_TXT_*` placeholders + stat-name/
  MULTISTRING sub-tables) and `extract-species-names.ts` →
  `species-names.json` (412) — a real pre-existing gap. Pixel-cross-
  checked against `battle1-turn1.json` captures at ticks 1960/2270
  (supervisor re-inspected both PNGs): "Foe GROVYLE used / DOUBLE TEAM!"
  and "ONIX used / ROCK SLIDE!" — including the "Foe " prefix the
  dossier's prose had dropped (corrected in place). +5 template tests.
  (2) `gBattleMons[1].statStages[EVASION]` flips 6→7 at tick 1959, holds
  to trace end, nothing else moves (probe spec committed, twice-run
  byte-identical) — closes dossier §8 risk 5. (3) BRIGHT_POWDER/
  LAX_INCENSE (`HOLD_EFFECT_EVASION_UP`, params 10/5) and WHITE_HERB
  (`RESTORE_STATS`) each have exactly ONE engine call site, neither in
  `CalculateBaseDamage` — EVASION_UP is accuracy-only (live for
  ROCK_SLIDE's roll vs Grovyle), line-cited in the dossier; full 70-item
  `item-hold-effects.json` extracted + pinned (+3 tests).
- **Next:** S7 stays behind S6. Remaining dossier needs: move-animation
  assets (§7 item 5), turn-end RNG cluster attribution,
  `gBattleControllerExecFlags` decoding.
- **Notes:** worktree removed, branch deleted after merge. No PAPERCUT.

---

