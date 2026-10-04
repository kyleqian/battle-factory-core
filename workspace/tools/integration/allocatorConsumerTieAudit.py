#!/usr/bin/env python3
"""Allocator-consumer draw-order tie audit: stage / run / analyze.

  allocatorConsumerTieAudit.py stage                 write tools/integration/fixtures/allocator-consumer-tie-scenarios/*.json
  allocatorConsumerTieAudit.py run [name-substr ...] run every scenario twice fresh (4 parallel), analyze, write compact raw
  allocatorConsumerTieAudit.py receipt               combine compact raw into allocator-consumer-tie-audit.json
Needs the mgba venv (PYTHONPATH=<vendor>/libmgba-py <vendor>/mgba-venv/bin/python). Window raw goes to $TIE_WORK (default /tmp/tie-work).
"""
from __future__ import annotations
import copy, hashlib, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tools/integration/fixtures"
SCEN = FIX / "allocator-consumer-tie-scenarios"
RAW = FIX / "allocator-consumer-tie-raw"
WORK = Path(os.environ.get("TIE_WORK", "/tmp/tie-work"))
PROBE = ROOT / "tools/compare/allocatorConsumerTieProbe.py"
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
BL = ROOT / "tools/battle-lab"
WF = FIX / "wall-family-scenarios"
# consumer -> (move id, {orientation: base scenario})
CONSUMERS = {
    "light-screen": (113, {"player": BL / "mechanic-light-screen-player-exeggcute-opponent-onix.json", "opponent": BL / "mechanic-light-screen-opponent-exeggcute-player-onix.json"}),
    "reflect": (115, {"player": BL / "mechanic-reflect-player-shuppet-opponent-shuckle.json", "opponent": BL / "mechanic-reflect-opponent-shuppet-player-shuckle.json"}),
    "barrier": (112, {"player": BL / "mechanic-barrier-player-drowzee-opponent-onix.json", "opponent": BL / "mechanic-barrier-opponent-drowzee-player-onix.json"}),
    "magic-coat": (277, {"player": BL / "mechanic-magic-coat-player-spoink-opponent-onix.json", "opponent": BL / "mechanic-magic-coat-opponent-spoink-player-onix.json"}),
    "protect": (182, {"player": BL / "mechanic-protect-player-houndour-opponent-onix.json", "opponent": BL / "mechanic-protect-opponent-houndour-player-onix.json"}),
    "mirror-coat": (243, {"player": WF / "wall-family-mirror-coat-player.json", "opponent": WF / "wall-family-mirror-coat-opponent.json"}),
}
TURN_SLOT2 = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["RIGHT"]}, {"frames": 10, "buttons": []},
              {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
SLOT2 = {"slot2-smokescreen": 108, "slot2-toxic": 92}  # consumer user's slot-1 move (turn 1); consumer moves to slot 2 (RIGHT) for turn 2
EARLIER = {"smokescreen-t2": 108, "toxic-t2": 92}  # other side's lead move before the consumer's second-turn body


def stage():
    SCEN.mkdir(parents=True, exist_ok=True)
    out = []
    for name, (move, bases) in CONSUMERS.items():
        for ori, base in bases.items():
            d0 = json.loads(base.read_text())
            variants = {"first": 0, "t2": 1}
            if name != "mirror-coat":
                variants = {"first": 0, "slow": 0, **{k: 1 for k in EARLIER}, **{k: 1 for k in SLOT2}}
            for var, extra in variants.items():
                d = copy.deepcopy(d0)
                other = "opponent" if ori == "player" else "player"
                if var == "slow":  # slowest species (Shuckle) as the other lead so the consumer acts first
                    for mon in d["overrides"]["parties"][other][:1]:
                        mon["species"] = 213
                if var in EARLIER:
                    for mon in d["overrides"]["parties"][other][:1]:
                        mon["moves"] = [EARLIER[var]] * 4
                if var in SLOT2:
                    for mon in d["overrides"]["parties"][ori][:1]:
                        mon["moves"] = [SLOT2[var], move, SLOT2[var], SLOT2[var]]
                segs = d["trace"]["segments"] + (TURN_SLOT2 if var in SLOT2 else TURN * extra)
                d["trace"] = {"segments": segs, "captureFrames": [0, sum(s["frames"] for s in segs)]}
                f = SCEN / f"{name}-{ori}-{var}.json"
                f.write_text(json.dumps(d, indent=1) + "\n")
                out.append(f.name)
    print("\n".join(out))


def probe(args):
    scen, run = args
    out = WORK / f"{scen.stem}-{run}.json"
    move = next(v[0] for k, v in CONSUMERS.items() if scen.name.startswith(k + "-"))
    py = os.environ.get("PY", sys.executable)
    subprocess.run([py, str(PROBE), str(move), str(scen), str(out)], check=True, capture_output=True, env=os.environ)
    return out


DIM = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64), (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16),
       (1, 3): (64, 32), (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}  # (shape,size) -> w,h


