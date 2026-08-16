# Post-#94/#95 validation sweep — part 4 (2026-08-16)

Supervisor step brief: PROGRESS 1298 closed #94 (`FactoryRoundOrchestratorError:
Slice 3 resolution completed without a player command boundary`) and #95 (an
attack animation pairing with a hit animation from a later script execution),
with acceptance covering `winning 0:20`, `full 60:70`, `full 110:120`, and
seeds 16/69/113/109. Three ranges were **not** yet re-run post-fix and are the
subject of this session: `vanilla 0:20`, `full 0:60` (the standing wind-down
gate), and `winning 20:60` (previously-uncovered range — part 3 only swept
`winning 0:60`). Both #94 and #95 changed presentation timing, so per the
step brief this sweep is the early wind-down-gate signal for the whole
post-#93/#94/#95 fix line.

All three ranges run in 10-seed chunks (`npm run soak -- --policy <p> --seeds
A:B`) to stay under this session's per-command time cap; results are
byte-identical to what a single wide-range invocation would produce (the
driver is seeded per-seed and stateless across seeds). No `--max-frames` flag
was passed — this session runs entirely on the standing per-policy defaults
(`winning` 1,000,000; `full`/`vanilla` 600,000).

## Range: `vanilla` 0:20 (gate) — 20/20 OK, 0 CRASH, 0 HANG

```
seed    0  OK     b7 t9   594718f  86.8s  roundComplete
seed    1  OK     b1 t16   16970f   2.1s  roundLost
seed    2  OK     b1 t28   26752f   3.5s  roundLost
seed    3  OK     b1 t16   16891f   2.2s  roundLost
seed    4  OK     b1 t16  101809f  14.4s  roundLost
seed    5  OK     b1 t16   16977f   2.2s  roundLost
seed    6  OK     b1 t28   26766f   3.5s  roundLost
seed    7  OK     b1 t16   16904f   2.1s  roundLost
seed    8  OK     b1 t16   16872f   2.1s  roundLost
seed    9  OK     b1 t28   26731f   3.5s  roundLost
=== chunk 0:10: OK 10  CRASH 0  HANG 0 ===

seed   10  OK     b4 t24  161392f  24.0s  roundLost
seed   11  OK     b1 t28   26796f   3.5s  roundLost
seed   12  OK     b3 t23  125422f  17.5s  roundLost
seed   13  OK     b1 t28   26805f   3.4s  roundLost
seed   14  OK     b2 t20  136323f  18.7s  roundLost
seed   15  OK     b1 t28   26719f   3.5s  roundLost
seed   16  OK     b7 t19   93208f  12.7s  roundComplete
seed   17  OK     b1 t28   26759f   3.5s  roundLost
seed   18  OK     b6 t16   84555f  11.6s  roundLost
seed   19  OK     b1 t28   26736f   3.4s  roundLost
=== chunk 10:20: OK 10  CRASH 0  HANG 0 ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 18 |
| OK — `roundComplete` | 2 (seeds 0, 16) |
| HANG | 0 |
| CRASH | 0 |

Wall clock: ~224s (~3.7 min). **Gate green — matches expectation (20/20).**
Seed 16 under `vanilla` reaching `roundComplete` matches part 3's spot-check
of the same seed/policy pair.

## Range: `full` 0:60 (standing wind-down gate) — 60/60 OK, 0 CRASH, 0 HANG

