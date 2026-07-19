# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 134 — Bounded worker: §11.1's 1px shake residual CLOSED — misdiagnosed as `drawStaticBgShiftedY`; real cause was the player healthbox's bleed-mask heuristic coincidentally matching the unshifted background — `turn1-rockslide.json` **250/256 → 256/256**; suite **649/649**

- **State:** `npm test` **649/649** (+1 Tier-1 pin), `npm run build`
  green, tree clean. `tools/compare/traces/turn1-rockslide.json`
  **256/256, 0 diff**. Full regression sweep, zero change at established
  counts: `turn1-drain` 102/102, `turn1-cloneanim` 230/230,
  `turn1-kickoff` 81/81, `fight-submenu` 234/235, `sendout` 255/256,
  `s6-acceptance` 224/228, `menu-idle` 69/69, `scene-assembly` 256/256.
- **Did:** the brief's own hypothesis (`drawStaticBgShiftedY` sampling a
  wrong tile pixel at a boundary) turned out to be a misdiagnosis —
  `staticBgPixel(173, 85)` genuinely returns `(247,247,255)`, the
  correct raw BG3 sample for that shifted map row. The real bug is one
  layer up: `drawMenuHealthboxPlayer`'s bleed mask
  (`getMenuHealthboxPlayerContentMask`) infers "background bleed" for a
  harvested rectangular pixel by comparing it against the plain,
  always-unshifted background — correct for the settled action-menu
  window it was harvested from, but this same draw call is reused inside
  the Rock Slide shake window, where BG3 genuinely scrolls. One harvested
  pixel (a white frame highlight at screen (173,92)) coincidentally
  equals the *unshifted* background's color there, so the heuristic
  always called it a hole — invisible on `0`-shift ticks (live bg is
  white there too, same coincidence), wrong on `-7`-shift ticks (live bg
  samples a different, non-white tile row). Root-cause fix, not a
  special case: the harvest's bleed set forms exactly 4 connected regions
  (sizes 8/55/260/**1**) — real bleed is a byproduct of the healthbox's
  true non-rectangular shape, so it comes in contiguous patches, never a
  lone pixel stranded inside solid content. The mask now despeckles:
  any bleed-classified pixel whose 4-neighbors are all content gets
  reclassified as content too — generalizes to the whole class of
  coincidence, leaves all genuine bleed regions and every other trace
  untouched. Full derivation + fix in docs/battle-menu-notes.md §11.1
  ("FIXED" note appended, not rewritten — the original attribution stays
  visible as the record of what was tried first and why it was wrong).
- **Next:** ISSUES #19's 99px single-row anomaly family; S7 continues
  (turn-2+ engine slices against §12-§14 ground truth); ISSUES #20
  rewire when S8 nears.
- **Notes:** the misdiagnosis cost real time — confirming
  `drawStaticBgShiftedY`'s math was innocent (dumping the tilemap/tileset
  JSON directly, cross-checking against the oracle's own PNGs pixel-by-
  pixel across the whole 8x8 tile and neighboring ticks) before finding
  the actual layer. A naive first fix attempt (compare the healthbox
  harvest against the *live* framebuffer instead of the flat background)
  made things worse, not better: same 6 failing frames but 1px→211px
  diff each, by reclassifying ~210 genuine bleed pixels as content;
  reverted in favor of the despeckle approach once connected-component
  analysis on the bleed mask made the real distinguishing signal
  (isolated vs. contiguous) obvious. No papercuts otherwise.

---

## 133 — Supervisor wind-down: session end 2026-07-19 ~16:05 — **S6 ticked [x] (user), S7 turn 1 nearly complete** (kickoff 81/81 + clone 230/230 + rockslide 250/256 + drain 102/102), FIGHT submenu playable, S7 core (damage/order/RNG) landed + twice cross-validated, ground truth through turn 14's forced switch — suite **555 → 648/648**, 18 verified worker steps

- **State (verified this minute):** `npm test` **648/648**, `npm run build`
  green, tree clean at `27473b1` + this docs commit, no worktrees, no
  unmerged branches. Committed compare traces (28): turn1-drain 102/102,
  turn1-cloneanim 230/230, turn1-kickoff 81/81, turn1-rockslide 250/256
  (6 frames = §11.1's pre-existing 1px shake-sampling bug), fight-submenu
  234/235 (ISSUES #19), sendout 255/256 + s6-acceptance 224/228 (settled
  #5/#18 attributions), all earlier traces at their long-established
  counts.
- **Session summary (supervised, ~10:15-16:05, 18 worker steps: 9 main +
  9 worktree, every one verified green before folding; 9 merges, 2
  trivial conflicts hand-resolved):** S6 closed by user decision (1496
  parked, ISSUES #18 policy-settled). S7 built from zero: hermetic core
  (damageCalc with the newly-found unconditional `+2` at
  `pokemon.c:3371`, turnOrder, turnRng) later cross-validated bit-exact
  by DRAGON_BREATH (special branch) and RAM intermediates; FIGHT submenu
  (open/nav/confirm) + turn-kickoff text + DOUBLE_TEAM clone anim + stat
  banner (real BG1 scroll, extracted) + full ROCK_SLIDE window (20-rock
  slot-allocation simulation) + HP drain/turn-end. Ground truth banked
  through turn 14: turns 2-5 ledgers, faint + Pidgeotto switch-in,
  PP-exhaustion mechanic, forced-switch SEND OUT sequence (wrong-cursor
  root cause), frame-budget analysis → user re-scoped S8 acceptance to
  multi-trace assembly (ROADMAP updated, commit 4b435d0). FONT_NARROW
  extracted + proven (ISSUES #20 → rewire-only). ISSUES #16 partial-HP
  path oracle-validated exactly (0 residual), trimmed to yellow/red
  bands + status icons.
- **Next:** (1) turn1-rockslide's §11.1 1px shake residual (250→256);
  (2) ISSUES #19's 99px single-row anomaly family; (3) S7 continues:
  turn-2+ engine slices against §12-§14 ground truth (ENDEAVOR's HP-diff
  path, DRAGON_BREATH window), then the faint/forced-switch engine
  slice; (4) ISSUES #20 rewire when S8 nears; (5) S4 remainder stays
  deferred per the recorded re-scope.
- **Notes:** no usage-limit events. Worker cost ~$6.6/step avg, 12-34
  min/step. Two user decisions this session: S6 [x] (1496 parked) and
  S8 multi-trace acceptance — both recorded in ROADMAP with rationale.

---
## 132 — Bounded worker: S7 slice D — HP drain + turn-end CLOSED, `turn1-drain.json` **102/102, 0 diff** on first attempt; closes ISSUES #16's deferred partial-HP oracle validation — suite **648/648**

- **State:** `npm test` **648/648** (+5 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn1-drain.json` (canonical 44-segment prefix,
  102 captures: dense every tick 2510-2600 + strided to 2655) **102/102,
  0 diff**. Zero regressions: turn1-rockslide 250/256, turn1-cloneanim
  230/230, turn1-kickoff 81/81, fight-submenu 234/235, sendout 255/256,
  s6-acceptance 224/228 — all re-verified unchanged.
- **Did:** implemented the whole window (`battleMenu.ts` pure fns +
  `battleScene.ts` render, docs/battle-menu-notes.md §12 has the full
  derivation) from a fresh 161-frame scratch dense capture (ticks
  2500-2660, grid-search only, not committed). Three findings: (1) the
  HP-bar drain renders with **no extra frame of render lag** (every other
  ROCK_SLIDE mechanism in this window uses a `-1` lag; this one doesn't —
  fit exact against all 15 fill-pixel-count transitions after that
  hypothesis was tried and rejected first); (2) the resettled action
  menu's idle-bounce cycle re-anchors to a **fresh** local tick
  (`MENU_IDLE_BLANK_END_TICK+1`), matched by the very first menu's own
  distinctive "1-tick blip then 9-tick dwell" opening shape recurring
  identically at the redraw tick — not a continuation of the frozen
  pre-turn absolute-tick counter; (3) the reused flat `menuIdleBase`
  harvest's two bounce regions are both on the PLAYER's (Onix, undamaged)
  side, so it stays valid for the resettled menu EXCEPT the opponent's own
  healthbox, which now needs a live per-tick overdraw
  (`opponentHealthboxContentForHp`, a small memoized cache — only 43
  distinct integer HPs ever needed) instead of the old static
  full-HP-only constant.
- **ISSUES #16 outcome:** the partial-HP half is RESOLVED, not a headline
  fix — `calcBarFilledPixels`'s existing `floor(hpFraction*48)` formula
  already agreed with real oracle pixels for all 43 HPs this trace
  exercises (0 residual, no model change). Trimmed the entry to what's
  still unvalidated: yellow/red band thresholds and every status icon
  (this seed's battle never leaves the green band or inflicts status).
- **Next:** the §11.1-named 1px `drawStaticBgShiftedY` residual (single
  stray pixel at (173,92) on `rockSlideBg3Y=-7` ticks, turn1-rockslide
  250/256→256/256) is the next small pickup; otherwise turn 2+ ground
  truth / the victory-scout lane's own next steps per #130.
- **Notes:** the grid-search-against-a-scratch-capture technique (build a
  throwaway dense trace via `bin/oracle run`, crop specific pixel regions
  with PIL to isolate one mechanism's own sha/pixel transitions from
  everything else moving on screen at the same time, rather than reading
  full-frame shas alone) resolved all three findings above in well under
  an hour combined — no papercuts.

