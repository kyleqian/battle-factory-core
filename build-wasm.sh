#!/usr/bin/env bash
# Builds the factory-wasm crate for wasm32-unknown-unknown and copies the
# release artifact to <workspace-root>/artifacts/wasm/factory_wasm.wasm.
#
# Runnable from any cwd: resolves its own directory first.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH"

cd "${SCRIPT_DIR}"
cargo build -p factory-wasm --target wasm32-unknown-unknown --release

SRC="${SCRIPT_DIR}/target/wasm32-unknown-unknown/release/factory_wasm.wasm"
DEST_DIR="${WORKSPACE_ROOT}/artifacts/wasm"
DEST="${DEST_DIR}/factory_wasm.wasm"

mkdir -p "${DEST_DIR}"
cp "${SRC}" "${DEST}"

echo "wrote ${DEST}"
echo "size: $(wc -c < "${DEST}" | tr -d ' ') bytes"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${DEST}"
else
  shasum -a 256 "${DEST}"
fi
