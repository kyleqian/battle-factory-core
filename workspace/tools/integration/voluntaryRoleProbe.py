#!/usr/bin/env python3
"""Occupant-role probe (docs/voluntary-switch-lend-audit.md s2.2; direct mGBA, Scene ON).  Replays a staged BattleLab scenario with the
frame numbering of postkoStateProbe.py and, on the frame before every activation rise listed in <state.json>, reads the ROM roles:
gBattlerSpriteIds[0..1]; gHealthboxSpriteIds[b] (main), that sprite's oam.affineParam (other half) and data[5] (bar);
gBattleSpritesDataPtr->healthBoxesData[1].shadowSpriteId (enemy shadow); plus each role sprite's inUse bit.
usage (through tools/run-mgba-probe.py): voluntaryRoleProbe.py <scenario.json> <state.json> <output.json>"""
from __future__ import annotations
import json, os, subprocess, sys
from pathlib import Path

SCENARIO, STATE, OUTPUT = (Path(a) for a in sys.argv[1:4])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REF = ROOT / "reference" / "pokeemerald"
N = {}
for line in subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(REF / "pokeemerald.elf")], check=True, capture_output=True,
                           text=True).stdout.splitlines():
    f = line.split()
    if len(f) == 3:
        N[f[2]] = int(f[0], 16)
SPRITE = 0x44


def main():
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    BattleLab(o, "battle-scene-on").prepare(request)
    u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
    want = {a["riseFrame"] - 1: a["riseFrame"] for a in json.loads(STATE.read_text())["activations"]}
    out = []

    def read(frame):
        spr = lambda s, off: N["gSprites"] + SPRITE * s + off
        boxes = []
        for b in range(2):
            main = u8(N["gHealthboxSpriteIds"] + b)
            boxes.append([main, u16(spr(main, 6)), u16(spr(main, 0x2E + 10))])
        hb = u32(u32(N["gBattleSpritesDataPtr"]) + 4)
        shadow = u8(hb + 12 + 7)
        battlers = [u8(N["gBattlerSpriteIds"] + b) for b in range(2)]
        slots = battlers + [s for box in boxes for s in box] + [shadow]
        return {"frame": frame, "riseFrame": want[frame], "battlers": battlers, "healthbox": boxes, "shadow": shadow,
                "inUse": [u8(spr(s, 0x3E)) & 1 for s in slots]}

    frame = 0
    if frame in want:
        out.append(read(frame))
    for seg in request["trace"]["segments"]:
        for _ in range(int(seg["frames"])):
            o.advance(seg.get("buttons", []))
            frame += 1
            if frame in want:
                out.append(read(frame))
    OUTPUT.write_text(json.dumps({"schema": "voluntary-roles/v1", "scenario": str(SCENARIO), "edges": out}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} edges={len(out)}")


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        os._exit(1)
    sys.stdout.flush()
    os._exit(0)
