#!/bin/sh
# scan93: reproduce every committed scan93 receipt (docs/next-adapters-scan93.md).
#   sh tools/integration/scan93Run.sh <fresh-out-dir INSIDE the repo, e.g. .integration/validation/scan93-run> [--census]
# 1. scenarios + predictions regenerate byte-identically; 2. 22 scenarios x2 fresh direct-mGBA probes (r1 == r2) and the history fold vs RAM
# (== history-receipt.json); 3. window fixtures (== live/); 4. two git-archive copies of HEAD with the temp patches A / B (+ a B copy whose
# history input is forced to S0: the control), --live-only and the dense windows through the PATCHED production renderer (== check-B.json /
# check-control-s0.json render digests and residuals); 5. --census: liveShareCensus.ts seeds 0..999 (10 shards, --index-from) on HEAD (base)
# and on A / B, merged (hist73Merge.py) and paired (prep43CensusDelta.py) (== census-delta-A.json / census-delta-B.json).
set -e
OUT=${1:?usage: scan93Run.sh <fresh-out-dir> [--census]}; CENSUS=${2:-}
[ -e "$OUT" ] && { echo "out dir exists: $OUT" >&2; exit 2; }
ROOT=$(pwd); F=tools/integration/fixtures/scan93
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
export PYTHONPATH=${PYTHONPATH:-/Users/kyle/Developer/pokebench/vendor/libmgba-py} POKEBENCH_LIVE_PROBE_SHARE=1
node_ts() { node --experimental-strip-types --no-warnings "$@"; }

echo "== 1. scenarios + predictions"
python3 tools/integration/scan93Scenarios.py > /dev/null
git diff --exit-code --stat -- $F/scenarios
node_ts tools/integration/scan93History.ts predict $F/scenarios "$OUT/predictions.json" > /dev/null
cmp "$OUT/predictions.json" $F/predictions.json

echo "== 2. probes (22 x2 fresh) + history vs RAM"
OUT="$OUT/probe" sh tools/integration/scan93Probes.sh
node_ts tools/integration/scan93History.ts compare "$OUT/probe/r1" "$OUT/probe/r2" "$OUT/history-receipt.json"
cmp "$OUT/history-receipt.json" $F/history-receipt.json

echo "== 3. fixtures"
python3 tools/integration/scan93Fixtures.py "$OUT/probe/r1" "$OUT/live" > /dev/null
diff -r "$OUT/live" $F/live

