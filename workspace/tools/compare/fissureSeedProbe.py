#!/usr/bin/env python3
"""Find deterministic seeds that naturally enter the Fissure animation."""
from __future__ import annotations

import copy
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) < 5:
    raise SystemExit(
        "usage: fissureSeedProbe.py <scenario> <output.json> <first-seed> <count>"
    )

SCENARIO = Path(sys.argv[1])
OUTPUT = Path(sys.argv[2])
FIRST_SEED = int(sys.argv[3], 0)
COUNT = int(sys.argv[4], 0)
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    parent
    for parent in (ROOT, *ROOT.parents)
    if (parent / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def symbol_addresses(elf: Path) -> dict[str, int]:
    output = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(elf)],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return {
        parts[2]: int(parts[0], 16)
        for line in output.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    }


def run_seed(
    base: dict[str, object],
    seed: int,
    names: dict[str, int],
    oracle: EmeraldOracle,
    lab: BattleLab,
) -> dict[str, object]:
    request = copy.deepcopy(base)
    request["seed"] = seed
    lab.prepare(request)
    pointer = names["sBattleAnimScriptPtr"]
    start = names["Move_FISSURE"]
    end = names["Move_DIG"]
    seen_moves: set[int] = set()
    entered_at: int | None = None
    frame = 0

    for segment in request["trace"]["segments"]:  # type: ignore[index]
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            seen_moves.add(lab.snapshot()["engine"]["currentMove"])
            script = oracle.read_u8(pointer) | oracle.read_u8(pointer + 1) << 8
            script |= (oracle.read_u8(pointer + 2) | oracle.read_u8(pointer + 3) << 8) << 16
            if start <= script < end:
                entered_at = frame
                break
        if entered_at is not None:
            break

    return {
        "seed": seed,
        "enteredFissure": entered_at is not None,
        "enteredAt": entered_at,
        "seenMoves": sorted(seen_moves),
    }


def main() -> None:
    base = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    names = symbol_addresses(ref / "pokeemerald.elf")
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba",
        ref / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    rows = [
        run_seed(base, FIRST_SEED + offset, names, oracle, lab)
        for offset in range(COUNT)
    ]
    result = {
        "schema": "fissure-seed-probe/v1",
        "scenario": str(SCENARIO),
        "sourceRule": "Random() % 100 + 1 < 30 at equal levels",
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
