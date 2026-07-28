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

---
## 527 — [BOUNDED WORKER 2026-07-27 ~18:35] turn11-featherdance ATK-floor text wired from kernel events (§14.3)

- **State:** tree green at **274 files / 3632 tests** (unchanged — no new
  test file; this step wires an already-tested staging-module export into
  production code), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers).
- **Did:** executed `docs/presentation-seam-scout.md` §14.3's plan exactly —
  wired `drawTurn11FeatherDanceWindow`'s ATK-floor branch
  (`battleScene.ts:11451`) to draw a new module-level const pair,
  `TURN11_ATKFLOOR_KICKOFF_LINE1`/`LINE2`, resolved once at module load from
  the already-committed, already-tested
  `turn11FeatherDancePresentationStaging.ts`'s `resolveTurn11AtkFloorLines()`,
  instead of the raw `TURN11_ATKFLOOR_LINE1`/`LINE2` literals. Zero bridge
  edits (§14.2's finding held — the existing turn-6 bridge resolves this
  floored branch unchanged). Kickoff-text branch and ROCK_SLIDE half
  untouched, per plan scoping (`git diff` touches only the import line + one
  const block + one call-site swap). All §14.3/§14.4 citations re-verified
  against `HEAD` before editing — no drift, no design-doc slip this time.
  Appended §14.5 completion note to the scout doc, mirroring §13.5's format.
- **Verified:** `turn11-featherdance.json` 178/178 before AND after (twice
  after, determinism check) — byte-identical to §14.4's pinned baseline. Full
  §14.3 regression sweep (`turn11-menu.json` 56/56, `turn11-rockslide.json`
  163/163, `turn6-featherdance.json` 90/90, `turn6-statfall.json` 127/127,
  `turn2-endeavor.json` 77/77, `turn3-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256, `turn5-rockslide.json` 256/256,
  `turn4-doubleteam.json` 250/250) — every count matches its recorded value,
  zero regressions. `TURN11_ATKFLOOR_LINE1`/`LINE2` stay defined (no literal
  died) — confirmed by grep their only remaining readers are the two
  pre-existing tests, not production code.
- **Notes:** §14.4's own doc text cited `npm test` as 269/3570 (stale
  against this worktree's `HEAD` — entries 524-526's Roar/multi-hit work
  landed 274/3632 in between); noted in the §14.5 completion note so the
  discrepancy doesn't read as this step's own regression. No PAPERCUT. One
  commit (wiring), one commit (docs: §14.5 note + this entry).
- **Next:** turn13-sandattack wiring is banked (§15) for a later step — out
  of this step's scope, not started. EXPLOSION pair (25) / SEMI_INVULNERABLE
  trio (32) remain the next ranked census rows.

