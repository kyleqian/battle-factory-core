#!/usr/bin/env python3
"""Dense MOVE_WATER_GUN RAM/OAM/RGB evidence for legal mechanicLab fixtures."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit("usage: waterGunProbe.py <scenario> <output.json> <rgb-dir> <start-frame>")
SCENARIO, OUTPUT, RGB_DIR, START = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), int(sys.argv[4])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir()
    sprites, matrices = oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    callbacks = {name: oracle.symbols[name] | 1 for name in (
        "AnimTranslateLinear_WithFollowup", "RunStoredCallbackWhenAffineAnimEnds",
    )}
    nm = subprocess.run(
        ["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    callbacks["AnimThrowProjectile_Step"] = int(next(
        line.split()[0] for line in nm.splitlines()
        if line.endswith(" AnimThrowProjectile_Step")
    ), 16) | 1
    templates = {name: oracle.symbols[name] for name in (
        "gWaterGunProjectileSpriteTemplate", "gWaterGunDropletSpriteTemplate",
        "gWaterHitSplatSpriteTemplate",
    )}
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix = matrices + ((u16(base + 2) >> 9) & 0x1f) * 8
        return {"slot":slot,"attr0":u16(base),"attr1":u16(base+2),"attr2":u16(base+4),
                "x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),
                "template":oracle.read_u32(base+0x14),"callback":oracle.read_u32(base+0x1c),"subpriority":oracle.read_u8(base+0x43),
                "matrix":{"a":s16(matrix),"b":s16(matrix+2),"c":s16(matrix+4),"d":s16(matrix+6)},
                "data":[s16(base+0x2e+i*2) for i in range(8)]}
    def battler(i: int) -> dict: return sprite(oracle.read_u8(battler_ids + i))
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if frame < START or snap["engine"]["currentMove"] != 55: return
        active = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base+0x3e) & 1:
                item = sprite(slot)
                if item["template"] in templates.values(): active.append(item)
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"player":snap["battlers"]["player"],
                     "opponent":snap["battlers"]["opponent"],"playerSprite":battler(0),"opponentSprite":battler(1),
                     "sprites":active,"bldcnt":u16(0x04000050),"bldalpha":u16(0x04000052)})
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    OUTPUT.write_text(json.dumps({"schema":"water-gun-dense-evidence/v1","setup":setup,"callbacks":callbacks,"templates":templates,"frames":rows}) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")
main()
