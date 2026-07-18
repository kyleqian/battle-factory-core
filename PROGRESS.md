# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 61 — S6 RNG-exactness step (parallel worktree lane, merged): battle-1 opponent personality gen + transition select implemented as pure logic, Tier-1-pinned bit-exact vs the RAM dump

- **State:** merge of `worker/wt-20260718-123140` (single commit
  `365e1ab`, exactly 2 new files: `src/engine/opponentGen.ts`,
  `tests/opponentGen.test.ts`) on top of #60; `npm test` **423/423** +
  `npm run build` green on the merged result.
- **Did (worker, supervisor-verified):** the exact
  `CreateMonWithEVSpreadNatureOTID` rejection loop, `Random32()`
  low/high word order (empirically confirmed vs the RAM dump), the
  12-entry `RANDOM_TRANSITION` frontier pick, and a chained
  battle-1 generator — 9 Tier-1 tests pin all RAM-dumped values
  bit-exact (28/16/95 iterations, all 3 personalities, natures, raw
  transition draw 22624 → index 4 → id 34 CIRCLES_MEET). **New ground
  truth found, not fudged:** the three loops are separated by exactly
  11/7/8 ambient `Random()` draws — matching the dossier's own tick
  gaps 1:1 (one per-VBlank baseline draw per tick between
  loop-completion ticks; the supervisor folded this into
  `docs/battle-bringup-notes.md` §3.1 this commit). Modeled as an
  explicit `ambientGapSteps` parameter, defaulting to the pure source
  algorithm.
- **Next:** see #60 — the one named scene-assembly gap (BG1 `entrySlide`
  content + palette bank 4 extraction) is the current critical-path
  step; a targeted worker is being launched and the two-consecutive-
  misses escalation is going to the user in parallel.
- **Notes:** worktree removed + branch deleted post-merge. S6 roadmap
  acceptance criterion "Tier-1 test pins the generated opponent vs the
  RAM dump" is now satisfied on the personality/transition side
  (trainer id + mon set were already pinned pre-anchor per §0).

---

## 60 — S6 scene-assembly follow-up: RAM-probed the streak window + ball-widget entrance directly; geometry now RAM-exact, streak color still open — `scene-assembly.json` 40/256 (was 42/256; see below for why the raw count didn't move despite real progress), 0 regressions

