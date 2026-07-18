# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 59 — Three parallel groundwork branches merged (send-out 1300-1560, menu 1560-1810, anim assets): ground truth for battle1-intro's FULL 1886 ticks is now complete

- **State:** merges of `worker/wt-20260718-113043` (M: send-out window
  dossier §7 + `battle1-sendout-dense.json`, 256 captures),
  `worker/wt-20260718-115156` (O: new `docs/battle-menu-notes.md` +
  `battle1-menu-dense.json`, 251 captures), and
  `worker/wt-20260718-121034` (P: `extract-battle-anim-assets.ts` +
  particle-burst/ball-open/materialize-table gen assets +
  `docs/battle-anim-assets.md`) on top of #58. `npm test` **407/407** +
  `npm run build` green on the merged result. All three supervisor-
  verified in their worktrees (traces re-run green: 256 + 251 PNGs;
  diff scopes exactly as contracted).
- **Highlights (workers, supervisor-verified):** M pinned the opponent
  send-out (trainer-exit slide 1463→~1497, ball spawn 1464 with **no
  throw arc** on the opponent side, pink tint = `gBallOpenFadeColors
  [BALL_POKE]` pixel-exact, healthbox 23-tick slide, settle = exactly
  1522) with 2 small asset gaps → P then extracted those byte-exact
  (particles 38/38 px, ball-open 122/122 px; materialize tables
  timing-verified, flagged as such). O pinned the tail window (player
  send-out DOES arc per source, "Go! ONIX!" 1-tick/char, settle
  **1693** not 1696, message-clear = one steady 6-tick blank 1742-1747,
  menu atomic at **1748** not 1750, idle cycle driven by TWO regions —
  ONIX sprite + healthbox boundary — NOT the wait-cursor/ball-icons as
  previously assumed; driver function honestly left open).
- **Next:** follow-up worker on #58's blocker (streak window 1075-1226 +
  widget entrance 1230-1291) via direct RAM ground truth
  (`gScanlineEffectRegBuffers` + BLD register shadows + widget sprite
  coords per tick) instead of pixel fitting — brief going out now. Then
  (next session): send-out engine slice 1300-1560, menu slice 1560-1810,
  RNG-exactness Tier-1 step (nature rolls/transition select vs the
  RAM-dumped table), S6 acceptance trace.
- **Notes:** all three worktrees removed + branches deleted post-merge.


---

