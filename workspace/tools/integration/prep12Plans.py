#!/usr/bin/env python3
"""prep12: Random2 draw plans from direct-mGBA attribution probes (tools/integration/random2RouteProbe.py --lab --step-anim).

For each C-only move: activation frame A (first anim-active frame of Move_<X>; == accepted window start), activation value
(gRng2 after frame A), draw frames with ageOffset = D - A, lag (zero-step) frames before each draw, draws per frame with their
source call sites, and the word -> config-field transform. The plan alone (activation value + offsets + lag counts + draw counts)
is then replayed and compared with the ACCEPTED pinned inputs (fixture / evidence TS / dense-state corpus). No emulator here.
usage: prep12Plans.py PROBE_DIR OUT_JSON [move ...]     (PROBE_DIR holds <move>-r1.json / -r2.json from prep12Probes.sh)
"""
from __future__ import annotations

import gzip
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PD = Path(sys.argv[1])
OUT = Path(sys.argv[2])
ONLY = sys.argv[3:]


def lcg(x: int) -> int:
    return (x * 1103515245 + 24691) & 0xFFFFFFFF


def lcgn(x: int, n: int) -> int:
    for _ in range(n):
        x = lcg(x)
    return x


def jl(p):
    return json.loads((ROOT / p).read_text())


def dense(p):
    return json.load(gzip.open(ROOT / p))


class Probe:
    def __init__(self, path: Path):
        d = json.loads(path.read_text())
        self.d = d
        n = d["frames"]
        self.steps = [0] * (n + 2)
        self.ctx = [None] * (n + 2)
        for r in d["runs"]:
            for f in range(r["from"], r["to"] + 1):
                self.steps[f] = r["steps"]
                self.ctx[f] = r["ctx"]
        self.val = [d["anchorRng2"]] + [0] * n
        for f in range(1, n + 1):
            self.val[f] = lcgn(self.val[f - 1], self.steps[f])
        assert all(self.val[r["to"]] == r["endValue"] for r in d["runs"]), "value reconstruction"
        self.draws = {x["frame"]: x for x in d["singleSteppedNonTrivial"]}

    def label(self, f):
        return self.ctx[f][3].split("+")[0] if self.ctx[f][2] else None

    def bodies(self, base):
        """[(A, lastActive)] for each contiguous anim-active stretch whose first label is `base`."""
        out, f, n = [], 1, self.d["frames"]
        while f <= n:
            if self.ctx[f][2] and self.label(f) == base and not (f > 1 and self.ctx[f - 1][2] and self.label(f - 1) == base):
                g = f
                while g + 1 <= n and self.ctx[g + 1][2]:
                    g += 1
                out.append((f, g))
                f = g
            f += 1
        return out

    def plan(self, a, end):
        """draw groups in [a, end]: offset, lag frames in (a, D), draw count, ordered call sites"""
        groups = []
        for f in sorted(self.draws):
            if a <= f <= end:
                cs = self.draws[f]["callers"]
                rfu = 1 if cs[0].startswith("RfuMain1") else 0
                assert rfu == 1 and self.steps[f] == len(cs), (f, cs, self.steps[f])
                groups.append({"ageOffset": f - a, "lagBefore": sum(1 for g in range(a + 1, f) if self.steps[g] == 0),
                               "count": len(cs) - 1, "sites": [c for c in cs[1:]]})
        return groups


def replay(v_a: int, groups: list[dict]) -> list[list[int]]:
    """words per group from the activation value and the plan alone"""
    out, prior, nonlag_prev = [], 0, 0
    for g in groups:
        nonlag = (g["ageOffset"] - 0) - g["lagBefore"]  # frames a+1..D that step once (D itself is non-lag, RfuMain1 first)
        v = lcgn(v_a, nonlag + prior)
        ws = []
        for _ in range(g["count"]):
            v = lcg(v)
            ws.append(v >> 16)
        out.append(ws)
        prior += g["count"]
    return out


