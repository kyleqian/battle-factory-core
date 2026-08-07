# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 981 — [bounded MAIN worker, 2026-08-07] Lobby free-roam follow-camera + 2-pose turn LANDED — loss-beyond-boundary-off 165 → 171/183 (named woman-wander residual)

- **State:** master `9658ed2c`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched test file **14/14** (turn-pose and
  tap pins red-verified by stashing the src behaviors). Keep-green:
  `loss-terminal-decline-continuation-off` **155/155**, `postwin-retire-off`
  **211/211**, `postwin-record-off` **204/204**,
  `loss-beyond-boundary-off` **171/183** (≥ the 165 baseline). Full `npm test`
  NOT run (worker rule — supervisor after merge).
- **Did (RUNG 1+2):** bound the walkable-lobby render to the measured
  follow-camera model (`factory-lobby-freeroam-ground-truth.md` §5a): field +
  NPCs render at the player-anchored scroll origin (`lobbyFreeRoamCameraOrigin`
  = spawn camera + player world px − spawn tile; net 16px/tile, 1px/frame
  sub-tile phase; the layout's already-banked 2×2 border fills out-of-map),
  player sprite fixed at (112,56) (`LOBBY_PLAYER_SCREEN_POS`), and the
  in-place turn draws the §5b 2-pose animation (turn frames 1-4 = walk-2
  sheet frame, 5-8 = stand; east = west h-flipped). Also corrected the
  turn→step commit rule: a step only starts if the direction is still held
  when the turn completes — oracle-probed (beyond-boundary DOWN tap 5172-5173
  turns 5174-5181 then idles at (4,8) forever, VOFS flat 40) — and the
  walk-cycle clock resets on a direction change (source GO anims restart at
  walk-1). `renderFactoryTerminalField` now takes a camera-origin object;
  the terminal's default call is unchanged (spawn view byte-identical).
- **Next:** the 12 red frames are all the **wandering-woman NPC** class
  (`MOVEMENT_TYPE_WANDER_AROUND`, bbox 96,99-111,134, 137→423px on 5186,
  5188, 5190, 5195, 5200, 5205, 5210, 5215, 5220, 5224, 5240, 5254): the
  real NPC leaves spawn at 5186 and settles covered/off-screen ~5205; the
  app renders all NPCs at their static map-json tiles. `loss-lobby-walk-off`
  spec NOT drafted (the promotion rule gates on 183/183). Then #80's two
  named residuals.
- **Notes:** the app's spawn/terminal field remains byte-identical (the
  follow-cam at the spawn tile = the terminal's own camera). The tap rule
  changed the prior "tap = one tile" §2 model — the committed beyond-boundary
  fixture's 2-frame DOWN press is turn-only, verified by a fresh dense RAM/
  framebuffer probe (`/tmp/subtile-bb.json`, walk probe `/tmp/subtile.json`).
  No PAPERCUTS.

## 980 — [MAIN worker + supervisor salvage, 2026-08-07] ISSUES #78 CLOSED: both switch-seam tail fixes landed route-scoped — pacing-b 148/152 → 153/153, entry REMOVED

- **State:** master `1c7903fd` + this docs commit, clean. Worker was
  cap-killed in its docs tail (exit 124) with ALL code rungs committed and
  the tree clean; supervisor verified independently and wrote this entry
  (provenance: worker-20260807-092139 JSONL). Supervisor reruns:
  `mid-battle-switch-pacing-b-off` **153/153** (spec extended with frame
  1408), `fight-menu-chrome-torment-off` **57/57**,
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **276/276**, `npm run test:smoke` **347/347**, touched test files green
  (factoryVoluntarySwitchSeam 17/17). Full `npm test` deferred to the
  supervisor's wind-down union run.
- **Did:** consumed this session's forensics pack
  (`docs/switch-pacing-tail-forensics.md`, side scout 57b40647). `f82bbf56`:
  (FIX A) the post-voluntary-switch turn-end clears the held box text 2
  frames before the turn-end command completes — route-scoped on
  `sourceDecision.kind === "switch"` in the resolution render's bottom-box
  gate; the shared handoff clock untouched. (FIX B) the same seam's
  fight-menu sequence ran exactly 1 frame late (proved oracle(f)==app(f+1),
  0px, 1405-1409) — the orchestrator's handoff waits
  `HANDOFF_FRAMES - 1` on the switch route only. `1c7903fd`: Tier-1 pins
  for both (red-verified per the worker's transcript) + pacing-b spec
  captureFrames +1408. Forensics verifier reports the red set gone.
- **Next:** lobby walk bind from the banked §5 compositing model (field
  slides under a fixed (112,56) player; turn poses = walk-2/stand sheet
  frames) → `loss-beyond-boundary-off` 183/183 + promote
  `loss-lobby-walk-off`; then #80's two named residuals (964-979 OBJ fade
  lag; ~757px settled band).
- **Notes:** ISSUES #78 entry REMOVED (user-reported items (a)+(b), the
  dense window, and the pacing tail are all closed). The worker also
  committed `tools/probe/trace-state-probe.ts`, a small replay-state debug
  tool. No PAPERCUTS.

