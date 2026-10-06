#!/usr/bin/env python3
"""prep14: Random2 draw plans for Rain Dance / Overheat / Curse / Silver Wind / Water Pulse / Psych Up / Hail from the prep14 direct-mGBA probes.
Reuses prep12Plans.Probe (activation A, draws with ageOffset = D - A, lag frames).  For every accepted scenario (player + opponent) the plan ALONE
(activation gRng2 + per-age step counts: one RfuMain1 step per non-lag frame, then the body's draws in source order) is replayed and compared with
(1) the accepted dense corpus' per-row `animationRng` (every row of the window) and (2) the corpus-observed consumers (Rain Dance drop x,y; Water Pulse
ring-bubble data[1]/data[2]).  Alternates: plan shape equal + replay == words observed at the probe's draw frames + consumers from the probe spawn log.
usage: prep14Plans.py PROBE_DIR(random2 probes) ANALYSIS_DIR(prep13Probe outputs) OUT_JSON            (no emulator)"""
import gzip, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
PD, AD, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
def lcg(x):
    return (x * 1103515245 + 24691) & 0xFFFFFFFF


def lcgn(x, n):
    for _ in range(n):
        x = lcg(x)
    return x


exec("class Probe" + open(ROOT / "tools/integration/prep12Plans.py").read().split("class Probe")[1].split("SITE_INFO = {")[0])  # Probe, replay, compress (prep12)
EV = ROOT / "tools/compare/evidence"
MOVES = {  # key: (move label in probe, corpus name, scenario stem fmt, alternate)
    "rain-dance": ("Move_RAIN_DANCE", "rain-dance", "mechanic-rain-dance-{s}-wooper-{o}-onix", "prep14-rain-dance-alt-poliwrath-golem"),
    "overheat": ("Move_OVERHEAT", "overheat", "mechanic-overheat-{s}-{a}-{o}-{t}", "prep14-overheat-alt-charizard-golem"),
    "curse-ghost": ("Move_CURSE", "curse-ghost", "", "prep14-curse-ghost-alt-gengar-golem"),
    "curse-stat": ("Move_CURSE", "curse-stats", "", "prep14-curse-stat-alt-miltank-golem"),
    "silver-wind": ("Move_SILVER_WIND", "silver-wind", "", "prep14-silver-wind-alt-beautifly-golem"),
    "water-pulse": ("Move_WATER_PULSE", "water-pulse", "", "prep14-water-pulse-alt-blastoise-golem"),
    "psych-up": ("Move_PSYCH_UP", "psych-up", "", "prep14-psych-up-alt-skiploom-golem"),
    "hail": ("Move_HAIL", "hail", "", "prep14-hail-alt-glalie-golem"),
}
SCEN = {  # (player-attacker scenario, opponent-attacker scenario)
    "rain-dance": ("mechanic-rain-dance-player-wooper-opponent-onix", "mechanic-rain-dance-opponent-wooper-player-onix"),
    "overheat": ("mechanic-overheat-player-solrock-opponent-shuckle", "mechanic-overheat-opponent-magcargo-player-shuckle"),
    "curse-ghost": ("mechanic-curse-ghost-player-haunter-opponent-magikarp", "mechanic-curse-ghost-opponent-haunter-player-magikarp"),
    "curse-stat": ("mechanic-curse-stat-player-snorlax-opponent-magikarp", "mechanic-curse-stat-opponent-snorlax-player-magikarp"),
    "silver-wind": ("mechanic-silver-wind-player-butterfree-opponent-onix", "mechanic-silver-wind-opponent-butterfree-player-onix"),
    "water-pulse": ("mechanic-water-pulse-player-lombre-opponent-onix", "mechanic-water-pulse-opponent-lombre-player-onix"),
    "psych-up": ("mechanic-psych-up-player-jumpluff-opponent-ninjask", "mechanic-psych-up-opponent-jumpluff-player-ninjask"),
    "hail": ("mechanic-hail-player-delibird-opponent-onix", "mechanic-hail-opponent-delibird-player-onix"),
}
SITES = {
    "AnimTask_CreateRaindrops+0x42": ("% DISPLAY_WIDTH (240)  [battle_anim_water.c:495]", "drop[i].x"),
    "AnimTask_CreateRaindrops+0x56": ("% (DISPLAY_HEIGHT/2) (80)  [battle_anim_water.c:496]", "drop[i].y"),
    "CreateWaterPulseRingBubbles+0x3a": ("yDiff + (w % 10) - 5  [battle_anim_water.c:1574]", "ring bubble data[1] (randomSomethingY)"),
    "CreateWaterPulseRingBubbles+0x52": ("-xDiff + (w % 10) - 5; data[2] = -|.| first bubble / +- second  [battle_anim_water.c:1575,1583-1608]", "ring bubble data[2] (randomSomethingX)"),
}


