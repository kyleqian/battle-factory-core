#!/usr/bin/env python3
"""Per-move-body / inter-action sSpriteOrder transform plans (pure python3, no mGBA).

Stage 1 (extract): raw `sprite-order-event-raw/v2` rows -> compact event table
  (tools/integration/fixtures/sprite-order-body-events.json): per scenario, per activation unit
  [activation edge, next activation edge) the sort windows [frame, created, destroyedInArrayOrder, mode, group evidence].
Stage 2 (derive): event table -> allocation-relative plans, group classes, verdicts per (move id, attacker side),
  and a replay from the KNOWN ENTRY state (src/engine/spriteOrderProvider.ts) that applies only plan transforms.

Allocation-relative tokens inside a unit: ('n',k) = k-th sprite created by this unit (creation order: lowest-free
creates ascending, then end-of-array creates descending, per window), ('c',ago,k) = survivor k of the unit `ago`
units earlier, ('o',slot) = occupant that predates every unit (known-entry occupant, concrete slot).

Destroy-group classes (members of ONE sort window):
  SINGLE   one slot
  STATIC   all (priority<<8|subpriority) distinct: order = ascending key word, independent of y/species
  FDERIVED full keys tied: order = creation window, then free-order index at creation (computed by the provider)
  KEYS     same priority word but different y, or the observed order contradicts the rule above (needs live keys)

usage (from workspace/):
  python3 tools/integration/spriteOrderBodyPlans.py                          # table -> plans/replay, prints summary
  python3 tools/integration/spriteOrderBodyPlans.py --write                  # also rewrites plans fixture
  python3 tools/integration/spriteOrderBodyPlans.py --extra /tmp/ev-extra --write   # re-extract table from raw+extra
"""
import glob, json, re, sys, collections, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/integration"))
import spriteOrderEventModel as M

ENTRY_WINDOWS = 78  # nonempty sort windows of the known entry stream (BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS)
FIX = ROOT / "tools/integration/fixtures"
TABLE = FIX / "sprite-order-body-events.json"
PLANS = FIX / "sprite-order-body-plans.json"
TS = ROOT / "src/engine/spriteOrderProvider.ts"
LIVE_TS = ROOT / "src/engine/liveMoveAnimation.ts"


# ------------------------------------------------------------------ stage 1: extraction
def side_of(path):
    m = re.match(r"\d+-.*?-(player|opponent)\b", Path(path).name)
    return m.group(1) if m else None


def windows(path):
    d, rows = M.load(path)
    seq = M.frames_of(rows, d["lastFrame"])
    prev = seq[0][1]
    W = []
    for n, r in seq[1:]:
        c = [s for s in range(64) if r["mask"] >> s & 1 and not prev["mask"] >> s & 1]
        de = [s for s in range(64) if prev["mask"] >> s & 1 and not r["mask"] >> s & 1]
        pos = {s: i for i, s in enumerate(prev["order"])}
        de.sort(key=lambda s: pos[s])
        W.append(dict(n=n, act=r["act"], mv=r["mv"], C=c, D=de, keys=prev["keys"] or {}, pmask=prev["mask"],
                      F=M.free_order(prev["order"], prev["mask"]), obsF=M.free_order(r["order"], r["mask"])))
        prev = r
    return d, W


def create_modes(pmask, created):
    """CreateSprite takes the lowest free index, CreateSpriteAtEnd the highest. Returns [(slot, 'f'|'e')] in processing order."""
    free = [s for s in range(64) if not pmask >> s & 1]
    cs, out = sorted(created), []
    while cs and cs[0] == free[0]:
        out.append((cs.pop(0), "f")); free.pop(0)
    while cs and cs[-1] == free[-1]:
        out.append((cs.pop(), "e")); free.pop()
    out += [(s, "?") for s in cs]
    return out


def wrapped_y(y):
    return y - 256 if y >= 160 else y


