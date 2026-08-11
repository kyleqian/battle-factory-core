# ISSUES #71 Slice-D offset removal — RAM receipt (Battle Scene OFF, RATTATA)

Positive oracle evidence for the `speciesFrontIdleRestOffset` removal at the
two generated-route OFF settle hooks (`drawGeneratedOpponentRelease`'s
`coeff===0` branch + `renderGeneratedBattleStartPlayerRelease`'s duplicate,
`src/engine/battleScene.ts`). Converts entry 890's incidental
`battle-scene-off`-fast-forward "gotcha" observation into this step's
deliberate positive receipt, per PROGRESS.md entry 920's Next note.

## Scenario

`tools/battle-lab/send-out-front-idle-rattata-off.json` — a clone of the
existing `send-out-front-idle-rattata.json` (ISSUES #71 Slice A/B RAM
evidence, `32af4030`) with `"profile"` changed from `"battle-scene-on"` to
`"battle-scene-off"`; nothing else differs (RATTATA lead opponent, same
trace segments). RATTATA is the ONIX/RATTATA census's only non-ONIX species
with a nonzero terminal rest offset (`speciesFrontIdleRestOffset("RATTATA")
= {x2:1, y2:0}`), making it the sharpest possible probe: if Scene OFF ever
diverged from flat `{0,0}`, RATTATA is the species that would show it.

## Reproduce

```sh
python3 tools/run-mgba-probe.py /tmp/rattata-off.json -- python3 \
  tools/probe/dump-onix-front-idle-anim.py \
  tools/battle-lab/send-out-front-idle-rattata-off.json \
  /tmp/rattata-off.json 0 634
```

`dump-onix-front-idle-anim.py` is already species-generic (its own module
doc, `:12-13`) and its `SYMBOLS` table already carries
`Anim_RapidHorizontalHops` (ONIX/RATTATA's `ANIM_RAPID_H_HOPS` family, added
in `32af4030`) — no probe changes needed. The scenario's 4 trace segments sum
to 634 frames (2+30+2+600), so `0 634` samples every tick of the run,
spanning well past wherever the settle tick would fall under
`battle-scene-on`.

## Result

635 sampled ticks (0..634 inclusive) of `gBattlerSpriteIds[1]` (RATTATA,
`data2=19` confirms species), for the **entire** run:

| Field | Observed value (all 635 ticks) |
| --- | --- |
| `x2` | `0` |
| `y2` | `0` |
| `animNum` | `0` |
| `callback` | `0x08007428` → `SpriteCallbackDummy` |

Flat from tick 0 through tick 634 — never leaves `SpriteCallbackDummy`/
`{0,0}`, confirming `SKIP_FRONT_ANIM` (`pokemon.c:6803-6852`): under Battle
Scene OFF the front-sprite animation task is never launched, so the sprite's
`x2`/`y2` stay at their pre-callback `{0,0}` values for the whole battle,
even for RATTATA. This directly matches the removed hooks' new (offset-free)
output — the removal is correct, not merely inert.
