#!/usr/bin/env bash
# Run ONE bounded, disposable worker step — the supervisor's hands.
#
# Launches one fresh headless Claude worker (default Claude Sonnet 5.5,
# claude-sonnet-5-5). Claude is the only supported provider: the Codex,
# DeepSeek/OpenCode, max-mode and animation/rust worker paths were removed in
# cln239 (docs/cln239-launchers.md). The transcript is summarized to a
# fixed-size handoff and retained in the log file named below. Killing a
# worker at any point is safe — workers follow AGENTS.md's commit-often
# discipline, so the next step resumes from git + PROGRESS.md.
#
# Usage:
#   tools/run-subagent.sh [options] "step brief for the worker"
#   tools/run-subagent.sh [options] --brief-file path/to/brief.txt
#     -c, --cap-minutes N   hard cap in minutes (default 60)
#     -s, --sub-agent NAME  claude (default) or a Claude model alias (opus,
#                        sonnet, fable, haiku) that selects Claude and that
#                        exact model in one step
#     -m, --model NAME      worker model (default claude-sonnet-5-5): a full
#                        Claude model name or an alias (opus, sonnet, fable,
#                        haiku)
#     -w, --worktree        alias for --lane side
#         --lane NAME       ts, side, or integration
#         --log FILE        agent event log path
#         --brief-file FILE read the step brief verbatim from a file
#         --read-only       audit only; require a clean tree but no commit
#     -h, --help            show this help
#
# Each lane permits one worker mechanically. Side and integration use fresh
# worktrees. ts/side use Battle Scene OFF; integration uses Battle Scene ON.
# The supervisor serializes its workers. Each lane is a pidfile in
# /tmp/pokebench-worker-lanes-<run>/; a second launch into a live lane is
# refused (exit 4). Worktree workers are contract-bound NOT to touch
# PROGRESS.md/ISSUES.md — the supervisor folds docs into each merge. The
# worktrees and branches survive the run for supervisor verification.
#
# The worker runs non-interactively with the same full-access trust model as
# its supervisor. Git and PROGRESS.md are the durable handoff, and each worker
# keeps its event log for later inspection.
#
# Exit status: the worker's own exit status — except 42, which means the run
# was stopped by an account usage/rate limit (supervisor: wind down, do not
# relaunch).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source tools/claude-model-policy.sh

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
       tools/run-subagent.sh [options] --brief-file path/to/brief.txt
  -c, --cap-minutes N   hard cap in minutes (default 60)
  -s, --sub-agent NAME  claude (default) or a Claude model alias (opus,
                        sonnet, fable, haiku) that selects Claude and that
                        exact model at once
  -m, --model NAME      worker model (default claude-sonnet-5-5): a full
                        Claude model name or an alias (opus, sonnet, fable,
                        haiku)
  -w, --worktree        alias for --lane side (also --side-worktree)
  -l, --lane NAME       ts, side, or integration ("main" is a legacy alias for
                        ts, the shared tree). Side and integration use fresh
                        worktrees and must not touch shared docs. A trailing
                        "-worktree"/"-lane" is accepted and stripped.
      --base REF        base the worktree on REF instead of current HEAD
                        (name the last supervisor-verified green commit when
                        launching while main is mid-step, so the worker
                        doesn't inherit transiently-red intermediate states)
      --log FILE        agent event log path
      --brief-file FILE read the step brief verbatim from a file
      --brief TEXT      alias for the positional step brief
      --read-only       run an audit that must leave no edits or commits
      --audit           alias for --read-only
      --print-config    print the resolved profile without launching
  -h, --help            show this help
Environment overrides: SUB_AGENT, WORKER_MODEL. Legacy MODEL remains supported
for direct worker launches; supervisors pass their selection internally.
Claude is the only provider; codex, deepseek and opencode are rejected.
Exits with the worker's status; 42 means an account usage/rate limit stopped it
(either this worker's own, or a sibling's — a 42 in one lane cancels the others).
Exit 4 means the requested lane already has a live worker (one per lane).
EOF
}

