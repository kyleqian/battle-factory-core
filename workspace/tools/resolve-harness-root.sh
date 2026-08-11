#!/usr/bin/env bash
# Resolve the repo top that owns this workspace (where run-oracle.sh and
# oracle/ live). The workspace sits one level below the repo top; external
# git worktrees can live anywhere, so fall back to the primary workspace's
# git common directory in that case.

pokebench_resolve_harness_root() {
  if [[ -n "${POKEBENCH_HARNESS_ROOT:-}" ]]; then
    if [[ -x "$POKEBENCH_HARNESS_ROOT/run-oracle.sh" ]]; then
      printf '%s\n' "$POKEBENCH_HARNESS_ROOT"
      return 0
    fi
    echo "invalid POKEBENCH_HARNESS_ROOT '$POKEBENCH_HARNESS_ROOT' (run-oracle.sh not found)" >&2
    return 1
  fi

  local candidate
  candidate="$(cd .. && pwd)"
  if [[ -x "$candidate/run-oracle.sh" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  local common_dir primary_run
  common_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [[ -n "$common_dir" && -d "$common_dir" ]]; then
    primary_run="$(cd "$common_dir/.." && pwd)"
    # Two-layer layout: the primary checkout root IS the repo top that owns
    # run-oracle.sh; older flat layouts kept it one level above the run.
    for candidate in "$primary_run" "$primary_run/.."; do
      candidate="$(cd "$candidate" 2>/dev/null && pwd)" || continue
      if [[ -x "$candidate/run-oracle.sh" ]]; then
        printf '%s\n' "$candidate"
        return 0
      fi
    done
  fi

  echo "could not locate the pokeemerald-factory harness; set POKEBENCH_HARNESS_ROOT" >&2
  return 1
}
