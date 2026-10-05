# Send-in tail model (S10A, ROM evidence + design; ISSUES #146 open remainder)

Question: what decides when the opponent healthbox slide and the "X was dragged out!" message start after a send-in, and is the
ball-open white fade / particle burst after a forced switch the same effect as the voluntary send-in?
New files only. Validation is **offline against the committed 339-species ROM sweep**
(`tools/integration/fixtures/forced-switch/species-sweep-{opponent,player}-target.txt`; direct-mGBA, two identical runs, Scene OFF);
no new emulator run was made. All times are `k` = frames after the body end `E` (send-in start = k10, so send-in-relative = k - 10).

## 0. Results first

1. **Mechanism (opponent).** The healthbox slide is released by `SwitchIn_ShowHealthbox` (`battle_controller_opponent.c:482-498`), which
   waits for `finishedShinyMonAnim && battler sprite callback == SpriteCallbackDummy`, then `StartHealthboxSlideIn`. The sprite callback
   becomes `SpriteCallbackDummy` only when the **front animation ends**: `SpriteCB_ReleasedMonFlyOut` (`pokeball.c:1088-1131`) calls
   `DoMonFrontSpriteAnimation(sprite, species, noCry=FALSE, 0)` (`pokemon.c:6811-6856`) which (a) plays the cry, (b) starts the 2-frame sprite
   animation `sAnim_<Name>_1` (`front_pic_anims.h`, `StartSpriteAnim(sprite,1)`; skipped for Castform/Deoxys/Spinda/Unown, `pokemon.c:6988`),
   (c) launches the sprite callback `sMonAnimFunctions[sMonFrontAnimIdsTable[species-1]]` immediately, or after `sMonAnimationDelayTable[species-1]`
   frames through `Task_AnimateAfterDelay` (`pokemon.c:6784-6791`). The function animation ends in `WaitAnimEnd` (`pokemon_animation.c:5540`),
   which only releases to `SpriteCallbackDummy` once `sprite->animEnded` (the frame animation is also done). So the wait is
   `max(frameAnim, delay + functionAnim)`, neither of which is the cry. The message follows via `SwitchIn_ShowSubstitute -> SwitchIn_HandleSoundAndEnd`
   (`battle_controller_opponent.c:469-480`: `!IsCryPlayingOrClearCrySongs()` and sprite callback dummy).
2. **Opponent slide model, validated 338/338** (338 legal sweep species with a slide; 0 mismatches; 0 per-animId conflicts):

       slideK(sp)  = 46 + castform(sp) + max(S[sp], A[animId[sp]] + (delay[sp] > 0 ? delay[sp] - 1 : 0))      (k = E-relative)
       send-in-relative = slideK - 10

   * `S[sp]` = sum of `ANIMCMD_FRAME` durations of `sAnim_<Name>_1` (extracted from `front_pic_anims.h`: `fixtures/send-in-tail/front-sprite-frames.json`).
   * `animId`, `delay` = `sMonFrontAnimIdsTable`, `sMonAnimationDelayTable` (`pokemon.c:1405,1795`: `fixtures/send-in-tail/front-anim-tables.json`).
   * `A[animId]` = duration of that `sMonAnimFunctions` callback, **learned from the sweep** (`fixtures/send-in-tail/anim-duration.json`, 46 ids).
     It is *not yet* derived from source (the per-callback frame counts in `pokemon_animation.c` are code, e.g. `Anim_VerticalStretch`
     `data[2] > 40`, `pokemon_animation.c:1597-1608`; extracting them is the next step). Delayed species launch 1 frame earlier than `delay`
     (`--sAnimDelay == 0`), hence `delay-1`; confirmed by every animId that has both delayed and undelayed species (V_STRETCH 41 vs 42, SQUISH 49 vs 50,
     V_SHAKE_TWICE 78 vs 79, H_JUMPS_V_STRETCH 73 vs 74).
   * `castform(sp)` = +1 for Castform (385) only, on both sides (y2start 30/59, slide 149/76): **sweep-fitted exception, cause not found in source**
     (likely the form/palette load `battle_gfx_sfx_util.c:615/678`).
   * Frame anim dominates in 202/338 species (`slide = 46 + S`, 126 species with `A+delay <= S`), the function animation in 136.
   * **Leave-one-species-out**: 318/318 predicted exact (20 species are the sole evidence for their animId and cannot be predicted without a source-derived A).
     16 of 62 animIds never dominate (`A` unconstrained: only `A+delay-1 <= S` is known).
   * Range reproduced: k80..k244 (send-in +70..+234).
   * Reproduce: `python3 tools/integration/sendInTailModel.py` (exit 0 = no mismatch/conflict; `--write` refreshes `fixtures/send-in-tail/model-validation.json`).
3. **Opponent message start = slide + 26 in 329/338** (+27: 3, +29/+41/+43/+50: 1 each). The 9 exceptions are species whose cry outlasts the slide
   (`SwitchIn_HandleSoundAndEnd`); I could **not** model them: the sweep's "cry" column (probe-measured length) does not explain them
   (e.g. cry 53 -> +27, cry 108 -> +50). Do not claim a closed form for the message tail beyond `slide + 26` for the ordinary case.
