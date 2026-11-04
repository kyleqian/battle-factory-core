#!/usr/bin/env bash
# Build every machine-local dependency needed by the supervisors on a clean
# Ubuntu 24.04 x86_64 or aarch64 host. Run as root after restoring the repository.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export POKEBENCH_ARCH="${POKEBENCH_ARCH:-$(uname -m)}"
source "${SCRIPT_DIR}/versions.env"
case "$POKEBENCH_ARCH" in
  x86_64|aarch64) ;;
  *) echo "bootstrap-ubuntu: unsupported architecture ${POKEBENCH_ARCH}" >&2; exit 2 ;;
esac

RUNNER_USER="${1:-pokebench}"
REPO_ROOT="${2:-/srv/pokebench/pokeemerald-factory-core}"
POKEBENCH_ROOT="$(dirname "$REPO_ROOT")"
VENDOR_ROOT="${POKEBENCH_ROOT}/vendor"
WORKSPACE_ROOT="${REPO_ROOT}/workspace"
JOBS="${POKEBENCH_BUILD_JOBS:-8}"
SWAP_SIZE_GIB="${POKEBENCH_SWAP_SIZE_GIB:-8}"

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
multilib_packages=()
if [[ "$POKEBENCH_ARCH" == x86_64 ]]; then
  multilib_packages=(g++-multilib gcc-multilib)
fi
apt-get install -y --no-install-recommends \
  binutils-arm-none-eabi \
  build-essential \
  ca-certificates \
  cmake \
  curl \
  file \
  "${multilib_packages[@]}" \
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
  python3-dev \
  python3-venv \
  ripgrep \
  rsync \
  tmux \
  unzip \
  xz-utils \
  zlib1g-dev

install_node() {
  local node_arch node_sha
  if [[ "$POKEBENCH_ARCH" == aarch64 ]]; then
    node_arch=arm64
    node_sha="$POKEBENCH_NODE_LINUX_ARM64_SHA256"
  else
    node_arch=x64
    node_sha="$POKEBENCH_NODE_LINUX_X64_SHA256"
  fi
  local install_root="/usr/local/lib/node-v${POKEBENCH_NODE_VERSION}-linux-${node_arch}"
  local archive
  archive="$(mktemp)"
  if [[ ! -x "${install_root}/bin/node" ]]; then
    curl --fail --location --silent --show-error \
      "https://nodejs.org/dist/v${POKEBENCH_NODE_VERSION}/node-v${POKEBENCH_NODE_VERSION}-linux-${node_arch}.tar.xz" \
      --output "$archive"
    echo "${node_sha}  ${archive}" | sha256sum --check --status
    tar -xJf "$archive" -C /usr/local/lib
  fi
  ln -sfn "${install_root}/bin/node" /usr/local/bin/node
  ln -sfn "${install_root}/bin/npm" /usr/local/bin/npm
  ln -sfn "${install_root}/bin/npx" /usr/local/bin/npx
}

install_claude_code() {
  local runner_home installer
  runner_home="$(getent passwd "$RUNNER_USER" | cut -d: -f6)"
  installer="$(mktemp)"
  curl --fail --location --silent --show-error \
    https://claude.ai/install.sh --output "$installer"
  chmod 0755 "$installer"
  runuser -u "$RUNNER_USER" -- env HOME="$runner_home" \
    bash "$installer" "$POKEBENCH_CLAUDE_CODE_VERSION"
  if [[ "$(runuser -u "$RUNNER_USER" -- env HOME="$runner_home" \
      "${runner_home}/.local/bin/claude" --version)" \
      != "${POKEBENCH_CLAUDE_CODE_VERSION} (Claude Code)" ]]; then
    echo "bootstrap-ubuntu: Claude Code version verification failed" >&2
    exit 1
  fi
}

