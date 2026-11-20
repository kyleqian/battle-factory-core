# Frame catcher, first runs (2026-11-20)

The frame catcher (`tools/frame-catcher/README.md`) plays whole Battle Factory battles on our engine and on the real ROM with the same
player choices and compares every frame and every sound, menu to menu. This is what it found on Kyle's live round and on five more
battles.

## In short

- It finds what Kyle saw in his round: the Murkrow picture after his faint, the Bug Catcher in the room after a win, the silent battle
  menus and the party-menu cancel that cuts instead of fading. At the Tuber's frames it finds a difference too, but not the one Kyle
  described: on both sides the Tuber stands on the same tile; ours draws it facing sideways where the ROM shows it facing down.
- It finds new bugs: a wrong HP number after a send-out, a missing Ingrain heal animation, Spinda's spots, the send-out line after a
  switch ("Go!" where the game says "Do it!" or "Go for it,"), a missing HP box after a replacement, Rollout's sound repeating, a
  different turn order in one battle, and more (list below).
- On the branch tip (2cd8b3039) the silent menus and the cancel cut are still there; the battle-start transitions now match.
- The ROM follows the engine all the way in all six runs (every menu matched, every trainer roll the engine's, the same battle-start
  transition in 13 of 15 battles). Each run takes about 1.5 to 2 minutes.

