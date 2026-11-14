"""Static pre-check of a stage design (cwd = workspace/). `problems(stage)` returns the reasons the hunter should refuse it before any lab seed is spent:
- `script.replacements` names a party slot that can only be fainted by then (a repeat, more than two entries, or the lead 0 when the script never switches);
- a `cover` marker whose source line is an error `throw` (an engine stop, class (b): a battle that reaches it ends as an engine error);
- a `cover` snippet that does not occur exactly once in its file."""
import json, os, re, sys
W = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def problems(stage):
    out = []
    script = stage.get("script", {})
    reps = script.get("replacements", [])
    switches = any(k in a for a in script.get("actions", []) for k in ("switch", "preferSwitch"))
    if len(reps) > 2:
        out.append(f"replacements {reps}: a side of three has at most two replacements")
    if len(set(reps)) != len(reps):
        out.append(f"replacements {reps}: a slot repeats, and a replacement that came in and fainted is not legal again")
    if 0 in reps and not switches:
        out.append(f"replacements {reps}: slot 0 is the lead; with no switch in the script it has fainted before any replacement")
    for i, c in enumerate(stage.get("cover", [])):
        if not c:
            continue
        path = os.path.join(W, c["file"])
        if not os.path.exists(path):
            out.append(f"cover[{i}]: no file {c['file']}")
            continue
        text = open(path, encoding="utf-8").read()
        n = text.count(c["text"])
        if n != 1:
            out.append(f"cover[{i}]: the snippet occurs {n} times in {c['file']} (must be exactly once)")
            continue
        pos = text.index(c["text"]) + c.get("at", 0)
        line = text[text.rfind("\n", 0, pos) + 1:text.find("\n", pos)]
        if re.search(r"\bthrow\b", line):
            out.append(f"cover[{i}]: the marker is on an error throw ({line.strip()[:60]!r}); a battle that reaches it ends as an engine error")
    return out


if __name__ == "__main__":
    bad = 0
    for f in sys.argv[1:]:
        p = problems(json.load(open(f)))
        print(os.path.basename(f), "REJECT" if p else "ok")
        for x in p:
            print("   ", x)
        bad += bool(p)
    sys.exit(1 if bad else 0)
