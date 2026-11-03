#!/usr/bin/env bash
# Prove that the Linux runner reproduces the laptop's pinned reference stack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
WORKSPACE_ROOT="${REPO_ROOT}/workspace"
VENDOR_ROOT="$(dirname "$REPO_ROOT")/vendor"
export POKEBENCH_ARCH="${POKEBENCH_ARCH:-$(uname -m)}"
source "${SCRIPT_DIR}/versions.env"
case "$POKEBENCH_ARCH" in
  x86_64|aarch64) ;;
  *) echo "verify-runner: unsupported architecture ${POKEBENCH_ARCH}" >&2; exit 2 ;;
esac
cd "$WORKSPACE_ROOT"

SKIP_BASELINES=0
if [[ "${1:-}" == --skip-baselines ]]; then
  SKIP_BASELINES=1
  shift
fi
if [[ $# -ne 0 ]]; then
  echo "usage: verify-runner.sh [--skip-baselines]" >&2
  exit 2
fi

require_equal() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "verify-runner: ${label}: expected ${expected}, got ${actual}" >&2
    exit 1
  fi
  echo "ok ${label}: ${actual}"
}

require_equal architecture "$POKEBENCH_ARCH" "$(uname -m)"
if [[ -r /etc/os-release ]]; then
  source /etc/os-release
  require_equal os ubuntu "${ID:-unknown}"
  require_equal ubuntu-version "$POKEBENCH_UBUNTU_VERSION" "${VERSION_ID:-unknown}"
fi
require_equal node-version "v${POKEBENCH_NODE_VERSION}" "$(node --version)"
require_equal claude-code-version "${POKEBENCH_CLAUDE_CODE_VERSION} (Claude Code)" "$(claude --version)"
require_equal rust-version "rustc ${POKEBENCH_RUST_VERSION}" "$(rustc --version | awk '{print $1, $2}')"
rustfmt --version >/dev/null
cargo clippy --version >/dev/null
echo "ok rust-components: rustfmt clippy"
require_equal pokeemerald-commit "$POKEBENCH_POKEEMERALD_COMMIT" "$(git -C "${VENDOR_ROOT}/pokeemerald" rev-parse HEAD)"
require_equal agbcc-commit "$POKEBENCH_AGBCC_COMMIT" "$(git -C "${VENDOR_ROOT}/agbcc" rev-parse HEAD)"
require_equal mgba-commit "$POKEBENCH_MGBA_COMMIT" "$(git -C "${VENDOR_ROOT}/mgba-src" rev-parse HEAD)"
require_equal rom-sha1 "$POKEBENCH_ROM_SHA1" "$(sha1sum "${VENDOR_ROOT}/pokeemerald/pokeemerald.gba" | awk '{print $1}')"
require_equal rom-sha256 "$POKEBENCH_ROM_SHA256" "$(sha256sum "${VENDOR_ROOT}/pokeemerald/pokeemerald.gba" | awk '{print $1}')"
if [[ "$POKEBENCH_ARCH" == aarch64 ]]; then
  require_equal reference-elf-sha256 "$POKEBENCH_REFERENCE_ELF_SHA256" "$(sha256sum "${VENDOR_ROOT}/pokeemerald/pokeemerald.elf" | awk '{print $1}')"
  require_equal reference-map-sha256 "$POKEBENCH_REFERENCE_MAP_SHA256" "$(sha256sum "${VENDOR_ROOT}/pokeemerald/pokeemerald.map" | awk '{print $1}')"
  require_equal bindings-commit "$POKEBENCH_LIBMGBA_PY_COMMIT" "$(git -C "${VENDOR_ROOT}/libmgba-py-src" rev-parse HEAD)"
  (cd "${VENDOR_ROOT}/pokeemerald" && sha256sum --check "${SCRIPT_DIR}/reference-assets.sha256")
  echo "ok native reference assets"
fi

PYTHONPATH="${VENDOR_ROOT}/libmgba-py" "${VENDOR_ROOT}/mgba-venv/bin/python" -c 'import cffi, mgba, PIL'
echo "ok libmgba-py import"

source "${WORKSPACE_ROOT}/tools/resolve-harness-root.sh"
HARNESS_ROOT="$(pokebench_resolve_harness_root)"
export POKEBENCH_HARNESS_ROOT="$HARNESS_ROOT"
source "${WORKSPACE_ROOT}/tools/oracle-profiles.sh"
pokebench_ensure_oracle_profile "$HARNESS_ROOT" battle-scene-on http://127.0.0.1:8012 /tmp/emerald-factory-oracle-on.log
pokebench_ensure_oracle_profile "$HARNESS_ROOT" battle-scene-off http://127.0.0.1:8014 /tmp/emerald-factory-oracle-off.log

for profile in battle-scene-on battle-scene-off; do
  port=8012
  [[ "$profile" == battle-scene-off ]] && port=8014
  actual="$(curl --fail --silent "http://127.0.0.1:${port}/v1/info" | jq -r '.profile + " " + .bootstrap.canonicalScreenSha256')"
  require_equal "oracle-${profile}" "${profile} 9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297" "$actual"
  smoke_dir="$(mktemp -d)"
  "${WORKSPACE_ROOT}/bin/oracle" --profile "$profile" run "${SCRIPT_DIR}/oracle-smoke-trace.json" -o "$smoke_dir" >/dev/null
  actual="$(jq -r '.captures[-1].sha256' "${smoke_dir}/manifest.json")"
  require_equal "oracle-${profile}-frame-63" 6c4b6eb8ff4ea6720fb7f90c761622c101850dad893cb4e112a5911d2aa599ab "$actual"
done

if [[ "$SKIP_BASELINES" == 0 ]]; then
  npm --prefix "$WORKSPACE_ROOT" run typecheck
  npm --prefix "$WORKSPACE_ROOT" run test:smoke
  (
    cd "${WORKSPACE_ROOT}/core-rs"
    cargo test
    ./build-wasm.sh
    node --experimental-strip-types adapter/smoke.mts
  )
fi

echo "verify-runner: all requested checks passed"
