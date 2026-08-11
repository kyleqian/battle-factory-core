# RNG attribution notes: ISSUES #27's "HP-write+5" unattributed `Random()` call

S7 worktree probe (oracle/RAM/source only, no engine code). Attributes the
single `Random()` step ISSUES #27 flagged at HP-write+5 in turns 16
(tick 21152) and 17 (tick 22173), and extends the same analysis to the
older loosely-attributed "tail" rolls in turns 13-15.

## 1. The attribution

**The call is `Cmd_seteffectwithchance`'s own `Random() % 100` roll**
(`reference/pokeemerald/src/battle_script_commands.c:2908-2939`, the
roll itself at line 2923):

```c
static void Cmd_seteffectwithchance(void)
{
    u32 percentChance;
    if (gBattleMons[gBattlerAttacker].ability == ABILITY_SERENE_GRACE)
        percentChance = gBattleMoves[gCurrentMove].secondaryEffectChance * 2;
    else
        percentChance = gBattleMoves[gCurrentMove].secondaryEffectChance;

    if (gBattleCommunication[MOVE_EFFECT_BYTE] & MOVE_EFFECT_CERTAIN
        && !(gMoveResultFlags & MOVE_RESULT_NO_EFFECT))
    { ... }
    else if (Random() % 100 < percentChance          // <-- line 2923
             && gBattleCommunication[MOVE_EFFECT_BYTE]
             && !(gMoveResultFlags & MOVE_RESULT_NO_EFFECT))
    { ... }
    else
    { gBattlescriptCurrInstr++; }
    ...
}
```

`Random() % 100 < percentChance` is the **first operand** of the `&&`
chain, so C evaluates it — and therefore calls `Random()` — every time
this `else if` is reached, regardless of `percentChance`. **Even when
`secondaryEffectChance == 0` (guaranteed to fail), the roll still
happens** — it just never visibly affects anything, which is exactly
why this call has looked "unattributed" every time it's been seen: it
*has* no observable consequence when the move's secondary chance is 0.

**Where the call sits in the script**: the generic damaging-hit script,
`BattleScript_EffectHit` (`data/battle_scripts_1.s:236-269`), runs
`seteffectwithchance` (line 265) unconditionally right after the HP
write and its trailing messages, and right before `tryfaintmon` (line
266):

```
	healthbarupdate BS_TARGET
	datahpupdate BS_TARGET        @ <- the HP write
	critmessage
	waitmessage B_WAIT_TIME_LONG
	resultmessage
	waitmessage B_WAIT_TIME_LONG
	seteffectwithchance           @ <- the "unattributed" Random() call
	tryfaintmon BS_TARGET
BattleScript_MoveEnd::
```

`BattleScript_EffectHit` is the terminal script for **every** move
effect that funnels through it via the effect-index jump table
(`gBattleScriptsForMoveEffects`, `battle_scripts_1.s:19ff`) — directly
for `EFFECT_HIT`/`EFFECT_ALWAYS_HIT`/etc., or via a one-line
`setmoveeffect`+`goto BattleScript_EffectHit` for `EFFECT_BURN_HIT`
(line 362-364), `EFFECT_PARALYZE_HIT` (370-372), `EFFECT_POISON_HIT`,
`EFFECT_FREEZE_HIT`, and others — and also via
`BattleScript_SecondTurnSemiInvulnerable`'s strike half (FLY/DIG/etc.,
lines 1997-2008), which `goto`s straight into
`BattleScript_HitFromAtkString` (line 245), joining the exact same tail.

## 2. The firing rule (falsifiable)

