# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.


---
## 533 — [SUPERVISOR ORIENT 2026-07-27 ~20:12] animation fold + fresh green OFF-profile baseline

- **State:** union committed except for this ledger/test-fix step and green at
  **287 files / 3753 tests**; `npm run build` clean. Battle Scene OFF oracle
  is fresh at canonical SHA `9c89c741…f297`; census remains
  **126/214 effects, 249/355 moves, 201/276 Factory-L50, 2548/2957 weighted
  (86.2%)**. No deferred questions.
- **Did:** folded all 10 `animation-main` commits absent from `master`
  (`d0c04f8`: Spark framebuffer closure, CHARM exact, Scary Face partial +
  evidence). The union exposed one supervisor-only launcher-test leak:
  `POKEBENCH_ROLE=supervisor` was not scrubbed by
  `codexLauncherProfiles.test.ts`; its five subprocess checks are hermetic
  again. Restarted the stale port-8014 service and re-ran freshness, full
  Tier-1, and build on the union.
- **Next:** resume the ranked executable census with the `EFFECT_CURSE` pair
  while a file-disjoint side worker prepares the next staged OFF-profile
  presentation-seam evidence; verify/merge both, then continue with FLAIL and
  the banked §15 seam wiring.
- **Notes:** no executable-frontier ratchet or barrier change. No PAPERCUT.

---
## 532 — [USER-DIRECTED TOOLING 2026-07-27 ~20:10] Codex max mode added: Sol/ultra supervisor, all-Sol workers up to xhigh

- **State:** tree green at **285 files / 3740 tests** (+1 file / +5
  launcher-profile tests), `npm run build` clean; oracle Battle Scene OFF
  profile healthy. Gameplay/census state is unchanged from entry 531.
- **Did:** `run-supervisor.sh` now accepts `-M` / `--max-mode`, selects Codex
  automatically, and fixes the supervisor at `gpt-5.6-sol` / `ultra`. The
  profile propagates into `tools/run-subagent.sh`: every worker is locked to
  `gpt-5.6-sol`, defaults to `xhigh`, may be explicitly lowered, and rejects
  Claude/Terra or effort above xhigh. `-m` remains the existing model flag;
  uppercase `-M` is the non-breaking max-mode shorthand. The ordinary Codex
  Sol/high supervisor + tiered-worker profile remains unchanged.
- **Next:** resume entry 531's ordered gameplay work: ranked census descent
  (CURSE pair, FLAIL, RETURN/FRUSTRATION), then banked §15
  turn13-sandattack wiring and §16 prep-scout.
- **Notes:** hermetic launcher tests pin the long/short flags, resolved
  supervisor/worker profiles, inherited mode, lower worker effort, and
  Claude/Terra rejection. No executable-frontier ratchet or barrier changes.
  No PAPERCUT.

---
## 531 — [SUPERVISOR WIND-DOWN 2026-07-27 ~19:00] session complete: 10 rounds / 16 workers, all green, all verified and merged

- **State (final):** tree committed and green at **284 files / 3735 tests**
  (session start 263/3512; the union includes the wind-down animation
  fold), `npm run build` clean, clean `git status`, zero unmerged side
  branches, zero stale worktrees, ~91 commits this session.
  `animation-main` folded twice (6 commits at orient: SWAGGER +
  SELF_DESTRUCT exact; 35 at wind-down: TAUNT exact + SPARK partial +
  tooling — coverage now **49/276 exact, 4 partial**; their supervisor
  session is still live, so later commits fold next orient). **No DEFERRED
  entries — nothing blocks the next `run-supervisor.sh`.** All 16 workers
  across 10 rounds completed (0 failures, 0 salvages, no usage limits).
- **Census: 105/214 → 126/214 effects, 206/355 → 249/355 moves, 167/276 →
  201/276 Factory-L50, 2251/2957 → 2548/2957 weighted (76.1% → 86.2%)**
  via 6 registration steps whose predicted flips ALL matched actuals
  exactly: TRYINFATUATING+JUMPIFCONFUSEDANDSTATMAXED (+70, incl. gender
  model + 2 barrier narrowings), RESTORE_HP/SOFTBOILED/OHKO (+57, incl. a
  dormant destiny-bond hitMarker bug fix), multi-hit cluster (+23-part),
  Roar+TRIPLE_KICK (+63 with multi-hit, incl. BATTLE_TYPE_ARENA slip fix),
  EXPLOSION pair (+25, incl. missing Explosion defense-halving in
  damageCalc), semi-invulnerable 7-item set (+35, 4 effects), sunlight-
  heal/FAKE_OUT/SOLAR_BEAM rows (+47, 5 effects). 42/42 census
  self-checks; next top rows: EFFECT_CURSE pair (18), FLAIL (20),
  RETURN/FRUSTRATION (18).
