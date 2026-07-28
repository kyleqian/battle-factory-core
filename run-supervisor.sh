#!/usr/bin/env bash
# Supervised work session for THIS run: a long-lived supervisor plans one
# increment at a time, delegates it to a capped disposable worker, verifies
# the result, and continues, fixes, or defers — per SUPERVISOR.md. The
# default remains the original Claude flow (claude-fable-5 supervisor,
# claude-sonnet-5 workers). Pass --provider codex for the Codex profile
# (gpt-5.6-sol/high supervisor; Codex-only worker routing defaults to
# gpt-5.6-sol/medium and may choose Terra/high for bounded probes or Sol/high
# for architecture-heavy/repair work). Pass --max-mode for the all-Sol
# profile: a Sol/ultra supervisor with Sol/xhigh workers.
#
# By default the supervisor runs in the interactive CLI, autonomously through
# the full session cap. The terminal remains available for optional user
# steering, but the supervisor does not stop to solicit mid-session decisions.
# A watchdog still hard-caps the session (default 6h) as the safety net —
# SUPERVISOR.md tells it to wind down cleanly before the deadline.
# Interactive Claude sessions start with Remote Control on, so you can follow
# and steer them from claude.ai/code or the Claude mobile app. Codex sessions
# use the Codex interactive CLI; --headless mode has no remote bridge.
# --headless runs it unattended like run-agent.sh.
#
# Usage:
#   ./run-supervisor.sh               # interactive supervisor, 6h hard cap
#   ./run-supervisor.sh -c 4          # different cap          (--cap-hours 4)
#   ./run-supervisor.sh --headless    # unattended, stream view like run-agent.sh
#   ./run-supervisor.sh --provider codex  # Sol/high supervisor + tiered Codex workers
#   ./run-supervisor.sh --max-mode    # Sol/ultra supervisor + Sol/xhigh workers
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
  -l, --lane NAME       main (default) or animation. The animation lane runs
                        the separate animation-program supervisor inside the
                        persistent .worktrees/animation-main worktree on
                        branch animation-main (per ANIMATION_SUPERVISOR.md);
                        both supervisors may run concurrently.
  -p, --provider NAME   claude (default) or codex
  -M, --max-mode        Codex all-Sol profile: Sol/ultra supervisor and
                        Sol/xhigh workers (also selects --provider codex)
  -m, --model NAME      supervisor model (provider default)
  -e, --effort EFFORT   Codex reasoning effort (default high)
      --log FILE        raw JSONL log for --headless (provider default)
      --print-config    print the resolved profile without launching
  -h, --help            show this help
Environment overrides: SUPERVISOR_PROVIDER, SUPERVISOR_MODEL,
SUPERVISOR_REASONING_EFFORT, SUPERVISOR_MAX_MODE. Legacy MODEL remains
supported.
Exit 6 means the lane's deferred file (DEFERRED.md for main,
ANIMATION_DEFERRED.md for animation) has an unresolved question that must be
resolved before another supervisor session can start in that lane.
EOF
}

HEADLESS="${HEADLESS:-0}"
CAP_HOURS="${CAP_HOURS:-6}"
LANE="${SUPERVISOR_LANE:-main}"
PROVIDER="${SUPERVISOR_PROVIDER:-claude}"
MODEL="${SUPERVISOR_MODEL:-${MODEL:-}}"
REASONING_EFFORT="${SUPERVISOR_REASONING_EFFORT:-}"
MAX_MODE="${SUPERVISOR_MAX_MODE:-0}"
SUPERVISOR_LOG="${SUPERVISOR_LOG:-}"
PRINT_CONFIG=0
PROVIDER_FLAG_SET=0
MODEL_FLAG_SET=0
EFFORT_FLAG_SET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --headless)       HEADLESS=1; shift ;;
    -c|--cap-hours)   CAP_HOURS="${2:?--cap-hours needs a number}"; shift 2 ;;
    --cap-hours=*)    CAP_HOURS="${1#*=}"; shift ;;
    -l|--lane)        LANE="${2:?--lane needs main or animation}"; shift 2 ;;
    --lane=*)         LANE="${1#*=}"; shift ;;
    -p|--provider)    PROVIDER="${2:?--provider needs a name}"; PROVIDER_FLAG_SET=1; shift 2 ;;
    --provider=*)     PROVIDER="${1#*=}"; PROVIDER_FLAG_SET=1; shift ;;
    -M|--max-mode)    MAX_MODE=1; shift ;;
    -m|--model)       MODEL="${2:?--model needs a model name}"; MODEL_FLAG_SET=1; shift 2 ;;
    --model=*)        MODEL="${1#*=}"; MODEL_FLAG_SET=1; shift ;;
    -e|--effort)      REASONING_EFFORT="${2:?--effort needs a value}"; EFFORT_FLAG_SET=1; shift 2 ;;
    --effort=*)       REASONING_EFFORT="${1#*=}"; EFFORT_FLAG_SET=1; shift ;;
    --log)            SUPERVISOR_LOG="${2:?--log needs a path}"; shift 2 ;;
    --log=*)          SUPERVISOR_LOG="${1#*=}"; shift ;;
    --print-config)   PRINT_CONFIG=1; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) echo "run-supervisor: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