def extract_scenario(kind, path):
    d, W = windows(path)
    side = side_of(path)
    edges = [i for i, w in enumerate(W) if w["act"] and (i == 0 or not W[i - 1]["act"])]
    if not edges:
        return None
    edges.append(len(W))
    created_at = {}  # slot -> (frame, F index at creation) for live sprites

    def unit_of(kind, lo, hi, **extra):
        wl = []
        if extra.get("pre"):
            lo, hi = extra.pop("windowsFrom"), extra.pop("upTo")
        for i, w in enumerate(W[lo:hi]):
            if not (w["C"] or w["D"]):
                continue
            ent = {"f": w["n"]}
            if w["C"]:
                ent["C"] = [[s, m] for s, m in create_modes(w["pmask"], w["C"])]
                for s in w["C"]:
                    created_at[s] = (w["n"], w["F"].index(s) if s in w["F"] else -1)
            if w["D"]:
                ent["D"] = w["D"]
                if len(w["D"]) > 1:
                    ent["G"] = []
                    for s in w["D"]:
                        k = w["keys"].get(str(s))
                        ent["G"].append([s, None if k is None else (k[0] << 8 | k[1]), None if k is None else wrapped_y(k[2]),
                                         list(created_at.get(s, (None, None)))])
                for s in w["D"]:
                    created_at.pop(s, None)
            wl.append(ent)
        return {"kind": kind, "frame": W[min(lo, len(W) - 1)]["n"], "windows": wl, **extra}

    units = []
    nonempty = [i for i, w in enumerate(W) if w["C"] or w["D"]]
    pre0 = nonempty[ENTRY_WINDOWS] if len(nonempty) > ENTRY_WINDOWS else edges[0]  # entry stream is the known table
    units.append(unit_of("gap", 0, 0, pre=True, last=False, nextMv=W[edges[0]]["mv"], windowsFrom=pre0, upTo=edges[0]))
    for j in range(len(edges) - 1):
        a, b = edges[j], edges[j + 1]
        k = a
        while k < b and W[k]["act"]:
            k += 1
        units.append(unit_of("body", a, k, mv=W[a]["mv"], observedFreeAtEdge=W[a]["F"], truncated=(k >= len(W))))
        units.append(unit_of("gap", k, b, last=(j == len(edges) - 2), nextMv=(W[b]["mv"] if b < len(W) else None)))
    return {"file": Path(path).name, "kind": kind, "move": d.get("move"), "side": side,
            "freeAtFirstEdge": W[edges[0]]["obsF"], "units": units}


def scen_files(extra):
    out = [("raw", f) for f in sorted(glob.glob(str(FIX / "sprite-order-event-raw/*-0.json")))]
    out += [("factory", f) for f in sorted(glob.glob(str(FIX / "sprite-order-factory-raw/*-0.json")))]
    if extra:
        out += [("extra", f) for f in sorted(glob.glob(str(Path(extra) / "*-0.json")))]
    return out


def extract(extra):
    sc = []
    for kind, f in scen_files(extra):
        r = extract_scenario(kind, f)
        if r:
            sc.append(r)
    return {"schema": "sprite-order-body-events/v1",
            "note": "derived from sprite-order-event-raw/v2 rows; regenerate: spriteOrderBodyPlans.py --extra DIR --write",
            "scenarios": sc}


# ------------------------------------------------------------------ stage 2: classification
def classify_group(g):
    """g = [[slot, pw, y, [cframe, fidx]], ...] in observed array order -> (class, detail)"""
    if any(m[1] is None for m in g):
        return "KEYS", "keys missing"
    pw = [m[1] for m in g]
    key = lambda m: (m[1], -m[2])
    byk = sorted(g, key=lambda m: (m[1], -m[2], m[3][0] if m[3][0] is not None else -1, m[3][1] if m[3][1] is not None else -1))
    if [m[0] for m in byk] != [m[0] for m in g]:
        return "KEYS", "observed order contradicts key/creation rule"
    if len(set(pw)) == len(pw):
        return "STATIC", None
    for i in range(len(g)):
        for j in range(i + 1, len(g)):
            if g[i][1] == g[j][1] and g[i][2] != g[j][2]:
                return "KEYS", "equal priority word, different y (y is species/position dependent)"
    if any(m[3][0] is None for m in g):
        return "KEYS", "tied but a member predates the unit (no creation record)"
    return "FDERIVED", None


def tokenize_scenario(sc):
    """-> per unit: tokenised windows, survivors; slot->(unit,k) lifetimes across units."""
    life = {}  # slot -> ('u', unitIndex, k)
    rank = {}  # (unit, k) -> rank among that unit's survivors at its end
    out = []
    for ui, u in enumerate(sc["units"]):
        k = 0
        tw = []
        for w in u["windows"]:
            ent = {}
            if "C" in w:
                cs = []
                for s, m in w["C"]:
                    life[s] = ("u", ui, k)
                    cs.append(["n", k, m]); k += 1
                ent["C"] = cs
            if "D" in w:
                ds = []
                for s in w["D"]:
                    t = life.pop(s, None)
                    if t is None:
                        ds.append(["o", s])
                    elif t[1] == ui:
                        ds.append(["n", t[2]])
                    else:
                        ds.append(["c", ui - t[1], rank[(t[1], t[2])]])
                ent["D"] = ds
                if "G" in w:
                    cls, why = classify_group(w["G"])
                    ent["cls"] = cls
                    if why:
                        ent["why"] = why
                    ent["pw"] = [m[1] for m in w["G"]]
                else:
                    ent["cls"] = "SINGLE"
            tw.append(ent)
        mine = sorted(t[2] for t in life.values() if t[1] == ui)
        for r, kk in enumerate(mine):
            rank[(ui, kk)] = r
        out.append(tw)
    return out


