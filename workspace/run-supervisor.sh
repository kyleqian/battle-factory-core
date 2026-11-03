#!/usr/bin/env bash
# Supervised work session for THIS run: a long-lived Claude supervisor plans
# one increment at a time, delegates it to a capped disposable Claude worker
# (tools/run-subagent.sh), verifies the result, and continues, fixes, or
# defers -- per SUPERVISOR.md. The default is Claude Opus 5.5 with Claude
# Sonnet 5.5 workers. Claude is the only supported provider: the Codex,
# DeepSeek/OpenCode, max-mode and animation/rust supervisor paths were removed
# in cln239 (docs/cln239-launchers.md).
#
# By default the supervisor runs in the interactive CLI, autonomously through
# the full session cap, with Remote Control on so you can follow and steer it
# from claude.ai/code or the Claude mobile app. A watchdog hard-caps the
# session (default 6h) as the safety net -- SUPERVISOR.md tells it to wind
# down cleanly before the deadline. --headless runs it unattended (the daily
# cron path) through tools/run-claude-supervisor.py.
#
# Usage:
#   ./run-supervisor.sh               # interactive supervisor, 6h hard cap
#   ./run-supervisor.sh -c 4          # different cap          (--cap-hours 4)
#   ./run-supervisor.sh --headless    # unattended, stream view
#   ./run-supervisor.sh --headless -S opus -s sonnet -c 10 --log FILE
#                                      # the daily cron invocation: Opus
#                                      # supervisor + Sonnet workers
#   ./run-supervisor.sh -m NAME       # override the supervisor model
#                                      # (full name or alias opus, sonnet,
#                                      # fable, haiku)
#   ./run-supervisor.sh --print-config
#   ./run-supervisor.sh -h            # help
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source tools/claude-model-policy.sh

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
  -l, --lane NAME       ts (default; "main" and "integration" are aliases).
                        The ts lane is the only supervisor lane: the main
                        supervisor follows ROADMAP.md in the shared tree.
  -S, --supervisor NAME claude (default, Opus 5.5) or a Claude model alias
                        (opus, sonnet, fable, haiku) that selects Claude and
                        that exact model in one step.
  -s, --sub-agent NAME  claude (default) or a Claude model alias (opus,
                        sonnet, fable, haiku). An alias fixes every worker's
                        model for the session (still overridable per step
                        with tools/run-subagent.sh -m).
  -m, --model NAME      supervisor model (default claude-opus-5-5): a full
                        Claude model name or an alias (opus, sonnet, fable,
                        haiku).
      --log FILE        raw JSONL log for --headless (runtime default)
      --print-config    print the resolved profile without launching
  -h, --help            show this help
Environment overrides: SUPERVISOR_AGENT, SUB_AGENT, SUPERVISOR_MODEL, WORKER_MODEL.
Legacy MODEL remains supported.
Claude is the only provider; codex, deepseek and opencode are rejected.
Exit 6 means DEFERRED.md has an unresolved question (a "## D<n> ... OPEN:"
heading) that must be resolved before another supervisor session can start.
Set POKEBENCH_UNATTENDED_DEFERRED_POLICY=continue for an unattended schedule
that preserves open questions while continuing only independent safe work.
EOF
}

HEADLESS="${HEADLESS:-0}"
CAP_HOURS="${CAP_HOURS:-6}"
LANE="${SUPERVISOR_LANE:-ts}"
PROVIDER="${SUPERVISOR_AGENT:-claude}"
MODEL="${SUPERVISOR_MODEL:-${MODEL:-}}"
WORKER_PROVIDER="${SUB_AGENT:-}"
SUPERVISOR_LOG="${SUPERVISOR_LOG:-}"
PRINT_CONFIG=0
MODEL_FLAG_SET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --headless)       HEADLESS=1; shift ;;
    -c|--cap-hours)   CAP_HOURS="${2:?--cap-hours needs a number}"; shift 2 ;;
    --cap-hours=*)    CAP_HOURS="${1#*=}"; shift ;;
    -l|--lane)        LANE="${2:?--lane needs ts}"; shift 2 ;;
    --lane=*)         LANE="${1#*=}"; shift ;;
    -S|--supervisor)  PROVIDER="${2:?--supervisor needs a name}"; shift 2 ;;
    --supervisor=*)   PROVIDER="${1#*=}"; shift ;;
    -s|--sub-agent)   WORKER_PROVIDER="${2:?--sub-agent needs a name}"; shift 2 ;;
    --sub-agent=*)    WORKER_PROVIDER="${1#*=}"; shift ;;
    -m|--model)       MODEL="${2:?--model needs a model name}"; MODEL_FLAG_SET=1; shift 2 ;;
    --model=*)        MODEL="${1#*=}"; MODEL_FLAG_SET=1; shift ;;
    --log)            SUPERVISOR_LOG="${2:?--log needs a path}"; shift 2 ;;
    --log=*)          SUPERVISOR_LOG="${1#*=}"; shift ;;
    --print-config)   PRINT_CONFIG=1; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) echo "run-supervisor: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
