# S10 Gate 3: ATTACKCANCELER / ACCURACYCHECK evidence

Audit date: 2026-07-24. This is a read-only source decomposition for the first
rules spine. It does not claim Gate 3 completion and proposes no per-move,
tick, or presentation workaround.

## Verdict

**ATTACKCANCELER (opcode 0) is not an honest atomic production opcode today.**
Its one-byte instruction begins an action-admission pipeline whose 14-phase
helper mutates persistent status/volatile state, invokes action selection,
obedience, and ability systems, schedules controller writes, changes targets
and scripts, and occasionally consumes RNG. A small port may expose a typed
admission hook; it must not advertise complete opcode-0 semantics.

**ACCURACYCHECK (opcode 1) has an honest bounded pure core**, comprising
seven-byte operand decoding, source ratio arithmetic, one final roll, and PC
selection. It is **not complete standalone production behavior today**:
preflight delegates to Protect and JumpIfMoveFailed, which need failure-state,
absorption-ability, event, and script-stack ownership. Implement its pure
preflight/arithmetic result first, then attach the common failure-transition
hook. Neither command should be enabled by a move-name switch.

## Catalog reach and instruction shape

The generated program records opcode 0 at **130** concrete source starts and
opcode 1 at **65** emitted starts. The pinned assembly has **130**
attackcanceler and **66** accuracycheck macro lines; the latter difference is
an extractor inventory discrepancy to preserve and resolve before using the
generated count as an exact source count. The assembly count is source truth.

Opcode 0 occupies one byte and has no operands. Opcode 1 occupies seven bytes:
byte 0 opcode, bytes 1--4 a little-endian failure-script pointer, and bytes
5--6 a little-endian move selector. The selector is ACC_CURR_MOVE/0 (replace
with gCurrentMove), a concrete move id, NO_ACC_CALC/0xfffe, or
NO_ACC_CALC_CHECK_LOCK_ON/0xffff. Its source macro is
accuracycheck failptr, move. Opcode ids 0/1 are the first two enum entries.

The following reproducible **conservative lexical reachability** walk starts
at every level50-executable manifest move's program label and follows program
operands which name another program label. It follows all branches/calls, so
it describes possible source-script reach, not an assertion that every use
executes the command.

| Possible reach | Level-50 executable moves | Script effect families |
| --- | ---: | ---: |
| Opcode 0 only | 171 | 98 |
| Opcodes 0 and 1 | 99 | 63 |
| Neither | 6 | 5 |
| Opcode 0 total | **270 / 276** | **161 / 166** |
| Opcode 1 total | **99 / 276** | **63 / 166** |

The six executable moves with no lexical route to either are DOUBLE TEAM,
PROTECT, DETECT, RETURN, SWEET SCENT, and SYNTHESIS. Opcode-0 work alone
therefore cannot cover all action starts, and opcode-1 work is a minority of
the Level-50 script corpus. The wider roster denominator remains 300 moves /
176 move-table effect values.

## Exact opcode-0 behavior

Source: battle_script_commands.c:915-1012; helper:
battle_util.c:2002-2391. The normal success path advances PC from pc to pc+1.
Every other result below deliberately owns its stated PC/script-stack result.

1. If gBattleOutcome is nonzero, set gCurrentActionFuncId to B_ACTION_FINISHED
   and return; PC does not advance.
2. If attacker HP is zero and HITMARKER_NO_ATTACKSTRING is clear, set
   HITMARKER_UNABLE_TO_USE_MOVE, PC = BattleScript_MoveEnd, and return.
3. Call AtkCanceler_UnableToUseMove. A nonzero return already chose a
   script/stack/controller result; return without advancing PC.
4. Call AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, target, 0, 0, 0).
   Current source behavior is Soundproof/sound-move block
   (battle_util.c:2659-2672): it may set HITMARKER_NO_PPDEDUCT for a
   multi-turn move and PC = BattleScript_SoundproofProtected; return.
5. If selected-slot PP is zero, current move is not Struggle, neither
   HITMARKER_ALLOW_NO_PP nor HITMARKER_NO_ATTACKSTRING is set, and attacker is
   not STATUS2_MULTIPLETURNS, set PC = BattleScript_NoPPForMove, OR
   MOVE_RESULT_MISSED, and return.
6. Clear HITMARKER_ALLOW_NO_PP. If not HITMARKER_OBEYS and not multi-turn,
   call IsMonDisobedient: OBEDIENT continues; OTHER sets OBEYS and returns
   (helper owns its alternate action); IGNORED ORs MOVE_RESULT_MISSED and
   returns. Normal continuation sets HITMARKER_OBEYS.
