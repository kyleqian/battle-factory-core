# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 873 — [supervisor orient, 2026-08-02 ~21:30] animation-main folded (fast concave + convex send-out families); union verified green

- **State:** master `5aaba475` = merge of `animation-main` (`29c9ebe0`, 9
  commits: `ANIM_SWING_CONCAVE_FAST` IGGLYBUFF + `ANIM_SWING_CONVEX_FAST`
  families accepted, Scene-ON evidence + fixtures). Union verified by
  supervisor: full `npm test` **632 files / 6,370 passed / 1 skipped**,
  `npm run build` green. Oracle freshness PASS (both profiles). Animation
  supervisor + nested worker live during fold (fold-race protocol: re-check
  at wind-down).
- **Next:** dispatching species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md` — slices 1+2
  (family-C healthbox factories) first; slices 3/4 now UNGATED (dispatcher
  ladder slice 10 landed `7bd37eab`). Then entry-871 Turn1-13 type-ref
  follow-up, #62, #56 as time allows. Hard deadline 2026-08-03 05:06.
- **Notes:** design-doc window-list drift found while briefing:
  `battle2-off-turn1.json` (179) was deleted at rank-1 retirement — slice-6
  windows are `battle2-turn1-rockslide` 191 / `battle2-action-menu-dense`
  209 / `battle2-off-turn1-staged` 16; `PIDGEOTTO_MAX_HP` has 2 extra
  turn-6 call sites (:11934/:12581) the census missed — folded into briefs.

---
## 872 — [supervisor wind-down, 2026-08-02 ~20:45] slice-9 + slice-10 + full #66 family landed; dispatcher ladder rows 1-10 complete

- **State:** master = this docs commit on top of merge `d263968f`
  (slice-10 `7bd37eab` + side chain `4fd820fc`). Final union verified by
  supervisor at wind-down: full `npm test` **628 files / 6,351 passed /
  1 skipped**, `npm run build` green. DEFERRED.md: no entries opened this
  session. ISSUES #66 removed (fully fixed, see below).
- **Session outcomes (4 workers, 0 failures, all supervisor-verified):**
  1. **animation-main folded** at orient (fast-forward to `e3d7a0bc`, 7
     accepted front-animation families; union suite verified green, entry
     869).
  2. **Slice-9 fold landed** (`c5563c72`): PP-freshness design implemented
     verbatim; 14/14 differential windows byte-identical vs `105c72d5`
     (supervisor re-ran the two formerly-red windows independently);
     census state entries 0/0/0.
  3. **Slice-10 final interface cut landed** (`ad0cfa07`+`7bd37eab`):
     drawFightSubmenuWindow and currentPPForActiveMon positional handoff
     params 13→0 each; 53-trace row-10 union differential 9,238/9,238
     byte-identical vs `d4a89680` (supervisor spot re-ran 3 traces).
     Honest remainder in entry 871: battleScene.ts still carries ~144
     TurnN-handoff type refs on per-turn draw functions row 10 never
     named — that surface belongs to the #39 retirement program.
  4. **#66 fully closed in two stacked side steps** (`3631116d`,
     `4fd820fc`): (a) STATSWONTINCREASE/DECREASE crash fixed
     (red-before/green-after, real-ROM receipt); (b) pre-clamp
     "sharply/harshly" magnitude CONFIRMED by discriminating oracle probe
     (stage 11 + SWORDS DANCE → "sharply rose!" at post-clamp delta 1)
     then fixed via `requestedMagnitude` on the stat-stage-change event;
     plus a third find — generic-route stat names rendered lowercase vs
     the ROM's "ATTACK" — proven pixel-real on the kernel route only
     (162/9600 px diff → 0 after fix; legacy turn-owned windows
     structurally unaffected, which is why standing traces never caught
     it). Evidence docs + fixtures committed under docs/issue66* and
     tools/compare/fixtures/issue66*.
- **Next session (ordered):** (1) species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md` (census 4→45,
  7-slice plan), folding in entry 871's recommended follow-up for
  battleScene.ts's remaining per-turn Turn1-13 type usage (same #39
  retirement surface); (2) #62 generated-route pixel-red reproducers;
  (3) #56 intro residuals.
- **Day-audit (read-only, post-wind-down commit):** 5 angles over today's
  surface — 4 explicitly clean (STAT_DISPLAY_NAME byte-exact vs
  gStatNamesTable; slice-10 helper algebraically equivalent at all-null;
  rebuilt turn5-13 pins kept every numeric tuple; slice-9 x #66 disjoint
  by grep). 1 latent finding filed as ISSUES #67 (unchecked
  `as 1 | 2` magnitude cast from raw script bytes + `>= 2` vs source's
  `== 2`, unreachable with stock data) — **fixed same-session (`e7ef6dab`):**
  runtime guard added at the cast site, `>= 2` tightened to `=== 2` at all
  four sharply/harshly sites, parametrized red/green test added; full
  `npm test` 628 files / 6,353 passed / 1 skipped, `npm run build` green.
- **Notes:** `animation-main` is a moving branch again (live animation
  supervisor + nested worker at wind-down; tip was `54b2d48e`+ during this
  session) — fold at next orient per protocol. PAPERCUTS: new entry for
  the full-suite-vs-Bash-timeout friction flagged by the #66(b) worker.

