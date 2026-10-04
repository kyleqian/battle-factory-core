#!/usr/bin/env python3
"""Per-frame OBJ / palette / sSpriteOrder probe around non-move battle animations (status conditions).

usage: statusAnimationSpriteProbe.py <scenario.json> <output.json>
Independent direct mGBA process (Scene ON; same profile as spriteOrderEventProbe.py, whose per-frame
mask+order capture this reimplements because that file is argv-driven and not importable).

Activation signal: gAnimScriptActive rising edge with sAnimMoveIndex == 0 (LaunchBattleAnimation(isMoveAnim=FALSE)
sets sAnimMoveIndex = 0); the script is identified from sBattleAnimScriptPtr (nearest Status_*/General_* label).
End = first frame gAnimScriptActive is clear again.  Window rows cover act-1 .. end+LATE.

Per frame: occupied mask, 64-byte sSpriteOrder, gAnimScriptActive, sAnimMoveIndex, sSpritePaletteTags[16],
per-bank md5 of gPlttBufferUnfaded OBJ (palette writes outside the faded buffer).  Per create: template tileTag/
paletteTag, callback label, OAM palette bank.  Nothing is injected into the game.
"""
from __future__ import annotations
import hashlib, json, os, subprocess, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: statusAnimationSpriteProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
IDENT = list(range(64))
LATE = 8


def symbols(elf):
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(elf)], check=True, capture_output=True, text=True).stdout
    names, by = {}, {}
    for l in nm.splitlines():
        p = l.split()
        if len(p) == 3:
            try:
                a = int(p[0], 16)
            except ValueError:
                continue
            names[p[2]] = a
            by.setdefault(a & ~1, p[2])
    return names, by


def main():
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, PROFILE)
    names, by = symbols(ref / "pokeemerald.elf")
    labels = sorted((a, n) for n, a in names.items() if n.startswith(("Status_", "General_")))
    u8 = oracle.read_u8
    spr, oa = names["gSprites"], names["sSpriteOrder"]
    tagsA, unf = names["sSpritePaletteTags"], names["gPlttBufferUnfaded"] + 512

    def u16(a): return u8(a) | u8(a + 1) << 8
    def u32(a): return u16(a) | u16(a + 2) << 16

    frames, state = [], {"n": 0, "tf": None}
    infos = {}  # slot -> info at last observed create

    def slot_info(i):
        b = spr + 0x44 * i
        t = u32(b + 0x14)
        a2 = u16(b + 4)
        return {"tileTag": u16(t), "palTag": u16(t + 2), "template": by.get(t & ~1, hex(t)),
                "callback": by.get(u32(b + 0x1C) & ~1, hex(u32(b + 0x1C))), "bank": (a2 >> 12) & 15}

    def sample():
        mask = 0
        for i in range(64):
            if u8(spr + 0x44 * i + 0x3E) & 1:
                mask |= 1 << i
        order = [u8(oa + i) for i in range(64)]
        if mask == 0 and order == IDENT:
            frames.clear()
            infos.clear()
        prev = frames[-1]["mask"] if frames else 0
        for i in range(64):
            if mask >> i & 1 and not prev >> i & 1:
                infos[i] = slot_info(i)
        tags = [u16(tagsA + 2 * i) for i in range(16)]
        raw = bytes(u8(unf + j) for j in range(512))
        banks = [hashlib.md5(raw[32 * k:32 * k + 32]).hexdigest()[:8] for k in range(16)]
        f = {"n": state["n"], "tf": state["tf"], "order": order, "mask": mask, "act": u8(names["gAnimScriptActive"]),
             "mv": u16(names["sAnimMoveIndex"]), "tags": tags, "banks": banks,
             "creates": {i: infos[i] for i in range(64) if mask >> i & 1 and not prev >> i & 1},
             "destroyed": {i: infos.get(i) for i in range(64) if prev >> i & 1 and not mask >> i & 1}}
        if f["act"] and not (frames and frames[-1]["act"]):
            ptr = u32(names["sBattleAnimScriptPtr"])
            lab_ = max([(a, n) for a, n in labels if a <= ptr] or [(ptr, "unknown")])
            f["script"] = {"ptr": ptr, "label": lab_[1], "offset": ptr - lab_[0],
                           "attacker": u8(names["gBattleAnimAttacker"]), "target": u8(names["gBattleAnimTarget"]),
                           "activeBattler": u8(names["gActiveBattler"]), "currentMove": u16(names["gCurrentMove"])}
        frames.append(f)

    orig = oracle.advance

    def advance(buttons):
        r = orig(buttons)
        state["n"] += 1
        if state["tf"] is not None:
            state["tf"] += 1
        sample()
        return r
    oracle.advance = advance
    lab.prepare(request)
    state["tf"] = 0
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]):
            advance(seg.get("buttons", []))

    # compact whole-run rows (same row layout as spriteOrderEventProbe v2 without keys): [n, tf, orderHex, maskHex, act, mv]
    rows, prev = [], None
    for f in frames:
        sig = (tuple(f["order"]), f["mask"], f["act"], f["mv"])
        if sig != prev:
            rows.append([f["n"], f["tf"], bytes(f["order"]).hex(), format(f["mask"], "x"), f["act"], f["mv"]])
        prev = sig
    # model needs a state per change; keep first frame row always
    windows = []
    for i, f in enumerate(frames):
        if "script" not in f or f["mv"] != 0:
            continue
        end = next((j for j in range(i, len(frames)) if not frames[j]["act"]), None)
        if end is None:
            continue
        lo, hi = max(i - 1, 0), min(end + LATE, len(frames) - 1)
        w = {"label": f["script"]["label"], "script": f["script"], "activationFrame": f["n"], "activationTraceFrame": f["tf"],
             "endFrame": frames[end]["n"], "lifetime": end - i, "windowLo": frames[lo]["n"], "windowHi": frames[hi]["n"],
             "before": frames[lo]["mask"], "atEnd": frames[end]["mask"], "after": frames[hi]["mask"],
             "frames": []}
        for j in range(lo, hi + 1):
            g = frames[j]
            w["frames"].append({"n": g["n"], "order": bytes(g["order"]).hex(), "mask": format(g["mask"], "x"), "act": g["act"],
                                "tags": g["tags"], "banks": g["banks"],
                                "creates": {str(k): v for k, v in g["creates"].items()},
                                "destroyed": {str(k): v for k, v in g["destroyed"].items()}})
        windows.append(w)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "status-animation-sprite-raw/v1", "scenario": str(SCENARIO),
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "frameCount": len(frames),
        "firstFrame": frames[0]["n"], "lastFrame": frames[-1]["n"], "rows": rows, "windows": windows}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} frames={len(frames)} windows={[(w['label'], w['activationFrame'], w['lifetime']) for w in windows]}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)
