#!/usr/bin/env bash
# Push committed state to a dedicated remote namespace without touching the
# user's canonical branches. No force-pushes are used.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${POKEBENCH_REPO_ROOT:-$(cd "${SCRIPT_DIR}/../../.." && pwd)}"
REMOTE="${POKEBENCH_GIT_REMOTE:-origin}"
NAMESPACE="${POKEBENCH_BACKUP_NAMESPACE:-}"

if [[ -z "$NAMESPACE" || ! "$NAMESPACE" =~ ^[A-Za-z0-9._/-]+$ || "$NAMESPACE" == */ || "$NAMESPACE" == /* ]]; then
  echo "backup-refs: set POKEBENCH_BACKUP_NAMESPACE to a safe remote branch prefix" >&2
  exit 2
fi
git -C "$REPO_ROOT" remote get-url "$REMOTE" >/dev/null

# Animation and Rust intentionally overlap. They share one Git repository and
# can finish at nearly the same instant, so serialize the multi-ref snapshot.
STATE_ROOT="${STATE_DIRECTORY:-${REPO_ROOT}/.autonomy-state}"
mkdir -p "$STATE_ROOT"
if command -v flock >/dev/null 2>&1; then
  exec 8>"${STATE_ROOT}/backup.lock"
  flock 8
else
  # macOS does not ship flock; this fallback keeps the network-free contract
  # test portable. The production Ubuntu runner always takes the fd-lock path.
  backup_lock_dir="${STATE_ROOT}/backup.lock.d"
  backup_lock_acquired=0
  for _ in {1..600}; do
    if mkdir "$backup_lock_dir" 2>/dev/null; then
      backup_lock_acquired=1
      break
    fi
    sleep 0.1
  done
  if [[ "$backup_lock_acquired" != 1 ]]; then
    echo "backup-refs: timed out waiting for backup lock" >&2
    exit 1
  fi
  trap 'rmdir "$backup_lock_dir"' EXIT
fi

refs=()
for branch in master animation-main rust-main; do
  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/${branch}"; then
    refs+=("refs/heads/${branch}:refs/heads/${NAMESPACE}/${branch}")
  fi
done
if git -C "$REPO_ROOT" show-ref --verify --quiet refs/stash; then
  stash_oid="$(git -C "$REPO_ROOT" rev-parse refs/stash)"
  refs+=("refs/stash:refs/heads/${NAMESPACE}/recovery/stash-${stash_oid:0:12}")
fi
if [[ ${#refs[@]} -eq 0 ]]; then
  echo "backup-refs: no local branches found" >&2
  exit 1
fi

runner_home="${HOME}"
deploy_key="${runner_home}/.ssh/pokebench-github"
if [[ -f "$deploy_key" ]]; then
  export GIT_SSH_COMMAND="/usr/bin/ssh -i ${deploy_key} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"
fi

git -C "$REPO_ROOT" push --porcelain "$REMOTE" "${refs[@]}"
echo "backup-refs: updated committed lane refs under ${REMOTE}/${NAMESPACE}"