---
## 871 — [bounded MAIN worker, 2026-08-02] slice 10 (final interface cut) LANDED for drawFightSubmenuWindow/currentPPForActiveMon; battleScene.ts's broader Turn1-13 type usage stays open (scope gap, reported)

- **State:** master `7bd37eab` (two commits on top of `d4a89680`:
  `ad0cfa07` the cut, `7bd37eab` a two-assertion test fix). Full `npm test`:
  **626 files / 6,348 passed / 1 skipped**; `npm run build` green (tsc + vite).
  Differential: `compare:differential` over the row-10 union (53 traces) vs
  base `d4a89680` — **PASS, 9,238/9,238 captures byte-identical**, every
  per-trace count matching the brief's table exactly. Census
  (`tools/census-next-command-handoffs.sh`): `drawFightSubmenuWindow`
  handoff parameters **0** (was 13), `currentPPForActiveMon` handoff
  parameters **0** (was 13), state/initial/advance-copy entries stay **0**,
  completed-handoff type declarations **13** (unchanged, as directed —
  the turnNResolutionAdapter.ts files keep their own).
- **Did:** `drawFightSubmenuWindow`'s only production call site always
  passed `null` for all 13 turn1-13 params, so the signature drops to
  `(fb, t, submenu, latest, resolutionOwner, trainerPresentation)` and the
  four internal compatibility-fn calls inline literal `null` in place of the
  removed params (byte-identical by construction, confirmed by the
  differential). `currentPPForActiveMon` is now the design's final
  `(moveset, latest, lockedResolution, followingResolution)` signature —
  the retired 13-arg legacy body is gone and `currentPPForActiveMonFromLatest`
  is folded into the `currentPPForActiveMon` name. `drawFightSubmenuChrome`
  (out of this slice's own scope, its 13-param signature untouched) is the
  one remaining internal consumer of the old chain; since its own callers
  never supply turn5-13, it now calls a small local
  `drawFightSubmenuChromeTurn1Through4PP` helper in `battleScene.ts` that
  keeps only the turn1-4 subset of the retired formula. Rewired
  `tests/battleMenu.test.ts`, `battleSetup.test.ts`, `fightSubmenu.test.ts`,
  and (necessary consequence, not in the row-10 file list but required for
  the signature change to compile/pass) `tests/turn{5..13}
  ResolutionAdapterEquivalence.test.ts` to build `LatestCompletedCommandHandoff`
  fixtures via each turn's own `resolveTurnNLatestCompletedCommandHandoff`
  instead of hand-chaining 13 positional legacy receipts; the shadow
  legacy-vs-generic equivalence tests (whose entire purpose was proving this
  exact cut safe) are replaced with direct regression pins on the now-sole
  generic path. One post-differential test fix: two `fightSubmenu.test.ts`
  assertions had substituted `TURN4_LATEST_HANDOFF` (correctly pinned to
  turn 3's own prior receipt through the turn-4-settled/turn-5-reopen window
  per `docs/turn4-fold-pp-freshness-design.md` §3) where the test actually
  wanted turn 4's own fresh completed-receipt PP fact (7/10, not 8/10) —
  fixed by calling `resolveTurn4CompletedResolutionNextCommandHandoff(4312)`
  directly for those two assertions only; every other `TURN4_LATEST_HANDOFF`
  use in that file was already correct (real production state fixtures).
  Did NOT add a `tests/helpers/battleSceneState.ts` fixture helper — the
  actual per-file transform needed was call-site substitution (raw
  positional chain → one `resolveTurnNLatestCompletedCommandHandoff()`
  value), which didn't need a shared constructor; flagging this as a
  deliberate deviation from the row-10 file list rather than a silent skip.
- **Next:** slice 10's remaining acceptance item (below); ISSUES #66(a)
  capped-stat banner fix (+(b) after an oracle probe, may already be
  in flight per entry 869's dispatch); species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md`.
- **Notes — scope gap, reported per the brief's failure mode:** the
  acceptance bullet "grep confirms battleScene.ts + battleMenu.ts import
  zero TurnNCompletedResolutionNextCommandHandoff types" is met for
  `battleMenu.ts` (**0** refs, confirmed) but NOT for `battleScene.ts`
  (**144** refs remain: turn1 17, turn2 17, turn3 18, turn4 20, turn5 12,
  turn6 11, turn7 10, turn8 9, turn9 8, turn10 7, turn11 6, turn12 5,
  turn13 4). These are NOT dead ABI on `drawFightSubmenuWindow`/
  `currentPPForActiveMon` (both already at 0) — they're live parameters on
  dozens of OTHER per-turn rendering helpers this slice's own SCOPE bullet
  never named (e.g. `drawFightSubmenuChrome`, `drawTurn5RockSlideAttack`,
  `drawTurn6FieldBase`, and the per-turn `drawTurnN...` window functions for
  turns 6-13, which still take raw typed handoffs for field/HP/bounce
  content — exactly the "named content-routing blocker" the design doc's
  own "Named content-routing blocker" section flags as unfinished, distinct
  from the dispatcher ABI this slice targets). Retiring those would mean
  auditing and likely rewriting dozens of unrelated rendering functions
  across a 34k-line file — a materially bigger, unscoped, unverified change
  I did not attempt inside this session's cap. Recommend either a
  follow-up slice (11?) scoped explicitly to that content-rendering type
  usage, or accepting the census's own numeric checks (all satisfied) as
  the real acceptance surface and treating the grep bullet as describing an
  aspiration the design doc's file list undersized.
