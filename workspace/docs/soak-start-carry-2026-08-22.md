# `--start-carry` first sweeps (2026-08-22, main worker)

Tree: master `c89e3087` (this session's `--start-carry` option commit), render off. Command shape:
`node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy P --start-carry N --seeds
A:B --render-every 0`.

**Chunking note:** at this policy family's observed ~25-30 s/seed cost, a 20-seed chunk runs
~500-560 s -- already close to this tool's 600 s per-call ceiling, so a single foreground Bash
call launched all 8 chunks below in parallel (`&` + `wait`, 16 cores available) instead of chunking
serially: 3x20 for sweep (a), 3x20 for sweep (b), 2x20 for sweep (c), ~530-560 s wall-clock total
for the whole batch.

`--start-carry N` boots the FIRST chained round of the run at `factoryWinStreak N` instead of the
anchor's pinned battle-1 schedule (`createStartCarryState`, `tools/soak/randomRoundSoakDriver.ts`)
-- see this session's option commit for how the carry is injected. Every sweep below plays the
soak's ordinary in-session chaining (wins carry the streak forward another +7, losses reset to 0)
from that boot point onward, exactly like a real chain.

## Totals

| sweep | policy | `--start-carry` | seeds | OK | CRASH | HANG | deepest carry reached |
|---|---|---|---|---|---|---|---|
| (a) | winning | 28 | 0:60 | **60** | 0 | 0 | 28 (never advances past the boot carry) |
| (b) | winning | 42 | 0:60 | **57** | **3** | 0 | 49 (2 seeds reach carry 56 and crash generating that draft) |
| (c) | winning-swap | 35 | 0:40 | **40** | 0 | 0 | 35 (never advances past the boot carry) |
| **all** | | | **160** | **157** | **3** | **0** | |

Every OK seed's sub-outcome is `budget` (frame budget reached while still mid-round or mid-chain),
matching every prior `winning`/`winning-swap` sweep -- none hit `max-rounds` (unset) or a genuine
terminal round/milestone outcome.

## Depth distribution (aggregated per sweep)

| sweep | carry>=7 | carry>=14 | carry>=21 | carry>=28 | deepest carry | deepest depth |
|---|---|---|---|---|---|---|
| (a) `--start-carry 28` | 60/60 | 60/60 | 60/60 | 60/60 | 28 | 32 |
| (b) `--start-carry 42` | 60/60 | 60/60 | 60/60 | 60/60 | 49 | 55 |
| (c) `--start-carry 35` | 40/40 | 40/40 | 40/40 | 40/40 | 35 | 40 |

Reading: sweep (a) reproduces, at scale (n=60, not the handful of natural-chain seeds that ever
reached carry 28 before), the goal brief's premise that **no policy has ever won a round at carry
28** -- every one of the 60 seeds tops out at exactly `carry<=28`, never advancing to a fresh round
at carry 35. Sweep (b), booted seven carry-steps further at 42 (challengeNum 6, past Noland gold),
is a different story: **most seeds here DO win at least one further round** (carry 42 -> 49,
challengeNum 7 -- see the depth table, 60/60 reach carry>=28 trivially since they start there, but
`deepest carry anywhere: 49` shows real round wins happening), and 2 of those seeds go on to win a
*second* round from 49 -> 56 (challengeNum 8), which is exactly the depth `generateInitialFactoryRentals`
has never had table coverage for -- see ISSUES #118 below. Sweep (c) (winning-swap at carry 35,
challenge 6) never advances past its own boot carry either, consistent with (a)'s finding that the
mid-30s/high-20s carry band is where this soak's win-biased policies stop chaining further under a
1,000,000-frame budget -- not a crash, just budget exhaustion mid-round most of the time.

## Crash findings

**One NEW signature, filed as ISSUES #118** (0 HANGs across all 160 seeds).

### `challengeNum 8` initial-rental generation throw (ISSUES #118)

3/60 seeds in sweep (b) (**seeds 2, 32, 49** -- one per 20-seed chunk, `b1.log`/`b2.log`/`b3.log`):

