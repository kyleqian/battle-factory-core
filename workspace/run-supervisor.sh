#!/usr/bin/env bash
# Supervised work session for THIS run: a long-lived supervisor plans one
# increment at a time, delegates it to a capped disposable worker, verifies
# the result, and continues, fixes, or defers — per SUPERVISOR.md. The
# default is Claude Opus 5.5 with Claude Sonnet 5.5 workers.
# Choose the two roles independently with
# -S/--supervisor and -s/--sub-agent. Supervisors may be Claude or Codex;
# sub-agents may additionally be DeepSeek V4 Flash through OpenCode. If the
# sub-agent is omitted, it follows the supervisor. --max-mode remains the
# all-Sol profile: a Sol/ultra supervisor with Sol/xhigh workers.
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
#   ./run-supervisor.sh -S codex      # Sol 6.1/high + tiered Codex workers
#   ./run-supervisor.sh -S claude -s codex
#                                      # Opus supervisor + tiered Codex workers
#   ./run-supervisor.sh -S claude -s deepseek
#                                      # Opus supervisor + DeepSeek V4 Flash workers
#   ./run-supervisor.sh --max-mode    # Sol/ultra supervisor + Sol/xhigh workers
#   ./run-supervisor.sh -m NAME       # override the selected profile's model
#   ./run-supervisor.sh -S opus -s sonnet
#                                      # Opus supervisor + Sonnet workers, via
#                                      # the Claude model aliases (opus,
#                                      # sonnet, fable, haiku all work on
#                                      # either -S/-s or -m)
#   ./run-supervisor.sh -e EFFORT     # Codex reasoning effort override
#   ./run-supervisor.sh -h            # help
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source tools/codex-model-policy.sh
source tools/deepseek-worker-policy.sh
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
  -l, --lane NAME       ts (default), animation, or rust ("main" is accepted
                        as a legacy alias for ts). The ts lane is the main
                        TypeScript program supervisor in the shared tree. The
                        animation and rust lanes run their separate program
                        supervisors (ANIMATION_SUPERVISOR.md /
                        RUST_SUPERVISOR.md) inside a persistent
                        .worktrees/<lane>-main worktree on the single-writer
                        branch <lane>-main. The main supervisor follows ROADMAP.md;
                        integration needs no separate supervisor lane. The old
                        "integration" spelling remains an alias for ts.
  -S, --supervisor NAME claude (default, Opus 5.5), codex, or a Claude model alias
                        (opus, sonnet, fable, haiku) that selects Claude and
                        that exact model in one step. DeepSeek cannot
                        supervise.
  -s, --sub-agent NAME claude, codex, deepseek, or a Claude model alias
                        (opus, sonnet, fable, haiku). Defaults to the
                        selected supervisor. DeepSeek means fixed V4 Flash
                        workers via OpenCode; Codex workers may be routed per
                        step with run-subagent.sh --model/--effort; a Claude
                        alias fixes every worker's model for the session
                        (still overridable per step with run-subagent.sh -m).
  -M, --max-mode        Codex all-Sol profile: Sol/ultra supervisor and
                        Sol/xhigh workers (selects Codex for both roles)
  -m, --model NAME      supervisor model (selected agent's default). Also
                        accepts a Claude model alias (opus, sonnet, fable,
                        haiku), which additionally selects Claude as the
                        supervisor.
  -e, --effort EFFORT   Codex supervisor reasoning effort
                        (ordinary Terra/Luna=max; ordinary Sol=high)
      --log FILE        raw JSONL log for --headless (runtime default)
      --print-config    print the resolved profile without launching
  -h, --help            show this help
Environment overrides: SUPERVISOR_AGENT, SUB_AGENT, SUPERVISOR_MODEL,
SUPERVISOR_REASONING_EFFORT, SUPERVISOR_MAX_MODE, OPENCODE_BIN. Legacy MODEL
remains supported.
Exit 6 means the lane's deferred file (DEFERRED.md for ts,
ANIMATION_DEFERRED.md for animation, RUST_DEFERRED.md for rust) has an
unresolved question that must be resolved before another supervisor session
can start in that lane. Set POKEBENCH_UNATTENDED_DEFERRED_POLICY=continue for
an unattended schedule that preserves open questions while continuing only
independent safe work.
EOF
}

