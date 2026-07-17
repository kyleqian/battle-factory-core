# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 17 — S5 slice 1 (worker, capped): RENT/DESELECT + ball-rock RNG stream implemented and RAM-verified; pixel trace 125/139 — blocked short of 0 diff by a newly-found pre-existing rendering bug (ISSUES #5), not by anything in this slice's own code

- **State:** `npm test` **173/173** (159→173, +14 new), `npm run build`
  green. All 6 pre-existing traces re-verified 0 diff (`anchor` 1/1,
  `draft-cursor` 13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66,
  `summary-info-onix` 122/122, `summary-info-magby` 132/132) — **no
  regressions**. New `tools/compare/traces/rent-slot1.json` (dense,
  every-frame, popup-open → RENT confirm → 100-tick dwell) → **125/139
  matched, NOT 0 diff** (see Notes — acceptance criterion not met this
  session). New Tier-1 tests **are** fully green and RAM-verified:
  `tests/rentSelect.test.ts` (9 tests, state machine + renumbering) and
  `tests/ballAnim.test.ts` (5 tests, engine `rngValue` pinned against
  RAM-dumped `gRngValue` at frames 0/36/37/39/201 — includes both a
  SUCCESS and a FAILURE roll).
- **Did:** Implemented `src/engine/ballAnim.ts` (new — the
  `SpriteCB_Pokeball` idle/rock state machine + RNG roll, RAM-verified
  timings: first roll-eligibility lands 2 ticks after selection, a 17-step
  Moving cmd table matching `sAnim_Select_Pokeball_Moving` exactly, a
  32-tick rest after a successful roll, immediate reroll after a failed
  one; a `displayTile`/`pendingDisplayTile` 2-stage shift register
  reproduces an oracle-verified 2-tick render lag between the internal
  state transition and the visible tile, kept structurally separate from
  the RNG-critical internal timing). Wired RNG into `EngineState`
  (`rngValue`, seeded `ANCHOR_RNG_VALUE`, advances once/tick unconditionally
  per `main.c:366`, ball rolls consume a *second* step the same tick,
  RAM-confirmed ordering: standard tick first, roll second). Implemented
  RENT/DESELECT in `factoryDraftScreen.ts` (`applySelect`/`applyDeselect`
  pure reducers, the renumbering special case, `selectMonMessage`,
  context-sensitive row-1 label) and wired the confirm path into
  `core.ts`'s `tick()`. Found and fixed two real render bugs along the way:
  (1) the info-window message and popup label lag the palette swap by 2
  ticks (`RentConfirmRedrawState`, same redraw-scheduling pattern as
  `CursorRedrawState`); (2) `monPicRender.ts`'s `ballColor()` helper (used
  for the mon-pic window's blend target2 source) was hardcoded to the gray
  palette/tile 0 for *every* ball regardless of selection state — fixed via
  a shared `ballVisuals()`/`BallVisual` threaded into both `drawMonPic` and
  the OBJ ball loop so they can't drift apart again.
- **Next:** ISSUES #5 (a pre-existing, RENT-independent mon-pic-close
  rendering bug, confirmed via a bare `A`+`B` reproduction with zero RENT
  code involved) is what's between this trace and 0 diff — see that entry
  for the full probe log and a lead (likely an un-modeled palette-cycle/
  shimmer in `monPicBg`). A future slice should either root-cause it
  directly, or re-time `rent-slot1.json`'s RENT-confirm press to land in a
  confirmed-clean window once the periodic pattern is pinned precisely
  enough to predict one reliably (trial-and-error this session found good
  windows at ~31 and ~47+ ticks after open, but shifting into the second one
  just moved a *different* set of diffs into frames outside this trace's
  species-name-breathe budget — see Notes).
- **Supervisor addendum (same day):** verified independently (tests,
  build, 125/139 + no regressions reproduced). Both parallel-lane
  extraction branches merged on top: moves/exp/items data (19 tests) and
  the pre-battle-room scene incl. `docs/prebattle-room-notes.md`
  (11 tests, composite-verified 0/38400 px vs oracle) — `npm test` now
  **203/203**, build green, worktrees cleaned up. ROADMAP S5 marked [~]
  with slice-1 note. Next: root-cause ISSUES #5 (main lane); S6 scout
  dossier in flight on the worktree lane.
- **Notes:** **This is the "STOP and report precisely" case the brief
  anticipated**, just triggered by a different collision than the one it
  named (species-name breathe) — ISSUES #5 instead. Confirmed root-cause
  separation carefully before stopping: (1) reverted the RENT-specific
  trace to a bare `A`-open+`B`-close with no selection/RNG code touched at
  all, and it reproduces the identical diff at the identical relative
  offset — proves this is not a bug in this slice's new code; (2) all of
  this slice's *own* new behavior — palette swap, message/label redraw
  timing, the ball's idle/rock tile sequence, and the RNG stream through
  both a SUCCESS and a FAILURE roll — is independently confirmed exact via
  RAM-dumped `gRngValue` checkpoints (hermetic, unaffected by any pixel
  bug) plus the trace's own frames 58-138, which sit entirely outside every
  close-animation window and are 100% clean. The RAM-inspection recipe
  (`tools/extract/inspect-anchor.py`'s pattern, scratch script not
  committed) was essential here: a per-frame dump of `gSprites[ballId]`'s
  `data[0]`/`animEnded`/`animNum`/`animCmdIndex` alongside `gRngValue`
  turned a confusing pixel-only investigation into an exact tick-by-tick
  state trace, which is what let SETTLE_TICKS/the Moving cmd table/the
  2-stage display lag all get pinned correctly on the first real attempt.

