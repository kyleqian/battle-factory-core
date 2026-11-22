#!/usr/bin/env bash
# usage: probe.sh SEED SCENE DECISION [SPAN]  -> $G/p/$SC/ files named SEED-on.*  (t2k3 probe.sh on this worktree)
set -e
cd /srv/pokebench/pokeemerald-factory-core/workspace/.worktrees/integration-20261122-034041/workspace
S=$1; SC=$2; DEC=$3; T=/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2k3; G=/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/g180m; D=$G/p/${SUB:-$SC}; mkdir -p $D
for k in drive snd frozen setup; do [ -f $D/$S-on.$k.json ] || cp $T/t2/$S-$SC.$k.json $D/$S-on.$k.json; done
FROM=$(python3 -c "import json;a=json.load(open('$D/$S-on.drive.json'))['drive']['anchors'];print(max(0,a[$DEC]['commitFrame']-60))")
if [ ! -f $D/$S-on.rom.json ]; then
node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts replay --seed=$S --scene=$SC --setup=$D/$S-on.setup.json --romdrive=$D/$S-on.drive.json --cmdtrace=1 --out=$D/$S-on.eng-cmd.json >/dev/null
python3 tools/run-mgba-probe.py $D/$S-on.rom.json -- python3 tools/integration/hcr3mProbe.py $D/$S-on.rom.json $D/$S-on.frozen.json --profile $SC --from $FROM > $D/$S.probe.log 2>&1
fi
python3 tools/integration/hcr3mCmp.py $D $S --decision $DEC --span ${4:--40:700} > $D/$S-d$DEC.cmp.txt
wc -l $D/$S-d$DEC.cmp.txt
