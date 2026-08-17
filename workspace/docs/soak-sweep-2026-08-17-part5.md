# Soak-crash-class sweep — part 5 (2026-08-17)

Supervisor step brief: PROGRESS 1301 Next item (e) — extend random-play soak
coverage to previously-unswept seed ranges and probe longer chained runs.
No-code-change evidence step: nothing under `src/` or `tools/` was touched
this session.

Coverage already green going into this session (per
`docs/soak-resweep-2026-08-16-part4.md` and predecessors): `vanilla` 0:20,
`full` 0:120, `winning` 0:120. This session targets four new items in
priority order, sequentially, in ~20-30-seed chunks (each chunk one `npm run
soak` invocation, watched to completion before the next was launched):

1. `full 120:180` (previously-unswept range)
2. `winning 120:180` (previously-unswept range)
3. `vanilla 20:60` (previously-unswept range) — **not attempted**, out of
   time budget
4. Longer-chain probe: `winning 0:10` at 2x the policy default `maxFrames`
   — **not attempted**, out of time budget

Per the step brief's time-box ("at ~32 min elapsed STOP launching new
chunks"), items 1 and 2 completed cleanly and consumed essentially the
whole 45-minute session budget on their own (~32.5 minutes of `npm run
soak` wall-clock alone, chunked to stay under this tool's 10-minute
per-command limit). Items 3 and 4 were not started. This is a partial,
honest sweep per the brief's own guidance ("Partial honest coverage beats
an unfinished sweep").

## Range: `full` 120:180 — 60/60 OK, 0 CRASH, 0 HANG

Run in two 30-seed chunks (`--seeds 120:150`, `--seeds 150:180`).

