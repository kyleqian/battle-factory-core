# One-week Hetzner autonomy runner

This directory turns a clean Ubuntu 24.04 x86_64 or aarch64 VM into a disposable,
reproducible Animation/Rust runner. It intentionally does not copy the
laptop's `node_modules`, Cargo targets, worktrees, or mGBA build. The bootstrap
reconstructs those machine-local inputs from pinned public sources and refuses
to continue unless the ROM and oracle framebuffer hashes match the laptop.

## User-approved CAX31 runner — 2026-10-13

The user requested a new CAX31 ARM setup after the previous x86 server was
retired. See `docs/cax31-arm-runner.md` for its status and validation receipt.
The Mac checkout remains canonical; this is a separate validation runner.
No historical campaign timers, automatic pushes or duplicate supervisor runs
are enabled by the setup. Authenticate providers freshly on this machine.

ARM uses the pinned Node ARM64 archive and builds the pinned libmgba-py source
against the same pinned mGBA library. The legacy agbcc x86 host build is not
copied or run on ARM. Instead, supply the verified, architecture-independent
GBA ROM, ELF and map together in `POKEBENCH_REFERENCE_ARTIFACTS`; bootstrap
checks all three hashes and retains the pinned reference source for probes.
Native host tools generate map headers, MIDI assembly, graphics and samples
needed by the current extractors/tests. The pinned scanner retains INCGFX flags;
`reference-assets.sha256` checks representative outputs against the Mac.
The x86 bootstrap still builds the reference ROM from source as before.

Example, after restoring the repository and reference artifacts:

```sh
sudo POKEBENCH_ARCH=aarch64 POKEBENCH_BUILD_JOBS=4 \
  POKEBENCH_REFERENCE_ARTIFACTS=/srv/pokebench/reference-artifacts \
  bash workspace/tools/autonomy/bootstrap-ubuntu.sh \
  pokebench /srv/pokebench/pokeemerald-factory-core
```

On the 16 GB runner, serialize heavy checks and set
`POKEBENCH_VITEST_MAX_WORKERS=2` / `CARGO_BUILD_JOBS=4`. The swapfile is an OOM
guard. The older one-week campaign instructions below are examples, not an
authorization to resume those retired campaigns.

Keep `workspace/tools/autonomy/bin` first in the runner's `PATH`; its GNU tar
wrapper excludes Mac resource-fork metadata from framebuffer evidence archives.

## Operating shape

- Animation and Rust are independent single-writer branches with persistent
  worktrees, ledgers, oracle profiles, and locks. The checked-in timers are
  conservative examples; a campaign may install a different cadence in
  `/etc/systemd/system` without making that campaign policy a master-branch
  requirement.
- Provider pairs, caps, stop time, and safeguards are installed in
  `/etc/pokebench-autonomy.env`. Human-readable campaign instructions live
  only on the affected lane branches as `ANIMATION_UNATTENDED.md` and
  `RUST_UNATTENDED.md`; `master` contains only the reusable mechanism that
  loads those files when explicitly required by the installed environment.
- Each run backs up committed lane tips before launch and again at wind-down.
  Successful disposable worker branches are backed up immediately after the
  worker exits, and branch-local campaign instructions require another backup
  after every verified merge/checkpoint. Concurrent pushes are serialized.
  The destinations are isolated `autonomy/<run-id>/...` refs; unattended jobs
  never update `master` or canonical lane refs on GitHub.
- If a local stash exists, its current object is preserved under a
  content-addressed `autonomy/<run-id>/recovery/stash-*` ref.
- Raw Codex and Claude JSONL remains in each worktree's `.codex-logs/`; journald holds the
  service output and `/var/lib/pokebench-autonomy/runs.log` holds a compact run
  ledger. Pull logs separately with `rsync`; do not commit them.
- `AUTONOMY_END_EPOCH` stops new work after the chosen window and clamps the
  final run so its watchdog winds down before that boundary. A powered-off
  Hetzner server still bills, so delete the VM manually after the Git refs and
  logs have been recovered.

An `OPEN:` entry in a lane's deferred ledger remains a hard boundary: agents
must not guess at or remove it. The unattended policy nevertheless lets later
runs continue independent reversible work. If the deferral blocks every safe
step, the run leaves a clean checkpoint and exits; the next scheduled run may
try again after other lane progress changes the available evidence.

Usage exhaustion is scoped to one invocation. Codex or Claude exits nonzero,
the runner backs up all committed progress, and systemd records that run as a
failure. There is no immediate retry and no cross-provider fallback; the timer
remains active and tries the configured provider again at its next calendar
time in case account usage has reset.

The VM needs no GPU. Model inference remains in OpenAI's cloud. Dedicated CPU,
RAM, and disk are for concurrent TypeScript/Rust builds, mGBA, and worktrees.
The default target is Hetzner `cpx42` in `hel1`: 8 shared x86 vCPUs, 16 GB
RAM, and 320 GB disk. At the 2026-08-30 project price of $0.1314/hour, seven
days are about $22.08 before tax. The service environment caps each Vitest
suite at two forks. The full TypeScript compiler reached about 6.4 GB RSS in
the Linux preflight, so two overlapping supervisors need the 16 GB tier. The
bootstrap also installs an 8 GB swapfile as an OOM guard; it is not intended
as normal working memory. The cheaper 8 GB CPX32 is not safe for the requested
overlap, while the original 32 GB dedicated CCX33 is unnecessary because model
inference is remote.

