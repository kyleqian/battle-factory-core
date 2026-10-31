# The game as a library: `@pokebench/factory`

The website (`factory-web`, a separate repo) consumes this workspace as an
npm package built to contract v2 (`docs/finish-plan.md`, Phase 3). The core
knows nothing about accounts or servers: a challenge is its seeds plus its
input trace, and the website keeps the trace.

## Entries

| Entry | Source | Build | What it is |
| --- | --- | --- | --- |
| `@pokebench/factory` | `src/lib.ts` | `vite.lib.config.ts` → `dist-lib/index.js` + `dist-lib/chunks/*` | `mountFactoryGame(options)`: the 240x160 canvas game (fixed-timestep loop, input trace, resume, events) |
| `@pokebench/factory/headless` | `src/headless.ts` | `vite.headless.config.ts` → `dist-lib/headless.js` + `dist-lib/chunks-headless/*` | `replayChallenge(options)`: seeds + trace in, outcome + digest out; no DOM, no canvas |

`npm run build:lib` runs both builds and copies `lib-types/*.d.ts` (the
hand-maintained declarations of `src/factoryContract.ts`) into `dist-lib/`.
`package.json` has `exports` for `.` and `./headless`, `files: ["dist-lib"]`;
`npm pack` yields the installable tarball. The website pins it as a `file:`
dependency on this workspace.

The headless entry is built in its own rollup graph so the renderer and the
pixel assets tree-shake away. `src/engine/liveMovePaletteComposite.ts` is on
the tick path and used to import the two full battle sprite tables for their
palettes alone; it now reads `src/assets/gen/battle-sprite-palettes.json`
(`npm run extract:battle-sprite-palettes`, pinned by
`tests/battleSpritePalettes.test.ts`).

## Pieces

- `src/factoryContract.ts`: the public types (`GbaButton`, `TraceSegment`,
  `FactoryEvent`, `FactoryGameOptions`, `FactoryGame`, `ReplayResult`).
- `src/factorySession.ts`: the DOM-free session both entries and the dev
  shell share: engine state, `SessionRecorder`, event detection, the
  kernel-events digest (`src/engine/sha256.ts`, the same bytes the census
  tools hash with node:crypto), contained-error bookkeeping, `toTrace()`.
- `src/lib.ts`: `mountFactoryGame` (contract) and `mountFactoryGameInternal`
  (adds the bench ABI: `advance`, `reset`, `sessionTrace`, `containedErrors`,
  `onCrash`, `resumeSync`).
- `src/main.ts`: the dev shell. `__POKEBENCH__`, `?battleScene=`,
  `?pokebench=1`, `?presentationSeed=`, the crash overlay and
  `__POKEBENCH_SESSION__` behave exactly as before; it only wires the
  keyboard and the ABI to the library.

## Semantics

- `gameplaySeed` (u32) is the `gRngValue` the fresh challenge-0 draft is
  generated from (the soak's `--vary-rng` path, `createChallengeState`);
  absent = the pinned ROM anchor draft (`createInitialState`).
- `presentationSeed` is the presentation-only Random2 seed (docs/presentation-rng.md).
- Events come from the engine state after each tick: `battle-end` when the
  round's `lastBattle` changes (streak = carried wins + `battleIndex`, +1 on
  a win: the Factory streak as the ROM counts it); `round-end` when the phase
  reaches `roundComplete`; `challenge-end loss` at `roundLost`;
  `challenge-end retire` when the Lobby free-roam begins without a lost
  battle (RETIRE + YES at the attendant); `contained-error` mirrors
  `containedErrors`. After `challenge-end` nothing more is reported: one
  mount is one challenge (the in-game new-challenge path stays for the shell
  and soaks).
- `resume` ticks the given runs without drawing (spread over animation
  frames, ~12 ms each; `resumeSync` for tests), preloads them verbatim into
  the recorder, then emits `ready`. `trace(fromSegment)` returns the runs
  from that index, so a host that uploaded `n` runs asks for `trace(n)`.
- A run's `t` (ms since mount at its first frame) is informational; replays
  and `toTrace()` ignore it.
- `replayChallenge` ticks the same engine headlessly and returns the same
  `battles` / `streak` / `ended` plus `digest`: sha256 over each battle
  resolution segment's kernel events in order, hex, 16 chars, exactly what
  `tools/integration/*Census.ts` compute.

## Tests

`tests/factoryLibrary.test.ts` drives the real engine with the soak's
`RandomPlayer`: a win then a retire, a lost first battle, the streak across
battles, `gameplaySeed`, resume equality in both scenes (play, split the
trace, resume, continue: identical events, frame hashes and digest), and
the mount loop with a stub canvas (ready, latched taps, trace, chunked and
synchronous resume, the bench ABI). `tests/sha256.test.ts` pins the digest
primitive to node:crypto.
