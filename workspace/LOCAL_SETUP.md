# Local Factory workspace

The canonical checkout is `/Users/kyle/Developer/pokebench/pokeemerald-factory-core`,
branch `master`. Work in its `workspace/` directory. The user's 2026-10-02
migration instruction replaces the historical hcloud-only execution policy.
Do not restart remote workers or provision a replacement server.

## Play and develop

The local preview is served at <http://127.0.0.1:5191/> with Battle Scene ON.
After restarting the computer, build and start it with:

```sh
cd /Users/kyle/Developer/pokebench/pokeemerald-factory-core/workspace
bash tools/integration/start-local-preview.sh
```

For hot reload use `npm run dev` (port 5173). The browser app needs neither the
server nor the ROM/oracle at runtime. There are 74 live move adapters; the
276 accepted Factory animation bodies include 202 still needing integration.
Helping Hand is the sole unaccepted Factory move, pending legal doubles staging.
Whole-playable arbitrary-history framebuffer exactness remains unclaimed.

Resume supervised integration from this workspace with:

```sh
./run-supervisor.sh --lane integration --headless
```

The repository supervisor defaults to Codex `gpt-6.1-sol/high`; workers retain
the established Terra/Luna/Sol routing. Omit `--headless` for an interactive
supervisor. The default cap is six hours. `--print-config` checks the selected
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
Party entry now invalidates the bounded palette-history claim even on cancel;
implementing the complete returning palette allocator remains separate work.
