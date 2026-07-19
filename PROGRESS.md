# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 97 — Bounded worker: ball-spin GBA affine keyframe animation landed (§3 item 4's named blocker) — `menu-throw.json` densified to every tick 1574-1651, **70/70** 0-diff (was 33/33); ball arrival pinned exact at trace tick 1651

- **State:** `npm test` **507/507** (+6 Tier-1), `npm run build` green,
  tree clean. Full 21-trace sweep against the live oracle: all 20 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  sendout 215/256, menu-text 18/18) — zero regressions.
  `tools/compare/traces/menu-throw.json` extended from 33 committed
  captures (1574-1614) to 70 (1574-1651, still minus #96's 8 named-excluded
  Brendan-vs-icon ticks): **70/70** at 0 diff.
- **Did:** implemented `playerThrowBallSpin` (`battleMenu.ts`) +
  `drawSpriteSheetAffineRotate` (`battleScene.ts` - this codebase's first
  TRUE-rotation affine OAM sampler; mechanism 4/5 both special-case
  `rotation=0`), covering trace tick 1615 (where the GBA affine "ball spin"
  starts, `StartSpriteAffineAnim(sprite, 4)`) through arrival. Root-caused
  via source (`SpriteCB_PlayerMonSendOut_2`, `pokeball.c:915-953`) +
  RAM ground-truth (new probe `tools/probe/specs/sendout-ball-spin.json`;
  ball sprite = `gSprites[5]`, ID'd by matching its callback pointer to
  `SpriteCB_PlayerMonSendOut_2`'s address via
  `tools/probe/dump-task-and-sprite-callbacks.py`) rather than hand-sim
  alone — the control flow was subtler than #94's blocker note implied
  (`sprite->sBattler`/`data[6]` inside the branch is the arc's own angular
  step by this point, not the original battler index, since
  `InitAnimArcTranslation` already overwrote it — full derivation in
  docs/battle-menu-notes.md §3 item 4c). The rotation itself is a clean
  closed form (`+=25` GBA angle units/tick, confirmed by hand against RAM),
  but kept as a literal per-tick matrix table (`BALL_SPIN_TABLE`) because
  this codebase's `gbaSin` (`Math.sin`-derived, not a literal
  `gSineTable` copy) is off by up to 1 Q8.8 unit at some indices — invisible
  to the existing sine-ARC mechanisms but not to a rotate SAMPLE kernel
  (confirmed by brute-force oracle diffing: sparse 1-11px edge diffs at
  exactly the affected ticks, gone once swapped to RAM-exact values). Same
  render-lag convention as mechanism 4/5 (§7.21), RAM-confirmed here rather
  than assumed. **Arrival pinned exact: trace tick 1651** (was "~1646"
  coarse) — resolves that "not tick-exact" item in docs §3. 6 new Tier-1
  tests (`tests/battleMenu.test.ts`): keyframe/matrix pinning at the first
  spin tick, the last spin tick, and arrival, plus 3 oracle-cross-checked
  rendered-pixel tests.
- **Window boundary (why 1651, not further):** tick 1652 is where
  `SpriteCB_ReleaseMonFromBall` (which takes over the RAM tick after
  arrival) starts the ball's own "open" pose swap
  (`StartSpriteAnim(sprite,1)`), and tick 1653 is where the magenta
  materialize silhouette color first appears anywhere in the frame
  (oracle-confirmed by direct pixel search) — both the already-named,
  out-of-scope materialize/ball-open mechanism (docs §3 item 5), not a new
  gap. Stopped there per the brief rather than reaching into that mechanism.
- **Next:** (1) materialize (~1653+, ball-open particles + affine-emerge +
  color-fade — assets already confirmed ready per `battle-anim-assets.md`
  §5, "just" placement/timing); (2) Brendan-vs-icon sprite-priority
  compositing (#96's named blocker, 8 ticks, wants a proper
  OAM-priority-aware compositor); (3) healthbox slide-in → settle 1693; (4)
  blank-box + menu draw + idle (1742-1810). Sendout residuals continue
  separately (§7.21's named 1493-1503 matrix-early gap, 1516/17 age
  overrun, 1470/71/79 icon edge, tick 1462).
