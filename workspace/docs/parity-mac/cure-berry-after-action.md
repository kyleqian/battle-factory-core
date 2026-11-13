# The game's item check after every action: cure berries of the player's Pokemon (lead "cure berries after Pursuit-on-switch", #214) — fixed

Mac parity lane, fourth pass. No replay battle shows this. Proof: a Mechanic Lab scenario on the real ROM (below) and
the source.

## What it changes for the game

After every action the game checks the held item of the **player's** Pokemon once more. If it has a status and holds
the berry that cures it, the berry is eaten right then. The engine did this check only for White Herb. Two cases reach
the difference:

- The player uses Pursuit on an opponent that switches out, and the leaving Pokemon's Static, Poison Point, Flame Body
  or Effect Spore strikes. The game cures the player's Pokemon right after the switch. The engine cured it later, at
  the end-of-turn item step. In between the game sorts the two Pokemon by speed for the end-of-turn effects; a
  paralysed Pokemon has a quarter of its speed. So the order of sandstorm / hail damage, Leech Seed and poison could be
  the other way round, and with it who faints first in a double faint.
- A player's Pokemon that comes in with a status and its cure item is cured right after it comes in (the opponent's
  is not: it waits for its next item step).

Both are rare in the Level 50 Factory. No Pursuit set holds a cure berry (Scope Lens, Silk Scarf, Focus Band, King's
Rock, Focus Band, Leftovers), so the first case needs the berry to arrive by Trick. It was not proven unreachable, so
it is fixed.

## C source

- `HandleAction_TryFinish` (`battle_util.c:638-645`) runs after every action and calls `HandleFaintedMonActions`.
- Its state 6 (`:1958-1965`): `AbilityBattleEffects(ABILITYEFFECT_INTIMIDATE1, ...)`, `ABILITYEFFECT_TRACE`,
  `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)`, `ABILITYEFFECT_FORECAST`. The item call names battler 0 and
  `moveTurn = TRUE`.
- `ItemBattleEffects`, case `ITEMEFFECT_NORMAL` (`:3331-3622`): with `moveTurn` TRUE, Leftovers, the HP / PP berries
  and the stat berries do nothing (`:3337`, `:3348`, `:3401`, `:3429-3442`). White Herb (`:3384`) and the eight cure
  items (Cheri, Pecha, Rawst, Aspear, Chesto, Persim, Lum Berry, Mental Herb: `:3500-3594`) have no such gate.
- Why a status can still be there: `BattleScript_PursuitDmgOnSwitchOut` ends with
  `moveendfromto MOVEEND_ON_DAMAGE_ABILITIES, MOVEEND_CHOICE_MOVE` (`battle_scripts_1.s:3143`). That runs the contact
  abilities (step 3) and skips `MOVEEND_ITEM_EFFECTS_ALL` (step 11), which cures both Pokemon after every ordinary
  move. All other scripts that end with a partial move-end were read: Triple Kick runs the full item step after each
  hit (`:1418`); the multi-hit tail (`:653-654`) and the Rage tail (`:3534-3535`) include step 11.
- The end of the turn starts by sorting the battlers by speed (`DoFieldEndTurnEffects`, `ENDTURN_ORDER`); the
  end-of-turn item step (`ENDTURN_ITEMS1`) comes after the weather.

## Engine and fix

`src/engine/battleScriptFaintedActionsOrchestration.ts`, `runPendingSwitchinEffects` (the engine's state 6) had the
White Herb case only. It now makes the same call for battler 0 through
`runBattleScriptItemEffectNormalOnMoveTurn` (`battleEndTurnOrchestration.ts`), which is the end-of-turn item pass with
`moveTurn` TRUE. The two modules now import one function from each other; both are used inside functions only.

Not changed: the game also writes `gLastUsedItem` in this call when nothing fires. The engine keeps its value in that
case, as before (it is read by item messages only, and each of them is preceded by its own item check).

## ROM proof (Mechanic Lab, Scene OFF, `challengeNum 0`, base sets `[156,149,180]` / `[184,188,135]`)

`overrides.parties`: player Tyranitar (Sand Stream, four Perish Song), Jolteon (Cheri Berry; Pursuit, Splash x3),
Blissey; opponent Ampharos (Static, four Splash), Ivysaur, Bayleef (four Splash each). Decisions: Perish Song; switch
to Jolteon; Splash; Pursuit; Splash; Splash. At Perish count 0 the opponent's AI switches Ampharos out
(`ShouldSwitchIfPerishSong`), on the turn Jolteon uses Pursuit. Static is a one-in-three roll: seeds 501 to 511 were
run, it struck on 502 and 503.

Seed 502, with the Cheri Berry:

| frame | what the ROM shows |
|---|---|
| 2979 | Pursuit hits the leaving Ampharos (135 -> 95 HP) |
| 2988 | Jolteon is paralysed (`status1` 0x40) |
| 3282 | the replacement Ivysaur is in |
| 3412 | Jolteon's paralysis is gone: the berry check after the switch action |
| 3802 | sandstorm damage to **Jolteon** (124 -> 116) |
| 3963 | sandstorm damage to Ivysaur (135 -> 127) |

Seed 502, the same battle without the berry (control): Jolteon stays paralysed, and the sandstorm hits **Ivysaur
first** (frame 3661), then Jolteon (3818). So the order is decided by the paralysis, and with the berry the game has
cured it before the end of the turn starts. On every other turn of both runs, and in seed 501 where Static did not
strike, Jolteon (the faster one) is hit first.

## Tests (each fails on the unfixed code)

- `tests/parityMacCureBerryAfterAction.test.ts`: a whole turn through the reducer with the ROM run's shape (the player
  uses Pursuit, the trainer switches out, Static strikes, sandstorm). With the berry: the cure message comes before
  "the sandstorm rages" and the player is hit first. Without it (passes on both): the replacement is hit first.
- `tests/battleScriptFaintedActionsOrchestration.test.ts`: state 6 cures battler 0 with a Cheri, a Chesto and a Lum
  Berry; it leaves battler 1's berry alone; Leftovers does nothing there.
