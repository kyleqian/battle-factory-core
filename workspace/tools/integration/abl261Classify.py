"""abl261 (docs/abl261-ability-damage.md): classify the census delta of the full ability id->name resolver fix.
Run from the workspace root: `python3 tools/integration/abl261Classify.py <fixed-short-sha>`. Inputs: baseline arms (.integration/validation/sv-20261108/sub260/census/<scene>-9b4332163),
fixed arms (.integration/evidence/abl261/census/<scene>-<sha>/r[0-9].jsonl) and the event logs of the UNFIXED observation-only tree (.integration/evidence/abl261/classify/parts/<scene>-*.events.jsonl;
abl261Instrument.py). Checks per scene: instrumented digests == baseline, changed seeds vs flagged seeds (flagged = at least one calc where the full map / hp-aware weather rule differs),
the first divergent command, and the first flagged calc's site + ability pair."""
import glob, json, sys
from collections import Counter
sha = sys.argv[1]
BASE = ".integration/validation/sv-20261108/sub260/census"; EV = ".integration/evidence/abl261"
ABILITY = {13: "CLOUD_NINE", 55: "HUSTLE", 62: "GUTS", 37: "HUGE_POWER", 74: "PURE_POWER", 47: "THICK_FAT", 57: "PLUS", 58: "MINUS", 63: "MARVEL_SCALE", 65: "OVERGROW", 66: "BLAZE", 67: "TORRENT", 68: "SWARM", 77: "AIR_LOCK"}
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-9b4332163/r[0-9].jsonl"))
    new = load(glob.glob(f"{EV}/census/{scene}-{sha}/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"{EV}/classify/parts/{scene}-*.jsonl") if "events" not in p])
    flagged = {}
    for p in glob.glob(f"{EV}/classify/parts/{scene}-*.events.jsonl"):
        for l in open(p):
            r = json.loads(l); flagged[r["seed"]] = r["events"]
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if inst[s]["eventsDigest"] == base[s]["eventsDigest"])
    sites = Counter(e["site"] for evs in flagged.values() for e in evs)
    print(f"== {scene}: seeds base/fixed/inst {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; errors fixed arm: {sum(1 for r in new.values() if r['error'])}; changed {len(changed)}; flagged {len(flagged)}")
    print("flagged calc sites:", dict(sites))
    print("changed:", changed)
    print("changed subset of flagged:", set(changed) <= set(flagged), "| unexplained (changed, not flagged):", sorted(set(changed) - set(flagged)), "| flagged but unchanged:", len(set(flagged) - set(changed)), sorted(set(flagged) - set(changed))[:40])
    def abil(ev):
        return sorted({str(ABILITY.get(a[0], a[0])) for a in ev.get("abilities", [])} - {"0"}) if "abilities" in ev else [ABILITY.get(ev.get("ability"), ev.get("ability"))]
    cause = Counter()
    for s in changed:
        bc, nc = base[s]["commands"], new[s]["commands"]
        i = next((k for k in range(min(len(bc), len(nc))) if bc[k] != nc[k]), min(len(bc), len(nc)))
        f = flagged.get(s, [None])[0]
        cause[(f["site"], tuple(x for x in abil(f) if x in ABILITY.values())) if f else None] += 1
        print(f"  seed {s}: first divergent cmd #{i} base={bc[i][0] if i < len(bc) else None} new={nc[i][0] if i < len(nc) else None} | first flagged: {f['site'] if f else None} old->full {f.get('old') if f else None}->{f.get('full') if f else None} abilities {abil(f) if f else None} | cmds {len(bc)}->{len(nc)}")
    summary[scene] = changed
    print(f"{scene} first-flag causes:", dict(cause))
a, b = summary["on"], summary["off"]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)), "| both", len(set(a) & set(b)))
