#!/usr/bin/env python3
"""aud243a sound census delta (docs/aud243a-sound-census.md). lsd194Census.ts arms carry per seed `sound` [[frame, kind, id, pan(, mode)]...], `soundDigest`, `soundAnim`.

  soundCensusDelta.py BASE FINAL            arm-vs-arm: per seed sound digest equal / event-sequence equal / changed; per (kind, id, pan) count and frame-delta histograms.
  soundCensusDelta.py --t1 ARM [--json out] T1 per executed move-animation command: emitted move-animation SEs against the aud242 table (anim-sound-timing.json) -> class table.
                                          t1cls: the non-move SEs (Status_* / weather-continues / held item / leech seed / focus punch / castform / stats-change commands) are attributed by the arm's `soundCmd`
                                          presenting windows and compared per command with the table's general variants -> a second, per-family table (the move table's numbers do not include it).

T1 IS SELF-CONSISTENCY, NOT ROM PARITY. Expected rows come from the same table the emitter reads (walked independently of the age clock by soundCensusExpected.ts), so
exact only says the emitter fired what the table says at the frame the table says; ROM-vs-engine offsets (#196 / #197 / #198) are invisible here and belong to T2 (aud243b).
The only independent information T1 adds is what the table CANNOT resolve (gated ops, by the extractor's `ends` reason), declined bodies and not-ported cry tasks.
"""
import glob, json, os, re, subprocess, sys, tempfile
from collections import Counter, defaultdict

# Sounds of the other emitter families (battleHitSounds / screenSounds / battleStartSounds / battleEndSounds); no aud242 table op uses these ids (min 20).
CONTROLLER_IDS = {5, 9, 12, 13, 14, 15, 16, 32, 55, 79, 90, 114, 115, 116}
ROW_OPTIONAL, ROW_TAIL = 1, 2  # row flags of soundCensusExpected.ts (element 5)
MOVE_TAIL_CLAIMED = set()  # aud260: id() of the events t1() claimed as a move animation's sound-only tail rows; t1_nonmove() does not count them as unowned
CLASSES = ["exact", "known-offset", "missing-gated", "missing-declined", "missing-cry-task", "missing-other", "extra", "unclassified"]


def load_arm(d):
    rows = {}
    for p in sorted(glob.glob(os.path.join(d, "r[0-9].jsonl"))):
        for line in open(p):
            if line.strip():
                r = json.loads(line)
                rows[r["seed"]] = r
    return rows


def arm_mode(base, final):
    B, F = load_arm(base), load_arm(final)
    res = Counter(); bad = []; tuples = defaultdict(Counter); deltas = Counter()
    for s in sorted(B):
        b, f = B[s], F.get(s)
        res["seeds"] += 1
        if f is None:
            bad.append({"seed": s, "kind": "missing-in-final"}); continue
        if b["sound"] is None or f["sound"] is None:
            res["noSoundColumn"] += 1; continue
        if b["soundDigest"] == f["soundDigest"]:
            res["identical"] += 1; continue
        res["changed"] += 1
        bs, fs = [tuple(e[1:]) for e in b["sound"]], [tuple(e[1:]) for e in f["sound"]]
        if bs == fs:
            res["sameSequenceFramesMoved"] += 1
            for x, y in zip(b["sound"], f["sound"]):
                if x[0] != y[0]: deltas[(x[1], x[2], x[3], y[0] - x[0])] += 1
        else:
            res["sequenceChanged"] += 1
            cb, cf = Counter(bs), Counter(fs)
            for k in (cf - cb): tuples[k]["added"] += 1
            for k in (cb - cf): tuples[k]["removed"] += 1
            if len(bad) < 10: bad.append({"seed": s, "kind": "sequence", "base": len(bs), "final": len(fs)})
    print(json.dumps(dict(res)))
    print("changed examples", json.dumps(bad[:10]))
    for k, v in sorted(tuples.items(), key=lambda kv: -sum(kv[1].values()))[:30]: print("tuple", k, dict(v))
    for k, v in sorted(deltas.items(), key=lambda kv: -kv[1])[:30]: print("frameDelta (kind,id,pan,delta)", k, v)


