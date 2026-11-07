<!-- Read-only worker report (aud242d scout, 2026-11-07, Sonnet 5.5, ~8 min; scratch /tmp/aud242d). Saved verbatim by the supervisor; UNVERIFIED: the BlendBattleAnimPal Step2 lifetime formula and every "solo" count are the scout's derivations; check before relying on them. -->

## aud242d scout report (read-only; worktree clean, scratch in `/tmp/aud242d`)

**Method.** I copied `extract-anim-sound-timing.ts` to `/tmp/aud242d/extract*.ts` with paths hardcoded and a hook that records the pending items blocking the first unresolved wait. It reproduces the repo output exactly (739 resolved ops, 373 unresolved: 357 unmodelled-lifetime, 11 waitsound, 5 branch). Level-50 scope is the 276 moves in `factory-animation-inventory.json`, turn 0, player attacker.

Two numbers come with every blocker below:
- **behind**: ops gated after a wait that this item blocks (several items can share one wait).
- **solo**: ops emitted if only that item were modelled, using a placeholder lifetime to test reachability.

Level-50 totals are 550 emitted and 268 behind unmodelled waits (118 moves), plus 16 behind `waitsound` or an unresolved branch. The tail is long: 264 distinct first-blockers, and the best single one is +16 ops.

Doc drift: the section 7.3 doc says 347 unmodelled and 363 total; the extractor now prints 357 and 373.

### 1. Top blockers (Level-50 first)

"Sets" is the number of Level-50 rental mon sets carrying the unlocked moves.

| # | blocker (creator) | behind | solo | moves / sets |
|---|---|---|---|---|
| 1 | `AnimTask_BlendBattleAnimPal` (also `...Exclude`, 10 behind) | 30 | +16 | Thunderbolt 68 sets, Thunder Wave 53, Icy Wind, Heal Bell, Sunny Day 25, Hail, Sky Attack, Role Play, Fire/Ice Punch, Dragon Claw, Calm Mind |
| 2 | `AnimTask_StartSlidingBg` | 31 | 1 | Horn Drill, Blizzard, Megahorn, ExtremeSpeed, Silver Wind. It is instant (see below) |
| 3 | `AnimTask_GetAttackerSide` | 17 | 0 | Blizzard, ExtremeSpeed. Also instant |
| 4 | `gBowMonSpriteTemplate` | 14 | 2 | Headbutt, Horn Drill, Drill Peck |
| 5 | `AnimTask_SetPsychicBackground` | 13 | 0 (+9 with the palette family) | Psychic 77 sets, Confusion, Dream Eater, Extrasensory |
| 6 | `metallic_shine` (macro, `AnimTask_MetallicShine`) | 12 | +6 | Steel Wing, Iron Tail, Metal Claw, Poison Tail, Harden, Iron Defense |
| 7 | `AnimTask_ScaleMonAndRestore` | 12 | 2 | 11 moves incl. Roar, Hyper Voice, Growth |
| 8 | `gTriAttackTriangleSpriteTemplate` | 9 | 1 | Tri Attack |
| 9 | `AnimTask_MusicNotesRainbowBlend` | 8 | 0 (+8 greedy) | Sing, Belly Drum, GrassWhistle |
| 10 | `AnimTask_SwayMon` | 8 | 0 | Bubblebeam, Attract |
| 11 | Ice crystal sprites (`gIceCrystalSpiralInward*`, `gIceBeam*CrystalSpriteTemplate`, `create_fist_sprite`) | 7 each | 0 | Ice Punch, Ice Beam |
| 12 | `blend_color_cycle` | 7 | 0 (+3 later) | 19 moves, 128 sets |
| 13 | `gToxicBubbleSpriteTemplate`, `gSludgeProjectileSpriteTemplate`, `gFangSpriteTemplate` | 6 each | +6 each | Toxic 26 sets, Sludge 3, Poison Fang 2 |
| 14 | `AnimTask_TranslateMonEllipticalRespectSide` | 6 | +4 | 11 moves incl. Counter 40 sets, Quick Attack, Agility, Swords Dance |
| 15 | `complex_palette_blend` | 6 | +3 | Double-Edge 52 sets, Reversal, 14 moves |
| 16 | `shake_battle_platforms` | 5 | +5 | Rock Tomb 19 sets, Hyper Voice |
| 17 | `create_overheat_flame_sprite` | 4 | +4 | Overheat 23 sets |

Next in the list: `gHorizontalLungeSpriteTemplate` (+6 once metallic_shine is modelled; Iron Tail, Metal Claw, Brick Break, Knock Off, Astonish, Dragon Claw), `gHornHitSpriteTemplate` (+12, Horn Drill), `create_absorption_orb_sprite` (+3, Giga Drain 38 sets), `AnimTask_CurseStretchingBlackBg` (+3), `gWaterGunProjectileSpriteTemplate` and `gWaterPulseBubbleSpriteTemplate` (+3 each).

