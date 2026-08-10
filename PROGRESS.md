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

## 1069 — [MAIN worker, 2026-08-10 night] **Rank-2 ability family (status-immunity cleanup) promoted: 106 → 9 ability gaps**

- **State:** tree is green: full suite **856 files / 8,317 passed / 1
  skipped**, production build, `npm run typecheck` clean. `docs/gate6-coverage-manifest.md`
  regenerates byte-idempotent and now reads **118 item join gaps / 9 ability
  join gaps** (was **118 item / 106 ability** at entry 1068 — item axis
  untouched, out of scope). 9 remaining ability rows: Rank-4's Skill
  Swap/Role Play, Rank-5's five Own Tempo guard moves, plus two new explicit
  exceptions below.
- **Did:** consumed the already-banked 2026-07-29 evidence
  (`docs/immunity-abilities-ground-truth.md`,
  `tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json`,
  `tools/probe/probe-immunity-limber-off.py`, both seed receipts) — no new
  oracle receipts authored. `tools/extract/extract-level50-move-parameterization.ts`
  adds a generic route-certificate walk (`immunityRouteEvidence`, reusing the
  same graph/program BFS infra as Color Change/King's Rock) proving each
  candidate's entry script reaches a `moveendall`/`moveendto`/`moveendfromto`
  handoff whose `Cmd_moveend` state range includes state 4
  (`MOVEEND_IMMUNITY_ABILITIES`), unlike Color Change/King's Rock this needs
  no target `datahpupdate` since state 4 fires unconditionally for every
  move reaching the normal moveend tail. Candidates **99** (selector: every
  ability-unsupported row minus Rank-4's 2 + Rank-5's 5), promoted **97**,
  two new exceptions — `MOVE_ASSIST`/`MOVE_METRONOME` end in a dynamic-dispatch
  opcode (`jumptocalledmove`/`metronome`) with no static moveend node of
  their own, a genuine finding the worklist's 99/99 prediction missed. Also
  fixed a real latent bug in the shared `onDamageCallReturns` helper (used by
  the graph-route BFS's `call`-edge validity check): it only checked a call
  target's *own* last statement for `return`, missing targets like
  `BattleScript_WeatherFormChanges` that fall through a loop label before
  returning — now does a full reachable-subgraph search. This only relaxes a
  false negative (strictly more permissive), verified by rerunning the full
  suite including Color Change's/King's Rock's own batches unchanged.
  `tools/report/gate6-coverage-manifest.ts` adds a parallel `immunityAudit`/
  `immunityMoveEndRow` checkpoint (King's Rock's shape) plus category
  validation in `sourceProvenFamilies`/`parameterizedHook`/
  `sourceProvenHookEvidence`. `tests/statusImmunityHookJoinBatch.test.ts`
  (Tier-1, `kingsRockHookJoinBatch` shape) and
  `tests/statusImmunityOracleEvidence.test.ts` (pins both banked receipts
  byte-precisely, `kingsRockOracleEvidence` shape) are new and green.
  Reran `probe-immunity-limber-off.py` fresh once — reproduced the
  610839776-seed receipt byte-identically. Updated pinned counts in
  `tests/level50MoveParameterization.test.ts` (348→445 ability categories,
  194→291 source-proven, 106→9 unsupported; `MOVE_WITHDRAW`/`MOVE_RAIN_DANCE`/
  `MOVE_SUNNY_DAY`/`MOVE_PROTECT` flip from ability-unsupported to
  immunity-family-proven) and `tests/gate6CoverageManifest.test.ts` (adds
  `IMMUNITY_PROOF_PATHS`, six numeric re-pins).
- **Next:** continue the ordered family-level Gate-6 worklist from the
  verified **9 ability / 118 item** row-gap frontier. Ranks 4 (2 rows,
  Skill Swap/Role Play) and 5 (5 rows, Own Tempo guards) remain on the
  ability axis; Rank 1 (item, 191 rows) is in flight on the side lane.
- **Notes:** no engine, controller, round outcome, or canonical window
  changed; `src/engine/battleScriptMoveEndOpcode.ts` was read, not edited
  (already audited faithful in `docs/immunity-abilities-ground-truth.md`).
  Item-axis rows, Rank-1/3/4/5 families, and Shell Bell untouched (out of
  scope). `docs/gate6-family-worklist.md` gets a one-line Rank-2 STATUS note
  only, per side-lane ownership of the rest of that doc.
