#!/usr/bin/env python3
"""hist73: merge the --index-from shards of hist73LiveShareCensus.ts / hist73AllocatorCensus.ts into one seeds-0..999 report.

usage: hist73Merge.py <shard-dir> <out.json> <out.jsonl>
<shard-dir>/r0..r9.json + .jsonl (shard k = seeds 100k..100k+99, --index-from=100k, so battle ids are already global). Writes the
concatenated per-command records and a summary: overall live share, per decline reason, per decline detail (allocator / order host),
the shards' battle digests (in order) and their sha256 (`battleDigest`), the command KEY digest over (battle, kind, moveId, side,
attacker, target), and hiddenBattlerOrderStops when the shards carry them (hist73AllocatorCensus.ts).
"""
import hashlib, json, sys
from collections import defaultdict
from pathlib import Path

shards, out_json, out_jsonl = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
reports = [json.loads((shards / f"r{k}.json").read_text()) for k in range(10)]
lines = [l for k in range(10) for l in (shards / f"r{k}.jsonl").read_text().splitlines() if l.strip()]
rows = [json.loads(l) for l in lines]
out_jsonl.write_text("\n".join(lines) + "\n")
fb = lambda c: c["frames"] - c["liveFrames"]
key = lambda c: [c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"]]
reason, detail = defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0])
for c in rows:
    if c["status"] == "live":
        continue
    d = c.get("decline") or {}
    r = f'{d.get("stage", "?")}: {d.get("reason", "unclassified (no decline recorded)")}'
    reason[r][0] += 1; reason[r][1] += fb(c)
    if d.get("detail"):
        detail[d["detail"]][0] += 1; detail[d["detail"]][1] += fb(c)
digests = [r["battleDigest"] for r in reports]
live = sum(c["status"] == "live" for c in rows)
frames, live_frames = sum(c["frames"] for c in rows), sum(c["liveFrames"] for c in rows)
summary = {
    "schema": "hist73-merged-census/v1", "seeds": "0..999", "shards": [r["config"]["seeds"] for r in reports],
    "battles": {"played": sum(r["battles"]["played"] for r in reports), "terminal": sum(r["battles"]["terminal"] for r in reports),
                "stalled": sum(r["battles"]["stalled"] for r in reports), "errors": sum(len(r["battles"]["errors"]) for r in reports),
                "frames": sum(r["battles"]["frames"] for r in reports), "playerTurns": sum(r["battles"]["playerTurns"] for r in reports)},
    "overall": {"commands": len(rows), "live": live, "frames": frames, "liveFrames": live_frames,
                "liveSharePctByCount": round(100 * live / len(rows), 2), "liveSharePctByFrames": round(100 * live_frames / frames, 2)},
    "perReason": [{"reason": k, "count": v[0], "frames": v[1]} for k, v in sorted(reason.items(), key=lambda kv: (-kv[1][1], kv[0]))],
    "perDetail": [{"detail": k, "count": v[0], "frames": v[1]} for k, v in sorted(detail.items(), key=lambda kv: (-kv[1][1], kv[0]))],
    "shardBattleDigests": digests,
    "battleDigest": hashlib.sha256("".join(digests).encode()).hexdigest(),
    "commandKeyDigest": hashlib.sha256(json.dumps([key(c) for c in rows]).encode()).hexdigest(),
    "renderThrows": sum(r["sanity"]["renderThrowCount"] for r in reports),
}
stops = [s for r in reports for s in r.get("hiddenBattlerOrderStops", [])]
if any("hiddenBattlerOrderStops" in r for r in reports):
    summary["hiddenBattlerOrderStops"] = stops
out_json.write_text(json.dumps(summary, indent=1) + "\n")
print(f'{summary["battles"]["played"]} battles, {len(rows)} commands, live {live} ({summary["overall"]["liveSharePctByCount"]} %) / '
      f'frames {live_frames} of {frames} ({summary["overall"]["liveSharePctByFrames"]} %); battleDigest {summary["battleDigest"][:12]}')
