# SetMoveEffect family-B ground-truth and falsification notes

This is a source-and-engine audit only. No oracle trace was run. “Registered”
below means that the current interpreter installs the opcode; it does **not**
mean that every operand value or every stateful continuation is modeled. That
distinction matters here: the census itself says that its static walk treats
registered barriers as executable and is not a semantic-correctness claim
(`docs/executable-frontier-census.md:5,18-22`).

## 1. Scope and headline corrections

`MOVE_EFFECT_*` values 1–59 are defined in
`reference/pokeemerald/include/constants/battle.h:246-307`. The family-B arm is
the `effectByte > PRIMARY_STATUS_MOVE_EFFECT` arm beginning at
`reference/pokeemerald/src/battle_script_commands.c:2522`; its status2 duplicate
guard uses the sparse table at
`reference/pokeemerald/src/battle_script_commands.c:608-625`. Comparing every
case in that source switch with the engine's supported-byte set
(`src/engine/battleScriptHitChainOpcode.ts:475-490`) leaves exactly these 15
unsupported cases—there is no omitted sixteenth case:

| Source case | Effect row(s) | Census counts: moves / Factory distinct (weighted) | Census attribution |
| --- | --- | ---: | --- |
| `MOVE_EFFECT_PAYDAY` | `EFFECT_PAY_DAY` | 1 / 0 (0) | correct but incomplete |
| `MOVE_EFFECT_TRI_ATTACK` | `EFFECT_TRI_ATTACK` | 1 / 1 (8) | correct |
| `MOVE_EFFECT_UPROAR` | `EFFECT_UPROAR` | 1 / 1 (1) | correct but incomplete |
| `MOVE_EFFECT_RECHARGE` | `EFFECT_RECHARGE` | 4 / 1 (4) | correct |
| `MOVE_EFFECT_RAGE` | `EFFECT_RAGE` | 1 / 0 (0) | correct |
| `MOVE_EFFECT_STEAL_ITEM` | `EFFECT_THIEF` | 2 / 1 (1) | correct but incomplete |
| `MOVE_EFFECT_PREVENT_ESCAPE` | `EFFECT_MEAN_LOOK` | 3 / 3 (6) | **incorrectly sole-attributed** |
| `MOVE_EFFECT_NIGHTMARE` | `EFFECT_NIGHTMARE` | 1 / 1 (2) | **incorrectly sole-attributed** |
| `MOVE_EFFECT_ALL_STATS_UP` | `EFFECT_ALL_STATS_UP_HIT` | 2 / 2 (33) | correct |
| `MOVE_EFFECT_RAPIDSPIN` | `EFFECT_RAPID_SPIN` | 1 / 1 (1) | **incorrectly sole-attributed** |
| `MOVE_EFFECT_REMOVE_PARALYSIS` | `EFFECT_SMELLINGSALT` | 1 / 1 (1) | correct |
| `MOVE_EFFECT_ATK_DEF_DOWN` | `EFFECT_SUPERPOWER` | 1 / 1 (3) | correct |
| `MOVE_EFFECT_RECOIL_33` | `EFFECT_DOUBLE_EDGE` | 2 / 1 (52) | **incorrectly sole-attributed** |
| `MOVE_EFFECT_KNOCK_OFF` | `EFFECT_KNOCK_OFF` | 1 / 1 (7) | correct but incomplete |
| `MOVE_EFFECT_SP_ATK_TWO_DOWN` | `EFFECT_OVERHEAT` | 2 / 1 (23) | correct |

The row counts are the committed census values
(`docs/executable-frontier-census.md:90-92,136-137,161-163,185-196,215,227,238-244,254-260`).
“Incomplete” means the family-B barrier is real but a hidden C-selected
subscript, operand restriction, reducer, or durable state owner would stop a
faithful implementation after that barrier is removed.

There are five important census blind spots:

1. Mean Look and Nightmare execute `jumpifstatus2` **before** dispatch with
   `STATUS2_ESCAPE_PREVENTION` and `STATUS2_NIGHTMARE`
   (`reference/pokeemerald/data/battle_scripts_1.s:1444-1474`). The registered
   operand map contains only Substitute, Confusion, Multiple Turns, and Focus
   Energy and barriers every other value
   (`src/engine/battleScriptStatbuffchangeOpcode.ts:297-337`).
2. Thief/Covet and Knock Off success scripts use `B_ANIM_ITEM_STEAL` and
   `B_ANIM_ITEM_KNOCKOFF`
   (`reference/pokeemerald/data/battle_scripts_1.s:3643-3647,3951-3955`).
   `Cmd_playanimation` is registered, but neither operand is in its accepted
   animation map, so both barrier
   (`src/engine/battleScriptStatbuffchangeOpcode.ts:189-219,221-257`).
3. Rapid Spin jumps to `rapidspinfree`; that opcode has no production
   registration, and its Wrap-return script then uses the unaccepted
   `copybyte gBattlerTarget, sBATTLER` tuple
   (`reference/pokeemerald/data/battle_scripts_1.s:3488-3506`;
   `reference/pokeemerald/src/battle_script_commands.c:8821-8855`;
   `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:149-152,154-221`).
4. Both 33% and 25% recoil share a script containing
   `jumpifability BS_ATTACKER, ABILITY_ROCK_HEAD`
   (`reference/pokeemerald/data/battle_scripts_1.s:3938-3949`), but Rock Head is
   absent from the registered ability operands
   (`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:248-287,304-322`).
   Therefore the census's existing “executable” `EFFECT_RECOIL` row is also a
   false positive, independently of this family-B cluster
   (`docs/executable-frontier-census.md:104`).
5. The census explicitly has a special per-operand check only for
   `jumpifability`; it has no parallel check for `jumpifstatus2`,
   `playanimation`, or `copyarray`, and cannot see C-selected subscripts
   (`tools/report/executable-frontier-census.ts:379-413`). These findings should
   become generator checks after the engine work, not hand-edited census prose.

