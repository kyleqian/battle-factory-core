# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 109 — Bounded worker: player healthbox slide-in implemented, RAM-exact and region-isolated 0-diff — but found + corrected a wrong settle-tick pin (real settle 1702, not 1693/1696) and the assigned full-frame trace-closure acceptance criterion is BLOCKED by a separate, pre-existing, already-named ONIX materialize-tail gap (new ISSUES #17)

- **State:** `npm test` **530/530** (+8 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: every trace at #108's
  exact counts (accept-prebattle 137/137, anchor 1/1, confirm-decline
  67/67, confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66,
  draft-menu 38/38, example 4/4, menu-materialize **12/12** (unchanged,
  deliberately not widened - see below), menu-text 18/18, menu-throw 70/70,
  rent-3picks 157/190, rent-slot1 125/139, room-entry 110/110, room-msgbox
  142/142, room-npcs 98/98, scene-assembly 256/256, sendout 246/256,
  summary-info-magby 132/132, summary-info-onix 122/122, transition
  206/206, walk-warpout 125/125) — zero regressions.
- **Did:** implemented the PLAYER healthbox slide-in end-to-end:
  RAM-probed `gSprites[0]` directly (`tools/probe/specs/menu-player-
  healthbox.json`, new) rather than pixel-fitting — `x2` starts **110** at
  RAM tick 1666, steps **-5/RAM-tick**, settles **0** at RAM tick 1688;
  `oam.priority` reads **1**. With this window's established +1 render lag,
  the box is first visible at trace tick **1667** (`dx=110`), settles
  (`dx=0`) at **1689**, holds through at least 1741. Pixel-harvested the
  settled content (`extract-menu-healthbox-player.ts` → new
  `src/assets/gen/menu-healthbox-player.json`, bbox `(127,74)-(229,109)`,
  103×36) from `battle1-menu-dense.json`'s own tick 1730, built the
  content mask up front (§7.23's lesson, not discovered after the fact) —
  `getMenuHealthboxPlayerContentMask`/`drawMenuHealthboxPlayer`,
  `battleScene.ts`, wired into `drawSendOutHandoff`. **No spatial overlap
  with ONIX found** (pixel-checked directly) — the brief's own working
  assumption that this window needs #108's SortSprites z-order model was
  disproved for this specific mechanism; no such code was added. Verified
  the mechanism in total isolation: comparing just the healthbox's own bbox
  region against the oracle across ticks 1653-1711 gives **0px diff at
  every tick**, slide and settled alike. 8 new Tier-1 tests
  (`tests/battleMenu.test.ts`) pin the RAM-derived table, geometry, and two
  oracle-pinned pixel samples.
- **Found and corrected a pre-existing wrong pin**: the brief's own
  "scene settles at pinned tick 1693" (inherited from
  `docs/battle-menu-notes.md` §1) is **wrong** — re-verified via two fresh
  `bin/oracle run` replays (byte-identical) plus an independent cross-check
  against `battle1-intro.json`'s identical script: the real, permanent
  static hold starts at trace tick **1702**; ticks 1693-1701 oscillate
  (tick 1693 and 1700 share an identical sha, a 7-tick round-trip) rather
  than settling cleanly. Corrected in `docs/battle-menu-notes.md` §1/§3a.
- **Why the trace can't close (not this session's mechanism, not
  introduced this session)**: every tick from ~1664 onward already has a
  full-frame mismatch regardless of the healthbox, because nothing draws
  ONIX at all past `PLAYER_MATERIALIZE_END_TICK` (1663) — the
  "coefficient-fade-to-true-color... entangled with idle-bob" gap §3 item 5
  already named and deliberately deferred is real, not a formality
  (empirically re-checked: best-candidate plain-sprite tick still
  mismatches by 632px in isolation, no clean single tick closes it) — plus
  a small ONIX-owned ground-shadow triangle tied to the same tail. Filed as
  **ISSUES #17** with RAM-probe leads (`gPaletteFade`, ONIX's own
  `gSprites[6]`) for a future session. Per this run's own harvest-first
  precedent (`sendout.json` held a fixed score across several sessions
  while solved piece by piece), `menu-materialize.json` stays unwidened
  past 1663 (still 12/12, zero regression) rather than widened with
  captures that would fail on a mechanism this step doesn't own; a sibling
  `menu-healthbox.json` trace was considered and rejected for the same
  reason (every candidate tick already fails full-frame on the ONIX gap
  alone, independent of the healthbox).
- **Next:** ISSUES #17 (ONIX materialize-tail: palette-fade + settle
  wobble) is now the hard blocker for closing any menu-window trace past
  1663 — RAM-probe `gPaletteFade`/ONIX's own sprite fields per #17's own
  leads before attempting a pixel-fit. Once closed, revisit whether
  `menu-materialize.json` should widen all the way to 1702+ or a new
  trace should own the healthbox+ONIX-settled window. Menu draw/idle slice
  is the concurrent worktree lane's (separate docs file, not touched here).
- **Notes:** stayed within `battleMenu.ts`/`battleScene.ts` additive hooks
  + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`/`ISSUES.md`,
  per the brief. New committed artifacts: `tools/extract/extract-menu-
  healthbox-player.ts`, `src/assets/gen/menu-healthbox-player.json`,
  `tools/probe/specs/menu-player-healthbox.json`. Did not touch
  `battleScene.ts` opponent-side internals, `sendout.json`, or the
  1694-1741 static hold/1742+ menu draw (out of scope, worktree lane's).
  No PAPERCUT beyond time spent re-verifying a wrong inherited pin (~15min)
  — flagging as a process note, not a tooling papercut: coarse-derived
  tick pins in this codebase's docs should get an independent re-check
  before a brief cites them as a hard acceptance boundary.
