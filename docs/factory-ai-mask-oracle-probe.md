# Factory AI mask oracle probe checkpoint

Status: blocked by the current Mechanics Lab contract; this checkpoint does
not infer an internal AI trace from final battle state. All source references
are to pinned `reference/pokeemerald` commit
`83df84e40623b79281f2397faa611cbf044170bd` and all live observations below
use the Battle Scene OFF service.

## Requested controlled matrix is not legal in the v1 ABI

The requested first-turn control was the same legal Factory parties,
Pidgeotto's source four-move loadout, seed `0x12345679`, and ordinary
challenge bands 0, 2, and 4. The baseline is legal at challenge 0:

```json
{
  "playerSetIds": [156, 149, 180],
  "opponentSetIds": [135, 188, 184],
  "opponentActiveMoves": [332, 98, 297, 28]
}
```

Those active moves are the pinned source record
`FRONTIER_MON_PIDGEOTTO` (`MOVE_AERIAL_ACE`, `MOVE_QUICK_ATTACK`,
`MOVE_FEATHER_DANCE`, `MOVE_SAND_ATTACK`) in
`src/data/battle_frontier/battle_frontier_mons.h:948-954`; their IDs are defined in
`include/constants/moves.h:32,102,301,336`. Mechanics Lab applies that
loadout after its real Factory constructor, as documented by
`tools/battle-lab/README.md`.

The complete reproducible request is this (the capture table below is from
this exact payload):

```json
{
  "schemaVersion": 1,
  "mode": "mechanicLab",
  "profile": "battle-scene-off",
  "level": 50,
  "challengeNum": 0,
  "battleNum": 0,
  "trainerId": 50,
  "playerSetIds": [156, 149, 180],
  "opponentSetIds": [135, 188, 184],
  "seed": 305419897,
  "overrides": {"battlers": {"opponent": {"moves": [332, 98, 297, 28], "ppUps": [0, 0, 0, 0]}}},
  "trace": {
    "segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 700, "buttons": []}],
    "captureFrames": [0, 734]
  }
}
```

It cannot be replayed unchanged at the requested mask bands. A live OFF
request changing only `challengeNum` from 0 to 2 was rejected with:

```
opponent set 135 is outside Level-50 challenge 2 range 267..371
```

This is expected rather than a service error. The exact normal initial-rental
intervals in `src/battle_factory.c:169-178` are disjoint: challenge 0 is
`110..199`, challenge 2 is `267..371`, and challenge 4 is `468..563`.
`mechanicLab` accepts only Factory-legal baseline parties and can override
only active loadouts, not a party's source set/species/stats before battle
initialization. Thus no one set-ID party can be legal in all three requested
challenge bands. Replacing each band with a different legal party would
conflate the mask with stats, types, items, abilities, and switch prechecks,
so it is not evidence for the requested controlled comparison.

## What the public capture does establish

The challenge-0 baseline was executed against the OFF lab using ordinary
controller input: `A` for two frames, idle 30, `A` for two, then idle 700
(734 total frames). Its captured states demonstrate that the ROM accepted the
staged source loadout and chose/used slot 2 on the first turn:

| capture | RNG value | opponent PP `[AERIAL ACE, QUICK ATTACK, FEATHER DANCE, SAND-ATTACK]` | observable result |
| --- | ---: | --- | --- |
| 0 | `4002026116` | `[20, 30, 15, 15]` | initial action menu |
| 734 | `594668049` | `[20, 30, 14, 15]` | FEATHER DANCE used; player Attack stage `6 -> 4` |

The same capture shows the player used ROCK SLIDE (`10 -> 9` PP) and the
opponent's HP changed `156 -> 114`. This is a valid final-state witness that
slot 2 was executed; it is not a score receipt.

## Unobservable boundaries

The v1 semantic `state` contains battle RNG at capture boundaries, active
battler facts, PP, status/stages, and a small controller summary. It does not
expose any of the selection-time values below:

- the four `AI_THINKING_STRUCT.simulatedRNG[]` setup draws;
- `score[]`, enabled script mask, script instruction path, or score deltas;
- the final best-slot set/tie modulus or selected slot before move execution;
- an ordered log of `Random()` calls separating action precheck, setup,
  scoring, tie selection, accuracy, damage, and secondary effects.

This distinction matters even for mask 0: native setup still consumes four
slot-ordered draws and singles selection consumes a final tie draw
(`src/battle_ai_script_commands.c:312-446`). Masks 1 and 7 additionally have
path-dependent interpreter draws. A start/end `rngValue` around a completed
turn cannot attribute any portion of that delta to the AI without fabricating
an internal boundary. The current controller summary also omits the emitted
`B_ACTION_EXEC_SCRIPT` value where `battle_controller_opponent.c:1569-1590`
would encode the chosen slot.

## Required additive oracle evidence

Before an oracle matrix can validate the injected-policy seam, expose a
read-only, per-decision AI receipt captured immediately after
`BattleAI_ChooseMoveOrAction` and before move execution. It needs at least:

1. selected Factory mask and the active script bits;
2. the four setup draws with ordinal/value, post-score vector, and each
   interpreter draw with a reason;
3. best-slot candidates, final tie draw/modulus, selected slot, and encoded
   controller action/target; and
4. an explicit fixture option that independently selects the Factory mask or
   a pre-init party builder capable of holding the exact same validated party
   across challenge bands.

Until then, retain `factory-ai-boundary-audit.md` as the source-level
definition of score and RNG ownership, and use the public lab only for
post-execution PP/state witnesses. No AI interface or policy behavior is
implemented by this checkpoint.
