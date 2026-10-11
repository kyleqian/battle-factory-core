#!/usr/bin/env python3
"""stat101: one battle-lab scenario in a fresh direct mGBA process (never the shared HTTP oracles), Scene ON or OFF, sampled densely for
General_StatsChange (docs/stat101-stats-change-design.md). Extends idle94Probe.py's per-frame row with the stat-anim state.

usage: stat101Probe.py <scenario.json> <on|off> <output.json>
Per trace frame (frame 0 = after BattleLab.prepare, frame n = after n trace frames):
  ptr / act / mv / atk      gBattlescriptCurrInstr, gAnimScriptActive, gCurrentMove, gBattlerAttacker
  arg                        gBattleSpritesDataPtr->animationData->animArg (u16 via the EWRAM pointer chain)
  scr                        sha256[:24] of the raw RGB888 screen
  bg1                        [gBattle_BG1_X, gBattle_BG1_Y] (s16 RAM shadows; BGxHOFS/VOFS are write-only)
  io  (only when changed)    DISPCNT, BG0..3CNT, WININ, WINOUT, BLDCNT, BLDALPHA, BLDY (hardware IO)
  pb / po                    sha256[:12] of BG / OBJ palette RAM
  ow  (only when changed)    OAM entries in OBJ-window mode (attr0 bits 10-11 == 2, not disabled): [index, attr0, attr1, attr2]
  st  (only when changed)    gBattleMons[0 / 1].statStages[8] (struct BattlePokemon 0x58 bytes, statStages at 0x18)
  sp  (only when changed)    [inUse sprite count, [gSprites slots in OBJ-window mode], battler 0 / 1 sprite [id, x, y, x2, y2, invisible]]
  d   (only from a gAnimScriptActive rise to 4 rows after its fall)  [changed px, x0, y0, x1, y1] vs the screen of the row before the rise
  sl  (same window)          crc32 per scanline (160, hex8 joined) of the raw RGB888 screen
  mc  (same window, once an OBJ-window entry exists)  sha256[:16] of the RGB888 crop of the window's first OBJ-window OAM rect
                             (x, y, w, h clipped to the screen; `mr` on the window's first such row = [x, y, w, h]); the same rect
                             is used until the window ends, `mc0` = the crop of the reference row (A-1)
Optional env STAT101_DUMP=<dir>: also write <dir>/<output stem>-<A>.npz (the reference frame and every window row's full RGB) for
local comparisons; never committed.
The profile picks the oracle bootstrap exactly as oracle/server.py does; the scenario's own "profile" is overridden, its lab "seed" stays.
"""
from __future__ import annotations

import hashlib
import json
import sys
import zlib
from pathlib import Path

import numpy as np
import os

if len(sys.argv) != 4 or sys.argv[2] not in ("on", "off"):
    raise SystemExit("usage: stat101Probe.py <scenario> <on|off> <output.json>")
SCENARIO, MODE, OUTPUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = {"on": "battle-scene-on", "off": "battle-scene-off"}[MODE]
BOOT = {"on": "factory.json", "off": "factory-battle-scene-off.json"}[MODE]
IO = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E,
      "winin": 0x04000048, "winout": 0x0400004A, "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054}
SPRITE_SIZE, MAX_SPRITES = 0x44, 64


def s16(v: int) -> int:
    return v - 0x10000 if v & 0x8000 else v


