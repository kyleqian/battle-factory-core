# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 994 — [bounded MAIN worker, 2026-08-08] ISSUES #80 FULLY CLOSED: 3-frame submenu open delay landed — dense-a **392 → 395/395 byte-exact**, #80 entry deleted

- **State:** master at this entry's commit, clean. Typecheck + `npm run build`
  green, `npm run test:smoke` **347/347**, touched test files **48/48**
  (battlePartySelect 20/20 incl. the new 3-frame open-edge pin + visual bind
  11/11 + partySelect 17/17). Fast loop 920:965 **46/46** (was 43/46). Dense-a
  spec extended 923-925 (+3) → **395/395 byte-exact, twice-run**. Keep-green
  all held: party-menu-status-item-off **251/251**,
  mid-battle-switch-pacing-b-off **153/153**, battle-command-generated-off
  **128/128**. Full `npm test` NOT run (worker rule — supervisor after merge).
- **Did (per `docs/fade-layer-forensics.md` §10(d)):** the A-press edge sets
  `submenuOpen` (state rendered at 923), but oracle frames 923-925 still show
  the pre-open state — wide "Choose a POKéMON." 21x2 window + CANCEL button,
  no action window, no cursor — and the whole SHIFT/SUMMARY/CANCEL window +
  swapped 16x2 "Do what with this {PKMN}?" window pop together at 926, one
  frame, no animation. Measured at 923-925: the app-drawn extras are exactly
  the action-window frame+interior+3 labels+cursor (144,96)-(238,159) and the
  swapped message window (0,128)-(128,143), replacing the oracle's wide window
  (8,136)-(176,152) and CANCEL button; icon/left/right-column regions 0 diff.
  Added `SUBMENU_OPEN_VISUAL_DELAY = 3` + a `submenuOpenElapsed` counter
  (0 on the A-press edge, +1/tick while `submenuOpen`); the action window
  (`submenuWindowVisible`), the message-window swap, and the CANCEL pokeball
  suppression are now gated on it. The mon-icon +2 stall (`submenuOpened`) and
  the confirm-edge/close-fade are untouched — frames 926+ byte-identical.
  Tier-1 pin red-verified: neutralizing the delay to 0 fails the new test's
  pre-open loop (elapsed 0/1/2 render the open state, [74,74,107] at (141,140)
  vs white). Forced projection maps open submenu to `submenuOpenElapsed = 3`.
- **Next:** supervisor verify + full `npm test`. ISSUES #80 deleted in full —
  the last open item (this 3-frame edge) is closed; nothing else open.
- **Notes:** no PAPERCUTS. Commits `75bf7ce2` (the delay) + `dcef570d` (spec
  + pin) + this docs commit.

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


## 991 — [supervisor WIND-DOWN, 2026-08-07] Session summary: 19 workers / 10 rounds — ISSUES #80's in-battle party menu is EFFECTIVELY CLOSED (dense-a 276 → **392/392**), lobby input FREEZE fixed, `loss-lobby-walk-off` PROMOTED **177/177**, #71 Slice A REFUTED

> **Read entries 992 and 993 above first** — two further main-lane steps
> landed after this summary was written (Class B, then the submenu window).
> The headline and Next list here are updated to that final state; the body
> below describes the session as a whole.

- **State:** master at this entry's commit, clean. **Final independent union
  verification: `npm run build` exit 0 and full `npm test` 768 files /
  7284 passed / 1 skipped, exit 0** (re-run after the stale-pin fix below;
  the first union run had found that 1 failure). **Re-run once more after the
  submenu step (entry 993): `npm run build` exit 0, full `npm test` 768 files
  / 7287 passed / 1 skipped, exit 0** — that is the final verified state, with
  the supervisor's own rerun of `mid-battle-switch-dense-a-off` at
  **392/392**.
  `animation-main` folded at
  wind-down (18 commits: MINIMIZE/TORMENT promoted exact, MOVE_DETECT staged);
  that lane stayed live and kept committing after the fold (6 further commits
  by wind-down and still moving), left deliberately unfolded rather than
  chasing a moving branch — the next session's orient fold takes them.
  **Note on ordering:** the Class-B step (entry 992, above) landed AFTER this
  summary was first written — its launcher digest was truncated and the
  supervisor briefly misread the worker as failed; git log corrected it. The
  numbers here are the final ones.
  Supervisor-rerun specs this session: `mid-battle-switch-dense-a-off`
  **392/392** (was 276/276 at session start; **+116 frames** — the whole open
  animation, the close-fade tail and the submenu window), `loss-lobby-walk-off` **177/177**
  (NEW spec; an earlier 129/177 draft had been deleted twice),
  `loss-beyond-boundary-off` **183/183**, `party-menu-status-item-off`
  251/251, `mid-battle-switch-pacing-b-off` 153/153,
  `battle-command-generated-off` 128/128. DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was the documented docs-only false positive
  (verified: no harness commit since the oracle start touched `oracle/` or `bin/`).
- **Did (19 DeepSeek workers: 10 main, 9 side; 4 zero-commit caps, all salvaged):**
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
- **Next (ordered):** (1) **#80's last residual** — the app opens the submenu
  **3 frames early**: oracle frames **923-925** still show the pre-open state
  while the app already draws the window (fast loop 920:965 is 43/46; those 3
  are deliberately not in the spec). Delay the submenu render to the oracle's
  926 pop edge, then extend `captureFrames` with 923-925 → **395/395**. The
  A-press is 922-923 and the window lands 3 frames later, all at once
  (`docs/fade-layer-forensics.md` §10(d)). (2) #71 Slice C — guard the
  `src/engine/` back hand-fits so an uncovered species/nature fails loudly
  instead of drawing the wrong table (Slice A is refuted, see above; Slice D
  is ON-profile). (3) #73 terminal-seam rung B. (4) fold `animation-main`'s
  2 outstanding commits at orient. (5) animation lane's own ledger.
- **Notes:** 4 of 19 workers returned zero commits; every one was salvaged from
  its JSONL and the facts banked in docs before re-briefing, and two of those
  salvages (the Class-B sprite coordinates, the woman sheet-index lead)
  directly produced the next round's landing — Class B in particular was
  measured twice independently by cap-killed workers and then implemented from
  those coordinates in one clean round. Lesson worth keeping: **a truncated
  launcher digest is not evidence of failure — check `git log` before
  re-briefing.** The supervisor briefly treated a successful Class-B worker as
  dead on that basis. No DEFERRED entries; `run-supervisor.sh` is unblocked.