def strip_prompt(tw, last):
    """The trailing cursor-pair create of the last unit is the next prompt cycle, not the body."""
    if last and tw and "C" in tw[-1] and "D" not in tw[-1] and [t[1] for t in tw[-1]["C"]] and len(tw[-1]["C"]) == 2:
        return tw[:-1], True
    return tw, False


def sig(tw):
    return json.dumps([{k: v for k, v in w.items() if k in ("C", "D")} for w in tw], separators=(",", ":"))


def owner_side(sc, mv):
    if sc["side"] is None:
        return "factory"
    return sc["side"] if mv == sc["move"] else ("player" if sc["side"] == "opponent" else "opponent") if mv == 33 else ("any" if mv == 0 else None)


def live_ids():
    s = LIVE_TS.read_text()
    blk = s[s.index("LIVE_MOVE_ANIMATION_IDS = Object.freeze(["):]
    blk = re.sub(r"//[^\n]*", "", blk[:blk.index("] as const")])
    return sorted(set(int(x) for x in re.findall(r"\b\d+\b", blk.split("[", 1)[1])))


# ------------------------------------------------------------------ replay (plans only)
def ts_entry():
    s = TS.read_text()
    m = re.search(r"KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER[^=]*=\s*Object\.freeze\(\[(.*?)\]\)", s, re.S)
    free = [int(x) for x in re.findall(r"\d+(?:\s*\.\.\s*\d+)?", m.group(1))]
    wm = re.search(r"BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS[^=]*=\s*Object\.freeze\(\s*\[(.*?)\]\.map", s, re.S)
    wins = []
    for a, b in re.findall(r"\[\[([\d,\s]*)\],\s*\[([\d,\s]*)\]\]", wm.group(1)):
        wins.append(([int(x) for x in a.split(",") if x.strip()], [int(x) for x in b.split(",") if x.strip()]))
    return free, wins


def entry_state():
    free_const, wins = ts_entry()
    F, occ = list(range(64)), set()
    for c, d in wins:  # destroyed lists are already in array order
        occ |= set(c)
        F = [s for s in F if s not in c]
        occ -= set(d)
        if d:
            F = list(d) + F
    assert F == free_const, "entry replay != KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER"
    return F, occ


class Sim:
    def __init__(self):
        self.F, self.occ = entry_state()
        self.life = {}  # (unit,k) -> slot
        self.surv = {}  # unit -> survivors (slots) by creation order
        self.rank = {}  # slot -> (windowSeq, fidx)
        self.seq = 0
        self.unit = -1

    def apply_unit(self, tw, plan_groups):
        self.unit += 1
        k = 0
        for w in tw:
            self.seq += 1
            if "C" in w:
                for _, _, mode in w["C"]:
                    free = [s for s in range(64) if s not in self.occ]
                    s = free[0] if mode != "e" else free[-1]
                    self.life[(self.unit, k)] = s
                    self.rank[s] = (self.seq, self.F.index(s))
                    self.occ.add(s); k += 1
                for t in w["C"]:  # F removal happens after all fidx are taken from the pre-window F
                    pass
                made = [self.life[(self.unit, kk)] for kk in range(k - len(w["C"]), k)]
                self.F = [s for s in self.F if s not in made]
            if "D" in w:
                slots = []
                for t in w["D"]:
                    if t[0] == "n": slots.append(self.life[(self.unit, t[1])])
                    elif t[0] == "c": slots.append(self.surv[self.unit - t[1]][t[2]])
                    else: slots.append(t[1])
                if w["cls"] == "FDERIVED":
                    slots.sort(key=lambda s: self.rank[s])
                self.occ -= set(slots)
                self.F = slots + [s for s in self.F if s not in slots]
        self.surv[self.unit] = [self.life[(self.unit, kk)] for kk in range(k) if self.life[(self.unit, kk)] in self.occ]


def gkey(sc, U, ui):
    return ("entry" if ui == 0 else ukey(sc, U[ui - 1])) + ">" + ukey(sc, U[ui + 1])


def ukey(sc, u):
    return f"{u['mv']}:{owner_side(sc, u['mv']) or '?'}"


