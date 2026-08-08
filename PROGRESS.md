# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 990 — [bounded MAIN worker, 2026-08-08] Lobby wandering-woman renderer fixes LANDED; `loss-lobby-walk-off` PROMOTED **177/177 byte-exact** (was 129/177, 48 red)

- **State:** master `2d0f3d65`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, lobby/terminal test files **23/23**
  (factoryLobbyFreeRoam 19/19 incl. 2 new pins red-verified + factoryLobbyTerminal
  4/4). New spec `loss-lobby-walk-off` **177/177 byte-exact, twice-run green**.
  Keep-green all held: `loss-beyond-boundary-off` **183/183**, `postwin-record-off`
  **204/204**, `postwin-retire-off` **211/211**, `loss-terminal-decline-continuation-off`
  **155/155**. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (per `docs/factory-lobby-freeroam-ground-truth.md` §8b/§8c):** the two
  woman residuals were both renderer defects, not sheet/frame issues. (1)
  `drawNpc` (`factoryTerminalRender.ts`) mirrored each 8px tile in place; the
  ROM OAM h-flip mirrors the whole 16px frame (swap tile columns + mirror within).
  Per-tile mirror of frame 2 is a 272px-different sprite; whole-frame = the
  east-idle. (2) south/east `womanAtTick` tables lacked the 1px render lag the
  north walk already carried: south y = 144+(T−5296), east x = 104+(T−5407),
  with the east lag persisting through the 5422 settle tick (measured: oracle
  5422 drawn box x 1px left of the 5430+ idle). Tier-1 pins: a render-level
  whole-frame-flip pin (idle-east frame-2 row 12 at (116,116)/(117,116)/
  (120,116)/(123,116) colors — red-verified by reverting to per-tile) and the
  updated south/east lag expectations (red-verified by reverting the offsets).
- **Next:** supervisor verify + full `npm test`; then ISSUES #80 Class B (the
  1-row healthbox content offset from 770, sole open-fade residual) or #71
  send-out seam.
- **Notes:** spec built from the walk fixture's own 58 segments with
  `captureFrames` = the four walk windows (5181-5229, 5281-5312, 5341-5404,
  5421-5452, 177 frames), `oracleProfile: battle-scene-off`, same
  `loss-terminal-window-off` appStage as loss-beyond-boundary. Both measurement
  probes re-ran clean: `verify-lobby-woman-pose` (matches §8 tables) and
  `verify-lobby-hold-walk` **24/24**. No PAPERCUTS.

## 989 — [bounded MAIN worker, 2026-08-08] ISSUES #80 Class A LANDED (OBJ-lag of the open field-fade-out); the 8-frame dense-a extension to 349 is BLOCKED by Class B's content shift bleeding onto frames 770-780

- **State:** master `7b8eedb0`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched test files **26/26**
  (battlePartySelect 18/18 incl. 2 new pins + inbattlePartyMenuVisualBind 8/8;
  the y-pair and per-layer render pins red-verified by breaking
  `partySelectOpenFieldFadeObjY` — 2 tests fail). Keep-green all held:
  dense-a **341/341**, party-menu-status-item-off **251/251**,
  mid-battle-switch-pacing-b-off **153/153**, battle-command-generated-off
  **128/128**. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (Class A only, per `docs/fade-layer-forensics.md` §8(e)):** the open
  field-fade-out (766-781) now blends the settled action-menu battle scene's
  **OBJ layer at `y_obj(e)=min(16,2·max(0,⌊(e−2)/2⌋))`** — one blend step
  behind `y_bg` — instead of one whole-frame blend. New `obj-only` layer mode
  in `drawBattle2ActionMenuWindow`/`renderGeneratedBattleCommandPresentation`
  (skips the BG tilemap + action chrome), new
  `PartySelectCloseRenderAssets.drawBattleSceneObjOnly`, and a scratch
  composite over the `y_bg`-blended full scene using the scratch's alpha-255
  coverage, counting only pixels the settled full scene still shows (the
  message-box chrome overpaints the sprite rows it covers, keying those to
  BG). Captured result (capture-range 763:781): **766 and 768 byte-exact**;
  770/772/774/776/778/780 drop ~7500px → **1639px each = exactly the Class B
  content shift** (same bbox/pixels as 771-779).
