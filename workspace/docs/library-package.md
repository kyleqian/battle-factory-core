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
  `containedErrors`. After `challenge-end` the only further event is the one
  `challenge-request` below: one mount is one challenge (the in-game
  new-challenge path stays for the shell and soaks).
- **`challenge-request` (lbr-c, additive; full spec `docs/lbrc-challenge-request.md`).** After `challenge-end`, when the player confirms the save at
  the Lobby attendant (CHALLENGE, LV. 50, YES) the library reports `{ type: "challenge-request", frame }` once, on the first frame of the ROM's
  save dialog, and the game then HOLDS on that frame (input ignored, picture fixed) until the host calls `destroy()`; a host that ignores the event
  leaves a frozen save window, which is the spec. The host prefetches the next server challenge at `challenge-end`, and on `challenge-request`
  destroys the mount and mounts that challenge (it starts at the draft as any mount does). `challenge-end` fires exactly where it did and the trace
  read at it is a prefix of every later read: nothing after the end belongs in the upload, and the event adds no frame to the trace.
  Optional `start: "after-save"` (`FactoryGameOptions`, `ReplayOptions`) starts the mount at "Please step this way." in the Lobby (door walk, fade,
  then a fresh draft) so the cut after `challenge-request` is short; `gameplaySeed` is then the Lobby RNG cursor, and the same `start` must be
  passed to `resume` mounts and `replayChallenge`.
- A forfeit (RUN, then YES on the forfeit box) is a lost battle: `battle-end` with outcome loss and `challenge-end loss` on the same
  tick, and `replayChallenge` reproduces it from the input stream alone (`docs/frf250b-forfeit.md`).
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

## Gamepad

`connectGamepad(game, options?)` (`src/gamepad.ts`, exported from `@pokebench/factory`,
declared in `lib-types/index.d.ts`) is opt-in: the mount never polls a gamepad
(the website owns the input UI). It polls `navigator.getGamepads()` once per
animation frame, maps the W3C Standard Gamepad layout (0 A, 1 B, 4 L, 5 R,
8 SELECT, 9 START, 12-15 d-pad UP/DOWN/LEFT/RIGHT; the left stick past the dead
zone, default 0.5, counts as the d-pad) and calls `game.press` / `game.release`
on edges only, so the trace is what the same presses would have recorded. Only
the first connected pad (lowest index) is read. It returns a disconnect function;
that, or the pad going away, releases everything it pressed. `getGamepads` and
`schedule` options inject the pad source and the frame scheduler for tests. The
dev shell (`src/main.ts`) opts in; `src/headless.ts` does not import it, so
`ENGINE_BUILD` is unaffected. Pinned by `tests/bnd255Gamepad.test.ts`, including
equality of the input stream with direct `press` / `release`.

## Sound (additive API change, aud245)

**For the website: this is an additive change to the contract; nothing existing moves.** `FactoryGameOptions` gains
`audio?: { enabled?: boolean; volume?: number; baseUrl?: string }`, `FactoryGame` gains `setAudio(enabled: boolean): void` and
`getAudio(): FactoryAudioState` (`{ enabled, volume, state: "off" | "loading" | "suspended" | "running" | "closed" | "unsupported" }`),
declared in `lib-types/index.d.ts` and `src/factoryContract.ts`. Omit `audio` and nothing changes: no audio file is requested, no
`AudioContext` exists, no audio code is loaded.

- The player (`src/audio/player.ts`) is its own chunk, `import()`ed by `lib.ts` only when `options.audio` is passed or `setAudio(true)`
  is first called. `dist-lib/index.js` and its static chunks do not reference it or the audio files, and `headless.js` is byte-identical
  (pinned by `tests/audioHeadlessBoundary.test.ts`; `ENGINE_BUILD` did not move).
- Muted by default. Browsers keep an `AudioContext` suspended until a user gesture: the player resumes it on the host page's first
  `pointerdown` / `keydown` / `touchend` / `click`, so wire `setAudio(true)` to a mute-button click. `getAudio().state` reads `suspended`
  until then.
- Files. The package ships them in `dist-lib/audio/` (Ogg Vorbis, plus the AAC `.m4a` Safari fallback, 14.8 MB for both; hashed names), and the
  player chunk references them with `new URL(..., import.meta.url)`, so a consumer's bundler emits them next to its own assets. Nothing
  is fetched until audio is turned on; turning it on fetches ~180 SE files up front (warm-up) and the rest (songs, cries) on first use.
  `baseUrl` instead fetches `${baseUrl}/<file>` and `${baseUrl}/aac/<file>` with the repo's UNHASHED names (`src/assets/gen/audio/`,
  `bgm-354.ogg`, `aac/bgm-354.m4a`); those files are not in the package, so a CDN setup copies them from the repo.
- Format. Ogg Vorbis where the browser can play it, AAC-in-MP4 where it cannot (Safari / iOS older than 18.4), chosen by `canPlayType` and
  re-chosen on an Ogg decode failure. Mac-side encode command and size impact: `docs/aud245-audio-player.md`.
