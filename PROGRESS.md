# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 929 — [supervisor, 2026-08-04 ~19:10] R2 both lanes landed + animation STEEL_WING fold; #72 fully closed (retitled settled record); R3 launched (post-terminal timing scout + no-PP/Choice-lock oracle verification)

- **State:** master `5993ff41` + this docs commit. Union checks post-merge:
  `win-terminal-window-off` **389/389**, `loss-terminal-window-off`
  **236/236**, smoke 347/347, `steelWingEvidence` 2/2, new
  `battleScriptSelectionRejection` 20/20. Workers' own full-suite gates:
  MAIN 722 files / 6,947 passed / 1 skipped (run twice) at `05d7dccf`;
  SIDE 721 files / 6,927 at `5ef59e60`. Build green both.
- **Did:** (1) verified + kept R2-MAIN's selection-rejection advisory slice
  (#72 remainder: shared six-cause resolver mirroring
  `TrySetCantSelectMoveBattleScript` incl. two source asymmetries the
  bitmask lacks; `rejectionReasonBySlot`; 4 STRINGIDs; Torment
  oracle-verified byte-for-byte; boundary contract untouched). Retitled
  #72 to a settled record (FATAL-guard user decision + the probe's
  button-gated dismiss-timing correction retained for future option-(a)).
  (2) verified + merged R2-SIDE (`5ef59e60`): terminal-scaffold party
  identity reconciled generically (`hp:0`), §5 crash closed, windows hold
  389/389 + 236/236; NEW blocker documented in probe doc §6 — the
  post-`finishBattle` return-to-lobby presentation has no real timing
  model (WIN phase renders black; LOSS races to lobby in 28 ticks vs
  oracle 800+). (3) folded `animation-main` (STEEL_WING exact, 108/276
  exact, no main-program ask in its top entry). (4) PAPERCUTS: added
  line-pin census entry (R2 worker flag); R1's suspected-slow `npm test`
  was load, not a regression — not filed.
- **Next:** R3 in flight — SIDE: read-only dense-probe scout of the
  post-terminal span (WIN 5012+, LOSS 3232+) producing the
  return-to-lobby ground-truth timeline + consumer map (docs only, arms
  the next session's implementation). MAIN: stage the two skipped
  oracle-verification traces for `NOPPLEFT`/`ITEMALLOWSONLYYMOVE` (and
  `PKMNHASNOMOVESLEFT` if stageable) against the real ROM. Then
  wind-down: fold re-check, ONE full union suite, preview rebuild.
- **Notes:** #73's next implementation step is the §6 subsystem (src work,
  next session's headline candidate). Deadline 21:17 holds comfortably.

---
## 928 — [bounded MAIN worker, 2026-08-04 ~19:15] ISSUES #72 remainder CLOSED — selection-rejection advisory slice (scout option (b)) landed + oracle-verified

- **State:** master `05d7dccf` (this docs commit next). `npm test` **722
  files / 6,947 passed / 1 skipped** (up from 721/6,927 — the 20 new cases),
  run twice independently, both exit 0. `npm run build` green.
  `printstring-literal-census.ts` rerun: **38 UNRESOLVED, unchanged**
  (structurally blind to `printselectionstring`, as documented — not
  re-fixed this step).
- **Did:** landed the scout's recommended option (b) verbatim, no
  `submitBattleDecision`/`legalDecisions`/`battleDecisionBoundary.ts`
  contract change. (1) `battleScriptActionAdmission.ts`: extracted the six
  `TrySetCantSelectMoveBattleScript` per-cause predicates so
  `checkBattleScriptMoveLimitations`'s bitmask and the new
  `describeIllegalMoveSelection` share logic (behavior-preserving refactor,
  confirmed via the existing Torment opcode suite); the new resolver mirrors
  source's exact 6-cause unconditional-overwrite order (last-true-wins),
  including the two real per-function asymmetries source itself has
  (Disabled's extra `!= MOVE_NONE` guard, Torment's extra `!= MOVE_STRUGGLE`
  guard — neither present in `CheckMoveLimitations`). (2) Wired alongside
  `legalMoveDecisions` as `legalMoveSelectionRejections`
  (`factoryBattleScriptFullTurnDecision.ts`) and surfaced as
  `rejectionReasonBySlot` parallel to `legalMoveBySlot`
  (`battleCommandPresentation.ts`). (3) Added the 4 STRINGID resolvers in
  `battleResolutionPresentation.ts`
  (`resolveMoveSelectionRejectionMessageLines`/`resolveNoMovesLeftMessageLines`);
  `PKMNCANTUSEMOVESEALED` stays unresolved on purpose (DEAD Imprison
  carrier), guard stays fatal. (4) 20 Tier-1 tests
  (`tests/battleScriptSelectionRejection.test.ts`), red-verified via
  `git stash` (all 20 fail without the src changes). (5) **Oracle-verified**:
  staged the exact two-turn Torment scenario via `mechanicLab
  overrides.parties` (BUTTERFREE TACKLE/GUST vs. MURKROW TORMENT,
  battle-scene-off) and read the captured PNGs directly — the real ROM
  prints "BUTTERFREE can't use the same / move in a row due to the TORMENT!"
  byte-for-byte matching the resolver's output. Found and recorded a
  scout-doc correction in the same probe: the message needs an actual button
  press to dismiss (tested 100+ frames with none — no dismissal), contra the
  scout's "no waitmessage -> no button needed" inference; doesn't affect
  anything landed this step (no live dismiss-timing UI built), but matters
  for whoever eventually builds option (a). The no-PP/Choice-lock ORDERED
  STRETCH traces were **not attempted** (said explicitly, per the brief's own
  allowance) — only the Torment cause is oracle-verified; the other three
  reachable causes are pinned by Tier-1 tests against the extracted string
  table only.
- **Next:** #72's selection-rejection remainder is closed (see ISSUES.md).
  Standing: #39, #55, #71 (§1e + hand-fit retirements), #73 (WIN toward
  241/241, scaffold party-identity gap).
