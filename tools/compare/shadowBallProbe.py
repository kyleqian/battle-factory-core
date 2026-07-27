#!/usr/bin/env python3
"""Dense MOVE_SHADOW_BALL task/sprite/OAM/matrix/register/palette/RGB evidence."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: shadowBallProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
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
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    shadow_template = oracle.symbols["gShadowBallSpriteTemplate"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbols = {line.split()[2]: int(line.split()[0], 16) | 1 for line in nm.splitlines() if len(line.split()) == 3}
    watched = {
        name: symbols[name] for name in (
            "SoundTask_LoopSEAdjustPanning", "SoundTask_LoopSEAdjustPanning_Step",
            "AnimShadowBall", "AnimShadowBall_Step", "AnimTask_ShakeMon2",
            "AnimTask_ShakeMon2_Step",
        )
    }
    def u16(a: int) -> int: return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def block(addr: int, size: int) -> bytes: return bytes(oracle.read_u8(addr + i) for i in range(size))
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        return {
            "slot": slot, "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1c), "raw": block(base, 0x44).hex(),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "matrixNum": (oracle.read_u8(base + 3) >> 1) & 31,
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }
    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                result.append({
                    "slot": slot, "func": oracle.read_u32(base),
                    "data": [s16(base + 8 + i * 2) for i in range(16)],
                })
        return result
    rows = []
    def capture(frame: int) -> None:
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != 247:
            return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        ids = [oracle.read_u8(battler_ids + i) for i in range(2)]
        active = [slot for slot in range(64) if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "attacker": snap["engine"]["activeBattler"],
            "player": snap["battlers"]["player"], "opponent": snap["battlers"]["opponent"],
            "registers": {name: u16(addr) for name, addr in {
                "DISPCNT": 0x4000000, "BG0CNT": 0x4000008, "BG1CNT": 0x400000a,
                "BG2CNT": 0x400000c, "BG3CNT": 0x400000e,
                "BLDCNT": 0x4000050, "BLDALPHA": 0x4000052, "BLDY": 0x4000054,
            }.items()},
            "tasks": active_tasks(), "battlerSprites": [sprite(i) for i in ids],
            "activeSprites": [sprite(i) for i in active],
            "shadowBalls": [sprite(i) for i in active if oracle.read_u32(sprites + i * 0x44 + 0x14) == shadow_template],
            "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x5000000 + i * 2) for i in range(512)],
            "hardwareOam": block(0x7000000, 0x400).hex(),
        })
    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    OUTPUT.write_text(json.dumps({
        "schema": "shadow-ball-dense-evidence/v1", "setup": setup,
        "symbols": {**watched, "shadowTemplate": shadow_template}, "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} move frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")
main()
