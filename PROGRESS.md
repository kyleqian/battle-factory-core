# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 992 — [bounded MAIN worker, 2026-08-08] ISSUES #80 Class B LANDED (last open-fade defect): per-sprite draw-origin offsets — dense-a **341 → 354/354 byte-exact**, open window fully closed

- **State:** master `8a70a108`, clean. Typecheck + `npm run build` green,
  `npm run test:smoke` **347/347**; touched test files **37/37**
  (battlePartySelect 19/19 incl. the new Class B pin + inbattlePartyMenuVisualBind
  8/8 + factoryVoluntarySwitchSeam 10/10). Dense-a spec extended
  `766/768/770-780` (341 → **354 frames**), **354/354 twice-run byte-exact**
  (fast loop 763:781 **19/19**). Keep-green all held: party-menu-status-item-off
  **251/251**, mid-battle-switch-pacing-b-off **153/153**,
  battle-command-generated-off **128/128**. Full `npm test` NOT run (worker
  rule — supervisor after merge).
- **Did (per `docs/fade-layer-forensics.md` §9 RAM probe, re-measured fresh):**
  the player healthbox sprite's real `y2` steps 0→1 at oracle frame **770**
  (`openElapsed 7`) and the player back sprite's real `y2` steps 1→0 at frame
  **779** (`openElapsed 16`) — confirmed pixel-side that the oracle's shifted
  content = `settled(y−1)` in the box region, the newly-revealed top row 74 is
  the app's own floor (both byte-exact), and the slanted corner pixels come out
  right because the sprite's transparency travels with it. Applied as per-sprite
  **draw-origin** offsets (`healthboxShift +1` / `backSpriteShift −1`) gated on
  `openElapsed` inside `drawBattle2ActionMenuWindow` (threaded through
  `renderGeneratedBattleCommandPresentation` → `drawBattleScene[ObjOnly]` +
  `PartySelectCloseRenderAssets`), so both the full draw and the obj-only
  scratch carry the same offset and the Class A alpha-coverage composite guard
  still holds. Tier-1 pin: rendered settled action-menu scene — healthbox
  top-frame row at 74 at e=6 → 75 at e=7 (floor revealed above), back-sprite
  ear tip appears at (86,58) only at e=16; both constants pinned; **each
  red-verified independently** (neutralizing one shift fails its own
  assertions). Also swept up a latent stale pin: `factoryVoluntarySwitchSeam
  .test.ts` asserted 14/40 for the close fade while the constants landed 15/39
  earlier (prior worker missed it) — now aligned and green.
- **Next:** supervisor verify + full `npm test`; the last #80 item is the
  SEND OUT/SUMMARY/CANCEL submenu-window geometry (~4461px at 926-963, never
  spec-captured; a side lane is measuring it).
- **Notes:** the two prior row-shift attempts failed on the sprite's own
  boundary (27 bad pixels); drawing at the changed coordinate resolves them by
  construction. No PAPERCUTS.


## 991 — [supervisor WIND-DOWN, 2026-08-07] Session summary: 17 workers / 9 rounds — the in-battle party menu's OPEN+CLOSE window is now fully byte-exact (dense-a 276 → **354/354**), lobby input FREEZE fixed, `loss-lobby-walk-off` PROMOTED **177/177**, #71 Slice A REFUTED

- **State:** master at this entry's commit, clean. **Final independent union
  verification: `npm run build` exit 0 and full `npm test` 768 files /
  7284 passed / 1 skipped, exit 0** (re-run after the stale-pin fix below;
  the first union run had found that 1 failure). `animation-main` folded at
  wind-down (18 commits: MINIMIZE/TORMENT promoted exact, MOVE_DETECT staged);
  that lane stayed live and landed **2 further commits after the fold**, left
  deliberately unfolded — the next session's orient fold takes them.
  **Note on ordering:** the Class-B step (entry 992, above) landed AFTER this
  summary was first written — its launcher digest was truncated and the
  supervisor briefly misread the worker as failed; git log corrected it. The
  numbers here are the final ones.
  Supervisor-rerun specs this session: `mid-battle-switch-dense-a-off`
  **354/354** (was 276/276 at session start; **+78 frames**, the whole open
  animation plus the close-fade tail), `loss-lobby-walk-off` **177/177**
  (NEW spec; an earlier 129/177 draft had been deleted twice),
  `loss-beyond-boundary-off` **183/183**, `party-menu-status-item-off`
  251/251, `mid-battle-switch-pacing-b-off` 153/153,
  `battle-command-generated-off` 128/128. DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was the documented docs-only false positive
  (verified: no harness commit since the oracle start touched `oracle/` or `bin/`).
