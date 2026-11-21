#!/usr/bin/env bash
# labCompare: the one lab compare tool for the sound / presentation timing loop (tools/battle-lab/README.md "Lab compare").
# For each battle lab: ROM probe (hcr3mProbe.py per-frame script rows / exec flags / gAnimScriptActive + soundEventProbe.py lab SEs) and engine (b4mEngine.ts presentation commands with timing + sounds),
# written into a fresh per-run dir, then one table per lab (labCompare.py: sounds aligned as an ordered (kind, id) list, ENG - ROM per row, the ROM script label and the engine command around each row)
# and one SUMMARY line per lab (exact / offset / missing / extra, mass).
# Usage: tools/integration/labCompare.sh [--scene auto|on|off|both] [--out DIR] [--span A:B] [--kinds se,cry] [--ignore-ids 5] [--frames N] [--rows] [--reuse-rom] LAB.json...
#   LAB: a path or a bare lab name in tools/battle-lab/ (the engine stage reads the lab from tools/battle-lab/<name>.json). --scene auto (default) = the lab's own profile; on / off / both run the lab file in that scene.
#   --ignore-ids 5 (default) drops the menu select SE from both sides, as soundScoreboard.py; --ignore-ids '' keeps it.
#   --out DIR: default .integration/evidence/labcmp/<timestamp>/; files are DIR/<lab>.<scene>.{rom,se,eng}.json (+ .table.txt, summary.txt). An existing file is replaced, never refused (run-mgba-probe.py refuses stale outputs).
#   --reuse-rom: keep DIR's ROM files when the lab file and the ROM build are unchanged (engine-only re-run); a changed lab / ROM re-probes.
set -uo pipefail
cd "$(dirname "$0")/../.."
SCENE=auto OUT="" SPAN="" KINDS=se IGNORE=5 FRAMES="" ROWS="" REUSE="" LABS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --scene) SCENE=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --span) SPAN=$2; shift 2 ;;
    --kinds) KINDS=$2; shift 2 ;;
    --ignore-ids) IGNORE=$2; shift 2 ;;
    --frames) FRAMES=$2; shift 2 ;;
    --rows) ROWS=1; shift ;;
    --reuse-rom) REUSE=1; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    -*) echo "labCompare: unknown option $1" >&2; exit 2 ;;
    *) LABS+=("$1"); shift ;;
  esac
done
[ ${#LABS[@]} -gt 0 ] || { echo "labCompare: no lab given (see --help)" >&2; exit 2; }
case "$SCENE" in auto|on|off|both) ;; *) echo "labCompare: --scene must be auto|on|off|both" >&2; exit 2 ;; esac
[ -n "$OUT" ] || OUT=".integration/evidence/labcmp/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT" || exit 2
echo "labCompare: run dir $OUT"
: > "$OUT/summary.txt"
FAIL=0
for L in "${LABS[@]}"; do
  [ -f "$L" ] || L="tools/battle-lab/${L%.json}.json"
  [ -f "$L" ] || { echo "labCompare: no such lab: $L" >&2; FAIL=1; continue; }
  N=$(basename "$L" .json)
  if [ "$SCENE" = auto ]; then
    SCENES=$(python3 -c "import json,sys; print('on' if json.load(open(sys.argv[1]))['profile']=='battle-scene-on' else 'off')" "$L")
  elif [ "$SCENE" = both ]; then SCENES="on off"; else SCENES=$SCENE; fi
  for S in $SCENES; do
    K="$N.$S"; F="$OUT/$K"
    FP=$(python3 tools/integration/labCompare.py fingerprint "$L")
    if [ -n "$REUSE" ] && [ -s "$F.rom.json" ] && [ -s "$F.se.json" ] && [ "$(cat "$F.fp" 2>/dev/null)" = "$FP" ]; then
      echo "labCompare: $K: reusing ROM files (lab and ROM unchanged)"
    else
      rm -f "$F.rom.json" "$F.rom.json.log" "$F.se.json" "$F.se.json.log" "$F.fp"
      python3 tools/run-mgba-probe.py "$F.rom.json" -- python3 tools/integration/hcr3mProbe.py "$F.rom.json" "$L" --profile "$S" >/dev/null 2>&1 &
      P1=$!
      AUDIO_PROBE_EXTRA_HOOKS=BlendPalette python3 tools/run-mgba-probe.py "$F.se.json" -- python3 tools/audio/soundEventProbe.py "$F.se.json" lab "$L" --profile "$S" --fast --compact ${FRAMES:+--frames "$FRAMES"} >/dev/null 2>&1 &
      P2=$!
      wait $P1 || { echo "labCompare: ROM script probe failed: $K (see $F.rom.json.log)" >&2; FAIL=1; wait $P2; continue; }
      wait $P2 || { echo "labCompare: ROM sound probe failed: $K (see $F.se.json.log)" >&2; FAIL=1; continue; }
      echo "$FP" > "$F.fp"
    fi
    rm -f "$F.eng.json"
    node --experimental-strip-types --no-warnings tools/integration/b4mEngine.ts "$N" "$F.eng.json" --scene "$S" 2>&1 | grep -m3 Error
    [ -s "$F.eng.json" ] || { echo "labCompare: engine run failed: $K" >&2; FAIL=1; continue; }
    python3 tools/integration/labCompare.py table "$OUT" "$K" --kinds "$KINDS" --ignore-ids "$IGNORE" ${SPAN:+--span "$SPAN"} ${ROWS:+--rows} | tee "$F.table.txt" | cut -c1-300
    grep '^SUMMARY' "$F.table.txt" >> "$OUT/summary.txt"
  done
done
echo "-- summary ($OUT/summary.txt)"
cat "$OUT/summary.txt"
exit $FAIL
