#!/usr/bin/env bash
# Run ONE bounded, disposable worker step — the supervisor's hands.
#
# Launches one fresh headless worker. The default remains the original Claude
# worker (claude-sonnet-5); a Codex supervisor automatically selects the Codex
# worker profile (gpt-5.6-sol at medium effort). The transcript is summarized
# to a fixed-size handoff and retained in the log file named below.
# Killing a worker at any point is safe —
# workers follow AGENTS.md's commit-often discipline, so the next step resumes
# from git + PROGRESS.md.
#
# Usage:
#   tools/run-subagent.sh [options] "step brief for the worker"
#     -c, --cap-minutes N   hard cap in minutes (default 60)
#     -p, --provider NAME   claude (default) or codex
#     -m, --model NAME      worker model (provider default)
#     -e, --effort EFFORT   Codex reasoning effort (default medium)
#     -w, --worktree        run the worker in a fresh git worktree on its own
#                           branch (the parallel lane; see SUPERVISOR.md)
#         --log FILE        provider event log path
#     -h, --help            show this help
#
# Concurrency is capped at TWO workers, mechanically: one lane for the main
# working tree, one for a worktree. Each lane is a pidfile in
# /tmp/pokebench-worker-lanes-<run>/; a second launch into a live lane is
# refused (exit 4). The worktree lane gets its own npm install, a symlink to
# the main tree's read-only reference/, and shares the harness-level oracle
# service (exported to the worker as POKEBENCH_ORACLE_URL). Its worker is
# contract-bound NOT to touch PROGRESS.md/ISSUES.md — the supervisor folds
# docs into the merge. The worktree and branch survive the run for the
# supervisor to verify and merge.
#
# Each provider runs non-interactively with the same full-access trust model as
# its supervisor. Every provider uses git and PROGRESS.md as the durable
# handoff, and each worker keeps its event log for later inspection.
#
# Exit status: the worker's own exit status — except 42, which means the run
# was stopped by an account usage/rate limit (supervisor: wind down, do not
# relaunch).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Recursion guard: workers must never spawn agents. Every launcher exports
# POKEBENCH_ROLE to its agent, and the agent's shells inherit it — so a worker
# invoking this script is refused mechanically, not just by instruction.
if [[ "${POKEBENCH_ROLE:-}" == "worker" ]]; then
  echo "run-subagent: refusing — already inside a worker session; workers don't spawn agents" >&2
  exit 3
fi

usage() {
  cat <<'EOF'
Usage: tools/run-subagent.sh [options] "step brief for the worker"
  -c, --cap-minutes N   hard cap in minutes (default 60)
  -p, --provider NAME   claude (default) or codex
  -m, --model NAME      worker model (provider default)
  -e, --effort EFFORT   Codex reasoning effort (default medium)
  -w, --worktree        run in a fresh git worktree on its own branch (parallel
                        lane: own npm install + dedicated oracle port; worker
                        must not touch shared docs; supervisor merges after
                        verifying — see SUPERVISOR.md "Parallel workers")
      --log FILE        provider event log path
      --print-config    print the resolved profile without launching
  -h, --help            show this help
Environment overrides: WORKER_PROVIDER, WORKER_MODEL, WORKER_REASONING_EFFORT.
Legacy MODEL remains supported for direct worker launches.
Exits with the worker's status; 42 means an account usage/rate limit stopped it
(either this worker's own, or a sibling's — a 42 in one lane cancels the other).
Exit 4 means the requested lane already has a live worker (max 2 concurrent:
one main-tree, one worktree).
Exit 5 means a Codex worker violated the clean/committed postflight contract.
EOF
}

