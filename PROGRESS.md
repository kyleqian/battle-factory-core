# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 704 — [BOUNDED MAIN WORKER 2026-07-29 ~16:05] Battle-command seam Slice 6 Part B field-art route landed; breadth trace honestly open

- **State:** implementation `216a7fab`; tree green at **518 files / 5254
  tests + 1 deliberate animation-lane skip**, production build, required
  targeted acceptance **148/148**, and `git diff --check`.
- **Did:** the typed command render view now resolves both active battlers'
  complete front/back art, palettes, source pic coordinates, and resting
  origins from live species IDs through the banked 376-species catalogs.
  Canonical Battle 2 consumes that same resolver pixel-neutrally. Added the
  app-visible `battle-command-generated-off` stage: the live generated
  orchestrator reaches a settled GRANBULL-vs-ARON action/FIGHT field with
  live healthboxes/moves and advances through the ordinary request reducer.
- **Next:** the explicit-OFF breadth proof remains **open (0/128 claimed; no
  trace committed)**. The required final legal A-confirm immediately drives
  the generated logical kernel/trainer and publishes the next player request,
  while the ROM holds the confirmed FIGHT field through its Scene-OFF
  action-resolution presentation. That typed resolution/next-command handoff
  belongs to design §5's send-out/action-resolution lifecycle work; do not
  hide it with a screenshot, delayed tick branch, or thinned capture window.
- **Notes:** all fourteen immutable windows exact: Battle 2 **209/209**,
  FIGHT **235/235**, reopen **90/90**; turns 3–13 **254/254, 44/44, 42/42,
  44/44, 93/93, 88/88, 111/111, 83/83, 56/56, 46/46, 57/57**. No canonical
  import, unsupported barrier, capture removal, battle/turn/absolute-tick
  selector, damage/RNG/turn-order, party selector, or animation change.
  PAPERCUT: `bin/oracle lab` default output flooded the session while only a
  screenshot path was needed, ~1 min.

---

## 703 — [BOUNDED MAIN WORKER 2026-07-29 ~15:31] Battle-command seam Slice 6 Part A landed

- **State:** implementation `d995671d`; tree green at **518 files / 5254
  tests + 1 deliberate animation-lane skip**, production build, required
  targeted acceptance **386/386**, and `git diff --check`.
- **Did:** live generated player command boundaries now own a
  `BattleCommandPresentation` built only from the published request and live
  `rulesContext`; action/FIGHT input uses the ordinary phase-relative reducer,
  completed moves cross the existing `submitBattleDecision` bridge with
  `reduceFactoryFullTurnDecision`, trainer commands remain AI-driven, and each
  next player command replaces the request-owned presentation. Added
  controller-owned per-battler move cursors: new requests seed from persistent
  state, switch-ins and fresh battle controller starts reset the affected
  cursor. Tier 1 pins slot-3 persistence, switch-in reset, and zero-seed
  identity for fresh canonical lifecycles. Deleted resolved ISSUES #50.
- **Next:** Slice 6 Part B only: wire the already-banked arbitrary-species
  battle-pic catalogs into the generated presentation renderer, then (only
  after it visibly reaches the window) add the explicit-OFF 128-frame breadth
  trace. Do not redo Part A or alter cursor ownership.
- **Notes:** all fourteen immutable windows exact: Battle 2 **209/209**,
  FIGHT **235/235**, reopen **90/90**; turns 3–13 **254/254, 44/44, 42/42,
  44/44, 93/93, 88/88, 111/111, 83/83, 56/56, 46/46, 57/57**. No battle-pic
  consumer, trace/capture list, party-row/selector renderer, canonical import,
  unsupported barrier, battle/turn/absolute-tick selector, damage, RNG,
  turn-order, or animation change. PAPERCUT: none.

---

## 702 — [SUPERVISOR WIND-DOWN 2026-07-29 ~14:45] 6-round session: battle-command seam Slices 1-5 same-day, draft adapter, battle-pic catalogs, two CBM/CV pairs

- **State:** master green at **518 files / 5250 tests + 1 deliberate
  animation-lane skip**, production build, `git diff --check` clean, both
  censuses idempotent (69/69 abilities weighted 1096, 42/42 hold effects
  weighted 850, 17/17 checks), import/barrier ratchet 6/6 (in-suite),
  DEFERRED.md **empty all session**, no orphan worktrees or worker
  branches. `animation-main` folded at wind-down (+7 commits: Hypnosis
  exact through the production compositor, Mega Punch exact, Rolling Kick
  evidence handoff); no "For the main program" ledger asks. The animation
  supervisor may still be live — any tail is for the next orient fold.
