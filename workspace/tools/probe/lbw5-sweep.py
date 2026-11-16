#!/usr/bin/env python3
"""lbw5: branch the ROM at a lab-trace frame and run many button timelines from there (Scene OFF), writing lbw4-style fixture rows.

usage (through the probe runner):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/probe/lbw5-sweep.py BASE_TRACE.json BASE_FRAME CANDS.json OUT.json
CANDS.json = [{"name": str, "segments": [{"frames": n, "buttons": [...]}, ...]}, ...]. The base trace's own segments run up to BASE_FRAME
(a segment boundary), the raw emulator state is saved, and each candidate restores it. Per candidate: seed rows (rng, player / woman / fat man
at the base) and per frame [held mask (U D L R bits 1 2 4 8), rng, player cur / prv (grid), woman [cx,cy,px,py,face,ty,dl,animIdx], fat man [...]].
Dev-time only; never at runtime.
"""
from __future__ import annotations
import json, sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(__doc__)
TRACE, BASE, CANDS, OUT = Path(sys.argv[1]).resolve(), int(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
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

OBJECT_EVENTS, OBJ_STRIDE = 0x2037350, 0x24
G_SPRITES, SPRITE_STRIDE = 0x2020630, 0x44
G_RNG_VALUE = 0x3005D80
BITS = {"UP": 1, "DOWN": 2, "LEFT": 4, "RIGHT": 8}

trace = json.loads(TRACE.read_text())
scenario = (TRACE.parent / trace["oracleBattleLab"]["scenario"]).resolve()
req = validate_request(json.loads(scenario.read_text()), "battle-scene-off")
ref = (ROOT / "reference" / "pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json")
BattleLab(oracle, "battle-scene-off").prepare(req)
mem = oracle.core.memory.u8


def s16(b, o):
    v = b[o] | (b[o + 1] << 8)
    return v - 0x10000 if v & 0x8000 else v


def snap():
    blk = mem[OBJECT_EVENTS : OBJECT_EVENTS + 16 * OBJ_STRIDE]
    out = {"rng": oracle.read_u32(G_RNG_VALUE)}
    for i in range(16):
        b = blk[i * OBJ_STRIDE : (i + 1) * OBJ_STRIDE]
        if not b[0] & 1:
            continue
        cur, prv = [s16(b, 0x10), s16(b, 0x12)], [s16(b, 0x14), s16(b, 0x16)]
        if b[2] & 1:
            out["p"] = [*cur, *prv, (b[0x18] | (b[0x19] << 8)) & 0xF, b[0x1C]]
        elif b[5] in (16, 17):
            sp = mem[G_SPRITES + b[4] * SPRITE_STRIDE : G_SPRITES + (b[4] + 1) * SPRITE_STRIDE]
            out["w" if b[5] == 16 else "m"] = [*cur, *prv, (b[0x18] | (b[0x19] << 8)) & 0xF, s16(sp, 0x2E + 2), s16(sp, 0x2E + 6), sp[0x2B]]
    return out


frame = 0
for seg in trace["segments"]:
    if frame >= BASE:
        break
    for _ in range(int(seg["frames"])):
        oracle.advance(seg.get("buttons", []))
        frame += 1
if frame != BASE:
    raise SystemExit(f"base frame {BASE} is not a segment boundary (got {frame})")
state = bytes(oracle.core.save_raw_state())

result = []
for cand in json.loads(CANDS.read_text()):
    oracle.core.load_raw_state(state)
    s0 = snap()
    frames = []
    mask = 0
    f = BASE
    for seg in cand["segments"]:
        mask = sum(BITS.get(b, 0) for b in seg.get("buttons", []))
        for _ in range(int(seg["frames"])):
            oracle.advance(seg.get("buttons", []))
            f += 1
            s = snap()
            frames.append([mask, s["rng"], *s["p"][:4], s["w"][:8], s["m"][:8]])
    result.append({
        "name": cand["name"], "start": BASE, "seedRng": s0["rng"], "seedPlayer": s0["p"][:2], "seedFacing": s0["p"][4],
        "seedWoman": s0["w"][:8], "seedFat": s0["m"][:8], "frames": frames,
    })
OUT.write_text(json.dumps(result, separators=(",", ":")))
print(len(result), "candidates")
