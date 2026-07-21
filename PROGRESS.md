# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 211 — Worktree probe (supervisor-folded): **ISSUES #27 RESOLVED in one 8-minute probe** — the "unattributed" HP-write+5 Random() is `Cmd_seteffectwithchance`'s UNCONDITIONAL secondary-effect roll (`battle_script_commands.c:2923`: `Random()` is the FIRST operand of the `&&` chain, consumed even at `secondaryEffectChance=0` — C evaluation order, source-verified by the supervisor directly); the offset is SCHEDULE-DEPENDENT, not fixed (+5 = 4 minimal-cost script commands; turn 15's "missing" instance was actually at +93, delayed by the faint sequence); `docs/rng-attribution-notes.md` merged, suite 845/845

- **State:** merged into master post-turn-7, `npm test` 845/845 + build
  green, worktree/branch cleaned. Supervisor verified the source claim
  directly (read `Cmd_seteffectwithchance` — the `&&` order is exactly
  as claimed) and the evidence table (LCG transitions for all three
  instances). Dossier reattributions applied at this fold (turn15/16/17
  §2 lines, strikethrough + citation); ISSUES #27 deleted.
- **Did (the predictive rule engine work now inherits):** every damaging
  move reaching `BattleScript_EffectHit`'s tail consumes EXACTLY ONE
  secondary-effect roll on connect, regardless of chance — misses divert
  before the roll, immunity is checked after it. FIRE_PUNCH's burn roll
  (21411/22423) is the same call site with chance=10. Both prior
  candidates ruled out (FLAME_BODY sweep; King's-Rock is a LATER stage,
  `Cmd_moveend`). Turn 13/14's 17105/17111/18079 stay a separate
  (AI-prescoring) family — correctly out of scope.
