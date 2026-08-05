# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 926 — [bounded MAIN worker, 2026-08-04 ~18:05] ISSUES #74 FIXED — generated-route player materialize tail-tick off-by-one, RAM-confirmed on both committed traces, prediction-pinned and exact; YOSHI 700/751 + MAGNETON 703/751 restored

- **State:** master at this docs commit (src fix `src/engine/battleScene.ts`
  + test update, prior commit). `npm test` **721/721 files, 6,927
  passed/1 skipped**, `npm run build` green. `npm run compare --
  factory-arbitrary-intro-yoshi-off --summary` **700/751** (run twice
  fresh, byte-identical); `... -magneton-off --summary` **703/751** (same,
  twice fresh byte-identical) — both exactly the predicted counts pinned
  *before* the post-fix rerun, frames 640/621 now matched, zero newly-
  mismatched frames. Insurance spot-check `battle2-player-sendout-dense`
  **170/170**, unmoved.
- **Did:** Step 1 (probe): RAM-probed the ACTUAL committed
  `factory-arbitrary-intro-{yoshi,magneton}-off` battle-lab scenarios
  directly (not just the banked KADABRA scenario) around the player
  materialize/settle boundary. Both traces show the identical
  species-agnostic 13-value descent (`14,13,...,2,0`) `docs/probes/
  materialize-hitmarker-gating/` already found — confirming it on the two
  actually-regressed leads (GRIMER, DELCATTY). Reconciling RAM ticks with
  displayed pixels via this codebase's own established one-tick
  write→display lag convention pins the exact defect:
  `drawGeneratedPlayerMaterialize`'s mechanism-1 window
  (`PLAYER_MATERIALIZE_START_TICK.._END_TICK`) consumes only
  `MATERIALIZE_Y2_TABLE`'s first 11 of 12
  entries, so the table's final value (`2`) is never drawn — the very next
  tick (`PLAYER_MATERIALIZE_SETTLE_START_TICK`, 1664) falls straight to
  `generatedPlayerMaterializeSettleY2`'s species branch, which drew flat
  `y2=0` for every non-ONIX species. Frames 640 (YOSHI) and 621 (MAGNETON)
  are exactly `playerVisualT=1664` in both traces — the shared missing
  tick. This is why the old (pre-entry-894) all-species ONIX-wobble code
  matched the oracle here: `PLAYER_SETTLE_WOBBLE_Y2_TABLE[0]` independently
  RAM-derives to the same value (`2`) — two unrelated derivations agreeing
  by coincidence, not because the wobble table is broadly correct. Verdict
  **(a)**, crisp, with an exact named tick boundary — full evidence banked
  at `docs/probes/generated-player-materialize-tail-tick/README.md`
  (RAM dumps included).
  Step 2 (fix): `generatedPlayerMaterializeSettleY2` now special-cases
  `playerVisualT === PLAYER_MATERIALIZE_SETTLE_START_TICK`, returning
  `MATERIALIZE_Y2_TABLE`'s last entry for every species (a no-op for ONIX,
  which was already coincidentally correct there) before falling through
  to the existing species-gated/flat logic for every later tick. No touch
  to `PLAYER_MATERIALIZE_START_TICK`/`_END_TICK` (shared with the
  out-of-scope canonical `drawPlayerMaterialize` path) or to
  `battleMenu.ts` (out of scope per brief). Red-verified: reverting the
  fix flips 3 of `tests/generatedPlayerMaterializeSettleSpecies.test.ts`'s
  7 cases, which were pinning the pre-fix flat-0 behavior at this exact
  tick; updated in the same commit to pin the corrected value (all 7
  green post-fix).
- **Next:** #74 closed below. Standing: #39, #55. Entry 922's flagged
  possible-latent bug in `PLAYER_SETTLE_WOBBLE_Y2_TABLE`'s ONIX-only
  partial application (ticks 1665-1669, the genuine per-species
  `BACK_ANIM_V_SHAKE` portion) is untouched and still open — this step's
  probe found no new evidence bearing on it (only the shared tail tick,
  1664, was ever in scope here).
- **Notes:** no PAPERCUT. The RAM-probe driver script and the app-side
  `renderAppTrace`-instrumented clock-mapping script were both scratch
  (not committed), same convention as this run's other RAM probes; only
  the trimmed evidence windows are banked under `docs/probes/`.

