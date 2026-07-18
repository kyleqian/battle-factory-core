# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 48 — ISSUES #15 root-caused and fixed: pre-battle msgbox frame now derived from `prebattle-room-msgbox.json`, baked asset deleted

- **State:** `npm test` **349/349** (+2 regression tests), `npm run build`
  green, working tree clean. Full 13-trace sweep at exact prior counts —
  **accept-prebattle 137/137**, **walk-warpout 125/125** (acceptance bar),
  anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66,
  example 4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, rent-slot1 125/139, rent-3picks 157/190,
  confirm-flow 79/95 — zero regressions. ISSUES.md: **#15 deleted**.
- **Did:** Root-caused the "one-GBA-step" color offset that made the accept
  worker bake `prebattle-msgbox-frame.json` from a literal oracle capture
  instead of deriving it: `tools/extract/gbaColor.ts`'s `to5Bit()` assumed
  every reference PNG/pal 8-bit value approximates its true 5-bit GBA
  channel via `floor(c5*255/31)` (true for this map's own tileset/NPC
  sprites, verified by direct PLTE-byte inspection), but
  `graphics/text_window/message_box.png`'s embedded palette instead stores
  exact `c5*8` values (a different, plainer export convention) - the old
  formula silently rounded those down one GBA step (e.g. raw 248 -> 5-bit
  30 instead of 31 -> 247 not 255). Fixed by recovering the 5-bit value via
  `v8>>3` (top 5 bits), the correct general inverse regardless of which
  forward convention produced the reference byte - verified against both
  conventions' full value ranges before changing it, and confirmed
  byte-identical regeneration for every *other* extracted asset (tileset,
  layout, NPCs - only `prebattle-room-msgbox.json` actually changed when
  re-extracted). Once fixed, that asset's own palette contains the oracle-
  exact interior white (idx1) *and* the message text's fg/shadow colors
  (idx2/idx3) exactly - the old "two-asset rule" (docs/prebattle-room-
  notes.md §3) was itself an artifact of the same bug, not a real asset-
  boundary. Reverse-engineered `prebattleRoomRender.ts`'s new
  `drawMessageBoxFrame` from the real source
  (`WindowFunc_DrawDialogueFrame`, `reference/pokeemerald/src/menu.c:319-
  402`, the standard width=27/height=4 field window) rather than pixel-
  matching by hand, then byte-exact verified it against the (now-deleted)
  baked capture before deleting it: all 9948 non-transparent frame pixels
  matched exactly, 0 mismatches. Pinned the root cause with two Tier-1
  regressions (`tests/extract.test.ts`: `to5Bit(248)===31`,
  `gbaRoundTrip(248)===255`; `tests/prebattleRoom.test.ts`: msgbox palette
  idx1/2/3 now exactly white/fg/shadow).
- **Next:** S6 slice 1b+ (battle-room entry, heal-icon/transition window) -
  unaffected by this step, per its scope. No open ISSUES entries.
- **Notes:** no papercuts. Scratch verification (pixel sampling, brute-force
  tile-match scripts used to derive/confirm the tile-placement algorithm)
  was all inline `node -e`, nothing committed.

---

## 47 — S6 slice 1b (parallel worktree lane, merged): slice-0 §4 loose ends resolved — transition = CIRCLES_MEET (RAM-confirmed), transition-end = tick 1227, post-freeze draws re-attributed; docs-only