- **Also at this fold:** ISSUES **#28 filed** — the period-9 excluded-
  tick family in browsing-submenu windows has now RECURRED at turn 7
  (8 ticks, §32, same cadence as turn 6's §27 set); upgraded from
  dossier footnote to standing backlog per the residual-elimination
  policy (one probe survived, no root cause yet).
- **Next:** engine: turn 8+ parameterizations; feathers dedicated step
  (turn-7 probe table + window, §29's sampling-residual leads); probes:
  #28 (period-9 family), #26 (Sitrus ring); scout: post-WIN scene
  transition dense ground truth.
- **Notes:** probe in contract (8.3 of 30 min), cleanest step of the
  session — a 30-min cap on pure-attribution probes is comfortably
  sized; keep using it.

---
## 210 — Bounded worker (S7 engine slice O): turn 7 landed end to end minus its own feather sub-window — `turn7-menu.json` **85/85**, `turn7-rockslide-{a,b,c,d}.json` **256+256+256+19/787**, all 0 diff; a pure parameterization of turn 6's own N-4 rungs, one real bug found+fixed (a second bounce-reset regime turn 7's own idle window needed that turn 6 never exercised) (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **845/845** (+8), `npm run build` green, tree
  clean. `turn7-menu.json` 85/85 (8346-8438 minus 8 known-class residual
  ticks) + `turn7-rockslide-{a,b,c,d}.json` 787/787 (8593-9379 contiguous),
  all 0 diff. Zero regressions: `turn6-rockslide-a.json` 255/255,
  `turn6-statfall.json` 127/127, `turn6-feathers.json` 106/106,
  `turn6-menu.json` 33/33.
- **Did:** rungs (a)+(c)+(d) of the brief's own ladder landed together
  (turn 6's own dispatcher already unifies kickoff-text/stat-banner/ATK-fell
  into one function, so parameterizing it lands both at once); every
  pressTick-generic turn-6 function reused UNCHANGED, fed a fresh dense
  oracle sweep's own real pressTick (8379) or a new synthetic ROCK_SLIDE
  anchor (`TURN7_ROCKSLIDE_PRESS_TICK=8406`). Found and fixed a real bug
  `npm run compare` caught immediately (6.93% diff, first attempt): turn 7's
  own pre-confirm idle/browsing window comes AFTER turn 6's own ROCK_SLIDE
  reset the bounce cycle fresh at ITS OWN redraw (8122) and dropped
  Pidgeotto to 113 HP — `drawTurn6FieldBase` silently assumed neither had
  happened (true for every turn ≤6 caller, false for turn 7). Fixed with a
  `drawTurn7FieldBase` wrapper (an algebraic regime-1↔regime-2 anchor shift,
  not a fitted constant) plus an explicit Pidgeotto-HP repaint. 4 new
  literal constants for ROCK_SLIDE, none transferable from turn 6's own
  values (freshly fit each time, matching this dossier's own convention) —
  notably `TURN7_SUPER_EFFECTIVE_TEXT_DELAY=634` vs turn 6's 646 (the
  smaller -31 HP delta drains faster). Text wording re-verified via direct
  PNG read, not assumed ("harshly fell" holds for the 2nd ATK drop too).
- **Next:** rung (b) — turn 7's own feather sub-window (8439-8592,
  currently unrendered but harmlessly excluded, not wrongly rendered): rerun
  `dump-feather-dance-sprites.py` against this window, commit
  `turn7-feather-sprites-probe.json`, add a tick-range-dispatched second
  table. Then turns 8-13 as further parameterizations, or the turn 15+/16+
  scout territory already banked.
- **Notes:** no papercuts; `npm run compare`'s pixel diff again caught a
  real bug immediately and precisely (this session's own regime-2 finding),
  same pattern §31 noted for its own two bugs — hand-verifying
  mechanism-reuse arithmetic before writing render code catches the
  ARITHMETIC, but genuinely NEW situations (a window past a redraw reset
  that no prior turn's code path ever needed) still need the pixel compare
  to surface. docs/battle-turn-notes.md §32; turn6-notes.md/turn7-notes.md
  left untouched (ground-truth dossiers, not engine docs).

---
## 209 — Worktree scout (supervisor-folded): turn 17 + the WIN ground truth BANKED — **battle 1 is now ground-truthed turn-by-turn from anchor through the victory text**, a gapless prefix-verified dense-trace chain (turns 6-17 dossiers + winline); Murkrow faints at 22418, **`gBattleOutcome` flips 0→1 at tick 22818** (16 ticks after the dismiss press, while the OLD text still shows — §16's "instant the screen appears" corrected at this fold), DESTIN's loss quote "PLEASE I NEED / SOME WATER" held un-dismissed at trace end 23601; `battle1-turn17-dense.json` (256 captures) + `docs/turn17-notes.md`; merged, suite 837/837 on the merged tree

- **State:** merged into master post-rung-(b), `npm test` 837/837 +
  build green post-merge, worktree/branch cleaned. Supervisor
  re-verified independently: prefix chain re-flattened (turn16 ⊂ turn17
  ⊂ winline-b-swap, script-exact), fresh rerun reproduced 11/11 cited
  shas at exact ticks, 2 climax labels PNG-read ("Player defeated BUG
  CATCHER DESTIN!♥" at 22885; the held quote + trainer sprite at 23601).
- **Did (the 7 briefed questions, all answered):** burn roll STILL
  FIRES vs an already-burned+fainted target (`Cmd_seteffectwithchance`
  unconditional; `SetMoveEffect`'s hp==0 gate short-circuits after the
  roll — both source-cited); burn residual absent this turn
  (`ENDTURN_BURN` gates on hp!=0); BRN badge rides with the healthbox
  (both vanish at 22508, same tick status1 clears); faint sink VERBATIM
  vs turns 13/15, novelty = post-dismiss branches to the win sequence
  (last mon); MAGBY exits 27/138, FIRE_PUNCH PP 13. ISSUES **#27 filed
  at this fold**: the unattributed Random() at HP-write+5 has now
  appeared twice at the IDENTICAL offset (21152, 22173) — upgraded from
  "tail noise" to suspected fixed mechanism, one probe step owed.
- **Next:** engine: turns 7-13 as parameterizations (turn 6 is complete
  end to end per #208), then turn-14+ (FLY halves, player switch, win
  seq — all ground-truthed); probes: ISSUES #27 (RNG attribution), #26
  (Sitrus ring), feather residual 7421-7549; scout territory: the
  post-WIN scene transition (§17's swap screen is next unscouted dense
  ground).
- **Notes:** scout in contract (16.0 of 40 min); 1 PAPERCUT noted in
  the dossier (256-capture budget forced an uncommitted stride-2
  side-probe for the faint-sink boundary — an accepted convention, not
  tooling friction; no PAPERCUTS.md change).

---