HEADLESS="${HEADLESS:-0}"
CAP_HOURS="${CAP_HOURS:-6}"
LANE="${SUPERVISOR_LANE:-ts}"
PROVIDER="${SUPERVISOR_AGENT:-claude}"
MODEL="${SUPERVISOR_MODEL:-${MODEL:-}}"
REASONING_EFFORT="${SUPERVISOR_REASONING_EFFORT:-}"
MAX_MODE="${SUPERVISOR_MAX_MODE:-0}"
WORKER_PROVIDER="${SUB_AGENT:-}"
SUPERVISOR_LOG="${SUPERVISOR_LOG:-}"
PRINT_CONFIG=0
SUPERVISOR_SELECTION_SET=0
if [[ "${SUPERVISOR_AGENT+x}" == "x" ]]; then
  SUPERVISOR_SELECTION_SET=1
fi
MODEL_FLAG_SET=0
EFFORT_FLAG_SET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --headless)       HEADLESS=1; shift ;;
    -c|--cap-hours)   CAP_HOURS="${2:?--cap-hours needs a number}"; shift 2 ;;
    --cap-hours=*)    CAP_HOURS="${1#*=}"; shift ;;
    -l|--lane)        LANE="${2:?--lane needs ts, animation, or rust}"; shift 2 ;;
    --lane=*)         LANE="${1#*=}"; shift ;;
    -S|--supervisor)  PROVIDER="${2:?--supervisor needs a name}"; SUPERVISOR_SELECTION_SET=1; shift 2 ;;
    --supervisor=*)   PROVIDER="${1#*=}"; SUPERVISOR_SELECTION_SET=1; shift ;;
    -s|--sub-agent)   WORKER_PROVIDER="${2:?--sub-agent needs a name}"; shift 2 ;;
    --sub-agent=*)    WORKER_PROVIDER="${1#*=}"; shift ;;
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

# Agent names are proper nouns in the CLI documentation, but selection is
# intentionally case-insensitive for ergonomic `-S Claude -s DeepSeek` use.
PROVIDER="$(printf '%s' "$PROVIDER" | tr '[:upper:]' '[:lower:]')"
if [[ -n "$WORKER_PROVIDER" ]]; then
  WORKER_PROVIDER="$(printf '%s' "$WORKER_PROVIDER" | tr '[:upper:]' '[:lower:]')"
fi

# Claude model aliases (opus/sonnet/fable/haiku) select Claude and that exact
# model together, wherever a provider name is accepted: -S/--supervisor picks
# the supervisor's model, -s/--sub-agent fixes every worker's default model
# for the session. A bare `-m`/`--model` alias (no matching -S/-s alias) does
# the same for whichever role it targets. An explicit --model that disagrees
# with a --supervisor alias is a conflict, not a silent override.
if SUPERVISOR_ALIAS_MODEL="$(pokebench_claude_model_alias "$PROVIDER")"; then
  if [[ "$MODEL_FLAG_SET" == "1" && "$MODEL" != "$SUPERVISOR_ALIAS_MODEL" ]]; then
    echo "run-supervisor: --supervisor '$PROVIDER' already selects model '$SUPERVISOR_ALIAS_MODEL'; --model '$MODEL' conflicts with it" >&2
    exit 2
  fi
  PROVIDER=claude
  MODEL="$SUPERVISOR_ALIAS_MODEL"
  MODEL_FLAG_SET=1
elif [[ "$MODEL_FLAG_SET" == "1" ]]; then
  MODEL_LOWER="$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]')"
  if MODEL_ALIAS_RESOLVED="$(pokebench_claude_model_alias "$MODEL_LOWER")"; then
    if [[ "$SUPERVISOR_SELECTION_SET" == "1" && "$PROVIDER" != "claude" ]]; then
      echo "run-supervisor: --model '$MODEL' is a Claude model alias but --supervisor selected '$PROVIDER'" >&2
      exit 2
    fi
    PROVIDER=claude
    MODEL="$MODEL_ALIAS_RESOLVED"
  fi
fi
if [[ -n "$WORKER_PROVIDER" ]] && WORKER_ALIAS_MODEL="$(pokebench_claude_model_alias "$WORKER_PROVIDER")"; then
  WORKER_PROVIDER=claude
  WORKER_MODEL="$WORKER_ALIAS_MODEL"
fi