- **Notes:** stayed out of battleScene.ts's mechanism-5 (GROVYLE stretch)
  internals and tests/battleScene.test.ts (the concurrent worker's
  territory) — only additive `drawSpriteSheetAffineRotate` + a call-site
  hook in `drawSendOutHandoff`. docs/battle-scene-notes.md, oracle/harness,
  ROADMAP.md untouched, per the brief. No PAPERCUT.
  **Supervisor merge addendum (post-#97):** worktree branch
  `wt-20260719-004700` merged (docs-only, §7.22): §7.21's 1493-1503
  matrix-early gap was root-caused and its fix VERIFIED (5 ticks'
  Grovyle region → 0px) but reverted per the step's strict >215 bar — an
  unrelated ~138px band sliding ~5px/tick across x∈[0,42], y∈[17,42]
  (opponent-healthbox slide-in region) masks those ticks from full-frame
  exactness. §7.22 records the 7 RAM table entries + compositing-order
  correction for exact re-application once the band is fixed — that
  combined step is round 5's worktree brief.

---

## 96 — Bounded worker: PLAYER status-bar subsprite-split exit landed (§7.19's opponent-side twin) — `menu-throw.json` densified to every tick 1574-1614, **33/41** 0-diff (was 11/11 on the old sparse trace); one new named blocker found (Brendan-vs-icon sprite-priority compositing, 8 ticks)

- **State:** `npm test` **501/501** (+3 Tier-1), `npm run build` green,
  tree clean. Full 21-trace sweep against the live oracle: all 20 others
  at their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  sendout 215/256, menu-text 18/18) — zero regressions.
  `tools/compare/traces/menu-throw.json` densified from 11 sparse
  captures to every tick 1574-1614 (41 total, minus 8 named-excluded —
  see below): **33/33** of the committed captures at 0 diff.
- **Did:** implemented `drawPlayerSummaryBarExit`/`playerBarExitTableActive`
  in `battleScene.ts` (additive, next to the existing `drawOpponentSummaryExit`
  it mirrors) — the player-side twin of §7.19's opponent bar-exit
  subsprite split. Same shared `SetSubspriteTables(...,
  sStatusSummaryBar_SubspriteTable_Exit)` call and table as the opponent
  (source-confirmed: only h-flip differs between sides), but the
  unflipped player anchor needs **no** analogue of the opponent's
  `EXIT_BAR_TIP_LOCAL_SHIFT` — derived (not fitted) from the fact that the
  player's unflipped render anchors to the table's *first* entry
  (unchanged between Enter/Exit), not the *last* (which is what moves
  under h-flip). This alone took the densified trace from 11/41 to 33/41
  (the 20-136px bar-split residual fully gone). 3 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the widened-layout pixels + the
  pre-switch flat frame, oracle-cross-checked. Corrected
  docs/battle-menu-notes.md §3 item 4b + §7 with the full derivation.
- **New named blocker found (not attempted, out of this step's scope):**
  8 of the 41 ticks (1581-1583, 1589-1591, 1597-1598) still diff by a
  small 4-26px margin, but pixel dumps prove it's NOT the bar — it's a
  sprite-priority compositing gap between Brendan's exiting back sprite
  and the player status icon's exit-slide, whenever their screen
  footprints briefly overlap: real GBA OAM resolves the tie by sprite-
  creation order (Brendan, created at the intro, wins), but this engine
  composites strictly in draw-call order (the icon, drawn after Brendan,
  paints over him). Fixing this generally means touching
  `drawSendOutHandoff`'s shared draw order, which also backs
  `sendout.json`'s established 215/256 — too risky to improvise inside
  this step's narrow brief, so the 8 ticks are excluded from the
  committed trace with this exact explanation rather than forced/faked.
- **Next:** (1) the ball's GBA affine "spin" (tick 1615+, needs an
  affine-matrix keyframe renderer); (2) Brendan-vs-icon sprite-priority
  compositing (above) — a real, scoped fix for a future step, likely
  wants a proper OAM-priority-aware compositor rather than another
  one-off reorder; (3) materialize (~1646-1690, assets confirmed ready);
  (4) healthbox slide-in -> settle 1693; (5) blank-box + menu draw + idle
  (1742-1810). Sendout residuals continue separately (§7.21's named
  1493-1503 matrix-early gap, 1516/17 age overrun, 1470/71/79 icon edge,
  tick 1462).
