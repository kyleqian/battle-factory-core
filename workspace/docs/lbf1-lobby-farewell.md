# lbf1: the Lobby's farewell hands the d-pad back on the ROM's frame (2026-11-22)

Side lane, handoff item 0b ("Found, not fixed", 2nd bullet of `docs/opl4-open-level-proof.md`, catcher run h28s2on). Branch
`worker/side-20261122-150057`. Lobby presentation / input timing only: no battle rule, no RNG rule.

## The finding, re-measured

Everything the Lobby does around the farewell is already on the ROM's frames at Level 50. The one difference is the frame free control
returns after the farewell box is dismissed: the ROM's `closemessage; setvar; releaseall` (`BattleFrontier_BattleFactoryLobby/scripts.inc:65-94`)
takes the d-pad on the frame the box's last row is cleared, dismiss A + 2. The engine made its walkable Lobby on that tick but did not step it
with that tick's input, so a d-pad press there was lost and the engine's player stayed while the ROM's turned (and walked).

h28s2on is that case, not a text-length difference: the catcher's driver put its DOWN on the ROM's accept frame and ours on the frame before
(driver jitter is +-1-2 frames around menu anchors), so only the ROM's player left the counter and the next challenge could not start.

## Table (Level 50, Scene OFF, ROM = oracle :8014)

Anchors: E = the first capture frame of the answering A press (NO / YES at trace frame 4988: E = 4989). D = the farewell dismiss A's
trace frame. All rows below were compared frame by frame (`npm run compare`, every frame captured), engine vs ROM.

| Event (capture frame) | ROM | engine before | engine after |
|---|---|---|---|
| NO: record menu closed | E+1 | = ROM | = ROM |
| NO: farewell box cleared / first glyph | E+3 (4992) / E+4 (4993) | = ROM | = ROM |
| NO: last glyph / press-ready | E+38 (5027) / E+39 | = ROM | = ROM |
| NO: dismiss box gone (picture) | D+3 (5093 for D 5090) | = ROM | = ROM |
| NO: free control (first frame a d-pad press is taken) | D+2 | D+3 | D+2 |
| YES: "battle was recorded" box first glyph / last glyph / press-ready | E+21 (5010) / E+70 (5059) / E+70 | = ROM | = ROM |
| YES: farewell (answered by an A at 5068 = E2 5069) cleared / first glyph / last glyph | E2+3 / E2+4 / E2+38 (5107) | = ROM | = ROM |
| YES: farewell dismiss gone / free control | D+3 / D+2 | D+3 / D+3 | D+3 / D+2 |
| Forfeit (no record question): farewell, dismiss, box gone | `lbra-forfeit-off` 1050/1050 | = ROM | = ROM |
| Forfeit: free control | D+2 | D+3 | D+2 |

The record menu's close, the farewell's glyph window and the press-ready gate (39 after a loss, 41 after a win) were already ROM-exact; the
whole text walk matches frame by frame, so nothing the player sees before the dismiss changed.

Measured with a 1-frame DOWN at D+k (k = 0..6 for NO; k = 1, 2, 3 for YES and forfeit); the frames that match, before -> after:

| trace | before | after |
|---|---|---|
| NO, DOWN at D+0, +1, +3, +4, +5, +6 (r0, r1, r3-r6) | 196/196 each | 196/196 each |
| NO, DOWN at D+2 (r2; committed as `lbf1-loss-no-dpad2-off`) | 110/196 (first diff 5094) | 196/196 |
| YES, DOWN at D+1, +3 (ya1, ya3) | 304/304 each | 304/304 each |
| YES, DOWN at D+2 (`lbf1-loss-yes-dpad2-off`) | 140/304 (first diff 5124) | 304/304 |
| Forfeit, DOWN at D+1, +3 (fa1, fa3) | 182/182 each | 182/182 each |
| Forfeit, DOWN at D+2 (`lbf1-forfeit-dpad2-off`) | 8/182 (first diff 1026) | 182/182 |

## The change

`src/engine/core.ts`, the loss-terminal branch: the tick that first creates `lobbyFreeRoam` (`factoryTerminal.age >= freeRoamBoxGoneAge`, from
`factoryTerminalDeclineBoxGoneAge`) now runs `advanceFactoryLobbyFreeRoam` on the new state with that tick's held directions and the Lobby NPC
tiles, instead of storing the idle state. Nothing else moves: the NPC release (`age >= goneAge - 1`, lbw8), the box-gone picture, the RNG draws and
the text timings are untouched. The change has no level test in it, so it applies the same way at Level 50 and Open Level; the Lobby level menu and
`factoryLobbyAttendant.ts` were not touched. It sits in the terminal branch every farewell hands over through; ROM-measured here are the loss
(NO, YES) and forfeit farewells. The won and retire farewells were not measured on the ROM for this step (their existing traces still match).

Not measured on the ROM at Open Level: no Open Level farewell trace was made in this step. The engine side is one shared code path, pinned by
the test below at Level 50.

## Tests, traces

- `tests/lbf1LobbyFarewell.test.ts` (new, Tier 1): on the three new traces, a DOWN on D+2 gives `pendingDir "south"` and the turn on the next ticks,
  a DOWN on D+1 is not taken. It fails without the change (3 of 3) and passes with it.
- New compare traces (made fresh on this build, `battle-scene-off`): `lbf1-loss-no-dpad2-off` (196 frames), `lbf1-loss-yes-dpad2-off` (304),
  `lbf1-forfeit-dpad2-off` (182). Each is a prefix of `lbra-loss-off` / `lbra-forfeit-off` plus a 1-frame DOWN on D+2.
- All 49 existing Lobby traces (`lbra-*`, `lbrb-*`, `lbrd-*`, `lbre-*`, `lbrf-*`, `lbw4/5/6/9-*`, `loss-terminal-*`) match with the change, every
  frame (for example `lbra-loss-off` 2258/2258, `lbra-forfeit-off` 1050/1050, `lbra-retire-off` 1554/1554, `loss-terminal-window-off` 1943/1943).
- The 166 test files that import `engine/core.ts` or are `lb*` / `randomRoundSoak*` tests pass with no trajectory re-pin.
- Census 0..199, Scene OFF: eventsDigest + error identical 200/200, byte-identical shards 2/2 (61,853 commands), base 1f644c562 vs 362039b01.

## Tools notes

The frame catcher's `compare.py` needs numpy: run it with `/srv/pokebench/vendor/mgba-venv/bin/python`. Evidence is in
`.integration/evidence/lbf1/` (traces, out-* compare runs before/ and after, census, contact sheets p2/h28/y0).
