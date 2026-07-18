# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 51 — S6 slice 2c groundwork (parallel worktree lane, merged): opponent-speech msgbox = same asset as pre-battle box (source-proofed); print cadence + appear/close choreography fully pinned; docs-only

- **State:** merge of `worker/wt-20260718-100953` (single docs commit
  `161f0ae`) on top of #50; `npm test` **357/357** + `npm run build` green
  on the merged result. Docs-only — `docs/battle-room-notes.md` §8 added
  (+180/−5).
- **Did (worker, supervisor-verified):** (1) **no new msgbox asset
  needed** — both "Right this way, please!" and the opponent speech are
  `msgbox X, MSGBOX_DEFAULT` → `Std_MsgboxDefault` → window 0 =
  `sStandardTextBox_WindowTemplates[0]` (27×4 at (2,15)), the literal
  same `message_box.png` frame already derived as
  `prebattle-room-msgbox.json`; byte-exact verified (border 3292/3292 px
  over 7 ticks, frame+fill+text 9948/9948 over 4 ticks). The prior
  "shorter variant, y=115" read was a within-tile gradient artifact —
  corrected in place. (2) print cadence pinned: room settled (no box) by
  712; box+full-white fill appear **atomically at 718**; first glyph 719;
  **exactly 1 tick/character incl. space ticks** (full tick→char table in
  §8.2); line 2 starts 731; print-complete/settle **738**. Rendered
  string confirmed pixel+charmap-exact: `IT'S WAY TOO` / `HOT HERE` with
  the curly apostrophe (charmap 180 — ASCII `'` isn't in the charmap).
  (3) close pinned: A-press #2 pulse 838-839, no visible change through
  842, box vanishes **atomically at 843** — full framebuffer
  byte-identical to tick 717's pre-appear state, static through 851.
- **Next:** S6 slice 2b (scientists turn + opponent walk-in, 624-739,
  main lane — brief going out now), then 2c (speech box) directly off
  this section. Heal-icon + transition-to-black groundwork (843-1031) in
  flight on the worktree lane (worker G).
- **Notes:** worktree removed + branch deleted post-merge.

---

## 50 — S6 slice 2a: battle-room ENTRY window (ticks 520-624) implemented, oracle-pinned; `room-entry.json` committed 110/110

- **State:** `npm test` **357/357** (349→357, +8 in new `tests/battleRoom.test.ts`,
  1 existing test in `tests/prebattleRoomFlow.test.ts` updated for the new
  handoff behavior), `npm run build` green. New trace
  `tools/compare/traces/room-entry.json` (624 frames, captures 515-624)
  passes `npm run compare` **110/110, 0 diff**. All 13 pre-existing traces
  re-verified at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, rent-slot1 125/139,
  rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did:** consumed #49's assets unchanged (no re-extraction needed —
  walk-cycle/turn frames turned out pixel-exact on first try). RAM-probed
  ticks 510-629 directly (custom script mirroring `tools/probe/ram-probe.py`'s
  conventions, struct offsets for `Sprite`/`ObjectEvent` from
  `include/sprite.h`/`include/global.fieldmap.h`, not committed — scratch
  under `/tmp/s6entry/`), cross-checked against a dense oracle pixel probe
  (every frame 515-545) for the fade curve. New `src/engine/battleRoom.ts`
  (state machine + oracle-pinned per-tick table) and
  `src/engine/battleRoomRender.ts` (tilemap+border+sprite compositor under
  a panning camera), wired into `core.ts` as a third top-level scene mode
  (`battleRoom`) that `prebattleRoom`'s `warpFade` phase hands off to at a
  fixed elapsed count (`WARP_FADE_TO_ROOM_ELAPSED`) matching the
  ground-truth trace's own first visible-room frame. Findings, all resolving
  #49's SS6 open items for this sub-window: (1) **fade-in reuses
  `paletteFade.ts`'s `FADE_IN` exactly** (same shape as the pre-battle
  room's own fade-in) but the call site indexes it by `elapsed` directly,
  not `elapsed+1` like every other fade call site in this codebase —
  pixel-sampled and algebraically confirmed, 0 mismatches. (2) **the camera
  pans a clean 1px/tick**, resolving #49's "may not be a clean 1px/tick"
  open question — `gTotalCameraPixelOffsetY` read directly is static then
  increments by exactly 1 every tick for 80 ticks, no sub-tile curve. (3)
  **the decoy is screen-fixed the whole window** (a finding, not assumed):
  it walks in exact lockstep with the camera pan (both driven by the shared
  `waitmovement`), so net screen position is constant — only its
  `sAnim_GoNorth` walk-cycle frame changes; this contradicts the natural
  first guess (that its raw RAM `sprite.y` directly gives screen position)
  and cost the first `npm run compare` attempt (216-425px/frame diff,
  root-caused and fixed same session). (4) the 6 scientists are static
  (face-south, pre-turn) the whole window, confirmed by RAM, and shift on
  screen via the same tile-camera formula as the room tiles.
- **Next:** S6 slice 2b — scientists turn + opponent walk-in (ticks
  624-739). Open for that slice: opponent walk-in gfx already extracted
  (#49, `OBJ_EVENT_GFX_BUG_CATCHER`), scientist turn-in-place transient
  frames extracted but still pixel-unverified (#49 SS6 risk 3).
- **Notes:** no papercuts. Scratch RAM-probe script and oracle fade-curve
  probe both inline/`/tmp`, nothing committed beyond the deliverables.

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