if [[ "$MAX_MODE" == "1" ]]; then
  if [[ "$SUPERVISOR_SELECTION_SET" == "1" && "$PROVIDER" != "codex" ]]; then
    echo "run-supervisor: --max-mode requires a Codex supervisor (got '$PROVIDER')" >&2
    exit 2
  fi
  if [[ "$MODEL_FLAG_SET" == "1" && "$MODEL" != "gpt-6.1-sol" ]]; then
    echo "run-supervisor: --max-mode fixes the supervisor model at gpt-6.1-sol (got '$MODEL')" >&2
    exit 2
  fi
  if [[ "$EFFORT_FLAG_SET" == "1" && "$REASONING_EFFORT" != "ultra" ]]; then
    echo "run-supervisor: --max-mode fixes supervisor effort at ultra (got '$REASONING_EFFORT')" >&2
    exit 2
  fi
  if [[ -n "$WORKER_PROVIDER" && "$WORKER_PROVIDER" != "codex" ]]; then
    echo "run-supervisor: --max-mode requires Codex sub-agents (got '$WORKER_PROVIDER')" >&2
    exit 2
  fi
  PROVIDER=codex
  WORKER_PROVIDER=codex
  MODEL=gpt-6.1-sol
  REASONING_EFFORT=ultra
fi
WORKER_PROVIDER="${WORKER_PROVIDER:-$PROVIDER}"

