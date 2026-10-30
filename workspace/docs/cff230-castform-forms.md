# cff230: Castform weather forms in Scene ON

Finish plan Phase 2 item 4 ("Castform forms"), ISSUES #143 remainder. Presentation only: Scene OFF, gameplay, RNG, kernel events and message
frames are unchanged. Oracle: battle-scene-on (`mechanicLab` `overrides.parties`, every frame captured).

## Questions

**(a) Was the CASTFORM_CHANGE morph drawn, and did the sprite switch on the ROM's frame?** No. Our Scene ON drew nothing for the
`CASTFORM_CHANGE` animation event: the weather print was followed directly by "CASTFORM transformed!", and the form changed at the next
command boundary. The ROM runs the Transform machinery (`General_CastformChange`): a 117-row stretch between the end of the weather
print and the first glyph of the "transformed" print = 5 lead rows, a 109-row body (mosaic ramp 1..15 up then 14..0 down, one level per
3 rows; the form swaps on body row 50; the enemy shadow is hidden rows 1..109 and is back on 110) and 3 tail rows. This is identical for
ICE / WATER / FIRE forms, for both sides and for a send-in (measured on the ROM for all three forms; ours verified at 0 px for the
classes below). Before: ~100 of ~180 frames differed per window (up to 1,672 px per frame, Castform box).

**(b) The census `approx:castform-form` commands.** Census 0..999 has 11 (move, role) keys in three battles (603, 651, 950):

| key (move, battler) | battle | role / form | ROM distance |
|---|---|---|---|
| Ember 52, player | 950 | by, ICE | 0 px, 62 visible rows, r1 == r2: promoted `52:by:3` |
| Ember 52, opponent | 651 | by, WATER | 0 px, 66 visible rows, r1 == r2: promoted `52:by:2` |
| Flamethrower 53, player | 603 | by, WATER | body 0 px, 114 rows, but only at a +7 frame shift against our visible-start alignment (an unexplained pre-body ROM change): NOT promoted |
| Fly 19 / Ice Ball 301 / Rest 156 / Hail 258 (opp) | 950 | at, ICE | not measured |
| Rain Dance 240 / Scary Face 184 (opp) | 603 | at, WATER | not measured |
| Icy Wind 196 (both sides) | 651 | by / at, WATER | known timing-phase residual (D4, out of scope) |

The "at" keys could not be staged: the lab gives the attacker's four slots the move under test, so the weather setter has to be the
other battler (the CASTFORM), which cannot be slot-selected through the apx223 driver. Evidence: `tools/integration/cff230OracleCheck.ts`
(apx223OracleCheck plus `--pnat/--onat/--last`), summaries in `tools/integration/fixtures/castform-forms/keys/`. Staging the lab with a
different weather than the census form (Ember in sun/hail for the rain battle) gives 1,300..1,500 px: that is a wrong form, not a gap.
`LIVE_CASTFORM_FORM_PROVEN` gains `52:by:2` and `52:by:3` (tests re-pinned 32 -> 34). No pixels change: approximate commands already draw the live body.

**(c) Revert, Cloud Nine, switch-out / send-in.** Send-in of a weather-form CASTFORM: measured, 0 px (class 3 below; same morph).
Revert at weather end and Cloud Nine use the same animation script with argument 0; ours builds the same command with the form removed.
They are not reachable in the 0..999 census (weather never expires inside a battle there) and were not measured on the ROM. Switch-out
of a weather-form CASTFORM: not measured. Sun: the ROM timing/ramp was measured (identical 117 rows); our sun form render was not
separately compared against a ROM window.

## What changed

- `liveTransform.ts`: `CASTFORM_CHANGE_LEAD_FRAMES = 5`, `CASTFORM_CHANGE_COMMAND_FRAMES = 117`.
- `battleResolutionPresentation.ts`: Scene ON builds a `general-animation` `CASTFORM_CHANGE` command (min 117 frames) for the event
  (skipped under NO_ANIMATIONS and for the Substitute-bit argument); Scene OFF builds nothing.
- `battleResolutionPresentationRender.ts`: effect age = elapsed - 5 lead rows, carrying the target form.
- `battleScene.ts`: `renderCastformChangeBody` runs the Transform mosaic body (`renderMosaicSwapBody`), swapping the displayed form at row 50;
  the enemy shadow is hidden rows 1..109.

## Before / after (Castform box, differing px against the ROM lab frames)

| class (seed, command) | before: total / peak / differing frames | after |
|---|---|---|
| player ICE after Hail (950, cmd 11) | 142,500 / 1,672 / 100 of 181 | 0 / 0 / 0 |
| opponent WATER after Rain Dance (651, cmd 8) | 125,327 / 1,671 / 115 of 135 | 0 / 0 / 0 |
| player WATER send-in (603, cmd 4) | 98,040 / 1,227 / 100 of 180 | 0 / 0 / 0 |

PNG strips (ROM above, ours below, every 6th row): `tools/integration/fixtures/castform-forms/*.png`; per-row box hashes in the JSON files.

## OFF-gap finding

The ROM plays the same morph with Scene OFF. Ours does not (Scene OFF stays byte-identical by requirement), so Scene OFF keeps the
pre-existing gap: no morph and the form changes at the command boundary. Not changed here.
