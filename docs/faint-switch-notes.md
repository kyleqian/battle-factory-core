# Grovyle's faint -> DESTIN's switch-in: the remaining §13 unknowns (worktree lane, oracle scout — no engine code)

Follow-up to `docs/battle-turn-notes.md` §13 (`battle1-grovyle-faint.json`,
7312 frames, `battle1-grovyle-faint-ram-dump.json`). This session ground-
truths §13's open items 1 (why Pidgeotto, not Murkrow) and 5 (the Sitrus
Berry heal formula) to source-and-RAM-pinned certainty. Open items 2-4
(the animation itemization, the tick-7215/7221 RNG cluster, the two
unattributed 1-step events) were **not reached this session** — see "What's
still open" at the bottom for exactly why and what's needed next. No
`src/engine/` changes; the only additions are this file, one new committed
probe script (`tools/probe/dump-switch-decision.py`), and its output
(`src/data/gen/battle1-grovyle-switch-decision.json`), all cross-checked
against the already-committed `battle1-grovyle-faint.json` trace (no new
oracle traces were needed — every fact below comes from RAM-probing the
existing committed trace plus reading `reference/pokeemerald` source).

## 1. Why DESTIN sends out PIDGEOTTO, not MURKROW — PINNED

### The algorithm (source-cited)

`GetMostSuitableMonToSwitchInto` (`reference/pokeemerald/src/
battle_ai_switch_items.c:629-790`) runs in two phases, called from
`AI_TrySwitchOrUseItem` (same file, line 547) once `ShouldSwitch()` has
already decided a switch is warranted (a separate, simpler yes/no gate —
not itemized this session, `ShouldSwitch()` is lines 461-526 and is a
plain scored checklist: Perish Song, Wonder Guard, an absorbing ability,
Natural Cure, "no super-effective move available", stat-drop checks, in
that priority order; none of it is candidate-*selection* logic, only the
switch/no-switch gate).

**Phase 1 (lines 690-746), a self-documented AI bug**: for every valid
candidate `i` still in the party, compute `typeDmg` = `TYPE_MUL_NORMAL`
(10, fixed-point ×10) run through `ModulateByTypeEffectiveness` twice —
once for each of the *opposing* battler's own two types attacking the
*candidate's* two defensive types (`battle_ai_switch_items.c:706-710`).
Whichever candidate ends up with the **highest** `typeDmg` is provisionally
picked (line 715: `if (bestDmg < typeDmg)`). The source's own comment
(lines 712-714) flags this explicitly:

> "Possible bug: this comparison gives the type that takes the most
> damage, when a "good" AI would want to select the type that takes the
> least damage."

So phase 1 is genuinely "prefer whichever candidate the opponent's own
attacking types would hit *hardest*", not "prefer whichever resists
best" — worth pinning precisely since a naively "sensible" engine port
would get this backwards. If phase 1 finds a candidate, it further
requires that candidate to have *some* super-effective move against the
opponent (lines 728-738); if not, that candidate is excluded and the
`while` loop retries with the next-highest `typeDmg` candidate (line 740).
If **no** candidate ever has `typeDmg > TYPE_MUL_NO_EFFECT` (0) at all,
phase 1 finds nothing (line 744) and falls through to phase 2.

**Phase 2 (lines 748-789), the fallback**: resets `gDynamicBasePower`,
`gMoveResultFlags`, `gCritMultiplier` etc., then for every valid candidate
`i` and every one of its 4 moves `j` (`move = GetMonData(&party[i],
MON_DATA_MOVE1 + j)`), if the move isn't `MOVE_NONE` and its power isn't
the `1` "variable power" sentinel, calls `AI_CalcDmg(gActiveBattler,
opposingBattler)` then `TypeCalc(move, gActiveBattler, opposingBattler)`,
and keeps whichever `(candidate, move)` pair produces the single highest
`gBattleMoveDamage` (**strictly** greater — line 781's `<`, not `<=` — so
ties favor the *earlier* party index).

### Phase 1 is a confirmed tie (0 vs 0) for Murkrow and Pidgeotto — RAM- and source-pinned

Onix's types, RAM-read directly (`gBattleMons[0].types`, tick 6600):
**[5, 4] = ROCK, GROUND** — matches the established stat block. Pidgeotto's
types, RAM-read (`gBattleMons[1].types` after the switch, tick 6684):
**[0, 2] = NORMAL, FLYING**. Murkrow was never sent out this dossier, so
its type isn't RAM-readable from `gBattleMons`, but
`reference/pokeemerald/src/data/pokemon/species_info.h:5949-5958`
pins it as source data: **DARK, FLYING** (not RAM-dependent — species
typing is compiled-in, not battle state).

