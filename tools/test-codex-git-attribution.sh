#!/usr/bin/env bash
set -euo pipefail

run_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_repo="$(mktemp -d)"
trap 'rm -r "$test_repo"' EXIT

git -C "$test_repo" init -q

commit_args=(
  -c user.name=Test
  -c user.email=test@example.com
  -c commit.gpgsign=false
  commit
  --allow-empty
  -q
)

(
  source "$run_root/tools/codex-git-attribution.sh"
  codex_git_attribution_enable "$run_root" "gpt-5.6-sol" "high"
  git -C "$test_repo" "${commit_args[@]}" \
    -m "Codex authoritative attribution" \
    -m $'Generated-by: Codex\nAgent-model: gpt-5.4\nAgent-effort: low'
)

codex_message="$(git -C "$test_repo" log -1 --format=%B)"
grep -qx 'Generated-by: Codex' <<<"$codex_message"
grep -qx 'Agent-model: gpt-5.6-sol' <<<"$codex_message"
grep -qx 'Agent-effort: high' <<<"$codex_message"
! grep -qE 'Agent-model: (unknown|gpt-5\.4)|Agent-effort: low' <<<"$codex_message"

(
  source "$run_root/tools/codex-git-attribution.sh"
  codex_git_attribution_enable "$run_root"
  git -C "$test_repo" "${commit_args[@]}" -m "Codex unknown fallback"
)

unknown_message="$(git -C "$test_repo" log -1 --format=%B)"
grep -qx 'Agent-model: unknown' <<<"$unknown_message"
grep -qx 'Agent-effort: unknown' <<<"$unknown_message"

(
  source "$run_root/tools/codex-git-attribution.sh"
  export GIT_CONFIG_COUNT=1
  export GIT_CONFIG_KEY_0=color.ui
  export GIT_CONFIG_VALUE_0=never
  codex_git_attribution_enable "$run_root" "gpt-5.6-sol" "high"
  [[ "$GIT_CONFIG_COUNT" == "2" ]]
  codex_git_attribution_enable "$run_root" "gpt-5.6-terra" "xhigh"
  [[ "$GIT_CONFIG_COUNT" == "2" ]]
  codex_git_attribution_disable
  [[ "$GIT_CONFIG_COUNT" == "1" ]]
  [[ "$(git -C "$test_repo" config --get color.ui)" == "never" ]]
  [[ -z "$(git -C "$test_repo" config --get core.hooksPath || true)" ]]
  git -C "$test_repo" "${commit_args[@]}" \
    -m "Claude attribution remains provider-owned" \
    -m "Co-Authored-By: Claude <noreply@anthropic.com>"
)

claude_message="$(git -C "$test_repo" log -1 --format=%B)"
grep -qx 'Co-Authored-By: Claude <noreply@anthropic.com>' <<<"$claude_message"
! grep -qE '^Generated-by: Codex$|^Agent-model:|^Agent-effort:' <<<"$claude_message"

echo "Codex attribution hook: 3/3 PASS"
