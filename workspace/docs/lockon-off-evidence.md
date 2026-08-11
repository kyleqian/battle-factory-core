# Lock On / Mind Reader — source audit and OFF receipt

Scope: source and stock-ROM Battle Scene OFF evidence only; no engine change.

## Exact source contract (including dossier corrections)

- `Cmd_setalwayshitflag` replaces, rather than ORs, the target's packed
  `STATUS3_ALWAYS_HITS` counter with `STATUS3_ALWAYS_HITS_TURN(2)`, writes
  `gDisableStructs[target].battlerWithSureHit = attacker`, then merely
  advances its bytecode PC.  It has no `Random()` call
  (`reference/pokeemerald/src/battle_script_commands.c:8134-8140`).
- The shell deducts PP first, rejects Substitute before accuracy, then calls
  the setter (`reference/pokeemerald/data/battle_scripts_1.s:1286-1297`). A
  non-Substitute Lock On therefore takes exactly its ordinary accuracy draw;
  Substitute takes none.
- Correction to the bit-only wording: both sure-hit consumers require **both**
  the packed status and `battlerWithSureHit == gBattlerAttacker`.
  `AccuracyCalcHelper` skips the ordinary roll for `ACC_CURR_MOVE`
  (`battle_script_commands.c:1054-1060`); the `NO_ACC_CALC_CHECK_LOCK_ON`
  form takes the same identity-qualified direct-advance path
  (`:1099-1111`). The future port must skip the ordinary accuracy draw in
  **both** forms only under that combined predicate.
- End turn subtracts `STATUS3_ALWAYS_HITS_TURN(1)` once per active battler
  (`reference/pokeemerald/src/battle_util.c:1738-1742`). Ordinary switching
  clears any other battler that saved the departing battler as sure-hit owner
  (`battle_main.c:3152-3171`); Baton Pass preserves the incoming
  `DisableStruct.battlerWithSureHit` and refreshes the opposing saved lock to
  two turns (`:3173-3187, 3206-3216`).

The two engine barriers are real and need this identity field, not a
bit-only shortcut: `src/engine/battleScriptHitChainOpcode.ts:898-905`
(`NO_ACC_CALC_CHECK_LOCK_ON`) and `:989-996` (`ACC_CURR_MOVE`).

## Reproducible OFF receipt

Fixture: `tools/battle-lab/mechanic-lock-on-consume-off.json` (complete
mechanicLab parties; Magneton uses Lock On, then Zap Cannon on the selected
second slot). Read it with:

```sh
/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/run-mgba-probe.py /tmp/lockon.json -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python tools/probe/audit-frontier-tail-off.py \
  tools/battle-lab/mechanic-lock-on-consume-off.json /tmp/lockon.json
```

The verified run starts at `sRandCount=9419`, `gRngValue=0xa15ab8e2`.
Lock On deducts PP 5→4 at frame 64; its ordinary accuracy call is the sole
local draw at frame 66 (`9419→9420`, post-draw `gRngValue=0xb237ecfd`). The
target's status becomes `0x10` at 443 and the end-turn decrement makes it
`0x08` at 446, with saved owner battler 0. On the next player action Zap
Cannon begins at 775 and deducts PP at 807. Its sure-hit `ACC_CURR_MOVE`
path takes no accuracy draw: the next draws are its later hit-calculation
draws at 808 (`9427→9428`, `0xed4a9095`) and 811 (`9428→9429`,
`0x4d51df24`), rather than an ordinary accuracy roll. The packed counter
survives through the turn, then expires at frame 1196. This is the required
one-accuracy-draw setter ledger plus next-turn always-hit consumption.

`sRandCount` is the source-static counter from `src/random.c:5,14`, read at
its pinned ROM address `0x020249c0`; the reusable probe records it together
with `gStatuses3`, `gDisableStructs`, PP, roles, and turn order.
