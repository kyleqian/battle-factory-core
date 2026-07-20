# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 135 — Bounded worker: S7 slice E1 — turn 2's FIGHT-submenu reopen through ENDEAVOR's kickoff text, `turn2-endeavor.json` **76/77** (the 1 residual is ISSUES #19's own pre-existing family, confirmed recurring, not new) — suite **659/659**

- **State:** `npm test` **659/659** (+12 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn2-endeavor.json` (exact 44-segment prefix +
  `battle1-turn2.json`'s own next 6 segments verbatim, final idle trimmed
  so the trace ends at tick 2999) **76/77**. Zero regressions at exact
  prior counts: `turn1-rockslide` 256/256, `turn1-drain` 102/102,
  `fight-submenu` 234/235, `turn1-kickoff` 81/81, `turn1-cloneanim`
  230/230.
- **Did:** FIGHT submenu reopens for turn 2 (cursor rests at slot 0,
  matching — not yet generalizing — the ground truth) with PP now dynamic
  (9/10, was static 10/10): rendered through the REAL FONT_NORMAL pipeline
  per the brief's own ask (`ppRemainingGlyphCodes` + a new `font.ts` export,
  `drawGlyphCodes`, needed for `CHAR_SPACER`'s own non-charmap glyph code),
  not a second static harvest — oracle-pixel-confirmed 0/450 mismatches,
  and `getCurrentPPToMaxPPState(9,10)` confirmed (not assumed) the color
  band stays full, no palette change. `DOWN` to DRAGON_BREATH (slot 2, PP
  20/20, its harvest already valid, 0 mismatches re-checked) → `A` confirms
  → "Foe GROVYLE used\nENDEAVOR!" prints and holds. Three real bugs found
  and fixed along the way (docs/battle-menu-notes.md §13 has the full
  derivation for each): (1) Grovyle's HP was forgotten by every render path
  except slice D's own `drawTurnEndSettledMenu` — fixed at the root via one
  new `turn1Resolved`-gated helper (`drawMenuIdleBaseWithOpponentHp`)
  threaded through every `menuIdleBase` draw site, not a per-site patch;
  (2) the submenu's own bounce overlay must inherit the RESETTLED menu's
  phase (`rockSlideResettledBounceTick`), not turn 1's own plain-`t`
  formula, which only worked for turn 1 by coincidence (its open predates
  any resettle event); (3) the post-confirm frozen bounce state and the
  kickoff-text hard-cut tick both needed their own grid-search corrections
  (mirroring `turnKickoffFrozenBounceTick`'s own established precedent),
  landing at `TURN2_KICKOFF_FROZEN_BOUNCE_TICK=2119` and a 1-tick-earlier
  `turn2KickoffTextStartTick`. ENDEAVOR's HP-diff math
  (`calculateEndeavorDamage`/`resolveEndeavorDamage`, damageCalc.ts) is
  pinned hermetically against the RAM dump (117,101→16, the 0.5x
  intermediate scale to 8, the restore back to 16) per the brief's own ask,
  independent of the (not-yet-wired) visual drain.
- **Stopped exactly at:** the kickoff text fully printed and held (tick
  2999) — the FIRST real pixel change past that point is oracle-confirmed
  at tick 3003 (ENDEAVOR's own attack animation beginning), well before the
  3128 cap. ENDEAVOR's animation, Onix's HP-bar drain (3098-3116), and the
  player healthbox's own HP-digit compositor (117/117→101/117, needs a
  player-side analogue of `composeOpponentHealthbox` — confirmed this
  session to need nothing new font-wise, just FONT_SMALL again, source-
  traced via `AddTextPrinterAndCreateWindowOnHealthbox`) are explicitly
  NOT wired this session — left for a follow-up slice, per this step's own
  fallback clause.
- **Next:** the deferred visual half (ENDEAVOR anim → HP drain → player
  healthbox digits → settled at tick ~3128) is the natural continuation;
  otherwise ISSUES #19's own anomaly family (now confirmed general, not
  turn-1-specific) or S8's faint/forced-switch slice per #133's own list.
- **Notes:** the grid-search-against-cropped-oracle-regions technique (§8's
  own convention) resolved all three bugs above without ever needing a
  fresh scratch trace — the already-committed `battle1-turn2.json` ground
  truth had every tick this session needed. No papercuts.

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

