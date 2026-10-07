#!/usr/bin/env python3
"""prep22: Random2 plans for SIGNAL_BEAM / LOVELY_KISS / SHEER_COLD / SPIKES / OCTAZOOKA / SKILL_SWAP / SHOCK_WAVE (copy of prep18Plans.py; lovely kiss has 4 draws).
Inputs: /tmp/p18/<scenario>-r{1,2}.json (random2RouteProbe.py --lab --step-anim, via prep14Probes.sh), the retained accepted dense corpora.
Per accepted scenario and body: draws (none), lag ages (0-step frames, age = frame - activation), activation gRng2 == corpus row 0 animationRng,
and the PLAN (pure per-frame advance, skipping the lag ages) replayed against the corpus' per-row animationRng.  Alternates: lag signature == accepted.
usage: prep18Plans.py PROBE_DIR OUT_JSON"""
import gzip, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
PD, OUT = Path(sys.argv[1]), Path(sys.argv[2])
EV = ROOT / "tools/compare/evidence"
lcg = lambda x: (x * 1103515245 + 24691) & 0xFFFFFFFF
CORP = {"signal-beam": ("signal-beam", "Move_SIGNAL_BEAM"), "lovely-kiss": ("lovely-kiss", "Move_LOVELY_KISS"), "sheer-cold": ("sheer-cold", "Move_SHEER_COLD"), "spikes": ("spikes", "Move_SPIKES"),
        "octazooka": ("octazooka", "Move_OCTAZOOKA"), "skill-swap": ("skill-swap", "Move_SKILL_SWAP"), "shock-wave": ("shock-wave", "Move_SHOCK_WAVE")}
class Probe:
    def __init__(s, p):
        d = json.loads(p.read_text()); s.d = d; n = d["frames"]
        s.steps = [0] * (n + 2); s.act = [False] * (n + 2); s.lab = [None] * (n + 2)
        for r in d["runs"]:
            for f in range(r["from"], r["to"] + 1): s.steps[f] = r["steps"]; s.act[f] = bool(r["ctx"][2]); s.lab[f] = r["ctx"][3].split("+")[0] if r["ctx"][2] else None
        s.val = [d["anchorRng2"]] + [0] * n
        for f in range(1, n + 1):
            v = s.val[f - 1]
            for _ in range(s.steps[f]): v = lcg(v)
            s.val[f] = v
        assert all(s.val[r["to"]] == r["endValue"] for r in d["runs"]); assert d["rng2WritesOutsideRandom2"] == []; s.nt = d["singleSteppedNonTrivial"]
        s.callers = d["singleSteppedCallerTotals"]
def segments(c):
    f = c["frames"]; cuts = [0] + [i for i in range(1, len(f)) if f[i]["frame"] != f[i - 1]["frame"] + 1] + [len(f)]
    return [f[a:b] for a, b in zip(cuts, cuts[1:])]
res = {}
def probe_pair(name):
    a, b = (json.loads((PD / f"{name}-r{i}.json").read_text()) for i in (1, 2))
    return Probe(PD / f"{name}-r1.json"), all(a[k] == b[k] for k in a if k != "finalStateSha1"), a["runsSha1"]
for key, (cm, label) in CORP.items():
    for side in ("player", "opponent"):
        sc = next(p.name[:-8] for p in sorted(PD.glob(f"mechanic-{key}-{side}-*-r1.json")))
        pr, ident, sha = probe_pair(sc)
        corp = json.load(gzip.open(EV / f"{cm}-{side}-dense-state.json.gz"))
        bodies = []
        for i, seg in enumerate(segments(corp)):
            a = seg[0]["frame"]; end = seg[-1]["frame"]
            lag = [f - a for f in range(a + 1, end + 1) if pr.steps[f] == 0]
            draws = [[f - a, pr.steps[f] - 1] for f in range(a + 1, end + 1) if pr.steps[f] > 1]
            v = seg[0]["animationRng"]; plan = [v]
            for f in range(a + 1, end + 1):
                for _ in range(pr.steps[f]): v = lcg(v)
                plan.append(v)
            series = [x["animationRng"] for x in seg]
            bodies.append({"bodyIndex": i, "activationFrame": a, "lastCorpusFrame": end, "rows": len(seg), "label": pr.lab[a], "activationValueHex": f"0x{pr.val[a]:08X}",
                           "activationEqualsCorpusRow0": pr.val[a] == series[0], "lagAges": lag, "extraDrawStepsByAge": draws, "planEqualsCorpusPerRow": plan == series, "mismatchRows": [j for j in range(len(seg)) if plan[j] != series[j]][:5]})
        res[f"{key}-{side}"] = {"scenario": sc, "probeRunsIdentical": ident, "runsSha1": sha, "callers": pr.callers, "bodies": bodies}
        print(key, side, "identical" if ident else "DIFF", pr.callers, [(b["activationFrame"], b["rows"], b["lagAges"], b["extraDrawStepsByAge"], b["activationEqualsCorpusRow0"], b["planEqualsCorpusPerRow"]) for b in bodies])
OUT.parent.mkdir(parents=True, exist_ok=True); OUT.write_text(json.dumps(res, indent=1))