- **Session totals (6 rounds / 9 workers, 0 failed steps):** the
  battle-command generic seam went from design to five landed slices
  same-day. (1) `docs/battle-command-seam-design.md` (`243f2e64`): render
  inventory, request-ID-owned phase-relative lifecycle, equivalence-first
  plan, immutable 14-trace regression table, six ≤45-min slices. (2)
  Slices 1-5 landed in order (`9e5799bf`, `a4a2a9dc`, `4d27ff46`+
  `0a14c6ad`, `1b72c15c`, `c9353673`; entries 697-701): state constructor
  with canonical deep equality → lifecycle reducer + ordinary
  `submitBattleDecision` bridge → canonical Battle-2 renderer swap →
  live-PP/arbitrary healthboxes (no turn-resolved parameter left in the
  generic path) → de-baked action chrome + typed POKéMON party-handoff.
  All fourteen canonical menu windows exact after every slice (209/235/90
  + turns 3-13). (3) Rung-14 draft generated-slots adapter (`73543153`):
  `createDraftScreenStateFromRentalRecords` + additive 376-species
  name/category extraction; draft traces 13/38/66 exact. (4) 376-species
  front/back battle-pic catalogs banked (`3e0737f3`, back 3.5 MB front
  6.8 MB, existing entries byte-identical) — Slice 6's asset dependency.
  (5) Two CBM/CV ports with live OFF receipts on seeds 1+99:
  `AI_CBM_SpDefUp` (doc §28, closes the pair with the shared CV half) and
  the Sleep pair `AI_CBM_Sleep`+`AI_CV_Sleep` (doc §29; ability census
  delta Insomnia/Vital Spirit 9→11, runner-up Roar deferred on staging
  cost).
- **Next (ordered):** (i) design §4 Slice 6 — connect the generated
  command boundary + battle-pic catalogs to the lifecycle, then the
  explicit-OFF 128-frame breadth trace (only after the generated route
  visibly reaches the window); (ii) arbitrary-species party-menu breadth
  (icons banked; the voluntary party-selector renderer is the named
  remaining dependency of the POKéMON handoff); (iii) trainer-pic OFF
  window for a non-canonical trainer once a generated route reaches it;
  (iv) commentary explicit-OFF pre-battle checkpoint (entry 690, likely
  harness-side); (v) remaining CBM/CV arms (Roar next candidate, needs
  party staging); (vi) reveal class-B sites with their named barriers;
  (vii) Gate-6 interaction matrix.
- **Day-audit (read-only Terra, post-surge — pattern now 4-for-4):** three
  real cross-step defects, all invisible to per-slice suites. (a)
  **[FIXED same-session]** forced-switch UI could submit the fainted
  Pokémon into a kernel throw — confirm guard + Tier-1 pin landed;
  refusal-message remainder filed as **ISSUES #49**. (b) While proving (a)
  pixel-neutral, found `turn15-party-select(.json/-delayed)` had been
  **crashing on master since ~12:00**: the morning session's 376-species
  icon catalog (`be7a4fee`, merged after entry 694's verification) rekeyed
  `party-mon-icons.json` to `SPECIES_*`, breaking `drawTurn15PartyIcon`'s
  plain-name lookup — **[FIXED]** key remap; both windows back to
  **200/200 + 200/200 exact** (new-catalog pixel data proved inert:
  palette[0] transparent-slot difference only). (c) FIGHT cursor resets
  per request where source persists `gMoveSelectionCursor` per battler →
  **ISSUES #50** (Slice-6 boundary work). (d) generated draft state
  ignored by the summary screen (anchor globals) → **ISSUES #51**. Audit
  verdicts otherwise: handoff-seam stale-ID rejection, live-PP single
  source, and source-exact action-cursor edges all CLEAN; lifecycle
  teardown correctly deferred to Slice 6. Final post-fix state: **518
  files / 5251 tests + 1 skip**, build, both party-select windows exact.
- **Notes:** oracle freshness FAIL at orient was again the docs-only
  false positive (807b449 NOTES.md-only; services kept, healthy all day).
  Two papercuts recorded: cross-lane full-suite contention (new entry,
  workaround now in briefs: full suite once at end, staggered) and
  parallel compares racing over `tools/compare/out/latest` (bumped
  below). Side-lane briefs naming the last supervisor-verified green
  commit worked cleanly all session (zero base-drift bites). Standing
  lesson from (b): a catalog regeneration that rekeys/reshapes an
  existing asset must rerun that asset's consumer traces, not just
  `npm test` — the fourteen-window battle-command set never covered the
  party-select windows.

---
