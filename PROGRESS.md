# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 911 — [bounded MAIN worker, 2026-08-04 ~09:20] #73 rung B: TRAINER_SLIDE_TIMING corrected 53→38 (pixel-verified); `npm run compare` wiring NOT landed (honest checkpoint)

- **State:** master `de6727bd`. Full `npm test` green (**702 files / 6,792
  passed / 1 skipped**, 0 failures), `npm run build` green,
  `compare:differential -- battle-command-generated-off.json --base
  a7bbed0b --summary`: **PASS — 128/128 byte-identical**.
- **Did:** dense per-tick re-probe (`bin/oracle lab`, frames 2994-3059) of
  the already-committed LOSS ground-truth fixture
  (`tools/battle-lab/loss-terminal-explosion-dusclops-off.json`) pixel-pins
  the trainer-slide-in duration at **38 ticks** (dispatch tick 2996 → settle
  tick 3034), not the ported 53 — `offscreenX2 = 2*(38-age)` reproduces the
  measured leading edge exactly at all 8 sampled ticks. The old 53 was
  independently wrong twice over (never pixel-fit-verified, and its own
  source arithmetic was off: `OpponentHandleTrainerSlide` creates the sprite
  at x2=96 stepping -2/callback = 48, not 53). Fixed `TRAINER_SLIDE_TIMING`/
  `BattleTrainerSlideTiming` in `battleResolutionPresentation.ts` with the
  corrected source+oracle citation; red-verified
  `tests/presentationTerminalSeamTrainerSlide.test.ts`'s old pins (53,
  `offscreenX2: 106`) failed before updating to the new values (38, 76).
- **Next (honest checkpoint — item not closed):** rung B's actual
  `npm run compare` oracle-pixel pass was **not completed** this step — no
  mismatching frames to report, because the compare-trace/app-stage wiring
  itself wasn't finished in time, not because it ran and failed. ISSUES #73
  now carries a detailed, concrete wiring plan for the next session: build a
  compare-only `AppStage` (`tools/compare/appTrace.ts`) that directly
  constructs the orchestrator already inside the resolution's `"presenting"`
  phase at the trainer-slide command (app frame 0 == oracle tick 2996, past
  the out-of-window return-to-ball recall), using the same
  `createFactoryFullTurnBattleState`/`createBattleState`-based construction
  `presentationTerminalSeamTrainerSlide.test.ts`'s `terminalResolution()`
  helper already demonstrates, fed the real production LOSS event shape
  `battleScriptFaintedActionsOrchestration.test.ts`'s own kernel-level test
  already proves (`recall:1, slide-in:1, message:STRINGID_TRAINER1WINTEXT`).
  Full plan, including the `finishBattle`/`aiHistory` non-null prerequisites
  and the `oracleBattleLab.preCheckpointFrameOffset` mechanism for reusing
  the fixture's own committed captures, is in ISSUES #73. WIN side still
  needs a fresh twice-run `mechanicLab` staging before any of this applies
  to it (untouched this session).
- **Notes:** most of this step's time went to correctly scoping the
  wiring (confirming the resolution-state construction recipe, the real
  kernel event shape, and the `finishBattle` prerequisites) before running
  out of budget to actually write it — the TRAINER_SLIDE_TIMING fix was the
  one concrete, source-cited, pixel-verified deliverable that fit in the
  remaining time. No PAPERCUT beyond the known `npm test`/full-suite runtime
  (~9.5 min this session, ran to a real foreground completion per execution
  discipline).

---
## 910 — [supervisor, 2026-08-04 ~08:10] R1 pair landed: terminal-seam presentation phase (main) + Cmd_end3 resumption wiring (side, merged)

- **State:** master `a7bbed0b` (merge of `worker/side-20260804-071645`,
  `8e2bf807`). Union verified supervisor-side: smoke 347/347, the four
  touched test surfaces green (end3 resumption, machine, frontier ratchet,
  trainer-slide — 21/21). Each worker ran its own full `npm test` green at
  its commit (main: 701 files/6,788; side: 701 files/6,790). Side worktree
  and branch removed.
- **Did:** (1) MAIN: #73 item 1 rung A — see entry 909. (2) SIDE:
  `Cmd_end3`/`BattleScriptPushCursorAndCallback` resumption for
  `call-current`-entered switch-in ability scripts (`battleScriptMachine.ts`
  `end3()` pops/resumes via shared `callStack` like `RETURN` when non-empty;
  empty-stack halt unchanged so the end-turn cCallback flavor is preserved);
  `B_ANIM_SANDSTORM_CONTINUES` registered. Sand Stream + Drizzle + Drought
  full-turn switch-in repros run to completion, kernel-event-pinned,
  red-verified vs the old `B_SCR_OP_END3` barrier; ratchet pins unmoved.
  ISSUES #72's end3 block updated (kernel unblocked; id needs only its
  `messageLines` branch now). (3) Launcher note: main R1's launcher pipeline
  broke mid-run (spurious exit-1 notification at ~07:51) while launcher +
  worker were both alive and healthy — diagnosed via process-tree +
  JSONL-growth check before touching anything; zero kills, worker finished
  normally at 08:03.
- **Next:** R2 pair — MAIN: #73 rung B (oracle-pixel windows over the new
  terminal presentation, both outcomes). SIDE: docs-only falsification scout
  for the #72 hard tail (tryfaintmon dual-operand roles for
  TOOKFOE/LOSTPPGRUDGE, SXBLOCKSY2 Perish-Song loop, HUNGONWITHX Focus-Band
  staging search). Then #72 batch 8 (SXWHIPPEDUPSANDSTORM +
  SAFEGUARDEXPIRED + TOOKATTACK).
