#!/usr/bin/env bash

# Friendly short names for Claude models, so `-S opus` / `-s fable` (or
# `-m opus`) work as shorthand for `-S claude -m claude-opus-5` etc. Keep in
# sync with the model IDs actually in use. Callers pass an already-lowercased
# name; unknown names return failure so the caller falls through to ordinary
# provider/model validation instead of treating it as an alias.
pokebench_claude_model_alias() {
  case "$1" in
    fable)  printf '%s\n' claude-fable-5 ;;
    opus)   printf '%s\n' claude-opus-5 ;;
    sonnet) printf '%s\n' claude-sonnet-5 ;;
    haiku)  printf '%s\n' claude-haiku-4-5-20251001 ;;
    *) return 1 ;;
  esac
}
