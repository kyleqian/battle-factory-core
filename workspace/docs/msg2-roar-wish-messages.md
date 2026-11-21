# msg2: ROAR's "dragged out!" and WISH's "came true!" (fcm1 findings 2 and 3, 2026-11-21)

Branch `fix/roar-wish-messages` (from `trial-fix-20261121`). Presentation only: the battle rules and RNG do not change; the one
kernel-event change is the WISH message's new `{B_BUFF1}` substitution (the wisher's name). Evidence (not in git):
`.integration/evidence/fix-roar-wish/` (traces, catcher runs, the census scan); the ROM frames below are the fcm1 catcher runs
(`.integration/evidence/fcm1/final/<run>/`, ROM side = the real ROM in mGBA). Frame numbers: "ours" engine frames, "ROM" ROM frames
of the same run; "L" = the frame the print's last glyph shows, "press" = the frame the press is read (SE_SELECT on it).

## 1. WISH names the wrong Pokemon (finding 3): fixed

**ROM.** `Cmd_trywish 0` stores the wisher's party slot, `Cmd_trywish 1` buffers it
(`battle_script_commands.c:9300` `wishMonId[gBattlerAttacker] = gBattlerPartyIndexes[gBattlerAttacker]`, `:9309`
`PREPARE_MON_NICK_WITH_PREFIX_BUFFER(gBattleTextBuff1, gBattlerTarget, gWishFutureKnock.wishMonId[gBattlerTarget])`), and
`sText_PkmnWishCameTrue` is `{B_BUFF1}'s WISH\ncame true!` (`battle_message.c:233`). So the name is the Pokemon that made the wish,
with the slot's side prefix, whoever is in the slot now (a switch or a faint replacement in between). The following
"X regained health!" / "X's HP is full!" use `{B_DEF_NAME_WITH_PREFIX}`, the battler in the slot.

**Ours.** The resolver named the battler in the slot (`nameWithPrefixResolver(field, actionSnapshot.attacker)`).

**Change.** `prepareMessage` (`factoryBattleScriptFullTurnDecision.ts`) resolves `STRINGID_PKMNWISHCAMETRUE`'s substitution from
`rules.battleTextBuff1MonNick` (set by `Cmd_trywish 1`, `battleScriptTrywishOpcode.ts`) and `rules.party`, the same helper Beat Up's
member name now uses; `battleResolutionPresentation.ts` prints that substitution.

**ROM frames.**

| run, battle | ROM | ours before | after |
|---|---|---|---|
| s89-on-wc b9 (ILLUMISE wished, fainted; DRAGONAIR in) | 161,727 "Foe ILLUMISE's WISH / came true!" (29 glyphs) | 150,982 "Foe DRAGONAIR's WISH ..." (30) | "Foe ILLUMISE's WISH ..." (29) |
| s186-on-ws b15 (MINUN wished, fainted; STANTLER in) | 238,186 "Foe MINUN's WISH ..." (26) | 226,619 "Foe STANTLER's WISH ..." (29) | "Foe MINUN's WISH ..." (26) |

**What follows: BattleScript_WishButFullHp's pause.** `battle_scripts_1.s:3601-3606`: the wish print, `waitmessage B_WAIT_TIME_LONG`,
`pause B_WAIT_TIME_SHORT`, then "X's HP is full!". The pause was not presented (it is an end-turn script, no "used" anchor; pau1's
table had it as presented, which was wrong). ROM: from the wish print's last glyph to the HP-full print's second glyph 100 rows in
7 / 7 catcher rounds (s102-on-ws, s118-off-wc, s100-on-wc twice, s126-off-ws, s118-on-wc, s207-on-wc; both scenes); ours 66 in all
7. s89-on-wc b9: ROM wish first glyph 161,727 -> HP-full first glyph 161,854 = 127 rows = 29 glyphs + 64 + 34. Change:
`BattleScript_WishButFullHp` joins `ANCHORLESS_PRE_PRINT_PAUSE_LABELS` with a lead of 2 (row = 32 + 2 = 34). The heal path
(`BattleScript_WishComesTrue`) has no pause and is unchanged.

**FUTURE SIGHT / DOOM DESIRE (checked, no change).** "{B_DEF_NAME_WITH_PREFIX} took the\n{B_BUFF1} attack!" (`battle_message.c:216`):
`gBattlerTarget = gActiveBattler`, the slot (`battle_util.c:1813`), and `{B_BUFF1}` is the move (`PREPARE_MOVE_BUFFER`,
`:1811`); no party slot is buffered. Ours names the battler now in the target slot and the stored move, as the ROM.

## 2. ROAR: "{X} was dragged out!" (finding 2): the described defect is not there; three ROM differences after the press fixed

