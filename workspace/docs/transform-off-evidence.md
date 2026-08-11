# Transform — source audit and OFF receipt

Scope: source and stock-ROM Battle Scene OFF evidence only; no engine change.

## Exact source contract and dossier correction

- The command marks `gChosenMove` unavailable and fails on target transformed
  or semi-invulnerable status; otherwise it sets `STATUS2_TRANSFORMED`, clears
  `disabledMove`, `disableTimer`, and `mimickedMoves`, saves target personality,
  and copies raw bytes `[0x00, 0x24)` from target battle mon before resetting
  PP to `min(base PP, 5)` (`reference/pokeemerald/src/battle_script_commands.c:7764-7805`).
- The exact copied range is species; five battle stats; four moves; the
  IV/egg/ability-number word; eight stage bytes; ability; two types; and the
  `unknown` byte (`include/pokemon.h:260-281`). It explicitly does **not**
  copy PP, HP, level, friendship, max HP, item, nickname, PP bonuses, OT name,
  experience, personality, status1, status2, or OT ID (`pokemon.h:281-294`).
  This is the needed dossier precision correction: personality is saved only
  in `DisableStruct`, not copied into the user.
- The emitted controller command is `CONTROLLER_RESETACTIONMOVESELECTION`
  (enum value 54) with case `RESET_MOVE_SELECTION` (2), exactly the two-byte
  `gBattleBufferA[attacker]=[54,2]` packet (`battle_controllers.c:1568-1573`,
  `battle_controllers.h:128-132,240`). Handler RNG is zero.
- `gTransformUsedStringIds[0]` is TRANSFORMED and `[1]` is FAILED
  (`include/constants/battle_string_ids.h:504-505`; `battle_message.c:1060-1064`).
  The fixed shell calls this table after animation (`data/battle_scripts_1.s:947-956`).

## Reproducible OFF receipt

Fixture: `tools/battle-lab/mechanic-transform-ditto-off.json`; raw probe
ledger: `docs/fixtures-transform-ditto-off.json`.

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/run-mgba-probe.py /tmp/transform.json -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/probe/audit-frontier-tail-off.py \
  tools/battle-lab/mechanic-transform-ditto-off.json /tmp/transform.json
```

At tick 64, Ditto becomes Snorlax: copied stats are `[161,84,49,83,128]`,
moves `[153,153,153,153]`, ability 17, types `[0,0]`, stages all 6, and PP is
`[5,5,5,5]` (Explosion’s base PP is 5). The same transition records transformed
status2 `0x00200000`, saved target personality 50, and controller packet
`[54,2]`; `sRandCount` remains 9419. Ditto's uncopied battle personality stays
15, demonstrating the byte boundary rather than merely asserting it.