if [[ ! "$CAP_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "run-supervisor: --cap-hours must be a positive number (got '$CAP_HOURS')" >&2
  exit 2
fi
if [[ "$PROVIDER" == "deepseek" ]]; then
  echo "run-supervisor: DeepSeek is not supported as a supervisor (expected claude or codex)" >&2
  exit 2
fi
if [[ ! "$PROVIDER" =~ ^(claude|codex)$ ]]; then
  echo "run-supervisor: unsupported supervisor '$PROVIDER' (expected claude or codex)" >&2
  exit 2
fi
if [[ ! "$WORKER_PROVIDER" =~ ^(claude|codex|deepseek)$ ]]; then
  echo "run-supervisor: unsupported sub-agent '$WORKER_PROVIDER' (expected claude, codex, or deepseek)" >&2
  exit 2
fi
# "main" survives as a legacy alias from before the Rust lane existed, when
# the TypeScript program supervisor was the unqualified "main" lane.
# Integration is main-roadmap work; retain the previous flag as a compatibility alias.
[[ "$LANE" == "main" || "$LANE" == "integration" ]] && LANE="ts"
if [[ ! "$LANE" =~ ^(ts|animation|rust)$ ]]; then
  echo "run-supervisor: unsupported lane '$LANE' (expected ts, animation, or rust)" >&2
  exit 2
fi
REQUIRE_LANE_UNATTENDED_INSTRUCTIONS="${POKEBENCH_REQUIRE_LANE_UNATTENDED_INSTRUCTIONS:-0}"
if [[ ! "$REQUIRE_LANE_UNATTENDED_INSTRUCTIONS" =~ ^(0|1)$ ]]; then
  echo "run-supervisor: POKEBENCH_REQUIRE_LANE_UNATTENDED_INSTRUCTIONS must be 0 or 1 (got '$REQUIRE_LANE_UNATTENDED_INSTRUCTIONS')" >&2
  exit 2
fi

# Side-lane supervisors (animation, rust) live in a persistent worktree on
# their own branch (single-writer: only that session commits to <lane>-main;
# only the main tree can commit to master). Bootstrap it if missing, then run
# from it — everything after this cd (tools, docs, worker launches)
# self-scopes there.
PRIMARY_WORKSPACE_ROOT="$(pwd)"
if [[ "$LANE" =~ ^(animation|rust)$ && "$PRINT_CONFIG" != "1" \
      && "$(git rev-parse --abbrev-ref HEAD)" != "${LANE}-main" ]]; then
  LANE_WT="$(pwd)/.worktrees/${LANE}-main"
  if [[ ! -d "$LANE_WT" ]]; then
    if git show-ref --verify --quiet "refs/heads/${LANE}-main"; then
      git worktree add "$LANE_WT" "${LANE}-main" >/dev/null
    else
      git worktree add -b "${LANE}-main" "$LANE_WT" master >/dev/null
    fi
    echo "$LANE worktree created at $LANE_WT (branch ${LANE}-main)"
  fi
  # The worktree checks out the WHOLE repo; this workspace lives at
  # $REPO_SUBDIR inside it (workspace/ in the two-layer layout), so the
  # session runs from the worktree's copy of that subdirectory.
  REPO_SUBDIR="$(git rev-parse --show-prefix)"
  LANE_WT_WS="${LANE_WT}/${REPO_SUBDIR%/}"
  [[ -e "$LANE_WT_WS/reference" ]] || ln -s "$(pwd)/reference" "$LANE_WT_WS/reference"
  cd "$LANE_WT_WS"
  if [[ ! -d node_modules ]]; then
    echo "$LANE worktree: installing deps (one-time npm install) ..."
    npm install --no-audit --no-fund >"/tmp/emerald-factory-${LANE}-main-setup.log" 2>&1 \
      || { echo "run-supervisor: npm install failed; see /tmp/emerald-factory-${LANE}-main-setup.log" >&2; exit 1; }
  fi
  # The WASM artifact is intentionally gitignored, but the full test suite
  # exercises it whenever POKEBENCH_ENGINE=wasm is configured. Seed every
  # persistent lane just as run-subagent.sh seeds disposable worker trees.
  if [[ -f "${PRIMARY_WORKSPACE_ROOT}/artifacts/wasm/factory_wasm.wasm" \
        && ! -f "${LANE_WT_WS}/artifacts/wasm/factory_wasm.wasm" ]]; then
    mkdir -p "${LANE_WT_WS}/artifacts/wasm"
    cp "${PRIMARY_WORKSPACE_ROOT}/artifacts/wasm/factory_wasm.wasm" \
      "${LANE_WT_WS}/artifacts/wasm/factory_wasm.wasm"
  fi
fi

if [[ "$LANE" == "ts" && "$PRINT_CONFIG" != "1" \
      && "$(git rev-parse --abbrev-ref HEAD)" != "master" ]]; then
  echo "run-supervisor: main must run from the primary local master checkout" >&2
  exit 2
fi

DEFERRED_FILE="DEFERRED.md"
[[ "$LANE" == "animation" ]] && DEFERRED_FILE="ANIMATION_DEFERRED.md"
[[ "$LANE" == "rust" ]] && DEFERRED_FILE="RUST_DEFERRED.md"
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
LANE_UNATTENDED_FILE=""
LANE_UNATTENDED_NOTE=""
if [[ "$PRINT_CONFIG" != "1" && "$HEADLESS" == "1" && "$LANE" =~ ^(animation|rust)$ ]]; then
  LANE_UNATTENDED_FILE="$(printf '%s' "$LANE" | tr '[:lower:]' '[:upper:]')_UNATTENDED.md"
  if [[ -f "$LANE_UNATTENDED_FILE" ]]; then
    LANE_UNATTENDED_NOTE="This is an unattended campaign run. Read ${LANE_UNATTENDED_FILE} in full and obey its branch-local checkpoint and scope contract. That file is campaign state for ${LANE}-main, not a master-branch product requirement."
  elif [[ "$REQUIRE_LANE_UNATTENDED_INSTRUCTIONS" == "1" ]]; then
    echo "run-supervisor: required branch-local instructions are missing: $LANE_UNATTENDED_FILE" >&2
    exit 7
  fi
fi
case "$PROVIDER" in
  claude)
    MODEL="${MODEL:-claude-opus-5-5}"
    if [[ -n "$REASONING_EFFORT" ]]; then
      echo "run-supervisor: --effort applies only to a Codex supervisor" >&2
      exit 2
    fi
    command -v claude >/dev/null 2>&1 || { echo "run-supervisor: claude CLI not found on PATH" >&2; exit 127; }
    ;;
  codex)
    MODEL="${MODEL:-gpt-6.1-sol}"
    if [[ "$MAX_MODE" == "1" ]]; then
      REASONING_EFFORT="${REASONING_EFFORT:-ultra}"
      if [[ "$MODEL" != "gpt-6.1-sol" || "$REASONING_EFFORT" != "ultra" ]]; then
        echo "run-supervisor: invalid max-mode profile (expected gpt-6.1-sol/ultra)" >&2
        exit 2
      fi
    else
      if ! REQUIRED_CODEX_EFFORT="$(pokebench_codex_supervisor_effort "$MODEL")"; then
        echo "run-supervisor: unsupported ordinary Codex supervisor model '$MODEL' (allowed: gpt-6.1-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.6-sol)" >&2
        exit 2
      fi
      REASONING_EFFORT="${REASONING_EFFORT:-$REQUIRED_CODEX_EFFORT}"
      if [[ "$REASONING_EFFORT" != "$REQUIRED_CODEX_EFFORT" ]]; then
        echo "run-supervisor: ordinary Codex model '$MODEL' requires effort '$REQUIRED_CODEX_EFFORT' (got '$REASONING_EFFORT')" >&2
        exit 2
      fi
    fi
    command -v codex >/dev/null 2>&1 || { echo "run-supervisor: codex CLI not found on PATH" >&2; exit 127; }
    ;;