- **Census instrument FIXED (side rounds 2-3, supervisor-verified against
  raw source):** the CFG extractor missed operand-carried jump edges (170
  synthesized across ~60 mnemonics) and fabricated Roar’s fallthrough into
  the adjacent script; corrected rows pinned with exact-set self-checks.
  Scout dossier docs/roar-multihit-registration-scout.md consumed same
  session; docs/semi-invulnerable-registration-scout.md scouted AND
  consumed same session (its corrected 4-effects-not-1 prediction proved
  exact).
- **Seam program: 4 windows wired from kernel events this session** —
  turn2-endeavor (§13.3, 77/77), turn6-statfall ATK-fell text (§12.3 step
  3, 127/127), turn11-featherdance ATK-floor text (§14.3, 178/178), each
  first-try in 6-20 min against banked scouts; §15 (turn13-sandattack,
  190/190 re-pinned, existing bridge suffices) is banked unconsumed for
  next session. Prerequisite unblock chain: the apostrophe-charmap
  extractor bug (alias '\'' = B4 never applied) fixed with 129 templates
  corrected → unblocked both turn6-statfall and turn11 the same session.
  turn-N traces route ON-profile BY DESIGN (AGENTS.md legacy contract) —
  seam-doc banner + PAPERCUTS entry added.
