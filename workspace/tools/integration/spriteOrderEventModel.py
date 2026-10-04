#!/usr/bin/env python3
"""Free-slot-tie-order event model for sSpriteOrder (pure python3, no mGBA).

Model M_event (derived from reference/pokeemerald/src/sprite.c SortSprites :372):
  SortSprites is a full stable insertion sort of the previous array every frame, and every free slot
  carries the identical, maximal dummy key, so the relative order F of free slots only changes at events:
    reset (ResetAllSprites :855)  F = identity
    CreateSprite  slot s          F.remove(s)               (key becomes real; leaves the tail block)
    DestroySprite slot s          F.insert at HEAD of F     (key becomes max; insertion sort only moves
                                                             strictly-smaller keys left past it, so it
                                                             stops directly before the existing equal-key block)
  Slots destroyed within one frame enter F ahead of the old free slots in their previous ARRAY order
  (equal keys keep array order).  A slot created and destroyed inside one frame never sorts: no change.
Variants for the order among same-frame destroyed slots: 'array' (needs live keys), 'asc', 'desc', 'call'.

usage: spriteOrderEventModel.py [--write]      # --write rewrites tools/integration/fixtures/sprite-order-event-model.json
"""
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "tools/integration/fixtures/sprite-order-event-raw"
RECEIPT = ROOT / "tools/integration/fixtures/sprite-order-event-model.json"


def load(path):
    d = json.loads(Path(path).read_text())
    rows = []
    for r in d["rows"]:
        rows.append({"n": r[0], "tf": r[1], "order": list(bytes.fromhex(r[2])), "mask": int(r[3], 16), "act": r[4], "mv": r[5],
                     "keys": r[6] if len(r) > 6 else None})
    return d, rows


def frames_of(rows, last):
    """expand change rows to one state per frame number."""
    out, i = [], 0
    for n in range(rows[0]["n"], last + 1):
        while i + 1 < len(rows) and rows[i + 1]["n"] <= n:
            i += 1
        out.append((n, rows[i]))
    return out


def free_order(order, mask):
    return [s for s in order if not mask >> s & 1]


def step(F, prev_order, prev_mask, mask, variant):
    created = [s for s in range(64) if mask >> s & 1 and not prev_mask >> s & 1]
    destroyed = [s for s in range(64) if prev_mask >> s & 1 and not mask >> s & 1]
    if variant == "array":
        pos = {s: i for i, s in enumerate(prev_order)}
        destroyed.sort(key=lambda s: pos[s])
    elif variant == "desc":
        destroyed.sort(reverse=True)
    return destroyed + [s for s in F if s not in created], len(destroyed)


def evaluate(path, variant="array"):
    d, rows = load(path)
    seq = frames_of(rows, d["lastFrame"])
    F = [s for s in seq[0][1]["order"] if not seq[0][1]["mask"] >> s & 1]  # reset frame: identity, all free
    assert F == list(range(64)), "first frame must be the reset"
    hit = miss = multi = 0
    first_miss = None
    acts, prev = [], None
    for n, r in seq[1:]:
        pr = prev or seq[0][1]
        F, nd = step(F, pr["order"], pr["mask"], r["mask"], variant)
        multi += nd > 1
        if F == free_order(r["order"], r["mask"]):
            hit += 1
        else:
            miss += 1
            if first_miss is None:
                first_miss = {"frame": n, "predicted": F[:12], "observed": free_order(r["order"], r["mask"])[:12]}
            F = free_order(r["order"], r["mask"])  # resync so one miss does not cascade
        prev = r
    return d, rows, seq, {"hit": hit, "miss": miss, "multiDestroyFrames": multi, "firstMiss": first_miss}


def activation_samples(d, seq, variant="array"):
    """free-slot order predicted/observed at the frame BEFORE each move-activation edge (act 0->1)."""
    out, F = [], None
    F = list(range(64))
    prev, prev_act = seq[0][1], 0
    for n, r in seq[1:]:
        F, _ = step(F, prev["order"], prev["mask"], r["mask"], variant)
        if r["act"] and not prev_act:
            out.append({"frame": n, "move": r["mv"], "predicted": F, "observed": free_order(prev["order"], prev["mask"]),
                        "predictedHit": F == free_order(prev["order"], prev["mask"]) if False else None})
        prev, prev_act = r, r["act"]
    return out


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()


if __name__ == "__main__":
    files = sorted(RAW.glob("*-0.json"))
    summary = {}
    for variant in ("array", "asc", "desc"):
        h = m = 0
        for f in files:
            h_, m_ = evaluate(f, variant)[3]["hit"], evaluate(f, variant)[3]["miss"]
            h += h_; m += m_
        summary[variant] = (h, m)
    print(summary)
