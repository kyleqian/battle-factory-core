# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 200 — Bounded worker (S7 slice N rung (b), reduced scope): FEATHER_DANCE's kickoff text + settled hold LANDED — `turn6-featherdance.json` 90/90, 0 diff; a real rung-(a) bug found+fixed (region-A onix-sprite bounce wasn't frozen, only region B was); the feather/starburst SPRITE ANIMATION itself deferred (genuinely new affine-rotation rendering, no precedent in this codebase) — RAM ground truth banked, not implemented

- **State:** `npm test` **821/821** (+3), `npm run build` green, tree
  clean. New committed trace `turn6-featherdance.json` (90 captures,
  7307-7404, same 4 pre-confirm residual pairs excluded as §27, zero new
  exclusions) **0 diff**. Regression sweep: `turn6-menu.json` 33/33,
  `turn5-sitrus-c.json` 150/150, `turn5-sitrus-d.json` 133/133, `turn3-
  rockslide.json` 256/256, `turn5-rockslide.json` 256/256, `turn5-menu.json`
  42/42, `turn4-menu.json` 44/44, `turn5-endeavor.json` 254/254, `turn1-
  cloneanim.json` 230/230 — zero regressions.
- **Did:** kickoff text ("Foe PIDGEOTTO used FEATHERDANCE!") timing
  RAM/pixel-nailed (`turn6FeatherDanceTextStartTick = pressTick+13` = 7358,
  settles 7388, oracle-reprobed fresh — NOT either of the two existing
  generic-kickoff delay constants, both checked and ruled out). Extending
  the captured window past rung (a)'s own 7350 cutoff immediately exposed
  rung (a)'s named "region A" residual on EVERY subsequent tick — RAM-
  probed (`gSprites[gBattlerSpriteIds[0]]`/`[gHealthboxSpriteIds[0]]`'s own
  `y2`, both flat 0 for the whole post-confirm hold) and fixed: (1)
  `drawTurn5RockSlideAttack` never threaded its own `bounceTick` param for
  the on-field Onix sprite's bounce (always used live `t`, even when
  called from a frozen-hold context) — added one, default-preserves every
  other caller; (2) the frozen anchor itself (`pressTick`) sat on a
  `{onixY2:1, healthboxY2:0}` point in `menuIdleBounce`'s own cycle, not
  the real `{0,0}` — moved to `pressTick - 4`, a scanned `{0,0}` plateau.
  This retroactively fixes rung (a)'s own 7348-7350 exclusion too (not
  applied to the already-shipped `turn6-menu.json` this session, to avoid
  churning it under time pressure — noted as an optional cleanup).
  Determined the animation's own true first pixel-change tick is **7405**
  (RAM/pixel-confirmed, earlier than the brief's "~7450" eyeball estimate)
  — `turn6-featherdance.json`'s captureFrames stop there.
- **Did NOT land (scope call, not a resistance-with-no-findings):** the
  feather/starburst sprite animation (7405-7658). RAM-probed the spawn
  timeline (8 `gFallingFeatherSpriteTemplate` sprites, groups of 1/2/2/2/1
  at 8-tick spacing, all spawning at (72,64) — script-confirmed against
  `Move_FEATHER_DANCE`/`data/battle_anim_scripts.s:3975`) and read the
  render mechanism (`AnimFallingFeather`/`_Step`,
  `src/battle_anim_flying.c:572`): each sprite writes an independent
  rotation+scale matrix into `gOamMatrices` every tick from a sine-table
  phase accumulator — a genuinely new affine-rotation sprite primitive
  this codebase has no precedent for (existing affine helpers only ever do
  a single uniform scale or a single externally-supplied static matrix).
  Per the brief's own explicit permission ("if they resist wholesale, stop
  and document rather than shipping a half-fit"), stopped here rather than
  force a bounded-effort implementation that wouldn't reach this dossier's
  0-diff/RAM-verified standard in the remaining time. Full writeup +
  banked RAM data: `docs/battle-turn-notes.md` §28.
- **Next:** the feather/starburst animation itself (§28's own sketch: a
  generic affine-matrix sprite blitter, a full per-tick RAM probe of
  `gOamMatrices`/sprite state across 7405-7658, and `ANIM_TAG_WHITE_FEATHER`
  gfx extraction via `extract-battle-move-anim-assets.ts`'s convention —
  none attempted this session beyond the spawn-timeline scan). Then rung
  (c) (ATK-fall message) and rung (d) (Onix's ROCK_SLIDE, parameterizable).
- **Notes:** PAPERCUT: none new this session — the chained-trace-stitching
  risk flagged in §27 turned out to be moot here (verified `battle1-
  turn6-dense.json`'s own script has zero button presses between the turn-6
  confirm and turn 7's reopen, so `turn6-menu.json`'s already-committed
  idle tail already covered the whole window — no stitching needed at all).

---
## 199 — Worktree scout (supervisor-folded): turn 12 ground truth BANKED — the scout CORRECTLY FALSIFIED the brief's premise (supervisor transcription slip: ROCK_SLIDE entered at 1/10 not 2/10): turn 12 = AERIAL_ACE hit (Onix 14→4) + ROCK_SLIDE **MISS** (PP-exhausted at 0/10), NOBODY faints; the real faint is **turn 13 via DRAGON_BREATH** (tick 15887, Murkrow in at 16944, light RAM scan, unverified); 4th consecutive line reconvergence; `battle1-turn12-dense.json` (252/252 captures) + `docs/turn12-notes.md`; merged `0a3ccf4`, suite 818/818 on the merged tree

- **State:** merged into master, `npm test` 818/818 + build green
  post-merge. Supervisor re-verified: prefix chain (turn11 ⊂ turn12 ⊂
  winline-b-swap, script-exact), miss-hold sha reproduced fresh, PNG-read
  the held "ONIX used ROCK SLIDE!" frame with Onix at 4/117. Scout
  discipline was exemplary: did the assigned turn-12 work as it ACTUALLY
  happens, added only a clearly-labeled unverified turn-13 scan, deferred
  the reuse map to the turn-13 session with three sharp bullets.
- **Did:** turn 12 both-halves ledger RAM-truthed (AERIAL_ACE 0.5× vs
  ROCK/GROUND — PNG-caught, easy to misremember; ROCK_SLIDE's miss = 1
  Random() only). The unattributed RNG step re-confirmed a 4th time at
  bit-exact offsets (93 after HP-commit, 9 before curMove) — solidly tied
  to the damaging-move HP-commit path now. Murkrow snapshot RAM-confirmed
  3rd time; held item corrected to LAX_INCENSE (no switch-in proc,
  unlike Sitrus).
- **Planning implication (supervisor):** turn 13's faint arrives via
  DRAGON_BREATH — ISSUES #23's PARKED projectile animation is therefore
  ON the winline. The turn-13 engine slice will need #23's exclusion
  treatment for the projectile ticks unless #23 is cracked first;
  sequence a dedicated #23 probe (its named "isolate a single spawn"
  instrument, never attempted) before or alongside that slice.
- **Next:** slice N rung (b) — FEATHER_DANCE's animated path (turn 6,
  7358-7658), per §27's precise scoping; then rungs (c)/(d); then
  turn-13 scout (faint + Murkrow switch-in reuse map).
