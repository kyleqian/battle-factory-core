#!/bin/sh
# aud118 (docs/aud118-live-audit-26.md): the scd112 stats-change banner comparator on aud118StatStage.py's WIDENED scenarios, through the
# production render path of a git-archive copy of the FIXED base 396308f86 [+ optional aud118 patches]. Direct mGBA only (stat101Job.sh:
# stat101Probe.py, a fresh process per job, a crashed job reruns once), Scene ON and OFF, two runs each (r1 == r2). Inside the COPY only, its
# tools/integration/fixtures/stat101/{scenarios,receipts/stat-anim.json,scenario-index.json} are replaced by this run's (scd112Windows.ts /
# scd112ProductionCompare.ts read that fixed path); the comparator runs twice (r1 == r2). Nothing outside <out> is written.
# usage (from workspace/): sh tools/integration/aud118StatRun.sh <fresh-out-dir INSIDE the repo> [patch ...]
set -eu
OUT=$1; shift
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
F=tools/integration/fixtures/stat101
git archive --format=tar 396308f86 . | tar -x -C "$OUT/copy"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; done
(cd "$OUT/copy" && git init -q)
for p in "$@"; do (cd "$OUT/copy" && git apply "$ROOT/$p"); done
python3 tools/integration/aud118StatStage.py "$OUT/stage/scenarios" > /dev/null
export STAT101_PY="$PY"
(cd "$OUT/copy" && for m in on off; do for f in "$OUT"/stage/scenarios/*.json; do echo "$OUT/probes/r1 $m $f"; done; done \
  | STAT101_DUMP="$OUT/dump" xargs -n 3 -P 8 sh tools/integration/stat101Job.sh)
(cd "$OUT/copy" && for m in on off; do for f in "$OUT"/stage/scenarios/*.json; do echo "$OUT/probes/r2 $m $f"; done; done \
  | xargs -n 3 -P 8 sh tools/integration/stat101Job.sh)
n=0; t=0
for f in "$OUT"/probes/r1/*.json; do t=$((t + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && n=$((n + 1)); done
echo "stat probes r1 == r2: $n / $t"
python3 tools/integration/stat101Receipts.py "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/stage/scenario-index.json" "$OUT/receipts" > /dev/null
python3 tools/integration/stat101NpzToRaw.py "$OUT/dump" "$OUT/receipts/stat-anim.json" "$OUT/raw" > /dev/null
rm -rf "$OUT/copy/$F/scenarios"; mkdir -p "$OUT/copy/$F/scenarios" "$OUT/copy/$F/receipts"
cp "$OUT"/stage/scenarios/*.json "$OUT/copy/$F/scenarios/"; cp "$OUT/stage/scenario-index.json" "$OUT/copy/$F/scenario-index.json"
cp "$OUT/receipts/stat-anim.json" "$OUT/copy/$F/receipts/stat-anim.json"
(cd "$OUT/copy" && node --experimental-strip-types --no-warnings tools/integration/scd112ProductionCompare.ts "$OUT" "$OUT/compare.json" > "$OUT/compare.log")
(cd "$OUT/copy" && node --experimental-strip-types --no-warnings tools/integration/scd112ProductionCompare.ts "$OUT" "$OUT/compare-r2.json" > /dev/null)
cmp -s "$OUT/compare.json" "$OUT/compare-r2.json" && echo "SAME comparator r1 == r2" || echo "DIFF comparator r1 != r2"
tail -1 "$OUT/compare.log"
rm -rf "$OUT/dump"
