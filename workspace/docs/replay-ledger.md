# ROM replay ledger (handoff "Next work" item 0d)

The ROM replay (`tools/audio/romDriveSeed.sh SEED off|on DIR`, `docs/aud243d-rom-driver.md`) is the gameplay check: it replays the engine's decisions on
the stock ROM to battle end and compares HP / RNG / last moves per state. A seed "matches" when `engineError` and `divergence` are null and the drive
stops at `outcome`. Claim gameplay status only from this ledger. Rules, the permanent list and the schedule: `docs/cax31-session-handoff.md` item 0d.

**Permanent list** (every seed that ever diverged; driven on the final tree when a run lands an engine gameplay change):
2 6 8 11 13 17 20 22 26 27 28 30 31 32 39 42 50 53 57 60 75 79 87 88 89 90 94 95 107 109 110 114 119 123 137 138 152 155 158 159.
Not drivable: 33, 82, 131 (Brain battles; the lab accepts `trainerId` 0..299 only).

**Highest seed driven as new:** 160. **Consecutive clean new seeds:** 0 (the 61..160 batch has divergences).

| run | commit | seeds | scene | matched / driven | new divergent seeds | notes |
|---|---|---|---|---|---|---|
| 2026-11-12 top layer (Mac) | `389a7985a` | 61..160 (new) | OFF | 78 / 98 (+2 Brain) | 75 79 87 88 89 90 94 95 107 109 110 114 119 123 137 138 152 155 158 159 | audit doc section 6 |
| 2026-11-12 CAX31 wind-down | `f55e68f8e` | permanent list (40) | OFF | 24 / 40 | none (no new seeds driven) | now match: 22 30 39 42 50 53 57 (fixed this run) and 75 88 110 155 158; still diverge: 60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 |

Per-seed rows of the latest run (`.integration/validation/sv-20261111/gates/replay/results.jsonl`), matched / engine states and drive stop for the
divergent seeds: 60 36 / 82 party menu; 79 4 / 13 party menu; 87 44 / 74 party menu; 89 45 / 122 party menu; 90 66 / 73 outcome; 94 36 / 39 outcome;
95 3 / 11 action menu; 107 3 / 11 action menu; 109 0 / 17 action menu; 114 1 / 13 party menu; 119 4 / 21 party menu; 123 3 / 9 action menu;
137 7 / 10 outcome; 138 5 / 10 party menu; 152 6 / 14 action menu; 159 52 / 64 party menu.
"party menu without a switch decision" / "action menu without a move decision" = the ROM opened a menu the engine had no decision for (decision-shape:
the engine's battle took another path earlier). Host note: on CAX31 a seed takes ~1.5 min alone and ~10 min beside the wind-down soaks at `nice 19`.