CAP_MINUTES="${CAP_MINUTES:-60}"
PROVIDER="${WORKER_PROVIDER:-${POKEBENCH_WORKER_PROVIDER:-claude}}"
MODEL="${WORKER_MODEL:-${MODEL:-}}"
REASONING_EFFORT="${WORKER_REASONING_EFFORT:-}"
AGENT_LOG="${AGENT_LOG:-}"
WORKTREE="${WORKTREE:-0}"
BRIEF=""
PRINT_CONFIG=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--cap-minutes) CAP_MINUTES="${2:?--cap-minutes needs a number}"; shift 2 ;;
    --cap-minutes=*)  CAP_MINUTES="${1#*=}"; shift ;;
    -w|--worktree)    WORKTREE=1; shift ;;
    -p|--provider)    PROVIDER="${2:?--provider needs a name}"; shift 2 ;;
    --provider=*)     PROVIDER="${1#*=}"; shift ;;
    -m|--model)       MODEL="${2:?--model needs a model name}"; shift 2 ;;
    --model=*)        MODEL="${1#*=}"; shift ;;
    -e|--effort)      REASONING_EFFORT="${2:?--effort needs a value}"; shift 2 ;;
    --effort=*)       REASONING_EFFORT="${1#*=}"; shift ;;
    --log)            AGENT_LOG="${2:?--log needs a path}"; shift 2 ;;
    --log=*)          AGENT_LOG="${1#*=}"; shift ;;
    --print-config)   PRINT_CONFIG=1; shift ;;
    -h|--help)        usage; exit 0 ;;
    -*) echo "run-subagent: unknown option '$1' (try --help)" >&2; exit 2 ;;
    *)
      if [[ -n "$BRIEF" ]]; then
        echo "run-subagent: expected exactly one step brief (got a second positional arg)" >&2
        exit 2
      fi
      BRIEF="$1"; shift ;;
  esac
done

if [[ -z "$BRIEF" && "$PRINT_CONFIG" != "1" ]]; then
  echo "run-subagent: a step brief is required (try --help)" >&2
  exit 2
fi
if [[ ! "$CAP_MINUTES" =~ ^[0-9]+$ || "$CAP_MINUTES" -lt 1 ]]; then
  echo "run-subagent: --cap-minutes must be a positive integer (got '$CAP_MINUTES')" >&2
  exit 2
fi
if [[ ! "$PROVIDER" =~ ^(claude|codex)$ ]]; then
  echo "run-subagent: unsupported provider '$PROVIDER' (expected claude or codex)" >&2
  exit 2
fi
case "$PROVIDER" in
  claude)
    MODEL="${MODEL:-claude-sonnet-5}"
    if [[ -n "$REASONING_EFFORT" ]]; then
      echo "run-subagent: --effort applies only to the codex provider" >&2
      exit 2
    fi
    command -v claude >/dev/null 2>&1 || { echo "run-subagent: claude CLI not found on PATH" >&2; exit 127; }
    ;;
  codex)
    MODEL="${MODEL:-gpt-5.6-sol}"
    REASONING_EFFORT="${REASONING_EFFORT:-medium}"
    if [[ ! "$REASONING_EFFORT" =~ ^(none|low|medium|high|xhigh)$ ]]; then
      echo "run-subagent: unsupported reasoning effort '$REASONING_EFFORT' (maximum allowed: xhigh)" >&2
      exit 2
    fi
    if [[ "$MODEL" == *sol* && "$REASONING_EFFORT" == "xhigh" ]]; then
      echo "run-subagent: Sol reasoning effort is capped at high (got '$REASONING_EFFORT')" >&2
      exit 2
    fi
    command -v codex >/dev/null 2>&1 || { echo "run-subagent: codex CLI not found on PATH" >&2; exit 127; }
    ;;
esac
if [[ "$PROVIDER" != "codex" ]]; then
  # A mixed-provider worker may inherit these from a Codex supervisor; ensure
  # attribution follows the worker that actually creates the commit.
  unset POKEBENCH_COMMIT_GENERATOR POKEBENCH_COMMIT_MODEL
