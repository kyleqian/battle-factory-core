# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 197 — Worktree scout (supervisor-folded): turn 11 ground truth BANKED — the ATK-floor falsifiable test FIRES POSITIVE ("ONIX's ATTACK won't go lower!", sText_StatsWontDecrease, PNG-read; PP charged + accuracy roll consumed but stat write blocked), and the blocked effect SKIPS the feather animation (33-tick static kickoff hold vs turns 6-8's ~290-tick animated holds — rationale corrected in the fold: animation keys on effect-success, not move class); third consecutive line reconvergence; `battle1-turn11-dense.json` (14340 frames, 256 captures) + `docs/turn11-notes.md`; merged `961344a`, suite 813/813 on the merged tree

- **State:** merged into master, `npm test` 813/813 + build green
  post-merge. Supervisor re-verified: prefix chain (turn10 ⊂ turn11 ⊂
  winline-b-swap, script-exact), 5/5 cited shas reproduced fresh, the
  headline message PNG-read directly ("won't go lowe[r]" mid-typing at
  13447, Onix 14/117). One rationale corrected in the fold (see headline;
  observation was right, generalization was wrong and would have broken
  turns 6/7 engine slices).
- **Did:** turn 11 = FEATHER_DANCE reselected at ATK floor (first
  positive on standing test 1; PP 12→11, accuracy roll consumed, stat
  write silently blocked) + ROCK_SLIDE hit (Pidgeotto 38→16). The
  unattributed +14-tick RNG step is ABSENT this turn — narrows its call
  site to a damaging move's HP-commit path (test 3 sharpened, still
  open). Pidgeotto crosses yellow→red at tick 13740 (~20.5%, matches
  turn 9's Onix threshold). Turn 12 is near-certain to hold Pidgeotto's
  faint + MURKROW switch-in (16/156 vs ~22/hit ROCK_SLIDE).
- **Also this fold:** ISSUES #26 filed (Sitrus THIN_RING exclusion,
  7042-7072, 3 bounded attempts, leads incl. the untried +2-lag class);
  M-5's stray scratch script removed; scout's .gitignore note (the
  `reference` symlink pattern) left as-is — cosmetic, not worth a churn
  commit.
- **Next:** turn-6 engine slice (FIGHT submenu at 7317 through turn 6's
  full resolution — FEATHER_DANCE's REAL animated path this time, per
  turn6-notes + the corrected §5 rows); turn-12 scout (the faint/Murkrow
  switch-in window).
- **Notes:** scout stayed in contract; no papercuts.

---
