# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 985 — [bounded MAIN worker, 2026-08-07] ISSUES #80 item (a) close-fade LAYER SPLIT landed; dense-a stays 276/276 — the 292/292 extension is BLOCKED by the (c) message-box residual now known to span 960-978

- **State:** master `de560ef5`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched test files **19/19**
  (battlePartySelect 11/11 + inbattlePartyMenuVisualBind 8/8; 2 new pins
  red-verified — y_obj formula and phase-boundary constants each fail when
  broken). Keep-green all held: `mid-battle-switch-dense-a-off` **276/276**
  (spec NOT extended — see blocker), `party-menu-status-item-off`
  **251/251**, `mid-battle-switch-pacing-b-off` **153/153**,
  `battle-command-generated-off` **128/128**. Full `npm test` NOT run
  (worker rule — supervisor after merge).
- **Did (per `docs/fade-layer-forensics.md` §1, model used verbatim):**
  (1) extended the menu-fade by one frame and shrunk the black hold by one —
  `PARTY_SELECT_CLOSE_MENU_FADE_FRAMES` 14→15 (closeElapsed 2-16 = frames
  965-979), `BLACK_HOLD` 40→39 (17-55 = 980-1018); the recomputed
  `MENU_FRAMES` stays 72 / `TOTAL` 81 so the 1019-1034 reveal and 1035+
  hold never move. (2) split `renderBattlePartySelect` into a BG pass
  (`drawPartySelectBgLayer`: background, six slots, row text/gender/HP,
  submenu window, message window + text, CANCEL window's bg/interior/frame/
  text) and an OBJ pass (`drawPartySelectObjLayer`: per-slot menu pokeball,
  mon icon, held-item, status icons + the CANCEL pokeball, pulled out of
  `drawCancelWindow` into `drawCancelPokeball`). The non-fading path draws
  BG-then-OBJ byte-identically to before. (3) the menu-fade branch blends
  BG at `closeElapsed & ~1` and the OBJ scratch layer at `(closeElapsed-1)
  & ~1`, composited over the alpha-255 coverage mask (`setPixel` writes a=255;
  no colour heuristic). **Frame 979 — the discriminator (OBJ stack at y=14
  over fully-black BG, 1559px) — is byte-exact.** Tier-1 pins: per-pair
  (y_bg,y_obj) at closeElapsed 2/3/16/17 on the CANCEL-window reference
  pixels (204,140)/(193,138) and the phase boundary (16="menu-fade",
  17="black-hold") + the constant recomputation (72/81).
- **Blocker (why NOT 292/292):** the dense-a capture extension 964-979
  measures **277/292**; the 15 red frames are 964-978, all a PRE-EXISTING
  message-box residual, NOT the fade (frame 979 matches). Oracle evidence
  (dense-a + fresh 883/940 captures): the app's settled message box is
  byte-exact at 883 and 2050-2300, but from the submenu-open (~924) through
  the close (978) the oracle swaps to a DIFFERENT window — at 964 the frame
  right edge is x141 vs the app's x181, the interior gets gradient border
  rows (115,107,132)/(222,214,222) instead of solid white, and the text is
  longer/different. The doc §3's "960-963 message-box residual" (item (c))
  therefore actually spans 960-978. A second, intermittent ~489px
  mon-icon/slot-region phase residual appears on the y_obj=0/2/8/10 fade
  frames (also the 5224px band at frame 883). Both are content classes out
  of this step's scope, so I kept the dense-a spec green at 276/276 rather
  than commit a red extension, and did NOT open a scout.
- **Next:** bind item (c) (decode the oracle's submenu/close message box:
  window template + text + when it reverts to the settled box), then extend
  dense-a to 964-979 → 292/292; then item (b) (open-fade 766-824) per
  `docs/fade-layer-forensics.md` §2.
- **Notes:** ISSUES #80 remainder rewritten — item (a)'s blend folded in as
  LANDED, its open 964-978 exactness attributed to (c). No PAPERCUTS.

