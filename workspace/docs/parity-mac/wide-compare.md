# Wide compare of the real-ROM replay (fourth pass)

Not a battle-rule fix. The replay compared, after every turn, both HP values, `gRngValue` and the last moves. A wrong
stat stage, PP count, status counter, screen timer or item stayed unseen until it changed a damage number or a roll.
The wide compare checks the battle state itself at every point where the player decides.

Code: `soundCensusRomReplay.ts` (`wideOf`, `compare --drive=`), `tools/audio/soundEventProbe.py` (`wide_state`,
`read_party_member`), `tools/audio/romReplaySummary.py`, chain `tools/audio/romReplayWide.sh`.

## When

One state per decision, on both sides:

- engine: when the player's action menu is up, or when the party menu of a forced replacement opens;
- ROM: on the frame the driver first sees that menu (`HandleInputChooseAction`, or the party menu's choose task).

The ROM waits for input at those points, so its state does not move. A refusal probe shares the state of its turn.

## What is compared

Raw source fields, the same names on both sides.

| group | fields | ROM source |
|---|---|---|
| both active Pokemon | party slot, species, HP, max HP, `status1`, `status2`, `status3`, the eight stat stages, the four moves and their PP, held item, ability, the two types, the five battle stats | `gBattleMons`, `gStatuses3`, `gBattlerPartyIndexes` |
| their counters | disabled move and timer, encored move and timer, Taunt timer, Perish Song timer, Substitute HP, Protect uses, Stockpile count, Fury Cutter counter, Rollout timer, Charge timer, `isFirstTurn`, Truant counter, mimicked-move bits, recharge timer | `gDisableStructs` (`include/battle.h:70-102`) |
| both parties, each member | species, HP, `status1`, the four PP, held item | `gPlayerParty` / `gEnemyParty` |
| both sides | `gSideStatuses`, Reflect / Light Screen / Mist / Safeguard timers, Spikes layers | `gSideStatuses`, `gSideTimers` (`include/battle.h:149-162`) |
| field | weather bits and its timer; Future Sight counter, attacker and move; Wish counter and party slot | `gBattleWeather`, `gWishFutureKnock` (`include/battle.h:164-174`) |
| winner | `gBattleOutcome` at the end | `gBattleOutcome` |

Sleep and toxic counters are inside `status1`. Confusion turns, the Wrap turns, Uproar turns, the lock-on and
infatuation bits are inside `status2`.

## What is left out, and why

- **`gRngValue` at the menu.** It is compared by the turn timeline, where the opponent's pre-menu AI draws are known.
- **A fainted active Pokemon** (0 HP on both sides): only its party slot, species and HP. Its slot is about to be
  refilled, and the ROM has already run `FaintClearSetData` when the replacement menu opens while the engine's request
  boundary sits before it.
- **`status1` of a fainted party member.** The ROM clears it at the faint (`Cmd_cleareffectsonfaint`,
  `battle_script_commands.c:3063-3079`); the engine's party record keeps the last value. Nothing reads the status of a
  fainted Pokemon (`Cmd_if_status_in_party` and the party menu test HP first) and nothing revives in the Factory.
- **The state after the deciding blow.** It is written to the summary as `finalNotes` and does not fail a battle. The
  ROM goes on with the rest of that turn (the driver waits for the end-turn handler; `HandleWishPerishSongOnTurnEnd`
  still runs: Perish Song can take the winner's Pokemon after the battle is decided), the engine stops at the outcome,
  and the Factory restores the party after every battle. What carries over is the winner, and that is compared. See the
  open lead "Perish Song after the deciding faint" in `STATUS.md`.
- **Not in the wide state at all:** `gProtectStructs`, `gSpecialStatuses`, `gLastUsedAbility` and the other per-move
  scratch values (they are reset every turn and show in the next damage number or roll), `gBattleStruct` internals, the
  opponent's AI structs (covered by the RNG stream), Follow Me (doubles), the battle-start entry order.

## Two traps of reading the ROM

- **A party box can be caught decrypted.** `GetBoxMonData` / `SetBoxMonData` decrypt the 48 data bytes in place and
  encrypt them again before they return. The opponent's AI runs for more than a frame while the player's menu opens, so
  an emulator frame can end inside one. The box checksum tells which form the bytes are in; a half-way box is read
  again on the next frames (at most four), and a member that still cannot be read is skipped and counted
  (`unreadRomPartyMembers`).
- **The party array is in menu order while the party menu is open** (`party_menu.c` `UpdatePartyToBattleOrder`). The
  ROM read puts it back in party-slot order with `gBattlePartyCurrentOrder`.

## The summary of one battle

`romReplayWide.sh` writes `ID.summary.json` with `match` and `class`:

| class | meaning |
|---|---|
| (none, `match: true`) | the engine finished; every engine turn state is in the ROM timeline in order; the ROM drive ended at the outcome having used every decision; the same winner; no wide difference at any decision |
| `engine-error` | the engine threw (also its frame budget on an endless battle) |
| `legality` | the ROM refused a decision, took a refused one, or showed a menu the engine had no decision for |
| `state` | the HP / RNG / last-move timeline differs |
| `drive` | the ROM drive stopped at its frame cap or watchdog |
| `outcome` | the two sides name a different winner |
| `wide` | a wide field differs at a decision; `wide.first` has the decision and the fields |

A matching battle also leaves `ID.facts.json.gz` (decisions, wide states, every turn's events), the input of the tally.
A battle is driven again once before a failure counts (handoff 0d).
