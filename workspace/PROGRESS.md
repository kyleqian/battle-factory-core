# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1322 — [main worker, 2026-08-17] **ISSUES #71 §1e retirement Rung 0 + Rung 1 landed: shared helper + first 14-move batch, zero FINDINGs**

- **State:** `src/animation/speciesIdleAnim.ts`, `src/engine/battleScene.ts`,
  `tests/animation/speciesIdleAnim.test.ts` edited across two commits
  (`7a08eede` Rung 0, `a6f80a1b` Rung 1). `npm test` **1,066 files /
  10,037 passed (+4 vs 1320's 10,033, all from Rung 0's new unit tests) /
  223 skipped**, `npm run build` and `npm run typecheck` green after each
  commit. `compare:differential -- battle-command-generated-off.json
  --base 7a08eede --summary` (Rung 1 vs its parent): **128/128
  byte-identical**, confirming the OFF-profile route is untouched.
- **Did:** followed `docs/sendout-1e-retirement-design.md` §5 exactly.
  **Rung 0:** added `speciesFrontIdleRestOffsetOrZero` next to
  `speciesFrontIdleRestOffset` in `speciesIdleAnim.ts`, pinned with 3 new
  unit tests (ONIX/RATTATA nonzero, PIDGEOT zero). **Deviation from the
  doc's literal scope:** did NOT widen `battleScene.ts:1252`'s import in
  this commit — the doc's own "no call site changed yet" framing for
  Rung 0 means the new name is an unused import under this project's
  `noUnusedLocals` tsconfig, which fails `npm run build`; moved the
  import widening into Rung 1's commit instead (its first real call
  site), keeping every commit green per AGENTS.md's own bar. No ratchet
  impact (§4: the ratchet only tracks import specifiers). **Rung 1:**
  re-grepped all 14 call sites fresh (line numbers had drifted a few
  lines from the doc's citations, mechanism identical) and, per site,
  confirmed the enclosing `playerToOpponent`/`opponentToPlayer`
  throw-guard proves the substituted expression (`view.target.species`
  at 13 sites, `opponentBattler.species` at SANDSTORM where that local
  is already bound) equals the "ONIX" literal being replaced, then
  swapped the fallback idiom to the Rung-0 helper. Throw-guard blocks
  untouched everywhere. **Zero FINDINGs** — every one of the 14 sites
  matched the doc's predicted shape exactly (all ONIX-literal pair-locks,
  no site disagreed).
- **Verification:** grep sanity —
  `speciesFrontIdleRestOffset(` count 123→109,
  `speciesFrontIdleRestOffsetOrZero(` 0→14, total unchanged (no site
  silently dropped). Named per-move Tier-1 files for the 14 moves (30
  files found via `find`/`grep` first, per the doc's filename-drift
  warning — all standard-pattern, no mapping surprises this rung): 96/96
  tests green.
- **Next:** Rung 2 (14 more moves: BRICK_BREAK, NIGHT_SHADE, MEMENTO,
  SPITE, HAZE, DISABLE, PROTECT, MAGIC_COAT, LIGHT_SCREEN, WRAP, GROWTH,
  TOXIC, POISON_TAIL, IRON_TAIL, per the doc's table) is next in the
  ladder — same procedure, re-grep line numbers fresh first. Did not
  attempt it this session: by the time Rung 1 was committed and
  insurance-checked, elapsed time was past the step's ~25 min stretch
  threshold for starting another batch that must also finish and commit
  within the 45 min cap. Rungs 3-8 remain queued behind it; Rung 9
  (hand-fit swap-over) stays blocked on the animation lane's rung-4 back
  dispatcher, unchanged.
- **Notes:** no PAPERCUT. One process note for future rungs: `npm test`
  alone (~130s) exceeds the harness's 120s default foreground timeout
  and gets auto-backgrounded — poll its own output file in a blocking
  loop (not `ScheduleWakeup`/`Monitor`) rather than waiting on a
  notification, per this step's own synchronous-verification
  requirement; a `timeout` bump on the same call also works.

---
## 1321 — [main worker, 2026-08-17] **ISSUES #97-B rung 1: turn-6 reopen-press 3-tick freeze landed; turn-5's own sibling tried both named variants, neither flips its dense window, reverted to green**

- **State:** `src/engine/battleScene.ts` + `tests/fightSubmenu.test.ts`
  edited (new commit pending). `npm test` **1,066 files / 10,034 passed
  (+1) / 223 skipped**, `npm run build` green. Full 9-trace family sweep
  (`turn5-action-off`, `turn6-reopen-off`, `turn5-reset-off`,
  `turn5-confirm-off-{a,b}`, `turn5-resolve-off-{a,b,c,d}`) re-run
  before/after: **zero regressions, zero count changes anywhere** (see
  `ISSUES.md` #97-B for the full per-trace table).
- **Did:** followed `docs/turn5-bounce-recalibration-probe.md`'s named fix
  shapes (§4 item 1, §6f). Turn 6's own reopen-press special case
  (`drawTurn6FightSubmenuWindow`'s `t < revealTick` branch, previously NO
  hold at all) now freezes its fed bounceTick for 3 ticks via a new
  exported helper `turn6ReopenBounceTick`, red-verified then landed
  green — matches §1's RAM-proven 3-tick `sinIndex` hold, and (per §6c's
  own prediction) is a provable no-op on `turn6-reopen-off.json`
  specifically (11/46 unchanged), landed anyway for RAM correctness and
  because it may close other family traces. Turn 5's own reopen-press
  special case (`drawActionMenuIdleWindow:8307-8310`) was tried both ways
  the doc named — frozen-at-press-tick and advancing-unshifted — and BOTH
  produced byte-identical pixels to the unfixed baseline across ticks
  5927-5931 (confirmed via `git stash` A/B). Root-caused why: direct
  `menuIdleBounce` enumeration shows no bounceTick reachable by either
  variant (~2069-2097) ever yields `healthboxY2=1` — the real defect
  needs roughly **+8 more ticks** than either variant can feed it, i.e.
  it's a field-specific lag (same *class* as the already-known §6c/§6d
  ~11-tick healthbox lag for window B), not a hold-duration bug at all.
  Per the step's own contingency, reverted the window-A edit to green
  rather than land a non-conforming change, and banked this finding.
