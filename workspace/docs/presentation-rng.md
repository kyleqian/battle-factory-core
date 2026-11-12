# Presentation Random2 stream (D3 infrastructure)

S10A integration, 2026-10-06. This implements the design in `docs/random2-trackability.md` §7.
That design is D3 option (a), which the user approved on 2026-10-06 (see
`ANIMATION_INTEGRATION_SUPERVISOR.md` "Approved Random2 implementation" and
`ANIMATION_VERIFICATION.md` "Random2 live integration"). This step adds infrastructure only.
**No Random2 adapter consumes the stream yet**, and production pixels are unchanged
(see "Proof" below).

## What it reproduces, and what it does not

- Source law: `Random2()` steps ISO_RANDOMIZE1 on its own word `gRng2Value` and returns
  `value >> 16` (`reference/pokeemerald/src/random.c:29-33`, `include/random.h:16`).
  `src/engine/presentationRng.ts` uses exact u32 arithmetic (`Math.imul`, `>>> 0`). Its
  jump-ahead squares the affine map in O(log n), as `random2StrictChain.py:lcg_n` does.
- In the ROM, `gRng2Value` advances once per main-loop iteration through
  `RfuMain1` (`link_rfu_2.c:2023`), plus each animation's explicit draws. On a draw frame,
  `RfuMain1`'s step comes first and the body's draws follow in source order
  (`random2-trackability.md` §1).
- The ROM skips that step on **lag frames**. Production cannot predict lag between bodies:
  the same visible content costs 3 or 4 lag frames at action selection (§0, §3). This policy
  deliberately has **no lag model**, so surrogate words are faithful random and never
  oracle-exact.
- Gameplay RNG (`gRngValue`, `EngineState.rngValue`, the battle `rng`) is never read,
  consumed, reseeded or used as a seed source.

## Policy `presentation-rng.v1.frame-step.no-lag.battle-stride-2^20`

`PRESENTATION_RNG_POLICY_V1` (`src/engine/presentationRngHost.ts:26`). Session exports
record this id, so a future policy can change any rule below without silently changing
old replays.

- **Session seed**: a u32 chosen once per browser session (`src/main.ts:31`):
  - The URL parameter `presentationSeed=<1-8 hex digits>` pins the seed.
  - Under `?pokebench=1` (the `__POKEBENCH__` ABI) without that parameter, the seed is the
    default below, so bench runs stay deterministic.
  - Ordinary play draws the seed from `crypto.getRandomValues`.
  - `reset()` keeps the session seed.
- **Default seed**: `DEFAULT_PRESENTATION_RNG_SEED = 0x808DB3EB`. This is the canonical
  anchor `gRng2Value`, which is the same with Scene ON and Scene OFF (`random2-trackability.md` §1).
- **Per-battle seed**: `presentationRngBattleSeed(seed, n) = jump(seed, n * 2^20)`, where
  `n` is the 0-based ordinal of the battle within the session (`presentationRngHost.ts:44`).
  - This is a later window of the same Random2 sequence. It overlaps the next battle's
    window only if one battle presents more than 2^20 frames (about 4.9 h).
  - The ordinal counts battle starts the seam has seen. The seam detects a new battle when
    the orchestrator's `activeBattleCallStart` identity changes. That edge is the only input
    taken from the logical state, and it never feeds the seed value.
- **Per-frame advance**: `tick` (`src/engine/core.ts:964`) runs the logical frame, then
  `tickPresentationRngSession` (`presentationRngHost.ts:232`) updates the stream:
  - When a new battle starts, the host is seeded and does not step on that frame.
  - On each later presented battle frame, the host steps once (the `RfuMain1` step), plus the
    draws of any activated body that are due on that frame.
  - With no battle on screen, the host is dropped.
  - The stream advances the same way with Scene ON and Scene OFF. Rendering never advances
    it, and `render` takes no host input that could draw.
- **Ownership**: `EngineState.presentationRng` (`core.ts:858`) is a top-level,
  presentation-only field.
  - It sits outside `factoryRoundBattleOrchestrator`, battle state, RNG state, rules and
    facility state.
  - Parity comparisons exclude it. They compare battle `rng`, `rulesContext` (except
    `hitMarker` 0x80), boundary, facility state and `rngValue`.

