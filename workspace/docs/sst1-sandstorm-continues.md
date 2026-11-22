# sst1: the end-turn sandstorm's sound and its "buffeted" print (2026-11-21)

From the frame catcher's timing report (tdr1, `docs/tdr1-catcher-timing-report.md`): SE_M_SANDSTORM -> SE_EFFECTIVE (the sandstorm damage's
hit sound) was 11-18 frames later on the ROM in 15 of 15 end turns (202 frames, 4th in the ranked list after tri1). Scene ON only
(Scene OFF plays no weather animation). Branch `claude/elastic-northcutt-5cbc37`. Evidence (not in git): `.integration/evidence/tdr1/`
(`tri1/` before this fix, `after/`).

## In short

When a sandstorm goes on at the end of a turn the game prints "The sandstorm rages.", plays the sandstorm animation, then prints "{X} is
buffeted by the sandstorm!" and plays the hit. Our sandstorm pictures were the ROM's frame for frame. Two things were off around them:
- our sandstorm sound played 8 frames late (on the ROM it starts 7 frames before the first sand picture);
- our "buffeted" text came 8 frames after the animation. On the ROM it is 10 frames when the first Pokemon in turn order takes the damage
  and 16 when it does not (a Rock / Ground / Steel type first), because the game steps through its damage loop one command a frame.

## ROM

### Source

- `data/battle_scripts_1.s:3200-3224` (`BattleScript_DamagingWeatherContinues`): `printfromtable` (the rages line), `waitmessage
  B_WAIT_TIME_LONG`, `playanimation_var BS_ATTACKER, sB_ANIM_ARG1` (General_Sandstorm = `goto Move_SANDSTORM`,
  `battle_anim_scripts.s:10527`), `setbyte`, then per battler in turn order (`BattleScript_DamagingWeatherLoop`) `copyarraywithindex`,
  `weatherdamage`, `jumpifword` (no damage: to `BattleScript_DamagingWeatherLoopIncrement`: `jumpifbyte`, `addbyte`,
  `jumpifbytenotequal` back to the loop), `printfromtable` (the buffeted line), `waitmessage`, `effectivenesssound`, the hit.
- `RunBattleScriptCommands` runs one command per frame, so each command between the animation's end and the print is one frame.
- `battle_anim_scripts.s:6345-6363` (`Move_SANDSTORM`): `loadspritegfx`, `playsewithpan SE_M_SANDSTORM`, then the background task and the
  sand sprites. SE_M_SANDSTORM plays 146 rows (`se-song-rows.json`), less than the visual tasks, so Cmd_end does not wait for it.

### Measured (frame catcher, `tri1/` runs: seed 100 and seed 44 Scene ON, 15 end turns; `sand3.py` over the frame stores)

Frames from the first glyph of "The sandstorm rages.":

| | ROM | ours before |
|---|---|---|
| SE_M_SANDSTORM | +88 (15 / 15) | +96 |
| the sand pictures | +95 .. +248 | +95 .. +248 |
| "{X} is buffeted" first glyph, the first battler in turn order hurt | +258 (6 turns) | +256 |
| the same, the first battler in turn order not hurt | +264 (9 turns) | +256 |

(The Sandstorm move itself, "Foe X used SANDSTORM!", was already the ROM's on both sides: its sound and pictures, and "A sandstorm
brewed!" 7 frames after the body, in all 3 cases.) The kernel's events carry each command's `instructionExecution`: from
`playanimation_var` to the buffeted `printfromtable` 5 instructions when the first battler is hurt, 11 when it is not; the ROM's rows from
the body's last picture to the print's first glyph are those + 5 in every turn.

## Merge with the box's night run (2026-11-22)

The box's etp1 (`33bdace6d`, `docs/etp1-end-turn-prints.md`, labs `etp1-{sandstorm,hail}{,5}-{off,on}`) puts the same "buffeted" print on the
same rows for Sandstorm and Hail in both scenes: a lead on the print (`damagingWeatherLoopLeadRows`) of the same instruction count past the
3-row tail. Both together would have counted those rows twice, so the merge keeps etp1's rule and drops `sandstormContinuesTailRows` (the
command keeps its 3-row tail). The sound (General_Sandstorm on the body's own clock) is this branch's alone and stays; the box's etp2 sets
the hit SE after the print (3 ticks after the hit command). On the merged tree seed 44 Scene ON still gives the ROM's +88 / +264 / +258.
One picture difference came with it: during etp1's lead rows our box is blank, where the ROM (and sst1's tail) kept "The sandstorm
rages." on screen until the buffeted glyph (2 or 8 frames a turn; the renderer blanks the box in every print's lead rows).

## Change

Presentation and sound timing (`src/engine/battleResolutionPresentation.ts`, `src/engine/moveAnimSounds.ts`), Sandstorm only:

- (Replaced in the merge by the box's etp1, see above.) `sandstormContinuesTailRows`: the SANDSTORM_CONTINUES command's tail after the body is the kernel's instruction count from the
  animation to the first "buffeted" print (5 or 11; it was `WEATHER_CONTINUES_LAUNCH_TAIL_ROWS`, 3, taken from Focus Punch's set-up,
  whose next command is the print itself). Without a buffeted print in the run (neither battler hurt) the tail stays 3.
- General_Sandstorm's sound ops run on the body's own clock (script row = body age, as the art), not the move-body sound clock's 8 rows
  later (`WEATHER_SCRIPT_AGE`); rnc1 found the same for General_Rain (7 rows) and fixed it there.

No kernel event, RNG draw or outcome moves.

## Catcher, before / after

| | before (`tri1/`) | after (`after/`) |
|---|---|---|
| SE_M_SANDSTORM -> SE_EFFECTIVE in the ranked list | 4th, 202 frames (+11 .. +18) | see `docs/tdr1-catcher-timing-report.md` |
| SE_M_SANDSTORM after the rages print | +96 (ROM +88) | +88 |
| "buffeted" after the rages print | +256 (ROM +258 / +264) | +258 / +264 by turn order |

## Tests

- `tests/sst1SandstormContinues.test.ts` (1 since the merge; the tail-rule test went with the rule): ordinary play, seed 44 Scene ON (the
  soak's test player, the catcher's t44on): five end turns on the merged tree (six before), SE_M_SANDSTORM at +88, the buffeted print at
  +264, +264 (PUPITAR, unhurt, moved first), then +258 x 3.
- `tests/wth236WeatherContinues.test.ts`: back to the box's (the command's 3-row tail).

## Open

- **Hail** runs the same script and the same body clock: etp1 put its print on the ROM's rows; its sound clock (General_Hail 8 rows after the
  body, as Sandstorm's was) is not measured. **Sun** (General_Sun, the Sunny Day body) has the same sound clock; its script
  has no print after the animation. Both unchanged until measured.
- The hit sound after the buffeted print: ROM 103 frames after its first glyph; ours 101-102, or 108 in one case (not looked into).
