#!/usr/bin/env bash
# usage: t2.sh TAG  -> rescore seeds 5569 7295 (Scene ON) on the CURRENT src into ssm1/t2-TAG-<seed>/ and print each seed's scoreboard TOTAL line
cd "$(dirname "$0")/../../.."
M=/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2k9
for s in ${SEEDS:-5569 7295}; do D=.integration/evidence/ssm1/t2-$1-$s; rm -rf $D; nice -n 10 tools/audio/aud249Rescore.sh $M/t2-on $D $s on >/dev/null 2>$D.err || echo FAIL $s
  echo "seed $s: $(python3 tools/audio/soundScoreboard.py $D 2>&1 | grep -E '^(TOTAL|move-animation SE|stat-change SE)' | tr -s ' ' | tr '\n' ';')"; done