## Draw-plan API (for the next, adapter step)

All functions are pure and return frozen values (`presentationRngHost.ts`):

- `presentationRngPlanWords(activationState, plan)` (`:85`).
  - `activationState` is the stream state at the body's activation frame, after that
    frame's own step.
  - `plan` lists the source draw sites in order, as `{ ageOffset, count }`. `ageOffset`
    values must not decrease, and two entries may share a frame.
  - For each entry, the function steps `ageOffset - previousAge` frames, then draws `count`
    words.
  - It returns `{ provenance, activationValue, plan, words, draws, valueAfter }`. `words`
    lists every word in source order, and `draws` groups them by plan entry.
  - Example: the accepted Double Kick uses `[{ageOffset: 10, count: 4}]` from the receipt
    value `0x8C5713A0`. The result is `[46625, 58366, 21952, 56639]`, which is the pinned
    `fistRandom`.
- `activatePresentationRngBody(host, key, plan)` (`:177`) is called in tick, on the
  activation frame.
  - It computes the words from the host's current state.
  - It schedules the body's draws into the stream on their draw frames. Draws at
    `ageOffset 0` are consumed immediately, after the frame's step.
  - Each key is consumed **exactly once**: activating the same key again returns the
    recorded words and leaves the host unchanged.
- `presentationRngBodyWords(host, key)` (`:167`) is a read-only lookup for render, so a
  repaint cannot draw.
- `createPresentationRngHostAt(createPresentationRngState(value, "pinned"))` builds the host
  that staged scenarios use with an oracle-pinned activation value.
- Provenance (`'pinned' | 'surrogate'`) is carried on the state and copied into every words
  record. Session-seeded hosts are `surrogate`.
- Known approximation: the words are a pure function of the activation state. If two bodies
  overlap and the earlier one's draws fall between the later one's activation and draws,
  the ROM would interleave them. The surrogate does not. That is acceptable for faithful
  random, and pinned proofs use single bodies.

## General_Rain sub-stream (S10A words46, supervisor decision 2026-10-09)

`RAIN_CONTINUES` (General_Rain, `battle_anim_scripts.s`) draws 80 Random2 words: 20 spawns at ages 17 + 3k, 4 words each
(`GENERAL_RAIN_RANDOM2_PLAN`, `liveMovePresentationRng.ts`; RAM-measured in docs/next-adapters-prep46.md §1). No live adapter
renders it; only the sprite-order carry after it reads the words (`liveWordsUnitPostFree`, `liveMoveAnimation.ts`).

- **Non-consuming per-event read.** `recordPresentationRngSubStream(host, key, plan)` (`presentationRngHost.ts`) records
  `presentationRngPlanWords(host.state, plan)` under `general:<request>:<segment>:<event sequence>` and schedules nothing.
  The words follow the source law inside the animation (per-frame step, then the draws in source order) from the stream state
  at its activation.
- **Anchor.** The general animation has no presentation command. The tick seam (`tickLiveMovePresentationRngSession`) records
  it when the first command at or after its event starts presenting (phase `presenting`, `phaseElapsed` 0). Exactly once per key;
  re-ticks and repaints never draw.
- **Documented deviation (D3 "draw order/count").** The shared stream is **not** advanced by those 80 draws, so after every rain
  continue the stream is 80 steps short of the ROM's step count. Surrogate activation values are not oracle-synchronized anyway
  (`random2-trackability.md` §0). Every existing faithful-random output and every legacy session export is byte-identical
  (`tests/wordsOrderDeferredLend.test.ts`: 40/40 schedules, 320 move bodies, every stream state identical). The law-faithful
  consuming read would move 240 of those 320 bodies and needs a policy version bump; it is out of scope.
- **No policy bump.** `PRESENTATION_RNG_POLICY_V1` is unchanged.

## Words-order history accounting (D3)

A consumer whose sprite-order lend resolved through a Random2-words unit's deferred marker (Sand-Attack 28, Mud-Slap 189,
Rain Dance 240, RAIN_CONTINUES; docs/next-adapters-prep46.md) has an order that depends on that unit's **surrogate** words. That
command is a **faithful-random** claim, even when its adapter is scoped exact:

