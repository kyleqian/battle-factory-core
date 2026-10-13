#!/bin/sh
# rst139 runner (docs/rst139-ordinary-row-rest.md). Run from workspace/ (a checkout or a fresh git-archive copy inside the repo; its src
# must be the base, 49654eefb's). Direct mGBA only (never the shared HTTP oracles). Nothing outside <out-dir> is written.
#   sh tools/integration/rst139Run.sh <fresh-out-dir-inside-the-repo> [--census]     (~4 min; with --census ~7 min more)
# 1. exposure: rst139ExposureShards.sh 0..999 on this tree, rst139ExposureSummary.py == fixtures/rst139/exposure.json;
# 2. ROM: rst139Probes.sh (8 scenarios x r1 (full-frame dump) / r2), r1 == r2 == probe-sha256.json, rst139Rom.py == rom-receipt.json;
# 3. production: <out>/patched = this workspace's files + git apply fixtures/rst139/rst139-rest.diff; rst139NpzToRaw.py, then
#    rst139ProductionCompare.ts in this tree (== production-compare-base.json) and in the patched copy (== production-compare-patched.json);
# 4. routes: rst139Routes.sh in both trees (the 9 ONIX census battles), rst139RouteDelta.py == routes-delta.json;
# 5. (--census) sad133Census.sh both trees, sar131CensusDelta.py == census-delta.json (0 command / frame / status changes).
# Raw frame dumps are deleted at the end (RST139_KEEP_RAW=1 keeps them); delete <out-dir> afterwards.
set -u
OUT=${1:?usage: rst139Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
W=$(pwd)
[ -f "$W/tools/integration/rst139Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
FX=tools/integration/fixtures/rst139
NODE="node --experimental-strip-types --no-warnings"
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

# 1. exposure
sh tools/integration/rst139ExposureShards.sh "$OUT/exposure" > /dev/null
python3 tools/integration/rst139ExposureSummary.py "$OUT/exposure" "$OUT/exposure.json" | tail -1
check "$FX/exposure.json" "$OUT/exposure.json" "exposure.json"

# 2. ROM
sh tools/integration/rst139Probes.sh "$OUT/rom" "$FX/scenarios"
cat "$OUT/rom/done"; grep -q "r1 == r2: 8 / 8" "$OUT/rom/done" || fail=1
python3 - "$OUT/rom" "$FX/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, "probes", r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"probe outputs == committed sha256: {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) else 1)
PYEOF
python3 tools/integration/rst139Rom.py "$OUT/rom/probes/r1" "$FX/scenario-index.json" "$OUT/rom-receipt.json" > /dev/null
check "$FX/rom-receipt.json" "$OUT/rom-receipt.json" "rom-receipt.json"

# 3. production today / patched on the ROM windows
mkdir -p "$OUT/patched/workspace"
XL=./tools/integration/fixtures/species-audit-6
tar -cf - --exclude ./node_modules --exclude ./reference --exclude ./artifacts --exclude ./.integration --exclude ./dist --exclude ./.git \
  --exclude $XL . | tar -x -C "$OUT/patched/workspace"
P="$OUT/patched/workspace"
ln -s "$W/node_modules" "$P/node_modules"; ln -s "$W/reference" "$P/reference"
(cd "$P" && git apply "$W/$FX/rst139-rest.diff") || { echo "patch does not apply"; exit 1; }
python3 tools/integration/rst139NpzToRaw.py "$OUT/rom/probes/r1" "$OUT/rom/dump" "$OUT/raw" > /dev/null
$NODE tools/integration/rst139ProductionCompare.ts "$OUT/raw" "$OUT/cmp-base.json" | tail -1 | sed "s/^/today:   /"
check "$FX/production-compare-base.json" "$OUT/cmp-base.json" "production-compare-base.json"
(cd "$P" && $NODE tools/integration/rst139ProductionCompare.ts "$OUT/raw" "$OUT/cmp-patched.json" | tail -1 | sed "s/^/patched: /")
check "$FX/production-compare-patched.json" "$OUT/cmp-patched.json" "production-compare-patched.json"

# 4. routes
sh tools/integration/rst139Routes.sh "$W" "$OUT/routes-base" > /dev/null &
sh tools/integration/rst139Routes.sh "$P" "$OUT/routes-patched" > /dev/null &
wait
python3 tools/integration/rst139RouteDelta.py "$OUT/routes-base" "$OUT/routes-patched" "$OUT/routes-delta.json" | tail -1
check "$FX/routes-delta.json" "$OUT/routes-delta.json" "routes-delta.json"

# 5. census
if [ "$CENSUS" = "--census" ]; then
  sh tools/integration/sad133Census.sh "$W" "$OUT/census-base" > /dev/null 2>&1 &
  sh tools/integration/sad133Census.sh "$P" "$OUT/census-patched" > /dev/null 2>&1 &
  wait
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-patched" "$OUT/census-delta.json" | head -2
  check "$FX/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
fi
[ "${RST139_KEEP_RAW:-0}" = 1 ] || rm -rf "$OUT/rom/dump" "$OUT/raw"
rm -f "$P/node_modules" "$P/reference"
[ "$fail" -eq 0 ] && echo "ALL SAME" || { echo "SOME DIFF"; exit 1; }
