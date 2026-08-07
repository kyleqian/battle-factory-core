# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 978 — [bounded MAIN worker, 2026-08-07] ISSUES #80 slice 5 LANDED: CANCEL pokeball-button window drawn from banked assets — in-region 467px → 0, band 1224/1270 → 757/803

- **State:** master `f6f0bb7e`, clean. Typecheck + `npm run build` not yet at
  commit (worker running), `npm run test:smoke` **347/347**, touched test file
  **5/5**. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did:** (RUNG 1) banked `sCancelButton_Tilemap` (`graphics/party_menu/
  cancel_button.bin`, a 7x2 u16 tilemap stamped to BG1 tile (23,18) by
  `DrawCancelConfirmButtons` → `CopyToBgTilemapBufferRect_ChangePalette(1, …,
  23, 18, 7, 2, 17)`, party_menu.c:1199-1205) as `slots.cancelButton` in
  `extract-party-menu-source.ts`, mirroring `slots.wideEmpty` (a435a933). The
  slot itself is inert in this trace (non-chooseHalf path never stamps it), so
  the visible CANCEL window was drawn per the forensics model. (RUNG 2) the
  window draw in `renderBattlePartySelect` (12a97095): repaint the window
  footprint x184-237 y134-153 with the checkerboard rows, then the 2px
  box-frame + divider (74,74,99) and interior color15 (115,90,181) at the
  oracle-measured per-row ranges (`CANCEL_FRAME_ROWS`, from
  `docs/party-menu-rank6-ground-truth.md` §6 addendum), then the 16x16 pokeball
  sprite (pixel-0 transparent, center (198,148)) from `party-menu-pokeball.json`
  (frame-0 visible ball at png offset (4,4)-(19,19)), then "CANCEL" via the
  FONT_SMALL glyph renderer with white ink + (115,115,115) shadow drawn at
  (204,137) (the font's ink lands 4px below the origin — calibrated against the
  card-name rendering). Acceptance loop: `slice5-button-forensics.ts` reports
  **0 remaining diff px in-region on frames 2150 AND 2250** (was 467);
  `party-menu-status-item-off` band **1224/1270 → 757/803 px/frame with NO frame
  worse** (bbox now 2,11-162,55 = the pre-existing icon/wash residuals only).
- **Keep-green:** `battle-command-generated-off` **128/128**,
  `mid-battle-switch-dense-a-off` **221/221**. (RUNG 3) Tier-1 pin in
  `tests/battlePartySelect.test.ts` (f6f0bb7e): ball-red (181,66,0) at (190,140)
  + CANCEL ink (255,255,255) at (206,141), red-verified by disabling the draw
  call (interior 115,90,181 appeared at the ball pixel).
- **Next:** #80 slice 6 (open/close fade pixels + spec extension 964-1034 per
  the rank-6 doc §7), then the supervisor re-runs full `npm test`.
- **Notes:** the brief's primitive-1 mechanism (cancel_button.bin stamped at
  (23,18)) is real but inert in this single-cancel trace — `DrawCancelConfirmButtons`
  only runs in chooseHalf mode; the visible window is the `sCancelButtonWindowTemplate`
  BG0 std window at (24,17). The slice drew the forensics-verified composite
  directly; `slots.cancelButton` is banked for the chooseHalf path. No
  PAPERCUTS.



## 977 — [supervisor WIND-DOWN, 2026-08-07] Session summary: 14 workers / 5 rounds — #81 CLOSED 57/57, #82 CLOSED, postwin YES routes 125/125+125/125, #80 band 9234→1224, walkable lobby + REST guard LIVE, #78 down to 4 named frames

- **State:** master at this entry's commit, clean. Final independent union
  verification: full `npm test` **756 files / 7162 passed / 1 skipped**
  (+21 tests this session), `npm run build` green. Supervisor-rerun specs
  this session: `fight-menu-chrome-torment-off` **57/57** (was 52/57),
  `mid-battle-switch-pacing-b-off` **148/152** (new; red = the 4 named #78
  frames), `postwin-record-yes-off` **125/125** (new), `postwin-retire-yes-off`
  **125/125** (new), `party-menu-status-item-off` red band **1224/1270**
  px/frame (was 9234/9306), `loss-terminal-decline-continuation-off`
  **155/155**, `loss-beyond-boundary-off` **165/183** (was 162),
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **221/221**, `postwin-record-off` **204/204**, `postwin-retire-off`
  **211/211**. `animation-main`: nothing to fold at orient or wind-down.
  No worker worktrees/branches left. DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was again the documented docs-only false
  positive (harness delta since service start = _template/NOTES only).
