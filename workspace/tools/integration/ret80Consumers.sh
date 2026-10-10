#!/bin/sh
# ret80 (docs/ret80-return-order.md): order-sensitive consumers (Swift 129, Shock Wave 351, Water Pulse 352) after a friendship-255
# Return 216, both sides -- ret80ConsumerStage.py scenarios -> audit20Probes.py (direct mGBA) -> audit20Fixtures.py -> ret80Rekey.py
# (the staged friendship) -> audit20Check.ts LENDS_ONLY (lend vs ROM) and the full dense render (2 fresh probes per scenario, r1 == r2,
# production live renderer vs ROM RGB) -> audit20Summary.py, in the current tree and (optional) in a git-archive tree of <base>.
# usage (from workspace/): sh tools/integration/ret80Consumers.sh <fresh-out-dir> [<base-commit>]   (~2 min per tree)
set -e
OUT=$1; BASE=${2:-}
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); WS=$PWD
python3 tools/integration/ret80ConsumerStage.py "$OUT/sc"
AUDIT20_JOBS=12 python3 tools/integration/audit20Probes.py "$OUT/probe" "$OUT"/sc/*.json > "$OUT/probes.txt"
python3 tools/integration/audit20Fixtures.py "$OUT/probe" "$OUT/fx0" "$OUT/sc" > "$OUT/derive.txt"
python3 tools/integration/ret80Rekey.py "$OUT/fx0" "$OUT/fx"
NAMES=$(ls "$OUT"/fx/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename)
run() {  # $1 = tree dir, $2 = suffix
  (cd "$1" && for n in $NAMES; do AUDIT20_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$OUT/fx" "$n" /dev/null; done) > "$OUT/lends$2.txt"
  python3 "$WS/tools/integration/audit20LendsPi.py" "$OUT/lends$2.txt" "$OUT/fx" > "$OUT/lends-pi$2.txt"
  mkdir -p "$OUT/check$2"
  (cd "$1" && echo "$NAMES" | OUT=$OUT S=$2 xargs -n 1 -P 6 sh -c 'node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts "$OUT/fx" "$0" "$OUT/check$S/check-$0.json" > "$OUT/check$S/$0.log" 2>&1 || echo "FAILED $0"')
  python3 "$WS/tools/integration/audit20Summary.py" "$OUT/check$2" > "$OUT/summary$2.txt"
  echo "tree $1: $(python3 "$WS/tools/integration/ret80LendsSummary.py" "$OUT/lends-pi$2.txt" "$OUT/fx" | tail -2 | tr '\n' ';') $(tail -1 "$OUT/summary$2.txt")"
}
run "$WS" ""
if [ -n "$BASE" ]; then
  mkdir -p "$OUT/basetree"
  git -C "$(git rev-parse --show-toplevel)" archive --format=tar "$BASE" workspace/src workspace/tools workspace/package.json workspace/tsconfig.json \
    | tar -x -C "$OUT/basetree" --strip-components=1
  ln -s "$WS/node_modules" "$OUT/basetree/node_modules"; ln -s "$WS/reference" "$OUT/basetree/reference"
  # the fixtures name their scenario by a path relative to $WS: mirror it inside the base tree
  sc=$(python3 -c "import json,sys,glob; print(json.load(open(sorted(glob.glob(sys.argv[1] + '/fx/*.json'))[0]))['scenario'])" "$OUT")
  case $sc in /*) ;; *) mkdir -p "$OUT/basetree/$(dirname "$sc")"; for f in "$OUT"/sc/*.json; do ln -s "$f" "$OUT/basetree/$(dirname "$sc")/"; done ;; esac
  run "$OUT/basetree" "-base"
  rm "$OUT/basetree/node_modules" "$OUT/basetree/reference"
fi
