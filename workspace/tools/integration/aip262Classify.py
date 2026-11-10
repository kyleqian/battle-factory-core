"""aip262 (docs/aip262-usable-party-mons.md): classify the census delta of the live usablePartyMons fix.
Run from the workspace root: `python3 tools/integration/aip262Classify.py <fixed-short-sha>`. Inputs: baseline arms (.integration/validation/sv-20261109/abl261/census/<scene>-6dce29c5d),
fixed arms (.integration/evidence/aip262/census/<scene>-<sha>/r[0-9].jsonl) and the per-scene logs of the UNFIXED observation-only tree (.integration/evidence/aip262/classify/parts/<scene>-*.jsonl and
*.events.jsonl; aip262Instrument.py). Checks per scene: instrumented digests == baseline, changed seeds vs flagged seeds (flagged = at least one AI score where the true count would change a CBM branch),
the first divergent command and the first flagged site."""
import glob, json, sys
from collections import Counter
sha = sys.argv[1]
BASE = ".integration/validation/sv-20261109/abl261/census"; EV = ".integration/evidence/aip262"
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-6dce29c5d/r[0-9].jsonl"))
    new = load(glob.glob(f"{EV}/census/{scene}-{sha}/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"{EV}/classify/parts/{scene}-*.jsonl") if "events" not in p])
    flagged = {}
    for p in glob.glob(f"{EV}/classify/parts/{scene}-*.events.jsonl"):
        for l in open(p):
            r = json.loads(l); flagged[r["seed"]] = r["events"]
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if s in inst and inst[s]["eventsDigest"] == base[s]["eventsDigest"] and inst[s]["error"] == base[s]["error"])
    sites = Counter(e["site"] for evs in flagged.values() for e in evs)
    print(f"== {scene}: seeds base/fixed/inst {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; errors base/fixed: {sum(1 for r in base.values() if r['error'])}/{sum(1 for r in new.values() if r['error'])}; changed {len(changed)}; flagged {len(flagged)}")
    print("flagged events by site:", dict(sites))
    print("changed:", changed)
    unexpl = sorted(set(changed) - set(flagged)); flat = sorted(set(flagged) - set(changed))
    print("changed subset of flagged:", set(changed) <= set(flagged), "| unexplained (changed, not flagged):", unexpl, "| flagged but unchanged:", len(flat), flat[:60])
    cause = Counter()
    for s in changed:
        bc, nc = base[s]["commands"], new[s]["commands"]
        i = next((k for k in range(min(len(bc), len(nc))) if bc[k] != nc[k]), min(len(bc), len(nc)))
        f = flagged.get(s, [None])[0]
        cause[f["site"] if f else None] += 1
        print(f"  seed {s}: first divergent cmd #{i} base={bc[i][0] if i < len(bc) else None} new={nc[i][0] if i < len(nc) else None} | first flagged: {f['site'] if f else None} user/target {f['user'] if f else None}/{f['target'] if f else None} | cmds {len(bc)}->{len(nc)}")
    summary[scene] = changed
    print(f"{scene} commands base -> fixed: {sum(len(r['commands']) for r in base.values())} -> {sum(len(r['commands']) for r in new.values())}")
    print(f"{scene} first-flag causes:", dict(cause))
a, b = summary["on"], summary["off"]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)), "| both", len(set(a) & set(b)))
