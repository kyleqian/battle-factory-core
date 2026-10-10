#!/usr/bin/env python3
"""Live audit 19: the Needle Arm 302 latent defect. One battle-lab scenario in a fresh direct mGBA process; for every frame of every
Move_NEEDLE_ARM body (activation .. first inactive frame) the free part of sSpriteOrder (without the known-entry occupied slots) and the
sSpritePriorities word of every slot in it (SortSprites' tie key with oam.y: a freed sprite keeps its last priority word).
usage: audit19NeedleFrames.py <scenario.json> <out.json>     (run through tools/run-mgba-probe.py like audit19Probe.py)
       audit19NeedleFrames.py --summary <out.json>          (every frame whose free order / in-use set changes, per Needle Arm body)
"""
import json, subprocess, sys
from pathlib import Path

if sys.argv[1] == "--summary":
    d = json.loads(Path(sys.argv[2]).read_text())
    for b in sorted({r["body"] for r in d["rows"]}):
        rs = [r for r in d["rows"] if r["body"] == b]
        print(f"body {b} (frames {rs[0]['frame']}..{rs[-1]['frame']})")
        prev = None
        for r in rs:
            if (r["order"], r["inUse"]) != prev:
                print(f"  {r['frame']:>5} inUse {r['inUse']} free order {r['order'][:16]}")
                prev = (r["order"], r["inUse"])
        print("  final priority words", {s: hex(rs[-1]["prio"][str(s)]) for s in rs[-1]["order"][:12]})
    raise SystemExit(0)

SCENARIO, OUTPUT = map(Path, sys.argv[1:3])
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
names = {p[2]: int(p[0], 16) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])}
u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
OCC = {62, 60, 0, 63, 1, 61, 6, 8, 2}
needle = names["Move_NEEDLE_ARM"]
rows, frame, body, was = [], 0, -1, False
for segment in request["trace"]["segments"]:
    for _ in range(segment["frames"]):
        oracle.advance(segment.get("buttons", []))
        frame += 1
        active = bool(u8(names["gAnimScriptActive"]))
        if active and not was:
            ptr = u32(names["sBattleAnimScriptPtr"])
            body = body + 1
            is_needle = needle <= ptr < needle + 0x200
        if (active or was) and body >= 0 and is_needle:
            order = [u8(names["sSpriteOrder"] + i) for i in range(64)]
            free = [s for s in order if s not in OCC]
            inuse = [s for s in free if u8(names["gSprites"] + s * 0x44 + 0x3E) & 1]
            rows.append({"frame": frame, "body": body, "active": active, "order": free[:24],
                         "inUse": sorted(inuse), "prio": {str(s): u16(names["sSpritePriorities"] + s * 2) for s in free[:24]}})
        was = active
OUTPUT.write_text(json.dumps({"scenario": SCENARIO.name, "rows": rows}, separators=(",", ":")))
