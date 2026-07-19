# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 131 — Bounded worker: S7 slice C — rock-vs-rock OAM stacking order CLOSED via real slot-allocation + `SortSprites` simulation — `turn1-rockslide.json` **181/256 → 250/256**; suite **643/643**

- **State:** `npm test` **643/643** (+5 Tier-1 pins), `npm run build`
  green, tree clean. `tools/compare/traces/turn1-rockslide.json`
  **250/256** — the brief's own named residual (75 frames, all in
  2362-2453, rock-vs-rock stacking) is **fully closed (0 remaining)**.
  Zero regressions: turn1-cloneanim 230/230, turn1-kickoff 81/81,
  fight-submenu 234/235, sendout 255/256, s6-acceptance 224/228, menu-idle
  69/69 — all re-verified unchanged.
- **Did:** ported the real `CreateSprite` "lowest free slot" allocator +
  `SortSprites` insertion-sort comparator (`reference/pokeemerald/
  src/sprite.c`) into a pure TS simulation (`rockSlideDrawOrder`,
  `battleMenu.ts`), seeded from a live RAM read of `sSpriteOrder` (no
  exported symbol — address resolved via `nm`, new probe
  `tools/probe/dump-rockslide-slot-order.py`). RAM-validated **0
  mismatches**: slot assignment for all 20 rocks + the shake sprite
  across 143 sampled RAM ticks, AND the resulting draw order across all
  117 multi-rock ticks (56 with an exact on-screen-Y tie). Key
  simplification (also empirically confirmed, not just argued): the
  20 rocks are RAM-confirmed the *only* sprites in the scene that ever
  share an exact `oam.priority`/`subpriority` key, so — by a stable
  sort's own defining property — the simulation only needs to track the
  20 rocks, not the other ~50 `gSprites[]` slots. Full derivation in
  docs/battle-menu-notes.md §11.1.
