#!/bin/sh
# speciesAudit13 patch proof (run from workspace/; src must be clean). Applies <patch.diff> (env-gated), runs speciesAudit13Check.ts with
# <ENV=value> over the fixtures (receipts -> <receipt dir>/<stem>-<kind>.json), ALWAYS reverts the patch (trap), then checks src is clean.
#   sh tools/integration/speciesAudit13Patch.sh <patch.diff> <probe dir> <receipt dir> <ENV=value> fixture.json...
[ $# -ge 5 ] || { echo "usage: speciesAudit13Patch.sh <patch.diff> <probe dir> <receipt dir> <ENV=value> fixture.json..."; exit 2; }
[ -z "$(git status --porcelain src)" ] || { echo "src not clean"; exit 2; }
PATCH=$1 PR=$2 REC=$3 ENVSET=$4; shift 4
git apply "$PATCH" || exit 1
trap 'git apply -R "$PATCH"; [ -z "$(git status --porcelain src)" ] && echo "patch reverted, src clean"' EXIT INT TERM
env "$ENVSET" PROBES="$PR" REC="$REC" P=${P:-12} sh tools/integration/speciesAudit13CheckAll.sh "$@" | sed -E "s/\"bbox\".*//; s|^|[$ENVSET] |"
