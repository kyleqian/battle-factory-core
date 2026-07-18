# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 65 — Supervisor wind-down: session end 2026-07-18 ~14:30; S6 engine parity anchor→tick 1040 byte-exact, scene assembly 104/256 (one named gap), ALL S6 groundwork + RNG criterion banked

- **State (verified this minute):** `npm test` **425/425**, `npm run
  build` green, tree clean at `b4faa7a` + this docs commit. 18 committed
  parity traces: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206 — all byte-exact — plus
  scene-assembly **104/256** (sole in-progress slice, see #64/#63) and
  the three ISSUES-#5-policy traces (rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95). Engine covers the anchor through tick
  1040 of the 1886-tick battle-1 bring-up byte-exact; 1040-1295 partial.
- **Session summary (supervised, ~09:10-14:30, 20 worker steps, 2 lanes):**
  engine slices landed: walk+warp 400-519 (125/125), room entry 520-624
  (110/110), scientists+opponent 624-717 (98/98), speech msgbox 718-843
  (142/142), CIRCLES_MEET transition 843-1040 (206/206), scene assembly
  1040-1295 through 4 convergent iterations (42→104/256; systemic
  one-tick render lag discovered, #63); RNG criterion satisfied
  (`opponentGen.ts` bit-exact vs RAM dump, #61); ISSUES #15 root-caused
  + fixed (to5Bit palette-convention bug, #48). Parallel lane banked ALL
  remaining S6 groundwork: transition id RAM-confirmed (CIRCLES_MEET,
  #47), no-heal-icon correction + 843-1031 pinned (#53), scene-assembly
  mechanism (#55), send-out window (#59), menu window (#59), and every
  flagged asset extracted byte-exact (battle room #49, interface widgets
  #57, sendout anim assets #59). Suite 341→425 Tier-1 tests; traces
  13→19 (+4 dense groundtruth). Zero regressions at every one of 20
  verified steps; every worker ended at a green commit.
- **Next:** (1) scene-assembly GAP A residual — the streak window's
  blend arithmetic; exact next RAM probe in #63/`battleScene.ts` module
  doc; **user decision on record: keep iterating, no re-scope** (also in
  ROADMAP S6). (2) Then send-out engine slice 1300-1560
  (`battle-scene-notes.md` §7) and player send-out + menu 1560-1810
  (`battle-menu-notes.md`) — groundwork complete, assets ready. (3) The
  22px tick-1229 widget residual (#64) rides along with GAP A.
- **Notes:** PAPERCUTS.md gained the stale `tools/compare/out/` PNG
  entry (GAP-B worker's flag). No usage-limit events. Escalation
  mid-session (2 consecutive scene-assembly misses) was answered by the
  user in-terminal: keep iterating. One supervisor error caught+fixed:
  a double-rotated archive entry (#55, dedup commit `029c01f`).

---

## 64 — S6 scene-assembly GAP B (widget entrance) resolved: same one-tick render lag GAP A found (#63) applies to the widget sprites too, plus the opponent icon x2 tables were missing their per-icon flat-delay prefix since #60/#62 — `scene-assembly.json` 104/256 (was 41/256), 0 regressions. GAP A (streak blend-arithmetic) untouched, as scoped.

- **State:** `npm test` **425/425**, `npm run build` green. `npm run
  compare -- tools/compare/traces/scene-assembly.json` → **104/256** (was
  41/256 — net +63, close to the brief's ~105 estimate). Full 18-trace
  sweep re-run, all others at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, accept-prebattle 137/137, walk-warpout 125/125,
  room-entry 110/110, room-npcs 98/98, room-msgbox 142/142, transition
  206/206, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions.
- **Did — GAP B (widget invisibility), per the brief's method:**
  RAM-probed `gSprites[].{invisible, x2, oam.attr0/1/2}` directly per tick
  for all 14 widget sprites (2 diagonal bars + 12 ball icons; identified
  by matching settled `(x,y)` against known corners, same method #60/#62
  banked) across ticks 1225-1295. Two independent findings, both real bugs
  fixed (not the brief's "tile-index swap" theory, which #62 had already
  ruled out): **(1)** `invisible` and `oam.attr2` (tileNum) never change
  after creation for any of the 14 sprites — there is no separate
  visibility trigger, confirming #62's suspicion the wrong shape was being
  chased. **(2)** pixel-ground-truthing the oracle's own captures directly
  (cross-referencing the RAM-baked `x2` tables against actual pixel
  content, not trusting the table at face value) shows the SAME systemic
  one-tick render lag #63 found for GAP A also governs these sprites: the
  player bar's oracle edge at trace tick 1230 matches the table's
  tick-1229 value, not 1230's own. Wired `ballIcons`/`ballStatusBarPositions`
  to render at `t-1` uniformly (both the table lookup and the visibility
  gate together — #62's own attempt shifted only the table index and left
  the create-tick comparison alone, which desyncs the two and is exactly
  why it "fixed some frames, broke others"). Separately, RAM-probing full
  per-icon `x2` histories (not just the sliding portion) revealed the
  OPP_ICON_X2 tables baked by #60/#62 had been built ONLY from each icon's
  sliding tail, omitting the per-icon flat-delay prefix
  (`SpriteCB_StatusSummaryBalls_Enter`'s `data[1]` countdown before the
  slide starts) — every opponent icon was sliding in 10-54 ticks too early
  regardless of the lag fix. Rebuilt all 14 tables directly from RAM
  ground truth (full prefix included) rather than reconstructing from the
  source formula, per this run's established convention.
- **Still open, narrow:** trace tick 1229 (player bar only) is 22px off —
  the oracle is still plain background there, one tick after our model's
  first drawn frame. A further one-tick-later `visible` gate fixes 1229
  but then breaks the opponent side's own first-visible tick (1232) the
  identical way (pixel-verified both directions) — the two sides do not
  share one extra-tick correction, so this wasn't force-fitted. Full
  account + the concrete next probe (what structurally differs between the
  player and opponent widgets' first visible tick) in `battleScene.ts`'s
  module doc point 3.
- **Next:** GAP A (streak window blend-arithmetic, ticks 1075-1226) is
  untouched this session, exactly as #63 left it — its own next probe
  (literal `BLDALPHA` register vs `gScanlineEffectRegBuffers`, ticks
  1140-1180) is still the right next step there. For GAP B's own residual,
  RAM-probe what's structurally different between the player (tick 1228
  creation, needs the extra tick) and opponent (tick 1231 creation,
  doesn't) widget setup before guessing another blanket offset.
- **Notes:** PAPERCUT: none new. `tools/compare/out/<trace>/` can go stale
  between sessions (its `app-*.png` reflected code from before this
  session's own edits) — always re-run `npm run compare` fresh before
  reasoning from cached PNGs there, don't trust the last run's output as
  current.

---

## 63 — S6 scene-assembly GAP A (streak window): found and fixed a systemic one-tick render lag that was the real blocker behind #60/#62's "sign ambiguity" — geometry + layer model now pixel/RAM-exact, one narrower blend-arithmetic gap remains; `scene-assembly.json` 41/256 (was 40/256), 0 regressions. GAP B (widget invisibility) not started — out of time this session.

- **State:** `npm test` **425/425**, `npm run build` green.
  `npm run compare -- tools/compare/traces/scene-assembly.json` → **41/256**
  (was 40/256 — frame 1227 now exact, plus the near-black frame 1075 is down
  to a handful of anti-aliased-adjacent px; every frame 1075-1226 has a
  *much smaller* diff than #62's baseline even though the raw match count
  barely moved, since GAP A is a color-precision issue across the whole
  window, not a boundary bug — see below). All 17 other traces re-verified
  at their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did — found the real bug behind two sessions' "sign ambiguity":** per
  the brief's method (RAM-probe the actual DMA'd buffer, not just `data[2]`),
  ran `tools/probe/ram-probe.py` on `gBattle_BG1_X`/`gScanlineEffectRegBuffers`/
  `gScanlineEffect.{srcBuffer,state}` across the whole window, AND
  cross-checked every derived constant against the oracle's own captured
  frames directly (scanning each capture for the first/last non-black row —
  unambiguous ground truth, no tileset aliasing possible, unlike raw pixel-
  color fitting). Both together reveal: **every register this task drives
  shows up in the CAPTURED FRAME one tick later than its own RAM tick**
  (task writes registers this tick; HBlank DMA/VBlank copy shows them to
  the display next tick) — not a sign flip, a lag, and it explains #62's
  "shift=-240 matched one point but a whole scanline didn't": the search
  was comparing tick `t`'s RAM values against tick `t`'s pixels instead of
  tick `t-1`'s. Applying the same one-tick correction to `windowRange`,
  `scanlineShiftMagnitude`, and `bg1X` made the window/shift geometry
  pixel-exact (verified: frame 1075 is now exactly 1px, row 80 only, vs.
  oracle; row 79/120/150 content matches byte-for-byte at tick 1150).
  Source (not RAM) then settled two other true opens: (1) **which register
  the per-scanline DMA targets** — `sIntroScanlineParams16Bit = {&REG_
  BG3HOFS, ...}` (`battle_main.c:250-253`) is a compile-time literal, no
  runtime ambiguity — BG3 (`static`) is shifted per-scanline, BG1
  (`entrySlide`) scrolls uniformly via the ordinary whole-frame
  `gBattle_BG1_X` VBlank write. (2) **OBJ/BG1 priority** — both trainer
  sprites are OAM priority 2 (`gOamData_BattleSprite{Player,Opponent}Side`,
  `battle_main.c:274-301`), strictly behind BG1's priority 0 (frontmost);
  but pixel-sampling both trainer sprites' settled-corner rects at every
  tick 1075-1220 shows **neither is ever actually visible during the
  reveal** — both show plain background throughout, only becoming the real
  pics at the tick-1227 settle. So TGT2 in `BLDCNT`'s `TGT1_BG1|BLEND|
  TGT2_BG3|TGT2_OBJ` is BG3 alone in practice; wired `drawSlideScene` to
  blend BG1 (opaque) over BG3 (raw), and BG3 raw wherever BG1 is
  transparent — the "raw-unless-BG1-opaque" rule #62 confirmed but never
  wired. Updated `tests/battleScene.test.ts`'s window/shift expectations to
  the corrected (pixel-ground-truthed) tick pivots.
- **Still open (honest, narrower than #62's, RAM-informed not guessed):**
  one pixel confirmed to need BG1 content (tick 1150, x=11/y=40 — oracle
  shows a warm/skin-tone streak color, this model still shows plain white
  BG3) is numerically **unreachable** under the modeled `BLDALPHA` ramp: with
  `evaEvb(1150)` = {eva:6, evb:10} and a white (255) BG3 backdrop, the
  minimum any blend can produce is `255*10/16≈159`, already above the
  observed ~123. Either the `evaEvb` ramp's tick-1139 anchor needs the same
  one-tick correction just proven necessary elsewhere (untested this
  session), or something about `entrySlide`'s map coordinates at this exact
  pixel is still wrong (its only non-blank tiles sit at tile-rows 8-13 /
  mapY 64-111, nowhere near mapY=40 under the current `bg1X` - unexplained).
  Full detail + the exact next RAM probe to run (literal `BLDALPHA`
  register, not the derived schedule) in `battleScene.ts`'s module doc
  point 2 and `docs/battle-scene-notes.md` §2's new correction block.
- **Next:** GAP A — RAM-probe the literal `BLDALPHA` register (io reg
  `0x04000052`) alongside `gScanlineEffectRegBuffers` for ticks ~1140-1180,
  cross-checked against the tick-1150/(11,40) pixel this entry names, before
  touching `evaEvb`'s constants again (the one-tick-lag pattern found this
  session is the leading hypothesis, not yet verified for this register).
  GAP B (widget invisibility, ticks ~1228-1291) is untouched — still
  exactly as #62 narrowed it (positions RAM-exact; icons stay invisible
  past their settle tick until an unidentified trigger, `oam.tileNum` not
  touched by `SpriteCB_StatusSummaryBalls_Enter`). Given this session's
  finding, the SAME one-tick-render-lag hypothesis is worth checking there
  too before any new RAM probe of `gSprites[].invisible`.
- **Notes:** PAPERCUT: none new. This session's method — cross-referencing
  RAM values against the oracle's own captured-frame content directly
  (not just trusting a symbol's RAM-read value at face value) — is what
  broke the two-session stall; worth reusing whenever a RAM-confirmed
  value still doesn't reproduce pixels.


---

