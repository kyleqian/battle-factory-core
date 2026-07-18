# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 70 — S6 scene-assembly slice FULLY CLOSED: last residual (trace tick 1229, player status bar) resolved with a RAM+pixel-confirmed asymmetric fix — `scene-assembly.json` **256/256** (was 255/256), 0 regressions

- **State:** `npm test` **438/438** (437→438, +1 pin replacing 1 corrected),
  `npm run build` green. `npm run compare -- tools/compare/traces/
  scene-assembly.json` → **256/256** (was 255/256) — the whole
  scene-assembly slice is now byte-exact end to end. Full 18-trace sweep
  re-run, all others at their exact prior counts (anchor 1/1, draft-cursor
  13/13, draft-menu 38/38, draft-menu-slot6 66/66, example 4/4,
  summary-info-onix 122/122, summary-info-magby 132/132, confirm-decline
  67/67, accept-prebattle 137/137, walk-warpout 125/125, room-entry
  110/110, room-npcs 98/98, room-msgbox 142/142, transition 206/206,
  rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) — zero
  regressions.
- **Did — the brief's mandated RAM probe, then the fix:** RAM-probed
  `gSprites[5]` (player bar) and `gSprites[6]` (opponent bar — identified
  by matching each side's known settled corner against
  `docs/battle-interface-assets.md`, same method #64 banked) tick-by-tick
  across 1226-1239 (`tools/probe/ram-probe.py`, full `Sprite` struct:
  callback, `data[]`, oam fields, subpriority, flags). Found the real
  structural asymmetry the brief asked for: the player bar's `x2` STALLS
  for one extra tick right after creation — `x2=95` at BOTH RAM tick 1228
  (its own creation tick) and 1229, only resuming
  `SpriteCB_StatusSummaryBar_Enter`'s ordinary per-tick `x2 += data[0]`
  decrement at RAM tick 1230 — while the opponent bar's `x2` decrements
  every single tick starting immediately at its own creation (`-95` at
  1231, `-90` at 1232, no stall). Every other RAM field checked (callback
  pointer, `subspriteTables` pointer, subpriority, `inUse`/`invisible`
  flags, `data[1..7]`) was byte-identical in kind between the two sides —
  the stall is specifically in `x2`'s per-tick progression, not a
  visibility-flag or ordering difference. Independently pixel-ground-
  truthed the oracle's own captures (re-ran `bin/oracle run` on
  `battle1-scene-dense.json`, diffed consecutive frames in each side's
  screen region) to re-verify both first-visible ticks from scratch rather
  than trust the brief's numbers: player region is byte-identical
  background through trace tick 1229 and first changes at 1230 (22px,
  matching — hand-computed from the actual tileset asset — the bar's
  leading-tile opaque wedge at exactly `x2=95`); opponent region is
  unchanged through 1231 and first changes at 1232 (22px, same shape).
  Both match the brief's cited ticks exactly. Fix: added
  `PLAYER_BAR_VISIBLE_TICK = PLAYER_CREATE_TICK + 1`, gating ONLY the
  player bar's `visible` field in `ballStatusBarPositions` — the table
  lookup itself (and the opponent bar, and both sides' ball icons) is
  untouched, since the RAM-baked `PLAYER_BAR_X2` table already encodes the
  same stall verbatim as a literal repeated value (`[95, 95, 90, ...]`)
  and the icons' own per-icon flat-delay prefix already keeps them fully
  off-screen through this exact tick regardless (so any analogous stall
  there, if present, produces no visible pixel and needs no correction).
  This is the per-side structural fix the brief required, not a blanket
  offset — confirmed it doesn't disturb the opponent's own first-visible
  tick (1232, re-verified above) or any of the other 255 already-matching
  frames (full sweep, 0 regressions). Updated the one existing Tier-1 test
  that pinned the old (buggy) tick-1229-visible behavior, plus added a new
  pin for the corrected asymmetric gate; `battleScene.ts` module doc point
  3 and its top-of-file STATUS note rewritten with the full derivation.
- **Next:** the scene-assembly slice (S6) is fully closed — no further
  action needed there. Remaining S6/roadmap work: the send-out engine
  slice (ticks 1300-1560, `battle-scene-notes.md` §7) and player send-out
  + menu (1560-1810, `battle-menu-notes.md`) — groundwork complete, assets
  ready, per #65's plan. S7 (battle-turn engine) stays behind S6, dossier
  ready per #67/#69.
- **Notes:** PAPERCUT: none new. RAM-probe scratch output went to
  `/tmp/probe-identify*`, `/tmp/probe-deep*`, `/tmp/gt-recap/` (not
  committed, no stale-cache risk).

---

## 69 — S7 data needs closed (parallel worktree lane, merged): battle-message TEMPLATE system extracted + pixel-cross-checked, DOUBLE_TEAM evasion stage RAM-pinned, held-item damage-path inventory exhaustive

- **State:** merge of `worker/wt-20260718-151756` (base `d1072d3`, merged
  onto #68's `a515081`): `npm test` **437/437** (429+8), `npm run build`
  green, anchor 1/1 post-merge.
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `extract-battle-messages.ts` → `battle-message-templates.json`
  (365/369 `gBattleStringsTable` entries as structured segments +
  `STRINGID_USEDMOVE` + 52 `B_TXT_*` placeholders + stat-name/
  MULTISTRING sub-tables) and `extract-species-names.ts` →
  `species-names.json` (412) — a real pre-existing gap. Pixel-cross-
  checked against `battle1-turn1.json` captures at ticks 1960/2270
  (supervisor re-inspected both PNGs): "Foe GROVYLE used / DOUBLE TEAM!"
  and "ONIX used / ROCK SLIDE!" — including the "Foe " prefix the
  dossier's prose had dropped (corrected in place). +5 template tests.
  (2) `gBattleMons[1].statStages[EVASION]` flips 6→7 at tick 1959, holds
  to trace end, nothing else moves (probe spec committed, twice-run
  byte-identical) — closes dossier §8 risk 5. (3) BRIGHT_POWDER/
  LAX_INCENSE (`HOLD_EFFECT_EVASION_UP`, params 10/5) and WHITE_HERB
  (`RESTORE_STATS`) each have exactly ONE engine call site, neither in
  `CalculateBaseDamage` — EVASION_UP is accuracy-only (live for
  ROCK_SLIDE's roll vs Grovyle), line-cited in the dossier; full 70-item
  `item-hold-effects.json` extracted + pinned (+3 tests).
- **Next:** S7 stays behind S6. Remaining dossier needs: move-animation
  assets (§7 item 5), turn-end RNG cluster attribution,
  `gBattleControllerExecFlags` decoding.
- **Notes:** worktree removed, branch deleted after merge. No PAPERCUT.

---

## 68 — S6 scene-assembly GAP A FULLY RESOLVED: blend precision runs in 8-bit space not 5-bit (mathematically proven, not curve-fit), plus evaEvb's own one-tick render lag — `scene-assembly.json` 255/256 (was 151/256), whole 1075-1226 window byte-exact, 0 regressions

- **State:** `npm test` **429/429** (428→429, +1 pin, 2 corrected), `npm
  run build` green. `npm run compare -- tools/compare/traces/
  scene-assembly.json` → **255/256** (was 151/256). Full 18-trace sweep
  re-run, all others at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, accept-prebattle 137/137, walk-warpout 125/125,
  room-entry 110/110, room-npcs 98/98, room-msgbox 142/142, transition
  206/206, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions. Bonus: groundtruth trace `battle1-intro.json` also
  improved 141→167/254 (same fix, different trace, not required).
- **Did — the brief's mandated VRAM probe, then the real fix:** ran
  `tools/probe/ram-probe.py` on BG1CNT (`0x0400000A`), BLDCNT/BLDALPHA
  (`0x04000050`/`0x04000052`), the literal tilemap entry at
  `BG_SCREEN_ADDR(28)` for GAP A's named pixel (tick 1150, x=120/y=84,
  tileRow 10/tileCol 28), that tile's char (`BG_CHAR_ADDR(1)`) and
  palette-RAM bytes — every axis the brief flagged unverified came back
  **clean**: BG1CNT decodes to `screenSize=2` (256px-wide) exactly as
  `gBattleBgTemplates[1]` and this module already assumed (no bug); the
  tile entry (`tileId=8/hFlip=0/vFlip=0`) and its char data match the
  extracted JSON exactly; the entry's raw palette nibble is hardware
  bank 4 (JSON stores it locally as bank 2) but both read the identical
  RGB(222,231,247) — `extract-battle-bg.ts` renumbers only the banks a
  tileset references, a labeling convention, not a data bug. So the
  residual wasn't geometry/extraction. Root cause, found by hand-solving
  the blend equation: oracle's own pixel value there, (242,246,252), is
  **mathematically unreachable** by blending any two GBA palette colors
  in 5-bit space under any `eva`/`evb` — `(c5<<3)|(c5>>2)` only ever
  yields one of 32 fixed values per channel, and none of the three
  oracle values are among them (this holds regardless of which tile is
  blended, since every palette color is itself one of those 32 values —
  a freestanding proof, not a brute-force sample). The same operands run
  through `floor((tgt1_8bit*eva+tgt2_8bit*evb)/16)` **directly on the
  8-bit-expanded colors** (no 5-bit requantize) hit the oracle's value
  exactly on all three channels — apparently mGBA's own blend
  implementation runs in its native 8bpp domain rather than re-deriving
  5-bit hardware precision, and the oracle (not idealized hardware) is
  ground truth. `blendChannel` is local to `battleScene.ts` (only
  caller: `drawSlideScene`), so this only affects this window —
  `paletteFade.ts`'s own blend, used elsewhere, is untouched and still
  5-bit (already oracle-validated there). Fixing the domain took
  151→247/256, leaving exactly 8 mismatches at trace ticks
  1139/1145/1151/.../1181 — precisely the 6-tick BLDALPHA step
  boundaries. `evaEvb` was the one register in this task's model still
  missing the one-tick render lag every other register here already has
  (`bg1X`, the window edges, the scanline shift) — adding `et = t - 1`
  fixed all 8, landing on 255/256. The one remaining mismatch (tick
  1229) is GAP B's own separate, pre-existing, narrower residual (module
  doc point 3, untouched — out of GAP A's scope). Added 1 new Tier-1 pin
  at the exact previously-impossible pixel and corrected 2 stale evaEvb
  schedule pins to their render-lagged boundary ticks.
- **Next:** GAP A is closed — no further action needed on the streak
  window. Remaining scene-assembly work is GAP B's own point-3 residual
  (tick 1229, player bar 22px off — next probe on record: what
  structurally differs between the player widget's creation tick 1228
  and the opponent's 1231, both via `CreatePartyStatusSummarySprites`).
  Not attempted this session (optional stretch, time went to fully
  closing GAP A instead) — carries forward unchanged. After that:
  send-out engine slice
  1300-1560 (`battle-scene-notes.md` §7) and player send-out + menu
  1560-1810 (`battle-menu-notes.md`) — groundwork complete, assets
  ready, per #65's plan.
- **Notes:** PAPERCUT: none new. `bin/oracle run`/`ram-probe.py` scratch
  output went to `/tmp/probe-gapA-*` (not committed, no stale-cache
  risk). Both `docs/battle-scene-notes.md` and `battleScene.ts`'s module
  doc point 2 updated with the full derivation.

---
