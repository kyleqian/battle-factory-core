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
## 622 — [BOUNDED MAIN WORKER 2026-07-28 ~11:38] Mean Look + Nightmare source-complete; Rapid Spin remains barriered

- **State:** rung (a) is green at **389 files / 4441 tests** plus production
  build and OFF oracle info. Census is **181/214 effects, 320/355 moves,
  262/276 distinct, 2924/2957 weighted**: actual **+2/+4/+4/+8**, exactly
  the dossier's rung-(a) prediction; all 62 census validations pass.
- **Did:** widened every committed `jumpifstatus2` operand and Mean Look's
  previously-undocumented bare `NO_ACC_CALC`; added source-shaped
  `battlerPreventingEscape`, owner-sensitive switch/faint/Roar release, and
  trapped command rejection; wired Nightmare at the real end-turn phase
  with floor(maxHP/4), wake cleanup, party HP sync, and zero RNG.
  Receipt pins cover `0x04000000`/`0x08000000`, 116→87→58, no post-wake
  tick, release, duplicate/Substitute/awake failures, and full scripts to END.
- **Next:** implement rung (b) only: `B_SCR_OP_RAPIDSPINFREE`, the
  `gBattlerTarget <- sBATTLER` copy tuple, typed wrapped-move buffer/message,
  then retire `MOVE_EFFECT_RAPIDSPIN`; expect **+1/+1/+1/+1** to
  182/214, 321/355, 263/276, 2925/2957.
- **Notes:** correction headline: dossier §3.7 missed bare `NO_ACC_CALC` as a
  real Mean Look barrier; recorded in place. Deliberate barrier ratchet
  moves: HitChain **19→18**, Switchin **9→8**. Rapid Spin, Thief, Knock Off,
  and Pay Day remain honestly barriered; no presentation/round/tick changes.

---
## 621 — [SUPERVISOR VERIFY+FOLD 2026-07-28 ~11:40] Grudge+Spite accepted; Batch-3 and Cluster-4 receipts folded; Swallow gloss corrected

- **State:** verified entry 620 (suite, build) and reconciled the census the
  worker deliberately skipped: exactly **179/214 effects, 316/355 moves,
  258/276 distinct, 2916/2957 weighted** (+2/+2/+2/+4). Merged two side
  branches: `fbe2eba1` (`docs/ranked-batch3-off-evidence.md` — Pain Split
  117/100→108/108; Stockpile×2→Swallow 67→150 = floor(167/2); fourth-use
  failure; Spit Up receipt honestly deferred, sole carrier is dual-ability)
  and `b113d9af` (`docs/family-b-cluster4-off-evidence.md` — Covet active+
  party transfer, Sticky Hold block with damage/PP proceeding, Knock Off
  clears active item but leaves the party record intact). Union green at
  **388 files / 4431 tests**.
- **Did:** corrected the ranked dossier §3.8 in place (supervisor-verified
  against `Cmd_stockpiletohpheal`): Swallow heals **1/4, 1/2, FULL** at
  counters 1/2/3 — not /8,/4,/2. The Batch-3 engine brief carries the fix.
  Note: the cwd self-merge trap bit an 8th time (merge/cleanup block started
  inside the worktree); branch survived, recovered from the main tree, zero
  loss.
- **Next:** round 9 dispatched — main: family-B Cluster 3 engine (Mean Look/
  Nightmare rung mandatory, Rapid Spin rung optional; predicted **+3/+5/+5/
  +9**) against the banked receipts. Then Batch-3 engine (+4 effects/+7
  weighted). Cluster 4 receipts are banked for this or the next session.
- **Notes:** animation supervisor is live concurrently (animation-main has
  fresh commits + a nested worker); fold at wind-down. No deferred questions.
  Deadline 15:07.

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
