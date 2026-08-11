# Low Kick / `B_SCR_OP_WEIGHTDAMAGECALCULATION` evidence

This is a SIDE-lane source-and-Battle-Scene-OFF checkpoint only. It adds no
production interpreter, controller, renderer, or animation code.

`weightdamagecalculation` is opcode `0xDD`, exactly one byte with no operands.
It reads the current `gBattlerTarget`'s species, converts it through
`SpeciesToNationalPokedexNum`, and asks `GetPokedexHeightWeight(..., 1)` for
the Pokédex weight. The unit is a hectogram (0.1 kg), as `struct PokedexEntry`
states. It writes `gDynamicBasePower` then advances
`gBattlescriptCurrInstr++`. It has no `Random()` call, controller emission, or
controller-exec mark.

The source table's strict `>` probe means these exact inclusive ranges:

| Target weight | Metric weight | Dynamic base power |
| --- | --- | --- |
| 0–99 hg | 0.0–9.9 kg | 20 |
| 100–249 hg | 10.0–24.9 kg | 40 |
| 250–499 hg | 25.0–49.9 kg | 60 |
| 500–999 hg | 50.0–99.9 kg | 80 |
| 1000–1999 hg | 100.0–199.9 kg | 100 |
| 2000 hg and above | 200.0 kg and above | 120 |

`MOVE_LOW_KICK` is `EFFECT_LOW_KICK`, stored power 1, Fighting, accuracy 100,
PP 20, selected target, priority 0. Its script order is `attackcanceler`,
`attackstring`, `ppreduce`, this opcode, then `accuracycheck`, then the normal
hit path. `Cmd_damagecalc` passes `gDynamicBasePower` into
`CalculateBaseDamage` before applying crit and `dmgMultiplier`; action finish
resets the accumulator to zero. Thus the command supplies dynamic base power,
not a direct HP update or a target choice.

Two complete-party legal OFF fixtures pin public outcomes:

- [`mechanic-low-kick-machoke-chansey-off.json`](../tools/battle-lab/mechanic-low-kick-machoke-chansey-off.json): Chansey's source weight is 346 hg, selecting the 60-power bracket. Splash spends Chansey PP at frame 75; Low Kick spends Machoke PP (`20 → 19`) at frame 225; at frame 550 Chansey is `131/357` and the frame visibly says `It's super effective!`. Scenario SHA-256 `26a8aff4…78e7b180`, two full manifests byte-identical at `d5b814ed…6d6649e5`.
- [`mechanic-low-kick-machoke-snorlax-off.json`](../tools/battle-lab/mechanic-low-kick-machoke-snorlax-off.json): Snorlax's source weight is 4600 hg, selecting the 120-power bracket. Low Kick spends Machoke PP (`20 → 19`) at frame 75; at frame 400 Snorlax is `47/267` with the same visible effectiveness message; its constrained real Splash spends PP only later at frame 500. Scenario SHA-256 `5644b6da…caa92b2d`, two full manifests byte-identical at `037869eb…3b6604b94`.

Every claimed state frame is in its fixture's 25-frame capture grid (frames
0–625); both scenarios use six complete legal party records and real AI,
constrained only by four Splash move slots. These prove two publicly distinct
weight tiers, PP order, HP result, and message without trying to infer hidden
intermediates from pixels.

Source-only boundaries: the public manifests do not expose script PC,
`gBattlerTarget`, `gDynamicBasePower`, base-damage/random intermediates, or
controller/RNG causality. The command itself does not test accuracy, type,
ability immunity, Protect, Substitute, or hit result; those interactions are
owned by `attackcanceler`, `accuracycheck`, and the downstream normal-hit/type
commands. In particular, a canceled move never reaches this command; a miss
can reach it because the command precedes `accuracycheck`; and Fighting
immunity/effectiveness is not decided here. The six brackets, strict boundary
semantics, target selection, PC, reset lifetime, and those failure/immunity
ordering facts are source-pinned rather than overclaimed as public proof.
