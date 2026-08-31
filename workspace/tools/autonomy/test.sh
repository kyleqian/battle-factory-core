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
git -C "${fixture_root}/repo" commit --quiet --allow-empty -m initial
git -C "${fixture_root}/repo" branch animation-main
git -C "${fixture_root}/repo" branch rust-main
git -C "${fixture_root}/repo" remote add origin "${fixture_root}/remote.git"
POKEBENCH_REPO_ROOT="${fixture_root}/repo" \
POKEBENCH_BACKUP_NAMESPACE=autonomy/test \
  "${SCRIPT_DIR}/backup-refs.sh" >/dev/null
for branch in master animation-main rust-main; do
  git -C "${fixture_root}/remote.git" show-ref --verify --quiet \
    "refs/heads/autonomy/test/${branch}"
done

echo "autonomy tests passed"
