#!/bin/sh
# Recreates the UNTRACKED patch-proof renderer src/engine/battleScene.patched.ts (never commit it; delete after the proof):
#   sh tools/integration/elevatedPostbodyPatch.sh && EP_RENDERER=battleScene.patched.ts node ... elevatedPostbodyCompare.ts ...
cd "$(dirname "$0")/../.." || exit 1
cp src/engine/battleScene.ts src/engine/battleScene.patched.ts
patch -s src/engine/battleScene.patched.ts < tools/integration/fixtures/elevated-postbody/ordinary-field-elevation-shadow.diff
