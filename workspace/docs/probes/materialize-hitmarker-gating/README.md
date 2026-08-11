# Back-sprite materialize `HITMARKER_NO_ANIMATIONS` gating probe (ISSUES #74 premise check)

Evidence that ISSUES #74's queued fix ("consume `backSendOutFrameAtTick` at the
generated player materialize settle, since back-sprite materialize is NOT
gated by Scene OFF, unlike front's `SKIP_FRONT_ANIM`") rests on a wrong
premise, found while verifying step 1 of the R5 MAIN brief before writing any
render code (no `src/` edits landed this session).

## Source check (step 1 of the brief)

`BattleAnimateBackSprite` (`reference/pokeemerald/src/pokemon.c:6886-6897`)
checks the **identical** condition as `BattleAnimateFrontSprite`
(`pokemon.c:6803-6809`/`DoMonFrontSpriteAnimation`'s `SKIP_FRONT_ANIM` branch,
`:6811-6856`):

```c
void BattleAnimateBackSprite(struct Sprite *sprite, u16 species)
{
    if (gHitMarker & HITMARKER_NO_ANIMATIONS && !(gBattleTypeFlags & (BATTLE_TYPE_LINK | BATTLE_TYPE_RECORDED_LINK)))
    {
        sprite->callback = SpriteCallbackDummy;
    }
    else
    {
        LaunchAnimationTaskForBackSprite(sprite, GetSpeciesBackAnimSet(species));
        sprite->callback = SpriteCallbackDummy_2;
    }
}
```

Both sides reach this identical gate through the identical unconditional
ball-emerge handoff (`pokeball.c:815-820`,
`StartSpriteAffineAnim(..., BATTLER_AFFINE_EMERGE)` then
`sprite->callback = SpriteCB_OpponentMonFromBall`/`SpriteCB_PlayerMonFromBall`
by side), and `HITMARKER_NO_ANIMATIONS` is set identically for both at battle
init (`battle_main.c:3081-3090`, `BattleStartClearSetData`, gated on
`gSaveBlock2Ptr->optionsBattleSceneOff == TRUE` for non-link, non-recorded
battles — exactly what `oracle/bootstrap/factory-battle-scene-off.json`'s
`gSaveBlock2Ptr+0x15` poke sets). **There is no asymmetry in the C source
between front and back gating.** This alone triggers the brief's own STOP
condition ("If the back path IS also gated by Scene OFF, STOP").

## RAM probe (live verification, not just a source read)

