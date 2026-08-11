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