- **Notes:** scout stayed in contract; no scout papercuts (the main-lane
  stitching papercut recorded separately).

---
## 198 — Bounded worker (S7 slice N rung (a) only): turn 6's FIGHT-submenu reopen + move confirm LANDED — `turn6-menu.json` 33/33, 0 diff; rungs (b)/(c)/(d) NOT attempted (60-min cap, not a resistance finding) — precisely scoped for the next session

- **State:** `npm test` **818/818** (+5), `npm run build` green, tree
  clean. New committed trace `turn6-menu.json` (33 captures, 7307-7350,
  11 named bounce-extremum ticks excluded) 0 diff. Regression sweep:
  `turn5-sitrus-c.json` 150/150, `turn5-sitrus-d.json` 133/133, `turn3-
  rockslide.json` 256/256, `turn5-rockslide.json` 256/256, `turn5-menu.json`
  42/42, `turn4-menu.json` 44/44, `turn5-endeavor.json` 254/254 — zero
  regressions.
- **Did:** turn 6's reopen (press 7313) + confirm (7345, cursor 0 -
  ROCK_SLIDE, no nav needed) — the first FIGHT-submenu reopen against a
  NEW opponent (Pidgeotto, not Grovyle), so `drawFightSubmenuWindow` now
  short-circuits on a new `turn5Resolved` flag into a dedicated
  `drawTurn6FightSubmenuWindow`/`drawTurn6FieldBase` (Onix/Pidgeotto's
  own already-proven-0-diff primitives, factored out of
  `drawTurn5RockSlideWindow`'s own tail — zero formula changes) instead of
  threading a 5th tier through the Grovyle-shaped `menuIdleBase` helpers.
  Two real bugs found via compare-driven bisection: (1) the window's own
  right-edge border strip (x=232-239) wasn't filled under the reopened
  submenu — turns 1-5 never exercised this since `menuIdleBase`'s full-
  screen static harvest always covered it; fixed by drawing the same
  y≥112 chrome crop before the submenu's own opaque box. (2) a chained-
  trace stitching bug (not an engine bug) — the scratch probe silently
  inserted 8 redundant idle frames, shifting press ticks 8 late in the
  trace's own frame-index space (pixels still matched since oracle+app
  replay the identical script, but citations would've been wrong); fixed
  by trimming the overshoot so the committed trace's ticks match the
  dossier's own cited 7313/7345 exactly.
- **Next:** rung (b) — the FEATHER_DANCE kickoff text + feather/starburst
  animation (~7358-7658, docs/turn6-notes.md §5/§6), genuinely new gfx-
  extraction work, this session's own designated centerpiece, untouched.
  Then (c) the ATK-fall message, (d) Onix's ROCK_SLIDE (parameterizable
  from turns 1/3/4/5's own unchanged mechanism) to the settled turn-7 menu.
- **Notes:** 3 named single-tick bounce-extremum residuals excluded from
  `turn6-menu.json` (7315-7316, 7324-7325/7333-7334/7342-7343, 7348-7350) —
  same well-precedented class already resolved elsewhere in this dossier
  (ticks 3337/3465/3721/3879/3888/4934/5927); the last one (post-confirm,
  region-A Onix-sprite bounce, NOT the healthbox) is grid-search-ruled-out
  as the healthbox freeze and needs a direct `gSprites[onixSlot].y2` RAM
  probe next. PAPERCUT: none this session beyond the chained-trace
  stitching gotcha above (self-inflicted, ~15 min lost, now documented in
  battle-turn-notes.md §27 so it isn't repeated).

---
