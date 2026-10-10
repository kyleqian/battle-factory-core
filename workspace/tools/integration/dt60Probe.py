#!/usr/bin/env python3
"""dt60: Double Team (104) clone-phase RAM probe (fresh direct mGBA process; never the shared HTTP oracles).

usage: dt60Probe.py <scenario.json> <output.json> [frames-after-activation=12]
For every Move_DOUBLE_TEAM body (gAnimScriptActive rising edge; prep48Probe.py frame numbering: frame 0 = after BattleLab.prepare,
frame n = after n trace frames) records, on the frame BEFORE activation and on each of the next N frames: both battler sprites'
callback / data[0..7] / x2 / y2, every in-use sprite whose callback is AnimDoubleTeam (slot, data[0..7], x2, y2), the task list in
RunTasks order (head = prev 0xFE, follow next) with func / priority / data[0..3], gAnimFramesToWait and the script pointer.
Also records, for the whole trace, each frame where a battler sprite's data[3] changes (the value the clone inherits).
"""
from __future__ import annotations

import bisect
import json
import subprocess
import sys
from pathlib import Path

SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
AFTER = int(sys.argv[3]) if len(sys.argv) > 3 else 12
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
ref = (ROOT / "reference/pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
lab = BattleLab(oracle, "battle-scene-on")
lab.prepare(request)
nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
names = {name: address for address, name in pairs}
funcs = sorted((a, n) for a, n in pairs if a >= 0x08000000)
func_addr = [a for a, _ in funcs]
labels = sorted((a, n) for a, n in pairs if n.startswith(("Move_", "General_", "Status_", "Special_")))
label_addr = [a for a, _ in labels]
u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
s16 = lambda a: (lambda v: v - 0x10000 if v >= 0x8000 else v)(u16(a))
SPRITES, TASKS = names["gSprites"], names["gTasks"]
ANIM_DT = names["AnimDoubleTeam"]


def fname(ptr: int) -> str:
    ptr &= ~1
    i = bisect.bisect_right(func_addr, ptr) - 1
    if i < 0:
        return hex(ptr)
    a, n = funcs[i]
    return n if a == ptr else f"{n}+{ptr - a:#x}"


def label_of(ptr: int) -> str | None:
    i = bisect.bisect_right(label_addr, ptr) - 1
    return labels[i][1] if i >= 0 else None


def sprite(sid: int) -> dict:
    b = SPRITES + sid * 0x44
    return {"slot": sid, "callback": fname(u32(b + 0x1C)), "x": s16(b + 0x20), "y": s16(b + 0x22), "x2": s16(b + 0x24), "y2": s16(b + 0x26),
            "data": [s16(b + 0x2E + 2 * i) for i in range(8)], "inUse": bool(u8(b + 0x3E) & 1), "invisible": bool(u8(b + 0x3E) & 4),
            "oam": [u16(b + 2 * i) for i in range(3)], "anims": hex(u32(b + 0x08)), "images": hex(u32(b + 0x0C)), "animNum": u8(b + 0x2A),
            "animCmdIndex": u8(b + 0x2B), "animDelay": u8(b + 0x2C), "flags": hex(u16(b + 0x3E)), "sheetTileStart": u16(b + 0x40),
            "subpriority": u8(b + 0x43)}


def battler_sprites() -> list[dict]:
    return [sprite(u8(names["gBattlerSpriteIds"] + b)) for b in range(2)]


def tasks_in_order() -> list[dict]:
    head = next((s for s in range(16) if u8(TASKS + s * 0x28 + 4) and u8(TASKS + s * 0x28 + 5) == 0xFE), None)
    out, s, seen = [], head, set()
    while s is not None and s < 16 and s not in seen:
        seen.add(s)
        t = TASKS + s * 0x28
        out.append({"slot": s, "func": fname(u32(t)), "priority": u8(t + 7), "data": [s16(t + 8 + 2 * i) for i in range(4)]})
        nxt = u8(t + 6)
        s = None if nxt == 0xFF else nxt
    return out


def snapshot(frame: int) -> dict:
    clones = [sprite(s) for s in range(64) if u8(SPRITES + s * 0x44 + 0x3E) & 1 and (u32(SPRITES + s * 0x44 + 0x1C) & ~1) == (ANIM_DT & ~1)]
    order = [u8(names["sSpriteOrder"] + i) for i in range(64)]
    return {"frame": frame, "battlers": battler_sprites(), "clones": clones, "tasks": tasks_in_order(),
            "spriteOrder": [s for s in order if s in (3, 4) or s in [c["slot"] for c in clones] or s in [u8(names["gBattlerSpriteIds"] + b) for b in range(2)]],
            "animFramesToWait": s16(names["gAnimFramesToWait"]) if "gAnimFramesToWait" in names else None,
            "scriptActive": u8(names["gAnimScriptActive"]), "scriptPtr": u32(names["sBattleAnimScriptPtr"])}


bodies: list[dict] = []
data3_changes: list[dict] = []
frame, was_active, pending, prev, last_d3 = 0, False, None, snapshot(0), None
species = lambda b: u16(names["gBattleMons"] + b * 0x58)
for segment in request["trace"]["segments"]:
    for _ in range(segment["frames"]):
        oracle.advance(segment.get("buttons", []))
        frame += 1
        is_active = bool(u8(names["gAnimScriptActive"]))
        bs = battler_sprites()
        d3 = [(s["slot"], s["data"][3]) for s in bs]
        if d3 != last_d3:
            data3_changes.append({"frame": frame, "battlers": [{"slot": s["slot"], "callback": s["callback"], "data": s["data"]} for s in bs]})
            last_d3 = d3
        if is_active and not was_active:
            label = label_of(u32(names["sBattleAnimScriptPtr"]))
            if label == "Move_DOUBLE_TEAM":
                pending = {"activation": frame, "attacker": u8(names["gBattleAnimAttacker"]), "species": [species(0), species(1)],
                           "pre": prev, "rows": []}
                bodies.append(pending)
        if pending is not None:
            pending["rows"].append(snapshot(frame))
            if frame - pending["activation"] >= AFTER:
                pending = None
        was_active = is_active
        prev = snapshot(frame) if not is_active else prev
OUTPUT.write_text(json.dumps({"schema": "dt60-probe/v1", "scenario": SCENARIO.name, "frameCount": frame, "bodies": bodies,
                              "battlerData3Changes": data3_changes}, separators=(",", ":")) + "\n")
