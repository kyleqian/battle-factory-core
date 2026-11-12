# Native animation runtime lane

## 2026-09-22 — authorized implementation started on hcloud

User requested reusable animation machinery now, tested on unfinished non-Factory moves, and clarified execution belongs on hcloud. Existing Factory campaign remains independent.

- Branch: codex/animation-runtime-hcloud.
- Starting evidence: ac3d4243e, following initial spike32a72418e.
- Workspace: /srv/pokebench/pokeemerald-factory-core/workspace/.worktrees/animation-runtime/workspace.
- First bounded implementation: full Splash/Mud Sport scripts, reusable task/sprite/resource machinery, new mud particle family, dense bilateral source/transfer evidence and rendering integration toward full pixel acceptance.
- Dispatch: existing tools/run-subagent.sh, one animation-profile Sol/high worker (novel scheduling/OAM integration per repository routing),180-minute cap. Dedicated service pokebench-animation-runtime; no recurring timer and no changes to other services.
- Scope and source notes: NATIVE_ANIMATION_BRIEF.md.
- Status: provisioned; starting the bounded worker immediately after this checkpoint. Worker code will be on the launcher-created child branch until independently reviewed and merged into this isolated parent.
- No production code or move coverage changed by setup.

## 2026-09-22 — first native runtime slice implemented (worker handoff)

- Production executor: `src/animation/nativeAnimationRuntime.ts`, with the old
  spike import retained as a compatibility shim. It now runs the full extracted
  Splash and Mud Sport programs through generic command/callback registries:
  deterministic fixed-slot tasks, task links/data, affine Splash hops, source
  delay rules, synchronous `loadspritegfx`, fixed sprite slots/lifecycle,
  MUD_SAND tile/palette allocation and cleanup, rising/falling dirt callbacks,
  delayed sound tasks, script completion, and prior/current software/hardware
  OBJ buffers. Unsupported commands/resources/templates still fail explicitly.
- Rendering host adapter: `src/animation/nativeAnimationRenderer.ts` maps the
  runtime-owned MUD_SAND 16x16 sprites (tiles 1–4 from the existing asset) into
  the existing `gbaObjCompositor.ts`; it deliberately accepts only the
  runtime-owned OBJ slice and does not freeze or claim ambient sprites.
- Fresh direct-local-mGBA proof, both orientations, repeated byte-identically:
  Splash 116/116 rows each; Mud Sport 233/233 rows each. Every row matches
  script state/args/counters, task slots/links/all data, battler affine/motion,
  resource tables/allocation/cleanup, and all runtime-owned software/hardware
  OBJ transfers. Mud Sport additionally matches all fields/flags/tile/palette
  and lifetimes for 16 particle births (peak 7), ten delayed sound tasks, 13
  emitted sound commands, and all 45 distinct script instructions. Capture
  SHA-256 `ab57db134aad778a486d20cbdedf7ded491a580f83e2137a16a5ef916e120958`;
  receipt SHA-256 `7d399778ab19f84c09f22c8d4775acafba8600da4214abf09039df97081e4814`.
- Retained evidence: `tools/animation/runtime-spike/native-observations.json.gz`,
  `native-receipt.json`, and `native-repeat-receipt.json`. Later observations
  are assertions; only initial state and the explicitly unported audio-host
  busy signal are inputs. Mutation test proves later particle data is not
  consumed as a trajectory.
- Green scoped gates on implementation commit `689d13902`: focused runtime/
  control/sprite-order/compositor/boundary/inventory pack 7 files / 41 tests;
  smoke 8 files / 448 tests; `npm run typecheck`; `npm run animation:coverage`
  (unchanged 266/276 Level 50, 0/77 outside Factory);
  `npm run animation:audit`; `git diff --check`; and `npm run build`. The six
  native-runtime tests also passed inside the complete repository run.
- Full-suite receipt on that commit: 1,385 files / 10,561 tests passed, 25 files
  / 37 tests failed, with no native-runtime failure. The disposable worktree
  initially lacked ignored `artifacts/wasm/factory_wasm.wasm`; after rebuilding
  it with `core-rs/build-wasm.sh`, all ten affected Factory AI parity files pass
  (134/134). The remaining failures are pre-existing committed raw-RGB archives
  containing AppleDouble `._*.rgb` members and two Vitest worker RPC timeouts
  under the one-worker/full-corpus run; both timed-out files pass focused
  (2 files / 17 tests). For example, the committed Spikes blob lists
  `./._00133.rgb` beside `./00133.rgb`, so GNU tar doubles the filtered RGB
  member count and concatenates metadata into the byte stream. This slice does
  not rewrite unrelated accepted-move evidence archives or their readers.
- Honesty boundary: neither move is accepted or promoted. This receipt excludes
  ambient/full OAM (including healthbox subsprites and EnemyShadow), actual
  battleScene/core integration, and dense bilateral framebuffers. Next adapter
  step is to instantiate the runtime from persistent live scene history, merge
  its rasters with ambient scene OBJ/BG state, and pass the repository's twice-
  fresh actual-core full-frame bar before changing coverage. Bone Club/Rush is
  the next graphics-family consumer after that seam, not part of this slice.
- No Factory ledger/coverage files changed.