```
seed    2  CRASH  b7 t6   76639f  1.5s  [engine/tick] Error: Level-50 initial rental generation supports source challenges 0..7, got 8  carry<=49 depth<=55
seed   32  CRASH  b7 t9   84568f  1.7s  [engine/tick] Error: Level-50 initial rental generation supports source challenges 0..7, got 8  carry<=49 depth<=55
seed   49  CRASH  b7 t9   84134f  1.7s  [engine/tick] Error: Level-50 initial rental generation supports source challenges 0..7, got 8  carry<=49 depth<=55
```

First error line (all 3, identical modulo seed/frame): `Error: Level-50 initial rental generation
supports source challenges 0..7, got 8`.

Deterministic single-seed repro (`--policy winning --start-carry 42 --seed 2 --render-every 0
--verbose`):
```
Error: Level-50 initial rental generation supports source challenges 0..7, got 8
    generateInitialFactoryRentals (src/engine/factoryRentalGeneration.ts:240)
    generateFactoryChallengeDraft (src/engine/factoryRoundChaining.ts:97)
    tick (src/engine/core.ts:859)
```

`lastActions` tail (seed 2; all 3 crash at the terminal record-menu seam, mid `--verbose` A-mash,
right as the round's win commits and `core.ts:859` tries to generate the NEXT round's draft):
```
f=76486 b7 t6 terminal: A
f=76492 b7 t6 terminal: A
f=76501 b7 t6 terminal: A
f=76520 b7 t6 terminal: A
f=76535 b7 t6 terminal: A
f=76546 b7 t6 terminal: A
f=76550 b7 t6 terminal: A
f=76564 b7 t6 terminal: A
f=76569 b7 t6 terminal: UP
f=76578 b7 t6 terminal: DOWN
f=76595 b7 t6 terminal: A
f=76607 b7 t6 terminal: B
f=76609 b7 t6 terminal: B
f=76627 b7 t6 terminal: A
f=76639 b7 t6 terminal: A
```

Root cause: `factoryRentalGeneration.ts:239` throws whenever `challengeNum =
Math.floor(factoryWinStreak / 7) > 7`, i.e. a draft generated at `factoryWinStreak >= 56`. A
`--start-carry 42` boot (challengeNum 6) plus two consecutive round wins reaches exactly that: 42 ->
49 (challengeNum 7, still tabled) -> 56 (challengeNum 8, not tabled) on the third round's draft
generation. This is real, reachable engine state -- not a driver artifact -- and per the existing
code comment at that throw site, the retail non-BUGFIX behavior at this depth is a further
out-of-bounds table read (`#else` branch), not a clean reject, so fixing this needs the actual
source behavior looked up first, not just a raised guard number. Filed as ISSUES #118 rather than
fixed here (main-lane engine changes are out of scope for this soak-only step).

Sweeps (a) and (c) found nothing: every seed in both stayed at or below its own boot carry for the
whole run (no round ever won from a 28 or 35 boot in this sample), so neither sweep's crash surface
differs from what a natural low-carry chain already covers.

## Eight chunk summaries (verbatim)

### (a) `--policy winning --start-carry 28`, seeds 0:20
```
=== soak summary: 20 seeds (policy winning) in 557.4s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 28
deepest battle-depth anywhere: 31

=== OK breakdown ===
  budget: 20
```

### (a) `--policy winning --start-carry 28`, seeds 20:40
```
=== soak summary: 20 seeds (policy winning) in 558.4s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 28
deepest battle-depth anywhere: 32

=== OK breakdown ===
  budget: 20
```

### (a) `--policy winning --start-carry 28`, seeds 40:60
```
=== soak summary: 20 seeds (policy winning) in 558.7s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 28
deepest battle-depth anywhere: 32

=== OK breakdown ===
  budget: 20
```

### (b) `--policy winning --start-carry 42`, seeds 0:20
```
=== soak summary: 20 seeds (policy winning) in 528.1s ===
OK 19  CRASH 1  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 49
deepest battle-depth anywhere: 55

=== OK breakdown ===
  budget: 19

[1/20] Error: Level-# initial rental generation supports source challenges #..#, got # @ generateInitialFactoryRentals (src/engine/factoryRentalGeneration.ts)
  seeds: 2
  first at: seed 2, battle 7, turn 6, frame 76639
```

