#!/usr/bin/env bash

# Exact policy for ordinary Codex supervisors and workers. Max mode is a
# separate, intentionally all-Sol profile and does not use this matrix.
pokebench_codex_ordinary_effort() {
  case "$1" in
    gpt-5.6-terra|gpt-5.6-luna) printf '%s\n' max ;;
    gpt-5.6-sol) printf '%s\n' high ;;
    *) return 1 ;;
  esac
}

# Supervisor upgrades are independent of the established worker matrix.
pokebench_codex_supervisor_effort() {
  case "$1" in
    gpt-6.1-sol) printf '%s\n' high ;;
    *) pokebench_codex_ordinary_effort "$1" ;;
  esac
}
