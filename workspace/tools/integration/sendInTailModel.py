#!/usr/bin/env python3
"""Opponent send-in healthbox-slide start model, validated against the committed 339-species ROM sweep.

  slide(sp) = BASE + max(S[sp], A[animId[sp]] + (delay[sp] > 0 ? delay[sp] - 1 : 0))     (frames after send-in start; BASE = 46)

S      = sum of ANIMCMD_FRAME durations of sAnim_<Name>_1 (front sprite frame animation, `sendInTailExtractFrames.py`)
animId = sMonFrontAnimIdsTable, delay = sMonAnimationDelayTable (`sendInTailExtract.py`)
A      = duration of the sMonAnimFunctions[animId] sprite callback. Learned from the sweep (see doc: not yet derived from source).
Usage: sendInTailModel.py [--write]   (--write regenerates fixtures/send-in-tail/{anim-duration.json,model-validation.json})"""
import json, re, sys, collections, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
fx = root / "tools/integration/fixtures"
T = json.load(open(fx / "send-in-tail/front-anim-tables.json"))
S = json.load(open(fx / "send-in-tail/front-sprite-frames.json"))
BASE = 46
CASTFORM = 385  # emerges one frame late on both sides (y2start 30/59, slide 149/76): sweep-fitted exception, cause not located in source
HAS_NO_TWO_FRAMES = set()  # Castform/Deoxys/Spinda/Unown skip StartSpriteAnim(sprite, 1) (pokemon.c:6988) but zeroing S made Spinda mismatch: kept as-is

def sweep(name):
    out = {}
    for l in open(fx / "forced-switch" / name):
        p = l.split()
        if p[1] == "FAILED":
            continue
        g = lambda k: (lambda m: int(m.group(1)) if m else None)(re.search(k + r" (\d+)", l))
        out[int(p[0])] = dict(cry=int(p[1]), slide=g("hbslide"), idle=g("ctrlIdle"), txt=g("txtStart"))
    return out

def frames(sp):
    return 0 if sp in HAS_NO_TWO_FRAMES else S.get(str(sp), 0)

def eff(sp):
    a, d = T[str(sp)]
    return a, (d - 1 if d > 0 else 0)

def learn(rows, skip=None):
    ev = collections.defaultdict(set)
    for sp, r in rows.items():
        if sp == skip or r["slide"] is None:
            continue
        a, e = eff(sp)
        if r["slide"] != BASE + (sp == CASTFORM) + frames(sp):  # function animation dominates
            ev[a].add(r["slide"] - BASE - (sp == CASTFORM) - e)
    return ev

def predict(sp, A):
    a, e = eff(sp)
    return BASE + (sp == CASTFORM) + max(frames(sp), A[a] + e if a in A else 0)

rows = sweep("species-sweep-opponent-target.txt")
rows = {k: v for k, v in rows.items() if v["slide"] is not None}
ev = learn(rows)
conflicts = {a: sorted(v) for a, v in ev.items() if len(v) > 1}
A = {a: min(v) for a, v in ev.items()}
exact = sum(predict(sp, A) == r["slide"] for sp, r in rows.items())
bad = [(sp, predict(sp, A), r["slide"]) for sp, r in rows.items() if predict(sp, A) != r["slide"]]
# leave-one-species-out: predict each species from A learned without it (only where its animId keeps other evidence)
loo_ok = loo_n = loo_noev = 0
for sp, r in rows.items():
    e2 = learn(rows, skip=sp); A2 = {a: min(v) for a, v in e2.items()}
    if eff(sp)[0] not in A2 and r["slide"] != BASE + (sp == CASTFORM) + frames(sp):
        loo_noev += 1; continue
    loo_n += 1; loo_ok += predict(sp, A2) == r["slide"]
# message start = slide + 26
msg = collections.Counter(r["txt"] - r["slide"] for r in rows.values() if r["txt"] is not None)
res = dict(species=len(rows), animIds=len(A), animIdConflicts=conflicts, exact=exact, mismatches=bad,
           looPredicted=loo_n, looExact=loo_ok, looSoleEvidence=loo_noev,
           sDominated=sum(r["slide"] == BASE + (sp == CASTFORM) + frames(sp) for sp, r in rows.items()),
           msgMinusSlide=dict(sorted(msg.items())))
print(json.dumps(res, indent=1))
if "--write" in sys.argv:
    (fx / "send-in-tail/anim-duration.json").write_text(json.dumps(dict(sorted(A.items())), indent=1) + "\n")
    (fx / "send-in-tail/model-validation.json").write_text(json.dumps(res, indent=1) + "\n")
sys.exit(0 if not bad and not conflicts else 1)
