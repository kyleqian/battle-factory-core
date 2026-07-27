#!/usr/bin/env python3
"""Dense MOVE_EARTHQUAKE task/BG3/palette/OAM/RGB evidence."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit("usage: earthquakeProbe.py <scenario> <output.json> <rgb-dir> <start-frame>")
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
    sprites, tasks = oracle.symbols["gSprites"], oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    bg3_x = oracle.symbols["gBattle_BG3_X"]
    faded = oracle.symbols["gPlttBufferFaded"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbols = {line.split()[2]: int(line.split()[0], 16) | 1 for line in nm.splitlines() if len(line.split()) == 3}
    task_funcs = {
        symbols["AnimTask_HorizontalShake"],
        symbols["AnimTask_ShakePlatforms"],
        symbols["AnimTask_ShakeBattlers"],
    }
    palette_template = oracle.symbols["gComplexPaletteBlendSpriteTemplate"]
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def battler(i: int) -> dict:
        base = sprites + oracle.read_u8(battler_ids + i) * 0x44
        return {"x2":s16(base+0x24),"y2":s16(base+0x26)}
    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0:
                continue
            func = oracle.read_u32(base)
            if func in task_funcs:
                result.append({"slot":slot,"func":func,"data":[s16(base+8+i*2) for i in range(16)]})
        return result
    def palette_sprite() -> dict | None:
        for slot in range(64):
            base = sprites + slot * 0x44
            if (oracle.read_u8(base+0x3e) & 1) and oracle.read_u32(base+0x14) == palette_template:
                return {"slot":slot,"data":[s16(base+0x2e+i*2) for i in range(8)]}
        return None
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if frame < START or snap["engine"]["currentMove"] != 89: return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),
          "player":snap["battlers"]["player"],"opponent":snap["battlers"]["opponent"],
          "playerSprite":battler(0),"opponentSprite":battler(1),
          "bg3X":s16(bg3_x),"tasks":active_tasks(),"paletteSprite":palette_sprite(),
          "bgPalette":[u16(faded+i*2) for i in range(256)]})
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    OUTPUT.write_text(json.dumps({"schema":"earthquake-dense-evidence/v1","setup":setup,
      "taskFuncs":{"platforms":symbols["AnimTask_ShakePlatforms"],"battlers":symbols["AnimTask_ShakeBattlers"]},
      "frames":rows}) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")
main()