CAP_MINUTES="${CAP_MINUTES:-60}"
PROVIDER="${SUB_AGENT:-${POKEBENCH_WORKER_PROVIDER:-claude}}"
MODEL="${WORKER_MODEL:-${MODEL:-}}"
AGENT_LOG="${AGENT_LOG:-}"
LANE="${WORKER_LANE:-ts}"
if [[ "${WORKTREE:-0}" == "1" ]]; then LANE="side"; fi
BRIEF=""
BRIEF_OPT=""
BRIEF_FILE=""
WT_BASE_REF=""
PRINT_CONFIG=0
READ_ONLY=0
MODEL_FLAG_SET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--cap-minutes) CAP_MINUTES="${2:?--cap-minutes needs a number}"; shift 2 ;;
    --cap-minutes=*)  CAP_MINUTES="${1#*=}"; shift ;;
    -w|--worktree|--side-worktree|--side-lane) LANE="side"; shift ;;
    -l|--lane)        LANE="${2:?--lane needs ts, side, or integration}"; shift 2 ;;
    --lane=*)         LANE="${1#*=}"; shift ;;
    --base)           WT_BASE_REF="${2:?--base needs a git ref}"; shift 2 ;;
    --base=*)         WT_BASE_REF="${1#*=}"; shift ;;
    -s|--sub-agent)   PROVIDER="${2:?--sub-agent needs a name}"; shift 2 ;;
    --sub-agent=*)    PROVIDER="${1#*=}"; shift ;;
    -m|--model)       MODEL="${2:?--model needs a model name}"; MODEL_FLAG_SET=1; shift 2 ;;
    --model=*)        MODEL="${1#*=}"; MODEL_FLAG_SET=1; shift ;;
    --log)            AGENT_LOG="${2:?--log needs a path}"; shift 2 ;;
    --log=*)          AGENT_LOG="${1#*=}"; shift ;;
    --brief-file)     BRIEF_FILE="${2:?--brief-file needs a path}"; shift 2 ;;
    --brief-file=*)   BRIEF_FILE="${1#*=}"; shift ;;
    --brief)          BRIEF_OPT="${2:?--brief needs the step brief text}"; shift 2 ;;
    --brief=*)        BRIEF_OPT="${1#*=}"; shift ;;
    --read-only|--audit) READ_ONLY=1; shift ;;
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

PROVIDER="$(printf '%s' "$PROVIDER" | tr '[:upper:]' '[:lower:]')"

# Claude model aliases (opus/sonnet/fable/haiku) select Claude and that exact
# model together, wherever a provider name is accepted: -s/--sub-agent picks
# the worker's model directly, and a bare -m/--model alias does the same. An
# explicit --model that disagrees with a --sub-agent alias is a conflict, not
# a silent override.
if SUB_AGENT_ALIAS_MODEL="$(pokebench_claude_model_alias "$PROVIDER")"; then
  if [[ "$MODEL_FLAG_SET" == "1" && "$MODEL" != "$SUB_AGENT_ALIAS_MODEL" ]]; then
    echo "run-subagent: --sub-agent '$PROVIDER' already selects model '$SUB_AGENT_ALIAS_MODEL'; --model '$MODEL' conflicts with it" >&2
    exit 2
  fi
  PROVIDER=claude
  MODEL="$SUB_AGENT_ALIAS_MODEL"
  MODEL_FLAG_SET=1
elif [[ "$MODEL_FLAG_SET" == "1" ]]; then
  MODEL_LOWER="$(printf '%s' "$MODEL" | tr '[:upper:]' '[:lower:]')"
  if MODEL_ALIAS_RESOLVED="$(pokebench_claude_model_alias "$MODEL_LOWER")"; then
    MODEL="$MODEL_ALIAS_RESOLVED"
  fi
fi

# `--brief TEXT` is an alias for the positional brief: supervisor briefs kept
# reaching for it by analogy with --brief-file (PAPERCUTS, 3 hits).
if [[ -n "$BRIEF_OPT" ]]; then
  if [[ -n "$BRIEF" ]]; then
    echo "run-subagent: use either --brief or a positional brief, not both" >&2
    exit 2
  fi
  BRIEF="$BRIEF_OPT"
fi
if [[ -n "$BRIEF" && -n "$BRIEF_FILE" ]]; then
  echo "run-subagent: use either a positional brief or --brief-file, not both" >&2
  exit 2
