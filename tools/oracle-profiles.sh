#!/usr/bin/env bash
# Shared dual-oracle startup/identity checks for the run launchers.

pokebench_oracle_profile() {
  local url="$1"
  curl -sf "$url/v1/info" 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("profile",""))' 2>/dev/null
}

pokebench_ensure_oracle_profile() {
  local harness_root="$1"
  local profile="$2"
  local url="$3"
  local log_file="$4"
  local actual=""

  actual="$(pokebench_oracle_profile "$url" || true)"
  if [[ "$actual" == "$profile" ]]; then
    return 0
  fi
  if curl -sf "$url/health" >/dev/null 2>&1; then
    echo "oracle profile mismatch at $url: expected '$profile', got '${actual:-unreported}'" >&2
    echo "restart that service with: $harness_root/run-oracle.sh --profile $profile" >&2
    return 1
  fi

  echo "Starting $profile oracle at $url ..."
  local port="${url##*:}"
  port="${port%%/*}"
  PORT="$port" "$harness_root/run-oracle.sh" --profile "$profile" >"$log_file" 2>&1 &
  for _ in $(seq 1 90); do
    actual="$(pokebench_oracle_profile "$url" || true)"
    [[ "$actual" == "$profile" ]] && return 0
    sleep 1
  done
  echo "$profile oracle failed to start; see $log_file" >&2
  return 1
}
