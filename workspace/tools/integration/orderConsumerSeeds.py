#!/usr/bin/env python3
"""Order-consumer prep: provider (plan-only replay from the known entry) vs accepted-fixture sSpriteOrder literals vs observed raw order.
Pure python3 (reads committed fixtures; no mGBA).  usage (from workspace/): python3 tools/integration/orderConsumerSeeds.py --write
Writes tools/integration/fixtures/order-consumer-seeds.json.

For every body of the 14 target moves in every probed scenario:
  provider  = KNOWN-ENTRY constant + body/gap plans of all preceding units (the production provider's model, spriteOrderBodyPlans.Sim),
              queried as F after all sort windows with frame <= n (n = frame before the body's first sprite create, the 'first allocation')
  observed  = free-slot order of the raw per-frame sSpriteOrder/mask rows at the same frame (committed raw: sprite-order-event-raw/, order-consumer-raw/)
  literal   = what the accepted fixture/reducer carries (tools/compare/fixtures/*.json, dense rows of tools/compare/evidence/*, or the assumed constant in the reducer)
"""
import glob, gzip, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/integration"))
import spriteOrderBodyPlans as P
import spriteOrderEventModel as M
FIX = ROOT / "tools/integration/fixtures"; CF = ROOT / "tools/compare/fixtures"
OFFSET = 2006  # probe frame n = dense/trace frame + 2006 (checked below against sprite-order-evidence activation)
OCC = {0, 1, 2, 6, 8, 60, 61, 62, 63}
TARGET = {52, 53, 88, 82, 215, 195, 348, 299, 189, 28, 288, 157, 222, 291}

table = json.loads(P.TABLE.read_text())["scenarios"]
plans = json.loads(P.PLANS.read_text())
bodies, gaps = plans["bodies"], plans["gaps"]
evid = {(Path(s["scenario"]).stem.replace("mechanic-", "", 1), s["bodyIndex"]): s for s in json.loads((FIX / "sprite-order-evidence.json").read_text())["samples"]}


class WSim(P.Sim):
    """Sim that records F after every window (frame, F)."""
    def apply_unit_log(self, tw, frames, log):
        self.unit += 1
        k = 0
        for w, f in zip(tw, frames):
            one = [w]
            before_unit = self.unit
            self.unit = before_unit - 1  # apply_unit increments; keep one unit id for the whole unit
            # re-use the parent window logic by applying a 1-window unit but keep (unit,k) bookkeeping
            self.unit = before_unit
            # inline copy of Sim.apply_unit body for one window
            self.seq += 1
            if "C" in w:
                for _, _, mode in w["C"]:
                    free = [s for s in range(64) if s not in self.occ]
                    s = free[0] if mode != "e" else free[-1]
                    self.life[(self.unit, k)] = s
                    self.rank[s] = (self.seq, self.F.index(s))
                    self.occ.add(s); k += 1
                made = [self.life[(self.unit, kk)] for kk in range(k - len(w["C"]), k)]
                self.F = [s for s in self.F if s not in made]
            if "D" in w:
                slots = []
                for t in w["D"]:
                    if t[0] == "n": slots.append(self.life[(self.unit, t[1])])
                    elif t[0] == "c": slots.append(self.surv[self.unit - t[1]][t[2]])
                    else: slots.append(t[1])
                if w.get("cls") == "FDERIVED":
                    pws = dict(zip(slots, w["pw"]))
                    slots.sort(key=lambda sl: (pws[sl], self.rank[sl]))
                self.occ -= set(slots)
                self.F = slots + [s for s in self.F if s not in slots]
            log.append((f, list(self.F), sorted(self.occ)))
        self.surv[self.unit] = [self.life[(self.unit, kk)] for kk in range(k) if self.life[(self.unit, kk)] in self.occ]


def F_at(log, n, F0):
    cur = F0
    for f, F, _ in log:
        if f <= n: cur = F
        else: break
    return cur


def raw_for(name):
    for d in (FIX / "sprite-order-event-raw", FIX / "order-consumer-raw"):
        p = d / name
        if p.exists():
            dd, rows = M.load(p)
            seq = M.frames_of(rows, dd["lastFrame"])
            return {n: r for n, r in seq}
    return None


def obs_free(raw, n):
    if raw is None or n not in raw: return None
    r = raw[n]
    return M.free_order(r["order"], r["mask"])


def rel(F, slots):
    s = set(slots)
    return [x for x in F if x in s]


