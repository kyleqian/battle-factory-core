#!/usr/bin/env python3
"""sgs134: does PRODUCTION present the IsBattleSEPlaying gate of the stats-change and multi-hit requests today? (sgs134Production.ts output;
docs/sgs134-se-gate-other-requests.md §3). Per resolution segment, the k-th presented `stats-change` command is paired with the k-th kernel
STATS_CHANGE `animation` event and the k-th `move-animation` command with the k-th MOVE_ANIMATION event (segments whose counts differ are
skipped and counted); each event's projected gate is sgs134ExposureSummary.py's (classify + fixed-rows.json: open = no print but
EMPTYSTRING3 and no animation script since the SE). Reported:
  stats-change   presented frames = (next command start - start) vs the command's own minimumFrames + holdFrames (production today), and
                 the ROM's controller rows for the same receipt = gate + minimumFrames (sgs134Rom.py: playanimation ctl = seGate + 76 / 90):
                 `short` = gate when production's frames do not depend on it.
  multi-hit      the 2nd+ hit's move-animation command frames minus the 1st hit's of the same move in the same segment (ROM: ctl(hit k) -
                 ctl(hit 1) = seGate(hit k) on every receipt; a production adapter that measured the gate would show the same delta).
usage: sgs134ProductionSummary.py <dir-with-on*.jsonl / off*.jsonl> <fixed-rows.json> <out.json> [on|off]
"""
import collections, glob, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
src, rules_path, out = sys.argv[1:4]
scene = sys.argv[4] if len(sys.argv) > 4 else "on"
rules = json.load(open(rules_path))
EMPTY = "msg:STRINGID_EMPTYSTRING3"
SELF_DROP_PSCA, ALL_STATS_UP = {"315", "354", "276"}, {"246", "318"}


def gate_at(events, i):
    """sgs134ExposureSummary.py's class + projected gate of the receipt token events[i] (None = unmeasured class)."""
    s = max((j for j in range(i) if events[j].startswith("se:")), default=-1)
    if s < 0:
        return "no-se", 0
    tail = events[s + 1:i]
    if any((x.startswith("msg:") and x != EMPTY) or x.startswith("sa:") or (x.startswith("anim:") and not x.startswith("anim:HIT_ANIMATION"))
           for x in tail):
        return "closed", 0
    # the hit: its MOVE_ANIMATION (Scene ON) / SCENE_OFF_ATTACK_PAUSE (Scene OFF, no move id)
    mv = next((events[j] for j in range(i - 1, -1, -1) if events[j].startswith(("anim:MOVE_ANIMATION", "anim:SCENE_OFF_ATTACK_PAUSE"))), None)
    move = mv.split(":")[2] if mv and mv.startswith("anim:MOVE_ANIMATION") else None
    nxt = next((x[4:] for x in events[i + 1:] if x.startswith("msg:")), None)
    _, aid, a0, b = events[i].split(":")
    if aid == "STATS_CHANGE":
        prev = next((x for x in reversed(tail) if x not in ("set-battler-pp-data", "game-stat-increment")), None)
        cls = "speed-boost" if nxt == "STRINGID_PKMNRAISEDSPEED" else \
            "stats-change-target" if prev == "stat-stage-change" and nxt == "STRINGID_DEFENDERSSTATFELL" else \
            "stats-change-attacker" if prev == "stat-stage-change" and nxt == "STRINGID_ATTACKERSSTATROSE" else \
            "stats-change-attacker-psca" if move in SELF_DROP_PSCA else "stats-change-all-stats-up" if move in ALL_STATS_UP else "stats-change-other"
        if mv is None:
            return cls, 0
    else:
        cls = "multi-hit" if EMPTY in tail and move is not None and move == a0 and not (nxt or "").startswith("STRINGID_PKMN") else "move-animation-other"
    fixed = rules["fixedRows"].get(cls)
    if fixed is None:
        return cls, None
    drain = sum(abs(int(x.split(":")[2]) - int(x.split(":")[3])) for x in tail if x.startswith("hp:"))
    return cls, max(0, min(rules["cap"], rules["seRows"][events[s].split(":")[1]] - (fixed + drain)))


sc_rows, mh_rows, skipped = [], [], collections.Counter()
for f in sorted(glob.glob(os.path.join(src, f"{scene}*.jsonl"))):
    for line in open(f):
        b = json.loads(line)
        for g in b["segments"]:
            ev, cmds = g["events"], g["cmds"]
            dur = [cmds[k + 1]["f"] - c["f"] if k + 1 < len(cmds) else None for k, c in enumerate(cmds)]
            sc_ev = [i for i, x in enumerate(ev) if x.startswith("anim:STATS_CHANGE")]
            sc_cmd = [k for k, c in enumerate(cmds) if c["t"] == "stats-change"]
            if len(sc_ev) == len(sc_cmd):
                for i, k in zip(sc_ev, sc_cmd):
                    cls, gate = gate_at(ev, i)
                    sc_rows.append({"seed": b["seed"], "seg": g["seg"], "cls": cls, "gate": gate, "frames": dur[k],
                                    "own": cmds[k]["mf"] + cmds[k].get("hold", 0), "mf": cmds[k]["mf"]})
            elif sc_ev:
                skipped["stats-change"] += 1
            mv_ev = [i for i, x in enumerate(ev) if x.startswith("anim:MOVE_ANIMATION")]
            mv_cmd = [k for k, c in enumerate(cmds) if c["t"] == "move-animation"]
            if len(mv_ev) != len(mv_cmd):
                skipped["move-animation"] += 1
                continue
            first = {}
            for i, k in zip(mv_ev, mv_cmd):
                cls, gate = gate_at(ev, i)
                mvid = ev[i].split(":")[2]
                if cls == "multi-hit" and mvid in first and dur[k] is not None:
                    mh_rows.append({"seed": b["seed"], "seg": g["seg"], "move": mvid, "gate": gate, "frames": dur[k],
                                    "firstHitFrames": first[mvid], "delta": dur[k] - first[mvid]})
                elif cls != "multi-hit":
                    first[mvid] = dur[k]
sc_open = [r for r in sc_rows if r["gate"]]
res = {"schema": "sgs134-production/v1", "skippedSegments": dict(skipped),
       "statsChange": {"commands": len(sc_rows), "framesEqualOwnTiming": sum(r["frames"] == r["own"] for r in sc_rows),
                       "gated": len(sc_open), "gatedFramesEqualOwnTiming": sum(r["frames"] == r["own"] for r in sc_open),
                       "gatedShortByExactlyGate": sum(r["frames"] == r["own"] for r in sc_open),
                       "gateFrames": sum(r["gate"] for r in sc_open), "byClass": dict(collections.Counter(r["cls"] for r in sc_open)),
                       "examples": sc_open[:12]},
       "multiHit": {"laterHits": len(mh_rows), "gated": sum(1 for r in mh_rows if r["gate"]),
                    "deltaByGate": {str(gt): dict(collections.Counter(r["delta"] for r in mh_rows if r["gate"] == gt))
                                    for gt in sorted({r["gate"] for r in mh_rows if r["gate"] is not None})},
                    "examples": [r for r in mh_rows if r["gate"]][:12]}}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res["statsChange"].items() if k != "examples"}))
print(json.dumps({k: v for k, v in res["multiHit"].items() if k != "examples"}))
print("skipped", dict(skipped))