## 2. Shared dispatch, path, and RNG contract

### Battler selection and shared gates

`MOVE_EFFECT_AFFECTS_USER` makes the effect battler the attacker and the
scripting battler the target; otherwise they are target and attacker
respectively (`reference/pokeemerald/src/battle_script_commands.c:2240-2251`).
The current engine mirrors those exact assignments
(`src/engine/battleScriptHitChainOpcode.ts:2415-2426`).

Before the family switch, source applies Shield Dust to non-primary bytes
through 9, Safeguard to non-primary bytes through 7, skips a zero-HP effect
battler except for Pay Day and item stealing, and skips target-directed effects
through Substitute (`reference/pokeemerald/src/battle_script_commands.c:2253-2267`).
The engine mirrors those gates, except that its current zero-HP check still
unconditionally skips because the two exceptions are not supported yet
(`src/engine/battleScriptHitChainOpcode.ts:2437-2463`). Implementing Pay Day or
Steal Item must widen that check, not merely add a switch case.

Only Uproar, Recharge, Prevent Escape, and Nightmare have nonzero family-B
duplicate masks; all other cases pass the sparse table guard because their
unlisted entry is zero
(`reference/pokeemerald/src/battle_script_commands.c:608-625,2522-2528`).

### Certain, chance, and draws

`seteffectprimary` calls `SetMoveEffect(TRUE, 0)` directly and consumes no
chance RNG (`reference/pokeemerald/src/battle_script_commands.c:2941-2944`;
`src/engine/battleScriptHitChainOpcode.ts:3171-3182`). Mean Look, Nightmare,
and Rage use that path
(`reference/pokeemerald/data/battle_scripts_1.s:1122-1132,1444-1474`).

For `seteffectwithchance`, Serene Grace doubles the percentage. A raw
`MOVE_EFFECT_CERTAIN` bit bypasses the roll, but every non-CERTAIN invocation
evaluates `Random() % 100` first—even at 100%—before testing the remaining
conditions (`reference/pokeemerald/src/battle_script_commands.c:2908-2938`).
The engine preserves this one-draw ordering
(`src/engine/battleScriptHitChainOpcode.ts:3110-3168`).

Thus Recharge, Rapid Spin, SmellingSalt, Superpower, Double-Edge, and Overheat
consume zero dispatch-chance draws because their scripts set CERTAIN
(`reference/pokeemerald/data/battle_scripts_1.s:1111-1115,1716-1718,2268-2275,2388-2390,2567-2569,2648-2650`).
Pay Day, Tri Attack, Uproar, Thief/Covet, All Stats Up, and Knock Off consume
one dispatch-chance draw. Their actual percentages are respectively 100, 20,
100, 100, 10, and 100 in move data
(`reference/pokeemerald/src/data/battle_moves.h:81-92,2096-2107,2187-2198,3201-3212,3292-3303,3669-3680,4462-4473`).
Tri Attack adds one successful-effect selector draw; fresh Uproar adds one
duration draw. No other family-B case draws RNG in its switch body
(`reference/pokeemerald/src/battle_script_commands.c:2568-2603,2728-2900`).

### Common committed tail

All damaging rows eventually use the shared hit path: attack cancellation,
accuracy, attack string/PP, crit/damage/type/adjustment, animation/controller
updates, result messages, `seteffectwithchance`, `tryfaintmon`, `moveendall`,
and `end` (`reference/pokeemerald/data/battle_scripts_1.s:236-269`). The
census already walks that full static tail and reports no missing opcode for
these rows; the caveat is C-selected callbacks and narrowed operands, audited
case-by-case below (`docs/executable-frontier-census.md:5,18-22`).

## 3. Per-case dossier

### 3.1 `MOVE_EFFECT_TRI_ATTACK` / `EFFECT_TRI_ATTACK`

**Source semantics.** If the effect target already has any `status1`, advance
without effect. Otherwise draw `Random() % 3 + 3`, replacing the byte with
Burn, Freeze, or Paralysis, then recursively call non-primary, non-certain
`SetMoveEffect` (`reference/pokeemerald/src/battle_script_commands.c:2594-2603`).
The entry stages the target-directed byte and joins the common hit tail
(`reference/pokeemerald/data/battle_scripts_1.s:731-733`).

**State and hidden path.** Active `status1` and the synchronized party-slot
`status1` already exist
(`src/engine/battleScriptRulesContext.ts:186-200,437-446,1670-1691`).
The recursively selected Burn/Freeze/Paralysis paths call
`statusanimation`, `printfromtable`, `waitmessage`, `goto`,
`updatestatusicon`, `waitstate`, and `return`
(`reference/pokeemerald/data/battle_scripts_1.s:3893-3909,3873-3876`).
All three string-table operands are registered
(`src/engine/battleScriptHitChainOpcode.ts:262-315,3185-3239`), and
`BS_EFFECT_BATTLER` status-icon update is supported
(`src/engine/battleScriptHitChainOpcode.ts:3242-3300`). There is no hidden
opcode/operand or state gap. Total successful draws: one chance draw plus one
selector draw; failed chance or already-statused target consumes only the
chance draw (`reference/pokeemerald/src/battle_script_commands.c:2594-2603,2923-2935`).

