# One-week Hetzner autonomy runner

This directory turns a clean Ubuntu 24.04 x86_64 VM into a disposable,
reproducible Animation/Rust runner. It intentionally does not copy the
laptop's `node_modules`, Cargo targets, worktrees, or mGBA build. The bootstrap
reconstructs those machine-local inputs from pinned public sources and refuses
to continue unless the ROM and oracle framebuffer hashes match the laptop.

## Operating shape

- Animation is a single-writer branch. Its timer starts at 00:00, 06:00,
  12:00, and 18:00 UTC with a 5.5-hour cap. A per-lane `flock` makes overlap
  impossible even if a prior run is slow to wind down.
- Rust uses its own branch, worktree, ledger, oracle profile, and lock. It runs
  for up to four hours daily at 03:00 UTC, overlapping Animation when useful.
- Every run pushes committed `master`, `animation-main`, and `rust-main` to
  `autonomy/<run-id>/...`. It never pushes or force-updates the canonical
  branches.
- Raw Codex JSONL remains in each worktree's `.codex-logs/`; journald holds the
  service output and `/var/lib/pokebench-autonomy/runs.log` holds a compact run
  ledger. Pull logs separately with `rsync`; do not commit them.
- `AUTONOMY_END_EPOCH` stops new work after the chosen seven-day window. A
  powered-off Hetzner server still bills, so delete the VM manually after the
  Git refs and logs have been recovered.

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

## Credential boundaries

Use ChatGPT device authorization on the VM, not an API key:

```sh
ssh pokebench@SERVER_IP
codex login --device-auth
codex login status
```

The user completes the browser/device-code step. Do not copy `~/.codex` from
the laptop.

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

The bootstrap pins Node/Codex/Rust, pret/pokeemerald, agbcc, mGBA 0.10.5, and
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
