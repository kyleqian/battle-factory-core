# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 221 — Worktree probe (supervisor-folded): ISSUES #30's sSpriteOrder lead NARROWED TO 2 CANDIDATES — the real mechanism (source-read) is a full per-frame insertion sort whose history only matters at exact (priority, wrapped-Y) ties, and the mirrored-pair feathers make ties pervasive (why fresh Y-sorts can't model it); of the 2^3 unknowable initial pair-orders, ONLY the (4,7) pair matters — 2 live candidates, identical across turns 6/7/8; `docs/feather-order-notes.md` + rerunnable simulation script merged (supervisor-rerun reproduces), suite 877/877

- **State:** merged into master post-slice-R, `npm test` 877/877 +
  build green, worktree/branch cleaned. ISSUES #30 updated with the
  narrowing + the named next step (render both candidates over turn
  6's residual window, diff vs fresh oracle captures — decisive either
  way). Probe stopped honestly at cap before the pixel test.
- **Next:** round 10 — main: QUICK_ATTACK's animation (slice R rung
  (c), §35's RAM-probed task inventory banked: elliptical lunge +
  blended afterimage + shake, tasks/slots pinned) then rung (d)
  (ROCK_SLIDE + turn-end); worktree: the #30 candidate pixel test
  (scratch-render, no engine code). Wind-down begins ~07:45.
- **Notes:** probe in contract (9.3 of 30 min), honest cap stop.

---
## 219 — Worktree probe (supervisor-folded): **ISSUES #29 ROOT-CAUSED, both families** — the same missing-`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` mechanism as #28, one dispatch branch earlier (Family A: pre-reveal idle window must key the shift off `openElapsed !== null`, not `revealTick`; Family B: `turn7KickoffBounceTick`'s pre-freeze branch returns unshifted `t`); supervisor re-ran the committed verify script — both families PASS, zero neighbor regressions; probe scoreboard this session: **4-for-4** (#27, #26, #28, #29); merged, suite 865/865

- **State:** merged into master post-feathers, `npm test` 865/865 +
  build green, worktree/branch cleaned. ISSUES #29 rewritten to
  one-fix-step-owed with the probe's rules + the honest open flag
  (turn 6/8 kickoff wrappers share Family B's code shape, unprobed).
- **Next:** round 9 — main: #29 fix as rung (a) (verify-script-first,
  restore 6 ticks: menus → 44/93/88) + turn 9 slice as rungs (b+)
  (turn9-notes.md exists; both published lines reconverge at turn 9);
  worktree: ISSUES #30 probe (simulate SortSprites' persistent
  adjacent-swap order over the committed feather probe tables — all
  inputs committed, pure computation; then the half-texel lead).
- **Notes:** probe in contract (12.0 of 30 min). Every excluded tick
  in turns 1-8 now has either a root-caused fix pending (#29's 6) or
  a live named-lead investigation (#30's feather windows); no
  speculative labels remain.

---
