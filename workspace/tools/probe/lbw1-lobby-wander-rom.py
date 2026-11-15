#!/usr/bin/env python3
"""lbw1: per-frame ROM RAM probe of the Lobby field NPCs along a battle-lab-staged compare trace (Scene OFF).

usage (through the probe runner):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/probe/lbw1-lobby-wander-rom.py TRACE.json OUT.json [START END]

Replays the trace's own oracleBattleLab scenario + segments (frame N = frames advanced since the lab checkpoint,
the same numbering as compare-trace capture frames). Every frame records gRngValue, sRandCount (the ROM's own
Random() call counter), gMain.callback2, the map, sGlobalScriptContextStatus, and once a Lobby map is current the
full state of every active object event (tile, previous tile, facing, frozen, held / single movement, action id)
plus the sprite data[] of the movement-type NPCs (data[1] = sTypeFuncId, data[2] = sActionFuncId, data[3] = delay).
Dev-time only; never at runtime.
"""
from __future__ import annotations
import json, sys
from pathlib import Path

if len(sys.argv) not in (3, 5):
    raise SystemExit(__doc__)
TRACE, OUT = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
START = int(sys.argv[3]) if len(sys.argv) == 5 else 0
END = int(sys.argv[4]) if len(sys.argv) == 5 else 10**9

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent


def harness_root(start: Path) -> Path:
    for c in (start, *start.parents):
        if (c / "oracle" / "emerald_core.py").is_file():
            return c
    raise SystemExit("no harness oracle")


ORACLE_DIR = harness_root(ROOT) / "oracle"
sys.path.insert(0, str(ORACLE_DIR))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

OBJECT_EVENTS = 0x2037350
OBJ_STRIDE = 0x24
G_SPRITES = 0x2020630
SPRITE_STRIDE = 0x44
G_RNG_VALUE = 0x3005D80
G_MAIN = 0x30022C0
G_SAVEBLOCK1_PTR = 0x3005D8C
S_RAND_COUNT = 0x20249C0
S_SCRIPT_STATUS = 0x3000E38
S_AMBIENT_SPECIES = 0x2032304
G_BACKUP_MAP_LAYOUT = 0x3005DC0
CB2_OVERWORLD = 0x8085E5D
LOBBY_MAP = (26, 31)  # MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY = 31 | 26 << 8: mapNum 31, mapGroup 26

trace = json.loads(TRACE.read_text())
scenario = (TRACE.parent / trace["oracleBattleLab"]["scenario"]).resolve()
req = validate_request(json.loads(scenario.read_text()), "battle-scene-off")
ref = (ROOT / "reference" / "pokeemerald").resolve()
oracle = EmeraldOracle(
    ref / "pokeemerald.gba", ref / "pokeemerald.map", ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
)
BattleLab(oracle, "battle-scene-off").prepare(req)
mem = oracle.core.memory.u8


def s16(b, o):
    v = b[o] | (b[o + 1] << 8)
    return v - 0x10000 if v & 0x8000 else v


def u32(a):
    return oracle.read_u32(a)


def snap(frame: int) -> dict:
    global grid
    row = {
        "f": frame,
        "rng": u32(G_RNG_VALUE),
        "cnt": u32(S_RAND_COUNT),
        "cb2": u32(G_MAIN + 4),
        "st": oracle.read_u8(S_SCRIPT_STATUS),
    }
    sb1 = u32(G_SAVEBLOCK1_PTR)
    loc = mem[sb1 + 4 : sb1 + 6]
    sgrp, snum = (loc[0] - 256 if loc[0] > 127 else loc[0]), (loc[1] - 256 if loc[1] > 127 else loc[1])
    row["map"] = [sgrp, snum]
    if (sgrp, snum) != LOBBY_MAP:
        return row
    row["amb"] = oracle.read_u8(S_AMBIENT_SPECIES) | (oracle.read_u8(S_AMBIENT_SPECIES + 1) << 8)
    blk = mem[OBJECT_EVENTS : OBJECT_EVENTS + 16 * OBJ_STRIDE]
    evs = []
    for i in range(16):
        b = blk[i * OBJ_STRIDE : (i + 1) * OBJ_STRIDE]
        fl0, fl1, fl2 = b[0], b[1], b[2]
        if not fl0 & 1:
            continue
        fm = b[0x18] | (b[0x19] << 8)
        e = {
            "slot": i,
            "spr": b[4],
            "gfx": b[5],
            "mt": b[6],
            "tt": b[7],
            "elev": b[0x0B] & 0xF,
            "ini": [s16(b, 0x0C), s16(b, 0x0E)],
            "cur": [s16(b, 0x10), s16(b, 0x12)],
            "prv": [s16(b, 0x14), s16(b, 0x16)],
            "face": fm & 0xF,
            "mdir": (fm >> 4) & 0xF,
            "range": [b[0x19] & 0xF, b[0x19] >> 4],
            "act": b[0x1C],
            "single": (fl0 >> 1) & 1,
            "held": (fl0 >> 6) & 1,
            "heldFin": (fl0 >> 7) & 1,
            "frozen": fl1 & 1,
            "faceLock": (fl1 >> 1) & 1,
            "player": fl2 & 1,
        }
        if e["mt"] in (1, 2) and not e["player"]:
            sp = mem[G_SPRITES + e["spr"] * SPRITE_STRIDE : G_SPRITES + (e["spr"] + 1) * SPRITE_STRIDE]
            e["data"] = [s16(sp, 0x2E + 2 * k) for k in range(8)]
            e["cb"] = sp[0x1C] | (sp[0x1D] << 8) | (sp[0x1E] << 16) | (sp[0x1F] << 24)
            e["sx"], e["sy"] = s16(sp, 0x20), s16(sp, 0x22)
            e["anim"] = [sp[0x2A], sp[0x2B]]
        evs.append(e)
    row["ev"] = evs
    if grid is None and len(evs) >= 7 and row["cb2"] == CB2_OVERWORLD:
        grid = dump_grid()
    return row


grid = None


def dump_grid():
    w, h, ptr = u32(G_BACKUP_MAP_LAYOUT), u32(G_BACKUP_MAP_LAYOUT + 4), u32(G_BACKUP_MAP_LAYOUT + 8)
    raw = mem[ptr : ptr + 2 * w * h]
    return {"width": w, "height": h, "blocks": [raw[2 * i] | (raw[2 * i + 1] << 8) for i in range(w * h)]}


rows = []
frame = 0
if START <= 0:
    rows.append(snap(0))
done = False
for seg in trace["segments"]:
    for _ in range(int(seg["frames"])):
        oracle.advance(seg.get("buttons", []))
        frame += 1
        if START <= frame <= END:
            rows.append(snap(frame))
        if frame >= END:
            done = True
            break
    if done:
        break
OUT.write_text(json.dumps({"trace": TRACE.name, "grid": grid, "rows": rows}, separators=(",", ":")))
print(len(rows), "rows")
