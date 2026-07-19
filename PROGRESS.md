# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 127 — Bounded worker: **S7 slice B COMPLETE** — banner's real BG1 scroll extracted+composited, clone-edge residual root-caused to opponent-healthbox z-order — `turn1-cloneanim.json` **168/230 → 230/230**; suite 634 → **638/638**

- **State:** `npm test` **638/638** (+4 Tier-1 pins), `npm run build` green,
  tree clean. `tools/compare/traces/turn1-cloneanim.json` **230/230 - S7
  slice B ACCEPTANCE MET.** Zero regressions: turn1-kickoff 81/81,
  fight-submenu 234/235, menu-idle 69/69, sendout 255/256, s6-acceptance
  224/228, scene-assembly 256/256 - all re-verified unchanged.
- **Did (two separate green commits, per the brief):** (1) **Gap 1's 4
  sub-pixel clone-edge ticks (2075/2082/2088/2089) CLOSED** - re-verified
  the offset table bit-exact against a fresh RAM probe first (not a fit);
  root cause was DOUBLE_TEAM's clones reaching peak excursion (41-42px)
  right where their own chin/jaw tile overlaps the OPPONENT HEALTHBOX's
  right border, and this run's clone compositor painting over that
  higher-priority UI element instead of respecting its z-order.
  `isOpponentHealthboxOpaqueAt` (`battleScene.ts`) clips the clone draw.
  (2) **Gap 2 (banner) CLOSED** - new extractor `tools/extract/
  extract-stat-anim.ts` -> `stat-anim-banner.json` (reference/pokeemerald's
  `graphics/battle_anims/stat_change/` is all plain/uncompressed dev-time
  source, no LZ77 decoder needed - same situation `extract-battle-bg.ts`'s
  header already flagged; extracted the full 8-palette/2-tilemap family,
  wired only the evasion/increase pair DOUBLE_TEAM needs); rewrote
  `drawStatsBanner` to sample the real scrolling BG1 tilemap (same alpha-
  blend shape as the intro-slide's own `drawSlideScene`) instead of a flat
  white flash. The scroll anchor needed the SAME one-tick render lag `bg1X`
  already established for BG scroll registers (NOT `statsBannerEva`'s own
  no-lag convention - a different register class) - root-caused via a
  per-tick brute-force pixel sweep (`tools/compare/scratch/
  diagnose_banner.mjs`) after a naive same-tick mapping got the mechanism
  right but not bit-exact (halved the diff, didn't zero it).
- **Next:** round 8 — slice C (ROCK_SLIDE) or slice D (drain/turn-end,
  closes #16's deferred validation) — supervisor's call. The parallel
  ground-truth scout lane (turn-2, then faint-to-victory) continues
  independently.
- **Notes:** docs/battle-menu-notes.md §10 marked COMPLETE (§10c/§10d added).
  PAPERCUT: none - both residuals were exactly as scoped by #125: gap 1 was
  a real, small, root-causeable bug (not a fit), gap 2 was genuinely new
  extraction+compositing work, no rework of the already-CLOSED clone-motion
  formula needed.

---
## 126 — Supervisor: turn-2 scout merged — DRAGON_BREATH validates damageCalc's special branch **bit-exact**; ENDEAVOR discovered as Grovyle's AI move (HP-diff mechanic documented) — battle-1 move coverage 3→5 of 8; suite **634/634**

- **State (verified post-merge):** `npm test` **634/634**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-cloneanim re-verified
  168/230 (slice-B target, #125).
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-turn2.json` (3846 frames, 221 captures, twice-run 0 mismatch) +
  `battle1-turn2-ram-dump.json` (953 rows, 4 probes re-run byte-identical)
  + `battle-turn-notes.md` §12: all 14 turn-2 Random() steps LCG-attributed
  (1 single-step at tick 3121 honestly open); DRAGON_BREATH (first special-
  split move probed) reproduced bit-exact by the +2-corrected formula
  (15 pre-spread → 13 final); ENDEAVOR's `setdamagetohealthdifference`
  path documented (typecalc scales then copyword restores — type only
  gates immunity); paralysis didn't proc this seed; falsifiable turn-3
  prediction recorded.
- **Next:** round 7 — main lane: slice-B completion (extract
  `gStatAnim_*` via a new LZ77-BG extractor, OBJ-window-clipped BG1-scroll
  compositor, + the 4 near-1px clone ticks → 230/230); worktree:
  faint-to-victory ground-truth scout (extend the script through
  Grovyle's KO + Murkrow send-out — S7 tail + S8 prep). Then slice C/D.

---
## 125 — Bounded worker: **S7 slice B convergence retry** — Gap 1 (clone motion) CLOSED via RAM probe, Gap 2 (banner) REFRAMED to a smaller source-confirmed residual — `turn1-cloneanim.json` **49/230 → 168/230**; suite 631 → **634/634**

- **State:** `npm test` **634/634** (+3 Tier-1 pins), `npm run build` green,
  tree clean. `tools/compare/traces/turn1-cloneanim.json` (unchanged, per
  the brief) now **168/230** (was 49/230) - acceptance (230/230) not yet
  met but both named gaps individually advanced per the brief's discipline.
  Zero regressions: turn1-kickoff 81/81, fight-submenu 234/235, menu-idle
  69/69, sendout 255/256, s6-acceptance 224/228 - all re-verified unchanged.
- **Did:** new probe `tools/probe/dump-doubleteam-sprites.py` (identifies
  the two clone sprites by `callback === AnimDoubleTeam`, `nm`-resolved
  since it's `static`) dumped their `data[]`/`x2` every tick 1955-2200
  directly off RAM. **Gap 1 CLOSED**: found the prior session's formula had
  two bugs, not the "non-uniform call cadence" it suspected - (a) the two
  clones are NOT a shared `+offset`/`-offset` table (C's arithmetic-shift
  truncation isn't symmetric around zero at small amplitude, RAM-proved:
  clone A `x2=0` but clone B `x2=-1` at the same tick, not `-0`) - fixed by
  simulating both clones independently (`DOUBLE_TEAM_CLONE_OFFSETS_A`/`_B`,
  `battleMenu.ts`); (b) the anchor tick was actually already correct once
  combined with fix (a) and this run's established one-tick render-lag
  convention - re-verified against the compare tool directly (clone window
  1964-2093: pervasive multi-KB diffs → 0 diff except 4 near-1px edge
  ticks). **Gap 2 REFRAMED**: tested `frame2` first as instructed - RAM
  disproves it outright (Grovyle's own sprite fields are perfectly flat the
  whole banner window). Re-read `StatsChangeAnimation_Step1-3` source
  directly and found the real mechanism: target-1 is **BG1** (not flat
  white, the prior session's 2-sample algebraic solve was a coincidence),
  loaded with a real scrolling stat-arrow tilemap/palette
  (`gStatAnim_Increase_Tilemap`/`gStatAnim_Evasion_Pal`) that
  `StatsChangeAnimation_Step3` scrolls via `gBattle_BG1_Y += tVelocity`
  (`tVelocity=3`) UNCONDITIONALLY every tick including the "flat eva/evb"
  hold - RAM-confirmed exact (`gBattle_BG1_Y`: flat 0 through 2129, then a
  clean `0,3,6,...,180` ramp 2130-2189, matching `tVelocity=3` exactly).
- **Next:** slice B is NOT done - gap 2's residual is now well-bounded but
  requires real new work (extract `gStatAnim_Evasion_Pal`/`_Tilemap`/`_Gfx`,
  new LZ77-BG extractor, wire an OBJ-window-clipped BG1-scroll compositor -
  the OBJ-window registers `StatsChangeAnimation_Step1` sets are almost
  certainly why the banner tracks Grovyle's silhouette instead of covering
  the whole screen) - materially larger than a formula fix, flagged for the
  next slice-B session rather than rushed. Gap 1's own 4-tick sub-pixel
  residual (2075/2082/2088/2089, 2-7px each) also left named, not chased
  further this session. Once gap 2 lands, re-run `npm run compare` for
  230/230. ROCK_SLIDE (slice C) and drain/turn-end (slice D) still queued
  behind this.
- **Notes:** docs/battle-menu-notes.md §10 restructured (§10a this
  session's findings, §10b prior attempt preserved for history, superseded).
  PAPERCUT: none - the RAM-probe-first discipline the brief mandated worked
  exactly as intended, turning two prior "grid search found no fit" dead
  ends into one closed formula bug + one correctly-scoped extraction task.
