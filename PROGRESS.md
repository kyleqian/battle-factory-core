# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 105 — Bounded worker: applied #104's opponent-side `open.png`/openFinal discovery to the PLAYER ball window — `menu-materialize.json` **6/6 → 7/7** (+1657, contiguous 1652-1657); 1658-1662 residual re-scoped to the already-named particle z-order family

- **State:** `npm test` **523/523** (+2 Tier-1), `npm run build` green, tree
  clean. Full 22-trace sweep against the live oracle: all others at their
  exact #104 counts (accept-prebattle 137/137, anchor 1/1, confirm-decline
  67/67, confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66,
  draft-menu 38/38, example 4/4, menu-materialize **7/7**, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout 236/256, summary-info-magby 132/132, summary-info-onix 122/122,
  transition 206/206, walk-warpout 125/125) — zero regressions.
- **Did:** per #104's own "Next" hypothesis, confirmed §7.25's opponent-side
  `LoadBallGfx` discovery (`pokeball.c:1308-1332` unconditionally DMAs
  `graphics/balls/open.png` over `sBallAnimSeq1`'s nominally-blank
  `ANIMCMD_FRAME(8,5)` slot) is battler-generic, not opponent-only. RAM-probed
  the player ball sprite directly (`tools/probe/specs/menu-player-
  materialize.json`, `gSprites[5]`): `animCmdIndex` flips 0→1 at RAM 1656
  (right after the open pose's own 5-tick hold), holds 5 more ticks
  (`ANIMCMD_FRAME(8,5)`'s own duration), `animEnded` sets at RAM 1661 - with
  the established +1 render lag, openFinal is visible at renders 1657-1662.
  A/B'd against fresh oracle captures BEFORE touching code
  (`tools/compare/scratch/menu-audit/classify_1657_1663.mjs`): tick 1657's
  entire 19px residual is an exact match to openFinal's own tile content
  (19/19), and most of 1658-1662's own residual too (17/19, 20/26, 26/30,
  19/21, 14/16); tick 1663 confirmed NOT part of the window (ball already
  invisible there, oracle-checked directly). Landed: `PLAYER_BALL_OPEN_
  FINAL_END_TICK` (1662, `battleMenu.ts`), widened `playerBallOpenTopLeft`'s
  range to it, `drawPlayerBallOpen` (`battleScene.ts`) now switches tile-row
  offset (0↔2) at `PLAYER_BALL_OPEN_END_TICK`, reusing the SAME extracted
  `battleAnimBallOpen` tileset the opponent's own `BALL_OPEN_FINAL_TILESET`
  already selects. `menu-materialize.json`: **6/6 → 7/7** (tick 1657 exact;
  1652-1657 now contiguous, +1663 non-contiguous past it).
- **What's left (1658-1662, small residual, re-scoped not solved)**: 2-6px
  per tick, pixel-classified as particle-position pixels (oracle color
  `255,173,0`, the known particle-burst color, not in the ball-open palette)
  — the same particle-vs-ball z-order family §7.25 already named and left
  open for the OPPONENT's own send-out (1482-1490/1497-1498), now confirmed
  to have a player-side twin. Not chased this session (§7.25's own "tried
  and reverted" note already warns a naive spawn-index reorder regresses
  elsewhere without real OAM-slot RAM evidence) — belongs with the OAM-
  priority compositor (#96), not a curve-fit on either side alone.
- **Next:** the OAM-priority compositor (#96, solo) — three residual
  families now converge on it: this session's 1658-1662, §7.25's
  1482-84/1491-98, and menu-throw's own 8 Brendan-vs-icon ticks; then
  healthbox slide-in, menu draw + idle (§4/§5, concurrent worktree lane),
  S6 acceptance end-to-end.
- **Notes:** stayed in `battleMenu.ts`/`battleScene.ts` player-side
  functions + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md` §3,
  per the brief. Did not touch §4/§5, `battleScene.ts` opponent-side
  internals, `tests/battleScene.test.ts`, or `sendout.json`. New committed
  artifact: `tools/compare/scratch/menu-audit/classify_1657_1663.mjs`.

---

## 104 — Supervisor: round-8 worktree branch merged — sendout ball's REAL 3rd frame found (`open.png`, runtime VRAM overwrite; never previously extracted) — 1485-1490 pixel mass -95-97%, `sendout.json` holds 236/256 behind a narrow z-order residual

- **State (verified post-merge):** `npm test` **521/521**, `npm run build`
  green, tree clean. sendout 236/256, scene-assembly 256/256,
  menu-materialize 6/6, menu-throw 70/70. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-023340` (conflict-free): the
  1485-1495 span's dominant residual was the ball sprite rendered as
  nothing — `LoadBallGfx` (pokeball.c:1308-1332) unconditionally DMAs
  `graphics/balls/open.png` (a separate, never-extracted file) over the
  blank `ANIMCMD_FRAME(8,5)` tile range at ball creation; extractor now
  pulls it as `battle-anim-ball-open.json`'s `openFinal`; `drawSendOutBall`
  gained a 3rd branch; `BALL_INVISIBLE_START_OFFSET` 23→29 (RAM). Score
  gated at 236/256 by a 2-7px pre-existing particle z-order residual
  (1482-84/1497-98) — worker tried the naive OAM reorder (+4/-2), reverted
  it correctly; §7.25 documents both plus the untouched 1491-95
  sub-residual. Extractor landmine (grovyleFrontAnim silently dropped on
  re-run) caught pre-commit; PAPERCUTS.md updated.
- **Next:** (1) main lane — apply `openFinal` to the PLAYER ball window
  (the 1657-62 residual #103 narrowed to ball-palette pixels is very
  likely this same missing frame, shared `LoadBallGfx` path); (2) worktree
  — §4 idle-cycle + §5 menu-draw source attribution dossier (unblocks the
  last menu slice); (3) then the OAM-priority compositor SOLO (three
  residual families now converge on it: 1482-84/1497-98, menu-throw's 8
  ticks, likely 1470/71/79); (4) healthbox slide-in; (5) menu draw + idle;
  (6) S6 acceptance end-to-end.
- **Notes:** sendout remaining named: 1462, 1470/71/79, 1482-84/1491-98
  region (z-order + small sub-residual). Two lanes independently converged
  on the same missing ball frame from opposite sides this round.

---

## 103 — Bounded worker: re-derived drawPlayerMaterialize's accumulator/`y2` with the full stack in place (still correct, no change) — the real bug was `PLAYER_BALL_OPEN_END_TICK` over-widened to 1663; RAM-confirmed the true window is 5 ticks (1652-1656) — `menu-materialize.json` **5/5 → 6/6** (+1663); 1657-1662 residual re-scoped, still open

- **State:** `npm test` **520/520**, `npm run build` green, tree clean. Full
  22-trace sweep against the live oracle: all at their exact established
  counts (accept-prebattle 137/137, anchor 1/1, confirm-decline 67/67,
  confirm-flow 79/95, draft-cursor 13/13, draft-menu-slot6 66/66, draft-menu
  38/38, example 4/4, menu-materialize **6/6**, menu-text 18/18, menu-throw
  70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry 110/110,
  room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256, sendout
  236/256, summary-info-magby 132/132, summary-info-onix 122/122, transition
  206/206, walk-warpout 125/125) — zero regressions.
- **Did:** per the brief's own instruction, re-derived `drawPlayerMaterialize`'s
  `local+2` accumulator lead + `MATERIALIZE_Y2_TABLE` reuse now that the BG
  fade (#99) and particle burst (#101) both sit underneath it — re-ran the
  same exact-tint-pixel-SET brute force §7.21 used (`tools/compare/scratch/
  menu-audit/reprobe_player_materialize.mjs`) against fresh oracle captures:
  **the current values are still the best match at every tick** (the
  residual grows smoothly the same "known-occluder-holes" shape §7.21 itself
  already documented as benign) — no change needed there. Then RAM-probed
  the ball sprite directly (`tools/probe/specs/menu-player-materialize.json`,
  `gSprites[5]`, `animCmdIndex`/`animDelayCounter`): `sBallAnimSeq1`'s "open"
  frame (`ANIMCMD_FRAME(4,5)`) is only active for 5 RAM ticks (1651-1655),
  then a genuinely-blank frame takes over — with this window's established
  +1 render lag, that's renders 1652-1656 only, matching the OPPONENT's own
  already-correct `drawSendOutBall` window exactly (also 5 ticks). #101's
  widening of `PLAYER_BALL_OPEN_END_TICK` to 1663 was an unverified guess;
  shrunk back to 1656. Verified empirically: this leaves ticks 1657-1662
  completely unchanged (proving the wider window was never load-bearing
  there) and newly fixes tick 1663 to exact 0 diff (was 1px).
  `menu-materialize.json`: **5/5 → 6/6** (1652-1656 + 1663, non-contiguous,
  same precedent as `menu-throw.json`'s own excluded-ticks pattern).
- **What's still open (1657-1662, small residual, re-scoped not solved)**:
  every mismatched pixel's color is uniquely in the ball's own palette
  (`battle-anim-ball-open.json`/`summary-ball.json`) — confirmed by direct
  palette scan to have zero overlap with the particle palette or ONIX's own
  back-sprite palette (and mathematically incompatible with any single-
  coefficient blend of ONIX's grayscale-ish true colors toward the tint).
  Both of this session's own candidate mechanisms (materialize
  accumulator/`y2`, ball-open's window) are now proven NOT responsible — a
  future session should look for a still-unidentified third mechanism,
  **not** re-try either of these two. Full accounting:
  `docs/battle-menu-notes.md` §3 item 5.
- **Next:** root-cause the 1657-1662 residual (now precisely bounded — see
  above) to close `menu-materialize.json` the rest of the way to the
  healthbox-slide-in boundary (~1693, still untouched, separately blocked by
  the already-named coefficient-fade-to-true-color + idle-bob entanglement).
  Sendout's own 1485-1495 span remains the concurrent worktree lane's
  territory (unaffected by this session).
- **Notes:** stayed in `battleMenu.ts`/`battleScene.ts` player-side functions
  + `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`, per the brief.
  Did not touch `battleScene.ts`'s opponent-side internals,
  `tests/battleScene.test.ts`, or `docs/battle-scene-notes.md`. New
  committed artifacts: `tools/probe/specs/menu-player-materialize.json`,
  `tools/compare/scratch/menu-audit/reprobe_player_materialize.mjs`.
  PAPERCUT: the "materialize-silhouette-edge" naming from #101 turned out to
  describe a symptom (ball-palette colors near the tint boundary), not the
  actual mechanism (which was a ball-open window timing bug one call-site
  over) — cost most of this session's time chasing the accumulator/`y2`
  angle before the RAM probe redirected to the real cause; a future brief
  for a residual like this might explicitly ask "is the named function even
  the one drawing the mismatched pixels" as a first triage step, mirroring
  this session's own eventual A/B-shrink-the-window test.

---
