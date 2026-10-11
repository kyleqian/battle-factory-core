#!/usr/bin/env python3
"""stg107: compact receipts of stg107Probe.py output (docs/stg107-struggle.md §2). One JSON line per Move_STRUGGLE body (ON) and one
timing line per scenario (every profile): body labels / activation frames / lengths, HP and turn-counter events.
Per Struggle body: activation frame, window length (activation .. first inactive), the monbg hide (target invisible ages), the blend ages
(BLDCNT / BLDALPHA values), the attacker / target x2 change rows, every new sprite's slot / tileTag / position / subpriority / order
position, its created and destroyed ages and its (animNum, animCmdIndex) change rows, the task-list change rows, the HP events relative to
the activation, and a digest of all row framebuffer hashes (r1 == r2 compares it).
usage: stg107Summary.py <probe-dir> <out.jsonl>
"""
import hashlib, json, sys
from pathlib import Path

lines = []


def changes(rows, key):
    out, last = [], object()
    for r in rows:
        v = key(r)
        if v != last:
            out.append([r["age"], v])
            last = v
    return out


for p in sorted(Path(sys.argv[1]).glob("*.json")):
    d = json.loads(p.read_text())
    name = p.stem
    lines.append({"scenario": name, "kind": "timing", "profile": d["profile"], "frameCount": d["frameCount"],
                  "bodies": [[b["label"], b["attacker"], b["startFrame"], b.get("length")] for b in d["bodies"]], "events": d["events"]})
    k = 0
    for b in d["bodies"]:
        if b["label"] != "Move_STRUGGLE" or "rows" not in b:
            continue
        rows, a = b["rows"], b["attacker"]
        start = b["startFrame"]
        sprites = {}
        for r in rows:
            for s in r["sprites"]:
                key = f"{s['slot']}:{s['tileTag']}"
                e = sprites.setdefault(key, {"slot": s["slot"], "tileTag": s["tileTag"], "created": r["age"], "last": r["age"], "pos": [],
                                             "subpriority": s["subpriority"], "orderPos": r["orderPos"][str(s["slot"])], "anim": [], "attr": []})
                e["last"] = r["age"]
                for field, v in (("pos", [s["x"], s["y"], s["x2"], s["y2"]]), ("anim", [s["animNum"], s["animCmdIndex"]]),
                                 ("attr", s["attr"] + [int(s["invisible"])])):
                    if not e[field] or e[field][-1][1] != v:
                        e[field].append([r["age"], v])
        lines.append({
            "scenario": name, "kind": "struggle", "k": k, "side": "player" if a in (0, 2) else "opponent", "species": b["species"],
            "turnCounter": b["turnCounter"], "startFrame": start, "length": b["length"], "hpAt": b["hp"],
            "entryInUse": b["entryInUse"],
            "regs": changes(rows, lambda r: [r["regs"]["bldcnt"], r["regs"]["bldalpha"], r["regs"]["bg1cnt"], r["regs"]["bg2cnt"],
                                             r["regs"]["dispcnt"]]),
            "attacker": changes(rows, lambda r: [r["battlers"][a]["x2"], r["battlers"][a]["y2"], int(r["battlers"][a]["invisible"])]),
            "target": changes(rows, lambda r: [r["battlers"][1 - a]["x2"], r["battlers"][1 - a]["y2"], int(r["battlers"][1 - a]["invisible"])]),
            "sprites": list(sprites.values()),
            "tasks": [[r["age"], r["tasks"]] for r in rows if "tasks" in r],
            "hpEvents": [[e["frame"] - start, e["hp"]] for e in d["events"] if "hp" in e and start <= e["frame"] < start + 400],
            "rowsDigest": hashlib.sha256("".join(r["sha"] or "" for r in rows).encode()).hexdigest()[:16],
        })
        k += 1
Path(sys.argv[2]).write_text("".join(json.dumps(x, separators=(",", ":"), sort_keys=True) + "\n" for x in lines))
print(sum(1 for x in lines if x["kind"] == "struggle"), "Struggle windows;", sum(1 for x in lines if x["kind"] == "timing"), "scenarios")
