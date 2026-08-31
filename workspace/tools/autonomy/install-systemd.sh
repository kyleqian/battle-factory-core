#!/usr/bin/env bash
# Install the recurring schedule after bootstrap, Codex login, GitHub deploy
# key setup, and the full verify-runner.sh canary have succeeded.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
RUNNER_USER="${1:-pokebench}"
END_EPOCH="${2:-}"
RUN_ID="${3:-$(date -u '+%Y%m%d')}"

if [[ "$EUID" -ne 0 ]]; then
  echo "install-systemd: run this script as root" >&2
  exit 2
fi
if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  echo "install-systemd: runner user '$RUNNER_USER' does not exist" >&2
  exit 2
fi
if [[ ! "$END_EPOCH" =~ ^[0-9]+$ ]] || (( END_EPOCH <= $(date +%s) )); then
  echo "install-systemd: END_EPOCH must be a future epoch timestamp" >&2
  exit 2
fi
if [[ ! "$RUN_ID" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "install-systemd: RUN_ID may contain only letters, digits, dot, underscore, and dash" >&2
  exit 2
fi

install -m 0644 "${SCRIPT_DIR}/systemd/pokebench-supervisor@.service" /etc/systemd/system/
install -m 0644 "${SCRIPT_DIR}/systemd/pokebench-animation.timer" /etc/systemd/system/
install -m 0644 "${SCRIPT_DIR}/systemd/pokebench-rust.timer" /etc/systemd/system/

env_tmp="$(mktemp)"
sed \
  -e "s|^AUTONOMY_END_EPOCH=.*|AUTONOMY_END_EPOCH=${END_EPOCH}|" \
  -e "s|^AUTONOMY_RUN_ID=.*|AUTONOMY_RUN_ID=${RUN_ID}|" \
  -e "s|^POKEBENCH_REPO_ROOT=.*|POKEBENCH_REPO_ROOT=${REPO_ROOT}|" \
  -e "s|^POKEBENCH_BACKUP_NAMESPACE=.*|POKEBENCH_BACKUP_NAMESPACE=autonomy/${RUN_ID}|" \
  "${SCRIPT_DIR}/autonomy.env.example" >"$env_tmp"
install -m 0644 "$env_tmp" /etc/pokebench-autonomy.env

unit_file=/etc/systemd/system/pokebench-supervisor@.service
sed -i \
  -e "s|^User=.*|User=${RUNNER_USER}|" \
  -e "s|^Group=.*|Group=${RUNNER_USER}|" \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=${REPO_ROOT}|" \
  -e "s|^ExecStart=.*|ExecStart=${REPO_ROOT}/workspace/tools/autonomy/run-lane.sh %i|" \
  "$unit_file"

systemctl daemon-reload
systemctl enable --now pokebench-animation.timer pokebench-rust.timer
systemctl list-timers --all 'pokebench-*'
echo "install-systemd: enabled through $(date -u -d "@${END_EPOCH}" '+%Y-%m-%d %H:%M:%S UTC')"
