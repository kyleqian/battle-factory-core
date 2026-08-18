# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 1319 — [main worker, 2026-08-17] **ISSUES #96 remainder fixed: enemy-picker ball-roll sliver — battle1-swap family now 19/19 EXACT, ISSUES #96 fully closed**

- **State:** `src/engine/factorySwapPresentation.ts` +
  `tests/factorySwapPresentation.test.ts` edited (`68235a08`). `npm test`
  **1,066 files / 10,033 passed (+2) / 223 skipped**, `npm run build`
  green, `tests/factorySwapPresentation.test.ts` + `tests/ballAnim.test.ts`
  green in isolation too.
- **Did:** implemented the probe-named fix from `docs/factory-swap-enemy-
  picker-probe.md`'s 2026-08-17 section (citations verified against live
  code first — line numbers had drifted slightly but the mechanism held
  exactly as described). Replaced `advanceFactorySwapPresentation`'s single
  `selectedPalette` boolean (which blanket-excluded ALL ball-roll RNG
  consumption for the entire `enemySwitch`/`playerSwitch` transition) with
  a per-ball `perBallRollEligible` array keyed off each ball's own
  `cycledToEnemy` flag (`factorySwapEnemyBallCycleVisuals`/
  `factorySwapPlayerSwitchBallCycleVisuals`, evaluated at the tick's own
  `phaseElapsed`) — enemySwitch balls roll while NOT YET cycled to the gray
  enemy side, playerSwitch balls roll once they HAVE cycled back to the
  selected player side, matching `factorySwapRender.ts`'s own per-phase
  `gray` sense exactly. Draw order (slot 0, 1, 2, after the caller's own
  VBlank draw) preserved by keeping the existing single sequential loop,
  now gated per-index instead of applying uniformly to all three. No
  `factorySwapRender.ts` edit was needed: `enemySwitch`'s render branch
  already reads `view.ballTiles[i]` (`factorySwapBallTiles(state)` →
  `state.ballAnims`), which now advances correctly on its own; playerSwitch
  keeps its already-exact, RNG-independent `factorySwapPlayerSwitchBallTiles`
  formula untouched (its own rendering never reads `ballAnims`).
- **Result:** `battle1-swap-enemy-picker.json` 129/130 → **130/130** (frame
  29838 now exact). Full 19-trace `battle1-swap-*.json` family re-swept
  end-to-end: **19/19 at their full bar**, zero drops anywhere (both
  player-quit traces hold #96(a)'s 67/67). Two new Tier-1 tests pin the
  per-ball eligibility semantics directly: one drives a real enemySwitch
  transition and proves each ball keeps rolling (its internal
  `advanceBallAnim` state changes tick-to-tick) right up to its own wrap
  tick, then freezes dead the instant `cycledToEnemy` flips, independently
  per ball; the other primes all three balls to a guaranteed same-tick roll
  and proves the RNG draw order is exactly 0, 1, 2 (each ball's `pendingRest`
  matches the corresponding link in a hand-chained `advanceRngValue` call).
- **Docs:** `ISSUES.md #96` deleted in full (both parts (a) and (b) closed,
  no remainder — git keeps the history). `PROGRESS.md` entry 1316 archived
  to `PROGRESS-archive.md` to keep this ledger at 3 entries.
- **Next:** #97 turn5/turn6 bounce-tick drift (a side probe was running on
  it in parallel this session — check its findings before re-bisecting);
  #71/#73-adjacent filler per standing priorities. No open battle1-swap
  deviations remain.
- **Notes:** the render-layer half of the probe's fix shape
  (`factorySwapRender.ts:414-425`) turned out to be unnecessary once the
  presentation-layer state producer was fixed — `view.ballTiles` already
  routed through `ballAnims` for the affected phase, so the probe's
  described *outcome* was right even though no render-layer edit was
  required to get there. No PAPERCUT.