done

# Provider names are matched case-insensitively (`-S Claude`).
PROVIDER="$(printf '%s' "$PROVIDER" | tr '[:upper:]' '[:lower:]')"
if [[ -n "$WORKER_PROVIDER" ]]; then
  WORKER_PROVIDER="$(printf '%s' "$WORKER_PROVIDER" | tr '[:upper:]' '[:lower:]')"
fi

# Claude model aliases (opus/sonnet/fable/haiku) select Claude and that exact
# model together, wherever a provider name is accepted: -S/--supervisor picks
# the supervisor's model, -s/--sub-agent fixes every worker's default model
# for the session. A bare `-m`/`--model` alias does the same for the
# supervisor. An explicit --model that disagrees with a --supervisor alias is
# a conflict, not a silent override.
if SUPERVISOR_ALIAS_MODEL="$(pokebench_claude_model_alias "$PROVIDER")"; then
  if [[ "$MODEL_FLAG_SET" == "1" && "$MODEL" != "$SUPERVISOR_ALIAS_MODEL" ]]; then
    echo "run-supervisor: --supervisor '$PROVIDER' already selects model '$SUPERVISOR_ALIAS_MODEL'; --model '$MODEL' conflicts with it" >&2
    exit 2
  fi
  PROVIDER=claude
  MODEL="$SUPERVISOR_ALIAS_MODEL"
elif [[ "$MODEL_FLAG_SET" == "1" ]]; then
  MODEL_LOWER="$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]')"
  if MODEL_ALIAS_RESOLVED="$(pokebench_claude_model_alias "$MODEL_LOWER")"; then
    MODEL="$MODEL_ALIAS_RESOLVED"
  fi
fi
if [[ -n "$WORKER_PROVIDER" ]] && WORKER_ALIAS_MODEL="$(pokebench_claude_model_alias "$WORKER_PROVIDER")"; then
  WORKER_PROVIDER=claude
  WORKER_MODEL="$WORKER_ALIAS_MODEL"
fi
WORKER_PROVIDER="${WORKER_PROVIDER:-$PROVIDER}"

