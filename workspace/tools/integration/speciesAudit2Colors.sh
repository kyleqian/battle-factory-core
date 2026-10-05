#!/bin/sh
# speciesAudit2: residual pixel dumps (bbox + ROM<-live colour pairs per age) of the audited rows from retained evidence dirs.
# usage (workspace root): speciesAudit2Colors.sh <outDir>   (evidence under /tmp/s2/ev{,2,3,3b}, produced by speciesAudit2Dense.sh)
cd "$(dirname "$0")/../.." || exit 1
O=$1; mkdir -p "$O"; D=tools/integration/fixtures/species-audit
c() { # fixture evidenceRunDir firstFrame ages...
  fx=$1; ev=$2; ff=$3; shift 3; npx vite-node tools/integration/prep11LeafColors.ts "$fx" "$ev" "$ff" "$@" 2>&1; }
s=light-screen-live-slowpoke-player; c $D/derived-golbat/$s.json /tmp/s2/ev/$s/$s-run0 322 85 86 87 > $O/light-screen-golbat.txt
s=prep2-future-sight-player; c $D/derived-golbat/$s.json /tmp/s2/ev/$s/$s-run0 77 111 112 113 > $O/future-sight-golbat.txt
s=prep4-smelling-salt-player; c $D/derived-golbat/$s.json /tmp/s2/ev/$s/$s-run0 224 73 74 90 112 > $O/smelling-salt-golbat.txt
s=prep5-aromatherapy-player; c $D/derived-golbat/$s.json /tmp/s2/ev/$s/$s-run0 223 363 364 365 > $O/aromatherapy-golbat.txt
s=order-consumer-rock-throw-player; c $D/derived-golbat2/$s.json /tmp/s2/ev2/$s/$s-run0 300 0 10 20 21 > $O/rock-throw-golbat.txt
s=foresight-player-foresight-player-machoke-opponent-onix; c $D/derived-golbat2/$s.json /tmp/s2/ev2/$s/$s-run0 219 12 60 112 > $O/foresight-golbat.txt
s=spider-web-player-spider-web-alt-ariados; c $D/derived-golbat2b/$s.json /tmp/s2/ev2/$s/$s-run0 222 40 79 > $O/spider-web-golbat.txt
s=prep7-aerial-ace-lab-opponent; c $D/derived-pgolem2/$s.json /tmp/s2/ev3b/$s/$s-run0 81 9 10 11 12 > $O/aerial-ace-pgolem.txt