- **Did (14 DeepSeek workers: 9 main, 5 side; 4 cap-kills all salvaged, 1
  exit-5 false alarm that landed everything):** MAIN — #81 4a route-scoped
  `BattleCommandBounceSchedule` (853e6540, from a cap-killed worker's
  JSONL-salvaged validated model) + 4b message-pacing holds (6a0a445d..)
  → torment 57/57, #81 entry REMOVED; postwin RECORD-YES/RETIRE-YES bound
  (e09eec10/f52646af); #80 slices 1+4 (26ec156b/b2e2ebd4, salvage ledger
  974), slice 3 + box-color0 (e7977ff8/4154fafc); REST guard pinned +
  walkable lobby free-roam (a5658c42/07e50d44: 8f turn/16f-tile/collision
  grid/silent NPCs/door-mat-blocked no-exit). SIDE — lobby+REST scout
  (e2f0ae35), #80 rank-6 measurement scout (6385255a), message-pacing scout
  (ee198233, verify script), #82 retirement (4bbe5a24, entry REMOVED),
  slice-5 pixel forensics (804c5506: 467px fully classified, 0 unattributed).
- **Supervisor corrections/decisions:** rank-6 doc slice-2 premise was
  STALE (extractor fixed since 2026-07-29 — worker verified no-op); lobby
  scout camera claim corrected in-doc (RAM-fixed `gCamera` but render
  scrolls sub-tile via `sFieldCameraOffset` — 16c68afd); REST guard scoped
  to A-only (scout's swallow-the-DOWN recommendation contradicted the
  pinned retire specs); #82 decided option (a) retire; slice 5 PARKED after
  three cap-kills (all assets/model banked, see ISSUES #80); pokeball asset
  salvage-banked (d0deef0c). A concurrent Codex supervisor session wrote
  docs-only PROGRESS 970 mid-flight (user-launched; it detected this
  session and wound down; no conflicts).
- **Next (ordered):** (1) #80 slice 5 from the banked forensics model —
  brief must inline the literal draw calls (three DeepSeek caps died on
  doc-pointer briefs) or supervisor-inline; (2) #80 slice 6 fade + spec
  extension 964-1034; (3) #78's 4 frames (1399/1400 turn-end tail seam,
  1406/1407 menu redraw chrome); (4) lobby walk-spec blockers (sub-tile
  camera scroll model + turn pose A identification) → promote
  `loss-lobby-walk-off`; (5) micro-scout: postwin second-RECORD-selection
  variant never probed (session-flag menu-variant premise).
- **Notes:** DeepSeek cap economics: 45-min caps landed whenever the brief
  carried a validated model/measured plan; all 4 cap-kills were
  exploration tails (3 on the same 467px button class). JSONL salvage
  recovered value from every kill. New PAPERCUTS entry: probe verify
  scripts writing `_verify-*` scratch dirs trip the exit-5 clean-tree
  postflight. No DEFERRED entries; run-supervisor.sh is unblocked.


## 976 — [bounded MAIN worker, 2026-08-07] REST guard + walkable Lobby free-roam (RUNGS 1-3+5 of the lobby step); RUNG 4 spec NOT promoted — named §-fact disagreement + turn pose A

- **State:** master `07e50d44`, clean. Typecheck + `npm run build` green;
  `npm run test:smoke` **347/347**; touched test files **49/49** (postwin 35,
  factoryLobbyTerminal 14, factoryLobbyFreeRoam 10). Full `npm test` NOT run
  (worker rule).
- **Did — RUNG 1 (REST guard):** the guard already existed in `postwin.ts`
  (`acceptPostwinContinuation` cursor-2 no-op). Strengthened the Tier-1 pin:
  A-on-REST returns the SAME state object (identity no-op) + a DOWN-traversal
  test walking RECORD→REST→RETIRE (the committed retire specs pin the cursor
  visible on REST at 6641 — the guard is the A press, not a swallowed DOWN).
  Red-verified by un-guarding src (pin failed), restored. Regressions re-held
  before/after: `postwin-retire-off` **211/211**, `postwin-record-off`
  **204/204**.
- **Did — RUNGS 2+3+5 (walkable Lobby):** `src/engine/factoryLobbyFreeRoam.ts`
  — 4-dir movement at the measured cadence (8f turn-in-place on a direction
  change, 16f/tile, tap = exactly one tile, +1 press-latency buffer so the
  app's turn-visible window lands on the oracle's canonical tick, e.g. turn
  rendered 5174-5181), collision from the extracted layout grid + the standing
  NPC cells (attendant (4,7) etc.) + the door-mat cells **(9,11)/(10,11)
  BLOCKED — the no-exit divergence**, borders impassable, A/B ignored (silent
  NPCs). Handoff in `core.ts`: at the decline chain's box-gone age (loss
  tick 5093) the terminal renders hand off to the free-roam overworld — the
  spawn frame is byte-identical to the bare terminal field, so the handoff is
  invisible (`loss-terminal-decline-continuation-off` **155/155** holds).
  Extractor now emits the player's full 9-frame walking.png sheet;
  `factoryTerminalRender.ts` draws the static terminal player with frame 1
  (north stand) and the free-roam player at its interpolated position +
  walk-cycle pose. 10 Tier-1 pins in `tests/factoryLobbyFreeRoam.test.ts`
  (turn-vs-step, 16f tile clock, NPC/counter/border/door-mat blocks,
  walkable cells, A-no-op); red-verified the turn pin by shrinking the turn
  constant.