fi
if [[ -z "$AGENT_LOG" ]]; then
  if [[ "$PROVIDER" == "claude" ]]; then
    AGENT_LOG="/tmp/emerald-factory-subagent-$(date +%Y%m%d-%H%M%S).jsonl"
  else
    CODEX_LOG_ROOT="${POKEBENCH_CODEX_LOG_DIR:-${POKEBENCH_AGENT_LOG_DIR:-$(pwd)/.codex-logs}}"
    AGENT_LOG="$CODEX_LOG_ROOT/workers/worker-$(date +%Y%m%d-%H%M%S)-$$.jsonl"
  fi
fi
CODEX_STDERR_LOG=""
if [[ "$PROVIDER" == "codex" ]]; then
  if [[ "$AGENT_LOG" == *.jsonl ]]; then
    CODEX_STDERR_LOG="${AGENT_LOG%.jsonl}.stderr.log"
  else
    CODEX_STDERR_LOG="${AGENT_LOG}.stderr.log"
  fi
fi
if [[ "$PRINT_CONFIG" == "1" ]]; then
  echo "worker_provider=$PROVIDER"
  echo "worker_model=$MODEL"
  echo "worker_effort=${REASONING_EFFORT:-n/a}"
  exit 0
fi
mkdir -p "$(dirname "$AGENT_LOG")"

LAUNCH_EPOCH="$(date +%s)"

# Concurrency cap, enforced mechanically (SUPERVISOR.md states the rule; this
# makes it stick): at most one worker per lane, two lanes total. A lane file
# holds "<launcher_pid> <worker_pid>"; a live launcher pid means the lane is
# taken. A dead one is a stale lock from a killed run — take it over.
# Lanes are scoped per RUN: several runs of this harness can be active in
# parallel, and each gets its own two lanes.
RUN_KEY="$(pwd | shasum | cut -c1-12)"
LANE_DIR="/tmp/pokebench-worker-lanes-$RUN_KEY"
mkdir -p "$LANE_DIR"
if [[ "$WORKTREE" == "1" ]]; then LANE="worktree"; else LANE="main"; fi
LANE_FILE="$LANE_DIR/$LANE.pid"
if [[ -f "$LANE_FILE" ]]; then
  read -r other_launcher _other_agent < "$LANE_FILE" || true
  if [[ -n "${other_launcher:-}" ]] && kill -0 "$other_launcher" 2>/dev/null; then
    echo "run-subagent: the $LANE lane already has a live worker (launcher pid $other_launcher) — max 2 concurrent workers, one per lane. Wait for it or use the other lane." >&2
    exit 4
  fi
fi
echo "$$" > "$LANE_FILE"

cleanup() {
  # NEVER remove the worktree itself — the supervisor verifies and merges it
  # after this launcher exits.
  # Release the lane only if it is still ours (a stale-lock takeover rewrites it).
  if [[ -f "$LANE_FILE" && "$(awk 'NR==1{print $1}' "$LANE_FILE" 2>/dev/null)" == "$$" ]]; then
    rm -f "$LANE_FILE"
  fi
}
trap cleanup EXIT

WT_PATH=""
WT_BRANCH=""
WT_BASE=""
CODEX_ACCEPTANCE_GUARDRAILS=""
if [[ "$PROVIDER" == "codex" ]]; then
  CODEX_ACCEPTANCE_GUARDRAILS="

Codex-specific acceptance guardrails: never satisfy dynamic pixel acceptance
with per-tick oracle screenshots, absolute-tick framebuffer lookup, baked
interactive sprites disguised as chrome, coordinate/RGB fitting, or by thinning
an existing trace to matching captures. If exact live behavior cannot fit,
commit only a clean evidence checkpoint or honest partial and record the
precisely bounded remainder."
fi

