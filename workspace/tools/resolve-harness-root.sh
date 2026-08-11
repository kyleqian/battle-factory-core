#!/usr/bin/env bash
# Resolve the harness that owns this run. Normal runs live under runs/<name>;
# external git worktrees can live anywhere, so fall back to the primary run's
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
  candidate="$(cd ../.. && pwd)"
  if [[ -x "$candidate/run-oracle.sh" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  local common_dir primary_run
  common_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [[ -n "$common_dir" && -d "$common_dir" ]]; then
    primary_run="$(cd "$common_dir/.." && pwd)"
    candidate="$(cd "$primary_run/../.." && pwd)"
    if [[ -x "$candidate/run-oracle.sh" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  fi

  echo "could not locate the pokeemerald-factory harness; set POKEBENCH_HARNESS_ROOT" >&2
  return 1
}
