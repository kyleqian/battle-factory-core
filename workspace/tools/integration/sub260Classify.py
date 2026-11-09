"""sub260 (docs/sub260-ignore-substitute.md): classify the census delta of the HITMARKER_IGNORE_SUBSTITUTE fix.
Run from the sub260 evidence dir (.integration/validation/sv-20261108/sub260): `python3 <this file>`. Inputs: baseline arms (aud243a/full/<scene>-858ea0343),
the fixed arms (census/<scene>-9b4332163) and the leak logs of an UNFIXED instrumented tree (classify/parts/<scene>-*.jsonl, *.leaks.jsonl; sub260Instrument.py).
Checks per scene: instrumented digests == baseline, changed seeds == seeds with a leak event, first divergent command and the origin / consuming script per seed."""
import glob, json, sys
from collections import Counter
OWN = {"BattleScript_SubstituteAnim", "BattleScript_EffectSubstitute"}
END_TURN = {"BattleScript_ItemHealHP_Ret", "BattleScript_ItemHealHP_RemoveItem", "BattleScript_IngrainTurnHeal", "BattleScript_LeechSeedTurnDrain",
            "BattleScript_LeechSeedTurnPrintAndUpdateHp", "BattleScript_DoTurnDmg", "BattleScript_RainDishActivates", "BattleScript_WishComesTrue",
            "BattleScript_PerishSongTakesLife", "BattleScript_BerryConfuseHealEnd2", "BattleScript_DamagingWeatherLoop", "BattleScript_DamagingWeatherContinuesEnd"}
BASE = "../aud243a/full"
def load(paths):
    d = {}
    for p in paths:
        for l in open(p):
            if l.strip(): r = json.loads(l); d[r["seed"]] = r
    return d
summary = {}
for scene in ("on", "off"):
    base = load(glob.glob(f"{BASE}/{scene}-858ea0343/r[0-9].jsonl"))
    new = load(glob.glob(f"census/{scene}-9b4332163/r[0-9].jsonl"))
    inst = load([p for p in glob.glob(f"classify/parts/{scene}-*.jsonl") if "leaks" not in p])
    leaks = {}
    for p in glob.glob(f"classify/parts/{scene}-*.leaks.jsonl"):
        for l in open(p):
            r = json.loads(l); ev = [e for e in r["leaks"] if e["label"] not in OWN]
            if ev: leaks[r["seed"]] = ev
    changed = sorted(s for s in base if base[s]["eventsDigest"] != new[s]["eventsDigest"] or base[s]["error"] != new[s]["error"])
    instOk = sum(1 for s in base if inst[s]["eventsDigest"] == base[s]["eventsDigest"])
    print(f"== {scene}: seeds {len(base)}/{len(new)}/{len(inst)}; instrumented(unfixed) digest == baseline: {instOk}/{len(base)}; changed {len(changed)}; leak seeds {len(leaks)}")
    print("changed:", changed)
    print("changed == leak seeds:", changed == sorted(leaks), "| only-changed:", sorted(set(changed) - set(leaks)), "| only-leak:", sorted(set(leaks) - set(changed)))
    unexplained = []
    for s in changed:
        bc, nc = base[s]["commands"], new[s]["commands"]
        i = next((k for k in range(min(len(bc), len(nc))) if bc[k] != nc[k]), min(len(bc), len(nc)))
        f = leaks.get(s, [None])[0]
        ok = bool(f) and f["lastOrword"] in END_TURN and f["label"] not in OWN
        if not ok: unexplained.append(s)
        bt = bc[i][0] if i < len(bc) else None; nt = nc[i][0] if i < len(nc) else None
        print(f"  seed {s}: first divergent cmd #{i} base={bt}/b{bc[i][1] if i < len(bc) else None} new={nt}/b{nc[i][1] if i < len(nc) else None} "
              f"lastUsed={(bc[i][10] if i < len(bc) else '')!r:.40} | first leak: {f['label'] if f else None} move {f['move'] if f else None} on b{f['battler'] if f else None} "
              f"dmg {f['damage'] if f else None} (hp {f['hp'] if f else None}, sub {f['subHP'] if f else None}) after {f['lastOrword'] if f else None} | cmds {len(bc)}->{len(nc)}")
    print("unexplained:", unexplained)
    summary[scene] = (changed, Counter(leaks[s][0]["lastOrword"] for s in changed if s in leaks), Counter(leaks[s][0]["label"] for s in changed if s in leaks))
a, b = summary["on"][0], summary["off"][0]
print("ON == OFF changed seeds:", a == b, "| ON only", sorted(set(a) - set(b)), "| OFF only", sorted(set(b) - set(a)))
for sc in summary: print(sc, "origin orword scripts:", dict(summary[sc][1]), "| consuming scripts:", dict(summary[sc][2]))