```
seed  120  OK     b4 t23  120743f  16.9s  roundLost
seed  121  OK     b2 t33  193534f  26.6s  roundLost
seed  122  OK     b2 t22   32353f   4.2s  roundLost
seed  123  OK     b3 t72  122827f  17.2s  roundLost
seed  124  OK     b1 t99   73385f  10.3s  roundLost
seed  125  OK     b6 t22  106793f  14.6s  roundLost
seed  126  OK     b1 t53   39460f   5.2s  roundLost
seed  127  OK     b3 t11   43252f   5.5s  roundLost
seed  128  OK     b1 t95  144455f  20.3s  roundLost
seed  129  OK     b1 t54  165297f  23.3s  roundLost
seed  130  OK     b1 t23   21241f   2.6s  roundLost
seed  131  OK     b1 t62   47183f   6.3s  roundLost
seed  132  OK     b1 t95  112740f  15.7s  roundLost
seed  133  OK     b1 t49   39502f   5.1s  roundLost
seed  134  OK     b1 t72   51232f   6.9s  roundLost
seed  135  OK     b1 t45  142285f  19.6s  roundLost
seed  136  OK     b2 t9   120128f  16.7s  roundLost
seed  137  OK     b1 t11   57862f   7.7s  roundLost
seed  138  OK     b1 t29   24948f   3.2s  roundLost
seed  139  OK     b1 t22  148836f  20.8s  roundLost
seed  140  OK     b1 t44   36160f   4.8s  roundLost
seed  141  OK     b1 t12   18163f   2.2s  roundLost
seed  142  OK     b1 t8   214537f  30.0s  roundLost
seed  143  OK     b1 t26   23165f   2.9s  roundLost
seed  144  OK     b1 t64   46252f   6.1s  roundLost
seed  145  OK     b1 t45   30494f   3.9s  roundLost
seed  146  OK     b1 t98  111529f  15.5s  roundLost
seed  147  OK     b2 t15  115034f  15.6s  roundLost
seed  148  OK     b1 t41   30052f   4.0s  roundLost
seed  149  OK     b1 t30   55697f   7.3s  roundLost
=== chunk 120:150: OK 30  CRASH 0  HANG 0  (341.0s) ===

seed  150  OK     b1 t25  163679f  23.9s  roundLost
seed  151  OK     b1 t96  170418f  23.4s  roundLost
seed  152  OK     b1 t30   47312f   6.4s  roundLost
seed  153  OK     b1 t20   23128f   2.8s  roundLost
seed  154  OK     b1 t50   36243f   4.7s  roundLost
seed  155  OK     b4 t17  110546f  15.3s  roundLost
seed  156  OK     b2 t23   73218f   9.8s  roundLost
seed  157  OK     b2 t19  103973f  14.2s  roundLost
seed  158  OK     b4 t17   72587f  10.3s  roundLost
seed  159  OK     b1 t29   25436f   3.1s  roundLost
seed  160  OK     b3 t16  143345f  19.9s  roundLost
seed  161  OK     b1 t22  271374f  37.9s  roundLost
seed  162  OK     b1 t145  105473f  14.4s  roundLost
seed  163  OK     b1 t33   29947f   3.7s  roundLost
seed  164  OK     b3 t25  105462f  14.7s  roundLost
seed  165  OK     b2 t21  122725f  17.1s  roundLost
seed  166  OK     b1 t34   28634f   3.7s  roundLost
seed  167  OK     b1 t30   57354f   7.8s  roundLost
seed  168  OK     b1 t54   40152f   5.4s  roundLost
seed  169  OK     b1 t15   51669f   6.9s  roundLost
seed  170  OK     b1 t47  140578f  19.7s  roundLost
seed  171  OK     b1 t36  338191f  47.9s  roundLost
seed  172  OK     b1 t32  104500f  14.7s  roundLost
seed  173  OK     b2 t29   45274f   5.9s  roundLost
seed  174  OK     b1 t29   24626f   3.0s  roundLost
seed  175  OK     b1 t102   65671f   8.9s  roundLost
seed  176  OK     b1 t48   39050f   5.1s  roundLost
seed  177  OK     b2 t13  139512f  19.4s  roundLost
seed  178  OK     b1 t159  205939f  29.1s  roundLost
seed  179  OK     b2 t36   46286f   6.2s  roundLost
=== chunk 150:180: OK 30  CRASH 0  HANG 0  (405.1s) ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 60 |
| OK — `roundComplete` | 0 |
| HANG | 0 |
| CRASH | 0 |

Wall clock: ~746s (~12.4 min). **Zero `roundComplete` in this range** —
unsurprising for `full` (arbitrary-but-legal play, no win bias), consistent
with every prior `full` sweep. Max frame count observed: **338,191**
(seed 171), well under `full`'s 600,000 default.

## Range: `winning` 120:180 — 60/60 OK, 0 CRASH, 0 HANG

Run in three 20-seed chunks (`--seeds 120:140`, `--seeds 140:160`,
`--seeds 160:180`) to stay under this session's per-command time limit.

```
seed  120  OK     b2 t35  120095f  16.8s  roundLost
seed  121  OK     b3 t20  208908f  28.6s  roundLost
seed  122  OK     b2 t14   24428f   3.1s  roundLost
seed  123  OK     b7 t8    70937f   9.7s  roundComplete
seed  124  OK     b7 t22  138831f  18.5s  roundComplete
seed  125  OK     b5 t24   56066f   7.5s  roundLost
seed  126  OK     b4 t14  231121f  31.3s  roundLost
seed  127  OK     b5 t17   57037f   7.6s  roundLost
seed  128  OK     b2 t21   28503f   3.9s  roundLost
seed  129  OK     b1 t20  167637f  23.1s  roundLost
seed  130  OK     b3 t22  236620f  32.3s  roundLost
seed  131  OK     b2 t16   37268f   4.8s  roundLost
seed  132  OK     b7 t13   75453f  10.0s  roundComplete
seed  133  OK     b2 t18  182214f  25.4s  roundLost
seed  134  OK     b5 t8    68679f   9.0s  roundLost
seed  135  OK     b3 t17  212629f  29.1s  roundLost
seed  136  OK     b3 t23   66388f   9.2s  roundLost
seed  137  OK     b4 t17   93307f  12.4s  roundLost
seed  138  OK     b6 t23  341328f  47.0s  roundLost
seed  139  OK     b3 t8    91207f  12.9s  roundLost
=== chunk 120:140: OK 20  CRASH 0  HANG 0  (342.0s) ===

seed  140  OK     b3 t21  286779f  42.2s  roundLost
seed  141  OK     b1 t10   15999f   2.0s  roundLost
seed  142  OK     b3 t15  150217f  21.9s  roundLost
seed  143  OK     b5 t18   73069f  10.5s  roundLost
seed  144  OK     b7 t27  367219f  51.5s  roundComplete
seed  145  OK     b3 t15   56092f   7.8s  roundLost
seed  146  OK     b1 t22  175339f  24.3s  roundLost
seed  147  OK     b7 t15  135073f  19.0s  roundComplete
seed  148  OK     b1 t29   22192f   2.9s  roundLost
seed  149  OK     b7 t19  286169f  40.4s  roundComplete
seed  150  OK     b2 t27  100407f  13.8s  roundLost
seed  151  OK     b4 t12   42659f   6.0s  roundLost
seed  152  OK     b7 t8   217722f  30.1s  roundComplete
seed  153  OK     b1 t35   30210f   3.8s  roundLost
seed  154  OK     b1 t37  179457f  24.5s  roundLost
seed  155  OK     b7 t21  471815f  64.2s  roundLost
seed  156  OK     b2 t22  273291f  37.6s  roundLost
seed  157  OK     b5 t15  244610f  33.8s  roundLost
seed  158  OK     b7 t17   69769f   9.0s  roundComplete
seed  159  OK     b3 t14   71038f   9.5s  roundLost
=== chunk 140:160: OK 20  CRASH 0  HANG 0  (454.6s) ===