def cry_sites():
    """Per Move_* label: number of SoundTask_Play*Cry* / WaitForCry sites reachable through call / goto / jump* edges (an upper bound: branches are not evaluated)."""
    src = open("reference/pokeemerald/data/battle_anim_scripts.s").read().split("\n")
    labels = {}; cur = None
    for ln in src:
        m = re.match(r"^(\w+)::?\s*(?:@.*)?$", ln)
        if m: cur = m.group(1); labels[cur] = {"cry": 0, "edges": []}; continue
        if cur is None: continue
        if re.search(r"createvisualtask SoundTask_(PlayCry|PlayDoubleCry|WaitForCry)", ln): labels[cur]["cry"] += 1
        m = re.match(r"^\s*(call|goto|jumpif\w*|jumpret\w*|jumparg\w*)\s+(.*?)\s*(?:@.*)?$", ln)
        if m:
            for a in m.group(2).split(","):
                a = a.strip()
                if a in labels or re.match(r"^\w+$", a): labels[cur]["edges"].append(a)
    out = {}
    for name in labels:
        if not name.startswith("Move_"): continue
        seen = set(); stack = [name]; n = 0
        while stack:
            x = stack.pop()
            if x in seen or x not in labels: continue
            seen.add(x); n += labels[x]["cry"]; stack.extend(labels[x]["edges"])
        out[name] = n
    return out


def family_of(w, nxt):
    """t1cls: (family name, owner command window) of a non-move presenting window; a cure berry's `status` command is the lead of the HELD_ITEM_EFFECT command that follows it."""
    typ, anim = w[1], w[5]
    if typ == "status" and nxt is not None and nxt[1] == "general-animation" and nxt[5] == "HELD_ITEM_EFFECT": return "general-animation:HELD_ITEM_EFFECT", True
    if typ in ("status-animation", "general-animation"): return f"{typ}:{anim}", False
    if typ == "stats-change": return "stats-change", False
    return None, False


def nkey(w):
    return f"{w[1]},{w[2]},{'null' if w[5] is None else w[5]}"


def nonmove_expected(wins):
    keys = sorted({(w[1], w[2], w[5]) for w in wins if w[1] in ("status-animation", "general-animation", "stats-change")}, key=str)
    with tempfile.TemporaryDirectory() as td:
        kp, ep = os.path.join(td, "keys.json"), os.path.join(td, "expected.json")
        json.dump(keys, open(kp, "w"))
        subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusExpected.ts", kp, ep, "--nonmove"], check=True)
        return json.load(open(ep))


