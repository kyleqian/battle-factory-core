#!/usr/bin/env python3
"""sSpriteOrder probe (Scene ON). Activation/cleanup detection copied from allocatorNetZeroProbe.py
(that module parses argv at import, so it cannot be imported).

usage: spriteOrderProbe.py <move-id> <scenario.json> <output.json>

Per frame from trace frame 0 it reads gAnimScriptActive / sAnimMoveIndex, the 64-byte sSpriteOrder
and, for every gSprites slot, inUse/invisible, oam.y/priority/affineMode/size/shape and subpriority.
Per body of the move (activation = first active frame with sAnimMoveIndex == move; cleanup = first
inactive frame after merged re-raises) it stores: full order + keys at activation-1, activation and
cleanup; the effect slots (created in [activation, cleanup]); every order change in the window; and
a self-check that order[f] == stable_sort(order[f-1], keys[f]) for every frame (SortSprites semantics).
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: spriteOrderProbe.py <move-id> <scenario> <output.json>")
MOVE = int(sys.argv[1])
SCENARIO, OUTPUT = map(Path, sys.argv[2:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
MERGE_GAP = 30
LATE = 8


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def symbols(elf: Path) -> dict[str, int]:
    import subprocess
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(elf)], check=True,
                        capture_output=True, text=True).stdout
    names: dict[str, int] = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 3:
            names[parts[2]] = int(parts[0], 16)
    return names


def sort_key(k):
    """SortSprites key (priority<<8|subpriority, wrapped y with double-affine size3 rule)."""
    prio, sub, y, aff, size, shape = k
    p = sub | (prio << 8)
    if y >= 160:
        y -= 256
    if aff == 3 and size == 3 and shape in (0, 2) and y > 128:
        y -= 256
    return p, y


def resort(order, keys):
    """One source SortSprites pass (persistent insertion sort, ties keep previous order)."""
    o = list(order)
    for i in range(1, 64):
        j = i
        while j > 0:
            p1, y1 = sort_key(keys[o[j - 1]])
            p2, y2 = sort_key(keys[o[j]])
            if p1 > p2 or (p1 == p2 and y1 < y2):
                o[j], o[j - 1] = o[j - 1], o[j]
                j -= 1
            else:
                break
    return o


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    names = symbols(ref / "pokeemerald.elf")
    u8, u32 = oracle.read_u8, oracle.read_u32

    def u16(a): return u8(a) | u8(a + 1) << 8

    spr, order_addr = names["gSprites"], names["sSpriteOrder"]
    rows = []  # (frame, active, move, order, keys{slot:(prio,sub,y,aff,size,shape)}, flags{slot:(inUse,invisible,template)})

    def capture(frame: int) -> None:
        keys, flags = [], {}
        for i in range(64):
            b = spr + 0x44 * i
            a0, a1, a2 = u16(b), u16(b + 2), u16(b + 4)
            keys.append(((a2 >> 10) & 3, u8(b + 0x43), a0 & 0xFF, (a0 >> 8) & 3, (a1 >> 14) & 3, (a0 >> 14) & 3))
            f = u8(b + 0x3E)
            if f & 1:
                flags[i] = (1, (f >> 2) & 1, u32(b + 0x14))
        order = [u8(order_addr + i) for i in range(64)]
        rows.append((frame, bool(u8(names["gAnimScriptActive"])), u16(names["sAnimMoveIndex"]), order, keys, flags))

    frame = 0
    capture(0)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    intervals = []
    for f, active, mi, *_ in rows:
        if active and intervals and intervals[-1]["open"] and intervals[-1]["move"] == mi:
            continue
        if intervals and intervals[-1]["open"]:
            intervals[-1]["open"] = False
            intervals[-1]["end"] = f
        if active:
            intervals.append({"move": mi, "start": f, "end": None, "open": True})
    sequence = [{"move": iv["move"], "start": iv["start"], "end": iv["end"]} for iv in intervals]
    mine = [iv for iv in intervals if iv["move"] == MOVE]
    bodies, cur = [], None
    for iv in mine:
        if cur and iv["start"] - cur["lastEnd"] <= MERGE_GAP and not any(
                o["move"] != MOVE and cur["lastEnd"] <= o["start"] <= iv["start"] for o in intervals):
            cur["intervals"].append([iv["start"], iv["end"]]); cur["lastEnd"] = iv["end"]
        else:
            cur = {"intervals": [[iv["start"], iv["end"]]], "lastEnd": iv["end"], "start": iv["start"]}
            bodies.append(cur)
    by = {r[0]: r for r in rows}

    def snap(fr):
        _, _, _, order, keys, flags = by[fr]
        return {"frame": fr, "order": order,
                "occupied": [[s, flags[s][1], hex(flags[s][2])] + list(keys[s]) for s in sorted(flags)],
                "freeKeys": sorted({tuple(keys[s]) for s in range(64) if s not in flags})}

    out = []
    for b in bodies:
        a, c = b["start"], b["lastEnd"]
        body = {"activation": a, "cleanup": c, "intervals": b["intervals"]}
        if c is None or a < 2:
            body["error"] = "no cleanup within trace" if c is None else "activation too early"
            out.append(body); continue
        created = set()
        for fr in range(a, c + 1):
            created |= set(by[fr][5]) - set(by[fr - 1][5])
        changes, resort_ok, resort_bad = [], 0, []
        for fr in range(a - 1, min(c + LATE, frame) + 1):
            prev, cu = by[fr - 1], by[fr]
            if resort(prev[3], cu[4]) == cu[3]:
                resort_ok += 1
            else:
                resort_bad.append(fr)
            if cu[3] != prev[3]:
                changes.append([fr, cu[3]])
        body.update({"before": snap(a - 1), "atActivation": snap(a), "atCleanup": snap(c),
                     "effectSlots": sorted(created), "orderChanges": changes,
                     "resortOk": resort_ok, "resortBad": resort_bad})
        out.append(body)
    payload = {"schema": "sprite-order-raw/v1", "move": MOVE, "scenario": str(SCENARIO), "profile": PROFILE,
               "toolSha256": sha(Path(__file__)), "framesRun": frame, "activationSequence": sequence, "bodies": out}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: bodies={[(x['activation'], x['cleanup']) for x in out]}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)
