#!/usr/bin/env python3
"""Generic sprite-allocator net-zero probe (Scene ON), generalising wallFamilyClockProbe.py.

usage: allocatorNetZeroProbe.py <move-id> <scenario.json> <output.json>

Frame-API pass only (no single-stepping). From trace frame 0 it samples, every frame,
gAnimScriptActive / sAnimMoveIndex and the occupied OBJ slots (+template/callback).
Per body of the move (activation = first frame active with sAnimMoveIndex == move,
merged with re-raises of the same move <= MERGE_GAP frames later; cleanup = first frame
the script is no longer active after the last merged interval) it records baseline
(occupied at activation-1), end (occupied at cleanup), create/destroy slot events in
[activation, cleanup], and any occupied-set change in the 8 frames after cleanup.
Only window rows are stored (activation-1 .. cleanup+8), not every frame.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: allocatorNetZeroProbe.py <move-id> <scenario> <output.json>")
MOVE = int(sys.argv[1])
SCENARIO, OUTPUT = map(Path, sys.argv[2:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
BY_ADDR: dict[int, list[str]] = {}
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
            BY_ADDR.setdefault(int(parts[0], 16) & ~1, []).append(parts[2])
    return names


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

    rows = []  # (frame, active, moveIndex, table{slot:(template,callback)})

    def capture(frame: int) -> None:
        table = {}
        for i in range(64):
            base = names["gSprites"] + 0x44 * i
            if u8(base + 0x3E) & 1:
                table[i] = (u32(base + 0x14), u32(base + 0x1C))
        rows.append((frame, bool(u8(names["gAnimScriptActive"])), u16(names["sAnimMoveIndex"]), table))

    frame = 0
    capture(0)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    # active intervals per move (first-active .. last-active), in order
    intervals = []
    for f, active, mi, _ in rows:
        if active and intervals and intervals[-1]["open"] and intervals[-1]["move"] == mi:
            continue
        if intervals and intervals[-1]["open"]:
            intervals[-1]["open"] = False
            intervals[-1]["end"] = f  # first frame not active (or other move)
        if active:
            intervals.append({"move": mi, "start": f, "end": None, "open": True})
    for iv in intervals:
        if iv["open"]:
            iv["end"] = None
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
    by_frame = {r[0]: r for r in rows}
    out_bodies = []
    for b in bodies:
        a = b["start"]
        c = b["lastEnd"]
        first_inactive = b["intervals"][0][1]
        body = {"activation": a, "cleanup": c, "firstInactive": first_inactive,
                "intervals": b["intervals"], "activeAtTraceEnd": c is None}
        if c is None or a == 0:
            body["error"] = "no cleanup within trace" if c is None else "activation at frame 0"
            out_bodies.append(body)
            continue
        base = by_frame[a - 1][3]
        end = by_frame[c][3]
        events, created, destroyed = [], 0, 0
        prev = base
        for fr in range(a, c + 1):
            t = by_frame[fr][3]
            for slot in sorted(set(prev) | set(t)):
                bf, af = prev.get(slot), t.get(slot)
                if bf == af:
                    continue
                kind = "create" if bf is None else "destroy" if af is None else "replace"
                if kind in ("create", "replace"): created += 1
                if kind in ("destroy", "replace"): destroyed += 1
                events.append([fr, slot, kind, hex((af or bf)[0]), hex((af or bf)[1])])
            prev = t
        late, prev = [], end
        for fr in range(c + 1, min(c + LATE, frame) + 1):
            t = by_frame[fr][3]
            if set(t) != set(prev):
                nm = lambda v: [hex(v[0]), BY_ADDR.get(v[0] & ~1, [])[:2], hex(v[1]), BY_ADDR.get(v[1] & ~1, [])[:2]]
                late.append({"frame": fr, "occupied": sorted(t),
                             "added": [[x] + nm(t[x]) for x in sorted(set(t) - set(prev))],
                             "removed": [[x] + nm(prev[x]) for x in sorted(set(prev) - set(t))]})
            prev = t
        # rows: only the occupied-set changes in activation-1 .. cleanup+8
        win = []
        pv = None
        for fr in range(a - 1, min(c + LATE, frame) + 1):
            s = sorted(by_frame[fr][3])
            if s != pv:
                win.append([fr, s]); pv = s
        body.update({
            "baseline": sorted(base), "end": sorted(end),
            "created": created, "destroyed": destroyed,
            "endEqualsBaselineTable": base == end,
            "firstInactiveEndOccupied": sorted(by_frame[first_inactive][3]) if first_inactive else None,
            "lateChanges": late, "windowEvents": events, "occupiedChanges": win,
            "netZero": sorted(base) == sorted(end) and created == destroyed and not late,
        })
        out_bodies.append(body)
    payload = {
        "schema": "allocator-net-zero-raw/v1", "move": MOVE, "scenario": str(SCENARIO),
        "profile": PROFILE, "toolSha256": sha(Path(__file__)),
        "framesRun": frame, "activationSequence": sequence, "bodies": out_bodies,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: bodies={[(b['activation'], b['cleanup']) for b in out_bodies]}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)  # mGBA teardown segfaults at interpreter exit (rc 139); output is already written
