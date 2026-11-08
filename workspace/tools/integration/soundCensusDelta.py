#!/usr/bin/env python3
"""aud243a sound census delta (docs/aud243a-sound-census.md). lsd194Census.ts arms carry per seed `sound` [[frame, kind, id, pan(, mode)]...], `soundDigest`, `soundAnim`.

  soundCensusDelta.py BASE FINAL            arm-vs-arm: per seed sound digest equal / event-sequence equal / changed; per (kind, id, pan) count and frame-delta histograms.
  soundCensusDelta.py --t1 ARM [--json out] T1 per executed move-animation command: emitted move-animation SEs against the aud242 table (anim-sound-timing.json) -> class table.

T1 IS SELF-CONSISTENCY, NOT ROM PARITY. Expected rows come from the same table the emitter reads (walked independently of the age clock by soundCensusExpected.ts), so
exact only says the emitter fired what the table says at the frame the table says; ROM-vs-engine offsets (#196 / #197 / #198) are invisible here and belong to T2 (aud243b).
The only independent information T1 adds is what the table CANNOT resolve (gated ops, by the extractor's `ends` reason), declined bodies and not-ported cry tasks.
"""
import glob, json, os, re, subprocess, sys, tempfile
from collections import Counter, defaultdict

# Sounds of the other emitter families (battleHitSounds / screenSounds / battleStartSounds / battleEndSounds); no aud242 table op uses these ids (min 20).
CONTROLLER_IDS = {5, 9, 12, 13, 14, 15, 16, 32, 55, 79, 90, 114, 115, 116}
CLASSES = ["exact", "known-offset", "missing-gated", "missing-declined", "missing-cry-task", "missing-other", "extra", "unclassified"]


def load_arm(d):
    rows = {}
    for p in sorted(glob.glob(os.path.join(d, "r[0-9].jsonl"))):
        for line in open(p):
            if line.strip():
                r = json.loads(line)
                rows[r["seed"]] = r
    return rows


def arm_mode(base, final):
    B, F = load_arm(base), load_arm(final)
    res = Counter(); bad = []; tuples = defaultdict(Counter); deltas = Counter()
    for s in sorted(B):
        b, f = B[s], F.get(s)
        res["seeds"] += 1
        if f is None:
            bad.append({"seed": s, "kind": "missing-in-final"}); continue
        if b["sound"] is None or f["sound"] is None:
            res["noSoundColumn"] += 1; continue
        if b["soundDigest"] == f["soundDigest"]:
            res["identical"] += 1; continue
        res["changed"] += 1
        bs, fs = [tuple(e[1:]) for e in b["sound"]], [tuple(e[1:]) for e in f["sound"]]
        if bs == fs:
            res["sameSequenceFramesMoved"] += 1
            for x, y in zip(b["sound"], f["sound"]):
                if x[0] != y[0]: deltas[(x[1], x[2], x[3], y[0] - x[0])] += 1
        else:
            res["sequenceChanged"] += 1
            cb, cf = Counter(bs), Counter(fs)
            for k in (cf - cb): tuples[k]["added"] += 1
            for k in (cb - cf): tuples[k]["removed"] += 1
            if len(bad) < 10: bad.append({"seed": s, "kind": "sequence", "base": len(bs), "final": len(fs)})
    print(json.dumps(dict(res)))
    print("changed examples", json.dumps(bad[:10]))
    for k, v in sorted(tuples.items(), key=lambda kv: -sum(kv[1].values()))[:30]: print("tuple", k, dict(v))
    for k, v in sorted(deltas.items(), key=lambda kv: -kv[1])[:30]: print("frameDelta (kind,id,pan,delta)", k, v)


def cry_sites():
    """Per Move_* label: number of SoundTask_Play*Cry* / WaitForCry sites reachable through call / goto / jump* edges (an upper bound: branches are not evaluated)."""
    src = open("reference/pokeemerald/data/battle_anim_scripts.s").read().split("\n")
    labels = {}; cur = None
    for ln in src:
        m = re.match(r"^(\w+)::?\s*(?:@.*)?$", ln)
        if m: cur = m.group(1); labels[cur] = {"cry": 0, "edges": []}; continue
        if cur is None: continue
        if re.search(r"createvisualtask SoundTask_(PlayCry|PlayDoubleCry|WaitForCry)", ln): labels[cur]["cry"] += 1
        m = re.match(r"^\s*(call|goto|jumpif\w*|jumpret\w*|jumparg\w*)\s+(.*?)\s*(?:@.*)?$", ln)
        if m:
            for a in m.group(2).split(","):
                a = a.strip()
                if a in labels or re.match(r"^\w+$", a): labels[cur]["edges"].append(a)
    out = {}
    for name in labels:
        if not name.startswith("Move_"): continue
        seen = set(); stack = [name]; n = 0
        while stack:
            x = stack.pop()
            if x in seen or x not in labels: continue
            seen.add(x); n += labels[x]["cry"]; stack.extend(labels[x]["edges"])
        out[name] = n
    return out


