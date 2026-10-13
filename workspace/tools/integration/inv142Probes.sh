#!/bin/sh
# inv142Probes.sh <out-dir>   (run from workspace/ or an archive copy's workspace/; docs/inv142-status-animation-invisible-battler.md)
# Direct mGBA only (gaf140Probe.py: stat101Probe.py with a 32-row pre-rise window dump), Scene ON, the four committed inv142 scenarios
# (fixtures/inv142/scenarios: Dig charge, then CANCELER_IN_LOVE immobilized / ENDTURN_YAWN, both sides; explicit lab seeds), each twice in
# fresh processes: r1 (with the window dump) then r2 (no dump); never the same job twice in parallel; a crashed job (exit 138 / 139)
# reruns once. Writes <out-dir>/probes/r{1,2}/<name>.json, <out-dir>/dump/*.npz, <out-dir>/done ("probes r1 == r2: n / t").
set -eu
OUT=$1
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o=$1/$(basename "$2" .json).json
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/gaf140Probe.py "$2" on "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/gaf140Probe.py "$2" on "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
SC=$(ls tools/integration/fixtures/inv142/scenarios/inv142-*.json)
for f in $SC; do echo "$OUT/probes/r1 $f"; done | STAT101_DUMP="$OUT/dump" xargs -n 2 -P 4 sh "$OUT/job.sh"
for f in $SC; do echo "$OUT/probes/r2 $f"; done | xargs -n 2 -P 4 sh "$OUT/job.sh"
n=0; t=0
for f in "$OUT"/probes/r1/*.json; do t=$((t + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && n=$((n + 1)); done
echo "probes r1 == r2: $n / $t" > "$OUT/done"
