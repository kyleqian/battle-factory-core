# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 62 — S6 scene-assembly: fixed the extractor "palette bank 4 missing" misdiagnosis from #60; the color-compositing rule it was blocking on is now also correctly understood but not yet wired — `scene-assembly.json` still 40/256 (unchanged), but both open gaps are narrower and more precisely named

- **State:** `npm test` **425/425** (423→425, +2 in `battleBg.test.ts`),
  `npm run build` green. `npm run compare -- tools/compare/traces/scene-
  assembly.json` → still **40/256** (rendering logic unchanged this
  session — see below for why). `transition.json` re-verified **206/206**
  (battle-bg.json is its dependency too, per the brief's caution). All 17
  other traces re-verified at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, accept-prebattle 137/137, walk-warpout 125/125,
  room-entry 110/110, room-npcs 98/98, room-msgbox 142/142, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did — gap 1 (BG1 streak content), extraction fixed and RAM-confirmed:**
  #60's "entrySlide references palette bank 4, which the extractor never
  captured" was a misdiagnosis, not a real gap. RAM-probed
  `gPlttBufferFaded` at hardware palette bank 4 directly (ticks 1073-1886):
  its 16 live colors are bit-exact equal to `battle-bg.json`'s existing
  local subpalette 2. Source explains why: `DrawMainBattleBackground` loads
  the Frontier palette at `BG_PLTT_ID(2)` for 3 subpalettes (hardware slots
  2/3/4) before the intro slide runs, and `DrawBattleEntryBackground`'s
  `BATTLE_TYPE_FRONTIER` branch never reloads palette RAM — so
  `entrySlide`'s raw nibble 4 is hardware-absolute, same `+2` base as the
  static tilemap, and normalizing it the same way (now done in
  `extract-battle-bg.ts`) lands on the already-captured local index 2. No
  new palette data was ever needed. `entrySlide` now has usable content.
  **But** wiring it into `battleScene.ts` surfaced a SECOND, independent
  bug in the existing fallback: GBA alpha blend only engages where the
  actual topmost non-transparent layer at a pixel is TGT1-flagged (BG1
  only, per RAM-confirmed `BLDCNT`); `entrySlide`'s tilemap is a sparse
  diagonal-streak pattern over a mostly-transparent grid, so most pixels
  in the window have BG1 transparent — meaning BG3/OBJ must draw at RAW
  unscaled color there, not the uniform `evb/16`-scaled brightness the
  existing `drawSlideScene` fallback applies everywhere. Confirmed by
  direct oracle pixel inspection (tick 1090, columns clear of both trainer
  sprites: observed colors are exact *unscaled* palette matches, not
  scaled). This alone would have kept the trace non-exact even with gap 1
  "fixed" naively. Did NOT wire the corrected compositing rule in, because
  the BG3/BG1 shift-sign convention needed to know *which* pixels are
  BG1-transparent wasn't nailed down: a single isolated point matched
  `shift=-240` (opposite sign from the existing `shiftTop`/`shiftBottom`)
  exactly, but a whole-scanline brute-force pixel search was inconclusive
  — the static bg tileset reuses ~5-6 sky colors across many tiles, so
  candidate shifts alias to similar match counts and a plain per-pixel-
  count fit can't be trusted. Left `drawSlideScene` unchanged (still the
  confirmed-wrong fallback) rather than commit a half-verified rule.
- **Did — gap 2 (widget entrance), narrowed but not resolved:** the
  brief's "tile-index swap" framing doesn't match what
  `SpriteCB_StatusSummaryBalls_Enter` actually does — read it directly,
  and it never touches `oam.tileNum` (only `x2` and delay counters). Tried
  a blanket 1-tick shift on the `x2` lookup tables (a plausible off-by-one
  given creation-tick vs first-callback-tick semantics): it fixed frames
  1230/1232-1235 but broke 1228/1229/1231, proving the tables aren't
  uniformly off — reverted rather than commit an unverified guess (tree is
  clean, `git status` confirms no leftover diff). Direct pixel diffing
  (frame 1285, opponent ball-icon slot 0 at its RAM-exact settled corner)
  shows our model already drawing that icon's final "Empty" ring tile
  there, while the oracle shows the same 16 ring-outline pixels as pure
  background — i.e. the icon is positionally settled early but stays
  invisible (or on a blank tile) until some later trigger, unrelated to
  the `x2` slide.
- **Next:** gap 1 needs a direct RAM read of the actual DMA'd
  `gScanlineEffectRegBuffers` content (not just `gTasks[0].data[2]`'s
  value, which is already confirmed) to settle the shift-sign question,
  paying attention to the `dmaSrcBuffers[i] = ...+1` indexing trick in
  `scanline_effect.c` (buffer-index-to-scanline mapping may be off by one
  from a naive reading) — then apply the "raw-unless-BG1-opaque" blend
  rule this session confirmed. Gap 2 needs `gSprites[id].{invisible,
  oam.tileNum}` RAM-probed per tick for the 14 widget sprites across
  1228-1292 (sprite-identification method already banked from #60) to find
  what actually gates visibility. Both are additive, narrower asks than
  what #60 left open — see `battleScene.ts`'s module doc and
  `docs/battle-scene-notes.md` §2's new correction block for the full
  account either can be picked up from cold.
- **Notes:** PAPERCUT: none new. Two full sessions in a row have now hit
  the same wall on gap 1 (color) via pixel-fitting alone — the pattern
  holds: RAM ground truth for *values* (BLDCNT, `data[2]`, `gBattle_BG1_X`)
  has been reliable, but inferring the *sign/indexing convention* those
  values are applied with by brute-forcing pixels against a repetitive
  tileset is not. A future session should probe the DMA buffer's literal
  written content, not just the C-level source variable.
