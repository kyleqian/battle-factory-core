#!/usr/bin/env python3
"""sag130: the live receipt from a sag130Run.sh out dir (delta.json, base.rev / final.rev) and the Scene OFF shard identity count.

usage: sag130Receipt.py <out-dir> <committed-receipt.json> <scene-off-identical-shards>
Writes <out-dir>/sag130-live-receipt.json; exit 0 when every delta verdict is true and 10 / 10 OFF shards are identical.
"""
import json, sys
out, committed, same = sys.argv[1], sys.argv[2], int(sys.argv[3])
d = json.load(open(f"{out}/delta.json"))
rev = lambda t: dict(zip(("commit", "src"), open(f"{out}/{t}.rev").read().split()))
rec = {"schema": "sag130-live-receipt/v1", "base": rev("base"), "final": {"src": rev("final")["src"]}, "verdict": d["verdict"],
       "changedCommands": d["changedCommands"], "changedFrames": d["changedFrames"], "byClass": d["byClass"],
       "byClassAnimationSide": d["byClassAnimationSide"], "receipts": d["receipts"], "seNull": d["seNull"],
       "projectionReceiptsMatched": d["projectionReceiptsMatched"], "projectionTotal": d["projectionTotal"], "moveCommands": d["moveCommands"],
       "liveShareUntruncated": d["liveShareUntruncated"], "battleFrameResidualDistribution": d["battleFrameResidualDistribution"],
       "truncatedBattles": d["truncatedBattles"], "sceneOffShardsByteIdentical": same}
open(f"{out}/sag130-live-receipt.json", "w").write(json.dumps(rec, indent=1) + "\n")
ok = all(v is True for v in d["verdict"].values()) and same == 10
print("verdict:", "ALL TRUE" if ok else json.dumps(d["verdict"]))
try:
    print("receipt == committed:", "SAME" if open(committed).read() == open(f"{out}/sag130-live-receipt.json").read() else "DIFF")
except FileNotFoundError:
    print("receipt: no committed copy")
sys.exit(0 if ok else 1)
