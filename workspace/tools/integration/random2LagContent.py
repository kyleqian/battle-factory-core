#!/usr/bin/env python3
"""Lag-frame content dependence along a trace (direct mGBA, fast pass only).

A lag frame = a frame in which gRng2Value did not advance (no AgbMain iteration, so no
RfuMain1 -> Random2, link_rfu_2.c:2023). For every action-selection lag cluster this records
the player's active battler (gBattleMons[0].species, moves) and the player controller
function, so the doc can show whether the same event's lag count follows the content.

usage: python3 tools/run-mgba-probe.py OUT -- <mgba python> tools/integration/random2LagContent.py <trace> OUT
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

TRACE, OUT = sys.argv[1], sys.argv[2]
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
nm = {}
for line in subprocess.run(["arm-none-eabi-nm", "-n", "--defined-only", str(REF / "pokeemerald.elf")],
                           check=True, capture_output=True, text=True).stdout.splitlines():
    parts = line.split()
    if len(parts) == 3:
        nm.setdefault(parts[2], int(parts[0], 16))
by_addr = {a & ~1: n for n, a in nm.items() if a >= 0x08000000}

o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
o.new_session()
trace = json.loads(Path(TRACE).read_text())
frames = [seg.get("buttons", []) for seg in trace["segments"] for _ in range(int(seg["frames"]))]
RNG2, BMONS, BMF, CTRL = nm["gRng2Value"], nm["gBattleMons"], nm["gBattleMainFunc"], nm["gBattlerControllerFuncs"]
prev = o.read_u32(RNG2)
lags = []
for i, buttons in enumerate(frames, 1):
    o.advance(buttons)
    cur = o.read_u32(RNG2)
    if cur == prev:
        bmf = by_addr.get(o.read_u32(BMF) & ~1, hex(o.read_u32(BMF)))
        if bmf == "HandleTurnActionSelectionState":
            lags.append({"frame": i, "ctrl": by_addr.get(o.read_u32(CTRL) & ~1, "?"),
                         "species": o.read_u16(BMONS), "moves": [o.read_u16(BMONS + 0x0C + 2 * k) for k in range(4)],
                         "pressed": buttons})
    prev = cur
clusters = []
for lag in lags:
    if clusters and lag["frame"] - clusters[-1]["frames"][-1] <= 4:
        clusters[-1]["frames"].append(lag["frame"])
    else:
        clusters.append({"frames": [lag["frame"]], "species": lag["species"], "moves": lag["moves"]})
for c in clusters:
    c["lagCount"] = len(c["frames"])
Path(OUT).write_text(json.dumps({"trace": TRACE, "selectionLagClusters": clusters}, separators=(",", ":")) + "\n")
print(f"wrote {OUT}: {len(clusters)} clusters", flush=True)