esac

# Claude Code normally carries `cd` changes across Bash tool calls. Supervisors
# deliberately enter disposable worker worktrees while verifying them, so make
# every later Bash call start from this supervisor's launch directory again.
# For the animation/rust lanes that launch directory is the lane worktree; for
# the ts lane it is this workspace root.
SUPERVISOR_SHELL_CWD_POLICY=per-command
if [[ "$PROVIDER" == "claude" ]]; then
  export CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1
  SUPERVISOR_SHELL_CWD_POLICY=project-root-reset
fi

if [[ "$WORKER_PROVIDER" == "deepseek" ]]; then
  if ! OPENCODE_BIN_RESOLVED="$(pokebench_resolve_opencode_bin)"; then
    echo "run-supervisor: OpenCode CLI not found (set OPENCODE_BIN or install it at ~/.opencode/bin/opencode)" >&2
    exit 127
  fi
  export OPENCODE_BIN="$OPENCODE_BIN_RESOLVED"
elif [[ "$WORKER_PROVIDER" != "$PROVIDER" ]]; then
  command -v "$WORKER_PROVIDER" >/dev/null 2>&1 \
    || { echo "run-supervisor: $WORKER_PROVIDER worker CLI not found on PATH" >&2; exit 127; }
fi

CODEX_LOG_ROOT="${POKEBENCH_CODEX_LOG_DIR:-${POKEBENCH_AGENT_LOG_DIR:-$(pwd)/.codex-logs}}"
export POKEBENCH_AGENT_LOG_DIR="$CODEX_LOG_ROOT"
if [[ -z "$SUPERVISOR_LOG" ]]; then
  if [[ "$PROVIDER" == "codex" ]]; then
    SUPERVISOR_LOG="$CODEX_LOG_ROOT/supervisor/headless-$(date +%Y%m%d-%H%M%S)-$$.jsonl"
  else
    SUPERVISOR_LOG="$CODEX_LOG_ROOT/supervisor/claude-headless-$(date +%Y%m%d-%H%M%S)-$$.jsonl"
  fi
fi

source tools/codex-git-attribution.sh
if [[ "$PROVIDER" != "codex" ]]; then
  codex_git_attribution_disable
fi

# Workers inherit the resolved sub-agent selection. Max mode is intentionally
# stricter: its inherited marker makes the worker launcher reject non-Sol
# models, and these defaults give every worker the xhigh ceiling requested by
# the profile.
export POKEBENCH_WORKER_PROVIDER="$WORKER_PROVIDER"
export POKEBENCH_CODEX_MAX_MODE="$MAX_MODE"
if [[ "$MAX_MODE" == "1" ]]; then
  export WORKER_MODEL=gpt-5.6-sol
  export WORKER_REASONING_EFFORT=xhigh
elif [[ "$WORKER_PROVIDER" == "codex" ]]; then
  WORKER_MODEL="${WORKER_MODEL:-gpt-5.6-sol}"
  if ! REQUIRED_WORKER_EFFORT="$(pokebench_codex_ordinary_effort "$WORKER_MODEL")"; then
    echo "run-supervisor: unsupported ordinary Codex worker model '$WORKER_MODEL' (allowed: gpt-5.6-terra, gpt-5.6-luna, gpt-5.6-sol)" >&2
    exit 2
  fi
  WORKER_REASONING_EFFORT="${WORKER_REASONING_EFFORT:-$REQUIRED_WORKER_EFFORT}"
  if [[ "$WORKER_REASONING_EFFORT" != "$REQUIRED_WORKER_EFFORT" ]]; then
    echo "run-supervisor: ordinary Codex worker model '$WORKER_MODEL' requires effort '$REQUIRED_WORKER_EFFORT' (got '$WORKER_REASONING_EFFORT')" >&2
    exit 2
  fi
  export WORKER_MODEL WORKER_REASONING_EFFORT
