# KADABRA generated-player materialize settle — RAM probe (ISSUES #71 entry-891)

Evidence for the `drawGeneratedPlayerMaterialize` (`src/engine/battleScene.ts`)
fix: the ONIX-only hand-fit tables `playerMaterializeSettleY2` /
`playerMaterializeSettleTintCoeff` (`battleMenu.ts:731-749`) were applied to
every generated-round player species regardless of `art.speciesSymbol`.

## Scenario

`scenario.json` — `mechanicLab`, `battle-scene-off` profile, seed
2423399196, trainerId 17, `playerSetIds` `[135, 188, 184]`, `opponentSetIds`
`[156, 149, 180]`. Player leads with a generated KADABRA (species 64).

## Method

RAM-probed `gSprites[gBattlerSpriteIds[0]]` (`x2`/`y2`/`animNum`/callback)
plus the active `gTasks[]` ball-fade task (`tCoeff`), every tick 0-820 of the
scenario's trace (`out.json`, `ticks[]`). See `probe.py` in
`/tmp/kadabra-probe/` (not committed — scratch driver script; the addressing
constants match `dump-onix-front-idle-anim.py`'s established
`GBATTLERSPRITEIDS -> GSPRITES` slot lookup).

## Findings

- **Tint fade is species-generic.** `Task_FadeMon_ToNormal` appears at tick
  365 with `tCoeff=16` (constant), then `Task_FadeMon_ToNormal_Step`
  decrements 1/tick 16→0 across ticks 387-403, then the task dies. This is
  the identical closed form `playerMaterializeSettleTintCoeff` already
  models — keep it for every species.
- **The ONIX `y2` wobble table does NOT apply to KADABRA.** KADABRA's real
  settle motion is its own back-send-out animation: `y2` descends
  14,13,12,11,10,9,8,7,5,4,3,2,0 across ticks 366-378, then holds at 0
  permanently (ticks 379-820, confirmed through the probe's full window,
  including the action-menu idle-bounce region from tick ~551 on — that
  periodic 0↔1 bob is the menu window's own idle bounce, modeled
  separately, not part of this settle mechanism).
- **Conclusion.** ONIX's `PLAYER_SETTLE_WOBBLE_Y2_TABLE` is genuinely
  ONIX-only (its own `BACK_ANIM_V_SHAKE` entrance, per `battleMenu.ts`'s own
  doc). KADABRA's true descent is a different animation family
  (shrink/grow-vibrate per `GetSpeciesBackAnimSet`) that this run does not
  yet model per-species — that dispatcher is the animation lane's Slice D,
  not this fix. This fix only stops the wrong (ONIX) table from being
  applied to non-ONIX species; non-ONIX species draw `y2=0` (flat) through
  the settle window until Slice D lands.