**Census verdict and staging.** Confirm the family-B attribution: removing this
case flips the row if its recursive family-A call is reused. Use
`FRONTIER_MON_PORYGON_2` (Tri Attack)
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1914-1919`);
Porygon has only Trace
(`reference/pokeemerald/src/data/pokemon/species_info.h:4137-4146`).
Three controlled-seed, status-free target fixtures prove all selector outcomes;
an already-statused target proves the no-op.

### 3.2 `MOVE_EFFECT_UPROAR` / `EFFECT_UPROAR`

**Source semantics.** On a fresh effect, set `STATUS2_MULTIPLETURNS`, copy the
current move into `gLockedMoves`, add a 2–5-turn encoded Uproar duration from
`(Random() & 3) + 2`, then call `BattleScript_MoveEffectUproar`; if Uproar is
already set, only advance
(`reference/pokeemerald/src/battle_script_commands.c:2568-2581`). The script
itself is exactly `printstring`, `waitmessage`, `return`
(`reference/pokeemerald/data/battle_scripts_1.s:3911-3914`). The move entry is
user-directed, but not CERTAIN; its pre-hit `jumpifstatus2 MULTIPLETURNS`
operand is already supported
(`reference/pokeemerald/data/battle_scripts_1.s:2072-2081`;
`src/engine/battleScriptStatbuffchangeOpcode.ts:301-323`).

**State and reducers.** `status2` and `lockedMoves` exist
(`src/engine/battleScriptRulesContext.ts:186-200,583-590`). The action-admission
sleep phase already scans all battlers for Uproar, respects Soundproof, clears
Sleep and Nightmare, and hands off the wake script
(`src/engine/battleScriptActionAdmission.ts:1339-1400`). The shared
`CancelMultiTurnMoves` reducer already clears Uproar/Multiple Turns
(`src/engine/battleScriptMultiTurnCancellation.ts:27-32,47-99`).
What is missing is the end-turn owner: source wakes one eligible sleeper at a
time, otherwise decrements the encoded duration, cancels on unable-to-move or
expiry, restores Multiple Turns while continuing, and prints the appropriate
message (`reference/pokeemerald/src/battle_util.c:1625-1672`). The engine
currently declares the entire timer inert, and Yawn still assumes production
can never set Uproar
(`src/engine/battleEndTurnOrchestration.ts:783-786,1261`).

**RNG/path, census, staging.** A successful fresh use draws once for the 100%
chance path and once for duration; a continuing use still consumes the chance
draw but not the duration draw
(`reference/pokeemerald/src/battle_script_commands.c:2568-2581,2923-2930`).
Correct the census premise: family-B is the visible blocker, but dispatch-only
would create semantically invalid end turns. Use `FRONTIER_MON_VIGOROTH_1`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1550-1555`);
Vigoroth has only Vital Spirit
(`reference/pokeemerald/src/data/pokemon/species_info.h:10277-10286`). Prove
fresh duration seeds, continuation/expiry, unable-to-move cancellation, and a
sleeping non-Soundproof battler wake; Soundproof widening remains a separate
ability-operand step only where a script opcode uses it, not in this C reducer.

### 3.3 `MOVE_EFFECT_PAYDAY` / `EFFECT_PAY_DAY`

**Source semantics.** For a player-side attacker, add `level * 5` to the
16-bit `gPaydayMoney`, saturating to `0xFFFF` when wraparound makes the new
value smaller; either side then calls the coins-scattered print/wait/return
script (`reference/pokeemerald/src/battle_script_commands.c:2583-2593`;
`reference/pokeemerald/data/battle_scripts_1.s:3922-3925`). Pay Day is the
intentional zero-HP exception in the shared gate
(`reference/pokeemerald/src/battle_script_commands.c:2261-2264`).
The entry is target-directed and non-CERTAIN, so its 100% effect still consumes
one chance draw
(`reference/pokeemerald/data/battle_scripts_1.s:720-722`;
`reference/pokeemerald/src/data/battle_moves.h:81-92`).

**State and downstream path.** There is no `paydayMoney` or money-multiplier
owner in `BattleScriptRulesContext`; the relevant global scalar section runs
from `lastUsedAbility` through damage and move bookkeeping without either
field (`src/engine/battleScriptRulesContext.ts:540-590`). At battle reward time,
source `givepaydaymoney` multiplies the pot, awards it outside link battles,
prepares the printed amount, and calls a reward subscript
(`reference/pokeemerald/src/battle_script_commands.c:7450-7466`;
`reference/pokeemerald/data/battle_scripts_1.s:2936-2943`). There is no
`B_SCR_OP_GIVEPAYDAYMONEY` engine implementation, so a faithful slice needs
both the effect-time pot and its consumer even though the move-effect row's
static path does not reach the reward script. Its selected payout subscript is
only `printstring`, `waitmessage`, `return`
(`reference/pokeemerald/data/battle_scripts_1.s:3824-3827`), all already
registered; the missing opcode is `givepaydaymoney` itself.

**Census verdict and staging.** Confirm the family-B attribution for the effect
row, but it is incomplete as game behavior. The census records no Factory-L50
carrier (`docs/executable-frontier-census.md:90`), so a Factory-legal OFF
fixture is structurally unstageable: no rental set supplies Pay Day. Cover it
with pure interpreter tests, including player/opponent sides and saturation;
do not claim live Factory acceptance.

### 3.4 `MOVE_EFFECT_RECHARGE` / `EFFECT_RECHARGE`

**Source semantics.** Set the effect user's `STATUS2_RECHARGE`, set
`rechargeTimer = 2`, lock the current move, and advance
(`reference/pokeemerald/src/battle_script_commands.c:2728-2733`). The entry is
user-directed and CERTAIN, hence no chance draw
(`reference/pokeemerald/data/battle_scripts_1.s:1111-1115`).

**State/path.** `status2`, `rechargeTimer`, and `lockedMoves` already exist
(`src/engine/battleScriptRulesContext.ts:186-200,583-590`). The attack canceler
already detects Recharge, clears the bit/timer, calls the shared multi-turn
canceler, marks the action unusable, and hands off the recharge message
(`src/engine/battleScriptActionAdmission.ts:1860-1987`). The case has no
subscript and no RNG or hidden operand gap.

