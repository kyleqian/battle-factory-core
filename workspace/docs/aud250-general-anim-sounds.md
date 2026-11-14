# aud250: General_* animation SE remainder after aud249 (Scene ON)

Sound-only (no gameplay state, RNG, text, presentation length or frame-hash change). Follows `docs/aud249-general-anim-sounds.md` gaps A / C / D.

## A. General_HeldItemEffect (SE 152 / 228 / 102): named visual gap, no emission

- The kernel event `HELD_ITEM_EFFECT` (animation id) is parsed in `src/engine/battleResolutionPresentation.ts` (~4576-4584) and only sets `pendingHeldItemEffectBattler`
  (used for the item message owner ~2870-2935 and `B_LAST_ITEM` ~4136-4160). No presentation command is created: neither Scene ON nor OFF presents the animation.
- No live renderer exists for `B_ANIM_HELD_ITEM_EFFECT`. A command needs a presentation duration; in the ROM windows the held-item results (Leftovers heal, berry / item effect) run ~214-235 frames longer
  than the engine's presentation of the same segment, so adding a command would move every later frame hash in those windows. The rule (a command only if a renderer exists and unaffected windows stay identical) is not met:
  left as a named gap. The 12 seed-499 SE_SHINY rows in the T2 list are not HeldItemEffect.
- Emitting the SE without a command would put 152 / 228 / 102 at an arbitrary frame (the engine has no clock for it): not done.

## B. FOCUS_PUNCH_SETUP / LEECH_SEED_DRAIN / CASTFORM_CHANGE (Gap D): emitted

Anchors, command age (`lifecycle.phaseElapsed`) minus table op frame, measured per ROM window (`tools/audio/aud250AnimAge.ts`, `tools/audio/fixtures/aud250-*.json`; labs `tools/battle-lab/aud250-*-on.json`, stages `aud250-*` in `appTrace.ts`):

| animation | ROM windows | first SE (ROM frame, engine command first frame, age) | op frame | anchor constant |
|---|---|---|---|---|
| FOCUS_PUNCH_SETUP (SE 171) | player + opponent side | 35, 27, 8 | 3 | `FOCUS_PUNCH_SETUP_SCRIPT_AGE` = 5 |
| LEECH_SEED_DRAIN (180, 142 x8, 179) | player + opponent seeded | 697 / 693, 663 / 659, 34 | 27 | `LEECH_SEED_DRAIN_SCRIPT_AGE` = 7 |
| CASTFORM_CHANGE (203, 204) | Scene ON 354, Scene OFF 198 (cff232 rain-opp lab, seed 651) | command age 8 (after `castformLeadExtra`) | 3 | `CASTFORM_CHANGE_SCRIPT_AGE` = 5 |

- `waitplaysewithpan` also plays at wait + 1 in a General launch (Castform 203 -> 204 is 49 apart for table frames 3 -> 51, the same rule as the aud249 `loopsewithpan` gaps): `moveAnimOpRows` offset 1 under `uniformLoop`.
  This also moves `Status_Freeze`'s SE 242 (the one `waitplaysewithpan` in the status tables) by one frame; no ROM window covers Freeze (inferred from the same launch rule).
- Focus punch is silent behind a substitute (`FOCUS_PUNCH_SETUP_BEHIND_SUBSTITUTE_COMMAND_FRAMES`) and under HITMARKER_NO_ANIMATIONS; Leech Seed drain only when the command is `animated`; Castform plays in both scenes
  (`Cmd_docastformchangeanimation` has no NO_ANIMATIONS test; the Scene OFF ROM has SE 203 / 204).
- Tier 1: `tests/aud250GeneralAnimSounds.test.ts` (frame-exact SE rows against the four fixtures; Castform ON / OFF through `cff230Route` rows aligned like cff232 / snd233). Fixtures are step-mode probe recordings (`tests/audioProbeFixtures.test.ts` list updated).

## C. Second Status_* play ~14 frames late (Gap C): diagnosed, not a loop / relaunch error, not fixed

- The loop spacing (14) and the id / pan rows of the second play equal the ROM's in the flatter / swagger / dreameater windows; the engine's two plays are identical (command age 10 for the first SE both times).
- The ROM's second first-SE sits at command age 31 (flatter 721 -> 752) / 32 (swagger 691 -> 723) / 25 (dreameater 540 -> 565) against 17 / 18 / 10 for the first play (engine: 10 both times): the second play is +14 / +14 / +15 later than the first, relative to the engine.
- Not a turn-start drift: the move body of the same dreameater turn lands within one frame (ROM SE 189 at 777, engine 776). Not the IsBattleSEPlaying gate (`battle_gfx_sfx_util.c:554`, <= 30 calls): no SE is playing within 30 frames of the second launch
  (the last SE before it is 197@272 / 176@528 / 176@499, 200+ frames earlier; SE_SELECT rows are not near it). Both plays are `status2animation` / `chosenstatus2animation` (`Cmd_status2animation` / `Cmd_chosenstatusanimation`,
  `battle_script_commands.c:5769 / 5788`) -> `BtlController_EmitStatusAnimation`, the same controller path. The second play follows `printstring STRINGID_PKMNISCONFUSED; waitmessage` (`BattleScript_MoveUsedIsConfused`, `data/battle_scripts_1.s:3796`),
  the first is `chosenstatus2animation` before its message (`BattleScript_MoveEffectConfusion:3932`); that script-order difference is a candidate for the confusion windows only (the dreameater scripts were not read). Unproven candidates: a ROM-side delay in the second launch of the same
  status animation (health-box `statusAnimActive` / task cleanup). A fix needs a pixel window of the second play (the command start in the ROM), not more sound windows: left open.

## Evidence

- Neutrality (`lsd194Census.sh`, seeds 0..199, base `fd5f4274b` vs `09a3462b7`): Scene OFF 200 / 200 identical; Scene ON 200 seeds, 0 errors, 24 seeds differ in `soundDigest` / `sound` only (focus punch 171, leech drain 180 / 142 / 179, `Status_Freeze` 242 shift),
  `eventsDigest`, `commands`, `soundAnim` equal in all 400 rows.
- T2 on the aud249 seeds (2 / 165 / 499 / 830 / 1028, ON): identical before / after in every family and SE id (those windows contain none of the three animations; ON move-animation `98 / 727 / 208 / 0`, OFF identical).
- T2 on two further census seeds with the animations (65 focus punch, 50 leech seed, ROM re-driven, ON): move-animation SE exact / offset / missing / extra `5 / 212 / 231 / 0` -> `7 / 252 / 189 / 0`; SE 171 missing 2 -> 0 (matched at segment-relative delta 0, 0),
  SE 180 missing 4 -> 0, SE 142 missing 136 -> 104, SE 179 missing 17 -> 13. The leech-seed drain rows carry accumulated presentation drift (deltas -96 / -19 / -15 / +8 per play); no new extra rows.

## Residuals

- A (held-item presentation), C (second status play lead), `General_TurnTrap` / `General_SnatchMove` (extractor unresolved branch), Substitute fade / appear (no SE).
- Leech Seed drain offsets in real battles are drift from the earlier segment structure, not the anchor.
