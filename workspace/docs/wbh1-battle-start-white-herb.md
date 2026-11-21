# wbh1: the battle-start WHITE HERB is presented (2026-11-21)

fcm1 finding 1 (`docs/fcm1-catcher-sweep.md`, "Battle start: the foe's WHITE HERB after an INTIMIDATE is not shown"). Kyle asked for the
fix. Branch `fix/battle-start-white-herb` (from `trial-fix-20261121`). Presentation only.

## What was wrong

At a battle's start `TryDoEventsBeforeFirstTurn` (`battle_main.c:3869-3894`) runs the switch-in abilities, then the pending Intimidate /
Trace scripts, then `ItemBattleEffects(ITEMEFFECT_ON_SWITCH_IN)` for each battler in speed order. A WHITE HERB holder whose stages an
Intimidate lowered resets them and runs `BattleScript_WhiteHerbEnd2` (`battle_util.c:3312-3329`; `data/battle_scripts_1.s:4345-4354`:
`call BattleScript_WhiteHerbRet` = `playanimation BS_SCRIPTING, B_ANIM_HELD_ITEM_EFFECT`, `printstring STRINGID_PKMNSITEMRESTOREDSTATUS`,
`waitmessage B_WAIT_TIME_LONG`, `removeitem`, `return`; `end2`). The engine ran it (`src/engine/factoryBattleStart.ts`, the item loop
after the Trace loop: stages back to 6, the item consumed, the events in `events`) but did not hand it to pau4's battle-start entry
phase (`src/engine/factoryBattleStartEntry.ts`), which presents only the scripts recorded in `entryScripts` (Intimidate and Trace). So the
held-item animation, its five SEs and "Foe PIDGEOTTO's WHITE HERB restored its status!" were never shown: ours went from the Intimidate
print straight to the action menu.

## ROM evidence

Two sources, frame-exact:

- **The fcm1 catcher run** `s17-on-wc` battle 3 (MASQUERAIN, Intimidate, vs LEWIS's PIDGEOTTO with the WHITE HERB; Scene ON):
  Intimidate print 22,500-22,550, SE_M_STAT_DECREASE 22,426; the herb's SE_M_TAKE_DOWN 22,631 / 22,663 / 22,695, SE_M_MORNING_SUN 22,727,
  SE_SHINY 22,799 (all pan 63, the foe's side; the first rotation drawn 22,635, the ring until 22,832); the box keeps the Intimidate text
  through the animation; the herb print 22,837-22,882; blank box 22,953; action menu 22,959. Battle 7 is the same match-up (ROM 69,502...).
  All five SEs are the herb's (General_HeldItemEffect, `data/battle_anim_scripts.s:10440-10460`: three rotations with SE_M_TAKE_DOWN,
  SE_M_MORNING_SUN for the stars, SE_SHINY for the ring); the finding's x6 / x2 / x2 are the two battles.
- **ROM rows**: four factoryLegal labs with the same sets (`tools/battle-lab/wbh1-{foe,player}-{on,off}.json`: challenge 0, battle 3,
  trainer 48, player 198 / 190 / 174 vs 135 / 115 / 188, "player" swaps the two sides), recorded per frame with
  `tools/integration/sta6mIntroProbe.py` (gBattleMainFunc, gBattlescriptCurrInstr, controller flags, gAnimScriptActive; rows in
  `.integration/evidence/fix-white-herb/probe/`, not in git). Frames after
  `BattleScript_IntimidateActivatesEnd3`'s set-up frame (foe-on lab 1899 = s17 ROM 22,379):

| | Intimidate print | Intimidate pop | herb set up | `playanimation` (anim's first row) | herb print | herb pop | blank box |
|---|---|---|---|---|---|---|---|
| foe ON | 121 | 242 | 243 | 245 (anim 211 rows) | 458 | 573 | 574 |
| foe OFF | 121 | 242 | 243 | Pausex20 (32) | 279 | 394 | 395 |
| player ON | 121 | 242 | 243 | 245 | 458 | 569 | 570 |
| player OFF | 121 | 242 | 243 | Pausex20 | 279 | 390 | 391 |

  (The player rows end 4 earlier: "PIDGEOTTO's WHITE HERB" prints 4 glyphs fewer than "Foe PIDGEOTTO's".) What the rows say:
  - the herb script is set up on the frame after the Intimidate script's pop (as Trace after Intimidate: `sta6m-both-off` rows, Intimidate
    pop 2087, TraceActivates set up 2088, its print 2121 = 2088 + 33) and runs its kernel row N N frames later: `playanimation` at kernel
    row 2, the Scene OFF print at row 36 (`Cmd_playanimation` takes `BattleScript_Pausex20` when animations are off,
    `battle_script_commands.c:4014-4018`);
  - Scene ON, the print's first glyph is 213 frames after the `playanimation` row, on both sides (211 gAnimScriptActive rows, the
    controller's completion, printstring);
  - after the waitmessage, `removeitem`, `return` and `end2`, the battle loop runs one frame later than after an `end3`: `Cmd_end2` only sets
    `B_ACTION_TRY_FINISH` and `RunBattleScriptCommands_PopCallbacksStack` pops on the next frame (`Cmd_end3` pops at once). The box blanks
    on the next frame (HandleTurnActionSelectionState) and the menu is drawn 6 frames after that, as after an Intimidate alone.

## The change

- `src/engine/factoryBattleStart.ts`: the White Herb script is recorded in `entryScripts` like Intimidate / Trace (its kernel events,
  RNG and the battle state are untouched; it already ran). Its print gets the presentation fields the full-turn path adds at print time:
  `scriptingBattler` (the holder) and `lastItem` (the herb, read before `removeitem`). Each entry script now carries `popRows` (1 for an
  `end2` script, 0 for `end3`).
- `src/engine/factoryBattleStartEntry.ts`:
  - a later script's first command starts its first event's row after the previous script's last presented frame (`lead`); the old
    `ENTRY_SCRIPT_GAP_ROWS` = 2 put it 2 frames late (removed). This also moves a Trace after an Intimidate 2 frames earlier, onto the ROM.
  - the held-item command runs from the `playanimation` row to the print: `HELD_ITEM_EFFECT_COMMAND_FRAMES` (214) +
    `HELD_ITEM_EFFECT_ENTRY_LEAD_FRAMES` (-1, `battleResolutionPresentation.ts`) = 213. The drawn animation and the SEs keep hie2 / hie3's
    epoch (counted back from the print), so they need no change.
  - a hold the projection puts before the script's first print (Scene OFF's Pausex20 hold, `heldItemEffectOffHoldFrames`) is dropped:
    the entry phase already presents the script's leading rows from the kernel.
  - the last print's closing adds `popRows`.
