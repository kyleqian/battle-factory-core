# FIRE PUNCH portable staging probe (Battle Scene ON)

This is a bounded oracle-construction checkpoint, not a runtime feature and
not a claim of exact portable rendering.

## Construction

`tools/probe/stage-fire-punch-portable-on.py` replays the canonical ON anchor
through `battle1-turn1.json` tick **1886**, immediately after the action menu
has settled and before its normal FIGHT press. At that single seam it writes
only these fields in the already initialised `gBattleMons[0]`:

| field | before | staged |
| --- | ---: | ---: |
| `moves[0]` | `MOVE_ROCK_SLIDE` (157) | `MOVE_FIRE_PUNCH` (7) |
| `pp[0]` | 10 | 15 |

The unmodified game then receives the original FIGHT press, selection press,
and idle frames. `BtlController_EmitChooseMove` copies the staged move slot;
the normal battle controller and `Move_FIRE_PUNCH` script own everything
afterward. The visible pair is therefore **ONIX (player-back) → GROVYLE
(opponent-front)**, rather than canonical **MAGBY → MURKROW**. It is
synthetic—not a Factory-legal party assertion—and exists only to prove the
smallest usable ON-profile presentation-seam stage.

Source basis: `struct BattlePokemon` places `moves` at `0x0c` and `pp` at
`0x24` (`reference/pokeemerald/include/pokemon.h`); the selection controller
copies those exact fields before issuing its move menu
(`reference/pokeemerald/src/battle_main.c`). `Move_FIRE_PUNCH` itself uses
target-relative animation operands throughout (`battle_anim_scripts.s`).

## Reproduction and evidence

Use a fresh output location (the wrapper intentionally rejects stale output):

```sh
scratch_dir=$(mktemp -d /tmp/pokebench-fire-punch-XXXXXX)
python3 tools/run-mgba-probe.py "$scratch_dir/fire-punch-onix-grovyle.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/stage-fire-punch-portable-on.py "$scratch_dir/fire-punch-onix-grovyle.json"
```

Two fresh ON-profile runs on 2026-07-23 produced byte-identical JSON. The
probe output records raw RGB SHA-256s plus RAM state, rather than storing or
consulting screenshots. In both runs, `gCurrentMove=7`, attacker 0, and target
1 by tick **2312**; PP changes **15→14** by **2336**; GROVYLE HP changes
**143→112** by **2520**. These confirm that the stock controller selected and
executed FIRE PUNCH rather than merely redrawing a staged screen.

The canonical ON regressions remain the app parity evidence:

- `turn16-rung3.json` was **227/236** in this worktree at this checkpoint
  (21397–21405 each had a 183px residual; this probe made no runtime changes).
- `turn17-rung4.json` was **200/200**.

## Exact next boundary

There is no Battle Scene ON staged presentation adapter: `appTrace.ts` only
stages the Scene-OFF `stageBattleTurn` seam. Consequently this new oracle
case has no valid app compare yet and remains **partial**. The next animation
implementation increment is to introduce a source-derived, relative
Battle-Scene-ON move-presentation stage that takes an explicit attacker/target
geometry and FIRE_PUNCH resolution profile, then run this ONIX→GROVYLE probe
through it with a complete dense window. Do not attach that mechanism to
absolute battle ticks or this RAM patch.
