#!/usr/bin/env python3
"""lbre: per-frame gRngValue + rentalMons[0..5].monId along a battle-lab-staged compare trace (OFF).
fop1: also the deal's first opponent (gTrainerBattleOpponent_A, gFrontierTempParty[0..2], trainerIds[0]).

usage: ../../vendor/mgba-venv/bin/python tools/probe/lbre-deal-ram.py TRACE.json OUT.json START END
Frame numbers match compare-trace capture frames (frames advanced since the lab checkpoint).
"""
from __future__ import annotations
import json, sys
from pathlib import Path
if len(sys.argv) != 5: raise SystemExit(__doc__)
TRACE, OUT, START, END = Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
HERE = Path(__file__).resolve().parent; ROOT = HERE.parent.parent
def harness_root(start: Path) -> Path:
    for c in (start, *start.parents):
        if (c / "oracle" / "emerald_core.py").is_file(): return c
    raise SystemExit("no harness oracle")
ORACLE_DIR = harness_root(ROOT) / "oracle"; sys.path.insert(0, str(ORACLE_DIR))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
trace = json.loads(TRACE.read_text())
scenario = (TRACE.parent / trace["oracleBattleLab"]["scenario"]).resolve()
raw = json.loads(scenario.read_text())
req = validate_request(raw, "battle-scene-off")
ref = (ROOT / "reference" / "pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json")
BattleLab(oracle, "battle-scene-off").prepare(req)
s = oracle.symbols
def u16(a): return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)
def u32(a): return sum(oracle.read_u8(a + i) << (8 * i) for i in range(4))
rows = []
frame = 0
def snap():
    sb2 = u32(s["gSaveBlock2Ptr"])
    return {"frame": frame, "rng": u32(s["gRngValue"]), "rental": [u16(sb2 + 0xE70 + 12 * i) for i in range(6)],
            "pers": [u32(sb2 + 0xE70 + 12 * i + 4) for i in range(6)],
            "trainer": u16(s["gTrainerBattleOpponent_A"]), "tempParty": [u16(s["gFrontierTempParty"] + 2 * i) for i in range(3)],
            "trainerIds0": u16(sb2 + 0xCB4)}
for seg in trace["segments"]:
    for _ in range(seg["frames"]):
        oracle.advance(seg["buttons"]); frame += 1
        if START <= frame <= END: rows.append(snap())
        if frame > END: break
    if frame > END: break
OUT.write_text(json.dumps(rows))
print(len(rows), "rows")