install_swap_guard() {
  local swap_file=/swapfile
  if ! swapon --noheadings --show=NAME | grep -Fxq "$swap_file"; then
    if [[ ! -e "$swap_file" ]]; then
      fallocate -l "${SWAP_SIZE_GIB}G" "$swap_file"
      chmod 600 "$swap_file"
      mkswap "$swap_file" >/dev/null
    fi
    swapon "$swap_file"
  fi
  if ! grep -Fqx "$swap_file none swap sw 0 0" /etc/fstab; then
    echo "$swap_file none swap sw 0 0" >> /etc/fstab
  fi
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
  if [[ "$POKEBENCH_ARCH" == aarch64 ]]; then
    install_libmgba_python_native
    return
  fi
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

install_libmgba_python_native() {
  local binding_source="${VENDOR_ROOT}/libmgba-py-src"
  local binding_build="${VENDOR_ROOT}/libmgba-py-native-build"
  local binding_root="${VENDOR_ROOT}/libmgba-py"
  checkout_exact https://github.com/hanzi/libmgba-py.git "$binding_source" "$POKEBENCH_LIBMGBA_PY_COMMIT"
  install -d -o "$RUNNER_USER" -g "$RUNNER_USER" "$binding_build" "$binding_root"
  runuser -u "$RUNNER_USER" -- git -C "$binding_source" archive "$POKEBENCH_LIBMGBA_PY_COMMIT" | \
    tar -x -C "$binding_build"
  # The upstream Linux helper assumes its Docker paths. Change only this
  # generated build copy's paths; compile the pinned binding source natively.
  python3 - "$binding_build" "${VENDOR_ROOT}/mgba-src" <<'PY'
from pathlib import Path
import sys
binding = Path(sys.argv[1])
mgba = Path(sys.argv[2])
values = {"path_to_libmgba_py": str(binding), "path_to_mgba_root": str(mgba),
          "path_to_mgba_build": str(mgba / "build-linux")}
(binding / "_config.py").write_text("from pathlib import Path\n" +
    "\n".join(f"{key} = Path({value!r})" for key, value in values.items()) + "\n")
PY
  chown -R "$RUNNER_USER:$RUNNER_USER" "$binding_build"
  runuser -u "$RUNNER_USER" -- python3 -m venv "${VENDOR_ROOT}/mgba-venv"
  runuser -u "$RUNNER_USER" -- "${VENDOR_ROOT}/mgba-venv/bin/pip" install --quiet \
    "setuptools==${POKEBENCH_SETUPTOOLS_VERSION}" "cffi==${POKEBENCH_CFFI_VERSION}" "pillow==${POKEBENCH_PILLOW_VERSION}"
  (
    cd "$binding_build"
    runuser -u "$RUNNER_USER" -- "${VENDOR_ROOT}/mgba-venv/bin/python" setup.py build --build-lib "$binding_root"
  )
  runuser -u "$RUNNER_USER" -- env PYTHONPATH="$binding_root" \
    "${VENDOR_ROOT}/mgba-venv/bin/python" -c 'import cffi, mgba, PIL'
}

build_reference_rom() {
  local agbcc_root="${VENDOR_ROOT}/agbcc"
  local emerald_root="${VENDOR_ROOT}/pokeemerald"
  checkout_exact https://github.com/pret/agbcc.git "$agbcc_root" "$POKEBENCH_AGBCC_COMMIT"
  checkout_exact https://github.com/pret/pokeemerald.git "$emerald_root" "$POKEBENCH_POKEEMERALD_COMMIT"
  if [[ "$POKEBENCH_ARCH" == aarch64 ]]; then
    # The legacy agbcc host build uses x86 multilib. Preserve the already
    # verified GBA artifacts instead: these are ARM7 ROM/ELF data, not host
    # executables. Source remains pinned for probes/extractors on this runner.
    local artifacts="${POKEBENCH_REFERENCE_ARTIFACTS:?ARM bootstrap needs the verified reference artifact directory}"
    echo "${POKEBENCH_ROM_SHA256}  ${artifacts}/pokeemerald.gba" | sha256sum --check --status
    echo "${POKEBENCH_REFERENCE_ELF_SHA256}  ${artifacts}/pokeemerald.elf" | sha256sum --check --status
    echo "${POKEBENCH_REFERENCE_MAP_SHA256}  ${artifacts}/pokeemerald.map" | sha256sum --check --status
    for artifact in pokeemerald.gba pokeemerald.elf pokeemerald.map; do
      install -m 644 -o "$RUNNER_USER" -g "$RUNNER_USER" "${artifacts}/${artifact}" "${emerald_root}/${artifact}"
    done
    # Source extractors consume generated maps, graphics and MIDI assembly.
    # Build them natively without relinking the verified ROM/ELF/map.
    runuser -u "$RUNNER_USER" -- bash "${SCRIPT_DIR}/prepare-reference-assets.sh" "$emerald_root" "$JOBS"
    return
  fi
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
  runuser -u "$RUNNER_USER" -- env HOME="$runner_home" \
    "${runner_home}/.cargo/bin/rustup" component add \
      --toolchain "$POKEBENCH_RUST_VERSION" rustfmt clippy
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
  # Linked worktrees share repository config. Derive the unattended commit
  # identity from the checked-out history so fresh lane merges can commit.
  local git_user_name git_user_email
  git_user_name="$(runuser -u "$RUNNER_USER" -- git -C "$REPO_ROOT" log -1 --format=%an)"
  git_user_email="$(runuser -u "$RUNNER_USER" -- git -C "$REPO_ROOT" log -1 --format=%ae)"
  runuser -u "$RUNNER_USER" -- git -C "$REPO_ROOT" config user.name "$git_user_name"
  runuser -u "$RUNNER_USER" -- git -C "$REPO_ROOT" config user.email "$git_user_email"
}

install -d -o "$RUNNER_USER" -g "$RUNNER_USER" "$VENDOR_ROOT"
# `runuser` preserves the caller's working directory.  Hetzner bootstrap is
# commonly launched from /root, which the unprivileged runner cannot traverse;
# tools such as recursive make then fail when they return from `-C`.  Anchor
# every runner command in the shared project directory instead.
cd "$POKEBENCH_ROOT"
install_swap_guard
install_node
install_claude_code
install_mgba
install_libmgba_python
build_reference_rom
install_rust
prepare_repository

runner_home="$(getent passwd "$RUNNER_USER" | cut -d: -f6)"
runuser -u "$RUNNER_USER" -- env \
  HOME="$runner_home" \
  PATH="${SCRIPT_DIR}/bin:${runner_home}/.local/bin:${runner_home}/.cargo/bin:/usr/local/bin:/usr/bin:/bin" \
  "${SCRIPT_DIR}/verify-runner.sh" --skip-baselines
echo "bootstrap-ubuntu: reproducible dependencies and oracle smoke checks passed"
