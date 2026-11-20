# flow1: battle menu cursors after a switch-in, and the recall during a two-turn move (2026-11-20)

The frame catcher (`tools/frame-catcher/`, `docs/frame-catcher-2026-11-20.md`, `docs/snd2-catcher-sounds.md` "Found, not fixed") found
two places where the same presses do something else in our battle than on the ROM. Both are fixed here, checked with ROM runs of the
same presses, and pinned by `tests/flow1MenuCursorsAndLockedSwitchRecall.test.ts` (each test fails with its fix undone). They change
what later presses do, so pinned soak trajectories moved (below).

Branch `claude/flow-cursor-recall`, cut from master aa4cc49ce (snd2 and fcp1 merged). Gates on the final tree:
`NODE_OPTIONS=--max-old-space-size=8192 npx tsc -b` clean; `NODE_OPTIONS=--max-old-space-size=8192 npm test` 1,903 files / 16,286 tests
passed, 0 failed (44 files skipped, as on master). Catcher runs and contact sheets: `.integration/evidence/flow1/` (not in git).

## 1. The menus open on the first entry after a switch-in

**What a player saw.** After a switch, the new Pokémon's move menu opened on the move the old one last used. Seed 3, battle 1: after
"ELEKID, good! Come back!", CHARMELEON's move menu opened on its fourth move, so A at once picked another move than on the ROM.

**ROM.** `gMoveSelectionCursor[battler]` and `gActionSelectionCursor[battler]` go back to 0 whenever that battler takes in a Pokémon:

