#!/usr/bin/env bash
# Build every machine-local dependency needed by the supervisors on a clean
# Ubuntu 24.04 x86_64 host. Run as root after the repository has been restored.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/versions.env"

RUNNER_USER="${1:-pokebench}"
REPO_ROOT="${2:-/srv/pokebench/pokeemerald-factory-core}"
POKEBENCH_ROOT="$(dirname "$REPO_ROOT")"
VENDOR_ROOT="${POKEBENCH_ROOT}/vendor"
WORKSPACE_ROOT="${REPO_ROOT}/workspace"
JOBS="${POKEBENCH_BUILD_JOBS:-8}"

if [[ "$EUID" -ne 0 ]]; then
  echo "bootstrap-ubuntu: run this script as root" >&2
  exit 2
fi
if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  echo "bootstrap-ubuntu: runner user '$RUNNER_USER' does not exist" >&2
  exit 2
fi
if [[ ! -d "${REPO_ROOT}/.git" || ! -f "${WORKSPACE_ROOT}/package-lock.json" ]]; then
  echo "bootstrap-ubuntu: repository is incomplete at ${REPO_ROOT}" >&2
  exit 2
fi
if [[ "$(uname -m)" != "$POKEBENCH_ARCH" ]]; then
  echo "bootstrap-ubuntu: expected ${POKEBENCH_ARCH}, got $(uname -m)" >&2
  exit 2
fi
if [[ ! -r /etc/os-release ]]; then
  echo "bootstrap-ubuntu: /etc/os-release is missing" >&2
  exit 2
fi
source /etc/os-release
if [[ "${ID:-}" != ubuntu || "${VERSION_ID:-}" != "$POKEBENCH_UBUNTU_VERSION" ]]; then
  echo "bootstrap-ubuntu: expected Ubuntu ${POKEBENCH_UBUNTU_VERSION}, got ${PRETTY_NAME:-unknown}" >&2
  exit 2
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  binutils-arm-none-eabi \
  build-essential \
  ca-certificates \
  cmake \
  curl \
  file \
  g++-multilib \
  gcc-multilib \
  git \
  jq \
  libavcodec-dev \
  libavfilter-dev \
  libavformat-dev \
  libavutil-dev \
  libelf-dev \
  libpng-dev \
  libswresample-dev \
  libswscale-dev \
  ninja-build \
  pkg-config \
  python3 \
  python3-venv \
  rsync \
  unzip \
  xz-utils \
  zlib1g-dev

install_node() {
  local install_root="/usr/local/lib/node-v${POKEBENCH_NODE_VERSION}-linux-x64"
  local archive
  archive="$(mktemp)"
  if [[ ! -x "${install_root}/bin/node" ]]; then
    curl --fail --location --silent --show-error \
      "https://nodejs.org/dist/v${POKEBENCH_NODE_VERSION}/node-v${POKEBENCH_NODE_VERSION}-linux-x64.tar.xz" \
      --output "$archive"
    echo "${POKEBENCH_NODE_LINUX_X64_SHA256}  ${archive}" | sha256sum --check --status
    tar -xJf "$archive" -C /usr/local/lib
  fi
  ln -sfn "${install_root}/bin/node" /usr/local/bin/node
  ln -sfn "${install_root}/bin/npm" /usr/local/bin/npm
  ln -sfn "${install_root}/bin/npx" /usr/local/bin/npx
  npm install --global --no-audit --no-fund "@openai/codex@${POKEBENCH_CODEX_VERSION}"
}

checkout_exact() {
  local url="$1"
  local destination="$2"
  local commit="$3"
  if [[ ! -d "${destination}/.git" ]]; then
    install -d -o "$RUNNER_USER" -g "$RUNNER_USER" "$destination"
    runuser -u "$RUNNER_USER" -- git -C "$destination" init --quiet
    runuser -u "$RUNNER_USER" -- git -C "$destination" remote add origin "$url"
  fi
  runuser -u "$RUNNER_USER" -- git -C "$destination" fetch --quiet --depth 1 origin "$commit"
  runuser -u "$RUNNER_USER" -- git -C "$destination" checkout --quiet --detach "$commit"
  if [[ "$(runuser -u "$RUNNER_USER" -- git -C "$destination" rev-parse HEAD)" != "$commit" ]]; then
    echo "bootstrap-ubuntu: failed to pin ${destination} at ${commit}" >&2
    exit 1
  fi
}

install_mgba() {
  local source_root="${VENDOR_ROOT}/mgba-src"
  local build_root="${source_root}/build-linux"
  checkout_exact https://github.com/mgba-emu/mgba.git "$source_root" "$POKEBENCH_MGBA_COMMIT"
  runuser -u "$RUNNER_USER" -- cmake \
    -S "$source_root" -B "$build_root" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DBUILD_QT=OFF -DBUILD_SDL=OFF \
    -DBUILD_SHARED=ON -DBUILD_STATIC=OFF \
    -DBUILD_GL=OFF -DBUILD_GLES2=OFF -DBUILD_GLES3=OFF \
    -DBUILD_PYTHON=OFF -DBUILD_UPDATER=OFF \
    -DUSE_EPOXY=OFF -DUSE_FFMPEG=ON -DUSE_EDITLINE=OFF \
    -DUSE_LIBZIP=OFF -DUSE_LUA=OFF -DUSE_DISCORD_RPC=OFF \
    -DUSE_SQLITE3=OFF -DUSE_MINIZIP=OFF -DENABLE_SCRIPTING=ON
  runuser -u "$RUNNER_USER" -- cmake --build "$build_root" --parallel "$JOBS"
  cmake --install "$build_root"
  ldconfig
  if ! ldconfig -p | grep -q 'libmgba\.so\.0\.10'; then
    echo "bootstrap-ubuntu: libmgba.so.0.10 was not installed" >&2
    exit 1
  fi
}