elif [[ "$WORKER_PROVIDER" == "deepseek" ]]; then
  WORKER_MODEL="${WORKER_MODEL:-$POKEBENCH_DEEPSEEK_WORKER_MODEL}"
  if [[ "$WORKER_MODEL" != "$POKEBENCH_DEEPSEEK_WORKER_MODEL" ]]; then
    echo "run-supervisor: DeepSeek workers are fixed at $POKEBENCH_DEEPSEEK_WORKER_MODEL (got '$WORKER_MODEL')" >&2
    exit 2
  fi
  if [[ -n "${WORKER_REASONING_EFFORT:-}" ]]; then
    echo "run-supervisor: DeepSeek workers do not accept WORKER_REASONING_EFFORT" >&2
    exit 2
  fi
  export WORKER_MODEL
elif [[ "$WORKER_PROVIDER" == "claude" && -n "${WORKER_MODEL:-}" ]]; then
  # Only set when a Claude model alias (-s opus, etc.) fixed it; otherwise
  # tools/run-subagent.sh applies its own claude-sonnet-5-5 default per call.
  export WORKER_MODEL
fi
if [[ "$PRINT_CONFIG" == "1" ]]; then
  if [[ "$PROVIDER" == "claude" ]]; then
    WORKER_LAUNCH_MODE=background
  else
    WORKER_LAUNCH_MODE=managed
  fi
  if [[ "$MAX_MODE" == "1" ]]; then
    WORKER_ROUTING=locked-sol
  elif [[ "$WORKER_PROVIDER" == "codex" ]]; then
    WORKER_ROUTING=tiered
  elif [[ "$WORKER_PROVIDER" == "deepseek" ]]; then
    WORKER_ROUTING=fixed-deepseek
  else
    WORKER_ROUTING=fixed
  fi
  echo "supervisor_lane=$LANE"
  if [[ "$HEADLESS" == "1" ]]; then
    echo "supervisor_mode=headless"
  else
    echo "supervisor_mode=interactive"
  fi
  case "$LANE" in
    animation) echo "supervisor_guide=ANIMATION_SUPERVISOR.md" ;;
    rust) echo "supervisor_guide=RUST_SUPERVISOR.md" ;;
    *) echo "supervisor_guide=SUPERVISOR.md" ;;
  esac
  if [[ "$LANE" == "animation" ]]; then
    echo "oracle_profile=battle-scene-on"
  else
    echo "oracle_profile=battle-scene-off"
  fi
  echo "supervisor=$PROVIDER"
  echo "supervisor_model=$MODEL"
  echo "supervisor_effort=${REASONING_EFFORT:-n/a}"
  echo "supervisor_shell_cwd=$SUPERVISOR_SHELL_CWD_POLICY"
  echo "max_mode=$MAX_MODE"
  echo "sub_agent=$WORKER_PROVIDER"
  echo "worker_launch_mode=$WORKER_LAUNCH_MODE"
  echo "worker_routing=$WORKER_ROUTING"
  echo "deferred_policy=$DEFERRED_POLICY"
  echo "require_lane_unattended_instructions=$REQUIRE_LANE_UNATTENDED_INSTRUCTIONS"
  if [[ "$WORKER_PROVIDER" == "codex" ]]; then
    echo "worker_model=${WORKER_MODEL:-gpt-5.6-sol}"
    echo "worker_effort=${WORKER_REASONING_EFFORT:-high}"
  elif [[ "$WORKER_PROVIDER" == "deepseek" ]]; then
    echo "worker_model=$WORKER_MODEL"
    echo "worker_effort=n/a"
    echo "worker_runtime=opencode"
    echo "worker_headless=1"
    echo "worker_permissions=auto"
  else
    echo "worker_model=${WORKER_MODEL:-claude-sonnet-5-5}"
    echo "worker_effort=n/a"
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
# is safe. The animation supervisor never needs the OFF profile; the rust
# supervisor never needs the ON profile (its differential targets are the
# OFF-path fixtures).
if [[ "$LANE" == "ts" || "$LANE" == "rust" ]]; then
  pokebench_ensure_oracle_profile \
    "$HARNESS_ROOT" battle-scene-off "$MAIN_ORACLE_URL" \
    /tmp/emerald-factory-oracle-off.log
  echo "Main oracle (Battle Scene OFF) up at $MAIN_ORACLE_URL"
