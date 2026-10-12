#!/bin/sh
# fix122 (docs/fix122-audit26-defects.md): ROM rows of the Scene ON "But it failed!" hold classes (fix122OnStage.py), direct mGBA only:
# idle94Probe.py, 13 scenarios x {ON, OFF} x {r1, r2}, a fresh process per job (a crashed job reruns once); off108Rom.py r1 == r2.
# Production: off108Route.ts seeds 0..999, Scene ON and Scene OFF, the classes' moves only, in a git-archive copy of <base> and of <rev>
# [+ patches]; the OFF routes must be byte-identical; fix122OnHold.py = ROM glyph vs production's message start per class and arm.
# usage (from workspace/): sh tools/integration/fix122OnRun.sh <fresh-out-dir INSIDE the repo> <base> <rev> [patch ...]
set -eu
OUT=$1; BASE=$2; REV=$3; shift 3
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/copy-final" "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/routes" "$OUT/routes-final"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
MOVES=182,197,203,219,241,201,258,254,73,113,115,240
git archive --format=tar "$BASE" . | tar -x -C "$OUT/copy"
git archive --format=tar "$REV" . | tar -x -C "$OUT/copy-final"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; ln -s "$ROOT/$d" "$OUT/copy-final/$d"; done
(cd "$OUT/copy-final" && git init -q)
for p in "$@"; do (cd "$OUT/copy-final" && git apply "$ROOT/$p"); done
python3 tools/integration/fix122OnStage.py "$OUT/stage/scenarios" > /dev/null
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
# job.sh <outdir> <mode> <scenario>   (run from the copy; FIX122_PY)
o=$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$FIX122_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$FIX122_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
chmod +x "$OUT/job.sh"
export FIX122_PY="$PY"
if [ -z "${FIX122_SKIP_ROM:-}" ]; then
  (cd "$OUT/copy" && for r in r1 r2; do for m in on off; do for f in "$OUT"/stage/scenarios/*.json; do echo "$OUT/probes/$r $m $f"; done; done; done \
    | xargs -P 6 -n 3 "$OUT/job.sh")
  n=0; same=0
  for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
  echo "on probes: $same / $n r1 == r2"
  python3 tools/integration/off108Rom.py "$OUT/probes/r1" "$OUT/stage/scenario-index.json" "$OUT/rom-r1.json" > /dev/null
  python3 tools/integration/off108Rom.py "$OUT/probes/r2" "$OUT/stage/scenario-index.json" "$OUT/rom-r2.json" > /dev/null
  cmp -s "$OUT/rom-r1.json" "$OUT/rom-r2.json" && echo "SAME rom r2 == r1" || echo "DIFF rom r2 != r1"
fi
for c in copy copy-final; do
  r=routes; [ "$c" = copy-final ] && r=routes-final
  (cd "$OUT/$c" && for k in 0 1 2 3 4 5 6 7 8 9; do
    $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=on --moves=$MOVES --out="$OUT/$r/on-$k.jsonl" > /dev/null &
  done; wait)
  (cd "$OUT/$c" && for k in 0 1 2 3 4 5 6 7 8 9; do
    $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --moves=$MOVES --out="$OUT/$r/off-$k.jsonl" > /dev/null &
  done; wait)
done
for k in 0 1 2 3 4 5 6 7 8 9; do cmp -s "$OUT/routes/off-$k.jsonl" "$OUT/routes-final/off-$k.jsonl" && echo "same OFF routes off-$k" || echo "DIFF OFF routes off-$k"; done
python3 tools/integration/fix122OnHold.py "$OUT/rom-r1.json" "$OUT/routes" "$OUT/routes-final" > "$OUT/hold.txt"
tail -2 "$OUT/hold.txt"