7. Magic Coat: with target bounceMove and FLAG_MAGIC_COAT_AFFECTED, call
   PressurePPLose(attacker, target, MOVE_MAGIC_COAT), clear bounceMove, push
   old PC, set PC = BattleScript_MagicCoatBounce, return.
8. Snatch: scan gBattlerByTurnOrder. At first stealMove whose move has
   FLAG_SNATCH_AFFECTED, call PressurePPLose(attacker, snatcher, MOVE_SNATCH),
   clear stealMove, set scripting battler, push PC, set PC =
   BattleScript_SnatchedMove, return.
9. Lightning Rod redirect clears target special-status redirect, records
   ability, pushes PC, and sets PC = BattleScript_TookAttack. No increment.
10. Otherwise if DEFENDER_IS_PROTECTED (target protected bit *and* current
    move FLAG_PROTECT_AFFECTED), except non-Ghost Curse and a first turn of a
    two-turn move, cancel attacker multi-turn state, OR MOVE_RESULT_MISSED,
    clear target last-landed move/type, set MISS_TYPE = B_MSG_PROTECTED, and
    advance PC one byte. The ordinary no-protect case also advances one byte.

Normal PP deduction is not opcode 0: opcode 3 ppreduce
(battle_script_commands.c:1203-1240) starts at one PP, adds Pressure by target
class, clamps at zero, marks notFirstStrike, emits permanent-mon PP data,
clears HITMARKER_NO_PPDEDUCT, then advances PC. Opcode 0 owns the no-PP
failure gate and exceptional Magic-Coat/Snatch Pressure deductions.

### AtkCanceler_UnableToUseMove state machine

The helper loops from gBattleStruct->atkCancelerTracker until CANCELER_END or a
nonzero effect. Each visited case increments tracker. effect == 1 aborts an
action; effect == 2 additionally emits REQUEST_STATUS_BATTLE for attacker and
marks its controller active. This is not a boolean predicate.

| Tracker family | State / mutation | RNG | Script / result |
| --- | --- | --- | --- |
| flags | clear attacker Destiny Bond and Grudge | none | continue |
| sleep / uproar | sleep counter; Uproar scan; Early Bird removes 2 else 1; clear Nightmare on wake | none | asleep blocks except Snore/Sleep Talk; wake pushes/selects wake script, effect 2 |
| freeze / thaw-hit | freeze bit; EFFECT_THAW_HIT; clear Freeze | Random() % 5 unless thaw-hit | frozen or thaw script; effect 2 |
| Truant | ability + disable truantCounter; cancel multi-turn | none | loafing script, unable marker, missed, effect 1 |
| recharge | STATUS2_RECHARGE + disable rechargeTimer; cancel multi-turn | none | clear both, must-recharge script, unable marker, effect 1 |
| flinch | STATUS2_FLINCHED + protect flinchImmobility; cancel multi-turn | none | clear flinch, flinched script, unable marker, effect 1 |
| Disable / Taunt / Imprison | disable move/timer, current power, enemy imprison lookup; protect used flags | none | cannot-use script, unable marker, effect 1 |
| confusion | confusion turn bits decrement; self-target POUND base damage; confusionSelfDmg | Random() & 1 only if turns remain | confused/no-more script; self-hit unable, effect 1 |
| paralysis | status1 paralysis + prlzImmobility | Random() % 4 if paralyzed | paralysis script + unable marker, effect 1 on zero |
| attraction | infatuation source-battler bits + loveImmobility; cancel multi-turn | Random() & 1 | push cursor or cannot-attack continuation, then love script, effect 1 |
| Bide | Bide counter, stored damage/target, current move/target | none | storing / attack / no-energy script, effect 1 |

CancelMultiTurnMoves clears multi-turn, lock-confuse, Uproar, Bide,
semi-invulnerable status3 bits, rollout timer, and Fury Cutter counter
(battle_util.c:877-888). It is a shared hook family, not local cleanup.

Choice Band, no-PP, Disable, Taunt, Imprison, Torment, and Encore also have an
earlier selection hook: TrySetCantSelectMoveBattleScript
(battle_util.c:976-1080) and CheckMoveLimitations (:1082-1123). Choice is not
an opcode-0 branch, but its selected-slot/choicedMove history is required to
supply a valid opcode-0 action. The duplicate Disable/Taunt/Imprison
attack-time check is real source behavior, not UI-only validation.

