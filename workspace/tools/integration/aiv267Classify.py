"""aiv267 (docs/aiv267-ai-screens-self-hit.md): classify the census delta of the AI damage-sim screens (fix A) and the confusion self-hit hold item (fix B).
Run from the workspace root: `python3 tools/integration/aiv267Classify.py <fixed-short-sha> [baseline-census-dir]`. Inputs: baseline arms (<dir>/<scene>-40447d9de/r[0-9].jsonl), fixed arms
(.integration/evidence/aiv267/census/<scene>-<sha>/r[0-9].jsonl), event logs + digests of the UNFIXED observation-only tree (.integration/evidence/aiv267/classify/parts; aiv267Instrument.py).
Fix A events: a scored decision whose target side has a screen up ("screen") or whose scores / pick / RNG differ under the fixed code ("outcome"). Fix B events: a confusion self-hit whose damage differs.
A changed seed is explained when it has an outcome-differing A decision or a B event. Prints per scene: instrumented digests == baseline, changed vs explained, class split, ON vs OFF sets."""
import glob, json, sys
from collections import Counter
sha = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/aiv266/census"
EV = ".integration/evidence/aiv267"
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}; cmdchg = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-40447d9de/r[0-9].jsonl"))
    new = load(glob.glob(f"{EV}/census/{scene}-{sha}/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.jsonl") if "events" not in p])
    ev = {}
    for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.events.jsonl"):
        for l in open(p):
            r = json.loads(l); ev[r["seed"]] = r["events"]
    A_out = {s for s, es in ev.items() if any(e["fix"] == "A" and (e.get("outcomeDiffers") or "error" in e) for e in es)}
    A_screen = {s for s, es in ev.items() if any(e["fix"] == "A" and (e.get("reflect") or e.get("lightScreen")) for e in es)}
    B = {s for s, es in ev.items() if any(e["fix"] == "B" for e in es)}
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if s in inst and inst[s]["eventsDigest"] == base[s]["eventsDigest"] and inst[s]["error"] == base[s]["error"])
    nA = sum(1 for es in ev.values() for e in es if e["fix"] == "A"); nAo = sum(1 for es in ev.values() for e in es if e["fix"] == "A" and e.get("outcomeDiffers"))
    nB = [e for es in ev.values() for e in es if e["fix"] == "B"]
    print(f"== {scene}: seeds base/fixed/inst {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; errors base/fixed: {sum(1 for r in base.values() if r['error'])}/{sum(1 for r in new.values() if r['error'])}")
    print(f"changed {len(changed)}; A: seeds with a target-side screen decision {len(A_screen)} ({nA} decisions, {nAo} outcome-differing), seeds with an outcome-differing decision {len(A_out)}, decision errors {sum(1 for es in ev.values() for e in es if 'error' in e)}")
    print(f"B: seeds with a differing self-hit {len(B)} ({len(nB)} self-hits); items:", dict(Counter(e['holdEffect'] for e in nB).most_common()))
    explained = A_out | B
    unexpl = sorted(set(changed) - explained)
    cls = Counter("A+B" if s in A_out and s in B else "A" if s in A_out else "B" for s in changed if s in explained)
    print("changed explained:", len(changed) - len(unexpl), "| unexplained (changed, no differing A decision or B self-hit):", unexpl, "| class split of changed:", dict(cls))
    unch = sorted(explained - set(changed))
    print("explained-but-unchanged battles:", len(unch), unch[:40])
    cb = sum(len(base[s]["commands"]) for s in changed); cn = sum(len(new[s]["commands"]) for s in changed)
    print(f"{scene} commands over changed seeds {cb} -> {cn}; total base -> fixed:", sum(len(r["commands"]) for r in base.values()), "->", sum(len(r["commands"]) for r in new.values()))
    for s in changed:
        es = ev.get(s, [])
        print(f"  seed {s}: A-outcome {sum(1 for e in es if e['fix']=='A' and e.get('outcomeDiffers'))}, A-screen {sum(1 for e in es if e['fix']=='A' and (e.get('reflect') or e.get('lightScreen')))}, B {[(e['oldDamage'], e['newDamage'], e['holdEffect']) for e in es if e['fix']=='B']}, commands {len(base[s]['commands'])} -> {len(new[s]['commands'])}")
    summary[scene] = changed
    cmdchg[scene] = {s for s in changed if base[s]["commands"] != new[s]["commands"]}
a, b = summary["on"], summary["off"]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)), "| both", len(set(a) & set(b)))
print("ON vs OFF command-list changed seeds:", len(cmdchg["on"]), "/", len(cmdchg["off"]), "| identical sets:", cmdchg["on"] == cmdchg["off"], sorted(cmdchg["on"]))
print("changed ON:", a)
