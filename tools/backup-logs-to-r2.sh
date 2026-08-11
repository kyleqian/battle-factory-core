#!/usr/bin/env bash
# Archive this run's Codex/DeepSeek/Claude logs to R2. Additive-only (rclone
# copy, not sync): local pruning or deletion must never delete the R2 copy.
set -uo pipefail

RUN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Claude Code slugifies the run's absolute path (non-alphanumerics -> "-")
# to name its local transcript dir; hardcoded since it won't change per-run.
CLAUDE_PROJECT_DIR="$HOME/.claude/projects/-Users-kyle-Developer-pokebench-pokeemerald-factory-runs-20260717-004950-warm-bison"

RCLONE_REMOTE="${R2_BACKUP_REMOTE:-r2}"
RCLONE_BUCKET="${R2_BACKUP_BUCKET:-pokebench-agent-logs}"
DEST="${RCLONE_REMOTE}:${RCLONE_BUCKET}/warm-bison"

log() { echo "[backup-logs-to-r2] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

copy() {
  local src="$1" dest_subdir="$2"
  if [ -d "$src" ]; then
    log "copying $src -> ${DEST}/${dest_subdir}"
    rclone copy "$src" "${DEST}/${dest_subdir}"
  else
    log "skip (missing): $src"
  fi
}

status=0
copy "$RUN_DIR/.codex-logs" codex-logs || status=1
copy "$RUN_DIR/.opencode-logs" opencode-logs || status=1
copy "$CLAUDE_PROJECT_DIR" claude-logs || status=1

log "done, exit=$status"
exit "$status"