## Exact opcode-1 behavior

Source: battle_script_commands.c:1014-1201; helpers :1014-1097. Let fail be
the pointer at pc+1, operand the u16 at pc+5, and next = pc+7.

JumpIfMoveFailed(adder, move) is the common terminal operation. If
gMoveResultFlags has MOVE_RESULT_NO_EFFECT, it clears target last-landed
move/type and sets PC = pointer(pc+1). Otherwise it runs
TrySetDestinyBondToHappen, then lets
AbilityBattleEffects(ABILITYEFFECT_ABSORBING, target, 0, 0, move) replace PC
(Volt Absorb, Water Absorb, Flash Fire), before finally setting PC = pc+adder.
Opcode 1 always uses adder 7.

1. For NO_ACC_CALC or NO_ACC_CALC_CHECK_LOCK_ON: matching target
   STATUS3_ALWAYS_HITS plus battlerWithSureHit == attacker advances to next
   only for lock-on-check. Any air/underground/underwater target jumps direct
   to fail without ORing missed. Otherwise test Protect via
   JumpIfMoveAffectedByProtect(0); if not protected, PC = next.
2. For an ordinary move or ACC_CURR_MOVE, resolve the latter to current move,
   derive type, then test Protect. Protected ORs MOVE_RESULT_MISSED, runs
   JumpIfMoveFailed(7, move), assigns B_MSG_PROTECTED, and returns.
3. AccuracyCalcHelper short-circuits matching lock-on without roll;
   forbidden semi-invulnerable positions OR missed and fail; corresponding
   ignore markers clear after their test. Rain Thunder, EFFECT_ALWAYS_HIT, and
   EFFECT_VITAL_THROW fail/continue without a roll. Cloud Nine/Air Lock disable
   weather effects.
4. Otherwise use attacker accuracy stage alone if target Foresight, else
   attackerAcc + 6 - targetEvasion, clamp 0..12, multiply move accuracy by
   source ratios [33/100,36/100,43/100,50/100,60/100,75/100,1,133/100,
   166/100,2,233/100,133/50,3], truncating after division. Sun changes
   Thunder to 50; Compound Eyes 130/100; target Sand Veil in sand 80/100;
   physical Hustle 80/100; target Evasion-up held effect (100-param)/100.
   Enigma Berry uses its per-battler effect/param.
5. Consume exactly one Random(), compute (roll % 100)+1, and miss if greater
   than computed accuracy. A miss ORs MOVE_RESULT_MISSED, sets MISS_TYPE to
   avoided for listed double targets else missed, calls CheckWonderGuardAndLevitate,
   then calls JumpIfMoveFailed(7, move). A hit also calls that helper.

Protect and absorption are opcode-1 dependencies even though Protect normally
short-circuits before roll. Semi-invulnerability, lock-on ownership, Foresight,
always-hit effects, and weather are rules state, not renderer facts.

The 66 assembly call sites have these exact failure-pointer / operand pairs;
the generated program presently sees 65 of them. This makes the PC result a
typed selector requirement, rather than a generic boolean "miss":

| source call sites | failure pointer | move operand |
| ---: | --- | --- |
| 26 | BattleScript_PrintMoveMissed | ACC_CURR_MOVE |
| 14 | BattleScript_ButItFailed | ACC_CURR_MOVE |
| 8 | BattleScript_ButItFailed | NO_ACC_CALC_CHECK_LOCK_ON |
| 4 | BattleScript_MoveMissedPause | ACC_CURR_MOVE |
| 1 each | BattleScript_ExplosionMissed, BattleScript_MoveMissedDoDamage, BattleScript_RageMiss, BattleScript_DoLeechSeed, BattleScript_TripleKickNoMoreHits, BattleScript_RolloutHit, BattleScript_FuryCutterHit, BattleScript_HitAllWithUndergroundBonusMissed, BattleScript_SemiInvulnerableMiss, BattleScript_TeeterDanceMissed, BattleScript_MoveMissed | ACC_CURR_MOVE |
| 1 | BattleScript_ButItFailed | NO_ACC_CALC |
| 1 each | BattleScript_FutureAttackMiss | MOVE_FUTURE_SIGHT; MOVE_DOOM_DESIRE |

## Reusable hook families and current seam inventory

