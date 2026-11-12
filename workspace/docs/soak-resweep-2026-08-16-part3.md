# Post-#93 soak resweep — part 3 (2026-08-16)

Two goals from the supervisor step brief:

1. Re-sweep `--policy winning --seeds 0:60` now that #93 (forced-switch
   handoff preempting a fainted battler's trailing `Cmd_moveend` commands,
   `3fdd610c`) is fixed — the part-1/part-2 winning sweeps
   (`docs/soak-winning-sweep-2026-08-16.md`,
   `docs/soak-winning-sweep-2026-08-16-part2.md`) both predate the fix, and
   #93 legitimately changes presentation-frame timing (and, because
   `winning`/`full` read presentation state for menu/target/switch
   decisions, occasionally which moves a driven battle takes) for any
   battle that hits a forced switch with trailing `Cmd_moveend` commands.
   So the old winning 0:60 baseline (59/60 OK, 0 CRASH, 1 HANG) is not
   valid evidence about the current tree.
2. Sweep `--policy full --seeds 60:120` — full policy has only ever been
   swept 0:60 (the standing gate); 60:120 is genuinely new coverage.

Both run in 10-seed chunks (`npm run soak -- --policy <p> --seeds A:B`) to
stay under this session's per-command time cap; results are byte-identical
to what a single wide-range invocation would produce (the driver is seeded
per-seed and stateless across seeds). No `--max-frames` flag was passed —
this session runs entirely on the new per-policy defaults landed in part 2
(`winning` 1,000,000; `full`/`vanilla` 600,000), so a clean run here is
also incidental proof those defaults hold up over a fresh 120-seed sample.

## Range: `winning` 0:60 (post-#93) — 58/60 OK, 1 CRASH, 0 HANG

