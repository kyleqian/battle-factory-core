# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 117 — Bounded worker: closed ISSUES #18's 1494/1495 (a one-tick `drawOpponentSummaryExit` clock stall, found empirically) — `sendout.json` **253/256 → 255/256**; 1496 read source-first per the brief (`CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`), root mechanism identified and documented, no fix shipped — it needs whole-scene persistent state this engine doesn't model, not a tweak

- **State:** `npm test` **576/576** (+1 Tier-1), `npm run build` green, tree
  clean. Full sweep vs. live oracle: sendout **255/256** (was 253/256,
  only 1496 open), s6-acceptance 224/228 (unchanged — 1494/95 aren't its
  sampled frames, only 1496 is, and 1496 didn't move), menu-throw 78/78,
  menu-materialize 62/62, menu-idle 69/69, menu-text 18/18, scene-assembly
  256/256, transition 206/206 — zero regressions.
- **Did (1496 first, source-first per the brief):** read `sprite.c`'s
  `CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`/`ResetAllSprites` in full.
  Falsified the standing assumption (ISSUES #18/§7.31): send-out particles
  use plain `CreateSprite` (`battle_anim_throw.c:1615`, via
  `PokeBallOpenParticleAnimation`), NOT `CreateSpriteAtEnd` (that allocator
  is real in this scene, but only for the summary bar's icons/healthbox).
  Real finding: `sSpriteOrder` is a PERSISTENT 64-slot permutation reset to
  identity only once (`ResetAllSprites`, battle start) and insertion-sorted
  in place every frame thereafter; on an exact tie (this residual's exact
  case) no swap fires, so two tied slots keep whatever relative order they
  inherited from the ENTIRE prior history of every sprite (any kind) that
  ever occupied those two slot numbers — not their spawn index or raw slot
  number. Resolving slots 6-vs-23's real order at tick 1496 would require
  simulating that whole-scene history as persistent state, a materially
  bigger architecture change than this engine's current stateless per-burst
  Y-sort — out of proportion to a 3px fix and exactly the regression risk
  the brief's sweep-mandate warns about. No fix shipped (a special-cased
  swap would be undocumented curve-fitting, §7.25's own already-reverted
  mistake). Full derivation with source line cites: `docs/battle-scene-
  notes.md` §7.32.
- **Did (1494/1495, with the time this freed up):** extended
  `tools/compare/scratch/diag_1493.mjs` (not rewritten) to bisect the exact
  boundary empirically. Naively extending the draw window while letting
  `elapsed` keep incrementing over-corrects exactly as §7.31 found
  (position slides 2px/tick past where the real sprite stopped). Freezing
  at `elapsed=30` closes 1494 but not 1495; resuming at `elapsed=31` closes
  1495 but not 1494 — both close together once modeled as a one-tick STALL:
  `elapsed = rawElapsed<=30 ? rawElapsed : rawElapsed-1` (render 1494 repeats
  1493's own `elapsed=30`, render 1495 resumes normal counting from there).
  Same stall family as §7.18's already-documented particle stall; plausible
  (not independently RAM-confirmed this session) shared cause is the
  RAM-confirmed slot destroy/reuse event §7.31 already found. New Tier-1
  test pins both the frozen 1494 edge and the resumed, wider 1495 edge.
- **Next:** ISSUES #18 now names only 1496, with a documented architectural
  reason a general fix doesn't fit this engine's current sprite-sort model
  — a future session should decide whether whole-scene persistent
  `sSpriteOrder` state is worth building (S6 → [x] blocker otherwise stays
  parked) or accept it per the run's no-blind-fit policy. S7 (turn
  resolution) otherwise unblocked and is probably the better next lane.
- **Notes:** stayed within scope (`battleScene.ts`, `tests/
  battleScene.test.ts`, `docs/battle-scene-notes.md`, `ISSUES.md`,
  `PROGRESS.md`, `tools/compare/scratch/diag_1493.mjs` extended). No new
  probe scripts needed — the existing five from #115/§7.31 plus source
  reading sufficed. No PAPERCUT this session.

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