def compress(groups):
    """merge repeating (count, sites) with constant stride into runs for the plans.json"""
    out = []
    for g in groups:
        k = (g["count"], tuple(g["sites"]))
        if out and out[-1]["_k"] == k and (len(out[-1]["ageOffsets"]) < 2 or g["ageOffset"] - out[-1]["ageOffsets"][-1] == out[-1]["ageOffsets"][1] - out[-1]["ageOffsets"][0]) :
            out[-1]["ageOffsets"].append(g["ageOffset"]); out[-1]["lagBefore"].append(g["lagBefore"])
        else:
            out.append({"_k": k, "ageOffsets": [g["ageOffset"]], "lagBefore": [g["lagBefore"]], "count": g["count"], "sites": g["sites"]})
    for o in out:
        o.pop("_k")
        o["groups"] = len(o["ageOffsets"])
    return out


SITE_INFO = {  # call site (symbol+offset from the ROM elf) -> (word transform, config field that consumes it)
    "AnimFistOrFootRandomPos+0x96": ("% (targetWidth/2)  [battle_anim_fight.c:487]", "fistRandom.x"),
    "AnimFistOrFootRandomPos+0xaa": ("% (targetHeight/4)  [battle_anim_fight.c:488]", "fistRandom.y"),
    "AnimFistOrFootRandomPos+0xc0": ("& 1 negates x  [battle_anim_fight.c:490]", "fistRandom.xSign"),
    "AnimFistOrFootRandomPos+0xd4": ("& 1 negates y  [battle_anim_fight.c:492]", "fistRandom.ySign"),
    "AnimSprayWaterDroplet+0x8": ("& 0x1ff  [battle_anim_flying.c:1106]", "dropletRandom[k].v1"),
    "AnimSprayWaterDroplet+0x10": ("& 0x7f  [battle_anim_flying.c:1107]", "dropletRandom[k].v2"),
    "AnimMiniTwinklingStar+0x8": ("& 3 == 0 ? tile+4 : tile+5  [battle_anim_effects_3.c:2147]", "twinkles[i].tile / tileOffset"),
    "AnimMiniTwinklingStar+0x34": ("& 7, >3 negated  [battle_anim_effects_3.c:2153]", "twinkles[i].y2 / yOffset"),
    "AnimHyperBeamOrb+0x8": ("u16 % 8 (StartSpriteAnim)  [battle_anim_effects_1.c:2339]", "animationProfile.orbs[i].animation"),
    "AnimHyperBeamOrb+0x56": ("(& 31) + 64  [battle_anim_effects_1.c:2349-2351]", "animationProfile.orbs[i].speed"),
    "AnimHyperBeamOrb+0x92": ("& 0xff  [battle_anim_effects_1.c:2356]", "animationProfile.orbs[i].phase"),
    "AnimDirtScatter+0x2e": ("& 0x1f, >16 -> 16-x; data[2]=targetX+x; xStep=(|dx|<<8 as u16)/20, LSB=left  [battle_anim_ground.c:213]", "animationProfile.mud|dirt[i].xStep"),
    "AnimDirtScatter+0x38": ("& 0x1f, >16 -> 16-y; data[4]=targetY+y; yStep likewise  [battle_anim_ground.c:214]", "animationProfile.mud|dirt[i].yStep"),
    "AnimHitSplatRandom+0x48": ("% 48, then -24 into x2  [battle_anim_normal.c:1062]", "visualRandom.x"),
    "AnimHitSplatRandom+0x60": ("% 24, then -12 into y2  [battle_anim_normal.c:1063]", "visualRandom.y"),
}
results = {}


