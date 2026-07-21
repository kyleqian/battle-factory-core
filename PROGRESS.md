# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 213 — Worktree probe (supervisor-folded): **ISSUES #26's THIN_RING CRACKED ANALYTICALLY** — the ring's matrix is a pure isotropic scale with a closed form (`a=d=floor(4096/n)`, `b=c=0`, `n=clamp(ramTick-7039,1,31)`, center (72,88), render lag **+1** — NOT §13's +2 rotation class), placement verified pixel-exact with ZERO fitting (6/6 px at render 7042, 92/92 at 7048, existing sampler + existing gfx verbatim); after 3 failed fitting attempts across 3 sessions, one 15-min probe made the fix MECHANICAL; `faint-switch-notes.md` §16 + committed probe JSON merged, suite 852/852

- **State:** merged into master post-turn-8, `npm test` 852/852 + build
  green, worktree/branch cleaned. Supervisor re-verified the closed form
  myself against all 32 live ticks of the committed probe JSON (exact
  match, center invariant (72,88)). ISSUES #26 rewritten at this fold:
  from "excluded after 3 attempts" to "analytically placed — one
  mechanical fix step owed" (params in the entry + §16).
- **Did:** probe identified the sprite (slot 4, matrixNum 2, affineMode
  3/double, 64x64, priority 2, alive 7040-7071), dumped per-tick state
  (twice-run byte-identical), tested §13's +2-lag lead FIRST as briefed —
  refuted it (ordinary +1 fits all samples; the +2 class is
  rotation-specific, matching §29's independent negative). Larger-tick
  residuals attributed to the known drop-shadow z-order at rows 112-114,
  named as the fix's one non-mechanical caveat.
- **Next:** round 6 launching now — main: the #26 fix + restore
  turn5-sitrus-c.json's 7042-7072 (mechanical, params banked); worktree:
  ISSUES #28's period-9 probe (3rd recurrence banked by turn 8, §33).
  Then: turn 9+ parameterizations, feathers dedicated step, post-WIN
  scene scout.
- **Notes:** probe in contract (15.0 of 30 min). Pattern now 2-for-2
  this session (after #27): the 30-min probe-only worktree step resolves
  what repeated bounded fitting attempts could not — RAM-first is the
  instrument, not the fallback.

---
## 212 — Bounded worker (S7 engine slice P): turn 8 landed end to end minus its own feather sub-window — the winning line's own divergence turn (RIGHT onto BIND, BIND MISSES, FEATHER_DANCE proceeds) — `turn8-menu.json` **78/78**, `turn8-bind-{a,b}.json` **256+66/322**, all 0 diff, first-attempt render (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **852/852** (+7), `npm run build` green, tree
  clean. `turn8-menu.json` 78/78 (9380-9467 minus 10 known-class residual
  ticks) + `turn8-bind-{a,b}.json` 322/322 (9739-10060 contiguous), all
  0 diff. Zero regressions: `turn7-menu.json` 85/85, `turn7-rockslide-
  {a,b,c,d}.json` 256/256/256/19, `turn6-rockslide-a.json` 255/255,
  `turn6-menu.json` 33/33.
- **Did:** a pure parameterization of turn 7's own dispatcher shape
  (`drawTurn7FeatherDanceKickoffText`/`drawTurn7RockSlideWindow`), fed
  this turn's own real confirm pressTick (9425). The 3 genuinely-new
  pieces the brief flagged: (1) the FIGHT-submenu RIGHT nav onto BIND —
  `moveFightCursor`'s existing `cursor^1` grid arithmetic needed ZERO new
  code (already generic since turn 3), only `core.ts`'s own confirm gate
  needed extending (`cursor===0||cursor===2` → also `cursor===1`); (2)
  BIND's own kickoff text + the first-ever-rendered MISS message
  (`sText_AttackMissed`, no move animation plays on a miss — pure
  text-swap over a frozen static field, no new attack-animation function
  needed); (3) the ATK-stage floor-clamp — confirmed (both from source
  and a 0-diff compare run) to produce NO visible message difference this
  turn, matching the dossier's own finding. One real find: the turn-end
  clear-to-redraw gap is 6 ticks here, not every prior turn's own 7 —
  freshly fit, not chased further (flagged, doesn't change what renders).
  A 3rd recurrence of ISSUES #28's period-9 residual class (10 ticks
  excluded from `turn8-menu.json`, same shape as turns 6/7's own 8-tick
  instances) — banked as further evidence, not re-diagnosed (out of
  scope).
- **Next:** rung (b) analogues for turn 7 AND turn 8's own feather
  sub-windows (both still deferred, bankable together); then turn 9
  (ROCK_SLIDE's own return, one `LEFT` press back from BIND, per
  docs/turn8-notes.md §7) as the next parameterization, or the turn
  15+/16+ scout territory already banked.
- **Notes:** no papercuts; `battle1-turn8-dense.json`'s own already-
  committed ground-truth dossier (docs/turn8-notes.md, a prior
  worktree-probe session) was thorough enough that NO fresh oracle sweep
  was needed this session — went straight from its own cited sha/tick
  table to render code, verified via `npm run compare` (which passed the
  BIND/miss window first-attempt; only the known-class #28 residual and
  the 6-vs-7-tick gap needed one correction each). docs/battle-turn-
  notes.md §33; turn8-notes.md left untouched (ground-truth dossier, not
  engine docs).

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