def replay(sc, ti):
    """provider-mode replay; returns dict for target body unit index ti (None if preceded by a non-EXACT unit)"""
    T = P.tokenize_scenario(sc)
    sim = WSim(); F0 = list(sim.F); log = []
    U = sc["units"]; ok = True
    for ui, (u, tw) in enumerate(zip(U, T)):
        frames = [w["f"] for w in u["windows"]]
        if ui == ti:
            # target body: observed tokens for its own windows (own-body KEYS groups only matter AFTER the queried frame)
            if ok:
                sim.apply_unit_log(tw, frames, log)
            return {"ok": ok, "F0": F0, "log": log, "ownWindows": [(w["f"], w.get("C"), w.get("D")) for w in u["windows"]], "frame": u["frame"],
                    "observedFreeAtEdge": u["observedFreeAtEdge"], "ownTW": tw, "ownFrames": frames, "sim": sim}
        if u["kind"] == "body":
            if u["truncated"]: return None
            key = P.ukey(sc, u); r = bodies[key]
        else:
            if u["last"]: return None
            key = P.gkey(sc, U, ui); r = gaps[key]
        if r["verdict"] != "EXACT-PLAN":
            ok = False
        if not ok:
            continue
        planw = [dict(pw_, cls=ow.get("cls", "SINGLE")) for pw_, ow in zip(r["plan"], tw)]
        sim.apply_unit_log(planw, frames, log)
    return None


def _ranges(xs):
    out = []
    for x in xs:
        if out and out[-1][1] == x - 1: out[-1][1] = x
        else: out.append([x, x])
    return out


def dense(path):
    return json.load(gzip.open(ROOT / path))["frames"]


def literals():
    """(scenario stem, move, bodyOfMove) -> dict(kind, order, slots|None, traceFrame|None, src)"""
    L = {}
    def fx(name): return json.loads((CF / (name + ".json")).read_text())
    for stem, mv, nm in [("flamethrower-player-onix-opponent-murkrow", 53, None), ("flamethrower-opponent-onix-player-murkrow", 53, None)]:
        a = fx(stem)["animationProfile"]; L[(stem, mv, 0)] = dict(kind="fixture-subset", order=a["spriteOrderSeed"], slots=a["flameSpriteSlots"], traceFrame=None, src=f"tools/compare/fixtures/{stem}.json animationProfile.spriteOrderSeed")
    for stem in ("blaze-kick-player-onix-opponent-murkrow", "blaze-kick-opponent-onix-player-murkrow"):
        a = fx(stem)["animationProfile"]; L[(stem, 299, 0)] = dict(kind="fixture-subset", order=a["spriteOrderSeed"], slots=a["spriteSlots"], traceFrame=None, src=f"tools/compare/fixtures/{stem}.json animationProfile.spriteOrderSeed")
    for stem, mv, sc_stem in [("rock-throw-player-graveler-opponent-onix", 88, None), ("rock-throw-opponent-graveler-player-onix", 88, None),
                              ("mud-slap-pidgeotto-onix", 189, None), ("mud-slap-player-pidgeotto-onix", 189, None),
                              ("sand-attack-pidgeotto-onix", 28, None), ("sand-attack-player-pidgeotto-onix", 28, None)]:
        a = fx(stem)["animationProfile"]; L[(stem, mv, 0)] = dict(kind="fixture-64", order=a["spriteOrderSeed"], slots=None, traceFrame=None, src=f"tools/compare/fixtures/{stem}.json animationProfile.spriteOrderSeed")
    ev = json.loads((CF / "grudge-evidence.json").read_text())["orientations"]
    for o, stem in (("player-back", "grudge-player-haunter-opponent-onix"), ("opponent-front", "grudge-opponent-haunter-player-onix")):
        rows = dense(ev[o]["denseState"])
        flames = [sp["slot"] for sp in rows[46]["sprites"] if (sp.get("template") or {}).get("symbol") == "gGrudgeFlameSpriteTemplate"]
        L[(stem, 288, 0)] = dict(kind="dense-subset", order=[x for x in rows[45]["spriteOrder"] if x in flames], slots=flames, traceFrame=rows[45]["frame"], src=f"{ev[o]['denseState']} rows[45].spriteOrder filtered to flame slots (grudgeFramebuffer.ts:62-63)")
    ev = json.loads((CF / "dive-evidence.json").read_text())["orientations"]
    for o, stem in (("player-back", "dive-player-chinchou-opponent-onix"), ("opponent-front", "dive-opponent-chinchou-player-onix")):
        rows = dense(ev[o]["denseState"]); setup = rows[:ev[o]["bodyWindows"][0]["frameCount"]]; attack = rows[ev[o]["bodyWindows"][0]["frameCount"]:]
        # slots: ball + splash + droplets (all sprites created in the setup body per the event table; use sprites present at seedAge+1 not present at 0)
        def new(rows_, age):
            prev = {sp["slot"] for sp in rows_[age - 1]["sprites"]}; return [sp["slot"] for sp in rows_[age]["sprites"] if sp["slot"] not in prev]
        L[(stem, 291, 0)] = dict(kind="dense-64", order=setup[9]["spriteOrder"], slots=None, traceFrame=setup[9]["frame"], src=f"{ev[o]['denseState']} setup rows[9].spriteOrder (diveFramebuffer.ts:82-88; accepted literal is this filtered to the body's slots)")
        L[(stem, 291, 1)] = dict(kind="dense-64", order=attack[15]["spriteOrder"], slots=None, traceFrame=attack[15]["frame"], src=f"{ev[o]['denseState']} attack rows[15].spriteOrder")
    mg = json.loads((CF / "magnitude-dense-evidence.json").read_text())["bodies"]
    names = {"regular-player": "magnitude-regular-player-graveler-opponent-onix", "regular-opponent": "magnitude-regular-opponent-graveler-player-onix",
             "intense-player": "magnitude-intense-player-camerupt-opponent-onix", "intense-opponent": "magnitude-intense-opponent-camerupt-player-onix"}
    for b in mg:
        rows = dense(b["denseState"])
        L[(names[b["id"]], 222, 0)] = dict(kind="dense-64", order=rows[0]["spriteOrder"], slots=None, traceFrame=rows[0]["frame"], src=f"{b['denseState']} rows[0].spriteOrder (magnitudeFramebuffer.ts:82 spriteOrder: first.spriteOrder)")
    return L


