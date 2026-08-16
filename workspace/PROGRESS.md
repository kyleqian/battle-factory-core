# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1297 — [supervisor, 2026-08-16] **Re-sweep found 2 NEW crashes, both proven #93-caused (filed #94/#95, fix dispatched); gold worker cap-killed — pages 20→53/177 salvaged**

- **State (soak truth):** post-#93 winning 0:60 = **59/60** (NEW crash
  seed 16); first-ever full 60:120 = **58/60** (NEW crashes seeds 69,
  113). Seed-49 hang gone (per-policy budget fix held). Outcome shift
  vs pre-#93 winning baseline: 21/60 terminal flips, benign and
  expected. **Supervisor discriminators: swapping ONLY the pre-#93
  `factoryRoundBattleOrchestrator.ts` back in makes seeds 16/69/113
  all OK** — both new signatures are #93-caused, not latent. Filed as
  **#94** (slice boundary not a player command request,
  orchestrator:1830) and **#95** (move/hit provenance ordering,
  battleResolutionPresentation.ts:3190) with the discriminator
  evidence; part-3 report merged (`414a040c`). An opus fix worker is
  dispatched on both (single-root-cause hypothesis first); #93 itself
  stays — its pin + seed 109 remain the guard.
- **Gold speech ((b), cap-killed at final gates):** worker exit 143
  with 3 uncommitted files; supervisor salvaged after independent
  verification (gold windows 58/256 · **53/177** (was 20/177) ·
  58/126; entrance-03 242/256 + cry-held 74/74 rerun clean; typecheck
  + full npm 1,056/9,982/223 + build green) — committed `138b779d`.
  Transcript shows an open-window attempt reaching 91/256 that
  regressed entrance-03 and was correctly reverted: the park-phase
  lever as tried TRADES against entrance-03 — next attempt needs a
  shared-clock shape, not a gold-local constant. Open/close windows
  unmoved (58/256, 58/126); close's diff is a whole-frame 88% class
  (close-wipe model still missing).
- **Next:** (1) #94/#95 fix verifying; (2) gold open/close rebrief
  with the trade-off note; (3) parked: callscene-02 remainder,
  entrance-03 frames 319-320/368.

---

## 1296 — [supervisor, 2026-08-16] **B1c folded: entrance-03 162→242/256 (render clock, not OAM latch); #93 fix verified; side absolute-path trap recurred — papercut filed**

- **State:** B1c branch merged (worker `0efe8e15`); union checks green
  (smoke 375/375, orchestrator+soak pins 65/65, new B1c pin 15/15,
  build; entrance-03 re-confirmed **242/256** on the merged tree).
  Mechanism: `brainMoving`'s render clock ran ONE TICK AHEAD of
  `entryStep`'s shared table (RAM stays flat two ticks after the
  `brainMsgboxClosing→brainMoving` transition); the 1288 OAM/
  `gSpriteCoordOffsetY` latch hypothesis was RULED OUT by an extended
  RAM probe (`oam.y` equals its same-frame computed sum at every tick).
  Bounded residual: frames 319-320 (msgbox-close wipe artifact — same
  close-wipe lever as gold speech) + 368 (single-tick Noland walk-cycle
  frame-index boundary, same family as 1293's lead-leg fix). Bars
  unmoved: entrance-02 256/256, B2 speech 39/39·28/28·74/74·39/39,
  reveal 690/701. **#93 fix (1295) supervisor-verified:** seed 109
  clean, orchestrator suite 51/51, winning 100:120 was 20/20 in the
  worker's run.
- **Trap recurred with mechanism found:** the side worker's Edit/Write
  calls landed in the MAIN tree via absolute paths (worker perceived
  "edits silently don't reach disk" and fell back to shell writes; two
  stray main-tree files were superseded early drafts, diff-checked
  against the branch and discarded). New PAPERCUTS entry filed.
- **Next:** dispatching **(b) gold speech dense closure** (main lane —
  now carrying the B1c clock mechanism + the close-wipe and walk-cycle
  residual leads) and a **post-#93 winning 0:60 re-sweep + full-policy
  60:120 first sweep** (side lane). Remaining parked: callscene-02
  second page-turn + box-5 dismiss (1293), entrance-03 frames
  319-320/368.

---

