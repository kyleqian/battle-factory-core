# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 112 — Bounded worker: closed `menu-throw.json`'s last 8 excluded ticks (1581-83/1589-91/1597-98) — root cause was NOT icon timing (both RAM-exact) but `blendedSetPixel`/`blendedTile`'s blend target-2, a real GBA OBJ-vs-OBJ hardware quirk — **70/78 → 78/78**, `sendout.json` incidentally 246/256 → 251/256 — **S6 chain (send-out → materialize → idle) fully 0-diff, contiguous, no known gap left**

- **State:** `npm test` **554/554** (+4 Tier-1), `npm run build` green, tree
  clean. Full 23-trace sweep against the live oracle at #111's exact counts
  except two: menu-throw **78/78** (was 70/70+8 excluded) and sendout
  **251/256** (was 246/256, free improvement, same fix) — every other trace
  unchanged (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67,
  confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu
  38/38, example 4/4, menu-idle 69/69, menu-materialize 62/62, menu-text
  18/18, rent-3picks 157/190, rent-slot1 125/139, room-entry 110/110,
  room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  summary-info-magby 132/132, summary-info-onix 122/122, transition
  206/206, walk-warpout 125/125) — zero regressions.
- **Did:** per the brief, pixel-classified first: the 8 ticks' mismatch
  pixels sit inside **Brendan's own sprite footprint**, not near the
  player-icon region docs assumed — the icon's accelerating exit slide
  travels there fast (icon 0 alone: -84px by tick 1581, -198px by 1585).
  RAM-probed both sprites directly (new `tools/probe/specs/menu-throw-icon-
  exit-timing.json`: `gSprites[3]`/`gSprites[54..59]` `.x2`,
  `gTasks[0..15]` func+`tBlend` scan) across ticks 1560-1611 — both
  `brendanThrowDx` and `playerSummaryIconExitDx`/`playerSummaryFadeEva`
  reproduce RAM **bit-exact at every tick, programmatically verified** —
  ruling out timing/position on either side, exactly as `battle-scene-
  notes.md` §7.26 already ruled out draw order. **Real root cause**: real
  GBA OBJ hardware tracks only the single TOPMOST sprite pixel per dot —
  when the icon (blend target-1) is topmost and Brendan is genuinely
  beneath it, hardware target-2 falls through to the BG layer, never to
  Brendan's own color, since there's no "2nd OBJ pixel" for the blend
  circuit to see. This codebase's `blendedSetPixel`/`blendedTile`
  (`battleScene.ts`) instead blended against whatever the painter's-
  algorithm framebuffer already held (Brendan's raw color) — confirmed
  arithmetically before touching code: `blend(iconColor, backgroundColor)`
  reproduces the oracle's tick-1581/(73,89) `(117,111,131)` exactly;
  `blend(iconColor, brendanColor)` gives the wrong `(61,59,88)` this
  codebase was actually drawing. Fixed by resolving target-2 from
  `healthboxBackgroundColorAt` (an existing helper, reused not duplicated)
  instead of `fb`'s accumulated content.
- **Regression caught by the full sweep before landing** (not shipped
  blind): the fix immediately broke 3 previously-passing ticks (1646-1648,
  `sendout.json` unaffected) — once `playerSummaryFadeEva` bottoms out at 0
  (tick 1605+, real hardware destroys the sprites there,
  `Task_HidePartyStatusSummary_BattleStart_2`), blending at eva=0 was only
  a no-op against the OLD (wrong) target-2; against the new correct
  background target-2 it instead re-painted background over the thrown
  ball's own later animation every tick. Fixed the same way
  `drawOpponentSummaryExit` already handles its own analogous case
  (`if (blend <= 0) return`) — `drawBallIcons` now stops drawing the player
  bar/icons entirely once `playerEva` reaches 0, matching real destruction.
- **Widened `tools/compare/traces/menu-throw.json`**: `captureFrames` from
  70 (1574-1651 minus the 8 excluded) to the full contiguous 1574-1651 (78)
  — **78/78 at 0 diff**. 4 new Tier-1 tests (`tests/battleMenu.test.ts`)
  pin one oracle-verified pixel per excluded tick group plus the
  destroy-cutoff regression guard.
- **Next:** S6 acceptance trace (uniform grid, anchor→1810, supervisor's
  per the brief); `sendout.json`'s remaining 5 ticks (1462, 1470/71/79,
  1491-96 minus whatever this fix already closed — opponent-side,
  concurrent worktree's lane); no other known gap in the S6 chain.
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` (a shared
  render-utility fix, `blendedSetPixel`/`blendedTile`/`drawBallIcons` —
  used by both player and opponent code, hence `sendout.json`'s free
  improvement) + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`
  (new §3c), per the brief. New committed artifact: `tools/probe/specs/
  menu-throw-icon-exit-timing.json`. Did not touch `docs/battle-scene-
  notes.md`/`tests/battleScene.test.ts` or `s6-acceptance.json` (left
  untouched, uncommitted, supervisor's). No PAPERCUT this session.

---
## 111 — Bounded worker: closed ISSUES #17 (ONIX color-fade-to-true-color + settle wobble) — `menu-materialize.json` **12/12 → 62/62** (widened 1652-1663 to 1652-1741+samples), also found+fixed two pre-existing bugs it was masking — **the S6 chain (send-out → settled action menu) now has NO unimplemented window**

- **State:** `npm test` **550/550** (+5 Tier-1), `npm run build` green, tree
  clean. Full 23-trace sweep against the live oracle at #110's exact counts
  (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67, confirm-flow
  79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu 38/38,
  example 4/4, menu-idle 69/69, menu-materialize **62/62** (was 12/12),
  menu-text 18/18, menu-throw 70/70, rent-3picks 157/190, rent-slot1
  125/139, room-entry 110/110, room-msgbox 142/142, room-npcs 98/98,
  scene-assembly 256/256, sendout 246/256, summary-info-magby 132/132,
  summary-info-onix 122/122, transition 206/206, walk-warpout 125/125) —
  zero regressions.
- **Did:** RAM-probed the fade+wobble directly (new
  `tools/probe/specs/menu-player-materialize-taskfade.json`, a full
  `gTasks[0..15]` scan reusing `sendout-grovyle-taskfade.json`'s own watch
  shape, plus `gSprites[6].y2`), cross-validated a second, independent way
  (brute-force pixel decode against `battle1-menu-dense.json`, `tools/
  compare/scratch/menu-audit/decode_player_tint_scratch3.mjs`) — both agree
  at all 39 checked ticks. **Color fade**: `Task_FadeMon_ToNormal_Step`'s
  `tCoeff` (16→0) collapses to a clean closed form once the render lag is
  folded in — 16 constant through render 1675, then -1/tick, true color at
  1691 (`playerMaterializeSettleTintCoeff`, `battleMenu.ts`). **Settle
  wobble**: NOT `DoBounceEffect` (ruled out — wrong amplitude, wrong trigger
  window) — it's ONIX's own species back-sprite entrance animation
  (`BattleAnimateBackSprite`→`GetSpeciesBackAnimSet(SPECIES_ONIX) =
  BACK_ANIM_V_SHAKE`, source-confirmed), a genuine third mechanism exactly
  as `docs/battle-menu-notes.md` §3 item 5 warned — kept as a literal
  RAM-derived table (`PLAYER_SETTLE_WOBBLE_Y2_TABLE`) per this run's own
  convention for exactly this situation. Settles permanently at **1702**,
  independently matching PROGRESS #109's own corrected settle pin (two
  unrelated derivations, same tick). New `drawPlayerMaterializeSettle`
  (`battleScene.ts`) reuses the existing `drawSpriteSheetAffineStretch`
  primitive at the identity matrix purely for its palette+tintCoeff blend
  support.
- **Two pre-existing bugs found and fixed, both masked until now by the much
  larger ONIX-missing gap they happened to overlap**: (1) `brendanThrowFrame`
  used `null` for both "before the throw" and "table exhausted" (a "table
  truncated both ends" case) — `drawSendOutHandoff` conflated the two and
  redrew Brendan's settled on-screen pose at `PLAYER_CORNER` (48,48) once
  his own throw-frame table ran out (render 1690+), when the real game has
  him long gone off-screen; fixed by gating on `t < BRENDAN_THROW_START_TICK`
  directly. (2) `drawPlayerBallOpenParticles` never had its own upper tick
  cutoff (live through render 1692 already) but was missing the SAME
  one-tick RAM-stall correction (`PARTICLE_STALL_LOGICAL_TICK`/
  `PARTICLE_LATE_SPAWN_START_INDEX`) the opponent's own particle function
  already has — a prior session explicitly left it unported since the
  window's then-relevant range stopped short of where it mattered; porting
  it verbatim closed the remaining 104px→13px residual to 0.
- **Widened `tools/compare/traces/menu-materialize.json`**: `captureFrames`
  1652-1710 contiguous + 1720/1730/1741 samples (62 total; the 1702-1741
  hold is one sha per #109, a few samples suffice — `menu-idle.json` owns
  1742+) — **62/62 at 0 diff**. 5 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the coefficient ramp, the wobble table
  (incl. the 1693≡1700 phase match the docs' own sha comparison
  independently found), and 5 oracle-pinned pixel samples.
- **With this landed, the S6 chain has NO unimplemented window left**:
  `menu-throw.json` (1574-1651, 70/70) → `menu-materialize.json`
  (1652-1741+, 62/62) → `menu-idle.json` (1742-1810, 69/69) are contiguous
  and all 0-diff.
- **Next:** S6 acceptance trace (uniform grid, anchor→1810 — supervisor's,
  per the brief); remaining known polish, all pre-existing and unrelated to
  this step: menu-throw's 8 icon-exit ticks (§7.26's icon
  `eva`/`iconExitDx` lead, not a reorder), `sendout.json`'s 10 remaining
  ticks (1462, 1470/71/79, 1491-96 — opponent-side, the concurrent worktree
  lane's).
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` additive hooks +
  `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md` + `ISSUES.md`
  (deleted #17), per the brief. New committed artifacts: `tools/probe/specs/
  menu-player-materialize-taskfade.json`, `tools/compare/scratch/menu-audit/
  decode_player_tint_scratch3.mjs`. Did not touch the opponent-side sendout
  internals (1491-96, concurrent worktree's) or `docs/battle-scene-notes.md`/
  `tests/battleScene.test.ts`. No PAPERCUT this session.

---
## 110 — Supervisor: menu-idle branch merged (two-file conflict, hand-resolved incl. a marker that briefly slipped into the merge commit — caught by the post-commit test run, amended before push) — `menu-idle.json` **69/69**; S6 chain has ONE unimplemented window left (1664-1741, ISSUES #17)

- **State (verified post-merge, amended commit):** `npm test` **545/545**,
  `npm run build` green, tree clean. menu-idle 69/69, menu-materialize
  12/12, sendout 246/256, scene-assembly 256/256, menu-throw 70/70,
  menu-text 18/18, transition 206/206, anchor 1/1.
- **Did:** merged `worker/wt-20260719-034821` (action-menu window
  1742-1810): closed-form idle generator (`menuIdleBounce` + literal
  `gSineTable` copy — the `Math.sin`-derived `gbaSin` is off by 1 at
  indices 62/63, which would have produced phantom y2=2 frames at ticks
  1767/1804 inside this very window), atomic menu draw, teal blank pinned
  to `TryDoEventsBeforeFirstTurn`'s `BattlePutTextOnWindow(gText_
  EmptyString3)`, cursor tiles byte-verified. Window base is
  oracle-harvested composition (sibling healthbox work was in flight) —
  honest, documented; regenerating it from the engine's own render once
  #17 closes is a cheap future cleanup. Conflicts: battleScene.ts (2
  regions) + battleMenu.ts (1 region), all both-sides-added — resolved
  keeping both; the battleMenu.ts markers initially slipped into the
  merge commit (compound-command tail truncated the conflict list),
  caught immediately by the test run, amended.
- **Next:** (1) main lane — ISSUES #17 (ONIX color-fade to true color +
  settle wobble, 1664-1701, the LAST unimplemented S6 window; RAM leads
  filed in the issue); (2) worktree — sendout 1491-96 (biggest remaining
  span, opponent-side internals); (3) then S6 acceptance trace (uniform
  ~250-capture grid anchor→1810), remaining polish (menu-throw's 8
  icon-exit ticks, 1470/71/79, 1462), wind-down before 07:55.
- **Notes:** sendout remaining: 1462, 1470/71/79, 1491-96 (10 ticks).
  menu-throw's 8 ticks: §7.26 disproved the order hypothesis; icon
  fade/exit timing is the standing lead.

