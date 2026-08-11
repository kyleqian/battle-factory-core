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

## Honest residual boundary

This increment does **not** claim every transition frame. The existing room
renderer selects its Frontier transition from the legacy `encounter` tag;
the ROM selected its transition from live RNG. The dynamic effect between the
exact room-dismiss and black-hold windows remains mismatched (first residual
11338), and the legacy scene-assembly/status-summary spans before the generated
send-out window also retain known residuals. Fixing those requires a generic
RNG-selected transition/presentation owner, not a LILIANA or battle-index
branch. The largest independently exact reusable continuation landed here is
the complete 238-frame generated send-out plus the independently exact real
command boundary.

Reproduction:

```sh
npm run compare -- win-go-on-battle2-room-dismiss-off --summary
npm run compare -- win-go-on-battle2-transition-black-off --summary
npm run compare -- win-go-on-battle2-start-off --summary
npm run compare -- win-go-on-battle2-action-ready-off --summary
npm run compare -- win-go-on-swap-offer-no-liliana-far-side-off --summary
```
