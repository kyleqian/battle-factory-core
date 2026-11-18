# kno1: implementation plan for B_ANIM_ITEM_KNOCKOFF (Knock Off item-knocked-off animation)

Read / measure only (no `src/`, `tests/` change, nothing run). Base `230f9883e`. Sources: `reference/pokeemerald` (paths below), `docs/aud251-s11-scoreboard-refresh.md` out1 / out2,
`docs/wsh1-general-anim-commands.md`, `src/` as of the base. Items marked **unmeasured** need a ROM run in the implementing step.

## 1. The ROM script

`BattleScript_KnockedOff` (`data/battle_scripts_1.s:3643`): `playanimation BS_TARGET, B_ANIM_ITEM_KNOCKOFF; printstring STRINGID_PKMNKNOCKEDOFF; waitmessage B_WAIT_TIME_LONG; return`.
`BS_TARGET` = the mon that lost its item (the Knock Off victim).

`General_ItemKnockoff` (`data/battle_anim_scripts.s:10356-10359`):

```
loadspritegfx ANIM_TAG_ITEM_BAG
createsprite gKnockOffItemSpriteTemplate, ANIM_TARGET, 2
end
```

One sprite, no task, no palette op, no background, no `waitforvisualfinish` (the script `end`s at once; the controller keeps the battle script waiting until
every anim sprite is destroyed). The only ops are therefore: **1 gfx / palette load** (`ANIM_TAG_ITEM_BAG`, `src/data/battle_anim.h:1236` tiles 0x200 + :1529 palette,
`graphics/battle_anims/sprites/item_bag.png`) and **1 sprite**.

## 2. The sprite and its lifetime

`gKnockOffItemSpriteTemplate` (`src/battle_anim_effects_1.c:792-801`): tile / palette tag ITEM_BAG, OAM `gOamData_AffineNormal_ObjNormal_32x32`, anim
`gFallingBagAnimTable` (one frame, tile 0, duration 30; `:755-763`), affine table `gFallingBagAffineAnimTable` (:765-779: cmds1 = wobble -4 x10, +4 x20, -4 x10 = 40 frames,
cmds2 = the small shake -1/+1 steps, used from Step2), callback `AnimKnockOffItem`.

`createsprite` (`src/battle_anim.c:360-`) with the ANIM_TARGET flag takes its subpriority from the target battler (+ arg 2; subpriority arg decode at :382-390);
the sprite is created at the **target's sprite coordinates** (confirm the exact `CreateSpriteAndAnimate` x / y lines at ~:400-420, the same path every `createsprite` takes;
`AnimKnockOffItem` itself never calls `InitSpritePosToAnim*`, so the start is the creation position).

`AnimKnockOffItem` (`battle_anim_effects_1.c:3062-3087`), once, on its first callback:

| target side | data[6] (end x) | data[7] (end y) | `InitItemBagData(sprite, 40)` | data[3] / data[4] | next callback |
| --- | --- | --- | --- | --- | --- |
| player (`B_SIDE_PLAYER`) | 0 (-> -32 in `moveAlongLinearPath`) | targetY + 10 | 40 frames | 3 / 60 | `AnimItemSteal_Step1` |
| opponent | 255 (-> 240 + 32 = 272) | targetY + 10 | 40 frames | 3 / 60 | `AnimKnockOffOpponentsItem` |

(`targetY` = `GetBattlerSpriteCoord(target, BATTLER_COORD_Y)`; `IsContest()` irrelevant in the Factory.) `InitItemBagData` (:2947) packs start (x << 8 | y), end, and
`40 << 8` into data[5..7]; `moveAlongLinearPath` (:2955-2985) is the linear x / y at `elapsed / 40` and returns TRUE when `++currentTime == 40`.

Per-callback behaviour (both: `data[0] += data[3] * 128 / data[4]` = +6 per callback, `data[1]` counts bounces each time `data[0]` passes 127):

* `AnimItemSteal_Step1` (:2998-3013, **player target**): `y2 = Sin(data[0] + 128, 30 - data[1] * 8)`; on path end `y2 = 0`, `data[0] = 0`, -> `AnimItemSteal_Step2`
  (:2988-2996): at `data[0] == 10` `StartSpriteAffineAnim(sprite, 1)` (the cmds2 shake), `data[0]++`, destroyed when `data[0] > 50`, i.e. **51 callbacks** with the bag sitting at x = -32 (off screen).
* `AnimKnockOffOpponentsItem` (:3044-3060, **opponent target**): the same Step1 arithmetic (`Sin(data[0] + 0x80, 30 - data[1] * 8)`), on path end `y2 = 0; data[0] = 0; DestroyAnimSprite(sprite)`:
  **no Step2**.

