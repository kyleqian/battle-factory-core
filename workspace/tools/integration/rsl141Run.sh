#!/bin/sh
# rsl141 runner (docs/rsl141-ordinary-row-rest-live.md): re-proves rst139's ordinary-row idle rest FROM THE LANDED TREE. Run from
# workspace/ (a checkout or a fresh git-archive copy inside the repo; its src must carry the landed rst139-rest.diff). The BASE tree is
# <out>/base/workspace = this tree with fixtures/rst139/rst139-rest.diff reversed (patch -R; == the pre-landing src, 361829128's).
# Direct mGBA only (never the shared HTTP oracles). Nothing outside <out-dir> is written.
#   sh tools/integration/rsl141Run.sh <fresh-out-dir-inside-the-repo> [all|rom|routes|census]   (rom ~3 min, routes ~2, census ~7)
# rom:    rst139Probes.sh (8 scenarios x r1 / r2), r1 == r2 == fixtures/rst139/probe-sha256.json, rst139Rom.py == rom-receipt.json;
#         rst139NpzToRaw.py; rst139ProductionCompare.ts in the base (== fixtures/rst139/production-compare-base.json) and in THIS tree
#         (== fixtures/rst139/production-compare-patched.json: every settled row 0 px);
# routes: rst139Routes.sh in both trees (the 9 ONIX census battles), rst139RouteDelta.py == fixtures/rsl141/routes-delta.json
#         (a frame changes iff it is an at-stake row);
# census: sad133Census.sh both trees (0..999), sar131CensusDelta.py == fixtures/rsl141/census-delta.json (0 command / frame / status changes).
# Raw frame dumps are deleted at the end (RSL141_KEEP_RAW=1 keeps them); delete <out-dir> afterwards.
set -u
OUT=${1:?usage: rsl141Run.sh <fresh-out-dir> [all|rom|routes|census]}
STAGE=${2:-all}
W=$(pwd)
[ -f "$W/tools/integration/rsl141Run.sh" ] || { echo "run from workspace/"; exit 2; }
grep -q rst139 "$W/src/engine/core.ts" || { echo "refusing: this tree's src does not carry the landed rst139 rest"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
FX=tools/integration/fixtures/rst139
RX=tools/integration/fixtures/rsl141
NODE="node --experimental-strip-types --no-warnings"
fail=0
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }
want() { [ "$STAGE" = all ] || [ "$STAGE" = "$1" ]; }

# the base tree: this tree minus the landed diff
mkdir -p "$OUT/base/workspace"
XL=./tools/integration/fixtures/species-audit-6
tar -cf - --exclude ./node_modules --exclude ./reference --exclude ./artifacts --exclude ./.integration --exclude ./dist --exclude ./.git \
  --exclude $XL . | tar -x -C "$OUT/base/workspace"
B="$OUT/base/workspace"
ln -s "$W/node_modules" "$B/node_modules"; ln -s "$W/reference" "$B/reference"
patch -s -R -p1 -d "$B" < "$W/$FX/rst139-rest.diff" || { echo "the landed diff does not reverse"; exit 1; }
find "$B/src" -name '*.orig' -delete
grep -q rst139 "$B/src/engine/core.ts" && { echo "base still carries rst139"; exit 1; }

if want rom; then
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
  check "$FX/rom-receipt.json" "$OUT/rom-receipt.json" "rom-receipt.json (rst139's)"
  python3 tools/integration/rst139NpzToRaw.py "$OUT/rom/probes/r1" "$OUT/rom/dump" "$OUT/raw" > /dev/null
  (cd "$B" && $NODE tools/integration/rst139ProductionCompare.ts "$OUT/raw" "$OUT/cmp-base.json" | tail -1 | sed "s/^/base:  /")
  check "$FX/production-compare-base.json" "$OUT/cmp-base.json" "cmp-base.json == rst139 production-compare-base.json"
  $NODE tools/integration/rst139ProductionCompare.ts "$OUT/raw" "$OUT/cmp-final.json" | tail -1 | sed "s/^/final: /"
  check "$FX/production-compare-patched.json" "$OUT/cmp-final.json" "cmp-final.json == rst139 production-compare-patched.json"
fi

if want routes; then
  sh tools/integration/rst139Routes.sh "$B" "$OUT/routes-base" > /dev/null &
  sh tools/integration/rst139Routes.sh "$W" "$OUT/routes-final" > /dev/null &
  wait
  python3 tools/integration/rst139RouteDelta.py "$OUT/routes-base" "$OUT/routes-final" "$OUT/routes-delta.json" | tail -1
  check "$RX/routes-delta.json" "$OUT/routes-delta.json" "routes-delta.json"
fi

if want census; then
  # sad133Census.sh tars <tree>/tools, and species-audit-6 holds a file name tar cannot restore: census a filtered copy of this tree too
  mkdir -p "$OUT/final/workspace"
  tar -cf - --exclude ./node_modules --exclude ./reference --exclude ./artifacts --exclude ./.integration --exclude ./dist --exclude ./.git \
    --exclude $XL . | tar -x -C "$OUT/final/workspace"
  sh tools/integration/sad133Census.sh "$B" "$OUT/census-base" > /dev/null 2>&1 &
  sh tools/integration/sad133Census.sh "$OUT/final/workspace" "$OUT/census-final" > /dev/null 2>&1 &
  wait
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$OUT/census-delta.json" | head -2
  check "$RX/census-delta.json" "$OUT/census-delta.json" "census-delta.json"
fi
[ "${RSL141_KEEP_RAW:-0}" = 1 ] || rm -rf "$OUT/rom/dump" "$OUT/raw"
rm -f "$B/node_modules" "$B/reference"
[ "$fail" -eq 0 ] && echo "ALL SAME" || { echo "SOME DIFF"; exit 1; }