done

if [[ ! "$MAX_MODE" =~ ^(0|1)$ ]]; then
  echo "run-supervisor: SUPERVISOR_MAX_MODE must be 0 or 1 (got '$MAX_MODE')" >&2
  exit 2
fi
if [[ "$MAX_MODE" == "1" ]]; then
  if [[ "$PROVIDER_FLAG_SET" == "1" && "$PROVIDER" != "codex" ]]; then
    echo "run-supervisor: --max-mode is a Codex-only profile and cannot use provider '$PROVIDER'" >&2
    exit 2
  fi
  if [[ "$MODEL_FLAG_SET" == "1" && "$MODEL" != "gpt-5.6-sol" ]]; then
    echo "run-supervisor: --max-mode fixes the supervisor model at gpt-5.6-sol (got '$MODEL')" >&2
    exit 2
  fi
  if [[ "$EFFORT_FLAG_SET" == "1" && "$REASONING_EFFORT" != "ultra" ]]; then
    echo "run-supervisor: --max-mode fixes supervisor effort at ultra (got '$REASONING_EFFORT')" >&2
    exit 2
  fi
  PROVIDER=codex
  MODEL=gpt-5.6-sol
  REASONING_EFFORT=ultra
fi

if [[ ! "$CAP_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "run-supervisor: --cap-hours must be a positive number (got '$CAP_HOURS')" >&2
  exit 2
fi
if [[ ! "$PROVIDER" =~ ^(claude|codex)$ ]]; then
  echo "run-supervisor: unsupported provider '$PROVIDER' (expected claude or codex)" >&2
  exit 2
fi
if [[ ! "$LANE" =~ ^(main|animation)$ ]]; then
  echo "run-supervisor: unsupported lane '$LANE' (expected main or animation)" >&2
  exit 2
fi

# The animation supervisor lives in a persistent worktree on its own branch
# (single-writer: only that session commits to animation-main; only the main
# tree can commit to master). Bootstrap it if missing, then run from it —
# everything after this cd (tools, docs, worker launches) self-scopes there.
if [[ "$LANE" == "animation" && "$PRINT_CONFIG" != "1" \
      && "$(git rev-parse --abbrev-ref HEAD)" != "animation-main" ]]; then
  ANIM_WT="$(pwd)/.worktrees/animation-main"
  if [[ ! -d "$ANIM_WT" ]]; then
    if git show-ref --verify --quiet refs/heads/animation-main; then
      git worktree add "$ANIM_WT" animation-main >/dev/null
    else
      git worktree add -b animation-main "$ANIM_WT" master >/dev/null
    fi
    echo "animation worktree created at $ANIM_WT (branch animation-main)"
  fi
  [[ -e "$ANIM_WT/reference" ]] || ln -s "$(pwd)/reference" "$ANIM_WT/reference"
  cd "$ANIM_WT"
  if [[ ! -d node_modules ]]; then
    echo "animation worktree: installing deps (one-time npm install) ..."
    npm install --no-audit --no-fund >/tmp/emerald-factory-animation-main-setup.log 2>&1 \
      || { echo "run-supervisor: npm install failed; see /tmp/emerald-factory-animation-main-setup.log" >&2; exit 1; }
  fi
fi

DEFERRED_FILE="DEFERRED.md"
[[ "$LANE" == "animation" ]] && DEFERRED_FILE="ANIMATION_DEFERRED.md"
if [[ "$PRINT_CONFIG" != "1" && -f "$DEFERRED_FILE" ]] \
    && grep -qE '^## D[0-9]+ .*OPEN:' "$DEFERRED_FILE"; then
  echo "run-supervisor: refusing to start — $DEFERRED_FILE has unresolved user-level decisions:" >&2
  grep -E '^## D[0-9]+ .*OPEN:' "$DEFERRED_FILE" >&2
  echo "Resolve and remove those entries before launching another long supervisor session." >&2
  exit 6
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
    if [[ "$MAX_MODE" == "1" ]]; then
      if [[ "$MODEL" != "gpt-5.6-sol" || "$REASONING_EFFORT" != "ultra" ]]; then
        echo "run-supervisor: invalid max-mode profile (expected gpt-5.6-sol/ultra)" >&2
        exit 2
      fi
    else
      if [[ ! "$REASONING_EFFORT" =~ ^(none|low|medium|high|xhigh)$ ]]; then
        echo "run-supervisor: unsupported reasoning effort '$REASONING_EFFORT' (maximum outside --max-mode: xhigh)" >&2
        exit 2
      fi
      if [[ "$MODEL" == *sol* && "$REASONING_EFFORT" == "xhigh" ]]; then
        echo "run-supervisor: Sol reasoning effort is capped at high outside --max-mode (got '$REASONING_EFFORT')" >&2
        exit 2
      fi
    fi
    command -v codex >/dev/null 2>&1 || { echo "run-supervisor: codex CLI not found on PATH" >&2; exit 127; }
    ;;
esac

CODEX_LOG_ROOT="${POKEBENCH_CODEX_LOG_DIR:-${POKEBENCH_AGENT_LOG_DIR:-$(pwd)/.codex-logs}}"
if [[ -z "$SUPERVISOR_LOG" ]]; then
  if [[ "$PROVIDER" == "codex" ]]; then
    SUPERVISOR_LOG="$CODEX_LOG_ROOT/supervisor/headless-$(date +%Y%m%d-%H%M%S)-$$.jsonl"
  elif [[ "$LANE" == "animation" ]]; then
    SUPERVISOR_LOG="/tmp/emerald-factory-animation-supervisor.jsonl"
  else
    SUPERVISOR_LOG="/tmp/emerald-factory-supervisor.jsonl"
  fi
fi

source tools/codex-git-attribution.sh
if [[ "$PROVIDER" != "codex" ]]; then
  codex_git_attribution_disable
fi

# Workers inherit the selected provider unless WORKER_PROVIDER explicitly
# requests a mixed-provider setup. Max mode is intentionally stricter: its
# inherited marker makes the worker launcher reject non-Sol models, and these
# defaults give every worker the xhigh ceiling requested by the profile.
export POKEBENCH_WORKER_PROVIDER="$PROVIDER"
export POKEBENCH_CODEX_MAX_MODE="$MAX_MODE"
if [[ "$MAX_MODE" == "1" ]]; then
  export WORKER_PROVIDER=codex
  export WORKER_MODEL=gpt-5.6-sol
  export WORKER_REASONING_EFFORT=xhigh
fi
if [[ "$PRINT_CONFIG" == "1" ]]; then
  echo "supervisor_lane=$LANE"
  echo "supervisor_provider=$PROVIDER"
  echo "supervisor_model=$MODEL"
  echo "supervisor_effort=${REASONING_EFFORT:-n/a}"
  echo "max_mode=$MAX_MODE"
  echo "worker_provider=${WORKER_PROVIDER:-$POKEBENCH_WORKER_PROVIDER}"
  if [[ "$MAX_MODE" == "1" ]]; then
    echo "worker_model=$WORKER_MODEL"
    echo "worker_effort=$WORKER_REASONING_EFFORT"
  fi
  exit 0
fi

if [[ "$PROVIDER" == "codex" ]]; then
  # Git subprocesses created by this supervisor automatically record Codex and
  # the resolved model in their commit trailers.
  codex_git_attribution_enable "$(pwd)" "$MODEL" "$REASONING_EFFORT"
fi

source tools/resolve-harness-root.sh
HARNESS_ROOT="$(pokebench_resolve_harness_root)"
export POKEBENCH_HARNESS_ROOT="$HARNESS_ROOT"
source tools/oracle-profiles.sh
MAIN_ORACLE_URL="${POKEBENCH_MAIN_ORACLE_URL:-http://127.0.0.1:8014}"
ANIMATION_ORACLE_URL="${POKEBENCH_ANIMATION_ORACLE_URL:-http://127.0.0.1:8012}"
# Each supervisor lane ensures only the oracle profile it uses;
# ensure is validate-or-start, so concurrent supervisors sharing a service
# is safe. The animation supervisor never needs the OFF profile.
if [[ "$LANE" == "main" ]]; then
  pokebench_ensure_oracle_profile \
    "$HARNESS_ROOT" battle-scene-off "$MAIN_ORACLE_URL" \
    /tmp/emerald-factory-oracle-off.log
  echo "Main oracle (Battle Scene OFF) up at $MAIN_ORACLE_URL"
fi
pokebench_ensure_oracle_profile \
  "$HARNESS_ROOT" battle-scene-on "$ANIMATION_ORACLE_URL" \
  /tmp/emerald-factory-oracle-on.log
echo "Animation oracle (Battle Scene ON) up at $ANIMATION_ORACLE_URL"
export POKEBENCH_MAIN_ORACLE_URL="$MAIN_ORACLE_URL"
export POKEBENCH_ANIMATION_ORACLE_URL="$ANIMATION_ORACLE_URL"
if [[ "$LANE" == "animation" ]]; then
  # The animation supervisor's own bin/oracle/probe calls default to the ON
  # profile it verifies against.
  export POKEBENCH_ORACLE_URL="$ANIMATION_ORACLE_URL"
  export POKEBENCH_ORACLE_PROFILE=battle-scene-on
else
  # Direct bin/oracle/probe calls in the supervisor default to the main OFF
  # profile. Profile-aware compare traces still route legacy/ON traces to 8012.
  export POKEBENCH_ORACLE_URL="$MAIN_ORACLE_URL"
  export POKEBENCH_ORACLE_PROFILE=battle-scene-off
fi

CAP_SECONDS="$(awk "BEGIN { printf \"%d\", $CAP_HOURS * 3600 }")"
DEADLINE_EPOCH=$(( $(date +%s) + CAP_SECONDS ))
DEADLINE_HUMAN="$(date -r "$DEADLINE_EPOCH" '+%Y-%m-%d %H:%M' 2>/dev/null \
  || date -d "@$DEADLINE_EPOCH" '+%Y-%m-%d %H:%M')"

CONTINUITY_NOTE="Run autonomously through the full session cap while useful in-scope work remains. Do not ask the user questions mid-session, send decision notifications, or end a turn awaiting a reply. Exercise your best evidence-backed judgment for reversible on-scope choices. If a material choice genuinely cannot be made safely, record it in DEFERRED.md, continue independent safe work, and summarize it only at wind-down."

if [[ "$LANE" == "animation" ]]; then
  if [[ "$PROVIDER" == "codex" ]]; then
    if [[ "$MAX_MODE" == "1" ]]; then
      DELEGATION_NOTE="Codex max mode is active: use only gpt-5.6-sol workers. The launcher defaults them to xhigh and rejects Terra or any other worker model; do not override that all-Sol routing. Invoke each ./tools/run-subagent.sh call directly in its own execution-tool session without shell backgrounding, '&', or nohup. A yielded call is still running; retain its handle and wait on it."
    else
      DELEGATION_NOTE="For Codex workers, choose the worker tier by task: Terra/high only for bounded probes, extraction, or mechanical docs; Sol/medium for normal implementation; Sol/high for cross-layer architecture or the first evidence-driven repair after a failed worker. Invoke each ./tools/run-subagent.sh call directly in its own execution-tool session without shell backgrounding, '&', or nohup. A yielded call is still running; retain its handle and wait on it."
    fi
  else
    DELEGATION_NOTE="Launch ./tools/run-subagent.sh workers in the background."
  fi
  PROMPT="You are the ANIMATION supervisor for this run. Read ANIMATION_SUPERVISOR.md, AGENTS.md, and ANIMATION_PROGRESS.md before dispatching anything. You are in the persistent animation-main worktree and you are that branch's only writer: begin by merging master in (git merge --no-edit master), rerun npm test and npm run build as your baseline, then drive one bounded animation coverage step at a time via ./tools/run-subagent.sh --lane animation from this tree — one worker at a time, animation lane only, verify each result yourself, merge each verified worker branch into animation-main from this tree, and never write master or the main program's docs (PROGRESS.md/ISSUES.md/ROADMAP.md/DEFERRED.md). Your ledger is ANIMATION_PROGRESS.md; your deferral file is ANIMATION_DEFERRED.md. ${DELEGATION_NOTE} Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it with animation-main committed and green so the main supervisor's fold stays boring. ${CONTINUITY_NOTE}"
else
  if [[ "$PROVIDER" == "codex" ]]; then
    if [[ "$MAX_MODE" == "1" ]]; then
      DELEGATION_NOTE="Codex max mode is active: use only gpt-5.6-sol workers. The launcher defaults them to xhigh and rejects Terra or any other worker model; do not override that all-Sol routing. The launcher offers main and side-worktree lanes; use parallel lanes when their ownership is genuinely disjoint. The animation program belongs to the separate animation supervisor (ANIMATION_SUPERVISOR.md) — never brief or launch animation-lane workers from this session. Invoke each ./tools/run-subagent.sh call directly in its own execution-tool session without shell backgrounding, '&', or nohup. A yielded call is still running; retain its handle and launch another lane only when the briefs are independent."
    else
      DELEGATION_NOTE="For Codex workers, choose the worker tier by task: Terra/high only for bounded probes, extraction, or mechanical docs; Sol/medium for normal implementation; Sol/high for cross-layer architecture or the first evidence-driven repair after a failed worker. The launcher offers main and side-worktree lanes; use parallel lanes when their ownership is genuinely disjoint. The animation program belongs to the separate animation supervisor (ANIMATION_SUPERVISOR.md) — never brief or launch animation-lane workers from this session. Invoke each ./tools/run-subagent.sh call directly in its own execution-tool session without shell backgrounding, '&', or nohup. A yielded call is still running; retain its handle and launch another lane only when the briefs are independent."
    fi
  else
    DELEGATION_NOTE="Launch ./tools/run-subagent.sh workers in the background. The main and side-worktree lanes may run concurrently when their briefs and files are genuinely disjoint. The animation program belongs to the separate animation supervisor (ANIMATION_SUPERVISOR.md) — never brief or launch animation-lane workers from this session."
  fi
  PROMPT="You are the supervisor for this run. Read SUPERVISOR.md, AGENTS.md, and the authoritative reset at the top of ROADMAP S8 before dispatching anything. The old canonical Battle-2 turn march is stopped: drive the generic seven-battle round controller and presentation seam against the Battle Scene OFF oracle. During your orient step, if branch animation-main has commits master lacks (git log --oneline master..animation-main), fold it: merge animation-main into master from the main tree, rerun npm test and npm run build on the union, and record the fold in your PROGRESS.md entry. Delegate bounded steps via ./tools/run-subagent.sh, verify each result yourself, and continue, fix, or defer a genuinely unresolved decision without interrupting the session. ${DELEGATION_NOTE} Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it. ${CONTINUITY_NOTE}"
fi

if [[ "$HEADLESS" == "1" ]]; then
  mkdir -p "$(dirname "$SUPERVISOR_LOG")"
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
    POKEBENCH_ROLE=supervisor codex exec --json \
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
  if [[ "$PROVIDER" == "claude" ]]; then
    # Preserve warm-bison's original Claude Remote Control launch and shell
    # watchdog path exactly.
    RC_PREFIX="emerald-factory"
    [[ "$LANE" == "animation" ]] && RC_PREFIX="emerald-factory-anim"
    POKEBENCH_ROLE=supervisor claude --remote-control \
      --remote-control-session-name-prefix "$RC_PREFIX" \
      --model "$MODEL" --dangerously-skip-permissions "$PROMPT" &
  else
    TIMEOUT_MESSAGE="run-supervisor: ${CAP_HOURS}h cap reached — stopping supervisor"
    # Codex's Crossterm TUI must stay in the terminal's foreground process
    # group. The wrapper owns the deadline without backgrounding Codex.
    CODEX_SESSION_START_EPOCH="$(date +%s)"
    status=0
    POKEBENCH_ROLE=supervisor python3 tools/run-with-deadline.py \
      "$CAP_SECONDS" "$TIMEOUT_MESSAGE" -- \
      codex --model "$MODEL" \
        -c "model_reasoning_effort=\"$REASONING_EFFORT\"" \
        --dangerously-bypass-approvals-and-sandbox "$PROMPT" || status=$?
    python3 tools/archive-codex-sessions.py \
      --since "$CODEX_SESSION_START_EPOCH" --cwd "$(pwd)" \
      --dest "$CODEX_LOG_ROOT/supervisor" --originator codex-tui || true
    exit "$status"
  fi
fi
# Headless supervisors and interactive Claude retain the original lightweight
# shell watchdog. Interactive Codex exits through the foreground wrapper.
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