def t1_nonmove(A):
    """Per non-move command: its emitted SEs / pans (the window, plus the cure-berry lead window) against the table's rows of its family. Returns (per-family Counter, lead histogram, residual Counter, examples)."""
    tail_rows = [0]
    fam = defaultdict(Counter); lead = defaultdict(Counter); resid = Counter(); noemit = defaultdict(Counter); ex = defaultdict(list)
    E = nonmove_expected([w for r in A.values() for w in (r.get("soundCmd") or [])])
    for s in sorted(A):
        r = A[s]; wins = r.get("soundCmd")
        if wins is None: sys.exit("arm has no soundCmd column (regenerate with tools/integration/lsd194Census.sh at a tree >= t1cls)")
        by_idx = {w[0]: w for w in wins}
        owned = defaultdict(list); unowned = []
        for e in r["sound"]:
            if e[1] not in ("se", "pan") or (e[1] == "se" and e[2] in CONTROLLER_IDS): continue
            if any(w[5] <= e[0] <= w[6] for w in r["soundAnim"]) or id(e) in MOVE_TAIL_CLAIMED: continue
            cand = [w for w in wins if w[3] <= e[0] <= w[4]]
            if not cand: unowned.append((e, ("outside any presenting window", e[1], e[2]))); continue
            w = cand[0]; f, lead_of_next = family_of(w, by_idx.get(w[0] + 1))
            if f is None: unowned.append((e, (f"in {w[1]} window", e[1], e[2]))); continue
            owned[w[0] + 1 if lead_of_next else w[0]].append(e)
        # t1dt: a status-animation command's tail rows (psn2: scheduled past the window) are emitted after it, in the message / HP window that follows; claim them by the command's own
        # frame offset (the votes of its in-window rows) and the table row's exact script row, before the residual is counted.
        for w in wins:
            if w[1] != "status-animation" or w[0] not in owned: continue
            rows = [tuple(x) for x in E[nkey(w)]["rows"]]; tail = [r_ for r_ in rows if len(r_) > 5 and r_[5] == ROW_TAIL]
            votes = Counter(e[0] - r_[0] for e in owned[w[0]] for r_ in rows if r_ not in tail and (e[1], e[2], e[3]) == (r_[1], r_[2], r_[3]))
            if not tail or not votes: continue
            d0 = votes.most_common(1)[0][0]
            for r_ in tail:
                hit = next((u for u in unowned if u[0][0] == d0 + r_[0] and tuple(u[0][1:4]) == (r_[1], r_[2], r_[3])), None)
                if hit is not None: unowned.remove(hit); owned[w[0]].append(hit[0]); tail_rows[0] += 1
        for _, key in unowned: resid[key] += 1
        # a family command that emitted nothing still counts (its table rows are then missing only when the table says the command animates: see `noemit`)
        for w in wins:
            f, _ = family_of(w, None)
            if f is not None and w[0] not in owned and w[1] != "status": noemit[f][("animated" if len(w) > 6 and w[6] else "not animated") if w[1] == "general-animation" else "-"] += 1
        for idx, evs in owned.items():
            w = by_idx[idx]; f, _ = family_of(w, None)
            rows = [tuple(x) for x in E[nkey(w)]["rows"]]
            if w[1] == "stats-change": rows = None
            fam[f]["commands"] += 1; fam[f]["emitted"] += len(evs)
            if rows is None:
                tup = [(e[1], e[2], e[3]) for e in evs]; want = {(r_[1], r_[2], r_[3]) for r_ in E[nkey(w)]["rows"]}
                for t, e in zip(tup, evs):
                    if t in want and len(evs) == 1: fam[f]["exact"] += 1; lead[f][e[0] - w[3]] += 1
                    elif t in want: fam[f]["extra"] += 1
                    else: fam[f]["extra"] += 1; ex[f].append((s, w[0], e))
                continue
            votes = Counter(e[0] - r_[0] for e in evs for r_ in rows if (e[1], e[2], e[3]) == (r_[1], r_[2], r_[3]))
            d0 = votes.most_common(1)[0][0] if votes else None
            left = list(rows); rest = []
            for e in evs:
                hit = next((r_ for r_ in left if d0 is not None and e[0] - r_[0] == d0 and (e[1], e[2], e[3]) == (r_[1], r_[2], r_[3])), None)
                if hit: left.remove(hit); fam[f]["exact"] += 1
                else: rest.append(e)
            for e in rest:
                hit = next((r_ for r_ in left if (e[1], e[2], e[3]) == (r_[1], r_[2], r_[3])), None)
                if hit: left.remove(hit); fam[f]["known-offset"] += 1; lead[f][("off", e[0] - hit[0] - d0)] += 1
                else: fam[f]["extra"] += 1; ex[f].append((s, w[0], e))
            fam[f]["missing"] += len(left)
            if len(ex[f]) < 4 and left: ex[f].append((s, w[0], "missing " + json.dumps(left[:2])))
            if d0 is not None: lead[f][d0 - w[3]] += 1
    return fam, lead, resid, noemit, ex, tail_rows[0]