if [[ ! "$CAP_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "run-supervisor: --cap-hours must be a positive number (got '$CAP_HOURS')" >&2
  exit 2
fi
if [[ "$PROVIDER" != "claude" ]]; then
  echo "run-supervisor: unsupported supervisor '$PROVIDER' (Claude only: claude, opus, sonnet, fable or haiku; the Codex, DeepSeek and OpenCode paths were removed in cln239)" >&2
  exit 2
fi
if [[ "$WORKER_PROVIDER" != "claude" ]]; then
  echo "run-supervisor: unsupported sub-agent '$WORKER_PROVIDER' (Claude only: claude, opus, sonnet, fable or haiku; the Codex, DeepSeek and OpenCode paths were removed in cln239)" >&2
  exit 2
fi
# "main" and "integration" survive as aliases for the one supervisor lane.
[[ "$LANE" == "main" || "$LANE" == "integration" ]] && LANE="ts"
if [[ "$LANE" != "ts" ]]; then
  echo "run-supervisor: unsupported lane '$LANE' (the only supervisor lane is ts; the animation and rust supervisors were removed in cln239)" >&2
  exit 2
fi

if [[ "$PRINT_CONFIG" != "1" && "$(git rev-parse --abbrev-ref HEAD)" != "master" ]]; then
  echo "run-supervisor: main must run from the primary local master checkout" >&2
  exit 2
fi

DEFERRED_FILE="DEFERRED.md"
DEFERRED_POLICY="${POKEBENCH_UNATTENDED_DEFERRED_POLICY:-block}"
if [[ ! "$DEFERRED_POLICY" =~ ^(block|continue)$ ]]; then
  echo "run-supervisor: POKEBENCH_UNATTENDED_DEFERRED_POLICY must be block or continue (got '$DEFERRED_POLICY')" >&2
  exit 2
fi
OPEN_DEFERRED=0
if [[ -f "$DEFERRED_FILE" ]] && grep -qE '^## D[0-9]+ .*OPEN:' "$DEFERRED_FILE"; then
  OPEN_DEFERRED=1
fi
if [[ "$PRINT_CONFIG" != "1" && "$OPEN_DEFERRED" == "1" ]]; then
  if [[ "$DEFERRED_POLICY" == "block" ]]; then
    echo "run-supervisor: refusing to start — $DEFERRED_FILE has unresolved user-level decisions:" >&2
    grep -E '^## D[0-9]+ .*OPEN:' "$DEFERRED_FILE" >&2
    echo "Resolve and remove those entries before launching another long supervisor session." >&2
    exit 6
  fi
  echo "run-supervisor: $DEFERRED_FILE has unresolved decisions; continuing unrelated safe work under unattended policy"
  grep -E '^## D[0-9]+ .*OPEN:' "$DEFERRED_FILE"
fi

MODEL="${MODEL:-claude-opus-5-5}"
command -v claude >/dev/null 2>&1 || {
  echo "run-supervisor: claude CLI not found on PATH" >&2
  exit 127
}

# Claude Code normally carries `cd` changes across Bash tool calls. Supervisors
# deliberately enter disposable worker worktrees while verifying them, so make
# every later Bash call start from this supervisor's launch directory again.
export CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1
SUPERVISOR_SHELL_CWD_POLICY=project-root-reset

# Only set when a Claude model alias (-s opus, etc.) fixed it; otherwise
# tools/run-subagent.sh applies its own claude-sonnet-5-5 default per call.
if [[ -n "${WORKER_MODEL:-}" ]]; then
  export WORKER_MODEL
fi

# The default log directory keeps its historical name: the daily cron and
# existing tooling already write supervisor logs under .codex-logs/.
LOG_ROOT="${POKEBENCH_AGENT_LOG_DIR:-$(pwd)/.codex-logs}"
export POKEBENCH_AGENT_LOG_DIR="$LOG_ROOT"
if [[ -z "$SUPERVISOR_LOG" ]]; then
  SUPERVISOR_LOG="$LOG_ROOT/supervisor/claude-headless-$(date +%Y%m%d-%H%M%S)-$$.jsonl"
fi

if [[ "$PRINT_CONFIG" == "1" ]]; then
  echo "supervisor_lane=$LANE"
  if [[ "$HEADLESS" == "1" ]]; then
    echo "supervisor_mode=headless"
  else
    echo "supervisor_mode=interactive"
  fi
  echo "supervisor_guide=SUPERVISOR.md"
  echo "oracle_profile=battle-scene-off"
  echo "supervisor=$PROVIDER"
  echo "supervisor_model=$MODEL"
  echo "supervisor_shell_cwd=$SUPERVISOR_SHELL_CWD_POLICY"
  echo "sub_agent=$WORKER_PROVIDER"
  echo "worker_launch_mode=background"
  echo "worker_routing=fixed"
  echo "deferred_policy=$DEFERRED_POLICY"
  echo "worker_model=${WORKER_MODEL:-claude-sonnet-5-5}"
  echo "worker_effort=n/a"
  exit 0
fi

source tools/resolve-harness-root.sh
HARNESS_ROOT="$(pokebench_resolve_harness_root)"
export POKEBENCH_HARNESS_ROOT="$HARNESS_ROOT"
source tools/oracle-profiles.sh
MAIN_ORACLE_URL="${POKEBENCH_MAIN_ORACLE_URL:-http://127.0.0.1:8014}"
ANIMATION_ORACLE_URL="${POKEBENCH_ANIMATION_ORACLE_URL:-http://127.0.0.1:8012}"
# ensure is validate-or-start, so concurrent supervisors sharing a service is
# safe. The supervisor needs both profiles: OFF for its own probes and logical
# parity controls, ON for the integration lane's workers.
pokebench_ensure_oracle_profile \
  "$HARNESS_ROOT" battle-scene-off "$MAIN_ORACLE_URL" \
  /tmp/emerald-factory-oracle-off.log
echo "Main oracle (Battle Scene OFF) up at $MAIN_ORACLE_URL"
pokebench_ensure_oracle_profile \
  "$HARNESS_ROOT" battle-scene-on "$ANIMATION_ORACLE_URL" \
  /tmp/emerald-factory-oracle-on.log
echo "Animation oracle (Battle Scene ON) up at $ANIMATION_ORACLE_URL"
export POKEBENCH_MAIN_ORACLE_URL="$MAIN_ORACLE_URL"
export POKEBENCH_ANIMATION_ORACLE_URL="$ANIMATION_ORACLE_URL"
# Direct bin/oracle/probe calls in the supervisor default to the main OFF
# profile. Profile-aware compare traces still route legacy/ON traces to 8012.
export POKEBENCH_ORACLE_URL="$MAIN_ORACLE_URL"
export POKEBENCH_ORACLE_PROFILE=battle-scene-off

CAP_SECONDS="$(awk "BEGIN { printf \"%d\", $CAP_HOURS * 3600 }")"
DEADLINE_EPOCH=$(( $(date +%s) + CAP_SECONDS ))
DEADLINE_HUMAN="$(date -r "$DEADLINE_EPOCH" '+%Y-%m-%d %H:%M' 2>/dev/null \
  || date -d "@$DEADLINE_EPOCH" '+%Y-%m-%d %H:%M')"

CONTINUITY_NOTE="Run autonomously through the full session cap while useful in-scope work remains. Do not ask the user questions mid-session, send decision notifications, or end a turn awaiting a reply. Exercise your best evidence-backed judgment for reversible on-scope choices. If a material choice genuinely cannot be made safely, record it in ${DEFERRED_FILE}, continue independent safe work, and summarize it only at wind-down."
if [[ "$OPEN_DEFERRED" == "1" && "$DEFERRED_POLICY" == "continue" ]]; then
  CONTINUITY_NOTE+=" ${DEFERRED_FILE} already contains at least one open user-level decision. Do not guess at, remove, or silently resolve an open entry. Work around it on independent reversible steps; if it blocks every remaining safe step, leave a clean checkpoint and wind down normally."
fi

WORKER_ROUTING_NOTE="Workers are Claude on the ${WORKER_MODEL:-claude-sonnet-5-5} profile unless a step explicitly overrides the worker model with run-subagent.sh -m (accepts a full model name or the aliases opus/sonnet/fable/haiku)."
WORKER_LAUNCH_NOTE="Start each ./tools/run-subagent.sh launcher as a background shell job because the Claude supervisor's shell call can time out before a worker finishes; retain its PID and output path, poll until that launcher exits, and do not treat the initial shell return as worker completion."
DELEGATION_NOTE="${WORKER_ROUTING_NOTE} ${WORKER_LAUNCH_NOTE} Choose a worker lane (ts, side or integration) from the ownership contract and active roadmap stage. Integration workers use --lane integration for temporary worktree isolation and Battle Scene ON validation; this is an internal worker contract, not a separate supervisor program."
PROMPT="You are the main supervisor for this repo, running on master in the assigned host checkout. Read SUPERVISOR.md, AGENTS.md, LOCAL_SETUP.md, the latest PROGRESS.md, and ROADMAP.md's current execution priority before dispatching. Let the current roadmap stage determine the work, its linked detailed guide, progress records, and acceptance criteria; do not substitute a historical hardcoded mission. Reuse valid unchanged production receipts under the stage's verification policy. Delegate bounded steps via ./tools/run-subagent.sh, independently verify the central claims, fold only green changes into master, and continue useful in-scope work. Follow the roadmap's current authorization for source-proven gameplay/RNG corrections; presentation-only work must preserve logical outcomes, and all scene modes must share the same corrected rules. Preserve logs/evidence before removing temporary worker worktrees. Use the active host assignment and resource limits in AGENTS.md and LOCAL_SETUP.md; a CAX31 assignment requires docs/cax31-session-handoff.md. Keep one main writer and do not launch a duplicate campaign on another host. Your main handoff is PROGRESS.md; retain stage-specific evidence and progress where the roadmap directs. Material user decisions go in DEFERRED.md. ${DELEGATION_NOTE} Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it with master committed and green. ${CONTINUITY_NOTE}"

if [[ "$HEADLESS" == "1" ]]; then
  mkdir -p "$(dirname "$SUPERVISOR_LOG")"
  echo "Headless supervisor on $MODEL, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
  echo "Streaming to the terminal; raw JSONL in $SUPERVISOR_LOG (tail -f to follow)"
  # Claude -p exits when a turn ends, even if workers still run. Keep the
  # campaign deadline outside that turn and resume the same conversation
  # after worker completion instead of depending on background notifications.
  SUPERVISOR_LANE_DIR="/tmp/pokebench-worker-lanes-$(pwd | shasum | cut -c1-12)"
  status=0
  POKEBENCH_ROLE=supervisor python3 tools/run-claude-supervisor.py \
    --deadline "$DEADLINE_EPOCH" --model "$MODEL" --log "$SUPERVISOR_LOG" \
    --lane-dir "$SUPERVISOR_LANE_DIR" --prompt "$PROMPT" \
    > >(node tools/stream-pretty.mjs) || status=$?
  exit "$status"
fi

echo "Interactive supervisor on $MODEL, hard cap ${CAP_HOURS}h (deadline $DEADLINE_HUMAN)."
POKEBENCH_ROLE=supervisor claude --remote-control \
  --remote-control-session-name-prefix "emerald-factory" \
  --model "$MODEL" --dangerously-skip-permissions "$PROMPT" &
# Interactive Claude keeps the lightweight shell watchdog (headless uses the
# foreground controller above).
agent_pid=$!
( sleeper_pid=""
  trap '[[ -z "$sleeper_pid" ]] || kill "$sleeper_pid" 2>/dev/null; exit 0' TERM INT
  sleep "$CAP_SECONDS" &
  sleeper_pid=$!
  wait "$sleeper_pid" || exit $?
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
