#!/usr/bin/env python3
"""Adapt Supersonic's source probe to the live-adapter probe contract.

The source receipt deliberately takes the first source-owned frame as a
fourth argument because player- and opponent-front battle setup settle on
different global frames.  The live adapter verifier supplies only a complete
mechanicLab scenario, output path, and raw-RGB directory, so derive that
source-owned start from the legal side carrying MOVE_SUPERSONIC rather than
from any captured frame data.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


if len(sys.argv) != 4:
    raise SystemExit(
        "usage: statusBatchSupersonicProbe.py <scenario> <output.json> <rgb-dir>"
    )


def has_supersonic(mon: object) -> bool:
    return isinstance(mon, dict) and 48 in mon.get("moves", [])


def main() -> None:
    scenario, output, rgb_dir = map(Path, sys.argv[1:])
    request = json.loads(scenario.read_text())
    parties = request["overrides"]["parties"]
    player_has_move = has_supersonic(parties["player"][0])
    opponent_has_move = has_supersonic(parties["opponent"][0])
    if player_has_move == opponent_has_move:
        raise SystemExit("expected exactly one active MOVE_SUPERSONIC carrier")
    start = 80 if player_has_move else 84
    root = Path(__file__).resolve().parents[2]
    probe = root / "tools" / "compare" / "supersonicProbe.py"
    subprocess.run(
        [sys.executable, str(probe), str(scenario), str(output), str(rgb_dir), str(start)],
        check=True,
    )


main()
