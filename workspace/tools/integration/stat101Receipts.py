#!/usr/bin/env python3
"""stat101: General_StatsChange receipts from stat101Probe.py outputs (docs/stat101-stats-change-design.md).

usage: stat101Receipts.py <probe-dir-r1> <probe-dir-r2> <scenario-index.json> <out-dir>
Writes <out-dir>/stat-anim.json (per scenario x scene: probe sha256, r1 == r2, every stat-anim window with its source timeline and mask,
ON == OFF per window) and <out-dir>/rows/<scenario>-<scene>-<k>.tsv (one line per row A-1..E+3 relative to the gAnimScriptActive rise A:
EVA, EVB, BG1 X / Y, OBJWIN on, WINOUT, BLDCNT, BG1CNT, OBJ-window OAM entry, gSprites OBJ-window slots, changed px vs row A-1, bbox, scr sha).
A stat-anim window = a gAnimScriptActive rise during which an OBJ-window OAM entry exists (CreateInvisibleSpriteCopy). No raw RGB.
"""
import bisect, glob, hashlib, json, os, re, sys

d1, d2, index_path, out = sys.argv[1:5]
os.makedirs(os.path.join(out, "rows"), exist_ok=True)
index = json.load(open(index_path))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
LABELS = sorted((int(m.group(1), 16), m.group(2)) for m in (re.match(r"\s+0x(08[0-9a-f]{6})\s+(BattleScript_\w+)\s*$", l)
                for l in open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.map"))) if m)
LADDR = [a for a, _ in LABELS]


def label(ptr):
    i = bisect.bisect_right(LADDR, ptr) - 1
    return f"{LABELS[i][1]}+{ptr - LADDR[i]}" if i >= 0 else hex(ptr)


def windows(rows):
    io, ow, sp, res = None, None, None, []
    full = []
    for r in rows:
        io, ow, sp = r.get("io", io), r.get("ow", ow), r.get("sp", sp)
        full.append((r, io, ow, sp))
    for A in range(1, len(full)):
        if not (full[A][0]["act"] and not full[A - 1][0]["act"]):
            continue
        E = next((i for i in range(A, len(full)) if not full[i][0]["act"]), None)
        # StatsChangeAnimation_Step1's signature: BLDCNT = TGT1_BG1 | TGT2_ALL | BLEND, WINOUT = WIN01_ALL & ~BG1 | WINOBJ_ALL, plus the copy
        X = full[A][0]["ptr"] - 1  # a move body: attackanimation (1 byte) was the script pointer before the rise (idle98StatsChange.py)
        if any(full[g][0]["ptr"] == X for g in range(A)):
            continue
        if E is None or not any(full[i][2] and full[i][1]["bldcnt"] == 0x3F42 and full[i][1]["winout"] == 0x3F3D for i in range(A, E)):
            continue
        res.append((A, E, full))
    return res


def blend(io):
    return io["bldalpha"] & 0x1F, (io["bldalpha"] >> 8) & 0x1F


summary = {}
for f in sorted(glob.glob(os.path.join(d1, "*.json"))):
    name = os.path.basename(f)
    scen, scene = name[:-len("-on.json")] if name.endswith("-on.json") else name[:-len("-off.json")], "on" if name.endswith("-on.json") else "off"
    raw1, raw2 = open(f, "rb").read(), open(os.path.join(d2, name), "rb").read()
    rows = json.loads(raw1)["rows"]
    ws = []
    for k, (A, E, full) in enumerate(windows(rows)):
        rel = lambda pred: next((i - A for i in range(A, E + 4) if pred(full[i])), None)
        ios = [full[i][1] for i in range(A, E + 4)]
        evas = [blend(x)[0] for x in ios]
        peak = max(evas)
        s1 = rel(lambda t: t[1]["bldcnt"] == 0x3F42)
        restore = next((i - A for i in range(A + s1, E + 4) if full[i][1]["bldcnt"] != 0x3F42), None)
        first_eva = rel(lambda t: blend(t[1])[0] > 0)
        peak_rows = [i for i, v in enumerate(evas) if v == peak]
        last_eva = max(i for i, v in enumerate(evas) if v > 0)
        owr = next(full[i][2] for i in range(A, E) if full[i][2])
        a0, a1, a2 = owr[0][1], owr[0][2], owr[0][3]
        shape, size = a0 >> 14, a1 >> 14
        dims = {(0, 0): 8, (0, 1): 16, (0, 2): 32, (0, 3): 64}.get((shape, size))
        union = [None, None, None, None]
        for i in range(A, E + 4):
            dd = full[i][0].get("d")
            if dd and dd[0]:
                union = [dd[1] if union[0] is None else min(union[0], dd[1]), dd[2] if union[1] is None else min(union[1], dd[2]),
                         dd[3] if union[2] is None else max(union[2], dd[3]), dd[4] if union[3] is None else max(union[3], dd[4])]
        scr_changes = sum(full[i][0]["scr"] != full[i - 1][0]["scr"] for i in range(A + 1, E + 1))
        anim_rows = [i - A for i in range(A, E + 4) if full[i][0].get("d", [0])[0]]
        sp_a = next(full[i][3] for i in range(A, E) if full[i][3][1])
        tsv = ["rel\tf\tact\tEVA\tEVB\tbg1x\tbg1y\tobjwin\twinout\tbldcnt\tbg1cnt\tow\tslots\tinUse\tdpx\tbbox\tscr\tmaskCrop"]
        sig_t, sig_m, sig_d, sig_c, sig_p = [], [], [], [], []
        for i in range(A - 1, E + 4):
            r, io, o, s = full[i]
            ea, eb = blend(io)
            dd = r.get("d", [0])
            line = [i - A, r["f"], r["act"], ea, eb, r["bg1"][0], r["bg1"][1], int(bool(io["dispcnt"] & 0x8000)), f"{io['winout']:04x}",
                    f"{io['bldcnt']:04x}", f"{io['bg1cnt']:04x}", ",".join(f"{e[0]}:{e[1]:04x}:{e[2]:04x}:{e[3]:04x}" for e in o) or "-",
                    ",".join(map(str, s[1])) or "-", s[0], dd[0], ",".join(map(str, dd[1:])) or "-", r["scr"], r.get("mc", "-")]
            tsv.append("\t".join(map(str, line)))
            if i >= A:  # row A-1 is the diff reference (its own `d` may belong to an earlier window's tail)
                # timing: rel, act, EVA, EVB, BG1 X / Y, WINOUT, BLDCNT, slots, inUse; BG1CNT only from Step1 on (its prior value is the
                # previous animation's leftover); OBJWIN is excluded (Step3 state 3 XORs DISPCNT, so its prior state leaks); mask = OAM entry
                # BG1 X / Y only from Step2 on (rel s1 + 2: before it they are the previous animation's leftover scroll)
                late = i - A >= s1 + 2
                sig_t.append([line[0], *line[2:5], line[5] if late else "-", line[6] if late else "-", *line[8:10], line[10] if i - A >= s1 else "-", *line[12:14]])
                sig_m.append([line[0], line[11]])
                sig_d.append([line[0], line[14], line[15]])
                sig_c.append([line[0], r.get("mr"), r.get("mc0"), r.get("mc")])
                sig_p.append([line[0], line[16], r.get("sl")])
        # the script instruction that launched it (last pointer change at or before A) and the first pointer change after E
        p0 = max(i for i in range(1, A + 1) if full[i][0]["ptr"] != full[i - 1][0]["ptr"])
        p1 = next((i for i in range(E, len(full)) if full[i][0]["ptr"] != full[i - 1][0]["ptr"]), None)
        script = {"launch": label(full[p0][0]["ptr"]), "launchRel": p0 - A, "next": label(full[p1][0]["ptr"]) if p1 else None,
                  "nextRel": None if p1 is None else p1 - A, "span": None if p1 is None else p1 - p0}
        tsv_name = f"{scen}-{scene}-{k}.tsv"
        open(os.path.join(out, "rows", tsv_name), "w").write("\n".join(tsv) + "\n")
        ws.append({"A": A, "E": E, "activeFrames": E - A, "arg": full[A][0]["arg"], "mv": full[A][0]["mv"],
                   "timeline": {"step1Regs": s1, "firstEva": first_eva, "peakEva": peak, "peakRows": [peak_rows[0], peak_rows[-1]],
                                "lastEva": last_eva, "regsRestored": restore, "owRows": [rel(lambda t: t[2]), next((i - A for i in range(A + 1, E + 4) if full[i - 1][2] and not full[i][2]), None)],
                                "visibleRows": [anim_rows[0], anim_rows[-1]] if anim_rows else None, "visibleRowCount": len(anim_rows)},
                   "script": script, "screenChanges": scr_changes, "bg1Start": full[A + first_eva][0]["bg1"] if first_eva is not None else None,
                   "mask": {"oam": owr[0][0], "attr": [f"{a0:04x}", f"{a1:04x}", f"{a2:04x}"], "y": a0 & 0xFF, "x": a1 & 0x1FF,
                            "affine": bool(a0 & 0x100), "doubleSize": bool(a0 & 0x200), "dims": dims, "tile": a2 & 0x3FF},
                   "changedBbox": union, "copySlot": sp_a[1], "inUseDuring": sp_a[0], "battlerSprites": sp_a[2],
                   "rowsTsv": f"rows/{tsv_name}", "timingSignatureSha": hashlib.sha256(json.dumps(sig_t).encode()).hexdigest()[:16],
                   "maskSignatureSha": hashlib.sha256(json.dumps(sig_m).encode()).hexdigest()[:16],
                   "deltaSignatureSha": hashlib.sha256(json.dumps(sig_d).encode()).hexdigest()[:16],
                   "maskCropSignatureSha": hashlib.sha256(json.dumps(sig_c).encode()).hexdigest()[:16],
                   "maskRect": next((full[i][0]["mr"] for i in range(A, E + 4) if "mr" in full[i][0]), None),
                   "screenSignatureSha": hashlib.sha256(json.dumps(sig_p).encode()).hexdigest()[:16]})
    summary.setdefault(scen, {"index": index.get(scen + ".json")})[scene] = {
        "sha256": hashlib.sha256(raw1).hexdigest(), "r1EqualsR2": raw1 == raw2, "windows": ws}
for scen, v in summary.items():
    on, off = v.get("on", {}).get("windows", []), v.get("off", {}).get("windows", [])
    v["timingOnEqualsOff"] = len(on) == len(off) and all(a["timingSignatureSha"] == b["timingSignatureSha"] for a, b in zip(on, off))
    v["maskOnEqualsOff"] = len(on) == len(off) and all(a["maskSignatureSha"] == b["maskSignatureSha"] for a, b in zip(on, off))
    v["deltaOnEqualsOff"] = len(on) == len(off) and all(a["deltaSignatureSha"] == b["deltaSignatureSha"] for a, b in zip(on, off))
    v["maskCropOnEqualsOff"] = len(on) == len(off) and all(a["maskCropSignatureSha"] == b["maskCropSignatureSha"] for a, b in zip(on, off))
    v["screenOnEqualsOff"] = len(on) == len(off) and all(a["screenSignatureSha"] == b["screenSignatureSha"] for a, b in zip(on, off))
    v["expectedArgSeen"] = any(w["arg"] == v["index"]["expectedAnimArg"] for w in on) if v["index"] else None
json.dump(summary, open(os.path.join(out, "stat-anim.json"), "w"), indent=1)
open(os.path.join(out, "stat-anim.json"), "a").write("\n")
for scen, v in summary.items():
    for scene in ("on", "off"):
        for w in v[scene]["windows"]:
            t = w["timeline"]
            print(scen, scene, v[scene]["r1EqualsR2"], v["timingOnEqualsOff"], v["maskOnEqualsOff"], v["deltaOnEqualsOff"], v["maskCropOnEqualsOff"], v["screenOnEqualsOff"], "arg", w["arg"], "A", w["A"], "len", w["activeFrames"], "chg", w["screenChanges"],
                  "s1", t["step1Regs"], "eva", t["firstEva"], t["peakEva"], t["peakRows"], t["lastEva"], "rest", t["regsRestored"], "ow", t["owRows"],
                  "vis", t["visibleRows"], t["visibleRowCount"], "bg1", w["bg1Start"], "mask", w["mask"]["x"], w["mask"]["y"], w["mask"]["dims"], w["mask"]["affine"],
                  "bbox", w["changedBbox"], "script", w["script"], "slot", w["copySlot"], w["inUseDuring"], "bs", w["battlerSprites"])