| Family | Existing reusable material | Missing typed rules ownership |
| --- | --- | --- |
| script PC/stack/controller ack | immutable IR/machine/control handlers + scheduler ports | failure label resolution, stack mutation receipt, action-finished state |
| catalog move data | generated move id/effect/power/accuracy/target/flags + manifest labels | current selected slot/current move and source-shaped action record |
| RNG | GbaRng.next matches Random | named ordered rules draws + receipts through cancel/accuracy |
| damage / turn order | partial damageCalc and turnOrder helpers | self-confusion call context; full type/ability/item/weather ownership |
| PP / Pressure / choice | hold-effect catalog + source facts | slot PP/max PP, permanent controller update, Pressure enumeration, choiced history and selection limitations |
| statuses / volatile state | rules context has status1/2/3/substitute only | HP, moves, stages, abilities/items/types, disable/protect/special structs, expiry/reset, four roles/sides |
| sleep/freeze/paralysis/confusion/attract | status-animation receipt port | tracker, timers, Uproar, Early Bird, scripts/messages, status controller write, RNG/self-damage |
| recharge/Truant/flinch | source constants | Truant/recharge/rollout/Fury Cutter + protect flags; multi-turn cancel hook |
| Disable/Taunt/Imprison/Choice | selector/operand machinery | disable/encore/taunt, enemy move lookup, choice history, selection result/failure scripts |
| ability immunities | generated ability/item data only | dispatcher for Soundproof, redirect, absorbers, Cloud Nine/Air Lock, Wonder Guard/Levitate |
| Protect/semi-invulnerable | semi-invulnerable mask already exists | protect flags, two-turn predicate, hit history, ignore markers/failure hook |
| accuracy/evasion/weather/always-hit | move effect/type data | accuracy ratios, stages, Foresight/lock-on owner, weather gate, Evasion item |
| failure selectors/PC writes | program labels + source command ports | typed missed/failed/protected/immune result, MISS_TYPE, flags, history writes |

BattleScriptRulesContext is intentionally too narrow: four status/substitute
records, attacker/effect roles, hitMarker, and multiHitCounter only
(src/engine/battleScriptRulesContext.ts:28-119). It is enough for landed
status-animation opcodes 100--102 and should be extended rather than bypassed;
it cannot answer either command here. damageCalc and turnOrder are reusable
math, while rng is the correct primitive, not complete rules ownership.

## Recommended atomic sequence

Each slice extends one rules boundary, returns typed mutation/event/PC
decisions, pins pure behavior in Tier 1, then uses fresh Scene-OFF mechanicLab
evidence. Every proposal uses ordinary controller inputs, stock catalog moves,
and ppUps [0,0,0,0] for both active battlers: no transient injection.

1. **Action admission + selection context.** Add selected slot/current move, PP,
   HP, move-result/hit marker, roles/sides, and typed failure/PC result. Land
   only outcome-finished, fainted-attacker, and no-PP admission. Lab:
   attack-spine-no-pp-off repeatedly uses stock Toxic against an immune Steel
   target until natural 10 PP reaches zero, then selects it once more.
2. **Cancellation status block.** Add tracker, primary/volatile bits,
   disable/protect records, multi-turn cancellation receipt, named RNG draws.
   Land sleep, freeze/thaw, paralysis, confusion, and attraction. Labs:
   Sleep Powder -> attempted Tackle; seed-swept real Ice Beam freeze ->
   attempted move; Thunder Wave -> repeated move until paralysis; Confuse Ray
   and Attract -> attempted move. Capture real counters and RNG deltas.
3. **Cancellation control block.** Add Truant/recharge/flinch plus Disable,
   Taunt, Imprison, and selected Choice Band constraint. Labs: Hyper Beam then
   recharge; Fake Out flinch; Slaking/Truant alternation; actual
   Disable/Taunt/Imprison before target selects forbidden move; Choice Band
   move A then attempted stock move B. Assert selection and attack-time paths
   separately.
4. **Intercept/Protect family.** Add ability dispatcher result, Magic
   Coat/Snatch receipts, target history, and Protect/two-turn predicate. Labs:
   Protect then attack; Fly or Dig then opposing normal move; Soundproof vs
   sound move; Magic Coat/Snatch vs flagged moves.
5. **Accuracy preflight/PC hook.** Implement sentinels, lock-on, Foresight,
   semi-invulnerable/ignore-marker handling, then JumpIfMoveFailed destination.
   Labs: Lock-On then inaccurate move; Foresight vs evasive target; Fly/Dig vs
   normal and allowed exception; Aerial Ace always-hit.