def series_from_plan(v_a, rows, groups, lag_ages):
    """gRng2 after each age 0..rows-1 from the plan alone (no probe data)"""
    cnt = {g["ageOffset"]: g["count"] for g in groups}
    out, v = [v_a], v_a
    for age in range(1, rows):
        v = lcgn(v, (0 if age in lag_ages else 1) + cnt.get(age, 0))
        out.append(v)
    return out


def lag_ages_of(p, a, end):
    return [f - a for f in range(a + 1, end + 1) if p.steps[f] == 0]


def corpus(name, side):
    c = json.load(gzip.open(EV / f"{name}-{side}-dense-state.json.gz"))
    return c["sourceWindow"]["startFrame"], c["frames"]


def entry(key, side, scen, label, cname, an):
    p = Probe(PD / f"{scen}-r1.json")
    p2 = json.loads((PD / f"{scen}-r2.json").read_text())
    cands = p.bodies(label)
    cs, cf = (corpus(cname, side) if cname else (None, None))
    a, end = next(((x, y) for x, y in cands if x == cs), cands[0]) if cs else cands[0]
    groups = p.plan(a, end)
    v_a = p.val[a]
    lag = lag_ages_of(p, a, end)
    words = replay(v_a, groups)
    observed = []
    for g in groups:
        f = a + g["ageOffset"]; v, ws = p.val[f - 1], []
        for cl in p.draws[f]["callers"]:
            v = lcg(v)
            if not cl.startswith("RfuMain1"): ws.append(v >> 16)
        observed.append(ws)
    e = {"scenario": scen, "bodyLabel": label, "bodyIndex": [x for x, _ in cands].index(a), "bodyStarts": [x for x, _ in cands], "activationFrame": a, "lastActiveFrame": end,
         "activationValue": v_a, "activationValueHex": f"0x{v_a:08X}", "drawFrames": len(groups), "drawsTotal": sum(g["count"] for g in groups),
         "lagAges": lag, "lagFramesBeforeLastDraw": groups[-1]["lagBefore"] if groups else 0, "replayEqualsObservedWords": words == observed,
         "determinism": {"runsSha1": p.d["runsSha1"], "runsSha1Run2": p2["runsSha1"], "allFieldsEqualExceptFinalStateSha1": {k for k in p.d if p.d[k] != p2[k]} <= {"finalStateSha1"}}}
    assert e["determinism"]["allFieldsEqualExceptFinalStateSha1"], scen
    e["draws"] = [{"ageOffset": g["ageOffset"], "count": g["count"], "lagBefore": g["lagBefore"], "transform": [SITES[x][0] for x in g["sites"]], "consumerField": [SITES[x][1] for x in g["sites"]]} for g in groups]
    e["drawsCompressed"] = [{k: v for k, v in c.items() if k != "sites"} for c in compress(groups)]
    e["activationOffsets"] = [g["ageOffset"] for g in groups]
    if cf is not None:
        rows = len(cf)
        ser = series_from_plan(v_a, rows, groups, set(lag))
        crng = [f["animationRng"] for f in cf]
        e["acceptedWindow"] = {"startFrame": cs, "rows": rows, "activationMinusStart": a - cs, "corpus": f"tools/compare/evidence/{cname}-{side}-dense-state.json.gz",
                               "rowsCheckedAnimationRng": rows, "planSeriesEqualsCorpusAnimationRng": ser == crng,
                               "firstMismatchAge": next((i for i, (x, y) in enumerate(zip(ser, crng)) if x != y), None)}
        if key == "rain-dance":
            births = {}
            for i, f in enumerate(cf):
                for s in f["sprites"]:
                    if s["template"] and s["template"]["symbol"] == "gRainDropSpriteTemplate" and (s["slot"], i - 0) not in births and not any(k[0] == s["slot"] and k[1] < i and i - k[1] <= 20 and False for k in births):
                        pass
            # first row each drop sprite is seen = its birth age (x,y fixed); a slot can be reborn, so track presence transitions
            prev, births = set(), []
            for i, f in enumerate(cf):
                cur = {s["slot"]: s for s in f["sprites"] if s["template"] and s["template"]["symbol"] == "gRainDropSpriteTemplate"}
                for slot in sorted(set(cur) - prev): births.append((i, slot, cur[slot]["x"], cur[slot]["y"]))
                prev = set(cur)
            pred = [(g["ageOffset"], w[0 + 2 * k] % 240, w[1 + 2 * k] % 80) for g, w in zip(groups, words) for k in range(2)]
            obs = [(b[0], b[2], b[3]) for b in births]
            e["consumers"] = {"kind": "rain drop birth (age, x, y)", "n": len(obs), "predicted==observed": pred == obs, "first": obs[:3]}
        if key == "water-pulse":
            rings = {}
            for f in cf:
                for s in f["sprites"]:
                    if s["template"] and s["template"]["symbol"] == "gWaterPulseRingSpriteTemplate": rings[s["slot"]] = (s["x"], s["y"], s["data"][1], s["data"][2])
            geo = sorted(set(rings.values()))
            bub, prev = [], set()
            for i, f in enumerate(cf):
                cur = {s["slot"]: s for s in f["sprites"] if s["template"] and s["template"]["symbol"] == "gWaterPulseRingBubbleSpriteTemplate"}
                for slot in sorted(set(cur) - prev): bub.append((i, slot, cur[slot]["data"]))
                prev = set(cur)
            (rx, ry, tx, ty), = geo
            xd, yd = tx - rx, ty - ry
            ok, rows_ = True, []
            for k, (g, w) in enumerate(zip(groups, words)):
                ry_ = yd + (w[0] % 10) - 5; rx_ = -xd + (w[1] % 10) - 5
                first, second = bub[2 * k], bub[2 * k + 1]
                exp = (ry_, -rx_ if rx_ < 0 else rx_, ry_, rx_ if rx_ > 0 else -rx_ if False else (-rx_ if rx_ > 0 else rx_))
                got = (first[2][1], first[2][2], second[2][1], second[2][2])
                rows_.append({"age": g["ageOffset"], "words": w, "randomY": ry_, "randomX": rx_, "observedData1,2,1,2": list(got), "first.data2": first[2][2], "second.data2": second[2][2]})
                f_ok = got[0] == ry_ and got[2] == ry_ and got[1] == (-rx_ if rx_ < 0 else rx_) and got[3] == (-rx_ if rx_ > 0 else rx_)
                ok &= f_ok
            e["consumers"] = {"kind": "ring bubble data[1]/data[2] (xDiff,yDiff from the ring sprite: target-attacker)", "ringGeometry(x,y,targetX,targetY)": list(geo[0]), "xDiff": xd, "yDiff": yd, "n": len(bub), "predicted==observed": ok, "rows": rows_}
    return e


