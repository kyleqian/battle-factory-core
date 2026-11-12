"""aiv271 (docs/aiv271-ai-damage-terms.md): classify the census delta of cause C (AI damage sims take the real CalculateBaseDamage terms).
Run from the workspace root: `python3 tools/integration/aiv271Classify.py <fixed-short-sha> [baseline-census-dir] [baseline-short-sha]`. Inputs: baseline arms (<dir>/<scene>-<sha>/r[0-9].jsonl, default aiv270's final arms 60282bba8),
fixed arms (.integration/evidence/aiv271/census/<scene>-<sha>/r[0-9].jsonl), event logs + digests of the UNFIXED observation-only tree (.integration/evidence/aiv271/classify/parts; aiv271Instrument.py).
Event "C": the old chooser and the fixed chooser over the fixed view (damageTerms) differ (scores / pick / RNG / draws) on a scored decision; "causes" lists the term groups whose neutralisation changes the fixed result.
A changed seed is explained when it has a C event. Prints per scene: instrumented digests == baseline, changed vs explained, cause split, ON vs OFF sets."""
import glob, json, sys
from collections import Counter
sha = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/aiv270/census"
BSHA = sys.argv[3] if len(sys.argv) > 3 else "60282bba8"
EV = ".integration/evidence/aiv271"
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}; cmdchg = {}; cause_sets = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-{BSHA}/r[0-9].jsonl"))
    new = load(glob.glob(f"{EV}/census/{scene}-{sha}/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.jsonl") if "events" not in p])
    ev = {}; decisions = 0
    for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.events.jsonl"):
        for l in open(p):
            r = json.loads(l); ev[r["seed"]] = r["events"]; decisions += r["decisions"]
    C = {s for s, es in ev.items() if any(e["fix"] == "C" for e in es)}
    X = [s for s, es in ev.items() if any(e["fix"] in ("X", "Z") for e in es)]
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if s in inst and inst[s]["eventsDigest"] == base[s]["eventsDigest"] and inst[s]["error"] == base[s]["error"])
    nC = [e for es in ev.values() for e in es if e["fix"] == "C"]
    print(f"== {scene}: seeds base/fixed/inst {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; errors base/fixed: {sum(1 for r in base.values() if r['error'])}/{sum(1 for r in new.values() if r['error'])}; observed scored decisions {decisions}; observer errors / legacy-path self-check failures: {len(X)}")
    print(f"changed {len(changed)}; C: {len(nC)} outcome-differing decisions in {len(C)} seeds ({sum(1 for e in nC if e['pickOld'] != e['pickNew'])} change the pick)")
    causes = Counter(); seedcauses = {}
    for s, es in ev.items():
        for e in es:
            if e["fix"] != "C": continue
            c = "+".join(e["causes"]) or "combined (no single group)"
            causes[c] += 1
            seedcauses.setdefault(s, set()).add(c)
    print("C decision causes (term groups whose neutralisation reverts the change):", dict(causes.most_common()))
    atk = Counter()
    for es in ev.values():
        for e in es:
            if e["fix"] == "C":
                atk[f"atk species {e['atk']['species']} hold {e['atk']['hold']} | def hold {e['def']['hold']}"] += 1
    print("C decision term snapshot (top 12):", dict(atk.most_common(12)))
    unexpl = sorted(set(changed) - C)
    print("changed explained:", len(changed) - len(unexpl), "| unexplained:", unexpl)
    unch = sorted(C - set(changed))
    print("C-event-but-unchanged battles:", len(unch), unch[:60])
    cb = sum(len(base[s]["commands"]) for s in changed); cn = sum(len(new[s]["commands"]) for s in changed)
    print(f"{scene} commands over changed seeds {cb} -> {cn}; total base -> fixed:", sum(len(r["commands"]) for r in base.values()), "->", sum(len(r["commands"]) for r in new.values()))
    for s in changed:
        es = [e for e in ev.get(s, []) if e["fix"] == "C"]
        print(f"  seed {s}: C {len(es)} [{', '.join(sorted(seedcauses.get(s, [])))}], commands {len(base[s]['commands'])} -> {len(new[s]['commands'])}")
    summary[scene] = changed; cause_sets[scene] = {s: sorted(v) for s, v in seedcauses.items() if s in set(changed)}
    cmdchg[scene] = {s for s in changed if base[s]["commands"] != new[s]["commands"]}
a, b = summary["on"], summary["off"]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)), "| both", len(set(a) & set(b)))
print("ON vs OFF command-list changed seeds:", len(cmdchg["on"]), "/", len(cmdchg["off"]), "| identical sets:", cmdchg["on"] == cmdchg["off"])
print("changed ON:", a)
print("changed OFF:", b)
