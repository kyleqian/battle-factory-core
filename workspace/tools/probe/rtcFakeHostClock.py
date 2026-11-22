#!/usr/bin/env python3
"""Run an mGBA tool as if its process had started at another host time (rtc1, docs/rtc1-oracle-clock.md).

libmgba-py's `RTC.use_simulated_time(starting_time=datetime.datetime.now())` takes its default once, when `mgba.core` is imported, so
the host clock at process start used to reach the ROM through the emulated real-time clock. This wrapper imports `mgba.core`, replaces
that default with the given time (what a process started then would have), and runs the tool in this process. With the oracle's
pinned start time (`oracle/emerald_core.py` RTC_START) the default is never used, so the tool's result no longer depends on it.

  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/probe/rtcFakeHostClock.py 2026-11-22T11:40:05 TOOL.py [TOOL ARGS ...]
"""
import datetime
import runpy
import sys

import mgba.core  # noqa: E402  (PYTHONPATH = <pokebench>/vendor/libmgba-py)


def main():
    when = datetime.datetime.fromisoformat(sys.argv[1])
    mgba.core.RTC.use_simulated_time.__defaults__ = (when,)
    sys.argv = sys.argv[2:]
    runpy.run_path(sys.argv[0], run_name="__main__")


if __name__ == "__main__":
    main()
