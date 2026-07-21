# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 196 — Bounded worker (S7 slice M-5): rungs (d)+(e) LANDED — tint + heal message + HP climb + settled turn-6 menu; `turn5-sitrus-c.json` 150/150, `turn5-sitrus-d.json` 133/133, both 0 diff; ring excluded (bounded effort, 3rd resistance, precise ticks); **the faint/forced-switch sequence is COMPLETE**

- **State:** `npm test` **813/813** (+8), `npm run build` green, tree
  clean. New committed traces `turn5-sitrus-c.json` (150 captures,
  7035-7215 excluding the ring's own 7042-7072) and `turn5-sitrus-d.json`
  (133 captures, 7180-7312, covers past the 7307 acceptance boundary) —
  both 0 diff. Regression sweep: `turn5-sitrus-a.json` 110/110,
  `turn5-sitrus-b.json` 82/82, `turn5-healthbox.json` 55/55,
  `turn5-switchin.json` 241/241 — zero regressions.
- **Did:** Tint — RAM-probed fresh (`gPlttBufferFaded`/`Unfaded`, all 15
  usable palette colors, Onix's own paletteNum=0 not Pidgeotto's 1),
  brute-forced target+coeff jointly and got a UNIQUE fit: `RGB5(17,31,25)`,
  coeff sequence 7/5/3/1/0 held 5 RAM ticks each — genuinely NOT
  `MATERIALIZE_TINT_COLOR` reused (an initially-plausible hypothesis the
  brute force ruled out). Heal message ("ONIX’s SITRUS BERRY"/"restored
  health!", 7078→7112, held to 7215) PNG-diff-timed; found and fixed one
  real bug (a straight ASCII apostrophe the charmap doesn't map — the
  codebase's own convention is the curly `’`, per `STAT_ROSE_LINE1`). HP
  climb: 1→31, exactly 1 unit/tick, render 7180→7209, PNG-crop-matched 0px
  against `composePlayerHealthboxHpOverlay` at every candidate hp — this
  **corrects §11's own hedge** ("HP digits/bar still climbing past 7306"):
  they're not; hp is flat at 31 from 7209, every later change in that
  region is the ordinary `menuIdleBounce` y-shift (yOffset 0/1/2, never a
  different hp). Settled menu: chrome text cropped from `menuIdleBase`'s
  own y≥112 (never changes across turns), bounce reuses `menuIdleBounce`
  UNCHANGED re-anchored so tick 7222 (menu redraw) lines up with
  `MENU_IDLE_BLANK_END_TICK+1` — grid-search found a unique shift with zero
  mismatches across 17 samples. Tick 7307 byte-identical (full 64-hex sha)
  to turn6-notes.md §5's own citation. Ring: excluded per the brief's own
  allowance — with tint correct, the residual in 7042-7072 is provably
  100% the ring (diff overlay shows a clean red ring outline, growing
  6px→628px matching its own expand-then-fade shape) — third documented
  resistance, still open. +8 Tier-1 tests.
- **Next:** the turn-6 engine slice proper (FIGHT submenu open at 7317+)
  against `turn6-notes.md`'s dossier; then turn-7/8/9/10 slices against
  their own four dossiers.
- **Notes:** no papercuts this session. Docs: `faint-switch-notes.md` new
  §15 (trimmed §14's "not reached" pointer to it).

---
## 195 — Worktree scout (supervisor-folded): turn 10 ground truth BANKED — SECOND consecutive full reconvergence (AERIAL_ACE + ROCK_SLIDE hit, RAM bit-identical to BOTH published lines' turn-10 rows incl. gRngValue), all three standing falsifiable tests still negative; `battle1-turn10-dense.json` (13306 frames, 208 captures) + `docs/turn10-notes.md`; merged `9834116`, suite 805/805 on the merged tree

- **State:** merged into master, `npm test` 805/805 + build green
  post-merge. Supervisor re-verified: prefix chain (turn9-dense ⊂
  turn10-dense ⊂ winline-b-swap, script-exact), 3/4 cited shas
  reproduced + the 4th was a tabulation slip (cited sha belongs to tick
  12320, not 12345 — label PNG-verified correct, two fresh oracle runs
  byte-identical; row corrected in the fold). Cursor-persistence got its
  strongest data point: zero navigation presses this turn, cursor0
  RAM-flat on ROCK_SLIDE across the whole window.
- **Did:** turn 10 = AERIAL_ACE (new to arc: EFFECT_ALWAYS_HIT skips the
  accuracy roll entirely, RAM-confirmed; slash-on-target animation shape,
  no attacker mover) vs ROCK_SLIDE hit; Onix 24→14, Pidgeotto 61→38. The
  unattributed +14-tick RNG step reproduced a 3rd time and one candidate
  explanation was RULED OUT (identical-text/typing-timing — turn 2's
  differently-typed pair hits the same offset): looks like a fixed
  engine-level cost. Turn-9's "4-frame shared prefix" reproduction
  attempt honestly flagged as method-incomplete (skipped the baseline
  bisection), an open gap not a contradiction.
- **Cross-lane note:** M-4's worker cd'd into this scout's LIVE worktree
  early on (cwd persistence) leaving uncommitted scratch debris; scout
  reported it, merge carries none of it, PAPERCUTS.md entry added
  (supervisor). M-4's own deliverable verified separately in the main
  tree (`turn5-sitrus-b.json` 82/82, suite 805/805).
- **Next:** M-5 (Sitrus rungs d+e per faint-switch-notes §14: tint/
  sparkle/ring/message/HP-climb, then settled menu ≥7307 — completes the
  faint/forced-switch sequence); then turn-6..10 engine slices against
  the five banked dossiers.
- **Notes:** no scout papercuts; turn-11+ boundaries noted in the
  dossier, not densely probed.

---