def finish(move, body_base, probe, which, pinned_desc, pinned, predicted_fn, fields, accepted_window_start=None, extra=None):
    bodies = probe.bodies(body_base)
    a, end = bodies[which]
    v_a = probe.val[a]
    groups = probe.plan(a, end)
    words = replay(v_a, groups)
    predicted = predicted_fn(words) if groups else None
    # independent check: replayed words == the words observed at the draw frames (consistency of the plan model itself)
    observed = []
    for g in groups:
        f = a + g["ageOffset"]
        v, ws = probe.val[f - 1], []
        for c in probe.draws[f]["callers"]:
            v = lcg(v)
            if not c.startswith("RfuMain1"):
                ws.append(v >> 16)
        assert v == probe.val[f]
        observed.append(ws)
    row = {
        "move": move, "scenario": probe.d["trace"], "bodyLabel": body_base, "bodyIndex": which,
        "activationFrame": a, "lastActiveFrame": end, "acceptedWindowStart": accepted_window_start,
        "activationFrameMatchesAcceptedWindow": accepted_window_start == a if accepted_window_start is not None else None,
        "acceptedWindowStartMinusActivation": (accepted_window_start - a) if accepted_window_start is not None else None,
        "activationValue": v_a, "activationValueHex": f"0x{v_a:08X}",
        "drawFrames": len(groups), "drawsTotal": sum(g["count"] for g in groups),
        "lagFramesBeforeLastDraw": groups[-1]["lagBefore"] if groups else 0,
        "lagFramesInBody": sum(1 for g in range(a, end + 1) if probe.steps[g] == 0),
        "draws": [{"ageOffset": g["ageOffset"], "count": g["count"], "lagBefore": g["lagBefore"],
                   "transform": [SITE_INFO[x][0] for x in g["sites"]], "consumerField": [SITE_INFO[x][1] for x in g["sites"]], "sites": g["sites"]} for g in groups],
        "drawsCompressed": compress(groups), "wordToField": fields,
        "replayEqualsObservedWords": words == observed,
        "pinnedSource": pinned_desc,
    }
    if groups:
        row["pinned"] = pinned
        row["predicted"] = predicted
        row["reproduced"] = (predicted == pinned) if pinned is not None else None
        row["firstWords"] = words[0][:4]
    if extra:
        row.update(extra)
    results[move + (f"#{which}" if which else "")] = row
    return row


def want(m):
    return not ONLY or m in ONLY


def P(m):
    return Probe(PD / f"{m}-r1.json")


def sign_flip_ok(x):
    return x


# ---- DOUBLE_KICK -----------------------------------------------------------------------------------------------------
if want("double-kick"):
    fx = jl("tools/compare/fixtures/double-kick-player-nidorina-opponent-onix.json")
    pinned = [fx["fistRandom"][k] for k in ("x", "y", "xSign", "ySign")]
    pr = P("double-kick")
    finish("double-kick", "Move_DOUBLE_KICK", pr, 0, "tools/compare/fixtures/double-kick-player-nidorina-opponent-onix.json fistRandom",
           pinned, lambda w: w[0], {"word0": "fistRandom.x (x %= width/2)", "word1": "fistRandom.y (y %= height/4)", "word2": "fistRandom.xSign (&1 negates x)", "word3": "fistRandom.ySign (&1 negates y)"},
           fx["denseWindow"]["startFrame"])
    # second hit (second body) of the same scenario
    finish("double-kick", "Move_DOUBLE_KICK", pr, 1, "none pinned (second hit of the same turn)", None, lambda w: w[0], {"same as hit 1": "per-body"})

# ---- THRASH ----------------------------------------------------------------------------------------------------------
if want("thrash"):
    fx = jl("tools/compare/fixtures/thrash-player-tauros-opponent-onix.json")
    pinned = [[f[k] for k in ("x", "y", "xSign", "ySign")] for f in fx["fistRandom"]]
    pr = P("thrash")
    finish("thrash", "Move_THRASH", pr, 0, "tools/compare/fixtures/thrash-player-tauros-opponent-onix.json fistRandom[3]",
           pinned, lambda w: w, {"group g word0..3": "fistRandom[g].x / y / xSign / ySign (same transforms as Double Kick)"}, fx["denseWindow"]["startFrame"])

