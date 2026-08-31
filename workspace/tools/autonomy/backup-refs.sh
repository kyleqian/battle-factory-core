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

refs=()
for branch in master animation-main rust-main; do
  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/${branch}"; then
    refs+=("refs/heads/${branch}:refs/heads/${NAMESPACE}/${branch}")
  fi
done
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
echo "backup-refs: updated ${REMOTE}/${NAMESPACE}/{master,animation-main,rust-main}"