- The sink is write-only: frame hashes, digest and trace are identical with audio on or off
  (`tests/aud245FrameIdentity.test.ts`). Because audio is not in the trace, a `resume` fast-forward is silent and background music
  starts at the next music event.

## Tests

`tests/factoryLibrary.test.ts` drives the real engine with the soak's
`RandomPlayer`: a win then a retire, a lost first battle, the streak across
battles, `gameplaySeed`, resume equality in both scenes (play, split the
trace, resume, continue: identical events, frame hashes and digest), and
the mount loop with a stub canvas (ready, latched taps, trace, chunked and
synchronous resume, the bench ABI). `tests/sha256.test.ts` pins the digest
primitive to node:crypto.

## ENGINE_BUILD

`ENGINE_BUILD` (exported from both entries, reported in every trace's
metadata and by `game.engineBuild`) is how the website decides whether an open
challenge can resume: a trace replays only on the build that played it. It is a
**content hash of the headless build**, not the commit stamp, so a rebuild of
an unchanged engine does not strand open challenges.

- `tools/build/engineBuild.ts` builds `src/headless.ts` in memory (same
  options and `manualChunks` as `vite.headless.config.ts`) with the stamp left
  as a fixed placeholder and hashes every emitted chunk (file name + code,
  sorted). The result, `eb-<16 hex>`, is `define`d as
  `__POKEBENCH_ENGINE_BUILD__` into the app build (`vite.config.ts`), the
  browser-lib build and the headless build, so one tree reports one value
  everywhere. `vite.config.ts` `engineBuildDefine(command)` computes it once
  per build command (~16 s extra).
- It moves exactly when rollup's output of the gameplay + event/digest graph
  moves: engine code, generated data, anything the tree-shaken graph still
  reaches. Docs, tests, tools, the dev shell (`src/main.ts`), renderer-only
  modules and unused exports do not move it. It is independent of the commit,
  the checkout path and the build time. A different vite/rollup version can
  change it (the emitted code changes), which is the safe direction.
- Outside a build (`npm run dev`, vitest) nothing is hashed and
  `ENGINE_BUILD` is `"dev"`.
- Print this tree's value without building: `node --experimental-strip-types
  tools/build/engineBuildCheck.ts`.
- Pinned by `tests/engineBuildHash.test.ts` (fixture project: deterministic,
  path-independent, ignores docs / non-emitted modules, changes with an emitted
  module, `"dev"` fallback, the headless graph never reads the commit stamp).
  Measured on the real tree (2026-10-31): same tree built twice, and after
  editing docs + a test + a tool + `src/main.ts`, gives the same value; a
  one-constant edit in `src/factorySession.ts` changes it; an unused export
  added to a headless-graph module (tree-shaken) does not.

## Built size and consuming the package (measured 2026-10-31)

Every emitted file is under 20 MB raw (Cloudflare's per-file limit is 25 MiB),
raw / gzip, readable (unminified) output:

| Entry | Files | Total | Largest file |
| --- | --- | --- | --- |
| headless (`dist-lib/headless.js` + `chunks-headless/`) | 6 | 10.7 MB / 1.19 MB (bnd256c; was 22.5 MB / 2.14 MB) | `data-battle-script` 3.7 MB / 0.24 MB |
| browser (`dist-lib/index.js` + `chunks/`) | 6 | 40.2 MB / 3.41 MB | `assets-sprites` 14.5 MB / 1.04 MB |

The headless graph no longer carries sprite pixels (bnd256c,
`docs/bnd256c-pixel-provider.md`): the battle sprite sheets are reached through
an installable provider (`src/engine/monPicPixels.ts`), and only the browser
entry installs it (`src/lib.ts` statically imports `monPicPixelsInstall.ts`).
`chunks-headless/` keeps a 1-byte empty `assets-sprites-*.js` stub that nothing
imports. The browser entry is unchanged (its sprite chunk is split in a later
step, `bnd-d`). The tarball (`npm pack`) was 5.4 MB before bnd256c and has not
been re-measured.

A consumer's own bundler concatenates the package's static chunk imports, so a
default Vite build of an app that imports only `mountFactoryGame` emits ONE
33 MB file (importing both entries: 52 MB; headless only: 19 MB; these three
figures predate bnd256c and were not re-measured; headless-only shrinks by the
sprite chunk). Split it in
the consumer's `vite.config` (verified in a scratch app: largest file 12.2 MB):

```js
build: { rollupOptions: { output: { manualChunks(id) {
  const m = /@pokebench\/factory\/dist-lib\/chunks(?:-headless)?\/([a-z-]+?)-[\w-]{8}\.js$/.exec(id);
  return m ? `factory-${m[1]}` : undefined;
} } } }
```

The headless entry runs under plain node (`replayChallenge` of a 500-frame
trace: ~5-10 ms) and is meant for the server; do not ship it to the browser
page that mounts the game (the engine code and data tables would be duplicated).
