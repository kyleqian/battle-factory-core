#!/usr/bin/env python3
"""Fresh dense Scene-ON evidence for legal Factory MOVE_TAIL_GLOW."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: tailGlowProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_TAIL_GLOW = 294

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sprites, matrices = oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols = {p[2]: int(p[0], 16) | 1 for line in nm.splitlines()
               if len(p := line.split()) == 3}
    palette_tags = symbols["sSpritePaletteTags"] & ~1
    def u16(a: int) -> int:
        return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def s16(a: int) -> int:
        value = u16(a)
        return value - 0x10000 if value >= 0x8000 else value
    def s8(a: int) -> int:
        value = oracle.read_u8(a)
        return value - 0x100 if value >= 0x80 else value
    rows, frame = [], 0
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            if lab.snapshot()["engine"]["currentMove"] != MOVE_TAIL_GLOW:
                continue
            active = []
            for slot in range(64):
                base = sprites + slot * 0x44
                if not oracle.read_u8(base + 0x3e) & 1:
                    continue
                matrix_num = u16(base + 2) >> 9 & 0x1f
                matrix = matrices + matrix_num * 8
                active.append({
                    "slot": slot, "template": oracle.read_u32(base + 0x14),
                    "x": s16(base + 0x20), "y": s16(base + 0x22),
                    "x2": s16(base + 0x24), "y2": s16(base + 0x26),
                    "attr0": u16(base), "attr1": u16(base + 2), "attr2": u16(base + 4),
                    "matrixNum": matrix_num, "subpriority": oracle.read_u8(base + 0x43),
                    "matrix": {"a": s16(matrix), "b": s16(matrix + 2),
                               "c": s16(matrix + 4), "d": s16(matrix + 6)},
                    "data": [s16(base + 0x2e + i * 2) for i in range(8)],
                })
            attacker = oracle.read_u8(oracle.symbols["gBattleAnimAttacker"])
            battler_slot = oracle.read_u8(battler_ids + attacker)
            rgb = oracle.screen_rgb()
            rows.append({
                "frame": frame, "attacker": attacker,
                "sha256": hashlib.sha256(rgb).hexdigest(),
                "visualTaskCount": oracle.read_u8(visual_count),
                "soundTaskCount": oracle.read_u8(sound_count),
                "battler": next(item for item in active if item["slot"] == battler_slot),
                "active": active,
                "hardwareOam": [[u16(0x07000000+i*8+j) for j in (0, 2, 4)]
                                for i in range(128)],
                "hardwareMatrices": [
                    {"a": s16(0x07000006+i*0x20), "b": s16(0x0700000e+i*0x20),
                     "c": s16(0x07000016+i*0x20), "d": s16(0x0700001e+i*0x20)}
                    for i in range(32)],
                "fadedPalette": [u16(faded+i*2) for i in range(512)],
                "unfadedPalette": [u16(unfaded+i*2) for i in range(512)],
                "hardwarePalette": [u16(0x05000000+i*2) for i in range(512)],
                "paletteTags": [u16(palette_tags+i*2) for i in range(16)],
                "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052),
                "bldy": u16(0x04000054),
                "se1": {"songHeader": oracle.read_u32(se1_info),
                        "tracks": [{"flags": oracle.read_u8(se1_tracks+i*0x50),
                                    "panX": s8(se1_tracks+i*0x50+0x15)}
                                   for i in range(3)]},
            })
    if not rows:
        raise RuntimeError("stock ROM did not reach MOVE_TAIL_GLOW")
    OUTPUT.write_text(json.dumps({
        "schema": "tail-glow-dense-evidence/v1", "setup": setup,
        "orbTemplate": oracle.symbols["gTailGlowOrbSpriteTemplate"],
        "rows": rows,
    }) + "\n")
    print(f"wrote {OUTPUT}: currentMove {rows[0]['frame']}..{rows[-1]['frame']}, {len(rows)} rows")

main()