fi
# Accept the conceptual lane spellings (`side-worktree`, `integration-lane`)
# that supervisor briefs use in prose.
LANE="${LANE%-worktree}"
LANE="${LANE%-lane}"
# "main" survives as a legacy alias for the shared-tree lane.
[[ "$LANE" == "main" ]] && LANE="ts"
if [[ -n "$BRIEF_FILE" ]]; then
  if [[ ! -r "$BRIEF_FILE" ]]; then
    echo "run-subagent: cannot read brief file '$BRIEF_FILE'" >&2
    exit 2
  fi
  BRIEF="$(<"$BRIEF_FILE")"
fi
if [[ -z "$BRIEF" && "$PRINT_CONFIG" != "1" ]]; then
  echo "run-subagent: a step brief is required (try --help)" >&2
  exit 2
fi
if [[ ! "$CAP_MINUTES" =~ ^[0-9]+$ || "$CAP_MINUTES" -lt 1 ]]; then
  echo "run-subagent: --cap-minutes must be a positive integer (got '$CAP_MINUTES')" >&2
  exit 2
fi
if [[ "$PROVIDER" != "claude" ]]; then
  echo "run-subagent: unsupported sub-agent '$PROVIDER' (Claude only: claude, opus, sonnet, fable or haiku; the Codex, DeepSeek and OpenCode paths were removed in cln239)" >&2
  exit 2
fi
if [[ ! "$LANE" =~ ^(ts|side|integration)$ ]]; then
  echo "run-subagent: unsupported lane '$LANE' (expected ts, side, or integration; the animation and rust worker lanes were removed in cln239)" >&2
  exit 2
fi
if [[ -n "$WT_BASE_REF" && "$LANE" == "ts" ]]; then
  echo "run-subagent: --base only applies to worktree lanes (side/integration); the ts lane runs in the shared tree at HEAD" >&2
  exit 2
fi
MODEL="${MODEL:-claude-sonnet-5-5}"
command -v claude >/dev/null 2>&1 || { echo "run-subagent: claude CLI not found on PATH" >&2; exit 127; }

if [[ -z "$AGENT_LOG" ]]; then
  # The default log directory keeps its historical name: the daily cron and
  # existing tooling already write logs under .codex-logs/.
  LOG_ROOT="${POKEBENCH_AGENT_LOG_DIR:-$(pwd)/.codex-logs}"
  AGENT_LOG="$LOG_ROOT/workers/claude-worker-$(date +%Y%m%d-%H%M%S)-$$.jsonl"
fi
if [[ "$LANE" == "integration" ]]; then
  ORACLE_PROFILE="battle-scene-on"
else
  ORACLE_PROFILE="battle-scene-off"
fi
if [[ "$PRINT_CONFIG" == "1" ]]; then
  echo "sub_agent=$PROVIDER"
  echo "worker_model=$MODEL"
  echo "worker_effort=n/a"
  echo "worker_lane=$LANE"
  if [[ "$READ_ONLY" == "1" ]]; then
    echo "worker_mode=read-only"
  else
    echo "worker_mode=implementation"
  fi
  echo "oracle_profile=$ORACLE_PROFILE"
  exit 0
fi
mkdir -p "$(dirname "$AGENT_LOG")"

LAUNCH_EPOCH="$(date +%s)"

# Concurrency cap, enforced mechanically (SUPERVISOR.md states the rule; this
# makes it stick): at most one worker per lane. A lane file holds
# "<launcher_pid> <worker_pid>"; a live launcher pid means the lane is taken.
# A dead one is a stale lock from a killed run — take it over.
# Lanes are scoped per RUN: several runs of this harness can be active in
# parallel, and each gets its own lanes.
RUN_KEY="$(pwd | shasum | cut -c1-12)"
LANE_DIR="/tmp/pokebench-worker-lanes-$RUN_KEY"
mkdir -p "$LANE_DIR"
LANE_FILE="$LANE_DIR/$LANE.pid"
if [[ -f "$LANE_FILE" ]]; then
  read -r other_launcher _other_agent < "$LANE_FILE" || true
  if [[ -n "${other_launcher:-}" ]] && kill -0 "$other_launcher" 2>/dev/null; then
    echo "run-subagent: the $LANE lane already has a live worker (launcher pid $other_launcher) — one per lane. Wait for it or use another lane." >&2
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
WT_WORK_DIR=""
WT_BRANCH=""
WT_BASE=""
IS_WORKTREE=0
if [[ "$LANE" != "ts" ]]; then IS_WORKTREE=1; fi

