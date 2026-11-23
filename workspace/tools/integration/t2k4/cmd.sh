#!/usr/bin/env bash
# usage: T2K4_DIR=EVIDENCE_DIR [SCENES="on off"] [SEEDS_DIR=ABS_DIR; default: this workspace's, else the main tree's, .integration/evidence/t2n] tools/integration/t2k4/cmd.sh  (run from workspace/)
# second --cmdtrace=1 replay of every seed of a rescoreAll.sh dir ($T2K4_DIR/t2) into $T2K4_DIR/c, the engine commands attr.py aligns to; then
# for sc in on off; do python3 tools/integration/t2k4/attr.py $sc $T2K4_DIR/t2 $T2K4_DIR/c $T2K4_DIR/attr-$sc.json; done
set -u
T=${T2K4_DIR:?}; mkdir -p "$T/c"
if [ -z "${SEEDS_DIR:-}" ]; then
  H=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)   # this workspace/
  M=$(cd "$H" && git rev-parse --path-format=absolute --git-common-dir 2>/dev/null); M=${M%/.git}/workspace   # main tree's workspace/
  for c in "$H" "$M"; do [ -f "$c/.integration/evidence/t2n/on.seeds" ] && { SEEDS_DIR=$c/.integration/evidence/t2n; break; }; done
  [ -n "${SEEDS_DIR:-}" ] || { echo "cmd.sh: no default seeds dir: neither $H nor $M has .integration/evidence/t2n/on.seeds; set SEEDS_DIR=ABS_DIR" >&2; exit 2; }
fi
SEEDS=$SEEDS_DIR; echo "cmd.sh: seeds from $SEEDS" >&2
for sc in ${SCENES:-on off}; do for s in $(cat "$SEEDS/$sc.seeds"); do
nice -n 10 node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed=$s --scene=$sc --setup=$T/t2/$s-$sc.setup.json --romdrive=$T/t2/$s-$sc.drive.json --cmdtrace=1 --out=$T/c/$s-$sc.engine.json >/dev/null 2>$T/c/$s-$sc.err || echo FAIL $s $sc
done; done
