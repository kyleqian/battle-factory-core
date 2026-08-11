# Beat Up — source audit and OFF receipt

Scope: source and stock-ROM Battle Scene OFF evidence only; no engine change.

## Exact source contract

- The handler starts at `gBattleCommunication[0]`, scans the full six-record
  party array, and accepts a record only if HP is nonzero, species-or-egg is
  neither NONE nor EGG, and `MON_DATA_STATUS` is zero. It does **not** exclude
  the active attacker's party index; a healthy attacker is a hitter
  (`reference/pokeemerald/src/battle_script_commands.c:8957-9007`).
- Its integer formula, including ordering/truncation, is:
  `damage = baseAttack(member) * power; damage *= level(member)*2/5 + 2;
  damage /= baseDefense(target species); damage = damage/50 + 2;` then, only
  under Helping Hand, `damage = damage*15/10` (`:8988-8994`). There are no
  `/256` scalings in this handler. It draws zero RNG.
- If the target is already faint it takes the end pointer. After exhaustion,
  a nonzero saved pre-loop index takes the end pointer; only initial index zero
  takes the initial-failure pointer (`:8966-9005`). The shell makes one initial
  ordinary accuracy draw, then each eligible record reaches `critcalc` and
  `adjustnormaldamage`, bypassing ordinary `damagecalc` and `typecalc`
  (`data/battle_scripts_1.s:1940-1971`).

## Reproducible OFF receipt

Fixture: `tools/battle-lab/mechanic-beat-up-statused-off.json`; raw probe
ledger: `docs/fixtures-beat-up-statused-off.json`. Crobat has only Toxic and
acts before Sneasel. The first turn genuinely poisons Sneasel
(`status1=0x80`); the next Beat Up receives a three-member player party with
one statused record.

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/run-mgba-probe.py /tmp/beatup.json -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/probe/audit-frontier-tail-off.py \
  tools/battle-lab/mechanic-beat-up-statused-off.json /tmp/beatup.json
```

At ticks 276–623, `gBattleCommunication[0]` runs `0→2→3→6`: slot 0 is
skipped for poison, then slots 1 and 2 are the exactly two hitters. The local
draw ledger is initial accuracy `9420→9421`, first hitter crit/variance
`9421→9422→9423`, second hitter `9423→9424→9425`; target HP is `160→157→154`.
The same second turn repeats the two-hitter shape (`9432→9433→9434` then
`9434→9435→9436`). No Focus Band is present.
