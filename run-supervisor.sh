#!/usr/bin/env bash
# Supervised work session for THIS run: a long-lived SUPERVISOR agent (default
# claude-fable-5) plans one increment at a time, delegates it to a capped
# disposable worker (tools/run-subagent.sh, default claude-sonnet-5), verifies
# the result, and continues, fixes, or escalates — per SUPERVISOR.md.
#
# By default the supervisor runs in the interactive CLI: it works mostly
# autonomously, but when it needs a decision it notifies you and asks in the
# terminal. A watchdog still hard-caps the session (default 6h) as the safety
# net — SUPERVISOR.md tells it to wind down cleanly before the deadline.
# Interactive sessions start with Remote Control on, so you can follow and
# steer them from claude.ai/code or the Claude mobile app; --headless print
# mode has no remote bridge.
# --headless runs it unattended like run-agent.sh.
#
# Usage:
#   ./run-supervisor.sh               # interactive supervisor, 6h hard cap
#   ./run-supervisor.sh -c 4          # different cap          (--cap-hours 4)
#   ./run-supervisor.sh --headless    # unattended, stream view like run-agent.sh
#   ./run-supervisor.sh -m NAME       # supervisor model (default claude-fable-5)
#   ./run-supervisor.sh -h            # help
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# Recursion guard: supervisors aren't nested, and workers never spawn agents.
if [[ -n "${POKEBENCH_ROLE:-}" ]]; then
  echo "run-supervisor: refusing — already inside a '$POKEBENCH_ROLE' session; supervisors aren't nested" >&2
  exit 3
fi

usage() {
  cat <<'EOF'
Usage: ./run-supervisor.sh [options]
      (no options)      interactive supervisor session, hard-capped at 6h
  -c, --cap-hours N     hard cap in hours (default 6)
      --headless        unattended run (stream view, like run-agent.sh)
  -m, --model NAME      supervisor model (default claude-fable-5)
      --log FILE        raw JSONL log for --headless (default /tmp/emerald-factory-supervisor.jsonl)
  -h, --help            show this help
EOF
}

HEADLESS="${HEADLESS:-0}"
CAP_HOURS="${CAP_HOURS:-6}"
MODEL="${MODEL:-claude-fable-5}"
SUPERVISOR_LOG="${SUPERVISOR_LOG:-/tmp/emerald-factory-supervisor.jsonl}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --headless)       HEADLESS=1; shift ;;
    -c|--cap-hours)   CAP_HOURS="${2:?--cap-hours needs a number}"; shift 2 ;;
    --cap-hours=*)    CAP_HOURS="${1#*=}"; shift ;;
    -m|--model)       MODEL="${2:?--model needs a model name}"; shift 2 ;;
    --model=*)        MODEL="${1#*=}"; shift ;;
    --log)            SUPERVISOR_LOG="${2:?--log needs a path}"; shift 2 ;;
    --log=*)          SUPERVISOR_LOG="${1#*=}"; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) echo "run-supervisor: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
done

if [[ ! "$CAP_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "run-supervisor: --cap-hours must be a positive number (got '$CAP_HOURS')" >&2
  exit 2
fi

HARNESS_ROOT="${POKEBENCH_HARNESS_ROOT:-$(cd ../.. && pwd)}"
ORACLE_URL="${POKEBENCH_ORACLE_URL:-http://127.0.0.1:8012}"

if ! curl -sf "$ORACLE_URL/health" >/dev/null 2>&1; then
  echo "Starting oracle service ($HARNESS_ROOT/run-oracle.sh) ..."
  "$HARNESS_ROOT/run-oracle.sh" >/tmp/emerald-factory-oracle.log 2>&1 &
  for _ in $(seq 1 90); do
    curl -sf "$ORACLE_URL/health" >/dev/null 2>&1 && break
    sleep 1
  done
fi
if ! curl -sf "$ORACLE_URL/health" >/dev/null 2>&1; then
  echo "Oracle failed to start; see /tmp/emerald-factory-oracle.log" >&2
  exit 1
fi
echo "Oracle up at $ORACLE_URL"
export POKEBENCH_ORACLE_URL="$ORACLE_URL"

CAP_SECONDS="$(awk "BEGIN { printf \"%d\", $CAP_HOURS * 3600 }")"
DEADLINE_EPOCH=$(( $(date +%s) + CAP_SECONDS ))
DEADLINE_HUMAN="$(date -r "$DEADLINE_EPOCH" '+%Y-%m-%d %H:%M' 2>/dev/null \
  || date -d "@$DEADLINE_EPOCH" '+%Y-%m-%d %H:%M')"

if [[ "$HEADLESS" == "1" ]]; then
  MODE_NOTE="This session is HEADLESS: nobody can answer mid-run — escalation means notify, record the question in PROGRESS.md, and wind down."
else
  MODE_NOTE="This session is INTERACTIVE: when you escalate, ask in this terminal and end your turn; the user will answer when they see the notification."
fi

PROMPT="You are the supervisor for this run. Read SUPERVISOR.md and follow it exactly: plan one increment at a time, delegate it to a worker via ./tools/run-subagent.sh (launched in the background — foreground Bash times out long before a worker finishes), verify each result yourself, and continue, fix, or escalate. Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it. ${MODE_NOTE}"

if [[ "$HEADLESS" == "1" ]]; then
  echo "Headless supervisor on $MODEL, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
  echo "Streaming to the terminal; raw JSONL in $SUPERVISOR_LOG (tail -f to follow)"
  POKEBENCH_ROLE=supervisor claude -p --verbose --output-format stream-json \
    --model "$MODEL" \
    --dangerously-skip-permissions "$PROMPT" \
    > >(tee -a "$SUPERVISOR_LOG" | node tools/stream-pretty.mjs) &
else
  echo "Interactive supervisor on $MODEL, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
  # Scripts run without job control, so this '&' child stays in our process
  # group and can still own the terminal for its TUI — backgrounding it only
  # serves to hold its pid for the watchdog (exec would lose the cap).
  POKEBENCH_ROLE=supervisor claude --remote-control \
    --remote-control-session-name-prefix emerald-factory \
    --model "$MODEL" --dangerously-skip-permissions "$PROMPT" &
fi
agent_pid=$!
( sleep "$CAP_SECONDS"
  echo "run-supervisor: ${CAP_HOURS}h cap reached — stopping supervisor"
  kill -TERM "$agent_pid" 2>/dev/null
  sleep 15
  kill -KILL "$agent_pid" 2>/dev/null ) &
watchdog_pid=$!

status=0
wait "$agent_pid" || status=$?
kill "$watchdog_pid" 2>/dev/null || true
wait "$watchdog_pid" 2>/dev/null || true
exit "$status"