seed  160  OK     b1 t21   20257f   2.7s  roundLost
seed  161  OK     b5 t39   80973f  11.8s  roundLost
seed  162  OK     b1 t19   65524f   9.1s  roundLost
seed  163  OK     b1 t65  172825f  24.8s  roundLost
seed  164  OK     b7 t17  176331f  24.6s  roundComplete
seed  165  OK     b2 t15  198801f  27.5s  roundLost
seed  166  OK     b3 t15   74785f  10.0s  roundLost
seed  167  OK     b1 t25   66348f   8.8s  roundLost
seed  168  OK     b5 t38   74880f  10.3s  roundLost
seed  169  OK     b7 t28  152998f  20.3s  roundLost
seed  170  OK     b6 t9    63319f   8.3s  roundLost
seed  171  OK     b3 t14  220603f  30.1s  roundLost
seed  172  OK     b7 t17  101477f  13.8s  roundComplete
seed  173  OK     b4 t12  450354f  63.1s  roundLost
seed  174  OK     b1 t22  307954f  41.8s  roundLost
seed  175  OK     b7 t18   92996f  12.7s  roundComplete
seed  176  OK     b1 t14  355947f  49.0s  roundLost
seed  177  OK     b3 t48   48260f   6.6s  roundLost
seed  178  OK     b6 t8   149556f  20.2s  roundLost
seed  179  OK     b7 t27   95378f  13.1s  roundComplete
=== chunk 160:180: OK 20  CRASH 0  HANG 0  (408.5s) ===
```

| outcome | count |
| --- | --- |
| OK — `roundLost` | 48 |
| OK — `roundComplete` (full 7-win streak) | 12 (seeds 123, 124, 132, 144, 147, 149, 152, 158, 164, 172, 175, 179) |
| HANG | 0 |
| CRASH | 0 |

Wall clock: ~1205s (~20.1 min) across the three chunks. Max frame count
observed: **471,815** (seed 155), under `winning`'s 1,000,000 default with
plenty of room — nothing in this range is budget-limited.

## Range: `vanilla` 20:60 — NOT ATTEMPTED

Out of time. Items 1 and 2 above consumed ~32.5 minutes of `npm run soak`
wall-clock (plus session setup/doc-writing overhead), hitting the step
brief's "~32 min elapsed, stop launching new chunks" time-box before this
range could be started. No seed in `vanilla` 20:60 was run this session.

## Longer-chain probe (`winning` 0:10 @ 2x default `maxFrames`) — NOT ATTEMPTED

Out of time, for the same reason as above. `DEFAULT_MAX_FRAMES_BY_POLICY.winning`
is **1,000,000** (`tools/soak/randomRoundSoakDriver.ts:848-852`), so the
probe command per the step brief would have been:

```sh
npm run soak -- --policy winning --seeds 0:10 --max-frames 2000000
```

This was not run. No finding on whether the default budget masks
slow-but-alive deep chains — that question remains open for a future
session. Note that this session's `winning` 120:180 sweep (max observed
471,815 frames, seed 155) stays well within the existing 1,000,000 default,
so there is no positive signal either way from this session's data.

## Combined summary

| range | policy | OK | CRASH | HANG | status |
| --- | --- | --- | --- | --- | --- |
| 120:180 | full (new) | 60/60 | 0 | 0 | **swept, clean** |
| 120:180 | winning (new) | 60/60 | 0 | 0 | **swept, clean** |
| 20:60 | vanilla (new) | — | — | — | not attempted |
| 0:10 @ 2x budget | winning (probe) | — | — | — | not attempted |

**120/120 seeds swept this session, all clean — zero crashes, zero hangs.**
No new signature encountered; nothing to triage against
`docs/soak-crash-catalog.md`. Combined with prior coverage (`vanilla` 0:20,
`full` 0:120 + this session's 120:180 = `full` 0:180, `winning` 0:120 + this
session's 120:180 = `winning` 0:180), the standing gate coverage now extends
to `full` 0:180 and `winning` 0:180 fully green, with `vanilla` still only
covered at 0:20 and the longer-chain-probe question still open.

## Repro commands reference

```sh
# Full, previously-unswept range (chunked here for the per-command time cap
# only — behavior is identical to a single wide-range invocation):
npm run soak -- --policy full --seeds 120:150
npm run soak -- --policy full --seeds 150:180

# Winning, previously-unswept range:
npm run soak -- --policy winning --seeds 120:140
npm run soak -- --policy winning --seeds 140:160
npm run soak -- --policy winning --seeds 160:180

# Not run this session — next session should pick these up first:
npm run soak -- --policy vanilla --seeds 20:60
npm run soak -- --policy winning --seeds 0:10 --max-frames 2000000
```

## Verification

No `tools/soak/**` or `src/**` change this session — no failures to triage,
nothing to fix. `npm run test:smoke`: **375/375 passed**. Full `npm test`
and `npm run build` were not required for this no-code-change evidence step
per the step brief.