**Two non-sprite blockers.**
- **`waitsound`:** Sludge Bomb (6 ops, 40 sets) and DynamicPunch (5 ops, 3 sets). `Cmd_waitsound` (`battle_anim.c:1635`) waits for `gAnimSoundTaskCount == 0`, then for `IsSEPlaying()` to be false with a 90-frame cap. That needs an SE-length table.
- **Unresolved branch:** Fury Cutter, Return, Frustration, Secret Power and Ice Ball, 1 op each.

**Instant tasks are free.** `AnimTask_GetAttackerSide` and `AnimTask_StartSlidingBg` destroy themselves in the creating step (`battle_anim_utility_funcs.c:743-783`), and `StartSlidingBg` only creates a non-visual task. I scanned `src/*.c` for entry functions that call `DestroyAnimVisualTask` without ever assigning `.func` or using `data[]` state. That gives 89 entries (list in `/tmp/aud242d/inst.json`). Treating them as lifetime -1 lifts Level-50 emitted from 550 to 563 and total resolved from 739 to 752. The scan is heuristic, so a worker must audit the list, and one more branch becomes unresolved (6 instead of 5).

### 2. Lifetimes of the top blockers

Paths are under `reference/pokeemerald/src`. "Exact" means the lifetime in the extractor's convention (ticks after the creation tick).

| blocker | source | kind | ported reducer / helper |
|---|---|---|---|
| BlendBattleAnimPal (+Exclude) | `battle_anim_utility_funcs.c:48` (Exclude `:58`), `StartBlendAnimSpriteColor` `:156`, `AnimTask_BlendSpriteColor_Step2` `:169` | Fixed from args (delay, start, target). My derivation, unverified: it blends on calls 1, 1+(d+1), ..., ends on the (\|Δ\|+1)-th blend, so exact = \|Δ\|·(d+1) − 1 (−1 when Δ=0) | No shared reducer. Per-move palette code only (`dragonClaw.ts:88`, `ironDefense.ts:34`); the extractor's `simplePaletteBlendLength` is the template |
| metallic_shine | `battle_anim_dark.c:822` (init), step at `:896-935` | Fixed 96 step calls (`+4`, wraps at 128, ends at the 3rd wrap), so exact = 95 | `metallicShine.ts:5-6` (`METALLIC_SHINE_END_AGE` = 32·3) |
| Toxic / Sludge / Fang | Toxic: `AnimSpriteOnMonPos` `battle_anim_mons.c:1515`, anim `battle_anim_poison.c:16` (4 frames × 5 ticks). Sludge: `battle_anim_poison.c:180` and `:197` (arc, duration = arg 2). Fang: `battle_anim_effects_3.c:347` | Fixed from args or the anim table | `toxic.ts` (`toxicEffectAtAge`), `sludge.ts:8` (`SLUDGE_PROJECTILE_DURATION` 40), `poisonFang.ts:4` |
| TranslateMonEllipticalRespectSide | `battle_anim_mon_movement.c:381` (step), `:410` (entry) | Fixed from args (width, height, loops, speed: counts down on phase wrap) | Per-move code in `counter.ts`, `faintAttack.ts`, `petalDance.ts`, `agility.ts`, `outrage.ts`; no shared lifetime function |
| shake_battle_platforms | `battle_anim_normal.c:957` (init, step runs at once), `:972` (step) | Fixed from args; same recurrence as the extractor's `shakeMonLength`, but the step also runs inside the creating script step, so it is one call earlier. Needs a ROM check | `rockTomb.ts` (`rockTombScriptOffset`) |
| HorizontalLunge | `battle_anim_mon_movement.c:30`, `DoHorizontalLunge` ~`:430` | Fixed from args | `horizontalLunge.ts:34` (`horizontalLungeDestroyTick(duration)` = 2·duration + 4) |
| Overheat flame, WaterGun, WaterPulse, absorption orb | Sprite callbacks in `battle_anim_fire.c`, `battle_anim_water.c:327` and `:444` | Fixed from args; no ROM data dependence found, but not read line by line | `overheat.ts:121` (`OVERHEAT_FIRST_INACTIVE_AGE` 229), `waterGun.ts:8`, `waterPulse.ts:79` (159), `absorption*` |
| BowMon | `battle_anim_effects_1.c:4400-4510` (5 chained steps) | Fixed from args | `hornDrill.ts:124` (`hornDrillAtAge`); not reviewed in detail |
| SetPsychicBackground | `battle_anim_effects_3.c:1372` | Not read | `psychicBackground.ts:19-61` |

