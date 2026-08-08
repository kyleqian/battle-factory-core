# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 991 — [supervisor WIND-DOWN, 2026-08-07] Session summary: 17 workers / 9 rounds — party-menu OPEN animation built (763-824), close fade layer-split, message window swapped, lobby input FREEZE fixed, `loss-lobby-walk-off` PROMOTED 177/177, #71 Slice A REFUTED

- **State:** master at this entry's commit, clean. `animation-main` folded at
  wind-down (18 commits: MINIMIZE/TORMENT promoted exact, MOVE_DETECT staged);
  independent union `npm run build` + full `npm test` result recorded below.
  Supervisor-rerun specs this session: `mid-battle-switch-dense-a-off`
  **341/341** (was 276/276; +65 frames), `loss-lobby-walk-off` **177/177**
  (NEW spec, was a deleted 129/177 draft), `loss-beyond-boundary-off`
  **183/183**, `party-menu-status-item-off` 251/251, `mid-battle-switch-pacing-b-off`
  153/153, `battle-command-generated-off` 128/128. DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was the documented docs-only false positive
  (verified: no harness commit since the oracle start touched `oracle/` or `bin/`).
- **Did (17 DeepSeek workers: 8 main, 9 side; 5 zero-commit caps, all salvaged):**
  MAIN — close-fade BG/OBJ layer split (`61d98d88`, OBJ one blend step behind,
  frame-979 discriminator byte-exact); the whole party-menu OPEN animation
  (`054ab5ce`: bright-hold 3 / field-fade-out 16 / black-hold 27 / menu-fade-in
  16, 49 of 54 frames exact first pass); submenu message-window swap +
  icon-clock +2 stall (`9b9a74e2`, dense-a 325 -> **341/341**); lobby free-roam
  input-freeze fix + walk timing (`395fc2cc`); open-fade Class A obj-only layer
  (`7b8eedb0`); lobby woman whole-frame h-flip + south/east 1px lag with the
  spec promotion (`2d0f3d65`, **177/177**). SIDE — fade §6 open-window
  field fade-out; lobby §7 continuous-hold model; fade §7 message-window swap
  + icon phase; fade §8 open residual classes; lobby §8 woman sheet audit;
  #71 Slice-A staged RATTATA fixture + RAM receipt.
- **Supervisor corrections/decisions:** (1) **#71 Slice A REFUTED** — under
  Battle Scene OFF the settled front sprite is `{x2:0,y2:0}` with
  `SpriteCallbackDummy`, so applying the banked `{x2:1,y2:0}` terminal offset
  would have been a **361px regression**, not an inert no-op; the front
  terminal-offset wiring is ON-profile-only and the OFF main lane has nothing
  to hook up (ISSUES #71 updated; Slice C guards remain the main-lane residue).
  (2) The open-fade 5-frame residual was mislabelled "opponent idle breathing
  squish" — it is the **player healthbox**, refuted by bbox and by the OFF RAM
  receipt; corrected in ISSUES #80 and `docs/fade-layer-forensics.md` §8.
  (3) A worker committed dense-a red at 325/330; supervisor trimmed the 5
  residual frames rather than leave a red spec (`980d7083`).
  (4) `tools/probe/fade-layer-forensics.ts` reported **ALL CHECKS PASS with
  zero frames measured** when pointed at a wrong directory — fixed to FAIL
  (`7c7e8fe2`); every probe written afterwards was required to keep that
  property. (5) `{PKMN}` resolved as charmap bytes 0x53/0x54, not a nickname
  splice (`charmap.txt:51`) — unblocked item (c).
- **Next (ordered):** (1) **#80 Class B** — the last 11 red frames (770-780) of
  the open fade; the mechanism is measured TWICE independently and banked in
  `docs/fade-layer-forensics.md` §9: player healthbox `y2` 0->1 / `oam.y`
  72->73 at frame 770, player back sprite `y2` 1->0 / `oam.y` 62->61 at frame
  779. Draw the sprites at the changed coordinate — **do not shift composited
  framebuffer rows** (two workers failed that way; a row-shift leaves 27 bad
  pixels on the box outline and its slanted corner). Predicted: extend dense-a
  `captureFrames` with 766, 768, 770-780 -> **354/354**. (2) The in-battle
  submenu window geometry (~4461px at 926-963, never spec-pinned) — the app
  draws a scaffold 10x6 window at (144,80); the oracle's template is in
  `data/party_menu.h`. (3) #71 Slice C guards. (4) animation lane's own ledger.
- **Notes:** 5 of 17 workers returned zero commits; every one was salvaged from
  its JSONL and the facts banked in docs before re-briefing, and two of those
  salvages (the Class-B mechanism, the woman sheet lead) directly produced the
  next round's landing. Rounds 9's two workers barely progressed in 45 minutes
  — the machine was carrying a sibling run plus the animation lane, and
  oracle/CPU contention is the likeliest cause; that is why this session
  stopped launching workers at 19:31 rather than spending the last two hours
  on a fourth Class-B attempt. No DEFERRED entries; `run-supervisor.sh` is
  unblocked.

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