def alt_entry(key, an, label, acc_player):
    p = Probe(PD / f"{an}-r1.json"); p2 = json.loads((PD / f"{an}-r2.json").read_text())
    a, end = p.bodies(label)[0]
    groups = p.plan(a, end); v_a = p.val[a]; words = replay(v_a, groups)
    obs = []
    for g in groups:
        f = a + g["ageOffset"]; v, ws = p.val[f - 1], []
        for cl in p.draws[f]["callers"]:
            v = lcg(v)
            if not cl.startswith("RfuMain1"): ws.append(v >> 16)
        obs.append(ws)
    lag = lag_ages_of(p, a, end)
    e = {"scenario": an, "activationFrame": a, "activationValue": v_a, "activationValueHex": f"0x{v_a:08X}", "drawFrames": len(groups), "drawsTotal": sum(g["count"] for g in groups),
         "lagAges": lag, "planShapeIdenticalToAccepted": ([g["ageOffset"] for g in groups], lag, [g["count"] for g in groups]) == ([g["ageOffset"] for g in acc_player[0]], acc_player[1], [g["count"] for g in acc_player[0]]),
         "replayEqualsObservedWords": words == obs, "determinism": {"runsSha1": p.d["runsSha1"], "runsSha1Run2": p2["runsSha1"], "allFieldsEqualExceptFinalStateSha1": {k for k in p.d if p.d[k] != p2[k]} <= {"finalStateSha1"}}}
    ana = json.loads((AD / f"{an}.json").read_text())
    body = next(r for r in ana if False) if False else None
    if key in ("rain-dance", "water-pulse"):
        sprites = next(b_ for b_ in json.loads((ROOT / "tools/integration/fixtures/prep14/prep14-analysis.json").read_text())[an] if b_["act"] == a)["sprites"]
        if key == "rain-dance":
            obs_b = [(x["age"], x["x"], x["y"]) for x in sprites if x["tmpl"] == "gRainDropSpriteTemplate"]
            pred = [(g["ageOffset"], w[2 * k] % 240, w[2 * k + 1] % 80) for g, w in zip(groups, words) for k in range(2)]
            e["consumers"] = {"kind": "rain drop birth (age, x, y)", "n": len(obs_b), "predicted==observed": pred == obs_b, "first": obs_b[:3]}
        else:
            rg = sorted({(x["x"], x["y"], x["data"][1], x["data"][2]) for x in sprites if x["tmpl"] == "gWaterPulseRingSpriteTemplate"})
            (rx, ry, tx, ty), = rg
            xd, yd = tx - rx, ty - ry
            bub = [x for x in sprites if x["tmpl"] == "gWaterPulseRingBubbleSpriteTemplate"]
            ok = len(bub) >= 12
            for k, w in enumerate(words):
                ry_ = yd + (w[0] % 10) - 5; rx_ = -xd + (w[1] % 10) - 5
                f_, s_ = bub[2 * k]["data"], bub[2 * k + 1]["data"]
                ok &= f_[1] == ry_ and s_[1] == ry_ and f_[2] == (-rx_ if rx_ < 0 else rx_) and s_[2] == (-rx_ if rx_ > 0 else rx_)
            e["consumers"] = {"kind": "ring bubble data[1]/data[2]", "ringGeometry(x,y,targetX,targetY)": list(rg[0]), "xDiff": xd, "yDiff": yd, "n": len(bub), "predicted==observed": bool(ok)}
    return e


