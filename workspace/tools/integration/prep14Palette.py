#!/usr/bin/env python3
"""prep14: palette-bank facts per move from prep14Probe.py outputs (activation + ages 1,2,3,5,8,12 of each body): which OBJ/BG banks are loaded by the body
(banks that change vs activation), whether bank index AND content are equal across the accepted player/opponent scenarios and the alternate species, and which
banks differ between scenarios at activation (species art / HP bar / text).   usage: prep14Palette.py PROBE_DIR OUT_JSON"""
import json, sys
from pathlib import Path
D, OUT = Path(sys.argv[1]), Path(sys.argv[2])
LABEL = {"rain-dance": 240, "overheat": 315, "curse-ghost": 174, "curse-stat": 174, "silver-wind": 318, "water-pulse": 352, "psych-up": 244, "hail": 258}
SC = {k: [f"mechanic-{k}-player-", f"mechanic-{k}-opponent-", f"prep14-{k}-alt-"] for k in LABEL}
def body(d, mv, pref):
    f = next(f for f in D.glob("*.json") if f.name.startswith(pref))
    j = json.loads(f.read_text()); bs = [b for b in j["bodies"] if b["move"] == mv]
    return f.stem, bs[0] if pref != "mechanic-curse-stat-player-" else bs[0]
res = {}
for k, mv in LABEL.items():
    rows = {}
    for pref, tag in zip(SC[k], ("player", "opponent", "alt")):
        name, b = body(D, mv, pref)
        act = b["atActivation"]["objUnfaded"]; actf = b["atActivation"]["objFaded"]
        loaded = {}
        for age, st in b["atAges"].items():
            ch = [i for i in range(16) if st["objUnfaded"][i] != act[i]]
            loaded[age] = {"changedUnfadedBanks": ch, "changedFadedBanks": [i for i in range(16) if st["objFaded"][i] != actf[i]], "bgChanged": [i for i in range(8) if st["bgUnfaded"][i] != b["atActivation"]["bgUnfaded"][i]]}
        rows[tag] = {"scenario": name, "act": b["start"], "loaded": loaded, "atAges": b["atAges"], "objAct": act, "bgAct": b["atActivation"]["bgUnfaded"], "faded": actf}
    ent = {}
    # banks that differ at activation across scenarios
    diff = [i for i in range(16) if len({rows[t]["objAct"][i] for t in rows}) > 1]
    bgdiff = [i for i in range(8) if len({rows[t]["bgAct"][i] for t in rows}) > 1]
    ent["objBanksDifferingAtActivation(across player/opponent/alt)"] = diff; ent["bgBanksDifferingAtActivation"] = bgdiff
    # loaded bank content equal across scenarios, by age
    ages = sorted({a for t in rows for a in rows[t]["loaded"]}, key=int)
    ent["loadedBanksByAge"] = {a: {t: rows[t]["loaded"][a]["changedUnfadedBanks"] for t in rows} for a in ages}
    # first-seen content of each loaded bank (age 12 state) equal across scenarios?
    chg = sorted({i for t in rows for i in rows[t]["loaded"][ages[-1]]["changedUnfadedBanks"]})
    ent["loadedBankContentEqualAcrossScenarios@age12"] = {str(i): len({rows[t]["atAges"][ages[-1]]["objUnfaded"][i] for t in rows}) == 1 for i in chg}
    ent["bgChangedByAge12"] = sorted({i for t in rows for i in rows[t]["loaded"][ages[-1]]["bgChanged"]})
    res[k] = ent
    print(k, "objDiffAtAct", diff, "bgDiff", bgdiff, "loaded@12", {t: rows[t]["loaded"][ages[-1]]["changedUnfadedBanks"] for t in rows}, "content==", ent["loadedBankContentEqualAcrossScenarios@age12"])
OUT.write_text(json.dumps(res, indent=1))
