#!/usr/bin/env python3
"""rst139 route delta (docs/rst139-ordinary-row-rest.md): rst139RouteRender.ts outputs of a base and a patched tree, frame by frame.
Changed frames are classified by (row class, tracked opponent state, species rest != 0, opponent visible). Expected: the frame lists
(frame numbers, classes, states) identical, and a frame's sha changes iff it is an at-stake row (ordinary / menu / handoff class, tracked
`idle`, rest != 0, opponent visible).
usage: rst139RouteDelta.py <base-dir> <patched-dir> <out.json>"""
import glob, json, os, sys
from collections import Counter
bdir, pdir, out = sys.argv[1:4]
res, ok = {}, True
AT = lambda cls: cls == "ordinary" or cls.startswith("menu-") or cls in ("resolution-confirm-handoff", "resolution-next-command-handoff")
for p in sorted(glob.glob(os.path.join(bdir, "r*.jsonl"))):
    b = [json.loads(l) for l in open(p) if l.strip()]
    q = [json.loads(l) for l in open(os.path.join(pdir, os.path.basename(p))) if l.strip()]
    for bb, qq in zip(b, q):
        same_rows = [f[:6] for f in bb["frames"]] == [f[:6] for f in qq["frames"]] and bb["end"] == qq["end"]
        changed, stake, unexpected, missed = Counter(), 0, 0, 0
        for fb, fq in zip(bb["frames"], qq["frames"]):
            at = AT(fb[1]) and fb[2] == "idle" and fb[4] != 0 and fb[5] == 1
            diff = fb[6] != fq[6]
            stake += at
            if diff: changed[f"{fb[1]}|{fb[2]}|{fb[3]}"] += 1
            if diff and not at: unexpected += 1
            if at and not diff: missed += 1
        ok &= same_rows and unexpected == 0 and missed == 0
        res[str(bb["seed"])] = {"frames": len(bb["frames"]), "end": bb["end"], "sameRowSequence": same_rows, "atStake": stake,
                                "changed": sum(changed.values()), "unexpectedChanges": unexpected, "atStakeUnchanged": missed,
                                "changedBy": dict(sorted(changed.items()))}
ok &= len(res) > 0
json.dump({"ok": ok, "battles": res}, open(out, "w"), indent=1)
for k, v in res.items():
    print(f"seed {k}: frames {v['frames']} at-stake {v['atStake']} changed {v['changed']} unexpected {v['unexpectedChanges']} missed {v['atStakeUnchanged']} same-rows {v['sameRowSequence']}")
print("OK" if ok else "NOT OK")