# ---- ASTONISH --------------------------------------------------------------------------------------------------------
if want("astonish"):
    fx = jl("tools/compare/fixtures/astonish-player-loudred-opponent-onix.json")
    pinned = [[299, 127], [291, 74]]  # tools/compare/astonishEvidence.ts:62 (player-to-opponent)
    pr = P("astonish")
    finish("astonish", "Move_ASTONISH", pr, 0, "tools/compare/astonishEvidence.ts:62 dropletRandom (player-to-opponent)", pinned,
           lambda w: [[w[0][0] & 0x1FF, w[0][1] & 0x7F], [w[0][2] & 0x1FF, w[0][3] & 0x7F]] if len(w) == 1 else [[g[0] & 0x1FF, g[1] & 0x7F] for g in w],
           {"droplet k word0": "dropletRandom[k].v1 (& 0x1ff)", "droplet k word1": "dropletRandom[k].v2 (& 0x7f)"}, fx["sourceWindow"]["startFrame"])

# ---- HYPER BEAM ------------------------------------------------------------------------------------------------------
if want("hyper-beam"):
    dd = dense("tools/compare/evidence/hyper-beam-player-dense-state.json.gz")
    fr = dd["frames"]
    start = fr[0]["frame"]
    births = []
    for group in range(26):
        age = 110 + group * 3
        prev = [(s["slot"], s["template"]["symbol"]) for s in fr[age - 1]["sprites"] if s["template"]]
        births += [s for s in fr[age]["sprites"] if s["template"] and s["template"]["symbol"] == "gHyperBeamOrbSpriteTemplate" and (s["slot"], s["template"]["symbol"]) not in prev]
    # target/attacker picture centres from the first orb (tools/compare/hyperBeamFramebuffer.ts:93-110)
    tgt = fr[0]["battlerSprites"]["target"]
    from_center = None
    assert len(births) == 52
    pr = P("hyper-beam")
    # pinned (animNum, speed, phase) in the reducer's convention; speed inferred like hyperBeamFramebuffer.ts:55-67
    ac = births[0]["x"] - 20
    def infer(s, target):
        for speed in range(64, 96):
            dx, dy = target[0] - s["x"], target[1] - s["y"]
            dur = (abs(dx) << 4) // speed
            sx = (abs(dx) << 4) // dur
            sy = (abs(dy) << 4) // dur
            sx = (sx | 1) if dx < 0 else (sx & ~1)
            sy = (sy | 1) if dy < 0 else (sy & ~1)
            if s["data"][0] == dur - 2 and s["data"][1] == sx and s["data"][2] == sy and s["data"][3] == sx * 2 and s["data"][4] == sy * 2:
                return speed
        return None
    # target picture centre: ONIX opponent-front (176,42) per the accepted fixture (hyperBeamFramebuffer.ts uses first.battlerSprites.target)
    tc = (tgt["x"] + tgt.get("x2", 0), tgt["y"] + tgt.get("y2", 0)) if "x" in tgt else (176, 42)
    pinned = None
    CAND = None
    for cand in [(176, 42), tc]:
        sp = [infer(s, cand) for s in births]
        if None not in sp:
            CAND = cand
            pinned = [[s["animNum"], sp[i], (s["data"][5] - 48) & 0xFF] for i, s in enumerate(births)]
            break
    def stepdata(s, target, speed):
        dx, dy = target[0] - s["x"], target[1] - s["y"]
        dur = (abs(dx) << 4) // speed
        sx, sy = (abs(dx) << 4) // dur, (abs(dy) << 4) // dur
        sx = (sx | 1) if dx < 0 else (sx & ~1)
        sy = (sy | 1) if dy < 0 else (sy & ~1)
        return [dur - 2, sx, sy, sx * 2, sy * 2]

    def pred(w):
        flat = [x for g in w for x in g]
        orbs = [flat[i:i + 3] for i in range(0, len(flat), 3)]
        out = []
        for i, o in enumerate(orbs):
            speed = (o[1] & 31) + 64
            # speed is only observable through the translation step data (several speeds give identical data):
            # compare the data the predicted speed produces with the corpus sprite's data[0..4]
            same = stepdata(births[i], CAND, speed) == births[i]["data"][:5]
            out.append([o[0] & 7, speed if not same else pinned[i][1], o[2] & 0xFF])
        return out
    finish("hyper-beam", "Move_HYPER_BEAM", pr, 0, "tools/compare/evidence/hyper-beam-player-dense-state.json.gz births (animNum, inferred speed, data[5]-48)",
           pinned, pred, {"orb word0": "orbs[i].animation (& 7: StartSpriteAnim(animNum % 8))", "orb word1": "orbs[i].speed ((w & 31) + 64; observable only via the translation step data, equivalence-class compared)", "orb word2": "orbs[i].phase (w & 0xff)"}, 79,
           {"note": "orbs are created by the HyperBeamOrbs task (separate script label) inside the same active stretch of Move_HYPER_BEAM"})


