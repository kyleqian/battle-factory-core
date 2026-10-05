#!/usr/bin/env python3
"""[Adapted from tools/compare/affineTaskProbe.py: the battle start cut is the last ResetSpriteData frame BEFORE gBattleMainFunc first equals BeginBattleIntro,
so the whole battle (faint / send-out / party menu / slide units) is kept instead of only the frames after the last reset.]
Per-frame gOamMatrixAllocBitmap + occupied-affine-sprite matrixNum + gTasks[0..15] probe (Scene ON profile).

usage: affineTaskProbe.py factory <trace.json> <out.json> [label]
       affineTaskProbe.py lab <move-id> <scenario.json> <out.json>
Same hooks as spriteOrderFactoryEntryProbe.py / spriteOrderEventProbe.py (oracle.advance sampled every frame;
frames before the last "no sprites + identity sSpriteOrder + empty matrix bitmap" frame, i.e. the battle's
ResetSpriteData, are dropped).  Per frame: matrix bitmap (u32), sprite slot -> matrixNum for in-use sprites
with oam.affineMode&1, task table (slot, func symbol, priority, prev, next) for active tasks, in-use sprite mask,
gAnimScriptActive, sAnimMoveIndex.  Rows are kept only on frames where any of these changed.
Intra-frame alloc/free pairs are invisible by construction (sampled once per advance).
"""
from __future__ import annotations
import hashlib, json, os, subprocess, sys, bisect
from pathlib import Path

mode = sys.argv[1] if len(sys.argv) > 1 else ""
if mode == "factory" and len(sys.argv) in (4, 5):
    SCENARIO, OUTPUT = map(Path, sys.argv[2:4]); MOVE = None
    LABEL = sys.argv[4] if len(sys.argv) == 5 else SCENARIO.stem
elif mode == "lab" and len(sys.argv) == 5:
    MOVE = int(sys.argv[2]); SCENARIO, OUTPUT = map(Path, sys.argv[3:5]); LABEL = SCENARIO.stem
else:
    raise SystemExit(__doc__)
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
TASK_SIZE = 40


def nm(elf):
    out = subprocess.run(["arm-none-eabi-nm", "-n", str(elf)], check=True, capture_output=True, text=True).stdout
    rows = [(int(p[0], 16), p[2]) for p in (l.split() for l in out.splitlines()) if len(p) == 3]
    return rows


def main():
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    rows_nm = nm(ref / "pokeemerald.elf")
    names = {n: a for a, n in rows_nm}
    addrs = [a for a, _ in rows_nm]
    def sym(a):
        a &= ~1
        i = bisect.bisect_right(addrs, a) - 1
        return rows_nm[i][1] if i >= 0 and a - rows_nm[i][0] == 0 else f"{rows_nm[i][1]}+{a - rows_nm[i][0]:#x}"
    u8 = oracle.read_u8
    def u16(a): return u8(a) | u8(a + 1) << 8
    def u32(a): return u16(a) | u16(a + 2) << 16
    spr, tasks, bm = names["gSprites"], names["gTasks"], names["gOamMatrixAllocBitmap"]
    order = names["sSpriteOrder"]
    frames, state = [], {"n": 0, "tf": None}
    resets, intro = [], {"n": None}
    symcache = {}

    def sample():
        mask, mats = 0, {}
        for i in range(64):
            b = spr + 0x44 * i
            if u8(b + 0x3E) & 1:
                mask |= 1 << i
                a0, a1 = u16(b), u16(b + 2)
                if a0 >> 8 & 1:  # affineMode bit0 (affine or double-size)
                    mats[i] = (a1 >> 9) & 0x1F
        tl = []
        for t in range(16):
            b = tasks + TASK_SIZE * t
            if u8(b + 4):
                f = u32(b)
                tl.append([t, symcache.setdefault(f, sym(f)), u8(b + 7), u8(b + 5), u8(b + 6)])
        bitmap = u32(bm)
        if intro["n"] is None and u32(names["gBattleMainFunc"]) & ~1 == names["BeginBattleIntro"]:
            intro["n"] = len(frames)
        if mask == 0 and bitmap == 0 and [u8(order + i) for i in range(64)] == list(range(64)):
            resets.append(len(frames))
        frames.append((state["n"], state["tf"], bitmap, mats, tl, mask, u8(names["gAnimScriptActive"]), u16(names["sAnimMoveIndex"])))

    orig = oracle.advance
    def advance(buttons):
        r = orig(buttons)
        state["n"] += 1
        if state["tf"] is not None:
            state["tf"] += 1
        sample()
        return r
    oracle.advance = advance
    sample()
    if mode == "factory":
        trace = json.loads(SCENARIO.read_text())
        state["tf"] = 0
    else:
        from battle_lab import BattleLab, validate_request  # noqa: E402
        request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
        lab = BattleLab(oracle, PROFILE)
        lab.prepare(request)
        trace = request["trace"]
        state["tf"] = 0
    for seg in trace["segments"]:
        for _ in range(seg["frames"]):
            advance(seg.get("buttons", []))
    cut = max(r for r in resets if r <= intro["n"])
    frames = frames[cut:]
    rows, prev = [], None
    for f in frames:
        sig = (f[2], tuple(sorted(f[3].items())), json.dumps(f[4]), f[5], f[6], f[7])
        if sig != prev:
            rows.append({"n": f[0], "tf": f[1], "bitmap": f"{f[2]:08x}", "mats": {str(k): v for k, v in f[3].items()},
                         "tasks": f[4], "mask": f"{f[5]:x}", "act": f[6], "mv": f[7]})
        prev = sig
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "affine-task-raw/v1", "route": "ordinary-factory" if mode == "factory" else "battle-lab",
        "move": MOVE, "label": LABEL, "scenario": str(SCENARIO), "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "frameCount": len(frames), "firstFrame": frames[0][0], "lastFrame": frames[-1][0], "rows": rows}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} frames={len(frames)} rows={len(rows)}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)
