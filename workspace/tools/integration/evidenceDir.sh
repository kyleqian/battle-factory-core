#!/usr/bin/env bash
# Sourced helper: resolve_seeds_dir [DIR] -> prints the first absolute dir holding a *.seeds file among: DIR as given (if absolute), else DIR under cwd, this workspace/, the main tree's workspace/
# (worktree sessions have no .integration/evidence); DIR defaults to .integration/evidence/t2n. On failure prints one line naming every path tried to stderr and returns 2.
resolve_seeds_dir() {
  local rel=${1:-.integration/evidence/t2n} H M c tried="" seen=""
  H=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
  M=$(cd "$H" && git rev-parse --path-format=absolute --git-common-dir 2>/dev/null); M=${M%/.git}/workspace
  if [ "${rel#/}" != "$rel" ]; then set -- "$rel"; else set -- "$PWD/$rel" "$H/$rel" "$M/$rel"; fi
  for c in "$@"; do
    case " $seen " in *" $c "*) continue ;; esac; seen="$seen $c"
    if compgen -G "$c/*.seeds" >/dev/null; then echo "$c"; return 0; fi
    tried="${tried:+$tried and }$c"
  done
  echo "no seeds dir (no *.seeds file in $tried); set the dir explicitly (absolute path, or FROM_DIR/SEEDS_DIR relative to this workspace or the main tree's)" >&2
  return 2
}
