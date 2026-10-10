#!/usr/bin/env python3
"""hist73 PART B receipt from hist73HiddenProbe.py raw runs (docs/next-adapters-hist73.md).

usage: hist73HiddenExtract.py <probe-out-dir> <receipt.json>
Per scenario: runs A and B must be byte-identical. Windows (mask-change events [added slots, removed slots, full 64-byte sSpriteOrder
hex], frame numbers dropped: the message timing differs between the hidden and the control staging):
  faint   from the event that frees the fainting battler's sprite slot (opponent 8 / player 6: the known-entry battler slots; the
          first removal after the first animation script that stays free >= 150 frames) to the
          next animation-script activation (exclusive): faint -> (party menu / reshow) -> next-mon summary -> send-out.
  reshow  from the forced party menu's ResetSpriteData (all free + identity order) to the next animation-script activation.
Plus the battler-sprite invisible bits / STATUS3_SEMI_INVULNERABLE bits on the frame before the faint (hidden: the side's bits set)
and on the frames the reshow re-creates the battler sprites. Verdict per pair: SAME (event lists equal) or DIFFERENT.
"""
import hashlib, json, sys
from pathlib import Path

out, receipt = Path(sys.argv[1]), Path(sys.argv[2])
BATTLER_SLOT = {"opp": 8, "ply": 6}
PAIRS = [  # (hidden scenario, control scenario, window)
    ("hf-opp-swellow", "vf-opp-swellow", "faint"), ("hf-opp-pidgeot", "vf-opp-pidgeot", "faint"),
    ("hf-ply-swellow", "vf-ply-swellow", "faint"), ("hf-ply-pidgeot", "vf-ply-pidgeot", "faint"),
    ("rs-opp-swellow", "vf-ply-swellow", "reshow"), ("rs-opp-pidgeot", "vf-ply-swellow", "reshow"),
]


def bits(m):
    return [i for i in range(64) if int(m, 16) >> i & 1]


def load(ident):
    a, b = (out / "raw" / f"{ident}-A.json").read_bytes(), (out / "raw" / f"{ident}-B.json").read_bytes()
    d = json.loads(a)
    # the raw file embeds the scenario path (under the out dir): hash it with the path reduced to the file name
    stable = json.dumps({**d, "scenario": Path(d["scenario"]).name}, separators=(",", ":")).encode()
    return d, a == b, hashlib.sha256(stable).hexdigest()[:16]


def events(d):
    ev, prev = [], None
    for r in d["rows"]:
        if prev is not None and r[3] != prev:
            ev.append({"n": r[0], "act": r[4], "added": sorted(set(bits(r[3])) - set(bits(prev))),
                       "removed": sorted(set(bits(prev)) - set(bits(r[3]))), "order": r[2]})
        prev = r[3]
    return ev


def flags_at(d, n):
    cur = None
    for e in d["extra"]:
        if e[0] > n:
            break
        cur = e
    return {"invisibleBits": cur[2], "semiInvulnerableBits": cur[3]} if cur else None


def window(d, ident, kind):
    ev = events(d)
    if kind == "faint":
        slot = BATTLER_SLOT[ident.split("-")[1]]
        # the faint frees the battler slot until the send-out: the first removal of [slot] after the first animation script whose
        # slot stays free >= 150 frames (an animation sprite briefly reusing the slot is re-added sooner)
        first_anim_frame = next(r[0] for r in d["rows"] if r[4] == 1)
        def stays_free(i):
            nxt = next((e["n"] for e in ev[i + 1:] if slot in e["added"]), None)
            return nxt is None or nxt - ev[i]["n"] >= 150
        start = next(i for i, e in enumerate(ev) if e["removed"] == [slot] and not e["added"] and e["n"] > first_anim_frame and stays_free(i))
    else:
        start = next(i for i, e in enumerate(ev) if not e["added"] and set(e["removed"]) >= {0, 1, 2, 60, 61, 62, 63}
                     and e["order"] == bytes(range(64)).hex())
    first_anim = next((r[0] for r in d["rows"] if r[0] > ev[start]["n"] and r[4] == 1), None)
    w = [e for e in ev[start:] if first_anim is None or e["n"] < first_anim]
    info = {"startFrame": ev[start]["n"], "endFrame": first_anim, "events": len(w),
            "flagsBefore": flags_at(d, ev[start]["n"] - 1)}
    if kind == "reshow":  # the reshow's battler-sprite creations: the first events after the menu closes that re-add 0 / 1 / 2
        info["flagsAfterReshow"] = [{"n": e["n"], **flags_at(d, e["n"])} for e in w if e["added"] and e["added"][0] in (0, 1, 2, 3)][-4:]
    return [{k: e[k] for k in ("added", "removed", "order")} for e in w], info


doc = {"schema": "hist73-hidden-battler-audit/v1", "toolSha256": hashlib.sha256(Path("tools/integration/hist73EventProbe.py").read_bytes()).hexdigest()[:16],
       "scenarios": {}, "pairs": []}
cache = {}
for ident in sorted({p for pair in PAIRS for p in pair[:2]}):
    d, same, sha = load(ident)
    cache[ident] = d
    doc["scenarios"][ident] = {"identicalAB": same, "sha256": sha, "frames": d["frameCount"]}
for hidden, control, kind in PAIRS:
    hw, hi = window(cache[hidden], hidden, kind)
    cw, ci = window(cache[control], control, kind)
    if kind == "reshow":  # the control's reshow window follows its player faint: start at its menu reset too
        cw, ci = window(cache[control], control, "reshow")
    verdict = "SAME" if hw == cw else "DIFFERENT"
    first_diff = next((i for i, (x, y) in enumerate(zip(hw, cw)) if x != y), None if len(hw) == len(cw) else min(len(hw), len(cw)))
    doc["pairs"].append({"hidden": hidden, "control": control, "window": kind, "verdict": verdict, "hiddenInfo": hi, "controlInfo": ci,
                         "firstDifference": first_diff, "windowSha256": hashlib.sha256(json.dumps(hw).encode()).hexdigest()[:16]})
    print(f"{verdict:9} {kind:6} {hidden:15} vs {control:15} events {hi['events']:>3} / {ci['events']:>3}  flags before: "
          f"{hi['flagsBefore']} vs {ci['flagsBefore']}" + (f"  reshow flags: {hi['flagsAfterReshow']}" if kind == "reshow" else ""))
doc["allIdenticalAB"] = all(s["identicalAB"] for s in doc["scenarios"].values())
doc["allSame"] = all(p["verdict"] == "SAME" for p in doc["pairs"])
receipt.write_text(json.dumps(doc, indent=1) + "\n")
print("A == B for every scenario:", doc["allIdenticalAB"], "; every pair SAME:", doc["allSame"])