- **Notes:** stayed out of battleScene.ts's mechanism-5 affine-matrix
  region and battleScene.test.ts (the concurrent worker's territory) —
  only additive functions next to the existing opponent-exit code, plus
  the `drawBallIcons` call-site edit. docs/battle-scene-notes.md, oracle/
  harness, ROADMAP.md, sendout.json untouched, per the brief. No
  PAPERCUT.

---

## 95 — Supervisor: both worktree branches merged — mechanism 4 silhouette-edge fix (`sendout.json` **214 → 215/256**) + player-materialize asset audit (zero new extraction needed; §6's MISSING flags were stale)

- **State (verified post-merge):** `npm test` **498/498**, `npm run build`
  green, tree clean. Post-merge re-runs: sendout **215/256** (render 1481
  newly exact), scene-assembly 256/256, transition 206/206, menu-text
  18/18, menu-throw 11/11, anchor 1/1. Draft-family traces not re-run
  post-merge: neither branch touches their code paths, and each branch ran
  a full clean sweep pre-merge (#94's 21-trace + the branch's own 19-trace).
  Both worktrees removed, branches deleted.
- **Did:** (1) merged `worker/wt-20260718-235841` — mechanism 4's
  materialize silhouette-edge residual root-caused by direct RAM probe
  (`gSprites[8]`/`gOamMatrices[2]`, new probe spec committed): an
  accumulator-lookup render-lag off-by-one (render T needs RAM T-1, the
  convention mechanism 5 already had) + a previously-unmodeled `y2`
  vertical bob (14→0 over the 12-tick emerge ramp, literal table). The
  brief's "shared root cause with mechanism 5" hypothesis was FALSIFIED
  (mechanism 5 already correct; call sites genuinely differ via
  `ConvertScaleParam`). Full derivation §7.21. Remaining 1482-1492
  residual re-attributed to the ball sprite's own occlusion footprint;
  new named gap: mechanism 5 writes its affine matrix before its render
  window at 1493-1503. (2) merged `worker/wt-20260719-003214` — asset
  audit for the player materialize window: all three "MISSING" §6 items
  were already extracted this run (`battle-anim-particles/-ball-open/
  -tables.json`, shared `SpriteCB_ReleaseMonFromBall` source) and are now
  pixel-confirmed applicable player-side (particles 14/14+12/12+12/12 at
  1662-1665; color-fade RGB exact; affine-emerge shape holds for a back
  sprite; thrown-ball closed frame 112/112 over 1607-1614). §6 rows
  corrected to point at `docs/battle-anim-assets.md` §5.
- **Next:** (1) player status-bar subsprite-split exit (1575-1604, <1%
  residual/tick — mirror of §7.19's opponent-side EXIT_BAR_TILE_ORDER
  work), then densify menu-throw.json to the full 1574-1614 window; (2)
  ball-spin affine keyframe renderer (1615+, needs the keyframe-matrix
  table + a new primitive); (3) materialize window ~1646-1690 (assets all
  confirmed ready); (4) healthbox slide-in → settle 1693; (5) blank-box +
  menu draw + idle (1742-1810); sendout residuals continue in parallel
  (§7.21's named 1493-1503 matrix-early gap, 1516/17 age overrun,
  1470/71/79 icon edge, tick 1462).
- **Notes:** merges conflict-free (doc/file-ownership discipline held
  across 3 concurrent workers). Ball-open pose frame occlusion at player
  screen position is a placement (engine) question, not asset — see audit.

---