**Census verdict and staging.** Confirm the family-B attribution: this case is
otherwise full-path clean. `FRONTIER_MON_URSARING_6` carries Hyper Beam
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:5638-5643`);
Ursaring has only Guts
(`reference/pokeemerald/src/data/pokemon/species_info.h:6537-6546`). A hit
followed by the next selected action proves both the write and existing
canceler consumer.

### 3.5 `MOVE_EFFECT_RAGE` / `EFFECT_RAGE`

**Source semantics.** Set `STATUS2_RAGE` on the attacker and advance
(`reference/pokeemerald/src/battle_script_commands.c:2734-2737`). Rage invokes
primary target-directed dispatch even though the case explicitly writes the
attacker; on a miss it stages Rage and calls `clearstatusfromeffect BS_ATTACKER`
(`reference/pokeemerald/data/battle_scripts_1.s:1122-1132`). The sparse status
table has no Rage entry, so that clear's mask is zero; the engine already
models that exact default
(`src/engine/battleScriptSemiInvulnerableOpcode.ts:5-21,43-93`).

**State/path.** `status2` and stat stages exist
(`src/engine/battleScriptRulesContext.ts:186-200,238-250`). MOVEEND_RAGE already
checks damage/source conditions and increments the enraged target's Attack
stage, calling the message subscript
(`src/engine/battleScriptMoveEndOpcode.ts:233-266`). There is no RNG, callback,
or remaining operand gap.

**Census verdict and staging.** Confirm the family-B attribution and full-path
cleanliness. The census records zero Factory-L50 carriers
(`docs/executable-frontier-census.md:137`), so Factory-legal staging is
structurally unstageable. Pure tests must
cover hit, miss (zero-mask clear), and a later damaging hit raising Attack.

### 3.6 `MOVE_EFFECT_STEAL_ITEM` / `EFFECT_THIEF`

**Source semantics.** Source skips Trainer Hill; prevents an ordinary
non-special opponent from stealing; prevents restoration of a previously
knocked-off attacker item outside the listed special battle types; calls the
Sticky Hold failure script when a held target has Sticky Hold; otherwise
fails if the attacker holds an item or the target has Enigma Berry, mail, or
no item. On success it writes the target item to attacker `changedItems` and
`lastUsedItem`, clears the target item, emits held-item controller writes for
both battlers, calls `BattleScript_ItemSteal`, and clears the target's
`choicedMove` (`reference/pokeemerald/src/battle_script_commands.c:2738-2803`).
Battle Frontier is explicitly one of the allowed special battle types
(`reference/pokeemerald/src/battle_script_commands.c:2746-2763`).

**State and genuine holes.** Active battlers have `item`; the context has
`changedItems` and `choicedMove`
(`src/engine/battleScriptRulesContext.ts:238-250,583-590`), and MOVEEND_CHANGED_ITEMS
already transfers a nonzero changed item to the active battler and clears the
staging slot (`src/engine/battleScriptRulesContext.ts:1432-1460`). But party
members have no item field
(`src/engine/battleScriptRulesContext.ts:437-446`), and switch-in explicitly
leaves active item untouched because it cannot rebuild it
(`src/engine/battleScriptSwitchinOpcode.ts:288-304`). There is no
`lastUsedItem` or `knockedOffMons` field in the context's move/item bookkeeping
(`src/engine/battleScriptRulesContext.ts:540-610`). Those are durable semantic
holes, not decorative omissions: source switch-in consults the party-slot
`knockedOffMons` bit to suppress item restoration
(`reference/pokeemerald/src/battle_script_commands.c:4637-4646`). Source also
records the Sticky Hold reveal in AI ability history
(`reference/pokeemerald/src/battle_script_commands.c:2767-2775`); that history
has no context home but is deliberately outside the current modeled scope
because it has no engine reader
(`src/engine/battleScriptHitChainOpcode.ts:3493-3496`).

**Hidden scripts/opcodes.** Sticky Hold failure calls
`pause`, `printstring`, `waitmessage`, `return`; success calls
`playanimation BS_TARGET, B_ANIM_ITEM_STEAL`, `printstring`, `waitmessage`,
`return`
(`reference/pokeemerald/data/battle_scripts_1.s:3951-3955,4209-4213`).
All are registered, but `B_ANIM_ITEM_STEAL` is absent from the registered
`playanimation` operand map and therefore barriers
(`src/engine/battleScriptStatbuffchangeOpcode.ts:189-219,221-257`). The entry
is target-directed and non-CERTAIN, so its 100% chance consumes one draw
(`reference/pokeemerald/data/battle_scripts_1.s:1440-1442`;
`reference/pokeemerald/src/data/battle_moves.h:4462-4473`).

**Census verdict and staging.** Correct the premise: family-B is real, but
success also needs item animation widening and durable party/item ownership.
Use `FRONTIER_MON_LINOONE_1` (Covet)
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1424-1429`);
Linoone has only Pickup
(`reference/pokeemerald/src/data/pokemon/species_info.h:7997-8006`). Its rental
item is White Herb, so the mechanic-lab carrier must explicitly use `ITEM_NONE`
while retaining the legal species/move, and the target must hold a non-mail,
non-Enigma item. Prove success, occupied-attacker failure, empty-target failure,
Sticky Hold failure, and switch-out/switch-in persistence.

### 3.7 `MOVE_EFFECT_PREVENT_ESCAPE` / `EFFECT_MEAN_LOOK`

**Source semantics.** Set the target's `STATUS2_ESCAPE_PREVENTION`, write the
attacker into the target's `battlerPreventingEscape`, and advance
(`reference/pokeemerald/src/battle_script_commands.c:2805-2809`). Mean Look
first checks existing Escape Prevention and Substitute, then uses primary
target-directed dispatch, prints, and ends
(`reference/pokeemerald/data/battle_scripts_1.s:1444-1457`). No RNG is drawn.

**State and hidden barriers.** `status2` exists, and `jumpifcantswitch` already
reads its Escape Prevention bit
(`src/engine/battleScriptRulesContext.ts:186-200`;
`src/engine/battleScriptJumpifcantswitchOpcode.ts:40,137`). There is no
`battlerPreventingEscape` identity field. The pre-dispatch
`jumpifstatus2 STATUS2_ESCAPE_PREVENTION` operand barriers because it is not in
the registered map
(`src/engine/battleScriptStatbuffchangeOpcode.ts:318-337`). Source clears traps
owned by a switching or fainting preventer by comparing that identity
(`reference/pokeemerald/src/battle_main.c:3158-3169,3268-3283`); both engine
cleanup paths explicitly barrier when the bit exists because identity is
missing
(`src/engine/battleScriptSwitchinOpcode.ts:288-342`;
`src/engine/battleScriptHitChainOpcode.ts:3466-3482,3517-3527`).

