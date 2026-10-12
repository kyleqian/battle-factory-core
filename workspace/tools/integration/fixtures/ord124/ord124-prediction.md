# ord124 prediction (committed BEFORE the ROM RAM check; docs/ord124-order-plans.md)

## Odor Sleuth 316 (both sides)

Source: `Move_ODOR_SLEUTH` (battle_anim_scripts.s:4220), `AnimTask_OdorSleuthMovement` / `MoveOdorSleuthClone`
(battle_anim_effects_3.c:4955-5058), `CloneBattlerSpriteWithBlend` (battle_anim_mons.c:1626), `UpdateOamCoords` / `BuildSpritePriorities` /
`SortSprites` (sprite.c:339-440).

1. The task clones the target twice. Each clone takes the LOWEST free slot number (`for i in 0..63: if !inUse`), like CreateSprite (`f`).
   `gSprites[i] = gSprites[target]` copies the target's subpriority, oam.priority AND oam.y; only x2 / data / invisible / objMode differ.
2. `Cf;Cf`: the two `gHorizontalLungeSpriteTemplate` sprites (delay 24, delay 6), each destroyed on its own frame (`D2;D3`).
3. Both clones run the same counters (data[2] 60 frames, then data[5] 24 -> <0 in 13 steps): they are destroyed in the same frame.
4. Through their whole life the two clones have EQUAL SortSprites keys: same priority word, same oam.y (UpdateOamCoords writes
   y + y2 + centerToCornerVecY for the visible one; y / y2 never change and the copied value is the same). `SortSprites` is an insertion
   sort that swaps only on a strict key inequality, so two equal-key entries never change their relative sSpriteOrder order: the pair
   leaves (and is freed) in the order the two slots had in the free order at creation, i.e. the lend.
5. Then the `complex_palette_blend` controller (`Cf;D4`).

Prediction: `Cff;Cf;Cf;D2;D3;D0,1/P<w>,<w>;Cf;D4`, the FDERIVED group with tied words orders by F index at creation (applySpriteOrderUnitPlan):
- `316:player` (target = opponent battler, word 552) and `316:opponent` (target = player battler, word 542);
- D0,1 when the lower clone slot precedes the other in the lend, else D1,0. plans69's two "geometry" classes are therefore LEND classes:
  every plans69 instance with F0 `[3, 4, ...]` is D0,1, every one with `[4, 3, ...]` is D1,0 (checked in ord124Check.ts on plans69's
  18 committed units AND on the fresh ord124 probes, first and later bodies, both sides).

## Hyper Beam 63 (not predicted: RANDOM2 + geometry, plans69)

`AnimHyperBeamOrb` (battle_anim_effects_1.c:2336) draws 3 Random2 words per orb (52 orbs) and the orb lifetime follows
`AnimFastTranslateLinear` with speed `(Random2() & 31) + 64` over the attacker -> target distance; the destroy order of each same-frame
group follows y. No plan text can carry it; the recharge turn (`B_ANIM` none, `BattleScript_MoveUsedMustRecharge`) creates no sprite:
predicted lend unchanged across it (checked on the probes' recharge-turn gap units).
