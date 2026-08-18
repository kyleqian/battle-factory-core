# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 1318 — [main worker, 2026-08-17] **ISSUES #96(a) fixed: swap-screen quit-return ball-slot-0 display stall — both player-quit traces 61/67 → 67/67, zero regressions across the 19-trace battle1-swap family**

- **State:** `src/engine/factorySwapPresentation.ts` +
  `tests/factorySwapPresentation.test.ts` edited (`bcab2e9e`). `npm test`
  **1,066 files / 10,031 passed (+1) / 223 skipped**, `npm run build`
  green, `tests/ballAnim.test.ts` (draft-screen checkpoints) green.
- **Did:** the diagnosed fix shape from 1317 (thread `i === 0` + a
  `confirmReveal.ts`-style `isRevealStallActive` analog) turned out
  **wrong on contact** — frame-by-frame oracle instrumentation (temp
  `console.error` at the `core.ts` call site, reverted) showed the 6
  mismatch frames (29774-94) sit inside `quitReturn` (the popup's close),
  not the `quitPrompt` shown-hold, and both draft's `i===0`/`!hasRested`
  formula and a popup-shown predicate regressed frames that were already
  exact when tried in isolation. The real boundary: ball slot 0's own
  `hasRested` latch flipping true while `phase === "quitReturn"` — every
  cmdIndex-transition frame from that latch onward needs slot 0 one tick
  further behind. Landed a narrowly-scoped
  `isFactorySwapQuitReturnSlot0StallActive(ballIndex, phase, hasRested)`
  predicate at the `factorySwapPresentation.ts:862` call site only
  (`isSlot0` stays `false`; only the `revealStallActive` arg is now
  per-ball and predicate-driven) — draft-screen call sites and
  `confirmReveal.ts` untouched, per scope.
- **Result:** `battle1-swap-player-quit-b-return.json` and
  `-no-return.json` both 61/67 → **67/67**. Full 19-trace
  `battle1-swap-*.json` family re-verified: every other trace unchanged
  from its 2026-08-17-supervisor baseline (`enemy-picker` still 129/130,
  correctly untouched — that's #96(b), separately scoped, out of this
  step). New Tier-1 test pins the predicate's exact semantics (quitReturn
  + slot 0 + post-latch → active; quitPrompt-shown, other slots, and
  ordinary picker ticks → inactive).
- **Docs:** `ISSUES.md` #96 trimmed to its still-open remainder — retitled
  to the `enemy-picker` 1-tick header-edge sliver only, part (a) deleted.
- **Next:** #96(b) enemy-picker sliver (RAM-probe the ONIX name-box border
  draw at frame 29838, per the trimmed #96 entry); #97-B turn5/6 bounce
  drift re-derivation; #71/#73-adjacent filler per standing priorities.
- **Notes:** the session's own worked example of why the contingency
  clause exists — a diagnosed "fix shape" from a read-only probe can still
  be wrong in the details; ground-truthing against fresh instrumentation
  before trusting it caught it before any regression landed.
