# Soak depth re-measurement — 2026-08-20 (post-ISSUES #99 fix)

Re-measures play depth for all three soak policies after the ISSUES #99
fix (`ed783b57`, pinned `c13b8aea`): the soak driver's `onPostwin` used to
answer the dialogue-page-4 swap offer through the frozen continuation-menu
branch instead of its own branch, so `vanilla` accepted **every** swap
despite its own "declined" doc comment, and `full`/`winning` accepted
~85% instead of a genuine 50/50 roll. Every post-battle-1 trajectory of
every policy changes under the fix; the 2026-08-19 depth numbers
(`docs/soak-depth-measure-2026-08-19.md`) were measured with the bug live
and are superseded by this doc for the swap-decision mechanic. All raw
per-seed lines are in `docs/soak-depth-remeasure-2026-08-20.log`, in the
order run, exactly as the CLI printed them.

## Commands run

Seeds 0:60, `--render-every 0`, run as three parallel foreground processes
(one shell job per policy, `wait`ed on before use):

```
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:60 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy full    --seeds 0:60 --render-every 0
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning --seeds 0:60 --render-every 0
```

Standing gates (below) reran separately with DEFAULT rendering.

## `vanilla` policy, seeds 0:60

- **OK/CRASH/HANG:** 60 OK, 0 CRASH, 0 HANG.
- **carry >= 7  (challengeNum >= 1):** 21/60 (35.0%)
- **carry >= 14 (challengeNum >= 2):** 0/60 (0%)
- **carry >= 21 (challengeNum >= 3):** 0/60 (0%)
- **Deepest carry anywhere:** 7 — the 21 seeds counted above.
- **Deepest battle-depth anywhere:** 10 — seeds 4, 10, 18, 32, 36, 43
  (carry 7, i.e. battle 4 of the second round: `7 + (4-1) = 10`).

`vanilla` now genuinely never reaches carry 14: pre-fix it hit carry>=14
on 3/60 seeds (deepest carry 14, deepest depth 20 at seed 24) only because
it was accidentally accepting every swap offer — sometimes trading into a
stronger rental. Declining every swap (the policy's actual documented
intent) is honestly shallower.

## `full` policy, seeds 0:60

- **OK/CRASH/HANG:** 60 OK, 0 CRASH, 0 HANG.
- **carry >= 7  (challengeNum >= 1):** 1/60 (1.7%) — seed 39.
- **carry >= 14 (challengeNum >= 2):** 0/60 (0%)
- **carry >= 21 (challengeNum >= 3):** 0/60 (0%)
- **Deepest carry anywhere:** 7 — seed 39.
- **Deepest battle-depth anywhere:** 7 — seed 39 (carry 7, battle 1 of the
  second round: `7 + (1-1) = 7`).

`full` moved off its pre-fix 0/60 floor (one seed now carries a win), a
small but genuine change from the swap decision no longer being a
~85%-biased accept.

## `winning` policy, seeds 0:60

- **OK/CRASH/HANG:** 59 OK, **1 CRASH**, 0 HANG. The crash is new coverage
  exposed by deeper/different post-fix trajectories, not a soak-driver bug
  — filed as **ISSUES #100** (see below); the STOP RULE does not apply
  here (single new engine defect, not systemic driver breakage) and this
  count is reported honestly as 59/60, not silently rounded to 60/60.
- **carry >= 7  (challengeNum >= 1):** 20/60 (33.3%)
- **carry >= 14 (challengeNum >= 2):** 4/60 (6.7%) — seeds 7, 20, 30, 32.
- **carry >= 21 (challengeNum >= 3):** 0/60 (0%)
- **Deepest carry anywhere:** 14 — the 4 seeds above.
- **Deepest battle-depth anywhere:** 14 — seeds 7, 20, 30, 32 (carry 14,
  battle 1 of the third round: `14 + (1-1) = 14`).

### New crash: seed 15, ISSUES #100

`seed 15  CRASH  b5 t5  120877f  [engine/tick] Error: battleStringResolver:
STRINGID_NATUREPOWERTURNEDINTO references placeholder {B_CURRENT_MOVE}
with no resolver supplied`. Reproduce: `node --experimental-strip-types
tools/soak/randomRoundSoak.ts --seed 15 --policy winning --verbose
--render-every 0`. An `src/engine/**` throw (origin `engine`), not a driver
bug — cataloged and filed as ISSUES #100, not fixed in this step (out of
scope per the brief; `src/` is off-limits here).

## Before/after table (carry >= 7 / >= 14 / >= 21 of 60 seeds each)

| policy    | when   | OK/60 | carry>=7        | carry>=14      | carry>=21 | deepest carry | deepest battle-depth |
|-----------|--------|-------|-----------------|----------------|-----------|----------------|-----------------------|
| `vanilla` | before | 60/60 | 16/60 (26.7%)   | 3/60 (5.0%)    | 0/60 (0%) | 14             | 20 (seed 24)          |
| `vanilla` | after  | 60/60 | 21/60 (35.0%)   | 0/60 (0%)      | 0/60 (0%) | 7              | 10 (seeds 4,10,18,32,36,43) |
| `full`    | before | 60/60 | 0/60 (0%)       | 0/60 (0%)      | 0/60 (0%) | 0              | 6 (seed 4)            |
| `full`    | after  | 60/60 | 1/60 (1.7%)     | 0/60 (0%)      | 0/60 (0%) | 7              | 7 (seed 39)           |
| `winning` | before | 60/60 | 26/60 (43.3%)   | 2/60 (3.3%)    | 0/60 (0%) | 14             | 14 (seed 4)           |
| `winning` | after  | 59/60 | 20/60 (33.3%)   | 4/60 (6.7%)    | 0/60 (0%) | 14             | 14 (seeds 7,20,30,32) |

"before" numbers: `vanilla`/`full` are `docs/soak-depth-measure-2026-08-19.md`'s
own seeds-0:60 tables verbatim. `winning`'s before row is a fresh recount
over `docs/soak-depth-measure-2026-08-19.log`'s first 60 `winning` seed
lines (seeds 0-59), not the doc's own 0:180 headline (which the brief
asked to slice down for a fair 60-seed comparison) — 0 CRASH, 0 HANG in
that 60-seed slice.

Swap-offer YES/NO tallies per policy were **not** collected this session
(would need a `--verbose` rerun or a separate counting pass; skipped under
the 55-minute time cap — the qualitative fix is already confirmed by
`tests/randomRoundSoak.test.ts`'s ISSUES #99 pins, which do assert both
YES and NO occur under `winning`).

## Standing soak gates (post-fix, default rendering)

- `node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy vanilla --seeds 0:20`
  → **20 OK, 0 CRASH, 0 HANG** (20/20).
- `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seeds 0:20` (policy `full`,
  default rendering) → **20 OK, 0 CRASH, 0 HANG** (20/20) — run specifically to justify citing
  the render-every-0 `full` 0:60 measurement above (60/60 OK) for the full 0:60 gate, per the
  brief's citation rule (a rendering run of at least seeds 0:20 green, plus the render-every-0
  0:60 run). Combined: **`full` 0:60 gate = 60/60 OK** (citing the measurement run + this
  rendering spot-check), **`vanilla` 0:20 gate = 20/20 OK** (measured directly with default
  rendering).
