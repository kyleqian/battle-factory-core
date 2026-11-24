#!/usr/bin/env bash
# usage: labs.sh TAG -> cfa1's six confusion labs, engine-only on cached ROM files, into .integration/evidence/chp1/lab-TAG
cd /srv/pokebench/pokeemerald-factory-core/workspace
O=.integration/evidence/chp1/lab-$1; rm -rf $O; mkdir -p $O; cp .integration/evidence/cfa1/lab-after/*.rom.json .integration/evidence/cfa1/lab-after/*.se.json .integration/evidence/cfa1/lab-after/*.fp $O/
nice -n 10 tools/integration/labCompare.sh --scene on --reuse-rom --out $O tools/battle-lab/cfa1-conf-psychic-s{1,2,3}-on.json tools/battle-lab/cfa1-conf-psychup-s{1,2,3}-on.json > $O/console.txt 2>&1
grep -E "^(SUMMARY|PRINTS)" $O/console.txt | cut -c1-160