### (b) `--policy winning --start-carry 42`, seeds 20:40
```
=== soak summary: 20 seeds (policy winning) in 537.3s ===
OK 19  CRASH 1  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 49
deepest battle-depth anywhere: 55

=== OK breakdown ===
  budget: 19

[1/20] Error: Level-# initial rental generation supports source challenges #..#, got # @ generateInitialFactoryRentals (src/engine/factoryRentalGeneration.ts)
  seeds: 32
  first at: seed 32, battle 7, turn 9, frame 84568
```

### (b) `--policy winning --start-carry 42`, seeds 40:60
```
=== soak summary: 20 seeds (policy winning) in 533.0s ===
OK 19  CRASH 1  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 49
deepest battle-depth anywhere: 55

=== OK breakdown ===
  budget: 19

[1/20] Error: Level-# initial rental generation supports source challenges #..#, got # @ generateInitialFactoryRentals (src/engine/factoryRentalGeneration.ts)
  seeds: 49
  first at: seed 49, battle 7, turn 9, frame 84134
```

### (c) `--policy winning-swap --start-carry 35`, seeds 0:20
```
=== soak summary: 20 seeds (policy winning-swap) in 543.6s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 35
deepest battle-depth anywhere: 40

=== OK breakdown ===
  budget: 20
```

### (c) `--policy winning-swap --start-carry 35`, seeds 20:40
```
=== soak summary: 20 seeds (policy winning-swap) in 544.8s ===
OK 20  CRASH 0  HANG 0

=== depth distribution ===
carry >= 7  (challengeNum >= 1): 20/20
carry >= 14 (challengeNum >= 2): 20/20
carry >= 21 (challengeNum >= 3): 20/20
carry >= 28 (challengeNum >= 4): 20/20
deepest carry anywhere: 35
deepest battle-depth anywhere: 40

=== OK breakdown ===
  budget: 20
```

## Next

ISSUES #118 needs the retail non-BUGFIX out-of-range table behavior looked up (`battle_tower.c`'s
`#else` path per `factoryRentalGeneration.ts:228-240`'s own comment) before it can be fixed --
raising the `> 7` guard alone would silently diverge from source. A follow-up `--start-carry 49`
sweep would reach that same challengeNum-8 boundary on its FIRST generated round (rather than
needing two round wins to get there), for faster/denser repro once someone picks the fix up.
`--start-carry 21`/`14`/`7` (challengeNum 3/2/1, the mid tiers between the anchor boot and this
session's 28/35/42) remain unswept.

## Post-#118 re-sweeps (2026-08-22 night → 2026-08-23, supervisor)

Tree: master `001b456c` (`#118` closed end to end — `5a367754` Rust, `e57bcc30` lockstep TS +
wasm, `2726aaa9` wire format; `#120` rentsCount fix `99be536d`). Same command shape as above,
run as single serial processes (~24 s/seed). The three #118 crash seeds from sweep (b) above
(carry 42: seeds 2, 32, 49) all go clean; challengeNum-8 drafts are now generated for real
(`deepest carry 56` in every sweep below; the former throw sat exactly there).

| sweep | policy | `--start-carry` | seeds | OK | CRASH | HANG | deepest carry | deepest depth |
|---|---|---|---|---|---|---|---|---|
| (b') | winning | 42 | 0:60 | **60** | 0 | 0 | 56 | 57 |
| (d) | winning | 49 | 0:60 | **60** | 0 | 0 | 56 | 62 |
| (d') | winning | 49 | 60:180 | **120** | 0 | 0 | 56 | 62 |
| (e) | winning-swap | 49 | 0:60 | **60** | 0 | 0 | 56 | 57 |
| **all** | | | **300** | **300** | **0** | **0** | | |

Every OK sub-outcome is `budget`. Sweep (e) is the first time the swap screen ran with
challenge-8 rentals carrying a genuine random six-IV spread (`FactoryCorpusPartyInstance.ivs`).

Reading: with the rental path fixed, nothing at challengeNum 7-8 crashes in 300 seeds. Note the
Frontier Brain's argument-8 branch (`challengeNum + 2 == 8`) is NOT exercised by any of these —
Brain-eligible banked streaks are 20/41/62/… (`sFrontierBrainStreakAppearances[FACTORY] =
{21, 42, 21, 1}` + the `+1` modifier, `frontier_util.c:91,1662`), i.e. challengeNum 2/5/8, never 6;
that call site is retail-correct code that natural play cannot reach (audit, 2026-08-23).