- **Also found (not fixed, out of scope per this step's brief) — a
  separate, PRE-EXISTING 6-frame residual**: sweeping the full 256
  frames (not done with this precision before) surfaced 1px mismatches
  at ticks 2349/2350/2353/2354/2357/2358, confirmed present before this
  session's changes too (`git stash` + re-run). All 6 land exactly on
  `rockSlideBg3Y=-7` ticks, a single stray pixel at (173,92) — a narrow
  `drawStaticBgShiftedY` sampling bug, unrelated to rock ordering. The
  prior session's §11 claim that the shake was "independently
  pixel-exact" was inaccurate (never swept at full precision). Named
  precisely in docs/battle-menu-notes.md §11.1 rather than worked around,
  since this step's brief explicitly said not to rework the shake.
- **Next:** a future session should own `drawStaticBgShiftedY`'s 1px
  residual (§11.1's own attribution) to close `turn1-rockslide.json` to
  256/256. Then slice D (drain/turn-end, `pressTick+596`=2516 on —
  closes ISSUES #16's deferred validation) is next up on the main lane;
  the victory-scout worktree (SEND OUT confirm + frame-budget analysis,
  #130's own next-action) is unaffected by this session.
- **Notes:** the RAM-probe environment
  (`vendor/mgba-venv/bin/python tools/probe/*.py`) plus
  `arm-none-eabi-nm -n --defined-only reference/pokeemerald/
  pokeemerald.elf` for resolving `static` EWRAM symbols with no exported
  name (this run already used this technique for callback addresses;
  this session extended it to `sSpriteOrder`/`sSpritePriorities`) made
  the whole derivation tractable inside one bounded session — no
  papercuts.

---
## 130 — Supervisor: victory scout merged — battle 1's win line is LONGER than one oracle trace: ROCK_SLIDE PP exhausts (silent no-op at 0 PP), Onix faints turn 14 → forced player switch (party ONIX/MAGBY/BAYLEEF revealed); trace ends at 19634 frames vs the 20000 oracle cap — suite **638/638**

- **State (verified post-merge):** `npm test` **638/638**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-rockslide re-verified
  181/256 (slice-C target, #129); turn1-cloneanim 230/230.
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-victory.json` (19634 frames, twice-run 0/256 mismatch) +
  3.7MB RAM dump + `battle-turn-notes.md` §14. Headlines: **PP exhaustion
  is real and silent** (0-PP selection does nothing — no RNG, no text; a
  fixed-script harness deadlocks); DRAGON_BREATH fallback adapted; turn-13
  genuine miss; **Onix faints turn 14** (priority QUICK_ATTACK) and the
  battle does NOT end — forced party-select (SEND OUT/SUMMARY/CANCEL)
  with reserves MAGBY/BAYLEEF at full HP; trace ends there, one confirm
  press from continuing vs Pidgeotto at 1/143 HP. Open: the SEND OUT
  confirm button sequence (several attempts didn't commit the switch);
  **the full win may not fit the oracle's 20000-frame cap** from anchor —
  needs either a tighter script or a harness-level cap decision.
- **Next:** round 9 (final this session) — main lane: slice-C completion
  (rock slot-allocation simulation → 256/256 + the deferred Tier-1 pins);
  worktree: crack the SEND OUT confirm + frame-budget analysis (can an
  efficient line win under 20000 frames? — if provably not, that is an
  escalation-worthy harness finding for next session). Then slice D
  (drain/turn-end + ISSUES #16 validation) next session.

---
## 129 — Bounded worker: **S7 slice C — ROCK_SLIDE window engine, LARGE MAJORITY LANDED, not yet 0-diff** — `turn1-rockslide.json` **0/256 → 181/256** (2963px total residual, avg ~40px/frame, max 172px, all in the 2362-2453 rock-overlap sub-range); suite **638/638**

- **State:** `npm test` **638/638**, `npm run build` green, tree clean.
  New committed trace `tools/compare/traces/turn1-rockslide.json` (256
  captures, 2193-2515) **181/256** — acceptance (0 diff) **not met**, but
  every mechanism except rock-vs-rock stacking order is independently
  pixel-exact (see below). Zero regressions: turn1-cloneanim 230/230,
  turn1-kickoff 81/81, fight-submenu 234/235, menu-idle 69/69, sendout
  255/256, s6-acceptance 224/228 — all re-verified unchanged.
- **Did:** implemented the whole window (`battleMenu.ts` pure fns +
  `battleScene.ts` render, docs/battle-menu-notes.md §11 has the full
  derivation) — the two text boxes (stat-rose + used-move), the
  `gBattle_BG3_Y` shake (a new background-only resampler,
  `drawStaticBgShiftedY`, since OBJs stay fixed on real hardware but this
  engine's usual `menuIdleBase` harvest bakes bg+OBJs into one flat image),
  all 20 falling rocks' spawn schedule + per-rock ellipse motion
  (call-timing model reverse-engineered tick-by-tick against fresh RAM
  probes — the naive "1 call/tick from spawn" reading was off by one call
  on the spawn tick specifically), the generic hit-flash, and — a genuine
  new finding, not predicted by the existing docs — Grovyle's own
  `AnimTask_ShakeMon` bounce, which §9.6 had predicted an engine could skip
  during the `monbg`-hidden window; a per-tick pixel brute-force proved
  otherwise (period-4 `[5,5,0,0]` render pattern, ticks 2362-2455). Also
  fixed a silent text bug (the stat-rose apostrophe needs the game's own
  U+2019 glyph, not ASCII `'` — the font has no glyph for the latter) and a
  background-wrap bug (BG3's real vertical period, 256px, wasn't being
  applied to the shake's negative `mapY`, blanking the top 7 screen rows).
- **Notes:** docs/battle-menu-notes.md §11 has the full per-mechanism
  accounting + RAM-probe citations. PAPERCUT: none new — the RAM-probe
  scripts committed by the earlier ground-truth scout session
  (§9.5/`dump-registers.py`/`dump-rockslide-sprites.py`) were directly
  reusable against the already-committed dense traces, saved a lot of time
  versus re-deriving from source alone.
