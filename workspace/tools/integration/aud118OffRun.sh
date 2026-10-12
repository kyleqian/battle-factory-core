#!/bin/sh
# aud118 (docs/aud118-live-audit-26.md): off108 / olnd113's Scene OFF pause rule check on aud118OffStage.py's NEW classes, production =
# a git-archive copy of the FIXED base 396308f86 (pauses + holds landed). Direct mGBA only: idle94Probe.py, 10 scenarios x {ON, OFF} x
# {r1, r2}, a fresh process per job (a crashed job reruns once); off108Rom.py r1 == r2; production routes off108Route.ts --scene=off
# seeds 0..399 (four shards, the classes' moves only); aud118Classes.py (off108Classes.py's rule table on the new classes);
# off108Verify.py (production's start of the next presented command N vs the ROM anchor; base = final = 396308f86). Nothing outside <out>.
# usage (from workspace/): sh tools/integration/aud118OffRun.sh <fresh-out-dir INSIDE the repo>
set -eu
OUT=$1
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/routes"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
git archive --format=tar 396308f86 . | tar -x -C "$OUT/copy"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; done
python3 tools/integration/aud118OffStage.py "$OUT/stage/scenarios" > /dev/null
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
# job.sh <outdir> <mode> <scenario>   (run from the copy; AUD118_PY)
o=$1/$(basename "$3" .json)-$2.json
python3 tools/run-mgba-probe.py "$o" -- "$AUD118_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$AUD118_PY" tools/integration/idle94Probe.py "$3" "$2" "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
chmod +x "$OUT/job.sh"
export AUD118_PY="$PY"
(cd "$OUT/copy" && for r in r1 r2; do for m in on off; do for f in "$OUT"/stage/scenarios/*.json; do echo "$OUT/probes/$r $m $f"; done; done; done \
  | xargs -P 6 -n 3 "$OUT/job.sh")
n=0; same=0
for f in "$OUT/probes/r1"/*.json; do n=$((n + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && same=$((same + 1)); done
echo "off probes: $same / $n r1 == r2"
python3 tools/integration/off108Rom.py "$OUT/probes/r1" "$OUT/stage/scenario-index.json" "$OUT/rom-r1.json" > /dev/null
python3 tools/integration/off108Rom.py "$OUT/probes/r2" "$OUT/stage/scenario-index.json" "$OUT/rom-r2.json" > /dev/null
cmp -s "$OUT/rom-r1.json" "$OUT/rom-r2.json" && echo "SAME rom r2 == r1" || echo "DIFF rom r2 != r1"
(cd "$OUT/copy" && for k in 0 1 2 3; do
  $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --moves=14,97,43,103,113,115,114,54,147,164 \
    --out="$OUT/routes/off-$k.jsonl" > /dev/null &
done; wait)
python3 tools/integration/aud118Classes.py "$OUT/rom-r1.json" "$OUT/routes" "$OUT/table" | tail -1
python3 tools/integration/off108Verify.py "$OUT/table/classes.json" "$OUT/routes" "$OUT/routes" "$OUT/verify-off.json" | tail -1