if [[ "$WORKTREE" == "1" ]]; then
  WT_ID="wt-$(date +%Y%m%d-%H%M%S)"
  WT_BRANCH="worker/$WT_ID"
  WT_PATH="$(pwd)/.worktrees/$WT_ID"
  WT_BASE="$(git rev-parse HEAD)"
  echo "worktree: $WT_PATH · branch $WT_BRANCH · base ${WT_BASE:0:7}"
  git worktree add -b "$WT_BRANCH" "$WT_PATH" HEAD >/dev/null
  # reference/ (ROM + pret source) is a gitignored on-disk prerequisite; the
  # worktree shares the main tree's copy — it's read-only reference material.
  ln -s "$(pwd)/reference" "$WT_PATH/reference"
  WT_SETUP_LOG="/tmp/emerald-factory-$WT_ID-setup.log"
  echo "worktree: installing deps (npm + oracle; log: $WT_SETUP_LOG) ..."
  if ! ( cd "$WT_PATH" \
      && npm install --no-audit --no-fund ) > "$WT_SETUP_LOG" 2>&1; then
    echo "run-subagent: worktree dependency install failed; see $WT_SETUP_LOG" >&2
    exit 1
  fi
fi

# Both lanes share the harness-level oracle service (two levels above the run
# root): it is stateless per request — every trace replays from the identical
# canonical snapshot and requests serialize inside the service — so concurrent
# workers are safe. Bootstrapping the emulator takes a few seconds on first start.
source tools/resolve-harness-root.sh
HARNESS_ROOT="$(pokebench_resolve_harness_root)"
export POKEBENCH_HARNESS_ROOT="$HARNESS_ROOT"
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

# Claude Code auto-memory is shared by repo path. Preserve the original worker
# isolation and tripwire for Claude; Codex workers do not use it.
MEMORY_DIR=""
MEM_SNAP_BEFORE=""
MEM_SNAP_AFTER=""
memory_snapshot() {
  [[ -n "$MEMORY_DIR" && -d "$MEMORY_DIR" ]] \
    && find "$MEMORY_DIR" -type f -exec md5 {} + 2>/dev/null | sort
}
if [[ "$PROVIDER" == "claude" ]]; then
  MEMORY_DIR="$HOME/.claude/projects/$(pwd | tr '/' '-')/memory"
  MEM_SNAP_BEFORE="/tmp/emerald-factory-memsnap-$$-before.txt"
  MEM_SNAP_AFTER="/tmp/emerald-factory-memsnap-$$-after.txt"
  memory_snapshot > "$MEM_SNAP_BEFORE" || true
fi

# The step brief arrives wrapped in the standing worker contract, so the
# supervisor's briefs stay purely about the work. The worktree lane's contract
# differs in one load-bearing way: shared docs (PROGRESS.md/ISSUES.md) belong
# to the supervisor there — two branches rewriting the same ledger top entry
# is a guaranteed merge conflict — so the worker reports in its final message
# and the supervisor folds docs into the merge.
if [[ "$WORKTREE" == "1" ]]; then
  PROMPT="Follow AGENTS.md. You are one bounded worker session with a hard ${CAP_MINUTES}-minute cap — you can be stopped at any moment, so commit after every green step.

You are in a git worktree on branch ${WT_BRANCH}; a sibling worker may be active in the main tree. Work only inside this worktree and commit only to this branch. Do NOT edit PROGRESS.md or ISSUES.md (reading them is fine): docs for this lane belong to the supervisor, who folds them in when merging your branch — report your results fully in your final message instead. The shared oracle service is at ${ORACLE_URL}, already exported as POKEBENCH_ORACLE_URL — bin/oracle and the compare tools need no extra setup.

Your assigned step (from the supervisor):
${BRIEF}
${CODEX_ACCEPTANCE_GUARDRAILS}

Stay on this step. If it turns out to be blocked or mis-scoped, say exactly why in your final message instead of improvising a different plan. Before finishing: npm test and npm run build green, work committed on ${WT_BRANCH}.

