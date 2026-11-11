"""aiv270 (docs/aiv270-ai-effectiveness-paralysis.md): classify the census delta of cause A (AI x0 / Wonder Guard probe = Cmd_if_type_effectiveness quirk) and cause B (AI if_target_faster / if_user_faster turn order).
Run from the workspace root: `python3 tools/integration/aiv270Classify.py <fixed-short-sha> [baseline-census-dir]`. Inputs: baseline arms (<dir>/<scene>-5682cd341/r[0-9].jsonl, default aiv267's fixed arms), fixed arms
(.integration/evidence/aiv270/census/<scene>-<sha>/r[0-9].jsonl), event logs + digests of the UNFIXED observation-only tree (.integration/evidence/aiv270/classify/parts; aiv270Instrument.py).
Event "A": the old chooser and the A-only chooser differ (scores / pick / RNG / draws) on a scored decision. Event "B": the A-only chooser and the full A+B chooser (fixed view) differ. A changed seed is explained when it has an A or a B event.
Prints per scene: instrumented digests == baseline, changed vs explained, class split (A / B / A+B), B causes, ON vs OFF sets."""
import glob, json, sys
from collections import Counter
sha = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else ".integration/evidence/aiv267/census"
EV = ".integration/evidence/aiv270"
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}; cmdchg = {}; cls_by_scene = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-5682cd341/r[0-9].jsonl"))
    new = load(glob.glob(f"{EV}/census/{scene}-{sha}/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.jsonl") if "events" not in p])
    ev = {}; decisions = 0
    for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.events.jsonl"):
        for l in open(p):
            r = json.loads(l); ev[r["seed"]] = r["events"]; decisions += r["decisions"]
    A = {s for s, es in ev.items() if any(e["fix"] == "A" for e in es)}
    B = {s for s, es in ev.items() if any(e["fix"] == "B" for e in es)}
    X = [s for s, es in ev.items() if any(e["fix"] == "X" for e in es)]
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if s in inst and inst[s]["eventsDigest"] == base[s]["eventsDigest"] and inst[s]["error"] == base[s]["error"])
    nA = [e for es in ev.values() for e in es if e["fix"] == "A"]; nB = [e for es in ev.values() for e in es if e["fix"] == "B"]
    print(f"== {scene}: seeds base/fixed/inst {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; errors base/fixed: {sum(1 for r in base.values() if r['error'])}/{sum(1 for r in new.values() if r['error'])}; observed scored decisions {decisions}; observer errors {len(X)}")
    print(f"changed {len(changed)}; A: {len(nA)} outcome-differing decisions in {len(A)} seeds ({sum(1 for e in nA if e['pickOld'] != e['pickNew'])} change the pick); B: {len(nB)} decisions in {len(B)} seeds ({sum(1 for e in nB if e['pickOld'] != e['pickNew'])} change the pick)")
    causes = Counter()
    for e in nB:
        c = []
        if e["par"][0]: c.append("attacker paralyzed")
        if e["par"][1]: c.append("target paralyzed")
        for who, i in (("attacker", 0), ("target", 1)):
            if e["hold"][i]: c.append(f"{who} {e['hold'][i]}")
            if e["abil"][i] in ("ABILITY_SWIFT_SWIM", "ABILITY_CHLOROPHYLL") and (e["weather"] or {}).get("isRaining" if e["abil"][i] == "ABILITY_SWIFT_SWIM" else "isSunny"): c.append(f"{who} {e['abil'][i]} in weather")
        causes["+".join(c) or "other (stage/speed)"] += 1
    print("B decision causes:", dict(causes.most_common()))
    explained = A | B
    unexpl = sorted(set(changed) - explained)
    cls = Counter("A+B" if s in A and s in B else "A" if s in A else "B" for s in changed if s in explained)
    cls_by_scene[scene] = {k: sorted(s for s in changed if s in explained and (("A+B" if s in A and s in B else "A" if s in A else "B") == k)) for k in ("A", "B", "A+B")}
    print("changed explained:", len(changed) - len(unexpl), "| unexplained:", unexpl, "| class split of changed:", dict(cls))
    unch = sorted(explained - set(changed))
    print("explained-but-unchanged battles:", len(unch), unch[:60])
    cb = sum(len(base[s]["commands"]) for s in changed); cn = sum(len(new[s]["commands"]) for s in changed)
    print(f"{scene} commands over changed seeds {cb} -> {cn}; total base -> fixed:", sum(len(r["commands"]) for r in base.values()), "->", sum(len(r["commands"]) for r in new.values()))
    for s in changed:
        es = ev.get(s, [])
        print(f"  seed {s}: A {sum(1 for e in es if e['fix']=='A')}, B {sum(1 for e in es if e['fix']=='B')}, commands {len(base[s]['commands'])} -> {len(new[s]['commands'])}")
    summary[scene] = changed
    cmdchg[scene] = {s for s in changed if base[s]["commands"] != new[s]["commands"]}
a, b = summary["on"], summary["off"]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)), "| both", len(set(a) & set(b)))
print("ON vs OFF command-list changed seeds:", len(cmdchg["on"]), "/", len(cmdchg["off"]), "| identical sets:", cmdchg["on"] == cmdchg["off"])
print("class split ON == OFF:", cls_by_scene["on"] == cls_by_scene["off"])
for k, v in cls_by_scene["on"].items(): print(f"class {k} (ON) {len(v)}:", v)
print("changed ON:", a)
