# AI scripts: the speed-tie random draw was spent before the script reached the speed check — fixed (4 handlers)

Mac parity lane, 2026-11-12. Re-derive with `tools/audio/romDriveSeed.sh 114 off DIR`.

## Symptom

Seed 114, turn 2: the opponent's Weezing (Memento, Sludge Bomb, Facade, Destiny Bond; 104 / 164 HP; Speed 72) faces Whiscash
(Speed 72). The ROM plays Sludge Bomb, the engine played Facade. Both sides have the same scores for slots 0-2
(`[99, 100, 100, ...]`); the tie pool and the tie draw differ because the engine spent one random draw too many while
scoring Memento, which also flipped Destiny Bond's roll (ROM 100, engine 99).

ROM single-step of the AI phase (`Random()` callers and `gAIScriptPtr`): `Cmd_if_random_less_than` at `AI_CV_SelfKO_Encourage4`
(slot 0), `GetWhoStrikesFirst` at `AI_CV_DestinyBond+2` (slot 3), `Cmd_if_random_less_than` at `AI_CV_DestinyBond`, then the tie
draw. There is no `GetWhoStrikesFirst` draw inside `AI_CV_SelfKO`. The engine's trace had `target-faster-tie` first on slot 0.

## Cause

`if_target_faster` / `if_user_faster` (`GetWhoStrikesFirst`) spend one `Random()` only on a speed tie. The script reaches the
command only on some paths; four handlers in `src/engine/factoryAiCheckViability.ts` took the tie draw at the top, before the
commands that can jump past it. Found on seed 114, then a read-only audit of all 24 handlers with a speed check against
`data/battle_ai_scripts.s` (21 were already right).

| handler | script | what the script does first | engine before |
|---|---|---|---|
| `runCvSelfKO` (Explosion, Selfdestruct, Memento) | `AI_CV_SelfKO` `:800-826` | `if_hp_less_than AI_USER, 80` (`:807`) jumps past `if_target_faster` (`:808`) | tie draw even below 80% HP |
| `runCvHealBody` (Recover, Softboiled, Swallow, Morning Sun, Synthesis, Moonlight) | `AI_CV_Heal` `:1324-1351` | `if_hp_equal AI_USER, 100` (`:1325`) scores -3 before `if_target_faster` (`:1326`) | tie draw at full HP |
| `runCvBatonPass` | `AI_CV_BatonPass` `:1978-2016` | with no stat above stage 7 it goes to `ScoreDown2`; the speed checks are only at `:1987` and `:2007` | tie draw on every unboosted Baton Pass |
| `runCvMirrorMove` | `AI_CV_MirrorMove` `:838-852` | at `MirrorMove2`, `if_in_hwords ..._EncouragedMovesToMirror` (`:848`) ends with no roll | always rolled `< 80` there (not a tie draw; found by the same audit) |

These only show when the two effective speeds are equal (or, for Mirror Move, when the target is faster and its last move is
on the list), which is why the staged tests never met them.

## Fix

Each handler now takes the draw where the script runs the command. `runCvRest` was checked and left alone: its speed check
is the script's first command.

## Tests

`tests/parityMacAiDrawOrder.test.ts` (equal speeds on both sides): the four handlers' draw lists on the path that must not
draw, with a control on the path that must. All four fail on the unfixed code.
`tests/factoryAiCheckViability.test.ts`: the Mirror Move case that pinned the unconditional roll is split into the two
script cases.

## ROM replay

See `STATUS.md`.
