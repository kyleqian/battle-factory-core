# Local Factory workspace

The canonical checkout is `/Users/kyle/Developer/pokebench/pokeemerald-factory-core`,
branch `master`. Work in its `workspace/` directory. The user's 2026-10-02
migration instruction replaces the historical hcloud-only execution policy.
Do not restart remote workers or provision a replacement server.

**User-requested exception, 2026-10-13:** the new CAX31 ARM runner is
set up and validated under `docs/cax31-arm-runner.md`. This does not restore
the old hcloud-only policy or stop the Mac run; the Mac remains canonical.
Remote agent runs/timers require an explicit work assignment after validation.

## Play and develop

The local preview is served at <http://127.0.0.1:5191/> with Battle Scene ON.
After restarting the computer, build and start it with:

```sh
cd /Users/kyle/Developer/pokebench/pokeemerald-factory-core/workspace
bash tools/integration/start-local-preview.sh
```

For hot reload use `npm run dev` (port 5173). The browser app needs neither the
server nor the ROM/oracle at runtime. The current live adapter count is
in `ANIMATION_INTEGRATION_PROGRESS.md` (236 scoped-exact + 13 faithful-random + 27 faithful-timing of 276
accepted Factory bodies, plus Struggle 165 live as the one additional required body, on 2026-10-13; about 99.6 % of move-animation
frames (99.3 % of commands, including Struggle) play live in ordinary play, `docs/live-share-census.md`). The stat-change animation
is live in both scenes and all nine status-condition animations are live in Scene ON (separate general-animation lines).
Helping Hand is the sole unaccepted Factory move, pending legal doubles staging.
Whole-playable arbitrary-history framebuffer exactness remains unclaimed.

The 2026-10-13 user direction includes all remaining Factory animation,
presentation and battle-engine accuracy fixes, including #165 Return ->
Frustration and #141 / #140 / #139. See `docs/factory-finish-scope.md` for the
main-lane authority and gameplay gates. Audio remains deferred.

Resume the current main roadmap stage from this workspace with:

```sh
./run-supervisor.sh
```

The repository supervisor defaults to Claude Opus 5.5 (`claude-opus-5-5`) with
Claude Sonnet 5.5 (`claude-sonnet-5-5`) workers. Use `-S codex` for Codex
`gpt-6.1-sol/high` with the established Terra/Luna/Sol worker routing.
The default is an interactive supervisor with Claude Remote Control;
add `--headless` for unattended execution with streamed output and saved logs.
Both follow `ROADMAP.md` and have a six-hour default cap. `--print-config` checks the selected
profile without starting a run. See `ANIMATION_INTEGRATION_SUPERVISOR.md` for
worker verification, master ownership, preview refresh and local log retention.
Codex CLI 0.160.0 is installed and verified with ChatGPT sign-in for Sol 6.1;
0.146.0 rejected that model. Use `codex update` if restoring an older CLI.

## Validation and reference services

Node 22, dependencies, the native Rust toolchain, and the wasm32 target are
installed locally. Rebuild WASM after Rust changes, then run the normal gates:

```sh
export PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH"
bash core-rs/build-wasm.sh
cargo test --manifest-path core-rs/Cargo.toml
npm run typecheck
PATH="$PWD/tools/autonomy/bin:$PATH" POKEBENCH_VITEST_MAX_WORKERS=4 npm test
npm run build
```

For fresh source comparisons start each oracle in a separate terminal from
the repository root:

```sh
./run-oracle.sh --profile battle-scene-on
./run-oracle.sh --profile battle-scene-off
```

They listen on localhost 8012 and 8014. `workspace/bin/oracle info` checks OFF;
`workspace/bin/oracle --profile battle-scene-on info` checks ON.
The existing `reference/pokeemerald` symlinks resolve to the local vendor
checkout. Preserve its `.gba`, `.elf`, and `.map` together: receipt hashes pin
the archived reference build, including the ELF's debug/build metadata.

## Recovery and history

Private recovery folder: `/Users/kyle/Developer/pokebench/hcloud-archive-20261002`.
Its `README.md` explains restoration; `history/index.html` searches 4,625 raw
Codex/Claude transcripts from the Mac and server. Launcher logs are also copied.
The full server filesystem archive preserves all worktrees, ignored evidence,
temporary source captures, agent configuration/history, and vendor assets.
The archive contains private configuration and is deliberately outside Git.

All 407 server refs are preserved under `refs/archive/hcloud-20261002/` and in
`git/all-refs.bundle`. Pre-migration local refs are in `local-before.bundle`;
the complete retired local worktrees are in `local-worktrees.tar.zst`.

`codex/recovered-physical2-20261002` preserves the interrupted worker's tracked
changes. It is unfinished, unverified work based on an older integration tree;
review its diff before adapting it to master. Experimental native animation
runtime code and local audit research are already merged into master without
adding accepted or playable coverage credit.

Continue from `ANIMATION_INTEGRATION_PROGRESS.md`. Next work is the remaining
live adapters and source graphics ownership across party/switch histories.
Known-entry ordinary party/B-cancel now restores the audited return allocator.
Unknown entry, actual status animations and switches still invalidate history;
summaries, forced replacement and other unmodeled histories remain open.