**Cluster-3 implementation correction (2026-07-28).** Running the complete
committed entry exposed one additional pre-dispatch operand barrier omitted
above: Mean Look is the sole bare `accuracycheck ..., NO_ACC_CALC` call site.
That source branch performs no roll, skips the Lock-On identity comparison,
and retains only the semi-invulnerability/Protect checks
(`battle_script_commands.c:1099-1113`). Cluster 3 widened it alongside the
named status2/identity work; this is why the full entry now reaches MOVEEND
with an exact zero-draw ledger.

**Census verdict and staging.** The current sole attribution is false:
dispatch cannot even be reached until the `jumpifstatus2` operand is widened,
and the state is unsafe until owner-aware cleanup lands. Use
`FRONTIER_MON_MURKROW_2` (Mean Look)
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:2026-2031`);
Murkrow has only Insomnia
(`reference/pokeemerald/src/data/pokemon/species_info.h:5967-5976`). Prove
duplicate/Substitute failures, blocked target switching, and release after the
preventer switches or faints.

### 3.8 `MOVE_EFFECT_NIGHTMARE` / `EFFECT_NIGHTMARE`

**Source semantics.** Set the target's `STATUS2_NIGHTMARE` and advance
(`reference/pokeemerald/src/battle_script_commands.c:2810-2813`). The entry
rejects Substitute and existing Nightmare, requires Sleep, then uses primary
target-directed dispatch and prints
(`reference/pokeemerald/data/battle_scripts_1.s:1459-1474`). No RNG is drawn.

**State, script path, and reducers.** `status2` and Sleep `status1` exist
(`src/engine/battleScriptRulesContext.ts:186-200`). The pre-dispatch
`jumpifstatus2 STATUS2_NIGHTMARE` operand is not registered
(`src/engine/battleScriptStatbuffchangeOpcode.ts:318-337`). Waking in Uproar
already clears Nightmare
(`src/engine/battleScriptActionAdmission.ts:1379-1400`), but the end-turn
orchestrator explicitly barriers if the bit is set
(`src/engine/battleEndTurnOrchestration.ts:1246-1250`). Source deals
`max(1, maxHP / 4)` while asleep and otherwise clears Nightmare
(`reference/pokeemerald/src/battle_util.c:1561-1579`); its damage script uses
`printstring`, `waitmessage`, `status2animation`, and the shared turn-damage
tail (`reference/pokeemerald/data/battle_scripts_1.s:3851-3855`). Those opcodes
are registered, and `STATUS2_NIGHTMARE` is already a source constant
(`src/engine/battleScriptSourceConstants.ts:23-35`).

**Census verdict and staging.** The sole family-B attribution is false:
pre-dispatch operand and end-turn reducer are additional barriers. Use
`FRONTIER_MON_HAUNTER_2`, which carries Hypnosis and Nightmare
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1991-1996`);
Haunter has only Levitate
(`reference/pokeemerald/src/data/pokemon/species_info.h:2817-2826`). Stage
Sleep with Hypnosis, then prove application, quarter-HP ticks, wake cleanup,
duplicate failure, and Substitute failure.

### 3.9 `MOVE_EFFECT_ALL_STATS_UP` / `EFFECT_ALL_STATS_UP_HIT`

**Source semantics and path.** Push the continuation and call
`BattleScript_AllStatsUp`
(`reference/pokeemerald/src/battle_script_commands.c:2814-2817`). That script
tests all five non-accuracy/evasion combat stats for room, plays one multi-stat
animation, and then attempts +1 Attack, Defense, Speed, Sp. Attack, and
Sp. Defense in order, printing each successful result before returning
(`reference/pokeemerald/data/battle_scripts_1.s:3452-3486`).

**State/opcodes/RNG.** `statStages` already owns every write
(`src/engine/battleScriptRulesContext.ts:238-250`). Every
`jumpifstat` stat/comparator operand is source-complete and zero-barrier
(`src/engine/battleScriptJumpifstatOpcode.ts:1-17,48-72`).
`playstatchangeanimation` accepts all committed masks/flags with no barrier
(`src/engine/battleScriptPlaystatchangeanimationOpcode.ts:1-43`).
`setbyte`, `setstatchanger`, `statbuffchange`, `printfromtable`, `waitmessage`,
and `return` are registered; the relevant stat flags and both string tables are
accepted (`src/engine/battleScriptStatbuffchangeOpcode.ts:56-123`;
`src/engine/battleScriptHitChainOpcode.ts:301-314`). The user-directed,
non-CERTAIN 10% entry consumes exactly one chance draw and no case-local draw
(`reference/pokeemerald/data/battle_scripts_1.s:1772-1774`;
`reference/pokeemerald/src/data/battle_moves.h:3201-3212,4137-4147`).

