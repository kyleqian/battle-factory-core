#!/usr/bin/env python3
"""trf174: dense MOVE_TRANSFORM probe (prep37Probe + mosaic / BG registers / transformSpecies) (direct mGBA, never the shared HTTP oracles).

usage: trf174Probe.py <scenario.json> <output.json> <rgb-dir>
Records, for EVERY frame of the scenario trace: the anim script / special-anim / table-anim state, both battler
sprites (OAM-relevant fields), the battlers' 64x64 OBJ tile-block digest (doll vs mon graphics), the battlers'
hardware OBJ palette banks, behindSubstitute / flag_x8 / specialAnimActive / animFromTableActive, the shadow
sprite, the gameplay substitute state (STATUS2_SUBSTITUTE, substituteHP) and the frame RGB sha256.  Raw RGB of
every frame is written zlib-compressed into <rgb-dir> (caller-owned scratch; never committed).
"""
from __future__ import annotations

import bisect
import hashlib
import json
import subprocess
import sys
import zlib
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: trf174Probe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    raw_request = json.loads(SCENARIO.read_text())
    profile = raw_request["profile"]
    request = validate_request(raw_request, profile)
    reference = ROOT / "reference" / "pokeemerald"
    bootstrap = {"battle-scene-on": "factory.json", "battle-scene-off": "factory-battle-scene-off.json"}[profile]
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / bootstrap)
    lab = BattleLab(oracle, profile)
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-S", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols: dict[str, int] = {}
    sizes: dict[str, int] = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 4 and all(c in "0123456789abcdefABCDEF" for c in parts[0]):
            symbols[parts[3]] = int(parts[0], 16); sizes[parts[3]] = int(parts[1], 16)
        elif len(parts) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0]):
            symbols.setdefault(parts[2], int(parts[0], 16))
    # anim-script labels (Move_*, General_*, Special_*, Status_*) for pointer -> enclosing label
    labels = sorted((a, n) for n, a in symbols.items()
                    if n.startswith(("Move_", "General_", "Special_", "Status_")) and 0x08000000 <= a < 0x0a000000)
    label_addrs = [a for a, _ in labels]
    task_names = {a & ~1: n for n, a in symbols.items() if n.startswith(("AnimTask_", "Task_", "SpriteCB_", "AnimTask"))}
    sy = oracle.symbols
    S = lambda name: sy[name] if name in sy else symbols[name]  # noqa: E731
    sprites, tasks = S("gSprites"), S("gTasks")
    disable = S("gDisableStructs"); disable_size = sizes.get("gDisableStructs", 0x70) // 4
    mons = S("gBattleMons"); mon_size = sizes.get("gBattleMons", 0x58 * 4) // 4

    u8 = oracle.read_u8
    u16 = lambda a: u8(a) | u8(a + 1) << 8  # noqa: E731
    u32 = oracle.read_u32
    def s16(a: int) -> int:
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v

    def label(ptr: int):
        i = bisect.bisect_right(label_addrs, ptr) - 1
        return labels[i][1] if i >= 0 else None

    def vram_block_digest(tile_num: int) -> str:
        base = 0x06010000 + tile_num * 32
        words = [u32(base + i) for i in range(0, 0x800, 4)]
        return hashlib.sha1(b"".join(w.to_bytes(4, "little") for w in words)).hexdigest()[:16]

    def sprite(slot: int) -> dict:
        b = sprites + slot * 0x44
        a0, a1, a2 = u16(b), u16(b + 2), u16(b + 4)
        return {"slot": slot, "x": s16(b + 0x20), "y": s16(b + 0x22), "x2": s16(b + 0x24), "y2": s16(b + 0x26),
                "invisible": bool(u8(b + 0x3E) & 4), "inUse": bool(u8(b + 0x3E) & 1),
                "affineMode": a0 >> 8 & 3, "objMode": a0 >> 10 & 3, "tileNum": a2 & 0x3FF, "priority": a2 >> 10 & 3,
                "paletteNum": a2 >> 12, "callback": task_names.get(u32(b + 0x1C) & ~1, hex(u32(b + 0x1C)))}

    def battler(b: int) -> dict:
        spr_data = u32(S("gBattleSpritesDataPtr"))
        battler_data = u32(spr_data) + b * 4
        hb = u32(spr_data + 4) + b * 12
        sid = u8(S("gBattlerSpriteIds") + b)
        spr = sprite(sid)
        bank = 256 + spr["paletteNum"] * 16
        mon = mons + b * mon_size
        return {
            "spriteId": sid, "sprite": spr, "tileDigest": vram_block_digest(spr["tileNum"]),
            "hwPalette": [u16(0x05000000 + (bank + i) * 2) for i in range(16)],
            "behindSubstitute": bool(u16(battler_data) & 4), "flagX8": bool(u16(battler_data) & 8),
            "specialAnimActive": bool(u8(hb) & 0x40), "animFromTableActive": bool(u8(hb) & 0x20),
            "statusAnimActive": bool(u8(hb) & 0x10), "battlerIsBouncing": bool(u8(hb) & 4),
            "shadow": (lambda s: {"invisible": s["invisible"], "inUse": s["inUse"], "x": s["x"], "x2": s["x2"]})(sprite(u8(hb + 7))),
            "species": u16(mon), "hp": u16(mon + 0x28), "maxHP": u16(mon + 0x2C), "status2": u32(mon + 0x50),
            "substituteHP": u8(disable + b * disable_size + 10),
            "transformSpecies": u16(battler_data + 2),
            "personality": u32(mon + 0x48),
        }

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    frame = 0

    def snap() -> None:
        ptr = u32(S("sBattleAnimScriptPtr"))
        active_tasks = []
        for slot in range(16):
            tb = tasks + slot * 0x28
            if u8(tb + 4):
                active_tasks.append(task_names.get(u32(tb) & ~1, hex(u32(tb))))
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb.z").write_bytes(zlib.compress(rgb, 6))
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "currentMove": u16(S("gCurrentMove")),
            "animScriptActive": u8(S("gAnimScriptActive")), "script": label(ptr) if u8(S("gAnimScriptActive")) else None,
            "animAttacker": u8(S("gBattleAnimAttacker")), "animTarget": u8(S("gBattleAnimTarget")),
            "tasks": active_tasks,
            "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052), "dispcnt": u16(0x04000000),
            "battlers": [battler(0), battler(1)],
            "mosaic": u16(S("sGpuRegBuffer") + 0x4C), "bg1cnt": u16(0x0400000A), "bg2cnt": u16(0x0400000C),
            "bg1": [s16(S("gBattle_BG1_X")), s16(S("gBattle_BG1_Y"))], "bg2": [s16(S("gBattle_BG2_X")), s16(S("gBattle_BG2_Y"))],
            "bgPal8": [u16(0x05000000 + (128 + i) * 2) for i in range(16)], "bgPal9": [u16(0x05000000 + (144 + i) * 2) for i in range(16)],
        })

    snap()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            snap()
    OUTPUT.write_text(json.dumps({"schema": "trf174-transform-field/v1", "profile": profile, "bootstrap": bootstrap,
                                  "scenario": str(SCENARIO), "setup": setup, "frames": rows},
                                 separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} frames")


main()