def twinkle(w):
    tile = 4 if (w & 3) == 0 else 5
    return tile


def twinkle_y(w):
    y = w & 7
    return -y if y > 3 else y


def twinkles(w):
    flat = [x for g in w for x in g]
    return [(twinkle(flat[i]), twinkle_y(flat[i + 1])) for i in range(0, len(flat), 2)]


# ---- METEOR MASH -----------------------------------------------------------------------------------------------------
if want("meteor-mash"):
    fx = jl("tools/compare/fixtures/meteor-mash-player-metang-opponent-onix.json")
    pinned = [(t["tile"], t["y2"]) for t in fx["twinkles"]]
    pr = P("meteor-mash")
    finish("meteor-mash", "Move_METEOR_MASH", pr, 0, "tools/compare/fixtures/meteor-mash-player-metang-opponent-onix.json twinkles[48]",
           pinned, lambda w: twinkles(w), {"twinkle i word0": "twinkles[i].tile (w&3==0 ? +4 : +5)", "twinkle i word1": "twinkles[i].y2 (w&7, >3 negated)"}, fx["denseWindow"]["startFrame"])

# ---- WISH ------------------------------------------------------------------------------------------------------------
if want("wish"):
    fx = jl("tools/compare/fixtures/wish-player-illumise-opponent-onix.json")
    pinned = [(t["tileOffset"], t["yOffset"]) for t in fx["twinkles"]]
    pr = P("wish")
    finish("wish", "Move_WISH", pr, 0, "tools/compare/fixtures/wish-player-illumise-opponent-onix.json twinkles[21]",
           pinned, lambda w: twinkles(w), {"twinkle i word0": "twinkles[i].tileOffset (w&3==0 ? 4 : 5)", "twinkle i word1": "twinkles[i].yOffset (w&7, >3 negated)"}, fx["sourceWindow"]["startFrame"])

# ---- MUD SLAP / SAND ATTACK (AnimDirtScatter) -----------------------------------------------------------------------
def dirt_fit(move, fixture, key, label, window_start):
    fx = jl(fixture)
    prof = fx["animationProfile"][key]
    pinned = [[m["xStep"], m["yStep"]] for m in prof]
    pr = P(move)

    def steps(dx, dy):
        xd = ((abs(dx) << 8) & 0xFFFF) // 20
        yd = ((abs(dy) << 8) & 0xFFFF) // 20
        return [(xd | 1) if dx < 0 else (xd & ~1), (yd | 1) if dy < 0 else (yd & ~1)]

    def offs(w):
        xo, yo = w & 0x1F, (w >> 0) & 0x1F
        return xo, yo

    def pred_for(c):
        def f(w):
            flat = [x for g in w for x in g]
            out = []
            for i in range(0, len(flat), 2):
                xo, yo = flat[i] & 0x1F, flat[i + 1] & 0x1F
                xo = 16 - xo if xo > 16 else xo
                yo = 16 - yo if yo > 16 else yo
                out.append(steps(c[0] + xo, c[1] + yo))
            return out
        return f
    # (tx - sx, ty - sy) is the only scenario constant (duration 20 from script arg 2); fit it, then check the geometry value
    sols = []
    a, end = pr.bodies(label)[0]
    words = replay(pr.val[a], pr.plan(a, end))
    for cx in range(-150, 151):
        for cy in range(-150, 151):
            if pred_for((cx, cy))(words) == pinned:
                sols.append((cx, cy))
    c = sols[0] if len(sols) == 1 else (None, None)
    row = finish(move, label, pr, 0, f"{fixture} animationProfile.{key}[30] (xStep, yStep)", pinned,
                 pred_for(c) if c[0] is not None else (lambda w: None),
                 {"dirt i word0": "xOffset = w & 0x1f, >16 -> 16-xOffset; data[2]=targetX+xOffset -> xStep = (|dx|<<8 as u16)/20, LSB=left",
                  "dirt i word1": "yOffset = w & 0x1f, same clamp; data[4]=targetY+yOffset -> yStep"}, window_start,
                 {"fittedScenarioConstant": {"targetMinusSource": list(c) if c[0] is not None else None, "uniqueSolutionsInRange(-150..150)": len(sols),
                  "geometryExpectation": "target (BATTLER_COORD_X_2,Y_PIC_OFFSET) minus source (attacker X_2 + 15 [player], Y_PIC_OFFSET + 15)"}})
    return row


