# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 919 — [bounded MAIN worker, 2026-08-04 ~15:25] ISSUES #71 Slice D found NOT APPLICABLE to the main lane's oracle — no src edits landed, docs-only

- **State:** master `519b6bf8` unchanged + this docs commit. No production
  code touched — the step's own premise didn't survive first contact with
  the oracle, so nothing was landed rather than a fitted/regressing wiring.
  `npm test`/`npm run build` unaffected by this commit (docs only); ran both
  anyway per the finish requirement (see commit message for exact numbers).
- **Did:** before writing render code (per the brief's own instruction to
  validate the anchor first), checked whether Battle Scene OFF — this lane's
  oracle — plays the front send-out per-tick animation at all. It does not.
  Four independent sources converge: (1) `bin/oracle info`'s own bootstrap
  description states outright *"Move/effect and species front-sprite
  entrance animations are skipped by the real game"* under
  `battle-scene-off` (contrast `--profile battle-scene-on`: *"front-sprite
  entrance animations play"*); (2) source
  (`reference/pokeemerald/src/pokemon.c:6803-6852`,
  `DoMonFrontSpriteAnimation`'s `HITMARKER_NO_ANIMATIONS`/`SKIP_FRONT_ANIM`
  branch) never launches the movement task under Scene OFF, set once at
  battle init and never cleared; (3) `drawGeneratedOpponentRelease`'s own
  pre-existing doc comment already says so verbatim ("Battle Scene OFF skips
  the later species front-animation callback"); (4) ISSUES #56's closure
  audit found **zero** front-sprite-movement residual in the two committed
  generated-route Scene-OFF dense windows (YOSHI 700/751, MAGNETON 703/751)
  despite YOSHI/COMBUSKEN's real `ANIM_V_JUMPS_H_JUMPS` family — every
  residual frame there is unrelated (display-tail + idle-menu-bounce).
  Wiring `frontSendOutFrameAtTick`/`frontSendOutSpriteFrameAtTick` into the
  OFF-oracle-compared generated seam would therefore *introduce* mismatches,
  not fix any. A speculative implementation was written to sanity-check this
  live (type widening for the front-pic `frame2` asset + the per-tick call
  site), then reverted (`git checkout`) once the evidence closed — tree was
  never left dirty at a bad commit. `PAPERCUTS.md`'s existing "mechanicLab
  send-out fast-forward silently inert under battle-scene-off" entry asserts
  the opposite ("Real OFF-profile battles DO play send-out anims") and is
  wrong per all four sources above; flagged for a solo session to correct
  since supervised workers don't edit `PAPERCUTS.md`. ISSUES #71 rewritten:
  Slice D closed as not-applicable (full reasoning + citations in place of
  the old "gated on the dispatcher" framing), §1e patch-site retirement +
  the coordinated hand-fit retirements are the only main-lane share left.
- **Next:** #71's main-lane share is down to the §1e 56/58 move-window
  patch-site retirement (separate pair-guard-refactor effort) and the
  coordinated KABUTO/MAGBY/ONIX hand-fit retirement (needs the animation
  lane, not solo). Worth a supervisor look: Slice A (already-landed, applies
  `speciesFrontIdleRestOffset`'s static terminal offset at the generated
  route's `coeff===0`) rests on the same `SKIP_FRONT_ANIM` mechanism this
  entry found — flagged, not touched, since it's a separate already-merged
  decision outside this step's scope.
- **Notes:** the cross-lane ask (`frontSendOutFrameAtTick` +
  `frontSendOutSpriteFrameAtTick`) is real, correct, tested work on the
  animation lane's own terms — it simply has no valid consumer in the main
  lane's OFF-oracle render seams, all of which this same real-game mechanism
  gates off. PAPERCUT: the incorrect PAPERCUTS.md claim cost ~15min to
  chase down and rule out via source+oracle-doc+audit cross-checking before
  the (correct) reversal.

---
## 918 — [supervisor, 2026-08-04 ~15:15] R2 landed both lanes; rung-3 dispatcher FOLDED (union 721/6,925 green) → #71 Slice D unblocked and R3 launched (Slice D MAIN + #73 scaffold residuals SIDE)

- **State:** master `519b6bf8` + this docs commit. Post-fold union: full
  `npm test` **721 files / 6,925 passed / 1 skipped**, `npm run build`
  green. Two merges since 917, both all-new-files: the antecedent-boundary
  probe branch (`578bb461`) and `animation-main`'s complete rung-3
  dispatcher (10 commits: FRONT dispatcher + sprite-frame/OAM half +
  measured anchor evidence A=−1 + BACK dispatcher; their suite was green
  at 719 files before fold).
- **Did:** (1) verified+merged MAIN Magnitude (entry 917 — #72 REACHABLE
  now 0, census 39→38, worker corrected the brief's stale 48→47 claim);
  (2) verified+merged the SIDE RAM probe: both #73 residual classes now
  have derived numbers — frozen cursor pose = `floor((2929−2907)/9)%4 = 2`
  from the fixture's own committed A press, and the 3-tick swap edge =
  controller-ack visibility + one-opcode-per-tick + RAM→pixel latch;
  both fixes are compare-scaffold-side, render layer already correct
  (`docs/terminal-seam-antecedent-boundary-probe.md`); (3) folded the
  dispatcher and reran the union myself.
- **Next:** R3 in flight — MAIN: **#71 Slice D** (per-tick front playback
  at the generated battle-start seam via `frontSendOutFrameAtTick`,
  user-directed priority, anchor math briefed from the dispatcher's own
  doc comment + flight fixtures; boundary-ratchet widening for the two
  dispatcher modules pre-authorized as the recorded cross-program
  decision); SIDE: #73 LOSS scaffold fixes targeting 236/236. Then R4:
  WIN-side compare wiring + possibly the selection-rejection advisory
  slice. Wind-down fold + full suite + play-preview rebuild after.
- **Notes:** animation supervisor still live on its lane (Steel Wing
  reconciliation queued next per its ledger); fold again at wind-down.

---
## 917 — [bounded MAIN worker, 2026-08-04 ~14:50] ISSUES #72 REACHABLE backlog CLOSED: `STRINGID_MAGNITUDESTRENGTH` landed (batch 9, the last id); Torment selection-time note is the only open remainder

- **State:** master `9be8304d` + this docs commit. `tests/
  presentationStringIssue72Batch9.test.ts` red-verified (`git stash --
  src/engine/battleResolutionPresentation.ts
  src/engine/factoryBattleScriptFullTurnDecision.ts` throws the exact
  completeness-guard error pre-fix, restored clean after). `npm run
  test:smoke` green (347/347, incl. the frontier ratchet). Full `npm test`
  + `npm run build` green at this docs commit (see this commit's own
  message for the exact numbers).
- **Did:** verified both premises the brief staged before coding
  (`battleScriptRankedBatch1Opcode.ts:130`'s `magnitudeHandler` already
  writes `battleTextBuff1ByteNumber: selected.magnitude`; source confirms
  via `Cmd_magnitudedamagecalculation`'s `PREPARE_BYTE_NUMBER_BUFFER
  (gBattleTextBuff1, 2, magnitude)`, `battle_script_commands.c:8670-8710`).
  The brief's `battleResolutionPresentation.ts:1648` citation had drifted
  (file growth since entry 914) but the substance held — the HITXTIMES/
  STOCKPILE/PERISHCOUNTFELL `battleTextBuff1ByteNumber` number-buffer idiom
  is real and is what this batch reused. Landed: (1)
  `factoryBattleScriptFullTurnDecision.ts`'s `prepareMessage` substitutions
  ternary joins `STRINGID_MAGNITUDESTRENGTH` to the existing STOCKPILE/
  PERISHCOUNTFELL branch; (2) `battleResolutionPresentation.ts`'s
  `messageLines` gets a new `B_BUFF1`-only resolver (template is bare
  `MAGNITUDE {B_BUFF1}!`, no attacker/defender name). `BattleScript_
  EffectMagnitude` (`data/battle_scripts_1.s:1683-1692`) confirms the
  printstring fires before the hit lands. Census regenerated: **39→38
  UNRESOLVED** (exact −1 — the honest number; the brief's "48→47" was stale
  from before batch 8 landed, which had already brought REACHABLE to 1 and
  UNRESOLVED to 39). ISSUES #72 rewritten: the batch-by-batch history
  (1-9, ~400 lines) trimmed to a summary + the two still-open remainders
  (Torment selection-time note, DEAD-id leads) per the ISSUES pruning rule
  — full forensic history stays in git.
- **Next:** #72's REACHABLE backlog is fully closed. Remaining known work:
  Torment/selection-rejection slice (advisory `describeIllegalMoveSelection`
  + 4 resolver branches, scoped in `docs/selection-rejection-subsystem-scout.md`,
  needs supervisor scheduling); #73 WIN-side compare wiring + the two probed
  residual classes (held-cursor freeze, swap-edge typing cascade); #71 Slice
  D still gated on the animation lane's rung-3 dispatcher.
- **Notes:** none — single clean step, no papercuts.
