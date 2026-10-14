#!/usr/bin/env bash
# Generate reference data with native host tools; never compile/link a ROM.
set -euo pipefail

REFERENCE_ROOT="${1:?usage: prepare-reference-assets.sh REFERENCE_ROOT [JOBS]}"
JOBS="${2:-4}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
make -C "$REFERENCE_ROOT" -f make_tools.mk -j "$JOBS" tools
make -C "$REFERENCE_ROOT" -j "$JOBS" generated

python3 - "$REFERENCE_ROOT" <<'PY'
from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1]).resolve()
build = root / 'build/native-reference-assets'
build.mkdir(parents=True, exist_ok=True)
targets = set()
for path in (root / 'data/maps').glob('*/map.json'):
    targets.add(str(path.with_name('header.inc').relative_to(root)))
for path in (root / 'sound/songs/midi').glob('*.mid'):
    targets.add(str(path.with_suffix('.s').relative_to(root)))
# Let the pinned native scanner preserve INCGFX conversion flags and compound
# formats. Its dependency files contain data recipes, but no C/ROM recipes.
dependency_files = []
for directory in ('src', 'data', 'asm', 'sound'):
    for path in sorted((root / directory).rglob('*')):
        if path.is_file() and path.suffix in ('.c', '.h', '.s', '.inc'):
            dependency = build / f'{len(dependency_files):05d}.d'
            subprocess.run(['tools/scaninc/scaninc', '-M', str(dependency.relative_to(root)),
                            '-g', 'build/assets', '-I', 'include', '-I', 'tools/agbcc/include',
                            '-I', '', str(path.relative_to(root))], cwd=root, check=True)
            dependency_files.append(str(dependency.relative_to(root)))
            dependencies = dependency.read_text().splitlines()[0].split(':', 1)[1].split()
            targets.update(t for t in dependencies if t.startswith(('build/assets/', 'graphics/', 'sound/')))
if not targets:
    raise SystemExit('prepare-reference-assets: no targets found')
rules = ['include Makefile', *(f'include {d}' for d in dependency_files),
         '.PHONY: native-reference-assets',
         'native-reference-assets: ' + ' '.join(sorted(targets))]
(build / 'assets.mk').write_text('\n'.join(rules) + '\n')
print(f'prepare-reference-assets: {len(targets)} data targets, {len(dependency_files)} source scans')
PY
make -C "$REFERENCE_ROOT" -f build/native-reference-assets/assets.mk -j "$JOBS" \
  NODEP=1 SETUP_PREREQS=0 native-reference-assets
(cd "$REFERENCE_ROOT" && sha256sum --check "${SCRIPT_DIR}/reference-assets.sha256")
