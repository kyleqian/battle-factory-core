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

(The "OFF-gap finding" this section replaced is closed by "Scene OFF" below.)

## Scene OFF

cff232 (ISSUES #143's open OFF line). Presentation only; kernel events, RNG and gameplay unchanged.

**ROM (battle-scene-off `mechanicLab`, every frame, the three classes above).** `Cmd_docastformchangeanimation` emits `B_ANIM_CASTFORM_CHANGE`
with no `HITMARKER_NO_ANIMATIONS` test, and `TryHandleLaunchBattleTableAnimation` has none either, so Scene OFF plays the General_CastformChange
morph exactly like Scene ON. Measured: the Castform-box picture of the 111 frames around the body is hash-identical to the Scene ON lab
(111/111 at a constant frame offset: ON 553 = OFF 341 hail, ON 346 = OFF 190 rain, ON 1540 = OFF 1471 send-in); the same Transform ramp
(first change on command row 12 = 5 lead + body row 7, last on row 100), the same shadow hide, and the "transformed" print's first glyph
117 rows after the command's first row in all three classes (OFF frames 458 / 307 / 1588). **What does differ from ours:** the weather
print's first glyph to the command's first row is 83 rows for the player's CASTFORM (hail: 258 -> 341) but **86 rows** for the foe's
(Rain Dance: 104 -> 190). `BattleScript_WeatherFormChanges` loops `trycastformdatachange` over battler 0 then 1, one script command per
frame (`addbyte`, `jumpifbytenotequal`, `trycastformdatachange`), so battler 1's change starts 3 frames later. The Scene ON lab shows the same
+86 (print 260 -> command 346). Everything the loop does not touch (send-in: `ABILITYEFFECT_ON_SWITCHIN` calls `BattleScript_CastformChange`
directly) has no extra rows (class 3: 0).

**What changed.** `battleResolutionPresentation.ts`: the command is built in both scenes (the `NO_ANIMATIONS` test is gone; the Substitute-bit skip stays).
A Scene OFF change at battler 1 whose previous kernel event is the weather print adds `CASTFORM_CHANGE_WEATHER_LOOP_FRAMES = 3`
(`castformLeadExtra`, command 120 rows, effect age = elapsed - 5 - 3). `battleResolutionPresentationRender.ts` reads it; the morph body is
cff230's `renderCastformChangeBody` (no copy). **Scene ON was unchanged by cff232** (the shortfall below was closed by snd233, see docs/snd233-scene-on-send-in-fixes.md), including its battler-1 timing: ours ON has the same
3-row shortfall at the foe's weather print (checked: ON ours vs the ON lab, `cff232Compare.ts --scene=on --romStart=346 --lead=83`: Castform box
0 px, text box 18 rows, all in the weather print's first glyphs, 62..104 px). Moving ON is a one-line follow-up (drop the Scene OFF test on `extra`);
it was kept out of this step by the "Scene ON byte-identical" constraint.

**Before / after (differing px against the Scene OFF ROM; window = the weather print's first row (send-in: the command's first row) .. the
"transformed" print's last row; `tools/integration/cff232Compare.ts`).**

| class (seed, route command) | Castform box before: total / peak / differing rows | after | text box before: total / differing rows | after |
|---|---|---|---|---|
| player ICE after Hail (950) | 142,500 / 1,672 / 100 of 264 | 0 / 0 / 0 of 285 | 120,948 / 181 | 0 / 0 |
| opponent WATER after Rain Dance (651) | 128,321 / 1,671 / 118 of 268 | 0 / 0 / 0 of 288 | 127,630 / 185 | 0 / 0 |
| player WATER send-in (603) | 98,040 / 1,227 / 100 of 180 | 0 / 0 / 0 of 202 | 107,030 / 180 | 0 / 0 |

(The after window is longer because the command now holds 117 / 120 rows in the route; the text box includes the weather print with its 3-row
shift and the whole "transformed" print.) PNG strips (ROM above, ours below, every 6th command row) and per-row ROM hashes (Castform box and
text box): `tools/integration/fixtures/castform-forms/off/`; the labs are `off/labs/*.json` and the capture tool is `cff232OffCapture.ts`
(`--profile=battle-scene-on` re-captures the ON side of a lab); `cff232Fixtures.ts` regenerates the receipts; tests: `tests/cff232CastformOff.test.ts`.

**Not measured / residual.** The OFF ROM's rows after the "transformed" print differ from the census route's (the lab turn has other actions:
class 1's next print starts 104 rows after the transformed print in the lab); not comparable and not in scope. Revert, Cloud Nine, a foe's
send-in and Drizzle-type ability changes at battler 1 (which also go through the loop) were not measured on the OFF ROM; the +3 is only applied
where the kernel shows a weather print right before the change.
