"""Compare two soundEventProbe outputs (reference stepping log vs hybrid log): exit 0 only when they are identical.

  python3 tools/audio/compareProbe.py STEP.json HYBRID.json

Compared: window, profile, frames, hooks, events, calls (everything except mode / steps / seconds / hybrid stats).
Rows the stepping reference flagged "noop": true (a call that left the m4a RAM signature unchanged, e.g. m4aSongNumStop of a
song that is not playing, or a volume restored to its current value) are excluded: a RAM-signature hybrid cannot see them by
construction and they change no sound. The hybrid probe drops the noop rows it happens to step; both sides are filtered here and
the stepping side's excluded rows are listed.
"""
import json, sys

SKIP = {"mode", "steps", "seconds", "windowSeconds", "hybrid"}


def main():
    a, b = (json.load(open(p)) for p in sys.argv[1:3])
    bad = 0
    for key in sorted((set(a) | set(b)) - SKIP - {"events", "calls"}):
        if a.get(key) != b.get(key):
            print(f"header {key}: {a.get(key)!r} != {b.get(key)!r}")
            bad += 1
    for key in ("events", "calls"):
        for r in a[key]:
            if r.get("noop"):
                print(f"{key} noop (excluded): {json.dumps(r, sort_keys=True)}")
        ja = [json.dumps(r, sort_keys=True) for r in a[key] if not r.get("noop")]
        jb = [json.dumps(r, sort_keys=True) for r in b[key] if not r.get("noop")]
        for r in ja:
            if r not in jb:
                print(f"{key} only in {sys.argv[1]}: {r}")
                bad += 1
        for r in jb:
            if r not in ja:
                print(f"{key} only in {sys.argv[2]}: {r}")
                bad += 1
        if ja == jb:
            print(f"{key}: {len(ja)} identical")
        elif not bad:
            print(f"{key}: same rows, different order")
            bad += 1
    print("EQUAL" if not bad else f"DIFFERENT ({bad})")
    sys.exit(1 if bad else 0)


main()