- **AI CV ground truth:** AccuracyDown DRAW SITEs 3/4 live-verified
  (19/19 predicted draws, both seeds/reruns; 499-scenario verify suite
  ALL PASS rerun by supervisor); EvasionUp sites 6/7 + AccuracyDown's
  analogous pair closed as structurally UNSTAGEABLE with documented
  reasons (volatile status on the AI's own battler; switching clears it)
  — negative closure, not debt.
- **Next (in order):** census ranked-table descent (CURSE pair, FLAIL,
  RETURN/FRUSTRATION); §15 turn13-sandattack wiring (banked, zero new
  bridge surface); next §16 prep-scout per cadence; ISSUES #41/#39 keep
  retiring window by window.
- **Notes:** 1 new PAPERCUTS entry (turn-N ON-profile routing rediscovery).
  Supervisor process notes: cwd-poisoned-shell trap bit twice more (7
  lifetime) — one merge chain self-no-op'd and deleted its own cwd; branch
  survived, recovered clean; every post-worktree block now starts with an
  absolute cd. Worker entry-header timestamps drifted up to +1.5h again —
  scheduling was done off `date`. Oracle services fresh all session; the
  user's `codex/oracle-tooling-papercuts` worktree untouched.

---
## 530 — [BOUNDED WORKER 2026-07-27 ~20:20] Three single-opcode census rows registered; +5 effects/+5 moves/+47 weighted (matches assigned prediction exactly)

- **State:** tree green at **282 files / 3745 tests** (279/3704 → +3 files /
  +41 tests: new `battleScriptRecoverbasedonsunlightOpcode.test.ts` (12),
  `battleScriptJumpifnotfirstturnOpcode.test.ts` (6),
  `battleScriptJumpifabilitypresentOpcode.test.ts` (11), plus pin updates in
  `battleScriptJumpifhalfwordOpcode.test.ts` and `battleScriptRulesContext.test.ts`
  for the 3 new opcode ids), `npm run build` clean. Census regenerated:
  **126/214 effects, 249/355 moves, 201/276 Factory-L50 unweighted, 2548/2957
  weighted (86.2%)** — up from 121/214/244/197/2501. **Actual flip matches
  the assigned brief's predicted totals exactly** (+5/+5/+4/+47 across
  effects/moves/Factory-L50-unweighted/weighted) and each individual row's
  own predicted weighted share (16+15+16=47). `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero net new barriers).
- **Did:** all three assigned rows, in order. **(1) `B_SCR_OP_RECOVERBASEDONSUNLIGHT`**
  (new `battleScriptRecoverbasedonsunlightOpcode.ts`) — Morning Sun/Synthesis/
  Moonlight share one identical script (`data/battle_scripts_1.s:1731-1738`),
  so one registration flips all three. Weather-scaled heal fraction derived
  source-exactly (2/3 sun via the source's own unreduced `20*maxHP/30`
  literal, 1/2 no-weather-or-no-effect, 1/4 other), `WEATHER_HAS_EFFECT`
  composed from the new ability-on-field scan (below) rather than
  reimplemented. Zero barriers, zero `Random(` calls. **(2)
  `B_SCR_OP_JUMPIFNOTFIRSTTURN`** (new `battleScriptJumpifnotfirstturnOpcode.ts`)
  — the brief's own open question ("does the engine model isFirstTurn?")
  resolved to **yes, already durable**
  (`battleScriptRulesContext.ts`'s `isFirstTurn`, previously only read by
  Speed Boost's `!= 2` exception) — no new engine field needed, just the
  opcode itself. Zero barriers. **(3) `B_SCR_OP_JUMPIFABILITYPRESENT`** (new
  `battleScriptJumpifabilitypresentOpcode.ts`) — the any-battler-on-field
  ability scan (`ABILITYEFFECT_CHECK_ON_FIELD`), exported as
  `abilityPresentOnField` and reused by row 1's own `WEATHER_HAS_EFFECT`.
  Both concrete call sites (Cloud Nine, Air Lock) are fixed facts of the
  compiled program, so the ability-operand domain is validated **eagerly at
  registration** (mirroring `Cmd_clearstatusfromeffect`'s own exact-shape
  check) rather than deferred to an unreachable runtime barrier — no ratchet
  growth. **Verified and widened the scout-flagged gap**: `docs/semi-invulnerable-registration-scout.md`'s
  named `gBattleWeather` `JUMPIFHALFWORD` gap on Solar Beam's own
  sun-skips-charge check was real and is now closed (`gBattleWeather` ->
  `rules.weather`, `B_WEATHER_SUN` added to the halfword value universe) —
  the existing barrier test for this pointer was converted to a
  no-longer-halts pass-through test, same pattern as the prior `gChosenMove`
  widening.
- **Tests:** full committed-script Tier-1 walks to genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halts for every flipped effect. Row 1: Morning
  Sun under clear weather (heal=maxHP/2, 0 RNG), Synthesis under sun
  (heal=floor(20*maxHP/30), 0 RNG), Moonlight under rain (heal=maxHP/4, 0
  RNG), plus the shared full-HP fail tail and a Cloud-Nine-nullifies-sun
  case. Row 2: Fake Out first-turn success (flinch composes through the real
  `seteffectwithchance` certain-branch — **3 RNG draws, not 4**: `MOVE_EFFECT_CERTAIN`
  takes `Cmd_seteffectwithchance`'s certain branch, which applies the effect
  directly with no percent-chance roll at all, unlike the non-certain tail
  every other hit-chain walk in this engine pins at 4) and the not-first-turn
  fail tail (0 RNG). Row 3: Solar Beam's full two-turn cycle (charge turn 0
  RNG, attack turn 4 RNG — same shape as Razor Wind/Dive), the sun-skip
  single-turn walk (4 RNG, no separate charge turn at all), and a
  Cloud-Nine-under-sun case proving the ability check runs before the
  weather check. All RNG roll counts pinned directly against the real
  handler composition, not assumed.
- **Notes:** no PAPERCUT. One real correction found and fixed while writing
  tests, not assumed from the brief: Fake Out's guaranteed flinch draws 3
  RNG rolls, not 4 — `MOVE_EFFECT_CERTAIN` bypasses `Cmd_seteffectwithchance`'s
  percent-chance roll entirely (source's own `if (certain) ... else { Random()
  ... }` structure), distinct from the semi-invulnerable trio's own
  moveEffectByte-0 case (not CERTAIN) which does still draw that roll
  unconditionally. Five commits: one per opcode/row plus census regen. Next
  ranked census rows (out of this step's scope): `EFFECT_CURSE` pair,
  `EFFECT_FLAIL`, `EFFECT_RETURN`+`EFFECT_FRUSTRATION`.

---
## 529 — [BOUNDED WORKER 2026-07-27 ~19:45] Semi-invulnerable trio registered end to end; +4 effects/+7 moves/+35 weighted (matches scout exactly)

- **State:** tree green at **276 files / 3675 tests** (275/3639 → +1 file /
  +36 tests: new `battleScriptSemiInvulnerableOpcode.test.ts` 20 tests,
  the remainder from extensions to `battleScriptJumpifwordOpcode.test.ts`,
  `battleScriptIngrainLeechSeedWrapOpcode.test.ts`, and
  `battleScriptHitChainOpcode.test.ts` — `battleScriptRulesContext.test.ts`
  gained no new tests, just an updated handler-id pin), `npm run build`
  clean. Census regenerated: **121/214 effects, 244/355
  moves, 197/276 Factory-L50 unweighted, 2501/2957 weighted (84.6%)** — up
  from 117/214/237/191/2466. **Actual flip matches the assigned brief's
  predicted +4/+7/+35 exactly**, and matches
  `docs/semi-invulnerable-registration-scout.md`'s own corrected prediction
  (not the ranked table's original 1-effect/4-move/32-weighted claim). 42/42
  self-checks pass (4 new `requireExecutable` pins:
  `EFFECT_SEMI_INVULNERABLE`/`EFFECT_RAZOR_WIND`/`EFFECT_SKY_ATTACK`/
  `EFFECT_SKULL_BASH`, 38→42).
- **Did:** followed the scout's 8-rung order exactly. **4 widenings on
  already-registered opcodes** (rungs 1-4, each independently committed):
  `JUMPIFWORD_VALUES`+`HITMARKER_NO_ATTACKSTRING`; a new
  `applyChargingMoveEffect` (cloned from `applyThrashMoveEffect`'s shape)
  wired into `applySetMoveEffect`'s `MOVE_EFFECT_CHARGING` case +
  `SET_MOVE_EFFECT_SUPPORTED_BYTES` + the census's own `MOVE_EFFECT_ID_BY_NAME`
  token; `COPYARRAY`'s `(cMULTISTRING_CHOOSER, sTWOTURN_STRINGID, 1)` tuple;
  `PRINTFROMTABLE_TABLES`+`gFirstTurnOfTwoStringIds` (the 8-entry
  `src/battle_message.c:1025-1035` table). **3 new opcodes** (rungs 6-7, new
  `battleScriptSemiInvulnerableOpcode.ts`): `B_SCR_OP_CLEARSTATUSFROMEFFECT`
  (a minimal `{MOVE_EFFECT_CHARGING: STATUS2_MULTIPLETURNS}` lookup,
  genuinely source-complete for this opcode's entire 5-call-site domain —
  not scope-limited — one named `(b)` barrier mirroring
  `battleScriptRemoveitemOpcode.ts`'s identical selector-unavailable shape)
  and `B_SCR_OP_SETSEMIINVULNERABLEBIT`/`CLEARSEMIINVULNERABLEBIT` (zero
  barriers, a `gCurrentMove`-keyed `status3` bit write structurally
  identical to the already-registered `setminimize`). Exported
  `requireBattlerRole` from `battleScriptHitChainOpcode.ts` for reuse.
- **Tests:** rung-by-rung unit coverage plus rung 8's full committed-script
  two-turn walks (mirroring `battleScriptExplosionOpcode.test.ts`'s
  step/ackAllPending/runToTerminal shape) to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt: **MOVE_DIVE** (100 accuracy, no turn-2
  accuracy-roll confound) — charge turn sets `STATUS2_MULTIPLETURNS`+
  `chargingTurn`+`STATUS3_UNDERWATER` (0 RNG), an opponent's Tackle misses
  the semi-invulnerable attacker on the charge-gap turn via the
  already-registered `accuracycheck ACC_CURR_MOVE` consumer (0 RNG, dodge
  short-circuits before the roll — proves the write/read composition
  end-to-end), attack turn clears both bits and lands on the target (4 RNG
  draws). **MOVE_RAZOR_WIND** (shared-plumbing collateral proof, no
  semi-invulnerable-exclusive opcodes needed) — same charge/attack shape, 0
  then 4 draws. **Found and fixed one real RNG-ledger slip in the scout's
  own §3 note**: it predicted 3 draws for the attack turn
  (accuracy+crit+damage-variance); the real count is **4** —
  `Cmd_seteffectwithchance`'s tail draws `Random()` unconditionally
  (`docs/hit-chain-ground-truth.md`'s roll 4) even at `moveEffectByte=0`,
  confirmed directly against `createSeteffectwithchanceOpcodeHandler`'s own
  source and doc comment, not assumed.
- **Notes:** no PAPERCUT. Zero further hidden barriers found beyond the
  scout's four widenings (unusual for this session's own pattern — the
  scout's citations all re-verified clean). One incidental discovery, not
  acted on: `Cmd_clearstatusfromeffect` is also called twice by
  `BattleScript_BideAttack`/`BattleScript_BideNoEnergyToAttack` (Bide reuses
  `MOVE_EFFECT_CHARGING` for its own unrelated energy-storing mechanic) —
  `EFFECT_BIDE` stays blocked on its own separate opcodes regardless; noted
  because it means this opcode has 5 concrete call sites total (not the "two
  values" the scout's own table emphasized — value-domain size and
  call-site count are different things), confirmed directly against the
  compiled program before writing the eager-validation count rather than
  trusting the scout's count. Eight commits, one per green rung plus census
  regen, per the step brief's explicit ask. `EFFECT_SOLAR_BEAM`
  (needs its own `JUMPIFABILITYPRESENT` opcode + a `gBattleWeather` memHword
  widening) and `EFFECT_RAGE` (separate `MOVE_EFFECT_RAGE` dispatch gap,
  zero weighted impact) are the scout's own named remainder, out of this
  step's scope. `EFFECT_FLAIL`/`EFFECT_RETURN`+`EFFECT_FRUSTRATION`/
  `EFFECT_CURSE` remain the next ranked census rows per entry 528.