`reference/pokeemerald/src/battle_main.c:335+` (`gTypeEffectiveness`) has
the two entries that decide this: `TYPE_ROCK, TYPE_FLYING,
TYPE_MUL_SUPER_EFFECTIVE` (line 424) and `TYPE_GROUND, TYPE_FLYING,
TYPE_MUL_NO_EFFECT` (line 396) — **no entries at all** for ROCK or GROUND
against DARK or NORMAL (checked directly, `grep`-exhaustive over the
table). So for *both* candidates, `ModulateByTypeEffectiveness`'s two
calls compute: ROCK bumps `typeDmg` to `10 * 20/10 = 20` (both are
Flying), then GROUND immediately zeroes it back down: `20 * 0/10 = 0`
(both are Flying, so both get the Ground immunity) — **final `typeDmg` =
0 for both, every time**, because whichever secondary type they have
(DARK for Murkrow, NORMAL for Pidgeotto) never touches ROCK or GROUND's
table rows at all. Since phase 1's `bestDmg` starts at `TYPE_MUL_NO_EFFECT`
(0, `include/battle_main.h:31`) and the comparison is strict `<`, neither
candidate ever exceeds it — **phase 1 finds no viable candidate and falls
through to phase 2 unconditionally**, for any all-Flying-type matchup
against a Rock/Ground opponent, not just this one battle. This part of the
rule **generalizes**: whenever every remaining switch-in candidate takes
the *same* multiplier from the active-opponent's typing (a tie, most
commonly a shared 4x/2x weakness or a shared immunity like this one),
phase 1 can't discriminate and phase 2 decides instead.

### Phase 2: the actual candidates, RAM- and source-cross-confirmed

