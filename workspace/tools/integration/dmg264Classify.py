"""dmg264 (docs/dmg264-type-order-screens.md): classify the census delta of the type-row-order (#206) + screens (#208) fix.
Run from the workspace root: `python3 tools/integration/dmg264Classify.py <fixed-short-sha> [baseline-census-dir]`. Inputs: baseline arms (<dir>/<scene>-e2e0b17b5/r[0-9].jsonl), fixed arms
(.integration/evidence/dmg264/census/<scene>-<sha>/r[0-9].jsonl), event logs + digests of the UNFIXED observation-only tree (.integration/evidence/dmg264/classify/parts; dmg264Instrument.py).
Checks per scene: instrumented digests == baseline, changed seeds vs flagged seeds (changed subset of flagged, 0 unexplained), first flagged site per changed seed, and ON vs OFF changed sets."""
import glob, json, sys
from collections import Counter
sha = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "/srv/pokebench/pokeemerald-factory-core/workspace/.integration/validation/sv-20261109/aip262/census"
EV = ".integration/evidence/dmg264"
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-e2e0b17b5/r[0-9].jsonl"))
    new = load(glob.glob(f"{EV}/census/{scene}-{sha}/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.jsonl") if "events" not in p])
    flagged = {}
    for p in glob.glob(f"{EV}/classify/parts/{scene}-p*.events.jsonl"):
        for l in open(p):
            r = json.loads(l); flagged[r["seed"]] = r["events"]
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if inst[s]["eventsDigest"] == base[s]["eventsDigest"])
    sites = Counter(e["site"] for evs in flagged.values() for e in evs)
    print(f"== {scene}: seeds base/fixed/inst {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; errors base/fixed: {sum(1 for r in base.values() if r['error'])}/{sum(1 for r in new.values() if r['error'])}; changed {len(changed)}; flagged {len(flagged)}")
    print("flagged calc events by site:", dict(sites))
    print("changed subset of flagged:", set(changed) <= set(flagged), "| unexplained (changed, not flagged):", sorted(set(changed) - set(flagged)), "| flagged but unchanged:", len(set(flagged) - set(changed)), sorted(set(flagged) - set(changed))[:40])
    cause = Counter(); cmds_b = cmds_n = 0
    for s in changed:
        bc, nc = base[s]["commands"], new[s]["commands"]; cmds_b += len(bc); cmds_n += len(nc)
        f = flagged.get(s, [None])[0]
        cause[f["site"] if f else None] += 1
    print(f"{scene} first-flag site per changed seed:", dict(cause), "| commands over changed seeds", cmds_b, "->", cmds_n)
    print(f"{scene} total commands base -> fixed:", sum(len(r["commands"]) for r in base.values()), "->", sum(len(r["commands"]) for r in new.values()))
    summary[scene] = changed
a, b = summary["on"], summary["off"]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)), "| both", len(set(a) & set(b)))
print("changed ON:", a)