- **RUNG 4 (spec) NOT promoted — two named blockers:** (1) the oracle's
  in-place turn is a 2-pose 8-frame animation (poses 5174-5177 + 5178-5181);
  pose B = the target standing frame (my model matches 5178-5181 byte-exact),
  but pose A is an unidentified frame with no source-sheet counterpart
  (~167px residual on 5174-5177). (2) **§-fact disagreement (STOP-and-report
  per brief):** the doc's §3a "camera fixed / whole interior rendered on one
  fixed frame" holds for RAM `gCamera` (-56,0 constant, probe re-run
  confirmed), but the RENDERED field scrolls by a sub-tile camera offset
  (`sFieldCameraOffset`/`gFieldCamera`, field_camera.c `CameraUpdate`) —
  1px/frame during each step, snapping back at the tile boundary. The app
  implements the doc's fixed-camera literal, so every in-step frame differs
  by the offset (loss-beyond-boundary-off walk samples went 162→**165**/183
  but the ~18 movement frames stay residual). A full-match walk spec needs
  that sub-tile scroll model + pose A — not forced into the cap's tail. The
  scratch `loss-lobby-walk-off.json` I drafted was deleted (would be red).
- **Next:** supervisor decides: (a) land a sub-tile camera-scroll render +
  identify turn pose A to promote `loss-lobby-walk-off`; or (b) accept the
  free-roam state-machine landing and move to the next roadmap item.
- **Notes:** no PAPERCUTS. `loss-beyond-boundary-off` improved and stays
  committed (165/183, movement frames named residual).

---

## 975 — [bounded MAIN worker, 2026-08-07] #80 slice 3 + box-color0 landed: party-menu band 7038/7110 → 1224/1270 px/frame

- **State:** master `4154fafc`, clean. Typecheck green; `npm run test:smoke`
  **347/347**; 8 party-menu/battleScene test files **300/300**. Full `npm test`
  NOT run (worker rule — supervisor runs it after merge); build run green.
- **Did:** slice 3 — the voluntary party-menu open rule. `OpenPartyMenuInBattle`
  (party_menu.c:5774-5779) → `InitPartyMenu(keepCursorPos=FALSE)` forces
  `gPartyMenu.slotId = 0` (party_menu.c:524-525); `createBattlePartySelectState`
  was `cursor: activePartyIndex`. **Scoped per-route:** voluntary route
  (`factoryRoundBattleOrchestrator.ts:1926`, the only caller) now opens cursor
  on slot 0; forced route (`partySelect.ts`/`battlePartySelectStateForForcedParty`)
  KEEPS its fainted-mon default (RAM/ground-truth provenance —
  `docs/party-menu-notes.md` + forced-switch ground truth; in every canonical
  fixture the fainted mon IS slot 0, so both routes agree with the source).
  Then the box-color0 interior fix: the content boxes painted their color0
  texels opaque (bank3 123,156,115 / bank7 57,156,255) over the box interiors
  the oracle shows as (181,181,90)/(206,214,123) — the empty boxes already
  skipped color0 (slice 4), the content boxes now do too
  (RenderPartyMenuBox transparency), `drawSlot(..., true)`.
- **Verified:** `party-menu-status-item-off` band **7038/7110 → 1224/1270
  px/frame** (drop ~5814 px/frame, beyond the ~3200 slice-3 prediction because
  the slot-0 bounce/icon interplay and box-color0 landed with it; NO frame
  worse than baseline). Residual now: buttons ~467px (slice 5, parked),
  mon-icon palette/position ~525px, box-edge/text ~210px. Regressions hold:
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **221/221**, `mid-battle-switch-pacing-b-off` **148/152** (same 4 named red
  frames 1399/1400/1406/1407). New Tier-1 pin in `tests/battlePartySelect.test.ts`
  (cursor opens slot 0 with the active battler on slot 1; red-verified by
  restoring the pre-slice-3 src — pin failed `expected 1 to be +0`); forced
  route's "defaults to fainted ONIX" pin untouched.
- **Next:** slice 5 (buttons — needs the bg-subtract pixel-forensics probe per
  the ISSUES #80 banked findings) → slice 6 (fade + spec extension) vs lobby
  walkable + REST guard.
- **Notes:** no PAPERCUTS.