```
seed    0  OK     b5 t13  271395f  41.1s  roundLost
seed    1  OK     b7 t15  433068f  63.6s  roundComplete
seed    2  OK     b7 t20  246327f  35.4s  roundComplete
seed    3  OK     b7 t20  150949f  21.2s  roundLost
seed    4  OK     b6 t16  242742f  34.3s  roundLost
seed    5  OK     b7 t13  348682f  48.1s  roundComplete
seed    6  OK     b7 t9   124252f  16.2s  roundComplete
seed    7  OK     b7 t11  282849f  38.5s  roundComplete
seed    8  OK     b2 t21   28885f   3.9s  roundLost
seed    9  OK     b1 t10  100205f  14.2s  roundLost
=== chunk 0:10: OK 10  CRASH 0  HANG 0 ===

seed   10  OK     b5 t20  102111f  14.7s  roundLost
seed   11  OK     b7 t13  169172f  24.3s  roundLost
seed   12  OK     b1 t19   18396f   2.2s  roundLost
seed   13  OK     b4 t11  118361f  15.8s  roundLost
seed   14  OK     b2 t17  101575f  13.6s  roundLost
seed   15  OK     b7 t12   84043f  11.2s  roundComplete
seed   16  CRASH  b1 t11  401474f  57.0s  [engine/tick] FactoryRoundOrchestratorError: Slice 3 resolution completed without a player command boundary
seed   17  OK     b1 t21   19543f   2.4s  roundLost
seed   18  OK     b1 t22   18929f   2.5s  roundLost
seed   19  OK     b3 t14  273713f  39.5s  roundLost
=== chunk 10:20: OK 9  CRASH 1  HANG 0 ===

seed   20  OK     b7 t6   150021f  20.9s  roundComplete
seed   21  OK     b1 t23  280699f  39.3s  roundLost
seed   22  OK     b6 t15   93942f  13.2s  roundLost
seed   23  OK     b2 t14  255445f  36.1s  roundLost
seed   24  OK     b3 t22  349719f  50.8s  roundLost
seed   25  OK     b4 t10   40639f   5.5s  roundLost
seed   26  OK     b7 t25  293945f  41.2s  roundComplete
seed   27  OK     b7 t33   81648f  11.1s  roundComplete
seed   28  OK     b3 t23   37946f   5.3s  roundLost
seed   29  OK     b2 t13   28101f   3.8s  roundLost
=== chunk 20:30: OK 10  CRASH 0  HANG 0 ===

seed   30  OK     b7 t17  102712f  14.9s  roundComplete
seed   31  OK     b6 t32  253481f  36.3s  roundLost
seed   32  OK     b7 t16  149362f  21.3s  roundComplete
seed   33  OK     b3 t20  187678f  26.8s  roundLost
seed   34  OK     b2 t16  158369f  22.3s  roundLost
seed   35  OK     b1 t29   65262f   9.2s  roundLost
seed   36  OK     b1 t27   26056f   3.5s  roundLost
seed   37  OK     b2 t19   46132f   6.2s  roundLost
seed   38  OK     b3 t15  151807f  21.3s  roundLost
seed   39  OK     b7 t26   89714f  13.3s  roundComplete
=== chunk 30:40: OK 10  CRASH 0  HANG 0 ===

seed   40  OK     b5 t34  341504f  49.3s  roundLost
seed   41  OK     b7 t28  198444f  28.7s  roundComplete
seed   42  OK     b7 t14   82158f  10.9s  roundComplete
seed   43  OK     b5 t18   89226f  12.5s  roundLost
seed   44  OK     b1 t38  117855f  17.1s  roundLost
seed   45  OK     b7 t17   94625f  13.5s  roundComplete
seed   46  OK     b3 t24   44436f   6.1s  roundLost
seed   47  OK     b2 t9    23475f   2.9s  roundLost
seed   48  OK     b1 t20  133964f  19.2s  roundLost
seed   49  OK     b6 t23   70927f  10.1s  roundLost
=== chunk 40:50: OK 10  CRASH 0  HANG 0 ===

seed   50  OK     b6 t20  420942f  61.6s  roundLost
seed   51  OK     b5 t26  233286f  32.5s  roundLost
seed   52  OK     b7 t11  160498f  22.6s  roundLost
seed   53  OK     b1 t26   20808f   2.6s  roundLost
seed   54  OK     b4 t31  126731f  17.7s  roundLost
seed   55  OK     b2 t24   93244f  12.4s  roundLost
seed   56  OK     b7 t7   246546f  34.0s  roundComplete
seed   57  OK     b7 t16   94898f  13.4s  roundComplete
seed   58  OK     b3 t21  201490f  28.5s  roundLost
seed   59  OK     b2 t19  115119f  16.5s  roundLost
=== chunk 50:60: OK 10  CRASH 0  HANG 0 ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 42 |
| OK — `roundComplete` (full 7-win streak) | 17 (seeds 1, 2, 5, 6, 7, 15, 20, 26, 27, 30, 32, 39, 41, 42, 45, 56, 57) |
| HANG | 0 |
| CRASH | 1 (seed 16) |

Wall clock: ~1313s (~21.9 min) across the six 10-seed chunks. **The part-1
seed-49 HANG is gone**, as expected — it resolves cleanly (`b6 t23 70927f
roundLost`) under the new `winning` default of 1,000,000 frames (part 2's
fix), with no explicit `--max-frames` flag needed.

### Outcome-shift vs. part 1's pre-#93 winning 0:60 table

Part 1 gives, for every seed, enough to reconstruct its full per-seed
terminal category: the `roundComplete` list `{3, 15, 30, 31, 32, 33, 38,
50, 57, 58}`, the HANG seed `{49}`, and every other seed of the 60
implicitly `roundLost` (49 + 10 + 1 = 60 checks out against the part-1
table). Comparing that reconstruction against this session's per-seed
results:

| seed | pre-#93 | post-#93 | |
| --- | --- | --- | --- |
| 1, 2, 5, 6, 7, 20, 26, 27, 39, 41, 42, 45, 56 | roundLost | roundComplete | 13 seeds newly reach the 7-win streak |
| 3, 31, 33, 38, 50, 58 | roundComplete | roundLost | 6 seeds no longer reach it |
| 16 | roundLost | **CRASH** | 1 seed newly throws (new finding, triaged below) |
| 49 | HANG | roundLost | 1 seed resolves now that #92's budget fix applies (expected, already proven in part 2) |
| 15, 30, 32, 57 | roundComplete | roundComplete | 4 seeds unchanged, still reach the streak |
| all other 35 seeds | roundLost | roundLost | unchanged |

**21 of 60 seeds (35%) changed terminal category.** This is a large shift,
and per the step brief that is the **expected, fine** outcome here: #93
changed presentation-frame timing on any battle that hits a forced switch
with trailing `Cmd_moveend` commands, and `winning`'s menu/target/switch
choices read that same presentation state, so a materially different frame
trace downstream of the first such forced switch can flip which move
`winning` picks, which can cascade into a completely different rest-of-round
outcome (win vs. loss) many turns later. 19 of the 21 changes are ordinary
`roundComplete`↔`roundLost` flips — no crash, no hang, just a different
but equally legitimate terminal state. The one seed that is *not* a benign
flip (seed 16, a new CRASH) is the one thing here that needed triage, not
the shift itself; see below. (Frame-count-level comparison for the 39
same-category seeds isn't possible — part 1's doc only recorded aggregate
counts and the `roundComplete` seed list, not a full per-seed frame table
— but nothing in that 39-seed set surfaced any error, so it isn't a
concern either way.)

### Triage — signature: `FactoryRoundOrchestratorError: Slice 3 resolution completed without a player command boundary` (seed 16, ALSO seed 69 under `full`, see below — one signature, two policies)

**New signature.** Not in `docs/soak-crash-catalog.md`, not seen in either
part-1 or part-2 winning sweep (0:120 pre-#93, clean of this signature),
and does not currently have an ISSUES entry. Genuine engine bug, reported
per this step's policy (`src/**` bugs: report, do not fix).

```sh
npm run soak -- --policy winning --seed 16 --verbose
# seed   16  CRASH  b1 t11  401474f  58.5s  [engine/tick] FactoryRoundOrchestratorError: Slice 3 resolution completed without a player command boundary
#     fail (src/engine/factoryRoundBattleOrchestrator.ts:466)
#     settledCommandForResolutionHandoff (src/engine/factoryRoundBattleOrchestrator.ts:1830)
#     advanceFactoryRoundBattleResolution (src/engine/factoryRoundBattleOrchestrator.ts:2278)
```

Deterministic (reproduces identically on rerun). The throw site
(`settledCommandForResolutionHandoff`, `src/engine/
factoryRoundBattleOrchestrator.ts:1818-1831`) expects that once Slice 3's
battle resolution has fully drained, `commandPresentationForBoundary` finds
the underlying kernel `battle.boundary` sitting on a `decision-required`
boundary for a player `"command"` request (i.e. the ordinary "your turn,
pick FIGHT/BAG/PKMN/RUN" boundary) so it can build the next
`BattleCommandPresentationState`. At seed 16 battle 1 turn 11 that
assumption fails — the kernel boundary is something else (a different
boundary kind, side, or request type) by the time resolution finishes
draining, so `commandPresentationForBoundary` returns `null` and the
handoff throws instead of silently desyncing. Given the trace lands right
after a run of ordinary `resolution advance` steps with no unusual driver
input, this smells adjacent to the same family #93 just fixed (forced
switch handoff timing vs. trailing resolution commands) — plausibly a
sibling ordering case #93's fix didn't cover, though that's a hypothesis
for whoever picks this up, not a conclusion reached here.

**Not policy-specific**: it also reproduces under `full` (seed 69, below),
just at a different seed. `vanilla`/`winning`/`full` at seed 16 itself
diverge:

```sh
npm run soak -- --policy full --seed 16
# seed   16  OK     b2 t41   51252f   7.5s  roundLost
npm run soak -- --policy vanilla --seed 16
# seed   16  OK     b7 t19   93208f  13.7s  roundComplete
```
(`full`/`vanilla` don't crash at seed 16 — same caveat as part 2's seed-109
writeup: each policy's distinct choices route the same seed's RNG stream
through a different resolution sequence, so a policy not crashing at a
given seed isn't evidence the bug is policy-specific, only that that
policy's choices didn't route through the offending boundary state at that
seed.)

**Suspected owner:** `src/engine/factoryRoundBattleOrchestrator.ts`
(`settledCommandForResolutionHandoff` / `commandPresentationForBoundary`
resolution-to-command-boundary handoff, likely interacting with the #93
forced-switch-handoff fix's changed presentation/resolution sequencing —
unconfirmed, needs a step with `src/**` in scope to trace the actual
boundary kind reached).

**Minimal repro:**
```sh
npm run soak -- --policy winning --seed 16 --verbose
```
Not fixed — out of scope (`src/**`, "engine bugs: report, do not fix").

## Range: `full` 60:120 (first sweep of this range) — 58/60 OK, 2 CRASH, 0 HANG

No prior baseline exists for this range (full has only ever been swept
0:60), so there's no outcome-shift comparison to make here — this is
purely new coverage.

```
seed   60  OK     b1 t47    38038f   5.7s  roundLost
seed   61  OK     b1 t66   177307f  30.0s  roundLost
seed   62  OK     b2 t36    50802f  10.0s  roundLost
seed   63  OK     b2 t43   181395f  31.9s  roundLost
seed   64  OK     b1 t126  232495f  34.4s  roundLost
seed   65  OK     b4 t6    215621f  30.4s  roundLost
seed   66  OK     b1 t33    30212f   3.9s  roundLost
seed   67  OK     b2 t24    40358f   5.3s  roundLost
seed   68  OK     b1 t65    75999f  10.5s  roundLost
seed   69  CRASH  b6 t21   245688f  35.1s  [engine/tick] FactoryRoundOrchestratorError: Slice 3 resolution completed without a player command boundary
=== chunk 60:70: OK 9  CRASH 1  HANG 0 ===

seed   70  OK     b2 t11    64307f   9.1s  roundLost
seed   71  OK     b3 t42    75046f  10.1s  roundLost
seed   72  OK     b2 t16    39612f   4.9s  roundLost
seed   73  OK     b1 t16   111151f  15.4s  roundLost
seed   74  OK     b1 t26    26100f   3.4s  roundLost
seed   75  OK     b1 t32    90633f  11.9s  roundLost
seed   76  OK     b1 t24    88604f  11.9s  roundLost
seed   77  OK     b3 t28   121166f  16.8s  roundLost
seed   78  OK     b1 t210  208969f  30.7s  roundLost
seed   79  OK     b1 t36    65685f   9.0s  roundLost
=== chunk 70:80: OK 10  CRASH 0  HANG 0 ===

seed   80  OK     b2 t27   185054f  27.3s  roundLost
seed   81  OK     b1 t10   140427f  19.7s  roundLost
seed   82  OK     b4 t21   109904f  15.4s  roundLost
seed   83  OK     b2 t29    43218f   5.5s  roundLost
seed   84  OK     b1 t44    37215f   4.8s  roundLost
seed   85  OK     b1 t61    49301f   6.5s  roundLost
seed   86  OK     b2 t29    41571f   5.6s  roundLost
seed   87  OK     b1 t16   226906f  31.5s  roundLost
seed   88  OK     b2 t31    48643f   6.4s  roundLost
seed   89  OK     b1 t17    20187f   2.5s  roundLost
=== chunk 80:90: OK 10  CRASH 0  HANG 0 ===

seed   90  OK     b1 t16   231699f  33.4s  roundLost
seed   91  OK     b7 t18   186816f  25.5s  roundLost
seed   92  OK     b2 t27    39570f   5.1s  roundLost
seed   93  OK     b1 t44   199295f  28.8s  roundLost
seed   94  OK     b3 t15    70216f  10.0s  roundLost
seed   95  OK     b3 t37    65480f   9.3s  roundLost
seed   96  OK     b2 t28   125617f  18.6s  roundLost
seed   97  OK     b2 t23   198333f  29.3s  roundLost
seed   98  OK     b1 t68    48427f   6.8s  roundLost
seed   99  OK     b2 t15    68670f  10.2s  roundLost
=== chunk 90:100: OK 10  CRASH 0  HANG 0 ===

seed  100  OK     b2 t10    33567f   4.6s  roundLost
seed  101  OK     b3 t18    47896f   6.7s  roundLost
seed  102  OK     b1 t35    55278f   7.6s  roundLost
seed  103  OK     b3 t25    56246f   7.7s  roundLost
seed  104  OK     b1 t52    41256f   5.5s  roundLost
seed  105  OK     b4 t11   223464f  31.7s  roundLost
seed  106  OK     b1 t28    24570f   3.1s  roundLost
seed  107  OK     b1 t39    81909f  11.8s  roundLost
seed  108  OK     b1 t99   114873f  16.8s  roundLost
seed  109  OK     b1 t35    27258f   3.6s  roundLost
=== chunk 100:110: OK 10  CRASH 0  HANG 0 ===

seed  110  OK     b1 t33    25681f   3.6s  roundLost
seed  111  OK     b1 t25    22166f   2.9s  roundLost
seed  112  OK     b1 t25    87854f  12.7s  roundLost
seed  113  CRASH  b1 t28    61240f   9.0s  [engine/tick] Error: battle resolution move/hit provenance is not ordered
seed  114  OK     b1 t24   120811f  17.7s  roundLost
seed  115  OK     b2 t66    71510f  10.0s  roundLost
seed  116  OK     b2 t10    37545f   4.9s  roundLost
seed  117  OK     b1 t43   204634f  29.9s  roundLost
seed  118  OK     b1 t112  156139f  22.1s  roundLost
seed  119  OK     b1 t29    22740f   2.9s  roundLost
=== chunk 110:120: OK 9  CRASH 1  HANG 0 ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 58 |
| OK — `roundComplete` | 0 |
| HANG | 0 |
| CRASH | 2 (seed 69, seed 113) |

No `roundComplete` in this range — unsurprising for `full` (arbitrary-but-legal
play, no win bias, unlike `winning`); part 1/part 2's `full` 0:60 gate also
skews heavily `roundLost` for the same reason. Wall clock: ~838s (~14 min)
across the six 10-seed chunks. Max frame count observed among the 58 OK
seeds: **245,688** would have been seed 69's if it hadn't crashed there;
among the 57 clean OK seeds the max is **232,495** (seed 64) — both well
under `full`'s 600,000 default, so nothing in this range is anywhere near
budget-limited.

Seed 69 reproduces the *same signature* as winning's seed 16 above
(`Slice 3 resolution completed without a player command boundary`),
confirming that finding is genuinely policy-agnostic, not a `winning`-only
artifact — folded into the seed-16 triage above rather than repeated.

### Triage — signature: `Error: battle resolution move/hit provenance is not ordered` (seed 113)

**New signature.** Not in `docs/soak-crash-catalog.md`, not seen in any
prior winning/full sweep this workspace has run. Genuine engine bug,
reported per this step's policy (`src/**` bugs: report, do not fix).

```sh
npm run soak -- --policy full --seed 113 --verbose
# seed  113  CRASH  b1 t28   61240f   9.3s  [engine/tick] Error: battle resolution move/hit provenance is not ordered
#     projectBattleResolutionCommands (src/engine/battleResolutionPresentation.ts:3190)
#     createBattleResolutionPresentation (src/engine/battleResolutionPresentation.ts:3507)
#     freshResolution (src/engine/factoryRoundBattleOrchestrator.ts:1521)
```

Deterministic (reproduces identically on rerun). The throw site
(`src/engine/battleResolutionPresentation.ts:3187-3190`) computes
`interveningInstructions = hitExecution - usedMoveInstructionExecution -
executedPauseCallbacks` — the number of interpreter instruction
executions between the attack-string receipt and the matching hit-animation
receipt, after subtracting the Scene-OFF attack-pause's own accounted
callbacks — and asserts it's positive (the hit receipt must be causally
*after* the move-use receipt in interpreter-execution order). At seed 113
battle 1 turn 28 it computes `<= 0`, i.e. the hit receipt's provenance
claims to have executed at or before the move-use receipt it's supposed to
follow. The `--verbose` trail immediately before the throw is an ordinary
multi-step forced-party-replacement sequence (several `party intent`/`party:
confirm` cycles) followed by a plain `FIGHT` → move-slot-3 selection —
nothing unusual on the driver-input side, so this looks like the same
family of resolution-command-vs-live-state desync part 2's seed 109
(`battle resolution HP command starts at #, displayed #`, ISSUES #93 as
proposed) flagged, but a distinct invariant (attack/hit instruction
ordering rather than HP value) and a distinct throw site — treated here
as a separate signature, not folded into #93's text.

**Policy-specific to `full`** at this seed:
```sh
npm run soak -- --policy winning --seed 113
# seed  113  OK     b6 t20  141155f  20.8s  roundLost
npm run soak -- --policy vanilla --seed 113
# seed  113  OK     b1 t20  159603f  22.6s  roundLost
```
(Same caveat as above and as part 2's seed-109 writeup: this shows the
other two policies' choices don't route seed 113 through the offending
resolution sequence, not that the bug is `full`-specific in the engine.)

**Suspected owner:** `src/engine/battleResolutionPresentation.ts`
(`projectBattleResolutionCommands`'s attack-string-to-hit-receipt ordering
math) or, more likely upstream, whatever in
`src/engine/factoryRoundBattleOrchestrator.ts`'s `freshResolution` /
resolution-command-building path constructs the interpreter-execution
receipts that feed it — the renderer-side function is just the consumer
that caught the inconsistency, per the same reasoning part 2 used for
seed 109's HP-command desync.

**Minimal repro:**
```sh
npm run soak -- --policy full --seed 113 --verbose
```
Not fixed — out of scope (`src/**`, "engine bugs: report, do not fix").

## Combined summary

| range | policy | OK | CRASH | HANG |
| --- | --- | --- | --- | --- |
| 0:60 | winning (post-#93) | 59/60 | 1 (seed 16, new) | 0 |
| 60:120 | full (first sweep) | 58/60 | 2 (seed 69 = same sig as 16; seed 113, new) | 0 |

Net new distinct signatures this session: **2**
(`Slice 3 resolution completed without a player command boundary`;
`battle resolution move/hit provenance is not ordered`). Both are
deterministic, both reproduce on a second policy at a different seed or
were checked against the other two policies, and both are `src/**` engine
findings — reported per this step's fix policy, not fixed.

## Proposed ISSUES entries (text only — supervisor files them; suggested
numbers `#94`/`#95` since `#93` is the highest currently referenced)

> ## #94 — Slice 3 resolution can settle on a boundary that isn't a player
> command request (`FactoryRoundOrchestratorError: Slice 3 resolution
> completed without a player command boundary`)
>
> `--policy winning --seed 16` and `--policy full --seed 69` (2026-08-16
> resweep part 3, `docs/soak-resweep-2026-08-16-part3.md`) both throw inside
> `settledCommandForResolutionHandoff`
> (`src/engine/factoryRoundBattleOrchestrator.ts:1830`) once Slice 3
> resolution finishes draining: `commandPresentationForBoundary` expects the
> kernel `battle.boundary` to be a `decision-required` player `"command"`
> request at that point and returns `null` otherwise, which the caller
> treats as fatal. Deterministic at both seeds
> (`npm run soak -- --policy winning --seed 16 --verbose` /
> `npm run soak -- --policy full --seed 69 --verbose`). Reproduces under
> both `winning` and `full`, so not policy-specific in the engine, though
> each seed only crashes under the one policy whose move/switch choices
> happen to route its RNG stream through the offending sequence (`vanilla`
> and the non-crashing policy at each seed both resolve cleanly). First seen
> in a sweep run immediately after #93 landed (forced-switch handoff /
> trailing `Cmd_moveend` presentation-timing fix); not confirmed as caused
> by #93 (neither part-1 nor part-2's pre-#93 winning/full sweeps happened
> to hit these exact seeds' offending boundary state either, so absence
> before isn't proof of causation) but flagged as the most likely
> adjacent-family candidate for whoever picks this up. Suspected owner: the
> resolution-to-command-boundary handoff in
> `src/engine/factoryRoundBattleOrchestrator.ts`. Not fixed — `src/**`
> engine bug, out of scope for a `tools/soak/**` session.

> ## #95 — battle resolution attack/hit instruction-provenance ordering
> violation (`Error: battle resolution move/hit provenance is not ordered`)
>
> `--policy full --seed 113` (2026-08-16 resweep part 3,
> `docs/soak-resweep-2026-08-16-part3.md`) throws inside
> `projectBattleResolutionCommands`
> (`src/engine/battleResolutionPresentation.ts:3190`) at battle 1 turn 28,
> frame 61,240: the computed `interveningInstructions` (hit-receipt
> interpreter-execution index minus move-use receipt's, minus accounted
> Scene-OFF pause callbacks) is `<= 0`, i.e. the queued hit-animation
> receipt claims to have executed at or before the move-use receipt it's
> supposed to causally follow. Deterministic
> (`npm run soak -- --policy full --seed 113 --verbose`). Does not
> reproduce under `winning` or `vanilla` at the same seed — likely a
> policy-choice routing difference, not evidence the bug is `full`-specific
> (same reasoning as #93's seed-109 finding). Suspected owner:
> `src/engine/factoryRoundBattleOrchestrator.ts`'s `freshResolution` /
> resolution-command-building path (constructs the interpreter-execution
> receipts `projectBattleResolutionCommands` consumes and checks) rather
> than the renderer-side consumer that caught the inconsistency. Not fixed
> — `src/**` engine bug, out of scope for a `tools/soak/**` session.

## Repro commands reference

```sh
# Winning post-#93 resweep (single invocation; this session chunked it for
# the per-command time cap only — behavior is identical either way):
npm run soak -- --policy winning --seeds 0:60

# Full 60:120 (first sweep of this range):
npm run soak -- --policy full --seeds 60:120

# The two new crashes in isolation:
npm run soak -- --policy winning --seed 16 --verbose
npm run soak -- --policy full --seed 69 --verbose
npm run soak -- --policy full --seed 113 --verbose
```

## Verification

No `tools/soak/**` or `src/**` change this session (triage only, no fix
landed — both findings above are engine bugs out of scope for this step's
fix policy). `npm run test:smoke` and the full `npm test` + `npm run build`
are green (see final commit message for confirmation), satisfying this
step's no-code-change acceptance bar.