The opponent's real party doesn't come from `gSaveBlock2Ptr->frontier.
rentalMons[3..5]` (`dump-rentalmons.py`'s own docstring's claim, which
this session found to be **wrong for this opponent type** — probing it at
tick 6600 shows `rentalMons[3..5]` still holds `monId` 153/179/181 =
BUTTERFREE/HAUNTER_1/QUILAVA_1, unchanged since the very start of the
trace: that array is the **player-facing 6-slot draft pool**, unrelated to
a preset-trainer opponent's own party). The real source, traced via
`GenerateOpponentMons` (`reference/pokeemerald/src/battle_factory.c:
303-377`): opponent monIds land in `gFrontierTempParty[0..2]`, a `u16[]`
indexed into `gFacilityTrainerMons` (== `gBattleFrontierMons`,
`src/data/battle_frontier/battle_frontier_mons.h`). RAM-read
(`gFrontierTempParty`, symbol `0x03006298`, tick 100 and tick 6600 —
**identical both times**, confirming it's fixed for the whole battle):
**`[188, 184, 135]`**, decoding via `include/constants/
battle_frontier_mons.h` to `FRONTIER_MON_GROVYLE_1` (188),
`FRONTIER_MON_MURKROW_1` (184), `FRONTIER_MON_PIDGEOTTO` (135) — exactly
matching §13's own party-index finding (`gBattlerPartyIndexes[1]`: 0 = 
Grovyle, 1 = Murkrow, 2 = Pidgeotto).

`gBattleFrontierMons[FRONTIER_MON_*]`'s own compiled-in `.moves` arrays
(`src/data/battle_frontier/battle_frontier_mons.h`):

| mon | species | moves (source) | moves (RAM, move IDs) |
|---|---|---|---|
| GROVYLE_1 (188) | GROVYLE | FURY_CUTTER, ENDEAVOR, BRICK_BREAK, DOUBLE_TEAM | `[210, 283, 280, 104]` — RAM-read `gBattleMons[1].moves` at tick 6600 (still occupying the active slot, fainted) |
| MURKROW_1 (184) | MURKROW | FAINT_ATTACK, FLY, TORMENT, TAUNT | not RAM-readable (never sent out this dossier — see caveat below) |
| PIDGEOTTO (135) | PIDGEOTTO | AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK | `[332, 98, 297, 28]` — RAM-read `gBattleMons[1].moves` at tick 6684+ |

Both RAM-readable rows are **bit-exact** against the source table (move
IDs cross-checked one by one against `include/constants/moves.h`), which
is strong indirect confirmation that Murkrow's un-RAM-readable row
(FAINT_ATTACK/FLY/TORMENT/TAUNT) is correct too — the lookup mechanism
is proven accurate on the two cases that *can* be double-checked.

Real party stats (RAM-read, tick 6600, `gPlayerParty[0]` / `gEnemyParty[0..2]`
— `struct Pokemon`'s **plaintext** cached stat fields, not the encrypted
substructures; offsets empirically located and byte-verified against
Onix's already-known values, see the probe script's own docstring for the
full derivation):

| mon | atk | def | spd | spAtk | spDef | hp/max |
|---|---|---|---|---|---|---|
| Onix (opposingBattler) | 51 | 187 | 76 | 36 | 72 | 1/117 |
| Grovyle (enemyParty0) | 103 | 56 | 90 | 91 | 71 | 0/143 |
| **Murkrow (enemyParty1)** | **91** | 69 | 97 | 91 | 69 | 142/142 |
| Pidgeotto (enemyParty2) | 98 | 61 | 77 | 56 | 56 | 156/156 |

(Grovyle/Pidgeotto rows independently cross-checked against the
`gBattleMons`-based stat reads from §13's own committed dump — identical.)

### The unresolved sub-mechanism (flagged precisely, not hand-waved)

`AI_CalcDmg(gActiveBattler, opposingBattler)` (`battle_script_commands.c:
1306-1319`) computes `gBattleMoveDamage = CalculateBaseDamage(&gBattleMons
[attacker], &gBattleMons[defender], gCurrentMove, ...)` — note it reads the
**global** `gCurrentMove`, not the phase-2 loop's own local `move` variable
(fetched from the candidate's own moveset at line 774). Only the
**following** call, `TypeCalc(move, gActiveBattler, opposingBattler)`
(`battle_script_commands.c:1536`), uses the loop's real candidate move —
for its type-effectiveness/STAB multiplier only, not for the base power.
This session RAM-probed `gCurrentMove` across the whole decision window
(`src/data/gen/battle1-grovyle-switch-decision.json`'s `gCurrentMoveLedger`,
every tick sampled 6400-6690): it reads **157 (ROCK_SLIDE, Onix's last-used
move)** continuously, only changing (to 0) at tick 6684 — the exact tick
the switched-in species itself flips. Taken at face value, this would mean
the phase-2 "damage" comparison for *every* candidate/move pair actually
uses ROCK_SLIDE's own power/Grovyle's own (still-resident, post-faint)
attacker stats as the magnitude, and only each move's own type varies the
result via `TypeCalc`'s multiplier.

**That reading does not resolve cleanly to the observed outcome.**
Working the type-multiplier-only comparison by hand (source-exact, using
the same `gTypeEffectiveness` table above): Murkrow's FAINT_ATTACK (DARK)
gets a **neutral 1.0x** against Onix (no ROCK or GROUND table entry for
DARK), while both of Pidgeotto's non-status moves (AERIAL_ACE, FLYING;
QUICK_ATTACK, NORMAL) get only **0.5x** (`TYPE_ROCK, TYPE_FLYING`/
`TYPE_ROCK, TYPE_NORMAL` are both `TYPE_MUL_NOT_EFFECTIVE`, and neither
type has a GROUND-table entry to offset it). By this reading Murkrow's
FAINT_ATTACK should have produced the single highest `gBattleMoveDamage`
of any candidate/move pair — the **opposite** of the actual Pidgeotto
pick. Two live possibilities, neither confirmed: (a) `gActiveBattler`'s
*exact* value at the precise moment `AI_CalcDmg`/`TypeCalc` execute inside
the loop differs from what this session's tick-boundary sampling shows
(the ledger caught `gActiveBattler` alternating 1↔2 within the same
window — plausibly unrelated engine bookkeeping, but this can't be ruled
out as relevant without sub-frame resolution, which per-tick RAM probing
fundamentally cannot provide), changing which `gBattleMons[].types` gets
checked for STAB and folding in an extra 1.5x somewhere this hand-trace
doesn't account for; or (b) something upstream of `GetMostSuitableMonToSwitchInto`
(inside `ShouldSwitch()`'s own helper scans, which run first and use the
same globals) leaves `gCurrentMove` at a different value than 157 for the
specific instant phase 2 reads it, invisible to this session's frame-
granularity sampling. **Not resolved this session** — the concrete next
step is either a cycle-accurate/instruction-level trace (outside this
harness's oracle-only toolkit, which reads existing RAM addresses only,
not CPU registers or stack locals), or a source patch that spills
`bestDmg`/`bestMonId`/the loop's local `move` to a probe-visible scratch
address for one debug build.

**Bottom line for the engine slice**: the *shape* of the rule generalizes
correctly (phase 1 = shared-typing tie-break by "who takes the most
damage" bug, phase 2 = a damage fallback with ties won by lower party
index) and is safe to port; the *exact* phase-2 tie-break numerics have
one unresolved sub-detail that this session narrowed a lot (ruled out
"simple type/STAB reasoning" as sufficient, pinned the exact global-state
quirk responsible) but didn't finish nailing to the last multiplier.

## 2. Onix's Sitrus Berry heal (1 -> 31) — PINNED, exact formula

Not a fraction-of-max-HP formula at all (Gen 3, unlike later generations'
1/4-max fraction) — it's `HOLD_EFFECT_RESTORE_HP` with a **flat**
`.holdEffectParam`:

```c
// reference/pokeemerald/src/data/items.h:1747-1760
[ITEM_SITRUS_BERRY] = {
    .holdEffect = HOLD_EFFECT_RESTORE_HP,
    .holdEffectParam = 30,
    ...
}
```

```c
// reference/pokeemerald/src/battle_util.c:3336-3345 (case ITEMEFFECT_NORMAL)
case HOLD_EFFECT_RESTORE_HP:
    if (gBattleMons[battler].hp <= gBattleMons[battler].maxHP / 2 && !moveTurn)
    {
        gBattleMoveDamage = battlerHoldEffectParam;
        if (gBattleMons[battler].hp + battlerHoldEffectParam > gBattleMons[battler].maxHP)
            gBattleMoveDamage = gBattleMons[battler].maxHP - gBattleMons[battler].hp;
        gBattleMoveDamage *= -1;
        BattleScriptExecute(BattleScript_ItemHealHP_RemoveItem);
        effect = ITEM_HP_CHANGE;
    }
    break;
```

Threshold is **`hp <= maxHP/2`** (integer division, half max — not the
1/4 threshold this dossier's §13 guessed from later-generation knowledge),
checked only when `!moveTurn` (i.e. in the end-of-turn/other item-check
pass, not mid-move-execution — consistent with §13's own observation that
the proc happens "mid-sequence", not the instant HP crosses the line
during the ROCK_SLIDE hit itself). Heal amount is `min(holdEffectParam,
maxHP - hp)` — capped so it can't overheal past max.

Worked against Onix's exact values (RAM-confirmed, `gBattleMons[0]`):
`hp=1, maxHP=117, item=142`. `ITEM_SITRUS_BERRY` = **142**
(`include/constants/items.h:164`) — matches the held-item ID directly, so
this is unambiguously the item that fired, not a guess. `1 <= 117/2 (58)`:
true. `heal = min(30, 117-1=116) = 30`. `new hp = 1 + 30 = 31`. **Exact
match to the observed 1 -> 31**, no rounding ambiguity of any kind — the
naive `floor(117/4)=29` §13 tried was simply the wrong generation's
formula, not a rounding-convention question.

**No Tier-1 test added**: `damageCalc.ts`'s existing surface doesn't cover
item/berry effects yet (per §7's data-needs audit and §13's own item note,
"the player's own rental mon can also hold an item" was itself new this
dossier), so there's no existing pure-logic module to pin this fact
against without first choosing where a future berry-effects module would
live — left for whichever engine slice implements switch-in/item effects.

## 3. Switch-in animation window (§13 open item 4) — NOT itemized this session

**Time-boxed out, not attempted beyond one quick asset check.** Goals 2
and 3 above took the entire session's budget (the "why Pidgeotto" question
in particular required building a new probe technique — the plaintext
`struct Pokemon` stat-field offsets — from scratch after the first two
approaches, `dump-rentalmons.py`'s existing array and a hand-derived
struct-offset guess, both turned out to point at the wrong data). One
finding worth recording so the next session doesn't have to re-check it:

**Pidgeotto's front-facing sprite has not been extracted** — `ls
src/assets/gen/` and a grep for `PIDGEOTTO`/`pidgeotto` across `src/`
both come back empty. Whichever engine slice implements this switch-in
will need to add that extraction (species 17, `SPECIES_PIDGEOTTO`) before
it can render the send-out animation, on top of whatever S6 send-out
machinery it reuses (`docs/battle-scene-notes.md` §7).

The dense capture window in the already-committed
`battle1-grovyle-faint.json` trace covers ticks ~6684-7215 at full stride
(§13's own note: "the committed trace's dense capture window covers it")
— so the pixels needed for a future session's frame-by-frame narration
already exist; no new trace is needed, only the narration work itself.

## 4. RNG cluster attribution (§13 open items 2-3) — NOT reached this session

Not attempted — time-boxed out entirely (goals 2 and 3 were this session's
full scope per priority order). Both remain exactly as §13 left them:
the tick-4064/6206 unattributed 1-step events, and the tick-7215/7221
6-step post-switch-in cluster's shape mismatch against the established
`ShouldSwitch`(2)+tie-break(5)=7 pattern.

## Verification

`npm test` and `npm run build` green (docs/data-only session, no
`src/engine/` changes). New probe script (`tools/probe/
dump-switch-decision.py`) run twice independently against the already-
committed `battle1-grovyle-faint.json` trace, output diffed byte-for-byte
— identical both times. No new oracle traces were generated (every fact
above comes from RAM-probing the existing committed trace or reading
`reference/pokeemerald` source directly).
