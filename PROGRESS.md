# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 119 — Bounded worker: FIGHT (move-select) submenu engine slice landed — open/nav (all 4 positions)/B-close wired into core.ts, `fight-submenu.json` **234/235** (1 attributed anomaly); suite 579 → **592/592**

- **State:** `npm test` **592/592** (+13 Tier-1), `npm run build` green,
  tree clean. New trace `tools/compare/traces/fight-submenu.json`
  **234/235** (only tick 2073, a 99px row-shaped anomaly, individually
  attributed — see below). Zero regressions: menu-idle 69/69, menu-throw
  78/78, menu-text 18/18, sendout 255/256 (1496 still the only open item),
  s6-acceptance 224/228 — all unchanged.
- **Did:** `src/engine/battleMenu.ts`'s new `FightSubmenuState`
  (open/nav/close, JOY_NEW-only cursor nav with a real 1-tick display lag,
  matching §11 finding 2's empirically-confirmed no-auto-repeat) +
  `battleScene.ts`'s `drawFightSubmenuWindow` dispatcher + `core.ts` wiring
  (A opens on the settled action menu, RIGHT/LEFT/UP/DOWN nav, B closes).
  **Rendering deviates from the brief's suggestion** (glyph-rendering via
  `font-normal.json`): `B_WIN_MOVE_NAME_*`/`B_WIN_PP`/`B_WIN_MOVE_TYPE` all
  use `FONT_NARROW`, a font this codebase has never extracted (source-
  confirmed genuinely separate glyph tileset from `FONT_NORMAL`, not just
  narrower widths) — flagged as a real asset gap, sidestepped by extending
  this window's own established per-region-harvest convention (§5/§6) one
  level deeper: a static per-slot harvest (4 patches, pixel-confirmed
  byte-identical across each slot's ENTIRE dwell) composited with the
  existing, unmodified onix/healthbox bounce patches. Found and fixed a
  real 2-extra-tick-per-DMA-event drift in the bounce overlay (empirically
  pixel-fit, mechanism plausible but not RAM-confirmed — see docs/
  battle-menu-notes.md §8 for the full derivation and the grid-search that
  ruled out alternatives) and a 1-tick off-by-one in how `core.ts` stamps
  its own press-tick into new state (found via this session's own dense
  compare, unrelated to the pre-existing `sendOutPressElapsed` convention
  which stores the same value one tick earlier by an established, unfixed
  convention this session didn't touch).
- **Open item (individually attributed, not curve-fit):** tick 2073's 99px
  residual — a single row (y=111, x127-225) just below the healthbox
  bounce region's own bbox, same still-unidentified family as §11 finding
  4's own two idle-only-trace anomalies (2071/2135). Grid-searched every
  integer bounce-shift from -9 to 0; -4 is uniquely optimal at 1/66
  mismatches post-close, no better value exists. Not root-caused further
  within this session's cap.
- **Next:** move confirmation (A on a move → turn execution) is next in
  this lane, or S7 turn-execution proper (battle-script sequencing,
  HP-drain, text) per battle-turn-notes — either unblocks real turn play.
- **Notes:** stayed in scope (battleMenu.ts/battleScene.ts/core.ts +
  their tests, new extractor/asset/trace, this doc's §8, PROGRESS.md) -
  did not touch healthboxAssembly.ts/battle-turn-notes.md/ISSUES #5/#16/#18
  per the brief. No PAPERCUT this session.

---
## 118 — Supervisor: scout lane merged — species-types data gap closed (all 411 species) + FIGHT-submenu ground truth banked (§11) — **suite 579/579**; round 3 launched (FIGHT-submenu engine slice + ISSUES #16 healthbox wiring); S6-vs-1496 decision escalated to the user

- **State (verified post-merge):** `npm test` **579/579**, `npm run build`
  green, tree clean, worktrees/branches cleaned up. Traces: sendout
  255/256 (only 1496 open), s6-acceptance 224/228 (3 = ISSUES #5 pattern,
  1 = 1496), rest unchanged.
- **Did (worktree scout, verified then merged):**
  `tools/extract/extract-species-types.ts` → `src/data/gen/
  species-types.json` (all 411 species, spot-checked ONIX/GROVYLE/MURKROW/
  PIDGEOTTO/MAGBY/BAYLEEF correct; `damageCalc.test.ts` fixtures now
  consume it, pinned values unchanged). FIGHT-submenu ground truth:
  2 twice-run 0-mismatch groundtruth traces + `battle-turn-notes.md` §11
  (atomic submenu draw at tick 1892, JOY_NEW-only nav w/ 1-tick render
  lag, B-close RESUMES the 4-phase cycle in place, gRngValue flat, two
  single-tick anomalous idle frames flagged open).
- **Open question (escalated, non-blocking):** accept/park 1496 and tick
  S6 [x] (s6-acceptance 224/228 all-attributed), vs build persistent
  whole-scene `sSpriteOrder` state (§7.32 documents why a general fix
  needs it), vs leave S6 [~]. Default if unanswered: leave [~], continue
  S7.
- **Next:** verify round 3 (FIGHT-submenu engine slice vs §11;
  healthbox-assembly wiring per ISSUES #16), then S7 turn-execution
  slices (battle-script sequencing, HP-drain, text) per battle-turn-notes.

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
