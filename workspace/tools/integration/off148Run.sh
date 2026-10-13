#!/bin/sh
# off148 runner (docs/off148-scene-off-pauses-remainder.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles). Both
# trees are git-archive copies inside the FRESH <out-dir> (refused if non-empty; must be inside the repo so the copies find ../oracle).
# Nothing outside <out-dir> is written or removed.
#   sh tools/integration/off148Run.sh <fresh-out-dir> [<final-rev>]       (final-rev default HEAD; base = d019cd6b4)
# 1. archive copies: <out>/base (d019cd6b4) and <out>/final; the off148 tools and fixtures from this checkout are copied into both;
# 2. R1 staging: off148Stage.py == the committed scenarios + scenario-index.json;
# 3. R1 probes: 9 scenarios x Scene OFF x {r1, r2} (idle94Probe.py, 9 parallel; a crashed job reruns once), r1 == r2 byte for byte and
#    == receipts/probe-sha256.json; off148Rom.py r1 == receipts/rom-r1.json, r2 == r1;
# 4. census 0..999 (ten shards per tree): off108Route.ts Scene OFF and Scene ON in both trees, liveShareCensus.ts (Scene ON) in both
#    trees; every ON file byte-identical between the trees;
# 5. R2 / R3: off148CensusDelta.py == census-delta.json; off148Verify.py (anchor table, ROM rows vs production) == verify.json.
set -eu
OUT=${1:?usage: off148Run.sh <fresh-out-dir> [<final-rev>]}
FINAL=${2:-HEAD}
BASE=d019cd6b4
W=$(pwd)
[ -f "$W/tools/integration/off148Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/off148
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

FINAL_SHA=$(git rev-parse "$FINAL")
echo "base $BASE src $(git rev-parse $BASE:workspace/src) / final $FINAL_SHA src $(git rev-parse $FINAL_SHA:workspace/src)"
for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=$FINAL_SHA
  mkdir -p "$OUT/$t"
  git -C .. archive "$rev" workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
  cp tools/integration/off148*.py tools/integration/off108Route.ts "$OUT/$t/workspace/tools/integration/"
  mkdir -p "$OUT/$t/workspace/$F" && cp -R "$F/." "$OUT/$t/workspace/$F/"
done

# 2. staging
python3 tools/integration/off148Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios (9)" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index

# 3. probes (Scene OFF)
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
# job.sh <outdir> <mode> <scenario>   (run from the base copy's workspace/; OFF148_PY)
o=$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$OFF148_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$OFF148_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
chmod +x "$OUT/job.sh"
export OFF148_PY="$PY"
(cd "$OUT/base/workspace" && for r in r1 r2; do for f in "$W/$F"/scenarios/*.json; do echo "$OUT/probes/$r off $f"; done; done \
  | xargs -P 9 -n 3 "$OUT/job.sh")
n=0; same=0
for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 9 ] || fail=1
python3 - "$OUT" "$F/receipts/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))["probes"]
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
python3 tools/integration/off148Rom.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/rom-r1.json" > /dev/null
python3 tools/integration/off148Rom.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/rom-r2.json" > /dev/null
check "$F/receipts/rom-r1.json" "$OUT/rom-r1.json" "rom-r1.json"
check "$OUT/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"

# 4. census 0..999
for t in base final; do
  mkdir -p "$OUT/off-$t" "$OUT/on-$t" "$OUT/live-$t"
  (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
    $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --out="$OUT/off-$t/off-$k.jsonl" > /dev/null 2>&1 &
    $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=on --out="$OUT/on-$t/on-$k.jsonl" > /dev/null 2>&1 &
  done; wait)
  (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
    $NODE tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
      --out="$OUT/live-$t/r$k.json" --commands="$OUT/live-$t/r$k.jsonl" > "$OUT/live-$t/r$k.log" 2>&1 &
  done; wait)
done
n=0; same=0
for f in "$OUT/live-base"/r*.json "$OUT/live-base"/r*.jsonl; do n=$((n + 1)); cmp -s "$f" "$OUT/live-final/$(basename "$f")" && same=$((same + 1)); done
echo "Scene ON liveShareCensus: $same / $n files byte-identical"; [ "$same" -eq "$n" ] && [ "$n" -eq 20 ] || fail=1

# 5. R2 / R3 receipts
python3 tools/integration/off148CensusDelta.py "$OUT/off-base" "$OUT/off-final" "$OUT/census-delta.json" "$OUT/on-base" "$OUT/on-final" \
  > "$OUT/census-delta.txt"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('census OFF uses', d['uses'], 'commandMismatch', d['commandMismatch'], 'inserted', d['inserted'], '/ ON', d['sceneOn'])" "$OUT/census-delta.json"
check "$F/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
python3 tools/integration/off148Verify.py "$OUT/rom-r1.json" tools/integration/fixtures/off108/receipts/rom-r1.json "$OUT/off-base" "$OUT/off-final" \
  "$OUT/verify.json"
check "$F/verify.json" "$OUT/verify.json" "verify.json"
[ "$fail" -eq 0 ] && echo "off148Run: ALL SAME" || { echo "off148Run: DIFFERENCES (see above)"; exit 1; }
