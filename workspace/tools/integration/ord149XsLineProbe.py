#!/usr/bin/env python3
"""ord149 B1: per-row scanline split of Extrasensory 326 bodies (direct mGBA, Scene ON, fresh process; never the HTTP oracles).
usage (from workspace/, mgba venv + PYTHONPATH = libmgba-py): ord149XsLineProbe.py <scenario.json> <out.json>
Every frame whose sAnimMoveIndex is 326 while gAnimScriptActive is stepped instruction by instruction. Inside
AnimTask_ExtrasensoryDistortion_Step (battle_anim_psychic.c) each write loop iteration is located by its loop-head PC (the PC seen exactly
data[15] - data[14] + 1 times in the call); for iteration k (line L = data[14] + k) the probe records REG_VCOUNT and DISPSTAT's HBlank bit at
that moment. Line L's word is HBlank-DMA'd in the HBlank of line L - 1, so a write at VCOUNT v < 160 shows on this frame only when
v < L - 1 or (v == L - 1 and not yet in HBlank); otherwise line L still shows the previous row's word (the scanout split, prep30 s1.4).
Per stepped row: [traceFrame, task data[0], data[1], data[14], data[15], entry VCOUNT, exit VCOUNT, old lines (still the previous word)]."""
import json, subprocess, sys
from collections import Counter
from pathlib import Path

SCEN, OUT = map(Path, sys.argv[1:3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

ref = ROOT / "reference" / "pokeemerald"
data = json.loads(SCEN.read_text()); data["profile"] = "battle-scene-on"
req = validate_request(data, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
syms = [(int(p[0], 16), p[2]) for p in (l.split() for l in nm.splitlines()) if len(p) == 3]
start = next(a for a, n in syms if n == "AnimTask_ExtrasensoryDistortion_Step")
end = min(a for a, n in syms if a > start and n != "AnimTask_ExtrasensoryDistortion_Step")
TASKS = next(a for a, n in syms if n == "gTasks")
ACTIVE = next(a for a, n in syms if n == "gAnimScriptActive"); MOVE = next(a for a, n in syms if n == "sAnimMoveIndex")
u8, u16 = o.read_u8, o.read_u16
core = o.core


def s16(v): return v - 0x10000 if v & 0x8000 else v


def task_of():  # the live task whose func is the distortion step (struct Task: func u32 @0, isActive @4, data[16] s16 @8; 40 bytes)
    for t in range(16):
        b = TASKS + 40 * t
        if u8(b + 4) and (o.read_u32(b) & ~1) == start:
            return [s16(u16(b + 8 + 2 * k)) for k in range(16)]
    return None


rows, tf = [], 0
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        if u8(ACTIVE) and u16(MOVE) == 326:
            o._set_buttons(seg.get("buttons", []))
            fc = core.frame_counter
            calls, cur = [], None
            while core.frame_counter == fc:
                core.step()
                pc = core.cpu.pc & ~1
                inside = start <= pc < end
                if inside and cur is None:
                    d = task_of()
                    cur = {"d": d, "pcs": [], "v0": u16(0x04000006)}
                if inside:
                    cur["pcs"].append((pc, u16(0x04000006), u16(0x04000004) & 2))
                elif cur is not None:
                    cur["v1"] = u16(0x04000006); calls.append(cur); cur = None
            for c in calls:
                d = c["d"]
                if d is None or d[0] != 0:
                    rows.append([tf, None if d is None else d[0], None if d is None else d[1], None, None, c["v0"], c["v1"], None]); continue
                n = d[15] - d[14] + 1
                counts = Counter(p for p, _, _ in c["pcs"])
                head = min((p for p, k in counts.items() if k == n), default=None)
                old = []
                if head is not None:
                    hits = [(v, hb) for p, v, hb in c["pcs"] if p == head]
                    for k, (v, hb) in enumerate(hits):
                        line = d[14] + k
                        if v < 160 and (v > line - 1 or (v == line - 1 and hb)):
                            old.append(line)
                rows.append([tf, d[0], d[1], d[14], d[15], c["v0"], c["v1"], old if head is not None else "no loop head"])
            tf += 1
        else:
            o.advance(seg.get("buttons", [])); tf += 1
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"schema": "ord149-xs-lines/v1", "scenario": SCEN.name, "rows": rows}, separators=(",", ":")) + "\n")
print(f"wrote {OUT} rows={len(rows)}")