Run the network-free wrapper checks locally with
`workspace/tools/autonomy/test.sh`.

## Using a lane's maintained launcher

An animation-specific systemd drop-in can select the branch's launcher while
keeping the shared master/Rust service unchanged. Set both `ExecStart` (clear
the inherited command first) to the branch's `tools/autonomy/run-lane.sh animation`
and `Environment=POKEBENCH_SUPERVISOR_WORKSPACE=/absolute/lane/workspace`.
Keep `POKEBENCH_REPO_ROOT` pointing at the primary repository for locks and backups.
The default workspace is still `$POKEBENCH_REPO_ROOT/workspace`. Stop the lane
and timer before updating its branch, verify the branch, run `daemon-reload`,
then restart the lane and its timer. The branch must retain the launcher files.

## Credential boundaries

Use ChatGPT device authorization on the VM, not an API key:

```sh
ssh pokebench@SERVER_IP
codex login --device-auth
codex login status
```

The user completes the browser/device-code step. Do not copy `~/.codex` from
the laptop.

Claude Code is pinned alongside Codex. Authenticate it with the Claude.ai
subscription on the VM, also without an API key:

```sh
ssh pokebench@SERVER_IP
claude auth login
claude auth status --text
```

For SSH login, open the printed URL locally and paste the browser's login code
back into the terminal. Linux stores that credential mode `0600` under
`~/.claude/`. Provider pairs are configured per lane in
`/etc/pokebench-autonomy.env`; supported pairs include `codex/codex`,
`claude/claude`, `claude/codex`, and `codex/claude`.

For GitHub, generate a dedicated key on the VM and grant it write access only
to this repository as a deploy key:

```sh
install -d -m 700 ~/.ssh
ssh-keygen -t ed25519 -N '' -f ~/.ssh/pokebench-github \
  -C 'pokeemerald-factory autonomy runner'
ssh-keyscan github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
```

Add `~/.ssh/pokebench-github.pub` to the repository with write access, verify
`git ls-remote origin`, and revoke the deploy key when the VM is deleted.

## Restore and bootstrap

Create a Git bundle on the laptop so the 335 local-only commits and both lane
branches are present even though `origin/master` is behind:

```sh
git bundle create /tmp/pokeemerald-factory-autonomy.bundle \
  master animation-main rust-main
```

On the VM, create an unprivileged `pokebench` user, restore the bundle as
`/srv/pokebench/pokeemerald-factory-core`, set `origin` back to GitHub, then
run:

```sh
sudo workspace/tools/autonomy/bootstrap-ubuntu.sh \
  pokebench /srv/pokebench/pokeemerald-factory-core
```

The bootstrap pins Node/Codex/Claude Code/Rust, pret/pokeemerald, agbcc, mGBA 0.10.5, and
the Ubuntu `libmgba-py` binding. `versions.env` is the complete receipt.

After ChatGPT and GitHub authentication, run the full canary:

```sh
workspace/tools/autonomy/verify-runner.sh
workspace/run-supervisor.sh --lane animation --supervisor codex \
  --sub-agent codex --cap-hours 0.25 --headless
```

Only then enable the seven-day schedule. `END_EPOCH` is absolute UTC; it is
not extended by reboots:

```sh
END_EPOCH=$(date -u -d '+7 days' +%s)
sudo workspace/tools/autonomy/install-systemd.sh \
  pokebench "$END_EPOCH" 2026-08-animation-week
```

Useful checks:

```sh
systemctl list-timers --all 'pokebench-*'
journalctl -u 'pokebench-supervisor@*' -n 200 --no-pager
systemctl status pokebench-supervisor@animation.service
systemctl start pokebench-supervisor@animation.service
tail -n 40 /var/lib/pokebench-autonomy/runs.log
```

## Return and teardown

Fetch the backup namespace before merging anything:

```sh
git fetch origin 'refs/heads/autonomy/<run-id>/*:refs/remotes/origin/autonomy/<run-id>/*'
git log --oneline master..origin/autonomy/<run-id>/animation-main
git log --oneline master..origin/autonomy/<run-id>/rust-main
```

Copy raw logs while the server still exists:

```sh
rsync -a pokebench@SERVER_IP:/srv/pokebench/pokeemerald-factory-core/workspace/.worktrees/animation-main/workspace/.codex-logs/ ./animation-codex-logs/
rsync -a pokebench@SERVER_IP:/srv/pokebench/pokeemerald-factory-core/workspace/.worktrees/rust-main/workspace/.codex-logs/ ./rust-codex-logs/
ssh pokebench@SERVER_IP 'journalctl -u "pokebench-supervisor@*" --no-pager' > supervisor-journal.log
```

Merge each lane normally after reviewing and rerunning its acceptance tests.
Then remove the GitHub deploy key, delete the Hetzner VM, and remove the
temporary hcloud context/project token if the project is no longer needed.