results = {"schema": "prep14-random2-plans/v1", "generatedBy": "tools/integration/prep14Plans.py",
           "convention": "activationValue = gRng2 after the first anim-active frame A (== accepted dense window row 0 animationRng); ageOffset = D - A for draw frame D; each age >= 1 takes one RfuMain1 step unless it is a lag age (0 steps), then `count` Random2 draws in source order; word = state >> 16; words = replay(activationValue, plan) with no probe data other than the plan itself. Per-row check: the plan-only gRng2 series equals the corpus animationRng on every window row.",
           "moves": {}}
for key, (label, cname, _, an) in MOVES.items():
    ent = {}
    for side, scen in zip(("player", "opponent"), SCEN[key]):
        ent[side] = entry(key, side, scen, label, cname, an)
    acc = ent["player"]
    g0 = Probe(PD / f"{SCEN[key][0]}-r1.json")
    a, end = ent["player"]["activationFrame"], ent["player"]["lastActiveFrame"]
    ent["alternate"] = alt_entry(key, an, label, (g0.plan(a, end), ent["player"]["lagAges"]))
    ent["drawsPerBody"] = acc["drawsTotal"]
    results["moves"][key] = ent
    if key in ("rain-dance", "water-pulse"): print("   alt consumers", ent["alternate"]["consumers"]["predicted==observed"], ent["alternate"]["consumers"]["n"])
    print(key, {s: (ent[s]["activationFrame"], ent[s]["drawFrames"], ent[s]["drawsTotal"], ent[s]["acceptedWindow"]["activationMinusStart"], ent[s]["acceptedWindow"]["planSeriesEqualsCorpusAnimationRng"], ent[s].get("consumers", {}).get("predicted==observed")) for s in ("player", "opponent")},
          "alt", ent["alternate"]["activationFrame"], ent["alternate"]["planShapeIdenticalToAccepted"], ent["alternate"]["replayEqualsObservedWords"], "lag", acc["lagAges"][:6], len(acc["lagAges"]))
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(results, indent=1))
