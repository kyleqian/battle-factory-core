# rps278 -- re-pin `tests/randomRoundSoak.test.ts` after lbr-b

Cause (bisected by the supervisor's verification worker): the file is 64/64 at `9f8c9aa7d^` and had 3 failures from `9f8c9aa7d` (lbr-b,
`docs/lbrb-attendant-conversation.md`). The attendant conversation takes frames and the Lobby vblank RNG keeps running, so after a loss the next
draft is dealt from a later cursor and every exploring run's trajectory after its first Lobby visit moved. No `src/` change: each pin keeps its
assertion and moves only a seed or a frame window. Method follows `docs/cln242-suite-speed.md` (seed re-scan). Result: 64 / 64.

| Pin | Old | New | Why |
|---|---|---|---|
| ISSUES #89 Baton Pass halt | `runSeed(11, 80,000 frames)` | `runSeed(3, 80,000 frames)` | seed 11 no longer commits Baton Pass |
| max carried win streak / max battle depth survive a later loss | `maxFrames: 2_000` | `maxFrames: 6_000` | the fresh round 3 is entered between 2,500 and 3,000 frames now |
| ISSUES #99 vanilla swap offer | `runSeed(1, 32,000 frames)` | `runSeed(0, 32,000 frames)` | seed 1's first swap offer is at frame 37,226 |

## ISSUES #89 (seed 32 test name kept; the pinned seed has moved since frf250a)

Guards: a mid-turn Baton Pass `openpartyscreen` halt resumes through the forced party selector (no `openpartyscreen` / `machine-barrier` error,
a Baton Pass commit followed by a forced-selector halt on a still-living outgoing slot, outcome OK, at least one Lobby new challenge).

Scan: full policy, seeds 0..39, 80,000 frames, default options, same joint-event observer as the test (scratch, not committed). Hits: **3, 5, 13,
14, 29, 38**. Seed 3 is the lowest: Baton Pass commits 3, first commit frame 48,916, halt frame 48,956, two Lobby new challenges. Others for
reference: 5 (46,821 / 47,094), 13 (69,999 / 70,223), 14 (39,989 / 40,028), 29 (76,735 / 77,017), 38 (47,705 / 47,744). Seeds 9 and 12 commit
Baton Pass but never halt on a living outgoing slot in the window, so they are not hits. Old pin seed 11: zero commits.

## Max carried win streak / max battle depth

Guards: `maxCarriedWinStreak` / `maxBattleDepth` keep the streak-7 depth after a later loss, where the old `diagnostics.carriedWinStreak` snapshot has
already reset to 0 (so the three assertions are `carriedWinStreak === 0`, max streak >= 7, max depth >= 7).

Probe of the exact state the test builds (vanilla, seed 999), by frame budget: `carriedWinStreak` is `null` (still in the Lobby, no orchestrator)
at 2,000 and 2,500 frames; `0` (fresh round 3, `presentingBattleStart`) at 3,000 and `battleActive` at 3,500; it stays `0` at 4,000, 6,000, 8,000,
10,000, 12,000, 16,000 and 20,000. New budget: **6,000**, in the middle of the stable range.

## ISSUES #99 vanilla swap offer

Guards: vanilla answers every swap offer NO and never enters the swap screen (the `onPostwin` continuation branch used to answer the swap offer).

Scan: vanilla seeds 0..11, 80,000 frames. All 12 reach a swap offer, every offer is "NO", no swap screen. First-offer frames: 0: 16,867; 1: 37,226;
2: 38,334; 3: 36,681; 4: 20,724; 5: 18,356; 6: 23,881; 7: 39,275; 8: 41,477; 9: 22,423; 10: 19,522; 11: 17,823. Seed 0 is the lowest seed and
is inside the unchanged 32,000-frame window with a wide margin, so the window is kept and the seed moves (1 -> 0).

## Mutation checks (local, reverted; the tree was clean afterwards)

| Pin | Mutation | Result |
|---|---|---|
| #89 | `completedResolutionUpdate` publishes `battleForcedPartySelect: null` for a forced request (`factoryRoundBattleOrchestrator.ts`) | fails: `expected null not to be null` |
| depth | soak driver's `maxCarriedWinStreak` update made unconditional (`if (true)`), i.e. the max forgets like the old snapshot | fails: `expected 0 to be greater than or equal to 7` |
| #99 | vanilla swap-offer accept forced to YES (`randomRoundSoakDriver.ts`) | fails: `expected false to be true` (every offer must be NO) |

## Other soak files

See the final report of the step for the run results (`randomRoundSoakScene`, `Parallel`, `Coverage*`, `CombinedDraft`, `OracleStrength`,
`soakLobbyNewChallenge`, plus `randomRoundSoakSceneRenderCrash` and `contain209SoakContained`).
