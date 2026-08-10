# Shell Bell MOVEEND hook-join ground truth

This Gate-6 family covers the `HOLD_EFFECT_SHELL_BELL` arm of the same
`MOVEEND_KINGSROCK_SHELLBELL` (state 12) dispatcher already certified for
King's Rock. It is a **different selector** — successful recorded target
damage, not a static move-flag table lookup — and this document re-derives
it from source independently of `docs/kings-rock-moveend-ground-truth.md`.

## 1. The dispatcher and the two arms it shares

`Cmd_moveend`'s state machine is one `do { switch (gBattleScripting.moveendState) { ... } } while (...)`
loop over 17 sequential states (`reference/pokeemerald/src/battle_script_commands.c:4210-4236`;
`MOVEEND_COUNT` = 17, `reference/pokeemerald/include/constants/battle_script_commands.h:410`).
State 12 is `MOVEEND_KINGSROCK_SHELLBELL`
(`reference/pokeemerald/include/constants/battle_script_commands.h:405`), and its case body
(`reference/pokeemerald/src/battle_script_commands.c:4336`, `// king's rock and shell bell`) calls
`ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)`. Inside `ItemBattleEffects`
(`reference/pokeemerald/src/battle_util.c:3257`), `atkHoldEffect`/`atkHoldEffectParam` are derived
from `gBattleMons[gBattlerAttacker].item` (`battle_util.c:3278-3288`) — i.e. this state always reads
the **current move's real attacker's** held item, exactly like King's Rock; the `battler` parameter
passed as `0` is unused by this case.

The `case ITEMEFFECT_KINGSROCK_SHELLBELL:` block (`battle_util.c:3769-3809`) is gated by one shared
outer guard, then a `switch (atkHoldEffect)`:

```c
if (gBattleMoveDamage)                     // battle_util.c:3770
{
    switch (atkHoldEffect)
    {
    case HOLD_EFFECT_FLINCH:  ...          // battle_util.c:3774-3786 (King's Rock; not this family)
    case HOLD_EFFECT_SHELL_BELL:           // battle_util.c:3787
        if (!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)
            && gSpecialStatuses[gBattlerTarget].shellBellDmg != 0
            && gSpecialStatuses[gBattlerTarget].shellBellDmg != IGNORE_SHELL_BELL
            && gBattlerAttacker != gBattlerTarget
            && gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP
            && gBattleMons[gBattlerAttacker].hp != 0)
        {
            gLastUsedItem = atkItem;
            gPotentialItemEffectBattler = gBattlerAttacker;
            gBattleScripting.battler = gBattlerAttacker;
            gBattleMoveDamage = (gSpecialStatuses[gBattlerTarget].shellBellDmg / atkHoldEffectParam) * -1;
            if (gBattleMoveDamage == 0)
                gBattleMoveDamage = -1;
            gSpecialStatuses[gBattlerTarget].shellBellDmg = 0;
            BattleScriptPushCursor();
            gBattlescriptCurrInstr = BattleScript_ItemHealHP_Ret;
            effect++;
        }
        break;
    }
}
```

Ordered runtime guards for this arm, exactly as evaluated: `gBattleMoveDamage != 0` (shared outer
guard, `battle_util.c:3770`) → `atkHoldEffect == HOLD_EFFECT_SHELL_BELL` (switch selection,
`battle_util.c:3787`) → `!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)` → `shellBellDmg != 0` →
`shellBellDmg != IGNORE_SHELL_BELL` → `gBattlerAttacker != gBattlerTarget` (no self-heal on
self-targeting moves) → attacker not already at full HP → attacker not fainted (`battle_util.c:3788-3793`).
Unlike King's Rock, **there is no `Random()` draw and no move-flag test** — Shell Bell's selector is
entirely the recorded `shellBellDmg` value plus attacker HP state, not a `moves.json` flag.