You are a worker, not the supervisor: SUPERVISOR.md is not for you, and you never launch other agents (run-agent.sh, run-supervisor.sh, tools/run-subagent.sh are off-limits and will refuse you)."
else
  PROMPT="Follow AGENTS.md. You are one bounded worker session with a hard ${CAP_MINUTES}-minute cap — you can be stopped at any moment, so commit after every green step and keep the top entry of PROGRESS.md current as you go.

Your assigned step (from the supervisor):
${BRIEF}
${CODEX_ACCEPTANCE_GUARDRAILS}

Stay on this step. If it turns out to be blocked or mis-scoped, say exactly why in your final message and in PROGRESS.md instead of improvising a different plan. Before finishing: npm test and npm run build green, work committed, PROGRESS.md updated.

You are a worker, not the supervisor: SUPERVISOR.md is not for you, and you never launch other agents (run-agent.sh, run-supervisor.sh, tools/run-subagent.sh are off-limits and will refuse you)."
fi

CAP_SECONDS=$(( CAP_MINUTES * 60 ))
if [[ "$PROVIDER" == "claude" ]]; then
  echo "worker: $MODEL · cap ${CAP_MINUTES}min · raw log: $AGENT_LOG"
else
  echo "worker: $MODEL/$REASONING_EFFORT · cap ${CAP_MINUTES}min · raw JSONL: $AGENT_LOG · stderr: $CODEX_STDERR_LOG"
fi

WORK_DIR="$(pwd)"
if [[ "$WORKTREE" == "1" ]]; then WORK_DIR="$WT_PATH"; fi

if [[ "$PROVIDER" == "codex" ]]; then
  CODEX_START_HEAD="$(git -C "$WORK_DIR" rev-parse HEAD)"
  CODEX_START_DIRTY="$(git -C "$WORK_DIR" status --porcelain=v1)"
  if [[ -n "$CODEX_START_DIRTY" ]]; then
    echo "run-subagent: refusing to launch Codex worker from a dirty $LANE lane:" >&2
    echo "$CODEX_START_DIRTY" >&2
    exit 5
  fi
  # Attribute commits in either lane without changing persistent git config.
  source tools/codex-git-attribution.sh
  codex_git_attribution_enable "$WORK_DIR" "$MODEL"
fi

# No process substitution here: sandboxed supervisor sessions can't open
# /dev/fd/N. Stream straight to the log; the digest is produced after exit.
# The subshell exec makes $! the agent pid itself (needed for the watchdog
# and for sibling cancellation on a usage-limit stop).
if [[ "$PROVIDER" == "claude" ]]; then
  (
    cd "$WORK_DIR"
    export POKEBENCH_ROLE=worker CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 POKEBENCH_ORACLE_URL="$ORACLE_URL"
    exec claude -p --verbose --output-format stream-json \
      --model "$MODEL" \
      --dangerously-skip-permissions "$PROMPT"
  ) >> "$AGENT_LOG" &
else
  (
    cd "$WORK_DIR"
    export POKEBENCH_ROLE=worker POKEBENCH_ORACLE_URL="$ORACLE_URL"
    exec python3 tools/run-codex-worker-with-deadline.py \
      "$CAP_SECONDS" \
      "run-subagent: ${CAP_MINUTES}min cap reached — stopping Codex worker process group" -- \
      codex exec --json \
        --model "$MODEL" \
        -c "model_reasoning_effort=\"$REASONING_EFFORT\"" \
        --dangerously-bypass-approvals-and-sandbox "$PROMPT" </dev/null
  ) >> "$AGENT_LOG" 2>> "$CODEX_STDERR_LOG" &
