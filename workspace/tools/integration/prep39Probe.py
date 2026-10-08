#!/usr/bin/env python3
"""prep39: General_SubstituteFade per-row probe (direct mGBA, never the shared HTTP oracles).

usage: prep39Probe.py <scenario.json> <output.json> <rgb-dir>
Every anim-script start: [frame, label, gBattleAnimAttacker] (compact).  Detail rows (6 rows before every
General_SubstituteFade window through 8 rows after its first inactive row): tasks (+ the fade / blend task data),
BLDCNT / BLDALPHA / DISPCNT / BG0..3CNT, gBattle_BG1/2_X/Y, hardware BG palettes 8 / 9, both battlers (sprite OAM
fields, 64x64 OBJ tile-block digest, hardware OBJ palette bank, faded / unfaded OBJ palette buffer, behindSubstitute,
shadow).  Raw RGB of the detail rows only is written zlib-compressed into <rgb-dir> (caller-owned scratch).
"""
from __future__ import annotations

import bisect
import collections
import hashlib
import json
import subprocess
import sys
import zlib
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: prep39Probe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

FADE = "General_SubstituteFade"
BEFORE, AFTER = 6, 8


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
    labels = sorted((a, n) for n, a in symbols.items()
                    if n.startswith(("Move_", "General_", "Special_", "Status_")) and 0x08000000 <= a < 0x0a000000)
    label_addrs = [a for a, _ in labels]
    task_names = {a & ~1: n for n, a in symbols.items() if n.startswith(("AnimTask_", "Task_", "SpriteCB_", "AnimTask"))}
    sy = oracle.symbols
    S = lambda name: sy[name] if name in sy else symbols[name]  # noqa: E731
    sprites, tasks = S("gSprites"), S("gTasks")
    mons = S("gBattleMons"); mon_size = sizes.get("gBattleMons", 0x58 * 4) // 4
    faded, unfaded = S("gPlttBufferFaded"), S("gPlttBufferUnfaded")

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
        a0, a2 = u16(b), u16(b + 4)
        return {"x": s16(b + 0x20), "y": s16(b + 0x22), "x2": s16(b + 0x24), "y2": s16(b + 0x26),
                "invisible": bool(u8(b + 0x3E) & 4), "affineMode": a0 >> 8 & 3, "objMode": a0 >> 10 & 3,
                "tileNum": a2 & 0x3FF, "priority": a2 >> 10 & 3, "paletteNum": a2 >> 12}

    def pal(base: int, bank: int) -> list[int]:
        return [u16(base + (bank * 16 + i) * 2) for i in range(16)]

    def battler(b: int) -> dict:
        spr_data = u32(S("gBattleSpritesDataPtr"))
        battler_data = u32(spr_data) + b * 4
        hb = u32(spr_data + 4) + b * 12
        sid = u8(S("gBattlerSpriteIds") + b)
        spr = sprite(sid)
        bank = 16 + spr["paletteNum"]
        shadow = sprite(u8(hb + 7))
        mon = mons + b * mon_size
        return {
            "sprite": spr, "tileDigest": vram_block_digest(spr["tileNum"]),
            "hwPalette": pal(0x05000000, bank), "fadedPalette": pal(faded, bank), "unfadedPalette": pal(unfaded, bank),
            "behindSubstitute": bool(u16(battler_data) & 4),
            "shadow": {"invisible": shadow["invisible"], "x": shadow["x"], "x2": shadow["x2"]},
            "species": u16(mon), "hp": u16(mon + 0x28), "maxHP": u16(mon + 0x2C),
        }

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    starts: list[list] = []  # [frame, script, animAttacker] at every anim-script start (preceding bodies for x2 history)
    last_script = [None]
    pending: collections.deque = collections.deque(maxlen=BEFORE)
    frame = 0
    tail = 0

    def detail(script, rgb: bytes) -> dict:
        active_tasks = []
        for slot in range(16):
            tb = tasks + slot * 0x28
            if u8(tb + 4):
                d = [s16(tb + 8 + 2 * i) for i in range(16)]
                active_tasks.append({"func": task_names.get(u32(tb) & ~1, hex(u32(tb))), "data": d})
        return {
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "script": script,
            "animAttacker": u8(S("gBattleAnimAttacker")), "tasks": active_tasks,
            "dispcnt": u16(0x04000000), "bgcnt": [u16(0x04000008 + 2 * i) for i in range(4)],
            "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052),
            "bg1": [s16(S("gBattle_BG1_X")), s16(S("gBattle_BG1_Y"))],
            "bg2": [s16(S("gBattle_BG2_X")), s16(S("gBattle_BG2_Y"))],
            "bgPal8": pal(0x05000000, 8), "bgPal9": pal(0x05000000, 9),
            "battlers": [battler(0), battler(1)],
        }

    def snap() -> None:
        nonlocal tail
        script = label(u32(S("sBattleAnimScriptPtr"))) if u8(S("gAnimScriptActive")) else None
        rgb = oracle.screen_rgb()
        if script is not None and script != last_script[0]:
            starts.append([frame, script, u8(S("gBattleAnimAttacker"))])
        last_script[0] = script
        in_fade = script == FADE
        if in_fade:
            tail = AFTER + 1
        if in_fade or tail > 0:
            for r, raw in pending:
                rows.append(r); (RGB_DIR / f"{r['frame']:05d}.rgb.z").write_bytes(zlib.compress(raw, 6))
            pending.clear()
            r = detail(script, rgb)
            rows.append(r); (RGB_DIR / f"{frame:05d}.rgb.z").write_bytes(zlib.compress(rgb, 6))
            if not in_fade:
                tail -= 1
        else:
            pending.append((detail(script, rgb), rgb))

    snap()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            snap()
    OUTPUT.write_text(json.dumps({"schema": "prep39-substitute-fade/v1", "profile": profile, "bootstrap": bootstrap,
                                  "scenario": str(SCENARIO), "setup": setup, "frames": frame + 1, "scriptStarts": starts, "rows": rows},
                                 separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {frame + 1} frames, {len(rows)} detail rows")


main()
