#!/usr/bin/env python3
"""sgs134: census delta of the banked patch (fixtures/sgs134/sgs134-gate.diff) — base vs patched archive copies, sgs134Production.ts --all
output per tree x scene (<dir>/<tree>-<scene><k>.jsonl), docs/sgs134-se-gate-other-requests.md §4.

Per battle (paired by seed): the end, the kernel-events digest (gameplay) and the segment / command-type sequence must be identical; per
command, presented frames = next command start - start (the battle's last command: the battle's end frame). Checked:
  - every command whose frames differ carries seGateFrames (patched) and differs by EXACTLY it; every seGateFrames command differs;
    the ONE exception is the census driver's input parity: it presses A on even frames while a message awaits dismissal, so after an
    odd cumulative shift a button-dismissed message lasts 1 frame more / less (reported as `messageParity`: a message, |delta| == 1,
    and the cumulative shift before it odd — never anything else);
  - only `stats-change` (both scenes) and `move-animation` (Scene ON) commands carry seGateFrames;
  - the gated commands == sgs134ExposureSummary.py's projection (exposure.json openReceipts with gate > 0, Scene ON kernel): per
    (seed, command type) frames; Scene OFF: the stats-change cells (same kernel gameplay, same rule); cells that differ are listed.
usage: sgs134CensusDelta.py <delta-dir> <exposure.json> <out.json>
"""
import collections, glob, json, os, sys

d, exposure_path, out = sys.argv[1:4]
exposure = json.load(open(exposure_path))


def load(tree, scene):
    rows = {}
    for f in sorted(glob.glob(os.path.join(d, f"{tree}-{scene}[0-9].jsonl"))):
        for line in open(f):
            b = json.loads(line)
            rows[b["seed"]] = b
    return rows


res = {"schema": "sgs134-census-delta/v1"}
ok = True
for scene in ("on", "off"):
    base, pat = load("base", scene), load("patched", scene)
    r = collections.Counter()
    gated = collections.Counter()
    gated_frames = collections.Counter()
    per_seed = collections.Counter()
    bad = []
    for seed in sorted(base):
        a, b = base[seed], pat.get(seed)
        r["battles"] += 1
        if b is None or a["end"] != b["end"] or a["eventsDigest"] != b["eventsDigest"]:
            bad.append({"seed": seed, "why": "end / events digest"}); continue
        if [(g["seg"], [c["t"] for c in g["cmds"]]) for g in a["segments"]] != [(g["seg"], [c["t"] for c in g["cmds"]]) for g in b["segments"]]:
            bad.append({"seed": seed, "why": "segment / command types"}); continue
        r["sameEndDigestCommandTypes"] += 1
        ca = [c for g in a["segments"] for c in g["cmds"]]
        cb = [c for g in b["segments"] for c in g["cmds"]]
        da = [ca[i + 1]["f"] - c["f"] if i + 1 < len(ca) else a["frames"] - c["f"] for i, c in enumerate(ca)]
        db = [cb[i + 1]["f"] - c["f"] if i + 1 < len(cb) else b["frames"] - c["f"] for i, c in enumerate(cb)]
        shift = 0
        for c, x, y in zip(cb, da, db):
            r["commands"] += 1
            sg = c.get("sg", 0)
            if sg:
                gated[c["t"]] += 1
                gated_frames[c["t"]] += sg
                per_seed[(seed, c["t"])] += sg
            if y - x != sg and c["t"] == "message" and abs(y - x) == 1 and shift % 2 == 1 and not sg:
                r["messageParity"] += 1
            elif y - x != sg:
                bad.append({"seed": seed, "why": f"{c['t']} frames {x} -> {y}, seGateFrames {sg}, shift {shift}"})
            elif sg:
                r["gatedExact"] += 1
            else:
                r["ungatedIdentical"] += 1
            shift += y - x
        r["framesBase"] += a["frames"]
        r["framesPatched"] += b["frames"]
    allowed = {"stats-change", "move-animation"} if scene == "on" else {"stats-change"}
    if set(gated) - allowed:
        bad.append({"why": f"unexpected gated command types {sorted(set(gated) - allowed)}"})
    sres = {**r, "gatedCommands": dict(gated), "gateFrames": dict(gated_frames), "problems": bad[:20], "problemCount": len(bad)}
    if True:
        proj = collections.Counter()
        for x in exposure["openReceipts"]:
            if x["gate"] and (scene == "on" or x["cls"] != "multi-hit"):
                t = "move-animation" if x["cls"] == "multi-hit" else "stats-change"
                proj[(x["seed"], t)] += x["gate"]
        match = sum(1 for k in proj if per_seed.get(k, 0) == proj[k])
        sres["projection"] = {"seedClassCells": len(proj), "cellsEqual": match,
                              "cellsDiffer": [{"seed": k[0], "type": k[1], "projected": v, "patched": per_seed.get(k, 0)}
                                              for k, v in sorted(proj.items()) if per_seed.get(k, 0) != v][:40],
                              "patchedOnlyCells": [{"seed": k[0], "type": k[1], "patched": v} for k, v in sorted(per_seed.items()) if k not in proj][:40],
                              "projectedFrames": sum(proj.values())}
    ok = ok and not bad
    res[scene] = sres
    print(scene, json.dumps({k: v for k, v in sres.items() if k not in ("problems",)})[:1500])
res["ok"] = ok
json.dump(res, open(out, "w"), indent=1)
print("sgs134CensusDelta:", "ALL TRUE" if ok else "PROBLEMS")
sys.exit(0 if ok else 1)