- **State:** merge `a004db2` (branch `worker/wt-20260718-091648`, single
  docs commit `c005d87`) on top of #46; `npm test` **348/348** + `npm run
  build` green on the merged result. Docs-only — `docs/battle-bringup-notes.md`
  +227/−47, no engine/asset/fixture changes.
- **Did (worker, supervisor-verified):** (1) transition variant **RESOLVED**:
  `gTasks[6].data[1]` (`tTransitionId`) reads **34 =
  `B_TRANSITION_FRONTIER_CIRCLES_MEET`** from tick 869 — enum ordinal
  independently re-counted by the supervisor against
  `include/battle_transition.h`; corroborated by `gTasks[7].func` becoming
  `Task_FrontierCirclesMeet` (its state machine matching source math
  tick-for-tick) and screenshots (3 circles converging, ticks 960-990).
  The 1077-1197 "streak" frames are **not** the transition — all
  transition tasks are destroyed by `CB2_InitBattleInternal`'s
  `ResetTasks()` at tick 1044 (same tick as the independently-pinned RNG
  freeze); they're `BeginBattleIntro`'s scene assembly. (2)
  transition-end **pinned**: scene settled (modulo text) tick **1227**
  (plateau through 1229); text milestones "would like to battle!"
  no-heart 1272-1273, ♥ at 1274, true steady state from 1292 = the same
  4-phase/36-tick idle cycle as the action menu (the old "1290 stable"
  claim was a 6-frame transient — corrected in place). (3) post-freeze
  RNG draws re-attributed: **1741 is `TryDoEventsBeforeFirstTurn`'s draw**
  (RAM-confirmed via the `gBattleMainFunc` handoff; the old attribution
  to 1747 was a proximity guess); 1745 (2-step) plausibly opponent-AI
  switch heuristics (`AI_TrySwitchOrUseItem`, bracketed by controller
  busy-bits, not single-stepped); 1747 (5-step) genuinely unpinned
  (AI chain, player controller, TryDoEvents all source-ruled-out) — an
  S7 concern, flagged in the dossier, not an S6 blocker.
- **Next:** S6 slice 2 — battle-room entry scene (frames 520-838). A
  parallel extraction worker (battle-room map/NPCs/opponent overworld
  sprite, new files only) is in flight on the worktree lane as of this
  entry.
- **Notes:** worktree removed + branch deleted post-merge. Worker A's
  ROADMAP slice-1a note was worker-written (convention is propose-only) —
  ratified as accurate; the slice-1b roadmap note is the supervisor's own,
  this commit.

---

## 46 — S6 slice 1a: A-press → closemessage → guided walk → warp fade (ticks 400-519) implemented, oracle-pinned; `walk-warpout.json` committed 125/125

- **State:** `npm test` **348/348** (341→348, +7 in `tests/prebattleRoomFlow.test.ts`),
  `npm run build` green. New trace `tools/compare/traces/walk-warpout.json`
  (520 frames, captures 395-519) passes `npm run compare` **125/125, 0
  diff**. All 12 pre-existing traces re-verified at their exact prior
  counts (anchor 1/1, draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6
  66/66, example 4/4, summary-info-onix 122/122, summary-info-magby
  132/132, confirm-decline 67/67, accept-prebattle 137/137, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** RAM-probed the whole window directly (`tools/probe/ram-probe.py`,
  scratch spec/output under `/tmp/s6-worker/`, not committed) rather than
  fitting pixel diffs blind: watched `gObjectEvents[0/1]` (player/attendant
  - localId/currentCoords/movementActionId/facing), `gSprites[0/1]`
  (x/y/animNum/animCmdIdx/invisible flag), and `gSpriteCoordOffsetX/Y`
  every tick 395-520. Cross-referencing against `sAnim_Go*`'s ANIMCMD
  tables (`object_event_anims.h`) decoded exact per-tick walk-animation
  frames; cross-referencing screen positions (`sprite.xy + coordOffsetXY -
  {8,16}`) against the room's already-known camera-origin formula proved
  **the player sprite stays screen-fixed at (112,56) the entire walk** (the
  field camera exactly cancels the player's own movement) - only the room
  tiles + the independently-moving attendant actually scroll on screen, a
  finding that collapsed the whole camera-scroll gotcha the brief flagged
  into "no per-tick player-position bookkeeping needed." Also discovered a
  real one-tick **render-lag**: RAM state at tick N only becomes visible in
  the rendered frame N+1 (verified against the ground truth's own frame-403
  boundary). Baked the resulting 80-tick walk (frame 403 → 482, when motion
  freezes) as an oracle-pinned lookup table (`prebattleRoom.ts` `WALK_STEPS`,
  same style as this file's existing `WINDOW_STEPS`/`UNREVEAL_WINDOW_STEPS`
  tables) rather than a general movement formula - safest match for exact
  byte-parity given per-tile timing already deviates from the naive 16-
  frames/tile assumption in places. Pixel-sampled the warp fade separately
  (a static room pixel across frames 478-505) and fit it to the *existing*
  `BlendPalette` shape already modeled in `paletteFade.ts` - new
  `WARP_FADE_OUT` timing constant (startDelay 4), reusing `bgFadeY`/
  `objFadeY` unchanged. New phases `messageClosing` (2-tick input-
  registration lag, matching this file's existing `confirmReveal`
  precedent) → `walking` (80 ticks, `WALK_STEPS`-driven) → `warpFade` (fades
  to black and then holds solid black forever, matching the step's explicit
  "may simply hold black from 501 onward" scope cut). Extended
  `extract-prebattle-room.ts` to pull all 9 standard picture-table poses per
  NPC (was 1 each) - `prebattle-room-npcs.json`'s shape changed from a
  single `tileset` to a `frames[9]` array; updated `prebattleRoomRender.ts`
  (`drawRoomTiles`/`drawNpcFrame` now take an explicit origin/frame index)
  and `tests/prebattleRoom.test.ts` to match. Core.ts wires the A-press
  (`newKeys.has("A")` while `phase==="idle"`) directly into `messageClosing`
  - the only input this screen ever reads in this slice.
- **Next:** S6 slice 1b+: battle-room entry (frame 520+, scientists facing,
  opponent walk-in, opponent overworld speech "IT'S WAY TOO HOT HERE"),
  then the heal-icon/nature-reroll/transition-select window (ticks 842-869)
  and the transition itself - all pinned in `docs/battle-bringup-notes.md`'s
  "Slice-0 ground truth" section (not touched this step, per the step
  brief - a parallel worker owns that file). ISSUES.md still just #15.
- **Notes:** no papercuts this session. All RAM-probe scratch (specs,
  dense-capture trace JSONs used only to derive the table, PNG output under
  `/tmp/s6-worker/`) is scratch per convention, not committed - only
  `tools/compare/traces/walk-warpout.json` (the final byte-exact parity
  trace) and the engine/asset/test diffs are. `docs/battle-bringup-notes.md`
  was read but **not edited**, per the step brief.