None of the top blockers is random. All are fixed lengths or fixed functions of the script arguments. I found no dependence on target position or battler side beyond sign flips. The data-dependent ones are `waitsound` (SE length), `waitbgfade` (background load lag) and the cry tasks (cry length).

### 3. Cry tasks (Factory moves)

| task | Factory moves | difficulty |
|---|---|---|
| `SoundTask_PlayCryHighPitch` (`battle_anim_sound_tasks.c:130`) | Howl, 1 set (Loudred). Plays one cry in the creating step and destroys itself, so exact −1 | Easy: one `cry` event at the step frame. Species comes from the battler (Scene ON, party). Needs a high-pitch mode field |
| `SoundTask_PlayDoubleCry` (`:178`, step `:239`) | Roar, **36 sets**; Growl has 0 sets in the Factory | Medium. ROAR_1 plays at the step, ROAR_2 after at least 3 task calls and once `IsCryPlaying()` is false (`sound.c:428-436`, lengths 10 and 60). Needs the ROAR_1 clip length, or a ROM calibration |
| `SoundTask_WaitForCry` (`:269`) | Roar, Hyper Voice (via `HyperVoiceEffect`) | Medium. Waits at least 3 calls, then for `IsCryPlaying()` to be false. `cry-durations.json` has per-species ticks for a normal cry |
| `SoundTask_PlayCryWithEcho` (`:288`; the script spells it with `Play`) | Hyper Voice only, 1 set (Exploud) | Hard. A state machine (`:310`) with `StopCryAndClearCrySongs`, `ECHO_START`/`ECHO_END`, a duck-without-restore flag, two rounds |

Roar is the one that matters. It has no SE ops, only the two cries, and 36 sets carry it. `src/audio/soundEvents.ts` already has a `cry` kind, but the engine does not model m4a cry length. The Roar timeline therefore needs ROM windows for at least 2–3 species.

### 4. Proposed slices (each at most about 2 h)

Gains are placeholder-lifetime reachability, so real emission needs each lifetime implemented. Cumulative Level-50 emitted would go 550 → 563 → 595 → 644 → 687.

**aud242d (palette family plus instant tasks), expected about +45 ops over 20 or more moves.**
- Instant-task table, audited (+13).
- `BlendBattleAnimPal`/`Exclude` formula, `metallic_shine` = 95, `complex_palette_blend`, `blend_color_cycle`, `HardwarePaletteFade` and `BlendParticle` from their step code. Together these give another +32.
- Moves: Thunderbolt, Thunder Wave, Double-Edge, Calm Mind, Heal Bell, Sunny Day, Hail, Steel Wing, Metal Claw, Iron Tail, Reversal.
- Windows to pin: Thunderbolt and Icy Wind (labs already exist in `tools/battle-lab/aud242b-*.json`), Double-Edge, Calm Mind and Metal Claw for the Exclude and shine paths.
- Risk: the Step2 formula is my derivation and still needs a ROM check. The first window (Thunderbolt) validates it, and one wrong constant shifts every later row.

**aud242e (fixed-length sprites and mon tasks), expected about +49 ops over 15 moves.**
- Sprites and tasks: Toxic bubble (+6), Sludge projectile (+6), Fang (+6), `shake_battle_platforms` (+5), Overheat flame (+4), WaterGun, WaterPulse, absorption orb, `gHorizontalLunge`, `TranslateMonEllipticalRespectSide`, MistBall.
- Moves: Toxic, Sludge, Poison Fang, Poison Tail, Rock Tomb, Overheat, Counter, Giga Drain, Water Gun, Water Pulse, Mist Ball.
- Windows to pin: Toxic, Overheat, Rock Tomb, Counter, Giga Drain.
- Most of these lifetimes can be read straight from the ported reducers listed in section 2.

**aud242f (optional).**
- Mon-movement and misc tasks (+43): `ScaleMonAndRestore`, `SwayMon`, `GrowAndShrink`, `CurseStretchingBlackBg`, `SetPsychicBackground`, `BowMon`/`HornHit` (Horn Drill alone is +12), `TormentAttacker`, `EruptionLaunchRocks`.
- Moves: Psychic (77 sets), Swagger, Curse, Horn Drill, Dream Eater, ExtremeSpeed.
- Roar's cries (36 sets) and Sludge Bomb's `waitsound` (40 sets, 6 ops) could be split off as a separate cry-and-SE-length step.
- After these slices, 147 Level-50 gated ops remain, plus the `waitsound` and branch ones.

**Caveats.**
- Counts are turn 0, player side. Two-turn moves differ on turn 1: Razor Wind +4, Fly +2, Dive +2, Bounce +2, Brick Break +3. I did not investigate them.
- The placeholder method undercounts moves that need two blockers cleared together (for example Iron Tail needs shine and lunge). The cumulative slice figures above include those pairs.
