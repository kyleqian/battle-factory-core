#!/usr/bin/env bash
# Enable commit trailers for git processes started by this Codex session.
# This is sourced by the launchers; it deliberately changes only their
# process environment, never the repository's persistent git configuration.

codex_git_attribution_enable() {
  local run_root="${1:?run root is required}"
  local model="${2:-unknown}"
  local effort="${3:-unknown}"
  local config_index="${GIT_CONFIG_COUNT:-0}"
  local hook_path="${run_root}/tools/git-hooks"

  if [[ ! "$config_index" =~ ^[0-9]+$ ]]; then
    echo "codex-git-attribution: invalid GIT_CONFIG_COUNT '$config_index'" >&2
    return 2
  fi

  export POKEBENCH_COMMIT_GENERATOR="Codex"
  export POKEBENCH_COMMIT_MODEL="$model"
  export POKEBENCH_COMMIT_EFFORT="$effort"

  # A Codex worker spawned by a Codex supervisor inherits the same temporary
  # hook config. Reuse it instead of stacking duplicate core.hooksPath entries.
  if [[ "${POKEBENCH_CODEX_HOOK_CONFIG_INDEX:-}" =~ ^[0-9]+$ ]]; then
    local inherited_index="$POKEBENCH_CODEX_HOOK_CONFIG_INDEX"
    local inherited_key="GIT_CONFIG_KEY_${inherited_index}"
    local inherited_value="GIT_CONFIG_VALUE_${inherited_index}"
    if [[ "${!inherited_key:-}" == "core.hooksPath" && "${!inherited_value:-}" == "$hook_path" ]]; then
      return 0
    fi
  fi

  export "GIT_CONFIG_KEY_${config_index}=core.hooksPath"
  export "GIT_CONFIG_VALUE_${config_index}=$hook_path"
  export GIT_CONFIG_COUNT="$((config_index + 1))"
  export POKEBENCH_CODEX_HOOK_CONFIG_INDEX="$config_index"
  export POKEBENCH_CODEX_HOOK_PATH="$hook_path"
}

codex_git_attribution_disable() {
  local hook_index="${POKEBENCH_CODEX_HOOK_CONFIG_INDEX:-}"
  local hook_path="${POKEBENCH_CODEX_HOOK_PATH:-}"
  local config_count="${GIT_CONFIG_COUNT:-0}"

  unset POKEBENCH_COMMIT_GENERATOR POKEBENCH_COMMIT_MODEL POKEBENCH_COMMIT_EFFORT
  unset POKEBENCH_CODEX_HOOK_CONFIG_INDEX POKEBENCH_CODEX_HOOK_PATH

  [[ "$hook_index" =~ ^[0-9]+$ && "$config_count" =~ ^[0-9]+$ ]] || return 0
  (( hook_index < config_count )) || return 0

  local hook_key_name="GIT_CONFIG_KEY_${hook_index}"
  local hook_value_name="GIT_CONFIG_VALUE_${hook_index}"
  [[ "${!hook_key_name:-}" == "core.hooksPath" && "${!hook_value_name:-}" == "$hook_path" ]] || return 0

  local old_index new_index=0 old_key_name old_value_name old_key old_value
  for (( old_index = 0; old_index < config_count; old_index += 1 )); do
    [[ "$old_index" == "$hook_index" ]] && continue
    old_key_name="GIT_CONFIG_KEY_${old_index}"
    old_value_name="GIT_CONFIG_VALUE_${old_index}"
    old_key="${!old_key_name:-}"
    old_value="${!old_value_name:-}"
    export "GIT_CONFIG_KEY_${new_index}=$old_key"
    export "GIT_CONFIG_VALUE_${new_index}=$old_value"
    new_index=$((new_index + 1))
  done
  for (( old_index = new_index; old_index < config_count; old_index += 1 )); do
    unset "GIT_CONFIG_KEY_${old_index}" "GIT_CONFIG_VALUE_${old_index}"
  done
  export GIT_CONFIG_COUNT="$new_index"
}
