#!/usr/bin/env bash
# Supervised work session for THIS run: a long-lived supervisor plans one
# increment at a time, delegates it to a capped disposable worker, verifies
# the result, and continues, fixes, or escalates — per SUPERVISOR.md. The
# default remains the original Claude flow (claude-fable-5 supervisor,
# claude-sonnet-5 workers). Pass --provider codex for the Codex profile
# (gpt-5.6-sol/high supervisor, gpt-5.6-terra/medium workers).
#
# By default the supervisor runs in the interactive CLI: it works mostly
# autonomously, but when it needs a decision it asks in the
# terminal. A watchdog still hard-caps the session (default 6h) as the safety
# net — SUPERVISOR.md tells it to wind down cleanly before the deadline.
# Interactive Claude sessions start with Remote Control on, so you can follow
# and steer them from claude.ai/code or the Claude mobile app. Codex sessions
# use the Codex interactive CLI; --headless mode has no remote bridge.
# --headless runs it unattended like run-agent.sh.
#
# Usage:
#   ./run-supervisor.sh               # interactive supervisor, 6h hard cap
#   ./run-supervisor.sh -c 4          # different cap          (--cap-hours 4)
#   ./run-supervisor.sh --headless    # unattended, stream view like run-agent.sh
#   ./run-supervisor.sh --provider codex  # Sol/high supervisor + Terra/medium workers
#   ./run-supervisor.sh -m NAME       # override the selected profile's model
#   ./run-supervisor.sh -e EFFORT     # Codex reasoning effort override
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
  -p, --provider NAME   claude (default) or codex
  -m, --model NAME      supervisor model (provider default)
  -e, --effort EFFORT   Codex reasoning effort (default high)
      --log FILE        raw JSONL log for --headless (default /tmp/emerald-factory-supervisor.jsonl)
      --print-config    print the resolved profile without launching
  -h, --help            show this help
Environment overrides: SUPERVISOR_PROVIDER, SUPERVISOR_MODEL,
SUPERVISOR_REASONING_EFFORT. Legacy MODEL remains supported.
EOF
}

HEADLESS="${HEADLESS:-0}"
CAP_HOURS="${CAP_HOURS:-6}"
PROVIDER="${SUPERVISOR_PROVIDER:-claude}"
MODEL="${SUPERVISOR_MODEL:-${MODEL:-}}"
REASONING_EFFORT="${SUPERVISOR_REASONING_EFFORT:-}"
SUPERVISOR_LOG="${SUPERVISOR_LOG:-/tmp/emerald-factory-supervisor.jsonl}"
PRINT_CONFIG=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --headless)       HEADLESS=1; shift ;;
    -c|--cap-hours)   CAP_HOURS="${2:?--cap-hours needs a number}"; shift 2 ;;
    --cap-hours=*)    CAP_HOURS="${1#*=}"; shift ;;
    -p|--provider)    PROVIDER="${2:?--provider needs a name}"; shift 2 ;;
    --provider=*)     PROVIDER="${1#*=}"; shift ;;
    -m|--model)       MODEL="${2:?--model needs a model name}"; shift 2 ;;
    --model=*)        MODEL="${1#*=}"; shift ;;
    -e|--effort)      REASONING_EFFORT="${2:?--effort needs a value}"; shift 2 ;;
    --effort=*)       REASONING_EFFORT="${1#*=}"; shift ;;
    --log)            SUPERVISOR_LOG="${2:?--log needs a path}"; shift 2 ;;
    --log=*)          SUPERVISOR_LOG="${1#*=}"; shift ;;
    --print-config)   PRINT_CONFIG=1; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) echo "run-supervisor: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
done

if [[ ! "$CAP_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "run-supervisor: --cap-hours must be a positive number (got '$CAP_HOURS')" >&2
  exit 2
fi
if [[ ! "$PROVIDER" =~ ^(claude|codex)$ ]]; then
  echo "run-supervisor: unsupported provider '$PROVIDER' (expected claude or codex)" >&2
  exit 2
fi
case "$PROVIDER" in
  claude)
    MODEL="${MODEL:-claude-fable-5}"
    if [[ -n "$REASONING_EFFORT" ]]; then
      echo "run-supervisor: --effort applies only to the codex provider" >&2
      exit 2
    fi
    command -v claude >/dev/null 2>&1 || { echo "run-supervisor: claude CLI not found on PATH" >&2; exit 127; }
    ;;
  codex)
    MODEL="${MODEL:-gpt-5.6-sol}"
    REASONING_EFFORT="${REASONING_EFFORT:-high}"
    if [[ ! "$REASONING_EFFORT" =~ ^(none|low|medium|high|xhigh|max|ultra)$ ]]; then
      echo "run-supervisor: unsupported reasoning effort '$REASONING_EFFORT'" >&2
      exit 2
    fi
    command -v codex >/dev/null 2>&1 || { echo "run-supervisor: codex CLI not found on PATH" >&2; exit 127; }
    ;;
