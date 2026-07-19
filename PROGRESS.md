# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 116 — Supervisor: S7 BEGUN — turn-resolution pure-logic core merged (worktree lane) — damage calc / turn order / RNG ledger hermetically pinned vs the committed RAM dump; **suite 556 → 575/575**; found+fixed a real `+2` bug in the groundwork's damage formula

- **State (verified post-merge):** `npm test` **575/575** (+19 Tier-1),
  `npm run build` green, tree clean at the merge commit, worktree/branch
  cleaned up. Trace counts unchanged from #115 (sendout 253/256,
  s6-acceptance 224/228, rest at their established counts).
- **Did (worktree lane, run parallel to #115, verified then merged):** new
  `src/engine/damageCalc.ts` (`CalculateBaseDamage` bit-exact for battle
  1's physical branches + crit/STAB/type/spread/accuracy),
  `src/engine/turnOrder.ts` (`GetWhoStrikesFirst` incl. the synthetic-only
  `Random()&1` speed-tie test), `src/engine/turnRng.ts` (the 12-step
  turn-1 ledger, reusing S3's LCG). All pinned vs
  `battle1-turn1-ram-dump.json` LCG transitions (accuracy 2310 / crit 2334
  / spread 2337, v5 ticks), `docs/battle-turn-notes.md` §10.
  **Two groundwork corrections, both supervisor-verified in source:**
  (1) `CalculateBaseDamage` ends with an unconditional `return damage+2`
  (`pokemon.c:3371`) — both prior dossier sessions missed it; the
  LCG-decoded real spread roll proves Rock Slide's pre-STAB damage is 32
  (not 30), progression 32→48→42 now exact. (2) `turn-resolution-notes.md`
  §6's Fury Cutter case had a stat typo (def56 = Grovyle's own defense;
  real defender Onix def=187) and its "crit×2" conclusion was an artifact
  of the missing +2 — corrected case pinned instead.
- **Next:** (1) main lane: ISSUES #18 remainder (1494-95 bar boundary,
  1496 particle tie-break via the named `CreateSpriteAtEnd`/`sSpriteOrder`
  source read); (2) worktree lane: scout-ahead — FIGHT-submenu/move-select
  ground truth + the flagged species-types data gap (no committed JSON has
  opponent-side species types; worker used a source-cited fixture);
  (3) then wire the S7 core into turn execution (battle-script
  sequencing, HP-drain timing, text) per battle-turn-notes.
- **Notes:** worker was hermetic as briefed (no oracle/probes); flagged
  the species-types gap instead of probing — correct call. Merge was
  conflict-free (disjoint files by design).

---
## 115 — Bounded worker: closed ISSUES #18's tick 1493 (bar composites at `eva=0`, not "skip drawing") — `sendout.json` **252/256 → 253/256**; 1494/95 (bar) + 1496 (particle tie-break) investigated with 6 fresh RAM probes, left open with concrete negative findings (no curve-fit)

- **State:** `npm test` **556/556** (+1 Tier-1), `npm run build` green, tree
  clean. Full sweep: sendout **253/256** (was 252/256), s6-acceptance
  224/228 (unchanged — its own sampled frames are 40/120/192, ISSUES #5's
  pattern, re-confirmed still exactly x88-151, + 1496, this session's own
  remaining residual; 1493 isn't one of its sampled frames), menu-throw
  78/78, menu-materialize 62/62, menu-idle 69/69, menu-text 18/18,
  scene-assembly 256/256, transition 206/206 — zero regressions.
- **Did:** pixel-classified 1493-96 first (`tools/compare/scratch/
  diag_1493.mjs`/`crop_1493.mjs`, committed): 1491/1492 already 0px (closed
  incidentally by #112/§7.30's earlier fixes, not realized until now);
  1493-95 is a clean diagonal edge, app=Grovyle's flat tint, oracle=the
  window's own faded background; 1496 is a literal 2-color swap between two
  particles. Executed §7.29's named VRAM-tile-bytes lead for 1493-95
  (`probe_grovyle_vram.py`/`probe_grovyle_palette.py`/`probe_bar_vram.py`,
  all committed): Grovyle's own tile/accumulator/y2/rotation/palette are
  ALL byte-exact vs. the static extraction across the whole window (a clean
  negative — not the bug); the bar's own tile IS byte-exact too, through
  RAM tick 1493, THEN jumps to a totally different graphic at RAM 1494
  (destroyed+reused, the exact `open.png` pattern recurring). The REAL bug
  was a compositing-model gap the VRAM read incidentally surfaced:
  `drawOpponentSummaryExit` returned early once `blend` hit 0, treating
  "no blend" as "sprite absent" — but real hardware still composites a
  `blend=0` sprite as 100% target-2 (the plain, correctly-faded background,
  hand-verified bit-exact against `SENDOUT_BG_FADE_Y`). Fixed by replacing
  the early return with `SUMMARY_EXIT_LAST_ALIVE_ELAPSED=30` (draw through
  blend=0, stop only once the RAM-confirmed sprite-reuse actually happens).
  Tried extending to render 1494 (bar's tile is STILL genuine there per the
  same VRAM probe) — empirically over-corrects (3 new wrong pixels), so
  left at exactly render 1493, not shipped wider than verified.
- **1496 (particle z-order, §7.25/7.28's long-standing gap)**: RAM-derived
  the pixel-exact tie-break winner from oracle colors (spawn index 14 must
  beat 13, opposite of this engine's current rule) and RAM-probed both
  particles' real `gSprites[]` array positions (`probe_particle_slots.py`,
  committed) to test the one cheap hypothesis (slot-reuse scrambling
  creation order) — ruled OUT (array order matches spawn-index order
  exactly, no scrambling found). Real mechanism likely lives in
  `CreateSpriteAtEnd`'s actual `sSpriteOrder` semantics, not read this
  session (out of RAM-probe budget) — named, not guessed at, in ISSUES #18
  and `docs/battle-scene-notes.md` §7.31.
- **New Tier-1 test** (`tests/battleScene.test.ts`) pins the render-1493
  fix: both newly-fixed pixels equal the faded background, plus a same-tick
  control pixel a few columns over that must STILL show Grovyle's tint.
- **Next:** ISSUES #18's remainder — 1494/95 (bar, narrower-than-modeled
  real boundary) + 1496 (particle tie-break, `sSpriteOrder`/
  `CreateSpriteAtEnd` source read needed) — both have concrete RAM findings
  recorded (§7.31), don't re-run the five clean RAM probes already done.
  S7 (turn resolution) otherwise unblocked whenever picked up.
- **Notes:** stayed within scope (`battleScene.ts`, `tests/
  battleScene.test.ts`, `docs/battle-scene-notes.md`, `ISSUES.md`,
  `PROGRESS.md`, `tools/compare/scratch/*`) per the brief. Seven new
  scratch scripts committed (3 JS pixel diagnostics + 4 Python RAM/VRAM
  probes, cited directly by §7.31's findings) since a future session
  picking up 1494/95/1496 should be able to re-run them without rebuilding
  from scratch. No PAPERCUT this session.

---
## 114 — Supervisor wind-down: session end 2026-07-19 ~06:00 — S6 chain COMPLETE and acceptance-trace-committed (`s6-acceptance.json` **224/228**, every diff attributed); `sendout.json` **214 → 252/256**; suite **477 → 555**; 15 verified worker steps across two lanes

- **State (verified this minute):** `npm test` **555/555**, `npm run
  build` green, tree clean at `b5a499e`, no worktrees, no unmerged
  branches. Trace suite (23 committed): s6-acceptance 224/228 (3 frames =
  ISSUES #5's user-settled WIN0V pattern, x88-151-verified; 1 frame =
  ISSUES #18's 3px particle z-order tick 1496), sendout 252/256 (open:
  1493-96 only, ISSUES #18), menu-text 18/18, menu-throw 78/78,
  menu-materialize 62/62, menu-idle 69/69, scene-assembly 256/256,
  transition 206/206, all draft/room/summary traces at their long-
  established counts. ROADMAP: S6 → **[~]** with recorded status (not [x]
  while #18's 4 ticks stand; RNG-exactness + opponent-pin criteria met).
- **Session summary (supervised, ~23:50-06:00, 15 worker steps + 7
  supervisor merges, every step verified green before folding):** built
  the ENTIRE player-send-out→action-menu window from zero — text print,
  Brendan throw + ball arc + first true-rotation affine sampler (ball
  spin), materialize (BG fade twin, particles, color-fade + settle
  wobble), healthbox slide-in (RAM-exact), atomic menu draw + closed-form
  idle (literal gSineTable — gbaSin is ±1 off at indices 62/63).
  Sendout climbed 214→252 via: silhouette-edge render-lag+y2 (§7.21),
  harvest-bleed mask + §7.22 re-apply (§7.23), late-window compositing
  move (§7.24), the ball's REAL 3rd frame (open.png runtime VRAM
  overwrite, §7.25), SortSprites Y-tiebreak (§7.27), OBJ-vs-OBJ blend
  target-2 hardware quirk (#112 — also closed menu-throw's 8 ticks), and
  tick 1462's twin mechanisms (§7.30). Two wrong models were falsified by
  RAM before shipping (§7.21 shared-root, §7.26 creation-order). ISSUES
  #17 opened+closed same session; #18 filed+trimmed to 1493-96.
- **Next:** (1) ISSUES #18's remainder — 1493-95 (§7.29's untested VRAM
  tile-byte lead) + 1496 (particle z-order) → then S6 → [x] (or user
  re-scope); (2) S7 begins: turn resolution (docs/battle-turn-notes.md /
  turn-resolution-notes.md groundwork exists), fold ISSUES #16's
  healthbox-assembly wiring + deferred partial-HP/status oracle
  validation into its first drain trace; menu-idle window's harvested
  base can be regenerated from the engine's own render now that the
  chain is complete (cheap cleanup, noted #110); (3) S4 remainder stays
  deferred behind S5-S8 per the recorded re-scope.
- **Notes:** no usage-limit events all session. Two battleScene.ts merge
  conflicts (both both-sides-additive, hand-resolved; one briefly
  committed with markers — caught by the immediate post-merge test run,
  amended, and PAPERCUTS-noted via the truncated-merge-output lesson).
  PAPERCUTS gained 2 entries (baseline-A/B-first; extractor drops
  grovyleFrontAnim). Worker cost ~\$7/step avg, 9-39 min/step.

---

