#!/usr/bin/env python3
"""Post-KO state + dense RGB probe of a BattleLab scenario (Scene ON, direct mGBA; docs/postko-consumer-audit.md s2).

usage (through tools/run-mgba-probe.py): postkoStateProbe.py <scenario.json> <output.json> [<rgb-dir>]
Same staging and frame numbering as tools/probe/run-battle-lab-rgb.py (frame 0 = after lab.prepare(), +1 per trace frame), so the
accepted dense-window offsets (activation + k) apply unchanged.  Per frame (rows emitted on change): sSpriteOrder (hex), sprite in-use
mask, gAnimScriptActive, sAnimMoveIndex, gBattleAnimAttacker/Target, gOamMatrixAllocBitmap, active task funcs (slot:symbol),
gBattlerSpriteIds[0..1] and their OAM matrixNum, [slot, matrixNum] of every affine in-use sprite, gBattleMons[0..1] [species, hp, maxHP, status1], gCurrentMove; every frame's RGB888 sha256 (and the raw .rgb when <rgb-dir> is given).
"activations" lists each gAnimScriptActive rise with the state on the frame BEFORE the rise (the allocator-plan-v2 baseline edge) and at
the rise frame, plus the effect sprites created (mask bits gained, per frame) during the body.
"""
from __future__ import annotations
import bisect, hashlib, json, os, subprocess, sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit("usage: postkoStateProbe.py <scenario.json> <output.json> [<rgb-dir>]")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
RGB_DIR = Path(sys.argv[3]) if len(sys.argv) == 4 else None
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REF = ROOT / "reference" / "pokeemerald"
SPRITE_SIZE, TASK_SIZE = 0x44, 40


def functions():
    text = subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(REF / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names, funcs = {}, []
    for line in text.splitlines():
        f = line.split()
        if len(f) == 3:
            # Only Thumb function addresses carry the interworking bit; data symbols (bool8 gAnimScriptActive = 0x020383fd) keep bit 0.
            names[f[2]] = int(f[0], 16) & ~1 if f[1] in ("t", "T") else int(f[0], 16)
            if f[1] in ("t", "T"):
                funcs.append((int(f[0], 16) & ~1, f[2]))
    funcs.sort()
    return names, funcs


NAMES, FUNCS = functions()
FADDR = [a for a, _ in FUNCS]


def sym(a):
    a &= ~1
    i = bisect.bisect_right(FADDR, a) - 1
    return FUNCS[i][1] if i >= 0 and FUNCS[i][0] == a else hex(a)


def main():
    scenario = json.loads(SCENARIO.read_text())
    request = validate_request(scenario, "battle-scene-on")
    o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(o, "battle-scene-on")
    lab.prepare(request)
    if RGB_DIR:
        RGB_DIR.mkdir(parents=True)
    u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
    spr, order_addr, tasks = NAMES["gSprites"], NAMES["sSpriteOrder"], NAMES["gTasks"]
    rows, shas, prev = [], [], None

    def state(frame):
        mask = 0
        for slot in range(64):
            if u8(spr + SPRITE_SIZE * slot + 0x3E) & 1:
                mask |= 1 << slot
        bsid = [u8(NAMES["gBattlerSpriteIds"] + b) for b in range(2)]
        bmat = [(u16(spr + SPRITE_SIZE * s + 2) >> 9) & 0x1F if (u16(spr + SPRITE_SIZE * s) >> 8) & 1 else None for s in bsid]
        affine = [[s, (u16(spr + SPRITE_SIZE * s + 2) >> 9) & 0x1F] for s in range(64)
                  if mask >> s & 1 and (u16(spr + SPRITE_SIZE * s) >> 8) & 1]
        active = [f"{i}:{sym(u32(tasks + TASK_SIZE * i))}" for i in range(16) if u8(tasks + TASK_SIZE * i + 4)]
        return {"order": bytes(u8(order_addr + i) for i in range(64)).hex(), "mask": format(mask, "x"),
                "act": u8(NAMES["gAnimScriptActive"]), "mv": u16(NAMES["sAnimMoveIndex"]),
                "atk": u8(NAMES["gBattleAnimAttacker"]), "tgt": u8(NAMES["gBattleAnimTarget"]),
                "bitmap": format(u32(NAMES["gOamMatrixAllocBitmap"]), "x"), "tasks": active, "battlerSprites": bsid,
                "battlerMatrix": bmat, "affine": affine,
                "mons": [[u16(NAMES["gBattleMons"] + 0x58 * b), u16(NAMES["gBattleMons"] + 0x58 * b + 0x28), u16(NAMES["gBattleMons"] + 0x58 * b + 0x2C),
                          u32(NAMES["gBattleMons"] + 0x58 * b + 0x4C)] for b in range(2)], "cur": u16(NAMES["gCurrentMove"])}

    def capture(frame):
        nonlocal prev
        rgb = o.screen_rgb()
        if RGB_DIR:
            (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        shas.append(hashlib.sha256(rgb).hexdigest())
        s = state(frame)
        if s != prev:
            rows.append({"frame": frame, **s})
        prev = s

    frame = 0
    capture(frame)
    for seg in request["trace"]["segments"]:
        for _ in range(int(seg["frames"])):
            o.advance(seg.get("buttons", []))
            frame += 1
            capture(frame)
    # activations: rises of act
    def at(f):
        i = max(k for k, r in enumerate(rows) if r["frame"] <= f)
        return rows[i]
    acts = []
    for k, r in enumerate(rows):
        if r["act"] and (k == 0 or not rows[k - 1]["act"]):
            fall = next((x["frame"] for x in rows[k + 1:] if not x["act"]), None)
            before = at(r["frame"] - 1)
            created, last = [], int(before["mask"], 16)
            for x in rows:
                if r["frame"] <= x["frame"] < (fall or 10 ** 9):
                    m = int(x["mask"], 16)
                    gained = [s for s in range(64) if m >> s & 1 and not last >> s & 1]
                    if gained:
                        created.append([x["frame"] - r["frame"], gained])
                    last = m
            acts.append({"riseFrame": r["frame"], "fallFrame": fall, "moveIndex": r["mv"], "animAttacker": r["atk"],
                         "before": before, "atRise": r, "createdByAge": created})
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "postko-state/v1", "scenario": str(SCENARIO),
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "frames": frame + 1,
        "activations": acts, "rows": rows, "sha256": shas}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} frames={frame + 1} rows={len(rows)} activations={[(a['riseFrame'], a['moveIndex'], a['animAttacker']) for a in acts]}")


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        os._exit(1)
    sys.stdout.flush()
    os._exit(0)
