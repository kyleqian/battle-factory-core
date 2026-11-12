#!/usr/bin/env python3
"""Generate gap-cause BattleLab scenarios, run the call-stream probe on them (direct mGBA) and summarise.

usage: spriteOrderGapCauses.py gen                 write tools/integration/fixtures/gap-cause-scenarios/*.json
       spriteOrderGapCauses.py run [names...]      run tools/compare/spriteOrderGapCallProbe.py on each (outputs under $OUT, default /tmp/gapcalls)
       spriteOrderGapCauses.py summarize [names..] print per-scenario origin summary from $OUT
Summaries classify every allocator call by its source origin (symbolized caller LR) and list the transient blips
(DoHitAnimHealthboxEffect) and cursor pairs (DoBounceEffect) with the battle context at creation.
"""
from __future__ import annotations
import copy, json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCEN = ROOT / "tools/integration/fixtures/gap-cause-scenarios"
OUT = Path(os.environ.get("OUT", "/tmp/gapcalls"))
BASE = ROOT / "tools/battle-lab/mechanic-night-shade-opponent-ariados-player-onix.json"
PROBE = ROOT / "tools/compare/spriteOrderGapCallProbe.py"
PY = os.environ.get("PY", os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python")

# name: (player species, player move, opponent species, opponent move, seed, frames)
VARIANTS = {
    "tackle-both": (95, 33, 168, 33, 305419897, 700),
    "tackle-vs-ghost": (95, 33, 92, 33, 305419897, 700),
    "growl-leer": (95, 45, 168, 43, 305419897, 700),
    "thunderwave-vs-ground": (95, 86, 168, 43, 305419897, 700),
    "splash-tackle": (129, 150, 168, 33, 305419897, 700),
    "substitute-then-tackle": (168, 164, 95, 33, 305419897, 700),
    "swords-dance-tackle": (168, 14, 95, 33, 305419897, 700),
    "tackle-vs-substitute-faster": (95, 33, 168, 164, 305419897, 700),
}
# prompt-cycle traces: name -> segments (replaces the default A,30,A,<frames>); same Onix-vs-Ariados Tackle battle
def seg(frames, *buttons):
    return {"frames": frames, "buttons": list(buttons)}


TRACES = {
    "prompt-move-cancel": [seg(2, "A"), seg(40), seg(2, "B"), seg(40), seg(2, "A"), seg(30), seg(2, "A"), seg(700)],
    "prompt-move-cancel-x3": [seg(2, "A"), seg(40), seg(2, "B"), seg(40), seg(2, "A"), seg(40), seg(2, "B"), seg(40), seg(2, "A"),
                              seg(40), seg(2, "B"), seg(40), seg(2, "A"), seg(30), seg(2, "A"), seg(700)],
    "prompt-party-cancel": [seg(2, "DOWN"), seg(10), seg(2, "A"), seg(400), seg(2, "B"), seg(600), seg(2, "A"), seg(30), seg(2, "A"), seg(700)],
    "prompt-cursor-moves": [seg(2, "RIGHT"), seg(10), seg(2, "DOWN"), seg(10), seg(2, "LEFT"), seg(10), seg(2, "UP"), seg(10), seg(2, "A"),
                            seg(30), seg(2, "A"), seg(700)],
}
for _n in TRACES:
    VARIANTS[_n] = (95, 33, 168, 33, 305419897, 0)
for seed in (1, 2, 3, 4, 5, 6):
    VARIANTS[f"thunder-seed{seed}"] = (95, 87, 168, 33, seed, 700)


def gen() -> None:
    base = json.loads(BASE.read_text())
    SCEN.mkdir(parents=True, exist_ok=True)
    for name, (ps, pm, os_, om, seed, frames) in VARIANTS.items():
        d = copy.deepcopy(base)
        d["seed"] = seed
        p, o = d["overrides"]["parties"]["player"][0], d["overrides"]["parties"]["opponent"][0]
        p["species"], p["moves"] = ps, [pm] * 4
        o["species"], o["moves"] = os_, [om] * 4
        if name in TRACES:
            segs = TRACES[name]
            d["trace"] = {"segments": segs, "captureFrames": [0, sum(x["frames"] for x in segs)]}
            (SCEN / f"{name}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
            continue
        d["trace"] = {"segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []},
                                   {"frames": 2, "buttons": ["A"]}, {"frames": frames, "buttons": []}],
                      "captureFrames": [0, frames + 34]}
        (SCEN / f"{name}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
    print(f"wrote {len(VARIANTS)} scenarios to {SCEN}")


def scenario_path(name: str) -> Path:
    for c in (SCEN / f"{name}.json", ROOT / "tools/battle-lab" / f"{name}.json"):
        if c.is_file():
            return c
    raise SystemExit(f"no scenario {name}")


def run(names: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PYTHONPATH=os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/libmgba-py")
    for n in names:
        r = subprocess.run([PY, str(PROBE), str(scenario_path(n)), str(OUT / f"{n}.json")], env=env,
                           capture_output=True, text=True)
        print(n, (r.stdout.strip().splitlines() or ["<none>"])[-1][-120:], "rc", r.returncode, flush=True)


INTERNAL = ("CreateSprite", "CreateSpriteAt", "CreateSpriteAtEnd")


def origin(c: dict) -> str:
    return c["caller"].split("+")[0]


def summarize(names: list[str], quiet: bool = False) -> dict:
    """Per scenario: hit-anim blips (create/destroy frame, target battler, move, result flags, hp) and cursor-pair cycles."""
    result = {}
    for n in names:
        d = json.loads((OUT / f"{n}.json").read_text())
        calls = [c for c in d["calls"] if c["n"] > d["resetFrame"]]
        blips, cursors, other = [], [], {}
        open_blips = []
        for c in calls:
            k = c["kind"]
            if k == "marker:DoHitAnimHealthboxEffect":
                blips.append({"create": c["n"], "caller": c["caller"], "battler": c["r0"], "move": c["ctx"]["curMove"],
                              "resultFlags": c["ctx"]["resultFlags"], "attacker": c["ctx"]["attacker"], "target": c["ctx"]["target"],
                              "hpBefore": c["ctx"]["hp"], "mainFunc": c["ctx"]["mainFunc"], "destroy": None})
                open_blips.append(blips[-1])
            elif k == "DestroySprite" and "SpriteCB_HitAnimHealthoxEffect" in c["victim"]["cb"]:
                b = open_blips.pop(0)
                b["destroy"], b["destroyCaller"], b["life"] = c["n"], c["caller"], c["n"] - b["create"]
            elif k == "marker:DoBounceEffect":
                cursors.append({"n": c["n"], "caller": c["caller"], "battler": c["r0"], "mainFunc": c["ctx"]["mainFunc"]})
            elif k != "DestroySprite" and not k.startswith("marker:") and c["caller"].split("+")[0] not in INTERNAL:
                key = c["caller"].split("+")[0]
                other[key] = other.get(key, 0) + 1
        result[n] = {"resetFrame": d["resetFrame"], "blips": blips, "cursorCalls": cursors, "creatorsByFunction": other}
        if not quiet:
            print("==", n, "blips", len(blips), "cursorCalls", len(cursors))
            for b in blips:
                print("  blip", b["create"], "->", b["destroy"], "life", b.get("life"), "btl", b["battler"], "mv", b["move"], "rf", b["resultFlags"], b["caller"], b["hpBefore"])
    return result


# ---------------------------------------------------------------------------------------------------------------------------
# corpus analysis: join the event table (raw sort windows) with the call-stream probe outputs in $OUT
# ---------------------------------------------------------------------------------------------------------------------------
import collections, re, sys as _sys
_sys.path.insert(0, str(ROOT / "tools/integration"))
import spriteOrderBodyPlans as BP  # noqa: E402

TABLE = json.loads((ROOT / "tools/integration/fixtures/sprite-order-body-events.json").read_text())["scenarios"]
CONST = (ROOT / "reference/pokeemerald/include/constants/battle_anim.h").read_text()


def anim_constants() -> dict[str, dict[int, str]]:
    out: dict[str, dict[int, str]] = {"General": {}, "Special": {}, "Status": {}}
    section = None
    for line in CONST.splitlines():
        if "table ids for general animations" in line:
            section = "General"
        elif "special animations table" in line:
            section = "Special"
        elif "status animation table" in line:
            section = "Status"
        elif line.startswith("// Tasks with return values"):
            section = None
        m = re.match(r"#define (B_ANIM_\w+)\s+(\d+)", line)
        if m and section:
            out[section][int(m.group(2))] = m.group(1)
    return out


ANIMS = anim_constants()
LAUNCHERS = ("marker:TryHandleLaunchBattleTableAnimation", "marker:InitAndLaunchSpecialAnimation", "marker:LaunchStatusAnimation",
             "marker:InitAndLaunchChosenStatusAnimation")


def anim_identity(c: dict) -> dict:
    """Decode one launcher marker into (table, id, name, argument)."""
    k = c["kind"].split(":")[1]
    a = c["args"]  # r0..r3 + first stack word
    if k == "TryHandleLaunchBattleTableAnimation":  # (activeBattler, atk, def, tableId, argument)
        return {"launcher": k, "table": "General", "id": a[3] & 0xFF, "arg": a[4] & 0xFFFF, "caller": c["caller"]}
    if k == "InitAndLaunchSpecialAnimation":  # (activeBattler, atk, def, tableId)
        return {"launcher": k, "table": "Special", "id": a[3] & 0xFF, "arg": None, "caller": c["caller"]}
    if k == "LaunchStatusAnimation":  # (battler, statusAnimId)
        return {"launcher": k, "table": "Status", "id": a[1] & 0xFF, "arg": None, "caller": c["caller"]}
    return {"launcher": k, "table": "ChosenStatus", "id": a[3] & 0xFF if len(a) > 3 else None, "arg": None, "caller": c["caller"]}


def stat_arg_class(arg: int) -> str:
    """gBattleAnims_General[B_ANIM_STATS_CHANGE] argument (battle_anim.h STAT_ANIM_*): base + stat id (1 ATK .. 7 EVASION)."""
    for name, base in (("PLUS1", 14), ("MINUS1", 21), ("PLUS2", 38), ("MINUS2", 45)):
        if base < arg <= base + 7:
            return f"{name}:stat{arg - base}"
    return {55: "MULTIPLE_PLUS1", 56: "MULTIPLE_PLUS2", 57: "MULTIPLE_MINUS1", 58: "MULTIPLE_MINUS2"}.get(arg, f"arg{arg}")


def raw_to_lab(name: str) -> str | None:
    m = re.match(r"^\d+-(.*)-\d+\.json$", name)
    if not m:
        return None
    for cand in (m.group(1), m.group(1).replace("-scenario", "")):
        if (OUT / f"{cand}.json").is_file():
            return cand
    return None


def load_probe(lab: str) -> dict:
    d = json.loads((OUT / f"{lab}.json").read_text())
    d["calls"] = [c for c in d["calls"] if c["n"] > d["resetFrame"]]
    return d


def table_blips(sc: dict) -> set[int]:
    """Create frames of single-slot create/destroy pairs 20 frames apart (the transient blip) anywhere in the unit stream."""
    out = set()
    wins = [w for u in sc["units"] for w in u["windows"]]
    for w in [w for u in sc["units"] if u["kind"] == "gap" for w in u["windows"]]:
        if "C" in w and len(w["C"]) == 1:
            slot = w["C"][0][0]
            if any(x["f"] == w["f"] + 20 and x.get("D") == [slot] for x in wins):
                out.add(w["f"])
    return out


def validate_blips() -> dict:
    res = {"scenarios": 0, "tableBlips": 0, "probeBlips": 0, "matched": 0, "tableOnly": [], "probeOnly": []}
    for sc in TABLE:
        lab = raw_to_lab(sc["file"])
        if not lab:
            continue
        d = load_probe(lab)
        probe = {c["n"] for c in d["calls"] if c["kind"] == "marker:DoHitAnimHealthboxEffect"}
        tb = table_blips(sc)
        # table frames beyond the probe's last frame are truncated tails
        last = max([c["n"] for c in d["calls"]] + [0])
        res["scenarios"] += 1
        res["tableBlips"] += len(tb)
        res["probeBlips"] += len(probe)
        res["matched"] += len(tb & probe)
        res["tableOnly"] += [[sc["file"], f] for f in sorted(tb - probe)]
        res["probeOnly"] += [[sc["file"], f] for f in sorted(probe - tb)]
    return res


def analyse_anims() -> dict:
    """Identify every mv-0 body by the animation launcher called inside it and re-derive its order verdict per animation id."""
    plans = collections.defaultdict(lambda: {"sigs": collections.defaultdict(list), "cls": collections.Counter(), "why": collections.Counter(),
                                              "inst": [], "creators": collections.Counter(), "destroyers": collections.Counter(),
                                              "templates": collections.Counter()})
    unmatched = []
    for sc in TABLE:
        lab = raw_to_lab(sc["file"])
        if not lab:
            continue
        d = load_probe(lab)
        launches = [c for c in d["calls"] if c["kind"] in LAUNCHERS]
        toks = BP.tokenize_scenario(sc)
        for ui, (u, tw) in enumerate(zip(sc["units"], toks)):
            if u["kind"] != "body" or u["mv"] != 0 or u.get("truncated"):
                continue
            prev_end = max([w["f"] for v in sc["units"][:ui] for w in v["windows"]] + [d["resetFrame"]])
            lo = max(prev_end, 0)
            hi = max([w["f"] for w in u["windows"]] + [u["frame"]])
            launched = [c for c in launches if lo < c["n"] <= hi]
            ids = [anim_identity(c) for c in launched]
            if not ids:  # fallback: raw non-move LaunchBattleAnimation
                ids = [{"table": ",".join(c["table"]).replace("gBattleAnims_", ""), "id": c["tableId"], "arg": None, "caller": c["caller"]}
                       for c in d["calls"] if c["kind"] == "marker:LaunchBattleAnimation" and not c["isMove"] and lo < c["n"] <= hi]
            if not ids:
                unmatched.append([sc["file"], ui, u["frame"]])
                continue
            ids = [i for i in ids if i["table"] != "ChosenStatus"]  # InitAndLaunchChosenStatusAnimation always launches the Status table next
            key = "+".join(f"{i['table']}:{ANIMS.get(i['table'], {}).get(i['id'], i['id'])}"
                           + (f"[{stat_arg_class(i['arg'])}]" if i["table"] == "General" and i["id"] == 1 else "") for i in ids)
            p = plans[key]
            p["sigs"][BP.sig(tw)].append(sc["file"])
            p["inst"].append({"file": sc["file"], "unit": ui, "args": [i["arg"] for i in ids], "launch": [i["caller"] for i in ids]})
            for w in tw:
                if "cls" in w and "D" in w:
                    p["cls"][w["cls"]] += 1
                    if "why" in w:
                        p["why"][w["why"]] += 1
            start = min([c["n"] for c in launched] + [hi])
            for c in d["calls"]:
                if start <= c["n"] <= hi and not c["kind"].startswith("marker:"):
                    if c["kind"] == "DestroySprite":
                        p["destroyers"][c["caller"].split("+")[0] + " (" + ",".join(c["victim"]["cb"]) + ")"] += 1
                    elif c["caller"].split("+")[0] not in INTERNAL:
                        p["creators"][c["caller"].split("+")[0]] += 1
                        p["templates"][",".join(c["tpl"]["names"])] += 1
    out = {}
    for key, p in sorted(plans.items()):
        multi = len(p["sigs"]) > 1
        bad = p["cls"]["KEYS"]
        top = max(p["sigs"], key=lambda x: len(p["sigs"][x]))
        out[key] = {"instances": len(p["inst"]), "distinctPlans": len(p["sigs"]), "groupClasses": dict(p["cls"]), "keysReasons": dict(p["why"]),
                    "verdict": "EXACT-PLAN" if not bad and not multi else "NEEDS-KEYS", "plan": json.loads(top), "planExamples": p["sigs"][top][:2],
                    "otherPlans": {x: len(f) for x, f in p["sigs"].items() if x != top} if multi else {},
                    "args": sorted({str(a) for i in p["inst"] for a in i["args"]}),
                    "creators": dict(p["creators"].most_common(8)), "destroyers": dict(p["destroyers"].most_common(8)),
                    "templates": dict(p["templates"].most_common(8)), "exampleLaunchCallers": sorted({c for i in p["inst"] for c in i["launch"]})}
    return {"anims": out, "unmatchedMv0Bodies": unmatched}


INTIMIDATE = ("hitmontop", "ekans", "masquerain", "howl-alternate")


def intimidate_replay() -> list[dict]:
    """The 12 intro-animation entries: replay [pre-prompt F] -> intro anim (C f; D n0) -> prompt cursor pair (FDERIVED) and compare with
    the observed F at the first real move edge (unit 3)."""
    rows = []
    for sc in TABLE:
        u = sc["units"]
        if not (len(u) > 3 and u[1]["kind"] == "body" and u[1]["mv"] == 0 and sc["freeAtFirstEdge"][:2] != [4, 3]):
            continue
        if not any(k in sc["file"] for k in INTIMIDATE):
            continue
        toks = BP.tokenize_scenario(sc)
        sim = BP.Sim()
        sim.F = list(sc["freeAtFirstEdge"])
        sim.occ = {x for x in range(64) if x not in sim.F}
        sim.apply_unit(toks[1], None)  # intro animation body
        sim.apply_unit(toks[2], None)  # prompt cursor pair gap
        edge = u[3].get("observedFreeAtEdge")
        rows.append({"file": sc["file"], "preFirstEdgeHead": sc["freeAtFirstEdge"][:6], "predictedHead": sim.F[:6], "observedHead": (edge or [])[:6],
                     "equal": sim.F == edge, "introWindows": u[1]["windows"], "promptWindows": [{k: v for k, v in w.items() if k != "G"} for w in u[2]["windows"]]})
    return rows


def entry_split_check() -> list[dict]:
    """Entry-split scenarios: compare the (kind, caller, slot) allocator stream up to the first prompt with the control run."""
    INTRO = {"BeginBattleIntro", "BattleIntroDrawPartySummaryScreens", "BattleIntroPrintTrainerWantsToBattle", "BattleIntroRecordMonsToDex",
             "TryDoEventsBeforeFirstTurn", "HandleTurnActionSelectionState"}

    def seq(name):
        d = load_probe(name)
        out = []
        for c in d["calls"]:
            if c["kind"].startswith("marker") or (c["kind"] != "DestroySprite" and c["caller"].split("+")[0] in INTERNAL):
                continue
            if c["ctx"]["mainFunc"] not in INTRO:
                break
            out.append([c["n"] - d["resetFrame"], c["kind"][:3], c["caller"].split("+")[0], c["slot"] if c["kind"] == "DestroySprite" else c.get("result")])
        return out
    base = seq("tackle-both")
    rows = []
    for sc in TABLE:
        if sc["entryMatchesProvider"] or sc["freeAtFirstEdge"][:2] != [4, 3]:
            continue
        lab = raw_to_lab(sc["file"])
        if not lab:
            lab = "light-screen-slowpoke" if "light-screen" in sc["file"] else None
        if not lab or not (OUT / f"{lab}.json").is_file():
            rows.append({"file": sc["file"], "probe": None})
            continue
        sq = seq(lab)
        same_stream = [x[1:] for x in sq] == [x[1:] for x in base]
        same_multiset = sorted(map(tuple, (x[1:] for x in sq))) == sorted(map(tuple, (x[1:] for x in base)))
        rows.append({"file": sc["file"], "probe": lab, "calls": len(sq), "sameOrderedStream": same_stream, "sameCallMultiset": same_multiset,
                     "sameFrames": [x[0] for x in sq] == [x[0] for x in base],
                     "firstFrameShift": next(([x[0], y[0]] for x, y in zip(sq, base) if x[0] != y[0]), None)})
    return rows


TARGETED = ["tackle-both", "tackle-vs-ghost", "splash-tackle", "growl-leer", "thunderwave-vs-ground", "thunder-seed1", "thunder-seed2", "thunder-seed3",
            "thunder-seed4", "substitute-then-tackle", "swords-dance-tackle", "tackle-vs-substitute-faster", "prompt-move-cancel", "prompt-cursor-moves",
            "prompt-party-cancel", "mechanic-solar-beam-player-gloom-opponent-chansey", "mechanic-present-player-delibird-opponent-onix",
            "mechanic-present-player-delibird-opponent-onix-heal", "mechanic-double-slap-opponent-poliwhirl-player-onix",
            "mechanic-explosion-player-glalie-opponent-shuckle", "mechanic-dive-player-chinchou-opponent-onix", "mechanic-hail-player-delibird-opponent-onix",
            "mechanic-future-sight-opponent-kadabra-player-onix", "mechanic-fly-murkrow-onix", "mechanic-counter-opponent-hitmontop-player-onix"]


def build_fixture() -> None:
    fx = ROOT / "tools/integration/fixtures"
    targeted = {n: summarize([n], quiet=True)[n] for n in TARGETED if (OUT / f"{n}.json").is_file()}
    anims = analyse_anims()
    for v in anims["anims"].values():
        v.pop("planExamples", None)
    out = {"schema": "sprite-order-gap-causes/v1", "tool": "tools/integration/spriteOrderGapCauses.py", "probe": "tools/compare/spriteOrderGapCallProbe.py",
           "blipCorpusValidation": {k: (v if not isinstance(v, list) else v) for k, v in validate_blips().items()},
           "targetedScenarios": targeted, "midBattleAnimations": anims, "intimidateEntryReplay": intimidate_replay(), "entrySplitCheck": entry_split_check()}
    (fx / "sprite-order-gap-causes.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
    # compact call-stream samples (frames after the first prompt; allocator/destroy calls with symbolized caller + context)
    samples = {}
    for n in ("tackle-both", "tackle-vs-ghost", "thunder-seed2", "prompt-move-cancel", "prompt-party-cancel", "mechanic-counter-opponent-hitmontop-player-onix",
              "mechanic-solar-beam-player-gloom-opponent-chansey", "mechanic-hail-player-delibird-opponent-onix"):
        d = load_probe(n)
        rows = []
        for c in d["calls"]:
            if c["n"] < 1850 or (c["kind"] != "DestroySprite" and c["caller"].split("+")[0] in INTERNAL):
                continue
            t = c.get("tpl") or c.get("victim") or {}
            rows.append([c["n"], c["kind"].replace("marker:", "@"), c.get("slot", c.get("result")), c["caller"], c.get("chain", [])[:3] if not c["kind"].startswith("marker") else None,
                         t.get("names") or t.get("tpl") or t.get("cb") or c.get("table"), c["ctx"]["mainFunc"], c["ctx"]["ctrl"][0], c["ctx"]["curMove"],
                         c["ctx"]["resultFlags"], c["ctx"]["animActive"], c.get("args")])
        samples[n] = {"resetFrame": d["resetFrame"], "columns": ["frame", "kind", "slot", "callerLR", "stackChain", "template|victim|table", "mainFunc", "ctrl0", "curMove",
                                                                  "resultFlags", "animActive", "args"], "rows": rows}
    (fx / "sprite-order-gap-causes-calls.json").write_text(json.dumps(samples, separators=(",", ":")) + "\n")
    print("wrote fixtures", {p.name: p.stat().st_size for p in (fx / "sprite-order-gap-causes.json", fx / "sprite-order-gap-causes-calls.json")})


if __name__ == "__main__" and sys.argv[1] in ("blips", "anims", "intimidate", "entrysplit", "fixture"):
    if sys.argv[1] == "fixture":
        build_fixture()
    elif sys.argv[1] == "intimidate":
        for r in intimidate_replay():
            print(r["equal"], r["file"], r["preFirstEdgeHead"], "->", r["predictedHead"], "observed", r["observedHead"])
    elif sys.argv[1] == "entrysplit":
        for r in entry_split_check():
            print(r)
    else:
        r = validate_blips() if sys.argv[1] == "blips" else analyse_anims()
        if sys.argv[1] == "blips":
            print({k: (v if not isinstance(v, list) else v[:6]) for k, v in r.items()}, "tableOnly", len(r["tableOnly"]), "probeOnly", len(r["probeOnly"]))
        else:
            for k, v in r["anims"].items():
                print(k, v["instances"], v["verdict"], "plans", v["distinctPlans"], v["groupClasses"], v["args"][:6])
            print("unmatched", len(r["unmatchedMv0Bodies"]), r["unmatchedMv0Bodies"][:5])
    sys.exit(0)


if __name__ == "__main__":
    cmd, names = sys.argv[1], sys.argv[2:]
    if cmd == "gen":
        gen()
    elif cmd == "run":
        run(names or list(VARIANTS))
    elif cmd == "summarize":
        summarize(names or list(VARIANTS))
