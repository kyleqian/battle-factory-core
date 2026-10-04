#!/usr/bin/env python3
"""Per-frame SortSprites-key / OAM-emission probe for the allocator-consumer move windows.

usage: allocatorConsumerTieProbe.py <move-id> <scenario.json> <output.json>
env ALLOCATOR_TIE_PROFILE = battle-scene-on (default; Scene OFF skips move animations, no body activates) | battle-scene-off

Samples every frame (after oracle.advance) of lab.prepare() + the trace. For each *body* of <move-id>
(activation = first frame gAnimScriptActive && sAnimMoveIndex == move; merged within 30 frames; cleanup = first
frame the script is inactive) records frames activation-1 .. cleanup+2 with, for every occupied slot: template and
callback symbol, oam priority/subpriority/y(raw and as SortSprites sees it, incl. the double-affine size-3 tweak)/x,
shape/size/affineMode, invisible, subsprite table pointer, plus sSpriteOrder, the emitted-OAM slot order
(sSpriteOrder filtered by inUse && !invisible, sprite.c:482-492) and the head of gMain.oamBuffer.
Also records every anim-script body (any move) so earlier bodies are known, and the free-slot order at activation-1.
"""
from __future__ import annotations
import bisect, hashlib, json, os, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
MOVE = int(sys.argv[1])
SCENARIO, OUTPUT = map(Path, sys.argv[2:])
PROFILE = os.environ.get("ALLOCATOR_TIE_PROFILE", "battle-scene-on")
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

BOOT = {"battle-scene-on": "factory.json", "battle-scene-off": "factory-battle-scene-off.json"}[PROFILE]
OAMBUF_HEAD = 48


def symbols(elf):
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(elf)], check=True, capture_output=True, text=True).stdout
    return {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}


def main():
    raw = json.loads(SCENARIO.read_text())
    raw["profile"] = PROFILE
    request = validate_request(raw, PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / BOOT)
    lab = BattleLab(oracle, PROFILE)
    names = symbols(ref / "pokeemerald.elf")
    addrs = sorted((a, n) for n, a in names.items() if 0x08000000 <= a < 0x0A000000)
    akeys = [a for a, _ in addrs]

    def sym(p):
        p &= ~1
        if not 0x08000000 <= p < 0x0A000000:
            return None if p == 0 else hex(p)
        i = bisect.bisect_right(akeys, p) - 1
        return addrs[i][1] if p == akeys[i] else f"{addrs[i][1]}+{p - akeys[i]:#x}"

    u8 = oracle.read_u8
    def u16(a): return u8(a) | u8(a + 1) << 8
    def u32(a): return u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a)
        return v - 65536 if v >= 32768 else v
    spr, oa, gmain = names["gSprites"], names["sSpriteOrder"], names["gMain"]
    frames, state = [], {"n": 0, "tf": None}
    symcache = {}

    def cached(p):
        if p not in symcache:
            symcache[p] = sym(p)
        return symcache[p]

    def sample():
        occ = {}
        for i in range(64):
            b = spr + 0x44 * i
            fl = u8(b + 0x3E)
            if not fl & 1:
                continue
            a0, a1, a2 = u16(b), u16(b + 2), u16(b + 4)
            y = a0 & 0xFF
            aff, shape, size = (a0 >> 8) & 3, (a0 >> 14) & 3, (a1 >> 14) & 3
            ey = y - 256 if y >= 160 else y
            if aff == 3 and size == 3 and shape in (0, 2) and ey > 128:
                ey -= 256
            x = a1 & 0x1FF
            occ[i] = {"tmpl": cached(u32(b + 0x14)), "cb": cached(u32(b + 0x1C)), "prio": (a2 >> 10) & 3, "sub": u8(b + 0x43),
                      "y": y, "ey": ey, "x": x, "aff": aff, "shape": shape, "size": size, "inv": (fl >> 2) & 1,
                      "subtab": u32(b + 0x18) != 0, "tile": a2 & 0x3FF}
        buf = []
        for k in range(OAMBUF_HEAD):
            e = gmain + 0x38 + 8 * k
            buf.append((u16(e), u16(e + 2), u16(e + 4)))
        frames.append({"n": state["n"], "tf": state["tf"], "order": [u8(oa + i) for i in range(64)], "occ": occ,
                       "act": u8(names["gAnimScriptActive"]), "mv": u16(names["sAnimMoveIndex"]), "buf": buf})

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

    # drop pre-battle frames (last frame with empty table + identity order, as spriteOrderEventProbe)
    start = 0
    for i, f in enumerate(frames):
        if not f["occ"] and f["order"] == list(range(64)):
            start = i
    frames = frames[start:]

    # all anim-script bodies (any move)
    bodies, i = [], 0
    while i < len(frames):
        if frames[i]["act"]:
            mv, j = frames[i]["mv"], i
            while j < len(frames) and frames[j]["act"]:
                j += 1
            if bodies and bodies[-1]["move"] == mv and i - bodies[-1]["cleanup"] <= 30:
                bodies[-1]["cleanup"] = j
            else:
                bodies.append({"move": mv, "activation": i, "cleanup": j})
            i = j
        else:
            i += 1
    out_bodies = []
    for bi, b in enumerate(bodies):
        rec = {"index": bi, "move": b["move"], "activationTick": frames[b["activation"]]["n"],
               "cleanupTick": frames[min(b["cleanup"], len(frames) - 1)]["n"]}
        if b["move"] == MOVE:
            a, c = b["activation"], min(b["cleanup"], len(frames) - 1)
            lo, hi = max(a - 1, 0), min(c + 2, len(frames) - 1)
            base = frames[lo]
            rec["baselineOccupied"] = sorted(base["occ"])
            rec["freeOrderAtActivationMinus1"] = [s for s in base["order"] if s not in base["occ"]]
            rec["fullOrderAtActivationMinus1"] = base["order"]
            rec["window"] = [{"n": f["n"], "act": f["act"], "order": f["order"], "buf": f["buf"],
                              "occ": {str(k): v for k, v in f["occ"].items()}} for f in frames[lo:hi + 1]]
        out_bodies.append(rec)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "allocator-consumer-tie-raw/v1", "move": MOVE, "profile": PROFILE,
        "scenario": str(SCENARIO), "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "frameCount": len(frames), "bodies": out_bodies}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} frames={len(frames)} bodies={[(b['move'], b['activationTick']) for b in out_bodies]}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)
