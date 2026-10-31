# snd233: two small Scene ON presentation fixes

Presentation only; gameplay, RNG and kernel events are unchanged; Scene OFF output is byte-identical. Oracle: battle-scene-on lab frames.

## Part A: Castform weather-loop rows in Scene ON

cff232 found that `BattleScript_WeatherFormChanges` loops `trycastformdatachange` over battler 0 then 1, one script command per frame, so a
`CASTFORM_CHANGE` at battler 1 right after a weather print starts 3 rows later (`CASTFORM_CHANGE_WEATHER_LOOP_FRAMES`). snd233 applies the rule in Scene ON
too (`battleResolutionPresentation.ts`: `castformLeadExtra = 3` when battler 1 and the previous kernel event is a message; both scenes).

| opponent WATER after Rain Dance (seed 651, cmd 8), Scene ON, `cff232Compare.ts --scene=on --romStart=346` | Castform box total / peak / differing rows | text box total / peak / differing rows |
|---|---|---|
| before (`--lead=83`) | 0 / 0 / 0 | 1,253 / 104 / 18 of 285 (weather print's first glyphs) |
| after (`--lead=86`) | 0 / 0 / 0 of 288 | 0 / 0 / 0 of 288 |

Receipt and strip: `tools/integration/fixtures/castform-forms/on/opponent-water-after-rain-dance.{json,png}` (tool `tools/integration/snd233CastformOn.ts`;
tests `tests/cff232CastformOff.test.ts` "snd233 Part A"). Re-pinned: the cff230 ROM-receipt test and `cff230Fixtures.ts` now offset the command's first
frame by `castformLeadExtra`; the cff232 rain-ON expectation (ON and OFF both carry `castformLeadExtra: 3`, 120 minimum frames).

## Part B: Roar / Whirlwind (opponent attacker) player-side ball-throw path, Scene ON

Staged with the committed `back-send-out/scenarios/roar-*-a.json`, ROM frames from `bin/oracle --profile battle-scene-on lab` (257 frames each),
compared with `tools/integration/bso225Compare.ts`. ISSUES #146's "6,718 px" line is stale: since bso225 / pfb229 the "dragged out" send-in goes
through `midBattleSwitchInAt` with `playerMonY = fieldArt.player.origin.y + 32`, so the fixed monY-93 table is not used on this path.

**Root cause of the remaining residual.** `MID_BATTLE_SWITCH_BALL_THROW_TABLE` has 42 entries (elapsed 3..44), calibrated on monY 93 where the ball is
under the text box afterwards. A species with monY 80..84 lands higher: arc ticks 41/42 (landing tick, elapsed 46), the unrotated closed ball (47) and the
open (5 rows) / open-final (6 rows) ball poses (`SpriteCB_ReleaseMonFromBall`, `sBallAnimSeq1`; the opponent ball's cadence) show above the terrain clip
row 112 in the ROM, but we drew nothing. Fix: `midBattleSwitchBallTail` (`battleResolutionPresentationRender.ts`) continues the rotating arc, then the
closed ball, then 5 open + 6 open-final rows at the landing spot while the ball top is above row 112 (null otherwise, so the default monY 93 and
low-landing species are unchanged); `battleScene.ts` draws the landed ball.

Residual px, send-in rows (elapsed >= 0), player sprite/ball region; healthbox and text 0 unless noted (`tools/integration/fixtures/back-send-out/roar/summary.json`,
strips `roar/*-ball-e44-58.png`, ROM left / ours right):

| species | before | after | what remains |
|---|---|---|---|
| SKARMORY | 74 | 5 | e=64: star-particle pixels (orange/white swap at the terrain edge) |
| ONIX | 272 | 7 | e=64 same |
| ALAKAZAM | 33 | 3 | e=64 same |
| SHEDINJA | 16 | 0 | healthbox 90 px/frame from e=78 (3,016 total; genderless healthbox, known, unchanged) |
| ENTEI | 2,079 | 2,063 | e=68 glow-lag (out of scope) |

Not part of the ball path: rows before the send-in (e=-51..-1, ~106,000 px in the mon region) are the Roar move animation (the ROM shrinks / shakes the
target; the harness builds a skipAnimation switch-out and does not draw it).

**Faint-replacement side effect** (pfb228 windows, `bso225Dense.ts --delta=0`, Scene ON, e>90 mon px, same shared path): SKARMORY 74 -> 5, ONIX 272 -> 7,
ALAKAZAM 33 -> 3, SHEDINJA mon 16 -> 0 (healthbox 4,170 unchanged), CASTFORM 278 -> 13 (message region 440 px at e=268 unchanged, out of scope).

Tests: `tests/snd233SceneOnSendInFixes.test.ts`.
