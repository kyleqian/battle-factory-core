#!/bin/sh
# sae135 runner (docs/sae135-status-animation-render-3.md, ISSUES #168 slice SA5: SLP / BRN / INFATUATION drawn). Run from workspace/;
# direct mGBA only (never the shared HTTP oracles); production is read only in git-archive copies inside the FRESH <out-dir> (refused if
# non-empty; must be inside the repo so the copies find ../oracle). Nothing outside <out-dir> is written or removed.
#   sh tools/integration/sae135Run.sh <fresh-out-dir> [--census]     (~8 min; with --census ~7 min more, 20 shards in parallel)
# 1. archive copies <out>/base (7511dc63d: sar131's PSN / PRZ drawn, SA5 timing only) and <out>/final (HEAD) + this checkout's
#    sae135 / sar131 / stq132 tools and fixtures;
# 2. stq132's 13 scenarios x {r1 (window dump), r2} (stq132Job.sh, final copy): r1 == r2 == stq132 probe-sha256.json, stq132Receipt.py
#    r1 == stq132 rom-windows.json, r2 == r1; stq132NpzToRaw.py;
# 3. sae135ProductionCompare.ts (final copy) twice (r1 == r2 == production-compare.json), --diag=ordinary-rest, --neg=redraw and the four
#    controls (age+1, wrong-side, drop-one, rest-y);
# 4. next body: sar131Probes.sh on 4 stq132 scenarios (next-body-index.json): r1 == r2 == next-body-probe-sha256.txt, sar131Rom.py
#    r1 == next-body-rom-r1.json, r2 == r1; sae135NextBodyX2.ts == next-body-x2.json;
# 5. sar131RouteRender.ts on 6 Scene ON routes in both copies, sae135RouteDelta.py == routes-delta.json;
# 6. (--census) sar131Census.sh shards base / final, sar131CensusDelta.py == census-delta.json;
# 7. sae135Receipt.py == tools/integration/fixtures/sae135-live-receipt.json (the census section only with --census).
# Raw frame dumps and the archive copies are deleted at the end (SAE135_KEEP=1 keeps them).
set -eu
OUT=${1:?usage: sae135Run.sh <fresh-out-dir> [--census]}
CENSUS=${2:-}
BASE=7511dc63d
W=$(pwd)
[ -f "$W/tools/integration/sae135Run.sh" ] || { echo "run from workspace/"; exit 2; }
mkdir -p "$OUT"
[ -z "$(ls -A "$OUT")" ] || { echo "refusing: $OUT is not empty"; exit 2; }
OUT=$(cd "$OUT" && pwd)
case "$OUT" in "$(cd .. && pwd)"/*) ;; *) echo "refusing: $OUT is outside the repo"; exit 2;; esac
RUN="$OUT/run"
mkdir -p "$RUN/cmp"
fail=0
NODE="node --experimental-strip-types --no-warnings"
FX=tools/integration/fixtures/sae135
SQ=tools/integration/fixtures/stq132
check() { if cmp -s "$1" "$2"; then echo "SAME $3"; else echo "DIFF $3"; fail=1; fi; }

# 1. archive copies
for t in base final; do
  rev=$BASE; [ "$t" = final ] && rev=HEAD
  mkdir -p "$OUT/$t"
  git -C .. archive "$rev" workspace | tar -x -C "$OUT/$t"
  ln -s "$W/node_modules" "$OUT/$t/workspace/node_modules"
  ln -s "$W/reference" "$OUT/$t/workspace/reference"
  cp tools/integration/sae135* tools/integration/sar131* tools/integration/stq132* "$OUT/$t/workspace/tools/integration/"
  for d in sae135 sar131 stq132; do
    mkdir -p "$OUT/$t/workspace/tools/integration/fixtures/$d" && cp -R "tools/integration/fixtures/$d/." "$OUT/$t/workspace/tools/integration/fixtures/$d/"
  done
done
echo "final production src $(git rev-parse HEAD:workspace/src)"
F="$OUT/final/workspace"

# 2. stq132 ROM windows (direct mGBA, final copy)
mkdir -p "$RUN/stq132/r1" "$RUN/stq132/r2" "$RUN/stq132/dump"
(cd "$F" && ls "$SQ"/scenarios/*.json | while read -r s; do echo "$RUN/stq132/r1 $s $RUN/stq132/dump"; done | xargs -P 7 -n 3 sh tools/integration/stq132Job.sh)
(cd "$F" && ls "$SQ"/scenarios/*.json | while read -r s; do echo "$RUN/stq132/r2 $s"; done | xargs -P 7 -n 2 sh tools/integration/stq132Job.sh)
python3 - "$RUN/stq132" "$SQ/probe-sha256.json" <<'PYEOF' || fail=1
import hashlib, json, os, sys
out, rec = sys.argv[1], json.load(open(sys.argv[2]))
same = sum(hashlib.sha256(open(os.path.join(out, r, k), "rb").read()).hexdigest() == v[r] for k, v in rec.items() for r in ("r1", "r2"))
print(f"stq132 probes == committed sha256 (r1 == r2): {same} / {2 * len(rec)}")
sys.exit(0 if same == 2 * len(rec) == 26 else 1)
PYEOF
(cd "$F" && python3 tools/integration/stq132Receipt.py "$RUN/stq132/r1" "$SQ/scenario-index.json" "$RUN/rom-windows.json" > /dev/null \
  && python3 tools/integration/stq132Receipt.py "$RUN/stq132/r2" "$SQ/scenario-index.json" "$RUN/rom-windows-r2.json" > /dev/null)
check "$SQ/rom-windows.json" "$RUN/rom-windows.json" "stq132 rom-windows.json"
check "$RUN/rom-windows.json" "$RUN/rom-windows-r2.json" "rom-windows r2 == r1"
(cd "$F" && python3 tools/integration/stq132NpzToRaw.py "$RUN/stq132/dump" "$SQ/rom-windows.json" "$RUN/raw" > /dev/null)

# 3. comparator through production (final copy), diagnostic, redraw harness, controls
(cd "$F" && $NODE tools/integration/sae135ProductionCompare.ts "$RUN/raw" "$RUN/cmp/r1.json" | tail -1)
(cd "$F" && $NODE tools/integration/sae135ProductionCompare.ts "$RUN/raw" "$RUN/cmp/r2.json" > /dev/null)
check "$RUN/cmp/r1.json" "$RUN/cmp/r2.json" "comparator r1 == r2"
check "$FX/production-compare.json" "$RUN/cmp/r1.json" production-compare.json
(cd "$F" && $NODE tools/integration/sae135ProductionCompare.ts "$RUN/raw" "$RUN/cmp/diag-ordinary-rest.json" --diag=ordinary-rest | tail -1 | sed "s/^/diag ordinary-rest: /")
for x in redraw age+1 wrong-side drop-one rest-y; do
  (cd "$F" && $NODE tools/integration/sae135ProductionCompare.ts "$RUN/raw" "$RUN/cmp/neg-$x.json" --neg=$x | tail -1 | sed "s/^/control $x: /")
done

# 4. next body (x2 keep)
mkdir -p "$RUN/nb-scenarios"
python3 -c "import json,sys; [print(k) for k in json.load(open(sys.argv[1]))]" "$FX/next-body-index.json" | while read -r s; do cp "$SQ/scenarios/$s" "$RUN/nb-scenarios/"; done
(cd "$F" && sh tools/integration/sar131Probes.sh "$RUN/nb" "$RUN/nb-scenarios")
cat "$RUN/nb/done"; grep -q "r1 == r2: 4 / 4" "$RUN/nb/done" || fail=1
(cd "$RUN/nb/probes" && for r in r1 r2; do for f in $r/*.json; do shasum -a 256 $f; done; done) > "$RUN/next-body-probe-sha256.txt"
check "$FX/next-body-probe-sha256.txt" "$RUN/next-body-probe-sha256.txt" next-body-probe-sha256
python3 tools/integration/sar131Rom.py "$RUN/nb/probes/r1" "$FX/next-body-index.json" "$RUN/next-body-rom-r1.json" > /dev/null
python3 tools/integration/sar131Rom.py "$RUN/nb/probes/r2" "$FX/next-body-index.json" "$RUN/next-body-rom-r2.json" > /dev/null
check "$FX/next-body-rom-r1.json" "$RUN/next-body-rom-r1.json" next-body-rom-r1.json
check "$RUN/next-body-rom-r1.json" "$RUN/next-body-rom-r2.json" "next-body rom r2 == r1"
python3 tools/integration/sar131NpzToRaw.py "$RUN/nb/dump" "$RUN/next-body-rom-r1.json" "$RUN/nb-raw" > /dev/null
(cd "$F" && $NODE tools/integration/sae135NextBodyX2.ts "$RUN/next-body-rom-r1.json" "$RUN/nb-raw" "$RUN/next-body.json" | tail -1)
check "$FX/next-body-x2.json" "$RUN/next-body.json" next-body-x2.json

# 5. production routes, both trees (one process per route and tree)
ROUTES="34:0:on 296:0:on 277:0:on 124:0:on 126:0:on 18:0:on"
mkdir -p "$RUN/routes/base" "$RUN/routes/final"
for r in $ROUTES; do for t in base final; do echo "$OUT/$t/workspace $r $RUN/routes/$t/$(echo $r | tr : -).json"; done; done \
  | xargs -n 3 -P 12 sh tools/integration/sae135Route.sh
for t in base final; do
  python3 - "$RUN/routes/$t" "$RUN/routes-$t.json" $ROUTES <<'PYEOF'
import json, sys
d, out, routes = sys.argv[1], sys.argv[2], sys.argv[3:]
json.dump([x for r in routes for x in json.load(open(f"{d}/{r.replace(':', '-')}.json"))], open(out, "w"))
PYEOF
done
python3 tools/integration/sae135RouteDelta.py "$RUN/routes-base.json" "$RUN/routes-final.json" "$RUN/routes-delta.json" | tail -1
check "$FX/routes-delta.json" "$RUN/routes-delta.json" routes-delta.json

# 6. census
if [ "$CENSUS" = "--census" ]; then
  sh tools/integration/sar131Census.sh shards "$OUT/census-base" $BASE > /dev/null 2>&1 &
  sh tools/integration/sar131Census.sh shards "$OUT/census-final" HEAD > /dev/null 2>&1 &
  wait
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-final" "$RUN/census-delta.json" | head -2
  check "$FX/census-delta.json" "$RUN/census-delta.json" census-delta.json
fi

# 7. receipt
python3 tools/integration/sae135Receipt.py "$RUN" "$RUN/receipt.json" "$CENSUS" > /dev/null
check "$W/tools/integration/fixtures/sae135-live-receipt.json" "$RUN/receipt.json" "sae135-live-receipt.json$( [ "$CENSUS" = "--census" ] || echo ' (census section from the committed delta)')"
if [ "${SAE135_KEEP:-0}" != 1 ]; then rm -rf "$RUN/stq132/dump" "$RUN/raw" "$RUN/nb/dump" "$RUN/nb-raw" "$OUT/base" "$OUT/final"; fi
[ "$fail" -eq 0 ] && echo "sae135Run: ALL SAME" || { echo "sae135Run: FAILED"; exit 1; }