| where | what runs it |
|---|---|
| `HandleAction_Switch` (`battle_util.c:299-300`) | a voluntary switch, at the start of the switch action |
| `SwitchInClearSetData` (`battle_main.c:3203-3204`) | every switch-in (`Cmd_switchindataupdate`): voluntary, faint replacement, Baton Pass, Roar / Whirlwind |
| `PlayerHandleSwitchInAnim` (`battle_controller_player.c:2190-2191`) | every player send-in (`Cmd_switchinanim`) |
| `FaintClearSetData` (`battle_main.c:3285-3286`) | a faint |
| `PlayerHandleResetActionMoveSelection` via `Cmd_transformdataexecution` (`battle_script_commands.c:7802`) | Transform: the move cursor only (Ditto's set 54 knows it; Metronome / Assist can call it) |
| `SetUpBattleVarsAndBirchZigzagoon` (`battle_controllers.c:52-53`) | each battle start |

Otherwise both cursors stay where they were at the last choice. The foe's own cursors never matter (its controller does not use them).

**Ours.** The move cursors are carried per battler in the round orchestrator. They were reset by comparing the battler's party slot
before and after a kernel receipt, at three of the four places a receipt is installed, but not after the turn's own drive
(`beginCommandResolution`), which is where a voluntary switch, Baton Pass and Roar happen. So every voluntary switch kept the old cursor
(the faint replacement, driven separately, already reset). The slot comparison also misses a slot that comes back within one receipt
(CHARMELEON -> PHANPY, PHANPY knocked out, CHARMELEON again) and Transform.

**Fix** (`src/engine/factoryRoundBattleOrchestrator.ts`, `resetMoveSelectionCursorsForSwitchIns`): a battler's move cursor goes to 0 on
every `switch-in-animation` event of the receipt (every switch-in runs `Cmd_switchinanim`) and on Transform's
`reset-action-move-selection` event; the slot comparison stays as a second mark; and the turn's own drive now resets too.

**The action cursor needed no change.** Ours opens every new turn's action menu on FIGHT. The ROM keeps the old action cursor, but in a
Frontier singles battle a turn only starts from FIGHT (0), POKéMON (a switch, which resets it to 0) or RUN (YES ends the battle; BAG,
NO and a party-menu cancel only reopen the menu inside the same choice), so it is FIGHT at every new turn on the ROM too.

**ROM check.** The catcher's ROM driver moves the ROM's cursor to ours before replaying a press when the two differ, and logs it
("cursor-differs-before-press"). Fresh traces of the same seeds (`makeTrace.mjs --seed 3 --scene on --policy full --battles 2
--max-frames 45000`, `--seed 6 --scene off --policy full`):

| run | move-menu cursor fixes the ROM needed, before (snd2 run on master) | after |
|---|---|---|
| seed 3, Scene ON (2 battles, 129/129 menus followed) | 4 (ROM on move 1, ours on move 4, 3, 4, 2) | 0 |
| seed 6, Scene OFF (177/197 menus, stops at the set-up drift as before) | 5 | 0 |

The only cursor fix left in either run is the draft's first press, which the README lists as a set-up limit.

## 2. A switch while a Pokémon is locked into a two-turn move kept its lines

**What a player saw.** Seed 6, battle 1: the foe's AZUMARILL dug underground, the player switched GROWLITHE for VOLBEAT. The ROM prints
"GROWLITHE, that's enough! Come back!", recalls it (SE_BALL_OPEN) and then "Go! VOLBEAT!". Ours showed an empty box and went straight to
"Go! VOLBEAT!", with no recall and no sound.

**Cause.** The kernel skips `BattleScript_ActionSwitch`'s first rows (`hpthresholds2`, `printstring STRINGID_RETURNMON`,
`returnatktoball`) because they change no rules or RNG, and the presentation adds them back in front of the kernel's events
(`withSynthesizedSwitchRecallEvents`, and `withSynthesizedAiSwitchRecallEvents` for the trainer's switch). Only a fresh turn's
presentation did that. A turn where one Pokémon is locked into a two-turn move (Dig, Fly, Bounce, Ice Ball, Rollout, Petal Dance, a
recharge, ...) is shown as a continuation of the previous turn's presentation (so the hidden Pokémon stays hidden), and that path added
the kernel's events as they were. Neither the HP-threshold line picker nor the semi-invulnerable state was at fault.

**Fix** (`src/engine/battleResolutionPresentation.ts`):
- the player switching while the foe is locked (`appendBattleResolutionLockedActionContinuation`, now given the player's own decision
  and the foe's HP at the last switch-in): the new segment gets the recall line (with `Cmd_hpthresholds2`'s wording), the return to the
  ball and its SE_BALL_OPEN, and the same clock a fresh switch turn has (the party-menu close hold, the recall's white fade). A move at
  the same point is unchanged;
- the trainer switching while the player is locked (`appendBattleResolutionActionContinuation`): "<TRAINER> withdrew <MON>!" and the
  foe's recall, as on a fresh turn. Found by scanning 60 seeds for the mirror case: seed 18, battle 2, the player's AZUMARILL
  underground, "AROMA LADY ABBIE sent out BAYLEEF!" came with no "withdrew PIDGEOTTO!" first.

How often: in 60 Scene OFF `full` seeds the player switched during a foe's two-turn move 11 times (seeds 6, 12, 19, 38, 47, 53, 54, 58)
and the trainer during the player's once (seed 18). All now have their lines.

**ROM check.** Catcher run of the fresh seed 6 trace (same presses on both sides; the SHIFT press is engine frame 27,858, ROM 28,458):

| after SHIFT | ROM | ours |
|---|---|---|
| "GROWLITHE, that's en" typing | +100 | +100 |
| recall: SE_BALL_OPEN | +127 | +127 |
| recall tint, then sparkles | +140, +160 | +140, +160 |
| "Go! VOLBEAT!", send-in SE_BALL_OPEN, VOLBEAT's cry | +175, +226, +242 | +175, +226, +242 |

Pictures sampled at ten offsets match, with AZUMARILL hidden on both sides; the only difference is GROWLITHE's HP and gender mark, the
catcher's known set-up gap (the ROM's GROWLITHE has other personality and no Intimidate). After the Dig hit the two sides drift by 11 to
18 frames because of that same gap: AZUMARILL's attack was never lowered on the ROM, so the hit does more (VOLBEAT 19 -> 8 HP there,
22 -> 15 in ours) and the HP bar drains longer; the earlier Dig turn of the same run, with no switch, shows the same 11.