Affine anim 0 (the 40-frame wobble, `gFallingBagAffineAnimCmds1`) runs from creation in both cases. Lifetime summary: foe target = 40 path callbacks (+ creation
frame), then destroyed; player target = 40 + 51. The out2 rows (**43** vs **94** animation-active rows) differ by exactly **51 = the Step2 tail** (43 + 51 = 94).

## 3. Why the sides differ (43 vs 94)

Source-level, not a measurement artifact: the player-side branch reuses the Thief / Present return-flight callback (`AnimItemSteal_Step1` -> `Step2`), whose Step2 keeps the sprite
alive for 51 more callbacks after the bag has already flown off to x = -32 (nothing visible on screen except the affine shake of an off-screen sprite), while the opponent branch has its
own callback that destroys the sprite on arrival. So visibly both sides show the same ~40-frame bag arc (the player side: flying left off the screen; the foe side: flying right off the
screen); the extra 51 rows on the player side are an invisible wait that nevertheless holds the battle script (the controller waits for the sprite). The command length must therefore be
side dependent (by the **target's** side) even though the drawing is the same arc mirrored.

Measured ON rows (out2, §B): `knockoffrev` (player target) `KnockedOff+0` 188 -> anim active 193 .. 287 (94) -> print exec 289 = **105** rows playanimation -> print; `knockoff` (foe target)
483 -> active 509 .. 552 (43) -> print 554 = **70** rows. **Unmeasured / unexplained:** the *lead* from `playanimation` to the first active animation row is 5 (player target) vs 26 (foe
target); it is not in the script (loadspritegfx + createsprite). Candidates: the controller launch lead differs between a player-side and an opponent-side `TryHandleLaunchBattleTableAnimation`
(wsh1 saw launch leads of the same order for Wish / Focus Band), or the foe-target lab run overlapped the preceding HP bar drain (ROM `KnockedOff+0` can begin while the controller is still
draining). First measurement for the implementing step: rerun `out2-knockoff{,rev}-on` and print, per row, `gBattleControllerExecFlags` / `gBattleControllerOpponentBufferRunCommand` between
`KnockedOff+0` and the first active row; this decides whether 70 / 105 are two constants or 43 / 94 + one constant lead. Also re-measure on the Substitute / semi-invulnerable
skip (see §6).

## 4. What already exists live (reuse) vs what must be ported

Reuse (all in `src/`):

* **Item-bag arc machinery**: `src/animation/present.ts` `bagAtAge` (the Present / Thief-family `AnimItemSteal_Step1` -> `Step2` bag: the linear path `trunc((end - start) * elapsed / 60)`,
  `Sin(phase + 128, 30 - bounce * 8)` with `phase = callbackCount * 6 % 132` ... exactly the Step1 arithmetic, `GBA_SINE_TABLE_256`, `bagAngleAtAge` wobble 8 / 36 / -36 steps = the cmds1 table
  and `BAG_WOBBLE_2` = the cmds2 shake). It is parameterised for 60 frames and an attacker -> target path with a 4-frame load lead (`age < 4`); Knock Off needs: 40 frames, start = target pic
  coord, end = (-32 | 272, targetY + 10), age 0 = creation, no 4-frame lead.
  Also `src/animation/covet.ts` (`COVET_ITEM_BAG_LOAD_AGE`, `itemBagAssetLoaded`, `assets/covet.json`) and `src/animation/trick.ts` / `sceneOnPresentation.ts` already load the ITEM_BAG tiles
  + palette and draw the 32x32 affine OBJ, so **no new asset extraction** is expected (verify `item_bag` is the same sheet / palette as Present's bag; Present's is `ANIM_TAG_ITEM_BAG` too).
* **Command plumbing**: the kernel already maps `B_ANIM_ITEM_KNOCKOFF` -> `animationId: "ITEM_KNOCKOFF"` (`src/engine/battleScriptStatbuffchangeOpcode.ts:243`, the same table that has
  `WISH_HEAL` :228), the live sprite allocator already lists `ITEM_KNOCKOFF` as a net-zero general animation (`liveMoveSpriteAllocator.ts:116`) and `spriteOrderProductionPlans.ts:320`
  carries `ITEM_KNOCKOFF: 195`. The sound table has the entry too (§7).
* **Command projection hook**: `battleResolutionPresentation.ts:4818-4826` (the `WISH_HEAL` / `FUTURE_SIGHT_HIT` / `FOCUS_BAND` branch that pushes into `heldItemEffects` with a frame
  count) and the `general-animation` command type's `animation` union at :656; Scene OFF hold map `WSH1_OFF_HOLD_LEAD` at :1394; Scene ON render dispatch `battleScene.ts:8008`
  (`wishHealRenderView`) beside which an `itemKnockoffRenderView` goes; the OFF pause hold machinery is `heldItemEffectOffHoldFrames` (same file).

Must be ported / written:

1. `src/animation/itemKnockoff.ts` (pure rows, `*AtAge`, in the style of `wishHeal.ts` / `focusBand.ts`): `itemKnockoffAtAge(age, side, targetPicXY)` -> `{ bag: {x, y, y2, matrix} | null, destroyed }`.
   Either (preferred) generalise `present.ts bagAtAge` into a shared `itemBagArc(age, start, end, totalFrames)` used by both (the Present test must stay byte-identical), or copy the 15 lines.
   Foe target: visible for ages 0 .. 40, then gone. Player target: arc 0 .. 40, then 51 rows with the sprite at (-32, end y) i.e. invisible (plus the cmds2 affine at Step2 data[0] == 10: no pixels).
   The exact first / last visible row (creation row vs first callback row, `y2` at the creation frame) must be pinned from a ROM frame hash run, as wsh2 did for the other three.
2. The command: a fourth `general-animation` `animation: "ITEM_KNOCKOFF"` (see §5), a `battleScene.ts` render view + `battleResolutionPresentationRender.ts` start offset (`GENERAL_SCRIPT_START_FRAMES.ITEM_KNOCKOFF`
   = the playanimation -> first-active-row lead if constant, §3).
3. Scene OFF: the 34-row `Pausex20` hold (§5); nothing drawn.
4. Tests (`tests/` in the implementing step, not here): Tier-1 `tests/kno1ItemKnockoff.test.ts` in the shape of `tests/wsh1GeneralAnimCommands.test.ts` (command present once per Knock Off with an item, with the right
   length per target side, absent when the target has no item (no `KnockedOff` script), absent behind a Substitute / semi-invulnerable, and OFF length 34); labs: the existing `tools/battle-lab/out2-knockoff{,rev}-{on,off}.json` (+ `-noitem` controls); traces / stages like
   wsh2's (`appTrace.ts` stage ids `kno1-*`).

## 5. Command shape (precedent: HELD_ITEM_EFFECT / WISH_HEAL / FUTURE_SIGHT_HIT / FOCUS_BAND, wsh1)

* Scene ON: `{ type: "general-animation", animation: "ITEM_KNOCKOFF", battler: <knocked mon's battler (the `animation` payload's `battler`, BS_TARGET)>, timing: { minimumFrames: N } }`
  inserted **before** the knocked-off print (the receipt order is `animation` then `print`, so the `heldItemEffects` insert-at-`commands.length` mechanism at :4818 puts it in the right place with
  no reordering), `afterStatus: false`. `N` by target side from §3: `ITEM_KNOCKOFF_COMMAND_FRAMES_OPPONENT_TARGET` ~ 70, `..._PLAYER_TARGET` ~ 105 (`battler === 0` -> 105), to be
  re-derived at the pre-segment offset exactly as wsh1 did (first row of next print minus command start; out2 rows above are playanimation-exec -> print-exec).
* The after-message **15-row move-animation stub is not part of this** (out2 §B last bullet: generic mover-to-mover gap), so nothing to drop.
* The `playanimation` skips apply as for the other three: no command behind a displayed Substitute doll (`substituteDoll`, already in the insert loop; `TryHandleLaunchBattleTableAnimation`
  returns TRUE unless the id is in `ShouldAnimBeDoneRegardlessOfSubstitute`, and ITEM_KNOCKOFF is not) and none for a `STATUS3_SEMI_INVULNERABLE` target (kernel already emits nothing).
  Knock Off cannot hit a semi-invulnerable target in the normal way, but the guards are already generic; the Substitute case is real: Knock Off does not knock off behind a Substitute (`BattleScript_KnockedOff` is
  reached only when the item is removed, `MOVE_EFFECT_KNOCK_OFF`'s substitute check), so this should be a no-op test.
* Scene OFF: `Cmd_playanimation` with `HITMARKER_NO_ANIMATIONS` pushes `BattleScript_Pausex20` = **34 rows** (`KnockedOff+0` -> `+0x7`; 32-frame pause + 2 steps), both targets (out2: 34 / 35 rows). Present it as a
  `Pausex20`-style hold (the OFF twin of Wish 36 / Focus Band 40 / Future Sight 42): add `B_ANIM_ITEM_KNOCKOFF` to the `WSH1_OFF_HOLD_LEAD` family at `battleResolutionPresentation.ts:1394` or a dedicated constant `ITEM_KNOCKOFF_OFF_HOLD_FRAMES = 34`
  (+1 for the player target, **unmeasured: 34 vs 35 is likely the HP-hold overlap, not the script**). Out2's caveat applies: the app's fixed 28-row HP hold already overlaps part of the pause (16 of 34 in `knockoff`, none in `knockoffrev`), so the OFF insert must be the
  pause minus what the preceding HP hold already covers, or the HP hold must come from the ROM drain; measure with `out2-knockoff{,rev}-off` (expected app - ROM at the print: -18 / -39 before, ~0 after).

## 6. Presentation-seam details to get right

* Draw order / subpriority: ANIM_TARGET, subpriority arg 2 = the target's OBJ subpriority + 2, so the bag draws in front of the target's mon sprite; sprite slot allocation is net-zero (allocator list above), the bag takes one OAM slot for 43 / 94 frames; the live sprite allocator's net-zero assumption must still hold (one create, one destroy per run; check `tests/aud56GeneralAnimationAllocator.test.ts` membership pin: ITEM_KNOCKOFF is already a member).
* The target mon is **not** moved, shaken or tinted by this script; the bag appears on top of it at its pic coord (the item's origin). No `monbg`, no `setalpha`, no BG.
* The foe's elevated shadow / idle bounce: as hie2 / wsh2 (the opponent stands at `liveBattlerAnchors().frontIdleRest`); the script does not hide the shadow, so unlike Focus Band do not hide it.
* Player target = the bag sprite leaves x = 0 -> -32 (the left screen edge; the sprite is clipped by the 240-wide viewport, partially visible while x in -32 .. -16), which `present.ts` already renders (OBJ x < 0 handled).

## 7. Sound rows

`src/data/gen/anim-sound-timing.json` `general` has an entry `{"label":"General_ItemKnockoff","variants":[31,31],"ends":["end","end"],"gated":[0,0]}` and `variants[31]` is `[]`: **the script has no SE ops** (consistent with the
script text: no `playse*`, no `loopse*`), so no SE rows are expected, and the Scene ON ROM must be checked (T2 / sound census) to confirm no SE is emitted during the item animation. Consequence:
`emitGeneralAnimSounds` (`moveAnimSounds.ts:478-`) needs **no** ITEM_KNOCKOFF branch (the `else if (command.animation === ...)` chain falls through to nothing, which is the correct output). Test pin: a Tier-1
assertion that the command emits zero sound rows, plus the sound census (`soundCensusDelta.py`, seeds 0..99 both scenes) is unchanged. No `STATS_CHANGE`-style SE gate is involved.

## 8. Risks / things that can break

* **Frame pins**: every Knock Off-with-item battle moves by +70 / +105 rows (ON) and +16 .. +34 (OFF) at the message; soak frame pins and any T2 / compare golden that contain a Knock Off item loss move (frames only; gameplay digest unchanged, as with wsh1). Run the sound / command census seeds 0..99 both scenes (expect the `eventsDigest` identical, ON command streams gain one command per item loss).
* Factory sets that use Knock Off (check by grep in `src/data` the Knock Off holders) are the only sources; Pickpocket-style abilities do not exist in Gen 3. Item loss also occurs via **Thief / Covet** (`B_ANIM_ITEM_STEAL`, `General_ItemSteal`, a different script and command) and Trick, which are NOT this change.
* The player-target 51-row tail is invisible: easy to drop by mistake because nothing renders; it must stay in the command length (the controller waits for the sprite, out2 measured 94 rows), otherwise the message arrives ~51 rows early again (-105 -> ~ -54).
* Do not touch the 28-row HP hold in the same step (out2: the OFF insert depends on it); land OFF with a separate commit from ON so the ON gates are not contaminated.

## 9. Suggested step order for the implementing run

1. ROM measurement: `out2-knockoff{,rev}-on` per-row bag framebuffer + `gBattlescriptCurrInstr` (lead 5 vs 26, creation-frame x/y, last visible row); `-off` pause rows 34 / 35. (One short run each, `hpd2Probe.py`.)
2. `src/animation/itemKnockoff.ts` + unit test pinning x / y / y2 / affine per age for both sides (against the ROM sprite positions: read OAM from the probe).
3. Command constants + projection (`battleResolutionPresentation.ts`) + render dispatch (`battleScene.ts`), ON only; compare hashes against the labs (target: exact rows over the 43 / 94 window, as wsh2's table).
4. OFF hold commit, with the HP-hold overlap handled.
5. Gates: `npm run test:gate`, build, boundary tests (`tests/animation/animationBoundaryRatchet.test.ts`), census 0..99 both scenes, soak, T2 on the Knock Off windows (out1: Rock Slide s165 res18 expected -115 -> ~ -16).

Verification for this doc: docs only; no code, no tests run. Tested identity: base `230f9883e` (see the commit for this file).