if want("mud-slap"):
    dirt_fit("mud-slap", "tools/compare/fixtures/mud-slap-player-pidgeotto-onix.json", "mud", "Move_MUD_SLAP", 80)
if want("sand-attack"):
    dirt_fit("sand-attack", "tools/compare/fixtures/sand-attack-player-pidgeotto-onix.json", "dirt", "Move_SAND_ATTACK", 46)

# ---- FLAIL (natural-HP scenario: one body per power tier) ------------------------------------------------------------
if want("flail"):
    pr = Probe(PD / "flail-natural-r1.json")
    for power in (40, 80, 100, 150, 200):
        dd = dense(f"tools/compare/evidence/flail-natural-hp-player-back-power-{power}-dense-state.json.gz")
        fr = dd["frames"]
        hit = next(s for f in fr for s in f["sprites"] if s["template"] and s["template"]["symbol"] == "gRandomPosHitSplatSpriteTemplate")
        pinned = [[hit["x2"] + 24, hit["y2"] + 12]]
        a0 = fr[0]["frame"]
        idx = [i for i, (a, e) in enumerate(pr.bodies("Move_FLAIL")) if a == a0]
        assert idx, (power, a0, pr.bodies("Move_FLAIL"))
        row = finish("flail", "Move_FLAIL", pr, idx[0], f"flail-natural-hp-player-back-power-{power}-dense-state first gRandomPosHitSplatSpriteTemplate (x2+24, y2+12)", pinned,
                     lambda w: [[w[0][0] % 48, w[0][1] % 24]], {"word0": "visualRandom.x (% 48, then -24 into x2)", "word1": "visualRandom.y (% 24, then -12 into y2)"}, a0,
                     {"power": power, "activationValueEqualsDenseCorpus": fr[0]["animationRng"] == pr.val[a0]})
        results[f"flail@power{power}"] = results.pop("flail" + (f"#{idx[0]}" if idx[0] else ""))

# ---- NO-DRAW moves (census code C is a diagnostic echo of gRng2 only) ------------------------------------------------
def nodraw(move, label, window, pinned_start, pinned_desc, extra):
    pr = P(move)
    a, end = pr.bodies(label)[0]
    row = finish(move, label, pr, 0, pinned_desc, None, lambda w: None, {"none": "no Random2 draw anywhere in the body"}, window, extra)
    row["activationValueEqualsPinned"] = (pinned_start == pr.val[a]) if pinned_start is not None else None
    row["explicitDrawsInWholeProbe"] = sum(1 for x in pr.draws.values() if len(x["callers"]) > 1)
    return row


if want("hidden-power"):
    dd = dense("tools/compare/evidence/hidden-power-player-dense-state.json.gz")
    nodraw("hidden-power", "Move_HIDDEN_POWER", 77, dd["frames"][0]["animationRng"], "hidden-power-player-dense-state frames[0].animationRng (HiddenPowerAnimationProfile.animationRngSeed)", {})
