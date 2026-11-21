# lha1: the low-HP alarm after a SHELL BELL win, and a stat-up berry's flash on the wrong Pokémon (2026-11-21)

Two presentation fixes for the frame catcher's round-2 findings 3 and 4 (`docs/fcr2-catcher-round2.md`). No gameplay or RNG change: the
fresh catcher traces made on this branch are byte-identical to fcr2's (same presses, same battle text, same lengths).

## 1. The victory music after the winning turn's last command (finding 3)

**What was wrong.** When the player's Pokémon is in the red, wins with its last hit and SHELL BELL heals it (still red), ours started the
victory music at "Foe HUNTAIL fainted!" (22 ticks after that box's A), one message early. The heal's HP bar then ended red after the alarm
had been stopped, so `HandleLowHpMusicChange` started SE_LOW_HEALTH again; it beeped through the walk back and the attendant until the next
battle (seed 2 Scene OFF battle 11: SE_LOW_HEALTH again at 121,920, stopped at 124,432, about 2,500 frames).

**ROM.** `HandleEndTurn_BattleWon` (`battle_main.c:4960-4982`) runs when the turn has ended, after the move's end effects
(`Cmd_moveend`: ROUGH SKIN and the other contact abilities in `MOVEEND_ON_DAMAGE_ABILITIES`, status-cure berries in
`MOVEEND_ITEM_EFFECTS_ALL`, SHELL BELL in `MOVEEND_KINGSROCK_SHELLBELL`, `battle_script_commands.c:4210-4400`) and the fainted-mon scripts
(`HandleFaintedMonActions`, `battle_util.c:1894-1970`). It calls `BattleStopLowHpSound`, which clears `lowHpSong` and stops the alarm
(`battle_gfx_sfx_util.c:1120-1129`), then `PlayBGM(MUS_VICTORY_TRAINER)` (the Factory Head: `MUS_VICTORY_GYM_LEADER`), and starts
`BattleScript_FrontierTrainerBattleWon`, whose first print is "Player defeated …" (`battle_scripts_1.s:3027-3031`). No HP bar is updated
after it, so `HandleLowHpMusicChange` (`:1090-1103`, a red bar with `lowHpSong` clear) never plays the alarm again. `sEndTurnFuncsTable`
sends `B_OUTCOME_DREW` (both last Pokémon fainted) to `HandleEndTurn_BattleLost`, which plays no victory music (`battle_main.c:556-559`).

Things that can follow the last foe faint in the same turn, before the turn ends: the attacker's moveend (ROUGH SKIN / EFFECT SPORE /
STATIC / POISON POINT / FLAME BODY / CUTE CHARM on the attacker, SYNCHRONIZE, a status-cure berry, SHELL BELL), Destiny Bond's "took its
attacker down with it!" and the player's own faint box. Recoil and Grudge print before the faint box (seen in seeds 9 ON and 8 OFF).

**ROM frames** (catcher runs of fcr2, `.integration/evidence/fcr2/final/`; "ours" is the old engine, aligned to the ROM by identical
pictures):

| win | after the last faint | ROM | ours before |
|---|---|---|---|
| ordinary (86 of 96 wins in the 7 two-round runs) | nothing | music 21-22 ticks after the faint box's SE_SELECT | 22 |
| seed 2 OFF b11, OCTILLERY 14 → 15/136 | SHELL BELL | box A 128,139; heal text 128,182; bar 128,296; stop + music 128,314 (bar + 18); "Player defeated" 128,318 | music 121,781 (box A + 22), alarm again 121,920 |
| seed 2 OFF b10, OCTILLERY 87 → 96 | SHELL BELL | bar 110,328-110,336; music 110,354 (last change + 18); print 110,358 | music 104,764, before the heal text |
| seed 10 ON b10, POLITOED | SHELL BELL (held-item animation) | bar 180,128-180,130; music 180,148 (+ 18) | music 171,095 |
| seed 2 OFF b9, MINUN | ROUGH SKIN, 91 → 82 | "hurt" text typed by 100,994; music 101,078 (+ 64 wait + 20); print 101,082 | music 95,970, before the bar |

In every case the ROM's music comes 4 ticks before the first glyph of "Player defeated". Relative to the box's A our presentation shows
these within a few frames of the ROM (SHELL BELL b11: text +4, bar +2; b10: bar +2; ROUGH SKIN: bar -7, text +8, pre-existing), so the
music is timed from our own commands and keeps its place after them.

**The change** (`src/engine/battleEndSounds.ts`). `victoryBgmAnchor` finds the win script's first print (STRINGID_PLAYERDEFEATEDTRAINER1)
and walks back to the turn's last presented command before it, skipping moveend's one-row sprite-visibility receipts (they are rows of the
tail). `BattleStopLowHpSound` + `PlayBGM` are scheduled on the tick the presentation leaves that command:

