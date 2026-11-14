# hie-scout -- plan for ISSUES #220 (held-item effect animation not presented)

Read-only scout, 2026-11-14 CAX31 run (Sonnet 5.5 worker, supervisor-committed verbatim; file:line claims are the scout's, re-check before building on them).

The plan is below. It is read-only and the worktree is clean. I did not run any ROM or engine measurements, so the frame numbers are derived from the sources and committed timelines, not measured.

**Open question for the supervisor:** the "both scenes" claim in #220 and PROGRESS is unproven for Scene OFF. The 214-235 figure has only Scene ON ROM windows behind it (aud250 `docs/aud250-general-anim-sounds.md:9`). In OFF the ROM runs `pause 32` here instead of the animation.

### 1. Factory-reachable results that play B_ANIM_HELD_ITEM_EFFECT
- Every site is `playanimation … B_ANIM_HELD_ITEM_EFFECT` in `data/battle_scripts_1.s:4267-4420`. `ItemBattleEffects` picks the script (`src/battle_util.c`).
- Each entry gives the item, the script, and the `battle_util.c` line where it is chosen. The item names come from `src/data/gen/battle-frontier-held-items.json`.
  - Leftovers → `BattleScript_ItemHealHP_End2` (`:3409`, `:4377`).
  - Oran, Sitrus, Berry Juice → `ItemHealHP_RemoveItem` (`:3343`, `:4356`).
  - Figy, Wiki, Mago, Aguav, Iapapa → `BerryConfuseHealEnd2` or `ItemHealHP_RemoveItem` (macro `:3227-3243`, `:4423`).
  - Leppa → `BerryPPHealEnd2` (`:3376`, `:4388`).
  - Liechi, Ganlon, Salac, Petaya, Apicot, Starf → `BerryStatRaiseEnd2` (`:3253`, `:3439`, `:3494`, `:4410`).
  - Lansat → `BerryFocusEnergyEnd2` (`:3460`).
  - Cheri, Chesto, Pecha, Rawst, Aspear, Persim → `BerryCure*End2` (`:3503-3544`); the `*Ret` variants at `:3646-3703` play the same animation.
  - Lum, Mental Herb → `BerryCureChosenStatus` (`:3589`, `:3598`, `:3703`, `:3735`).
  - White Herb → `WhiteHerbEnd2` / `Ret` (`:3326`, `:3397`, `:3753`).
  - Shell Bell → `ItemHealHP_Ret` (`:3787-3803`).
- Not this animation: Quick Claw, Focus Band (`B_ANIM_FOCUS_BAND`) and the stat-only held items.
- **Engine today, Scene ON:**
  - The kernel emits an `animation` event (`battleScriptStatbuffchangeOpcode.ts:234-237`, branch 5).
  - The presentation only sets `pendingHeldItemEffectBattler` (`battleResolutionPresentation.ts:4576-4585`), which names the next message's owner and `B_LAST_ITEM` (`:2918-2920`, `:4136-4157`) and is cleared by the next message (`:4491`).
  - There is no command, so the frames are 0. The next frames are the message, the hold, then the `hp` / `status-icon` commands.
  - The sprite-order host and the sprite allocator already treat it as net-zero (`spriteOrderProductionPlans.ts:318`, `liveMoveSpriteAllocator.ts:115`, `liveSpriteOrderHost.ts:472`). No new hook is needed there.
- **Engine today, Scene OFF:**
  - `Cmd_playanimation` takes the `HITMARKER_NO_ANIMATIONS` branch and calls `BattleScript_Pausex20`, which is `pause B_WAIT_TIME_SHORT` = 32 (`battle_script_commands.c:4014-4018`, `battle_scripts_1.s:3151`, `battle.h:326`).
  - The kernel does the same (`battleScriptStatbuffchangeOpcode.ts:358-372`) and emits no event, so the message owner comes from the message payload (`battleResolutionPresentation.ts:2910-2920`).
  - The 32-frame pause is not turned into a presented hold. `sourcePauseUsedMoveHoldFrames` only handles the used-move print and `sceneOffStatusFrames` only handles status commands. I found no held-item case, so OFF is probably about 32-38 frames short per site (`USED_MESSAGE_B_WAIT_TIME_SHORT_HOLD_FRAMES` = 38, `:884`). This is unmeasured.

### 2. ROM frame cost (Scene ON)
- `General_HeldItemEffect` is at `data/battle_anim_scripts.s:10440-10460`:
  - Three `RotateMonToSideAndRestore` rotations, each followed by a wait.
  - `GrantingStarsEffect` (`:10040`): two stars, a `delay 8` after each.
  - A palette blend of 4 steps × 5 frames, plus the thin ring.
- The Sitrus timeline already measured on the ROM is in `src/animation/heldItemHeal.ts:8-17`. Age 0 is the first identity rotation display:
  - 3 × 32 rotation ticks = 96, stars visible at 96 and 106 (61 ticks each).
  - Ring at 167, tint 168-187, ring 32 ticks.
  - Heal text first glyph at 204, HP climb at 306 (=204+35 glyphs+64 hold+3), text clear 342, menu 348.
- So the animation costs about 204 frames from its first display to the first text glyph. The 214-235 range is that 204 plus a controller launch lead of about 10-30 that varies per site. I did not derive that lead; the spread needs a ROM window.
- Rotation, star, ring and tint tables are already ROM-exact, but only for Sitrus on Onix in the fixed canonical scene.

### 3. What exists and what is missing
- **Exists:**
  - Art: `src/assets/gen/battle-anim-item-heal.json` (`sparkle` and `ring`), loaded as `battleAnimItemHeal` (`battleScene.ts:698`, `:3294`).
  - Pure reducers in `heldItemHeal.ts`: rotation (`:63`), stars (`:84`), tint (`:102`), ring matrix (`:115`).
  - Draw helpers: `drawGrantingStarsAtAge` (`battleScene.ts:10112`) and `drawSpriteSheetAffineTintedBlend` (`:6934`).
  - Palette tint colour `ONIX_SITRUS_TINT_COLOR`, RGB5(17,31,25) (`battleScene.ts:10029`).
  - A caller for all of these in the icePunch Onix fixture (`battleScene.ts:49907-50075`, `controllerDisplayProfile.heldItemHeal`).
  - The sound variant: `General_HeldItemEffect` in `anim-sound-timing.json`, 326 frames, gated 4.
- **Missing:**
  - A command type, a command-duration case, a command frame constant, and a render effect.
  - A generic, battler-parametric view. The existing draw is hard-wired to the icePunch scene and to Onix, with a heal text and HP climb of its own. It needs a `generalAnimationRenderView` branch like `FOCUS_PUNCH_SETUP` (`battleScene.ts:7954-8000`): rotate the battler by `sitrusRotationAtAge`, tint it, and add the stars and the ring.
  - A defined display layering order for those sprites.
  - The lead rows and the SE anchor (`HELD_ITEM_EFFECT_SCRIPT_AGE`).

### 4. Step plan (2 worker steps; split the second only if its lab measurement leaves a residual)

**Step 1, command + timing + OFF pause (gameplay unchanged):**
- In `battleResolutionPresentation.ts`, extend the `general-animation` command's `animation` union (`:614-`, `:4576`) with `"HELD_ITEM_EFFECT"`.
  - Scene ON: push `{type:"general-animation", animation:"HELD_ITEM_EFFECT", battler, timing:{minimumFrames: HELD_ITEM_EFFECT_COMMAND_FRAMES}}` before setting `pendingHeldItemEffectBattler`. The first value is about 204 plus the lead, to be fixed from a ROM window.
  - Scene OFF: add a 32+lead row hold before the message, using the `instructionExecution` provenance method of `sourcePauseUsedMoveHoldFrames`. It is not guarded by `usedMessageHoldFrames`.
  - Skip it when the battler is behind a substitute doll, as the render path does (`battleResolutionPresentationRender.ts:2369`). The kernel's semi-invulnerable skip (branch 4) already emits nothing.
- Add the `general-animation` case in `battleResolutionCommandDuration` (`:1726-1728`, already `minimumFrames`) and a `liveSpriteOrderHost` pin.
- **Proof:** a staged lab per scene, copied from the aud250 pattern. Use `aud241bStage(...)` in `tools/compare/appTrace.ts` (`:1910-1914`) with a `tools/battle-lab/*.json` lab.
  - Start from `mechanic-endturn-items1-leftovers-off.json` (OFF); the ON copy needs the same lab with `profile: battle-scene-on`.
  - Items: Leftovers (end-turn), a berry (Oran or Sitrus), Shell Bell (move-end) and a cure berry (Chesto).
  - `npm run compare` against a fresh ROM drive gives the segment length per site; it should also expose the 10-30-frame lead spread.
- **Pins that will move** (the segments get longer by about 204+ ON and 32+ OFF): every compare trace and test pin containing a held-item segment.
  - The ROM-matched stage files with Leftovers, the `ice-punch-grovyle-onix` fixture and the `lsd194Census` `commands` / frame fields.
  - I did not list the exact files; run the full census and the gates to find them.
  - Verify instead of guessing: the `sceneOnPresentation` Sitrus profile (`heldItemHeal.animationIdentityAge`) is a fixture-scene input, so the icePunch scene should stay identical.
- **RNG and gameplay digests:** none can move.
  - Presentation commands consume no RNG, and the kernel events are unchanged.
  - Run `lsd194Census.sh` on seeds 0-199 for both scenes, as the aud249 / aud250 neutrality check did; it was `eventsDigest` / `commands` / sound identical then.
  - `commands` and frame digests will change by design. Keep a before / after capture to prove only those fields moved.
  - Presentation timing changes battle length in frames, so the 80,000-frame ROM drive cap seeds (6568 / 7682) are the risk to watch.
  - `docs/parity-mac` stages at 64 / 64 and soak `budget` outcomes are rule-level and stay unchanged. Re-run the soaks to confirm.

**Step 2, renderer (Scene ON):**
- Extend `generalAnimationRenderView` (`battleScene.ts:7970`) for `HELD_ITEM_EFFECT`.
  - Reuse `sitrusRotationAtAge`, `sitrusStarPlacementAtAge` (via `drawGrantingStarsAtAge`), `sitrusTintCoeffAtAge` and the ring matrix, parametrized by the animated battler's corner and animation centre in place of the Onix constants.
  - Wire it in through `battleResolutionPresentationRender.ts` as a new effect, using the same lead trick as the existing `general-animation` effect (`:2369-2377`).
- Make the age-zero epoch exact: command age 0 is the first identity display, with a lead of 1-2 frames at most. Confirm it against the Sitrus canonical ROM trace (`turn5-sitrus-ring-probe` fixture) and the new Step 1 staged ON window, pixel for pixel.
- The `ice-punch-grovyle-onix` scene (`tests/animation/icePunch.test.ts`) must stay frame-identical.

**Step 3 (sound; only if cheap):**
- After the timing is exact, emit SE 152 / 228 / 102 from `anim-sound-timing.json` in `moveAnimSounds.ts:246-262`, with `HELD_ITEM_EFFECT_SCRIPT_AGE` calibrated per window as in aud250.
- Scene OFF has no SE here (`Pausex20`).
- Rescore with `tools/audio/aud250RunSeed.sh` / `aud248RunSeed.sh`: the 43 ROM-only rows on the 5 ON seeds should go to 0 (SE 152: 24, SE 102: 11, SE 228: 8).

**Risks:**
- The unmodelled lead spread of about 20 frames across sites, which could mean per-item or per-site variants.
- The battler's x2 history and its shadow while it rotates.
- Whether Scene OFF's measured hold is exactly 32+lead or has per-site dispatch steps.
- Multi-effect segments (the confuse berry prints twice, the stat berry also plays a stats-change animation) need their frame costs checked against the existing `stats-change` hold rules.
- The bounding risk is the iceplunch/Sitrus fixture scene pins; keep them separate.
