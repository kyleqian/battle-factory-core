# Bide attack-canceler — Battle Scene OFF evidence

The two Mechanics Lab scenarios are legal Level-50 Factory parties with only
active loadout replacements. Their trace uses ordinary controller input to
select Bide; the stock ROM supplies every hit, PP change, status bit, and
turn. No scenario requests HP, status, volatile, weather, target, or outcome
injection. `tools/probe/stage-bide-off.py` stages the same request through
`BattleLab`, then reads the intentionally non-public narrow fields only after
each emulated frame. Run it through `tools/run-mgba-probe.py`.

## Positive accumulation

`mechanic-bide-positive-off.json` gives the player Bide (117) and the
opponent Tackle (33). In the compact receipt
`tests/fixtures/bide-off-evidence.json`, Bide sets player `status2=0x1200`
(counter 2 plus `STATUS2_MULTIPLETURNS`) at tick 237. A later ROM Tackle
reduces player HP 111→91 and stores `gBideDmg[0]=20` with
`gBideTarget[0]=1` at tick 387. The automatic Bide action observes counter
1 at tick 402, then at tick 518 clears the counter bits only, retains
multi-turn, selects `MOVE_BIDE`, restores saved target 1, and writes
`gBattleScripting.bideDmg=40` before `BattleScript_BideAttack`. The attack
script clears multi-turn at tick 521 and damages the opponent 129→89 at tick
732. The target's own Bide accumulator then records that 40 damage; this is
the normal `datahpupdate` bookkeeping, not a second player release.

## No-energy release

`mechanic-bide-zero-off.json` substitutes the opponent's legal no-damage
Splash (150). It sets the same 2→1 counter progression (ticks 256/277), with
both HP values unchanged and `gBideDmg[0]=0`. At tick 706 it reaches counter
zero, keeps multi-turn until the release script, preserves zero scripting
damage, does not replace the target, and enters
`BattleScript_BideNoEnergyToAttack`; that script clears multi-turn at tick
709 with no HP change.

## Source ownership

- `Cmd_setbide` sets multi-turn, clears the attacker's accumulation, and ORs
  `STATUS2_BIDE_TURN(2)` in
  `reference/pokeemerald/src/battle_script_commands.c:7121-7129`.
- `Cmd_datahpupdate` adds ordinary received damage and stores its source in
  `reference/pokeemerald/src/battle_script_commands.c:1905-1929`.
- `CANCELER_BIDE` decrements the encoded turn counter, doubles nonzero
  accumulation, selects the saved target, and branches to the attack or
  no-energy script in `reference/pokeemerald/src/battle_util.c:2220-2249`.
- The scripts themselves are at
  `reference/pokeemerald/data/battle_scripts_1.s:3287-3319`; the release
  scripts own the subsequent `clearstatusfromeffect` behavior.

The probe intentionally makes no claim about individual RNG calls from these
endpoints. It also does not stage the doubles-only absent-target fallback;
singles has no absent battler in either legal run.
