# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 974 — [MAIN worker + supervisor salvage, 2026-08-07] #80 slices 1+4 landed (band 9234/9306 → 7038/7110); slice 2 premise was STALE (already landed 2026-07-29); slice-5 button findings banked

- **State:** master at this entry's commit, clean. Supervisor-verified after
  the cap-kill: typecheck green, `party-menu-status-item-off` band
  **7038/7110 px/frame** (was 9234/9306), `battle-command-generated-off`
  **128/128**, `mid-battle-switch-dense-a-off` **221/221**. Worker was
  cap-killed mid-slice-5 with slices 1+4 committed green (`26ec156b`,
  `b2e2ebd4`); this entry is the supervisor-written ledger (provenance:
  worker JSONL `worker-20260806-231350-74528.jsonl` + fresh reruns).
- **Did:** slice 1 (ink): white FG for card name/level in `drawRowText`,
  −288px (doc §5 predicted ~290). Slice 4 (empty boxes): mon-4/5/6 empty
  boxes at (96,56)/(96,80)/(96,104), −1908px exactly; key mechanism: the
  empty-box interior tile is pixel-0 TRANSPARENT (bg checkerboard shows
  through) — a bank-color0 fill is wrong. **Slice 2 (icon palette) is a
  NO-OP:** the extractor has applied `gMonIconPaletteIndices` since
  `be7a4fee` (2026-07-29); re-run produced zero diff and the rendered icons
  already use palette_2 colors. The rank-6 doc §3/§8's slice-2 premise is
  stale — the icon-region residual belongs to the slice-3 cursor/bounce
  interplay instead (slice 3's expected yield is correspondingly larger).
- **Slice-5 findings banked (from the JSONL, unlanded):** the CANCEL window
  is the PARTY-MENU 4px box-frame style (bank 1: frame colors
  (74,74,99)/(231,239,140)/(99,90,0), interior color15 = (115,90,181)) —
  NOT the std 1-tile window frame; the pokeball is a 32x32 sprite with the
  16x16 visible ball at png offset (4,4)-(19,19), centered (198,148).
- **Next:** slice 5 (buttons, findings above) → slice 3 (cursor open rule;
  scoped per-route — forced-switch route's fainted-mon default is
  RAM-verified, voluntary route gets the source's slot-0) → slice 6 (fade +
  spec extension) vs lobby walkable + REST guard (priority order holds:
  lobby first if time forces a choice).
