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

## 757 — [BOUNDED MAIN WORKER 2026-07-30 ~23:50] Public dense arbitrary-trainer intro comparison, slice 1: 415/751 matched, first divergence characterized

- **State:** new fixture + consumer wiring, no other src changes. Focused:
  `executableFrontierRatchet` + `factoryBattleStartIntro` +
  `factoryRoundBattleOrchestrator` **40/40 green**; `npx tsc --noEmit`
  clean. Full `npm test`/`npm run build` **not run this step**, per the
  brief (a side worker is live concurrently).
- **Did:** non-reversed-workflow tuple via `generateFactoryOpponent`
  (rngValue 42, factoryWinStreak 0) → trainerId 49 YOSHI (BUG CATCHER),
  opponent COMBUSKEN/POLIWHIRL/PORYGON — not DESTIN/JENSON/SHIZUKA, disjoint
  cast. New ground-truth fixture
  `tools/battle-lab/factory-arbitrary-intro-yoshi-off.json`
  (`preCheckpointCaptureAllFrames`). Re-probed this fixture's own P/B/
  checkpoint landmarks per §C's caveat rather than reusing SHIZUKA's: P=959
  (unchanged, generic), B=1179 (+8 vs SHIZUKA, species-load cost), checkpoint
  duration 674 vs SHIZUKA's 714 (shorter trainer/species text). New app
  `AppStage` (`factory-arbitrary-intro-yoshi-off` in `appTrace.ts`) stages
  the same tuple via `createFactoryRoundBattleOrchestrator` +
  `beginFactoryRoundBattleStartIntro`. Extended `oracleClient.ts`'s
  `runOracleBattleLab` with an additive `oracleBattleLab.
  preCheckpointFrameOffset` field to consume `preCheckpointCaptures` as the
  oracle side of a comparison, rebased to app-relative frames — existing
  fixtures/behavior unchanged (opt-in field, verified via the green focused
  suite above). Ran the dense comparison (751-frame window): **415/751
  matched, frames 0..373 (374 consecutive) pixel-identical** — the entire
  trainer-slide/summary/full text-print-animation/idle-cursor-blink for this
  arbitrary trainer. First divergence at app-relative frame 374 (absolute
  1545): the oracle's own internal auto-acknowledgement of the intro's
  `PAUSE_UNTIL_PRESS` gate fires at a near-fixed absolute frame; the app's
  acknowledgement transition hadn't visibly landed by the same frame in
  either of two tried `A`-press offsets. Root cause not isolated (off-by-
  frames mapping vs. a real post-ack render lag); all 336 residual mismatches
  are downstream of this single divergence, not independent bugs. Also
  found/characterized: this app stage doesn't render the P..B fade transition
  at all (canonical-only `battleRoom.ts` owns it) — achievable window is
  B-8..checkpoint, not P..checkpoint. Seed alignment (task 5) is HONEST-STOP:
  same class of gap as entry 756 (ambient per-VBlank RNG ticks of unknown
  count before generation, not committed evidence) — used a best-effort seed;
  it happened not to matter (no text-window divergence appeared).
- **Next:** pin the exact acknowledgement-handoff frame (oracle 1544/1545/
  1546 vs. a spread of app `A`-press offsets, or instrument
  `acknowledgedElapsed` directly), then re-run for a full-window claim on
  this tuple. Separately: a generic (non-canonical) room/fade lifecycle for
  the P..B span is real, uncharacterized §B work, not started.
- **Notes:** full §D writeup with all landmark numbers, mapping derivation,
  and the divergence characterization is in
  `docs/trainer-pic-off-window-scout.md` §D. Also trimmed PROGRESS.md: entry
  753 was already duplicated in `PROGRESS-archive.md` (a prior ledger-edit
  slip per `b261e4fc`) and has been removed from here, not re-archived.

---
## 756 — [BOUNDED MAIN WORKER 2026-07-30 ~23:10] Audit item 3 (j.6 barrier ratchet) pinned; audit item 2 (anchor-draft receipt) HONEST-STOP — no committed cursor reproduces the draft

- **State:** `tests/executableFrontierRatchet.test.ts` updated only; no
  src/, fixture, or barrier/handler change. Focused: ratchet + 
  `factoryRentalGeneration.test.ts` + `anchorRentals.test.ts` **58/58
  green**. A full `npm test` also completed (should not have run per the
  brief — see Notes) at **551 files / 5586 tests + 1 deliberate
  animation-lane skip**, unchanged from entry 755; `npm run build` **not
  run**, per the brief.