def rect(s):
    w, h = DIM.get((s["shape"], s["size"]), (8, 8))
    if s["aff"] == 3:
        w, h = w * 2, h * 2
    x = s["x"] - 512 if s["x"] >= 256 else s["x"]
    y = s["y"] - 256 if s["y"] >= 160 else s["y"]
    return [x, y, x + w, y + h]


def overlap(a, b):
    """Return intersection rect clipped to the 240x160 screen, or None."""
    ra, rb = rect(a), rect(b)
    ix = [max(ra[0], rb[0], 0), max(ra[1], rb[1], 0), min(ra[2], rb[2], 240), min(ra[3], rb[3], 160)]
    return ix if ix[0] < ix[2] and ix[1] < ix[3] else None


def label(s):
    return f"{s['tmpl']}|p{s['prio']}s{s['sub']}"


def analyze_body(body):
    """Per-frame tie / emission analysis of one consumer body window."""
    win = body["window"]
    base = win[0]["occ"]
    base_sig = {k: (v["tmpl"],) for k, v in base.items()}
    ties, frames, sortbad = [], [], 0
    move_slots_seen = set()
    act = next(i for i, f in enumerate(win) if f["act"])
    for i, f in enumerate(win):
        occ = f["occ"]
        mv = {k for k, v in occ.items() if base_sig.get(k) != (v["tmpl"],)}
        move_slots_seen |= mv
        emitted = [str(s) for s in f["order"] if str(s) in occ and not occ[str(s)]["inv"]]
        # sort-consistency of the emitted order against (prio<<8|sub asc, ey desc)
        keys = [((occ[s]["prio"] << 8) | occ[s]["sub"], -occ[s]["ey"]) for s in emitted]
        if keys != sorted(keys):
            sortbad += 1
        vis = [s for s in occ if not occ[s]["inv"]]
        for ai, a in enumerate(vis):
            for b in vis[ai + 1:]:
                if a not in mv and b not in mv:
                    continue
                A, B = occ[a], occ[b]
                if (A["prio"], A["sub"], A["ey"]) != (B["prio"], B["sub"], B["ey"]):
                    continue
                ix = overlap(A, B)
                ties.append({"offset": i - act, "tick": f["n"], "slots": [int(a), int(b)], "templates": [A["tmpl"], B["tmpl"]],
                             "key": [A["prio"], A["sub"], A["ey"]], "rects": [rect(A), rect(B)], "overlap": ix,
                             "subspriteUnknownRect": A["subtab"] or B["subtab"]})
        frames.append({"offset": i - act, "tick": f["n"], "move": sorted(int(k) for k in mv), "emitted": [int(s) for s in emitted],
                       "labels": [("M:" if s in mv else "") + label(occ[s]) + ("" if s in mv else f"@{occ[s]['x']},{occ[s]['y']}") for s in emitted],
                       "rects": {s: rect(occ[s]) for s in emitted if s in mv},
                       "subtab": [int(s) for s in emitted if s in mv and occ[s]["subtab"]]})
    return {"ties": ties, "frames": frames, "sortInconsistentFrames": sortbad, "moveSlots": sorted(int(s) for s in move_slots_seen),
            "freeOrderAtActivationMinus1": body["freeOrderAtActivationMinus1"], "baselineOccupied": body["baselineOccupied"],
            "activationTick": body["activationTick"], "cleanupTick": body["cleanupTick"]}


def compare_emission(first, later):
    """Per activation offset: do the emitted label sequences differ; if so which (move,other) pairs invert and do they overlap."""
    diffs = []
    ff = {f["offset"]: f for f in first["frames"]}
    for f in later["frames"]:
        g = ff.get(f["offset"])
        if g is None or g["labels"] == f["labels"]:
            continue
        # relative order of every (move sprite label, other label) pair
        def pairs(fr):
            seq = fr["labels"]
            idx = {l: i for i, l in enumerate(seq)}
            mv = [l for l in seq if l.startswith("M:")]
            return {(m, o): idx[m] < idx[o] for m in mv for o in seq if not o.startswith("M:")}, idx
        pg, _ = pairs(g)
        pl, _ = pairs(f)
        inv = sorted(f"{m} vs {o}" for (m, o) in pl if (m, o) in pg and pg[(m, o)] != pl[(m, o)])
        mvpairs = [(m, n) for m in f["labels"] if m.startswith("M:") for n in f["labels"] if n.startswith("M:") and m < n]
        diffs.append({"offset": f["offset"], "tick": f["tick"], "sameMultiset": sorted(g["labels"]) == sorted(f["labels"]),
                      "moveVsOtherInversions": inv, "moveSlotsFirst": g["move"], "moveSlotsLater": f["move"],
                      "emittedFirst": g["emitted"], "emittedLater": f["emitted"]})
    return diffs


