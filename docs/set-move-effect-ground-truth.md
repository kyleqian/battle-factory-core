# SetMoveEffect ground truth (prep-scout for the post-presentation-seam registration frontier)

Probe deliverable, not a registration: banks the source enumeration and one
live-proc ledger for `SetMoveEffect` (`battle_script_commands.c:2234-2906`),
the subsystem both of `Cmd_seteffectwithchance`'s dispatch sites
(`src/engine/battleScriptHitChainOpcode.ts:1553-1610`,
`createSeteffectwithchanceOpcodeHandler`) currently barrier on:

```
if (certain && !noEffect) {
  return unsupportedBranch(context, "...MOVE_EFFECT_CERTAIN branch dispatches SetMoveEffect...", ...);
}
...
if (rolledSuccess && rulesContext.moveEffectByte !== 0 && !noEffect) {
  return unsupportedBranch(context, "...chance-roll branch dispatches SetMoveEffect...", ...);
}
```

Both barriers only fire when `rulesContext.moveEffectByte !== 0` -- i.e. once
some earlier instruction has written a nonzero `MOVE_EFFECT_BYTE`
(`cEFFECT_CHOOSER`, `include/constants/battle_script_commands.h:292,299`).
Today no committed test ever does that (the barrier comment's "no
setmoveeffect-family opcode is registered yet" is about program *topology*
reaching a `setmoveeffect` instruction on a real move's own script, not about
opcode support -- see the correction below), so both branches are proven
reachable only by directly constructing a nonzero `moveEffectByte` in this
engine's own barrier tests, not by a real script walk. This probe closes that
gap with a real ROM capture.

## 1. Source enumeration

### `SetMoveEffect(bool8 primary, u8 certain)` control flow

`gEffectBattler`/`gBattleScripting.battler` selection (the affects-user vs
affects-target flag, `:2240-2251`):

- `MOVE_EFFECT_BYTE & MOVE_EFFECT_AFFECTS_USER` (bit 6, `1<<6`) set ->
  `gEffectBattler = gBattlerAttacker` (the effect lands on the *user*, e.g.
  Recharge, Rage, self stat-ups, the certain-recoil moves).
  `MOVE_EFFECT_AFFECTS_USER` is cleared from the byte before the switch below
  reads it.
- Otherwise -> `gEffectBattler = gBattlerTarget` (the common case: burn,
  paralysis, poison, freeze, flinch, confuse, stat-down-on-hit).

Four early bail-outs (`INCREMENT_RESET_RETURN`, `:2253-2267`), each just
advances `gBattlescriptCurrInstr` past the current instruction with no
script jump: Shield Dust (ability, blocks non-primary secondary effects
`MOVE_EFFECT_BYTE <= 9`), Safeguard (side status, same `<= 7` gate),
target already at 0 HP (except Pay Day/Steal Item, which apply regardless of
a fainted target), and target already has a Substitute (except the
affects-user branch, which bypasses Substitute).

Then the byte selects one of two families:

**A. `MOVE_EFFECT_BYTE <= PRIMARY_STATUS_MOVE_EFFECT` (i.e. `<= 6`, `:2269-2521`)**
-- primary `status1` writes, dispatched through `sStatusFlagsForMoveEffects[]`
(`:608-624`). Only 4 of the 6 members are actually reachable through
`Cmd_seteffectwithchance`'s two dispatch sites at Level 50 -- `MOVE_EFFECT_SLEEP`
and `MOVE_EFFECT_TOXIC`'s own on-hit scripts (`BattleScript_EffectSleep`,
`BattleScript_EffectToxic`) call `Cmd_seteffectprimary` (a sibling,
still-unregistered opcode: `SetMoveEffect(TRUE, 0)` unconditionally, no
`Random()` roll, no chance gate) instead of going through
`Cmd_seteffectwithchance` at all -- out of this probe's scope, named for
completeness:

