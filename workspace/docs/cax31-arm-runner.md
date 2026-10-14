# CAX31 ARM runner

The user requested this setup on 2026-10-13. It is a separate validation
runner. The user subsequently authorized the next main session here; see
`cax31-session-handoff.md`. The Mac's last supervisor ended at the 10-hour cap
and stays stopped while the remote main writer runs.

## Host and access

- Server: `pokebench-cax31-20261013`, Hetzner ID `170228874`, Helsinki `hel1`.
- CAX31: 8 shared ARM vCPUs, 16 GB RAM, 160 GB disk; Ubuntu 24.04 aarch64.
- IPv4: `2.29.20.119`. Monthly cap quoted at creation: $25.59 including IPv4,
  before tax, optional backups and AI usage; charged while the server exists.
- User: `pokebench`; existing `pokebench-autonomy-ed25519` SSH key.
- Firewall `11798520` permits SSH and ICMP only. Oracle/preview ports are not
  exposed publicly. Password SSH login is disabled.
- Checkout: `/srv/pokebench/pokeemerald-factory-core/workspace`, branch
  `master` for the assigned session (`codex/cax31-arm-setup` preserves setup);
  game snapshot `b3e988d675cd0d107a906d298bd91e1936d2d24d`.
  The Mac's later charge-turn test re-pins `36b23e98c` are included as
  `f9c90600d`; production game code is unchanged from the initial snapshot.
- The requested remote session uses tmux with a 10-hour cap. No campaign timer
  or automatic push is enabled. The launch checkpoint and saved worker branches
  are pushed from the Mac; preserve/import remote results through local bundles
  before resuming the Mac's main writer.

```sh
ssh pokebench-cax31
```

The local SSH alias selects the existing key and the host's dedicated
known-hosts file. Without the alias, pass
`-i ~/.ssh/pokebench-autonomy-ed25519` to `ssh pokebench@2.29.20.119`.

## Native setup and proof

Setup commit `42bced813` adds native ARM support to the Ubuntu bootstrap.
Node 22.22.3 ARM64 is checked against its published SHA256. Codex 0.160.0,
Claude Code 2.1.280 and Rust 1.97.1 are installed. mGBA 0.10.5 and the pinned
libmgba-py fork are compiled natively, with a generated build-path shim only.
Reference source and ROM/ELF/map hashes remain unchanged; native dependencies
are not restored from the old x86 filesystem archive.

Verification:

- Bootstrap and dependency/version checks passed on aarch64.
- Both oracle profiles reproduce the canonical screen hash
  `9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297` and
  smoke frame 63 hash `6c4b6eb8ff4ea6720fb7f90c761622c101850dad893cb4e112a5911d2aa599ab`.
- The stock-ROM rcp143 R1 battle was run twice fresh on ARM. Its framebuffer,
  parties, complete RNG draw/attribution data and final state match the existing
  committed receipt exactly; the two fresh ARM runs are byte-identical.
- Native reference tools generate map headers, MIDI assembly, graphics and
  sampled sounds with the pinned scanner's conversion flags. All **9,550**
  generated data targets match the Mac byte for byte; the ROM/ELF/map stay intact.
- Local shell syntax and network-free autonomy wrapper checks passed.
- Project preflight passed: typecheck, 448 smoke tests, Rust tests, release
  WebAssembly build and the TS/WASM ABI/RNG smoke checks.

- The full TypeScript run covered 1,716 files / 14,101 cases in 44m49s. Its
  29 failures were the Mac's stale charge-turn pins (4), missing reference
  assets and the omitted GNU tar wrapper. With those fixes, **25 / 25** affected
  files / **174 / 174** cases pass (3m18s). All **13,878** non-skipped cases
  are verified across the full run and affected-file retest; existing skips:
  44 files / 223 cases. No production game code was changed for these fixes.

- Production build passed (typecheck + Vite; Vite phase 27.45s).
Fresh Claude Max login is complete. No-tools inference probes return `READY`
with `is_error=false` for both `claude-opus-5-5` and `claude-sonnet-5-5`.
The earlier Opus request was rejected because Claude Code 2.1.251 was too old;
the required 2.1.280 upgrade resolved it. Codex login is optional for the
current Claude default. Do not copy Mac provider credentials.

Receipts/logs on the VM are under
`workspace/.integration/validation/cax31-arm-20261013/`; bootstrap log:
`/var/log/pokebench-arm-bootstrap.log`. Local provider/host metadata and copied
receipts are kept in the canonical Mac workspace's matching ignored validation
directory. Serialize heavy jobs, use two Vitest workers and four Cargo build
jobs, and retain the 8 GB swap guard.
The full suite used roughly 14 GB resident memory plus 4 GB swap at its peak;
keep one full TypeScript gate at a time on this 16 GB machine. Smaller probe
and smoke checks are much faster than the full suite.

`/etc/pokebench-runner.env` contains the resource limits and CLI paths. Login
shells for `pokebench` load it through `/etc/profile.d/pokebench-runner.sh`.
It also disables Claude's background updater and selects the repository's GNU
tar wrapper so Mac archive metadata is excluded from raw framebuffer inputs.
For noninteractive SSH commands, source the file explicitly:

```sh
source /etc/pokebench-runner.env
cd /srv/pokebench/pokeemerald-factory-core/workspace
```

Ripgrep and tmux are installed. When a run is assigned, launch it inside
tmux so an SSH disconnect does not kill the supervisor. The checkout retains
the existing Opus 5.5 supervisor / Sonnet 5.5 worker defaults. Claude is
authenticated and ready for an assigned run.
