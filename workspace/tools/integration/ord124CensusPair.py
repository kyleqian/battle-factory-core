#!/usr/bin/env python3
"""ord124 (docs/ord124-order-plans.md): pair two hist73Merge.py census dirs (base / patched): command KEY sequence (battle, kind, moveId,
side, attacker, target), battleDigest / commandKeyDigest / shard digests, per-command frames, and every status / decline change.
usage: ord124CensusPair.py <base-dir> <patched-dir> <out.json>"""
import json, sys
from collections import Counter
from pathlib import Path

b, p = (Path(a) for a in sys.argv[1:3])
mb, mp = (json.loads((d / "merged.json").read_text()) for d in (b, p))
B, P = ([json.loads(l) for l in (d / "merged.jsonl").read_text().splitlines() if l.strip()] for d in (b, p))
key = lambda r: (r["battle"], r["kind"], r["moveId"], r["side"], r["attacker"], r["target"])
changes = [(x, y) for x, y in zip(B, P) if x["status"] != y["status"] or x.get("decline") != y.get("decline")]
lifted = [(x, y) for x, y in changes if x["status"] != "live" and y["status"] == "live"]
out = {
    "schema": "ord124-census-pair/v1",
    "commands": [len(B), len(P)],
    "keysIdentical": [key(r) for r in B] == [key(r) for r in P],
    "framesIdenticalPerCommand": len(B) == len(P) and all(x["frames"] == y["frames"] for x, y in zip(B, P)),
    "battleDigestIdentical": mb["battleDigest"] == mp["battleDigest"],
    "commandKeyDigestIdentical": mb["commandKeyDigest"] == mp["commandKeyDigest"],
    "shardBattleDigestsIdentical": mb["shardBattleDigests"] == mp["shardBattleDigests"],
    "battleDigest": mb["battleDigest"], "commandKeyDigest": mb["commandKeyDigest"],
    "live": [sum(r["status"] == "live" for r in B), sum(r["status"] == "live" for r in P)],
    "liveFrames": [sum(r["liveFrames"] for r in B), sum(r["liveFrames"] for r in P)],
    "frames": [sum(r["frames"] for r in B), sum(r["frames"] for r in P)],
    "lifted": {"commands": len(lifted), "frames": sum(y["liveFrames"] for _, y in lifted),
               "byBattleMoveSide": {f"{k[0]} {k[1]}:{k[2]}": v for k, v in sorted(Counter((x["battle"], x["moveId"], x["side"]) for x, _ in lifted).items())},
               "beforeDetail": dict(Counter((x.get("decline") or {}).get("detail") for x, _ in lifted))},
    "otherStatusChanges": [{"battle": x["battle"], "move": x["move"], "before": x["status"], "after": y["status"]} for x, y in changes if (x, y) not in lifted],
}
out["livePct"] = [round(100 * out["live"][i] / out["commands"][i], 2) for i in (0, 1)]
out["liveFramePct"] = [round(100 * out["liveFrames"][i] / out["frames"][i], 2) for i in (0, 1)]
Path(sys.argv[3]).write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
print(json.dumps({k: out[k] for k in ("keysIdentical", "framesIdenticalPerCommand", "battleDigestIdentical", "commandKeyDigestIdentical",
                                      "live", "liveFrames", "livePct", "liveFramePct")}), "lifted", out["lifted"]["commands"], "/",
      out["lifted"]["frames"], "other changes", len(out["otherStatusChanges"]))
