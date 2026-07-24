# FAINT ATTACK portable staging probe (Battle Scene ON)

This is a synthetic presentation-seam construction, not a Factory-legality
claim. It stages the required opposite attacker orientation and compares the
complete unique `Move_FAINT_ATTACK` animation body without retaining oracle
pixels.

## Construction

`tools/probe/stage-fire-punch-portable-on.py` now accepts a move argument in
addition to its original FIRE PUNCH routes. The FAINT ATTACK fixture replays
the canonical ON anchor through the first battle's settled action menu at
frame **1886**, then changes only the already-loaded player battler fields:

| field | before | staged |
| --- | ---: | ---: |
| `gBattleMons[0].moves[0]` | `MOVE_ROCK_SLIDE` (157) | `MOVE_FAINT_ATTACK` (185) |
| `gBattleMons[0].pp[0]` | 10 | 20 |

The original FIGHT and move-confirm inputs then run unchanged. No chosen
action, target, turn order, damage, RNG, or facility state is written. The
stock controller spends PP at frame **2333**, starts the move animation script
at frame **2340**, applies the normal 143→129 result at frame **2620**, and
clears the move at frame **2633**.

The animation profile's age zero is frame **2344**, after the script's four
controller-setup frames. Its first BG fade write is therefore age 5 / frame
2349, exactly matching the existing canonical relative profile. Ages
**0–220** map to oracle frames **2344–2564** inclusive.

## Geometry and source dependency

The visible pair is **ONIX (player-back) → GROVYLE (opponent-front)**:

| battler | decoded 64×64 corner | animation center |
| --- | --- | --- |
| ONIX player-back attacker | `(40,48)` | `(72,88)` |
| GROVYLE opponent-front target | `(144,12)` | `(176,44)` |

`AnimTask_TranslateMonEllipticalRespectSide` in
`battle_anim_mon_movement.c` negates the source width only when the animation
attacker is not on the player side. The shared relative profile therefore
keeps the source `(18,6,1,3)` ellipse immutable and derives only its horizontal
direction from the explicit attacker side. BG_DARK, both alpha tasks,
animation-1 hitsplat placement, and `ShakeMon2` are otherwise side-independent
for this pair.

## Reproduction

`npm run compare:faint-attack-portable` creates a fresh temporary directory,
runs the stage through `tools/run-mgba-probe.py`, and compares live app RGB
against all **221** move-owned frames. The result is **221/221 exact**, with
zero aggregate differing pixels. Raw `.rgb` frames and probe JSON remain in
the temporary directory; none is committed or available to production.

Canonical controls remain **221/221** for both
`turn16-rung2a.json` and `turn17-rung2.json`. The original FIRE PUNCH portable
controls remain **225/225** and **277/277**.

FAINT ATTACK remains `partial`, not `exact`: parked ISSUE #38 still records
the single +30 delayed-control `BLDALPHA` register-visibility race. This
increment neither reopens nor patches that sub-tick exception.
