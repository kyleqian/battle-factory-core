# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 916 — [supervisor, 2026-08-04 ~14:35] R1 landed: #73 wait-cursor gating (LOSS 1/236 → 175/236, cap-kill salvage) + selection-rejection scout merged; R2 launching (Magnitude MAIN + antecedent-boundary probe SIDE)

- **State:** master `5e7457b1` + this docs commit. Full `npm test` 716
  files green at the salvage (1 file re-verified after the pin fix),
  `npm run build` green, differential canary 128/128 vs `b1a7bd34`.
- **Did:** (1) MAIN #73: worker ran to its full 60-min cap with ZERO
  commits but a coherent 247-line tree — supervisor verified and landed
  the salvage (`5e7457b1`): wait-cursor mechanism source-confirmed (two
  quote ids use `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS`→`TextPrinterWait`, no
  arrow; `PLAYERDEFEATEDTRAINER1` keeps its `\p` cursor — WIN-side
  load-bearing), LOSS compare 1/236 → **175/236** (worker 2×, supervisor
  1× independent). One `toEqual` pin (battleResolutionPresentation.test.ts)
  missed the new `noCursor` field — the exact gap the worker was fixing at
  cap; supervisor completed it. Residual 61 frames = held-cursor freeze
  (38) + swap-edge typing cascade (23), mechanisms itemized in the loss
  doc §6, not guess-fit. (2) SIDE scout landed+merged (`e7c58649`):
  selection-rejection subsystem mapped — 6 causes, last-true-wins,
  `printselectionstring` flashes with NO button wait; engine port has no
  mask gaps; census tool structurally blind to `printselectionstring`
  (new finding); Imprison DEAD, other 5 REACHABLE. ISSUES #72 Torment
  paragraph re-scoped accordingly; recommended slice = advisory
  `describeIllegalMoveSelection` + 4 resolver branches (supervisor to
  schedule).
- **Next:** R2 in flight — MAIN: `STRINGID_MAGNITUDESTRENGTH` (#72's last
  REACHABLE id); SIDE: RAM/pixel probe of the antecedent boundary
  (2985-3060) to give both #73 residual classes source-fidelity numbers.
  Then WIN-side compare wiring (consumes cursor findings), then the
  selection-rejection slice if budget allows. #71 Slice D still gated on
  the animation lane's rung-3 dispatcher (re-check at wind-down fold).
- **Notes:** worker was killed mid-final-suite by the cap, not by any
  error — $16.68/229 turns, high-quality forensics; cap-kill salvage
  recipe applied cleanly. Oracle-freshness FAIL remains the docs-only
  false-positive class (no restart). Play-preview rebuild still queued
  for wind-down.

---
## 915 — [supervisor orient, 2026-08-04 ~13:20] Animation fold (Steel Wing partial + rung-3 directive) → master `b1a7bd34`; union green 716/6,887; R1 launched (#73 wait-cursor MAIN + Torment-scoping SIDE scout)

- **State:** master `b1a7bd34` (fast-forward fold of `animation-main`:
  6 Steel Wing partial commits + the 2026-08-04 rung-3 dispatcher
  directive). Union verification: full `npm test` **716 files / 6,887
  passed / 1 skipped**, `npm run build` green. Animation supervisor is
  live concurrently (started 13:06, same 19:06 deadline, DeepSeek
  workers) — the rung-3 send-out dispatcher has NOT landed yet, so #71
  Slice D stays gated; re-check at the wind-down fold.
- **Did:** folded `animation-main` (clean ff — the animation supervisor
  had already merged master in at its own orient); ran the full union
  suite + build myself. Oracle freshness FAIL judged a docs-only false
  positive (harness commits since both service starts: `d47bff3`
  _template-only + `5251112` docs-only) — no restart, sibling session
  live on 8012.
- **Next:** R1 in flight — MAIN: #73 wait-cursor source read + gating
  fix + the 3-frame swap-edge micro-class (target ≥232/236 honest);
  SIDE: docs-only selection-rejection (Torment) re-scoping scout. Then
  #72 `STRINGID_MAGNITUDESTRENGTH` (brief staged), then #73 WIN-side
  compare wiring, then #71 Slice D if the dispatcher lands mid-session.
- **Notes:** play-preview worktree still serves pre-session `630bf3dc`
  on :5199 — rebuild at wind-down so the user can play today's landings.

