# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 995 — [supervisor, 2026-08-08] Orient + round 1: `animation-main` folded and union-verified, ISSUES #80 CLOSED (395/395 supervisor-rerun), Castform Forecast barrier RETIRED — plus a 3-day CPU leak killed

- **State:** master at this entry's commit, clean. **Union baseline verified
  independently after the fold: full `npm test` 768 files / 7288 passed /
  1 skipped, exit 0; `npm run build` exit 0.** DEFERRED.md: no open entries.
- **Fold:** `animation-main` merged into master at orient — **fast-forward**,
  6 commits (`8fc77bdb..06077049`): MOVE_DETECT promoted exact (inventory
  122→123), MOVE_IRON_TAIL staged with its 135-frame measured window and
  `ironTailProbe.py`. The lane merged master into itself first, so the fold
  needed no conflict resolution. That lane stayed live and is still
  committing; later commits are the next orient fold's.
- **Round 1 (2 DeepSeek workers, both productive, 0 lost):**
  - MAIN — ISSUES #80's last gap: the app opened the party-menu action submenu
    **3 frames early**. `SUBMENU_OPEN_VISUAL_DELAY = 3` + a `submenuOpenElapsed`
    counter now gate the action window, the message-window swap and the CANCEL
    suppression; the mon-icon stall and close fade are untouched. Dense-a
    **392 → 395/395**, fast loop 920:965 46/46. **Supervisor reran the compare
    independently: 395/395.** ISSUES #80 deleted in full.
  - SIDE — ROADMAP S10 gate-4: the last `unsupported-branch` barrier in
    `battleScriptTryCastformDataChangeOpcode.ts` is **retired, not narrowed**.
    `Cmd_trycastformdatachange` now writes the durable SET_BATTLER_TYPE pair
    and `gBattleStruct->formToChangeInto`, and pushes the real
    `BattleScript_CastformChange` continuation (modeled as the machine's
    `call`); `B_SCR_OP_DOCASTFORMCHANGEANIMATION` is registered alongside.
    Ratchet pin 1 → 0. A live Forecast Castform rental (Frontier sets 204/309)
    used to halt the kernel the moment weather turned on; it now changes form
    and type. **Supervisor verification: 58/58 across the four acceptance
    files, plus an independent red-verify — neutralizing the durable type
    write turned 9 tests red across 3 files before restore.**
- **Next:** #39 dispatcher slice 7 (turn-2 epoch/content fold, main) and the
  `Cmd_datahpupdate` substitute-fade barrier (side, and note it carries a
  latent bug: source re-checks `substituteHP == 0` after BOTH branches, so
  exact-lethal damage to a Substitute must fade and today does not).
- **Notes:** at orient the host carried **three orphaned
  `probeEvolutionBasic.ts` node processes, PPID 1, started 2026-08-04 and
  still running 3 days later** at 43-81% CPU each — load average 12 on 16
  cores before any worker launched, and the baseline suite was running at
  roughly a fifth of normal speed. Killed; PAPERCUTS entry added with the
  orient-time detection command. Worth repeating at every orient.

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
