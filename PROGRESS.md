# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 49 — S6 groundwork (parallel worktree lane, merged): Battle Factory BATTLE ROOM scene extracted, composite-verified 0/38400 at tick 624; NO ENGINE CODE

- **State:** merge of `worker/wt-20260718-094141` (single commit `f943df7`,
  new files only) on top of #48; `npm test` **349/349** + `npm run build`
  green on the merged result. New: `tools/extract/extract-battle-room.ts`
  (deterministic, byte-identical across two runs),
  `src/assets/gen/battle-room-tileset.json` (88 tiles/5 palettes/153
  metatiles), `src/assets/gen/battle-room-npcs.json` (3 nine-frame sheets:
  fake-player decoy, scientist, opponent `OBJ_EVENT_GFX_BUG_CATCHER`),
  `src/data/gen/battle-room-layout.json`, `docs/battle-room-notes.md`.
- **Did (worker, supervisor-verified):** extracted the warp-destination
  room (`BattleFrontier_BattleFactoryBattleRoom`) covering ground-truth
  ticks 520-838. Composite checks: tick 624 **0/38400 full-frame**
  (supervisor independently re-diffed the committed composite vs the
  oracle capture: 0 px), ticks 740-838 **0/21600 on y<90** (region
  excludes the not-yet-extracted opponent-speech msgbox; the full-frame
  residual at tick 800 is confined exactly to the msgbox rows). Findings:
  the camera **pans** (tracks the invisible real player, warp (6,11) →
  settle (6,6)) despite the source's "camera is supposed to remain still"
  comment; opponent gfx resolved via `gTowerMaleFacilityClasses[28]`; no
  attendant object exists in this map.
- **Next:** S6 slice 2a — engine implementation of room entry (fade-in +
  camera pan + decoy walk, ticks 520-624, ending at the verified tick-624
  composite), then 2b (scientists turn + opponent walk-in 624-739), then
  2c (opponent speech msgbox 739-843). Open items from
  `docs/battle-room-notes.md` §6 for those slices: camera pan sub-tile
  timing not derived; tick 520-535 brightness fade-in observed
  (~10→~97 mean) but not modeled; walk-cycle/turn transient frames
  extracted but pixel-unverified; opponent-speech msgbox variant art not
  yet extracted (deliberately deferred behind #48's derivation fix).
- **Notes:** worktree removed + branch deleted post-merge.

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

