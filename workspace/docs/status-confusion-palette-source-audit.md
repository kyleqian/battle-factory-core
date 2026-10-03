# Status_Confusion OBJ ownership audit

This is a source/staging witness for a future semantic-event palette provider,
not an adapter registration or a framebuffer claim. It leaves the existing
status-animation history invalidation unchanged.

## Source route

`InitAndLaunchChosenStatusAnimation` selects `B_ANIM_STATUS_CONFUSION` only on
the `isStatus2` / `STATUS2_CONFUSION` branch
(`src/battle_gfx_sfx_util.c:421-454`). `LaunchStatusAnimation` then assigns
both `gBattleAnimAttacker` and `gBattleAnimTarget` to the affected battler,
starts the status script, and gives `Task_DoStatusAnimation` responsibility for
clearing `statusAnimActive` only after `gAnimScriptActive` falls
(`src/battle_anim_status_effects.c:543-563`).

`Status_Confusion` has exactly one resource load, `ANIM_TAG_DUCK`, calls
`ConfusionEffect`, and ends (`data/battle_anim_scripts.s:10156-10161,
10230-10233`). The effect creates five target ducks with phase offsets
0/51/102/153/204, wave period 3, and duration 90. The normal template uses the
same tile and palette tag, a 16x16 normal OBJ, the two four-frame flip
programs, and `AnimConfusionDuck` (`src/battle_anim_normal.c:39-72,
258-292`). That callback only establishes the affected-side direction/flip and
the private sprite motion/lifetime; it is not palette ownership. The generic
`loadspritegfx` command loads the matching sheet/palette and registers the
sprite index, while the generic unload path frees by tag
(`src/battle_anim.c:334-365`). The source inventory gives DUCK 0x180 tile bytes
and its own palette table entry (`src/data/battle_anim.h:1081-1088,
1374-1380`); `ANIM_TAG_DUCK` is 10073
(`include/constants/battle_anim.h:5-83`).

## Fresh legal staging witness

`tools/integration/confusionStatusSourceProbe.py` builds three complete legal
Golbat-42/Confuse-Ray-109 members against three complete legal
Haunter-93/Shadow-Punch-325 members (then reverses those sides). Haunter's
slot-0 ability is Levitate, so it is not Own Tempo. The trace uses only normal
A input across two stock turns. Run it via `tools/run-mgba-probe.py`, followed
by `tools/integration/verifyConfusionStatusSource.py`.

Fresh evidence directory:
`.integration/validation/worker-integration-20261002-223212/status-confusion-source-Ohxk56/` (four raw JSON files,
four wrapper logs, and `receipt.json`). Both fresh runs have byte-identical raw
output per orientation. The verifier proves:

- actual non-move script starts at `Status_Confusion+3` twice per orientation:
  application at `currentMove=109`, then the genuinely confused Haunter before
  its subsequent actual `Shadow Punch`;
- the script's attacker and target are the affected battler (1 for player-side
  Golbat, 0 for opponent-side Golbat); this is distinct from transient
  `gActiveBattler` bookkeeping;
- each status lifetime loads DUCK in OBJ bank 7 with `reserved=4`, then frees
  that tag after 99 observed frames (player 2579→2678 / 3171→3270; opponent
  2580→2679 / 3167→3266);
- a real Shadow Punch starts after the second cleanup (player tick 3314,
  opponent 3306) and allocates BENT_SPOON scratch in bank 9. Its unfaded and
  faded rows differ; the ignored receipt records hashes only, never colors.

The reference source hash set is recorded in the ignored receipt. In
particular, `battle_gfx_sfx_util.c` is
`510be3aa641aff55b336842230247e0eac19934842fece92cd05f3f223dba7fe` and
`battle_anim_normal.c` is
`b461e4ea25d3926b5a84b9816ad32eda1da2b51222c3acddb3b74cf0721687ff`.

## Bounded conclusion and resume condition

The future provider must model a semantic status-start event whose subject is
the launcher's attacker/target battler, own DUCK's load/cleanup independently
of private callback motion, and compose with later move allocation rather than
assuming the prior Shadow Punch bank. It must retain the current invalidation
rule unless it can prove this full lifecycle from its own live host event.

Next action: design that semantic event and a source-derived allocator with an
explicit `Status_Confusion` load-to-cleanup scope, then prove it on both
orientations and a non-Shadow-Punch follow-up. Do not reuse this RAM witness as
production palette data or promote any framebuffer/arbitrary-history claim.
