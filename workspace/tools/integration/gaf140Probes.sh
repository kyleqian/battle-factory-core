#!/bin/sh
# gaf140Probes.sh <out-dir>   (run from workspace/ or an archive copy's workspace/; docs/gaf140-status-gate-age.md)
# Direct mGBA only (gaf140Probe.py = stat101Probe.py with a 32-row pre-rise dump), Scene ON, the gated windows' seg127 scenarios
# (fixtures/gaf140/windows.json), every scenario twice in fresh processes: r1 (with the window dump) then r2 (no dump); never the same
# job twice in parallel; a crashed job (exit 138 / 139) reruns once. Writes <out-dir>/probes/r{1,2}/<stem>-on.json, <out-dir>/dump/*.npz,
# <out-dir>/done ("probes r1 == r2: n / t").
set -eu
OUT=$1
mkdir -p "$OUT/probes/r1" "$OUT/probes/r2" "$OUT/dump"
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o=$1/$(basename "$2" .json)-on.json
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/gaf140Probe.py "$2" on "$o" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/gaf140Probe.py "$2" on "$o" > /dev/null 2>&1; }
rm -f "$o.log"
JOB
SC=$(python3 -c "import json; print(' '.join(v['scenario'] for v in json.load(open('tools/integration/fixtures/gaf140/windows.json')).values()))")
for f in $SC; do echo "$OUT/probes/r1 $f"; done | STAT101_DUMP="$OUT/dump" xargs -n 2 -P 8 sh "$OUT/job.sh"
for f in $SC; do echo "$OUT/probes/r2 $f"; done | xargs -n 2 -P 8 sh "$OUT/job.sh"
n=0; t=0
for f in "$OUT"/probes/r1/*.json; do t=$((t + 1)); cmp -s "$f" "$OUT/probes/r2/$(basename "$f")" && n=$((n + 1)); done
echo "probes r1 == r2: $n / $t" > "$OUT/done"
