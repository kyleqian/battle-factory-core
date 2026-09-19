#!/usr/bin/env bash
# Local, network-free contract checks for the scheduling wrappers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for script in "${SCRIPT_DIR}"/*.sh; do
  bash -n "$script"
done

jq empty "${SCRIPT_DIR}/oracle-smoke-trace.json"

# Evidence archives created on macOS contain AppleDouble resource-fork
# members. The runner-local tar shim must hide them on GNU tar just as the
# native macOS tar does.
archive="${SCRIPT_DIR}/../../tools/compare/evidence/belly-drum-player-raw-rgb.tar.gz"
if "${SCRIPT_DIR}/bin/tar" -tzf "$archive" | grep -qE '(^|/)\._'; then
  echo "autonomy tests: portable tar exposed AppleDouble members" >&2
  exit 1
fi

invalid_output="$(mktemp)"
status=0
"${SCRIPT_DIR}/run-lane.sh" invalid >"$invalid_output" 2>&1 || status=$?
[[ "$status" == 2 ]]
grep -q 'expected animation or rust' "$invalid_output"

expired_output="$(mktemp)"
AUTONOMY_END_EPOCH=1 "${SCRIPT_DIR}/run-lane.sh" animation >"$expired_output"
grep -q 'autonomy window ended' "$expired_output"

fixture_root="$(mktemp -d)"
git init --quiet --bare "${fixture_root}/remote.git"
git init --quiet -b master "${fixture_root}/repo"
git -C "${fixture_root}/repo" config user.name 'Autonomy Test'
git -C "${fixture_root}/repo" config user.email autonomy-test@example.invalid
printf 'committed\n' >"${fixture_root}/repo/checkpoint.txt"
git -C "${fixture_root}/repo" add checkpoint.txt
git -C "${fixture_root}/repo" commit --quiet -m initial
git -C "${fixture_root}/repo" branch animation-main
git -C "${fixture_root}/repo" branch rust-main
git -C "${fixture_root}/repo" branch worker/animation-test
git -C "${fixture_root}/repo" remote add origin "${fixture_root}/remote.git"
printf 'interrupted but recoverable\n' >>"${fixture_root}/repo/checkpoint.txt"
git -C "${fixture_root}/repo" stash push --quiet -m 'autonomy test recovery'
stash_oid="$(git -C "${fixture_root}/repo" rev-parse refs/stash)"
POKEBENCH_REPO_ROOT="${fixture_root}/repo" \
POKEBENCH_BACKUP_NAMESPACE=autonomy/test \
  "${SCRIPT_DIR}/backup-refs.sh" >/dev/null
for branch in animation-main rust-main; do
  git -C "${fixture_root}/remote.git" show-ref --verify --quiet \
    "refs/heads/autonomy/test/${branch}"
done
if git -C "${fixture_root}/remote.git" show-ref --verify --quiet \
    "refs/heads/autonomy/test/master"; then
  echo "autonomy tests: unattended backup unexpectedly pushed master" >&2
  exit 1
fi
git -C "${fixture_root}/remote.git" show-ref --verify --quiet \
  "refs/heads/autonomy/test/workers/animation-test"
git -C "${fixture_root}/remote.git" show-ref --verify --quiet \
  "refs/heads/autonomy/test/recovery/stash-${stash_oid:0:12}"

# Exercise lane dispatch without model/network access. Linux production uses
# flock; macOS can still run the remaining portable wrapper checks.
if command -v flock >/dev/null 2>&1; then
  mkdir -p "${fixture_root}/bin" "${fixture_root}/repo/workspace" "${fixture_root}/lane-workspace"
  cat >"${fixture_root}/bin/codex" <<'MOCK'
#!/usr/bin/env bash
[[ "$*" == "login status" ]]
MOCK
  cat >"${fixture_root}/repo/workspace/run-supervisor.sh" <<'MOCK'
#!/usr/bin/env bash
[[ "$*" == "--headless --lane animation --supervisor codex --sub-agent codex --cap-hours 0.25" ]] || exit 8
pwd >"$DISPATCH_RECEIPT"
MOCK
  cp "${fixture_root}/repo/workspace/run-supervisor.sh" "${fixture_root}/lane-workspace/run-supervisor.sh"
  chmod +x "${fixture_root}/bin/codex" "${fixture_root}/repo/workspace/run-supervisor.sh" "${fixture_root}/lane-workspace/run-supervisor.sh"
  for selected_workspace in "" "${fixture_root}/lane-workspace"; do
    PATH="${fixture_root}/bin:$PATH" \
    POKEBENCH_REPO_ROOT="${fixture_root}/repo" \
    POKEBENCH_BACKUP_NAMESPACE=autonomy/test \
    POKEBENCH_SUPERVISOR_WORKSPACE="$selected_workspace" \
    POKEBENCH_ANIMATION_SUPERVISOR_AGENT=codex \
    POKEBENCH_ANIMATION_SUB_AGENT=codex \
    POKEBENCH_ANIMATION_CAP_HOURS=0.25 POKEBENCH_MIN_FREE_GB=0 \
    AUTONOMY_END_EPOCH="$(( $(date +%s) + 3600 ))" \
    STATE_DIRECTORY="${fixture_root}/state" RUNTIME_DIRECTORY="${fixture_root}/run" \
    DISPATCH_RECEIPT="${fixture_root}/dispatch.txt" \
      "${SCRIPT_DIR}/run-lane.sh" animation >/dev/null
    [[ "$(cat "${fixture_root}/dispatch.txt")" == "${selected_workspace:-${fixture_root}/repo/workspace}" ]]
  done
fi

grep -q '^POKEBENCH_RUST_SUPERVISOR_AGENT=codex$' \
  "${SCRIPT_DIR}/autonomy.env.example"
grep -q '^POKEBENCH_UNATTENDED_DEFERRED_POLICY=block$' \
  "${SCRIPT_DIR}/autonomy.env.example"
grep -q '^POKEBENCH_REQUIRE_LANE_UNATTENDED_INSTRUCTIONS=0$' \
  "${SCRIPT_DIR}/autonomy.env.example"
grep -q '^OnCalendar=.*03:00:00 UTC$' \
  "${SCRIPT_DIR}/systemd/pokebench-rust.timer"
grep -q '^Restart=no$' \
  "${SCRIPT_DIR}/systemd/pokebench-supervisor@.service"
[[ "$(grep -c '"${SCRIPT_DIR}/backup-refs.sh"' "${SCRIPT_DIR}/run-lane.sh")" == 2 ]]
grep -q 'POKEBENCH_REQUIRE_LANE_UNATTENDED_INSTRUCTIONS' \
  "${SCRIPT_DIR}/../../run-supervisor.sh"

echo "autonomy tests passed"