def other_families(A):
    """aud263: the families T1 has NO expected table for (battle-controller SEs, cries, BGM / fanfare, ducks / stops): emitted counts only. T1 cannot judge them (their rows are not derived from the aud242 table); the
    ROM comparison is T2 and the Tier-1 pins named in docs/aud251-s11-scoreboard-refresh.md. Every se / pan row outside the controller ids is owned by a move / non-move family above (`unclassified` counts the rest)."""
    kinds = Counter(); ctl = Counter(); cry = Counter(); misc = Counter()
    for r in A.values():
        for e in r["sound"]:
            kinds[e[1]] += 1
            if e[1] == "se" and e[2] in CONTROLLER_IDS: ctl[e[2]] += 1
            elif e[1] == "cry": cry[e[4] if len(e) > 4 else 0] += 1
            elif e[1] not in ("se", "pan"): misc[(e[1], e[2])] += 1
    print("other families (no T1 table; counts only):", "rows by kind", dict(kinds))
    print("  battle-controller SE ids", dict(sorted(ctl.items())), "total", sum(ctl.values()))
    print("  cries by mode", dict(sorted(cry.items())), "total", sum(cry.values()))
    print("  bgm / duck / stop (kind, id)", dict(sorted(misc.items(), key=str)))


# aud242l: soundAnim row element 10 = the battlers' pic Y [player, opponent] (absent in older arms): picks the Blizzard pic class of the table.
def pic_key(a):
    return ",".join(str(v) for v in a[10]) if len(a) > 10 and a[10] else ""


# aud242o: soundAnim row element 11 = the live rollout counter (absent in older arms): picks the Rollout counter variant of the table.
def counter_key(a):
    return str(a[11]) if len(a) > 11 and a[11] else ""


# aud262: soundAnim row elements 12 (damage class) and 13 (attacker [elevation, HP quarter, TOP]) pick the damage / flag / elevation / HP-quarter / TOP variants of the table (absent in older arms).
def dim_key(a):
    d = str(a[12]) if len(a) > 12 and a[12] is not None else ""
    t = ",".join(str(v) for v in a[13]) if len(a) > 13 and a[13] else ""
    return f"{d}|{t}" if d or t else ""


def exp_key(a):
    return f"{a[1]},{a[2]},{a[3]},{a[4]},{pic_key(a)}" + (f",{counter_key(a)}" if counter_key(a) else "") + (f"#{dim_key(a)}" if dim_key(a) else "")


