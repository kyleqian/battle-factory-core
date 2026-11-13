# ROM replay ledger (handoff "Next work" item 0d)

The ROM replay (`tools/audio/romDriveSeed.sh SEED off|on DIR`, `docs/aud243d-rom-driver.md`) is the gameplay check: it replays the engine's decisions on
the stock ROM to battle end and compares HP / RNG / last moves per state. A seed "matches" when `engineError` and `divergence` are null and the drive
stops at `outcome`. Claim gameplay status only from this ledger. Rules, the permanent list and the schedule: `docs/cax31-session-handoff.md` item 0d.

**Permanent list** (every seed that ever diverged; driven on the final tree when a run lands an engine gameplay change):
2 6 8 11 13 17 20 22 26 27 28 30 31 32 39 42 50 53 57 60 75 79 87 88 89 90 94 95 107 109 110 114 119 123 137 138 152 155 158 159.
Not drivable: 33, 82, 131 (Brain battles; the lab accepts `trainerId` 0..299 only).

**Highest seed driven as new:** 10000 (the Mac bulk run of 2026-11-12, `docs/replay-batches/`; the box drives no new seeds). **Consecutive clean new seeds:** see `docs/parity-mac/STATUS.md` (0 engine mismatches on `344eda36c`). From 2026-11-13 the nightly check draws from `docs/replay-batches/regression-pool.txt` (handoff item 0d).

| run | commit | seeds | scene | matched / driven | new divergent seeds | notes |
|---|---|---|---|---|---|---|
| 2026-11-12 top layer (Mac) | `389a7985a` | 61..160 (new) | OFF | 78 / 98 (+2 Brain) | 75 79 87 88 89 90 94 95 107 109 110 114 119 123 137 138 152 155 158 159 | audit doc section 6 |
| 2026-11-12 CAX31 wind-down | `f55e68f8e` | permanent list (40) | OFF | 24 / 40 | none (no new seeds driven) | now match: 22 30 39 42 50 53 57 (fixed this run) and 75 88 110 155 158; still diverge: 60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 |
| 2026-11-13 CAX31 nightly | `5a2fe1d83` (master + `mac/parity-mac` `344eda36c`) | 40 drawn from `regression-pool.txt` (Python `random.Random(20261113).sample`) + silver 4767 9637 + gold 4933 4240 (`ROM_REPLAY_SYMBOLS=1`) | OFF | **44 / 44** (1,767 states) | none | 2 lanes, `nice 19`, 27 min wall beside the full suite; 0 re-drives needed. Pool seeds: 1153 30 8738 848 3231 9721 6635 9606 8 4419 311 5060 862 555 183 3591 202 5540 651 6168 2475 89 2380 9319 4925 22 6805 7025 7624 9085 7084 2440 4965 7193 9975 4204 2025 8292 165 4767; results `.integration/validation/sv-20261113/gates/replay/results.jsonl` |
| 2026-11-13 CAX31 wind-down | `46bb97406` (engine src == final `9f7290038`) | permanent list (fixed 64) | OFF | **64 / 64** (1,148 states) | none | 2-3 lanes `nice 19` beside the soaks; first pass cut at its 80-min cap after 28, the other 36 re-launched; results `.integration/validation/sv-20261113/gates/replay64/results.jsonl` |

Per-seed rows of the latest run (`.integration/validation/sv-20261111/gates/replay/results.jsonl`), matched / engine states and drive stop for the
divergent seeds: 60 36 / 82 party menu; 79 4 / 13 party menu; 87 44 / 74 party menu; 89 45 / 122 party menu; 90 66 / 73 outcome; 94 36 / 39 outcome;
95 3 / 11 action menu; 107 3 / 11 action menu; 109 0 / 17 action menu; 114 1 / 13 party menu; 119 4 / 21 party menu; 123 3 / 9 action menu;
137 7 / 10 outcome; 138 5 / 10 party menu; 152 6 / 14 action menu; 159 52 / 64 party menu.
"party menu without a switch decision" / "action menu without a move decision" = the ROM opened a menu the engine had no decision for (decision-shape:
the engine's battle took another path earlier). Host note: on CAX31 a seed takes ~1.5 min alone and ~10 min beside the wind-down soaks at `nice 19`.
