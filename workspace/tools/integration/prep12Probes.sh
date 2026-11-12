#!/bin/sh
# prep12: direct-mGBA Random2 attribution probe of each C-only move's accepted staged (player-side) scenario, run twice from fresh
# processes and cmp'd. usage: tools/integration/prep12Probes.sh OUTDIR [move ...]   (run from workspace/)
set -e
PY=${MGBA_PY:-${POKEBENCH_VENDOR_DIR:-../../vendor}/mgba-venv/bin/python}
OUT=${1:-/tmp/p12}; shift || true
mkdir -p "$OUT"
LAB=tools/battle-lab
scen() { case $1 in
  astonish) echo $LAB/mechanic-astonish-player-loudred-opponent-onix.json;;
  double-kick) echo $LAB/mechanic-double-kick-player-nidorina-opponent-onix.json;;
  hidden-power) echo $LAB/mechanic-hidden-power-player-unown-opponent-onix.json;;
  hyper-beam) echo $LAB/mechanic-hyper-beam-player-aerodactyl-opponent-onix.json;;
  ice-beam) echo $LAB/mechanic-ice-beam-player-delcatty-opponent-shuckle.json;;
  meteor-mash) echo $LAB/mechanic-meteor-mash-player-metang-opponent-onix.json;;
  mud-slap) echo $LAB/mechanic-mud-slap-player-pidgeotto-onix.json;;
  sand-attack) echo $LAB/mechanic-sand-attack-player-pidgeotto-onix.json;;
  thrash) echo $LAB/mechanic-thrash-player-tauros-opponent-onix.json;;
  water-spout) echo $LAB/mechanic-water-spout-player-wailmer-opponent-shuckle.json;;
  wish) echo $LAB/mechanic-wish-player-illumise-opponent-onix.json;;
  flail) echo $LAB/mechanic-flail-player-krabby-opponent-onix.json;;
  flail-natural) echo $LAB/mechanic-flail-natural-hp-player-krabby-opponent-onix.json;;
  alt-*) ls $LAB/prep12-${1#alt-}-alt-*.json | head -1;;
esac; }
MOVES=${*:-astonish double-kick hidden-power hyper-beam ice-beam meteor-mash mud-slap sand-attack thrash water-spout wish flail flail-natural}
for m in $MOVES; do
  s=$(scen $m)
  for r in 1 2; do
    python3 tools/run-mgba-probe.py "$OUT/$m-r$r.json" -- $PY tools/integration/random2RouteProbe.py "$s" "$OUT/$m-r$r.json" --lab --step-sample 0 --step-anim >/dev/null 2>&1
  done
  # finalStateSha1 (EWRAM+IWRAM hash) is not stable across fresh processes in this variant (observed); every per-frame field is
  python3 - "$OUT/$m-r1.json" "$OUT/$m-r2.json" "$m" <<'PYEOF'
import json, sys
a, b = (json.load(open(p)) for p in sys.argv[1:3])
diff = [k for k in a if a[k] != b[k]]
print(sys.argv[3], "identical (all fields except finalStateSha1)" if diff in ([], ["finalStateSha1"]) else f"DIFFER {diff}", "| runsSha1", a["runsSha1"][:12], "| finalStateSha1", "equal" if a["finalStateSha1"] == b["finalStateSha1"] else "differs")
PYEOF
done