| anchor (last command before "Player defeated") | delay | evidence |
|---|---|---|
| a button box (the "fainted!" box; the player's own faint box after Destiny Bond / ROUGH SKIN) | 22, its A | unchanged from aud241c: the six ROM windows, 86 catcher wins |
| an automatic message with its waitmessage (ROUGH SKIN's "hurt" line) | 19 after it ends | seed 2 OFF b9 |
| an HP bar or another controller command (SHELL BELL's heal) | 14 after it ends | seed 2 OFF b10, b11; seed 10 ON b10 |

Only `battleOutcome & 0x7F == B_OUTCOME_WON` plays it (a draw no longer does). A presentation without the win script's print falls back to
the old rule (none is known). The ordinary win is unchanged: its anchor is the faint box, 22 ticks after its A.

After the change (probe of the same traces): seed 2 OFF b11 music 121,936, b10 104,927, b9 96,095, seed 10 ON b10 171,429: each is the
ROM's frame when the two sides are aligned on the anchor's pictures (the bar, the ROUGH SKIN text); relative to the box's A they are +2,
+2, +8 and -2 ticks from the ROM (A + 177 / 185 / 147 / 356 against 175 / 183 / 139 / 358), the drift of the pictures above. The
ordinary b12 stays at 132,922. b11 plays SE_LOW_HEALTH once (121,497) and never again.

## 2. A stat-up berry's flash on the holder (finding 4)

**What was wrong.** The foe's GIRAFARIG uses SKILL SWAP; at the end of the turn its PETAYA BERRY raises its SP. ATK. The ROM flashes
GIRAFARIG; ours flashed the player's MASQUERAIN, and the stat SE was panned to the player (ours -64, ROM +64; the catcher compares sound ids
only, so it did not show). The text was already the same; the turn's timing is not changed here (see "Left open").

**ROM.** `TRY_EAT_STAT_UP_BERRY` (and LIECHI's inlined copy) sets `gEffectBattler = battler`, the holder (`battle_util.c:3244-3255,
3429-3442`); `ItemBattleEffects`' tail sets `gActiveBattler = gBattlerAttacker = battler` (`:3604-3606`). `BattleScript_BerryStatRaiseEnd2`
plays `B_ANIM_HELD_ITEM_EFFECT` on `BS_ATTACKER` and calls `BattleScript_StatUp`: `playanimation BS_EFFECT_BATTLER, B_ANIM_STATS_CHANGE`
(`battle_scripts_1.s:4410-4417, 510-514`). Stat-up berries are eaten only at `ENDTURN_ITEMS1` (`ItemBattleEffects(ITEMEFFECT_NORMAL, battler,
FALSE)`, `battle_util.c:1499-1503`): every stat-up case needs `!moveTurn`, and the other `ITEMEFFECT_NORMAL` calls (`ENDTURN_ITEMS2`, the
fainted-mon actions' case 6) pass TRUE. So "after being hit" and "after the holder's own move" are the same end-of-turn path.

**Cause.** The end-turn tick (`src/engine/battleEndTurnOrchestration.ts`, the `STAT_UP_BERRIES` branch) wrote `effectBattler: battler` as a
top-level key of the rules context, which is no field and is read by nothing; `BS_EFFECT_BATTLER` reads `selectorRoles.effectBattler`
(`battleScriptRulesContext.ts:2971`), which still held the role the turn's last action set (its target: MASQUERAIN for SKILL SWAP). When that
role already was the holder, the flash was right by chance; the fcr2 catcher runs flagged only this turn.

**The change.** The tick sets `selectorRoles.effectBattler = battler`, as `runYawnTick` does (the dead key is gone). It covers LIECHI, SALAC
and PETAYA, the Factory's carried stat-up berries, through the one shared branch. GANLON, APICOT, LANSAT and STARF have no Factory Level 50
carrier and stay named case barriers (`ZERO_CARRIER_ITEM_BARRIERS`); STARF's script reads the same role and LANSAT's plays no stats change.
Presentation only: every `BS_EFFECT_BATTLER` reader in `battle_scripts_1.s` is `playanimation` / `statusanimation` /
`chosenstatus2animation` / `updatestatusicon` / `makevisible`, and the kernel's other reads of the role are message substitutions
(`factoryBattleScriptFullTurnDecision.ts`). The role keeps the holder after the script, as `gEffectBattler` does.

Seed 9 ON battle 9 after the change: the stats-change command is on battler 1 (GIRAFARIG), at the same frames as before (107,890);
the catcher (below) found two more turns of seed 9 that the same cause had flashed on the wrong side.

## Tests

- `tests/lha1VictoryBgmLowHpAlarm.test.ts` (new, 10 tests): `APP_STAGES["lha1-{red,shellbell,roughskin}-win-{on,off}"]`
  (`tools/compare/appTrace.ts`: a Lv60 foe puts the player in the red, the player knocks out its last Pokémon; with SHELL BELL, ROUGH SKIN
  or neither). Each: SE_LOW_HEALTH once before the KO, its stop on the victory music's frame, never again; the music 22 / 14 / 19 ticks after
  the anchor; before "Player defeated"'s A and after the last HP bar. Sound collection leaves the state unchanged. `victoryBgmAnchor` and a
  fabricated draw: no victory music. Against the old emitter the four SHELL BELL / ROUGH SKIN cases and the draw fail, the ordinary wins pass.
- `tests/battleEndTurnOrchestration.test.ts` (+6): LIECHI / SALAC / PETAYA held by battler 0 and by battler 1 with the effect role on the
  other: HELD_ITEM_EFFECT and STATS_CHANGE play on the holder, the stat rises on the holder only, no RNG. All six fail on the old tick.
- `npm run typecheck`: exit 0 (run as its own command, `NODE_OPTIONS=--max-old-space-size=8192 tsc -b`: the script's `flock` is not on
  this Mac). The 51 test files importing `battleEndSounds` / `screenSounds` / `tickSounds` / `battleEndTurnOrchestration` plus the berry
  oracle-evidence tests: 590 tests pass. `npm run test:gate`: 360 files, 2,832 tests pass. Full `npm test`: 1,909 files / 16,417 tests
  pass (44 files / 243 tests skipped). No soak pin moved.

## Catcher before / after

Fresh traces on this branch (`makeTrace.mjs --seed 2 --scene off` and `--seed 9 --scene on`, `--policy winning-swap --battles 14
--lobby-tail 120 --max-frames 260000`) are byte-identical to fcr2's: the same 163,124 / 167,963 frames, segments and battle text (the SHELL
BELL wins of battles 10 and 11 and the SKILL SWAP + PETAYA turn are there). `KEEP=1 JOBS=2 tools/frame-catcher/run.sh`, evidence in
`.integration/evidence/fix-alarm-berry/catcher/` (before: `.integration/evidence/fcr2/final/`). Both ROM runs reproduce fcr2's ROM runs
exactly (172,280 / 177,462 frames, the same sound log and menus; all 741 / 587 menus followed).

| run | stretches content / timing | picture differences | sound rows |
|---|---|---|---|
| seed 2 OFF before | 309 / 429 | 531 | 3: draft SE_SELECT (artefact), SE_LOW_HEALTH at 121,920 (battle 11), its stop at 124,432 (battle 12) |
| seed 2 OFF after | 308 / 430 | 530 | 1: the draft SE_SELECT artefact |
| seed 9 ON before | 256 / 329 | 1212 | 1: SE_WALL_HIT in the last Lobby frames (artefact) |
| seed 9 ON after | 254 / 331 | 1211 | 1: the same artefact |

- Seed 2: battle 11's stretch (547) and battle 12's first (553) turned from sound content to timing. Our victory music: 95,970 → 96,095
  (b9), 104,764 → 104,927 (b10), 121,781 → 121,936 (b11); the eleven ordinary wins unchanged. SE_LOW_HEALTH plays once in battle 11.
- Seed 9: the flash pair (ours over MASQUERAIN, the ROM's over GIRAFARIG) of battle 9 is gone, and so are two more pairs the same cause
  made, not listed in fcr2: battle 3 (the player's PLUSLE's PETAYA after its own SPARK; ours flashed the foe) and battle 6 (the foe
  FURRET's LIECHI after "is paralyzed! It can't move!"; ours flashed PLUSLE). Their stretches (81, 243) are now timing. In battle 9 all 77
  frames of the flash are pixel-identical to the ROM's field (1 frame early, see "Left open"); the stat SE is now panned +64, as the ROM.
- Left in those stretches: seed 9 battle 9's one-frame action-menu blob at 107,085 and seed 2's small text-arrow blobs (known classes);
  a MACH PUNCH afterimage difference in seed 9 battle 14 (16 frames, unrelated, before and after).

## Left open

- **"Player defeated" prints about 20 ticks early in every won battle** (seen while measuring, not changed): ROM first glyph 25 ticks after
  the last faint box's SE_SELECT (music + 4), ours 2 ticks after it (right after the two receipts); after SHELL BELL ROM bar + 22, ours bar +
  4; after ROUGH SKIN ROM text end + 88, ours + 67. Our presentation shows the win script as soon as the turn's last command ends, without the
  ROM's moveend tail, fainted-mon scripts and end of turn (the terminal seam doc measured the same dismiss + 23,
  `docs/terminal-seam-win-window-ground-truth.md`). The catcher classes it as timing. A fix moves every win's end by those ticks (the trainer
  slide, its text and the end fade follow), so it is left for its own step.
- The stat-up berry turn's timing (unchanged, both before and after): aligned on the held-item animation (pictures and sounds at the same
  offset), our stat-rise flash starts 1 frame early, its SE_M_STAT_INCREASE 3 frames late and the "Using PETAYA BERRY…" text 12-13 frames
  late (seed 9 ON battle 9).
- Ordinary wins whose move script runs more rows after the faint: the ROM's music is 1-3 ticks later than 22 after Brick Break (23, four
  wins), Double Kick (24) and Dive (25); ours stays at 22.
- Not measured on the ROM: ROUGH SKIN's anchor in Scene ON, a status-cure berry's status-icon anchor (given the controller-command 14), the
  player's own faint box after the foe's last faint (given 22), a draw.
