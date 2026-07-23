#!/usr/bin/env bash
# Enable commit trailers for git processes started by this Codex session.
# This is sourced by the launchers; it deliberately changes only their
# process environment, never the repository's persistent git configuration.

codex_git_attribution_enable() {
  local run_root="${1:?run root is required}"
  local model="${2:-unknown}"
  local effort="${3:-unknown}"
  local config_index="${GIT_CONFIG_COUNT:-0}"

  if [[ ! "$config_index" =~ ^[0-9]+$ ]]; then
    echo "codex-git-attribution: invalid GIT_CONFIG_COUNT '$config_index'" >&2
    return 2
  fi

  export POKEBENCH_COMMIT_GENERATOR="Codex"
  export POKEBENCH_COMMIT_MODEL="$model"
  export POKEBENCH_COMMIT_EFFORT="$effort"
  export "GIT_CONFIG_KEY_${config_index}=core.hooksPath"
  export "GIT_CONFIG_VALUE_${config_index}=${run_root}/tools/git-hooks"
  export GIT_CONFIG_COUNT="$((config_index + 1))"
}
