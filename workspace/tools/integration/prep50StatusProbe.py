#!/usr/bin/env python3
"""prep50: sprite-allocator net-zero probe keyed on the STATUS-ANIMATION script (docs/next-adapters-prep50.md).

usage: prep50StatusProbe.py <STATUS_LABEL> <scenario.json> <output.json>      e.g. Status_Sleep
A copy of tools/compare/allocatorNetZeroProbe.py (frame-API pass, Scene ON, same window/net-zero definition as
docs/allocator-net-zero-audit.md) with ONE change: a body is an active interval of gAnimScriptActive (0 -> 1 -> 0) whose
script, at the interval's first active frame, is the status label: the ELF label containing sBattleAnimScriptPtr, or, when
that pointer is inside a called subroutine (Status_Confusion -> ConfusionEffect, Status_Paralysis -> ElectricityEffect), the
label containing sBattleAnimScriptRetAddr (Cmd_call, battle_anim.c ~:1046) -- only when the pointer's own label is not a
script entry (Move_/General_/Special_/Status_*), because the return address is stale after `return` -- and sAnimMoveIndex is 0
(a move animation sets it to the move id). Status animations launch with sAnimMoveIndex = 0
(LaunchBattleAnimation(gBattleAnims_StatusConditions, id, FALSE), battle_anim.c ~:231), so the move-index key cannot see them.
Per body: baseline (occupied OBJ slots at activation-1), end (at the first inactive frame), create/destroy events in between,
and occupied-set changes in the 8 frames after; gBattleAnimAttacker at activation (0 player, 1 opponent).
"""
from __future__ import annotations

import bisect
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: prep50StatusProbe.py <STATUS_LABEL> <scenario> <output.json>")
LABEL = sys.argv[1]
SCENARIO, OUTPUT = map(Path, sys.argv[2:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
LATE = 8


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(ref / "pokeemerald.elf")], check=True,
                        capture_output=True, text=True).stdout
    names: dict[str, int] = {}
    data_labels: list[tuple[int, str]] = []
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 3:
            names[parts[2]] = int(parts[0], 16)
            if parts[1] in "dDrR":
                data_labels.append((int(parts[0], 16), parts[2]))
    data_labels.sort()
    addrs = [a for a, _ in data_labels]

    def label_of(x: int) -> str:
        i = bisect.bisect_right(addrs, x) - 1
        return data_labels[i][1] if i >= 0 else "?"

    u8, u32 = oracle.read_u8, oracle.read_u32
    rows = []  # (frame, active, ptr, retaddr, attacker, table{slot:(template,callback)}, sAnimMoveIndex)

    def capture(frame: int) -> None:
        table = {}
        for i in range(64):
            base = names["gSprites"] + 0x44 * i
            if u8(base + 0x3E) & 1:
                table[i] = (u32(base + 0x14), u32(base + 0x1C))
        rows.append((frame, bool(u8(names["gAnimScriptActive"])), u32(names["sBattleAnimScriptPtr"]),
                     u32(names["sBattleAnimScriptRetAddr"]), u8(names["gBattleAnimAttacker"]), table, u8(names["sAnimMoveIndex"]) | u8(names["sAnimMoveIndex"] + 1) << 8))

    frame = 0
    capture(0)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    intervals = []
    entry = ("Move_", "General_", "Special_", "Status_")
    for f, active, ptr, ret, attacker, _, move_index in rows:
        if active and (not intervals or intervals[-1]["end"] is not None):
            own = label_of(ptr)
            script = own if own.startswith(entry) else label_of(ret) if label_of(ret).startswith("Status_") else own
            if move_index != 0 and script.startswith("Status_"):
                script = f"move {move_index} ({own})"
            intervals.append({"start": f, "end": None, "script": script, "ptrLabel": own, "attacker": attacker})
        elif not active and intervals and intervals[-1]["end"] is None:
            intervals[-1]["end"] = f
    by_frame = {r[0]: r for r in rows}
    bodies = []
    for iv in intervals:
        if iv["script"] != LABEL:
            continue
        a, c = iv["start"], iv["end"]
        body = {"activation": a, "cleanup": c, "attacker": iv["attacker"], "ptrLabel": iv["ptrLabel"]}
        if c is None or a == 0:
            body["error"] = "no cleanup within trace" if c is None else "activation at frame 0"
            bodies.append(body)
            continue
        base, end = by_frame[a - 1][5], by_frame[c][5]
        events, created, destroyed, prev = [], 0, 0, base
        for fr in range(a, c + 1):
            t = by_frame[fr][5]
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
            t = by_frame[fr][5]
            if set(t) != set(prev):
                late.append({"frame": fr, "occupied": sorted(t)})
            prev = t
        body.update({"baseline": sorted(base), "end": sorted(end), "created": created, "destroyed": destroyed,
                     "endEqualsBaselineTable": base == end, "lateChanges": late, "windowEvents": events,
                     "netZero": sorted(base) == sorted(end) and created == destroyed and not late})
        bodies.append(body)
    payload = {
        "schema": "prep50-status-net-zero-raw/v1", "label": LABEL, "labelAddress": hex(names[LABEL]), "scenario": str(SCENARIO),
        "profile": PROFILE, "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "framesRun": frame,
        "scriptSequence": [[iv["start"], iv["end"], iv["script"], iv["attacker"]] for iv in intervals], "bodies": bodies,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: bodies={[(b['activation'], b['cleanup'], b['attacker'], b.get('netZero')) for b in bodies]}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)  # mGBA teardown segfaults at interpreter exit; output is already written