- **State:** `npm test` **413/413** (407→413, +6 net in `tests/battleScene.test.ts`
  after rewriting its RAM-derived expectations), `npm run build` green.
  `npm run compare -- tools/compare/traces/scene-assembly.json` →
  **40/256** (was 42/256 at #58 — frames 1040-1074 + 1292-1295 match both
  sessions; #58's remaining ~3 matches were scattered mid-slide frames its
  unverified best-fit happened to land on by coincidence, which this
  session's RAM-exact-but-still-not-color-correct model doesn't reproduce).
  The raw match count is **not** the right signal here — every frame's
  diff *magnitude* through the slide now traces to one identified, named
  remaining gap (BG1's content, see below) instead of an unverified fit;
  see below and PROGRESS-archive.md #58 for contrast. All 17 other traces
  re-verified at their exact prior counts (anchor 1/1, draft-cursor 13/13,
  draft-menu 38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix
  122/122, summary-info-magby 132/132, confirm-decline 67/67,
  accept-prebattle 137/137, walk-warpout 125/125, room-entry 110/110,
  room-npcs 98/98, room-msgbox 142/142, transition 206/206, rent-slot1
  125/139, rent-3picks 157/190, confirm-flow 79/95) — zero regressions.
- **Did (RAM-first, per the brief's method mandate — no blind pixel
  fitting this session):** ran `tools/probe/ram-probe.py` once over ticks
  1073-1296 watching `gBattle_WIN0V`, `gTasks[0].data[0..6]`, the
  `sGpuRegBuffer` BLDCNT/BLDALPHA/BLDY shadows (nm'd `sGpuRegBuffer` @
  `0x03000818`), `gScanlineEffectRegBuffers` (both halves, several rows),
  and all 64 `gSprites[].{x,x2,y,flags}` — one emulation pass, ~2.7s.
  Confirmed/fixed from the raw values: (1) **`gBattle_WIN0V` has a second
  growth phase** `docs/battle-scene-notes.md` §2 missed entirely —
  `BattleIntroSlide3`'s tState-3 body also decrements `WIN0V` (`-0x3FC`,
  4px/tick) through tick 1118, not just the `-0xFF` (1px/tick) loop that
  stops at 1106; `windowRange()` now models both phases exactly (RAM-
  confirmed top/bottom at every tick, not fit to a brightness threshold).
  (2) **`BLDCNT = TGT1_BG1|BLEND|TGT2_BG3|TGT2_OBJ` (0x1842) confirmed
  literally** — OBJ (both trainer pics) genuinely are blend targets,
  resolving #58's open question there; `shiftTop`/`shiftBottom` now mirror
  `gTasks[0].data[2]` exactly (240 constant through 1106, then -2/tick to
  0 at 1226) instead of the prior session's best-fit line. (3) **the ball-
  icon + diagonal-bar widget entrance is baked as RAM-exact per-tick `x2`
  tables** for all 14 sprites (2 bars + 12 icons, identified by matching
  settled `(x,y)` against `docs/battle-interface-assets.md`'s known
  corners): player-side created at tick 1228, opponent-side at 1231 (NOT
  simultaneous — confirms a suspicion the groundwork dossier flagged but
  didn't chase); each table transcribed verbatim from RAM since the source
  formula (`SpriteCB_StatusSummaryBalls_Enter`) lands 1-2 ticks off on
  several icons for reasons not tracked down (a controller-handshake frame
  this module doesn't model). Also fixed the docs: `battle-interface-
  assets.md`'s down-arrow dest-Y formula (`135 + offset` → `137 - offset`,
  the brief's flagged one-liner) and `battle-scene-notes.md` §2 (added
  correction blocks for the missed WIN0V phase and the buffer-timing
  off-by-one, both citing this session's RAM values).
- **Still open (honest, not improvised around):** the streak's pixel
  *color* is not byte-exact. RAM resolved WHICH layers blend (BG1 as TGT1,
  BG3+OBJ as TGT2) but not BG1's actual *content* — `gBattle_BG1_X += 8`/
  tick proves something real scrolls there (not a solid color), and
  `battle-bg.json`'s `entrySlide` tileset was the leading candidate, but
  every one of its tilemap entries in the sampled region reference
  **palette bank 4, which the extractor never captured** (`battle-bg.
  json`'s `palette` array only has banks 0-2) — so the hypothesis came
  back transparent everywhere and was numerically untestable, not
  falsified. `drawSlideScene` falls back to treating BG1 as contributing
  black (pure `evb/16` brightness scaling of the shifted BG3+OBJ content) —
  geometrically exact (window shape, shift magnitude) but not color-exact;
  `npm run compare` diffs every frame 1075-1226 (700px near tick 1075,
  growing to 5-figures as the window opens, matching the window's own
  pixel count almost 1:1 — i.e. it's a genuinely wrong color model, not a
  boundary/off-by-one). The 1228-1291 widget window is also not fully
  exact yet despite RAM-exact positions (16-300px/frame) — likely a tile-
  index swap (ring↔filled ball shape) this session didn't model, per
  `docs/battle-interface-assets.md`'s own "icon slots are progressively
  absent/ring-shaped before settling" note.
- **Next:** re-extract `battle-bg.json` (or a new targeted extractor) with
  palette bank 4 included, then re-test entrySlide-as-BG1 (the code path
  for this is straightforward, see `battleScene.ts`'s module doc point 2 —
  it's one extraction task, not a re-derivation). Separately, check
  `battle_interface.c`'s `oam.tileNum` manipulation during
  `SpriteCB_StatusSummaryBalls_Enter` for the ring→filled tile swap. Then
  re-run `scene-assembly.json` — both fixes are additive to what's already
  RAM-verified here.
- **Notes:** PAPERCUT: none new — `tools/probe/ram-probe.py` handled a
  282-watch/223-tick combined probe in one ~2.7s pass with zero changes
  needed, exactly the tool it was built to be.

---