- **State:** master at this entry's commit, clean. Final independent union
  verification (including the animation-main fold): `npm run build` green;
  full `npm test` on the union found **3 stale adjacent pins** (worker
  touched-file sets missed them): summaryInfo 6→376 pool, lobby-terminal
  woman 1→9 frames, level50 manifest `ability.displayRows` 8→74 (all three
  track this session's intentional data changes — summary-info pool
  expansion and the woman walking sheet). Supervisor regenerated the level50
  manifest (structurally identical except displayRows) and re-pinned all
  three; targeted rerun 18/18 + smoke 347/347 green, and a final full
  `npm test` confirmation ran detached: **760 files / 7221 passed / 1
  skipped, exit 0** — the union (all session work + the animation fold +
  the re-pins) is fully green.
  Supervisor-rerun specs this session: `mid-battle-switch-pacing-b-off`
  **153/153** (was 148/152; spec +1408), `party-menu-status-item-off`
  **251/251 byte-exact** (was 0/251 red-band 757/803),
  `mid-battle-switch-dense-a-off` **276/276** (spec 1035-1255 → 980-1255),
  `loss-beyond-boundary-off` **183/183** (was 165/183),
  `postwin-record-second-off` **164/164** (new spec),
  `postwin-record-off` 204/204, `postwin-retire-off` 211/211,
  `fight-menu-chrome-torment-off` 57/57, `battle-command-generated-off`
  128/128, `loss-terminal-decline-continuation-off` 155/155.
  `animation-main` folded at wind-down (FLASH + GRASS_WHISTLE promoted exact,
  inventory pin 110-exact/166-unsupported rides the fold; nothing to fold at
  orient). Their session stayed live and landed 2 further commits AFTER the
  fold — deliberately left unfolded (documented-fine); the next session's
  orient fold takes them. No worker worktrees/branches left. DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was the documented docs-only false positive.
- **Did (11 DeepSeek workers: 6 main, 5 side; 2 cap-kills salvaged, 1
  cap-kill relaunched):** MAIN — #80 slice 6 close-fade (`1bedd921`, dense-a
  276/276, 964-979 residual named); #78 both tail fixes route-scoped
  (`f82bbf56`+`1c7903fd`, docs-tail cap-kill salvaged by supervisor, entry
  REMOVED); postwin second-RECORD variant (`c4ab96b4`, disableRecordBattle
  flag + 3-option re-ask, spec 164/164); #80 settled band 3 rungs
  (`c74ac274`+`b7df5ac7`+`3507046f`, 251/251); lobby wander NPC rungs 1+2
  (`e63e4c5c`+`b3ca3033`, 183/183; rung-3 walk-spec draft was red 27/153 —
  dropped, hold-walk +1 finding banked in Next). SIDE — #78 tail forensics
  (57b40647, 5th red frame 1408 discovered); lobby blockers scout (d73e0c60,
  camera + pose A); second-RECORD probe (ff9ea053, 3-run byte-identical);
  party-band forensics (dce2da72, 757px → 3 named classes, 0 unattributed);
  fade-layer forensics (23369900, retry after a zero-commit cap-kill, per-frame
  y_bg/y_obj tables both windows).
- **Supervisor corrections/decisions:** the lobby scout's "camera clamped /
  same tiles at boundaries" clause was pixel-refuted (21385px raw vs 6452px
  after 16px shift) — §5a corrected to FOLLOW-CAM + border blocks before
  briefing the bind; the band-forensics "mon-icon" attribution dissolved
  (3 missing pokeball sprites); `{LV}` ligature is charmap HEX 0x34=52 (doc
  said 34 decimal); the walk-spec draft was deleted rather than committed
  red. PAPERCUTS +1: side worktrees can start with a dangling reference/
  symlink.
- **Next (ordered):** (1) `loss-lobby-walk-off` promotion — blocked on the
  hold-walk +1 finding (the walk fixture's continuous-hold stepping runs 1
  frame behind the oracle and accumulates; tap/turn model is exact at
  183/183; re-measure hold-start latency, then promote); (2) #80 fade
  remainder from `docs/fade-layer-forensics.md` (close 964-979 layer-split
  blend → dense-a 292/292; open-path fade render 766-824; the 960-963
  pre-fade message-box residual); (3) #71 send-out seam (standing);
  (4) animation lane's next: METAL_CLAW / AGILITY per their ledger.
- **Notes:** DeepSeek cap economics again: every landing brief carried an
  inlined validated model/table; both zero-commit or red tails were
  exploration (fade scout round 1, walk-spec rung 3). JSONL salvage seeded
  the fade retry's verified-facts brief (landed in one cap). No DEFERRED
  entries; run-supervisor.sh is unblocked.

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



