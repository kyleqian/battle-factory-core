#!/usr/bin/env python3
"""prep61: tools/compare/spriteOrderEventProbe.py verbatim (same rows, same schema) plus an "extra" list for the semi-invulnerable
two-turn units (docs/next-adapters-prep61.md): [n, gAnimMoveTurn, battler sprite invisible bits (bit b = gSprites[gBattlerSpriteIds[b]]
.invisible, b = 0 player / 1 opponent), STATUS3_SEMI_INVULNERABLE bits (bit b = gStatuses3[b] & (UNDERGROUND | ON_AIR | UNDERWATER)),
gRng2Value] on every sampled frame where any of the four changed (frames before the battle's ResetSpriteData dropped, as rows).

usage: prep61EventProbe.py <move-id> <scenario.json> <output.json>
Original docstring:
Per-frame sSpriteOrder + inUse/key probe from the battle's ResetSpriteData to end of trace (Scene ON).

Hooks oracle.advance so every frame of lab.prepare() and of the trace is sampled: the 64-byte
sSpriteOrder, the inUse bitmask, per-slot SortSprites key for occupied slots, gAnimScriptActive and
sAnimMoveIndex.  Frames before the last "all free + identity order" frame (battle ResetSpriteData)
are dropped.  Optional env SPRITE_ORDER_ABI=1 is not used here; exact in-frame call order comes from
the existing lightScreen/wallFamily call probes and is consumed by spriteOrderEventModel.py.
"""
from __future__ import annotations
import hashlib, json, os, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: prep61EventProbe.py <move-id> <scenario> <output.json>")
MOVE = int(sys.argv[1])
SCENARIO, OUTPUT = map(Path, sys.argv[2:])
ROOT = Path(__file__).resolve().parents[2]  # tools/integration/ -> workspace/
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
IDENT = list(range(64))


def symbols(elf):
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(elf)], check=True, capture_output=True, text=True).stdout
    return {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}


def main():
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, PROFILE)
    names = symbols(ref / "pokeemerald.elf")
    u8 = oracle.read_u8
    spr, oa = names["gSprites"], names["sSpriteOrder"]
    frames, state = [], {"n": 0, "tf": None}

    def u16(a): return u8(a) | u8(a + 1) << 8

    def u32(a): return u16(a) | u16(a + 2) << 16
    SEMI = (1 << 6) | (1 << 7) | (1 << 18)  # STATUS3_UNDERGROUND | STATUS3_ON_AIR | STATUS3_UNDERWATER

    def sample():
        mask, keys = 0, {}
        for i in range(64):
            b = spr + 0x44 * i
            if u8(b + 0x3E) & 1:
                mask |= 1 << i
                a0, a1, a2 = u16(b), u16(b + 2), u16(b + 4)
                keys[i] = [(a2 >> 10) & 3, u8(b + 0x43), a0 & 0xFF, (a0 >> 8) & 3, (a1 >> 14) & 3, (a0 >> 14) & 3, (u8(b + 0x3E) >> 2) & 1]
        order = [u8(oa + i) for i in range(64)]
        if mask == 0 and order == IDENT:
            frames.clear()
        inv = sum(((u8(spr + 0x44 * u8(names["gBattlerSpriteIds"] + b) + 0x3E) >> 2) & 1) << b for b in (0, 1))
        semi = sum((1 if u32(names["gStatuses3"] + 4 * b) & SEMI else 0) << b for b in (0, 1))
        frames.append({"n": state["n"], "tf": state["tf"], "order": order, "mask": mask, "keys": keys,
                       "act": u8(names["gAnimScriptActive"]), "mv": u16(names["sAnimMoveIndex"]),
                       "x": (u8(names["gAnimMoveTurn"]), inv, semi, u32(names["gRng2Value"]))})

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
    # compact: one row per frame where order/mask/anim state changed: [n, traceFrame, orderHex, maskHex, active, move, keys?]
    # keys (slot -> [prio, sub, oam.y, affine, size, shape, invisible]) are kept only on frames whose mask differs from the previous frame or from the next frame (state just before a create/destroy)
    extra, px = [], None
    for f in frames:
        if f["x"] != px:
            extra.append([f["n"], *f["x"]])
        px = f["x"]
    rows, prev = [], None
    for i, f in enumerate(frames):
        sig = (tuple(f["order"]), f["mask"], f["act"], f["mv"])
        before_change = i + 1 < len(frames) and frames[i + 1]["mask"] != f["mask"]
        if sig != prev or before_change:
            row = [f["n"], f["tf"], bytes(f["order"]).hex(), format(f["mask"], "x"), f["act"], f["mv"]]
            if prev is None or prev[1] != f["mask"] or before_change:
                row.append({str(k): v for k, v in f["keys"].items()})
            rows.append(row)
        prev = sig
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "sprite-order-event-raw/v2", "move": MOVE, "scenario": str(SCENARIO),
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "frameCount": len(frames),
        "firstFrame": frames[0]["n"], "lastFrame": frames[-1]["n"], "rows": rows, "extra": extra}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} frames={len(frames)} rows={len(rows)}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)