fi
agent_pid=$!
echo "$$ $agent_pid" > "$LANE_FILE"
# The watchdog traps TERM and kills its own sleep: a plain `sleep CAP` would
# be orphaned when the worker finishes early and keep the launcher's
# stdout/stderr pipes open for the rest of the cap (a reader waiting for EOF
# blocks that whole time).
watchdog_pid=""
if [[ "$PROVIDER" == "claude" ]]; then
  ( trap 'kill "${wd_sleep:-}" 2>/dev/null; exit 0' TERM
    sleep "$CAP_SECONDS" & wd_sleep=$!
    wait "$wd_sleep" || exit 0
    echo "run-subagent: ${CAP_MINUTES}min cap reached — stopping worker"
    kill -TERM "$agent_pid" 2>/dev/null
    sleep 15 & wd_sleep=$!
    wait "$wd_sleep" || exit 0
    kill -KILL "$agent_pid" 2>/dev/null ) &
  watchdog_pid=$!
fi

status=0
wait "$agent_pid" || status=$?
if [[ -n "$watchdog_pid" ]]; then
  kill "$watchdog_pid" 2>/dev/null || true
  wait "$watchdog_pid" 2>/dev/null || true
fi
if [[ "$PROVIDER" == "codex" ]]; then
  CODEX_END_HEAD="$(git -C "$WORK_DIR" rev-parse HEAD)"
  CODEX_END_DIRTY="$(git -C "$WORK_DIR" status --porcelain=v1)"
  if [[ "$CODEX_END_HEAD" == "$CODEX_START_HEAD" ]]; then
    echo "run-subagent: Codex worker produced no commit" >&2
    if [[ "$status" -eq 0 ]]; then status=5; fi
  fi
  if [[ -n "$CODEX_END_DIRTY" ]]; then
    echo "run-subagent: Codex worker left uncommitted changes:" >&2
    echo "$CODEX_END_DIRTY" >&2
    if [[ "$status" -eq 0 ]]; then status=5; fi
  fi
fi
# Digest the transcript for the supervisor (streamed live before the
# no-process-substitution change; post-hoc works the same for callers).
if [[ -f "$AGENT_LOG" ]]; then
  if [[ "$PROVIDER" == "claude" ]]; then
    node tools/stream-summary.mjs < "$AGENT_LOG" || true
  else
    node tools/codex-stream-summary.mjs < "$AGENT_LOG" || true
    if [[ -s "$CODEX_STDERR_LOG" ]]; then
      echo "Codex stderr log: $CODEX_STDERR_LOG"
    fi
  fi
fi

# Worktree handoff: the worktree and branch outlive this launcher on purpose —
# the supervisor verifies inside it, merges, updates docs, then removes it.
if [[ "$WORKTREE" == "1" ]]; then
  echo
  echo "worktree lane done: branch $WT_BRANCH at $WT_PATH (base ${WT_BASE:0:7})"
  echo "commits on the branch:"
  wt_commits="$(git -C "$WT_PATH" log --oneline "${WT_BASE}..HEAD" 2>/dev/null || true)"
  if [[ -n "$wt_commits" ]]; then echo "$wt_commits" | sed 's/^/  /'; else echo "  (none — for an implementation step, that means it failed)"; fi
  wt_dirty="$(git -C "$WT_PATH" status --short 2>/dev/null || true)"
  if [[ -n "$wt_dirty" ]]; then
    echo "UNCOMMITTED changes left in the worktree:"
    echo "$wt_dirty" | sed 's/^/  /'
  fi
  echo "supervisor: verify inside the worktree, then from the main tree:"
  echo "  git merge $WT_BRANCH        # fold the PROGRESS.md/ISSUES.md updates in yourself"
  echo "  git worktree remove ${WT_PATH#$(pwd)/} && git branch -d $WT_BRANCH"
fi

