#!/bin/sh
# aud118 (docs/aud118-live-audit-26.md): off108 / olnd113's Scene OFF pause rule check on aud118OffStage.py's NEW classes, production =
# a git-archive copy of the FIXED base 396308f86 (pauses + holds landed). Direct mGBA only: idle94Probe.py, 10 scenarios x {ON, OFF} x
# {r1, r2}, a fresh process per job (a crashed job reruns once); off108Rom.py r1 == r2; production routes off108Route.ts --scene=off
# seeds 0..399 (four shards, the classes' moves only; Mist 400..999); aud118Classes.py (off108Classes.py's rule table on the new classes);
# off108Verify.py OFF + ON (production's start of the next presented command N vs the ROM anchor; base = final = 396308f86);
# aud118Verify.py (olnd113Verify.py's lead-adjusted check + joint target on the new stat classes; the ISSUES #153 Substitute row). Nothing outside <out>.
# Then the ON "But it failed!" hold (aud118OnHold.py): the same routes in a second copy + the banked aud118 hold patch (OFF routes must be
# byte-identical to the base copy's; ON Light Screen / Reflect residuals base vs patched).
# usage (from workspace/): sh tools/integration/aud118OffRun.sh <fresh-out-dir INSIDE the repo>
set -eu
OUT=$1
[ ! -e "$OUT" ] || { echo "$OUT exists (need a fresh dir)" >&2; exit 2; }
mkdir -p "$OUT/copy" "$OUT/copy-patched" "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/routes" "$OUT/routes-patched"; OUT=$(cd "$OUT" && pwd); ROOT=$(pwd)
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
NODE="node --experimental-strip-types --no-warnings"
git archive --format=tar 396308f86 . | tar -x -C "$OUT/copy"
git archive --format=tar 396308f86 . | tar -x -C "$OUT/copy-patched"
for d in node_modules reference artifacts; do ln -s "$ROOT/$d" "$OUT/copy/$d"; ln -s "$ROOT/$d" "$OUT/copy-patched/$d"; done
(cd "$OUT/copy-patched" && git init -q && git apply "$ROOT/tools/integration/fixtures/aud118/aud118-on-noeffect-attackanimation-hold.diff")
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
# Mist 54 has no use in seeds 0..399; seeds 400..999 (six shards, Mist only) show it has none at all
(cd "$OUT/copy" && for k in 4 5 6 7 8 9; do
  $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --moves=54 --out="$OUT/routes/off-$k.jsonl" > /dev/null &
done; wait)
# Scene ON routes for the hold classes (the hold applies in both scenes): seeds 0..399, Light Screen / Reflect only
(cd "$OUT/copy" && for k in 0 1 2 3; do
  $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=on --moves=113,115 --out="$OUT/routes/on-$k.jsonl" > /dev/null &
done; wait)
python3 tools/integration/aud118Classes.py "$OUT/rom-r1.json" "$OUT/routes" "$OUT/table"
python3 tools/integration/off108Verify.py "$OUT/table/classes.json" "$OUT/routes" "$OUT/routes" "$OUT/verify-off.json" | tail -1
python3 tools/integration/off108Verify.py "$OUT/table/classes.json" "$OUT/routes" "$OUT/routes" "$OUT/verify-on.json" --scene=on | tail -1
python3 tools/integration/aud118Verify.py "$OUT/rom-r1.json" "$OUT/verify-off.json" "$OUT/verify-on.json" "$OUT/routes" "$OUT/verify.json" \
  "$OUT/substitute.json" > "$OUT/verify.txt"
cat "$OUT/verify.txt"
(cd "$OUT/copy-patched" && for k in 0 1 2 3; do
  $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=off --moves=14,97,43,103,113,115,114,54,147,164 \
    --out="$OUT/routes-patched/off-$k.jsonl" > /dev/null &
  $NODE tools/integration/off108Route.ts --seeds=$((k * 100))..$((k * 100 + 99)) --scene=on --moves=113,115 --out="$OUT/routes-patched/on-$k.jsonl" > /dev/null &
done; wait)
for k in 0 1 2 3; do cmp -s "$OUT/routes/off-$k.jsonl" "$OUT/routes-patched/off-$k.jsonl" && echo "same OFF routes off-$k (patched)" || echo "DIFF OFF routes off-$k (patched)"; done
python3 tools/integration/aud118OnHold.py "$OUT/rom-r1.json" "$OUT/routes" "$OUT/routes-patched" > "$OUT/hold.txt"
cat "$OUT/hold.txt"
