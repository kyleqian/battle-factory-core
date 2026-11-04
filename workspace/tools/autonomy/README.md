# Linux runner bootstrap

This directory turns a clean Ubuntu 24.04 x86_64 or aarch64 VM into a
reproducible Claude runner. It intentionally does not copy the laptop's
`node_modules`, Cargo targets, worktrees, or mGBA build. The bootstrap
reconstructs those machine-local inputs from pinned public sources and refuses
to continue unless the ROM and oracle framebuffer hashes match the laptop.

The unattended-campaign machinery that used to live here (the animation/rust
lane runner `run-lane.sh`, the systemd units and installer, `backup-refs.sh`,
`autonomy.env.example`, and the wrapper test) was removed in cln239; see
`docs/cln239-launchers.md`. Recover any of it with
`git checkout <cln239-parent> -- tools/autonomy/<file>`.

## CAX31 runner — 2026-10-13

See `docs/cax31-arm-runner.md` for the runner's status and validation receipt.
The Mac checkout remains canonical; this is a separate validation runner. No
timers, automatic pushes or duplicate supervisor runs are enabled by the setup.
Authenticate Claude Code freshly on this machine.

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
guard.

Keep `workspace/tools/autonomy/bin` first in the runner's `PATH`; its GNU tar
wrapper excludes Mac resource-fork metadata from framebuffer evidence archives.

## Credentials

Authenticate Claude Code with the Claude.ai subscription on the VM, without an
API key:

```sh
ssh pokebench@SERVER_IP
claude auth login
claude auth status --text
```

For SSH login, open the printed URL locally and paste the browser's login code
back into the terminal. Linux stores that credential mode `0600` under
`~/.claude/`.

For GitHub, generate a dedicated key on the VM and grant it write access only
to this repository as a deploy key:

```sh
install -d -m 700 ~/.ssh
ssh-keygen -t ed25519 -N '' -f ~/.ssh/pokebench-github \
  -C 'pokeemerald-factory runner'
ssh-keyscan github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
```

Add `~/.ssh/pokebench-github.pub` to the repository with write access, verify
`git ls-remote origin`, and revoke the deploy key when the VM is deleted.

## Bootstrap and verify

On the VM, create an unprivileged `pokebench` user, restore the repository as
`/srv/pokebench/pokeemerald-factory-core`, set `origin` back to GitHub, then run:

```sh
sudo workspace/tools/autonomy/bootstrap-ubuntu.sh \
  pokebench /srv/pokebench/pokeemerald-factory-core
```

The bootstrap pins Node, Claude Code, Rust, pret/pokeemerald, agbcc, mGBA
0.10.5, and the Ubuntu `libmgba-py` binding. `versions.env` is the complete
receipt. After Claude and GitHub authentication, run the canary:

```sh
workspace/tools/autonomy/verify-runner.sh
workspace/run-supervisor.sh --print-config
```

Usage exhaustion is scoped to one invocation: the supervisor or worker exits
nonzero (workers exit 42) and nothing retries automatically. Raw logs stay in
the worktree's `.codex-logs/` (a historical directory name kept for the cron);
pull them with `rsync` and do not commit them. A powered-off Hetzner server
still bills, so delete the VM manually after the Git refs and logs have been
recovered.
