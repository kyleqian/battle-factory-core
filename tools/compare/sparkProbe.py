#!/usr/bin/env python3
"""Semantic Scene-ON staging evidence for MOVE_SPARK; intentionally no pixel capture."""
from __future__ import annotations
import json, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: sparkProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_SPARK = 209

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    anim_attacker = oracle.symbols["gBattleAnimAttacker"]
    anim_target = oracle.symbols["gBattleAnimTarget"]
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != MOVE_SPARK:
            return
        rows.append({
            "frame": frame,
            "currentMove": snap["engine"]["currentMove"],
            "battleAnimAttacker": oracle.read_u8(anim_attacker),
            "battleAnimTarget": oracle.read_u8(anim_target),
            "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count),
            "player": snap["battlers"]["player"],
            "opponent": snap["battlers"]["opponent"],
        })
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    if not rows:
        raise RuntimeError("trace never reached MOVE_SPARK")
    active = [row["frame"] for row in rows if row["visualTaskCount"] or row["soundTaskCount"]]
    OUTPUT.write_text(json.dumps({
        "schema": "spark-staging-evidence/v1", "setup": setup, "frames": rows,
        "window": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
                   "frameCount": len(rows), "activeEffectsStartFrame": active[0] if active else None,
                   "activeEffectsEndFrame": active[-1] if active else None},
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} MOVE_SPARK frames; {rows[0]['frame']}..{rows[-1]['frame']})")

main()
