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

---
## 753 — [USER DECISIONS 2026-07-30 ~22:06] Gate 5 → #39 → Gate 6 ordering set; stale pre-reset "decision" retired

- **State:** docs-only. Gate green at **551 files / 5586 tests + 1 deliberate
  animation-lane skip** (entry 752's run), build clean, DEFERRED.md empty.
- **User ordering decision:** **Gate 5 first, then ISSUES #39, then Gate 6**
  — recorded in ROADMAP S10. This overrides entry 750's "(i) #39 first"
  next-session ordering. Rationale on file: Gate 5 is the product; #39 is not
  getting worse under the no-new-turn-keyed-branches rule, so its slices fill
  gaps around Gate-5 work.
- **Stale-blocker retirement:** the "harness pre-reset capture" item was
  **never an open user decision** by the time it was written. Harness added
  `preCheckpointCaptureFrames` (`8251953`, 07-30 10:13) and
  `preCheckpointCaptureAllFrames` (`38fea69`, 10:19); the running main oracle
  (started 11:59) has both. The routing design was authored 12:24 and still
  cited the 07-29 scout instead of re-reading `../../oracle/BATTLE_LAB.md`.
  Corrected §6.2 and marked the scout's item-7 PREDICTION falsified. What
  remains is **wiring, not a decision**: pre-checkpoint frames use a separate
  absolute coordinate space, so map the scout's P..B+714 window onto it and
  confirm coverage by probe.
- **Second user decision — browser Battle Scene ON/OFF selector: SKIP
  (2026-07-30).** Recorded as out of scope in ROADMAP S10 and closed in
  design §6.4. The browser stays Battle Scene OFF; Scene ON remains the
  animation lane's proof, not a player toggle. Closed, not parked — do not
  re-litigate.
- **Only remainder for the user:** the attendant-commentary checkpoint needs
  a *specific* party, but `preview_report` picks a seed, not an opponent —
  seed search or a harness ask. Small, and not blocking Gate 5.
- **Notes:** ISSUES.md now separates **Open** (#39 only) from **Settled
  records** (#38/#18/#5). The settled entries stay because ROADMAP acceptance
  lines cite them by number as the reason specific pixel diffs are accepted;
  deleting them would orphan those citations.