- **Next:** window A needs its own lag-magnitude tracing pass (mirror of
  §6c/§6d's method) before any further fix attempt — do not re-try a
  "wider hold" variant without new evidence, that door is now closed.
  The SIDE-lane's parallel §6c/§6d healthbox-lag tracing (window B) is
  the more promising unblock; once landed, re-check whether the same
  mechanism also explains window A's own gap.
- **Notes:** no PAPERCUT. `git checkout -- battleScene.ts` mid-session (to
  strip a temporary red-test negative-control edit) accidentally reverted
  the whole uncommitted window-B fix too, not just the temp probe — cost
  ~2 min to redo from the diff already reviewed; worth remembering
  `checkout --` on a file with a real pending fix nukes everything, not
  just the last edit.

---
## 1320 — [main worker, 2026-08-17] **ISSUES #71 remainder: §1e patch-site retirement + hand-fit retirement design doc committed (docs-only, no behavior change)**

- **State:** `docs/sendout-1e-retirement-design.md` added (new commit
  pending). `npm test` **1,066 files / 10,033 passed / 223 skipped**
  (unchanged from 1319's baseline), `npm run build` green. No `src/`/
  `tests/` edit this step.
- **Did:** live-re-derived the §1e `speciesFrontIdleRestOffset` census
  against `docs/send-out-live-wiring-consumer-map.md` (2026-08-03 scout):
  site count grew **58 → 125 total** (§1e-class specifically 58 → 121,
  spanning 108 move branches, up from ~103) as `renderSceneOnMovePresentation`
  nearly doubled (~15,700 → 27,540 lines) from new move ports since the old
  scout, each copy-pasting the same ONIX-literal pair-lock pattern. Found
  two already-generic template call sites (`sceneOnPresentation.ts`
  DRAGON_RAGE/SHADOW_PUNCH) proving the target shape already exists in
  production. Confirmed **Slice C (hand-fit throw-guards for MAGBY-back/
  ONIX-back/KABUTO-front) is done and still live**, unchanged since
  2026-08-03 entry 891 — the only genuinely open main-lane-actionable work
  is the §1e patch-site consolidation; full hand-fit retirement is blocked
  on the animation lane's rung-4 back dispatcher (not started, not main's
  program). Designed a minimal mechanism (one fallback-idiom helper,
  `speciesFrontIdleRestOffsetOrZero`, no new dispatcher) and a 9-rung
  ladder (Rung 0 = helper + test; Rungs 1-8 = the 108 moves batched ~14
  each; Rung 9 = named-but-deferred hand-fit swap-over, blocked on the
  cross-lane dependency). Verified the boundary ratchet
  (`tests/animation/animationBoundaryRatchet.test.ts`) needs **zero
  widening** for every rung — `speciesFrontIdleRestOffset` is already
  imported into the one allowlisted consumer (`battleScene.ts`). Found the
  108 move windows are ON-profile-legacy with **no committed
  `tools/compare/traces/` coverage at all**; real verification is the
  per-move Tier-1 fixture-hash tests instead, one confirmed gap (HARDEN,
  zero test coverage) flagged for a pin before that rung touches it.
- **Docs:** new design doc only; `ISSUES.md` #71 left as-is (its own
  remainder text already matches this doc's scope — no edit needed since
  nothing closed this step).
- **Next:** a future worker can pick up Rung 0 directly from
  `docs/sendout-1e-retirement-design.md` §5. #97 turn5/6 bounce-tick drift
  remains open on its own chain; #71/#73-adjacent filler otherwise per
  standing priorities.
- **Notes:** no PAPERCUT. Design-only step, no oracle query needed (per
  the brief) — every citation is a live `grep -n`/`npx tsx` re-derivation
  against this session's own HEAD, not copied from the old scout.