def main(argv):
    extra = argv[argv.index("--extra") + 1] if "--extra" in argv else None
    if extra:
        table = extract(extra)
        TABLE.write_text(json.dumps(table, separators=(",", ":")) + "\n")
        print("wrote", TABLE, TABLE.stat().st_size, "bytes")
    table = json.loads(TABLE.read_text())
    SC = table["scenarios"]
    lives = set(live_ids())

    def new_plan():
        return {"sigs": collections.defaultdict(list), "scenarios": [], "cls": collections.Counter(), "why": collections.Counter(),
                "pw": collections.defaultdict(set)}

    bodies, gaps = collections.defaultdict(new_plan), collections.defaultdict(new_plan)
    toks = []
    for sc in SC:
        T = tokenize_scenario(sc)
        toks.append(T)
        U = sc["units"]
        for ui, (u, tw) in enumerate(zip(U, T)):
            if u["kind"] == "body":
                if u["truncated"]:
                    continue
                p = bodies[ukey(sc, u)]
            else:
                if u["last"]:
                    continue  # truncated at end of trace (ends in the next prompt's cursor-pair create); not a plan
                p = gaps[gkey(sc, U, ui)]
            p["sigs"][sig(tw)].append(sc["file"])
            p["scenarios"].append(sc["file"])
            for w in tw:
                if "cls" in w and "D" in w:
                    p["cls"][w["cls"]] += 1
                    if "why" in w:
                        p["why"][w["why"]] += 1
                    if w["cls"] == "STATIC":
                        p["pw"][json.dumps(w["D"])].add(json.dumps(w["pw"]))

    def verdicts(plans, with_live):
        rows = {}
        for key, p in sorted(plans.items()):
            multi = len(p["sigs"]) > 1
            bad = p["cls"]["KEYS"]
            v = "EXACT-PLAN" if not bad and not multi else "NEEDS-KEYS"
            top = max(p["sigs"], key=lambda x: len(p["sigs"][x]))
            r = {"scenarios": len(p["scenarios"]), "distinctPlans": len(p["sigs"]), "groupClasses": dict(p["cls"]),
                 "keysReasons": dict(p["why"]), "staticKeyWordsConstant": all(len(x) == 1 for x in p["pw"].values()),
                 "verdict": v, "plan": json.loads(top), "planExamples": p["sigs"][top][:2]}
            if multi:
                r["otherPlans"] = {x: len(f) for x, f in p["sigs"].items() if x != top}
            if with_live:
                r["move"], r["side"] = key.split(":"); r["live"] = int(r["move"]) in lives
            rows[key] = r
        return rows

    brow, grow = verdicts(bodies, True), verdicts(gaps, False)
    bex = {k for k, r in brow.items() if r["verdict"] == "EXACT-PLAN"}
    gex = {k for k, r in grow.items() if r["verdict"] == "EXACT-PLAN"}

    # ---- replay: entry constant + plans only
    stat = collections.Counter()
    bad_edges = []
    for sc, T in zip(SC, toks):
        sim, ok, gap_ok = Sim(), True, True
        U = sc["units"]
        for ui, (u, tw) in enumerate(zip(U, T)):
            if u["kind"] == "body":
                if u["truncated"]:
                    break
                key = ukey(sc, u)
                stat["edges"] += 1
                if ok:
                    stat["edgesPrecededByExactPlans"] += 1
                    if sim.F == u["observedFreeAtEdge"]:
                        stat["edgesExact"] += 1
                    else:
                        stat["edgesMismatched"] += 1
                        bad_edges.append({"file": sc["file"], "unit": ui, "move": u["mv"], "predicted": sim.F[:10], "observed": u["observedFreeAtEdge"][:10]})
                plan, valid = (brow[key]["plan"], key in bex)
            else:
                if u["last"]:
                    continue
                key = gkey(sc, U, ui)
                plan, valid = (grow[key]["plan"], key in gex)
            if not valid:
                ok = False
                continue
            if not ok:
                continue
            planw = [dict(pw_, cls=ow.get("cls", "SINGLE")) for pw_, ow in zip(plan, tw)]
            sim.apply_unit(planw, None)
    out = {"schema": "sprite-order-body-plans/v1", "table": {"scenarios": len(SC), "sha256": hashlib.sha256(TABLE.read_bytes()).hexdigest()},
           "tokens": "('n',k)=k-th sprite created by this unit (creation order: lowest-free ascending then end descending); ('c',ago,k)=survivor k of the unit `ago` units earlier (units alternate body,gap); ('o',slot)=occupant that predates every unit",
           "groupClasses": "SINGLE | STATIC (distinct priority words) | FDERIVED (tied keys; creation window then free-order index) | KEYS",
           "replay": dict(stat), "replayMismatches": bad_edges[:20],
           "liveIds": sorted(lives), "bodies": brow, "gaps": grow}
    covered = {int(k.split(":")[0]) for k in brow}
    out["liveNotObserved"] = sorted(lives - covered)
    print(json.dumps({"bodyVerdicts": collections.Counter(r["verdict"] for r in brow.values()),
                      "gapVerdicts": collections.Counter(r["verdict"] for r in grow.values()), "replay": dict(stat),
                      "liveNotObserved": len(out["liveNotObserved"])}, indent=1))
    if "--write" in argv:
        PLANS.write_text(json.dumps(out, indent=1) + "\n")
        print("wrote", PLANS)


if __name__ == "__main__":
    main(sys.argv)
