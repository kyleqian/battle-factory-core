# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 973 — [bounded MAIN worker, 2026-08-06] battle-message pacing holds bound — #81 4b CLOSED 57/57, #78's 1256-1407 message-pacing window byte-exact

- **State:** master `13a368a3`, clean. Typecheck green; `npm run test:smoke`
  **347/347**; touched test file 35/35. Full `npm test` NOT run (worker rule —
  supervisor runs it after merge); build run green.
- **Did (bind the two hold classes; `docs/battle-message-pacing-ground-truth.md`**
  **is the measured target, verify script PASS):** (1) Class 2 — added
  `STRINGID_BUTITFAILED` + `STRINGID_BUTNOTHINGHAPPENED` to
  `WAITMESSAGE_LONG_MESSAGE_IDS` (holdFrames 64, the ButItFailed/Splash script
  tails' `waitmessage B_WAIT_TIME_LONG`). (2) Class 1 — route-scoped
  `STRINGID_USEDMOVE` post-print hold for the failed/no-anim path: the source
  runs `pause B_WAIT_TIME_SHORT` (32)+~6 dispatch / the SPLASH controller span
  with NO waitmessage, measured 38 (torment) / 39 (SPLASH). The orchestrator
  carries `usedMessageHoldFrames` and applies it to every command presentation
  it installs (incl. the fresh handoff at the next command boundary, so the
  turn-2 switch resolution gets it); the route hold counts from print
  completion (`minimumFrames: 0`, exact printable length — the 23-glyph
  "…used SPLASH!" clears at +62 not +63). Default 0 keeps the standard hit
  chain untouched.
- **Verified:** `fight-menu-chrome-torment-off` **55/57 → 57/57** (frames
  1100/1200 green, #81 remainder 4b closed). New dense spec
  `mid-battle-switch-pacing-b-off` **148/152**: the **1256-1398 message-pacing
  window is byte-exact** (M1 "…used SPLASH!" typing + 39-hold, M2 "But nothing
  happened!" typing + 64-hold). Named residual, the #78 turn-boundary
  menu-chrome class (NOT trimmed, NOT chased per brief): **1399/1400** = app's
  box text clears 2 frames late (its separate `turn-end` command persists the
  M2 text past the oracle's 1399 clear — the 64+10 turn-end tail seam, not the
  message hold), **1406/1407** = action-menu/fight-menu redraw chrome (the #78
  window's own binding target). Regressions unchanged:
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **221/221**, `postwin-record-off` **204/204**. New Tier-1 pins in
  `tests/battleResolutionPresentation.test.ts` (the two WAITMESSAGE_LONG ids
  resolve to the shared 64-hold object; the route hold fires with
  `usedMessageHoldFrames` and does NOT fire by default) — red-verified by
  reverting the src (1/2 pins fail), restored green.
- **Next:** #78's 1399-1407 box-clear + action-menu redraw binding; then per
  the ordered list: #80 rank 6, lobby walkable + REST guard.
- **Notes:** no PAPERCUTS. The verify script's `_verify-*` scratch dirs and the
  two pacing spec fixtures are the same battle (identical segments/parties,
  different capture windows). B_WAIT_TIME_MED (48) still unexercised.

