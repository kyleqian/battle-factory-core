#!/usr/bin/env python3
"""fps147 (ISSUES #139 presentation half; docs/fps147-focus-punch-setup.md): dense Scene ON windows of BattleScript_FocusPunchSetUp
(printstring STRINGID_EMPTYSTRING3 / waitmessage 1 / playanimation B_ANIM_FOCUS_PUNCH_SETUP = General_FocusPunchSetUp / printstring
STRINGID_PKMNTIGHTENINGFOCUS / ...). One battle-lab scenario in a fresh direct mGBA process (never the shared HTTP oracles), profile
battle-scene-on, the scenario's own explicit lab "seed". stp128Probe.py's shape.

usage: fps147Probe.py <scenario.json> <output.json>
The window opens on the first row gBattlescriptCurrInstr is inside BattleScript_FocusPunchSetUp (row S; the two rows before are kept) and
closes at E + 8 (E = the first row gAnimScriptActive is 0 again after its rise R). rel = frame - R. Per row (every key on every row):
  rel / f / act / bs        rel, trace frame, gAnimScriptActive, gBattlescriptCurrInstr - BattleScript_FocusPunchSetUp (-1 outside 0..31)
  scr                       sha256[:16] of the raw RGB888 screen
  d                         [changed px, x0, y0, x1, y1] vs row S - 1 ([0] when equal)
  box                       changed px in the message band (y >= 112) vs the previous row
  bat                       battler 0 / 1 sprites: [spriteId, x, y, x2, y2, invisible, oam paletteNum]
  pal                       the attacker sprite's OBJ palette bank in palette RAM (16 BGR555 words)
  spr                       sprites created inside the window: [slot, x, y, x2, y2, invisible, oam priority, subpriority, animNum,
                            animCmdIndex, attr2 tile, data0, data1, template == gEndureEnergySpriteTemplate]
  n / vt                    in-use gSprites count, gAnimVisualTaskCount
  sc                        [sBattleAnimScriptPtr - General_FocusPunchSetUp, sBattleAnimScriptPtr - EndureEffect, sAnimFramesToWait,
                            gMain.vblankCounter2 & 0xFF]
Optional env FPS147_DUMP=<dir>: also write <dir>/<output stem>.rgb (every window row's raw RGB888, first row first); scratch only.
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
    raise SystemExit("usage: fps147Probe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
SZ = 0x44
SCRIPT_LEN = 32


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
    raw_req.pop("fps147", None)  # fps147Stage.py's provenance note, not a lab field
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    sy = symbols(ref / "pokeemerald.elf")
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    act_a, ptr_a, bs_a, atk_a = sy["gAnimScriptActive"], sy["sBattleAnimScriptPtr"], sy["gBattlescriptCurrInstr"], sy["gBattlerAttacker"]
    spr_a, bsid_a, vt_a = sy["gSprites"], sy["gBattlerSpriteIds"], sy["gAnimVisualTaskCount"]
    wait_a, vbc_a = sy["sAnimFramesToWait"], sy["gMain"] + 0x24  # struct Main: vblankCounter2 at 0x24
    fpsu, gen, endure, tmpl = sy["BattleScript_FocusPunchSetUp"], sy["General_FocusPunchSetUp"], sy["EndureEffect"], sy["gEndureEnergySpriteTemplate"]
    dump_dir = os.environ.get("FPS147_DUMP")
    hist: list[tuple[dict, np.ndarray]] = []
    cur: dict | None = None
    done = False
    frame = 0
    prev_img: np.ndarray | None = None

    def in_use(i: int) -> bool:
        return bool(u8(spr_a + i * SZ + 0x3E) & 1)

    def full_row(img: np.ndarray, rgb: bytes, created: list[int]) -> dict:
        bs = u32(bs_a) - fpsu
        row = {"f": frame, "act": u8(act_a), "bs": bs if 0 <= bs < SCRIPT_LEN else -1, "scr": hashlib.sha256(rgb).hexdigest()[:16]}
        row["box"] = 0 if prev_img is None else int(np.any(img[112:] != prev_img[112:], axis=2).sum())
        bat = []
        for bt in (0, 1):
            sid = u8(bsid_a + bt)
            b = spr_a + sid * SZ
            bat.append([sid, s16(u16(b + 0x20)), s16(u16(b + 0x22)), s16(u16(b + 0x24)), s16(u16(b + 0x26)), (u8(b + 0x3E) >> 2) & 1,
                        u16(b + 4) >> 12])
        row["bat"] = bat
        pal = bat[u8(atk_a) & 1][6]
        row["pal"] = [u16(0x05000200 + pal * 32 + 2 * k) for k in range(16)]
        spr = []
        for i in created:
            b = spr_a + i * SZ
            if not in_use(i):
                continue
            spr.append([i, s16(u16(b + 0x20)), s16(u16(b + 0x22)), s16(u16(b + 0x24)), s16(u16(b + 0x26)), (u8(b + 0x3E) >> 2) & 1,
                        (u16(b + 4) >> 10) & 3, u8(b + 0x43), u8(b + 0x2A), u8(b + 0x2B), u16(b + 4) & 0x3FF,
                        s16(u16(b + 0x2E)), s16(u16(b + 0x30)), int(u32(b + 0x14) == tmpl)])
        row["spr"] = spr
        row["n"] = sum(1 for i in range(64) if in_use(i))
        row["vt"] = u8(vt_a)
        p = u32(ptr_a)
        row["sc"] = [p - gen, p - endure, u8(wait_a), u32(vbc_a) & 0xFF]
        return row

    def sample() -> None:
        nonlocal cur, done, prev_img
        rgb = oracle.screen_rgb()
        img = np.frombuffer(rgb, dtype=np.uint8).reshape(160, 240, 3).copy()
        if done:
            prev_img = img
            return
        bs = u32(bs_a) - fpsu
        if cur is None and 0 <= bs < SCRIPT_LEN:
            pre = [i for i in range(64) if in_use(i)]
            cur = {"S": frame, "R": None, "E": None, "battler": u8(atk_a), "pre": pre, "rows": [], "frames": [], "ref": hist[-1][1]}
            for r, im in hist[-2:]:
                cur["rows"].append(r)
                cur["frames"].append(im)
        if cur is not None:
            row = full_row(img, rgb, [i for i in range(64) if i not in cur["pre"]])
            diff = np.any(img != cur["ref"], axis=2)
            n = int(diff.sum())
            if n:
                ys, xs = np.nonzero(diff)
                row["d"] = [n, int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
            else:
                row["d"] = [0]
            cur["rows"].append(row)
            cur["frames"].append(img)
            if cur["R"] is None and row["act"]:
                cur["R"] = frame
            if cur["R"] is not None and cur["E"] is None and not row["act"]:
                cur["E"] = frame
            if cur["E"] is not None and frame == cur["E"] + 8:
                close()
        else:
            hist.append((full_row(img, rgb, []), img))
            del hist[:-2]
        prev_img = img

    def close() -> None:
        nonlocal cur, done
        assert cur is not None
        if dump_dir:
            with open(os.path.join(dump_dir, f"{OUTPUT.stem}.rgb"), "wb") as fh:
                for im in cur["frames"]:
                    fh.write(im.tobytes())
        for r in cur["rows"]:
            r["rel"] = r["f"] - cur["R"]
        window.update({"S": cur["S"], "R": cur["R"], "E": cur["E"], "battler": cur["battler"], "preSprites": cur["pre"],
                       "firstRel": cur["rows"][0]["rel"], "rows": cur["rows"]})
        cur = None
        done = True

    window: dict = {}
    sample()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
            if done:
                break
        if done:
            break
    if not done:
        raise SystemExit("fps147Probe: no complete BattleScript_FocusPunchSetUp window")
    OUTPUT.write_text(json.dumps({"schema": "fps147-probe/v1", "scenario": SCENARIO.name, "seed": request.get("seed"), "frameCount": frame,
                                  "window": window}, separators=(",", ":")))


if __name__ == "__main__":
    main()
