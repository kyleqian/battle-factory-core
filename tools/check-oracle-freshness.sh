#!/usr/bin/env bash
# Fail if a listening oracle service predates the harness commit it should be
# serving.
#
# Why this exists: on 2026-07-24 a worker staged `overrides.parties` against a
# service that had been running since before the harness shipped that builder,
# got a schema rejection, and recorded "overrides.parties not yet live" as a
# finding (docs/hit-chain-ground-truth.md:40). The docs were right; the
# *process* was stale. The oracle exposes no version endpoint, so the only
# cheap signal is process start time vs. harness HEAD commit time.
#
# Run from the run root:  ./tools/check-oracle-freshness.sh
# Exit 0 = both services are at or newer than harness HEAD. Exit 1 = restart
# the stale one before staging anything. Exit 2 = a service is not listening.
set -uo pipefail

RUN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARNESS_ROOT="$(cd "${RUN_ROOT}/../.." && pwd)"

if ! HARNESS_HEAD_EPOCH="$(git -C "${HARNESS_ROOT}" log -1 --format=%ct 2>/dev/null)"; then
  echo "FAIL: cannot read harness git history at ${HARNESS_ROOT}" >&2
  exit 1
fi
HARNESS_HEAD="$(git -C "${HARNESS_ROOT}" log -1 --format='%h %s' 2>/dev/null)"

# "Fri Jul 24 15:44:38 2026" -> epoch. Spaces are squeezed first because ps
# pads single-digit days ("Jul  4").
start_epoch_of_pid() {
  local lstart
  lstart="$(ps -p "$1" -o lstart= 2>/dev/null | tr -s ' ' | sed 's/^ *//;s/ *$//')"
  [ -n "${lstart}" ] || return 1
  date -j -f '%a %b %d %H:%M:%S %Y' "${lstart}" +%s 2>/dev/null
}

status=0
checked=0

for port in 8014 8012; do
  pid="$(lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null | head -1)"
  if [ -z "${pid}" ]; then
    echo "SKIP: no service listening on ${port}"
    [ "${status}" -eq 1 ] || status=2
    continue
  fi
  if ! started="$(start_epoch_of_pid "${pid}")"; then
    echo "SKIP: could not read start time for pid ${pid} on ${port}"
    [ "${status}" -eq 1 ] || status=2
    continue
  fi
  checked=$((checked + 1))
  human="$(date -r "${started}" '+%Y-%m-%d %H:%M:%S')"
  if [ "${started}" -lt "${HARNESS_HEAD_EPOCH}" ]; then
    echo "FAIL: port ${port} (pid ${pid}) started ${human}, BEFORE harness HEAD ${HARNESS_HEAD}"
    echo "      Restart it before staging — its schema predates the current oracle."
    status=1
  else
    echo "OK:   port ${port} (pid ${pid}) started ${human}, at or after harness HEAD"
  fi
done

echo "harness HEAD: ${HARNESS_HEAD} ($(date -r "${HARNESS_HEAD_EPOCH}" '+%Y-%m-%d %H:%M:%S'))"

if [ "${status}" -eq 1 ]; then
  exit 1
fi
if [ "${checked}" -eq 0 ] || [ "${status}" -eq 2 ]; then
  exit 2
fi
echo "PASS: both oracle services are current."
