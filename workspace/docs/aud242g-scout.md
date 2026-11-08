<!-- Read-only worker report (aud242g scout, 2026-11-08, Sonnet 5.5, ~3 min). Saved verbatim by the supervisor; UNVERIFIED: only slice A (SetPsychicBackground exact -1, +9 ops) was measured, in a /tmp extractor copy; every other lifetime and gain is the scout's estimate. -->

# aud242g scout: report

Read-only. The worktree is clean and nothing was committed. I only ran instrumented copies of the extractor from `/tmp/aud242g` with `--out-dir` pointed at /tmp. The unmodified copy reproduced the committed table byte for byte (`cmp` identical, 868 resolved ops).

## Method and corrections
- Counts are Level-50 gated ops at turn 0, player attacker, matching doc 10.4. Ops behind a blocker means the move's `gated[0]` ops, credited to the first blocking wait. That is 160 gated ops over 88 moves: 143 `unmodelled-lifetime`, 11 `waitsound`, 6 `unresolved-branch`.
- The "sets" column is `frontierMonCount` from `factory-animation-inventory.json` `tiers.level50.moves[]`. Sets overlap across rows, so don't add them.
- The blocker list in doc 9.3 and the `ANIM_SOUND_BLOCKERS` output (hyper beam orb, Hydro Pump, Fire Spin, ...) counts all 356 moves and is stale for Level 50. Doc 10.1 is the right basis, plus one blocker it missed (row 1).

## (1)+(2) Top 12 Level-50 blockers

| # | blocker | ops | sets (moves) | lifetime class and C source |
|---|---|---|---|---|
| 1 | `AnimTask_SetPsychicBackground` | 13 | 95 (Dream Eater 9/6, Extrasensory 2/3, Confusion 1/9, Psychic 1/77) | Fixed. It is not a real lifetime. The entry does `gAnimVisualTaskCount--` and installs a step (`battle_anim_effects_3.c:1372-1376`). That nets to 0 against `Cmd_createvisualtask`'s `++`, so it is `exact: -1`. The step runs until `gBattleAnimArgs[7] == 0xFFFF` (`:1378-1393`). |
| 2 | Blizzard: `gSwirlingSnowballSpriteTemplate` + `gBlizzardIceCrystalSpriteTemplate` | 11 | 14 (13 species) | Species-dependent. `AnimSwirlingSnowball` Step1 (`battle_anim_ice.c:723-740`) and Step2 run 32 swirl calls (`:742-761`). `AnimSwirlingSnowball_End` (`:764-775`) destroys the sprite only once it is off-screen (>256 or <-16). Its path runs to the target pic offset (`data[2]`/`data[4]`, `:699-715`). The crystal is `AnimMoveParticleBeyondTarget` (`:788`), same class. Not random. |
| 3 | `waitsound` | 11 | 43 (Sludge Bomb 6/40, Dynamic Punch 5/3) | Fixed per sound effect, species-independent. See (3). |
| 4 | `gTriAttackTriangleSpriteTemplate` | 9 | 8 (Tri Attack, 5 species) | Fixed. `AnimTriAttackTriangle` (`battle_anim_effects_3.c:2015-2046`) counts `data[0]` up and at 61 installs `StartAnimLinearTranslation` with duration 20, then `DestroyAnimSprite`. Args only affect position. Roughly 61 + 20 + 1 ticks; the exact value still needs deriving. |
| 5 | `blend_color_cycle` | 8 | 137 (Spark 2/5, Growth, Confusion, Psychic 1/77, Recover 1/22, Reversal, Synthesis) | Args-dependent (delay, num_blends, y range). I did not read the C this session; it is in `battle_anim_utility_funcs.c`. Doc 9.4 already lists it as out of scope. |
| 6 | Bubblebeam: `AnimTask_SwayMon` + `gWaterBubbleProjectileSpriteTemplate` (both needed) | 6 | 9 (Bubblebeam); SwayMon also gates Attract 2/45 | Args-dependent but deterministic, so it can be simulated like the elliptical. SwayMon: `battle_anim_mon_movement.c:751-815`; `data[10] += args[2]` per call, and each half-wave crossing decrements `data[3]`, which destroys the task at 0. Bubble: `battle_anim_water.c:529-607`. Init plus 50 Step1 calls (args[6] = 50), then Step2 waits for the anim to end, then Step3 runs `WaitAnimForDuration` 10. It needs the sum of the bubble's anim frames. |
| 7 | `AnimTask_FadeScreenToWhite` + `gLusterPurgeCircleSpriteTemplate` | 6 | 2 | Not read (`battle_anim_effects_3.c:1398` onward). Low set weight. |
| 8 | `unresolved-branch` (Fury Cutter, Return, Frustration, Magnitude, Secret Power, Ice Ball) | 6 | 33 | Not a lifetime. It is `jumpargeq`/`jumpret*` on a result from tasks missing from `returnValue()` (`extract-anim-sound-timing.ts:326-334`): hit count, friendship power, magnitude, environment. These depend on runtime state, so this is a variant-selection problem, not a table row. |
| 9 | Electricity sprites: `gSparkElectricityFlashing` 4, `gThunderboltOrb` 2, `gSparkElectricity` 2 | 4 | 73 (Thunderbolt 2/68, Spark 2/5) | Not read. Thunderbolt is the highest set-weight single move (68). |
| 10 | `AnimTask_CurseStretchingBlackBg` | 4 | 18 | Task with Step1/Step2 (`battle_anim_ghost.c:945-1020`). Probably fixed, but not read. |
| 11 | `AnimTask_AttackerStretchAndDisappear` | 4 | 3 | Task (`battle_anim_effects_2.c:2792-2798`, step after). Probably fixed, but not read. |
| 12 | `AnimTask_HardwarePaletteFade` (Flatter 2/2, Encore 1/4) | 3 | 6 | Task with a step (`battle_anim_utility_funcs.c:199-211`). Ties at 3 ops: Revenge small scratch 3/3, Aromatherapy flowers 3/1 (two sprites), thin ring (Heal Bell 2, Softboiled 1)/8. |

