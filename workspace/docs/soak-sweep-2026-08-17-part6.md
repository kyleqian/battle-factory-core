# Soak-crash-class sweep — part 6 (2026-08-17)

Supervisor step brief: finish part 5's two time-boxed-out items. No-code-change
evidence step: nothing under `src/` or `tools/` was touched this session.

Coverage going into this session (per `docs/soak-sweep-2026-08-17-part5.md`):
`vanilla` 0:20, `full` 0:180, `winning` 0:180. This session closes the two
items part 5 ran out of time budget for:

1. `vanilla` 20:60 (previously-unswept range)
2. Longer-chain probe: `winning` 0:10 at 2x the policy default `maxFrames`
   (1,000,000 → 2,000,000)

Both items completed well inside the time box (~14 minutes of `npm run soak`
wall-clock total).

## Item 1 — `vanilla` 20:60 — 40/40 OK, 0 CRASH, 0 HANG

Run in two 20-seed chunks (`--seeds 20:40`, `--seeds 40:60`).

```
seed   20  OK     b3 t17  152538f  21.7s  roundLost
seed   21  OK     b1 t28   26780f   3.4s  roundLost
seed   22  OK     b1 t16   16852f   2.1s  roundLost
seed   23  OK     b1 t16   16953f   2.1s  roundLost
seed   24  OK     b2 t28  383631f  53.4s  roundLost
seed   25  OK     b1 t16   16875f   2.1s  roundLost
seed   26  OK     b7 t9   200335f  27.1s  roundComplete
seed   27  OK     b2 t15  208377f  28.8s  roundLost
seed   28  OK     b1 t14  168338f  22.7s  roundLost
seed   29  OK     b5 t12  137150f  18.5s  roundLost
seed   30  OK     b1 t28   26773f   3.5s  roundLost
seed   31  OK     b7 t11   99135f  13.6s  roundComplete
seed   32  OK     b7 t13   92341f  12.6s  roundComplete
seed   33  OK     b5 t28  141741f  19.7s  roundLost
seed   34  OK     b7 t7   183303f  25.3s  roundComplete
seed   35  OK     b1 t16   16947f   2.1s  roundLost
seed   36  OK     b3 t23  126491f  17.7s  roundLost
seed   37  OK     b1 t16   16922f   2.1s  roundLost
seed   38  OK     b1 t16   16871f   2.1s  roundLost
seed   39  OK     b5 t15   76490f  10.4s  roundLost
=== chunk 20:40: OK 20  CRASH 0  HANG 0  (291.4s) ===

seed   40  OK     b1 t28   26809f   3.8s  roundLost
seed   41  OK     b7 t16  102109f  14.1s  roundComplete
seed   42  OK     b1 t28   26767f   3.5s  roundLost
seed   43  OK     b7 t11   98499f  13.4s  roundComplete
seed   44  OK     b1 t16   16942f   2.1s  roundLost
seed   45  OK     b7 t11   89150f  11.9s  roundComplete
seed   46  OK     b1 t28   26730f   3.4s  roundLost
seed   47  OK     b1 t16   16955f   2.1s  roundLost
seed   48  OK     b2 t13  264980f  36.4s  roundLost
seed   49  OK     b1 t16   16882f   2.0s  roundLost
seed   50  OK     b2 t16   99152f  13.2s  roundLost
seed   51  OK     b2 t26  471735f  65.6s  roundLost
seed   52  OK     b1 t28   26761f   3.4s  roundLost
seed   53  OK     b7 t13   93329f  12.8s  roundComplete
seed   54  OK     b1 t16   16919f   2.1s  roundLost
seed   55  OK     b1 t16   16935f   2.2s  roundLost
seed   56  OK     b3 t22  144244f  20.3s  roundLost
seed   57  OK     b1 t16   16963f   2.1s  roundLost
seed   58  OK     b7 t13   93869f  12.7s  roundComplete
seed   59  OK     b7 t14  397555f  54.4s  roundComplete
=== chunk 40:60: OK 20  CRASH 0  HANG 0  (281.5s) ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 30 |
| OK — `roundComplete` | 10 (seeds 26, 31, 32, 34, 41, 43, 45, 53, 58, 59) |
| HANG | 0 |
| CRASH | 0 |

(The `vanilla` policy here — unlike the "always FIGHT slot 0, decline
everything" description in `docs/soak-crash-catalog.md`'s 2026-08-08 entry —
evidently now includes enough decision variety to reach `roundComplete` on
some seeds; this is consistent with `vanilla` behavior already recorded
elsewhere in this sweep series and is not itself a new finding.)

Wall clock: ~573s (~9.5 min). Max frame count observed: **471,735** (seed
51), well under `vanilla`'s 600,000 default. No crash, no hang, no new
signature — nothing to triage against `docs/soak-crash-catalog.md`.

Combined with prior coverage, `vanilla` now stands fully swept at **0:60**
(0:20 prior + this session's 20:60).

## Item 2 — Longer-chain probe: `winning` 0:10 @ 2x default `maxFrames` (2,000,000)

```sh
npm run soak -- --policy winning --seeds 0:5 --max-frames 2000000
npm run soak -- --policy winning --seeds 5:10 --max-frames 2000000
```

```
seed    0  OK     b2 t30  152641f  21.9s  roundLost
seed    1  OK     b7 t26  151729f  20.9s  roundComplete
seed    2  OK     b5 t14  161852f  23.0s  roundLost
seed    3  OK     b5 t13  125724f  17.3s  roundLost
seed    4  OK     b4 t13  537223f  75.4s  roundLost
=== chunk 0:5: OK 5  CRASH 0  HANG 0  (158.5s) ===