## 979 — [bounded MAIN worker, 2026-08-07] ISSUES #80 slice 6 LANDED: party-menu close fade rendered from closeElapsed — dense-a spec 1035-1255 → 980-1255, 276/276

- **State:** master `1bedd921`, clean. Typecheck + `npm run build` green at
  commit, `npm run test:smoke` **347/347**, touched test files **3/3**. Full
  `npm test` NOT run (worker rule — supervisor after merge).
- **Did:** (RUNG 1) re-aligned `PARTY_SELECT_CLOSE_*` phases to the measured
  rank-6 §7 schedule (was: settled through 1018 + fade 1019-1034) — menu-hold
  963-964, menu-fade 965-978 (y=2..14 held 2f), black-hold 979-1018,
  field-reveal 1019-1034, field-hold 1035-1043, done 1044+. `renderBattlePartySelect`
  now drives the close from `closeElapsed`: blend-to-black via
  `paletteFade.blendComponentToBlack` over 965-978, fill black 979-1018, and the
  settled battle field (resolution's own scene view, built from the live
  battle-command presentation) blended from black 1019-1034 with the oracle's
  per-channel rounding (red `(c*k+15)>>4`, green/blue `(c*k)>>4`). Also clears
  the SEND OUT submenu on the confirm edge (oracle 964 = settled menu). (RUNG 2)
  spec `mid-battle-switch-dense-a-off` extended to **980-1255 = 276/276
  byte-exact** (+55 frames: black-hold + field-reveal). (RUNG 3) Tier-1 pins in
  `tests/battlePartySelect.test.ts`: mid-fade shadow (82,82,82) at (220,145),
  black-hold all-zero, submenu-closed-on-confirm — red-verified by disabling
  the close draw.
- **Next:** #80 slice 6 open-fade (809-823) or the named 964-979 residual
  (OBJ/BG one-tick lag, needs layer-separated blend); supervisor re-runs full
  `npm test`.
- **Notes:** named residual — the 16 menu-fade frames 964-979 are NOT in the
  spec: the oracle's OBJ layer lags the BG one tick in the palette fade
  (~2700-3900 px/frame on 964-978, frame 979 = OBJ tail 1559 px). The field
  reveal's per-channel rounding (R ceil, G/B floor) was derived empirically
  from fresh oracle captures (the reveal ramp is an 8-bit blend, not a 5-bit
  palette fade — values like 15/31 prove it). `bin/oracle run` does NOT stage
  battle-lab overrides (posts to /v1/run); the compare tool's
  `/v1/battle-lab/run` is the authoritative route. No PAPERCUTS.

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



- **Supervisor verification (wind-down addendum):** independent rerun
  `party-menu-status-item-off` band **757/803** confirmed, forensics script
  **0px in-region** on 2150+2250, `battle-command-generated-off` 128/128;
  one more full independent `npm test` over the slice-5 commits: **green
  (exit 0)**. ISSUES #80 slice-5 paragraph trimmed to the landed record.

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
