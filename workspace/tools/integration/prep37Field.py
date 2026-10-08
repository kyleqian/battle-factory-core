#!/usr/bin/env python3
"""prep37 item 2: what the ROM draws for the subbed battler between Substitute's body and the doll's break / switch.

usage: prep37Field.py <out.json> <probe.json:rgb-dir>...
Per run (subbed battler = the Move_SUBSTITUTE attacker), every frame is classified:
  body | own-swap-to-mon | own-move | own-swap-to-doll | other-move (subbed battler is the defender) | fade | idle (no anim script)
and for every idle frame with behindSubstitute set it checks, against SOURCE-derived expectations:
  gfx    VRAM 64x64 tile block == gSubstituteDollFront/BackGfx (substitute.json packed 4bpp) ;
  pos    sprite x/y == sBattlerCoords x (72/176), GetSubstituteSpriteDefault_Y (97/56), x2 = 0 ;
  pal    hardware OBJ bank == gSubstituteDollPal ;
  px     every opaque doll pixel at the derived corner (40/144, 65/24) + the DISPLAYED x2/y2 (previous frame's RAM sprite:
         OAM is built in VBlank) equals the ROM frame (rows < 112: the BG0 text box covers 112..159), when the displayed
         sprite is visible and the two previous frames were idle too (a window's 2-row display tail is the window's) ;
  shadow the battler's shadow sprite is invisible (battle_gfx_sfx_util.c:1220) .
It also records y2 (bounce) / invisible (hit blink) runs, the status-animation windows and their frame counts, and the
graphics digest transitions inside the swap / fade windows.  No RGB is written.
"""
import hashlib, json, sys, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
asset = json.loads((ROOT / "src/animation/assets/substitute.json").read_text())

def packed(sheet) -> bytes:
    out = bytearray()
    for tile in sheet["tiles"]:
        for i in range(0, 64, 2):
            out.append(tile[i] | tile[i + 1] << 4)
    return bytes(out)

DOLL_DIGEST = {"back": hashlib.sha1(packed(asset["back"])).hexdigest()[:16], "front": hashlib.sha1(packed(asset["front"])).hexdigest()[:16]}
DOLL_PAL = [(c["r"] >> 3) | (c["g"] >> 3) << 5 | (c["b"] >> 3) << 10 for c in asset["palette"]]
RGB_PAL = [(c["r"], c["g"], c["b"]) for c in asset["palette"]]