---

## 16 — S4 slice 1 (worker, capped): summary-info-magby.json lands 0 diff — "≥2 different slots" acceptance met, no app changes needed

- **State:** `npm test` **159/159** unchanged, `npm run build` green.
  `tools/compare/traces/summary-info-magby.json` (new, 132 every-frame
  captures 45-176, menu-open through entry fade + a settled-window slice +
  full B-exit fade-out/black-hold/fade-in to the resettled draft-with-menu
  state) → **0 diff, 132/132**. `anchor` (1/1), `summary-info-onix`
  (122/122), `draft-cursor` (13/13), `draft-menu` (38/38),
  `draft-menu-slot6` (66/66) all re-verified 0 diff. **No `src/` changes
  were needed** — the existing generic renderer/state machine already
  handled MAGBY's data (name/types/gender-none/hFlip'd sprite) correctly.
- **Did:** Per the brief's method, probed MAGBY's own timing with `bin/
  oracle run` before writing the trace (did not reuse ONIX's offsets
  blind). Found the RIGHT-cursor-move (+4 settle) and menu-open (+40
  settle) timings are generic/species-independent as expected. The Info
  page's fade-settle timing is **also** generic: MAGBY's Info page goes
  sha-stable at SUMMARY-press-tick **+59**, and `B` first registers at
  **+63** — pixel-identical offsets to ONIX's already-documented ones, now
  empirically confirmed rather than assumed. The real MAGBY-specific find:
  its sha-stable window is only **6 ticks wide (+59..+64)**, not ONIX's
  ~100+, because `PokemonSummaryDoMonAnimation`'s per-species
  `sMonAnimationDelayTable`/front-sprite-bounce-and-cry (`pokemon.c:6858`)
  fires almost immediately for MAGBY (starts at +65) — this is "the mon
  idle animation" PROGRESS #15 already flagged as unscoped/undone. Built
  the trace to press `B` at exactly +63 (relative to the SUMMARY press),
  the last tick inside the stable window before that animation would
  intrude — so the committed trace never exercises those not-yet-modeled
  frames at all, by construction, not by luck.
- **Next:** S4's "≥2 different slots" acceptance criterion is now met.
  **Supervisor decision (this session): S4 slice 1 closed; the remainder
  (page nav + scroll-wipe, UP/DOWN switching, move-select, mon idle
  animation) is explicitly deferred behind S5 — recorded in ROADMAP.md's
  S4 section. Main lane proceeds to S5 (docs/rent-flow-notes.md);
  worktree lane is extracting moves/exp/items data in parallel.**
- **Notes:** Debugging template from #14 worked well again: isolated dense
  oracle probe of the new interaction first, sanity-checked pixels
  actually changed after the "trigger" input rather than trusting a
  stable-looking window. `sMonAnimationDelayTable`/`PokemonSummaryDoMonAnimation`
  (`pokemon.c:6858`, `pokemon_summary_screen.c:3994`) is the concrete
  source location for whoever picks up the idle-animation item — it's a
  per-species (`species - 1` indexed) delay-then-bounce-and-cry, gated on
  `!gPaletteFade.active`, same guard family as the input-ready-lag quirk.

---

## 15 — Supervisor wind-down: session end 2026-07-17 ~05:50

- **State (verified this minute):** `npm test` **159/159**, `npm run build`
  green, all five compare traces 0 diff (`anchor` 1/1, `draft-cursor`
  13/13, `draft-menu` 38/38, `draft-menu-slot6` 66/66 every-frame,
  `summary-info-onix` **122/122** every-frame incl. full B-exit).
  `ISSUES.md` empty. Working tree clean. ROADMAP: **S1 [x] S2 [x] S3 [x]
  S4 [~] S5-S9 [ ]** — S4's remainder: MAGBY Info-page trace (probe its
  own stable window), the 3 other pages + scroll-wipe, UP/DOWN
  mon-switching, move-select, the mon idle animation.
- **Session summary (supervised, ~01:00-05:50):** 9 worker steps + 1 merge
  lane. Landed: staged roadmap (iteration 0); S1 pixel-exact anchor +
  compare loop + extraction pipeline; S2 draft interactions frame-exact
  incl. every-frame transients; S3 RNG core + 882 rentals extracted +
  anchor RAM dump (six mons pinned to recomputed stats); S4 fade math,
  Info-page data + renderer, entry+exit fades pixel-exact; scout dossiers
  for S4 (summary-screen-notes.md) and S5 (rent-flow-notes.md). Key
  domain finds in ROADMAP notes: anchor RNG seed, ball-sprite RNG
  consumption, battle-1 opponent is an anchor constant, statics-via-nm
  recipe, fade elapsed+1 + black-hold quirks.
- **Next:** S4 remainder (start with summary-info-magby.json), then S5
  implementation off docs/rent-flow-notes.md. All prerequisites committed.
- **Notes:** Every worker ended at a green commit; no usage-limit events;
  two PAPERCUTS entries total (see file).

---