Pictures (ROM | ours | diff) are in `.integration/evidence/frame-catcher-20261120/curated/` (not in git; copies in the planning
session's notes folder). Each run's full ranked report is `.integration/evidence/frame-catcher-20261120/<run>/report.md`.

## Runs

| run | build | what it covers | frames ours / ROM | menus followed | seconds (ours / ROM / compare) |
|---|---|---|---|---|---|
| Kyle's live round | site, core aeac1cdcb | draft with summaries, 3 wins + battle 4 start, faint and forced switch, party cancels, swap screen entered and quit, Scene ON | 50,488 / 54,941 | 127 / 127 | 25 / 78 / 22 |
| t1 (seed 1, winning-swap) | tip 2cd8b3039 | 2 wins and battle 3 start, swaps, faints and replacements, berries, confusion, Scene ON | 27,399 / 30,000 | 89 / 89 | 13 / 51 / 8 |
| t3 (seed 3, full) | tip | 2 wins, voluntary switches and cancels, weather, critical hits, multi-hit, Rollout, Scene ON | 38,737 / 40,201 | 128 / 128 | 33 / 62 / 25 |
| t4 (seed 4, full) | tip | 1 battle lost, Protect, weather, multi-hit, many switches, Scene OFF | 45,000 / 40,517 | 245 / 245 | 21 / 55 / 25 |
| t6 (seed 6, full) | tip | 1 battle lost, many voluntary switches, Protect, berries, status, Scene OFF | 45,000 / 36,058 | 197 / 197 | 25 / 48 / 29 |
| t8 (seed 8, winning-swap) | tip | 2 wins and battle 3 start, Protect, status, swaps, Scene OFF | 27,702 / 31,326 | 139 / 139 | 11 / 40 / 17 |

The t traces are made by `tools/frame-catcher/makeTrace.mjs --seed N --policy P --scene S --battles 2 --max-frames 45000` (copies in
the evidence folder's `traces/`, with each one's battle text).

## Kyle's known bugs (his round, site build)

| bug | found? | ours (engine frames) | ROM frames | picture |
|---|---|---|---|---|
| Silent battle menus | yes: the ROM plays the cursor sound (SE_SELECT) 117 times in action menus, 96 in move menus, 6 in party menus where ours plays none | from 7,258 | from 7,236 | (sound) |
| Opponent drawn as Murkrow after his faint | yes: ours draws Murkrow, the ROM Delibird | 17,494-17,734 | 18,436-18,680 | `k02-murkrow-and-hp-138.png` |
| Bug Catcher in the room after a win | yes: ours draws a Bug Catcher where the ROM keeps the beaten Tuber; the same spot also differs after battle 1's win (ours 21,877-21,915) | 39,588-39,626 | 43,056-43,100 | `k03-bug-catcher-after-win.png` |
| Party-menu cancel cuts instead of fading | yes: on every cancel the ROM fades the party menu out and the battle back in; ours cuts (133 ROM-only frames over 9 cancels in battle 1) | e.g. 10,508, 12,345 | e.g. 10,756, 13,099 | `k04-party-cancel-no-fade.png` |
| Tuber one tile too high | a difference, but not this one: same tile on both sides; ours draws the Tuber facing sideways, the ROM facing down (70 pixels) | 32,300-32,480 | 34,396 | `k05-tuber-one-tile-high.png` |

## New findings

Ranked by how visible they are. "Ours" frames are engine frames of that run; ROM frames are the ROM run's.

1. **HP shown as full after a send-out** (Kyle's round). After Ivysaur faints, Magby comes back with 65/138 HP; ours shows "138/138" in
   in its HP box for about 110 frames before it switches to 65/138, the ROM shows 65/138 throughout. Ours about 17,620-17,735, ROM
   18,560-18,680.
   Same picture as the Murkrow one (`k02`).
2. **Ingrain's heal animation is missing** (Kyle's round, battle 1). At the end of a turn with Ingrain the ROM plays the heal animation
   (green flash, sparkles over Lileep, SE_M_CRABHAMMER eight times then SE_M_ABSORB_2) before "Foe LILEEP absorbed nutrients with its
   roots!"; ours goes straight to the text. Ours about 21,020, ROM 22,056-22,220. `k06-ingrain-heal-animation-missing.png`.
3. **Switch lines** (Kyle's round and tip: t4, t8). Both lines of a voluntary switch depend on the battle state on the ROM, and ours
   picks other ones. Send-out: the ROM says "Do it! POLIWHIRL!" or "Go for it, CHINCHOU!" (by how hurt the foe is); ours says "Go! ...".
   Withdraw: in Kyle's battle 1 the ROM says "MAGBY, good! Come back!" where ours says "MAGBY, OK! Come back!", then "Go for it,
   IVYSAUR!" vs ours "Go! IVYSAUR!" (ours 13,181-13,420, ROM 13,974-14,226; ranked low in the run's report because text differences
   are small). t4 ours 28,967 vs ROM 28,544; t8 ours 16,409 vs ROM 18,925. `k09-switch-lines.png`, `t4-send-out-text-do-it.png`,
   `t8-send-out-text-go-for-it.png`. (The planning session's battle-only ROM replay found the same lines.)
4. **Player's HP box missing after a replacement** (tip: t3, battle 1). After PHANPY faints and CHARMELEON comes back in, ours does not
   draw CHARMELEON's HP box through "CHARMELEON used AERIAL ACE!" until the foe's Petal Dance; the ROM shows it all the time. Ours
   10,968-11,212 and 11,460-12,188 (1,000 frames). `t3-player-hp-box-missing.png`.
5. **Spinda's spots** (Kyle's round, battle 4). Ours draws the opponent Spinda with a different spot pattern for the whole battle
   (personality 1313747607; the ROM draws the spots of that personality). Ours from 42,396, ROM from 46,673. `k07-spinda-spots.png`.
6. **Turn order differs** (tip: t3, battle 1, the last turn). Ours: "Foe LEDIAN used AGILITY!" then CHARMELEON's Slash knocks it out.
   ROM: CHARMELEON's Slash first, Ledian faints without moving (no Agility sounds or pictures). Ours 13,141-14,433, ROM 13,909-14,837. A
   battle-rules difference (or a gap in the catcher's set-up); worth a rules replay of that turn.
7. **Rollout's impact sound repeats** (tip: t3, battle 2). Ours plays SE_M_HEADBUTT on 10 frames in a row for each Rollout hit (40 times
   for 4 hits); the ROM plays it once per hit. Ours 17,748-17,757 (and three more hits), ROM 18,360.
8. **Battle-start transition pattern** (Kyle's build only). Both sides pick the same transition (FRONTIER_SQUARES for battle 1), but
   Kyle's build draws circles for it (ours 6,533 vs ROM 6,479). On the tip the transitions match. `k08-transition-pattern.png`.
9. **Draft confirm sound** (all runs). After YES on "Are these three POKéMON OK?" the ROM plays SE_EXIT; ours does not (ROM frames 418-442
   in the t runs, 6,101 in Kyle's).
10. **Swap screen and swap-prompt sounds** (all runs with a swap). The ROM plays SE_SELECT when the cursor moves in the "swap a
    POKéMON?" YES/NO and in the swap screen's Pokémon picker; ours does not. Ours plays SE_SELECT in the swap screen's menu and its
    YES/NO where the ROM does not. E.g. t1 ROM 12,587 and 12,991, ours 11,850 and 12,949.
11. **Party menu sounds** (tip: t4, t6, t8). Ours plays SE_FAILURE in the battle party menu where the ROM does not (t4 ours 30,015, t6
    28,449, t8 16,233), and an extra SE_SELECT in the party submenu.
12. **The rental's name colour** (Kyle's draft; the swap screen on the tip). The species name at the top right is pure red (255,0,0)
    in ours and (231,8,8) on the ROM. Ours 4,493, ROM 4,420. `k12-draft-name-colour.png`.
13. **Summary screen music** (Kyle's draft and battle 1). Ours lowers the music (m4aMPlayVolumeControl on MUS_B_FACTORY /
    MUS_VS_TRAINER) and stops it at summary moments where the ROM does not (ours 3,632, 4,002, 12,805).

## Worth a look (not checked by eye)

- The party menu's SUMMARY cries another Pokémon than the ROM's: t3 (ROM PHANPY, ours CHARMELEON, ROM 10,942 / ours 10,416) and t6 (ROM
  EEVEE, ours VOLBEAT, ROM 22,666 / ours 21,521). Could be the summary opening on another party slot after a switch.
- t3 battle 1: the ROM plays SE_M_SACRED_FIRE2 (ROM 9,520) that ours does not; t6: ours plays SE_M_STAT_DECREASE in five switch stretches
  the ROM does not (ours from 4,525); t6: the ROM plays SE_BALL_OPEN (ROM 28,653) that ours does not.
- After the swap screen, back in the room: the ROM shows the room lit while ours shows it still dark (t1 ROM 28,677, t8 ROM 11,922,
  Kyle's ROM 33,679).
- The selected party slot is drawn in another colour while the party submenu is open (t1 ROM 2,839, many stretches).
- The ROM redraws the action menu box one or two frames after a party-menu cancel; ours has it at once (part of the cancel fade).

## Expected differences (not bugs)

- Before the first draft menu: the ROM's select screen is entered again by the set-up; the recording starts on its first settled frame.
- t4 and t6 end at the Lobby's save dialog after the lost battle: the site holds the game there (`challengeRequest: "hold"`), the ROM
  goes on; the last stretch is expected to differ.
- Long stretches with Kyle's text-skipping presses are mostly timing: between menus the presses are replayed by frame offset, so they
  speed up text at slightly different moments on the ROM.

## What it cannot compare yet

See the README's last section: the draft's first fade-in, starts other than the draft and non-fresh Factory records (symbols, Noland),
summary-screen cursor steering, and pan changes of running sounds. In 2 of 15 battles the ROM's transition was not the engine's (t3
battle 3, t4 battle 1); those stretches show transition differences that are not bugs.
