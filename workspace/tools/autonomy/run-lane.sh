#!/usr/bin/env bash
# Bounded systemd entry point. Animation and Rust have independent locks;
# repeated Animation starts never overlap on the single-writer branch.
set -euo pipefail

LANE="${1:-}"
if [[ ! "$LANE" =~ ^(animation|rust)$ ]]; then
  echo "run-lane: expected animation or rust" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="${SCRIPT_DIR}/bin:${PATH}"
REPO_ROOT="${POKEBENCH_REPO_ROOT:-$(cd "${SCRIPT_DIR}/../../.." && pwd)}"
WORKSPACE_ROOT="${REPO_ROOT}/workspace"
STATE_ROOT="${STATE_DIRECTORY:-${REPO_ROOT}/.git/pokebench-autonomy}"
LOCK_ROOT="${RUNTIME_DIRECTORY:-${STATE_ROOT}/run}"
END_EPOCH="${AUTONOMY_END_EPOCH:-}"
MIN_FREE_GB="${POKEBENCH_MIN_FREE_GB:-30}"

if [[ "$LANE" == animation ]]; then
  supervisor_agent="${POKEBENCH_ANIMATION_SUPERVISOR_AGENT:-codex}"
  sub_agent="${POKEBENCH_ANIMATION_SUB_AGENT:-codex}"
else
  supervisor_agent="${POKEBENCH_RUST_SUPERVISOR_AGENT:-codex}"
  sub_agent="${POKEBENCH_RUST_SUB_AGENT:-codex}"
fi
for agent in "$supervisor_agent" "$sub_agent"; do
  if [[ ! "$agent" =~ ^(codex|claude)$ ]]; then
    echo "run-lane: unattended agent must be codex or claude (got '$agent')" >&2
    exit 2
  fi
done

format_epoch_utc() {
  local epoch="$1"
  date -u -r "$epoch" '+%Y-%m-%d %H:%M:%S UTC' 2>/dev/null \
    || date -u -d "@${epoch}" '+%Y-%m-%d %H:%M:%S UTC'
}

if [[ ! "$END_EPOCH" =~ ^[0-9]+$ || "$END_EPOCH" == 0 ]]; then
  echo "run-lane: AUTONOMY_END_EPOCH must be a nonzero epoch timestamp" >&2
  exit 2
fi
now="$(date +%s)"
if (( now >= END_EPOCH )); then
  echo "run-lane: autonomy window ended at $(format_epoch_utc "$END_EPOCH"); skipping ${LANE}"
  exit 0
fi
if [[ ! "$MIN_FREE_GB" =~ ^[0-9]+$ ]]; then
  echo "run-lane: POKEBENCH_MIN_FREE_GB must be an integer" >&2
  exit 2
fi

mkdir -p "$STATE_ROOT" "$LOCK_ROOT"
exec 9>"${LOCK_ROOT}/${LANE}.lock"
if ! flock -n 9; then
  echo "run-lane: another ${LANE} supervisor is still active; skipping this timer"
  exit 0
fi

free_kb="$(df -Pk "$REPO_ROOT" | awk 'NR == 2 {print $4}')"
if (( free_kb < MIN_FREE_GB * 1024 * 1024 )); then
  echo "run-lane: less than ${MIN_FREE_GB} GiB free; refusing to start" >&2
  exit 1
fi
if [[ "$supervisor_agent" == codex || "$sub_agent" == codex ]]; then
  if ! codex login status >/dev/null 2>&1; then
    echo "run-lane: Codex is not signed in for $(id -un)" >&2
    exit 1
  fi
fi
if [[ "$supervisor_agent" == claude || "$sub_agent" == claude ]]; then
  if ! claude auth status >/dev/null 2>&1; then
    echo "run-lane: Claude Code is not signed in for $(id -un)" >&2
    exit 1
  fi
fi
if ! git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/${LANE}-main"; then
  echo "run-lane: missing refs/heads/${LANE}-main" >&2
  exit 1
fi

cap_hours="${POKEBENCH_ANIMATION_CAP_HOURS:-5.5}"
[[ "$LANE" == rust ]] && cap_hours="${POKEBENCH_RUST_CAP_HOURS:-4}"
started_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "run-lane: starting ${LANE} at ${started_at}, cap ${cap_hours}h, ${supervisor_agent}/${sub_agent}"

status=0
(
  cd "$WORKSPACE_ROOT"
  ./run-supervisor.sh --headless --lane "$LANE" \
    --supervisor "$supervisor_agent" --sub-agent "$sub_agent" \
    --cap-hours "$cap_hours"
) || status=$?

backup_status=0
"${SCRIPT_DIR}/backup-refs.sh" || backup_status=$?
finished_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf '%s lane=%s agents=%s/%s supervisor_status=%s backup_status=%s\n' \
  "$finished_at" "$LANE" "$supervisor_agent" "$sub_agent" "$status" "$backup_status" \
  >>"${STATE_ROOT}/runs.log"

# A watchdog termination is an expected bounded ending. Preserve other
# failures so systemd and the run log make them visible.
if [[ "$status" == 124 || "$status" == 137 || "$status" == 143 ]]; then
  status=0
fi
if [[ "$backup_status" != 0 ]]; then
  exit "$backup_status"
fi
exit "$status"