install_libmgba_python() {
  local archive="${VENDOR_ROOT}/libmgba-py_${POKEBENCH_LIBMGBA_PY_VERSION}_ubuntu-lunar.zip"
  local binding_root="${VENDOR_ROOT}/libmgba-py"
  if [[ ! -f "$archive" ]] || ! echo "${POKEBENCH_LIBMGBA_PY_SHA256}  ${archive}" | sha256sum --check --status; then
    curl --fail --location --silent --show-error \
      "https://github.com/hanzi/libmgba-py/releases/download/${POKEBENCH_LIBMGBA_PY_VERSION}/libmgba-py_0.2.0_ubuntu-lunar.zip" \
      --output "$archive"
  fi
  echo "${POKEBENCH_LIBMGBA_PY_SHA256}  ${archive}" | sha256sum --check --status
  install -d -o "$RUNNER_USER" -g "$RUNNER_USER" "$binding_root"
  runuser -u "$RUNNER_USER" -- unzip -oq "$archive" -d "$binding_root"
  if [[ ! -f "${binding_root}/mgba/_pylib.abi3.so" ]]; then
    echo "bootstrap-ubuntu: libmgba-py archive did not contain the binding" >&2
    exit 1
  fi
  runuser -u "$RUNNER_USER" -- python3 -m venv "${VENDOR_ROOT}/mgba-venv"
  runuser -u "$RUNNER_USER" -- "${VENDOR_ROOT}/mgba-venv/bin/pip" install --quiet \
    "cffi==${POKEBENCH_CFFI_VERSION}" "pillow==${POKEBENCH_PILLOW_VERSION}"
  runuser -u "$RUNNER_USER" -- env PYTHONPATH="$binding_root" \
    "${VENDOR_ROOT}/mgba-venv/bin/python" -c 'import cffi, mgba, PIL'
}

build_reference_rom() {
  local agbcc_root="${VENDOR_ROOT}/agbcc"
  local emerald_root="${VENDOR_ROOT}/pokeemerald"
  checkout_exact https://github.com/pret/agbcc.git "$agbcc_root" "$POKEBENCH_AGBCC_COMMIT"
  checkout_exact https://github.com/pret/pokeemerald.git "$emerald_root" "$POKEBENCH_POKEEMERALD_COMMIT"
  runuser -u "$RUNNER_USER" -- bash -lc "cd '$agbcc_root' && ./build.sh && ./install.sh '$emerald_root'"
  runuser -u "$RUNNER_USER" -- make -C "$emerald_root" -j "$JOBS"
  runuser -u "$RUNNER_USER" -- make -C "$emerald_root" compare
  echo "${POKEBENCH_ROM_SHA1}  ${emerald_root}/pokeemerald.gba" | sha1sum --check --status
  echo "${POKEBENCH_ROM_SHA256}  ${emerald_root}/pokeemerald.gba" | sha256sum --check --status
}

install_rust() {
  local runner_home
  runner_home="$(getent passwd "$RUNNER_USER" | cut -d: -f6)"
  runuser -u "$RUNNER_USER" -- env HOME="$runner_home" \
    bash -c 'curl --proto "=https" --tlsv1.2 --fail --silent --show-error https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain '"$POKEBENCH_RUST_VERSION"
  runuser -u "$RUNNER_USER" -- env HOME="$runner_home" \
    "${runner_home}/.cargo/bin/rustup" target add --toolchain "$POKEBENCH_RUST_VERSION" wasm32-unknown-unknown
}

prepare_repository() {
  install -d -o "$RUNNER_USER" -g "$RUNNER_USER" "${REPO_ROOT}/reference" "${WORKSPACE_ROOT}/reference"
  if [[ ! -e "${REPO_ROOT}/reference/pokeemerald" ]]; then
    runuser -u "$RUNNER_USER" -- ln -s ../../vendor/pokeemerald "${REPO_ROOT}/reference/pokeemerald"
  fi
  if [[ ! -e "${WORKSPACE_ROOT}/reference/pokeemerald" ]]; then
    runuser -u "$RUNNER_USER" -- ln -s ../../../vendor/pokeemerald "${WORKSPACE_ROOT}/reference/pokeemerald"
  fi
  runuser -u "$RUNNER_USER" -- npm --prefix "$WORKSPACE_ROOT" ci --no-audit --no-fund
}

install -d -o "$RUNNER_USER" -g "$RUNNER_USER" "$VENDOR_ROOT"
install_node
install_mgba
install_libmgba_python
build_reference_rom
install_rust
prepare_repository

runner_home="$(getent passwd "$RUNNER_USER" | cut -d: -f6)"
runuser -u "$RUNNER_USER" -- env \
  HOME="$runner_home" \
  PATH="${runner_home}/.cargo/bin:/usr/local/bin:/usr/bin:/bin" \
  "${SCRIPT_DIR}/verify-runner.sh" --skip-baselines
echo "bootstrap-ubuntu: reproducible dependencies and oracle smoke checks passed"
