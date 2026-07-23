#!/usr/bin/env bash
# Kick off (or continue) a work session in THIS run of pokeemerald-factory.
#
# Ensures the shared oracle service (ground truth, ../../oracle) is running,
# then launches a Claude Code agent that resumes from PROGRESS.md. Safe to
# re-run: each run continues where the last agent left off — all durable state
# lives in git + PROGRESS.md, never in a running process. The oracle server is
# left running between sessions and reused.
#
# Usage:
#   ./run-agent.sh                 # autonomous, hard-capped at 3h (default)
#   ./run-agent.sh -c 6            # autonomous, 6-hour cap   (--cap-hours 6)
#   ./run-agent.sh -i              # user-driven session, no cap   (--interactive)
#   ./run-agent.sh -m opus         # run a different model   (--model; default claude-sonnet-5)
#   ./run-agent.sh -h              # help   (--help)
#
# Autonomous runs pass --dangerously-skip-permissions so the agent proceeds
# without approval prompts (it's sandboxed to this run + the local oracle).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# Recursion guard: an agent launched by any of the launchers (this script,
# run-supervisor.sh, tools/run-subagent.sh) inherits POKEBENCH_ROLE and must
# not start another full session — the supervisor delegates via
# tools/run-subagent.sh.
if [[ -n "${POKEBENCH_ROLE:-}" ]]; then
  echo "run-agent: refusing — already inside a '$POKEBENCH_ROLE' session (supervisors delegate via tools/run-subagent.sh)" >&2
  exit 3
fi

usage() {
  cat <<'EOF'
Usage: ./run-agent.sh [options]
      (no options)      autonomous run, hard-capped at 3h
  -c, --cap-hours N     autonomous run with an N-hour hard cap
  -i, --interactive     user-driven session, no time cap
  -m, --model NAME      Claude model to run (default claude-sonnet-5)
      --log FILE        raw JSONL stream log (default /tmp/emerald-factory-agent.jsonl)
  -h, --help            show this help
EOF
}

INTERACTIVE="${INTERACTIVE:-0}"
CAP_HOURS="${CAP_HOURS:-3}"
AGENT_LOG="${AGENT_LOG:-/tmp/emerald-factory-agent.jsonl}"
MODEL="${MODEL:-claude-sonnet-5}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--interactive) INTERACTIVE=1; shift ;;
    -c|--cap-hours)   CAP_HOURS="${2:?--cap-hours needs a number}"; shift 2 ;;
    --cap-hours=*)    CAP_HOURS="${1#*=}"; shift ;;
    -m|--model)       MODEL="${2:?--model needs a model name}"; shift 2 ;;
    --model=*)        MODEL="${1#*=}"; shift ;;
    --log)            AGENT_LOG="${2:?--log needs a path}"; shift 2 ;;
    --log=*)          AGENT_LOG="${1#*=}"; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) echo "run-agent: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
done

if [[ "$INTERACTIVE" != "1" && ! "$CAP_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "run-agent: --cap-hours must be a positive number (got '$CAP_HOURS')" >&2
  exit 2
fi

# The oracle services are shared by the whole harness (all runs of this demo);
# the solo lane defaults to Battle Scene OFF while retaining the ON service
# for legacy trace regression and animation work.
HARNESS_ROOT="${POKEBENCH_HARNESS_ROOT:-$(cd ../.. && pwd)}"
source tools/oracle-profiles.sh
MAIN_ORACLE_URL="${POKEBENCH_MAIN_ORACLE_URL:-http://127.0.0.1:8014}"
ANIMATION_ORACLE_URL="${POKEBENCH_ANIMATION_ORACLE_URL:-http://127.0.0.1:8012}"
pokebench_ensure_oracle_profile "$HARNESS_ROOT" battle-scene-off \
  "$MAIN_ORACLE_URL" /tmp/emerald-factory-oracle-off.log
pokebench_ensure_oracle_profile "$HARNESS_ROOT" battle-scene-on \
  "$ANIMATION_ORACLE_URL" /tmp/emerald-factory-oracle-on.log
export POKEBENCH_MAIN_ORACLE_URL="$MAIN_ORACLE_URL"
export POKEBENCH_ANIMATION_ORACLE_URL="$ANIMATION_ORACLE_URL"
export POKEBENCH_ORACLE_URL="$MAIN_ORACLE_URL"
export POKEBENCH_ORACLE_PROFILE=battle-scene-off
echo "Main oracle (Battle Scene OFF) up at $MAIN_ORACLE_URL"

PROMPT="Follow AGENTS.md. Read the top entry of PROGRESS.md, WORKSTREAMS.md, and the authoritative Stage 8 reset in ROADMAP.md. Continue with staged scenarios and the generic round/presentation architecture against the Battle Scene OFF oracle; do not resume the retired canonical Battle 2 turn march. Commit after every green step and keep PROGRESS.md current; you may be stopped at any time."

if [[ "$INTERACTIVE" == "1" ]]; then
  POKEBENCH_ROLE=agent exec claude --model "$MODEL" --dangerously-skip-permissions "$PROMPT"
fi

CAP_SECONDS="$(awk "BEGIN { printf \"%d\", $CAP_HOURS * 3600 }")"
echo "Autonomous run on $MODEL (change with --model NAME), hard cap ${CAP_HOURS}h (${CAP_SECONDS}s, --cap-hours N)."

# Stream the agent's activity live; raw JSONL is tee'd to $AGENT_LOG and a
# copy is piped through tools/stream-pretty.mjs for a compact terminal view.
# Process substitution keeps $! as the claude pid so the watchdog can signal
# it directly.
echo "Streaming agent output to the terminal; raw JSONL in $AGENT_LOG (tail -f to follow)"
POKEBENCH_ROLE=agent claude -p --verbose --output-format stream-json \
  --model "$MODEL" \
  --dangerously-skip-permissions "$PROMPT" \
  > >(tee -a "$AGENT_LOG" | node tools/stream-pretty.mjs) &
agent_pid=$!
( sleep "$CAP_SECONDS"
  echo "run-agent: ${CAP_HOURS}h cap reached — stopping agent"
  kill -TERM "$agent_pid" 2>/dev/null
  sleep 15
  kill -KILL "$agent_pid" 2>/dev/null ) &
watchdog_pid=$!

wait "$agent_pid"
status=$?
kill "$watchdog_pid" 2>/dev/null || true
wait "$watchdog_pid" 2>/dev/null || true
exit "$status"
