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

---
## 752 — [SUPERVISOR FOLD 2026-07-30 ~21:55] Stranded side-worker inventory folded; #39 worklist now on master

- **State:** `worker/side-20260730-183612` (docs-only, `ff36195e`) merged to
  master; worktree removed and branch deleted, so only the permanent
  `.worktrees/animation-main` remains. `animation-main` fold delta **0**.
- **Did:** folded `docs/battle-scene-retirement-inventory.md` — the
  reproducible census, textual debt metric, and the remaining owner chain for
  #39. The side worker landed it at 18:41 but it was never merged and never
  ledgered; entry 750's wind-down predates it. Re-ran the census: the doc is
  **exact at its pinned `6fe623bb`** (2,381 refs / 32,696 LOC in
  `battleScene.ts`). Appended the post-751 delta (2,377 refs / 32,721 LOC)
  since master has advanced past the pin.
- **Next:** #39 window-by-window retirement continues from this worklist —
  it is the census and owner-chain map the next slices should cite.
- **Notes:** docs-only fold, no source or test change. The stranding is worth
  remembering: a side worker that finishes after the supervisor winds down
  leaves no trace in the ledger unless the next session sweeps
  `git branch --no-merged`.