copy() { # copy <dir> <diff>
  mkdir -p "$1"; git archive HEAD | tar -x -C "$1"
  ln -s "$ROOT/node_modules" "$1/node_modules"; ln -s "$ROOT/reference" "$1/reference"
  [ -e "$ROOT/artifacts" ] && ln -s "$ROOT/artifacts" "$1/artifacts"
  # A copy nested inside the repo needs its own git dir, or git apply silently skips the (repo-root-relative) paths.
  (cd "$1" && git init -q && git apply --whitespace=nowarn "$ROOT/$2")
  [ -f "$1/src/engine/liveScanlineHistory.ts" ] || { echo "patch $2 not applied in $1" >&2; exit 1; }
}
echo "== 4. patched copies + windows"
copy "$OUT/A" $F/scan93-temp-src-A.diff
copy "$OUT/B" $F/scan93-temp-src-B.diff
copy "$OUT/S0" $F/scan93-temp-src-B.diff
python3 - "$OUT/S0/src/engine/liveMoveAnimation.ts" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text()
a = "const xsScanline = xsHistory === undefined ? FIRST_BODY_SCANLINE : liveScanlineEntry(FIRST_BODY_SCANLINE, xsHistory, (side) => art[side].speciesSymbol);"
b = "const mementoScanline = liveScanlineEntry(FIRST_BODY_SCANLINE, mementoHistory, (side) => art[side].speciesSymbol);"
assert a in s and b in s
p.write_text(s.replace(a, "const xsScanline = FIRST_BODY_SCANLINE; void xsHistory;").replace(b, "const mementoScanline = FIRST_BODY_SCANLINE;"))
PY
node_ts tools/integration/later58Check.ts "$OUT/liveonly-base.json" $F/live/*.json --live-only 2> /dev/null
for t in A B S0; do
  (cd "$OUT/$t" && node_ts tools/integration/later58Check.ts "$OUT/liveonly-$t.json" $F/live/*.json --live-only 2> /dev/null)
done
for t in A B S0; do
  sel=$t; [ $t = S0 ] && sel=B
  mkdir -p "$OUT/$t/$F/sel"
  python3 - "$OUT/liveonly-$sel.json" "$F/live" "$OUT/$t/$F/sel" <<'PY'
import json, shutil, sys
rows = json.load(open(sys.argv[1]))["rows"]
for r in rows:
    if r["live"] and not r["firstBody"]:
        shutil.copy(f"{sys.argv[2]}/{r['fixture']}", f"{sys.argv[3]}/{r['fixture']}")
PY
  (cd "$OUT/$t" && OUT="$OUT/chk-$t" JOBS=${JOBS:-8} sh tools/integration/later58Check.sh $F/sel "$OUT/check-$t.json" > /dev/null)
done
python3 - "$OUT" $F <<'PY'
import json, sys
out, f = sys.argv[1:]
def key(path): return {r["fixture"]: (r["verdict"], [(x["rows"], x["exactRows"], x["residualPixels"], x["digest"]) for x in r["runs"]])
                      for r in json.load(open(path))["rows"]}
assert json.load(open(f"{out}/liveonly-base.json")) == json.load(open(f"{f}/liveonly-base.json")), "liveonly-base"
assert json.load(open(f"{out}/liveonly-B.json")) == json.load(open(f"{f}/liveonly-B.json")), "liveonly-B"
assert key(f"{out}/check-B.json") == key(f"{f}/check-B.json"), "check-B"
assert key(f"{out}/check-S0.json") == key(f"{f}/check-control-s0.json"), "control"
a = key(f"{out}/check-A.json"); b = key(f"{f}/check-B.json")
live_a = {r["fixture"] for r in json.load(open(f"{out}/liveonly-A.json"))["rows"] if r["live"] and not r["firstBody"]}
rows_b = {r["fixture"]: r for r in json.load(open(f"{f}/check-B.json"))["rows"]}
assert live_a == {k for k, r in rows_b.items() if not (r["move"] == "EXTRASENSORY" and r["side"] == "player")}, "A live set = B minus player Extrasensory"
assert all(a[k] == b[k] for k in live_a), "A windows == B windows on A's live set"
print("windows: check-B / control / A reproduce")
PY

if [ "$CENSUS" = "--census" ]; then
  echo "== 5. census 0..999 (base / A / B)"
  census() { # census <tree> <dir>
    mkdir -p "$2"; (cd "$1" && for k in 0 1 2 3 4 5 6 7 8 9; do echo $k; done | xargs -P 5 -n 1 sh -c 'a=$(($0 * 100)); node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=$a..$((a + 99)) --index-from=$a --out='"$2"'/r$0.json --commands='"$2"'/r$0.jsonl > '"$2"'/r$0.log 2>&1')
    python3 tools/integration/hist73Merge.py "$2" "$2.json" "$2.jsonl" > /dev/null
  }
  census "$ROOT" "$OUT/census-base"; census "$OUT/A" "$OUT/census-A"; census "$OUT/B" "$OUT/census-B"
  for t in A B; do
    python3 tools/integration/prep43CensusDelta.py "$OUT/census-base.json" "$OUT/census-base.jsonl" "$OUT/census-$t.json" "$OUT/census-$t.jsonl" "$OUT/census-delta-$t.json" > /dev/null
    python3 tools/integration/scan93CensusCheck.py "$OUT/census-base.json" "$OUT/census-$t.json" "$OUT/census-delta-$t.json" "$OUT/census-summary-$t.json"
    cmp "$OUT/census-summary-$t.json" $F/census-summary-$t.json
  done
fi
echo "scan93Run: all receipts reproduce"
