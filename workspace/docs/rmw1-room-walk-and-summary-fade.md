# rmw1: the room's transition clock, the draft menu's input gate, and the postwin traces (2026-11-22)

Integration lane, from fold-d (master + abs1). Presentation / input timing only: no battle rule, damage, RNG outcome, turn order or facility
state moves (census below). Evidence (not in git): `.integration/evidence/rmw1/` (`before/`, `final/`, `after/`, `census/`, `scratch/`).

## 1. The walk after the opponent's intro box (abs1 open item 1)

### ROM rule
`battle_transition.c` `Task_BattleTransition_Intro` (gray flash: 3 x (8 up + 8 down) blend steps of 2, no delays) takes its first step on an
even probe frame, so the transition's first picture lands on an **odd absolute frame**. `tools/integration/rmw1RoomProbe.py` presses A on the
box at ten offsets (battle-1 room, plus abs1's four and the canonical battle 2) and records per-frame brightness: the ROM's first picture is
the first odd frame at or after T + 31 (T = the press frame; the engine's own picture is at T + 32 in battle 1, T + 29 in battle 2:
`ordinaryTransitionDrawElapsed` 26 / 23 + `MSGBOX_CLOSE_TICKS` 4 + 2 after the BGM).

### Port
`src/engine/battleRoom.ts`: `alignOrdinaryTransitionClock(state, pressFrame)` sets `transitionClockAhead: 1` when
`pressFrame + 4 + draw + 2` is even (the engine's first picture would be on an even frame); `ordinaryBattleTransitionTe` adds it on both
branches, so every picture the room draws from the transition clock comes one frame earlier, exactly for those presses. `core.ts` passes the
press frame at both box-accept sites (`state.frame + 1`, the trace's 1-based frame). The handoff elapsed is unchanged. Both press parities
now match the ROM's flash in the scans (battle-1 room, T = 742..745 and the press-shifted p838..845 traces).

### What it does not fix, and why abs1-room-intro-mash-a-on stays 125/152
Its first diff (frame 825, 7685 px) is **not** a timing offset: from there the ROM draws a different transition kind than the engine. The
engine's draw is RNG-dependent and its room RNG before the draw differs from the ROM's (tri1's open item "the engine's battle-1 draw for the
canonical inputs"); the post-flash pictures (and the 27 later frames) cannot match until that is fixed. Not attempted here (room RNG before the
draw is a gameplay / RNG question). The phase-2 start (ROM ~ T + 82 in the battle-1 room) could not be checked for the engine's kind.

## 2. The draft summary "fade" (item 2): it was the menu's input gate, not the fade

abs1-draft-mash-a-on differed from frame 34: the A mash on the draft screen opened the mon pic, and the SUMMARY / RENT / OTHERS menu took its
first A **2 ticks later in the engine** than in the ROM (accept at press + 25 on the ROM, + 27 in the engine; scans k = 25..31 on the opening A,
variant A). `src/engine/monPic.ts`: `isMonPicInputReady` is true from `openTable.length - 2` of the opening table (`MENU_INPUT_BEFORE_TABLE_END`);
the pictures are unchanged. The summary fades themselves (`ENTRY_*` / `EXIT_*` / `FADE_IN_TICKS`) are right: every summary-* trace that covers them
matches (below), and a trial one-tick shift of the exit fade-in broke summary-info-magby (132 -> 118) and summary-info-onix (122 -> 108), so it
was removed. Verified for variant A only (variants B / C use other tables; no ROM scan).

Residual (34/38; frames 128, 132, 136, 140 differed, 132..140 match with a trial OBJ-lag removal that was dropped, only 128 is the real offset): after the summary closes by an A, frame 128 (the first fade-in frame of the draft)
shows the draft's OBJ layer already dim on the ROM and still black in the engine (4023 px, region 22,34-239,127); 132..148 match. Not
resolved: it needs a dense capture of the A-close exit, and the B-close exits the existing traces pin match.

## 3. Why battle1-postwin-heal compared 0/199 before and after abs1 (item 3)

The trace is a canonical ROM recording but declared no `appRoute`, so the compare replayed the engine on the default generated-orchestrator
route, a different game, and every capture mismatched wholesale (the repo's known "0/N" misdiagnosis). abs1's engine change could not move it
because the wrong route never reaches the room in the recorded state. It is a trace fault, not an engine fault: with `"appRoute":
"canonical-recorded"` and `"oracleProfile": "battle-scene-on"` the same trace is 199/199 on the rmw1 engine (decline, the one of the five also run on fold-d's engine, is 72/73 on both, so the route field alone makes the difference). The same
fix for next-prompt / scout-a / scout-b / decline; `tests/compareTraceAppRoute.test.ts`'s legacy allowlist loses those five. abs1-draft-mash-a-on
also had no `appRoute` (the ratchet test caught it): `"generated-orchestrator"`, the default it was already replaying on.

## 4. Numbers (compare, oracle :8012, before -> after)

| trace | before | after |
|---|---|---|
| abs1-draft-mash-a-on | 18/38 | 34/38 |
| abs1-room-intro-mash-a-on | 125/152 (first diff 825) | 125/152 (first diff 825; see section 1) |
| abs1-room-intro-hold-a-on | 152/152 | 152/152 |
| room-msgbox / room-entry / room-npcs | 142/142 / 110/110 / 98/98 | same |
| battle2-room-a / battle2-room-b / battle2-transition | 225/225, 131/131 / 249/249 | same |
| draft-menu / draft-cursor / draft-menu-slot6 | 38/38, 13/13, 66/66 | same |
| summary-* (19 traces) | not run before | 17 full (incl. summary-info-magby 132/132, -onix 122/122); summary-info-quilava-v-stretch(-settled) 48/91, on the rmw1 engine with and without the discarded fade trial (no summary code is changed; not measured on fold-d) |
| battle1-postwin-heal / next-prompt / scout-a / scout-b | 0/199, wholesale (no route) | 199/199, 216/216, 171/171, 164/164 |
| battle1-postwin-decline | 1/73 (no route) | 72/73 (frame 6970 differs on the pre-rmw1 engine too) |
| transition | 57/206 | 57/206 (long-standing) |

The abs1 tackle / faint / lobby traces were not re-run: they do not reach the room's box or the draft menu.

## 5. Census, tests

Census 0..199 (`lsd194Census.sh` HEAD~1 vs HEAD, `rst197CensusDelta.py --digest`): Scene ON eventsDigest + error identical 200/200, 63514 commands,
0 changed, shards byte-identical 2/2; Scene OFF identical 200/200, 62209 commands, 0 changed, 2/2. (tree/ copies deleted.)

Tests added / changed: `tests/rmw1RoomTransitionClock.test.ts` (new; parity rule, both encounters), `tests/monPic.test.ts` (the gate at table length - 2).
Pins moved, each read first:
- `tests/battleRoom.test.ts` wiring test: the close state may carry `transitionClockAhead` (toMatchObject).
- `tests/aud241aBattleStartSounds.test.ts`: the seed-3 session draws LOGO_WIGGLE (29), gap 348 (tri1's table: 160 + 35 + 153), was CIRCLES_CROSS / 349; the RandomPlayer's earlier menu A moved the room's RNG at the draw.
- `tests/randomRoundSoak.test.ts`: "full" seed 0 40485 -> 40479 and seed 1 57651 -> 57650, "vanilla" seed 0 9336 -> 9294 and seed 1 9315 -> 9344 (frames only; battle / depth / turn / end state identical); the Baton Pass pin seed 24 -> 12 (rescan 0:40, candidates 12, 14, 25).
- `tests/compareTraceAppRoute.test.ts`: allowlist -5.

## Open

- The transition kind the ROM draws in the battle-1 room differs from the engine's (room RNG before the draw): blocks abs1-room-intro-mash 152/152.
- Draft fade-in frame 128 after an A-close (OBJ layer).
- Menu-input gate measured for the opening table's variant A only.
- `prebattleRoom.ts` (an Open Level file) was not touched.
