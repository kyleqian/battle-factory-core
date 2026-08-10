# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1068 — [MAIN worker, 2026-08-09 night] **Shell Bell family complete: OFF receipt, census/manifest promotion, both sibling batches green**

- **State:** tree is green: full suite **854 files / 8,312 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  regenerates byte-idempotent and now reads **118 item join gaps / 106
  ability join gaps** (was **195 item / 106 ability** at entry 1067 — Shell
  Bell moves **77** previously-unsupported item rows to `source-proven-family`
  and adds a second category to the **105** rows King's Rock already proved,
  for **182** total item-axis source-proven rows; King's Rock's 105 stay a
  full subset of Shell Bell's 182). `npm test`'s default heap now needs
  `NODE_OPTIONS=--max-old-space-size=8192` (added to the `test` script,
  matching the existing `build`/`typecheck` precedent) — the Shell Bell
  census duplicates full graph/program route arrays for 182 more rows,
  pushing `level50-move-parameterization.json` past Node's default heap
  under plain `vitest run`; this was a real OOM on the unmodified command,
  not a flake.
- **Did (rung A):** `tools/battle-lab/mechanic-shell-bell-heal-off.json` /
  `mechanic-shell-bell-control-off.json` stage a slower, defensively-built
  Shuckle (Shell Bell holder, item 219) against a faster no-item Swellow,
  both locked to 100%-accuracy Pound. Swellow's earlier action this same turn
  damages Shuckle first (127→122 HP), satisfying `gBattlerAttacker !=
  gBattlerTarget` / `hp != maxHP` / `hp != 0` on Shuckle's own qualifying hit
  without needing a second turn (the staging trap named in the brief). Holder
  arm heals `max(1, floor(7/8))=1` HP (122→123); no-item control arm's HP
  never moves past the incoming Pound. Both arms consume byte-identical
  action-RNG values/order/counts and spend exactly 1 PP each side.
  `tools/probe/probe-shell-bell-heal-off.py` captures each arm through its
  own `EmeraldOracle` instance (two instances cannot share one process —
  observed native segfault) and merges the two raw ledgers in a pure-Python
  pass; reproduced byte-identical across two independent fresh two-arm runs.
  Committed alone first (`0d9c309c`).
- **Did (rung B):** `tools/extract/extract-level50-move-parameterization.ts`
  adds `shellBellRouteEvidence`, transforming (not recomputing)
  `colorChangeRouteEvidenceByMove`'s 182 already-proven witnesses into Shell
  Bell witnesses retargeted at `MOVEEND_KINGSROCK_SHELLBELL`/state 12, per
  entry 1067's reuse recipe. Candidates **183** (power != 0, same population
  as Color Change), promoted **182**, exception **1** (`MOVE_FUTURE_SIGHT`,
  its own `battle_util.c:1816` `IGNORE_SHELL_BELL` reason — kept textually
  distinct from Color Change's state-3 `moveendfromto` skip reason for the
  same move, per entry 1067's finding). `hooks.item` is generalized from a
  King's-Rock-only slot to an array of families (mirroring `hooks.ability`'s
  existing shape), since King's Rock and Shell Bell now legitimately overlap
  for 105 moves. `tools/report/gate6-coverage-manifest.ts` adds a parallel
  `shellBellAudit`/`shellBellMoveEndRow` checkpoint (King's Rock's shape) plus
  category validation in `sourceProvenFamilies`/`parameterizedHook`.
  `tests/shellBellHookJoinBatch.test.ts` (Tier-1, `kingsRockHookJoinBatch`
  shape) and `tests/shellBellOracleEvidence.test.ts` (pins the rung-A
  receipt, `kingsRockOracleEvidence` shape) are new and green. Updated three
  pinned counts in `tests/level50MoveParameterization.test.ts` and eleven in
  `tests/gate6CoverageManifest.test.ts` that hard-coded the old 195/105
  King's-Rock-only item state.
- **Next:** continue the ordered family-level Gate-6 worklist from the
  verified **106 ability / 118 item** row-gap frontier (side lane's
  `docs/gate6-family-worklist.md` still cites the pre-Shell-Bell 195 number
  in its own ranked list — out of scope for this step, side lane's to
  refresh).
- **Notes:** no engine, controller, round outcome, barrier pin, or canonical
  window changed; `src/engine/battleScriptMoveEndOpcode.ts` was read, not
  edited (already audited faithful at entry 1067). `docs/gate6-family-worklist.md`
  intentionally untouched (side-lane ownership).

## 1067 — [MAIN worker, 2026-08-09 night] **Shell Bell source audit landed; census/receipt/promotion still open (honest partial)**

- **State:** tree is green: full suite **852 files / 8,305 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  is untouched and still reads **195 item join gaps / 106 ability join gaps**
  (unchanged from entry 1066 — this step added a doc only, no census/manifest
  edit, so there is no before/after delta to report yet).