def run(filters):
    WORK.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    scens = sorted(p for p in SCEN.glob("*.json") if not filters or any(f in p.name for f in filters))
    jobs = [(s, r) for s in scens for r in (0, 1)]
    with ThreadPoolExecutor(4) as ex:
        outs = list(ex.map(probe, jobs))
    for s in scens:
        res = {}
        runs = []
        for r in (0, 1):
            d = json.loads((WORK / f"{s.stem}-{r}.json").read_text())
            move = d["move"]
            bodies = [b for b in d["bodies"] if b["move"] == move and "window" in b]
            runs.append({"toolSha256": d["toolSha256"], "allBodies": [(b["move"], b["activationTick"], b["cleanupTick"]) for b in d["bodies"]],
                         "bodies": [analyze_body(b) for b in bodies],
                         "rawSha256": hashlib.sha256((WORK / f"{s.stem}-{r}.json").read_bytes()).hexdigest()})
        (RAW / f"{s.stem}.json").write_text(json.dumps({"scenario": s.name, "scenarioSha256": hashlib.sha256(s.read_bytes()).hexdigest(),
            "runs": [runs[0], {k: v for k, v in runs[1].items() if k != "bodies"} | {"bodiesSha256": hashlib.sha256(json.dumps(runs[1]["bodies"], sort_keys=True).encode()).hexdigest()}],
            "identical": runs[0]["bodies"] == runs[1]["bodies"] and runs[0]["allBodies"] == runs[1]["allBodies"]}, separators=(",", ":")) + "\n")
        print(s.name, "identical" if runs[0]["bodies"] == runs[1]["bodies"] else "DIFFERENT", runs[0]["allBodies"])


def receipt():
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    raws = {p.stem: json.loads(p.read_text()) for p in sorted(RAW.glob("*.json"))}
    rows = []
    for name, (move, _bases) in CONSUMERS.items():
        for ori in ("player", "opponent"):
            ref_name = next((f"{name}-{ori}-{v}" for v in ("first", "slow") if f"{name}-{ori}-{v}" in raws and
                             raws[f"{name}-{ori}-{v}"]["runs"][0]["allBodies"][0][0] == move), f"{name}-{ori}-first")
            for stem, raw in raws.items():
                if not stem.startswith(f"{name}-{ori}-"):
                    continue
                var = stem[len(f"{name}-{ori}-"):]
                if var.startswith("slot2") and ori == "opponent":
                    continue  # opponent AI picks the move slot; not stageable
                runs = []
                for r in raw["runs"]:
                    bodies = []
                    for bi, b in enumerate(r["bodies"]):
                        later = [x for x in r["allBodies"] if x[1] < b["activationTick"] and x[0] != 0 or (x[0] == 0 and x[1] < b["activationTick"])]
                        refb = raws[ref_name]["runs"][0]["bodies"][0]
                        cmp_ = compare_emission(refb, b) if stem != ref_name or bi else []
                        bodies.append({"activationTick": b["activationTick"], "cleanupTick": b["cleanupTick"], "earlierBodies": [x[0] for x in later],
                            "moveSlots": b["moveSlots"], "freeOrderAtActivationMinus1": b["freeOrderAtActivationMinus1"],
                            "sortInconsistentFrames": b["sortInconsistentFrames"], "tieFrames": len(b["ties"]),
                            "overlappingTies": [t for t in b["ties"] if t["overlap"] or t["subspriteUnknownRect"]],
                            "ties": b["ties"], "emissionDiffVsFirstBody": cmp_, "windowFrames": len(b["frames"])})
                    runs.append(bodies)
                rows.append({"consumer": name, "move": move, "orientation": ori, "scenario": stem, "variant": var, "reference": ref_name,
                    "scenarioSha256": raw["scenarioSha256"], "freshRunsIdentical": raw["identical"],
                    "consumerBodiesReached": len(runs[0]), "runs": runs[:1], "rawFile": f"allocator-consumer-tie-raw/{stem}.json", "rawSha256": sha(RAW / f"{stem}.json")})
    (FIX / "allocator-consumer-tie-audit.json").write_text(json.dumps({"schema": "allocator-consumer-tie-audit/v1", "profile": "battle-scene-on",
        "pins": {"probe": sha(PROBE), "audit": sha(__file__), "sprite.c": sha(ROOT / "reference/pokeemerald/src/sprite.c"), "rom": sha(ROOT / "reference/pokeemerald/pokeemerald.gba")},
        "rows": rows}, indent=1) + "\n")
    for r in rows:
        b = r["runs"][0]
        print(f"{r['scenario']:44s} ident={r['freshRunsIdentical']} bodies={r['consumerBodiesReached']} " + " | ".join(
            f"earlier={x['earlierBodies']} ties={x['tieFrames']} ovl={len(x['overlappingTies'])} emitDiff={len(x['emissionDiffVsFirstBody'])} sortbad={x['sortInconsistentFrames']}" for x in b))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "stage":
        stage()
    elif cmd == "receipt":
        receipt()
    elif cmd == "run":
        run(sys.argv[2:])
    else:
        raise SystemExit(__doc__)
