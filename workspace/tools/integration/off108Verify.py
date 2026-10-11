#!/usr/bin/env python3
"""off108: production's next presented command vs the ROM anchor, base vs patched (docs/off108-scene-off-pauses.md §3).

usage: off108Verify.py <classes.json> <base-route-dir> <patched-route-dir> <out.json> [--scene=off|on]
For every class row of classes.json with a production signature (the census receipt path the lab ROM path matches), take each tree's
off108Route.ts uses of that move with the same path (attack-receipt delta, N's label + delta) and compute where production starts N's
command, in frames after G + 1 (the opener command's end: max(24, printable length) frames after its start, the accepted anchor):
the opener's holdFrames + every command after the opener and before N's command (minimumFrames + holdFrames; the pause command
included). residual = that start - the ROM anchor (classes.json rule.romAnchor). Patched must be 0 on every checked class.
"""
import glob, json, os, sys

cls_path, base_dir, patched_dir, out_path = sys.argv[1:5]
scene = next((a.split("=", 1)[1] for a in sys.argv[5:] if a.startswith("--scene=")), "off")
rows = json.load(open(cls_path))["rows"]


def load(d):
    res = []
    for f in sorted(glob.glob(os.path.join(d, f"{scene}-*.jsonl"))):
        res += [json.loads(l) for l in open(f) if l.strip()]
    return res


def start_of_n(u, n_label, n_delta, att_delta):
    att = u["attack"]
    if (att is None) != (att_delta is None) or (att is not None and att[4] != att_delta):
        return None
    n = next((r for r in u["follow"] if r[3] == n_label and r[4] == n_delta), None)
    if n is None:
        return None
    cmds = u["commands"]
    if not cmds:
        return None
    opener = cmds[0]  # the opener print's command (its eventSequence is the use's first)
    n_cmd = next((i for i, c in enumerate(cmds) if c[0] >= n[0] and i > 0), None)
    if n_cmd is None:
        return None
    return (opener[3] or 0) + sum((c[2] or 0) + (c[3] or 0) for c in cmds[1:n_cmd])


trees = {"base": load(base_dir), "patched": load(patched_dir)}
out = {"schema": "off108-verify/v1", "scene": scene, "classes": []}
for r in rows:
    p, rule = r.get("prod"), r.get("rule")
    if not p or not rule:
        out["classes"].append({"class": r["class"], "checked": False})
        continue
    n_label, n_delta = p["N"][2], p["N"][3]
    rec = {"class": r["class"], "checked": True, "romAnchor": rule["romAnchor"], "P": rule["P"]}
    for t, uses in trees.items():
        starts = sorted({s for u in uses if (u["move"] == r["move"] or (r["move"] == 33 and u["attack"] is None))
                         for s in [start_of_n(u, n_label, n_delta, p["att"])] if s is not None})
        rec[t] = {"starts": starts, "residuals": [s - rule["romAnchor"] for s in starts]}
    out["classes"].append(rec)
ok = [c for c in out["classes"] if c["checked"] and c["patched"]["residuals"] == [0]]
out["summary"] = {"checked": sum(c["checked"] for c in out["classes"]), "patchedZeroResidual": len(ok)}
json.dump(out, open(out_path, "w"), indent=1)
for c in out["classes"]:
    if c["checked"]:
        print(f"{c['class']:40s} anchor {c['romAnchor']:3d}  base {c['base']['residuals']}  patched {c['patched']['residuals']}")
    else:
        print(f"{c['class']:40s} (open: no production rule)")
print(json.dumps(out["summary"]))