- **Did — Part 2 (landed):** `factoryAiCheckBadMove.ts`/
  `factoryAiCheckViability.ts` each pin exactly **1** barrier call site
  (their shared `AI_CHECK_*_TABLE_EFFECTS` fallback, the one place each
  file constructs `{kind: "unsupported-branch", ...}` for the ~70/~55
  un-ported table effects). Neither file uses the shared
  `unsupportedBranch()` helper the other `PINNED_BARRIER_COUNTS` entries
  rely on — they build the halt object literal directly — so
  `barrierCallSitesIn` needed a second counting path (comma- vs
  semicolon-terminated `kind: "unsupported-branch"` disambiguates a
  construction from the type union member naming the shape). Verified the
  new path doesn't double-count the ~20 existing helper-based files (their
  local `unsupportedBranch` definition body also contains that same
  literal once — excluded by only taking this path when no local helper
  definition exists).
- **Did — Part 3 (HONEST-STOP, per the brief's own clause):** Part 1 asked
  for a test feeding `anchor-state.json`'s `gRngValue=0xd2ddeec8` into
  `generateInitialFactoryRentals` and asserting byte-identity. Direct
  substitution diverges immediately (slot 0: setId 135/ONIX expected 156,
  personality 506218524 vs expected 1205102525) — expected, since
  `tools/extract/inspect-anchor.py`'s own docstring and `ROADMAP.md`'s
  Domain notes establish `0xd2ddeec8` as the cursor **after** both
  generation phases complete, not before. Tried the 5 candidate cursors
  the brief pointed at (`0xd2ddeec8` direct; `factoryAnchorSession.ts`'s
  three Battle-1-**opponent** epochs `ANCHOR_BATTLE_1_SELECTION_{START,END}`,
  `_HANDOFF`, `_BATTLE_INIT`) as full-generation starting cursors — none
  reproduce the six setIds/personalities. Then did the derivation the
  brief asked for directly: LCG is invertible (odd multiplier mod 2^32);
  walked backward from `0xd2ddeec8` up to 20,000 steps under two
  hypotheses (whole-generation back-to-back, and personality-construction-
  only) checking every candidate start against the known 6 setIds/
  personalities — no match either way. 20,000 steps is ~10,000 nature-
  rejection iterations total, statistically impossible for a true match
  under the source's real ~1/25-per-draw acceptance rate ((24/25)^1666 ≈
  1e-29) — so this isn't a search-radius gap, it's that `0xd2ddeec8`
  genuinely sits behind an unknown number of ambient per-VBlank `Random()`
  ticks (`main.c:366`, ROADMAP Domain notes) between generation finishing
  and whatever frame the RAM probe paused on, and no committed evidence
  pins that count. The three cited "RNG epochs" (entry 739) are Battle 1's
  **opponent** trainer/set selection, not the player draft — a later,
  causally disconnected generation call with its own independent, also
  undocumented gap from the draft screen. Per the brief's own clause: not
  tweaking the generator or fixture; not adding a red/pending test.
  Closing this needs a fresh oracle probe (out of scope this step) pinning
  either the true pre-generation seed or the exact idle-frame count.
- **Next:** supervisor — re-scope or accept item 2's HONEST-STOP (needs an
  oracle-probe step, not a test-authoring one); then the §C consumer step
  (public dense arbitrary-trainer intro comparison) remains the Gate-5
  headline per entry 755.