- `liveMoveAnimationPresentation` returns `faithfulRandomHistory: true` when the adapter read the resolved lend. An adapter that
  never reads the lend (for example Slam) keeps its scoped-exact claim.
- Adapter counts (245 + 13 + 18) do not change. The claim is per command. `tools/integration/liveShareCensus.ts` counts these
  commands and frames as `overall.faithfulRandomHistory` (docs/live-share-census.md).
- Pinned-word proofs (`tools/integration/fixtures/words46-live-receipt.json`) establish the controlled consumer windows only.

## Session export, replay and reset

- `SessionTrace.presentationRng = { seed: "<8 hex digits>", policy: "<policy id>" }` is
  separate metadata (`src/sessionRecorder.ts`, written by `src/main.ts` through
  `presentationRngTraceMetadata`).
- `presentationRngFromTrace(trace)` (`presentationRngHost.ts:274`) returns the trace's own
  seed and policy. It rejects malformed seeds and unknown policies. **Legacy exports without
  the field** replay on the default seed `0x808DB3EB` with policy v1.
- The following readers honour the field:
  - `tools/compare/appTrace.ts` (`renderAppTrace`, and therefore `compare` and
    `compare:differential`)
  - `tools/replay-session-trace.ts`
  - `tools/integration/playableAnimationReplay.ts`, which also exports it
  - `tools/integration/browserPreviewReplay.mjs`, which passes `presentationSeed` and checks
    that the browser export round-trips the field
- `stripAppTraceMetadata` removes the field before a trace goes to the ROM oracle.
- Replaying an export reproduces the same `EngineState` (host included) and the same
  pixels. Reset with the same seed reproduces the same stream.

## Claim meaning and accounting

`docs/animation-integration-live-status.json`:

- `implementedCount` still counts the scoped-exact live adapters. It stays at 218.
- `faithfulRandomCount` (0) and `faithfulRandomAdapters` (`[]`) form a **disjoint** bucket.
- `faithfulRandomClaim` holds:
  - the policy id
  - the entry fields: `id`, `move`, `policy`, `provenance`, `pinnedProofs`, `surrogateRoutes`
  - the D3 boundary: surrogate frames are "faithful random", never oracle-exact;
    pinned-word proofs establish controlled bodies only.
- Faithful-random adapters add no exact coverage, no `implementedCount` and no Factory
  acceptance.
- The preview manifest (`tools/integration/start-local-preview.sh`) reports
  `faithfulRandomAdapters` separately from `adapters`.
- `tests/liveStatusImplementedCount.test.ts` and
  `tests/animation/factoryAnimationInventory.test.ts` pin both counts and that the buckets
  are disjoint.

## Proof (this step)

- Tier-1 tests in `tests/presentationRng.test.ts`:
  - the LCG against a BigInt reference
  - jump-ahead against repeated steps, including the full period
  - the receipt per-frame step sequence
  - all 102 lab runs' end values
  - the accepted Double Kick words
  - the lab Double Kick ×2, Astonish (2 droplets × 2) and Mud-Slap (6 waves × 10) vectors
  - purity
  - exactly-once consumption
  - provenance
- Tier-1 tests in `tests/presentationRngSession.test.ts`:
  - seeding and per-frame stepping on the ordinary playable route
  - identical logical state and RNG for two presentation seeds, and for Scene ON vs OFF
  - repaint purity
  - export, replay and legacy-default round-trip
  - the recorder field, ROM stripping, and `appTrace` honouring the field
- `compare:differential --base c1fe6ced1` passes, byte-identical, on:
  - `fight-submenu`
  - `turn15-sendout-rung5`
  - `battle1-postwin-next-prompt`
  - `presentation-rng-playable-live-bodies-on`
  - `presentation-rng-playable-live-bodies-seeded-on`
- `tools/integration/presentationRngTraces.ts` regenerates the last two traces.

## Left for the adapter step

- Wiring Random2 adapters: Flail, Double Kick, Astonish, Thrash, Luster Purge, then
  Mud-Slap / Sand Attack.
- Each adapter's source draw plan and value transformations.
- Pinned controlled-body proofs through the production renderer.
- Surrogate route tests through cleanup.
- Populating `faithfulRandomAdapters`.
