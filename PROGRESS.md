# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 225 — Bounded worker (S7 engine slice R rung (c) RETRY #3): mandatory diagnostic CONFIRMS the LIVE pressTick (10871) mismatches §36/§37's assumed anchor (10867) by 4 ticks — rung (c1) (lunge + erase-footprint) LANDS clean, `turn9-quickattack.json` **112/112, 0 diff**; rung (c2) (afterimage clones) gets close (diff shrinks to single digits % at every tick) but not 0-diff, reverted honestly

- **State:** `src/engine/battleScene.ts` has rung (c1) only (lunge table +
  `erasePidgeottoFootprint` + `drawTurn9QuickAttackLunge`, wired into
  `drawTurn9FightSubmenuWindow`). `npm test` **880/880** (877+3 new
  Tier-1 pins), `npm run build` green. New `tools/compare/traces/
  turn9-quickattack.json` committed, **112/112, 0 diff** (extends
  `turn9-menu.json`'s own 10818-10928 boundary one tick to 10929, the
  animation's own first active render). Regressions unchanged:
  `turn9-menu.json` **111/111**, `turn8-menu.json` **88/88**,
  `turn1-cloneanim.json` **230/230**.
- **Did:** Per the retry brief's mandatory first step, instrumented the
  LIVE dispatcher (`tools/compare/scratch/diag-quickattack-anchor.ts`,
  committed) instead of re-guessing — ran `battle1-turn9-dense.json`'s
  own script through the real `core.ts` `tick()` and printed
  `fightSubmenu.confirmElapsed` at the key ticks: constant `9831`
  throughout, so `pressTick = TICK0+confirmElapsed = 10871`, not
  §36/§37's assumed `10867`. **This confirms suspect (1) outright** (a
  4-tick anchor error, not eliminated as a red herring). Re-wrote the
  lunge table's delay constant from the correct algebra (`57 =
  10928-10871`, not the reverted attempt's `61 = 10928-10867`) — same
  RAM-tabled offsets from §36, same erase/redraw shape as the reverted
  attempt, only the anchor fixed. Suspect (2) (axis/mirror) never needed
  invoking — checked by precedent first (`drawDoubleTeamClones`/
  `endeavorShakeX2` both apply RAM `x2` via plain addition to the
  opponent-side corner, no mirror; this fix uses the same convention)
  and confirmed sufficient by the clean pixel match. Landed (c1) fully
  green (0 diff 10924-10929, the lunge's first active tick). Attempted
  (c2) (the two `TraceMonBlended` afterimage clones, `drawSpriteSheetBlended`
  reused verbatim, undarkened per §36): diff pixel counts shrank
  substantially at every touched tick (e.g. 10933: 1180→123px, 10934:
  1125→39px) confirming the general approach right, but none reached 0
  — ruled out the healthbox-skip-mask as the cause (removing it left
  diff counts byte-identical), crop-diffed tick 10930 and found the
  afterimage's own rendered detail looks flatter than the oracle's, not
  root-caused before the cap — reverted rather than commit a
  shrunk-but-nonzero diff as if it were a landed rung.
- **Next:** round 13 — rung (c2) retry: `docs/battle-turn-notes.md` §38
  has the full diagnostic (live-pressTick console output, the c1 table,
  the c2 diff-shrinkage data, the ruled-out skip-mask candidate, and a
  4-step bisection plan — RAM-reverify the slot-3/4 lifetime boundary
  ticks first, then isolate slot 3 alone before debugging both
  afterimages together). Rungs (c3) (hitsplat + shake episode 1) and
  (c4) (drain/text) remain fully unattempted. Rung (d) (ROCK_SLIDE)
  still waits on (c) landing a correct prefix.
- **Notes:** the mandatory-diagnostic-first discipline the brief
  demanded paid off directly — a 5-minute `console.log` harness found
  the exact 4-tick anchor bug the PRIOR session's retry (#223) spent its
  whole cap failing to root-cause blind. PAPERCUT: none beyond prior
  sessions' own.

---
## 224 — Worktree probes ×2 (supervisor-folded, stacked branches): ISSUES #30's pixel test CROWNS CANDIDATE A (425→230px, ≤B on 129/129 ticks, turns 7/8 generalize 46→17px; mechanical adoption recipe banked) and the half-texel lead is ELIMINATED DECISIVELY (11/11 variants 78-142× worse — the sampler's center convention is CONFIRMED correct); forensics splits the remaining ~230px into TWO independent classes — soft-gradient unknown (a) and an ONIX-GRAY occlusion-boundary error at the priority split (b), a different, locatable code path; merged, suite 877/877

- **State:** both stacked probe branches merged in one merge, `npm
  test` 877/877 + build green, nested worktrees cleaned inner-first.
  ISSUES #30 rewritten with the three-probe state + the two-class
  split. The second probe caught its own early methodology error
  (ungated compositing patch) via palette forensics before it could
  mislead — the gated `matchesReal` protocol held.
- **Next:** third targeted attempt at slice R rung (c) launching now
  (40-min cap, §37's named diagnostic first: pressTick anchor vs
  axis/mirror); then wind-down. Future sessions: adopt candidate A
  (mechanical), chase #30 class (b) as an ordinary occlusion bug, turn
  9 rung (d) + turns 10-13 parameterizations, #30 class (a) + #23 stay
  the two hard unknowns.
- **Notes:** probes in contract (12.7 + 17.2 of 30 each).

---
## 223 — Bounded worker (S7 engine slice R rung (c) RETRY): §36 puzzle #1 (real-sprite hide/unhide) RESOLVED by direct pixel evidence — the `invisible` RAM bit never gates rendering, real sprite draws continuously at its own x2/y2; implementation attempt hit an unresolved on-screen position bug and was **reverted rather than committed broken** — no engine code landed, `npm test` 877/877 + build green unchanged

- **State:** no `src/` changes this session (written, tested against
  fresh oracle PNGs, found wrong, `git checkout`-reverted). `npm test`
  **877/877**, `npm run build` green, both unchanged from #222's own
  state. `turn9-menu.json` still 111/111 (untouched). Rung (c) is
  **still not landed** — no `turn9-quickattack.json` committed.
- **Did:** Per the retry brief, pulled fresh `bin/oracle run` PNGs
  (scratch trace, not committed) at every tick 10924-10950 and
  4x-upscaled crops of the Pidgeotto region — **directly answers §36's
  own puzzle #1**: at RAM 10925-10927 (`invisible=true`), rendered
  pixels are byte-identical to the pre-lunge baseline (not hidden); at
  render 10933, the PNG shows TWO distinct opaque-looking Pidgeotto
  shapes overlapping — impossible if the real sprite were actually
  hidden. Conclusion: `invisible` doesn't gate rendering here at all;
  the real sprite draws continuously at its own `x2`/`y2` (§36's
  table), same "render = RAM+1" lag as the afterimages — one lag
  convention for the whole mechanism, not a distinct 3rd class.
  Implemented `erasePidgeottoFootprint` (mirrors `eraseGrovyleFootprint`,
  reusing `healthboxBackgroundColorAt` as-is) + lunge/afterimage offset
  tables keyed off `pressTick=10867` (§36's own anchor), wired into
  `drawTurn9FightSubmenuWindow`. Type-checked clean, but pixel-compared
  wrong inside the window (10929-10946 all DIFF) — the offset barely
  showed up on screen at all at 10929, not a subtle sign flip. Not
  root-caused before the cap (likely `pressTick` mismatch between §36's
  probe anchor and the dispatcher's live `sm.confirmElapsed`-derived
  value, unverified — or an axis/mirror error for the opponent side).
  Reverted `src/engine/battleScene.ts` outright per the "never commit a
  red step" rule rather than land broken pixels.
- **Next:** round 12 — rung (c1)/(c2) retry #2: **first** instrument the
  LIVE `pressTick` this dispatcher branch actually computes and diff it
  against `10867` directly (this session skipped that one cheap check
  and paid for it) — battle-turn-notes.md §37 has the full precise
  handoff (exact table values, the 3 diagnostic ticks to re-check
  first, and the still-unattempted-but-in-range hitsplat/shake-episode-1
  sub-rungs). Once the position bug is fixed, hitsplat (slot 7, 10-tick
  `drawEndeavorHitsplats`-shaped precedent) and Onix's shake episode 1
  are both within the already-probed window and cheap next adds. Rung
  (d) (ROCK_SLIDE) still waits on (c) landing a correct prefix.
- **Notes:** `docs/battle-turn-notes.md` §37 (new) has the full
  derivation + precise handoff. PAPERCUT: none beyond #222's own —
  the puzzle #1 resolution itself took ~25 min of PNG-crop-eyeballing
  that a tighter "diff the live pressTick first" discipline could have
  front-loaded before writing any table code.

---
