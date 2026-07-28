#!/usr/bin/env python3
"""Dense source/OAM/palette/audio evidence for legal Scene-ON MOVE_SPARK fixtures."""
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: sparkProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_SPARK = 209
VISUAL_WINDOWS = {0: (79, 193), 1: (83, 197)}

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sprites, matrices = oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"]
    battler_ids, song_table = oracle.symbols["gBattlerSpriteIds"], oracle.symbols["gSongTable"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    visual_count, sound_count = oracle.symbols["gAnimVisualTaskCount"], oracle.symbols["gAnimSoundTaskCount"]
    anim_attacker, anim_target = oracle.symbols["gBattleAnimAttacker"], oracle.symbols["gBattleAnimTarget"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    se2_info, se2_tracks = oracle.symbols["gMPlayInfo_SE2"], oracle.symbols["gMPlayTrack_SE2"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols = {p[2]: int(p[0], 16) | 1 for line in nm.splitlines()
               if len(p := line.split()) == 3}
    palette_tags = symbols["sSpritePaletteTags"] & ~1
    template_names = ("gSparkElectricitySpriteTemplate",
                      "gSparkElectricityFlashingSpriteTemplate",
                      "gHorizontalLungeSpriteTemplate",
                      "gBasicHitSplatSpriteTemplate",
                      "gElectricitySpriteTemplate")
    templates = {name: oracle.symbols[name] for name in template_names}
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def s8(a: int) -> int:
        v = oracle.read_u8(a)
        return v - 0x100 if v >= 0x80 else v
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1f
        matrix = matrices + matrix_num * 8
        hw_matrix = 0x07000006 + matrix_num * 0x20
        return {"slot": slot, "attr0": u16(base), "attr1": u16(base+2),
                "attr2": u16(base+4), "x": s16(base+0x20), "y": s16(base+0x22),
                "x2": s16(base+0x24), "y2": s16(base+0x26),
                "template": oracle.read_u32(base+0x14),
                "callback": oracle.read_u32(base+0x1c),
                "subpriority": oracle.read_u8(base+0x43), "matrixNum": matrix_num,
                "matrix": {"a": s16(matrix), "b": s16(matrix+2),
                           "c": s16(matrix+4), "d": s16(matrix+6)},
                "hardwareMatrix": {"a": s16(hw_matrix), "b": s16(hw_matrix+8),
                                   "c": s16(hw_matrix+16), "d": s16(hw_matrix+24)},
                "data": [s16(base+0x2e+i*2) for i in range(8)]}
    def battler(i: int) -> dict: return sprite(oracle.read_u8(battler_ids + i))
    def player(info: int, tracks: int) -> dict:
        return {"songHeader": oracle.read_u32(info), "status": oracle.read_u32(info+4),
                "tracks": [{"flags": oracle.read_u8(tracks+i*0x50),
                            "panX": s8(tracks+i*0x50+0x15)} for i in range(3)]}
    attacker = None
    rows = []
    def capture(frame: int) -> None:
        nonlocal attacker
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != MOVE_SPARK: return
        current_attacker = oracle.read_u8(anim_attacker)
        attacker = current_attacker if attacker is None else attacker
        start, end = VISUAL_WINDOWS[current_attacker]
        if frame < start or frame > end: return
        active = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base+0x3e) & 1:
                item = sprite(slot)
                if item["template"] in templates.values(): active.append(item)
        rows.append({"frame": frame, "battleAnimAttacker": current_attacker,
          "battleAnimTarget": oracle.read_u8(anim_target),
          "visualTaskCount": oracle.read_u8(visual_count),
          "soundTaskCount": oracle.read_u8(sound_count),
          "playerSprite": battler(0), "opponentSprite": battler(1), "sprites": active,
          "hardwareOam": [[u16(0x07000000+i*8+j) for j in (0,2,4)] for i in range(128)],
          "hardwareMatrices": [
              {"a": s16(0x07000006+i*0x20), "b": s16(0x0700000e+i*0x20),
               "c": s16(0x07000016+i*0x20), "d": s16(0x0700001e+i*0x20)}
              for i in range(32)],
          "fadedPalette": [u16(faded+i*2) for i in range(512)],
          "unfadedPalette": [u16(unfaded+i*2) for i in range(512)],
          "hardwarePalette": [u16(0x05000000+i*2) for i in range(512)],
          "paletteTags": [u16(palette_tags+i*2) for i in range(16)],
          "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052),
          "bldy": u16(0x04000054), "se1": player(se1_info, se1_tracks),
          "se2": player(se2_info, se2_tracks)})
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    if attacker is None or len(rows) != 115:
        raise RuntimeError(f"expected one complete 115-frame SPARK window, got {len(rows)}")
    headers = {"SE_M_THUNDERBOLT2": oracle.read_u32(song_table+119*8),
               "SE_M_HYPER_BEAM": oracle.read_u32(song_table+215*8)}
    OUTPUT.write_text(json.dumps({"schema": "spark-dense-evidence/v2",
      "setup": setup, "templates": templates, "songHeaders": headers,
      "window": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
                 "frameCount": len(rows)}, "frames": rows}) + "\n")
    print(f"wrote {OUTPUT} (115 source frames; {rows[0]['frame']}..{rows[-1]['frame']})")
main()
