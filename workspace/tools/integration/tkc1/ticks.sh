#!/usr/bin/env bash
# usage: tools/integration/tkc1/ticks.sh OUTDIR "SEED..." [ROMDIR]  (run from workspace/; Scene ON)
# Replays the given T2 seeds with the CURRENT engine (--cmdtrace=1), aligns them to the ROM rows (t2k4/attr.py) into OUTDIR/attr-on.json and prints every end-of-turn poison / burn
# tick (SE 148 / 180 rows of a status-animation command with no move): seed, decision, first-row offset, previous row's offset, previous command, plus the seeds' TOTAL mass.
# ROMDIR default: the main tree's .integration/evidence/t2k11/t2 (drive / snd / tl / setup captures of the t2n seeds).
set -u
OUT=$1; SEEDS=$2; M=$(git rev-parse --path-format=absolute --git-common-dir); M=${M%/.git}/workspace
ROM=${3:-$M/.integration/evidence/t2k11/t2}
mkdir -p "$OUT/c" "$OUT/rom"; rm -f "$OUT"/c/*-on.engine.json "$OUT"/rom/*
for s in $SEEDS; do
  for k in drive snd tl; do ln -sf "$ROM/$s-on.$k.json" "$OUT/rom/$s-on.$k.json"; done
  nice -n 10 node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed=$s --scene=on --setup="$ROM/$s-on.setup.json" --romdrive="$ROM/$s-on.drive.json" --cmdtrace=1 --out="$OUT/c/$s-on.engine.json" >/dev/null 2>"$OUT/c/$s-on.err" || echo "FAIL $s"
done
python3 tools/integration/t2k4/attr.py on "$OUT/rom" "$OUT/c" "$OUT/attr-on.json" | tail -1
python3 tools/integration/tkc1/tickrows.py "$OUT/attr-on.json"
