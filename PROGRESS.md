# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 983 — [bounded MAIN worker, 2026-08-07] ISSUES #80 settled band CLOSED: `party-menu-status-item-off` 0/251 → **251/251 byte-exact**; keep-green 276+128+153 all held

- **State:** master `ed38a6a8`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched test files **17/17**
  (battlePartySelect 9/9 + inbattlePartyMenuVisualBind 8/8; 3 new pins
  red-verified). Keep-green: `mid-battle-switch-dense-a-off` **276/276**,
  `battle-command-generated-off` **128/128**, `mid-battle-switch-pacing-b-off`
  **153/153**. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (RUNG 1+2+3, per `docs/party-band-forensics.md`):** (1) gender data —
  `extract-summary-info.ts` pool extended to the full 376-species Factory
  rental pool (from battle-frontier-mons.json; speciesBlock regex tolerates
  CHIMECHO's no-comma close), RATTATA genderRatio 127 banked;
  `partyMenuStatusItemOffStage` pins the fixture's per-slot personalities
  (slots 0/2 bench-female p0, slot 1 active-male p150 — the all-RATTATA party
  masked the misplaced active until the data landed). −72px. (2) per-slot
  menu Pokéball sprites — extractor banks frame 1 (open ball, rows [32,64));
  renderer draws the 32x32 ball at each slot's spriteCoords pokeball coord,
  OPEN on the cursor slot / CLOSED elsewhere (AnimatePartySlot), under the
  icon (icon priority 1 > ball 3). −595px. (3) level line uses the `{LV}`
  ligature glyph — charmap `LV = 34` is **HEX** (charmap.txt:45): the
  FONT_SMALL ligature is glyph **52** (widths[52]=8), not glyph 34 (a lone
  "v"); the doc's "charmap char 34" misread decimal. −90px. Result: band
  757→685→90→**0**, spec **251/251**, forensics probe 0px/0 unattributed on
  2060/2150/2280. Tier-1 pins: cursor-following open/closed ball
  (slot0 (9,22) + slot1 (95,13) flip orange/red; cancel closes all) + the LV
  ligature ((130,51)/(132,51) white — glyph 34 fails at shadow); visual-bind
  level pin re-based (141,29)→(139,29) for the 8-wide ligature advance.
- **Next:** supervisor full `npm test` + verify; then #80's two out-of-scope
  items (the 964-979 OBJ-fade-lag named residual, needs layer-separated
  blend; open-fade 809-823 unpinned) or ROADMAP Stage-8 residue.
- **Notes:** no src touches to the shared FONT_SMALL glyph cells (the fight
  menu's pins are safe — 128/128 held); the fix is render-side scoped to the
  party-menu level line. All three rungs committed green individually. No
  PAPERCUTS.



## 982 — [bounded MAIN worker, 2026-08-07] Second-RECORD continuation menu LANDED: RECORD-YES sets `disableRecordBattle` → re-ask drops RECORD — postwin-record-second-off 164/164

- **State:** master `c4ab96b4`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched test file **38/38** (postwin.ts;
  3 new pins red-verified by neutralizing the flag write — 2 fail). New spec
  `postwin-record-second-off` **164/164**, **twice-run green**. Keep-green:
  `postwin-record-off` **204/204**, `postwin-retire-off` **211/211**,
  `postwin-record-yes-off` **125/125**, `postwin-retire-yes-off` **125/125**.
  Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (RUNG 1+2):** bound `docs/postwin-record-retire-ground-truth.md` §7:
  `acceptPostwinQuestionYes` on RECORD-YES sets the new
  `disableRecordBattle` session flag (`SaveRecordBattle` → `frontier_util.c:2176`),
  never on RETIRE-YES or NO dismisses; new `recordedMessageDismissElapsed`
  edge keys the recorded-message dismiss-A (MSGBOX_DEFAULT, input-ready +74)
  back to the re-ask via the shared `postwinReaskElapsed` schedule (§7b re-ask
  typing byte-identical 35/35, box clear +4 / reprint +5 / settle +40 / menu +44).
  The re-asked menu renders the 3-option GO ON/REST/RETIRE variant
  (`MULTI_GO_ON_REST_RETIRE`) at tile (20,6): window (160,48,6,6), text rows
  y=57/73/89 at x176, cursor x168 — measured byte-exact from the §7b held
  frame 7009 (arrow x169-175, text x176; vs 4-option x153-214/y33-110). Cursor
  wraps over 3 entries (REST still A-guarded, RETIRE still routes to its
  question). Flag resets naturally per-battle via fresh `createPostwinState*`.
- **Next:** supervisor full `npm test`; then ROADMAP Stage-8 residue / ISSUES
  backlog — e.g. the wandering-woman NPC class (lobby) and #80's two named
  residuals. Second-RECORD in-session has no further text/overwrite variant
  to build (§7a step 6).
- **Notes:** the RECORD-YES flag is set at the save (like the ROM), and the
  re-ask menu readiness generalizes to either re-ask edge (NO-dismiss or
  recorded-message dismiss). Spec promoted from the committed
  `scratch-postwin-record-second-selection-probe.json` (36 segments/7010
  frames, 164 captures 6846-7009). No PAPERCUTS.

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



