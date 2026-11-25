#!/usr/bin/env bash
# usage: try.sh TAG  (engine-only re-run of the two supersonic labs against the cached ROM files in ss/)
cd "$(dirname "$0")/../../.."
T=$1; O=.integration/evidence/ssm1/$T; mkdir -p $O; cp .integration/evidence/ssm1/ss/*.rom.json .integration/evidence/ssm1/ss/*.se.json .integration/evidence/ssm1/ss/*.fp $O/
nice -n 10 tools/integration/labCompare.sh --scene on --reuse-rom --out $O tools/battle-lab/ttf1-supersonic-opponent-magneton-player-mantine-on.json tools/battle-lab/ttf1-supersonic-player-magneton-opponent-mantine-on.json > $O/console.txt 2>&1
grep -E "^(  se|  print)" $O/console.txt | awk '{print $0}' | cut -c1-120 | head -${2:-24}
grep -E "^(SUMMARY|PRINTS)" $O/console.txt
