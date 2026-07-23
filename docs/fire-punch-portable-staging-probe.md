# FIRE PUNCH portable staging probe (Battle Scene ON)

This is a synthetic presentation-seam construction, not a Factory-legality
claim. It now has an exact app/oracle dense window through the relative
Battle Scene ON adapter.

## Construction

`tools/probe/stage-fire-punch-portable-on.py` replays the canonical ON anchor
through `battle1-turn1.json` tick **1886**, immediately after the action menu
has settled and before its normal FIGHT press. Its default player-side route
writes only these fields in the already initialised `gBattleMons[0]`:

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

### Opposite-attacker-side route

Passing the final `opponent` argument leaves ONIX's selected ROCK SLIDE alone
and instead changes only GROVYLE's already-loaded **slot 3**, the stock Battle
AI's deterministic choice in this untouched first turn:

| field | before | staged |
| --- | ---: | ---: |
| `gBattleMons[1].moves[3]` | `MOVE_DOUBLE_TEAM` (104) | `MOVE_FIRE_PUNCH` (7) |
| `gBattleMons[1].pp[3]` | 15 | 15 |

No `gChosenActionByBattler`, `gChosenMoveByBattler`, target, turn-order,
damage, or RNG memory is written. `OpponentHandleChooseMove`
(`battle_controller_opponent.c`) still selects slot 3 normally; then the
standard choice handoff in `battle_main.c` resolves that selected position
against the staged `gBattleMons[1]` slot. The stock controller therefore
executes **GROVYLE (opponent-front) → ONIX (player-back)**.

The source geometry is explicit and is emitted in every probe result:

| battler | decoded 64×64 corner | `GetBattlerSpriteCoord(X_2, Y_PIC_OFFSET)` |
| --- | --- | --- |
| GROVYLE opponent-front attacker | `(144, 12)` | `(176, 44)` |
| ONIX player-back target | `(40, 48)` | `(72, 88)` |

`battle_anim_mons.c` gives the singles bases `(176, 40)` and `(72, 80)`;
GROVYLE's front y offset is 4, while ONIX's back y offset is 0 and the player
`Y_PIC_OFFSET` convention adds 8. The stage also RAM-records the live sprite
centers at its epoch: GROVYLE sprite 8 is `(176,44)+(0,0)` and ONIX sprite 6
is `(72,80)+(0,0)`.

## Reproduction and evidence

Use a fresh output location (the wrapper intentionally rejects stale output):

```sh
scratch_dir=$(mktemp -d /tmp/pokebench-fire-punch-XXXXXX)
python3 tools/run-mgba-probe.py "$scratch_dir/fire-punch-onix-grovyle.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/stage-fire-punch-portable-on.py "$scratch_dir/fire-punch-onix-grovyle.json"
```

For the opposite-side evidence, request the dense temporary RGB frames and
the `opponent` route:

```sh
scratch_dir=$(mktemp -d /tmp/pokebench-fire-punch-opponent-XXXXXX)
mkdir "$scratch_dir/rgb"
python3 tools/run-mgba-probe.py "$scratch_dir/fire-punch-grovyle-onix.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/stage-fire-punch-portable-on.py \
  "$scratch_dir/fire-punch-grovyle-onix.json" "$scratch_dir/rgb" opponent
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

## Relative app comparison

`src/engine/sceneOnPresentation.ts` accepts explicit attacker/target side,
sprite-corner and source-derived animation-center geometry plus an immutable
FIRE_PUNCH resolution profile. The probe's reducer epoch is frame 2313:
spiral age 41 is frame 2354, the 31-HP commit is age 200/frame 2513, and the
no-burn secondary path enters the super-effective printer at age 204.

`npm run compare:fire-punch-portable` regenerates the mGBA evidence in a fresh
temporary directory and compares live app RGB for every frame 2313–2537. It is
**225/225 exact**, 0 aggregate differing pixels, through the completed
super-effective line. Raw oracle RGB is temp-only; no screenshots or oracle
pixels are committed or available to production.

Before the checkpoint below, FIRE_PUNCH remained **partial**, not `exact`,
because the opposite-attacker-side geometry had not yet been staged.

## Opposite-side evidence checkpoint (2026-07-23)

Two fresh runs of the command above produced byte-identical JSON. Its dense
capture range is frames **2080–2700**, retaining the whole FIRE_PUNCH-owned
controller span and a substantial settled tail without committing RGB or PNG
assets. The adapter-ready relative epoch is **frame 2081 / age 0**: it is the
first post-controller framebuffer, with `gDoingBattleAnim=1`,
`gBattleAnimAttacker=1`, and `gBattleAnimTarget=0`.

The unmodified controller's observable result is pinned in the JSON:

| event | oracle frame |
| --- | ---: |
| FIRE_PUNCH dispatch and PP 15→14 | 2080 |
| ONIX HP 117→96 | 2130 |
| ONIX status1 0→16 (`STATUS1_BURN`) | 2223 |
| FIRE_PUNCH controller release (`gCurrentMove=0`) | 2358 |

`tools/compare/fixtures/fire-punch-grovyle-onix.json` records the exact
geometry, epoch, outcome profile, and dense **2081–2357** app-comparison
window for the existing generic Scene-ON adapter. No opposite-side app
comparison was run or claimed in this bounded probe step; in particular this
does **not** upgrade FIRE_PUNCH from `partial` to `exact`. The strongly
different large ONIX target silhouette and target-side compositing must be
compared through that adapter before any such claim.
