# Test players of the real-ROM replay (fourth pass)

Not a battle-rule fix. The replay had one player: the least-used legal move, never a voluntary switch. It could not
reach a switch by choice, Pursuit on a switch, a trap, Natural Cure on a switch or Baton Pass, at any number of seeds.
This file describes the three players the replay has now.

Code: `tools/integration/romReplayPlayers.ts` (the players), `tools/integration/soundCensusRomReplay.ts` (`--policy=NAME`
or the environment variable `ROM_REPLAY_POLICY`; default `census`), `tools/audio/romDecisionDriver.py` (the ROM side).
One battle: `REPLAY_OUT=/abs/dir tools/audio/romReplayWide.sh SEED [POLICY [SYMBOLS]]`.

## The three players

| name | what it does | what it is for |
|---|---|---|
| `census` | The least-used legal move. Never a voluntary switch. A forced replacement is the lowest legal party slot. Unchanged. | Every move of every set gets used. The older lists (the 64, the pool of 962, the Brain lists) are battles of this player. |
| `ai-v1` | The game's own trainer AI plays the player's side: the engine's port of the switch check (`AI_TrySwitchOrUseItem`, `factoryAiSwitchPolicy.ts`) and of the three move scripts (`factoryAiDecisionPolicy.ts`), all three at every streak. A forced replacement is the first pass of `GetMostSuitableMonToSwitchInto`; when that pass names nobody, a random legal slot. | Battles as a sensible player would play them. The main player. |
| `random-v1` | A uniformly random legal move. With probability 0.2, when the engine allows a switch, a voluntary switch to a uniformly random legal bench Pokemon. A forced replacement is uniformly random. It also probes (below). | The odd legal actions, most voluntary switches, and the refusals. |

Every player is a decision policy only. It must be deterministic and legal. It is not claimed to be what a person or the
game would do.

## How `ai-v1` runs the opponent's AI for the player

The engine's AI port is written for battler 1: it reads `battlers[1]` as the user, `battlers[0]` as the target and
`party.opponent` as the bench. The player's copy does not change that code. It hands it a **mirrored copy** of the battle
state (`mirrorRulesContext`): battler 0 and 1 swapped, the two parties swapped, the two sides swapped, and the battler
numbers stored in the per-battler and per-side records flipped. The opponent's code paths are untouched.

- **Own dice.** Each player has its own generator (mulberry32), seeded from the battle seed and the policy name. The
  mirrored AI gets its own RNG state object, seeded from that generator. Nothing reads or advances the battle RNG. The
  ROM spends no RNG on a player choice, so this is required for the replay to work at all; the test
  `tests/parityMacReplayPlayers.test.ts` checks that the battle RNG, the rules state and the opponent's AI history are
  byte-equal before and after a player chooses.
- **Own memory.** The player keeps its own `FactoryAiBattleHistory`, synced from the mirrored state. It never touches the
  orchestrator's `aiHistory` or the `aiObserved*` fields of the rules state (the engine's state is frozen; the mirror is
  a copy).
- **What it sees of the opponent:** only what was revealed, the same way the game's AI knows the player: moves the
  opponent has used, an ability or item effect that was shown. This is the simpler choice, because the history sync
  already works that way on the mirrored state. It does see the opponent's species, types, HP, stats and stat stages
  (the AI scripts read `gBattleMons` of the target directly).
- **Not faithful in every field.** Records that hold battler numbers inside a running script are not all rewritten.
  That can only change which legal action the player picks. When the mirrored AI throws, or names an action the engine
  does not offer, the player takes a random legal move from its own generator and counts it (`playerStats.fallbacks`).
  In an engine-only sweep of 150 battles the AI chose 2,183 of 2,200 moves (the other 17 were forced turns), made 12
  voluntary switches, and never fell back.

## Probes: what the engine says is not allowed (`random-v1`)

A legal-action player never tests the other half of legality: that the ROM also refuses what the engine refuses. So
`random-v1` adds probes. A probe is a decision the ROM must refuse. It never changes the battle.

- `switch-refused`: the engine offers no switch although the bench has a healthy Pokemon (a trap: Wrap, Mean Look,
  Ingrain, Shadow Tag, Arena Trap, Magnet Pull). Probability 0.5 per such menu. The ROM driver opens POKEMON, picks the
  bench Pokemon and SHIFT; the ROM must show its refusal and keep the party menu open (`party_menu.c`
  `TrySwitchInPokemon`); the driver then backs out with B.
- `move-refused`: a move slot the engine says cannot be selected (no PP, Disable, Torment, Taunt, Imprison, a Choice
  Band lock). Probability 0.3 per such menu, not on a forced turn. The ROM must play its refusal message and open the
  move menu again without playing a turn (`TrySetCantSelectMoveBattleScript`, `battle_main.c:4380-4389`).

How the driver knows: `gBattleMainFunc` is `HandleTurnActionSelectionState` while the ROM collects the turn's actions and
another function while a turn runs. A menu that comes back without that function having been left means the last
decision was refused. Three legality errors come from this, all reported as class `legality`, not as a tool failure:

- `rom-refused-decision`: the ROM refused a move the engine offered;
- `rom-accepted-refused-decision`: a turn ran after a probe (the ROM took what the engine refuses);
- `rom-refused-switch`: the party menu stays open more than 600 frames after a switch was picked.

A menu the engine has no decision for (`unplanned-action-menu`, `unplanned-move-menu`, `unplanned-party-menu`) is also
class `legality`.

## Decisions written by the engine side

`{kind: "move", slot, forced?}`, `{kind: "switch", partyIndex}` (a forced replacement), `{kind: "switch", partyIndex,
voluntary: true}`, `{kind: "switch-refused", partyIndex}`, `{kind: "move-refused", slot}`. A voluntary switch is played
through the engine's own menus (POKEMON at the action menu, the party row, SHIFT). The request file carries the note
`replay: {policy, censusSeed, symbols}`; the lab does not know that key, so `soundEventProbe.py` and
`romStateTimeline.py` drop it before the lab validates the request.

## Proof that a voluntary switch really happens on the ROM

50 `random-v1` battles (seeds 20001..20050): 133 voluntary switches, 15 switch probes and 18 move probes in total.
From the ROM drive of the first three (the driver's menu states and the ROM's own `gBattlerPartyIndexes` / `gBattleMons`):

| seed | decision | ROM menus, by frame | ROM active Pokemon before | ROM active Pokemon at the next decision |
|---|---|---|---|---|
| 20001 | 4: switch to party slot 2 | action 2511, party menu 2537, slot picked 2585 | slot 0, species 292, 63 HP | slot 2, species 44, 97 HP |
| 20002 | 2: switch to party slot 1 | action 699, party menu 725, slot picked 771 | slot 0, species 386, 66 HP | slot 1, species 305, 91 HP |
| 20003 | 1: switch to party slot 1 | action 490, party menu 518, slot picked 564 | slot 0, species 103, 161 HP | slot 1, species 3, 80 HP |

In each, `gRngValue` moved several times between the two decisions (the opponent's turn ran) and every engine state of
the battle is in the ROM timeline (31, 18 and 29 states).

## Tests

- `tests/parityMacReplayPlayers.test.ts`: the mirror swaps the sides and is its own inverse; every player is
  deterministic per seed, picks only what the engine offers, and leaves the battle state, its RNG and the opponent's AI
  history unchanged; `ai-v1` really runs the mirrored AI; `census` keeps its least-used rule.
- `tools/test_rom_decision_driver.py` (31 tests): POKEMON for a voluntary switch; both probes; the three legality errors;
  the move menu the ROM re-opens after a refused move.