- **Did:** `docs/shell-bell-moveend-ground-truth.md` re-derives the
  `HOLD_EFFECT_SHELL_BELL` arm of `ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL)`
  (`battle_util.c:3787-3806`), the four `shellBellDmg` recording sites inside
  `Cmd_datahpupdate` (`battle_script_commands.c:1870-1983`), and the two
  explicit `IGNORE_SHELL_BELL` suppression sites (`Cmd_painsplitdmgcalc`
  `battle_script_commands.c:8063`; delayed Future Sight/Doom Desire
  `HandleWishPerishSongOnTurnEnd` `battle_util.c:1816`) — all with exact
  file:line citations, no prose glosses. Confirmed
  `src/engine/battleScriptMoveEndOpcode.ts:883-969`'s `HOLD_EFFECT_SHELL_BELL`
  arm is a faithful line-for-line port of source (same eight ordered guards,
  same `max(1, floor(shellBellDmg/holdEffectParam))` heal, same reset-to-0,
  same `BattleScript_ItemHealHP_Ret` jump) — **no engine fix was needed**, so
  this step stayed pure proof work. Derived the finite selector: Shell Bell's
  is *not* a `moves.json` flag (unlike King's Rock's `FLAG_KINGS_ROCK_AFFECTED`)
  — it's "does the move reach a successful `datahpupdate BS_TARGET`", the same
  route property this run already source-proved for the Color Change ON_DAMAGE
  family (`power != 0` selector, 183 candidates / 182 proven / 1 Future Sight
  exception). The doc shows Shell Bell's own Future Sight exclusion reason
  (`battle_util.c:1816` explicit poison) is **not** the same as Color Change's
  (`moveendfromto` state-3 skip) — state 12 is inside Future Sight's delayed
  `[11,14]` moveend range, so this is a genuinely distinct citation, not an
  inferred analogy.
- **Next:** the remaining three deliverables are real implementation work,
  not proof-reading, and did not fit this session's cap: (1) wire
  `coverage.hookCatalogs.item.shellBell` into
  `tools/extract/extract-level50-move-parameterization.ts` by transforming the
  already-computed `colorChangeRouteEvidenceByMove` witnesses (182 rows) into
  Shell Bell witnesses retargeted at `MOVEEND_KINGSROCK_SHELLBELL`/state 12
  (reuse the routes, don't recompute them — `kingsRockRouteEvidence` is the
  shape to match); (2) a Battle Scene OFF receipt (three-party `mechanicLab`
  fixture, Shell Bell holder vs. no-item control, run twice for byte-identity)
  named like the King's Rock set (`tools/battle-lab/mechanic-shell-bell-heal-off.json`,
  `tools/probe/probe-shell-bell-heal-off.py`,
  `tools/probe/receipts/shell-bell-heal-off.json`); (3)
  `tests/shellBellHookJoinBatch.test.ts` + `tests/shellBellOracleEvidence.test.ts`
  and the matching `gate6-coverage-manifest.ts` promotion (its per-move
  hook-join validator hard-couples any `hooks.item.status` change to family
  evidence, so census and manifest wiring cannot be split — do both together).
  Do not promote rows to `source-proven-family` without the real receipt.
- **Notes:** no engine, controller, round outcome, barrier pin, generated
  JSON, or canonical window changed. `docs/shell-bell-moveend-ground-truth.md`
  is standalone and doesn't yet feed the manifest — the manifest's 195/106 gap
  counts are exactly what they were at entry 1066.

## 1066 — [supervisor, 2026-08-09 night] **Orient fold: Karate Chop checkpoint + orphan printfromtable audit; union green**

- **State:** master union is green: full suite **851 files / 8,302 passed / 1
  skipped**, production build, both oracle freshness checks PASS. The
  animation supervisor is live concurrently (Codex Sol/high, same deadline)
  and fast-forwarded `animation-main` onto the fold — benign convergence.
- **Did:** folded `animation-main` (4 commits, Karate Chop source-complete
  resume checkpoint `b67b45f6`..`9134da4a`, merge `96e3441c`; no coverage
  claim — Karate Chop stays an evidence checkpoint). Swept orphaned branches
  at orient and folded `worker/side-20260808-190940` (2026-08-08 Luna
  printfromtable family audit: doc + generated JSON + extractor + pinned
  test). Its scout-time pin (40 registered tables / 3 missing families) had
  drifted: all three families landed 2026-08-09, so the pin now records **43
  registered / 0 missing**, leaving the short `gStatUpStringIds` table (5 of
  6 rows) as the one open remainder; doc carries a STATUS note.
- **Next:** round 1 — main lane proves the **Shell Bell** family (bounded
  successful-damage census, OFF oracle receipt, Tier-1 sibling batch,
  manifest promotion); side lane authors the ranked **Gate-6 family
  worklist** regrouping the remaining 106 ability / 194 item row gaps.
- **Notes:** no engine, controller, round outcome, barrier pin, or canonical
  window changed; the only test delta is the honest printfromtable re-pin.
