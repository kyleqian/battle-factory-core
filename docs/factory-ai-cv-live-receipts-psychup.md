# Factory AI_CV_PsychUp live receipt

This is the Main-lane Battle Scene OFF hardware receipt for the production
Factory AI Psych Up handler. It is a staged mechanic-lab proof, not the
retired canonical Battle 2 replay.

## Source gate

`reference/pokeemerald/data/battle_ai_scripts.s:2086-2112` sends a move to
`AI_CV_PsychUp2` when the target's ATK, DEF, Sp. Atk, Sp. Def, or Evasion
stage is greater than 8. A default-stage AI user then reaches
`AI_CV_PsychUp3` and scores +1 without a handler draw. If no target stat is
raised, the script takes `AI_CV_PsychUp_ScoreDown2` for -2, also without a
handler draw.

The fixtures use only `mechanicLab.overrides.parties`, with three party
records on each side. The legal source learnsets are visible at
`reference/pokeemerald/src/data/pokemon/level_up_learnsets.h:722-733`
(Golduck: Scratch/Disable and Psych Up at level 31),
`:1791-1793` (level-5 Magikarp Splash), and
`:2905-2917` (Scizor Focus Energy, Slash, and Swords Dance).

## Twin staging

Both twins use the same Scizor/Magikarp/Golduck matchup and the same real
relay KO. The reach lead uses `[Swords Dance, Swords Dance, Slash, Slash]`,
so the captured target ATK stage is 10 before Golduck's decision. The control
lead uses `[Focus Energy, Focus Energy, Slash, Slash]`; Focus Energy is a real
legal move but never raises a target stat stage, leaving all target stages at
6. Magikarp is level 5 with Splash x4. Golduck enters at default stages with
`[Psych Up, Scratch, Scratch, Scratch]`; only slot 0 is the handler candidate,
and the other slots are source-legal score controls.

The verifier captures the carrier switch/decision window and the first
carrier PP decrement in two dense windows. Each seed/role scenario is run
twice and the complete capture JSON must be identical on rerun.

## OFF oracle ledger

Every row matched the ROM's PP-selected slot, engine CV vector, final score
vector, draw kinds/count, and endpoint RNG. The first transition is the
explicit `BattleTurnPassed` owner draw; the adapter is seeded before it and
called with `turnStartRandomNumber: { owner: "decision" }`.

| seed | twin | decision pre | first PP | ROM/engine slot | CV deltas | final scores | RNG start → end |
| ---: | :--- | ---: | ---: | ---: | :--- | :--- | :--- |
| 1 | control | 1386 | 1471 | 2 / 2 | `[-2,0,0,0]` | `[88,100,100,100]` | `3070328874 → 669553864` |
| 1 | reach | 1536 | 1670 | 0 / 0 | `[1,0,0,0]` | `[101,100,100,100]` | `3070328874 → 669553864` |
| 2 | control | 1336 | 1471 | 1 / 1 | `[-2,0,0,0]` | `[88,100,99,100]` | `3735443684 → 1254004658` |
| 2 | reach | 1536 | 1670 | 0 / 0 | `[1,0,0,0]` | `[101,100,99,100]` | `3735443684 → 1254004658` |

All four rows consumed exactly six draws:

```text
turn-start-random-number,
setup-simulated-rng × 4,
best-move-tie
```

There were zero `psych-up` handler draws. Seed 2's inert Scratch slot has a
legitimate -1 TryToFaint contribution in the ordinary scored pass; it is
preserved in the receipt rather than hidden in a flattened tie vector.

## Reproduction

```sh
node --experimental-strip-types tools/probe/verify-factory-ai-psychup-live.ts
npx vitest run --no-watch --pool=forks --testTimeout=20000 tests/factoryAiPsychUpLiveReceipt.test.ts
```

The Tier-1 receipt hard-codes the four observed RNG cursors, selected slots,
CV vectors, score vectors, six draw kinds, and endpoints. No production AI
handler or presentation code changed for this increment.