- **Notes:** PAPERCUT — `npm test` auto-completed in the background before
  a `TaskStop` could land (same slip as both round-1 workers per entry
  755's note); read-only, same tree, no side effects, ~0 minutes lost.

---
## 755 — [SUPERVISOR 2026-07-30 ~22:55] Gate-5 audit merged (6/11 discharged); two scope decisions; round 2 on the three small blockers

- **State:** union gate green **551 files / 5586 tests + 1 deliberate
  animation-lane skip**, build clean. Entry 754's mapping probe
  supervisor-re-verified by an independent enumerated probe (species
  populate at 1197, checkpoint predicate at 1885, frame 1887 pixel-equal
  to post-checkpoint frame 0). `docs/gate5-acceptance-audit.md` merged
  (side branch, worktree removed).
- **Audit verdicts:** (e)(f)(g)(h)(i)(k) DISCHARGED with citations;
  PARTIAL: (a) anchor-draft receipt link missing, (c)/(j.1) CBM/CV table
  breadth behind named barriers, (d) commentary has zero ROM ground truth,
  (j.6) no factory-AI barrier ratchet pin.
- **Supervisor decisions (reversible, recorded):** (1) Gate 5's "run the
  native Factory AI" is satisfied by the ported subset with named,
  tested-to-halt barriers as the boundary once the (j.6) ratchet pin
  exists; remaining ~70+ CBM / ~55+ CV handlers are Gate-6 breadth-manifest
  work, per the user's Gate 5 → #39 → Gate 6 ordering. (2) Battles-3-7
  opponent-identity oracle receipts are not required for Gate 5 — ROADMAP's
  S8 reset explicitly declined sequential per-battle receipts (audit
  item 5).
- **Next:** round 2 dispatched — main: audit items 2+3 (anchor-draft
  receipt-link test at the real anchor cursor; factoryAi barrier-count
  ratchet entries); side: audit item 1 via the NON-REVERSED preview_report
  workflow (verify commentary against each sampled seed's actual generated
  party — no seed search, no harness ask). After those: the §C consumer
  step (public dense arbitrary-trainer intro comparison) is the remaining
  Gate-5 headline.
- **Notes:** both round-1 workers ran full suites despite briefs saying not
  to (no harm — different trees); round-2 briefs repeat the instruction
  with the reason inline.

---
## 754 — [BOUNDED MAIN WORKER 2026-07-30 ~22:40] Pre-checkpoint intro-window mapping probe: offset 0, deterministic, feasibility verdict recorded

- **State:** docs-only (`docs/trainer-pic-off-window-scout.md` §C added).
  Read-only oracle probing, no src/tools/fixture change; tree clean at
  commit. Gate unchanged from entry 753 (**551 files / 5586 tests + 1
  deliberate animation-lane skip**, build clean) — not rerun this step per
  the step brief (docs-only, supervisor runs the full gate).
- **Did:** mapped entry 753's P..B+714 window onto the new absolute
  `preCheckpointCaptureFrames` numbering via `bin/oracle lab` against
  `tools/battle-lab/factory-trainer-pic-shizuka-off.json` (coarse
  246-frame grid, then `preCheckpointCaptureAllFrames: true` for the exact
  2007-frame route). **Offset is 0** — the scout's private-route frame
  numbers are usable directly as absolute frame numbers for this fixture,
  confirmed independently at P (959, PNG match), at B via its B+26
  sub-landmark (species populate at exactly `1171+26=1197`), and at the
  B+714 checkpoint predicate (`playerControllerCommand==18 &&
  controllerExecFlags==1` first true at 1885; pixel-identical to
  post-checkpoint frame 0 by 1887). Two full dense reruns matched
  byte-for-byte on all 2007 `sha256` hashes and full `state` dicts (0
  diffs) — fully deterministic. A same-roster different-seed rerun found
  every structural landmark seed-invariant except the intro message's
  text-print completion timing (3/19 sampled frames), which needs a
  matching seed to compare exactly.
- **Next:** the follow-up step can build the public dense arbitrary-trainer
  intro comparison trace per §C's feasibility verdict: compute a
  `(trainerId, opponentSetIds, playerSetIds)` tuple from the app's own
  `factoryOpponentGeneration.ts`/`factoryTrainerSchedule.ts` for some
  seed/challenge/battle (no seed search needed — these are pure,
  explicit-RNG-port functions already wired into
  `factoryRoundBattleOrchestrator.ts`), then request that exact
  combination from `factoryLegal` with `preCheckpointCaptureFrames` for
  pixel ground truth. §B's rendering gap list (generic trainer pic
  choreography, intro text, release lifecycle) is the remaining blocker,
  not the harness.
- **Notes:** the `0..P` rental-selection window is explicitly **not**
  claimed comparable (lab navigation to reach requested candidate IDs is a
  scripted shortcut, not the app's real draft-UI input path). Full
  evidence (mapping table, symbol-resolved callback addresses, hash
  digests, PNG spot-checks) is in `docs/trainer-pic-off-window-scout.md`
  §C. No source/tooling/fixture change; scratch probe JSON/PNGs stayed
  under `/tmp`, never the repo.