**Census verdict and staging.** Confirm the family-B attribution and full-path
cleanliness. `FRONTIER_MON_EXEGGCUTE` carries AncientPower
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:787-792`);
Exeggcute has only Chlorophyll
(`reference/pokeemerald/src/data/pokemon/species_info.h:3087-3096`). A
controlled successful seed at neutral stages and an all-max-stage seed prove
the full and return-only branches.

### 3.10 `MOVE_EFFECT_RAPIDSPIN` / `EFFECT_RAPID_SPIN`

**Source semantics.** The family case calls `BattleScript_RapidSpinAway`
(`reference/pokeemerald/src/battle_script_commands.c:2818-2821`), which invokes
`rapidspinfree` and returns
(`reference/pokeemerald/data/battle_scripts_1.s:3488-3490`). Repeated execution
removes, in priority order, Wrap (also retargeting to `wrappedBy` and preparing
the wrapped move name), Leech Seed plus its owner bits, then same-side Spikes
plus `spikesAmount`; after each removal it calls a message subscript and resumes
the same opcode, finally advancing when none remain
(`reference/pokeemerald/src/battle_script_commands.c:8821-8855`;
`reference/pokeemerald/data/battle_scripts_1.s:3492-3506`).

**State and barriers.** Every rules write has a home: `status2`,
`wrappedMove`, `wrappedBy`, `status3`, `sideStatuses`, and
`sideTimers[].spikesAmount`
(`src/engine/battleScriptRulesContext.ts:186-200,320-342,624-649`;
`src/engine/battleScriptSourceConstants.ts:105-109`). A typed generic move-name
text buffer does not; the only specialized text-buffer owner is a mon nickname
(`src/engine/battleScriptRulesContext.ts:650-664`). More importantly,
`B_SCR_OP_RAPIDSPINFREE` is unregistered. The Wrap-free subscript's
`copybyte gBattlerTarget, sBATTLER` is macro sugar for a `copyarray` tuple not
accepted by the current handler, whose only selector tuple is
`gBattlerTarget <- gBattlerAttacker`
(`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:149-152,154-221`).
The remaining subscript opcodes—`printstring`, `waitmessage`, `return`—are
registered. The entry is user-directed and CERTAIN, so no chance or local RNG
draw occurs
(`reference/pokeemerald/data/battle_scripts_1.s:1716-1718`).

**Census verdict and staging.** The sole family-B attribution is false: the
unregistered opcode and Copyarray operand are behind the C dispatch. Use
`FRONTIER_MON_WARTORTLE_2` (Rapid Spin)
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1970-1975`);
Wartortle has only Torrent
(`reference/pokeemerald/src/data/pokemon/species_info.h:267-276`). Stage Wrap,
Leech Seed, and Spikes through legal moves, then prove all are removed in
source priority with owner/layer fields cleared and target restored.

### 3.11 `MOVE_EFFECT_REMOVE_PARALYSIS` / `EFFECT_SMELLINGSALT`

**Source semantics.** If the target is not paralyzed, advance. Otherwise clear
the Paralysis bits, emit the target status controller write, and call
`BattleScript_TargetPRLZHeal`
(`reference/pokeemerald/src/battle_script_commands.c:2822-2837`). The subscript
is `printstring`, `waitmessage`, `updatestatusicon BS_TARGET`, `return`
(`reference/pokeemerald/data/battle_scripts_1.s:3863-3867`), and that selector
is supported; only the unrelated doubles selector barriers
(`src/engine/battleScriptHitChainOpcode.ts:3242-3300`).

**State/path/RNG.** Active and party-mirror `status1` already exist with a sync
helper (`src/engine/battleScriptRulesContext.ts:186-200,437-446,1670-1691`).
SmellingSalt first short-circuits through Substitute, stages a target-directed
CERTAIN effect, and doubles damage when the target is paralyzed
(`reference/pokeemerald/data/battle_scripts_1.s:2268-2275`). Thus there is no
chance or local RNG draw and no hidden opcode/operand gap.

**Census verdict and staging.** Confirm the family-B attribution and full-path
cleanliness. `FRONTIER_MON_GRANBULL_1` carries both Thunder Wave and
SmellingSalt
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:2635-2640`);
both Granbull ability slots are Intimidate, so there is no ability-slot
ambiguity (`reference/pokeemerald/src/data/pokemon/species_info.h:6327-6336`).
Stage paralysis with Thunder Wave, then prove doubled damage and active/party
status clearing; also prove Substitute preserves paralysis.

### 3.12 `MOVE_EFFECT_ATK_DEF_DOWN` / `EFFECT_SUPERPOWER`

**Source semantics/path.** Call `BattleScript_AtkDefDown`
(`reference/pokeemerald/src/battle_script_commands.c:2839-2842`). It plays the
combined/down animations, applies user-directed certain Attack −1 and Defense
−1 independently, conditionally prints each result, and returns
(`reference/pokeemerald/data/battle_scripts_1.s:3624-3641`).

**State/opcodes/RNG.** `statStages` owns the writes
(`src/engine/battleScriptRulesContext.ts:238-250`).
`playstatchangeanimation` has total committed operand coverage
(`src/engine/battleScriptPlaystatchangeanimationOpcode.ts:37-43`), the
statbuff flags are registered
(`src/engine/battleScriptStatbuffchangeOpcode.ts:56-123`), and
`jumpifbyte`, stat-down print table, messages, and return are already accepted
(`src/engine/battleScriptHitChainOpcode.ts:308-314`). The entry is
user-directed and CERTAIN, so it draws no RNG
(`reference/pokeemerald/data/battle_scripts_1.s:2388-2390`).

**Census verdict and staging.** Confirm the family-B attribution and full-path
cleanliness. `FRONTIER_MON_NIDOQUEEN_4` carries Superpower
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:4910-4915`);
Nidoqueen has only Poison Point
(`reference/pokeemerald/src/data/pokemon/species_info.h:957-966`). Its White
Herb can erase the lowered stages during move end, so use an explicit
`ITEM_NONE` carrier to observe durable stages, plus a separate exact-rental
fixture to prove the existing held-item consumer.

### 3.13 `MOVE_EFFECT_RECOIL_33` / `EFFECT_DOUBLE_EDGE`

**Source semantics.** Set `gBattleMoveDamage = max(1, gHpDealt / 3)`, push the
continuation, and call the shared recoil script
(`reference/pokeemerald/src/battle_script_commands.c:2843-2850`). That script
lets Struggle bypass Rock Head, otherwise skips recoil for Rock Head, then ORs
ignore-Substitute/passive-HP hit markers, updates the attacker HP bar/data,
prints, tries to faint the attacker, and returns
(`reference/pokeemerald/data/battle_scripts_1.s:3938-3949`). The entry is
user-directed and CERTAIN, so it draws no RNG
(`reference/pokeemerald/data/battle_scripts_1.s:2567-2569`).

