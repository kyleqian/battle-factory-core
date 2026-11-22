#!/usr/bin/env bash
# usage: T2K4_DIR=EVIDENCE_DIR [SCENES="on off"] tools/integration/t2k4/cmd.sh  (run from workspace/)
# second --cmdtrace=1 replay of every seed of a rescoreAll.sh dir ($T2K4_DIR/t2) into $T2K4_DIR/c, the engine commands attr.py aligns to; then
# for sc in on off; do python3 tools/integration/t2k4/attr.py $sc $T2K4_DIR/t2 $T2K4_DIR/c $T2K4_DIR/attr-$sc.json; done
set -u
T=${T2K4_DIR:?}; SEEDS=${SEEDS_DIR:-.integration/evidence/t2n}; mkdir -p "$T/c"
for sc in ${SCENES:-on off}; do for s in $(cat "$SEEDS/$sc.seeds"); do
nice -n 10 node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed=$s --scene=$sc --setup=$T/t2/$s-$sc.setup.json --romdrive=$T/t2/$s-$sc.drive.json --cmdtrace=1 --out=$T/c/$s-$sc.engine.json >/dev/null 2>$T/c/$s-$sc.err || echo FAIL $s $sc
done; done
