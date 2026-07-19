# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 132 — Bounded worker: S7 slice D — HP drain + turn-end CLOSED, `turn1-drain.json` **102/102, 0 diff** on first attempt; closes ISSUES #16's deferred partial-HP oracle validation — suite **648/648**

- **State:** `npm test` **648/648** (+5 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn1-drain.json` (canonical 44-segment prefix,
  102 captures: dense every tick 2510-2600 + strided to 2655) **102/102,
  0 diff**. Zero regressions: turn1-rockslide 250/256, turn1-cloneanim
  230/230, turn1-kickoff 81/81, fight-submenu 234/235, sendout 255/256,
  s6-acceptance 224/228 — all re-verified unchanged.
- **Did:** implemented the whole window (`battleMenu.ts` pure fns +
  `battleScene.ts` render, docs/battle-menu-notes.md §12 has the full
  derivation) from a fresh 161-frame scratch dense capture (ticks
  2500-2660, grid-search only, not committed). Three findings: (1) the
  HP-bar drain renders with **no extra frame of render lag** (every other
  ROCK_SLIDE mechanism in this window uses a `-1` lag; this one doesn't —
  fit exact against all 15 fill-pixel-count transitions after that
  hypothesis was tried and rejected first); (2) the resettled action
  menu's idle-bounce cycle re-anchors to a **fresh** local tick
  (`MENU_IDLE_BLANK_END_TICK+1`), matched by the very first menu's own
  distinctive "1-tick blip then 9-tick dwell" opening shape recurring
  identically at the redraw tick — not a continuation of the frozen
  pre-turn absolute-tick counter; (3) the reused flat `menuIdleBase`
  harvest's two bounce regions are both on the PLAYER's (Onix, undamaged)
  side, so it stays valid for the resettled menu EXCEPT the opponent's own
  healthbox, which now needs a live per-tick overdraw
  (`opponentHealthboxContentForHp`, a small memoized cache — only 43
  distinct integer HPs ever needed) instead of the old static
  full-HP-only constant.
- **ISSUES #16 outcome:** the partial-HP half is RESOLVED, not a headline
  fix — `calcBarFilledPixels`'s existing `floor(hpFraction*48)` formula
  already agreed with real oracle pixels for all 43 HPs this trace
  exercises (0 residual, no model change). Trimmed the entry to what's
  still unvalidated: yellow/red band thresholds and every status icon
  (this seed's battle never leaves the green band or inflicts status).
- **Next:** the §11.1-named 1px `drawStaticBgShiftedY` residual (single
  stray pixel at (173,92) on `rockSlideBg3Y=-7` ticks, turn1-rockslide
  250/256→256/256) is the next small pickup; otherwise turn 2+ ground
  truth / the victory-scout lane's own next steps per #130.
- **Notes:** the grid-search-against-a-scratch-capture technique (build a
  throwaway dense trace via `bin/oracle run`, crop specific pixel regions
  with PIL to isolate one mechanism's own sha/pixel transitions from
  everything else moving on screen at the same time, rather than reading
  full-frame shas alone) resolved all three findings above in well under
  an hour combined — no papercuts.

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