- **Notes:** no PAPERCUT this step. Regenerating
  `docs/ability-item-parity-census.md` was required (a pinned line-number
  citation in `tools/report/ability-item-parity-census.ts` pointed at
  `battleScriptActionAdmission.ts:2764`, which the new code shifted to
  `:2990`) — same deliberate-regen discipline as the move census, updated in
  the same commit.

---
## 927 — [supervisor, 2026-08-04 ~18:15] R1 both lanes landed: #74 FIXED+CLOSED (materialize tail-tick, baselines restored) + WIN window 65/65 -> 389/389 merged; R2 launched (selection-rejection slice + terminal-scaffold party reconciliation)

- **State:** master `bba958a3` + this docs commit. Post-merge supervisor
  reruns: `win-terminal-window-off` **389/389**, `loss-terminal-window-off`
  **236/236**, `factory-arbitrary-intro-yoshi-off` **700/751** (baseline
  restored), smoke 347/347, materialize species test 7/7. Workers' own
  full-suite gates at their commits: 721 files / 6,927 passed / 1 skipped,
  build green (both lanes).
- **Did:** (1) verified + kept R1-MAIN's #74 fix (`bea22b65`) — 11-of-12
  `MATERIALIZE_Y2_TABLE` consumption off-by-one, RAM-confirmed on both
  committed traces, prediction-pinned exact; #74 deleted from ISSUES.
  (2) verified + merged R1-SIDE's WIN extension (`9b0a04dc` ->
  `bba958a3`): pure trace-data change, 389/389 twice-run; #73 updated —
  remaining blocker for BOTH windows' true ends is the scaffold
  party-identity gap (probe doc §5). (3) PAPERCUTS send-out-fast-forward
  correction: found already corrected by the prior session; no edit needed.
- **Next:** R2 in flight — MAIN: ISSUES #72 remainder, selection-rejection
  advisory slice (scout option (b) adopted verbatim: pure
  `describeIllegalMoveSelection` + `rejectionReasonBySlot` + the 4
  unresolved STRINGIDs; no boundary-contract change). SIDE: reconcile the
  terminal-scaffold party identity in `tools/compare/appTrace.ts` and
  extend WIN through fade/handoff + LOSS through its handoff tick. Then
  wind-down: fold check, ONE full union suite, preview rebuild.
- **Notes:** orient oracle-freshness FAIL was the docs-only false-positive
  class again (2 harness commits since service start, both docs/template
  — verified before accepting). Session deadline 21:17; R2 caps fit.
