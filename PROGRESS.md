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