def doll_pixels(sheet):
    cols = sheet["columns"]
    for t, tile in enumerate(sheet["tiles"]):
        tx, ty = (t % cols) * 8, (t // cols) * 8
        for i, idx in enumerate(tile):
            if idx:
                yield tx + i % 8, ty + i // 8, RGB_PAL[idx]

def classify(row, b):
    s = row["script"]
    if s is None:
        return "idle"
    if s == "Move_SUBSTITUTE":
        return "body"
    if s == "Special_SubstituteToMon":
        return "own-swap-to-mon"
    if s == "Special_MonToSubstitute":
        return "own-swap-to-doll"
    if s == "General_SubstituteFade":
        return "fade"
    return "own-move" if row["animAttacker"] == b else "other-move"

def runs(seq):
    out, start = [], 0
    for i in range(1, len(seq) + 1):
        if i == len(seq) or seq[i][1] != seq[start][1]:
            out.append({"from": seq[start][0], "to": seq[i - 1][0], "frames": i - start, "value": seq[start][1]})
            start = i
    return out

def analyse(probe_path: str, rgb_dir: str) -> dict:
    d = json.loads(Path(probe_path).read_text())
    frames = d["frames"]
    start = next(i for i, r in enumerate(frames) if r["script"] == "Move_SUBSTITUTE")
    b = frames[start]["animAttacker"]
    side = "player" if b == 0 else "opponent"
    sheet = asset["back"] if side == "player" else asset["front"]
    pix = list(doll_pixels(sheet))
    exp = {"x": 72 if side == "player" else 176, "y": 97 if side == "player" else 56}
    corner = (exp["x"] - 32, exp["y"] - 32)
    mon_digest = frames[start]["battlers"][b]["tileDigest"]
    phases = [(r["frame"], classify(r, b)) for r in frames[start:]]
    checks = {"idleBehindSubFrames": 0, "gfx": 0, "pos": 0, "pal": 0, "shadowHidden": 0, "visible": 0, "pxExactVisible": 0, "pxMismatchFrames": []}
    y2_values, inv_runs, bs_seq, digest_seq = {}, [], [], []
    prev_sprite = frames[start - 1]["battlers"][b]["sprite"]
    prev_scripts = [frames[start - 2]["script"], frames[start - 1]["script"]]
    for r in frames[start:]:
        shown, shown_scripts = prev_sprite, list(prev_scripts)
        prev_sprite, prev_scripts = r["battlers"][b]["sprite"], [prev_scripts[1], r["script"]]
        bt = r["battlers"][b]
        bs_seq.append((r["frame"], int(bt["behindSubstitute"])))
        dg = "doll" if bt["tileDigest"] == DOLL_DIGEST["back" if side == "player" else "front"] else ("mon" if bt["tileDigest"] == mon_digest else bt["tileDigest"])
        digest_seq.append((r["frame"], dg))
        if r["script"] is not None or not bt["behindSubstitute"]:
            continue
        # task-driven x2 reaches OAM two frames later (BuildOamBuffer precedes RunTasks; the accepted body renderer's age-2 latch):
        # the two rows after an animation window are that window's display tail, not idle field rows
        idle_shown = shown_scripts == [None, None]
        sp = bt["sprite"]
        checks["idleBehindSubFrames"] += 1
        checks["gfx"] += dg == "doll"
        checks["pos"] += sp["x"] == exp["x"] and sp["y"] == exp["y"] and sp["x2"] == 0
        checks["pal"] += bt["hwPalette"] == DOLL_PAL
        checks["shadowHidden"] += (not bt["shadow"]["inUse"]) or bt["shadow"]["invisible"]
        y2_values[sp["y2"]] = y2_values.get(sp["y2"], 0) + 1
        inv_runs.append((r["frame"], int(sp["invisible"])))
        if not shown["invisible"] and idle_shown:
            checks["visible"] += 1
            rgb = zlib.decompress((Path(rgb_dir) / f"{r['frame']:05d}.rgb.z").read_bytes())
            bad = 0
            for x, y, c in pix:
                X, Y = corner[0] + shown["x2"] + x, corner[1] + shown["y2"] + y
                if 0 <= X < 240 and 0 <= Y < 112:
                    o = (Y * 240 + X) * 3
                    bad += tuple(rgb[o:o + 3]) != c
            if bad:
                checks["pxMismatchFrames"].append({"frame": r["frame"], "px": bad})
            else:
                checks["pxExactVisible"] += 1
    windows = [w for w in runs(phases) if w["value"] != "idle"]
    by_frame = {r["frame"]: r for r in frames}
    for w in windows:
        seq = [by_frame[f] for f in range(w["from"], w["to"] + 2) if f in by_frame]
        g = []
        for r in seq:
            dg = r["battlers"][b]["tileDigest"]
            g.append((r["frame"] - w["from"], "doll" if dg == DOLL_DIGEST["back" if side == "player" else "front"] else ("mon" if dg == mon_digest else "other")))
        w["graphicsByAge"] = [(x["from"], x["value"]) for x in runs(g)]
        w["subbedX2"] = [min(r["battlers"][b]["sprite"]["x2"] for r in seq), max(r["battlers"][b]["sprite"]["x2"] for r in seq)]
        w["subbedInvisibleAges"] = [r["frame"] - w["from"] for r in seq if r["battlers"][b]["sprite"]["invisible"]]
        w["subbedY"] = sorted({r["battlers"][b]["sprite"]["y"] for r in seq})
        w["tasks"] = sorted({t for r in seq for t in r["tasks"]})
        w["sha256"] = hashlib.sha256("".join(r["sha256"] for r in seq).encode()).hexdigest()[:16]
    return {
        "probe": Path(probe_path).name, "profile": d["profile"], "subbed": side,
        "dollDigestExpected": DOLL_DIGEST["back" if side == "player" else "front"], "monDigest": mon_digest,
        "phaseWindows": windows,
        "behindSubstituteRuns": runs(bs_seq),
        "graphicsRuns": runs(digest_seq),
        "idleBehindSubstitute": {**checks, "pxMismatchFrames": checks["pxMismatchFrames"][:20], "y2Histogram": y2_values,
                                 "invisibleRuns": [w for w in runs(inv_runs) if w["value"] == 1]},
    }

out = sys.argv[1]
res = [analyse(*a.split(":")) for a in sys.argv[2:]]
Path(out).write_text(json.dumps({"schema": "prep37-field/v1", "results": res}, indent=1) + "\n")
for r in res:
    c = r["idleBehindSubstitute"]
    print(r["probe"], r["subbed"], {k: c[k] for k in ("idleBehindSubFrames", "gfx", "pos", "pal", "shadowHidden", "visible", "pxExactVisible")}, "y2", c["y2Histogram"])
    for w in r["phaseWindows"]:
        print("   ", w["value"], w["from"], w["to"], w["frames"], "gfx", w["graphicsByAge"], "x2", w["subbedX2"], "inv", w["subbedInvisibleAges"][:3], len(w["subbedInvisibleAges"]))
    print("    px mismatches", c["pxMismatchFrames"][:6])
