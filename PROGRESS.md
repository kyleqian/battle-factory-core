# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 222 — Bounded worker (S7 engine slice R rungs (c)+(d), QUICK_ATTACK animation + ROCK_SLIDE): **NOT LANDED** — RAM-probed the animation window exhaustively (new `dump-quickattack-anim.py`) and found 3-4 CONCURRENT lag classes plus a §35 sprite-slot correction (real Pidgeotto sprite is slot 5, not 2), but could not resolve a pixel-exact render within the cap; no engine code changed, no traces committed — banked as §36 (battle-turn-notes.md) for the next session, `npm test` 877/877 + build green unchanged

- **State:** no `src/` changes this session. `npm test` **877/877**,
  `npm run build` green (both unchanged from #220's own state — this
  session made zero engine edits, only a new probe script and docs).
  `turn9-menu.json` still **111/111** (untouched). Rungs (c)/(d) from
  the supervisor's brief are **NOT landed**: no `turn9-quickattack.json`
  or `turn9-rockslide*.json` committed.
- **Did:** RAM-probed QUICK_ATTACK's animation window exhaustively
  (`tools/probe/dump-quickattack-anim.py`, new, committed — dumps
  x/y/x2/y2/invisible/objMode/paletteNum for an explicit sprite-slot
  list + BLDCNT/BLDALPHA + `gBattlerSpriteIds`, over any tick range),
  cross-checked against 20 spot pixel captures (sha256 + connected-
  component diffs, not eyeballed). Found: (1) §35's own sprite-slot
  claim was wrong — direct `gBattlerSpriteIds` read shows Pidgeotto's
  real sprite is slot **5**, not 2 (slot 2 is unrelated, untouched all
  window); slots 3/4 are the `TraceMonBlended` afterimage copies, slot
  7 the hitsplat (both confirmed right). (2) The blend registers
  (`BLDCNT=0x3f40`/`BLDALPHA=0x080c`, EVA=12/EVB=8) match
  `drawSpriteSheetBlended`'s existing DOUBLE_TEAM-clone blend ratio
  EXACTLY — no new blend primitive needed. (3) A full per-tick table
  for the 10925-10946 lunge/trace/hitsplat window is now banked (§36).
  (4) The real sprite's own hide (RAM 10925) and un-hide (RAM 10946→
  10947) instants do NOT fit either a 0-tick or 1-tick render lag
  against the observed 0-diff-through-10928/first-diff-10929/0-diff-
  again-10947 pixel evidence — a genuine 3rd(+) lag class this session
  ran out of time bisecting. (5) A second shake episode (~10957-10976,
  Onix's healthbox wobbling in lockstep, ENDEAVOR's own "3 sprites at
  once" shape) shows RAM alternating every tick while three sampled
  render ticks spanning both parities are PIXEL-IDENTICAL — RAM change
  doesn't always cross a rendered pixel boundary. Wrote up the full
  ledger as `docs/battle-turn-notes.md` §36 rather than guess at a
  render and risk red captures.
- **Next:** round 11 — the render-lag puzzle above is the concrete
  next step (§36 has the full per-tick table + the exact contradiction
  to resolve — likely needs 2-3 more spot pixel probes right at the
  10925-10928 and 10946-10947 boundaries specifically, not a re-run of
  the wide sweep this session already did). Once resolved,
  `drawSpriteSheetBlended`/`drawPlayerHealthboxHpOverlay` are both
  already-generic and ready to wire in with zero new primitives. Rung
  (d) (ROCK_SLIDE) is unblocked by strong precedent (turn 6/7's own
  `drawTurn6RockSlideAttack`/`drawTurn7RockSlideAttack`) but
  structurally waits on rung (c) landing a correct prefix first.
- **Notes:** PAPERCUT: none of the existing probe scripts dumped an
  explicit, arbitrary sprite-slot list cross-checked against
  `gBattlerSpriteIds` — every prior one either hardcoded a slot or
  resolved it from `gBattleAnimAttacker`'s own single-attacker
  assumption, which is why §35's own slot-2 mislabel went unnoticed
  for a full session; the new `dump-quickattack-anim.py` fixes this
  generally, worth reusing as-is for future multi-sprite windows.
  Session spent most of its 60-minute cap on RAM/pixel investigation
  (deep multi-sprite/multi-lag animation, genuinely harder than any
  prior single-mechanism window in this arc) rather than code -
  landed a probe-only "scout" outcome per the brief's own explicit
  "never red" fallback, matching the shape of prior worktree-probe
  entries (#219/#221) even though this was a main-lane, not worktree,
  session.

---
