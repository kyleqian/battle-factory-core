#!/usr/bin/env python3
"""Source clock + per-frame sprite table for the wall-family moves.

Generalises lightScreenClockProbe.py: usage
  wallFamilyClockProbe.py <move-id> <scenario.json> <output.json>
Records, from trace frame 0 (ordinary BattleLab singles entry, no state
injection), every frame's animation-script pointer, controller/printer state
and occupied OBJ sprite table (slot, template, callback), then derives the
animation-active, script-pointer (load/delay) and sprite create/destroy ticks.
Also records the number of frames consumed by BattleLab.prepare so the
exact-call probe's step numbers can be mapped to trace frames.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: wallFamilyClockProbe.py <move-id> <scenario> <output.json>")
MOVE = int(sys.argv[1])
SCENARIO, OUTPUT = map(Path, sys.argv[2:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
LABELS = {115: "Move_REFLECT", 243: "Move_MIRROR_COAT", 112: "Move_BARRIER",
          277: "Move_MAGIC_COAT", 182: "Move_PROTECT"}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, PROFILE)
    prepare_steps = 0
    original_advance = oracle.advance

    def counting(buttons):
        nonlocal prepare_steps
        prepare_steps += 1
        return original_advance(buttons)

    oracle.advance = counting
    setup = lab.prepare(request)
    oracle.advance = original_advance
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(ref / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    names: dict[str, int] = {}
    by_addr: dict[int, list[str]] = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 3:
            addr = int(parts[0], 16) & ~1
            names[parts[2]] = addr
            by_addr.setdefault(addr, []).append(parts[2])
    label = LABELS[MOVE]
    base_ptr = names[label]

    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def u32(a): return oracle.read_u32(a)

    rows = []
    prev_table: dict[int, tuple[int, int]] = {}
    events = []  # sprite create/destroy by frame table diff
    anim_moves = []  # sequence of animation activations (first-body proof)
    prev_active = False
    prev_ptr = None
    ptr_trace = []

    def capture(frame: int) -> None:
        nonlocal prev_table, prev_active, prev_ptr
        active = bool(oracle.read_u8(names["gAnimScriptActive"]))
        move_index = u16(names["sAnimMoveIndex"])
        ptr = u32(names["sBattleAnimScriptPtr"])
        if active and not prev_active:
            anim_moves.append({"frame": frame, "moveIndex": move_index})
        if prev_active and not active:
            anim_moves[-1]["lastActiveFrame"] = frame - 1
        prev_active = active
        table = {}
        for i in range(64):
            base = names["gSprites"] + 0x44 * i
            if oracle.read_u8(base + 0x3E) & 1:
                table[i] = (u32(base + 0x14), u32(base + 0x1C))
        for slot in sorted(set(prev_table) | set(table)):
            before, after = prev_table.get(slot), table.get(slot)
            if before == after:
                continue
            def nm_(v):
                return None if v is None else {
                    "template": hex(v[0]), "templateNames": by_addr.get(v[0] & ~1, []),
                    "callback": hex(v[1]), "callbackNames": by_addr.get(v[1] & ~1, [])}
            events.append({"frame": frame, "slot": slot, "before": nm_(before), "after": nm_(after),
                           "kind": "create" if before is None else "destroy" if after is None else "replace"})
        prev_table = table
        if active and move_index == MOVE and ptr != prev_ptr:
            ptr_trace.append({"frame": frame, "scriptOffset": ptr - base_ptr,
                              "ptr": hex(ptr)})
        prev_ptr = ptr
        rows.append({"frame": frame, "active": active, "moveIndex": move_index,
                     "currentMove": u16(names["gCurrentMove"]) if "gCurrentMove" in names else None,
                     "occupied": sorted(table)})

    frame = 0
    capture(0)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    start = next((r["frame"] for r in rows if r["active"] and r["moveIndex"] == MOVE), None)
    if start is None:
        raise RuntimeError(f"{label} animation script never activated")
    # The anim flag drops/re-raises while the script waits (see activation
    # intervals); cleanup is the end of the last interval of this move.
    mine = [a for a in anim_moves if a["moveIndex"] == MOVE]
    for a in mine:
        a.setdefault("lastActiveFrame", None)
    # None means the flag stayed raised to trace end (observed for opponent
    # Protect); then the end-command frame is the only script-end anchor.
    cleanup = None if mine[-1]["lastActiveFrame"] is None else mine[-1]["lastActiveFrame"] + 1
    end_command = ptr_trace[-1]["frame"]
    window = [e for e in events if start <= e["frame"] <= (cleanup or end_command)]
    baseline_row = next(r for r in rows if r["frame"] == start - 1)
    end_row = next(r for r in rows if r["frame"] == (cleanup or end_command))
    payload = {
        "schema": "wall-family-source-clock/v1",
        "move": MOVE, "label": label,
        "scenario": str(SCENARIO), "profile": PROFILE, "setup": setup,
        "prepareSteps": prepare_steps,
        "toolSha256": sha(Path(__file__)),
        "referenceSha256": {n: sha(ref / n) for n in ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map")},
        "animationActivations": anim_moves,
        "firstAnimationIsThisMove": bool(anim_moves) and anim_moves[0]["moveIndex"] == MOVE,
        "activationFrame": start, "cleanupFrame": cleanup, "endCommandFrame": end_command,
        "activeAtTraceEnd": cleanup is None,
        "scriptPointerTrace": ptr_trace,
        "allSpriteEvents": events,
        "windowSpriteEvents": window,
        "baselineOccupied": baseline_row["occupied"],
        "endOccupied": end_row["occupied"],
        "activeFrames": [r["frame"] for r in rows if r["active"] and r["moveIndex"] == MOVE][:1]
                         + [r["frame"] for r in rows if r["active"] and r["moveIndex"] == MOVE][-1:],
        "framesRun": frame,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: start={start} cleanup={cleanup} firstIsMove={payload['firstAnimationIsThisMove']} events={len(window)}")


if __name__ == "__main__":
    main()
