# WIN GO ON → nonzero-index battle start seam (Battle Scene OFF)

This staged main-lane proof extends the committed Battle-1 WIN → GO ON →
swap-decline → LILIANA Battle Room fixture through the next generated battle
start and the first real player command request. It is a generic controller
proof at `battleIndex = 1`; it does not submit a Battle-2 action or extend the
retired canonical Battle-2 turn march.

## Recorded input and ownership

All four derived traces reuse the exact 39-segment / 11,308-frame prefix from
`win-go-on-swap-offer-no-guide-dismiss-off.json`. They append only two ordinary
held-message acknowledgements: `A` for LILIANA's Battle Room quote, 2,000 idle
frames, `A` for `SCHOOL KID LILIANA would like to battle!`, and 1,000 idle
frames. The referenced mechanicLab fixture remains explicit
`battle-scene-off`.

The fixture's player lead keeps the staging move (`SPLASH`) that produced the
Battle-1 WIN, while its nature/HP-EV/gender identity now agrees with the
source-derived DUSCLOPS set-666 record already owned by the app stage. This is
fixture alignment only; no production code or battle outcome changed. The
prior far-side LILIANA trace remains **115/115 exact** twice fresh.

## Exact windows

Each command below was run twice fresh after the final fixture and trace edits:

| trace | dense frames | result | boundary |
| --- | ---: | ---: | --- |
| `win-go-on-battle2-transition-complete-off` | 11308–11556 | **249/249** | complete quote-dismiss through RNG-selected Frontier transition and black handoff/hold |
| `win-go-on-battle2-room-dismiss-off` | 11308–11337 | **30/30** | LILIANA quote A edge, box close, and transition onset |
| `win-go-on-battle2-transition-black-off` | 11514–11556 | **43/43** | transition's black handoff/hold |
| `win-go-on-battle2-start-off` | 13385–13622 | **238/238** | acknowledged generated intro through LILIANA/KADABRA and player/DUSCLOPS send-out completion |
| `win-go-on-battle2-action-ready-off` | 13631–13633 | **3/3** | settled action menu with the ROM at `CONTROLLER_CHOOSEACTION` |

The oracle semantic state at 13631–13633 has `playerControllerCommand = 18`
(`CONTROLLER_CHOOSEACTION`), `controllerExecFlags = 1`, active DUSCLOPS
147/147, and active opposing KADABRA 133/133. Thus the final dense window is
the real input-ready command boundary, not an endpoint inferred from pixels.

## Tier-1 controller proof

`tests/factoryRoundBattleOrchestrator.test.ts` now continues the adopted
LILIANA receipt through swap decline and the live intro lifecycle. It pins:

- `battleIndex = 1`, current/pending trainer 9 LILIANA, and the adopted
  169/170/130 party before the room handoff;
- the same immutable `battleStart` command through the generated intro;
- a repeated A edge cannot replace the first acknowledgement or consume the
  round command twice;
- completion clears the presentation exactly once, advances to
  `battleActive`, and exposes the kernel's real player-side command request
  through the same `BattleCommandPresentationState.request` object.

The pre-existing index-1/index-5 routing matrix proves this lifecycle is not
specialized to Battle 2. Neither production behavior nor the new test keys on
trainer id, battle number, absolute trace tick, or this fixture.

## RNG-selected transition closure

The complete room-dismiss/transition window is now exact. Source order is
`FillFactoryTrainerParty()` followed by
`GetSpecialBattleTransition(B_TRANSITION_GROUP_B_FACTORY)`
(`battle_tower.c:2093-2099`); the selector is exactly one
`Random() % ARRAY_COUNT(sBattleTransitionTable_BattleFrontier)` draw
(`battle_setup.c:864-909`). The live `BattleRoomState` owns that immutable
draw receipt at its source-relative setup edge. Rendering consumes only the
receipt and never reads or advances gameplay RNG.

For this fixture the draw selects table index 1,
`B_TRANSITION_FRONTIER_LOGO_WAVE`, rather than the legacy encounter-tagged
circle transition. Its presentation is a direct reducer of
`FrontierLogoWave_Main` and its callbacks (`battle_transition.c:4273-4411`):
the 48-frame shared gray intro is exact at 11347-11394; the BG0 logo's
source Q8.8 sine scanline program, 3-tick BLDALPHA updates, amplitude settle,
and opaque hold are exact at 11397-11497; the alternating BG/OBJ normal
palette fade is exact at 11498-11513; solid black begins at 11514. HBlank's
line ownership is retained explicitly: output line `y > 0` reads scanline
buffer entry `y-1`, while VBlank resets line 0 to `cameraY`.

`tests/battleTransitionFrontier.test.ts` pins two independent selector inputs
(LOGO_WAVE and CIRCLES_MEET), one-shot live-room consumption, render purity,
and unchanged round/controller/rental-party state through the seam. No branch
uses trainer id, battle index, turn number, or an absolute trace tick. The
legacy scene-assembly/status-summary residuals before the separately exact
generated send-out window remain outside this transition closure.

Reproduction:

```sh
npm run compare -- win-go-on-battle2-transition-complete-off --summary
npm run compare -- win-go-on-battle2-room-dismiss-off --summary
npm run compare -- win-go-on-battle2-transition-black-off --summary
npm run compare -- win-go-on-battle2-start-off --summary
npm run compare -- win-go-on-battle2-action-ready-off --summary
npm run compare -- win-go-on-swap-offer-no-liliana-far-side-off --summary
```
