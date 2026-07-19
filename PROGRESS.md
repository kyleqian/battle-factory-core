# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 102 — Supervisor: round-7 worktree branch merged (one battleScene.ts draw-order conflict, hand-resolved + re-verified) — `sendout.json` **221 → 236/256**; 1504-1518 span closed by a one-line compositing fix

- **State (verified post-merge):** `npm test` **520/520**, `npm run build`
  green, tree clean. Post-merge re-runs: sendout **236/256**,
  scene-assembly 256/256, menu-materialize 5/5, menu-throw 70/70,
  menu-text 18/18, transition 206/206. Worktree removed, branch deleted.
- **Did:** merged `worker/wt-20260719-021108`: the whole 1504-1518
  residual was mechanism 5's LATE window still drawing AFTER the particle
  burst (the early window was already moved pre-particles by §7.22/§7.23);
  every diff pixel in the span was particle-colored inside an alive
  particle's predicted footprint — no formula/task move (§7.24). BONUS:
  falsifies §7.20's 1516/17 "particle survives past age 24" theory — that
  pixel is index 12 at age 22, was just masked by the same ordering bug. The
  merge conflicted with #101's player-particle additions in the same
  drawSendOutHandoff region; resolution keeps #101's player draw calls + the
  branch's Grovyle ordering (stretch pre-particles, settled-only post) —
  re-verified above.
- **Next:** main lane → drawPlayerMaterialize's silhouette-edge residual
  at 1657+ (§7.21-class, named in #101; the opponent-side fix is the
  template) then extend menu-materialize toward the healthbox-slide
  boundary; worktree lane → sendout 1485-1495 (11 ticks, last big span);
  then the #96 OAM-order fix solo, menu draw + idle, S6 acceptance.
- **Notes:** sendout remaining: 1462, 1470/71/79, 1485-1495 (15 ticks
  total). First merge conflict of the session — the two lanes finally
  met in drawSendOutHandoff's z-order; resolution was mechanical.

---

## 101 — Bounded worker: PLAYER-side ball-open particle burst landed (mechanism 3's player-side analogue, docs/battle-menu-notes.md §3 item 5) — `menu-materialize.json` **1/1 → 5/5** (ticks 1652-1656); a distinct materialize-silhouette-edge residual found starting 1657, not root-caused

- **State:** `npm test` **519/519** (+3 Tier-1), `npm run build` green,
  tree clean. Full 22-trace sweep against the live oracle: all 21 others at
  their exact established counts (accept-prebattle 137/137, anchor 1/1,
  confirm-decline 67/67, confirm-flow 79/95, draft-cursor 13/13,
  draft-menu-slot6 66/66, draft-menu 38/38, example 4/4, menu-text 18/18,
  menu-throw 70/70, rent-3picks 157/190, rent-slot1 125/139, room-entry
  110/110, room-msgbox 142/142, room-npcs 98/98, scene-assembly 256/256,
  sendout 221/256, summary-info-magby 132/132, summary-info-onix 122/122,
  transition 206/206, walk-warpout 125/125) — zero regressions.
  `tools/compare/traces/menu-materialize.json`: **1/1 → 5/5** (tick 1652 was
  already committed; added 1653-1656).
- **Did:** per the brief's FIRST STEP, confirmed #99's own residual
  classification still held on this session's starting code (100%
  particle-colored, 1653-1663) before writing anything. Implemented
  `drawPlayerBallOpenParticles` (`battleScene.ts`) — same age/radius/frame
  math as the opponent's own `drawBallOpenParticles`, battler-specific only
  in origin/anchor: **origin `(68,106)`**, brute-force pixel-fit against the
  single isolated particle visible at logical tick 0
  (`tools/compare/scratch/menu-audit/fit_player_particle_origin.mjs`, 13/14
  exact — the 14th is the already-established terrain occlusion), **not**
  the naive `sprite->x,y-5` center value directly (that value needs the
  tile's own `-4,-4` half-size folded in first, since `drawParticleTile`'s
  args are a top-left corner); **anchor** `PLAYER_BG_FADE_START_TICK` (1653,
  same "both fire the same RAM tick" reasoning #99 established for the BG
  fade). **Draw order reversed from the opponent's own function** (oldest
  spawn on top) — pixel-confirmed necessary via direct A/B (ascending order
  left 3-24px residuals at 1654-1656, all explained by the two-particles-
  briefly-coexisting-at-radius-0 overlap; reversing fixed all three exact).
  **A second, distinct gap found while wiring this in**: the ball's own
  "open" pose sprite (#98's `drawPlayerBallOpen`) was only modeled for its
  single tick 1652 — real particles exposed that the ball's static art is
  still genuinely on screen (through the same terrain clip) for several more
  ticks; widened `PLAYER_BALL_OPEN_END_TICK` to 1663 (`battleMenu.ts`) —
  alone fixed tick 1653.
  3 new Tier-1 tests (`tests/battleMenu.test.ts`) pin the origin tile,
  a later-tick particle position, and the pre-burst boundary; 2 existing
  tests updated for the widened ball-open window.
- **Why the window stops at 1656, not 1663 (the materialize window's own
  end)**: ticks 1657+ have a small (19-30px), separately-named residual that
  is **NOT** particle-colored — every mismatched pixel is one of the
  ball-open frame's own colors (`66,66,66`/`214,41,41`/`132,0,0`/
  `255,156,123`), appearing where `drawPlayerMaterialize`'s tint is drawn
  instead of the real ball/mon color underneath. **Superseded by #103**:
  this was a materialize-silhouette-EDGE misattribution — #103 proved both
  the materialize accumulator/`y2` AND the ball-open window (widened to 1663
  right here) were not responsible; the 1663 widening itself has since been
  reverted back to the RAM-confirmed 5-tick truth (1656).
- **Notes:** stayed in `battleMenu.ts` (pure timing) + additive
  `battleScene.ts` hooks (new function + one call-site line in the existing
  `drawSendOutHandoff`, plus reordering the three already-existing
  player-materialize-window calls to fix compositing order) +
  `tests/battleMenu.test.ts` + `docs/battle-menu-notes.md`, per the brief.
  Did not touch `battleScene.ts`'s opponent-side internals,
  `tests/battleScene.test.ts`, or `docs/battle-scene-notes.md`. Archived
  PROGRESS #97 to `PROGRESS-archive.md` per the brief. No PAPERCUT.

---