**ROM.** `BattleScript_EffectRoar` -> `forcerandomswitch` -> `BattleScript_SuccessForceOut` / `BattleScript_TrainerBattleForceOut`
(`battle_scripts_1.s:593-602`, `:3324-3341`): `switchinanim`, `waitstate`, `printstring STRINGID_PKMNWASDRAGGEDOUT`,
`switchineffects BS_TARGET`, `goto BattleScript_MoveEnd`. The string is `{B_DEF_NAME_WITH_PREFIX} was\ndragged out!\p`
(`battle_message.c:255`): the trailing `\p` puts the printer in `RENDER_STATE_CLEAR` (`text.c:1171-1179`), which waits for a new A / B
(`TextPrinterWaitWithDownArrow`, `text.c:865-882`, `autoScroll` is off in the Factory, docs/subp1m-battle-text-pause.md) and draws the
blinking arrow; `printstring` holds the script until the printer is idle, so the battle waits there.

**The finding, re-read frame by frame.** fcm1's contact sheet (`curated/s186-roar.png`) samples every 30 frames: ours 275,290 is
mid-typing ("MAGNETON was / drag") and 275,320 is after the press. Densely (s186-on-ws b20):

| | first glyph | L (last glyph) | arrow | press | box clears | action menu |
|---|---|---|---|---|---|---|
| ROM | 289,182 | 289,205 | 289,207 (L+2; it bobs every 9: 289,216, 289,225, ...) | 289,461 (the catcher's rescue A) | 289,475 (press+14) | 289,481 (press+20) |
| ours | 275,275 | 275,298 | 275,300 (L+2) | 275,304 (the test player's A) | 275,319 (press+15) | 275,325 (press+21) |

Ours prints the whole line at the ROM's rate (25 rows from the first glyph to the arrow on both) and waits for the press; the test
player pressed 4 frames after the arrow. The ROM waited 254 frames because the catcher replays the engine's presses at the same offset
from the last menu and this stretch ran 16 frames later on the ROM (the SOLARBEAM charge turn: from the move choice to the empty
box 16 rows vs ours 9, and 7 more before ROAR), so the engine's press after the arrow (275,304) fell on the ROM's typing (wasted), its next press belongs to the action menu the ROM
had not reached, and the catcher's rescue A came 4 s later. All 35 fcm1 prints of "dragged out!" directly before the turn end (15 runs; 24 ROAR, 11 WHIRLWIND; 24 Scene ON, 11 Scene
OFF) show the same print and wait on both sides (the arrow at L+2 wherever the press came later). The foe dragged out (the player's ROAR) runs the same
script; no catcher run has one (census seeds do, see tests).

What does differ, measured on those 35 prints, plus the drag-ins followed by an entry script:

1. **The box clears one row late.** ROM: press -> box clear 14 rows in 33 / 33 (the other 2: item 2); ours 15 in 35 / 35. btn2's release -> `moveendall`
   count (dragged out "+5") started at the probe's press row P, but the engine's release row is P+1 (the first advance holding the
   press), so from it the script reaches `moveendall` 4 rows on; btn2 had left this as "the box clear 1 row late (516 vs 515 on
   roar)". Change: `RELEASE_TO_MOVEEND_ROWS.STRINGID_PKMNWASDRAGGEDOUT` 5 -> 4 (turn-end 13 -> 12 rows). The action menu then
   shows press+20: the ROM's is press+20 in 20 / 35, press+21 in 14, press+19 in 1 (its empty box before the menu lasts 5 to 7 frames
   here, and 5 to 8 after any print at a turn end in the catcher runs; ours is always 6), so ours is exact in 20 (was 14).
2. **A press on an arrow redraw row blanks the box at once.** In `RENDER_STATE_CLEAR` each row first redraws the arrow when its delay
   runs out (`TextPrinterDrawDownArrow`, `text.c:787-836`: `downArrowDelay = 8` after a draw, `:832`, so the first wait row and every 9th
   after it; the draw ends in `CopyWindowToVram`), then on a new A / B `FillWindowPixelBuffer`s the window without copying it. On a
   redraw row the copy carries the cleared window, so the box is blank from the next frame; on any other row the old text and the
   frozen arrow stay until the turn end clears the box. ROM: s186-on-ws b20 CAMERUPT (press 291,811 = L+1, box blank 291,812, no arrow
   ever shown) and s118-on-wc b4 ANORITH (press 55,715 = L+1, blank 55,716); the other 33 presses (L+2 to L+257, none on a redraw
   row) left the box 14 rows. Change: the orchestrator records the released gate's cursor for any `\p` gate release (also a press
   1 or 2 rows after the last glyph, before ours drew the cursor; it now keeps the ROM's arrow there), with `boxCleared` when
   `releasedGateClearsBox` (`battleResolutionPresentation.ts`: age + 2 a multiple of 9, the gate a `\p`); the render blanks the box
   from the row after the press. This is the printer's rule, so it covers every `\p` gate print (Substitute damaged / faded, the
   `MoveUsedIs*` family), not only ROAR; `\l` and PAUSE_UNTIL_PRESS are excluded (the scroll clears the arrow itself; no arrow).
   The redraw rows after the first (9, 18, ... rows on) follow the source; no catcher press landed on one.
