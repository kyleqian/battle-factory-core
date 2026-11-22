# rtc1: the oracle's clock no longer depends on the host (2026-11-22)

The planning layer's decision (Kyle left it to them): fix the "re-drive once" replay flake found in opl3
(`docs/opl3-open-level-rom-replay.md`).

## The cause

`oracle/emerald_core.py` started the emulated real-time clock with `core.rtc.use_simulated_time()` and no argument. libmgba-py's
default is `starting_time=datetime.datetime.now()` (`vendor/libmgba-py/mgba/core.py:505`), evaluated once, when `mgba.core` is
imported: the process start time. libmgba turns the clock into the game's time with the host's `localtime` (`libmgba.0.10.dylib`
imports `localtime_r`), so the time zone mattered too. Once a day, a process started in a window of about 30 seconds (11:39:55 to
11:40:20 local on the Mac) got a ROM whose once-a-day update fell inside the run and drew other `Random()` values: another battle.

## The fix

`EmeraldOracle` passes a fixed start, `RTC_START = datetime.datetime(2026, 11, 22, 12, 0, 0)`, a naive (local) wall time, so every
process on every host shows the game the same clock whatever its time zone. 12:00:00 is outside the window, on the path every run
outside the window took, and the next daily rollover is 23 h 40 min of emulated time later, longer than any tool run (the longest,
a 2.5 M-frame replay drive, is about 11.6 h).

Every ROM tool builds its core through `EmeraldOracle` (`oracle/server.py`, `oracle/play-server.py`, `oracle/battle_lab.py`, the
frame catcher's `tools/frame-catcher/romRun.py`, `tools/openlevel/romlib.py`, `tools/audio/soundEventProbe.py` and the replay chain,
the luck hunt's drives, every probe under `tools/`); no other file in `oracle/` or `workspace/tools/` calls `mgba.core.load_path` or
touches the RTC. The oracle servers on :8012 / :8014 pick it up when they are restarted.

`tools/probe/rtcFakeHostClock.py` runs any mGBA tool as if its process had started at another host time (it sets the import-time
default the old code used).

## Proof

Host clock: `c7` seed 26 (the opl3 Open Level eighth-challenge request), the setup probe's menu gRngValue, with the host clock faked:

| host start | before the fix | after the fix |
|---|---|---|
| 11:39:55, 11:40:05, 11:40:20, next day 11:40:05 | 3449723833 (11:40:05) | 2488679507 (all four) |
| 12:10:05, 03:00:00 | 2488679507 (12:10:05) | 2488679507 |
| 11:40:05 with `TZ=UTC` | | 2488679507 |

Level 50 (and Open) unchanged:
- **Bootstrap profiles** (`factory.json`, `-battle-scene-off`, `factory-open*.json`, `factory-open-after-save.json`,
  `factory-pre-report.json`): the frame-0 screen sha and gRngValue identical with the fix and with the old code at any start time. The
  frame-0 RAM was never byte-stable before (46 bytes differed between two old start times, 12:10 and 15:00, 31 of them in
  SaveBlock1); with the fix it differs from an old 12:10:05 start in 7 bytes, all clock fields: `gLocalTime` and the save's
  `lastBerryTreeUpdate` minutes / seconds, the RTC registers `sRtc` +5 / +6, and `sMatchCallState`'s timer.
- **Tests:** `tests/oracleTooling.test.ts` and the oracle / bootstrap tests (4 files), `tools/test_*.py` (6) and
  `oracle/test_battle_lab.py` pass; the oracle smoke tests (`smoke-test.py`, `battle-lab-smoke-test.py`, `-brain-`, `-walkup-`,
  `report-preview-smoke-test.py`) pass against servers started from this tree on private ports.
- **Frame catcher**, Level 50 traces t3 and t8: findings identical to before the fix, and the ROM side's whole timeline (frames,
  sounds, menus, presses, per-turn battle states) identical.
- **ROM replay**, the last ledger line (2026-11-21: 40 pool seeds, silver 7383 / 8461, gold 3358 / 3407) and every
  `docs/parity-mac/stages/*.json` and `stages/coverage/*.json` (125 now; the ledger line had 110): **169 / 169 match**, every state
  of each (pool 44 / 44, 1,255 states; stages 125 / 125; 4,916 states in all, 0 wide-compare differences), no re-drive.

Evidence: `workspace/.integration/evidence/rtc1/` (not in git).
