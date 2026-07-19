# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 120 — Supervisor: **S6 → [x] (user decision — 1496 accepted/parked, ISSUES #18 policy-settled)**; healthbox-compositor branch merged (ISSUES #16 trimmed to its deferred-S7-validation stub) — **suite 593/593**; ISSUES #20 filed (FONT_NARROW gap)

- **State (verified post-merge):** `npm test` **593/593**, `npm run build`
  green, tree clean, no worktrees/branches. Sweeps re-run on the merged
  tree: fight-submenu 234/235, sendout 255/256, s6-acceptance 224/228,
  menu-idle 69/69 — unchanged, the compositor swap is pixel-neutral as
  required.
- **Did:** (1) user decided option 1 on the escalated S6 question: tick
  1496 accepted/parked permanently, ROADMAP S6 → **[x]** (commit
  17794e3), ISSUES #18 rewritten as a policy-settled attribution record
  (mirrors #5's format). (2) merged the worktree healthbox lane:
  `composeOpponentHealthbox` now drives the live send-out render (harvest
  file kept as test fixture only); two both-sides-additive
  `battleScene.ts`/test import conflicts hand-resolved, full suite run
  BEFORE the merge commit per the truncated-merge-output lesson.
  (3) ISSUES #16 trimmed to its one open debt (partial-HP/status oracle
  validation, due in S7's first HP-drain trace). (4) ISSUES #20 filed:
  FONT_NARROW was never extracted — submenu text is a battle-1-only
  harvest, blocks S8/S9 movesets (from #119's flag).
- **Next:** S7 turn execution — move confirmation (A on ROCK_SLIDE) →
  battle-script sequencing → HP-drain trace (which also validates #16's
  partial-HP path against real oracle pixels). Ground truth already
  banked: battle1-turn1.json v5 + RAM dump + §9 tick tables +
  battle-move-anim-notes. The S7 core modules (damageCalc/turnOrder/
  turnRng) are wired-ready but not yet consumed by core.ts.
- **Notes:** round 3 = 2 workers, both green first try ($4.60/11.6min +
  ~$15/47min), zero regressions. This makes 6 verified worker steps + 3
  merges today, suite 555 → 593.

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

