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

---
## 528 — [BOUNDED WORKER 2026-07-27 ~19:15] EFFECT_EXPLOSION registered end to end (EXPLOSION census set)

- **State:** tree green at **275 files / 3639 tests** (274/3632 → +1 file /
  +7 tests: new `battleScriptExplosionOpcode.test.ts` 5 tests, +2 in
  `damageCalc.test.ts`), `npm run build` clean. Census regenerated: **117/214
  effects, 237/355 moves, 191/276 Factory-L50 unweighted, 2466/2957 weighted
  (83.4%)** — up from 116/214/235/189/2441. **Actual flip matches the
  brief's predicted end-state exactly**: +1 effect / +2 moves / +25
  weighted. 38/38 self-checks pass (new `requireExecutable("EFFECT_EXPLOSION")`
  pin added, 37→38).
- **Did:** new `battleScriptExplosionOpcode.ts` registers
  `B_SCR_OP_TRYEXPLOSION` (`Cmd_tryexplosion`, `battle_script_commands.c
  :6538-6575`) and `B_SCR_OP_SETATKHPTOZERO` (`:6577-6588`), both
  source-complete with **zero barriers**. `Cmd_tryexplosion`'s Damp scan
  covers **every active battler** (`0..battlersCount`, no absent-flag
  filter — re-verified from source per the brief, not just attacker/target)
  and, on success, re-points `gBattlerTarget` via the exact same
  first-valid-target loop `Cmd_selectfirstvalidtarget` already implements
  (`resolveFirstValidTarget`, exported from `battleScriptTargetIterationOpcode.ts`
  and reused rather than duplicated). `gBattleMoveDamage = gBattleMons[
  gActiveBattler].hp` is genuinely dead (the immediately-following
  `BtlController_EmitHealthBarUpdate` call passes the literal
  `INSTANT_HP_BAR_DROP` sentinel `0x7FFF`, not that value, and `damagecalc`
  overwrites `gBattleMoveDamage` a few opcodes later before anything else
  reads it) — not modeled, matching this engine's existing precedent for
  provably-unread state. `Cmd_setatkhptozero` mirrors `Cmd_datahpupdate`'s
  negative-damage (HP-gain) branch: `withBattler`/`withBattleScriptPartyMemberHp`
  write-through, `hp-change` event, own controller round trip. Both compose
  with the already-registered `tryfaintmon`/`moveend`/switch-in machinery
  unmodified — no other opcode in `BattleScript_EffectExplosion`
  (`data/battle_scripts_1.s:374-408`) needed new registration.
  **Fixed a real pre-existing gap** (per the brief's explicit ask to check):
  `damageCalc.ts`'s `calculateBaseDamage` never modeled EFFECT_EXPLOSION's
  own Defense-halving (`pokemon.c:3228-3230` — Self-Destruct/Explosion cut
  the defender's raw Defense in half, truncated, before the crit-adjusted-
  stat step). Added a `moveEffect` input field and the halving branch; wired
  from `damagecalcOpcodeHandler`'s `moveRow.effect` read
  (`battleScriptHitChainOpcode.ts`). Pinned directly with a focused
  `damageCalc.test.ts` unit test (50 unhalved vs 99 halved at identical
  inputs) in addition to the full-script walk's own regression guard.
- **Tests:** full committed-script walks to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt: success (attacker's HP forced to 0 via
  `setatkhptozero`, faints through the real `tryfaintmon` ->
  `BattleScript_FaintAttacker` chain — `playfaintcry`/`dofaintanimation`/
  `cleareffectsonfaint` were all already registered — target takes
  halved-defense damage, RNG ledger pinned at exactly 3 draws: critcalc +
  adjustnormaldamage + accuracycheck), Damp-blocked (ability on the target,
  plus a second case with Damp on neither attacker nor target — reachable
  only under a doubles topology since singles' own `gBattlersCount=2`
  correctly excludes slots 2/3, proving the scan loop is genuinely general
  rather than hardcoded to attacker+target), attacker-faints-target-survives,
  and simultaneous KO (both `tryfaintmon BS_TARGET` and `tryfaintmon
  BS_ATTACKER` resolve for real in one walk). No legal single-ability-slot
  Damp Factory set was checked for/needed — the brief's own sanctioned
  fallback (construct the battler state directly) was used since that's
  strictly simpler and the ability-scan logic doesn't care how the ability
  got there. Confirmed `BattleScript_EffectExplosion` never calls
  `checkteamslost` itself (only the separate `BattleScript_HandleFaintedMon`
  does) — noted in the test file rather than fabricating an unreachable
  checkteamslost pin.
- **Hidden barriers found:** **zero** — both opcodes are fully source-complete
  end to end; no new entries needed in `PINNED_BARRIER_COUNTS`. A useful
  side effect surfaced during census regen: `EFFECT_MEMENTO`'s own
  blocked-on-opcodes list shrank from two missing opcodes to one
  (`B_SCR_OP_TRYMEMENTO` alone) now that `SETATKHPTOZERO` — shared plumbing
  between the two effects — is registered; `EFFECT_MEMENTO` itself stays
  blocked (out of scope this step, noted only as a side effect, not claimed
  as progress).
- **Notes:** no PAPERCUT. Three commits: opcode registration + tests,
  census regen (generator self-check pin included in that same commit).
  `EFFECT_SEMI_INVULNERABLE` (scouted, 4 moves/32 weighted, the census's
  new #1 row) is the next ranked set; `EFFECT_FLAIL`/`EFFECT_RETURN`+
  `EFFECT_FRUSTRATION`/`EFFECT_CURSE` follow close behind.

