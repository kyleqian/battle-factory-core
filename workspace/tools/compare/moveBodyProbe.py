#!/usr/bin/env python3
"""qak247/qak249: minimal Scene-ON move-body RGB probe. usage: moveProbe.py <scenario> <out.json> <rgb-dir> <MoveSymbolStart> <MoveSymbolEnd> <moveId>"""
import hashlib, json, subprocess, sys
from pathlib import Path
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:4]); S0, S1, MOVE = sys.argv[4], sys.argv[5], int(sys.argv[6])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = (ROOT / "reference/pokeemerald").resolve()
request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
out = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
names = {}
for line in out.splitlines():
    p = line.split()
    if len(p) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0]): names[p[2]] = int(p[0], 16)
start, end, active, ptr = names[S0], names[S1], names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
RGB.mkdir(parents=True, exist_ok=True)
def u16(a): return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
def u32(a): return u16(a) | u16(a + 2) << 16
rows = []; frame = 0; seen_active = False; stop = False
def take():
    global frame, seen_active, stop
    snap = lab.snapshot()
    if snap["engine"]["currentMove"] != MOVE: return
    act = oracle.read_u8(active); script = u32(ptr); inwin = start <= script < end
    if act and inwin: seen_active = True
    if seen_active and not act: stop = True
    rgb = oracle.screen_rgb(); (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
    rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "active": act, "inWindow": inwin,
                 "hp": [snap["battlers"]["player"]["hp"], snap["battlers"]["player"]["maxHp"], snap["battlers"]["opponent"]["hp"], snap["battlers"]["opponent"]["maxHp"]] if isinstance(snap.get("battlers"), dict) and "player" in snap["battlers"] else None})
take()
for seg in request["trace"]["segments"]:
    for _ in range(seg["frames"]):
        oracle.advance(seg.get("buttons", [])); frame += 1; take()
        if stop: break
    if stop: break
first = next((i for i, r in enumerate(rows) if r["active"] and r["inWindow"]), None)
if first is None: raise SystemExit("body not observed")
last = next((i for i in range(first + 1, len(rows)) if not rows[i]["active"]), None)
if last is None: raise SystemExit("cleanup not observed")
src = rows[first:last + 1]
OUTPUT.write_text(json.dumps({"setup": setup, "sourceWindow": {"startFrame": src[0]["frame"], "endFrame": src[-1]["frame"], "frameCount": len(src)}, "frames": src, "hp": src[0]["hp"]}) + "\n")
print(f"window {src[0]['frame']}..{src[-1]['frame']} ({len(src)} frames) hp {src[0]['hp']}")
