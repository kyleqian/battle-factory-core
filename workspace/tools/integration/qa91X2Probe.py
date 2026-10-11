#!/usr/bin/env python3
"""qa91X2Probe.py: per-frame RAM x2 / y2 of both battler sprites (gSprites[gBattlerSpriteIds[b]]) around every battle-animation body of
one Scene-ON battle-lab scenario, in a fresh direct mGBA process (never the shared HTTP oracles). audit19Probe.py's setup and body edges
(gAnimScriptActive rising edge .. first inactive frame), no frames written.

usage: qa91X2Probe.py <scenario.json> <output.json>
Per body: label, attacker / target, startFrame / endFrame, and `x2` rows from activation - 2 to endFrame + 2: [frame, x2[0], y2[0], x2[1], y2[1]]
(battler 0 = player, 1 = opponent). `sendIn`: each frame a battler sprite's x2 / y2 changes outside a body (the send-out / idle bounce).
"""
from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: qa91X2Probe.py <scenario> <output.json>")
SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in pairs}
    labels = sorted((a, n) for a, n in pairs if n.startswith(("Move_", "General_", "Status_", "Special_")))
    label_addr = [a for a, _ in labels]
    sy = oracle.symbols
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    s16 = lambda a: (lambda v: v - 0x10000 if v >= 0x8000 else v)(u16(a))
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]

    def label_of(ptr: int) -> str | None:
        i = bisect.bisect_right(label_addr, ptr) - 1
        return labels[i][1] if i >= 0 else None

    def xy() -> list[int]:
        out: list[int] = []
        for b in range(2):
            sid = u8(names["gBattlerSpriteIds"] + b)
            out += [s16(sy["gSprites"] + sid * 0x44 + 0x24), s16(sy["gSprites"] + sid * 0x44 + 0x26)]
        return out

    bodies: list[dict] = []
    send_in: list[list[int]] = []
    history: list[list[int]] = []
    frame, was_active, tail, last = 0, False, 0, None

    def take() -> None:
        nonlocal was_active, tail, last
        is_active = bool(u8(active))
        row = [frame, *xy()]
        history.append(row)
        if is_active and not was_active:
            ptr = u32(pointer)
            bodies.append({"index": len(bodies), "startFrame": frame, "label": label_of(ptr),
                           "attacker": u8(names["gBattleAnimAttacker"]), "target": u8(names["gBattleAnimTarget"]),
                           "x2": history[-3:]})
        elif is_active or tail > 0:
            bodies[-1]["x2"].append(row)
        if not is_active and was_active:
            bodies[-1]["endFrame"] = frame
            tail = 3
        elif not is_active and tail > 0:
            tail -= 1
        if not is_active and not was_active and tail == 0 and last is not None and row[1:] != last[1:]:
            send_in.append(row)
        last = row
        was_active = is_active
        del history[:-3]

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    OUTPUT.write_text(json.dumps({"schema": "qa91-x2-probe/v1", "scenario": SCENARIO.name, "frameCount": frame, "bodies": bodies,
                                  "sendIn": send_in}, separators=(",", ":")))


main()
