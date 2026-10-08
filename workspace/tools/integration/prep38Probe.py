#!/usr/bin/env python3
"""prep38: dense subbed-DEFENDER probe (direct mGBA, never the shared HTTP oracles). Lean variant of prep37Probe.py.

usage: prep38Probe.py <scenario.json> <output.json> <rgb-dir>
Every frame of the scenario trace: anim script label / active flag, gCurrentMove, gRng2Value, both battlers (hp, maxHP, status1,
status2, behindSubstitute = battlerData bit 2, substituteHP, sprite x/y/x2/y2/invisible, 64x64 OBJ tile-block digest) and the frame
RGB sha256.  Raw RGB (zlib) is written to <rgb-dir> ONLY for animation rows (anim script active on this or the previous frame), which
covers every body window [activation, first inactive row]; caller-owned scratch, never committed.
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
    raise SystemExit("usage: prep38Probe.py <scenario> <output.json> <rgb-dir>")
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
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / bootstrap)
    lab = BattleLab(oracle, profile)
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-S", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbols: dict[str, int] = {}
    sizes: dict[str, int] = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 4 and all(c in "0123456789abcdefABCDEF" for c in parts[0]):
            symbols[parts[3]] = int(parts[0], 16); sizes[parts[3]] = int(parts[1], 16)
        elif len(parts) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0]):
            symbols.setdefault(parts[2], int(parts[0], 16))
    labels = sorted((a, n) for n, a in symbols.items() if n.startswith(("Move_", "General_", "Special_", "Status_")) and 0x08000000 <= a < 0x0a000000)
    label_addrs = [a for a, _ in labels]
    sy = oracle.symbols
    S = lambda name: sy[name] if name in sy else symbols[name]  # noqa: E731
    sprites = S("gSprites")
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

    def battler(b: int) -> dict:
        spr_data = u32(S("gBattleSpritesDataPtr"))
        battler_data = u32(spr_data) + b * 4
        sb = sprites + u8(S("gBattlerSpriteIds") + b) * 0x44
        tile = u16(sb + 4) & 0x3FF
        base = 0x06010000 + tile * 32
        digest = hashlib.sha1(b"".join(u32(base + i).to_bytes(4, "little") for i in range(0, 0x800, 4))).hexdigest()[:12]
        mon = mons + b * mon_size
        return {"hp": u16(mon + 0x28), "maxHP": u16(mon + 0x2C), "status1": u32(mon + 0x4C), "status2": u32(mon + 0x50),
                "doll": bool(u16(battler_data) & 4), "subHP": u8(disable + b * disable_size + 10),
                "x": s16(sb + 0x20), "y": s16(sb + 0x22), "x2": s16(sb + 0x24), "y2": s16(sb + 0x26),
                "inv": bool(u8(sb + 0x3E) & 4), "tiles": digest}

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    frame = 0
    prev_active = 0

    def snap() -> None:
        nonlocal prev_active
        active = u8(S("gAnimScriptActive"))
        rgb = oracle.screen_rgb()
        if active or prev_active:
            (RGB_DIR / f"{frame:05d}.rgb.z").write_bytes(zlib.compress(rgb, 6))
        prev_active = active
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "move": u16(S("gCurrentMove")),
                     "active": active, "script": label(u32(S("sBattleAnimScriptPtr"))) if active else None,
                     "attacker": u8(S("gBattleAnimAttacker")), "target": u8(S("gBattleAnimTarget")),
                     "rng2": u32(S("gRng2Value")), "battlers": [battler(0), battler(1)]})

    snap()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            snap()
    OUTPUT.write_text(json.dumps({"schema": "prep38-subbed-defender/v1", "profile": profile, "scenario": str(SCENARIO), "setup": setup,
                                  "frames": rows}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} frames")


main()