**State/opcodes/barrier.** `hpDealt`, `battleMoveDamage`, HP, and hit marker
already exist
(`src/engine/battleScriptRulesContext.ts:186-200,564-568`). The existing 25%
recoil implementation already demonstrates the same call/state shape
(`src/engine/battleScriptHitChainOpcode.ts:2475-2490`).
`jumpifmove MOVE_STRUGGLE` accepts the source-derived full move universe
(`src/engine/battleScriptJumpifhalfwordOpcode.ts:67-105`); ORWORD,
health/data updates, message, faint, and return are registered. But
`ABILITY_ROCK_HEAD` is not in the accepted `jumpifability` map, so execution
barriers before the ability comparison regardless of whether the attacker has
Rock Head (`src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:277-287,304-322`).

**Census verdict and staging.** The sole attribution is false; Rock Head
operand widening is mandatory. Use `FRONTIER_MON_HITMONTOP_2` (Double-Edge)
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:2390-2395`);
Hitmontop has only Intimidate
(`reference/pokeemerald/src/data/pokemon/species_info.h:7137-7146`). Prove
flooring/minimum damage and attacker faint. A second legal single-ability Rock
Head attacker is needed to prove the skip; Bagon is unambiguous Rock Head
(`reference/pokeemerald/src/data/pokemon/species_info.h:11159-11186`), so a
player-controlled mechanic-lab Bagon with Double-Edge is suitable even though
the census carrier itself is Hitmontop. Do not infer the branch from
Hitmontop.

### 3.14 `MOVE_EFFECT_KNOCK_OFF` / `EFFECT_KNOCK_OFF`

**Source semantics.** If the effect target has Sticky Hold, do nothing when it
has no item; otherwise set `lastUsedAbility` and jump directly to the Sticky
Hold script. Without Sticky Hold, a held item is copied to `lastUsedItem`,
cleared from the active target, and its party-slot bit is set in
`knockedOffMons`; the success script is called and `choicedMove` is cleared.
No held item simply advances
(`reference/pokeemerald/src/battle_script_commands.c:2863-2896`).

**State and hidden scripts.** Active `item`, `choicedMove`, and
`lastUsedAbility` exist
(`src/engine/battleScriptRulesContext.ts:238-250,540-548,583-590`), but
`lastUsedItem`, `knockedOffMons`, and party item storage do not
(`src/engine/battleScriptRulesContext.ts:437-446,540-610`), while source
switch-in reads the knocked-off party-slot bit and forces `ITEM_NONE`
(`reference/pokeemerald/src/battle_script_commands.c:4637-4646`). Sticky Hold's
`RecordAbilityBattle` AI-history write likewise has no context home and no
modeled reader (`reference/pokeemerald/src/battle_script_commands.c:2863-2875`;
`src/engine/battleScriptHitChainOpcode.ts:3493-3496`). Success uses
`playanimation BS_TARGET, B_ANIM_ITEM_KNOCKOFF`, print, wait, return; Sticky
Hold uses pause/print/wait then `goto BattleScript_MoveEnd`
(`reference/pokeemerald/data/battle_scripts_1.s:3643-3647,4173-4177`).
`B_ANIM_ITEM_KNOCKOFF` is not in the registered animation operand map and
barriers (`src/engine/battleScriptStatbuffchangeOpcode.ts:189-219,221-257`).
The target-directed, non-CERTAIN 100% entry consumes one chance draw
(`reference/pokeemerald/data/battle_scripts_1.s:2475-2477`;
`reference/pokeemerald/src/data/battle_moves.h:3669-3680`).

**Census verdict and staging.** Confirm family-B as a real blocker, but it is
not sufficient: item animation and persistent knocked-off ownership are hidden
requirements. Use `FRONTIER_MON_SABLEYE_1`
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:1144-1149`);
Sableye has only Keen Eye
(`reference/pokeemerald/src/data/pokemon/species_info.h:8987-8996`). Prove held
item removal, no-item no-op, Sticky Hold, Choice lock clearing, and that the
removed item does not reappear after switch/faint replacement.

### 3.15 `MOVE_EFFECT_SP_ATK_TWO_DOWN` / `EFFECT_OVERHEAT`

**Source semantics/path.** Call `BattleScript_SAtkDown2`
(`reference/pokeemerald/src/battle_script_commands.c:2897-2900`). It plays the
negative-by-two stat animation, applies a user-directed certain Sp. Attack −2,
conditionally prints, and returns
(`reference/pokeemerald/data/battle_scripts_1.s:3698-3707`).

**State/opcodes/RNG.** `statStages` owns the write
(`src/engine/battleScriptRulesContext.ts:238-250`); the animation, statbuff,
comparison, table, message, and return operands are all in the same
source-complete registrations audited for Superpower
(`src/engine/battleScriptPlaystatchangeanimationOpcode.ts:37-43`;
`src/engine/battleScriptStatbuffchangeOpcode.ts:56-123`;
`src/engine/battleScriptHitChainOpcode.ts:308-314`). The user-directed CERTAIN
entry consumes no RNG
(`reference/pokeemerald/data/battle_scripts_1.s:2648-2650`).

**Census verdict and staging.** Confirm the family-B attribution and full-path
cleanliness. `FRONTIER_MON_SOLROCK_2` carries Overheat and a White Herb
(`reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h:2299-2304`);
Solrock has only Levitate
(`reference/pokeemerald/src/data/pokemon/species_info.h:9797-9806`). As with
Superpower, use `ITEM_NONE` to inspect the durable −2 write and an exact-rental
fixture to prove White Herb restoration.

## 4. Ordered implementation clusters and census predictions