4. **Player target.** Slide is **k75 constant** (338/339; Castform 76: same +1) = send-in +65. Message = `ctrlIdle + 2` in 339/339, where `ctrlIdle` is
   when `SwitchIn_HandleSoundAndEnd` (`battle_controller_player.c:1087-1096`) sees the cry finished. `ctrlIdle = cry + 74` for 133/339
   (cry column from the sweep), later for the other 206 and for short cries (cry 11 -> 99, cry 15 -> 121/139 depending on species), i.e. the
   column is not the true audio end and the dependency on the attacker's Roar cry (docs/forced-switch-continuation.md §1) is unresolved. Player message
   start k101..210 therefore needs the real cry timeline (m4a track lengths + pitch) and is **not** modelled.
5. **Ball-open white fade / particles after a forced switch: same effect, different gate.** The ball-open particles
   (`AnimateBallOpenParticlesForPokeball`) and the mon white fade (`LaunchBallFadeMonTaskForPokeball`, `pokeball.c:1062-1063`) are part of
   `SpriteCB_PokeballReleaseMon`, reached by every `switchinanim` (`Cmd_switchinanim -> *HandleSwitchInAnim -> StartSendOutAnim`): voluntary switch,
   forced Roar/Whirlwind, faint replacement. ROM forced scenarios show the same 15 particles (k28..43 = ball+18..33 opponent; k57..72 = ball+47 player,
   forced-switch doc §1 table). What differs is only the **recall** half: the voluntary switch recalls with animation (`DoSwitchOutAnimation`), the forced one
   uses `returntoball ... skipAnim=TRUE` (instant removal, no recall fade/particles; `battle_script_commands.c:5346-5353`).
   **Production gate:** `battleResolutionPresentationRender.ts:1015-1031`: both `midBattleSwitchFade` and `midBattleSwitchParticles` are computed only when
   `state.sourceDecision.kind === "switch"`, keyed to the **absolute `fadeTick` clock** (`MID_BATTLE_SWITCH_FADE_BASE_TRACE=1035`, `:473`; send-in particle start
   1187 `:408`, i.e. switch-in `el` 47 = the *player* ball+47), not to the `switch-in` command's `phaseElapsed`. A forced switch (kind `move`) therefore gets
   neither, and re-enabling the gate alone would be wrong: the recall window (1088-1131) must stay off and the send-in window must be re-anchored per side.
6. Production constants that disagree with the above (also in forced doc §4): `SWITCH_IN_SPAN_FRAMES=91` + `SWITCH_IN_WAITSTATE_HOLD_FRAMES=11`
   (`battleResolutionPresentation.ts:633,643`); `MID_BATTLE_SWITCH_HEALTHBOX_SLIDE_ELAPSED=66` (`Render.ts:157`, player-correct: ROM +65); message
   at el 102. For the opponent the slide el is 33 (observed) vs ROM 70..234.

## 1. Design for the next session (presentation-only; no engine/rules change)

Files: `src/engine/battleResolutionPresentation.ts` (switch-in command creation, `:3680-3681`), `battleResolutionPresentationRender.ts`
(`:157-158`, `:341-366` slide, `:1015-1031` fade/particle gate), tables in a new `src/data/sendInTail.ts` (generated).

1. **Data (dev-time extraction, already scripted):** `sendInTailExtract.py` + `sendInTailExtractFrames.py` give `S`, `animId`, `delay` for all 411 ids; `A` is the
   remaining gap: extract per-callback frame counts from `pokemon_animation.c` (or ship the 46-entry fitted `anim-duration.json` and treat the 16
   non-dominating ids as `min(S...)`-bounded, safe because they never exceed S for any Factory species). Only the 339 Factory species need to be exact.
2. **Per-command timing:** give the `switch-in` command a species-dependent `slideStartFrame` (opponent: `slideK-10`, player: 65) and `messageStartFrame`
   (opponent: `slideStart+26` default; player: needs cry table, fall back to the current 102-ish value) instead of the fixed 91 span. The span becomes
   `messageStart` rather than a constant; keep `SWITCH_IN_WAITSTATE_HOLD_FRAMES`.
3. **Fade/particles:** replace the `fadeTick`/`sourceDecision.kind` gate for the **send-in half** with a per-`switch-in`-command window
   (`el` 18 opponent / 47 player to +45), shared by voluntary, forced and faint replacement; keep the recall half switch-only (forced uses instant removal).
   The existing voluntary fixture (trace 1187-1231 = el 47..91) is the player case and must remain byte-exact.
4. **Tests:** (a) a unit test pinning `sendInTailModel` against the committed sweep (338/338, 318/318 LOO, no conflicts) over the committed JSONs
   (`tests/sendInTail.test.ts` reading `fixtures/send-in-tail/*`); (b) for ~6 species spanning S-dominated, function-dominated, delayed and Castform:
   render the opponent switch-in and assert slide-start `el` and message `el` equal the model; (c) forced-route render: send-in particles/white fade present
   from the send-in `el` 18/47, recall fade absent; (d) the existing voluntary-switch seam tests stay green.

## 2. Open questions

* `A[animId]` from source (46 fitted; 16 unconstrained). A scripted extraction of the `pokemon_animation.c` callback lengths would remove the fit.
* Castform +1 root cause; whether other form/special species (Deoxys 410, Unown 201 failed lab validation: not in sweep) have a shift.
* Real cry end per species (player message; the 9 opponent message exceptions): needs the m4a cry sample lengths or a probe of `IsCryPlaying`.
* Does the 70..234 opponent range change for shiny mons (`TryShinyAnimation` sets `finishedShinyMonAnim`, adds the star animation)? Factory mons are non-shiny in the sweep.