esac

# Workers inherit the selected provider unless WORKER_PROVIDER explicitly
# requests a mixed-provider setup.
export POKEBENCH_WORKER_PROVIDER="$PROVIDER"
if [[ "$PRINT_CONFIG" == "1" ]]; then
  echo "supervisor_provider=$PROVIDER"
  echo "supervisor_model=$MODEL"
  echo "supervisor_effort=${REASONING_EFFORT:-n/a}"
  echo "worker_provider=${WORKER_PROVIDER:-$POKEBENCH_WORKER_PROVIDER}"
  exit 0
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

if [[ "$HEADLESS" == "1" && "$PROVIDER" == "claude" ]]; then
  MODE_NOTE="This session is HEADLESS: nobody can answer mid-run — escalation means notify, record the question in PROGRESS.md, and wind down."
elif [[ "$HEADLESS" == "1" ]]; then
  MODE_NOTE="This session is HEADLESS: nobody can answer mid-run — escalation means record the question in PROGRESS.md and wind down."
elif [[ "$PROVIDER" == "claude" ]]; then
  MODE_NOTE="This session is INTERACTIVE: when you escalate, ask in this terminal and end your turn; the user will answer when they see the notification."
else
  MODE_NOTE="This session is INTERACTIVE: before escalating, leave the tree resumable and record the question in PROGRESS.md; then ask in this terminal."
fi

PROMPT="You are the supervisor for this run. Read SUPERVISOR.md and follow it exactly: plan one increment at a time, delegate it to a worker via ./tools/run-subagent.sh (launched in the background — foreground Bash times out long before a worker finishes), verify each result yourself, and continue, fix, or escalate. Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it. ${MODE_NOTE}"

if [[ "$HEADLESS" == "1" ]]; then
  if [[ "$PROVIDER" == "claude" ]]; then
    echo "Headless supervisor on $MODEL, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
  else
    echo "Headless supervisor on $MODEL/$REASONING_EFFORT, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
  fi
  echo "Streaming to the terminal; raw JSONL in $SUPERVISOR_LOG (tail -f to follow)"
  if [[ "$PROVIDER" == "claude" ]]; then
    POKEBENCH_ROLE=supervisor claude -p --verbose --output-format stream-json \
      --model "$MODEL" \
      --dangerously-skip-permissions "$PROMPT" \
      > >(tee -a "$SUPERVISOR_LOG" | node tools/stream-pretty.mjs) &
  else
    POKEBENCH_ROLE=supervisor codex exec --ephemeral --json \
      --model "$MODEL" \
      -c "model_reasoning_effort=\"$REASONING_EFFORT\"" \
      --dangerously-bypass-approvals-and-sandbox "$PROMPT" \
      > >(tee -a "$SUPERVISOR_LOG" | node tools/codex-stream-pretty.mjs) &
  fi
else
  if [[ "$PROVIDER" == "claude" ]]; then
    echo "Interactive supervisor on $MODEL, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
  else
    echo "Interactive supervisor on $MODEL/$REASONING_EFFORT, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
  fi
  # Scripts run without job control, so this '&' child stays in our process
  # group and can still own the terminal for its TUI — backgrounding it only
  # serves to hold its pid for the watchdog (exec would lose the cap).
  if [[ "$PROVIDER" == "claude" ]]; then
    POKEBENCH_ROLE=supervisor claude --remote-control \
      --remote-control-session-name-prefix emerald-factory \
      --model "$MODEL" --dangerously-skip-permissions "$PROMPT" &
  else
    POKEBENCH_ROLE=supervisor codex \
      --model "$MODEL" \
      -c "model_reasoning_effort=\"$REASONING_EFFORT\"" \
      --dangerously-bypass-approvals-and-sandbox "$PROMPT" &
  fi
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
