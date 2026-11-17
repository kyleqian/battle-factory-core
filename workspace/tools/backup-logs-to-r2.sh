#!/usr/bin/env bash
# Archive this run's Codex/DeepSeek/Claude logs to R2. Additive-only (rclone
# copy, not sync): local pruning or deletion must never delete the R2 copy.
set -uo pipefail

RUN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Claude Code slugifies the run's absolute path (non-alphanumerics -> "-")
# to name its local transcript dir; hardcoded since it won't change per-run.
CLAUDE_PROJECT_DIR="$HOME/.claude/projects/-Users-$USER-Developer-pokebench-pokeemerald-factory-runs-20260717-004950-warm-bison"

RCLONE_REMOTE="${R2_BACKUP_REMOTE:-r2}"
RCLONE_BUCKET="${R2_BACKUP_BUCKET:-pokebench}"
DEST="${RCLONE_REMOTE}:${RCLONE_BUCKET}/pokeemerald-factory/warm-bison"

log() { echo "[backup-logs-to-r2] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Best date for bucketing $1 under model $2. Codex/OpenCode worker and
# rollout filenames embed a start-of-session date directly; Claude's
# UUID-named session files don't, so read the first in-content timestamp
# instead (stable across reruns, unlike mtime on a file that keeps getting
# appended to across a day boundary). Anything matching neither falls back
# to mtime.
file_day() {
  local f="$1" model="$2" base ts
  base="$(basename "$f")"
  if [[ "$model" == "codex-logs" || "$model" == "opencode-logs" ]]; then
    if [[ "$base" =~ ^worker-([0-9]{4})([0-9]{2})([0-9]{2})- ]]; then
      echo "${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
      return
    fi
    if [[ "$base" =~ ^rollout-([0-9]{4}-[0-9]{2}-[0-9]{2})T ]]; then
      echo "${BASH_REMATCH[1]}"
      return
    fi
  elif [[ "$model" == "claude-logs" ]]; then
    ts="$(grep -m1 -o '"timestamp":"[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' "$f" 2>/dev/null)"
    if [ -n "$ts" ]; then
      echo "${ts: -10}"
      return
    fi
  fi
  stat -f '%Sm' -t '%Y-%m-%d' "$f"
}

# Lands each file at $DEST/$model/<YYYY-MM-DD>/<relative-path>. One rclone
# invocation per day (not per file) keeps the first backfill from spawning
# thousands of separate uploads.
copy_by_day() {
  local src="$1" model="$2"
  if [ ! -d "$src" ]; then
    log "skip (missing): $src"
    return 0
  fi

  local tmp; tmp="$(mktemp -d)"
  find "$src" -type f -print0 | while IFS= read -r -d '' f; do
    day="$(file_day "$f" "$model")"
    rel="${f#"$src"/}"
    echo "$rel" >> "$tmp/$day.list"
  done

  local status=0 file_list day
  for file_list in "$tmp"/*.list; do
    [ -e "$file_list" ] || continue
    day="$(basename "$file_list" .list)"
    log "copying $(wc -l < "$file_list" | tr -d ' ') file(s) from $day -> ${DEST}/${model}/${day}"
    rclone copy "$src" "${DEST}/${model}/${day}" --files-from "$file_list" || status=1
  done
  rm -rf "$tmp"
  return $status
}

status=0
copy_by_day "$RUN_DIR/.codex-logs" codex-logs || status=1
copy_by_day "$RUN_DIR/.opencode-logs" opencode-logs || status=1
copy_by_day "$CLAUDE_PROJECT_DIR" claude-logs || status=1

log "done, exit=$status"
exit "$status"
