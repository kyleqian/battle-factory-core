#!/bin/sh
# idle98 runner (docs/next-adapters-idle98.md). Run from workspace/; direct mGBA only (never the shared HTTP oracles); the production
# change is applied ONLY to a git-archive copy of the fixed base 3dd2b74b9 inside the FRESH <out-dir> (refused if non-empty; must be
# inside the repo so the copies find ../oracle). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/idle98Run.sh <fresh-out-dir> [--census]
# 1. archive copies: <out>/base (3dd2b74b9) and <out>/patched (+ fixtures/idle98/idle98-universal-rows.diff); the idle98 tools and
#    fixtures from this checkout are copied into both;
# 2. re-stage the 18 scenarios (must equal the committed ones and scenario-index.json);
# 3. probes: 18 scenarios x {ON, OFF} x {r1, r2} (idle94Probe.py, 7 parallel; a crashed job reruns once), r1 == r2 byte for byte and
#    == receipts/probe-sha256.json; idle98Compare.py (r1 == committed receipts/compare-r1.json, r2 == r1);
# 4. production routes: idle94Route.ts ON / OFF for the 16 census battles of the class table (base copy) == receipts/route-sha256.json;
#    idle98Classes.py == table/classes.{json,tsv};
# 5. render routes: idle94RouteRender.ts in both copies x {r1, r2}; idle98RenderCheck.py == receipts/render-check.json;
# 6. --census: liveShareCensus.ts seeds 0..999 (ten --index-from shards) in both copies, idle98CensusDelta.py == census-delta.json;
#    idle98Exposure.ts seeds 0..999 (five shards, base copy), idle98ExposureSummary.py == exposure.json.
set -eu
OUT=${1:?usage: idle98Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
W=$(pwd)
[ -f "$W/tools/integration/idle98Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
F=tools/integration/fixtures/idle98
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

for t in base patched; do
  mkdir -p "$OUT/$t"
  git -C .. archive 3dd2b74b9 workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
  cp tools/integration/idle98*.py tools/integration/idle98*.ts "$OUT/$t/workspace/tools/integration/"
  mkdir -p "$OUT/$t/workspace/$F" && cp -R "$F/." "$OUT/$t/workspace/$F/"
done
# patch(1), not git apply: inside the repo's tree git apply silently skips paths outside its cwd.
patch -s -p1 -d "$OUT/patched" < "$F/idle98-universal-rows.diff"
refs=$(grep -c liveMoveUniversalRows "$OUT/patched/workspace/src/engine/battleResolutionPresentationRender.ts" || true)
echo "patched: $refs liveMoveUniversalRows references"; [ "$refs" -gt 0 ] || { echo "patch not applied"; exit 1; }

# 2. staging
python3 tools/integration/idle98Stage.py "$OUT/stage/scenarios" > /dev/null
diff -r "$F/scenarios" "$OUT/stage/scenarios" > /dev/null && echo "SAME scenarios (18)" || { echo "DIFF scenarios"; fail=1; }
check "$F/scenario-index.json" "$OUT/stage/scenario-index.json" scenario-index

# 3. probes
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
# job.sh <outdir> <mode> <scenario>   (run from the base copy's workspace/; IDLE98_PY)
o=$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$IDLE98_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$IDLE98_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
chmod +x "$OUT/job.sh"
export IDLE98_PY="$PY"
(cd "$OUT/base/workspace" && for r in r1 r2; do for m in on off; do for f in "$W/$F"/scenarios/*.json; do echo "$OUT/probes/$r $m $f"; done; done; done \
  | xargs -P 7 -n 3 "$OUT/job.sh")
n=0; same=0
for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
echo "probes: $same / $n r1 == r2"; [ "$same" -eq "$n" ] && [ "$n" -eq 36 ] || fail=1
python3 - "$OUT" "$F/receipts/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))["sha256"]
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
python3 tools/integration/idle98Compare.py "$OUT/probes/r1" "$F/scenario-index.json" "$OUT/compare-r1.json" | tail -1
python3 tools/integration/idle98Compare.py "$OUT/probes/r2" "$F/scenario-index.json" "$OUT/compare-r2.json" > /dev/null
check "$F/receipts/compare-r1.json" "$OUT/compare-r1.json" "compare-r1.json"
check "$OUT/compare-r1.json" "$OUT/compare-r2.json" "compare r2 == r1"

# 4. production routes (class table)
mkdir -p "$OUT/routes"
for b in 0 2 4 6 7 11 19 23 27 154 201 250 268 398 527 718; do for sc in on off; do
  (cd "$OUT/base/workspace" && node --experimental-strip-types --no-warnings tools/integration/idle94Route.ts --seed=$b --streak=$(( (b * 11) % 49 )) \
    --scene=$sc --out="$OUT/routes/b$b-$sc.json" > /dev/null)
done; done
python3 - "$OUT/routes" "$F/receipts/route-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
d, rec = sys.argv[1], json.load(open(sys.argv[2]))["sha256"]
same = sum(hashlib.sha256(open(os.path.join(d, k), "rb").read()).hexdigest() == v for k, v in rec.items())
print(f"routes == committed sha256: {same} / {len(rec)}")
sys.exit(0 if same == len(rec) else 1)
PYEOF
python3 tools/integration/idle98Classes.py "$F/receipts/compare-r1.json" "$OUT/routes" "$OUT/table" | head -1
check "$F/table/classes.json" "$OUT/table/classes.json" "table/classes.json"
check "$F/table/classes.tsv" "$OUT/table/classes.tsv" "table/classes.tsv"

# 5. render routes
mkdir -p "$OUT/render"
for t in base patched; do for r in r1 r2; do
  (cd "$OUT/$t/workspace" && while read -r b m sd; do
    node --experimental-strip-types --no-warnings tools/integration/idle94RouteRender.ts --seed="$b" --streak=$(( (b * 11) % 49 )) --move="$m" \
      --side="$sd" --out="$OUT/render/$t-$r-b$b-$m-$sd.json" > /dev/null
  done < "$W/$F/render-routes.txt")
done; done
python3 tools/integration/idle98RenderCheck.py "$OUT/render" "$F/render-routes.txt" "$F/idle98-universal-rows.diff" "$OUT/render-check.json" | tail -1
check "$F/receipts/render-check.json" "$OUT/render-check.json" "render-check.json"

# 6. census + exposure (optional)
if [ "$CENSUS" = "--census" ]; then
  for t in base patched; do
    mkdir -p "$OUT/census-$t"
    (cd "$OUT/$t/workspace" && for k in 0 1 2 3 4 5 6 7 8 9; do
      node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$((k * 100))..$((k * 100 + 99)) --index-from=$((k * 100)) \
        --out="$OUT/census-$t/r$k.json" --commands="$OUT/census-$t/r$k.jsonl" > "$OUT/census-$t/r$k.log" 2>&1 &
    done; wait)
  done
  python3 tools/integration/idle98CensusDelta.py "$OUT/census-base" "$OUT/census-patched" "$F/idle98-universal-rows.diff" "$OUT/census-delta.json" | head -1
  check "$F/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
  mkdir -p "$OUT/exposure"
  (cd "$OUT/base/workspace" && for k in 0 1 2 3 4; do
    node --experimental-strip-types --no-warnings tools/integration/idle98Exposure.ts --seeds=$((k * 200))..$((k * 200 + 199)) \
      --out="$OUT/exposure/e$k.jsonl" > "$OUT/exposure/e$k.log" 2>&1 &
  done; wait)
  python3 tools/integration/idle98ExposureSummary.py "$OUT/exposure" "$OUT/census-base" "$OUT/exposure.json" | tail -1
  check "$F/exposure.json" "$OUT/exposure.json" "exposure.json"
fi
[ "$fail" -eq 0 ] && echo "idle98Run: ALL SAME" || { echo "idle98Run: DIFFERENCES (see above)"; exit 1; }
