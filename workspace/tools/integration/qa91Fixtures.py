#!/usr/bin/env python3
"""qa91: audit21Fixtures.py, unchanged, over the qa91 scenarios (its SCEN constant re-pointed to tools/integration/fixtures/qa91/scenarios).
usage: qa91Fixtures.py <probe-dir> <fixture-dir>
"""
from pathlib import Path

SRC = Path(__file__).with_name("audit21Fixtures.py").read_text()
OLD = 'SCEN = Path("tools/integration/fixtures/audit-21/scenarios")'
assert SRC.count(OLD) == 1
exec(compile(SRC.replace(OLD, 'SCEN = Path("tools/integration/fixtures/qa91/scenarios")'), "audit21Fixtures.py", "exec"))
