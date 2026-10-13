#!/bin/sh
# inv142 runner (docs/inv142-status-animation-invisible-battler.md, ISSUES #168 follow-up: a Scene ON status animation whose battler's
# sprite is INVISIBLE). Run from workspace/ (this checkout or a fresh git-archive copy inside the repo); direct mGBA only (never the
# shared HTTP oracles). Nothing outside <out-dir> is written.
#   sh tools/integration/inv142Run.sh <fresh-out-dir> [--census]     (~4 min; with --census ~6 min more, 20 shards in parallel)
# 1. inv142Stage.py == fixtures/inv142/scenarios (4 lab scenarios, explicit seeds);
# 2. inv142Exposure.ts seeds 0..999 (10 shards) + inv142ExposureSummary.py == exposure.json;
# 3. inv142Probes.sh: 4 scenarios x Scene ON x {r1 (window dump), r2}: r1 == r2, == probe-sha256.json; inv142Rom.py r1 == rom-r1.json,
#    r2 == r1;
# 4. inv142NpzToRaw.py + inv142Compare.ts in this tree (the change is LANDED) == production-patched.json, the controls age+1 / wrong-side
#    == controls.json; a pre-fix base copy (<out>/base: src, tools, configs copied, node_modules / reference symlinked,
#    fixtures/inv142/inv142-invisible.diff reverse-applied with patch -R -p1): == production-today.json (the pre-fix receipt);
# 5. sar131RouteRender.ts 18:0:on in the pre-fix base copy and this tree, inv142RouteDelta.py == routes-delta.json;
# 6. (--census) sa125LiveShareCensus.ts 0..999, 10 shards per tree (pre-fix base copy / this tree), sar131CensusDelta.py == census-delta.json;
# 7. inv142Receipt.py == fixtures/inv142/receipt.json (the census section only with --census).
# Raw frame dumps and the base copy are deleted at the end (INV142_KEEP=1 keeps them).
set -u
OUT="$1"; CENSUS="${2:-}"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT/ev"; OUT=$(cd "$OUT" && pwd)
W=$(pwd); F=tools/integration/fixtures/inv142; fail=0
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --max-old-space-size=4096 --experimental-strip-types --no-warnings"
check() { cmp -s "$1" "$2" && echo "SAME $3" || { echo "DIFF $3"; fail=1; }; }
# 1. scenarios
python3 tools/integration/inv142Stage.py "$OUT/scenarios" '{"love-ply": 305419899, "love-opp": 305419898}' > /dev/null
for f in "$F"/scenarios/*.json; do check "$f" "$OUT/scenarios/$(basename "$f")" "scenarios/$(basename "$f")"; done
# 2. exposure
mkdir -p "$OUT/exposure"
for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99))
  $NODE tools/integration/inv142Exposure.ts --seeds=$a..$b --index-from=$a --out="$OUT/exposure/e$i.json" > "$OUT/exposure/e$i.log" 2>&1 &
done
wait
python3 tools/integration/inv142ExposureSummary.py "$OUT/exposure" "$OUT/ev/exposure.json"
check "$F/exposure.json" "$OUT/ev/exposure.json" "exposure.json"
# 3. probes
sh tools/integration/inv142Probes.sh "$OUT/rom"
cat "$OUT/rom/done"; grep -q "r1 == r2: 4 / 4" "$OUT/rom/done" || fail=1
python3 -c "
import hashlib, json, glob, os, sys
d = {os.path.basename(f): hashlib.sha256(open(f, 'rb').read()).hexdigest() for f in sorted(glob.glob(sys.argv[1] + '/*.json'))}
open(sys.argv[2], 'w').write(json.dumps(d, indent=1) + '\n')" "$OUT/rom/probes/r1" "$OUT/ev/probe-sha256.json"
check "$F/probe-sha256.json" "$OUT/ev/probe-sha256.json" "probe-sha256.json"
python3 tools/integration/inv142Rom.py "$OUT/rom/probes/r1" "$OUT/ev/rom-r1.json" > /dev/null
python3 tools/integration/inv142Rom.py "$OUT/rom/probes/r2" "$OUT/rom-r2.json" > /dev/null
check "$F/rom-r1.json" "$OUT/ev/rom-r1.json" "rom-r1.json"
check "$OUT/ev/rom-r1.json" "$OUT/rom-r2.json" "rom r2 == r1"
# 4. production (landed) + the pre-fix base copy
"$PY" tools/integration/inv142NpzToRaw.py "$OUT/rom/dump" "$OUT/ev/rom-r1.json" "$OUT/raw" > /dev/null
P="$OUT/base"; mkdir -p "$P"
cp -R src tools package.json tsconfig.json "$P/"
ln -s "$W/node_modules" "$P/node_modules"
[ -e "$W/reference" ] && ln -s "$W/reference" "$P/reference"
(cd "$P" && patch -R -p1 --quiet < "$W/$F/inv142-invisible.diff") || { echo "reverse patch failed"; exit 1; }
(cd "$P" && $NODE tools/integration/inv142Compare.ts "$OUT/ev/rom-r1.json" "$OUT/raw" "$OUT/ev/production-today.json" | tail -1) &
$NODE tools/integration/inv142Compare.ts "$OUT/ev/rom-r1.json" "$OUT/raw" "$OUT/ev/production-patched.json" | tail -1 &
for n in age+1 wrong-side; do
  ($NODE tools/integration/inv142Compare.ts --neg=$n "$OUT/ev/rom-r1.json" "$OUT/raw" "$OUT/neg-$n.json" > "$OUT/neg-$n.log" 2>&1) &
done
# 5. routes
mkdir -p "$OUT/routes"
(cd "$P" && $NODE tools/integration/sar131RouteRender.ts --routes=18:0:on --out="$OUT/routes/base-18-0-on.json" > "$OUT/routes/base.log" 2>&1) &
$NODE tools/integration/sar131RouteRender.ts --routes=18:0:on --out="$OUT/routes/patched-18-0-on.json" > "$OUT/routes/patched.log" 2>&1 &
wait
check "$F/production-today.json" "$OUT/ev/production-today.json" "production-today.json"
check "$F/production-patched.json" "$OUT/ev/production-patched.json" "production-patched.json"
python3 -c "
import json, sys
out = {}
for n in ('age+1', 'wrong-side'):
    d = json.load(open(f'{sys.argv[1]}/neg-{n}.json'))
    out[n] = {'summary': d['summary'], 'px': {k: v['fullScreen']['px'] for k, v in d.items() if k != 'summary'}}
open(sys.argv[2], 'w').write(json.dumps(out, indent=1) + '\n')" "$OUT" "$OUT/ev/controls.json"
check "$F/controls.json" "$OUT/ev/controls.json" "controls.json"
python3 tools/integration/inv142RouteDelta.py "$OUT/ev/routes-delta.json" "$OUT/routes/base-18-0-on.json" "$OUT/routes/patched-18-0-on.json" || fail=1
check "$F/routes-delta.json" "$OUT/ev/routes-delta.json" "routes-delta.json"
# 6. census
if [ "$CENSUS" = "--census" ]; then
  mkdir -p "$OUT/census-base" "$OUT/census-patched"
  for t in base patched; do
    if [ "$t" = base ]; then TREE="$P"; else TREE="$W"; fi
    for i in 0 1 2 3 4 5 6 7 8 9; do a=$((i * 100)); b=$((a + 99)); C="$OUT/census-$t"
      (cd "$TREE" && $NODE tools/integration/sa125LiveShareCensus.ts \
        --seeds=$a..$b --index-from=$a --out="$C/r$i.json" --commands="$C/r$i.jsonl" --stats="$C/s$i.jsonl" > "$C/r$i.log" 2>&1) &
    done
  done
  wait
  python3 tools/integration/sar131CensusDelta.py "$OUT/census-base" "$OUT/census-patched" "$OUT/ev/census-delta.json" > /dev/null
  check "$F/census-delta.json" "$OUT/ev/census-delta.json" "census-delta.json"
fi
# 7. receipt
python3 tools/integration/inv142Receipt.py "$OUT/ev" "$OUT/receipt.json" $CENSUS --compare="$F/receipt.json" | tail -1 | grep -q "SAME receipt" \
  && echo "SAME receipt" || { echo "DIFF receipt"; fail=1; }
if [ "${INV142_KEEP:-0}" != 1 ]; then rm -rf "$OUT/raw" "$OUT/rom/dump" "$P"; fi
[ "$fail" -eq 0 ] && echo "inv142Run: ALL SAME" || { echo "inv142Run: FAILED"; exit 1; }