3. **A dragged-in Intimidate / Trace starts its script after the press.** The kernel runs `BattleScript_MoveEnd` (its two
   sprite-visibility receipts) and then the entry script, whose first event's `instructionExecution` is its leading rows
   (`BattleScript_PauseIntimidateActivates` / `BattleScript_TraceActivates`, `battle_scripts_1.s:4022-4024`, `:3971-3973`: `pause
   B_WAIT_TIME_SHORT` and the set-up). pau5 times those rows only when the send-in comes directly before the script; after a
   drag-in the dragged-out print is in between, so ours printed with no lead. ROM (Scene OFF, the only catcher cases):

   | run | press -> print (second glyph) ROM | ours before | lead (kernel) |
   |---|---|---|---|
   | s36-off-ws, WHIRLWIND -> MASQUERAIN's INTIMIDATE | 92,516 -> +133 | 87,902 -> +82 | 41 |
   | s89-off-ws, ROAR -> HITMONTOP's INTIMIDATE | 94,312 -> +133 | 89,814 -> +82 | 41 |
   | s118-off-wc, WHIRLWIND -> PORYGON TRACED | 32,080 -> +45 | 30,704 -> +3 | 33 |

   Change: `applyDraggedOutEntryScriptLead` puts a hold of lead + `DRAGGED_OUT_ENTRY_SCRIPT_RELEASE_ROWS` (9) before the script
   (a draw-nothing row; the released print and its frozen arrow stay up, as on the ROM) and stretches the stat row to the
   STATS_CHANGE animation as pau5 does: Intimidate 81 + 50 + 1 = 132 (+133 for the second glyph), Trace 3 + 42 = 45, all three
   exact. The script's closing rows are unchanged (ROM: Intimidate's turn end 2 rows later than ours, Trace's 2 earlier).

## Tests

`tests/msg2RoarWishMessages.test.ts` (12, Tier 1, census battles of `tests/helpers/btn1Battle.ts`):

- WISH: the wisher is named on both sides and both paths: seed 39 (Foe ESPEON wished, DONPHAN's HP is full; both scenes), 41
  (WIGGLYTUFF / LAIRON), 100 (Foe XATU / Foe RAICHU regained health), 403 (XATU / GYARADOS); the event carries the substitution.
- WishButFullHp: the 34-row row before "HP is full!" in both scenes (wish start -> HP-full start = glyphs + 64 + 34, the ROM's 127
  for 29 glyphs).
- ROAR: the release tail 4; seed 95 (HITMONCHAN, both scenes) and seed 15 (Foe TORKOAL, the foe dragged out): press -> box clear
  14 rows, the print and the frozen arrow up until then;
  presses at cursor ages -2, -1, 0, 6, 7, 8, 16: blank from the next row exactly at -2, 7, 16, the press row still shows the print.
- Intimidate after a drag-in: seed 51 (SALAMENCE, both scenes): hold 41 + 9, stat row 3, press -> "INTIMIDATE cuts" 132 rows
  (the ROM's); seed 116 (Foe MASQUERAIN, the foe dragged out): the same commands (no ROM window for that side).

Re-pinned with the new values: `tests/btn2ReleaseTail.test.ts` (table 5 -> 4, Roar seed 95 turn-end 13 -> 12),
`tests/pau2ScriptPauses.test.ts` / `tests/pau3ScriptPauses.test.ts` (the anchorless label list gains WishButFullHp; SafeguardEnds' 42
unchanged).

Soak re-pin (separate commit): `tests/randomRoundSoak.test.ts` "(c) leaves full byte-identical", seed 1: frames 58,793 -> 58,798, same
battle 3 / depth 2 / turn 19 / roundLost. Bisected: with the dragged-out tail back at 5 the old pin passes; undoing the WISH name, the
WISH pause or the entry-script hold instead leaves 58,798.

Checks: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean; the 288 test files that import the changed modules (or the census
helper) passed after the re-pins above (2,565 tests; before the re-pins 3 failed: the two pau label pins and the soak pin); `npm run
test:gate` 360 files / 2,832 tests passed.

## Catcher before / after

CATCHER_PLACEHOLDER

## Still open (seen, not changed)

- **End-turn prints after the dragged-out press come early.** s222-on-wc ("Rain continues to fall.") and s94-on-wc ("Foe PERSIAN is
  hurt by poison!"): ROM press -> print second glyph +15, ours +2 / +3. The same weather print after an ordinary print is also 11 rows
  early in ours (s222-on-wc), so most of it is the general end-turn lead, not ROAR's.
- **Substitute damaged / faded** release tails have the same count origin as dragged out's (btn2 counted from the probe's press
  row); one catcher case (s36-off-ws, Substitute damaged before the turn end): box clear ours +20, ROM +19. Left at btn2's values.
- **SITRUS BERRY after a drag-in** (s186-on-ws b20, the foe's berry): ours 3 rows later than the ROM. **SPIKES after a drag-in**,
  **Scene ON Intimidate / Trace after a drag-in** and **the foe dragged out**: no ROM window in the catcher runs.
- **WISH timing besides the pause**: after a foe's faint replacement the wish print is 11-12 rows later on the ROM than ours (7 / 7
  rounds, an end-turn lead after the replacement), and the heal path's "regained health!" 5 rows later (wsh1's known +2 / +5).
- The ROM's empty box before the action menu lasts 5 to 8 frames at a turn end (ours 6); not modelled.
