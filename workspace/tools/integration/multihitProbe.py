#!/usr/bin/env python3
"""Multi-hit prep probe (Scene ON, direct mGBA): per-hit activation windows for Double Slap/Comet Punch/Triple Kick.

usage: multihitProbe.py <scenario.json> <output.json> <rgb-dir> <moveId>
Detection is allocatorNetZeroProbe.py's: gAnimScriptActive rising edge with sAnimMoveIndex == moveId. For every frame
records gAnimMoveTurn, script pointer, both battler sprite x2/x, HPs, and hashes of the field (rows 0-111) and message
chrome (rows 112-159). RGB frames named %05d.rgb (liveAdapterFramebuffer.ts layout) are kept for each hit window
(first active frame .. first inactive frame) and the frame before it. Output has "frames" (harness shape) and "hits".
"""
import hashlib, json, subprocess, sys
from pathlib import Path
SCEN, OUT, RGB = map(Path, sys.argv[1:4]); MOVE = int(sys.argv[4])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
req = validate_request(json.loads(SCEN.read_text()), "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
sy = o.symbols
sprites, ids = sy["gSprites"], sy["gBattlerSpriteIds"]
RGB.mkdir(parents=True, exist_ok=True)
def u16(a): return o.read_u8(a) | o.read_u8(a + 1) << 8
def s16(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def spr(b):
    base = sprites + o.read_u8(ids + b) * 0x44
    return [s16(base + 0x20), s16(base + 0x24)]  # x, x2
frames, prev_rgb = [], None
def sample(fr):
    global prev_rgb
    active = bool(o.read_u8(sym["gAnimScriptActive"]))
    mv = u16(sym["sAnimMoveIndex"])
    rgb = o.screen_rgb()
    row = {"frame": fr, "sha256": hashlib.sha256(rgb).hexdigest(), "active": active and mv == MOVE, "move": mv,
           "turn": o.read_u8(sym["gAnimMoveTurn"]), "ptr": o.read_u32(sym["sBattleAnimScriptPtr"]),
           "p": spr(0), "o": spr(1),
           "field": hashlib.sha256(rgb[:240 * 112 * 3]).hexdigest()[:16], "chrome": hashlib.sha256(rgb[240 * 112 * 3:]).hexdigest()[:16]}
    snap = lab.snapshot()
    row["hp"] = [snap["battlers"][k].get("hp") for k in ("player", "opponent")]
    row["maxHp"] = [snap["battlers"][k].get("maxHp") for k in ("player", "opponent")]
    frames.append(row)
    return rgb
rgbs = {}
rgbs[0] = sample(0); f = 0
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        o.advance(seg.get("buttons", [])); f += 1; rgbs[f] = sample(f)
hits, cur = [], None
for r in frames:
    if r["active"] and cur is None:
        cur = {"hit": len(hits), "start": r["frame"], "turnAtActivation": r["turn"]}
    elif not r["active"] and cur is not None:
        cur["end"] = r["frame"]; hits.append(cur); cur = None
keep = set()
for h in hits:
    keep.update(range(max(0, h["start"] - 1), h["end"] + 1))
for fr in sorted(keep): (RGB / f"{fr:05d}.rgb").write_bytes(rgbs[fr])
for h in hits:
    rows = [r for r in frames if h["start"] <= r["frame"] <= h["end"]]
    h["frameCount"] = len(rows); h["turnsSeen"] = sorted({r["turn"] for r in rows})
    h["targetX2AtStart"] = {"p": frames[h["start"]]["p"], "o": frames[h["start"]]["o"], "beforeStart": frames[h["start"] - 1]["p"] + frames[h["start"] - 1]["o"]}
    h["chromeHashesInWindow"] = sorted({r["chrome"] for r in rows}); h["chromeAtStart"] = frames[h["start"]]["chrome"]
    h["hpAtStart"] = frames[h["start"]]["hp"]; h["hpAtEnd"] = frames[h["end"]]["hp"]
OUT.write_text(json.dumps({"move": MOVE, "frames": [{"frame": r["frame"], "sha256": r["sha256"]} for r in frames if r["frame"] in keep],
                           "trace": frames, "hits": hits}))
print(OUT, [(h["start"], h["end"], h["turnAtActivation"]) for h in hits])