| `MOVE_EFFECT_*` | status1 bit | Ability gate | Type immunity | Sub-script (`sMoveEffectBS_Ptrs[]`) | Extra RNG |
| --- | --- | --- | --- | --- | -: |
| `POISON` (2) | `STATUS1_POISON` (`1<<3`) | Immunity (certain-only prevention msg) | Poison, Steel | `BattleScript_MoveEffectPoison` | 0 |
| `BURN` (3) | `STATUS1_BURN` (`1<<4`) | Water Veil | Fire | `BattleScript_MoveEffectBurn` | 0 |
| `FREEZE` (4) | `STATUS1_FREEZE` (`1<<5`) | Magma Armor | Ice; also gated by `WEATHER_HAS_EFFECT && sun` (no-freeze-in-sun) | `BattleScript_MoveEffectFreeze` | 0 |
| `PARALYSIS` (5) | `STATUS1_PARALYSIS` (`1<<6`) | Limber | none | `BattleScript_MoveEffectParalysis` | 0 |

On success (`statusChanged`, `:2476-2513`): `BattleScriptPush` (return
address) + jump to the sub-script above, write `status1 \|=` the bit
(SLEEP alone also draws `(Random() & 3) + 2` turns here -- not reachable via
`Cmd_seteffectwithchance`, see above), emit `BtlController_EmitSetMonData`
(controller status sync -- this engine's equivalent is the direct
`rulesContext`/party-slot write `Cmd_datahpupdate` already established for
HP, per `docs/faint-outcome-ground-truth.md` §3.2), set the "for synchronize"
flag (`HITMARKER_SYNCHRONIZE_EFFECT` -- a downstream Synchronize-ability
retaliation mechanic, itself unmodeled and out of scope), then `return`
(back to the instruction *after* the original `setmoveeffect`-adjacent call
site, i.e. `tryfaintmon` in `BattleScript_EffectHit`'s case). On failure
(no status change, e.g. target already statused): `MOVE_EFFECT_BYTE = 0;
gBattlescriptCurrInstr++` -- falls straight through, no push/jump.

**B. `MOVE_EFFECT_BYTE > 6` (`:2522-2901`)** -- the `status2`/misc family,
a `switch` over ~40 more cases. First a shared early-out: if
`status2 & sStatusFlagsForMoveEffects[byte]` is already set (only 6 of these
cases have a nonzero entry in that table: CONFUSION, FLINCH, UPROAR,
CHARGING, WRAP, RECHARGE, PREVENT_ESCAPE, NIGHTMARE), skip. Level-50
Factory-reachable members (join below), each with its own branch shape:

| `MOVE_EFFECT_*` | Ability gate | Sub-script call | Extra RNG |
| --- | --- | --- | -: |
| `CONFUSION` (7) | Own Tempo | `BattleScript_MoveEffectConfusion` (`chosenstatus2animation`) | `(Random() % 4) + 2` turns |
| `FLINCH` (8) | Inner Focus (`BattleScript_FlinchPrevention`) | **none** -- direct `status2 \|=` write, falls through | 0 |
| `TRI_ATTACK` (9) | none | recurses into `SetMoveEffect` with a re-rolled byte | `Random() % 3 + 3` (which status1 to apply) |
| `PAY_DAY` (11) | none | `BattleScript_MoveEffectPayDay` | 0 (not L50-reachable, no move) |
| `ALL_STATS_UP` (34, `AFFECTS_USER`) | none directly (per-stat clamp inside `ChangeStatBuffs`... actually `BattleScript_AllStatsUp`, its own opcode family) | `BattleScript_AllStatsUp` | 0 |
| `*_MINUS_1` / `*_PLUS_1` / `*_MINUS_2` / `*_PLUS_2` (stat family, 15-28, 39-52) | none directly; `ChangeStatBuffs()` internally checks Clear Body/White Smoke/Hyper Cutter/Keen Eye + Mist | `BattleScript_StatDown` / `BattleScript_StatUp` on the *failure* path (success just increments) | 0 |
| `KNOCK_OFF` (54) | Sticky Hold | `BattleScript_KnockedOff` / `BattleScript_StickyHoldActivates` | 0 |

`FLINCH`'s plain-case write is additionally gated by
`GetBattlerTurnOrderNum(gEffectBattler) > gCurrentTurnActionNumber` (only
flinch a target that **hasn't acted yet this turn**) -- this engine's
`rulesContext` does not currently track turn order / current action index at
all, so even though flinch needs **zero new script opcodes**, it needs one
new rules-context field before it can be registered source-completely for
the general case (a scenario where the attacker is faster, as in every
committed hit-chain fixture so far, sidesteps the gap by construction, not by
modeling it).

### Opcode-cost join against the registered set (51 handlers, per PROGRESS 439/440)

Every relevant sub-script/dispatch mechanism cross-referenced against
`grep -rhoE '"B_SCR_OP_[A-Z0-9_]+"' src/engine/*.ts` (51 registered, matches
PROGRESS's count):

| Mechanism | Already registered | Still needed |
| --- | --- | --- |
| `setmoveeffect EFFECT` (write `MOVE_EFFECT_BYTE`) | **Yes** -- it's a macro for `setbyte cEFFECT_CHOOSER, EFFECT` (`asm/macros/battle_script.inc:1370-1372`), and `cEFFECT_CHOOSER` is already a resolved pointer in `battleScriptSetByte.ts:32,192,229` (writes/reads `rulesContext.moveEffectByte`). **No new opcode needed to arm the barrier** -- the barrier comment's "no setmoveeffect-family opcode is registered" is about program-topology reachability (no committed scenario's script walk currently passes through a `setmoveeffect`-bearing label), not opcode support. |
| `BattleScriptPush` + jump (the "call" pattern `SetMoveEffect` uses for every sub-script) | **Yes** -- `B_SCR_OP_CALL` / `B_SCR_OP_RETURN` are both registered. |
| `BattleScript_MoveEffect{Poison,Burn,Freeze,Paralysis}` body (`statusanimation`, `printfromtable`, `waitmessage`, `updatestatusicon`, `waitstate`, `return`/`goto`) | `statusanimation`/`waitmessage`/`waitstate`/`return`/`goto` all registered | **`B_SCR_OP_PRINTFROMTABLE`, `B_SCR_OP_UPDATESTATUSICON`** -- 2 new opcodes, shared by all 4 status-write classes. |
| `BattleScript_MoveEffectConfusion` (`chosenstatus2animation`, `printstring`, `waitmessage`, `return`) | **All registered** -- `chosenstatus2animation` is a macro for `chosenstatusanimation battler, 0x1, status` (`asm/macros/battle_script.inc:1378-1380`), and `B_SCR_OP_CHOSENSTATUSANIMATION`'s handler already branches on an `isStatus2` discriminant (`battleScriptSourceCommands.ts:55,736-740`). **0 new opcodes.** |
| `FLINCH`'s plain-case write | No script sub-call at all (direct `status2 \|=` + `gBattlescriptCurrInstr++`) | **0 new opcodes**, but needs a new `rulesContext` field for turn order (see above). |
| `BattleScript_StatDown`/`StatUp` (`playanimation`, `printfromtable`, `waitmessage`, `return`) + `ChangeStatBuffs()` | `waitmessage`/`return` registered | **`B_SCR_OP_PLAYANIMATION`, `B_SCR_OP_PRINTFROMTABLE`**, plus porting `ChangeStatBuffs()` itself (stage clamp to ±6, Clear Body/White Smoke/Hyper Cutter/Keen Eye ability checks, Mist side-status check) -- by far the largest lift of any class here. |
| `PRLZPrevention`/`BRNPrevention`/`PSNPrevention`/`FlinchPrevention`/`OwnTempoPrevents` (ability-blocks-status message branches) | `pause`/`printstring`/`waitmessage`/`goto` registered | **0 new opcodes** -- these are reachable today in principle, just not yet exercised by a committed scenario. |

### Ranked table: proccable-by-N-legal-L50-sets (join vs. `src/data/gen/battle-script-topology.json`'s `level50FactoryReachableEffects`)

`frontierMonCount` summed per `EFFECT_*` family (the move's own `effect`
field, which selects the entry script that calls `setmoveeffect` then
`goto BattleScript_EffectHit`) -- **not** assumed, derived directly from the
generated join:

| Rank | `EFFECT_*` family | `frontierMonCount` | Entry script | `MOVE_EFFECT_*` | New opcodes | Extra RNG |
| -: | --- | -: | --- | --- | --- | -: |
| 1 | `EFFECT_SPECIAL_DEFENSE_DOWN_HIT` | **188** | `BattleScript_EffectSpecialDefenseDownHit` | `SP_DEF_MINUS_1` | PLAYANIMATION, PRINTFROMTABLE + `ChangeStatBuffs()` | 0 |
| 2 | `EFFECT_PARALYZE_HIT` | **137** | `BattleScript_EffectParalyzeHit` | `PARALYSIS` | PRINTFROMTABLE, UPDATESTATUSICON | 0 |
| 3 | `EFFECT_FREEZE_HIT` | **109** | `BattleScript_EffectFreezeHit` | `FREEZE` | PRINTFROMTABLE, UPDATESTATUSICON | 0 |
| 4 | `EFFECT_FLINCH_HIT` | 103 | `BattleScript_EffectFlinchHit` | `FLINCH` | **none** (needs turn-order rules field) | 0 |
| 5 | `EFFECT_BURN_HIT` | 76 | `BattleScript_EffectBurnHit` | `BURN` | PRINTFROMTABLE, UPDATESTATUSICON | 0 |
| 6 | `EFFECT_SPEED_DOWN_HIT` | 48 | `BattleScript_EffectSpeedDownHit` | `SPD_MINUS_1` | PLAYANIMATION, PRINTFROMTABLE + `ChangeStatBuffs()` | 0 |
| 7 | `EFFECT_POISON_HIT` | 44 | `BattleScript_EffectPoisonHit` | `POISON` | PRINTFROMTABLE, UPDATESTATUSICON | 0 |
| 8 | `EFFECT_CONFUSE_HIT` | 42 | `BattleScript_EffectConfuseHit` | `CONFUSION` | **none** | `(Random()%4)+2` turns |
| 9 | `EFFECT_ALL_STATS_UP_HIT` | 33 | `BattleScript_EffectAllStatsUpHit` | `ALL_STATS_UP` | separate `BattleScript_AllStatsUp` opcode family | 0 |
| 10 | `EFFECT_DEFENSE_DOWN_HIT` | 32 | `BattleScript_EffectDefenseDownHit` | `DEF_MINUS_1` | PLAYANIMATION, PRINTFROMTABLE + `ChangeStatBuffs()` | 0 |
| 11 | `EFFECT_TRI_ATTACK` | 8 | `BattleScript_EffectTriAttack` | `TRI_ATTACK` | recursion into a re-rolled `SetMoveEffect` call | `Random()%3+3` |
| 12 | `EFFECT_KNOCK_OFF` | 7 | `BattleScript_EffectKnockOff` | `KNOCK_OFF` | item-transfer state, no new opcode | 0 |
| 13 | `EFFECT_RECOIL` | 4 | `BattleScript_EffectRecoil` | `RECOIL_25`/`RECOIL_33` | already covered (recoil is a plain `datahpupdate` reuse) | 0 |
| 14 | `EFFECT_ATTACK_DOWN_HIT` | 3 | `BattleScript_EffectAttackDownHit` | `ATK_MINUS_1` | same stat-down cost as #1/#6/#10 | 0 |

(`EFFECT_HIT`, `EFFECT_ALWAYS_HIT`, `EFFECT_HIGH_CRITICAL`, `EFFECT_QUICK_ATTACK`
etc. are excluded even though they're `BattleScript_EffectHit`-topped and
high-coverage: their moves have `secondaryEffectChance == 0` /
`MOVE_EFFECT_BYTE` stays `0`, so `SetMoveEffect` is never dispatched for
them at all -- confirmed against `src/data/gen/moves.json`.)

**Top 3 by raw coverage, derived, not assumed:** `SP_DEF_MINUS_1` (188) >
`PARALYSIS` (137) > `FREEZE` (109) -- the stat-down family actually beats
the classic "burn/paralysis/flinch" intuition on pure legal-set count, driven
by Psychic/Crunch/Shadow Ball/Luster Purge's own high individual usage. But
it is also the single most expensive class to register (a full
`ChangeStatBuffs()` port plus 2 new opcodes, vs. 2 new opcodes with no new
subsystem for the status-write quartet, and literally 0 new opcodes for
`FLINCH`/`CONFUSION`) -- see the recommendation below, which optimizes for
value *and* registration cost, since coverage alone would over-weight the
most expensive class.

## 2. Live proc ledger: `MOVE_EFFECT_PARALYSIS` (rank #2, cheapest of the top 3)

Picked over `SP_DEF_MINUS_1` (rank #1) specifically because it is a clean,
single-branch status1 write (one ability gate, no type immunity, no weather
gate, no full stat-stage subsystem) representative of the 4-member
status-write quartet (`PARALYSIS`/`FREEZE`/`BURN`/`POISON`, ranks #2/#3/#5/#7,
366 combined legal-set coverage) that shares the same 2-new-opcode cost.

Committed fixture: `tools/battle-lab/mechanic-set-move-effect-paralysis-off.json`
(`overrides.parties`, live per `docs/hit-chain-ground-truth.md`'s note that
the oracle needed a restart for this contract -- confirmed working here).
Player fields KADABRA (species 64) with `MOVE_BODY_SLAM` (id 34,
`EFFECT_PARALYZE_HIT`, power 85, accuracy 100, `secondaryEffectChance` 30,
`data/battle_moves.h`) in all four slots -- accuracy 100 removes miss-branch
noise from the seed sweep, and a 30% chance is high enough to find both a
proc and a non-proc seed in a single-digit sweep. Opponent fields MAGNETON
(species 82, 125 max HP, high Def) with `MOVE_TACKLE` in all four slots --
reused from `docs/hit-chain-ground-truth.md`'s own matchup specifically
because it's already proven to survive Normal-type hits comfortably (SetMoveEffect
silently no-ops a status write against a target that already reached 0 HP
this same strike, so a defender that might faint would contaminate the
result). Both sides carry 2 filler BULBASAUR bench slots (never sent out).
Single capture window `[0, 450]`, same convention as
`docs/hit-chain-ground-truth.md` Scenario 1.

**Seed sweep** (seeds 1-15 against the committed fixture): seeds 4, 9, 13
proc; the rest don't. Seed **4** banked as the proc case, seed **1** as the
control (both reruns are deterministic -- `verify-set-move-effect-ground-truth.ts`
reruns the proc seed twice and diffs frame 0 and frame 450 byte-for-byte).

### Proc seed 4

| # | Source function | u16 roll |
| - | - | -: |
| 1 | `Cmd_accuracycheck` | 61260 |
| 2 | `Cmd_critcalc` | 64951 |
| 3 | `ApplyRandomDmgMultiplier` | 891 |
| 4 | `Cmd_seteffectwithchance` | 37229 |

Roll 4: `37229 % 100 = 29 < 30` -> the chance gate clears ->
`SetMoveEffect(FALSE, 0)` dispatches, `MOVE_EFFECT_BYTE` (`PARALYSIS`, no
ability gate hit since MAGNETON's ability is Magnet Pull, not Limber) writes
`status1 \|= STATUS1_PARALYSIS (1<<6 = 64)`.

**RNG cost of the proc itself: zero extra `Random()` calls.** Forward-stepping
the LCG from frame-0's `rngValue` (2643437444) exactly **8** times (the same
4+4 two-attacker total as a plain no-proc hit chain) lands exactly on
frame-450's captured `rngValue` (859851276) -- confirmed by
`stepsToReach`'s forward search, not assumed. This matches
`SetMoveEffect`'s own source: the non-sleep `statusChanged` branch
(`:2476-2513`) writes the status bit unconditionally, no `Random()` call
inside it (unlike `MOVE_EFFECT_SLEEP`, which draws `(Random()&3)+2` turns in
that same branch, or `MOVE_EFFECT_CONFUSION`, which draws its own duration
roll in family B).

Status write, first-appearance frame (dense 10-frame sweep,
`0..260` by `+10`): `battlers.opponent.status1` is `0` through frame 240,
becomes `64` (`{"kind":"paralysis"}`) by frame 250 -- well after
`datahpupdate`'s own HP write, which already lands by frame ~160
(`hp: 125 -> 117`). This orders `seteffectwithchance`'s status write strictly
after the damage/message sequence, consistent with `BattleScript_EffectHit`'s
linear op order.

Party-record sync (`docs/battle-resolution-adapter-ground-truth.md` §2's
live-sync mechanism, previously established for HP): `state.parties.opponent[0].status1`
mirrors `state.battlers.opponent.status1` exactly, `0 -> 64` in lockstep --
confirmed at both frame 0 and frame 450, same mechanism as the HP sync, no
new plumbing implied for a status1 write.

PP\[0\] (Body Slam): `15 -> 14`, same one-decrement convention as every
other scenario in `docs/hit-chain-ground-truth.md`.

### Control seed 1 (non-proccing, same fixture)

| # | Source function | u16 roll |
| - | - | -: |
| 1 | `Cmd_accuracycheck` | 40931 |
| 2 | `Cmd_critcalc` | 33731 |
| 3 | `ApplyRandomDmgMultiplier` | 29631 |
| 4 | `Cmd_seteffectwithchance` | 46260 |

Roll 4: `46260 % 100 = 60`, not `< 30` -> the chance gate fails ->
`SetMoveEffect` is never called at all this attack; `MOVE_EFFECT_BYTE` resets
to 0 the same way `Cmd_seteffectwithchance`'s own tail does regardless
(`rulesContext.moveEffectByte: 0` already, per the existing registered
handler). `battlers.opponent.status1` and `parties.opponent[0].status1` both
stay `0` through frame 450 -- the **exactly-matching plain-hit control** the
brief asked for.

**One asymmetry worth flagging, found empirically, not assumed:** the
control seed reaches frame 450 in **22** total `Random()` calls (the 8-roll
two-attacker turn plus the familiar `+14`-ish next-turn AI move-selection
scoring pass, same shape `docs/hit-chain-ground-truth.md` Scenario 1 already
documented), while the **proc** seed only reaches **8** by the same frame
450. This is not a hidden extra roll from the proc -- it's a real-time
artifact: the proc's extra on-screen message ("MAGNETON was paralyzed! It
may be unable to move!" plus the status-icon update) consumes additional
*frames* to display, pushing the point where the AI's next-turn scoring pass
begins past frame 450 in wall-clock terms. A wider capture window (verified
manually to frame 700, not committed to the fixture) shows the proc seed's
`rngValue` still only 15 steps advanced by then, continuing to close the gap
-- confirming the theory rather than leaving it asserted. Any future
registration step comparing roll *counts* across scenarios at a fixed frame
number needs to budget for this: same fixed frame != same amount of turn
progress once an extra status message enters the picture.

## 3. Verify script

`tools/probe/verify-set-move-effect-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-set-move-effect-ground-truth.ts`,
also runnable via `npx tsx`) reruns
`tools/battle-lab/mechanic-set-move-effect-paralysis-off.json` at both banked
seeds and checks, PASS/FAIL, every live claim above: determinism (2 reruns of
the proc seed, byte-for-byte at frames 0 and 450), the roll-4 `%100`
chance-gate arithmetic for both seeds, the 4-roll attacker-chain count for
both seeds, the whole-turn 8-roll count for the proc seed specifically,
`status1`/decoded-`status`/party-sync before and after for both seeds, and
the PP decrement. All PASS at commit time:

```
$ node --experimental-strip-types tools/probe/verify-set-move-effect-ground-truth.ts
...
PASS: 0 failing check(s)
```

## Recommended first registration slice

Register the **status-write quartet** --
`MOVE_EFFECT_POISON`/`BURN`/`FREEZE`/`PARALYSIS` (ranks #2/#3/#5/#7, **366**
combined legal-L50-set coverage) -- as one slice, sharing the same 2 new
opcodes (`B_SCR_OP_PRINTFROMTABLE`, `B_SCR_OP_UPDATESTATUSICON`) and the same
`sStatusFlagsForMoveEffects`-driven status1-write helper this probe's live
ledger already proves bit-exact (`STATUS1_PARALYSIS = 1<<6`, confirmed
against the real ROM). `FLINCH` (rank #4, 103 sets, **zero** new opcodes for
its main path) is a natural, even-cheaper companion in the same rung, gated
only by adding a turn-order field to `BattleScriptRulesContext` -- worth
scoping as part of the same step since the fix step will already be touching
`SetMoveEffect`'s dispatch. `CONFUSION` (rank #8, 42 sets, zero new opcodes,
one extra RNG draw already characterized: `(Random()%4)+2`) is a good
second-rung follow-up once the quartet's `BattleScriptPush`/status-write
pattern is proven, since it reuses that exact pattern plus one duration roll.
Defer the stat-down family (`SP_DEF_MINUS_1`/`SPD_MINUS_1`/`DEF_MINUS_1`/
`ATK_MINUS_1`, ranks #1/#6/#10/#14, combined coverage 271) and
`ALL_STATS_UP_HIT`/`TRI_ATTACK`/`KNOCK_OFF` to a later slice: despite rank #1
having the single highest raw legal-set count, `ChangeStatBuffs()` is a
genuinely separate, larger subsystem (stage clamping, 4 more ability checks,
Mist) that this probe intentionally did not attempt to port or prove live --
bundling it into the same fix step as the quartet would mix a cheap,
well-precedented status1-write pattern with an expensive new one and risks
neither landing cleanly.
