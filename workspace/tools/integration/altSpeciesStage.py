#!/usr/bin/env python3
"""Stage alternate-species scenarios and probe their source windows.

usage: altSpeciesStage.py scenario <case-json> | probe <case-name> | write <case-name>
Cases live in tools/integration/altSpeciesCases.json (species swaps of accepted scenarios).
"""
from __future__ import annotations
import json, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "tools/integration/altSpeciesCases.json").read_text())
SPECIES = {r["name"]: r["id"] for r in json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]}
RATIO = {r["name"]: r["genderRatio"] for r in json.loads((ROOT / "src/data/gen/species-stats.json").read_text())["species"]}
VENDOR = (ROOT / "reference/pokeemerald").resolve().parent
START_PROBES = {"synthesisProbe.py", "milkDrinkProbe.py", "acidProbe.py", "waterGunProbe.py"}
MOVE_PROBES = {"poisonFangProbe.py", "crunchProbe.py", "crushClawProbe.py", "takeDownProbe.py"}

def case(name): return next(c for c in CASES["cases"] if c["name"] == name)

def stage(c):
    base = json.loads((ROOT / c["baseSource"]).read_text())
    scen = json.loads((ROOT / c.get("baseScenario", base["scenario"])).read_text())
    for side, sp in c["swap"].items():
        mon = scen["overrides"]["parties"][side][0]
        mon["species"] = SPECIES["SPECIES_" + sp]
        if RATIO["SPECIES_" + sp] == 255: mon["gender"] = "genderless"
    extra = c.get("extraFrames", 300)  # a faster opponent moves first; keep the trace long enough
    if extra:
        scen["trace"]["segments"][-1]["frames"] += extra
        scen["trace"]["captureFrames"][-1] += extra
    pre = c.get("preDelay", 0)  # species cries/intro length can move the first prompt
    if pre:
        scen["trace"]["segments"].insert(0, {"frames": pre, "buttons": []})
        scen["trace"]["captureFrames"][-1] += pre
    path = ROOT / "tools/integration/fixtures/altspecies-scenarios" / f"{c['name']}.json"
    path.write_text(json.dumps(scen, indent=1) + "\n")
    return base, path

def run_probe(c, path, start=None):
    base = json.loads((ROOT / c["baseSource"]).read_text())
    out = Path(tempfile.mkdtemp(prefix="altspecies-")); res = out / "probe.json"
    args = [str(VENDOR / "mgba-venv/bin/python"), str(ROOT / base["probe"]), str(path), str(res), str(out / "rgb")]
    pn = Path(base["probe"]).name
    mid = c.get("probeMoveId", base.get("probeMoveId"))
    if mid is not None and pn not in START_PROBES: args.append(str(mid))
    if pn in START_PROBES: args.append(str(start or 0))
    run_probe.last_dir = out
    subprocess.run(["python3", str(ROOT / "tools/run-mgba-probe.py"), str(res), "--", *args], check=True, cwd=ROOT)
    return json.loads(res.read_text())

NAMES = {v: k[8:] for k, v in SPECIES.items()}

FLAGS = ("gAnimScriptActive", "animScriptActive", "inMoveScript")

def window_of(rows, probe, n):
    """Source-owned window start/end, or None when the probe records no script flag."""
    w = probe.get("sourceWindow") or probe.get("denseWindow")
    if w: return w["startFrame"], w["endFrame"]
    flag = next((f for f in FLAGS if f in rows[0]), None)
    if flag is None: return None
    a = next(i for i, r in enumerate(rows) if r[flag])
    return rows[a]["frame"], rows[a + n - 1]["frame"]