seed    5  OK     b3 t13  216331f  31.8s  roundLost
seed    6  OK     b5 t20   68210f   9.3s  roundLost
seed    7  OK     b7 t11  282887f  40.2s  roundComplete
seed    8  OK     b2 t21   28740f   4.1s  roundLost
seed    9  OK     b3 t13  120356f  17.8s  roundLost
=== chunk 5:10: OK 5  CRASH 0  HANG 0  (103.3s) ===
```

| seed | outcome | frames | time | end state |
| --- | --- | --- | --- | --- |
| 0 | OK | 152,641 | 21.9s | roundLost |
| 1 | OK | 151,729 | 20.9s | roundComplete |
| 2 | OK | 161,852 | 23.0s | roundLost |
| 3 | OK | 125,724 | 17.3s | roundLost |
| 4 | OK | 537,223 | 75.4s | roundLost |
| 5 | OK | 216,331 | 31.8s | roundLost |
| 6 | OK | 68,210 | 9.3s | roundLost |
| 7 | OK | 282,887 | 40.2s | roundComplete |
| 8 | OK | 28,740 | 4.1s | roundLost |
| 9 | OK | 120,356 | 17.8s | roundLost |

10/10 OK, 0 CRASH, 0 HANG. Wall clock: ~262s (~4.4 min).

**Budget-probe verdict:**

- **(a) Did any seed run past the 1,000,000-frame default?** **No.** The
  deepest run in this 10-seed sample (seed 4) reached 537,223 frames — about
  54% of the standing 1,000,000 default and 27% of the 2,000,000 probe
  budget. No seed came close to either ceiling, so nothing here shows the
  default budget mislabeling a live run as HANG.
- **(b) Maximum frame count reached across the 10 seeds:** **537,223**
  (seed 4), against a 2,000,000 probe budget (26.9% utilized) and the
  standing 1,000,000 default (53.7% utilized).

This is consistent with part 5's `winning` 120:180 sweep (max 471,815 at
seed 155, also well under the 1,000,000 default) — combined, no `winning`
seed observed across 0:10, 120:180 has come within 2x of the default
budget, so this session's data gives no positive signal that the standing
1,000,000-frame default is at risk of truncating a live chain in the
low-seed range the standing gates use. The question of whether *some*
seed elsewhere in the space could exceed budget remains open in principle
(this was a 10-seed sample, not exhaustive), but the probe found no such
case.

## Combined summary

| range | policy | OK | CRASH | HANG | status |
| --- | --- | --- | --- | --- | --- |
| 20:60 | vanilla (new) | 40/40 | 0 | 0 | **swept, clean** |
| 0:10 @ 2x budget (2,000,000) | winning (probe) | 10/10 | 0 | 0 | **swept, clean; max 537,223f, no truncation risk found** |

**50/50 seeds run this session, all clean — zero crashes, zero hangs.** No
new signature encountered; nothing to triage against
`docs/soak-crash-catalog.md`. Both items part 5 timed out on are now closed.
Standing coverage after this session: `vanilla` 0:60, `full` 0:180,
`winning` 0:180 (all fully green), plus the longer-chain probe question
answered (no truncation risk observed in the 0:10 range at 2x budget).

## Repro commands reference

```sh
# Vanilla, previously-unswept range:
npm run soak -- --policy vanilla --seeds 20:40
npm run soak -- --policy vanilla --seeds 40:60

# Longer-chain probe, winning policy at 2x default maxFrames:
npm run soak -- --policy winning --seeds 0:5 --max-frames 2000000
npm run soak -- --policy winning --seeds 5:10 --max-frames 2000000
```

## Verification

No `tools/soak/**` or `src/**` change this session — no failures to triage,
nothing to fix. `npm run test:smoke`: **375/375 passed**. Full `npm test`
and `npm run build` were not required for this no-code-change evidence step
per the step brief (no source files were edited).