fi
if [[ "$LANE" != "rust" ]]; then
  pokebench_ensure_oracle_profile \
    "$HARNESS_ROOT" battle-scene-on "$ANIMATION_ORACLE_URL" \
    /tmp/emerald-factory-oracle-on.log
  echo "Animation oracle (Battle Scene ON) up at $ANIMATION_ORACLE_URL"
fi
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

CONTINUITY_NOTE="Run autonomously through the full session cap while useful in-scope work remains. Do not ask the user questions mid-session, send decision notifications, or end a turn awaiting a reply. Exercise your best evidence-backed judgment for reversible on-scope choices. If a material choice genuinely cannot be made safely, record it in ${DEFERRED_FILE}, continue independent safe work, and summarize it only at wind-down."
if [[ "$OPEN_DEFERRED" == "1" && "$DEFERRED_POLICY" == "continue" ]]; then
  CONTINUITY_NOTE+=" ${DEFERRED_FILE} already contains at least one open user-level decision. Do not guess at, remove, or silently resolve an open entry. Work around it on independent reversible steps; if it blocks every remaining safe step, leave a clean checkpoint and wind down normally."
fi

if [[ "$WORKER_PROVIDER" == "codex" ]]; then
  if [[ "$MAX_MODE" == "1" ]]; then
    WORKER_ROUTING_NOTE="Codex max mode is active: use only gpt-5.6-sol workers. The launcher defaults them to xhigh and rejects Terra or any other worker model; do not override that all-Sol routing."
  else
    WORKER_ROUTING_NOTE="Ordinary Codex workers must use one exact pair: gpt-5.6-terra/max, gpt-5.6-luna/max, or gpt-5.6-sol/high. The launcher defaults to Sol/high and rejects every other model/effort pairing."
  fi
elif [[ "$WORKER_PROVIDER" == "deepseek" ]]; then
  WORKER_ROUTING_NOTE="DeepSeek worker mode is active: every worker is fixed at $POKEBENCH_DEEPSEEK_WORKER_MODEL through OpenCode. Invoke run-subagent.sh without --sub-agent, --model, or --effort overrides."
else
  WORKER_ROUTING_NOTE="Workers are Claude on the ${WORKER_MODEL:-claude-sonnet-5-5} profile unless a step explicitly overrides the worker model with run-subagent.sh -m (accepts a full model name or the aliases opus/sonnet/fable/haiku)."
fi
if [[ "$PROVIDER" == "codex" ]]; then
  WORKER_LAUNCH_NOTE="Invoke each ./tools/run-subagent.sh call directly in its own execution-tool session without shell backgrounding, '&', or nohup. A yielded call is still running; retain its handle and wait on it."
else
  WORKER_LAUNCH_NOTE="Start each ./tools/run-subagent.sh launcher as a background shell job because the Claude supervisor's shell call can time out before a worker finishes; retain its PID and output path, poll until that launcher exits, and do not treat the initial shell return as worker completion."
fi
if [[ "$WORKER_PROVIDER" == "deepseek" ]]; then
  WORKER_LAUNCH_NOTE+=" When invoking the launcher from Claude's Bash tool, disable that tool's host sandbox so OpenCode can read its credential store; OpenCode itself runs headlessly with --auto inside the selected worker lane/worktree."
fi

if [[ "$LANE" == "rust" ]]; then
  DELEGATION_NOTE="${WORKER_ROUTING_NOTE} ${WORKER_LAUNCH_NOTE}"
  PROMPT="You are the RUST-REWRITE supervisor for this repo. Read RUST_SUPERVISOR.md, AGENTS.md, and RUST_PROGRESS.md before dispatching anything. ${LANE_UNATTENDED_NOTE} You are in the persistent rust-main worktree and you are that branch's only writer: begin by merging master in (git merge --no-edit master), rerun cargo test and the wasm32 release build (see core-rs/README.md for the explicit toolchain PATH — cargo is not on the login PATH) as your baseline, then drive one bounded port step at a time via ./tools/run-subagent.sh --lane rust from this tree — one worker at a time, rust lane only, verify each result yourself, merge each verified worker branch into rust-main from this tree, and never write master or another lane's docs (PROGRESS.md/ISSUES.md/ROADMAP.md/DEFERRED.md/ANIMATION_*). Your territory is core-rs/ plus only the adapter files RUST_SUPERVISOR.md milestone M2 allows; the TypeScript engine stays canonical — never edit src/ or tests/ outside that allowance, and rerun npm test and npm run build before any fold that touches them. Your ledger is RUST_PROGRESS.md; your deferral file is RUST_DEFERRED.md. ${DELEGATION_NOTE} Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it with rust-main committed and green so the main supervisor's fold stays boring. ${CONTINUITY_NOTE}"
