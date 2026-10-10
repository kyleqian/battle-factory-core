"""hide66: live-share census delta keyed on the command KEY sequence (battle, kind, moveId, side, attacker, target), not body lengths.
usage: python3 tools/integration/hide66CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> > <out.json>
Asserts the identical key sequence and battle digest (presentation-only change); counts fallback -> live (+ commands, + live frames) and
lists every live -> non-live change with the AFTER decline reason."""
import json, sys
from collections import Counter

bj, bl, aj, al = sys.argv[1:5]
load = lambda p: [json.loads(x) for x in open(p) if x.strip()]
B, A = load(bl), load(al)
key = lambda c: (c["battle"], c["kind"], c["moveId"], c["side"], c["attacker"], c["target"])
assert [key(c) for c in B] == [key(c) for c in A], "command key sequence differs"
rb, ra = json.load(open(bj)), json.load(open(aj))
assert rb["battleDigest"] == ra["battleDigest"], "battle digest differs"
up = [(b, a) for b, a in zip(B, A) if b["status"] != "live" and a["status"] == "live"]
down = [(b, a) for b, a in zip(B, A) if b["status"] == "live" and a["status"] != "live"]
other = [(b, a) for b, a in zip(B, A) if b["status"] != a["status"] and (b, a) not in up and (b, a) not in down]
frames = [(b, a) for b, a in zip(B, A) if b["frames"] != a["frames"]]
lf = lambda xs: sum(a["liveFrames"] - b["liveFrames"] for b, a in xs)
out = {
    "keySequenceEqual": True, "battleDigest": ra["battleDigest"], "commands": len(A),
    "before": {k: rb["overall"][k] for k in ("live", "liveFrames", "frames", "liveSharePctByCount", "liveSharePctByFrames")},
    "after": {k: ra["overall"][k] for k in ("live", "liveFrames", "frames", "liveSharePctByCount", "liveSharePctByFrames")},
    "fallbackToLive": {"commands": len(up), "liveFrames": lf(up),
                       "byMove": Counter(f"{a['move']}/{a['side']}" for _, a in up).most_common()},
    "liveToNonLive": [{"battle": a["battle"], "move": a["move"], "side": a["side"], "status": a["status"], "liveFramesLost": b["liveFrames"] - a["liveFrames"],
                       "reason": (a.get("decline") or {}).get("reason"), "gate": (a.get("decline") or {}).get("gate")} for b, a in down],
    "otherStatusChanges": [{"battle": a["battle"], "move": a["move"], "side": a["side"], "before": b["status"], "after": a["status"],
                            "liveFramesDelta": a["liveFrames"] - b["liveFrames"]} for b, a in other],
    "bodyLengthChanges": [{"battle": a["battle"], "move": a["move"], "side": a["side"], "framesBefore": b["frames"], "framesAfter": a["frames"]} for b, a in frames],
    "netLiveCommands": ra["overall"]["live"] - rb["overall"]["live"], "netLiveFrames": ra["overall"]["liveFrames"] - rb["overall"]["liveFrames"],
}
print(json.dumps(out, indent=1))
