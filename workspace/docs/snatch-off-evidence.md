# Snatch — source audit and OFF receipt

Scope: source and stock-ROM Battle Scene OFF evidence only.

## Exact source contract

- `Cmd_trysetsnatch` first sets the attacker's
  `ppNotAffectedByPressure`; it fails only when
  `gCurrentTurnActionNumber == gBattlersCount - 1`, otherwise arms that
  attacker's `ProtectStruct.stealMove`. It has no RNG
  (`reference/pokeemerald/src/battle_script_commands.c:9553-9565`; shell:
  `data/battle_scripts_1.s:2543-2553`).
- After Magic Coat, attack canceler scans **turn order** `i=0..count-1`,
  specifically `gBattlerByTurnOrder[i]`, and accepts the first armed battler
  for a `FLAG_SNATCH_AFFECTED` move. It calls `PressurePPLose(attacker,
  winner, MOVE_SNATCH)`, clears only that winner's bit, writes the winner to
  `gBattleScripting.battler`, pushes the current canceler PC, and enters
  `BattleScript_SnatchedMove` (`battle_script_commands.c:915-982`). Thus
  priority is action order, not battler ID; the stack must return to the
  same PP-admission/canceler continuation.
- The resume script prints/PP-reduces the stolen move, calls
  `snatchsetbattlers`, emits animation/message, sets
  `ATTACKSTRING_PRINTED|NO_PPDEDUCT|ALLOW_NO_PP`, swaps attacker/target, and
  returns (`battle_scripts_1.s:3677-3686`). `snatchsetbattlers` saves the
  original attacker in `gEffectBattler`, makes the snatcher attacker/target
  for self-targeted moves (otherwise only target), then restores scripting
  battler to the original attacker (`battle_script_commands.c:9869-9880`).
  Switch/reset cleanup clears `stealMove` (`battle_main.c:3292-3308`).

This agrees with `docs/attack-canceler-magic-coat-snatch-audit.md`. The
current barrier is correctly scoped but currently wrong in one detail for a
future general implementation: it iterates battler IDs rather than
`gBattlerByTurnOrder` (`src/engine/battleScriptAttackCancelerOpcode.ts:195-214`).

## Reproducible OFF receipt

`tools/battle-lab/mechanic-snatch-synthesis-off.json` uses complete parties:
Banette Snatch (player) versus a Venusaur constrained to Synthesis. It is
legal mechanicLab staging even though the Factory corpus contains no Snatch
carrier. Read with the reusable probe and wrapper command in the Lock On doc.

At frame 41 Banette's `stealMove` becomes true with zero draws
(`sRandCount=9419`, `gRngValue=0xa15ab8e2`); its normal Snatch PP goes 10→9
at 61. The opponent begins Synthesis at 242. The canceler clears the winner
flag at 243, its Synthesis PP goes 5→4 at 273, and at 274 the receipt shows
the redirected self-effect roles `attacker=0,target=0,effectBattler=1`:
Banette receives the self-targeted effect while Venusaur is retained as the
effect/source battler. No random draw occurs through the redirect. This
captures ordering, PP ownership, flag consumption, and effect attribution;
the source pins the required push/return contract not directly exposed as a
single RAM field.