if want("ice-beam"):
    dd = dense("tools/compare/evidence/ice-beam-player-dense-state.json.gz")
    nodraw("ice-beam", "Move_ICE_BEAM", dd["frames"][0]["frame"], dd["frames"][0]["animationRng"], "ice-beam-player-dense-state frames[0].animationRng (IceBeamAnimationProfile.animationRngStart 689912548)", {})
if want("water-spout"):
    dd = dense("tools/compare/evidence/water-spout-player-dense-state.json.gz")
    nodraw("water-spout", "Move_WATER_SPOUT", dd["frames"][0]["frame"], dd["frames"][0]["animationRng"], "water-spout-player-dense-state frames[0].animationRng (WaterSpoutLiveInputs.animationRng)", {})

# ---- alternate-species scenarios (plan SHAPE and activation, no accepted pin exists for them) ---------------------------------------
ALT = {"double-kick": ("Move_DOUBLE_KICK", "double-kick"), "astonish": ("Move_ASTONISH", "astonish"), "thrash": ("Move_THRASH", "thrash"),
       "meteor-mash": ("Move_METEOR_MASH", "meteor-mash"), "wish": ("Move_WISH", "wish"), "hyper-beam": ("Move_HYPER_BEAM", "hyper-beam"),
       "mud-slap": ("Move_MUD_SLAP", "mud-slap"), "sand-attack": ("Move_SAND_ATTACK", "sand-attack"), "flail": ("Move_FLAIL", "flail@power100")}
for move, (label, mainkey) in ALT.items():
    if not want(move) or not (PD / f"alt-{move}-r1.json").exists() or mainkey not in results:
        continue
    pa = Probe(PD / f"alt-{move}-r1.json")
    a, end = pa.bodies(label)[0]
    groups = pa.plan(a, end)
    main = results[mainkey]
    shape = compress(groups)
    same = [(g["ageOffsets"], g["lagBefore"], g["count"], g["sites"]) for g in shape] == [(g["ageOffsets"], g["lagBefore"], g["count"], g["sites"]) for g in main["drawsCompressed"]]
    words = replay(pa.val[a], groups)
    obs = []
    for g in groups:
        f = a + g["ageOffset"]; v, ws = pa.val[f - 1], []
        for c in pa.draws[f]["callers"]:
            v = lcg(v)
            if not c.startswith("RfuMain1"):
                ws.append(v >> 16)
        obs.append(ws)
    off = main["acceptedWindowStartMinusActivation"]
    results[mainkey]["alternate"] = {
        "scenario": pa.d["trace"], "activationFrame": a, "activationValueHex": f"0x{pa.val[a]:08X}", "activationValue": pa.val[a],
        "planShapeIdenticalToAccepted": same, "replayEqualsObservedWords": words == obs,
        "denseWindowFromActivation": {"startFrame": a + off if off is not None else None, "note": "alternate window start = activation frame + the accepted (window start - activation) offset; length = the accepted window's frameCount"},
        "firstWords": words[0] if words else None,
    }

OUT.parent.mkdir(parents=True, exist_ok=True)


def determinism(probe_name):
    a, b = (json.loads((PD / f"{probe_name}-r{r}.json").read_text()) for r in (1, 2))
    diff = [k for k in a if a[k] != b[k]]
    return {"runsSha1": a["runsSha1"], "runsSha1Run2": b["runsSha1"], "allFieldsEqualExceptFinalStateSha1": diff in ([], ["finalStateSha1"]),
            "finalStateSha1Equal": a["finalStateSha1"] == b["finalStateSha1"], "frames": a["frames"], "anchorRng2": a["anchorRng2"]}


PROBE_OF = {"flail": "flail-natural"}
moves = {}
for key, row in results.items():
    mv = key.split("#")[0].split("@")[0]
    moves.setdefault(mv, []).append((key, row))