def t1(arm, json_out):
    A = load_arm(arm)
    timing = json.load(open("src/data/gen/anim-sound-timing.json"))
    label_of = {m["move"]: m["label"] for m in timing["moves"]}
    cry = cry_sites()
    keys = sorted({(a[1], a[2], a[3], a[4]) for r in A.values() for a in r["soundAnim"] if a[1] is not None})
    with tempfile.TemporaryDirectory() as td:
        kp, ep = os.path.join(td, "keys.json"), os.path.join(td, "expected.json")
        json.dump(keys, open(kp, "w"))
        subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusExpected.ts", kp, ep], check=True)
        E = json.load(open(ep))
    tot = Counter(); gated_by_end = Counter(); per_class_moves = defaultdict(Counter); offsets = Counter(); examples = defaultdict(list)
    cmds = Counter(); scene = None; after_end = Counter()
    def put(cls, n, seed, move, ex=None):
        tot[cls] += n
        per_class_moves[cls][label_of.get(move, move)] += n
        if len(examples[cls]) < 4: examples[cls].append((seed, move, ex))
    for s in sorted(A):
        r = A[s]; scene = r["scene"]
        if r["sound"] is None: sys.exit("arm has no sound column")
        windows = []; inwin = lambda f: any(w[5] <= f <= w[6] for w in r["soundAnim"])
        for a in r["soundAnim"]:
            idx, move, turn, att, tgt, first, last, zero, noanim = a[:9]
            cmds["move-animation commands"] += 1
            ev = [e for e in r["sound"] if first <= e[0] <= last and e[1] in ("se", "pan") and not (e[1] == "se" and e[2] in CONTROLLER_IDS)]
            if noanim:
                cmds["Scene OFF (HITMARKER_NO_ANIMATIONS)"] += 1
                for e in ev: put("extra", 1, s, move, e)
                continue
            if move is None:
                if len(a) > 9 and a[9]:
                    cmds["Scene ON action-transition pause (no body by design)"] += 1
                else:
                    cmds["no body request, not a transition"] += 1; put("unclassified", 1, s, None, "animation-less non-transition command " + str(idx))
                for e in ev: put("extra", 1, s, move, e)
                continue
            exp = E.get(f"{move},{turn},{att},{tgt}")
            if exp is None:
                cmds["move without table entry"] += 1
                for e in ev: put("unclassified", 1, s, move, e)
                put("unclassified", 1, s, move, "no table entry")
                continue
            n_cry = cry.get(label_of.get(move, ""), 0)
            if zero is None:
                cmds["declined / no live body"] += 1
                put("missing-declined", len(exp["rows"]), s, move)
                if n_cry: put("missing-cry-task", n_cry, s, move)
                for e in ev: put("extra", 1, s, move, e)
                continue
            cmds["live"] += 1
            if exp["gated"]: put("missing-gated", exp["gated"], s, move, exp["ends"]); gated_by_end[exp["ends"]] += exp["gated"]
            if n_cry: put("missing-cry-task", n_cry, s, move)
            left = list(ev)
            pending = []
            for row in exp["rows"]:
                frame = zero + 8 + row[0]; want = (row[1], row[2], row[3])
                hit = next((e for e in left if e[0] == frame and (e[1], e[2], e[3]) == want), None)
                if hit is not None: left.remove(hit); put("exact", 1, s, move)
                else: pending.append((frame, want))
            for frame, want in pending:
                cand = [e for e in left if (e[1], e[2], e[3]) == want]
                if cand:
                    hit = min(cand, key=lambda e: abs(e[0] - frame)); left.remove(hit)
                    offsets[(label_of.get(move, move), hit[0] - frame)] += 1; put("known-offset", 1, s, move, hit[0] - frame)
                else:
                    put("missing-other", 1, s, move, [frame, *want]); after_end["after the command's last presenting frame" if frame > last else "inside the command"] += 1
            for e in left: put("extra", 1, s, move, e)
        for e in r["sound"]:
            if e[1] in ("se", "pan") and not (e[1] == "se" and e[2] in CONTROLLER_IDS) and not inwin(e[0]):
                put("unclassified", 1, s, None, e)
    print(f"T1 (self-consistency, NOT ROM parity) arm={arm} scene={scene} seeds={len(A)}")
    print("commands:", dict(cmds))
    print("%-18s %9s" % ("class", "count"))
    for c in CLASSES: print("%-18s %9d" % (c, tot[c]))
    print("missing-other rows:", dict(after_end))
    print("gated ops by table `ends` reason:", dict(gated_by_end))
    print("known-offset by (move, delta) top:", offsets.most_common(12))
    for c in CLASSES:
        if per_class_moves[c]: print(c, "top moves:", per_class_moves[c].most_common(8), "examples (seed, move, detail):", examples[c][:3])
    if json_out:
        json.dump({"arm": arm, "scene": scene, "seeds": len(A), "commands": dict(cmds), "classes": {c: tot[c] for c in CLASSES}, "gatedByEnds": dict(gated_by_end),
                   "knownOffsetTop": [[list(k), v] for k, v in offsets.most_common(40)]}, open(json_out, "w"), indent=1)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "--t1":
        t1(a[1], a[a.index("--json") + 1] if "--json" in a else None)
    elif len(a) >= 2:
        arm_mode(a[0], a[1])
    else:
        sys.exit(__doc__)