```
seed    0  OK     b1 t141   92328f  13.4s  roundLost
seed    1  OK     b2 t32   139064f  19.6s  roundLost
seed    2  OK     b1 t19    19744f   2.3s  roundLost
seed    3  OK     b1 t30    25412f   3.1s  roundLost
seed    4  OK     b2 t27   294749f  40.9s  roundLost
seed    5  OK     b1 t20    22179f   2.6s  roundLost
seed    6  OK     b1 t55   113199f  15.9s  roundLost
seed    7  OK     b1 t98    89638f  12.2s  roundLost
seed    8  OK     b2 t23    85883f  11.9s  roundLost
seed    9  OK     b4 t10    75885f  10.1s  roundLost
=== chunk 0:10: OK 10  CRASH 0  HANG 0 ===

seed   10  OK     b1 t34    27324f   3.7s  roundLost
seed   11  OK     b1 t27    26475f   3.4s  roundLost
seed   12  OK     b2 t36   285087f  39.8s  roundLost
seed   13  OK     b1 t27   108799f  15.0s  roundLost
seed   14  OK     b1 t20    20078f   2.4s  roundLost
seed   15  OK     b1 t112   71177f   9.8s  roundLost
seed   16  OK     b2 t26    38583f   4.9s  roundLost
seed   17  OK     b1 t13   108140f  14.6s  roundLost
seed   18  OK     b2 t23    43440f   5.7s  roundLost
seed   19  OK     b1 t36    68728f   9.5s  roundLost
=== chunk 10:20: OK 10  CRASH 0  HANG 0 ===

seed   20  OK     b1 t16    69392f   9.8s  roundLost
seed   21  OK     b1 t58    81680f  11.3s  roundLost
seed   22  OK     b1 t34   478965f  67.5s  roundLost
seed   23  OK     b2 t18   102499f  14.0s  roundLost
seed   24  OK     b1 t24    20622f   2.5s  roundLost
seed   25  OK     b2 t13   196984f  27.5s  roundLost
seed   26  OK     b1 t26   230811f  32.2s  roundLost
seed   27  OK     b2 t26    38320f   4.8s  roundLost
seed   28  OK     b2 t32    84429f  11.9s  roundLost
seed   29  OK     b1 t27    24716f   3.2s  roundLost
=== chunk 20:30: OK 10  CRASH 0  HANG 0 ===

seed   30  OK     b2 t17    91658f  13.4s  roundLost
seed   31  OK     b2 t39    45711f   6.0s  roundLost
seed   32  OK     b1 t40    33274f   4.2s  roundLost
seed   33  OK     b4 t26    73060f   9.6s  roundLost
seed   34  OK     b1 t30    29322f   3.6s  roundLost
seed   35  OK     b3 t19    63662f   8.5s  roundLost
seed   36  OK     b2 t27   100963f  14.1s  roundLost
seed   37  OK     b1 t16    45811f   6.0s  roundLost
seed   38  OK     b1 t40   215995f  30.0s  roundLost
seed   39  OK     b6 t39   157129f  22.2s  roundLost
=== chunk 30:40: OK 10  CRASH 0  HANG 0 ===

seed   40  OK     b2 t35   122139f  17.2s  roundLost
seed   41  OK     b1 t38    33625f   4.2s  roundLost
seed   42  OK     b2 t24    44914f   6.1s  roundLost
seed   43  OK     b3 t18    44596f   5.8s  roundLost
seed   44  OK     b2 t38    42390f   5.7s  roundLost
seed   45  OK     b2 t38   164447f  23.6s  roundLost
seed   46  OK     b1 t21    98599f  13.6s  roundLost
seed   47  OK     b4 t14   124313f  17.3s  roundLost
seed   48  OK     b1 t61    43083f   5.8s  roundLost
seed   49  OK     b1 t24   116592f  16.7s  roundLost
=== chunk 40:50: OK 10  CRASH 0  HANG 0 ===

seed   50  OK     b1 t121  104741f  15.2s  roundLost
seed   51  OK     b1 t13    73085f  10.1s  roundLost
seed   52  OK     b3 t18    52838f   7.2s  roundLost
seed   53  OK     b1 t23    49112f   6.7s  roundLost
seed   54  OK     b1 t21    20201f   2.4s  roundLost
seed   55  OK     b2 t22   167715f  23.2s  roundLost
seed   56  OK     b1 t15    19405f   2.4s  roundLost
seed   57  OK     b2 t57    64348f   8.9s  roundLost
seed   58  OK     b2 t14    33584f   4.6s  roundLost
seed   59  OK     b1 t30    24648f   3.3s  roundLost
=== chunk 50:60: OK 10  CRASH 0  HANG 0 ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 60 |
| OK — `roundComplete` | 0 |
| HANG | 0 |
| CRASH | 0 |

Wall clock: ~744s (~12.4 min). **Gate green — matches expectation (60/60).**
No `roundComplete` in this range is unsurprising for `full` (arbitrary-but-legal
play, no win bias) — consistent with part 1/part 2/part 3's `full` sweeps.
Max frame count observed: **478,965** (seed 22), well under `full`'s 600,000
default — nothing in this range is anywhere near budget-limited.

Part 3's #94 crash at `full` seed 16 (in the old `winning 0:60` sweep, one of
the two signature occurrences) sat inside this range and is now clean: **OK
b2 t26 roundLost**. Seeds 69 and 113 (part 3's other #94/#95 occurrences,
both filed against `full 60:120`) are outside this session's `0:60` range and
already covered by PROGRESS 1298's #94/#95 acceptance sweep, so not repeated
here.

## Range: `winning` 20:60 (previously uncovered)