**Random lifetimes:** none found among these.

**Weighting:** by sets, Sludge Bomb (6 ops x 40 sets) and Thunderbolt (2 x 68) matter more than raw op counts suggest.

## (3) Cry task and waitsound

**Cry task (Roar, 36 sets):**
- Script: `battle_anim_scripts.s:4970` (`SoundTask_PlayDoubleCry`, ROAR) and `:4979` (`SoundTask_WaitForCry`). Howl and Hyper Voice have 1 set each, and Growl has none at Level 50.
- `SoundTask_PlayDoubleCry` plays ROAR_1 at once and keeps the task alive (`battle_anim_sound_tasks.c:178-237`). Its step (`:239-267`) counts `data[9]` to 2, then waits for `!IsCryPlaying()` and plays ROAR_2. `WaitForCry` is at `:269-281`.
- The lifetime is species-dependent (the attacker's cry), not a constant.
- Roar already has 0 gated sound ops, because all its sound-effect ops are resolved. So the cry task adds no table ops. It adds a new `cry` event class: species, pan, and a second cry at "first cry ended + at least 3 ticks". Doc 7.3 (`aud242-move-anim-sounds.md:313-314`) and doc 9.4 (`:501`) both defer it.
- Data needed:
  - Per-species cry length for the ROAR_1/ROAR_2 modes. `src/data/gen/cry-durations.json` (`durationTicks`) is the nearest thing. I have not checked whether it was measured under the ROAR mode's pitch and length. It was made for send-out and faint cries, and the ROAR mode params in `sound.c` `PlayCryInternal` were not read.
  - The `BattleAnimAdjustPanning(SOUND_PAN_ATTACKER)` pan.
  - A ROM window to pin the cry start frame.
- This is a runtime or event-model change (`battleScene.ts` already consumes cry durations), not a table row.

**Waitsound (Sludge Bomb, 40 sets; Dynamic Punch, 3 sets):**
- `Cmd_waitsound` is at `battle_anim.c:1635-1658`. It waits for `gAnimSoundTaskCount == 0`, then while `IsSEPlaying()` (`sound.c:606-613`, either SE player has a track) it counts iterations, and after more than 90 it stops both SE players.
- The wait ends when the last SE track ends, capped at about 91 iterations. This is fixed per SE id and independent of species.
- Data needed: a per-SE length table in game frames. No such file exists in `src/data/gen`; I found only `cry-durations.json`. It would have to come from the m4a song data or be measured from the ROM. For Sludge Bomb that means `SE_M_DIG` (`script:5980-5992`, waitsound at `:5994`) and its SE1/SE2 player alternation.
- **Trap:** the extractor does `pending = []` at `waitsound` (`extract-anim-sound-timing.ts:440`). Resolving waitsound alone would therefore leave Sludge Bomb falling through to its next `waitforvisualfinish` (`script:5995`) with the pending list dropped. The real wait still counts the pending visuals: `blend_color_cycle` (`:5975`, unmodelled) and `gSludgeBombHitParticleSpriteTemplate` (x12, no entry in `lifetimeOf`).
- So Sludge Bomb needs three pieces: the SE length table, `waitsound` that keeps `pending`, and those two lifetimes. That is more than a 2 h slice. Dynamic Punch's waitsound (`:6589`) was not examined.

## (4) Slice plan, 2 h or less

- **Slice A (~30 min):** make `AnimTask_SetPsychicBackground` `exact: -1`. I measured this in a /tmp copy: Dream Eater 9 -> 0 gated, Level-50 resolved ops +9, 868 -> 877 in total. After it, Confusion and Psychic stay behind `blend_color_cycle`, and Extrasensory stays behind `AnimTask_BlendMonInAndOut` and `AnimTask_ExtrasensoryDistortion`. Needs a Dream Eater ROM window for the delta. I haven't run one.
- **Slice B (~45 min):** Tri Attack triangle, `exact` ~ 82 (derive carefully, in the style of the Ice Beam crystal at D + 1). Expected: +9 ops over 8 sets, unmeasured and not checked for other blockers behind it. Needs a ROM window.
- **Slice C (~45 min, tight):** Bubblebeam, with a SwayMon simulator plus the WaterBubble projectile (needs its anim sum). Expected +6 ops over 9 sets. SwayMon alone helps Attract (2 ops x 45 sets) only if `gRedHeartProjectile` is also modelled.
- **Expected total:** about +24 Level-50 ops (674 -> ~698 emitted, 160 -> ~136 gated), with only slice A measured.
- **Next candidates:** `blend_color_cycle` (8 ops over 137 sets, C not read), the Thunderbolt electricity sprites (68 sets), then the Sludge Bomb trio.
- **Not for this slice:**
  - Blizzard needs a (target species, side) resolver, not a table row. The tail depends on the target's pic offset (`mon-pic-coords.json` and `enemy-mon-elevations.json` exist). The 13 attacker species times the many possible opponents make a static table impractical.
  - Cry needs an event-model change.
  - The unresolved-branch moves need runtime variant selection.