The current baseline is **159/214 effects, 288/355 moves, 236/276 Factory
distinct, 2764/2957 Factory weighted**
(`docs/executable-frontier-census.md:9-16`). The increments below sum the exact
per-effect row groupings in §1; they are not estimates. A row may be flipped
only after its **entire committed path**, including the C-selected callbacks
named above, executes without a missing opcode or operand barrier. Merely
adding the byte to `SET_MOVE_EFFECT_SUPPORTED_BYTES` would make the census
mechanically optimistic because the generator cannot see those callbacks
(`tools/report/executable-frontier-census.ts:379-413`).

### Cluster 1 — existing-state/direct and self-stat cases

Implement Tri Attack, Recharge, Rage, All Stats Up, Remove Paralysis,
Atk/Def Down, and Sp. Atk Two Down. These share no new durable subsystem:
their owners and downstream reducers already exist (§3.1, §3.4, §3.5,
§3.9, §3.11, §3.12, §3.15).

- Acceptance: source-shaped Tier-1 tests for every branch and RNG count; a
  full committed-script test per effect; Factory OFF fixtures for all except
  Rage; no new `(b)` barrier.
- Exact flip: **+7 effects / +12 moves / +7 Factory distinct / +72 weighted**.
- New cumulative census: **166/214, 300/355, 243/276, 2836/2957**.

This is the only broad cluster: the bodies are short and reuse already tested
stat/status/canceler plumbing. If it does not fit one worker cap, split after
Recharge/Rage/Tri Attack without changing the arithmetic.

### Cluster 2 — damage-derived recoil plus locked Uproar

Implement Recoil 33 and Uproar together because both extend already modeled
damage/multi-turn state rather than introduce new party identity.

- Named barriers to retire: add `ABILITY_ROCK_HEAD` to the
  `jumpifability` operand map; add the Uproar end-turn phase and remove the
  now-false Yawn “Uproar unreachable” assumption. Reuse the existing
  action-admission wake and `CancelMultiTurnMoves` paths (§3.2, §3.13).
- Acceptance: Double-Edge normal/minimum/faint/Rock Head tests; Uproar
  duration draw, continuation, expiry, unable-to-move cancellation, sleeper
  wake, Soundproof negative; both full scripts reach MOVEEND.
- Exact flip: **+2 effects / +3 moves / +2 Factory distinct / +53 weighted**.
- New cumulative census: **168/214, 303/355, 245/276, 2889/2957**.
- Collateral correction: revalidate `EFFECT_RECOIL`; Rock Head widening should
  make its existing “executable” claim true rather than alter the count
  (`docs/executable-frontier-census.md:104`).

### Cluster 3 — target volatile identity and field cleanup

Implement Mean Look, Nightmare, and Rapid Spin.

- Named barriers to retire: widen `jumpifstatus2` for Escape Prevention and
  Nightmare; add `battlerPreventingEscape` plus switch/faint cleanup; wire the
  Nightmare end-turn reducer; register `B_SCR_OP_RAPIDSPINFREE`; accept
  `copybyte gBattlerTarget, sBATTLER`; provide a typed move-name buffer/event
  for the Wrap-free message (§3.7, §3.8, §3.10).
- Acceptance: each full entry script reaches dispatch and MOVEEND; owner
  switch/faint releases Mean Look; Nightmare ticks and clears on wake; one
  Rapid Spin invocation removes Wrap, Leech Seed, and Spikes in priority order
  and clears all owner/layer cells.
- Exact flip: **+3 effects / +5 moves / +5 Factory distinct / +9 weighted**.
- New cumulative census: **171/214, 308/355, 250/276, 2898/2957**.

This is a bounded state-identity slice, but it has three independent tests. If
the 60-minute cap is tight, land Mean Look/Nightmare first and leave
`MOVE_EFFECT_RAPIDSPIN` barriered; do not add its supported byte until its
opcode and Copyarray operand are both live.

### Cluster 4 — item motion plus Pay Day economy

Implement Steal Item, Knock Off, and Pay Day as persistent battle/reward
ownership.

- Named barriers to retire: add party item storage/switch synchronization,
  `lastUsedItem`, and per-side `knockedOffMons`; widen the two item animation
  operands; preserve existing `changedItems` MOVEEND semantics; add
  `paydayMoney`, its zero-HP exception, and the `givepaydaymoney` consumer
  (§3.3, §3.6, §3.14).
- Acceptance: item success/failure/Sticky Hold/Choice/switch persistence for
  both item effects; Pay Day side, saturation, multiplier, and link/no-pot
  payout tests; full scripts reach MOVEEND. Pay Day has no Factory fixture, so
  its acceptance is Tier-1 source parity only.
- Exact flip: **+3 effects / +4 moves / +2 Factory distinct / +8 weighted**.
- Final cumulative census: **174/214, 312/355, 252/276, 2906/2957**.

If durable party-item storage cannot be completed inside the cap, keep both
item bytes barriered. Pay Day can land separately without changing any
Factory count, but it must include its reward consumer before being called
semantically complete.

## 5. Final falsification ledger

| Effect | Dispatch-only flip honest? | Additional blocker that must be named |
| --- | --- | --- |
| Pay Day | no | no pot/payout state or `givepaydaymoney`; no Factory carrier |
| Tri Attack | yes | none |
| Uproar | no | missing end-turn timer; stale Yawn reachability assumption |
| Recharge | yes | none |
| Rage | yes | no Factory carrier, but full engine path exists |
| Thief/Covet | no | item animation operand; party item/last-item/knock history |
| Mean Look | no | pre-dispatch status2 operand; preventer identity and cleanup |
| Nightmare | no | pre-dispatch status2 operand; explicit end-turn case barrier |
| All Stats Up | yes | none |
| Rapid Spin | no | unregistered opcode; Copyarray operand; move-name buffer |
| SmellingSalt | yes | none |
| Superpower | yes | none |
| Double-Edge | no | Rock Head ability operand |
| Knock Off | no | item animation operand; party item/last-item/knock history |
| Overheat | yes | none |

The safe immediate census flip is therefore only the seven Cluster-1 effects:
**+7 effects, +12 moves, +7 Factory distinct, +72 weighted**. Every other row
must remain family-B barriered until its named downstream blocker is retired.
