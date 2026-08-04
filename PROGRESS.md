# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 913 — [bounded MAIN worker, 2026-08-04 ~11:15] #73 LOSS terminal window closed to 235/236 (reproduced twice); one itemized wait-cursor gap remains

- **State:** master `c8cc6cd4` + this step's uncommitted-until-now docs/tools
  changes. Full `npm test` green (**703 files / 6,801 passed / 1 skipped**,
  0 failures), `npm run build` green, `compare:differential --
  battle-command-generated-off.json --base e62cc253 --summary`: **PASS —
  128/128 byte-identical**.
- **Did:** eliminated all three mismatch classes the morning's compare
  wiring (`29e5cb3d`) diagnosed at a 0/236 baseline. (A) **genuine render
  gap, fixed in `src`** (commit `c8cc6cd4`): recall
  (`VARIOUS_RETURN_OPPONENT_MON1/2` → real `CONTROLLER_RETURNMONTOBALL`,
  `battle_controller_opponent.c`'s `OpponentHandleReturnMonToBall`/
  `FreeMonSpriteAfterSwitchOutAnim`) now clears the healthbox with the
  sprite, generically distinguished from the unrelated
  `CONTROLLER_SPRITEINVISIBILITY` (Dig/Fly) receipt via the emitting
  instruction's own opcode name (`"sprite-visibility"` command's new
  `recall` flag) — red-verified, full details in the commit. (B)+(C)
  **scaffold artifacts, fixed in `tools/compare/appTrace.ts` only**: the
  antecedent "MURKROW fainted!" box and the player's all-fainted empty field
  are the same real event (MURKROW's own Explosion self-KO), now replayed
  through the real `health-bar-update -> hp-change -> faint-animation ->
  STRINGID_ATTACKERFAINTED` chain ahead of the recall/slide/win-text events,
  hand-set to `commandIndex: 4` outside real ticks. Result: `npm run compare
  -- loss-terminal-window-off --summary`: **235/236 frames matched**,
  reproduced byte-identical across two independent runs (same single match,
  frame 3231, both times).
- **Next:** one remaining class is itemized in ISSUES #73, not fixed: a
  generic wait-cursor (heart glyph, `battleScene.ts:34009-34017`) draws for
  every `advance: "button"` message once ready, but the oracle shows none at
  all for the `STRINGID_TRAINER1WINTEXT` quote across the full window
  (including ~174 frames after fully typed) — likely a distinct real
  printer path for terminal quotes vs. ordinary battle messages
  (`STRINGID_TARGETFAINTED` etc.), unconfirmed pending a source read. LOSS
  half of #73 is otherwise closed. WIN half stays open (side lane owns its
  ground-truth staging concurrently) and will likely hit the same
  wait-cursor finding.
- **Notes:** no `tools/battle-lab/` edits, no WIN-side ground-truth doc, no
  kernel machine file edits, no #72 work — all per this step's brief.
  `npm test`'s ~10-minute wall time both runs this session auto-backgrounded
  past the Bash tool's 120s default (known PAPERCUT class); recovered via
  `TaskOutput` polling to real completion each time, per entry 912's
  precedent.

---
## 912 — [bounded MAIN worker, 2026-08-04 ~10:20] #72 batch 8: full REACHABLE-10 hard tail landed (9 ids), only STRINGID_MAGNITUDESTRENGTH remains

- **State:** master `cf6579e9`. Full `npm test` green (**703 files /
  6,801 passed / 1 skipped**, 0 failures), `npm run build` green.
- **Did:** followed `docs/issue72-hard-tail-scout.md`'s per-id predictions
  (committed this morning) to land the entire REACHABLE-10 list except
  `STRINGID_MAGNITUDESTRENGTH` (explicitly out of scope — new RNG-roll
  capture plumbing): `STRINGID_PKMNPROTECTEDBY` (Sturdy vs. OHKO, confirmed
  deterministic not RNG-gated), `STRINGID_PKMNSXWHIPPEDUPSANDSTORM` (Sand
  Stream, reused the end3-unblocked Tyranitar switch-in staging),
  `STRINGID_PKMNSXBLOCKSY2` (Perish Song vs. Soundproof), `STRINGID_PKMNTOOKFOE`
  + `STRINGID_PKMNLOSTPPGRUDGE` (Destiny Bond + Grudge, real 2-turn
  cast-then-counter-kill repros, player-faster speed order), `STRINGID_PKMNREGAINEDHEALTH`
  (Recover's self-heal, the cheapest of 3 labels — full `sourceLabelOf`
  3-label dispatch implemented per scout §3d, only the Recover branch tested),
  `STRINGID_PKMNHUNGONWITHX` (Focus Band, scout's `rngSeed: 62` staging
  reproduced on the first try), `STRINGID_PKMNSAFEGUARDEXPIRED` (real 5-turn
  expiry repro, not the cheaper direct-rulesContext-surgery shortcut),
  `STRINGID_PKMNTOOKATTACK` (Future Sight, real 3-turn delayed-hit repro).
  All 9 red-verified together via `git stash -- src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` (`tests/presentationStringIssue72Batch8.test.ts`,
  9 `it`s, every one threw the exact completeness-guard error pre-fix). One
  scout divergence found and corrected: §1d's Grudge staging prose had the
  caster's own move losing PP; both real source
  (`battle_script_commands.c:3016-3030`) and the scout's own §1c code sample
  agree it's the *killing* battler's own move — landed per the correct
  mechanism. Census: **48→39 UNRESOLVED** (exact −9, arithmetic-checked).
  ISSUES #72 REACHABLE trimmed to **1** (`STRINGID_MAGNITUDESTRENGTH` only).
- **Next:** `STRINGID_MAGNITUDESTRENGTH` needs new plumbing (Magnitude's 2-10
  `Random()` roll isn't captured anywhere in `rulesContext` yet) — the last
  #72 REACHABLE id, a bounded standalone follow-up. #73 rung B (oracle-pixel
  coverage over the terminal-seam presentation) remains open per entry 911.
- **Notes:** no `tools/compare/**`, kernel machine file, or `battleScene.ts`/
  `core.ts`/`postwin.ts` edits this step (out of scope per brief); no guard
  softening, no new opcodes. `npm test`'s ~10.7-minute wall time this session
  reflects heavy concurrent CPU contention from the supervisor/animation
  sessions also running — the Bash tool auto-backgrounded the run past its
  120s default timeout as in the known PAPERCUT class; recovered by polling
  the task's own output file to a real completion rather than treating the
  auto-background as data loss.

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

