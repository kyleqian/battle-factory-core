#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/tools/oracle-profiles.sh"

pokebench_oracle_profile() { echo "battle-scene-off"; }
curl() { return 0; }
pokebench_require_oracle_profile battle-scene-off http://example.test

if pokebench_require_oracle_profile battle-scene-on http://example.test 2>/dev/null; then
  echo "expected a profile mismatch to fail" >&2
  exit 1
fi

pokebench_oracle_profile() { return 1; }
curl() { return 1; }
message="$(
  pokebench_require_oracle_profile \
    battle-scene-off http://example.test 2>&1 || true
)"
if [[ "$message" != *"required battle-scene-off oracle is unavailable"* ]]; then
  echo "missing unavailable-oracle diagnostic: $message" >&2
  exit 1
fi

echo "oracle profile requirement tests passed"
