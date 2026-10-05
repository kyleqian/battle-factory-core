#!/usr/bin/env python3
"""Uncovered sprite-order units (S10A): raw probe rows -> windowed allocator streams, allocation-relative plans, shape verdicts.

usage: spriteOrderUncoveredExtract.py [--raw NAME=PATH ...] [--write]
Reads the committed real-route raw rows (tools/integration/fixtures/sprite-order-real-route/raw/*.json) plus any extra raw files given as
NAME=PATH (spriteOrderRealRouteProbe.py output, e.g. fresh probes of other battle1-* traces).  For every allocator cluster no covered rule
explains (reuses spriteOrderRealRouteReplay.build) it extracts the exact windowed stream (frame, creates with caller symbol + lowest-free/end mode,
destroys with caller symbol in observed SortSprites order), builds the plan in the production token format
(docs/sprite-order-body-plans.md section 2: C=[["n",k,"f"|"e"]...], D=[["n",k]|["o",slot]...]) and classifies the unit class.
Writes tools/integration/fixtures/sprite-order-uncovered/units.json (+ events/<name>.json used by spriteOrderUncoveredReplay.ts).
"""
from __future__ import annotations
import collections, importlib.util, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures/sprite-order-uncovered"
spec = importlib.util.spec_from_file_location("rr", ROOT / "tools/integration/spriteOrderRealRouteReplay.py")
rr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rr)

RAWS = {t: ROOT / "tools/integration/fixtures/sprite-order-real-route/raw" / f"{t}-0.json" for t in rr.TRACES}
args = sys.argv[1:]
for i, a in enumerate(args):
    if a == "--raw":
        k, v = args[i + 1].split("=", 1)
        RAWS[k] = Path(v)
WRITE = "--write" in args


def label(c):
    cr, de, main, ctrl = set(c["creators"]), set(c["destroyers"]), c["main"], c["ctrl"]
    side = lambda: "opponent" if any(("SwitchIn" in x or "Hide" in x or "Intro" in x) for x in ctrl[1:2]) else "player"
    if "SpriteCB_AnimFaintOpponent" in de: return "faint-opponent"
    if "FreeMonSpriteAfterFaintAnim" in de: return "faint-player"
    if main == "BeginBattleIntro": return "E1-entry-battlers"
    if main == "BattleIntroPrintTrainerWantsToBattle": return "E2-entry-summary"
    if main == "BattleIntroRecordMonsToDex": return "E3-entry-opp-sendout"
    if main == "TryDoEventsBeforeFirstTurn" and "PokeBallOpenParticleAnimation" in cr: return "E4-entry-player-sendout"
    if main == "TryDoEventsBeforeFirstTurn": return "E5-entry-shiny"
    if cr == {"CreatePartyStatusSummarySprites", "CreateSprite", "CreateSpriteAtEnd"}: return "U2-next-mon-summary"
    if "Task_HidePartyStatusSummary_DuringBattle" in de: return "U3-next-mon-sendout"
    if "CreateMonIconSprite" in cr: return "U5-party-menu"
    if "CreateBattlerHealthboxSprites" in cr: return "U6-battle-reshow"
    if "StartSendOutAnim" in cr and not de: return "U4a-switchin-ball-start"
    if "PokeBallOpenParticleAnimation" in cr and "Task_HidePartyStatusSummary_DuringBattle" not in de: return "U4b-switchin-ball-particles"
    if "OpponentHandleTrainerSlide" in cr: return "U7-end-trainer-slide"
    return "other:" + c["main"]