- **Blocker (why NO spec extension):** the Class B 1-row healthbox content
  offset begins at frame 770 (§8c) and is exposed once the OBJ-lag is fixed,
  so 6 of the 8 target frames still carry the Class B residual. §8(e)'s "8
  Class A frames go byte-exact" prediction was wrong; the brief's "Class B is
  out of scope" rule plus the promotion rule ("do not commit a red spec")
  therefore mean the 766-780 extension to **349 is NOT committed** — code +
  tests landed without it (acceptance #3). ISSUES #80 updated: Class A marked
  FIXED, only Class B remains.
- **Next:** supervisor verify + full `npm test`; then Class B (the player
  healthbox's 1-row content offset from 770, now the sole open-fade residual
  on 770-780) — once it lands, dense-a extends 766-780 → **349/349**.
- **Notes:** used the brief's option 1 approach (a sprite-only scratch draw)
  rather than the bbox fallback; an `objRGB == fullRGB` guard was required to
  exclude the 20px the BG message-box chrome covers on the sprite bottom rows
  (first obj-only pass over-included them). No PAPERCUTS.

## 988 — [bounded MAIN worker, 2026-08-07] ISSUES #80 item (c) CLOSED: submenu-open message window swap + icon-clock +2 stall — dense-a spec 325 → **341/341 byte-exact**

- **State:** master `23c64070`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched test files **31/31**
  (battlePartySelect 17/17 + partyMonIconAnim 6/6 + inbattlePartyMenuVisualBind
  8/8; 3 new pins red-verified by breaking each behavior). Keep-green all held:
  dense-a **341/341** (spec extended 964-979, twice-run), party-menu-status-item-off
  **251/251**, mid-battle-switch-pacing-b-off **153/153**, battle-command-generated-off
  **128/128**. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (per `docs/fade-layer-forensics.md` §7, side-branch `1648f56f`):**
  (1) message-window swap at the submenu-open edge — `drawPartySelectBgLayer`
  now draws **sDoWhatWithMonMsgWindowTemplate** (16x2, frame to x141) +
  `gText_DoWhatWithPokemon` "Do what with this {PKMN}?" (prefix via charmap,
  tail = glyph codes **83/84/172** = the PK/MN ligatures + full-width "?",
  NOT a nickname splice) in place of the 21x2 "Choose a POKéMON." window; the
  swap persists through the close (`submenuOpen || closeElapsed`), while the
  submenu window closes on the confirm edge and the CANCEL pokeball window
  returns. (2) icon clock — new persistent `submenuOpened` state flag +
  `MON_ICON_SUBMENU_OPEN_STALL = 2` (`monIconElapsedAfterSubmenuStall`): the
  oracle's 2-frame submenu-open stall is applied as a +2 offset from the
  submenu-open edge, so toggles land at **930/937/945/...** not 928/935/943/
  (B hold 920-929), clearing the 489px residual on 965/966/973/974.
- **Acceptance:** dense-a `captureFrames` extended 964-979 (325 → **341**),
  **341/341 byte-exact** — the close-fade band 964-978 residuals were exactly
  the (c) content classes, not the §1 fade blend. Tier-1 pins: the 16x2 window
  rect switch ((141,140) frame bevel vs settled white, incl. through closeElapsed),
  `DO_WHAT_WITH_MON_TAIL_CODES === [83,84,172]` + 164px oracle-measured tail ink,
  and the stall's toggle ticks (stall(928/929)=1, stall(930)=0, stall(937)=1,
  stall(945)=0 vs un-stalled 928/935) — each red-verified.
- **Next:** supervisor verify + full `npm test`; then the #80 open-fade
  residual (opponent idle breathing 771/773/775/777/779) or the newly-named
  submenu-window geometry gap (926-963, uncaptured).
- **Notes:** the app's SEND OUT submenu window geometry (10x6 at (144,80)) is
  still a visual gap vs the oracle's taller window (~4461px at 926-963) — left
  out of scope (uncaptured; not part of the (c) acceptance). No PAPERCUTS.

## 987 — [bounded MAIN worker, 2026-08-07] Post-loss lobby free-roam input freeze FIXED + walk timing corrected; `loss-lobby-walk-off` promotion BLOCKED at 129/177 by the woman's south/east-walk residuals

- **State:** master `395fc2cc`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched test files **22/22**
  (factoryLobbyFreeRoam 18/18 incl. 2 new pins red-verified + factoryLobbyTerminal
  4/4). Keep-green `loss-beyond-boundary-off` **183/183**; `verify-lobby-hold-walk`
  **24/24**.
- **Did:** (1) the confirmed bug — a refused `startStep` (:140 old) returned the
  state unchanged and the idle path re-buffered `pendingDir = heldDir` every
  frame at a blocked border, so holding DOWN at map (4,11) swallowed every later
  press forever. Now: refused steps clear `pendingDir` and enter the §7b act-25
  border bump on the blocked tick (16-frame cycles 5229-5244/5245-5260, pose
  walk-2→stand, re-arms only while held, settles on release). (2) NEW finding,
  beyond the brief: the app's walk was **1 frame behind the oracle's DISPLAYED
  scroll/pose** (the side worker's "walk clock byte-true" claim held for the RAM
  timings, not the rendered pixels — verified via the box-gone same-tick anchor
  at 5093 and the displayed step-1 first-pixel at 5182). Fixed by rendering a
  FRESH step's first pixel (progress 1) on the step-start frame and starting the
  walk cycle at the ROM step-alternation pose (south/west walk1, north walk2);
  continuations keep progress 0 on the arrival frame (= arrived tile). (3)
  `womanAtTick` pose lag (rendered one frame behind the RAM cmdIdx) for all
  three walks — north walk 5185/5193 now byte-exact.
