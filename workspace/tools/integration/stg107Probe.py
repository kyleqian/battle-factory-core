#!/usr/bin/env python3
"""stg107 (docs/stg107-struggle.md): dense RAM rows of every Move_STRUGGLE body + the forced-Struggle turn timing, one battle-lab scenario
in a fresh direct mGBA process (never the shared HTTP oracles). The profile is the scenario's own (battle-scene-on / battle-scene-off).

usage: stg107Probe.py <scenario.json> <output.json>
Per frame (all profiles): both battlers' HP (gBattleMons) and the turn counter -> `events` (every change, with its frame) and `bodies`
(gAnimScriptActive rising edge .. first inactive frame, its script label). For each Move_STRUGGLE body, `rows` from the activation frame
(age 0) through the first inactive frame + 2: the RGB sha256 (16 hex), BLDCNT / BLDALPHA / DISPCNT / BG1CNT / BG2CNT, both battler
sprites' x2 / y2 / invisible, every sprite slot NOT in use on the frame before activation (slot, tileTag, x / y / x2 / y2, animNum /
animCmdIndex, attr0..2, invisible, subpriority), and those slots' positions in sSpriteOrder; the live task callbacks on change.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import bisect
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: stg107Probe.py <scenario.json> <output.json>")
SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    scenario = json.loads(SCENARIO.read_text())
    profile = scenario["profile"]
    request = validate_request(scenario, profile)
    ref = (ROOT / "reference/pokeemerald").resolve()
    bootstrap = "factory-battle-scene-off.json" if profile == "battle-scene-off" else "factory.json"  # oracle/server.py PROFILE_BOOTSTRAPS
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    lab = BattleLab(oracle, profile)
    lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    labels = sorted((a, n) for a, n in pairs if n.startswith(("Move_", "General_", "Status_", "Special_")))
    label_addr = [a for a, _ in labels]
    sy = oracle.symbols
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    s16 = lambda a: (lambda v: v - 0x10000 if v >= 0x8000 else v)(u16(a))
    sprites, mons, tasks = sy["gSprites"], sy["gBattleMons"], names.get("gTasks") or sy["gTasks"]
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    label_of = lambda ptr: (lambda i: labels[i][1] if i >= 0 else None)(bisect.bisect_right(label_addr, ptr) - 1)
    in_use = lambda: [u8(sprites + i * 0x44 + 0x3E) & 1 for i in range(64)]

    def sprite(slot: int) -> dict:
        a = sprites + slot * 0x44
        template = u32(a + 0x14)
        return {"slot": slot, "tileTag": u16(template) if template else None, "x": s16(a + 0x20), "y": s16(a + 0x22),
                "x2": s16(a + 0x24), "y2": s16(a + 0x26), "animNum": u8(a + 0x2A), "animCmdIndex": u8(a + 0x2B),
                "attr": [u16(a), u16(a + 2), u16(a + 4)], "invisible": bool(u8(a + 0x3E) & 4), "subpriority": u8(a + 0x43)}

    def battler(b: int) -> dict:
        sid = u8(names["gBattlerSpriteIds"] + b)
        return {"slot": sid, "x2": s16(sprites + sid * 0x44 + 0x24), "y2": s16(sprites + sid * 0x44 + 0x26),
                "invisible": bool(u8(sprites + sid * 0x44 + 0x3E) & 4)}

    def task_names() -> list[str]:
        return [by_address.get(u32(tasks + s * 0x28) & ~1, hex(u32(tasks + s * 0x28))) for s in range(16) if u8(tasks + s * 0x28 + 4)]

    hp = lambda: [u16(mons + b * 0x58 + 0x28) for b in range(2)]
    turn = lambda: u8(names["gBattleResults"] + 0x13)
    events: list[dict] = []
    bodies: list[dict] = []
    state = {"frame": 0, "was": False, "tail": 0, "prevUse": in_use(), "entry": None, "hp": hp(), "turn": turn(), "tasks": None}

    def take() -> None:
        frame = state["frame"]
        is_active = bool(u8(active))
        use = in_use()
        h, t = hp(), turn()
        if h != state["hp"]:
            events.append({"frame": frame, "hp": h})
            state["hp"] = h
        if t != state["turn"]:
            events.append({"frame": frame, "turnCounter": t})
            state["turn"] = t
        if is_active and not state["was"]:
            ptr = u32(pointer)
            bodies.append({"startFrame": frame, "label": label_of(ptr), "attacker": u8(names["gBattleAnimAttacker"]),
                           "target": u8(names["gBattleAnimTarget"]), "hp": h, "turnCounter": t,
                           "species": [u16(mons + b * 0x58) for b in range(2)]})
            state["entry"] = [i for i in range(64) if state["prevUse"][i]] if bodies[-1]["label"] == "Move_STRUGGLE" else None
            state["tasks"] = None
            if state["entry"] is not None:
                bodies[-1]["entryInUse"] = state["entry"]
                bodies[-1]["rows"] = []
        if not is_active and state["was"]:
            bodies[-1]["endFrame"] = frame
            bodies[-1]["length"] = frame - bodies[-1]["startFrame"]
            state["tail"] = 3 if state["entry"] is not None else 0
        if state["entry"] is not None and (is_active or state["tail"] > 0):
            body = bodies[-1]
            order = list(bytes(u8(names["sSpriteOrder"] + i) for i in range(64)))
            new = [i for i in range(64) if use[i] and i not in state["entry"]]
            row = {"age": frame - body["startFrame"], "sha": hashlib.sha256(oracle.screen_rgb()).hexdigest()[:16] if profile == "battle-scene-on" else None,
                   "regs": {"dispcnt": u16(0x04000000), "bg1cnt": u16(0x0400000A), "bg2cnt": u16(0x0400000C), "bldcnt": u16(0x04000050),
                            "bldalpha": u16(0x04000052)},
                   "battlers": [battler(0), battler(1)], "sprites": [sprite(i) for i in new], "orderPos": {str(i): order.index(i) for i in new}}
            tn = task_names()
            if tn != state["tasks"]:
                row["tasks"] = tn
                state["tasks"] = tn
            body["rows"].append(row)
            if not is_active:
                state["tail"] -= 1
                if state["tail"] == 0:
                    state["entry"] = None
        state["was"] = is_active
        state["prevUse"] = use

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            state["frame"] += 1
            take()
    OUTPUT.write_text(json.dumps({"schema": "stg107-probe/v1", "scenario": SCENARIO.name, "profile": profile, "frameCount": state["frame"],
                                  "bodies": bodies, "events": events}, separators=(",", ":")) + "\n")


main()