# Standing execution-discipline clause for every worker prompt. Bounded
# sessions end with their turn: a backgrounded verification (or any
# wait-for-notification pattern) dies uncommitted even when the work is
# finished on disk — this self-abort class bit twice on 2026-08-02 (see
# PAPERCUTS.md) before the clause moved here from per-brief restatement.
EXECUTION_DISCIPLINE="

Execution discipline: your session ends the moment your turn ends. Never
background a command and never use ScheduleWakeup, Monitor, or any
wait-for-notification pattern — a backgrounded verification dies with your
turn and the step is lost even if the work is complete on disk. Run every
command in the foreground and block until it completes, including the final
full-suite/build verification. For mid-step sanity checks prefer
'npm run test:smoke' (~25 s curated subset); it never substitutes for the
full 'npm test' where your finish requirement demands one."

if [[ "$IS_WORKTREE" == "1" ]]; then
  WT_ID="${LANE}-$(date +%Y%m%d-%H%M%S)"
  WT_BRANCH="worker/$WT_ID"
  WT_PATH="$(pwd)/.worktrees/$WT_ID"
  if [[ -n "$WT_BASE_REF" ]]; then
    if ! WT_BASE="$(git rev-parse --verify --quiet "${WT_BASE_REF}^{commit}")"; then
      echo "run-subagent: --base '$WT_BASE_REF' does not name a commit" >&2
      exit 2
    fi
  else
    WT_BASE="$(git rev-parse HEAD)"
  fi
  echo "worktree: $WT_PATH · branch $WT_BRANCH · base ${WT_BASE:0:7}"
  git worktree add -b "$WT_BRANCH" "$WT_PATH" "$WT_BASE" >/dev/null
  # The worktree checks out the WHOLE repo; this workspace lives at
  # $REPO_SUBDIR inside it (workspace/ in the two-layer layout), so the
  # worker runs from the worktree's copy of that subdirectory.
  REPO_SUBDIR="$(git rev-parse --show-prefix)"
  WT_WORK_DIR="${WT_PATH}/${REPO_SUBDIR%/}"
  # reference/ (ROM + pret source) is a gitignored on-disk prerequisite; the
  # worktree shares the main tree's copy — it's read-only reference material.
  ln -s "$(pwd)/reference" "$WT_WORK_DIR/reference"
  WT_SETUP_LOG="/tmp/emerald-factory-$WT_ID-setup.log"
  echo "worktree: installing deps (npm + oracle; log: $WT_SETUP_LOG) ..."
  if ! ( cd "$WT_WORK_DIR" \
      && npm install --no-audit --no-fund ) > "$WT_SETUP_LOG" 2>&1; then
    echo "run-subagent: worktree dependency install failed; see $WT_SETUP_LOG" >&2
    exit 1
  fi
  # artifacts/wasm/factory_wasm.wasm is a gitignored build product the full
  # test suite needs (wasm-parity halves fail loudly without it). Seed the
  # worktree from the main tree's current artifact instead of making every
  # worker rediscover ./core-rs/build-wasm.sh (recurring papercut).
  if [[ -f "$(pwd)/artifacts/wasm/factory_wasm.wasm" ]]; then
    mkdir -p "$WT_WORK_DIR/artifacts/wasm"
    cp "$(pwd)/artifacts/wasm/factory_wasm.wasm" "$WT_WORK_DIR/artifacts/wasm/factory_wasm.wasm"
  fi
fi

# The supervisor owns the shared oracle services. Workers only validate their
# selected lane profile, so worker process-group teardown cannot affect oracle
# lifecycle.
source tools/resolve-harness-root.sh
source tools/oracle-profiles.sh
HARNESS_ROOT="$(pokebench_resolve_harness_root)"
export POKEBENCH_HARNESS_ROOT="$HARNESS_ROOT"
MAIN_ORACLE_URL="${POKEBENCH_MAIN_ORACLE_URL:-http://127.0.0.1:8014}"
ANIMATION_ORACLE_URL="${POKEBENCH_ANIMATION_ORACLE_URL:-http://127.0.0.1:8012}"
if [[ "$LANE" == "integration" ]]; then
  ORACLE_URL="$ANIMATION_ORACLE_URL"
