#!/bin/sh
# pfb228 (pfr192RomFrames + genderless + RAM rows): dense ROM framebuffer dumps of the player faint-replacement send-in (pfr185 lab scenario), one fresh run per (case, scene).
#   usage (workspace root): PFB228_JOBS=2 sh tools/integration/pfb228RomFrames.sh <outdir> <id=species:nature[:female|genderless]> ... (scenes: PFB228_SCENES, default "on off")
# writes <outdir>/<id>-<scene>.{json,raw}: json = pfr185Probe rows + confirmFrame / rawFirstFrame, raw = concatenated 240x160 RGB888 frames.
set -eu
PY=${PFB228_PY:-/srv/pokebench/vendor/mgba-venv/bin/python}
OUT=$1; shift
mkdir -p "$OUT"
JOBS=${PFB228_JOBS:-2}
run() {
  id=$1; sp=$2; nat=$3; scene=$4; fem=$5
  base=tools/battle-lab/playerfaint-slot2-sunnyday.json
  scen="$OUT/$id-$scene.scenario.json"
  python3 - "$base" "$scen" "$sp" "$nat" "$fem" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1])); p = d["overrides"]["parties"]["player"][1]
p["species"] = int(sys.argv[3]); p["nature"] = int(sys.argv[4])
if sys.argv[5] == "female":
    p["gender"] = "female"; p["evs"]["hp"] = 140  # the canonical MAGBY healthbox art is female 138/138
elif sys.argv[5] == "genderless":
    p["gender"] = "genderless"
json.dump(d, open(sys.argv[2], "w"))
PYEOF
  rm -f "$OUT/$id-$scene.json"
  FS_PROFILE=battle-scene-$scene PFR_RAW="$OUT/$id-$scene.raw" python3 tools/run-mgba-probe.py --max-log-bytes 20000 "$OUT/$id-$scene.json" -- "$PY" tools/integration/pfb228Frames.py "$scen" "$OUT/$id-$scene.json" >/dev/null 2>&1 || true
  echo "done $id $scene"
}
n=0
for scene in ${PFB228_SCENES:-on off}; do
  for spec in "$@"; do
    id=${spec%%=*}; rest=${spec#*=}; sp=${rest%%:*}; r2=${rest#*:}; nat=${r2%%:*}; fem=${r2#*:}; [ "$fem" = "$r2" ] && fem=male
    run "$id" "$sp" "$nat" "$scene" "$fem" &
    n=$((n+1))
    if [ $((n % JOBS)) -eq 0 ]; then wait; fi
  done
done
wait