- **Did (17 DeepSeek workers: 8 main, 9 side; 4 zero-commit caps, all salvaged):**
  MAIN — close-fade BG/OBJ layer split (`61d98d88`, OBJ one blend step behind,
  frame-979 discriminator byte-exact); the whole party-menu OPEN animation
  (`054ab5ce`: bright-hold 3 / field-fade-out 16 / black-hold 27 / menu-fade-in
  16, 49 of 54 frames exact first pass); submenu message-window swap +
  icon-clock +2 stall (`9b9a74e2`, dense-a 325 → **341/341**); lobby free-roam
  input-freeze fix + walk timing (`395fc2cc`); open-fade Class A obj-only layer
  (`7b8eedb0`); lobby woman whole-frame h-flip + south/east 1px lag with the
  spec promotion (`2d0f3d65`, **177/177**); open-fade Class B per-sprite
  draw-origin offsets (`c24f0f4e`, **354/354** — open window CLOSED).
  SIDE — fade §6 open-window field fade-out; lobby §7 continuous-hold model;
  fade §7 message-window swap + icon phase; fade §8 open residual classes;
  lobby §8 woman sheet audit; #71 Slice-A staged RATTATA fixture + RAM receipt.
- **Supervisor corrections/decisions:** (1) **#71 Slice A REFUTED** — under
  Battle Scene OFF the settled front sprite is `{x2:0,y2:0}` with
  `SpriteCallbackDummy`, so applying the banked `{x2:1,y2:0}` terminal offset
  would have been a **361px regression**, not an inert no-op; that wiring is
  ON-profile-only and the OFF main lane has nothing to hook up (ISSUES #71
  updated; Slice C guards remain the main-lane residue).
  (2) The open-fade 5-frame residual was mislabelled "opponent idle breathing
  squish" — it is the **player healthbox**, refuted by bbox and by the OFF RAM
  receipt; corrected in ISSUES #80 and `docs/fade-layer-forensics.md` §8, and
  the corrected attribution is what let Class B land.
  (3) A worker committed dense-a red at 325/330; supervisor trimmed the 5
  residual frames rather than leave a red spec (`980d7083`).
  (4) `tools/probe/fade-layer-forensics.ts` reported **ALL CHECKS PASS with
  zero frames measured** when pointed at a wrong directory — fixed to FAIL
  (`7c7e8fe2`); every probe written afterwards had to keep that property.
  (5) `{PKMN}` resolved as charmap bytes 0x53/0x54, not a nickname splice
  (`charmap.txt:51`) — unblocked item (c).
  (6) The wind-down union suite caught one **stale adjacent pin**
  (`factoryVoluntarySwitchSeam` pinned the pre-split 14/40 close constants);
  re-pinned to 15/39 with the reason in the comment.
- **Next (ordered):** (1) the in-battle **submenu window geometry** — the
  SEND OUT/SUMMARY/CANCEL window carries ~4461px of difference across 926-963
  and has never been spec-pinned; the app draws a scaffold generic 10x6 window
  at (144,80) while the oracle's real template lives in
  `reference/pokeemerald/data/party_menu.h`. This is the last known visual gap
  in the party menu. (2) #71 Slice C — guard the `src/engine/` back hand-fits
  so an uncovered species/nature fails loudly instead of drawing the wrong
  table. (3) #73 terminal-seam rung B. (4) animation lane's own ledger.
- **Notes:** 4 of 17 workers returned zero commits; every one was salvaged from
  its JSONL and the facts banked in docs before re-briefing, and two of those
  salvages (the Class-B sprite coordinates, the woman sheet-index lead)
  directly produced the next round's landing — Class B in particular was
  measured twice independently by cap-killed workers and then implemented from
  those coordinates in one clean round. Lesson worth keeping: **a truncated
  launcher digest is not evidence of failure — check `git log` before
  re-briefing.** The supervisor briefly treated a successful Class-B worker as
  dead on that basis. No DEFERRED entries; `run-supervisor.sh` is unblocked.


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
