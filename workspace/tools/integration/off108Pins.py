#!/usr/bin/env python3
"""off108: the test pins the banked Scene OFF pause patch moves, from `npm test` output of the PATCHED archive copy (its own git repo).

usage: off108Pins.py <npm-test.log> <out.json>
Parses vitest's failure blocks (" FAIL  <file> > <suite> > <test>" then the first line naming an Error) and the summary lines. Each pin
gets a kind from its assertion: "row / frame sequence" (a deeply-equal array), "count" (expected N to be M), or the hand-reviewed label in
REVIEWED (else "other", listed verbatim).
"""
import collections, json, re, sys

log, out = sys.argv[1:3]
text = re.sub(r"\x1b\[[0-9;]*m", "", open(log, errors="replace").read())
lines = text.splitlines()
# The assertions reviewed by hand (off108). appDifferential is NOT a pin: it needs HEAD~ (a one-commit copy repo fails it; with a second
# commit the file passes 10 / 10) — kept in the list, labelled, and excluded from pinCount.
REVIEWED = {
    "appDifferential.test.ts:131": "ENVIRONMENT (one-commit copy repo: 'fatal: Needed a single revision'; passes 10 / 10 with a second commit)",
    "factoryRoundBattleOrchestrator.test.ts:1094": "presence pin (Scene OFF Harden + Sandstorm turn: `no move-animation command` — its no-hit OFF attack pauses (Harden's, the weather move's) are now presented; the guarded invariant, no pairing with the weather loop's hit, still holds)",
    "randomRoundSoak.test.ts:311": "frame total (soak seed 21 strong-route: frames 37,260 -> 38,077, renderCalls 2,671 -> 2,715; same battle / outcome / turn)",
    "randomRoundSoak.test.ts:495": "driver path (soak seed 27, random policy: the driver presses A in resolution with rng.gap cooldowns, so longer presentation consumes more policy draws; the round is now lost at battle 1 turn 28 (20,755 frames) instead of battle 4 turn 26 (64,525), so `frames > 30,798` no longer reaches the ISSUES #89 point: re-seed)",
    "randomRoundSoak.test.ts:728": "frame total (Milestone M-B 'full' seed 0: frames 11,955 -> 13,889; same battle / endState / turn)",
    "randomRoundSoak.test.ts:754": "frame total (Milestone M-B 'vanilla' seed 0: frames 8,499 -> 9,003; same battle / endState / turn)",
}
pins, seen = [], set()
for i, line in enumerate(lines):
    m = re.match(r"^\s*FAIL\s+(\S+\.test\.ts)\s+>\s+(.*)$", line)
    if not m:
        continue
    file, test = m.group(1), m.group(2).strip()
    if (file, test) in seen:
        continue
    seen.add((file, test))
    assertion = next((l.strip() for l in lines[i + 1:i + 40] if re.search(r"(Error|expected)", l)), "")
    where = next((l.strip() for l in lines[i + 1:i + 60] if re.search(r"❯ \S+\.test\.ts:\d+", l)), "")
    kind = ("row / frame sequence" if re.search(r"deeply equal \[", assertion) else
            "count" if re.search(r"expected -?\d+ to (be|equal|deeply equal) -?\d+", assertion) else "other")
    kind = next((v for k, v in REVIEWED.items() if k in assertion or k in where), kind)
    pins.append({"file": file, "test": test, "assertion": assertion[:240], "where": where[:160], "kind": kind})
totals = [l.strip() for l in lines if re.match(r"^\s*(Test Files|Tests)\s", l)]
by_file = collections.Counter(p["file"] for p in pins)
res = {"tree": "git archive 52c181d54 + off108-scene-off-pauses.diff (scratch copy with its own git repo)",
       "command": "npm test", "totals": totals, "pinCount": sum(not p["kind"].startswith("ENVIRONMENT") for p in pins),
       "files": len({p["file"] for p in pins if not p["kind"].startswith("ENVIRONMENT")}),
       "byKind": dict(collections.Counter(p["kind"] for p in pins)), "byFile": dict(by_file.most_common()), "pins": pins}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("pins", "byFile")}))
