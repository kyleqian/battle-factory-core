# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 94 — Bounded worker: PLAYER SEND-OUT slice 2 landed — Brendan's throw pose-cycle + exit translation, thrown-ball arc, player status-bar fade+slide; `menu-throw.json` **11/11** (ticks 1574, 1605-1614) — two new mechanisms found+named, not implemented (GBA ball-spin affine, bar subsprite-split)

- **State:** `npm test` **497/497** (+11), `npm run build` green, tree
  clean. Full 21-trace sweep against the live oracle: all 20 others at
  their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  sendout 214/256, menu-text 18/18) — zero regressions. New
  `tools/compare/traces/menu-throw.json`: **11/11, 0 diff** at
  `captureFrames=[1574, 1605..1614]`.
- **Did:** re-derived docs/battle-menu-notes.md §3's throw/arc mechanism
  every-tick (not the coarse ~8-tick pass) via sub-region diffing +
  brute-force asset-position-fit against `battle1-menu-dense.json`, per
  the brief. New `battleMenu.ts` exports (+ additive `battleScene.ts`
  hooks, same pattern as slice 1): `brendanThrowFrame`/`brendanThrowDx`
  (Brendan's `sAnimCmd_Brendan_1` frame cycle + Q8.8 exit-translation
  accumulator, step=615/duration=50, exact every tick 1574-1614),
  `playerThrowBallTopLeft` (the thrown ball's linear+sine-arc position,
  exact ticks 1607-1614), and `playerSummaryFadeEva`/
  `playerSummaryIconExitDx`/`playerSummaryBarExitDx` (the tick-1574
  "ball-icon change" flagged in #93: the player's OWN party-status-summary
  bar+icons alpha-fade + slide out, `Task_HidePartyStatusSummary` -
  triggered by the *same* controller call as Brendan's throw, not a
  separate mechanism). 11 new Tier-1 tests (`tests/battleMenu.test.ts`).
- **Two real mechanisms found and precisely named, not implemented
  (time-boxed, not estimation gaps):** (1) at trace tick 1615 (arc tick
  n=8), `SpriteCB_PlayerMonSendOut_2`'s `HIBYTE(data[7])∈[35,80)` branch
  activates — **docs' original "dead code for singles" claim was wrong**:
  `data[7]` is the same field the arc's own accumulator drives regardless
  of battler, so it crosses into that range on a fixed schedule. The
  branch starts a real GBA affine "ball spin" (`StartSpriteAffineAnim`)
  this codebase has no keyframe-matrix renderer for - blocks
  `playerThrowBallTopLeft` past 1614. (2) the player status-bar's exit
  uses `SetSubspriteTables(..., sStatusSummaryBar_SubspriteTable_Exit)` -
  the bar splits into independently-animated subsprites during the exit,
  which the engine's monolithic bar draw doesn't model - leaves a small
  (<1%, 20-136px) residual at ticks 1575-1604, why the committed trace
  skips that span rather than claiming a false 0-diff. Both corrected in
  docs/battle-menu-notes.md §3 (this session's own file to own, per the
  brief) with full derivations.
- **Next:** (1) the ball-spin affine animation (tick 1615+) - needs the
  affine-matrix keyframe table's source location and a keyframe-matrix
  sprite renderer (a bigger primitive than this codebase has built so
  far); (2) the status-bar subsprite split (1575-1604) - smaller, a
  focused follow-up; (3) then materialize (~1646+, ball-open particles +
  affine-emerge + color-fade, §6's two still-MISSING asset tables); (4)
  healthbox slide-in, action menu, idle cycle (1693-1810), per
  docs/battle-menu-notes.md §3-§5.
- **Notes:** healthboxAssembly.ts/healthbox docs, oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. Stayed out of
  battleScene.ts's affine-sampling internals / battleScene.test.ts (the
  concurrent worker's region) - only additive hooks in `drawSendOutHandoff`/
  `drawBallIcons`. No PAPERCUT.

---

## 93 — Bounded worker: PLAYER SEND-OUT slice 1 landed — message-box clear + "Go! ONIX!" print + static hold, new `battleMenu.ts`; `menu-text.json` ratified at **18/18** (supervisor-trimmed to the slice's true 1556-1573 window)

- **State:** `npm test` **486/486** (+9), `npm run build` green, tree
  clean at `84f2d08`. Full 19-trace sweep against the live oracle: all 19
  at their exact established counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, scene-assembly
  256/256, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95,
  **sendout 214/256 unchanged**) — zero regressions. New
  `tools/compare/traces/menu-text.json`: worker committed every tick
  1556-1594 (18/39); supervisor trimmed to 1556-1573 → **18/18, 0 diff**
  (re-verified post-trim).
- **Did:** per the brief, new `src/engine/battleMenu.ts` (pure cadence
  logic) + a 2-line-conditional hook into `battleScene.ts`'s
  `drawSendOutHandoff` (reuses the existing `drawMessageTextLines`
  draw path, same B_WIN_MSG/FONT_NORMAL mechanism as battle-scene-notes.md
  §3.1-3.2 — no new drawing code). Implements docs/battle-menu-notes.md
  §1/§2 exactly: tick 1563 clears the box and draws "G" the same tick
  (no blank-box frame), 1564-1571 print the remaining 8 chars 1/tick
  (silent-but-charged space at 1566, byte-identical frame confirmed), 1572+
  static (byte-identical confirmed). 9 new Tier-1 tests
  (`tests/battleMenu.test.ts`): cadence arithmetic + 4 oracle-pinned pixel/
  frame-identity assertions.
- **Scope finding (worker) + ratification (supervisor):** ticks 1574-1594
  of the briefed window diverge because Brendan's throw-pose swap + a
  ball-icon change genuinely begin at trace tick **1574** — not "~1595" as
  docs/battle-menu-notes.md §1's coarse pass estimated (worker pinned this
  by diffing the oracle's own consecutive frames + a visual crop). That is
  exactly the mechanism the brief ruled out of scope, so the worker landed
  the verified text/box-clear feature and flagged rather than forcing a
  fix — correct call, ratified. Supervisor trimmed the trace to the
  slice's true window (18/18) and corrected §1's table row in
  docs/battle-menu-notes.md; the next slice owns 1574+ with its own dense
  trace.
- **Next:** (1) Brendan's throw pose/exit translation + ball-icon change,
  starting tick 1574 (needs pixel-tick-exact re-derivation per docs §3's
  own "Not tick-exact this session" flag, plus the two MISSING asset
  tables in §6: ball-open particles, affine emerge + color-fade); (2) then
  ball arc / ONIX materialize / player healthbox (through settle 1693);
  (3) blank-box + menu draw + idle cycle (1742-1810), per
  docs/battle-menu-notes.md §3-§5.
- **Notes:** healthboxAssembly.ts/healthbox docs, oracle/harness, and
  ROADMAP.md stayed out of scope, per the brief. `battleScene.ts` touchpoint
  kept minimal/additive (one import, one 8-line conditional) per the
  brief's concurrent-worker note. No PAPERCUT.

---