- **Notes:** animation supervisor live concurrently (its own Codex worker in
  `.worktrees/animation-main/.worktrees/`); `animation-main` has advanced —
  fold check at wind-down. Worker 909's "~03:15" timestamp corrected to
  ~08:00 (known drift class).

---
## 909 — [bounded MAIN worker, 2026-08-04 ~08:00] Terminal-seam increment (iii) landed: generic trainer slide-in + dismissible win/loss message boxes (ISSUES #73 item 1 rung A)

- **State:** master `a1dc6614`. Full `npm test` green (**701 files / 6,788
  passed / 1 skipped**, 0 failures), `npm run build` green,
  `compare:differential -- battle-command-generated-off.json --base
  4b883b3f --summary`: **PASS — 128/128 byte-identical**.
- **Did:** the real presentation phase docs/terminal-seam-round-flow-scout.md
  §3(iii) called for, on the generic route, before the postwin/factoryTerminal
  handoff. `projectBattleResolutionCommands` (`battleResolutionPresentation.ts`)
  gained a generic `"trainer-slide"` command case (keyed off the
  `trainer-slide-in`/`-out` events and the already-threaded `opponentTrainer`
  — data-driven, not DESTIN-hardcoded; new `TRAINER_SLIDE_TIMING` = 53 ticks,
  ported from `battleScene.ts`'s own `TURN17_TRAINER_SLIDE_SETTLE_DELAY` doc
  comment, cited in place). The three terminal STRINGIDs
  (`PLAYERDEFEATEDTRAINER1`/`TRAINER1LOSETEXT`/`TRAINER1WINTEXT`) now advance
  by button press (`TERMINAL_SEAM_BUTTON_MESSAGE_IDS`), reusing the exact
  same dismiss machinery `STRINGID_TARGETFAINTED` already drives — no new
  renderer, per the step's hard limit. `battleResolutionPresentationRender.ts`
  exposes the slide's screen-relative offset (`offscreenX2`) generically in
  the render view; `battleScene.ts`'s existing generic
  `renderBattleResolutionSceneOffView` (the Scene-OFF drawScene callback the
  generated route already wires at `core.ts:2346`, not the retired canonical
  turn machine) draws the trainer sprite via `resolveFrontierTrainerPic`
  keyed off `opponentTrainer.trainerPic`. The pre-existing
  `"terminal-handoff"` lifecycle phase (already wired to call `finishBattle`
  in `factoryRoundBattleOrchestrator.ts`) now only fires once every command in
  the segment — including the new slide and both dismisses — has actually
  played, closing the "silent fabrication" gap ISSUES #73 flagged. New
  `tests/presentationTerminalSeamTrainerSlide.test.ts`: DESTIN WIN and JENSON
  LOSS fixtures (mirroring `battleScriptFaintedActionsOrchestration.test.ts`'s
  real production event shapes) pin the exact 3-command sequence per outcome,
  drive the presentation step-by-step through the slide's mid-animation
  offset, its settle, both message dismisses, and the final
  `terminal-handoff`/`pendingBoundary` state. Red-verified via `git stash --
  src/engine/battleResolutionPresentation.ts
  src/engine/battleResolutionPresentationRender.ts src/engine/battleScene.ts`:
  both tests failed their first assertion — command array
  `["message","message","turn-end"]`/`["sprite-visibility","message","turn-end"]`,
  confirming the event was silently dropped and the quote message never
  became dismissible, exactly ISSUES #73's own diagnosis. Full
  `factoryRoundBattleOrchestrator.test.ts` (36 tests, incl. the existing
  terminal-boundary integration test that loops `advanceFactoryRoundBattleResolution`
  to `postwin`) reran green untouched.
- **Scope held:** no `battleScriptMachine.ts`/`battleScriptCallbackStack.ts`/
  `battleScriptSwitchinOpcode.ts`/`battleScriptStatbuffchangeOpcode.ts` edits
  (side-lane-owned this round); no #72 id additions; no canonical
  `battleScene.ts` turn-machine change (`TURN17_*` one-off untouched, only
  cited/ported); completeness guard untouched.
- **Next:** ISSUES #73's remaining item (rung B): dense oracle-pixel coverage
  over the new boundary. Ground truth is already committed
  (`docs/terminal-seam-loss-path-ground-truth.md`'s twice-identical LOSS
  trace) but **not yet run through `npm run compare`** against this landing —
  budget ran out this step before attempting the matched app/oracle staging
  (see Notes). The WIN side additionally needs a fresh `mechanicLab` window
  (today's only WIN ground truth is the DESTIN-specific canonical
  `turn17-notes.md`/`postwin-notes.md` pair, not a staged generic trace).
  #72's remaining REACHABLE list. `Cmd_end3`/`call-current` resumption gap.
  #71 Slice D (gated on the animation lane's dispatcher).
- **Notes:** Honest stop at rung A per the step brief's own instruction
  ("if not converging by minute 50, stop fitting, land rung A") — rung B's
  oracle-window pass was not attempted at all this step (not "attempted and
  stuck"), so there are no mismatch numbers to report yet; the next worker
  should budget real time for `bin/oracle lab`/`npm run compare` staging
  before assuming the ported `TRAINER_SLIDE_TIMING`/screen-position constants
  are pixel-exact. No PAPERCUT beyond the recurring `npm test` auto-background
  past the Bash tool's default timeout (same known issue entries 905/906
  flagged); stopped the stray duplicate and re-ran to a real foreground
  completion each time per this step's execution discipline.

---
