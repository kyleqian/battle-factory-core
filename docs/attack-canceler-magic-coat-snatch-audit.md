# Cmd_attackcanceler: Magic Coat and Snatch audit

Status: source and Battle Scene OFF evidence only. This is not an opcode,
machine, controller, or presentation implementation.

## Source order

After `AtkCanceler_UnableToUseMove`, moves-block ability handling, selected-slot
PP admission, and obedience, `Cmd_attackcanceler` checks Magic Coat **before**
Snatch (`reference/pokeemerald/src/battle_script_commands.c:915-1006`). Both
checks are after `HITMARKER_ALLOW_NO_PP` is cleared and after
`HITMARKER_OBEYS` is set. Neither calls `Random()`.

| intercept | predicate and ownership | immediate writes / handoff |
| --- | --- | --- |
| Magic Coat | `gProtectStructs[gBattlerTarget].bounceMove` and current move has `FLAG_MAGIC_COAT_AFFECTED` | calls `PressurePPLose(attacker, target, MOVE_MAGIC_COAT)`; clears the target's `bounceMove`; pushes the current `attackcanceler` PC; jumps to `BattleScript_MagicCoatBounce`. |
| Snatch | scans `i = 0..gBattlersCount-1` in `gBattlerByTurnOrder[i]` order; first battler whose `gProtectStructs[battler].stealMove` is set wins when the current move has `FLAG_SNATCH_AFFECTED` | calls `PressurePPLose(attacker, winner, MOVE_SNATCH)`; clears only the winning `stealMove`; writes winner to `gBattleScripting.battler`; pushes the current PC; jumps to `BattleScript_SnatchedMove`. |

`bounceMove` and `stealMove` are per-battler `ProtectStruct` bits (bits 4 and
5), cleared on switch-in/reset (`include/battle.h:104-124`,
`src/battle_main.c:3292-3308`). The setup moves are priority +4. Their script
opcodes set `ppNotAffectedByPressure`, fail when used last in turn, otherwise
arm the attacker's bit: Magic Coat also sets its target to self
(`battle_script_commands.c:9537-9565`; effect scripts at
`data/battle_scripts_1.s:2392-2401,2543-2553`).

The `PressurePPLose` call is deliberately distinct from ordinary selected-move
PP deduction: its first parameter must have Pressure, it searches the second
battler's four slots for Magic Coat/Snatch, decrements that slot if nonzero,
and emits a PP controller update for a permanent battler
(`src/battle_util.c:740-765`). It has no RNG.

## Resume scripts and global state

Both branches push the *same* attackcanceler PC and return, so their scripts
resume this command after their side effects.

- `BattleScript_MagicCoatBounce` prints/PP-reduces the original move, sets
  `ATTACKSTRING_PRINTED | NO_PPDEDUCT | ALLOW_NO_PP`, then
  `setmagiccoattarget BS_ATTACKER`. That opcode makes the original target the
  attacker and retargets to the original attacker in singles
  (`battle_scripts_1.s:3667-3675`; `battle_script_commands.c:6330-6337`).
- `BattleScript_SnatchedMove` prints/PP-reduces, runs `snatchsetbattlers`,
  emits the Snatch animation/message, sets the same three hit markers, swaps
  attacker/target, and returns (`battle_scripts_1.s:3677-3686`).
  `snatchsetbattlers` preserves the old attacker in `gEffectBattler`, uses
  `gBattleScripting.battler` as the snatcher, and restores that field
  (`battle_script_commands.c:9869-9880`).

The resumed `Cmd_attackcanceler` consumes `ALLOW_NO_PP` during PP admission,
so it continues even if the selected slot is empty; normal `ppreduce` clears
`NO_PPDEDUCT` after skipping the repeated deduction
(`battle_script_commands.c:934-942,1205-1250`). Thus the smallest future seam
is one post-obedience pure intercept join that owns: both per-battler protect
bits, ordered turn-order list, scripting/effect battler roles, hit markers,
and a resumable script-PC stack receipt. It should delegate Pressure PP and
the resume scripts; it must not merge these into the selected-slot PP join.

## Factory reachability and OFF evidence

Generated `battle-frontier-mons.json` has **3 / 850** Level-50 Magic Coat
sets: 121 `SPOINK`, 220 `KECLEON_1`, and 251 `GRUMPIG_1`. It has **0 / 850**
Snatch sets—and **0 / 882** including Open-only—so Snatch cannot be initiated
by either legal Factory side. The Snatch intercept is still source-required
for a general rules engine, but no legal Factory oracle scenario is claimed.

`tools/battle-lab/mechanic-magic-coat-bounce-off.json` is a narrow legal
Level-50 stage: set 121's player active is overridden to four Magic Coats and
set 156's opponent active to four Magic-Coat-affected Tail Whips. The live
override is permitted by mechanicLab, while the construction remains a real
Factory setup. The checked read-only probe is
`tools/probe/audit-magic-coat-off.py`, run through `tools/run-mgba-probe.py`
with the mGBA venv. It observes the source sequence (684 frames): arm at
**41**, selected Magic Coat PP 15→14 at **66**, incoming Tail Whip clears
`bounceMove` at **214**, ordinary Tail Whip PP 30→29 at **240**, and the
bounce script sets `ALLOW_NO_PP` then switches attacker/target at **390–391**;
the resumed canceler clears the marker at **393**. This is semantic state
evidence, not a pixel acceptance trace.

Unavailable evidence: factoryLegal has no controlled opponent-action API, so
the deterministic Magic Coat witness uses the documented legal-loadout
mechanicLab override. There is intentionally no fabricated Snatch state or
mechanicLab override because the corpus proof rules it out.