- **Blocker (why no spec):** `loss-lobby-walk-off.json` reached **129/177**
  byte-exact; the 48 red are entirely the woman's SOUTH walk (5296-5311,
  ~180-194px) and EAST walk + idle-east (5421-5452, ~265-310px), all inside her
  16px sprite column. Her north walk is green; the south/east rendered poses do
  not match ANY `woman_1.png` sheet frame at the app's modeled position/schedule
  (RAM §6d schedule ≠ rendered). Out of time to diagnose; the red spec was
  deleted per the promotion rule (fix + tests committed WITHOUT it).
- **Next:** decode the woman's south/east walk rendered schedule (fresh oracle
  probe; check for a turn-then-step like the player, or a position offset), then
  re-promote `loss-lobby-walk-off` at 177/177.
- **Notes:** no PAPERCUTS. Full `npm test` not run (worker rule). ISSUES #80 item (b) OPEN ANIMATION landed: 763-824 open window now renders (bright-hold/field-fade/black/menu-fade-in); dense-a spec → 330 frames, **325/330** — the 5 missing are the opponent sprite's idle breathing squish (new residual class)

- **State:** master `b76089cc`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**, touched
  test files **22/22** (battlePartySelect 14/14 + inbattlePartyMenuVisualBind
  8/8; 3 new open-phase pins red-verified by breaking the phase boundary /
  y_bg formula). Keep-green all held: `party-menu-status-item-off`
  **251/251**, `mid-battle-switch-pacing-b-off` **153/153**,
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **325/330** (spec extended 980-1255 → **330** frames with the 54-frame open
  list; the 5 red are the named breathing residual). Full `npm test` NOT run
  (worker rule — supervisor after merge).
- **Did (per `docs/fade-layer-forensics.md` §6/§2):** (1) `openElapsed` on the
  party-select state (0 at the 763 A-press, mirrors `closeElapsed`) +
  `battlePartySelectOpenPhase` with named constants (bright-hold 3 /
  field-fade-out 16 / black-hold 27 / menu-fade-in 16, total 62) and the
  §6(b)/§2 coefficient helpers. (2) open-path render in
  `renderBattlePartySelect`: bright-hold + field-fade-out draw the **settled
  action-menu battle scene** — the party-handoff presentation re-rendered in
  action-menu phase (new `drawBattleScene` asset; the brief's `drawField`
  omits the 6621px message-box/action-menu strip, so a byte-exact open needs
  the action-menu drawable) — blended whole at `y_bg`; black-hold = plain
  black; menu-fade-in reuses the close-fade's BG/OBJ scratch-buffer composite
  at `y_bg(m)=14-2⌊m/2⌋` / `y_obj(m)=16-2⌊(m+1)/2⌋`. Result: **49 of the 54
  open frames byte-exact** (763-765, 767/769/781, 782-808, 809-824).
- **Blocked short of 330/330 (measured, not guessed):** the 8 OBJ-lag frames
  (766/768/770/772/774/776/778/780) are the brief's own named residual. The 5
  frames **771/773/775/777/779 each carry a 1639-2037px opponent-sprite
  residual**: the oracle's opponent front RATTATA runs a **non-rigid idle
  breathing squish** during the fade-out — per-row source-dy samples decode
  0/-1/-2/-3 (not a translation), and a whole-sheet +1px drop (tried and
  reverted) makes the healthbox-overlap band worse (1639→2031px). The brief's
  §6 forensics missed it by sampling only (4,4)/(176,52) — the latter a
  uniform sprite-body pixel. Modeling the breathing (frame-2 sprite or bounded
  squish) is a follow-up, not improvised here.
- **Next:** supervisor verify + full `npm test`; then either model the
  opponent idle breathing to close 771-779 (dense-a → 330/330), or bind item
  (c)'s submenu/close message box (960-978, 277/292 close extension), per the
  ISSUES #80 remainder.
- **Notes:** the brief's 54-frame spec was added verbatim (330 entries); the
  5 breathing frames are reported red rather than dropped so the supervisor
  can decide keep-vs-model. The `drawField`-vs-action-menu discovery (brief's
  item 2 assumption) is the reason the open side draws a separate asset. No
  PAPERCUTS.



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



