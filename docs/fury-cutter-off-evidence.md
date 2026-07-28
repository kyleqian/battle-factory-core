# Fury Cutter — Battle Scene OFF evidence

This is an evidence checkpoint for `B_SCR_OP_FURYCUTTERCALC` only; it does
not register an opcode or change production battle code. The hermetic source,
fixture, and scenario assertion is `tests/furyCutterOracleEvidence.test.ts`.

## Source contract

`furycuttercalc` is operandless opcode `0xb5` (one byte). It owns the `u8`
`gDisableStructs[gBattlerAttacker].furyCutterCounter`, so ownership follows
the acting battler regardless of player/opponent side. On `MOVE_RESULT_NO_EFFECT`
(missed, immunity, or failed), it writes zero and jumps to
`BattleScript_MoveMissedPause`; otherwise it increments only below five,
sets `gDynamicBasePower` to the current move power, doubles once per count
after the first, and advances one byte. Fury Cutter's base power is 10, so
the source ladder is counter 1–5 → power `[10, 20, 40, 80, 160]`.

The real effect's order is `attackcanceler → attackstring → ppreduce →
accuracycheck → furycuttercalc → critcalc → damagecalc → typecalc →
jumpifmovehadnoeffect (back to furycuttercalc) → adjustnormaldamage`.
Consequently PP is paid before accuracy, and generic accuracy/critical/random
damage own RNG—not `Cmd_furycuttercalc` itself. The command sets neither
`STATUS2_MULTIPLETURNS` nor `gLockedMoves`: it is not a forced multi-turn
lock and each ordinary use must be selected and pays PP.

The complete source clear inventory is deliberate:

- the command's `MOVE_RESULT_NO_EFFECT` branch;
- `CancelMultiTurnMoves` (including the Protect gate reached from
  `Cmd_ppreduce` and other generic interruption paths);
- `ClearFuryCutterDestinyBondGrudge` for a used item and a failed player run;
- `SwitchInClearSetData` and `FaintClearSetData`, each zeroing the whole
  active `DisableStruct`. Baton Pass restores a limited list that excludes
  Fury Cutter.

There is no normal-other-move/history clear in the handler. Thus this pinned
Emerald source preserves a prior counter through a normal intervening move;
the dedicated Double Team route below observes that behavior. This is source
behavior, even if it differs from a broader-series expectation.

## Legal OFF observations

All three fixtures use `overrides.parties` with exactly three complete,
checksummed legal Pokémon on each side. The active player is the actual
Level-50 Factory carrier `FRONTIER_MON_GROVYLE_1` (set 188: Fury Cutter,
Endeavor, Brick Break, Double Team; Relaxed; Bright Powder). The opponent is
legally constrained by giving all four active move slots the same move;
decisions remain ROM AI decisions.

`mechanic-fury-cutter-grovyle-four-hits-off.json` twice produced the identical
manifest `9ca031eeb44d2279d42dd8faec7f308b072f39256574b3808ff83f784b2057c9`
(scenario `723ad99f1a1e0090847d157c22ace141e3495a08ceb0fe3207b7610aa6dfb553`).
The player Fury Cutter PP was `20→19→18→17→16`; Chansey HP was
`362→327→293→227→93` at frames 0/300/900/1500/2400. These are four real
manual selections, not a lock.

Do not derive equal damage from that sequence: the first hit has a different
critical/random context from the later hits. The source power ladder above is
the arithmetic claim; framebuffer/RNG/HP values are independent observations.

`mechanic-fury-cutter-grovyle-interruption-off.json` twice produced
`eb76399c874131a91865415b44a6855fdc4f4006443c08fe8f150701cf5e3ce7`
(scenario `dadd4a39d9e7b8b1ae207850ca0a09816d1f3b5ea72a601a330dce85b76a361f`).
After two hits (Chansey 293), real Double Team spends its own PP and raises
evasion, then the next manually selected Fury Cutter reaches HP 224. This is
the positive persistence path, not a claim about equal damage rolls.

`mechanic-fury-cutter-grovyle-protect-reset-off.json` twice produced
`7a7a04d82c66015dfb6fc9e4ebc7beb3aa0562a279f955e09be2a1e2e9dbf9d3`
(scenario `08acb5e281508d0a75bb81a36ddc47fbbf30adb72fc03c1552fd1c32f0f4da71`).
Its constrained real Protect route has three PP-spending, zero-damage Fury
Cutter attempts at frames 300/900/1500 before a later ROM hit reaches HP 343.
The hidden reset is source-pinned through Protect's `CancelMultiTurnMoves`;
the OFF manifest does not expose the counter itself.

## Observable boundary

OFF manifests expose raw frame hashes, RNG, active HP/PP/moves/statuses,
party checksums, and controller state. They do not expose the Fury Cutter
counter, dynamic power, move-result flags, battle-script PC, attacker/target
indices, critical flag, or random-damage multiplier. `tests/fixtures/
fury-cutter-off-evidence.json` source-pins those hidden semantics and all
scenario/manifest hashes.
