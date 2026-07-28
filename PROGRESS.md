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

---
## 526 — [BOUNDED WORKER 2026-07-27 ~18:00] EFFECT_TRIPLE_KICK + EFFECT_ROAR registered end to end; roar-multihit cluster (5 effects/18 moves/63 weighted) complete

- **State:** tree green at **273 files / 3623 tests** (272/3609 → +1 file /
  +14 tests: new `battleScriptForceSwitchOpcode.test.ts` 11 tests, +3 in
  `battleScriptMultiHitFamily.test.ts` for Triple Kick), `npm run build`
  clean. Census regenerated: **116/214 effects, 235/355 moves, 189/276
  Factory-L50 unweighted, 2441/2957 weighted (82.5%)** — up from
  115/214/187/276/2401/2957 (81.2%). **Actual flip matches the scout's
  predicted end-state exactly** (5 effects/18 moves/63 weighted across both
  sessions; this session's own share: EFFECT_ROAR 2 moves/40 weighted,
  EFFECT_TRIPLE_KICK 1 move/1 weighted). 37/37 self-checks pass (EFFECT_ROAR's
  exact-missing-opcode pin retired to `requireExecutable`; EFFECT_TRIPLE_KICK
  gained a new `requireExecutable` pin; net +1 check).
- **Did:** followed `docs/roar-multihit-registration-scout.md` §4's rung
  order (rungs 7-14, entry 525's named remainder).
  **Triple Kick (rungs 7-9):** `damagecalcOpcodeHandler` now reads
  `rules.tripleKickPower` for the real 10/20/30 dynamic-base-power ramp
  (`battleScriptHitChainOpcode.ts`); `ADDBYTE`'s `sTRIPLE_KICK_POWER` delta
  literal `"10"` and `JUMPIFBYTE`'s standalone `MOVE_RESULT_DOESNT_AFFECT_FOE`
  (`1<<3`) added as resolvable literals (`battleScriptSetByte.ts`);
  `JUMPIFBYTE` now reads `sMULTIHIT_STRING + 4` off the `multiHitStringCounter`
  field entry 525 already wired a writer for; `INITMULTIHITSTRING` now really
  zeroes that counter (was a no-op advance until this session gave it both a
  writer and a reader).
  **Roar (rungs 10-14, new file `battleScriptForceSwitchOpcode.ts`):**
  registered `B_SCR_OP_FORCERANDOMSWITCH` (`TryDoForceSwitchOut`'s exact
  PARTY_SIZE=6 rejection sampling, the level-gated `Random()&0xFF` roll only
  when the target out-levels the attacker, `validMons<=1` fail gate, writes
  `monToSwitchIntoId` directly via the same plain-reducer pattern
  `openpartyscreen`'s AI branch uses — Roar's outgoing battler is healthy and
  gets no say, so it does *not* route through the fainted-replacement
  decision boundary — then jumps to the hardcoded, bytecode-invisible
  `BattleScript_SuccessForceOut` label), `B_SCR_OP_SWITCHOUTABILITIES`,
  `B_SCR_OP_RETURNTOBALL` (both source-complete, zero barriers, compose with
  the already-registered switch-in tail unmodified), and
  `B_SCR_OP_FINISHACTION` as a permanent (b) barrier — per
  `docs/script-terminal-gate3-evidence.md`'s own explicit recommendation to
  defer real implementation (needs a typed action-scheduler receipt this
  engine doesn't have), and doubly unreachable for Factory anyway (the
  trainer-battle fork is always taken; even the counterfactual non-trainer
  arm barriers first on the pre-existing `VARIOUS_SET_TELEPORT_OUTCOME` guard).
- **Three hidden barriers found live this session (budgeted for by the
  brief), beyond entry 525's one dossier slip:** (1) `Cmd_copyarray`'s
  `gDynamicBasePower<-sTRIPLE_KICK_POWER, 2` tuple — the scout's §1d table
  wrongly marked this "registered"; it was never in
  `battleScriptIngrainLeechSeedWrapOpcode.ts`'s accepted tuple set. Widened
  as a pure-advance no-op (`gDynamicBasePower` has no materialized field —
  `damagecalc` reads `tripleKickPower` directly). (2) `JUMPIFBYTE`'s
  standalone `MOVE_RESULT_DOESNT_AFFECT_FOE` value, gating
  `BattleScript_TripleKickPrintStrings`' own "Hit X times!" print — not in
  the scout's tables at all. (3) **A second real dossier slip**:
  `BATTLE_TYPE_ARENA` was defined locally in `battleScriptJumpifwordOpcode.ts`
  but never actually added to `JUMPIFWORD_VALUES` (only used as an internal
  building block for the `BATTLE_TYPE_FRONTIER` OR-mask) — the scout's §1a
  table wrongly claimed it was "already in JUMPIFWORD_VALUES". Fixed: Roar's
  own `jumpifbattletype BATTLE_TYPE_ARENA, BattleScript_ButItFailed` now
  resolves (always false for Factory).
- **Tests:** full committed-script walks to a genuine `{kind:"terminal",
  opcodeName:"B_SCR_OP_END"}` halt for both effects. Triple Kick: zero-hits
  miss, partial 2-of-3-hits-then-miss, and all-3-hits-land (via
  `decrementmultihit`'s own fallthrough exit), each with pinned RNG-roll
  counts covering per-hit accuracy semantics. Roar: unconditional-success
  (equal level), roll-gated success/fail (fail hand-verified: roll=14 <=
  threshold=25), a real accuracy miss (max target evasion), `validMons<=1`
  fail, Suction Cups and STATUS3_ROOTED pre-checks (zero RNG draws, both
  gate before either accuracycheck), and the non-trainer
  `jumpifbattletype` fork arm (barriers on the pre-existing
  `VARIOUS_SET_TELEPORT_OUTCOME` guard, never reaching FINISHACTION) — plus
  isolated dispatch tests for `SWITCHOUTABILITIES`' Natural Cure branch and
  `FINISHACTION`'s own barrier. Updated 8 stale test fixtures'
  `multiHitStringCounter` field (tsc -b `noUnusedLocals`/shape checks) and
  2 now-stale barrier-pin tests (Triple Kick's own `ADDBYTE`/
  `INITMULTIHITSTRING` barriers, both now real pass-through behavior).
  Handler-count pin 124→128 (4 new opcode IDs).
- **Notes:** no PAPERCUT. Four commits: Triple Kick + tests, Roar + tests,
  census regen. `EFFECT_RAGE`/`EFFECT_SLEEP_TALK`/semi-invulnerable/
  `EFFECT_EXPLOSION` (out of scope this step) remain the next ranked rows.