def write(c, forced_start=None):
    base, path = stage(c)
    probe_name = Path(base["probe"]).name
    bw = base.get("denseWindow") or base.get("sourceWindow")
    n = bw["endFrame"] - bw["startFrame"] + 1
    probe = run_probe(c, path, forced_start or 0)
    rows = probe.get("frames") or probe.get("rows")
    win = window_of(rows, probe, n)
    if win is None:  # start-frame probes: the caller supplies the start found by altSpeciesFindStart.ts
        if forced_start is None:
            print("NEEDSTART", c["name"], run_probe.last_dir, n); return
        if forced_start == 0: forced_start = rows[0]["frame"]  # provisional, for the start finder
        win = (forced_start, forced_start + n - 1)
    sw, ew = win
    scen = json.loads(path.read_text())
    attacker_side = "player" if "-player-" in c["name"] and c["name"].index("-player-") < c["name"].index("-opponent-") else "opponent"
    other = "opponent" if attacker_side == "player" else "player"
    mons = {s: scen["overrides"]["parties"][s][0] for s in ("player", "opponent")}
    # health/gender profile comes from the ROM battlers at the first window row
    first = next(r for r in rows if r["frame"] == sw)
    def battlers(row):
        for cand in (row.get("battlerState"), row.get("battlers"), {"player": row.get("player"), "opponent": row.get("opponent")}):
            if isinstance(cand, dict) and isinstance(cand.get("player"), dict) and "hp" in cand["player"]:
                return cand
    bt = battlers(first)
    def maxhp(side):
        for r in rows:
            b = battlers(r)
            if b and (b[side].get("maxHp") or b[side].get("maxHP")): return b[side].get("maxHp") or b[side].get("maxHP")
        raise KeyError("no maxHp in probe rows for " + side)
    def prof(side, key):
        m = mons[side]
        g = "none" if m.get("gender") == "genderless" else m.get("gender", "male")
        return {f"{key}Hp": bt[side]["hp"], f"{key}MaxHp": maxhp(side), f"{key}Gender": g}
    fp = {**prof("player", "player"), **prof("opponent", "opponent")}
    key = "denseWindow" if "denseWindow" in base else "sourceWindow"
    fx = {k: v for k, v in base.items() if k not in ("evidenceSha256", "secondFreshEvidenceSha256", "rawRgbSha256", "acceptance",
          "evidenceSchema", "lifecycleCounts", "topology", "attackerPictureOffset", "targetPictureOffset", "pair", "orientation")}
    fx.update({"schema": "altspecies-portable-source/v1", "baseSourceFixture": c["baseSource"], "swap": c["swap"],
               "scenario": str(path.relative_to(ROOT)), key: {"startFrame": sw, "endFrame": ew, "frameCount": ew - sw + 1},
               "attacker": {"species": NAMES[mons[attacker_side]["species"]], "geometry": {"side": attacker_side}},
               "target": {"species": NAMES[mons[other]["species"]], "geometry": {"side": other}},
               "fieldProfile": {"playerHp": fp["playerHp"], "playerMaxHp": fp["playerMaxHp"], "opponentHp": fp["opponentHp"],
                                "opponentMaxHp": fp["opponentMaxHp"], "playerGender": fp["playerGender"], "opponentGender": fp["opponentGender"]}})
    if c.get("probeMoveId") is not None: fx["probeMoveId"] = c["probeMoveId"]
    sf = ROOT / "tools/compare/fixtures" / f"altspecies-{c['name']}.json"
    sf.write_text(json.dumps(fx, indent=1) + "\n")
    lf = ROOT / "tools/integration/fixtures" / f"altspecies-{c['name']}.json"
    lf.write_text(json.dumps({"schema": "altspecies-live-adapter/v1", "sourceFixture": str(sf.relative_to(ROOT)), "move": c.get("move", base.get("move")), **({"probeMoveId": c["probeMoveId"]} if c.get("probeMoveId") is not None else {})}) + "\n")
    print("wrote", sf.name, key, sw, ew, "base window", base.get(key), fp)

if __name__ == "__main__":
    cmd, name = sys.argv[1], sys.argv[2]
    c = case(name)
    if cmd == "write": write(c, int(sys.argv[3]) if len(sys.argv) > 3 else None); sys.exit()
    base, path = stage(c)
    p = run_probe(c, path, int(sys.argv[3]) if len(sys.argv) > 3 else None)
    rows = p.get("frames") or p.get("rows")
    print(name, len(rows), window_of(rows, p), rows[0].get("battlers"))
