#!/usr/bin/env python3
"""Discover Magnitude's regular/intense branch from stock ROM execution only."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) < 3:
    raise SystemExit("usage: magnitudeBranchProbe.py <scenario> <output.json> [seed ...]")
SCENARIO = Path(sys.argv[1]).resolve()
OUTPUT = Path(sys.argv[2]).resolve()
SEEDS = [int(seed) for seed in sys.argv[3:]]
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_START = 0x082CD8B0
MAGNITUDE_END = 0x082CD8C8
COMPLEX_TEMPLATE = 0x0859728C


def symbol_names(ref: Path) -> dict[str, int]:
    text = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    return {parts[2]: int(parts[0], 16) for line in text.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])}


def run(seed: int, template_names: dict[str, int]) -> dict:
    request = json.loads(SCENARIO.read_text())
    request["seed"] = seed
    request["trace"] = {"segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 650, "buttons": []}]}
    request = validate_request(request, "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); lab.prepare(request)
    sy = oracle.symbols; sprites = sy["gSprites"]
    active = template_names["gAnimScriptActive"]
    pointer = template_names["sBattleAnimScriptPtr"]
    complex_template = template_names["gComplexPaletteBlendSpriteTemplate"]
    u8 = lambda address: oracle.read_u8(address)
    u32 = lambda address: u8(address) | u8(address + 1) << 8 | u8(address + 2) << 16 | u8(address + 3) << 24
    frame = 0; started = False; intense = False; start_frame = None; end_frame = None

    def step() -> None:
        nonlocal started, intense, start_frame, end_frame
        script = u32(pointer)
        if u8(active) and script == MOVE_START:
            started = True
            if start_frame is None: start_frame = frame
        if started:
            for slot in range(64):
                base = sprites + slot * 0x44
                if u8(base + 0x3E) & 1 and (u32(base + 0x14) & ~1) == (complex_template & ~1): intense = True
            if not u8(active) and end_frame is None: end_frame = frame

    step()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; step()
            if end_frame is not None: break
        if end_frame is not None: break
    return {"seed": seed, "branch": "intense" if intense else "regular", "startFrame": start_frame, "endFrame": end_frame, "frames": (end_frame - start_frame + 1) if start_frame is not None and end_frame is not None else None}


def main() -> None:
    ref = (ROOT / "reference/pokeemerald").resolve()
    names = symbol_names(ref)
    result = {"schema": "magnitude-branch-discovery/v1", "profile": "battle-scene-on", "move": 222, "scenario": str(SCENARIO.relative_to(ROOT)), "runs": [run(seed, names) for seed in SEEDS]}
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