- `src/engine/tickSounds.ts`: the entry phase also emits `emitGeneralAnimSounds` (General_HeldItemEffect's SEs; it already tests
  HITMARKER_NO_ANIMATIONS, so Scene OFF plays none).

No battle-number, turn or trace constant: every number is a kernel row or a ROM-measured animation length, the same for both sides.

## Rules and RNG unchanged

- By construction: `recordEntryScript` only appends to `entryScripts`; `events`, the battle state and the RNG come from the same code as
  before (the herb's script already ran in `initializeFreshFactoryBattle`).
- Census (`tools/integration/lsd194Census.ts --seeds=0..99`, both scenes, base `trial-fix-20261121` 6817b6a8c vs this branch):
  `eventsDigest` 100 / 100 identical in each scene, the resolution commands 100 / 100 identical (31,650 ON / 30,870 OFF), no errors. The
  sound digest differs in 2 seeds per scene (29, 92: two entry scripts at the start, Intimidate + Intimidate / Trace): the same sounds,
  every one after the second script 2 frames earlier (the gap above). No census seed has a battle-start White Herb.
- s17-on-wc: the remade trace's round 1 (7 battles, both herbs) has the same battle text as fcm1's, and the engine's facts of each
  round-1 battle (trainer, both parties, the RNG before the trainer roll and at the set selection, `rngAtActionMenu`, `randomTurnNumber`)
  are identical. Round 2 is another round: its deal is drawn from the Lobby's per-frame (VBlank) RNG (`rngMode: "vblank"`, `core.ts`) and
  the test player spent 15 frames more in the Lobby (2,223 vs 2,208 frames from battle 7's end to the deal), so the deal cursor differs
  (`rngValueBefore` 254518849 vs 3195727632): CLOYSTER / HITMONLEE instead of PIDGEOT / VOLBEAT. That is the test player's frame timing,
  not a rule (the same thing happens to any presentation change that moves frames before a Lobby).
- Tier-1 (below): the holder's item is 0 and its stages are 6 at the first command.

## Tests

`tests/wbh1BattleStartWhiteHerb.test.ts` (6 tests, all fail without the change): the four lab cases (foe / player x ON / OFF) land the
Intimidate print, the held-item command (ON), the herb print, the blank box and the menu on the ROM rows above, with the ROM text and
a 213-frame HELD_ITEM_EFFECT command on the holder; the SEs through `emitTickSounds` at the s17 ROM frames (none in Scene OFF); a Trace
after an Intimidate (`sta6m-intro-both-off`) at the ROM rows.

Re-pin (separate commit): `tests/randomRoundSoak.test.ts` seven-win seed 21, renderCalls 3,044 -> 3,043, frames 43,334 and everything
else unchanged. Seed 21 has a two-script battle start (no White Herb); with the old 2-row gap restored the pin holds, so the move is the
gap.

Checks: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean; the 57 test files importing the changed modules (or the orchestrator,
pau4 / pau5 / hie3) 528 / 528 after the re-pin; `npm run test:gate` 360 files / 2,832 tests passed.

## Compare and catcher

- `npm run compare -- sta6m-intro-<case> --summary` (exact RGB), before / after: trace OFF 426 / 426, intimp OFF 584 / 584, both OFF
  648 / 690, trace ON 316 / 316, intimp ON 386 / 386, both ON 648 / 690 (the Trace print's 42 frames now match).
- s17-on-wc battle 3 replayed on the fcm1 trace (engine frames + 682 = ROM): ours 21,690-22,284 vs ROM 22,372-22,966, 595 / 595 frames
  identical (Intimidate, the whole herb animation, the print, the blank box, the action menu) and the same SEs on the same frames with the
  same pans (SE_M_STAT_DECREASE, SE_M_TAKE_DOWN x3, SE_M_MORNING_SUN, SE_SHINY).
- Catcher (`tools/frame-catcher/run.sh`, KEEP=1, evidence `.integration/evidence/fix-white-herb/catcher/`) on s17-on-wc remade on this
  branch with fcm1's makeTrace arguments (`--seed 17 --scene on --policy winning-coverage --battles 21 --lobby-tail 120
  --max-frames 400000`); its `.lines.txt` reaches battles 3 and 7 with the same text as fcm1's:

  | | fcm1 (base, old trace) | this branch (remade trace) |
  |---|---|---|
  | frames ours / ROM, battles | 124,267 / 130,158, 9 | 164,291 / 172,221, 11 (round 2 is another deal, see above) |
  | stretches: content / timing; menus followed | 181 / 263 of 444; 446 / 446 | 236 / 348 of 584; 586 / 586 (stop: engine-trace-end) |
  | sound differences | 5: SE_M_TAKE_DOWN x6, SE_M_MORNING_SUN x2, SE_SHINY x2 (the two herbs, stretches 63 / 195), SE_M_FLAME_WHEEL x15 (round 2's WILL-O-WISP), SE_WALL_HIT (Lobby) | 0 |
  | the herb stretches (after battle 2 / 6 to the first menu) | pictures content, sounds content; ROM-only #6 (the animation, 1,540 px), #23 / #35 / #46 / #92 (the text) | pictures content only through #748 (13 px, the trainer intro's party-ball slide, also after battles 4, 5, 10: not the herb), sounds timing |
  | round 1 stretches with sound content | 2 | 0 |

  Frame by frame (`framediff.py` in the evidence directory): battle 3, ours 21,690-22,285 vs ROM + 682, 596 / 596 identical; battle 7,
  ours 66,990-67,585 vs ROM + 2,484, 595 / 596 (the one is ours 67,580, after the action menu, an 86 px box difference at the player's
  press). The SEs of both entry phases are the ROM's: same ids, frames and pans.

## Neighbouring cases (read from the source)

- Battle start, either side, both scenes: one code path (the item loop runs for both battlers in speed order); all four measured above.
  Two herbs (both leads Intimidate and both hold a WHITE HERB) are two scripts in speed order, each timed the same way (not measured).
- Mid-battle switch-in Intimidate (other code paths, not this cause):
  - the foe's Intimidate (its switch or replacement) against the player's herb: `HandleFaintedMonActions` state 6
    (`battle_util.c:1958-1963`) runs `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` right after the Intimidate script: battler 0 only.
    Ours: `battleScriptFaintedActionsOrchestration.ts` (`ITEM_WHITE_HERB`, battler 0) runs it and the resolution presents it as a held-item
    command (a restart, hie1's lead). Its frames are not measured.
  - the player's Intimidate against the foe's herb: not restored there (battler 0 only); the foe's herb waits for the next item step:
    `MOVEEND_ITEM_EFFECTS_ALL` after the next move (`ITEMEFFECT_MOVE_END` loops all battlers, `battle_util.c:3625-3755`; ours
    `battleScriptMoveEndOpcode.ts`, `BattleScript_WhiteHerbRet`, the path that already shows the herb after OVERHEAT) or the end-turn
    items (`ENDTURN_ITEMS1/2`, ours `battleEndTurnOrchestration.ts`). The fcm1 scan has three such engine rounds (s242-on-wc, s250-on-wc,
    s286-on-ws): the player's replacement after a faint has Intimidate and ours prints the foe's herb before the next menu. By the source
    that is the end-turn item step, which runs after the action's `HandleAction_TryFinish` replacement (`BattleTurnPassed`:
    `DoBattlerEndTurnEffects` -> `ENDTURN_ITEMS1`, no `moveTurn` gate for RESTORE_STATS); none was in a catcher run, so neither the
    moment nor the frames are checked against the ROM.

## Open

- The mid-battle herb frames above (not measured).
- `seedLiveSpriteOrderHostFromBattleStart` (`liveSpriteOrderHost.ts`) treats a battle start with the herb's events as unknown history
  (invalid order) for the next move animations' sprite order. Unchanged by this fix (the herb's events were already in `events`); its
  effect on the later move pictures of such a battle is not checked.
- `gLastUsedItem` after the battle-start item loop (`ItemBattleEffects` writes each checked battler's item there) is not part of the
  engine's battle-start state; not checked whether anything reads it before it is written again (unchanged by this fix).