Reused the banked KADABRA `mechanicLab` scenario
(`docs/probes/kadabra-materialize-settle/scenario.json`, `battle-scene-off`
profile) with `preCheckpointCaptureAllFrames: true`, reading `gHitMarker`
(`0x2024280`), `gBattleTypeFlags` (`0x2022fec`), and both battlers'
`gSprites[gBattlerSpriteIds[n]]` `x2`/`y2`/`callback` every frame via
`EmeraldOracle.read_u8` directly (same addressing convention as
`tools/compare/backDipRightSideProbe.py`). Scratch driver scripts not
committed (same convention as the KADABRA probe's own `probe.py`); raw
transition dumps are banked alongside this README.

**Findings** (`hitmarker-battletype-dense.json`, `battler0-transitions.json`,
`battler1-transitions.json`):

1. `gHitMarker & HITMARKER_NO_ANIMATIONS` is `0` before battle init, flips to
   `0x80` at frame 1199 (`BattleStartClearSetData`) and **stays set for the
   rest of the trace** — confirmed by direct RAM read, not inferred.
2. `gBattleTypeFlags` is `0x0008000c` throughout the materialize window —
   `BATTLE_TYPE_LINK` (`1<<1`) and `BATTLE_TYPE_RECORDED_LINK` (`1<<25`) are
   both **unset**. The exempting clause in `BattleAnimateBackSprite`'s `if`
   does not apply; the gate's condition evaluates **true**.
3. Player battler (slot 0): callback is `SpriteCB_PlayerMonFromBall` for 14
   frames (1728-1743) — `sprite->affineAnimEnded` has clearly not gone true
   yet, since `SpriteCB_PlayerMonFromBall`'s only body is
   `if (affineAnimEnded) BattleAnimateBackSprite(...)`, and `BattleAnimateBackSprite`
   is a one-shot synchronous callback swap, not a multi-frame ramp. During
   those same 14 frames `y2` descends **14,13,12,11,10,9,8,7,5,4,3,2,0** (the
   exact sequence `docs/probes/kadabra-materialize-settle/README.md`
   attributed to "KADABRA's own back-send-out animation family
   (shrink/grow-vibrate per `GetSpeciesBackAnimSet`)"). Only at frame 1744 —
   one frame after `y2` reaches 0 — does the callback flip to
   `SpriteCallbackDummy`, i.e. `BattleAnimateBackSprite` finally runs (once
   `affineAnimEnded` goes true) and freezes the sprite exactly per source.
   `y2` stays 0 forever after (the later ±1 jitter from frame ~1841 on is the
   already-documented, unrelated idle-menu-bounce).
4. **Opponent battler (slot 1, a different species) shows the identical
   sequence** — `SpriteCB_OpponentMonFromBall` for frames 1587-1599 with `y2`
   descending **14,13,12,11,10,9,8,7,5,4,3,2,0**, byte-identical to the
   player side's sequence, before its own callback flips to
   `SpriteCallbackDummy` at frame 1602.

Two different species on two different sides producing the byte-identical
13-value sequence rules out a per-species back-anim (or front-anim) family —
this is a **species-agnostic, unconditional** mechanism that runs and
completes *before* `affineAnimEnded` triggers the (genuinely, symmetrically
gated) `BattleAnimateFrontSprite`/`BattleAnimateBackSprite` call. It is not
what either side's per-species dispatcher (`frontSendOutFrameAtTick`/
`backSendOutFrameAtTick`) models.

## Mechanism identification

`src/engine/battleScene.ts` already has this exact table, already understood
as species-independent:

```ts
// battleScene.ts:4900
const MATERIALIZE_Y2_TABLE: readonly number[] = [14, 13, 12, 11, 10, 9, 8, 7, 5, 4, 3, 2];
```

— tied to `BATTLER_AFFINE_EMERGE`/`sAffineAnim_Battler_Emerge` (the ball's own
unconditional "grow out of the ball" affine sequence, `battleScene.ts:4786-4823`),
consumed by `drawGrovyleMaterialize`/`drawKabutoMaterialize` (front side) and
by `drawPlayerSideAffineMaterialize` (`battleScene.ts:4993`, doc comment:
*"Species-independent player-side ReleaseMonFromBall affine collapse"*),
which `drawGeneratedPlayerMaterialize` **already calls** for
`PLAYER_MATERIALIZE_START_TICK..PLAYER_MATERIALIZE_END_TICK`
(`battleScene.ts:4546-4558`). This is mechanism 1 (unconditional,
pre-`affineAnimEnded`) and is not what regressed — entry 894 (`7e14afae`)
never touched it.

The code entry 894 gated (`generatedPlayerMaterializeSettleY2`, active for
`playerVisualT >= PLAYER_MATERIALIZE_SETTLE_START_TICK`, i.e. *after*
`PLAYER_MATERIALIZE_END_TICK`) is mechanism 2 — `battleMenu.ts`'s
`PLAYER_SETTLE_WOBBLE_Y2_TABLE`/`playerMaterializeSettleY2`. That table's own
doc comment (`battleMenu.ts:700-729`) already states its derivation
explicitly: RAM tick 1666, ONIX's `affineAnimEnded` goes true, and
`BattleAnimateBackSprite` **launches** `GetSpeciesBackAnimSet(SPECIES_ONIX) =
BACK_ANIM_V_SHAKE` — i.e. the trace this table was RAM-derived from did *not*
take the frozen branch, meaning `HITMARKER_NO_ANIMATIONS` was not the
controlling condition there (a legacy "destin"/"jenson" canonical trace,
distinct from the generated route's Scene-OFF profile). The same doc block
even says outright: *"The older ONIX window's later bob belongs to Scene
ON"* (carried into `generatedPlayerMaterializeSettleY2`'s own comment,
`battleScene.ts:4530-4531`) — this run's own prior work already flagged the
mismatch and shipped a partial (first-6-tick, ONIX-only) application of it
anyway, "until the dispatcher lands."

## Conclusion — STOP, do not wire `backSendOutFrameAtTick` here

Per the brief's own step 1 instruction: the back path **is** gated by Scene
OFF, identically to the front path (source + live RAM confirm this beyond
doubt). ISSUES #74/#71's "asymmetric OFF gating" framing is incorrect. Wiring
`backSendOutFrameAtTick(species, nature, tick)` — the per-species+nature
back-anim-family dispatcher — into `drawGeneratedPlayerMaterialize`'s settle
path would apply the wrong mechanism: that dispatcher models
`LaunchAnimationTaskForBackSprite`'s per-species idle family, which this
probe proves **never runs** under Scene OFF for either side. It would only
coincidentally match KADABRA (whose `backShrinkGrowVibrateFrameAtTick`
reducer output happens to equal the universal `MATERIALIZE_Y2_TABLE`
sequence for the ticks probed here) and has no source-justified reason to
match YOSHI or MAGNETON at the actual regressed frames (640/621), which — per
entry 894's own commit boundary — live in the mechanism-2 (settle) window,
not mechanism 1.

**Not yet answered, left for the next session:** whether frame 640/621
themselves land inside mechanism 1's window (already modeled, so the real bug
is a clock/alignment fault, not a missing table) or genuinely inside
mechanism 2's window (in which case the right fix is almost certainly "draw
flat `y2=0` for every species once `BattleAnimateBackSprite` freezes" — since
per this probe that is what Scene OFF actually does for **every** species,
ONIX included — not a species-keyed dispatcher call at all). That requires
probing the actual committed `factory-arbitrary-intro-yoshi-off`/`-magneton-off`
generated-route traces directly (not the standalone KADABRA scenario used
here) to map `playerVisualT` at those exact oracle frames against
`PLAYER_MATERIALIZE_START_TICK`/`_END_TICK`/`_SETTLE_START_TICK`, and to
re-examine whether `PLAYER_SETTLE_WOBBLE_Y2_TABLE`'s ONIX-only partial
application (`battleScene.ts:4533-4536`, ticks 1664-1669) is itself already a
latent Scene-OFF bug now that this probe shows the back animation task never
launches there either.
