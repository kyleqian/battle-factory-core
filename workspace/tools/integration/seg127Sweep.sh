#!/bin/sh
# seg127: seed sweep for the chance-driven seg127 scenarios (docs/seg127-status-se-gate.md §3). From a workspace checkout (or archive copy):
#   sh tools/integration/seg127Sweep.sh <scenario-dir> <fresh-out-dir> <first-seed> <count>
# Runs seg127Probe.py (Scene ON, direct mGBA, 8 parallel; a crashed job reruns once) on every scenario x seed, then prints per scenario
# the seeds whose receipts (seg127Rom.py --one) contain the scenario's expectedLabel (scenario-index.json next to <scenario-dir>).
set -u
SC="$1"; OUT="$2"; FIRST="$3"; COUNT="$4"
[ -e "$OUT" ] && { echo "refusing: $OUT exists"; exit 2; }
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); SC=$(cd "$SC" && pwd)
cat > "$OUT/job.sh" <<'JOB'
#!/bin/sh
PY=/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
o="$1/$(basename "$2" .json)-s$3.json"
python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" --seed "$3" > /dev/null 2>&1 || { rm -f "$o"; python3 tools/run-mgba-probe.py "$o" -- "$PY" tools/integration/seg127Probe.py "$2" on "$o" --seed "$3" > /dev/null 2>&1; }
python3 tools/integration/seg127Rom.py --one "$o" > "$o.txt" 2>&1; rm -f "$o" "$o.log"
JOB
i=0
while [ "$i" -lt "$COUNT" ]; do
  for s in "$SC"/*.json; do echo "$OUT $s $((FIRST + i))"; done
  i=$((i + 1))
done | xargs -P 8 -n 3 sh "$OUT/job.sh"
python3 - "$SC" "$OUT" <<'PYEOF'
import glob, json, os, sys
sc, out = sys.argv[1:3]
index = json.load(open(os.path.join(sc, "..", "scenario-index.json")))
for name, meta in sorted(index.items()):
    stem = name[:-5]
    hits = []
    for f in sorted(glob.glob(os.path.join(out, f"{stem}-s*.json.txt"))):
        seed = int(f.rsplit("-s", 1)[1].split(".")[0])
        lines = [l for l in open(f) if l.startswith(meta["expectedLabel"])]
        if lines:
            hits.append((seed, [" ".join(l.split()[i] for i in (0, 4, 6)) for l in lines]))
    print(stem, len(hits), hits[:3])
PYEOF
