# Soak depth measurement — 2026-08-19 (Milestone M-A steps 2+3)

Re-measures play depth over previously-swept, known-green seed ranges using
the real max-depth instrument landed in M-A step 1 (`f6f3cc57` driver +
`2b966ab9` CLI, PROGRESS 1354). Measurement only — no `src/`, `tools/soak/`,
or `tests/` changes in this session.

Depth convention (from PROGRESS 1354): during battle N of a carry-C round,
`maxBattleDepth = C+(N-1)`, a 0-based ladder position. Carry only advances
+7 per completed round and resets to 0 on a loss-side re-chain. The CLI's
own "depth distribution" block prints the exact challengeNum mapping used
below (`challengeNum = floor(factoryWinStreak / 7)`,
`factoryRentalGeneration.ts`/`factoryTrainerSchedule.ts`).

All raw per-seed lines for every chunk run in this session are appended to
`docs/soak-depth-measure-2026-08-19.log`, in seed order, exactly as the CLI
printed them (including each chunk's own `=== soak summary ===` and
`=== depth distribution ===` block for that chunk). The distributions below
are aggregated across the full policy range, not copied from any prior
sweep doc.

## Commands run

Each chunk was one foreground `node --experimental-strip-types
tools/soak/randomRoundSoak.ts --policy P --seeds A:B` call (equivalent to
`npm run soak -- --policy P --seeds A:B`), redirected to its own temp log,
then concatenated in seed order into the committed log. Chunks within a
policy have no shared state (the driver is a pure in-process simulation,
no oracle/network calls), so independent seed ranges were run as parallel
foreground calls to fit the session's wall-clock cap; every call still ran
to completion before its result was used — none were backgrounded.

```
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 0:20
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 20:40
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 40:60
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 60:80
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 80:100
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 100:120
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 120:140
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 140:160
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 160:180
```

## `winning` policy, seeds 0:180 (REQUIRED minimum)

- **Seeds run:** 180 (0..179), in nine 20-seed chunks.
- **OK/CRASH/HANG:** 180 OK, 0 CRASH, 0 HANG (every chunk summary: `OK 20
  CRASH 0 HANG 0`) — confirms known-green ground; STOP RULE not triggered.
- **carry >= 7  (challengeNum >= 1):** 64/180
- **carry >= 14 (challengeNum >= 2):** 10/180
- **carry >= 21 (challengeNum >= 3):** 0/180
- **Deepest carry anywhere:** 14 — seeds 4, 5, 61, 88, 108, 126, 135, 138,
  144, 171 (the same 10 seeds counted in `carry >= 14` above; none reached
  21).
- **Deepest battle-depth anywhere:** 16 — seed 61 (carry 14, i.e. battle 3
  of the third round: `14 + (3-1) = 16`).

## `vanilla` policy, seeds 0:60 (contrast)

```
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:20
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 20:40
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 40:60
```

- **Seeds run:** 60 (0..59), in three 20-seed chunks.
- **OK/CRASH/HANG:** 60 OK, 0 CRASH, 0 HANG (every chunk summary: `OK 20
  CRASH 0 HANG 0`) — known-green ground confirmed; STOP RULE not
  triggered.
- **carry >= 7  (challengeNum >= 1):** 16/60
- **carry >= 14 (challengeNum >= 2):** 3/60
- **carry >= 21 (challengeNum >= 3):** 0/60
- **Deepest carry anywhere:** 14 — seeds 24, 27, 28.
- **Deepest battle-depth anywhere:** 20 — seed 24 (carry 14, i.e. battle 7
  of the third round: `14 + (7-1) = 20`).

## `full` policy, seeds 0:60 (contrast)

```
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seeds 0:20
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seeds 20:40
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full --seeds 40:60
```

- **Seeds run:** 60 (0..59), in three 20-seed chunks.
- **OK/CRASH/HANG:** 60 OK, 0 CRASH, 0 HANG (every chunk summary: `OK 20
  CRASH 0  HANG 0`) — known-green ground confirmed; STOP RULE not
  triggered.
- **carry >= 7  (challengeNum >= 1):** 0/60
- **carry >= 14 (challengeNum >= 2):** 0/60
- **carry >= 21 (challengeNum >= 3):** 0/60
- **Deepest carry anywhere:** 0 — no seed in this range ever completed a
  full 7-battle round under `full` policy's arbitrary-but-legal play.
- **Deepest battle-depth anywhere:** 6 — seed 4. Its log line reads
  `seed 4 OK b2 t27 ... roundLost carry<=0 depth<=6`: `b2` is the battle
  index of the run's *final* state (the round it ultimately lost on), not
  the max — the tracked `depth<=6` shows it reached battle 7 of an
  *earlier* round attempt (`0 + (7-1) = 6`) before that round was lost and
  the run re-chained down to a fresh carry-0 round, which is where it
  ended. Runner-up: seeds 26 and 39 at depth 5.

## M-A step-3 headline

Does ordinary play reach challengeNum >= 2 (carry >= 14 — meaning the seed
*entered* the challengeNum-2 (third) challenge; the CLI's own mapping is
`carry >= 7 (challengeNum >= 1)`, `carry >= 14 (challengeNum >= 2)`,
`carry >= 21 (challengeNum >= 3)`, i.e. `challengeNum = floor(carry / 7)`
and crossing a threshold means the run has *entered*, not necessarily
finished, that challenge)?

| policy    | seeds | carry>=7 (challengeNum>=1) | carry>=14 (challengeNum>=2) | carry>=21 (challengeNum>=3) | deepest carry | deepest battle-depth |
|-----------|-------|-----------------------------|-------------------------------|-------------------------------|----------------|-------------------------|
| `winning` | 180   | 64/180 (35.6%)              | 10/180 (5.6%)                 | 0/180 (0%)                    | 14             | 16 (seed 61)            |
| `vanilla` | 60    | 16/60 (26.7%)                | 3/60 (5.0%)                   | 0/60 (0%)                     | 14             | 20 (seed 24)            |
| `full`    | 60    | 0/60 (0%)                    | 0/60 (0%)                     | 0/60 (0%)                     | 0              | 6 (seed 4)              |

Across all 300 seeds run this session, across all three policies, **not a
single seed ever reached carry >= 21 (challengeNum >= 3)**, and the
deepest carry observed anywhere was 14 (challengeNum 2, i.e. entry into
the third challenge), reached by `winning` and `vanilla` alike. `winning`
and `vanilla` reach challengeNum >= 1 at broadly similar rates (35.6% vs
26.7%) and challengeNum >= 2 at nearly identical rates (5.6% vs 5.0%).
`full` policy — arbitrary-but-legal play with no bias toward winning
moves — never completed a single 7-battle round in 60 seeds.
