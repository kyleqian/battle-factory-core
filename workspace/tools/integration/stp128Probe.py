#!/usr/bin/env python3
"""stp128: dense Scene ON windows of the status-condition animations that need new motion code (Status_Curse / Status_Nightmare /
Status_Confusion / Status_Freeze; docs/stp128-status-condition-render-prep.md). One battle-lab scenario in a fresh direct mGBA process
(never the shared HTTP oracles), profile battle-scene-on, the scenario's own explicit lab "seed".

usage: stp128Probe.py <scenario.json> <output.json>
A window opens on a gAnimScriptActive rising edge with sAnimMoveIndex == 0 whose sBattleAnimScriptPtr is one of the four labels
(rel 0 = the rise row; frame n = after n trace frames) and keeps rel -2 .. E + 3 (E = the first row gAnimScriptActive is 0 again;
the controller releases on E + 1, so E + 3 = release + 2). Per row, `null`-free and compact (a key appears only when it changed
since the window's previous row; rel -2 carries everything):
  rel / act / x             rel, gAnimScriptActive, gBattleControllerExecFlags != 0
  scr                       sha256[:16] of the raw RGB888 screen
  d                         [changed px, x0, y0, x1, y1] vs the rel -1 screen ([0] when equal)
  io                        DISPCNT, BG0..3CNT, WININ, WINOUT, BLDCNT, BLDALPHA, BLDY (hardware IO)
  bg                        gBattle_BG1_X / Y, gBattle_BG2_X / Y (RAM shadows the script's monbg task writes)
  oam                       every enabled OAM entry [index, attr0, attr1, attr2] (hardware OAM)
  spr                       sprites created inside the window: [slot, x, y, x2, y2, invisible, oam priority, subpriority, animNum,
                            animCmdIndex, attr2 tile, data0..7]
  bat                       battler 0 / 1 sprites: [spriteId, x, y, x2, y2, invisible]
  p7                        OBJ palette bank 7 of palette RAM (16 BGR555 words)
  pob / pbg                 sha256[:12] of OBJ / BG palette RAM
  sc                        [sBattleAnimScriptPtr - the window label's address, sAnimFramesToWait, gMain.vblankCounter2 & 0xFF]
Window header: label, rise frame, battler (gBattleAnimAttacker), E, the pre-window sprite set.
Optional env STP128_DUMP=<dir>: also write <dir>/<output stem>-<rise>.npz (every window row's full RGB, rel -2 first); scratch only.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

if len(sys.argv) != 3:
    raise SystemExit("usage: stp128Probe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
LABELS = ("Status_Curse", "Status_Nightmare", "Status_Confusion", "Status_Freeze")
IO = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E,
      "winin": 0x04000048, "winout": 0x0400004A, "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054}
SZ = 0x44


def s16(v: int) -> int:
    return v - 0x10000 if v & 0x8000 else v


def symbols(elf: Path) -> dict[str, int]:
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(elf)], check=True, capture_output=True, text=True).stdout
    out = {}
    for line in nm.splitlines():
        p = line.split()
        if len(p) == 3:
            try:
                out[p[2]] = int(p[0], 16)
            except ValueError:
                pass
    return out


def main() -> None:
    raw_req = json.loads(SCENARIO.read_text())
    raw_req["profile"] = PROFILE
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    sy = symbols(ref / "pokeemerald.elf")
    labels = {sy[n]: n for n in LABELS}
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    act_a, mv_a, ptr_a, atk_a = sy["gAnimScriptActive"], sy["sAnimMoveIndex"], sy["sBattleAnimScriptPtr"], sy["gBattleAnimAttacker"]
    exec_a, spr_a, bsid_a = sy["gBattleControllerExecFlags"], sy["gSprites"], sy["gBattlerSpriteIds"]
    wait_a, vbc_a = sy["sAnimFramesToWait"], sy["gMain"] + 0x24  # struct Main: vblankCounter2 at 0x24
    bg_a = [sy["gBattle_BG1_X"], sy["gBattle_BG1_Y"], sy["gBattle_BG2_X"], sy["gBattle_BG2_Y"]]
    dump_dir = os.environ.get("STP128_DUMP")
    windows: list[dict] = []
    hist: list[tuple[dict, np.ndarray]] = []  # the last 2 full rows before a rise
    cur: dict | None = None
    frame = 0

    def in_use(i: int) -> bool:
        return bool(u8(spr_a + i * SZ + 0x3E) & 1)

    def full_row(img: np.ndarray, rgb: bytes, created: list[int]) -> dict:
        row = {"f": frame, "act": u8(act_a), "x": int(u32(exec_a) != 0), "scr": hashlib.sha256(rgb).hexdigest()[:16],
               "io": [u16(a) for a in IO.values()], "bg": [s16(u16(a)) for a in bg_a]}
        oam = []
        for i in range(128):
            a0, a1, a2 = u16(0x07000000 + i * 8), u16(0x07000002 + i * 8), u16(0x07000004 + i * 8)
            if (a0 & 0x300) != 0x200:
                oam.append([i, a0, a1, a2])
        row["oam"] = oam
        spr = []
        for i in created:
            b = spr_a + i * SZ
            if not in_use(i):
                continue
            spr.append([i, s16(u16(b + 0x20)), s16(u16(b + 0x22)), s16(u16(b + 0x24)), s16(u16(b + 0x26)), (u8(b + 0x3E) >> 2) & 1,
                        (u16(b + 4) >> 10) & 3, u8(b + 0x43), u8(b + 0x2A), u8(b + 0x2B), u16(b + 4) & 0x3FF,
                        *[s16(u16(b + 0x2E + 2 * k)) for k in range(8)]])
        row["spr"] = spr
        bat = []
        for bt in (0, 1):
            sid = u8(bsid_a + bt)
            b = spr_a + sid * SZ
            bat.append([sid, s16(u16(b + 0x20)), s16(u16(b + 0x22)), s16(u16(b + 0x24)), s16(u16(b + 0x26)), (u8(b + 0x3E) >> 2) & 1])
        row["bat"] = bat
        row["p7"] = [u16(0x05000200 + 7 * 32 + 2 * k) for k in range(16)]
        row["pob"] = hashlib.sha256(bytes(u8(0x05000200 + k) for k in range(512))).hexdigest()[:12]
        row["pbg"] = hashlib.sha256(bytes(u8(0x05000000 + k) for k in range(512))).hexdigest()[:12]
        row["sc"] = [u32(ptr_a) - (cur["base"] if cur is not None else u32(ptr_a)), u8(wait_a), u32(vbc_a) & 0xFF]
        return row

    def sample() -> None:
        nonlocal cur
        rgb = oracle.screen_rgb()
        img = np.frombuffer(rgb, dtype=np.uint8).reshape(160, 240, 3).copy()
        act = u8(act_a)
        if cur is None and act and hist and hist[-1][0]["act"] == 0 and u16(mv_a) == 0:
            # the pointer has already advanced past the first command(s): match the nearest label at or below it
            ptr = u32(ptr_a)
            base = max((a for a in labels if a <= ptr), default=None)
            if base is not None and ptr - base < 0x40:
                pre = [i for i in range(64) if in_use(i)]
                cur = {"base": base, "label": labels[base], "rise": frame, "ptr": ptr - base, "battler": u8(atk_a), "pre": pre, "E": None,
                       "rows": [], "frames": [], "ref": hist[-1][1]}
                for k, (r, im) in enumerate(hist[-2:]):
                    cur["rows"].append(dict(r, rel=k - len(hist[-2:])))
                    cur["frames"].append(im)
        if cur is not None:
            created = [i for i in range(64) if i not in cur["pre"]]
            row = full_row(img, rgb, created)
            rel = frame - cur["rise"]
            row["rel"] = rel
            diff = np.any(img != cur["ref"], axis=2)
            n = int(diff.sum())
            if n:
                ys, xs = np.nonzero(diff)
                row["d"] = [n, int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
            else:
                row["d"] = [0]
            cur["rows"].append(row)
            cur["frames"].append(img)
            if cur["E"] is None and not act:
                cur["E"] = rel
            if cur["E"] is not None and rel == cur["E"] + 3:
                close()
        else:
            hist.append((full_row(img, rgb, []), img))
            del hist[:-2]

    def close() -> None:
        nonlocal cur
        assert cur is not None
        if dump_dir:
            np.savez_compressed(os.path.join(dump_dir, f"{OUTPUT.stem}-{cur['rise']}.npz"), *cur["frames"])
        compact, last = [], {}
        for r in cur["rows"]:
            out = {"rel": r["rel"], "f": r["f"]}
            for k in ("act", "x", "scr", "d", "io", "bg", "oam", "spr", "bat", "p7", "pob", "pbg", "sc"):
                if k in r and (r["rel"] == cur["rows"][0]["rel"] or last.get(k) != r[k] or k in ("act", "scr")):
                    out[k] = r[k]
                if k in r:
                    last[k] = r[k]
            compact.append(out)
        windows.append({"label": cur["label"], "rise": cur["rise"], "ptrOffset": cur["ptr"], "battler": cur["battler"], "E": cur["E"],
                        "preSprites": cur["pre"], "rows": compact})
        cur = None
        hist.clear()

    sample()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    OUTPUT.write_text(json.dumps({"schema": "stp128-probe/v1", "scenario": SCENARIO.name, "seed": request.get("seed"), "frameCount": frame,
                                  "ioKeys": list(IO), "windows": windows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
