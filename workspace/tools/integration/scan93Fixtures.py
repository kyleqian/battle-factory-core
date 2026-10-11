#!/usr/bin/env python3
"""scan93: liveAdapterFramebuffer.ts fixtures for the Extrasensory / Memento bodies of the scan93 scenarios (from a prep48Probe.py dir).

usage: scan93Fixtures.py <probe-dir> <fixture-dir>
The later58Fixtures.py recipe verbatim (executed from its source), with the scan93 scenario dir and two more carried predecessor units:
Psywave 149 and Dragon Dance 349 (move bodies; their General_StatsChange is the carried statAnimation unit); Memento windows
include the first inactive row (its live duration, as Extrasensory). Only Extrasensory and
Memento fixtures are kept. Fixturing stops at a faint + send-in, as in later58 (the after-Memento class is invalidated anyway).
"""
import sys
from pathlib import Path

src = Path("tools/integration/later58Fixtures.py").read_text()
src = src.replace('SCEN = Path("tools/integration/fixtures/later58/scenarios")', 'SCEN = Path("tools/integration/fixtures/scan93/scenarios")')
src = src.replace('"Move_SANDSTORM": 201,', '"Move_SANDSTORM": 201, "Move_PSYWAVE": 149, "Move_DRAGON_DANCE": 349,')
src = src.replace('"schema": "later58-live-adapter-fixture/v1"', '"schema": "scan93-live-adapter-fixture/v1"')
# Memento's live duration includes the first inactive row (the Extrasensory / Fury Cutter convention), so the whole body is compared.
src = src.replace('"Move_MEMENTO": ("MEMENTO", 262, 0)', '"Move_MEMENTO": ("MEMENTO", 262, 1)')
assert src.count("scan93") == 2 and "Move_PSYWAVE" in src
src = src.replace('print("\\n".join(written))', 'for name in written:\n    if not name.startswith(("xs-", "mem-")) or (json.loads((out_dir / name).read_text())["move"] not in ("EXTRASENSORY", "MEMENTO")):\n        (out_dir / name).unlink()\nprint(len([n for n in written if (out_dir / n).exists()]))')
exec(compile(src, "later58Fixtures.py(scan93)", "exec"))