`ITEM_SHELL_BELL` (`reference/pokeemerald/include/constants/items.h:249`, id 219) is
`HOLD_EFFECT_SHELL_BELL` (id 62) with `holdEffectParam` 8
(`src/data/gen/item-hold-effects.json#items:ITEM_SHELL_BELL`), i.e. the divisor. The heal is
`max(1, floor(shellBellDmg / 8))`, applied as `gBattleMoveDamage = -heal` through
`BattleScript_ItemHealHP_Ret` (`reference/pokeemerald/data/battle_scripts_1.s:4377-4382`), which plays
the held-item animation on `BS_ATTACKER`, prints `STRINGID_PKMNSITEMRESTOREDHPALITTLE`, then runs
`datahpupdate BS_ATTACKER` to apply the negative (healing) damage to the attacker and re-sync its
health bar. `shellBellDmg` is cleared to 0 immediately before the script call so a given hit can heal
at most once.

## 2. Where `shellBellDmg` is recorded: `Cmd_datahpupdate`

`shellBellDmg` lives in `gSpecialStatuses[battler]` (`reference/pokeemerald/include/battle.h:142`,
`struct ResourceFlags`/`SpecialStatus`) and is reset to 0 once per turn (not audited here — turn-start
reset is out of scope; this document only re-derives the per-hit recording and suppression sites).
`IGNORE_SHELL_BELL` is `0xFFFF` (`reference/pokeemerald/include/battle.h:60-61`).

`Cmd_datahpupdate` (`reference/pokeemerald/src/battle_script_commands.c:1841-1985`) is the **only**
opcode that records `shellBellDmg` for a normal hit, and only when its operand resolves
`gActiveBattler` to the move's **target** (`datahpupdate BS_TARGET`, since `gActiveBattler` becomes
`gSpecialStatuses[gBattlerTarget]`'s owner in that case — the Shell Bell read at `battle_util.c:3789`
is always `gSpecialStatuses[gBattlerTarget]`, so only `datahpupdate BS_TARGET` calls are relevant to
this family; a script's `datahpupdate BS_ATTACKER` calls write `gSpecialStatuses[gBattlerAttacker]`
instead, which this arm never reads). Four sites inside `Cmd_datahpupdate` touch `shellBellDmg`, all
guarded by `if (gSpecialStatuses[gActiveBattler].shellBellDmg == 0)` (first-write-wins per turn):

- **Substitute absorbs the full hit** (`battle_script_commands.c:1870-1871`): `shellBellDmg =
  gBattleMoveDamage` (the raw damage, even though the sub — not the target — took it: Shell Bell
  still qualifies from *substitute* damage).