plans = {"schema": "prep12-random2-plans/v1", "generatedBy": "tools/integration/prep12Plans.py",
         "convention": "activationValue = gRng2 after the first anim-active frame A (== the accepted dense window's first row where the window starts at the script activation); "
                       "ageOffset = D - A for draw frame D; each draw frame takes one RfuMain1 step (non-lag frames) then `count` Random2 draws; word = state >> 16; "
                       "words = replay(activationValue, plan) with no probe data other than the plan itself",
         "moves": {}}
for mv, entries in moves.items():
    probe_name = PROBE_OF.get(mv, mv)
    det = determinism(probe_name)
    alt = (PD / f"alt-{mv}-r1.json").exists()
    if alt:
        det["alternate"] = determinism(f"alt-{mv}")
    ents = []
    for key, row in entries:
        ents.append({
            "key": key, "bodyLabel": row["bodyLabel"], "activationFrame": row["activationFrame"], "acceptedActivationValue": row["activationValue"],
            "acceptedActivationValueHex": row["activationValueHex"], "acceptedWindowStart": row["acceptedWindowStart"],
            "acceptedWindowStartMinusActivation": row["acceptedWindowStartMinusActivation"],
            "draws": [{k: g[k] for k in ("ageOffset", "count", "transform", "consumerField")} for g in row["draws"]],
            "drawsTotal": row["drawsTotal"], "drawFrames": row["drawFrames"], "lagFramesBeforeLastDraw": row["lagFramesBeforeLastDraw"],
            "lagFramesInBody": row["lagFramesInBody"], "pinnedSource": row["pinnedSource"], "pinnedWords": row.get("pinned"),
            "predictedFromPlan": row.get("predicted"), "reproduced": row.get("reproduced"),
            "replayEqualsObservedWords": row["replayEqualsObservedWords"], "wordToField": row["wordToField"],
            **({"activationValueEqualsPinned": row["activationValueEqualsPinned"]} if "activationValueEqualsPinned" in row else {}),
            **({"alternate": row["alternate"]} if "alternate" in row else {}),
            **({"fittedScenarioConstant": row["fittedScenarioConstant"]} if "fittedScenarioConstant" in row else {}),
            **({"power": row["power"], "activationValueEqualsDenseCorpus": row["activationValueEqualsDenseCorpus"]} if "power" in row else {}),
        })
    primary = ents[0]
    plans["moves"][mv] = {"scenario": entries[0][1]["scenario"], "determinism": det, "drawsPerBody": primary["drawsTotal"], "entries": ents,
                          "reproducedAll": (all(e["reproduced"] for e in ents if e["reproduced"] is not None) if any(e["reproduced"] is not None for e in ents) else None)}
OUT.write_text(json.dumps(plans, indent=1) + "\n")
rdir = OUT.parent / "receipts"
rdir.mkdir(exist_ok=True)
for mv, m in plans["moves"].items():
    compact = {"move": mv, "scenario": m["scenario"], "determinism": m["determinism"], "drawsPerBody": m["drawsPerBody"], "reproducedAll": m["reproducedAll"],
               "entries": [{k: v for k, v in e.items() if k not in ("draws", "wordToField", "predictedFromPlan", "pinnedWords")} | {"drawAgeOffsets": [d["ageOffset"] for d in e["draws"]],
                            "drawCounts": sorted({d["count"] for d in e["draws"]})} for e in m["entries"]]}
    (rdir / f"{mv}.json").write_text(json.dumps(compact, indent=1) + "\n")
for mv, m in plans["moves"].items():
    for e in m["entries"]:
        print(e["key"], "A=%s" % e["activationFrame"], e["acceptedActivationValueHex"], "draws=%s/%s frames" % (e["drawsTotal"], e["drawFrames"]), "lagBeforeLast=%s" % e["lagFramesBeforeLastDraw"],
              "reproduced=%s" % e["reproduced"], "replay==observed=%s" % e["replayEqualsObservedWords"], "deterministic=%s" % m["determinism"]["allFieldsEqualExceptFinalStateSha1"])