else
  ORACLE_URL="$MAIN_ORACLE_URL"
fi
if ! pokebench_require_oracle_profile "$ORACLE_PROFILE" "$ORACLE_URL"; then
  echo "run-subagent: the supervisor/harness must start the selected oracle before launching workers" >&2
  exit 1
fi

# Claude Code auto-memory is shared by repo path. Preserve the original worker
# isolation and tripwire.
MEMORY_DIR="$HOME/.claude/projects/$(pwd | tr '/' '-')/memory"
MEM_SNAP_BEFORE="/tmp/emerald-factory-memsnap-$$-before.txt"
MEM_SNAP_AFTER="/tmp/emerald-factory-memsnap-$$-after.txt"
memory_snapshot() {
  [[ -n "$MEMORY_DIR" && -d "$MEMORY_DIR" ]] \
    && find "$MEMORY_DIR" -type f -exec md5 {} + 2>/dev/null | sort
}
memory_snapshot > "$MEM_SNAP_BEFORE" || true

# The step brief arrives wrapped in the standing worker contract, so the
# supervisor's briefs stay purely about the work. The worktree lanes' contract
# differs in one load-bearing way: shared docs (PROGRESS.md/ISSUES.md) belong
# to the supervisor there — two branches rewriting the same ledger top entry
# is a guaranteed merge conflict — so the worker reports in its final message
# and the supervisor folds docs into the merge.
if [[ "$READ_ONLY" == "1" ]]; then
  SESSION_OPENING="Follow AGENTS.md. You are one bounded, explicitly read-only audit session with a hard ${CAP_MINUTES}-minute cap. Make no edits and no commits; inspect the assigned scope and return an evidence-backed report."
  WORKTREE_OWNERSHIP="Work only inside this worktree. Do NOT edit or commit any file, including PROGRESS.md or ISSUES.md."
  MAIN_OWNERSHIP="Do NOT edit or commit any file, including PROGRESS.md, ISSUES.md, or PAPERCUTS.md."
  WORKTREE_FINISH_REQUIREMENT="Before finishing: leave the worktree clean. A commit is neither required nor allowed for this audit."
  MAIN_FINISH_REQUIREMENT="Before finishing: leave the main worktree clean. A commit is neither required nor allowed for this audit."
else
  SESSION_OPENING="Follow AGENTS.md. You are one bounded worker session with a hard ${CAP_MINUTES}-minute cap — you can be stopped at any moment, so commit after every green step."
  WORKTREE_OWNERSHIP="Work only inside this worktree and commit only to this branch. Do NOT edit PROGRESS.md or ISSUES.md (reading them is fine): shared docs for this lane belong to the supervisor, who folds them in when merging your branch — report your results fully in your final message instead."
  MAIN_OWNERSHIP="Keep the top entry of PROGRESS.md current as you go."
  if [[ "$LANE" == "integration" ]]; then
    WORKTREE_FINISH_REQUIREMENT="Before finishing: follow ANIMATION_VERIFICATION.md. Evidence/test/tooling-only steps use all affected verifier/test and boundary/inventory gates; production/configuration changes additionally require full npm test and npm run build. Record the tested code commit/tree and outcomes, and commit on ${WT_BRANCH}. Docs-only steps need diff/ledger checks."
  else
    WORKTREE_FINISH_REQUIREMENT="Before finishing: npm test and npm run build green, work committed on ${WT_BRANCH}."
  fi
  MAIN_FINISH_REQUIREMENT="Before finishing: npm test and npm run build green, work committed, PROGRESS.md updated."
fi