if [[ "$PROVIDER" == "claude" ]]; then
  memory_snapshot > "$MEM_SNAP_AFTER" || true
  if ! cmp -s "$MEM_SNAP_BEFORE" "$MEM_SNAP_AFTER"; then
    {
      echo "run-subagent: WARNING -- the auto-memory directory changed during this Claude worker run: $MEMORY_DIR"
      echo "Workers launch with CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 and must never touch it. If you (the"
      echo "supervisor) didn't write this yourself mid-run, treat it as a worker acting out of bounds:"
      echo "review the diff, revert/rewrite anything you didn't author, and note it in your summary."
      diff "$MEM_SNAP_BEFORE" "$MEM_SNAP_AFTER" || true
    } >&2
  fi
  rm -f "$MEM_SNAP_BEFORE" "$MEM_SNAP_AFTER"
fi

# Surface usage/rate-limit failures distinctly so the supervisor can stop both
# lanes rather than repeatedly relaunching work the account cannot service.
USAGE_STOP_MARKER="$LANE_DIR/usage-limit-stop"
USAGE_STOPPED=0
if [[ -f "$AGENT_LOG" ]]; then
  if [[ "$PROVIDER" == "claude" ]]; then
    if tail -n 3 "$AGENT_LOG" \
        | grep -v '"type":"rate_limit_event".*"status":"allowed"' \
        | grep -qiE 'usage limit|rate.?limit'; then
      USAGE_STOPPED=1
    fi
  elif tail -n 10 "$AGENT_LOG" "$CODEX_STDERR_LOG" 2>/dev/null \
      | grep -v '"type":"rate_limit_event".*"status":"allowed"' \
      | sed -E 's/--no-rate-limit//g' \
      | grep -qiE 'usage limit|rate.?limit|quota exceeded'; then
    USAGE_STOPPED=1
  fi
fi
if [[ "$USAGE_STOPPED" == "1" ]]; then
  echo "run-subagent: worker was stopped by an account usage/rate limit" >&2
  # The limit is account-wide, so a sibling lane's worker is burning time it
  # can't use: cancel it, and leave a timestamped marker so its launcher also
  # exits 42 (the supervisor must see wind-down from both lanes).
  date +%s > "$USAGE_STOP_MARKER"
  for lane_pidfile in "$LANE_DIR"/*.pid; do
    [[ -f "$lane_pidfile" && "$lane_pidfile" != "$LANE_FILE" ]] || continue
    read -r _sib_launcher sib_agent < "$lane_pidfile" || true
    if [[ -n "${sib_agent:-}" ]] && kill -0 "$sib_agent" 2>/dev/null; then
      echo "run-subagent: cancelling sibling worker (pid $sib_agent) — same account limit" >&2
      kill -TERM "$sib_agent" 2>/dev/null || true
    fi
  done
  exit 42
fi
# The flip side of the cancellation above: if a sibling hit the account limit
# while this worker ran, this worker was TERMed for the same reason — surface
# the same distinct exit code instead of a mystery failure.
marker_epoch="$(cat "$USAGE_STOP_MARKER" 2>/dev/null || true)"
if [[ "$marker_epoch" =~ ^[0-9]+$ ]] && (( marker_epoch >= LAUNCH_EPOCH )); then
  echo "run-subagent: a sibling worker hit the account usage/rate limit during this run — this worker was cancelled with it (supervisor: wind down, do not relaunch)" >&2
  exit 42
fi
# Turn authentication failures into a pointed hint instead of a mystery exit 1.
if [[ "$status" -ne 0 && -f "$AGENT_LOG" ]] \
    && grep -qiE 'not logged in|authentication required|unauthorized|401' \
      "$AGENT_LOG" ${CODEX_STDERR_LOG:+"$CODEX_STDERR_LOG"}; then
  if [[ "$PROVIDER" == "claude" ]]; then
    echo "run-subagent: worker exited unauthenticated — this launch was probably sandboxed. Relaunch with the Bash tool's dangerouslyDisableSandbox: true (see the header comment)." >&2
  else
    echo "run-subagent: codex worker exited unauthenticated — log in with the codex CLI and retry" >&2
  fi
fi
exit "$status"