Scene ON, seed 19 (`--seed 19 --scene on --policy full --battles 7 --max-frames 4800`, 31/31 menus, 0 sound differences): two switches
during the foe's Ice Ball. The recall's SE_BALL_OPEN is at +125 and +124 after SHIFT on both sides, the send-in and cry within one
frame, and pictures sampled at eight offsets match (line, recall tint, sparkles, ball, send-in); only the gender mark differs (set-up
gap). (Seed 12, the foe up high after Bounce in Scene ON, could not be checked: its ROM run stuck at the draft's first press, a
catcher set-up problem.)

Seed 18 (`--seed 18 --scene off --policy full --battles 7 --max-frames 24500`, 139/139 menus, 0 sound differences in the catcher
report): the withdraw line, the recall, the send-in and BAYLEEF's cry keep the ROM's spacing. The whole block starts 24 frames earlier
in ours than on the ROM; that lead is older than this change and comes from the turn before (the player's Dig charge: our AZUMARILL
goes underground about 20 frames before the ROM's, the same on master; see Open).

## Tests

`tests/flow1MenuCursorsAndLockedSwitchRecall.test.ts`:
- seed 3 Scene ON, two battles with the soak's test player: every action / move menu after a switch-in opens on the first entry (7
  menus in these two battles, after six voluntary switches and two faint replacements; one turn had both), and the move cursor still carries over turns without one;
- seed 6 Scene OFF: every voluntary switch prints a "come back" line and plays SE_BALL_OPEN on the recall; the one during the foe's Dig
  is "GROWLITHE, that's enough! Come back!" then "Go! VOLBEAT!";
- direct cases: the player switching during the foe's Fly (line, recall, send-in order, the foe kept hidden, the fresh switch's clock);
  a move at the same point unchanged; the trainer switching during the player's Fly; the reset marks (a slot that comes back, Transform).

## Pins that moved

Gameplay digests (`FactorySession.digest()`, a hash of each turn's events) of the traces used so far, master aa4cc49ce vs this branch:
Kyle's live trace `90a4f3cc19dd63f3` unchanged; the catcher's seed 1, 4 and 8 traces unchanged; seed 3 (`efc2246d3305028a` ->
`6d647e0cebc28ede`) and seed 6 (`d1fcde2f9655e6c9` -> `1512774a658babc0`) moved: the old traces' presses now pick other moves after
their switches (seed 3), and seed 6 also gains the recall's events. Fresh traces of those seeds are what the ROM runs above used.

Three pins of the soak's exploring test player moved. Each was measured with one fix undone at a time; all three move with the cursor
fix alone (with it undone they pass unchanged; with only the recall fix undone they still move), because the player's fight presses
after a switch now land on other moves, so its random game takes another path:

| test | before | after |
|---|---|---|
| `randomRoundSoak.test.ts` M-B "(c) leaves full byte-identical", seed 1 | 60,400 frames, battle 3 turn 19 | 61,456 frames, battle 3 turn 22 (same depth 2, round lost); seed 0 unmoved |
| `randomRoundSoak.test.ts` ISSUES #89 Baton Pass halt | seed 15 | seed 12 (seed 15 no longer uses Baton Pass; `tools/soak/batonPassSearch.ts --seeds 0:40`: candidates 12, 13, 16, 27, 31, 36) |
| `pic9SwitchLines.test.ts`, the "come back" wordings the seeds reach | {0, 2, 3} | {0, 1, 2, 3} (every line still follows `Cmd_hpthresholds2`) |

No ROM-trace pin (frame hashes, lab fixtures, census) moved. Open website challenges keep the build they started on.

## Open

- The player's Dig charge turn in Scene OFF ends about 20 frames early (seed 18, battle 2: our AZUMARILL goes underground at +400 frames
  after the press, the ROM's at +420), and everything after it in that battle keeps the lead. Timing, not checked further here.
- The catcher's set-up gap (the player's Pokémon are not the engine's personalities) still drifts seed 6 from its first Intimidate.
- `sourceDecision` of a continuation after a move turn stays the earlier turn's: a turn whose resolution began with a voluntary switch
  and continues into the foe's locked strike after a move keeps two small switch-only timing rules (turn-end box clear 2 frames early,
  menu 1 frame early). Not seen in the catcher runs; left as it was.
