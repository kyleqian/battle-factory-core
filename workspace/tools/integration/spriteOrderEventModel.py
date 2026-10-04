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


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def keyless_class(seq):
    """per move activation edge: is F exact WITHOUT live keys?  Keyless = same-frame destroy groups ordered ascending by
    slot, except the known-entry {3,4} group (constant [4,3]) and the entry bulk groups 48..59 (ascending).  'dirty' =
    some earlier same-frame destroy group had a different array order, i.e. needs live sprite keys."""
    out, prev, pact, dirty, entry = [], seq[0][1], 0, False, True
    F = list(range(64))
    for n, r in seq[1:]:
        ds = [s for s in range(64) if prev["mask"] >> s & 1 and not r["mask"] >> s & 1]
        if len(ds) > 1:
            pos = {s: i for i, s in enumerate(prev["order"])}
            arr = sorted(ds, key=lambda s: pos[s])
            if not (arr == sorted(ds) or (entry and sorted(ds) == [3, 4] and arr == [4, 3])):
                dirty = True
        F, _ = step(F, prev["order"], prev["mask"], r["mask"], "array")
        if r["act"] and not pact:
            out.append({"frame": n, "traceFrame": r["tf"], "move": r["mv"], "freeOrderHead": F[:12],
                        "observedHead": free_order(prev["order"], prev["mask"])[:12],
                        "needsLiveKeys": dirty})
        if r["act"]:
            entry = False
        pact, prev = r["act"], r
    return out


def crosscheck_calls(raw0, calls_path):
    import collections
    c = json.loads(Path(calls_path).read_text())
    d, rows, seq, _ = evaluate(raw0)
    st = dict(seq)
    by = collections.defaultdict(list)
    for x in c["calls"]:
        by[x["step"]].append(x)
    ok = bad = net0 = 0
    for stp, cl in by.items():
        mask, m0 = st[stp - 1]["mask"], st[stp - 1]["mask"]
        touched = set()
        for x in cl:
            sl = x["slotArgument"] if x["kind"] == "DestroySprite" else x["resultSlot"]
            touched.add(sl)
            mask = mask & ~(1 << sl) if x["kind"] == "DestroySprite" else mask | 1 << sl
        net0 += sum((m0 >> t & 1) == (mask >> t & 1) for t in touched)
        ok += mask == st[stp]["mask"]
        bad += mask != st[stp]["mask"]
    return {"callFrames": len(by), "calls": len(c["calls"]), "maskMatch": ok, "maskMismatch": bad, "netZeroSlotTouches": net0}


def main(write):
    files = sorted(RAW.glob("*-0.json"))
    scen, tot = [], {v: [0, 0] for v in ("array", "asc", "desc")}
    for f0 in files:
        f1 = f0.with_name(f0.name[:-7] + "-1.json")
        rec = {"file": f0.name[:-7], "move": json.loads(f0.read_text())["move"], "sha256": [sha(f0), sha(f1)],
               "freshRunsIdentical": f0.read_bytes() == f1.read_bytes(), "variants": {}}
        for v in ("array", "asc", "desc"):
            d, rows, seq, res = evaluate(f0, v)
            rec["variants"][v] = {k: res[k] for k in ("hit", "miss")}
            tot[v][0] += res["hit"]; tot[v][1] += res["miss"]
            if v == "array":
                rec["frames"] = len(seq) - 1
                rec["multiDestroyFrames"] = res["multiDestroyFrames"]
                rec["activations"] = keyless_class(seq)
        scen.append(rec)
    calls = {}
    for c in sorted((RAW / "calls").glob("*-0.json")):
        stem = c.name[:-7]
        raw0 = next(f for f in files if f.name.endswith(stem + "-0.json"))
        c1 = c.with_name(stem + "-1.json")
        calls[stem] = {**crosscheck_calls(raw0, c), "callProbeRunsIdentical": c.read_bytes() == c1.read_bytes(), "sha256": sha(c)}
    acts = [a for r in scen for a in r["activations"]]
    clean = sum(not a["needsLiveKeys"] for a in acts)
    receipt = {"schema": "sprite-order-event-model/v1",
               "pins": {"probe": sha(ROOT / "tools/compare/spriteOrderEventProbe.py"), "model": sha(__file__),
                        "batch": sha(ROOT / "tools/integration/spriteOrderEventBatch.py"),
                        "callProbe": sha(ROOT / "tools/compare/lightScreenAllocatorCallProbe.py"),
                        "sprite.c": sha(ROOT / "reference/pokeemerald/src/sprite.c"),
                        "pokeemerald.gba": sha(ROOT / "reference/pokeemerald/pokeemerald.gba")},
               "totals": {"scenarios": len(scen), "freshRunsIdentical": sum(r["freshRunsIdentical"] for r in scen),
                          "perFrameFreeOrderHitsMisses": {k: {"hit": v[0], "miss": v[1]} for k, v in tot.items()},
                          "activationEdges": len(acts), "activationEdgesExactWithoutLiveKeys": clean,
                          "activationEdgesNeedingLiveKeys": len(acts) - clean},
               "callStreamCrossCheck": calls, "scenarios": scen}
    if "--extra" in sys.argv:
        extra = Path(sys.argv[sys.argv.index("--extra") + 1])
        ex = {"dir": "(not committed; regenerate with the extra batch in the design doc)", "files": 0, "frames": 0, "hit": 0, "miss": 0, "missFiles": []}
        for f in sorted(extra.glob("*-0.json")):
            d, rows, seq, res = evaluate(f)
            ex["files"] += 1; ex["frames"] += len(seq) - 1; ex["hit"] += res["hit"]; ex["miss"] += res["miss"]
            if res["miss"]:
                ex["missFiles"].append({"file": f.name, "firstMiss": res["firstMiss"]})
        receipt["extraSingleRunScenarios"] = ex
        print(json.dumps(ex, indent=1))
    print(json.dumps(receipt["totals"], indent=1))
    if write:
        RECEIPT.write_text(json.dumps(receipt, indent=1) + "\n")
        print("wrote", RECEIPT)


if __name__ == "__main__":
    main("--write" in sys.argv)