def cmp_lit(lit, F, slots_alloc):
    if lit["kind"].endswith("-64"):
        a = [x for x in lit["order"] if x not in OCC]; b = list(F)
        return a == b, (None if a == b else {"literalFree": a[:14], "other": b[:14]})
    a = lit["order"]; b = rel(F, lit["slots"])
    return a == b, (None if a == b else {"literal": a, "other": b})


def main():
    LIT = literals()
    out = {"schema": "order-consumer-seeds/v1", "offsetProbeFrameMinusTraceFrame": OFFSET, "scenarios": [], "frameOffsetChecks": []}
    for sc in table:
        if sc["move"] not in TARGET: continue
        U = sc["units"]
        stem = sc["file"].split("-mechanic-")[1][:-7]
        raw = raw_for(sc["file"])
        # target bodies = body units whose mv in TARGET
        nth = {}
        for ui, u in enumerate(U):
            if u["kind"] != "body" or u["mv"] not in TARGET: continue
            body_no = nth.get(u["mv"], 0); nth[u["mv"]] = body_no + 1
            r = replay(sc, ui)
            rec = {"file": sc["file"], "scenario": stem, "move": u["mv"], "bodyOfMove": body_no, "unitIndex": ui, "attackerSide": sc["side"],
                   "bodyFrame": u["frame"], "entryMatchesProvider": sc["entryMatchesProvider"], "rawAvailable": raw is not None}
            ev = evid.get((stem, body_no)) if u["mv"] == sc["move"] else None
            if ev:
                rec["evidenceActivation"] = ev["activation"]; rec["offset"] = u["frame"] - ev["activation"]
                out["frameOffsetChecks"].append(rec["offset"])
            if r is None or not r["ok"]:
                rec["providerValid"] = False
                rec["reason"] = "preceded by a non-EXACT-PLAN unit (production provider would invalidate)" if r is not None else "no replay"
                out["scenarios"].append(rec); continue
            wins = u["windows"]
            first_c = next((w for w in wins if w.get("C")), None)
            f0 = first_c["f"] if first_c else None
            cfs = [(w["f"], [s for s, _ in w["C"]]) for w in wins if w.get("C")]
            allocSlots = [s for _, cs in cfs for s in cs]
            Fedge = F_at(r["log"], u["frame"] - 1, r["F0"]) if r["log"] else r["F0"]
            rec.update(providerValid=True, providerFAtEdge=Fedge, observedFreeAtEdge=u["observedFreeAtEdge"], edgeMatchesObserved=Fedge == u["observedFreeAtEdge"],
                       firstCreateFrame=f0, createFrames=[[f, cs] for f, cs in cfs][:40], allocSlotsInCreationOrder=allocSlots)
            if f0 is not None:
                Ff = F_at(r["log"], f0 - 1, r["F0"])
                of = obs_free(raw, f0 - 1)
                rec.update(providerFBeforeFirstCreate=Ff, observedFBeforeFirstCreate=of, firstCreateMatchesObserved=(of == Ff) if of is not None else None,
                           firstCreateSlots=cfs[0][1])
            lit = LIT.get((stem, u["mv"], body_no))
            if lit:
                n0 = (lit["traceFrame"] + OFFSET) if lit["traceFrame"] is not None else (f0 - 1 if f0 else u["frame"])
                Fp = F_at(r["log"], n0, r["F0"]); Fo = obs_free(raw, n0)
                pm, pd = cmp_lit(lit, Fp, None)
                om, od = cmp_lit(lit, Fo, None) if Fo is not None else (None, None)
                # frames in [edge-2, first create + 30] where literal == observed / == provider
                scan = {"observed": [], "provider": []}
                for n in range(u["frame"] - 2, (f0 or u["frame"]) + 40):
                    if raw is not None and obs_free(raw, n) is not None and cmp_lit(lit, obs_free(raw, n), None)[0]: scan["observed"].append(n)
                    if cmp_lit(lit, F_at(r["log"], n, r["F0"]), None)[0]: scan["provider"].append(n)
                cw = []
                for f, cs in cfs[:6]:
                    Fb = F_at(r["log"], f - 1, r["F0"]); ob = obs_free(raw, f - 1)
                    cw.append({"createFrame": f, "createdSlots": cs, "providerMatchesLiteral": cmp_lit(lit, Fb, None)[0], "observedMatchesLiteral": None if ob is None else cmp_lit(lit, ob, None)[0]})
                occ_ok = None
                if lit["kind"].endswith("-64") and raw is not None and n0 in raw:
                    occ_ok = [x for x in lit["order"] if x in OCC] == [x for x in raw[n0]["order"] if x in OCC]
                rec["literal"] = dict(occupiedPrefixEqualsObserved=occ_ok, matchBeforeEachCreateWindow=cw, src=lit["src"], kind=lit["kind"], order=lit["order"] if lit["kind"] != "fixture-64" and lit["kind"] != "dense-64" else [x for x in lit["order"] if x not in OCC][:14] + ["..."],
                                      slots=lit["slots"], frameChecked=n0, providerMatches=pm, providerDiff=pd, observedMatches=om, observedDiff=od,
                                      framesLiteralEqualsObserved=_ranges(scan["observed"]), framesLiteralEqualsProvider=_ranges(scan["provider"]),
                                      firstCreateFrame=f0, edgeFrame=u["frame"])
            out["scenarios"].append(rec)
    # Rock Slide (157): no BattleLab scenario; accepted fixture seeds are static literals. Compare their free tails with the known-entry first-action F.
    import re
    ts = (ROOT / "src/engine/spriteOrderProvider.ts").read_text()
    entry_F, _ = P.ts_entry()
    def lit_from(path, name):
        t = Path(path).read_text(); m = re.search(name + r"[^=]*=\s*\[(.*?)\]", t, re.S); return [int(x) for x in re.findall(r"\d+", m.group(1))]
    rs = {"src/animation/sceneOnPresentation.ts GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED": lit_from(ROOT / "src/animation/sceneOnPresentation.ts", "GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED"),
          "src/engine/battleMenu.ts ROCK_SLIDE_ORDER_SEED": lit_from(ROOT / "src/engine/battleMenu.ts", "ROCK_SLIDE_ORDER_SEED")}
    out["rockSlideStatic"] = {k: {"freeTail": [x for x in v if x not in OCC][:8] + ["..."], "equalsKnownEntryFirstActionF": [x for x in v if x not in OCC] == entry_F, "occupiedPrefix": [x for x in v if x in OCC]} for k, v in rs.items()}
    print("rock slide static", {k: v["equalsKnownEntryFirstActionF"] for k, v in out["rockSlideStatic"].items()})
    out["frameOffsetChecks"] = sorted(set(out["frameOffsetChecks"]))
    if "--write" in sys.argv:
        (FIX / "order-consumer-seeds.json").write_text(json.dumps(out, indent=1) + "\n")
    for s in out["scenarios"]:
        l = s.get("literal")
        print(s["scenario"], s["move"], "body", s["bodyOfMove"], "valid", s["providerValid"], "edge", s.get("edgeMatchesObserved"), "fc", s.get("firstCreateFrame"), s.get("firstCreateMatchesObserved"),
              "| LIT prov", l and l["providerMatches"], "obs", l and l["observedMatches"], "@", l and l["frameChecked"], "litEqObs", l and l["framesLiteralEqualsObserved"], "litEqProv", l and l["framesLiteralEqualsProvider"])
    print("offsets", out["frameOffsetChecks"])


main()
