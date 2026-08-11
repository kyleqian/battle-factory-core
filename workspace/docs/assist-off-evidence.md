# Assist — source audit and OFF receipt

Scope: source and stock-ROM Battle Scene OFF evidence only; no engine change.

## Exact source contract and dossier correction

- The scan is `monId = 0..5`, then `moveIndex = 0..3`; it skips precisely
  `monId == gBattlerPartyIndexes[gBattlerAttacker]`, empty and Egg records,
  `NONE`, Sleep Talk, Assist, Mirror Move, Metronome, and each entry in
  `sMovesForbiddenToCopy` (`reference/pokeemerald/src/battle_script_commands.c:9484-9534`,
  `:8209-8219`). Thus it excludes the user's **party slot**, not every party
  record sharing the user's species. The resulting order is party slot then
  move slot, without deduplication.
- With candidates it clears `HITMARKER_ATTACKSTRING_PRINTED`, assigns
  `gCalledMove = validMoves[((Random() & 0xff) * count) >> 8]`, retargets
  through `GetMoveTarget`, and advances; there is one handler draw. No
  candidates takes the supplied failure pointer without a draw
  (`battle_script_commands.c:9524-9534`). This confirms the dossier except
  for its ambiguous “non-user” wording, corrected above.
- The fixed shell has no `ppreduce` before selection and ends
  `jumptocalledmove TRUE` (`data/battle_scripts_1.s:2367-2375`): the selected
  called move, not Assist, subsequently owns PP reduction and hit RNG.

## Reproducible OFF receipt

Fixture: `tools/battle-lab/mechanic-assist-order-off.json`; raw probe ledger:
`docs/fixtures-assist-order-off.json`. Sentret is active in slot 0; slot 1 is
`[Tackle, Sleep Talk, Mirror Move, Metronome]` and slot 2 is
`[Growl, Scratch, Pound, Splash]`. Therefore the exact candidate vector is
`[Tackle(33), Growl(45), Scratch(10), Pound(1), Splash(150)]`.

Run:

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/run-mgba-probe.py /tmp/assist.json -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/probe/audit-frontier-tail-off.py \
  tools/battle-lab/mechanic-assist-order-off.json /tmp/assist.json
```

At tick 62 the handler changes `sRandCount 9419→9420`, with post-draw
`gRngValue=0xb237ecfd`; its returned low byte is `0x37`, so
`(0x37 * 5) >> 8 = 1`, and the ledger records `gCalledMove=45` (Growl), the
second element of that exact vector. The foe has only Splash, preventing an
uncontrolled AI move choice.