elif [[ "$LANE" == "animation" ]]; then
  DELEGATION_NOTE="${WORKER_ROUTING_NOTE} ${WORKER_LAUNCH_NOTE}"
  PROMPT="You are the ANIMATION supervisor for this run. Read ANIMATION_SUPERVISOR.md, AGENTS.md, ANIMATION_VERIFICATION.md, and the current ANIMATION_PROGRESS.md checkpoint before dispatching anything. ${LANE_UNATTENDED_NOTE} You are in the persistent animation-main worktree and you are that branch's only writer: begin by merging master in (git merge --no-edit master), establish the baseline under ANIMATION_VERIFICATION.md (reuse a recorded green production baseline plus scoped receipts for tooling/evidence-only deltas; run full gates if production code or relevant environment changed), then drive one bounded animation coverage step at a time via ./tools/run-subagent.sh --lane animation from this tree — one worker at a time, animation lane only, verify each result yourself, merge each verified worker branch into animation-main from this tree, and never write master or the main program's docs (PROGRESS.md/ISSUES.md/ROADMAP.md/DEFERRED.md). Your ledger is ANIMATION_PROGRESS.md; your deferral file is ANIMATION_DEFERRED.md. The coverage report derives ready work from every unfinished Factory move: Level 50 first, then Open-only Outrage, which the user explicitly added to this campaign. Blocked Level 50 moves do not prevent dispatching ready Outrage work; the 77 outside-Factory moves are outside this campaign scope. The manual queue only sets priority within a tier and an empty manual list is not an authorization boundary. Dispatch ranked ready work, recording any genuine blocker with evidence and a resume condition. Only when no ready work remains may an unchanged session exit under ANIMATION_VERIFICATION.md without repeating full gates or writing a no-change ledger commit. ${DELEGATION_NOTE} Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it with animation-main committed and green so the main supervisor's fold stays boring. ${CONTINUITY_NOTE}"
else
  DELEGATION_NOTE="${WORKER_ROUTING_NOTE} ${WORKER_LAUNCH_NOTE} Choose a worker lane from the ownership contract and active roadmap stage. Integration workers use --lane integration for temporary worktree isolation and Battle Scene ON validation; this is an internal worker contract, not a separate supervisor program. Do not dispatch independent Factory or Rust campaigns unless the current roadmap explicitly calls for them."
  PROMPT="You are the main supervisor for this repo, running on master in the assigned host checkout. Read SUPERVISOR.md, AGENTS.md, LOCAL_SETUP.md, the latest PROGRESS.md, and ROADMAP.md's current execution priority before dispatching. Let the current roadmap stage determine the work, its linked detailed guide, progress records, and acceptance criteria; do not substitute a historical hardcoded mission. Reuse valid unchanged production receipts under the stage's verification policy. Delegate bounded steps via ./tools/run-subagent.sh, independently verify the central claims, fold only green changes into master, and continue useful in-scope work. Follow the roadmap's current authorization for source-proven gameplay/RNG corrections; presentation-only work must preserve logical outcomes, and all scene modes must share the same corrected rules. Preserve logs/evidence before removing temporary worker worktrees. Use the active host assignment and resource limits in AGENTS.md and LOCAL_SETUP.md; a CAX31 assignment requires docs/cax31-session-handoff.md. Keep one main writer and do not launch a duplicate campaign on another host. Your main handoff is PROGRESS.md; retain stage-specific evidence and progress where the roadmap directs. Material user decisions go in DEFERRED.md. ${DELEGATION_NOTE} Hard deadline for this whole session: ${DEADLINE_HUMAN} (epoch ${DEADLINE_EPOCH}); wind down cleanly before it with master committed and green. ${CONTINUITY_NOTE}"

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
      --ignore-user-config \
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
    [[ "$LANE" == "rust" ]] && RC_PREFIX="emerald-factory-rust"
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