6. **Accuracy arithmetic and roll.** Add stages, source ratios, weather gate,
   ability/item modifiers, and exactly one named final roll. Labs: Sand-Attack
   then Tackle; Rain Dance -> Thunder; Sunny Day -> Thunder; Sandstorm ->
   Sand Veil target; Compound Eyes/Hustle and Evasion-up held item. Record
   seed and compare ROM read-only roll/result/PP captures.
7. **Common failure and absorption completion.** Add MOVE_RESULT flags,
   miss selector, target history clear, Destiny Bond hook, Volt/Water Absorb
   and Flash Fire PC replacement, then join to DamageCalc/TypeCalc. Labs:
   Protect, Water Absorb, Volt Absorb, and Flash Fire branches with PP checks.

Slices 1--3 are the honest decomposition of opcode 0; slices 4--7 finish its
intercepts and opcode 1 common boundary. A claim of either full opcode before
these context families exist would conceal source state behind a callback and
is not valid Gate-3 progress.

## Provenance and reproduction

Pinned SHA-256:

| File | SHA-256 |
| --- | --- |
| src/battle_script_commands.c | e0847cd2aa83ee5e18134c32baad348b7c763095cf59efa33da67c4a4e90120c |
| src/battle_util.c | 2ba9ee4efe913effa119c8342281745f481910ca1b20cd76b470673062a45fd5 |
| data/battle_scripts_1.s | 4ac3e610b68c11ef0f4e4c0fc62ddba7fda5a8400e43705428868978ec7551a6 |
| include/battle.h | 8ef0355f2345592094c82cfde6641644a6b7157012104736416f8c05f34f0685 |
| include/constants/battle.h | bba2f9d9b3d98fa01b5f0a8f7dede9f2f0be5617c735242b741a7e0c8e4a5d1e |
| include/constants/battle_script_commands.h | 842cce6dd704b09b24a49abdca67ee7a8062a2e3a465e1b764fc63c0d230580f |
| generated program | 77dd161fa630f6245beeee29efbaa6068e5f258a7eb8eb517bfc73e5479255f6 |
| Level-50 manifest | 67e788ae96482eb808d940c2131dbdc17e84360bb081b16f11162baf339d3385 |

Useful anchors: battle_script_commands.c:57,588-602,915-1201;
battle_util.c:740-765,877-902,976-1142,2002-2391,2659-2710;
include/battle.h:70-145; include/constants/battle.h:115-228; and existing
engine seams battleScriptRulesContext.ts:28-248, rng.ts:1-57,
damageCalc.ts:1-260, turnOrder.ts:1-128.

~~~sh
bin/oracle info
rg -n '^\s*attackcanceler\s*(//.*)?$|^\s*accuracycheck\b' reference/pokeemerald/data/battle_scripts_1.s
sed -n '915,1201p' reference/pokeemerald/src/battle_script_commands.c
sed -n '2002,2391p' reference/pokeemerald/src/battle_util.c
sed -n '976,1142p' reference/pokeemerald/src/battle_util.c
shasum -a 256 reference/pokeemerald/src/battle_script_commands.c reference/pokeemerald/src/battle_util.c reference/pokeemerald/data/battle_scripts_1.s src/data/gen/battle-script-program.json src/data/gen/level50-move-parameterization.json
~~~

~~~sh
node - <<'NODE'
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('src/data/gen/battle-script-program.json', 'utf8'));
const m = JSON.parse(fs.readFileSync('src/data/gen/level50-move-parameterization.json', 'utf8'));
const labels = new Map(p.blocks.map(b => [b.label, b]));
const ops = b => b.statements.flatMap(s => s.emittedStatements ?? []).flatMap(e => (e.opcodeReferences ?? []).map(o => o.opcodeId));
const refs = b => b.statements.flatMap(s => s.actualOperands ?? []).filter(x => labels.has(x));
function reachable(label) { const q=[label], seen=new Set, out=new Set; while(q.length) { const x=q.pop(); if(seen.has(x)||!labels.has(x)) continue; seen.add(x); const b=labels.get(x); ops(b).forEach(o=>out.add(o)); refs(b).forEach(x=>q.push(x)); } return out; }
for (const id of [0, 1]) { const rows=m.moves.filter(x => x.battleScript.executionInventory === 'level50-executable' && reachable(x.battleScript.programLabel).has(id)); console.log({id, moves:rows.length, effects:new Set(rows.map(x=>x.battleScript.effectId)).size}); }
NODE
~~~
