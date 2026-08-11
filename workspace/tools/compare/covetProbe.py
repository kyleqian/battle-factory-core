#!/usr/bin/env python3
"""Locate and summarize the legal Scene-ON MOVE_COVET animation body."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: covetProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_COVET = 343
CAPTURE_WINDOW = (60, 220)

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    anim_attacker = oracle.symbols["gBattleAnimAttacker"]
    current_rows = []
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    song_table = oracle.symbols["gSongTable"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols = {p[2]: int(p[0], 16) | 1 for line in nm.splitlines()
               if len(p := line.split()) == 3}
    palette_tags = symbols["sSpritePaletteTags"] & ~1
    def s16(value: int) -> int:
        return value - 0x10000 if value >= 0x8000 else value
    def u16(a: int) -> int:
        return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16a(a: int) -> int:
        return s16(u16(a))
    def s8(a: int) -> int:
        value = oracle.read_u8(a)
        return value - 0x100 if value >= 0x80 else value
    def player(info: int, tracks: int) -> dict:
        return {"songHeader": oracle.read_u32(info), "status": oracle.read_u32(info+4),
                "tracks": [{"flags": oracle.read_u8(tracks+i*0x50),
                            "panX": s8(tracks+i*0x50+0x15)} for i in range(3)]}
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    frame = 0
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            snap = lab.snapshot()
            if snap["engine"]["currentMove"] != MOVE_COVET:
                continue
            attacker = oracle.read_u8(anim_attacker)
            start, end = CAPTURE_WINDOW
            if frame < start or frame > end:
                continue
            active = []
            for slot in range(64):
                base = sprites + slot * 0x44
                if oracle.read_u8(base + 0x3e) & 1:
                    matrix_num = (oracle.read_u16(base + 2) >> 9) & 0x1f
                    matrix = matrices + matrix_num * 8
                    active.append({
                        "slot": slot,
                        "template": oracle.read_u32(base + 0x14),
                        "callback": oracle.read_u32(base + 0x1c),
                        "x": s16(oracle.read_u16(base + 0x20)),
                        "y": s16(oracle.read_u16(base + 0x22)),
                        "x2": s16(oracle.read_u16(base + 0x24)),
                        "y2": s16(oracle.read_u16(base + 0x26)),
                        "attr0": oracle.read_u16(base),
                        "attr1": oracle.read_u16(base + 2),
                        "attr2": oracle.read_u16(base + 4),
                        "matrixNum": matrix_num,
                        "subpriority": oracle.read_u8(base + 0x43),
                        "invisible": bool(oracle.read_u8(base + 0x3e) & 4),
                        "matrix": {
                            "a": s16(oracle.read_u16(matrix)),
                            "b": s16(oracle.read_u16(matrix + 2)),
                            "c": s16(oracle.read_u16(matrix + 4)),
                            "d": s16(oracle.read_u16(matrix + 6)),
                        },
                        "data": [s16(oracle.read_u16(base + 0x2e + i * 2))
                                 for i in range(8)],
                    })
            rgb = oracle.screen_rgb()
            (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
            def battler(i: int) -> dict:
                slot = oracle.read_u8(battler_ids + i)
                return next(item for item in active if item["slot"] == slot)
            current_rows.append({
                "frame": frame,
                "sha256": hashlib.sha256(rgb).hexdigest(),
                "attacker": attacker,
                "visualTaskCount": oracle.read_u8(visual_count),
                "soundTaskCount": oracle.read_u8(sound_count),
                "activeSpriteCount": len(active),
                "playerSprite": battler(0), "opponentSprite": battler(1),
                "hardwareOam": [[u16(0x07000000+i*8+j) for j in (0,2,4)]
                                for i in range(128)],
                "hardwareMatrices": [
                    {"a": s16a(0x07000006+i*0x20), "b": s16a(0x0700000e+i*0x20),
                     "c": s16a(0x07000016+i*0x20), "d": s16a(0x0700001e+i*0x20)}
                    for i in range(32)],
                "fadedPalette": [u16(faded+i*2) for i in range(512)],
                "unfadedPalette": [u16(unfaded+i*2) for i in range(512)],
                "hardwarePalette": [u16(0x05000000+i*2) for i in range(512)],
                "paletteTags": [u16(palette_tags+i*2) for i in range(16)],
                "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052),
                "bldy": u16(0x04000054), "se1": player(se1_info, se1_tracks),
                "active": active,
            })
    if not current_rows:
        raise RuntimeError("stock ROM did not reach MOVE_COVET")
    OUTPUT.write_text(json.dumps({
        "schema": "covet-dense-evidence/v2",
        "setup": setup,
        "magentaHeartTemplate": oracle.symbols["gMagentaHeartSpriteTemplate"],
        "charmSongHeader": oracle.read_u32(song_table + 212 * 8),
        "dizzyPunchSongHeader": oracle.read_u32(song_table + 176 * 8),
        "firstFrame": current_rows[0]["frame"],
        "lastFrame": current_rows[-1]["frame"],
        "rows": current_rows,
    }) + "\n")
    print(f"wrote {OUTPUT}: currentMove {current_rows[0]['frame']}..{current_rows[-1]['frame']}")
main()