> `Cmd_seteffectwithchance` fires **exactly once, unconditionally,**
> for every move-execution that reaches `BattleScript_EffectHit`'s tail
> — i.e., every move whose effect resolves through that shared script
> (the vast majority of damaging effects) **and that actually connects**
> (accuracy check passed; the miss branch `BattleScript_PrintMoveMissed`
> diverts to `BattleScript_MoveEnd` *without ever reaching
> `seteffectwithchance`*). It fires **independent of**:
> - the move's own `secondaryEffectChance` (fires even when 0 — the
>   roll is thrown away but still consumed);
> - `gMoveResultFlags & MOVE_RESULT_NO_EFFECT` (type immunity) — that
>   flag is checked only in the *second* operand of the `&&`, after
>   `Random()` has already been called;
> - attacker/target identity, ability, or held item — nothing in
>   `Cmd_seteffectwithchance` reads either battler's item, and no
>   ability check gates entry to this command.
>
> It does **not** fire for: a missed move (diverts before reaching the
> command), the semi-invulnerable **charge** half (`turn14-notes.md`
> §2/§5a: `BattleScriptFirstChargingTurn` sets the charging state and
> goes straight to `BattleScript_MoveEnd`, no hit resolution at all),
> or any move-effect script that never joins `BattleScript_EffectHit`'s
> tail (pure status/stat moves largely use their own scripts that
> `goto BattleScript_MoveEnd` directly after their own effect, e.g.
> `BattleScript_EffectSleep`/`EffectDefenseCurl`/`EffectSoftboiled`
> above — none of them call `seteffectwithchance`).
>
> **The tick offset from the HP write is *not* a fixed constant** — it
> is exactly the number of ticks the four intervening script commands
> (`critmessage`/`waitmessage`/`resultmessage`/`waitmessage`) take to
> execute. When none of them prints text (no crit, no type-effectiveness
> message, target doesn't faint), each is an effective no-op costing 1
> tick, giving a **+5 baseline** (4 no-op commands + the
> `seteffectwithchance` dispatch tick itself). When `resultmessage`
> actually prints text (an effectiveness message) or the target faints
> (extra health-bar-drain/cleanup ticks before the script can continue),
> the offset grows accordingly — see turn 15 below, +93 instead of +5.

## 3. RAM-corroborated evidence table

`gRngValue` (raw LCG state) sampled via `ram-probe.py` against this
run's own already-committed ground-truth traces
(`battle1-turn16-dense.json`'s `turn16-rng-watch.json` spec;
`battle1-turn17-dense.json`'s `turn17-rng-watch.json` spec;
`battle1-turn15-dense.json`'s `turn15-rng-watch.json` spec) — probe-only
reads, no new traces committed.

| turn | tick | attacker→move | HP write tick | offset | `secondaryEffectChance` | fired? | `gRngValue` before → after |
|---|---|---|---|---|---|---|---|
| 16 | 21152 | MURKROW→FAINT_ATTACK (vs MAGBY) | 21147 | **+5** | 0 (`EFFECT_ALWAYS_HIT`, `battle_moves.h:2408-2419`) | consumed, no-op (chance=0 ⇒ `Random()%100 < 0` always false) | `2744256313` → `846647736` |
| 16 | 21411 | MAGBY→FIRE_PUNCH (vs MURKROW) | 21406 | **+5** | 10 (`EFFECT_BURN_HIT`, `battle_moves.h:94-105`) | consumed, **succeeded** (MURKROW `status1` 0→16 `STATUS1_BURN`, same tick) | `2840502189` → `2012156700` |
| 17 | 22173 | MURKROW→FAINT_ATTACK (vs MAGBY) | 22168 | **+5** | 0 | consumed, no-op | `1115590820` → `1657663047` |
| 17 | 22423 | MAGBY→FIRE_PUNCH (vs MURKROW, already fainted) | 22418 | **+5** | 10 | consumed, **unknowable success/failure** — `SetMoveEffect`'s own `hp == 0` gate (`battle_script_commands.c:2261`) blocks the write either way (see `turn17-notes.md` §2's own note) | `1102173384` → `2185030043` |
| 15 | 19240 | MURKROW→FLY strike half (vs ONIX, faints) | 19147 | **+93** | 0 (`EFFECT_SEMI_INVULNERABLE`, `battle_moves.h:250-261`) | consumed, no-op | `668107606` → `2200600593` |
| 13 | 15892 | ONIX→DRAGON_BREATH (vs PIDGEOTTO, faints) | (pre-window; not re-probed this session) | +157 from the *damage* roll (`turn13-notes.md` §2) | 30 (`EFFECT_PARALYZE_HIT`, `battle_moves.h:2928-2939`) | consumed, **already correctly attributed** in `turn13-notes.md` as "secondary-effect (30% paralysis) roll" — same call site, not a new finding | not re-probed |

**Negative-instance check** (the brief's own ask): scanned every tick
19140-19245 of turn 15's own probe — `gRngValue` is **completely flat**
from 19140 through 19239 (spanning the 19147 HP write) and changes
**exactly once**, at 19240. There is **no** roll at HP-write+5 (19152)
for this instance — confirming the offset is schedule-dependent (message
length / faint overhead), not a second, independent mechanism; the
*single* roll each move-execution pays is the same `seteffectwithchance`
call in both the +5 and +93 cases, just reached at different ticks.

**Tick-math check for the +5 baseline**: `BattleScript_EffectHit`'s
tail is `datahpupdate(261:HP write) → critmessage → waitmessage →
resultmessage → waitmessage → seteffectwithchance` — 4 commands between
the write and the roll. Turns 16/17's FAINT_ATTACK hits print no crit
message (no crit) and no effectiveness message (Dark vs Fire is neutral
type-wise) and the target doesn't faint, so each intervening command
costs its minimal 1 dispatch tick: `4 × 1 + 1 = 5`. Turn 15's FLY hit
prints a real "It's not very effective..." message (PNG-confirmed,
`turn15-notes.md` §4, held 19150-19330) *and* Onix faints from the hit —
both inflate the same four commands' tick cost, landing the roll at
+93 instead of +5.

## 4. Both of ISSUES #27's named candidates are ruled out — cleanly, not just for the FLAME_BODY branch

- **`AbilityBattleEffects`'s `ABILITYEFFECT_ON_DAMAGE` sweep**
  (`battle_util.c:2836-2849`): `turn16-notes.md` §2 already ruled out
  the FLAME_BODY *branch* specifically (FAINT_ATTACK lacks
  `FLAG_MAKES_CONTACT`). This session adds: the *only* case in that
  switch relevant to either battler's actual ability is FLAME_BODY
  (MAGBY's ability, Gen 3's single-ability model), so with that branch's
  own `Random()` call short-circuited away by the missing contact flag,
  **nothing else in that dispatcher can consume a roll for this matchup
  either** — the sweep's switch has no default/unconditional
  `Random()` call, confirmed by reading the full case block. Not the
  source.
- **King's-Rock-style held-item flinch check**
  (`ITEMEFFECT_KINGSROCK_SHELLBELL`, `battle_util.c:3769-3786`, `case
  HOLD_EFFECT_FLINCH:`, roll at line 3777): ruled out **two ways**. (1)
  Roster: both battlers hold `LAX_INCENSE` this battle (MAGBY and
  MURKROW; Onix holds nothing per the brief), not King's Rock, so
  `atkHoldEffect` never equals `HOLD_EFFECT_FLINCH` and the `switch`
  never enters this case. (2) Script position, independent of roster:
  this call is reached from `Cmd_moveend`'s own dispatch
  (`ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, ...)`,
  `battle_script_commands.c:4337`), which runs from
  `BattleScript_MoveEnd`/`moveendall` — **structurally after**
  `seteffectwithchance` (which sits *before* `tryfaintmon`, itself
  before `BattleScript_MoveEnd`). Even with a King's Rock holder in
  play, this would be a *different* Random() call at a *later* dispatch
  stage, not the one at HP-write+5.

## 5. What's still open (correctly out of scope here)

Turn 13's 17105/17111 and turn 14's 18079 are **not** instances of this
mechanism — they sit far outside any single move's
`BattleScript_EffectHit` window (well after the switch-in settle
completes, not adjacent to any HP write), and turn13/14's own dossiers
already group them with the separate "AI-prescoring 2-step cluster"
(turn14/15/16's own switch-in-settle pairs, ~6-7 ticks apart) — per the
step brief, that is a different, already-consistently-characterized
mechanism and is left untouched here. This session's attribution
resolves *only* the HP-write-adjacent single roll (ISSUES #27's actual
subject), and turn 13's 15892 / turn 15's 19240 as the same mechanism,
not the 17105/17111/18079 family.

## Verification

Read-only source citations (`reference/pokeemerald/`) + `ram-probe.py`
runs against this run's own already-committed ground-truth traces
(`battle1-turn15-dense.json`, `battle1-turn16-dense.json`,
`battle1-turn17-dense.json`) via their existing committed watch specs.
No new traces committed; no engine (`src/`) changes made.
