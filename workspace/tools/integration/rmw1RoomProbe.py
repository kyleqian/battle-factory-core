#!/usr/bin/env python3
"""rmw1: per-frame ROM state (gMain callbacks / vblank counter, RNG, task funcs, palette fade) around a trace window.

  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/integration/rmw1RoomProbe.py OUT.json TRACE.json FROM TO
"""
import bisect, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
out, trace_path, lo, hi = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
rom = sorted((a, n) for n, a in o.symbols.items() if 0x08000000 <= a < 0x0A000000)
addrs = [a for a, _ in rom]

def name(a):
    a &= ~1
    i = bisect.bisect_right(addrs, a) - 1
    if i < 0: return hex(a)
    return f"{rom[i][1]}+{a - rom[i][0]:#x}"

sym = o.symbols
frames = []
for s in json.load(open(trace_path))["segments"]:
    frames += [s["buttons"]] * s["frames"]
o.new_session()
log = []
for i, b in enumerate(frames):
    if i >= hi: break
    o.advance(b)
    if i + 1 < lo: continue
    m = sym["gMain"]
    tasks = []
    for t in range(16):
        base = sym["gTasks"] + t * 0x28
        if o.read_u8(base + 4):
            tasks.append([name(o.read_u32(base)), [o.read_u16(base + 8 + 2 * k) for k in range(8)]])
    log.append({
        "f": i + 1, "btn": b, "cb1": name(o.read_u32(m)), "cb2": name(o.read_u32(m + 4)),
        "vb1": o.read_u32(m + 0x20), "vb2": o.read_u32(m + 0x24), "newKeys": o.read_u16(m + 0x2e),
        "rng": o.read_u32(sym["gRngValue"]), "fade": o.read_u8(sym["gPaletteFade"] + 7) if "gPaletteFade" in sym else None,
        "tasks": tasks,
    })
Path(out).write_text(json.dumps(log, indent=1))