def main() -> None:
    raw_req = json.loads(SCENARIO.read_text())
    raw_req["profile"] = PROFILE
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap" / BOOT)
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    sy = oracle.symbols
    ptr_a, act_a, mv_a, atk_a = sy["gBattlescriptCurrInstr"], sy["gAnimScriptActive"], sy["gCurrentMove"], sy["gBattlerAttacker"]
    mons_a = sy["gBattleMons"]
    bgx_a, bgy_a, spr_a, bsid_a, bsd_a = sy["gBattle_BG1_X"], sy["gBattle_BG1_Y"], sy["gSprites"], sy["gBattlerSpriteIds"], sy["gBattleSpritesDataPtr"]
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    blk = lambda a, n: hashlib.sha256(bytes(u8(a + i) for i in range(n))).hexdigest()[:12]
    rows, last = [], {}
    frame, prev_act, prev_scr, ref_img, tail = 0, 0, None, None, -1
    rect, dump, dump_a = None, [], None
    DUMP = os.environ.get("STAT101_DUMP")

    def anim_arg() -> int:
        p = u32(bsd_a)
        if not p:
            return -1
        ad = u32(p + 8)  # struct BattleSpriteData { battlerData*, healthBoxesData*, animationData*, battleBars* }
        return u16(ad + 0) if ad else -1

    def sample() -> None:
        nonlocal prev_act, prev_scr, ref_img, tail, rect, dump, dump_a
        rgb = oracle.screen_rgb()
        img = np.frombuffer(rgb, dtype=np.uint8).reshape(160, 240, 3)
        act = u8(act_a)
        row = {"f": frame, "ptr": u32(ptr_a), "act": act, "mv": u16(mv_a), "atk": u8(atk_a), "arg": anim_arg(),
               "scr": hashlib.sha256(rgb).hexdigest()[:24], "bg1": [s16(u16(bgx_a)), s16(u16(bgy_a))],
               "pb": blk(0x05000000, 0x200), "po": blk(0x05000200, 0x200)}
        cur = {"io": {k: u16(a) for k, a in IO.items()}}
        ow = []
        for i in range(128):
            a0, a1, a2 = u16(0x07000000 + i * 8), u16(0x07000002 + i * 8), u16(0x07000004 + i * 8)
            if (a0 >> 10) & 3 == 2 and not (a0 & 0x300) == 0x200:
                ow.append([i, a0, a1, a2])
        cur["ow"] = ow
        in_use, win_slots = 0, []
        for i in range(MAX_SPRITES):
            base = spr_a + i * SPRITE_SIZE
            if u8(base + 0x3E) & 1:
                in_use += 1
                if (u16(base) >> 10) & 3 == 2:
                    win_slots.append(i)
        bs = []
        for b in (0, 1):
            sid = u8(bsid_a + b)
            base = spr_a + sid * SPRITE_SIZE
            bs.append([sid, s16(u16(base + 0x20)), s16(u16(base + 0x22)), s16(u16(base + 0x24)), s16(u16(base + 0x26)), (u8(base + 0x3E) >> 2) & 1])
        cur["sp"] = [in_use, win_slots, bs]
        cur["st"] = [[u8(mons_a + b * 0x58 + 0x18 + k) for k in range(8)] for b in (0, 1)]
        for k, v in cur.items():
            if last.get(k) != v:
                row[k] = v
                last[k] = v
        if act and not prev_act:
            if DUMP and dump:
                np.savez_compressed(os.path.join(DUMP, f"{OUTPUT.stem}-{dump_a}.npz"), *dump)
            ref_img, tail, rect, dump, dump_a = prev_scr, 4, None, [prev_scr], frame
        if ref_img is not None and (act or tail >= 0):
            diff = np.any(img != ref_img, axis=2)
            n = int(diff.sum())
            if n:
                ys, xs = np.nonzero(diff)
                row["d"] = [n, int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
            else:
                row["d"] = [0]
            row["sl"] = "".join(f"{zlib.crc32(img[y].tobytes()):08x}" for y in range(160))
            if rect is None and ow:
                a0, a1 = ow[0][1], ow[0][2]
                side = {0: 8, 1: 16, 2: 32, 3: 64}[a1 >> 14] if a0 >> 14 == 0 else None
                if side:
                    side2 = side * 2 if a0 & 0x300 == 0x300 else side
                    x, y = (a1 & 0x1FF) - (512 if a1 & 0x100 else 0), (a0 & 0xFF) - (256 if (a0 & 0xFF) >= 160 else 0)
                    x0, y0, x1, y1 = max(0, x), max(0, y), min(240, x + side2), min(160, y + side2)
                    rect = [x0, y0, x1 - x0, y1 - y0]
                    row["mr"] = rect
                    row["mc0"] = hashlib.sha256(ref_img[y0:y1, x0:x1].tobytes()).hexdigest()[:16]
            if rect is not None:
                x0, y0, w, h = rect
                row["mc"] = hashlib.sha256(img[y0:y0 + h, x0:x0 + w].tobytes()).hexdigest()[:16]
            if DUMP:
                dump.append(img.copy())
            if not act:
                tail -= 1
        prev_act, prev_scr = act, img.copy()
        rows.append(row)

    sample()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    if DUMP and dump:
        np.savez_compressed(os.path.join(DUMP, f"{OUTPUT.stem}-{dump_a}.npz"), *dump)
    OUTPUT.write_text(json.dumps({"schema": "stat101-probe/v1", "scenario": SCENARIO.name, "mode": MODE, "seed": request.get("seed"),
                                  "frameCount": frame, "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