def windows_of(raw, R, a, b):
    calls = [c for c in raw["calls"] if a <= c["n"] <= b and c["k"] in ("CreateSpriteAt", "DestroySprite") and c["slot"] is not None]
    by = collections.defaultdict(list)
    for c in calls:
        by[c["n"]].append(c)
    out = []
    rowsn = set(R.ns)
    for n in sorted(by):
        fafter = R.free(n + 1)
        seen = (n + 1) in rowsn
        segs = []  # consecutive same-kind calls = one window; D-then-C inside one frame (slot reuse) stays in call order
        for c in by[n]:
            kind = "C" if c["k"] == "CreateSpriteAt" else "D"
            if not segs or segs[-1][0] != kind:
                segs.append((kind, []))
            segs[-1][1].append(c)
        for kind, cs in segs:
            if kind == "C":
                out.append({"n": n, "creates": [{"slot": c["slot"], "mode": "e" if c["caller"].startswith("CreateSpriteAtEnd") else "f", "by": rr.strip((c["chain"] or [c["caller"]])[0])} for c in cs],
                            "destroyBy": {}, "destroys": [], "sortRowSeen": seen})
            else:
                dslots = [c["slot"] for c in cs]
                ordered = [s for s in fafter if s in dslots] if seen else []
                ordered += [s for s in dslots if s not in ordered]
                out.append({"n": n, "creates": [], "destroyBy": {str(c["slot"]): rr.strip(c["caller"]) for c in cs}, "destroys": ordered, "sortRowSeen": seen})
    return out


def plan_of(wins):
    made = []
    plan = []
    for w in wins:
        win = {}
        if w["creates"]:
            win["C"] = []
            for c in w["creates"]:
                win["C"].append(["n", len(made), c["mode"]])
                made.append(c["slot"])
        if w["destroys"]:
            win["D"] = [["n", made.index(s)] if s in made else ["o", s] for s in w["destroys"]]
        plan.append(win)
    return plan, made


def shape(plan):  # external slots abstracted: constant shape = same windows / counts / n-token structure
    return json.dumps([{k: [[t[0], t[1], *t[2:]] if t[0] == "n" else ["o"] for t in v] for k, v in w.items()} for w in plan], separators=(",", ":"))


def main():
    units = []
    for name, path in RAWS.items():
        raw = json.loads(path.read_text())
        R = rr.Rows(raw["rows"])
        # build() reads FX/raw/<trace>-0.json; for extra raws temporarily monkey-patch the reader
        orig = Path.read_text
        _, events, clusters, initial = build_any(name, path, raw)
        for c in clusters:
            wins = windows_of(raw, R, c["first"], c["last"])
            plan, made = plan_of(wins)
            mb, ma = R.mask(c["first"] - 1), R.mask(c["last"] + 3)
            surv = [s for s in made if (ma >> s) & 1]
            units.append({"trace": name, "first": c["first"], "last": c["last"], "class": label(c), "main": c["main"], "ctrl": c["ctrl"], "windows": wins, "plan": plan,
                          "survivors": surv, "occBefore": c["occupiedBefore"], "occAfter": c["occupiedAfter"],
                          "FbeforeHead": R.free(c["first"] - 1)[:16], "FafterHead": R.free(c["last"] + 3)[:24], "shape": shape(plan)})
    return units


def build_any(name, path, raw):
    # rr.build(trace) reads the committed raw path; emulate for external raws by pointing FX at a temp tree
    import tempfile, shutil
    if path == rr.FX / "raw" / f"{name}-0.json":
        return rr.build(name)
    tmp = Path(tempfile.mkdtemp())
    (tmp / "raw").mkdir()
    shutil.copy(path, tmp / "raw" / f"{name}-0.json")
    saved = rr.FX
    rr.FX = tmp
    try:
        return rr.build(name)
    finally:
        rr.FX = saved


if __name__ == "__main__":
    units = main()
    by = collections.defaultdict(list)
    for u in units:
        by[u["class"]].append(u)
    summary = {}
    for k, us in sorted(by.items()):
        shapes = collections.Counter(u["shape"] for u in us)
        absplans = collections.Counter(json.dumps(u["plan"]) for u in us)
        summary[k] = {"instances": len(us), "distinctShapes": len(shapes), "distinctAbsolutePlans": len(absplans),
                      "windows": [len(u["plan"]) for u in us][:3], "occ": sorted({f"{u['occBefore']}->{u['occAfter']}" for u in us})}
        print(k, summary[k])
    if WRITE:
        FX.mkdir(parents=True, exist_ok=True)
        (FX / "units.json").write_text(json.dumps({"schema": "sprite-order-uncovered-units/v1", "summary": summary, "units": units}, separators=(",", ":")) + "\n")
