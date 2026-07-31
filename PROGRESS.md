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

---
## 751 — [BOUNDED MAIN WORKER 2026-07-30 ~18:52] Turn-13 DRAGON_BREATH content re-driven from kernel receipts

- **State:** landed in `77cb49d0`; focused acceptance **4 files / 293
  tests**, full gate green at **551 files / 5586 tests + 1 deliberate
  animation-lane skip**, production build clean.
- **Did:** staged Onix's real DRAGON_BREATH hit chain from the post-SAND RNG
  cursor and consumed its generic damage/HP/faint receipts. Deleted raw
  `TURN13_PIDGEOTTO_STARTING_HP`, `TURN13_PIDGEOTTO_FAINT_HP`,
  `TURN13_FAINTED_LINE1/2`, the raw kickoff-line call, and the
  `turn13KoDismissElapsed` field; renamed the two KO/faint dispatchers and
  removed KO dismissal's `turn12Resolved` guard. Source-cited damage,
  secondary roll (90: no paralysis), HP update, and faint sequencing.
- **Next:** continue #39 outside this bounded half-window: the surrounding
  turn-13 SAND_ATTACK→DRAGON_BREATH timing cascade and post-KO Murkrow
  switch-in/materialization remain keyed. `turn13Resolved` remains mirrored
  because the turn-14 dispatcher and slot-2 PP accounting consume it;
  `TURN13_DRAGONBREATH_MENU_REDRAW_DELAY` remains the turn-14 reopen gate.
- **Notes:** SAND_ATTACK **190/190**, DRAGON_BREATH/faint **141/141**,
  switch-in **242/242**, generated intro **715/715**, generated command
  **128/128**. No capture, route, Scene-ON, barrier, or new
  battle/turn/absolute-tick branch.

