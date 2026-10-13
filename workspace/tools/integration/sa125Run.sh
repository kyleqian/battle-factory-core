#!/bin/sh
# sa125 (S10A, ISSUES #168 SA1 + SA3; docs/sa125-status-animation-command.md): rerun the status-animation command evidence from scratch.
#   sh tools/integration/sa125Run.sh <fresh-out-dir-inside-the-repo> [<final-rev>]     (from workspace/)
# 1. git-archive copies of the base cfe4e26ca and <final-rev> (default HEAD), each its own git repo (node_modules symlinked);
# 2. vitest tests/sa125StatusAnimationCommand.test.ts in the final copy;
# 3. Scene ON census: sa125LiveShareCensus.ts (the final copy's file in both trees) seeds 0..999, ten --index-from shards per tree,
#    hist73Merge.py per tree, sa125CensusDelta.py (vs sta123 exposure.json);
# 4. Scene OFF census: off108Route.ts --scene=off seeds 0..999, ten shards per tree, every shard byte-identical;
# 5. the receipt (delta verdicts / counts + OFF identity + trees) == tools/integration/fixtures/sa125-live-receipt.json.
set -u
OUT="$1"; FINAL="${2:-HEAD}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
W=$(pwd); ROOT=$(git rev-parse --show-toplevel); BASE=cfe4e26ca
FINAL_SHA=$(git rev-parse "$FINAL"); fail=0
NODE="node --max-old-space-size=4096 --experimental-strip-types --no-warnings"
for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=$FINAL_SHA
  mkdir -p "$OUT/$t"
  git -C "$ROOT" archive "$rev" | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  [ -e "$W/reference" ] && ln -s "$W/reference" "$OUT/$t/workspace/reference"
  (cd "$OUT/$t" && git init -q && git -c user.email=sa125@local -c user.name=sa125 commit -q --allow-empty -m "$t")
  echo "$(git rev-parse "$rev") $(git rev-parse "$rev:workspace/src")" > "$OUT/$t.rev"
done
FW="$OUT/final/workspace"; BW="$OUT/base/workspace"
cp "$FW/tools/integration/sa125LiveShareCensus.ts" "$BW/tools/integration/"
# 2. test
(cd "$FW" && npx vitest run tests/sa125StatusAnimationCommand.test.ts > "$OUT/vitest.log" 2>&1) && echo "sa125StatusAnimationCommand: PASS" \
  || { echo "sa125StatusAnimationCommand: FAIL"; fail=1; }
# 3. Scene ON census
for t in base final; do
  mkdir -p "$OUT/on-$t"
  for k in 0 1 2 3 4 5 6 7 8 9; do
    (cd "$OUT/$t/workspace" && $NODE tools/integration/sa125LiveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
      --out="$OUT/on-$t/r$k.json" --commands="$OUT/on-$t/r$k.jsonl" --stats="$OUT/on-$t/s$k.jsonl" > "$OUT/on-$t/r$k.log" 2>&1) &
  done
  wait
  python3 "$FW/tools/integration/hist73Merge.py" "$OUT/on-$t" "$OUT/on-$t/merged.json" "$OUT/on-$t/merged.jsonl" | tail -1
done
python3 "$FW/tools/integration/sa125CensusDelta.py" "$OUT/on-base" "$OUT/on-final" "$FW/tools/integration/fixtures/sta123/exposure.json" \
  "$OUT/delta.json" > "$OUT/delta.txt" || fail=1
# 4. Scene OFF census
for t in base final; do
  mkdir -p "$OUT/off-$t"
  for k in 0 1 2 3 4 5 6 7 8 9; do
    (cd "$OUT/$t/workspace" && $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off \
      --out="$OUT/off-$t/off-$k.jsonl" > "$OUT/off-$t/off-$k.log" 2>&1) &
  done
  wait
done
same=0
for k in 0 1 2 3 4 5 6 7 8 9; do cmp -s "$OUT/off-base/off-$k.jsonl" "$OUT/off-final/off-$k.jsonl" && same=$((same + 1)); done
echo "Scene OFF census: $same / 10 shards byte-identical"; [ "$same" -eq 10 ] || fail=1
# 5. receipt
python3 - "$OUT" "$FW/tools/integration/fixtures/sa125-live-receipt.json" "$same" <<'PYEOF' || fail=1
import json, sys
out, committed, same = sys.argv[1], sys.argv[2], int(sys.argv[3])
d = json.load(open(f"{out}/delta.json"))
rev = lambda t: dict(zip(("commit", "src"), open(f"{out}/{t}.rev").read().split()))
rec = {"schema": "sa125-live-receipt/v1", "base": rev("base"), "final": {"src": rev("final")["src"]},
       "verdict": d["verdict"], "statusAnimation": d["statusAnimation"], "kernelReceipts": d["kernelReceipts"],
       "statusCommandClasses": d["statusCommandClasses"], "statusFramesDelta": d["statusFramesDelta"], "liveShare": d["liveShare"],
       "truncatedBattles": d["truncatedBattles"], "moveCommands": d["moveCommands"], "sceneOffShardsByteIdentical": same}
open(f"{out}/sa125-live-receipt.json", "w").write(json.dumps(rec, indent=1) + "\n")
ok = all(v is True for v in d["verdict"].values()) and same == 10
print("verdict:", "ALL TRUE" if ok else json.dumps(d["verdict"]))
try:
    print("receipt == committed:", "SAME" if open(committed).read() == open(f"{out}/sa125-live-receipt.json").read() else "DIFF")
except FileNotFoundError:
    print("receipt: no committed copy")
sys.exit(0 if ok else 1)
PYEOF
rm -f "$OUT/base/workspace/node_modules" "$OUT/final/workspace/node_modules" "$OUT/base/workspace/reference" "$OUT/final/workspace/reference"
[ "$fail" -eq 0 ] && echo "sa125Run: ALL OK" || echo "sa125Run: FAILED"
exit "$fail"