- **Substitute breaks** (`battle_script_commands.c:1878-1879`): `shellBellDmg =
  gDisableStructs[...].substituteHP` (the sub's remaining HP, i.e. the actual HP removed from the sub).
- **Direct HP damage, no substitute** (`battle_script_commands.c:1932-1933`): only reached inside the
  `else` branch of `if (gBattleMoveDamage < 0) {...} else {...}` (`battle_script_commands.c:1888-1936`),
  i.e. **only for non-negative `gBattleMoveDamage`** — a negative `gBattleMoveDamage` is an HP-gain
  write (draining moves applying the heal to the drainer) and never sets `shellBellDmg` at this site.
  It further requires `!(gHitMarker & HITMARKER_PASSIVE_HP_UPDATE)`, and the recorded value is
  `gHpDealt` — the HP actually removed (clamped to the target's remaining HP), which is 0 (not
  "recorded", since the later guard requires `!= 0`) if `gBattleMoveDamage` was 0.
- **`MOVE_RESULT_NO_EFFECT`** (`battle_script_commands.c:1980-1984`, the opcode's `else` branch): forces
  `shellBellDmg = IGNORE_SHELL_BELL` (immune/no-effect hits explicitly poison the value so a later
  successful hit this same evaluation can't retroactively qualify — moot for the guard at
  `battle_util.c:3788`, which independently re-checks `MOVE_RESULT_NO_EFFECT` itself).

## 3. Explicit suppression sites (`IGNORE_SHELL_BELL` writes outside `Cmd_datahpupdate`)

Two source sites force `shellBellDmg = IGNORE_SHELL_BELL` outside the opcode above, both **before**
any `datahpupdate` write can occur for that HP change, so the `shellBellDmg == 0` first-write guard
never lets a later `datahpupdate` overwrite the poison:

- **`Cmd_painsplitdmgcalc`** (`reference/pokeemerald/src/battle_script_commands.c:8049-8068`, `EFFECT_PAIN_SPLIT`
  / `MOVE_PAIN_SPLIT`): line 8063 sets `gSpecialStatuses[gBattlerTarget].shellBellDmg =
  IGNORE_SHELL_BELL` unconditionally as part of computing the split. `MOVE_PAIN_SPLIT`'s table power
  is 0 (`src/data/gen/moves.json#moves:MOVE_PAIN_SPLIT`), so it is already outside the `power != 0`
  candidate selector below (§4); this is confirmation, not an independent exclusion.
- **`HandleWishPerishSongOnTurnEnd`** (`reference/pokeemerald/src/battle_util.c:1795-1819`, the delayed
  Future Sight/Doom Desire hit): line 1816 sets `gSpecialStatuses[gBattlerTarget].shellBellDmg =
  IGNORE_SHELL_BELL` immediately before `BattleScriptExecute(BattleScript_MonTookFutureAttack)` runs.
  This differs from this run's existing Color Change ON_DAMAGE family exception for the same move
  (`src/data/gen/level50-move-parameterization.json#coverage.hookCatalogs.ability.onDamage.colorChange.sourceExceptionRows`),
  which excludes Future Sight because `BattleScript_FutureAttackEnd`'s `moveendfromto
  MOVEEND_ITEM_EFFECTS_ALL, MOVEEND_UPDATE_LAST_MOVES` **starts at state 11**, skipping
  `MOVEEND_ON_DAMAGE_ABILITIES` (state 3). State 12 (`MOVEEND_KINGSROCK_SHELLBELL`) is *inside* that
  `[11, 14]` range, so the delayed hit's MOVEEND traversal does reach state 12 — Shell Bell's Future
  Sight exclusion is **not** a state-reachability gap; it is the explicit `battle_util.c:1816` poison,
  which independently fails the `shellBellDmg != IGNORE_SHELL_BELL` guard regardless of which MOVEEND
  states run. `MOVE_DOOM_DESIRE` is not part of this run's 300-move Level-50 roster
  (`src/data/gen/level50-move-parameterization.json`), so it needs no separate roster row.

No other `shellBellDmg` or `IGNORE_SHELL_BELL` write sites exist anywhere in
`reference/pokeemerald/src/` or `reference/pokeemerald/include/` (exhaustive grep of both trees).

## 4. The finite Level-50 selector

Shell Bell's selector is **not** a `moves.json` flag (unlike King's Rock's
`FLAG_KINGS_ROCK_AFFECTED`). It is: does the move's Battle Script reach a `datahpupdate BS_TARGET`
that records a nonzero `shellBellDmg` on a normal (non-suppressed) hit? That is exactly the same
"successful target `datahpupdate` reachable from the entry script" route property this run already
computed and source-proved for the **Color Change** ON_DAMAGE family
(`src/data/gen/level50-move-parameterization.json#coverage.hookCatalogs.ability.onDamage.colorChange`),
whose selector is literally `gBattleMoves[move].power != 0`
(`tools/report/gate6-coverage-manifest.ts` Color Change `family.selector.guard` assertion) — the same
population, because the underlying graph/program route to `datahpupdate BS_TARGET` and its
fallthrough into `Cmd_moveend`'s do-while state sweep is identical machinery regardless of which
MOVEEND state a family reads (Color Change reads state 3; this family reads state 12 — both are
processed within the same unbroken `do { ... moveendState++ ...} while` sweep once a script's
`moveendall`/fallthrough reaches `Cmd_moveend`, so proving the route reaches state 3 without an
intervening `moveendto`/`moveendfromto` cap between 3 and 12 also proves it reaches state 12; the 105
King's Rock rows, which use the exact same route-to-state-12 helper, are a full subset of the 182
Color Change rows).

Reusing that already-proven 183-row `power != 0` candidate population and its 182-row proven
graph/program routes (183 = 182 proven + `MOVE_FUTURE_SIGHT`'s 1 exception), Shell Bell's census is:

- **Candidates: 183** — every Level-50 roster move with `moveTable.power != 0`.
- **Source-proven rows: 182** — every candidate except `MOVE_FUTURE_SIGHT`.
- **Source exception rows: 1** — `MOVE_FUTURE_SIGHT`, excluded for the `battle_util.c:1816` reason in
  §3 above (a Shell Bell–specific reason, not copied from Color Change's state-3 skip reason).
- **Excluded by construction (not candidates):** every `power == 0` roster move — status/support moves
  with no target `datahpupdate` route at all, plus `MOVE_PAIN_SPLIT` (§3, confirmed independently
  suppressed even though it is already outside the `power != 0` population).

This selector is strictly larger than, and not derived by inference from, King's Rock's 106-row
`FLAG_KINGS_ROCK_AFFECTED` selector — Shell Bell does not check that flag at all (§1), so moves like
`MOVE_STRUGGLE` or binding/multi-turn damage moves without `FLAG_KINGS_ROCK_AFFECTED` still qualify
for Shell Bell whenever they carry nonzero power and land a successful hit.

## 5. Runtime (non-selector) conditions

Everything below is per-battle-instance state, not part of the finite move-identity selector: the
attacker must currently hold Shell Bell; `gBattlerAttacker != gBattlerTarget` excludes only
self-targeting move instances (not the family, since ordinary damaging moves target the opponent);
the attacker must not already be at full HP and must not have fainted before this MOVEEND state runs
(e.g. it can faint later from residual damage, but not from this same hit's `datahpupdate` if that
hit was against the target, not itself); and the heal amount depends on the actual `shellBellDmg`
recorded for that hit (which can be a substitute-absorbed value per §2), not a fixed constant.

## 6. Evidence

Engine: `src/engine/battleScriptMoveEndOpcode.ts:883-969` (`MOVEEND_KINGSROCK_SHELLBELL` case,
`HOLD_EFFECT_SHELL_BELL` arm at lines 933-967) is a line-for-line port of `battle_util.c:3787-3806`:
same eight ordered guards, same `max(1, floor(shellBellDmg / holdEffectParam))` heal, same
`shellBellDmg` reset to 0, same jump to `BattleScript_ItemHealHP_Ret`. No engine divergence was found;
this is proof work only, not an implementation change.

Census, batch test, and oracle receipt: `src/data/gen/level50-move-parameterization.json#coverage.hookCatalogs.item.shellBell`,
`tests/shellBellHookJoinBatch.test.ts`, `tests/shellBellOracleEvidence.test.ts`,
`tools/battle-lab/mechanic-shell-bell-heal-off.json` (holder arm) and
`tools/battle-lab/mechanic-shell-bell-control-off.json` (no-item control arm, identical parties/trace, holder
item 0), `tools/probe/probe-shell-bell-heal-off.py`, `tools/probe/receipts/shell-bell-heal-off.json`.

The receipt stages a slower, defensively-invested Shuckle (player, Shell Bell holder) against a faster
no-item Swellow (opponent), both locked to Pound (100% accuracy, so neither side's hit can miss and leave the
seed's outcome ambiguous): Swellow's earlier action this same turn damages Shuckle (127→122 HP) *before*
Shuckle's own Pound lands on Swellow, satisfying the `gBattlerAttacker != gBattlerTarget` /
`hp != maxHP` / `hp != 0` runtime guards on the qualifying hit (`battle_util.c:3789-3793`) without needing a
second turn. Shuckle's hit records `gSpecialStatuses[Swellow].shellBellDmg = 7` (`battle_script_commands.c:1932-1933`)
then Shell Bell heals `max(1, floor(7/8)) = 1` HP (122→123) only in the holder arm; the no-item control arm's
holder HP never moves past the incoming Pound. Both arms consume byte-identical action-RNG values/order/counts
(only the wall-clock frame of later same-content draws differs, shifted by the heal arm's extra "restored HP a
little" message), and both sides spend exactly 1 PP in both arms. The full two-arm run (one `EmeraldOracle`
instance per arm via `tools/run-mgba-probe.py`, merged by a pure-Python pass with no emulator access) reproduced
byte-identically across two independent fresh runs.