if [[ "$IS_WORKTREE" == "1" ]]; then
  if [[ "$READ_ONLY" == "1" ]]; then
    LANE_CONTRACT="Use the selected ${ORACLE_PROFILE} oracle only for read-only validation relevant to the assigned audit."
  elif [[ "$LANE" == "integration" ]]; then
    LANE_CONTRACT="This is the playable animation integration lane. Read ANIMATION_INTEGRATION_BRIEF.md, ANIMATION_INTEGRATION_PROGRESS.md and ANIMATION_VERIFICATION.md. The current local migration mandate supersedes historical hcloud-only instructions. Work only on the assigned live renderer, adapter, presentation seam, fixtures and tests; necessary src/engine changes are authorized by the integration brief. Preserve gameplay outcomes, RNG, damage, turn order and facility state. Use the Battle Scene ON oracle; named OFF service is available for logical parity controls. Do not edit Factory acceptance ledgers (ANIMATION_PROGRESS.md / ANIMATION_COVERAGE.json), integration supervisor ledgers, or other program ledgers. A live adapter is not whole-playable arbitrary-history exactness. Return complete proof and commit/tree identities to the supervisor."
  else
    LANE_CONTRACT="This is the side implementation lane. Prefer source extraction, deterministic scenario staging, data breadth, or another file-disjoint task assigned by the supervisor. Use the Battle Scene OFF oracle."
  fi
  PROMPT="${SESSION_OPENING}

You are in the ${LANE} lane, a git worktree on branch ${WT_BRANCH}; sibling workers may be active in other lanes. ${WORKTREE_OWNERSHIP} ${LANE_CONTRACT}

Your selected oracle is ${ORACLE_PROFILE} at ${ORACLE_URL}, exported as POKEBENCH_ORACLE_URL and POKEBENCH_ORACLE_PROFILE. Both named oracle URLs are also exported for compare traces.

Your assigned step (from the supervisor):
${BRIEF}
${EXECUTION_DISCIPLINE}

Stay on this step. If it turns out to be blocked or mis-scoped, say exactly why in your final message instead of improvising a different plan. ${WORKTREE_FINISH_REQUIREMENT}

You are a worker, not the supervisor: SUPERVISOR.md is not for you, and you never launch other agents (run-agent.sh, run-supervisor.sh, tools/run-subagent.sh are off-limits and will refuse you)."
else
  PROMPT="${SESSION_OPENING} ${MAIN_OWNERSHIP}

Your assigned step (from the supervisor):
${BRIEF}
${EXECUTION_DISCIPLINE}

This main lane uses the Battle Scene OFF oracle. Follow ROADMAP.md's \"Current execution priority\" and docs/cax31-session-handoff.md, and the worker-lane ownership contract in AGENTS.md.

Stay on this step. If it turns out to be blocked or mis-scoped, say exactly why in your final message instead of improvising a different plan. ${MAIN_FINISH_REQUIREMENT}

You are a worker, not the supervisor: SUPERVISOR.md is not for you, and you never launch other agents (run-agent.sh, run-supervisor.sh, tools/run-subagent.sh are off-limits and will refuse you)."
fi

CAP_SECONDS=$(( CAP_MINUTES * 60 ))
echo "worker: $MODEL · lane $LANE · oracle $ORACLE_PROFILE · cap ${CAP_MINUTES}min · raw log: $AGENT_LOG"

WORK_DIR="$(pwd)"
if [[ "$IS_WORKTREE" == "1" ]]; then WORK_DIR="$WT_WORK_DIR"; fi

# No process substitution here: sandboxed supervisor sessions can't open
# /dev/fd/N. Stream straight to the log; the digest is produced after exit.
# The subshell exec makes $! the agent pid itself (needed for the watchdog
# and for sibling cancellation on a usage-limit stop).
(
  cd "$WORK_DIR"
  export POKEBENCH_ROLE=worker CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 \
    POKEBENCH_ORACLE_URL="$ORACLE_URL" POKEBENCH_ORACLE_PROFILE="$ORACLE_PROFILE" \
    POKEBENCH_MAIN_ORACLE_URL="$MAIN_ORACLE_URL" POKEBENCH_ANIMATION_ORACLE_URL="$ANIMATION_ORACLE_URL" \
    POKEBENCH_VITEST_MAX_WORKERS="${POKEBENCH_VITEST_MAX_WORKERS:-4}"
  exec claude -p --verbose --output-format stream-json \
    --model "$MODEL" \
    --dangerously-skip-permissions "$PROMPT"
) >> "$AGENT_LOG" &
agent_pid=$!
echo "$$ $agent_pid" > "$LANE_FILE"
# The watchdog traps TERM and kills its own sleep: a plain `sleep CAP` would
# be orphaned when the worker finishes early and keep the launcher's
# stdout/stderr pipes open for the rest of the cap (a reader waiting for EOF
# blocks that whole time).
( trap 'kill "${wd_sleep:-}" 2>/dev/null; exit 0' TERM
  sleep "$CAP_SECONDS" & wd_sleep=$!
  wait "$wd_sleep" || exit 0
  echo "run-subagent: ${CAP_MINUTES}min cap reached — stopping worker"
  kill -TERM "$agent_pid" 2>/dev/null
  sleep 15 & wd_sleep=$!
  wait "$wd_sleep" || exit 0
  kill -KILL "$agent_pid" 2>/dev/null ) &
