#!/usr/bin/env python3
"""#143 diagnosis, ROM side (direct mGBA, never the shared oracle): at a chosen frame of a staged CASTFORM scenario, dump both battler
sprites' gSprites struct / OAM attrs / OBJ palette bank / VRAM tiles / gBattleMonForms, and compare the VRAM pixels with the app's
extracted pic (src/assets/gen/battle-{back,opponent-front}-sprites.json).
usage (through tools/run-mgba-probe.py): castformDiagRom.py <scenario.json> <out.json> [frame=79]
"""
import json, sys
from pathlib import Path
SCEN, OUT = map(Path, sys.argv[1:3]); FRAME = int(sys.argv[3]) if len(sys.argv) > 3 else 79
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
ref = ROOT / "reference" / "pokeemerald"
raw = json.loads(SCEN.read_text()); prof = raw.get("profile", "battle-scene-on")
req = validate_request(raw, prof)
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" /
                  ("factory.json" if prof == "battle-scene-on" else "factory-battle-scene-off.json"))
lab = BattleLab(o, prof); lab.prepare(req)
f = 0
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        if f == FRAME: break
        o.advance(seg.get("buttons", [])); f += 1
    if f == FRAME: break
S = o.symbols
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
def s16(a):
    v = u16(a); return v - 0x10000 if v >= 0x8000 else v
def s8(a):
    v = u8(a); return v - 256 if v >= 128 else v
SHAPE = {(0, 0): "8x8", (0, 1): "16x16", (0, 2): "32x32", (0, 3): "64x64", (1, 0): "16x8", (1, 1): "32x8", (1, 2): "32x16", (1, 3): "64x32",
         (2, 0): "8x16", (2, 1): "8x32", (2, 2): "16x32", (2, 3): "32x64"}
battle_mons = S["gBattleMons"]; forms = S["gBattleMonForms"]; ids = S["gBattlerSpriteIds"]
out = {"scenario": str(SCEN), "profile": prof, "frame": f, "battlers": {}}
back = json.loads((ROOT / "src/assets/gen/battle-back-sprites.json").read_text())["CASTFORM"]
front = json.loads((ROOT / "src/assets/gen/battle-opponent-front-sprites.json").read_text())["CASTFORM"]
def app_pixels(pic, key=None):
    ts = pic["tileset"] if key is None else pic[key]
    rows = []
    for y in range(64):
        rows.append([ts["tiles"][(y // 8) * ts["columns"] + x // 8][(y % 8) * 8 + x % 8] for x in range(64)])
    return rows
for b, side in ((0, "player"), (1, "opponent")):
    base = S["gSprites"] + u8(ids + b) * 0x44
    a0, a1, a2 = u16(base), u16(base + 2), u16(base + 4)
    shape, size = (a0 >> 14) & 3, (a1 >> 14) & 3
    tile, bank = a2 & 0x3FF, (a2 >> 12) & 0xF
    w, h = map(int, SHAPE[(shape, size)].split("x"))
    # 1D OBJ mapping (DISPCNT bit 6): tiles are consecutive
    dispcnt = u16(0x04000000)
    vram = [u8(0x06010000 + tile * 32 + i) for i in range(w * h // 2)]
    px = [[0] * w for _ in range(h)]
    for t in range((w // 8) * (h // 8)):
        tx, ty = t % (w // 8), t // (w // 8)
        for i in range(32):
            byte = vram[t * 32 + i]; r, c = i // 4, (i % 4) * 2
            px[ty * 8 + r][tx * 8 + c] = byte & 15; px[ty * 8 + r][tx * 8 + c + 1] = byte >> 4
    pal = [u16(0x05000200 + bank * 32 + i * 2) for i in range(16)]
    pic = app_pixels(back if side == "player" else front)
    best = None
    for dy in range(-16, 17):
        n = sum(px[y][x] != (pic[y + dy][x] if 0 <= y + dy < 64 else 0) for y in range(h) for x in range(w))
        if best is None or n < best[0]: best = (n, dy)
    zero = sum(px[y][x] != pic[y][x] for y in range(min(h, 64)) for x in range(min(w, 64)))
    out["battlers"][side] = {
        "species": u16(battle_mons + b * 0x58), "gBattleMonForms": u8(forms + b),
        "sprite": {"slot": u8(ids + b), "oamAttr": [a0, a1, a2], "shape": SHAPE[(shape, size)], "affine": (a0 >> 8) & 3,
                   "tileNum": tile, "paletteBank": bank, "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24),
                   "y2": s16(base + 0x26), "centerToCorner": [s8(base + 0x28), s8(base + 0x29)], "animNum": u8(base + 0x2A),
                   "oamX": a1 & 0x1FF, "oamY": a0 & 0xFF, "dispcnt": dispcnt},
        "objPalette": pal,
        "vramPixelMismatchVsAppPic": {"shiftZero": zero, "bestShift": {"dy": best[1], "mismatch": best[0]}},
        "vramRows": ["".join("0123456789abcdef"[v] for v in r) for r in px],
    }
OUT.write_text(json.dumps(out, indent=1))
