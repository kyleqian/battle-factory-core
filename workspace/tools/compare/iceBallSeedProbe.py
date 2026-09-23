#!/usr/bin/env python3
"""Find a natural five-hit Ice Ball counter sequence for a staged request.

This is deliberately a logic-only companion to iceBallProbe.py: it observes
the ROM's source-script interval and counter argument, without changing any
battle state or fabricating a result.  Invoke it through run-mgba-probe.py.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: iceBallSeedProbe.py <scenario.json> <output.json> <seed>")
SCENARIO, OUTPUT, SEED = map(Path, (sys.argv[1], sys.argv[2], sys.argv[3]))
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = json.loads(SCENARIO.read_text())
    request["seed"] = int(str(SEED), 0)
    request = validate_request(request, "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in pairs}
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, end = names["Move_ICE_BALL"], names["Move_WEATHER_BALL"]
    args = names["gBattleAnimArgs"]

    def u8(address: int) -> int:
        return oracle.read_u8(address)

    def u16(address: int) -> int:
        return u8(address) | (u8(address + 1) << 8)

    bodies: list[list[dict[str, object]]] = []
    frame = 0
    capturing = False

    def take() -> None:
        nonlocal capturing
        script = u32(pointer)
        in_source = start <= script < end and bool(u8(active))
        if in_source and not capturing:
            bodies.append([])
            capturing = True
        if capturing:
            bodies[-1].append({"frame": frame, "counter": u16(args), "scriptOffset": script - start if start <= script < end else None})
        if capturing and not bool(u8(active)):
            capturing = False

    def u32(address: int) -> int:
        return u16(address) | (u16(address + 2) << 16)

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
            if len(bodies) >= 5 and not capturing:
                break
        if len(bodies) >= 5 and not capturing:
            break
    for tail in range(9000):
        if len(bodies) >= 5 and not capturing:
            break
        oracle.advance(["A"] if tail % 30 < 2 else [])
        frame += 1
        take()

    result = {
        "schema": "ice-ball-seed-probe/v1",
        "seed": int(str(SEED), 0),
        "sourceWindows": [{"body": i + 1, "startFrame": body[0]["frame"], "endFrame": body[-1]["frame"], "frameCount": len(body)} for i, body in enumerate(bodies)],
        "counterValues": [sorted({int(row["counter"]) for row in body if int(row["counter"]) <= 4}) for body in bodies],
        "completeFiveBodyLifecycle": len(bodies) == 5 and [sorted({int(row["counter"]) for row in body if int(row["counter"]) <= 4}) for body in bodies] == [[0], [1], [2], [3], [4]],
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