watchdog_pid=$!

status=0
wait "$agent_pid" || status=$?
worker_status="$status"
kill "$watchdog_pid" 2>/dev/null || true
wait "$watchdog_pid" 2>/dev/null || true

# Digest the transcript for the supervisor (streamed live before the
# no-process-substitution change; post-hoc works the same for callers).
if [[ -f "$AGENT_LOG" ]]; then
  node tools/stream-summary.mjs < "$AGENT_LOG" || true
fi

# Worktree handoff: the worktree and branch outlive this launcher on purpose —
# the supervisor verifies inside it, merges, updates docs, then removes it.
if [[ "$IS_WORKTREE" == "1" ]]; then
  echo
  echo "$LANE worktree lane done: branch $WT_BRANCH at $WT_PATH (base ${WT_BASE:0:7})"
  echo "commits on the branch:"
  wt_commits="$(git -C "$WT_PATH" log --oneline "${WT_BASE}..HEAD" 2>/dev/null || true)"
  if [[ -n "$wt_commits" ]]; then
    echo "$wt_commits" | sed 's/^/  /'
  elif [[ "$READ_ONLY" == "1" ]]; then
    echo "  (none — expected for a read-only audit)"
  else
    echo "  (none — for an implementation step, that means it failed)"
  fi
  wt_dirty="$(git -C "$WT_PATH" status --short 2>/dev/null || true)"
  if [[ -n "$wt_dirty" ]]; then
    echo "UNCOMMITTED changes left in the worktree:"
    echo "$wt_dirty" | sed 's/^/  /'
  fi
  echo "supervisor: verify inside the worktree, then from the main tree:"
  echo "  git merge $WT_BRANCH        # fold the PROGRESS.md/ISSUES.md updates in yourself"
  echo "  git worktree remove ${WT_PATH#$(pwd)/} && git branch -d $WT_BRANCH"
fi

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

# Surface usage/rate-limit failures distinctly so the supervisor can stop both
# lanes rather than repeatedly relaunching work the account cannot service.
USAGE_STOP_MARKER="$LANE_DIR/usage-limit-stop"
USAGE_STOPPED=0
if [[ -f "$AGENT_LOG" ]]; then
  if tail -n 3 "$AGENT_LOG" \
      | grep -v '"type":"rate_limit_event".*"status":"allowed"' \
      | grep -qiE 'usage limit|rate.?limit'; then
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
# Cap/deadline kills (124) and signal deaths (>=128) are NOT auth failures — a
# killed worker's log routinely contains "401"/"unauthorized" strings from its
# own project work, and the old unconditional hint mis-directed triage toward
# re-auth (PAPERCUTS 2026-07-30). Name the kill for what it is; auth is fine
# if the next launch starts.
if [[ "$worker_status" -eq 124 || "$worker_status" -ge 128 ]]; then
  echo "run-subagent: worker was killed before turn completion (exit $worker_status — cap/deadline or signal, NOT an authentication failure). Check the digest's worker-FAILED marker and the branch's committed state." >&2
elif [[ "$worker_status" -ne 0 && -f "$AGENT_LOG" ]] \
    && grep -qiE 'not logged in|authentication required|unauthorized|HTTP[ /]?401' "$AGENT_LOG"; then
  echo "run-subagent: worker exited unauthenticated — this launch was probably sandboxed. Relaunch with the Bash tool's dangerouslyDisableSandbox: true (see the header comment)." >&2
fi
exit "$status"
