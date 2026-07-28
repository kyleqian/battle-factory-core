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


---
## 620 — [BOUNDED MAIN WORKER 2026-07-28 ~11:21] Grudge and Spite execute complete PP lifecycles

- **State:** tree green at **386 files / 4423 tests**, production build, OFF
  oracle info, ratchets **6/6**, and `git diff --check`. Both ranked Batch-2
  remainder effects reach their own committed-script `END`; expected census
  delta is **+2 effects / +2 moves / +2 distinct / +4 weighted**.
- **Did:** registered exact `TRYSETGRUDGE` and `TRYSPITEPPREDUCE` handlers.
  Grudge now schedules its chosen-move PP zero, durable party write, typed
  move buffer, controller event, message, Destiny Bond continuation, and
  target faint in source order. Spite owns the four-bit `mimickedMoves`
  mask, exact pre-draw failures and `(Random() & 3) + 2` draw, clamp/zero
  cancellation, typed move/number buffers, Mimic/Transform persistence gate,
  and active/party/controller PP synchronization across switch.
- **Next:** supervisor verify commits `bf1080d5` and `55c49c62`, then
  reconcile the concurrent census owner and expect totals
  **179/214 effects, 316/355 moves, 258/276 distinct, 2916/2957 weighted**.
  No remainder from this step.
- **Notes:** raw-source re-derivation found zero dossier corrections and zero
  surprise barriers. Deliberate barrier ratchet move: HitChain **20→19**
  retires Grudge's named `tryfaintmon` barrier. No new barriers, recording
  imports, generator-metadata entries, census/doc regeneration, roadmap,
  issue, oracle-trace, presentation, tick, or round edits.

---
## 619 — [BOUNDED MAIN WORKER 2026-07-28 ~11:05] Status-family callback operands restored semantically

- **State:** tree green at **384 files / 4402 tests**, production build, OFF
  oracle info, `git diff --check`, and census **177/214 effects, 314/355
  moves, 256/276 distinct, 2912/2957 weighted**; all **62/62** census
  validations pass. Predicted and actual delta: **+5/+13/+11/+139**.
- **Did:** registered source-exact `gFellAsleepStringIds`; implemented real
  `gEffectBattler <- gBattlerTarget` and
  `sBATTLER <- sBATTLER_WITH_ABILITY` assignments, including materialized
  `battlerWithAbility` writes in `jumpifability`. Full committed scripts now
  reach END for Sleep, Toxic, Poison, Paralysis, Yawn first-stage and
  ability-prevention paths, asserting messages, status icons, state,
  deterministic replay, and exact RNG ledgers. The damaging
  `EFFECT_PARALYZE_HIT` sibling is also terminal-walked.
- **Next:** supervisor verify commit `7f0c8789`. Then continue the assigned
  order with Grudge+Spite (+4 weighted) or family-B Cluster 3 against banked
  evidence; no remainder from this step.
- **Notes:** deliberate census pin move: five exact mechanical-blocker checks
  now require executable. No new barriers, barrier-count pin moves, recording
  imports, oracle traces, presentation/tick/round branches, roadmap, or issue
  edits. `EFFECT_PARALYZE_HIT` was already executable because its secondary
  status path shares the callback but cannot enter the primary move's
  Limber-prevention copy branch.

---
## 618 — [SUPERVISOR VERIFY+FOLD 2026-07-28 ~11:00] Batch 1 accepted; hardened census folded — five status effects were runtime false positives

- **State:** verified entry 617 (suite **384/4391**, build) and merged census
  hardening `f80a90e7`; regenerated on the union as `693d2100`. Census is now
  honest at **172/214 effects, 301/355 moves, 245/276 distinct, 2773/2957
  weighted** (Batch 1's +6/+7/+7/+10 landed; validation checks 47→62).
- **Did:** confirmed the hardening's headline down-flip myself before merging:
  EFFECT_SLEEP/TOXIC/POISON/PARALYZE/YAWN were runtime false positives —
  their success paths halt today on unaccepted operands
  (`printfromtable gFellAsleepStringIds`; `copyarray (gEffectBattler,
  gBattlerTarget, 1)`; Yawn's `(sBATTLER, sBATTLER_WITH_ABILITY, 1)`). Root
  cause of the blind spot: their integration tests ran UNTIL the callback
  label, not through it (`tests/battleScriptStatusPrimaryOpcode.test.ts:425`),
  and the pre-hardening census walked opcode presence only. The generator now
  reads all operand surfaces live and gates Metronome's dynamic universe.
- **Next:** round 7 dispatched — main: status-family operand restoration
  (semantic widenings + through-the-callback committed-script tests; predicted
  **+5/+13/+11/+139** → 177/214, 314/355, 256/276, 2912/2957); side: Batch-3
  staging receipts (Pain Split/Stockpile family). Then Grudge+Spite (+4) and
  family-B Cluster 3 engine work against the banked receipts.
- **Notes:** no deferred questions. Deadline 15:07.
