#!/usr/bin/env bash

# The temporary DeepSeek worker profile is intentionally fixed. OpenCode's
# model names include the upstream provider, so keeping this in one shared
# policy file prevents the supervisor and worker launchers from drifting.
POKEBENCH_DEEPSEEK_WORKER_MODEL="deepseek/deepseek-v4-flash"

pokebench_resolve_opencode_bin() {
  local resolved=""

  if [[ -n "${OPENCODE_BIN:-}" ]]; then
    resolved="$(command -v "$OPENCODE_BIN" 2>/dev/null || true)"
    if [[ -z "$resolved" && -x "$OPENCODE_BIN" ]]; then
      resolved="$OPENCODE_BIN"
    fi
    [[ -n "$resolved" ]] || return 1
    printf '%s\n' "$resolved"
    return 0
  fi

  resolved="$(command -v opencode 2>/dev/null || true)"
  if [[ -z "$resolved" && -x "$HOME/.opencode/bin/opencode" ]]; then
    resolved="$HOME/.opencode/bin/opencode"
  fi
  [[ -n "$resolved" ]] || return 1
  printf '%s\n' "$resolved"
}
