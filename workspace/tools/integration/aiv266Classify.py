"""aiv266 (docs/aiv266-ai-view-fields.md): classify the census delta of the live AI view field fill (ISSUES #204).
Run from the workspace root: `python3 tools/integration/aiv266Classify.py <fixed-short-sha> [baseline-census-dir]`. Inputs: baseline arms (<dir>/<scene>-9dddc1aa2/r[0-9].jsonl), fixed arms
(.integration/evidence/aiv266/census/<scene>-<sha>/r[0-9].jsonl), event logs + digests of the UNFIXED observation-only tree (.integration/evidence/aiv266/classify/parts; aiv266Instrument.py).
A decision is flagged when a view field's new value differs from the old default; "outcome" flags additionally mean scores, pick or RNG differ. Per scene: instrumented digests == baseline,
changed seeds vs flagged / outcome-flagged seeds (0 unexplained), first flagged field set per changed seed, ON vs OFF changed sets and command-list changes."""
import glob, json, sys
from collections import Counter
sha = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "/srv/pokebench/pokeemerald-factory-core/workspace/.integration/validation/sv-20261109/dmg264/census"
EV = ".integration/evidence/aiv266"
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}; cmdchg = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-9dddc1aa2/r[0-9].jsonl"))
    new = load(glob.glob(f"{EV}/census/{scene}-{sha}/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.jsonl") if "events" not in p])
    flagged = {}
    for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.events.jsonl"):
        for l in open(p):
            r = json.loads(l); flagged[r["seed"]] = r["events"]
    outcome = {s for s, evs in flagged.items() if any(e.get("outcomeDiffers") or "error" in e for e in evs)}
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if s in inst and inst[s]["eventsDigest"] == base[s]["eventsDigest"] and inst[s]["error"] == base[s]["error"])
    fields = Counter(f"{side}.{k}" for evs in flagged.values() for e in evs if "fields" in e for side in ("attacker", "target") for k in e["fields"][side])
    ofields = Counter(f"{side}.{k}" for evs in flagged.values() for e in evs if e.get("outcomeDiffers") for side in ("attacker", "target") for k in e["fields"][side])
    print(f"== {scene}: seeds base/fixed/inst {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; errors base/fixed: {sum(1 for r in base.values() if r['error'])}/{sum(1 for r in new.values() if r['error'])}")
    print(f"changed {len(changed)}; seeds with a field-differing decision {len(flagged)}; seeds with an outcome-differing decision {len(outcome)}; decision errors {sum(1 for evs in flagged.values() for e in evs if 'error' in e)}")
    print("fields differing (decisions):", dict(fields.most_common()))
    print("fields in outcome-differing decisions:", dict(ofields.most_common()))
    unexpl = sorted(set(changed) - outcome)
    print("changed subset of outcome-flagged:", not unexpl, "| unexplained (changed, no outcome-differing decision):", unexpl, "| outcome-flagged but unchanged:", len(outcome - set(changed)), sorted(outcome - set(changed))[:40])
    cause = Counter(); cb = cn = 0
    for s in changed:
        bc, nc = base[s]["commands"], new[s]["commands"]; cb += len(bc); cn += len(nc)
        e = next((e for e in flagged.get(s, []) if e.get("outcomeDiffers")), None)
        cause[",".join(sorted({f"{sd[0]}.{k}" for sd in ("attacker", "target") for k in e["fields"][sd]})) if e else None] += 1
    print(f"{scene} first outcome-differing decision's field set per changed seed:", dict(cause.most_common(25)))
    print(f"{scene} commands over changed seeds {cb} -> {cn}; total base -> fixed:", sum(len(r["commands"]) for r in base.values()), "->", sum(len(r["commands"]) for r in new.values()))
    summary[scene] = changed
    cmdchg[scene] = {s for s in changed if base[s]["commands"] != new[s]["commands"]}
a, b = summary["on"], summary["off"]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)), "| both", len(set(a) & set(b)))
print("ON vs OFF command-list changed seeds:", len(cmdchg["on"]), "/", len(cmdchg["off"]), "| identical sets:", cmdchg["on"] == cmdchg["off"])
print("changed ON:", a)