def t1(arm, json_out):
    A = load_arm(arm)
    timing = json.load(open("src/data/gen/anim-sound-timing.json"))
    label_of = {m["move"]: m["label"] for m in timing["moves"]}
    cry = cry_sites()
    keys = sorted({(a[1], a[2], a[3], a[4], pic_key(a), counter_key(a), dim_key(a)) for r in A.values() for a in r["soundAnim"] if a[1] is not None})
    with tempfile.TemporaryDirectory() as td:
        kp, ep = os.path.join(td, "keys.json"), os.path.join(td, "expected.json")
        json.dump(keys, open(kp, "w"))
        subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "tools/integration/soundCensusExpected.ts", kp, ep], check=True)
        E = json.load(open(ep))
    tot = Counter(); gated_by_end = Counter(); per_class_moves = defaultdict(Counter); offsets = Counter(); examples = defaultdict(list)
    cmds = Counter(); scene = None; after_end = Counter(); cry_emitted = Counter()
    def put(cls, n, seed, move, ex=None):
        tot[cls] += n
        per_class_moves[cls][label_of.get(move, move)] += n
        if len(examples[cls]) < 4: examples[cls].append((seed, move, ex))
    for s in sorted(A):
        r = A[s]; scene = r["scene"]
        if r["sound"] is None: sys.exit("arm has no sound column")
        windows = []; inwin = lambda f: any(w[5] <= f <= w[6] for w in r["soundAnim"])
        for a in r["soundAnim"]:
            idx, move, turn, att, tgt, first, last, zero, noanim = a[:9]
            cmds["move-animation commands"] += 1
            ev = [e for e in r["sound"] if first <= e[0] <= last and e[1] in ("se", "pan") and not (e[1] == "se" and e[2] in CONTROLLER_IDS) and id(e) not in MOVE_TAIL_CLAIMED]
            if noanim:
                cmds["Scene OFF (HITMARKER_NO_ANIMATIONS)"] += 1
                for e in ev: put("extra", 1, s, move, e)
                continue
            if move is None:
                if len(a) > 9 and a[9]:
                    cmds["Scene ON action-transition pause (no body by design)"] += 1
                else:
                    cmds["no body request, not a transition"] += 1; put("unclassified", 1, s, None, "animation-less non-transition command " + str(idx))
                for e in ev: put("extra", 1, s, move, e)
                continue
            exp = E.get(exp_key(a))
            if exp is None:
                cmds["move without table entry"] += 1
                for e in ev: put("unclassified", 1, s, move, e)
                put("unclassified", 1, s, move, "no table entry")
                continue
            n_cry = cry.get(label_of.get(move, ""), 0)
            if zero is None:
                cmds["declined / no live body"] += 1
                put("missing-declined", len(exp["rows"]), s, move)
                if n_cry: put("missing-cry-task", n_cry, s, move)
                for e in ev: put("extra", 1, s, move, e)
                continue
            cmds["live"] += 1
            # cry1: a cry-task site counts as emitted (not missing) when the command's window holds a cry-task cry (modes HIGH_PITCH 3, ECHO_START 4, ECHO_END 6, ROAR_1 7, ROAR_2 8).
            cry_rows = [e for e in r["sound"] if first <= e[0] <= last and e[1] == "cry" and len(e) > 4 and e[4] in (3, 4, 6, 7, 8)]
            if n_cry and cry_rows: cry_emitted[label_of.get(move, move)] += n_cry; n_cry = 0
            if exp["gated"]: put("missing-gated", exp["gated"], s, move, exp["ends"]); gated_by_end[exp["ends"]] += exp["gated"]
            if n_cry: put("missing-cry-task", n_cry, s, move)
            left = list(ev)
            pending = []
            for row in exp["rows"]:
                frame = zero + 8 + row[0]; want = (row[1], row[2], row[3])
                hit = next((e for e in left if e[0] == frame and (e[1], e[2], e[3]) == want), None)
                if hit is not None:
                    left.remove(hit); put("exact", 1, s, move)
                    if len(row) > 5 and row[5] == ROW_OPTIONAL: cmds["optional rows emitted (t1dt Double Team stat SE; counted in exact)"] += 1
                else: pending.append((frame, want, row))
            for frame, want, row in pending:
                cand = [e for e in left if (e[1], e[2], e[3]) == want]
                if cand:
                    hit = min(cand, key=lambda e: abs(e[0] - frame)); left.remove(hit)
                    offsets[(label_of.get(move, move), hit[0] - frame)] += 1; put("known-offset", 1, s, move, hit[0] - frame)
                elif len(row) > 5 and row[5] == ROW_OPTIONAL: cmds["optional rows absent (not missing)"] += 1; continue  # t1dt: the Double Team stat SE is played only when the segment presents the rise; absent is not missing
                elif frame > last and any(e[0] == frame and (e[1], e[2], e[3]) == want and id(e) not in MOVE_TAIL_CLAIMED for e in r["sound"]):
                    # aud260: a sound-only tail (scheduleMoveAnimationTail, the psn2 mechanism): the row plays at its table frame past the command's last presenting frame; claimed so a later command's window does not score it extra.
                    MOVE_TAIL_CLAIMED.add(id(next(e for e in r["sound"] if e[0] == frame and (e[1], e[2], e[3]) == want and id(e) not in MOVE_TAIL_CLAIMED)))
                    put("exact", 1, s, move); cmds["tail rows past the command's last presenting frame (aud260; counted in exact)"] += 1
                else:
                    put("missing-other", 1, s, move, [frame, *want]); after_end["after the command's last presenting frame" if frame > last else "inside the command"] += 1
            for e in left: put("extra", 1, s, move, e)
        if r.get("soundCmd") is None:
            for e in r["sound"]:
                if e[1] in ("se", "pan") and not (e[1] == "se" and e[2] in CONTROLLER_IDS) and not inwin(e[0]):
                    put("unclassified", 1, s, None, e)
    nm = t1_nonmove(A) if all(r.get("soundCmd") is not None for r in A.values()) else None
    if nm: tot["unclassified"] += sum(nm[2].values())
    print(f"T1 (self-consistency, NOT ROM parity) arm={arm} scene={scene} seeds={len(A)}")
    print("commands:", dict(cmds))
    print("%-18s %9s" % ("class", "count"))
    for c in CLASSES: print("%-18s %9d" % (c, tot[c]))
    print("missing-other rows:", dict(after_end))
    print("cry-task sites emitted (cry1; no longer missing-cry-task):", dict(cry_emitted))
    print("gated ops by table `ends` reason:", dict(gated_by_end))
    print("known-offset by (move, delta) top:", offsets.most_common(12))
    if nm:
        fam, lead, resid, noemit, ex, tail_rows = nm
        print("non-move families (t1cls; emitted SEs / pans in the command's window vs the table's general variant; NOT part of the move table above except `unclassified` = the residual):")
        print("%-40s %8s %8s %6s %7s %6s %7s  lead (first-frame -> table frame 0) | known-offset deltas" % ("family", "commands", "emitted", "exact", "offset", "extra", "missing"))
        for f in sorted(fam):
            c = fam[f]; l = lead[f]
            print("%-40s %8d %8d %6d %7d %6d %7d  %s" % (f, c["commands"], c["emitted"], c["exact"], c["known-offset"], c["extra"], c["missing"],
                  dict(Counter({k: v for k, v in l.items() if not isinstance(k, tuple)}).most_common(3)) | ({"off": dict(Counter({k[1]: v for k, v in l.items() if isinstance(k, tuple)}).most_common(3))} if any(isinstance(k, tuple) for k in l) else {})))
        for key in ("exact", "known-offset", "extra", "missing", "emitted"): print("non-move total %-12s %d" % (key, sum(fam[f][key] for f in fam)))
        print("non-move commands that emitted nothing:", {f: dict(v) for f, v in noemit.items()})
        print("status-animation tail rows claimed past their window (t1dt; counted in exact above):", tail_rows)
        print("residual unclassified (id, source):", dict(nm[2]))
        for f in sorted(ex):
            if ex[f]: print("non-move examples", f, ex[f][:3])
    other_families(A)
    for c in CLASSES:
        if per_class_moves[c]: print(c, "top moves:", per_class_moves[c].most_common(8), "examples (seed, move, detail):", examples[c][:3])
    if json_out:
        json.dump({"arm": arm, "scene": scene, "seeds": len(A), "commands": dict(cmds), "classes": {c: tot[c] for c in CLASSES}, "gatedByEnds": dict(gated_by_end),
                   "knownOffsetTop": [[list(k), v] for k, v in offsets.most_common(40)],
                   "nonMove": ({"families": {f: dict(c) for f, c in nm[0].items()}, "residual": {str(k): v for k, v in nm[2].items()}, "noEmit": {f: dict(v) for f, v in nm[3].items()}} if nm else None)}, open(json_out, "w"), indent=1)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "--t1":
        t1(a[1], a[a.index("--json") + 1] if "--json" in a else None)
    elif len(a) >= 2:
        arm_mode(a[0], a[1])
    else:
        sys.exit(__doc__)
