# Finish plan — approved by the user 2026-10-26

The mission for every run until its definition of done is met. Written after
a top-layer audit of master `5d6f7d521`. Timing exactness is demoted to a
long-tail lane; what players notice comes first.

## Status 2026-10-31 (user re-aim)

Phases 1 and 2 are **met** after five runs (soakscene208 .. cff232):
Scene ON census 0..999 static 0 (approximate ~206, live ~26,960); player back
send-out, intro send-outs, faint-replacement send-in, Castform forms and the
weather side (#157) drawn; nightly browser play + soaks clean every night.
Definition-of-done item 3 is accepted at the host's real throughput (Scene ON
`--render-every 8` 0:30 + a `--render-every 1` sample + 10 min browser play
per scene, nightly) instead of 3,000 battles. From here every run works
**Phase 3 and Cleanup**, alternating; the remaining #146 / bso226 lines are
timing residuals. See ROADMAP "Current execution priority — 2026-10-31".

## Decisions made 2026-10-26 (no further permission needed)

- **Approximate claim class.** Beside exact, faithful-random (D3) and
  faithful-timing (D4), adapters may draw a body with the best available
  inputs when the exact inputs are not ROM-proven, and the command is
  reported as *approximate*. Define it in `ANIMATION_VERIFICATION.md` and the
  census before the first promotion. Exact / faithful counts never move for
  this work; approximate is always reported separately.
- **Crashes first.** Scene ON soaks with rendering on, nightly, and in-app
  containment for presentation throws.
- **Cleanup is authorized**, one reversible commit per step, each verified by
  typecheck + full suite + build. Git history is never rewritten.
- **Timing residuals** (frame slips, pause lengths) are recorded in ISSUES and
  worked only when everything above is done or a worker is otherwise idle.
- **Daily runs** are scheduled (handoff). Commit locally; pushing is the user's.

## What the audit found

**Gameplay is done.** Damage, AI, RNG, turn order and the round loop match the
ROM; kernel digests have been identical in every census since Oct 14. The two
remaining engine entries (#109, #114) are unreachable in singles.

**Animations not playing is a policy, not missing code.** Scene ON census
(Oct 13, seeds 0..999, 27,261 move animations): 177 fell back (0.65 %).
`.integration/validation/chg161/census-on-head/merged.json` on the Mac:

| commands | reason | gate |
|---|---|---|
| 74 | Substitute doll variants not ROM-proven | `liveSubstituteSwap.ts:84-135` |
| 51 | sprite-order / allocator history "unknown" (mostly Hyper Beam player side) | 64 `spriteOrderInput?.known` sites in `liveMoveAnimation.ts` |
| ~20 | Castform in a weather form | `liveCastformFormDeclineReason` |
| 12 | Endeavor stale move power unknown | `liveMoveAnimation.ts:2216` |
| 12 | no adapter case at all | `liveMoveAnimation.ts:1564` |
| 7 | "unsupported turn 0" | `:1540` |
| 3 | hidden target lag phase | `liveMoveHiddenTargetDeclines` |

Every one of these has a body in `src/animation/`. On decline the renderer
holds the **static field for the full animation length**
(`battleResolutionPresentationRender.ts:1295`; Hyper Beam ≈ 185 blank frames).
There is no best-effort path (`battleResolutionPresentation.ts:4501`).

Also visible and not a gating matter: the player's back send-out animation is
not drawn in Scene ON (every send-in, #146); battle-start intro send-outs;
weather-continues animations may play on the wrong battler (#157).

**Crash hunting has a blind spot.** `tools/soak/` runs Scene OFF only
(`randomRoundSoakDriver.ts:2760`, `core.ts:935` default) and renders every 8th
frame; the fifth gate never renders. The Scene ON renderer (≈39k lines of
`battleScene.ts`) has never been under a randomized soak. `src/engine` holds
1,756 `throw new Error` guards and `src/animation` 728; in the browser any one
ends the game with the crash overlay (`main.ts:155-175`). No tool drives the
built bundle randomly (`browserPreviewReplay.mjs` replays one fixed trace).

**Production shape.** Static site; no server, ROM or WASM at runtime. One
32.6 MB JS chunk (3 MB gzipped). 81 files / 62 MB of `src/data/gen` are read
only by tests. No title screen, keyboard only, no save, stale page title, no
deploy config, no audio. The bundle ships Nintendo-derived art (user's call on
how public it goes).

**Cruft.** `tools/` 30,908 files / 22.7 M lines, of which 1,223 scripts are
one-off step scripts and 22,090 are fixture JSON; 30 root ledgers / 87 k
lines; `docs/` 734 files; `core-rs/` 3.76 M lines (3.52 M generated), parked
since Sep 12 and unused by the app; ~4,300 lines of Codex / DeepSeek /
OpenCode orchestration; 48-minute test suite (1,735 files); 62 stale
`worker/*` refs; live-status JSON `pending` was stale.

## Definition of done

1. Load the site and play rounds indefinitely with Battle Scene ON.
2. Every move shows its animation; no static-field holds in the census.
3. 0 CRASH / 0 HANG over 3,000 random battles per scene with rendering on,
   repeated nightly.
4. Player send-out, intro send-outs, Castform forms and weather side fixed.
5. Timing residuals logged, not blocking.

## Phases

### Phase 0 — Re-aim (done 2026-10-26 by the top layer)
Roadmap priority, this plan, the handoff, AGENTS / LOCAL_SETUP notes, the
status JSON `pending` list. tl206 (timing re-pins on
`worker/integration-20261023-080938`): fold if its full suite + build are
green on one try, else park with a note.

### Phase 1 — Crash hardening (2–3 runs, then nightly forever)
- `tools/soak`: add `--scene on|off|both` and honour `--render-every 1` for
  the ON renderer; run vanilla 0:20 ON first, then full / winning /
  winning-swap with `--vary-rng`, bounded to free memory. Fix every CRASH /
  HANG by source rule. Keep the Scene OFF gates.
- Containment: a throw raised while computing or drawing a presentation
  command degrades that command to the pause, logs the error with the session
  trace (`__POKEBENCH_SESSION__`), and the battle continues. Gameplay-state
  throws keep the overlay. Tests pin both behaviours.
- Playwright random play against the built bundle (10 min, both scenes),
  collecting `pageerror`, in the same nightly set.

### Phase 2 — Every animation plays (3–4 runs)
- Approximate class contract, then promote by census weight: Substitute doll
  cells (74), order / allocator unknown (51), Castform (~20), Endeavor (12),
  turn 0 (7), hidden target (3). The 12 "no adapter" cases get adapters.
- Player back send-out + intro send-outs drawn in Scene ON; weather-continues
  takes battler 0 at the seam (#157).
- Acceptance: Scene ON census 0..999 with **0 commands on the static-field
  path**; a PNG strip per formerly-declined class committed under
  `tools/integration/fixtures/approximate/` and eyeballed once; differential
  gates; full suite + build.

### Phase 3 — Production (revised 2026-10-31: core library + website split)

**Decision (user, 2026-10-31):** the game is an independent library; a
separate repo (`factory-web`, Cloudflare Workers + D1, built from the Mac)
owns login, streak storage, title / menu UI, the on-screen pad and hosting.
The core knows nothing about accounts or servers. Title screen, `localStorage`
streak and the static-host config are therefore **not** core work any more.

**Core library API — the first production step.** New `src/lib.ts`, built as a
library (Vite lib mode, `dist-lib/`, `package.json` `name` `@pokebench/factory`
with `exports` + `types`); `src/main.ts` becomes a thin dev shell over it
(the `__POKEBENCH__` test ABI, `?battleScene=`, `?pokebench=1`,
`?presentationSeed=`, the crash overlay and `__POKEBENCH_SESSION__` all
unchanged — every existing browser test and tool keeps working). The website
is being built against this exact contract, so keep the names:

**Contract v2 (2026-10-31, after the anti-cheat design):** there is no
opaque save blob. A challenge is fully determined by its seeds and its input
trace, so *resume* = replay the trace (tick without drawing, ~0.015 ms per
frame), and the website keeps the trace server-side. This drops the
snapshot / restore work entirely and is what server-side verification needs.

```ts
// @pokebench/factory  (src/lib.ts — browser entry)
export type GbaButton = "A" | "B" | "START" | "SELECT" | "UP" | "DOWN" | "LEFT" | "RIGHT" | "L" | "R";
export interface TraceSegment { frames: number; buttons: GbaButton[]; t?: number }
  // the SessionRecorder's RLE runs; `t` = wall-clock ms since mount at the run's first frame
  // (optional, written by the library, ignored by every existing tool and test)
export interface FactoryGameOptions {
  canvas: HTMLCanvasElement;          // 240x160; the host page scales it
  battleScene: "on" | "off";
  gameplaySeed?: number;              // u32 RNG start (what --vary-rng sets); default = the ROM anchor's state
  presentationSeed?: number;
  resume?: TraceSegment[];            // fast-forward through these before the player gets control
  onEvent?: (event: FactoryEvent) => void;
}
export type FactoryEvent =
  | { type: "ready"; frame: number }                                            // after any resume
  | { type: "battle-end"; result: "win" | "loss"; streak: number; frame: number }
  | { type: "round-end"; streak: number; frame: number }                        // 7 wins
  | { type: "challenge-end"; reason: "loss" | "retire"; streak: number; frame: number }
  | { type: "contained-error"; message: string; frame: number };
export interface FactoryGame {
  readonly engine: string;            // build stamp of this package
  readonly frame: number;
  press(button: GbaButton): void;     // for an on-screen pad / gamepad
  release(button: GbaButton): void;
  trace(fromSegment?: number): TraceSegment[];   // the input trace so far (RLE), optionally a tail
  destroy(): void;
}
export function mountFactoryGame(options: FactoryGameOptions): FactoryGame;

// @pokebench/factory/headless  (src/headless.ts — no canvas, no DOM, no sprite / tile assets)
export interface ReplayResult {
  frames: number; streak: number; ended: "loss" | "retire" | null;
  battles: Array<{ result: "win" | "loss"; streak: number; frame: number }>;
  digest: string;                     // the kernel events digest the census already computes
}
export function replayChallenge(options: {
  battleScene: "on" | "off"; gameplaySeed?: number; presentationSeed?: number; segments: TraceSegment[];
}): ReplayResult;
export const ENGINE_BUILD: string;
```

Rules: one mount = one challenge (after `challenge-end` the host remounts
with a new seed; the in-game Lobby new-challenge path stays for the dev
shell and soaks). `streak` is the Factory's win streak as the ROM counts it.
Events come from the kernel's existing semantic events; `contained-error`
mirrors `containedErrors`. `resume` must reproduce the uninterrupted run
exactly (test: play N frames, mount again with the trace, compare frame
hashes and the digest with the uninterrupted run, both scenes). The headless
entry's import graph must not include the renderer's pixel assets — report
its built size (target: under 10 MB compressed so a Cloudflare Worker can
run it; if the presentation timing needs the animation code, that is fine,
only the sprite / tile data must stay out).
Acceptance: typecheck, new Tier-1 tests (mount / events / resume equality /
`replayChallenge` == the browser run's events and digest), full suite +
build, `npm run play:random` both scenes, and `npm pack` yields a package a
scratch Vite app can import (both entries).

- Then bundle hygiene: test-only JSON out of `src/` (tests import from
  `tests/fixtures/data/`); lazy-load sprite sheets and large tables; gamepad
  input through `press` / `release`; "copy trace" stays behind a key.
- User decisions, not blocking: public vs unlisted (the website's `noindex`
  stays until decided); custom domain.

### Audio (S11) — re-opened by the user 2026-10-31

Sound effects, cries, fanfares and music across the draft, battle, swap and
ending flows, with the same evidence discipline as the animations:

1. **Design step (one worker, docs only):** read the S11 roadmap entry and
   `docs/issue55-*audio*` / `docs/soundproof-off-evidence.md`; propose the
   oracle hook (mGBA breakpoints on `PlaySE`, `PlayCry_*`, `PlayBGM`,
   `PlayFanfare`, `m4aSongNumStart` from the pinned ELF / map) that logs
   `(frame, kind, id, pan)` per sound; the kernel-side event list (today:
   `play-se` / `play-fanfare` / `play-faint-cry`); the asset plan (record each
   cry / SE / BGM / fanfare once from mGBA to OGG under
   `src/assets/gen/audio/`, loops with their ROM loop points); and the
   playback layer (`src/audio/` behind a `FactoryGameOptions.audio` flag,
   WebAudio, off by default in tools and tests). The supervisor accepts the
   design before any src change.
2. **Sound-event parity by census:** our engine emits every sound event the
   ROM does at the same frame for the census seeds (a `(frame, kind, id)`
   column next to the animation census); misses become fix steps like
   animation declines did.
3. **Playback** (user 2026-11-11: start now, in parallel with step 2's
   remaining parity work; missing events stay silent until filled): the recorded assets play on the events; a muted default,
   a user-facing toggle through the library API, no pixel change anywhere
   (frame hashes identical with audio on and off).

Acceptance: census 0..999 with 0 missing / 0 extra sound events in both
scenes, both players' audio RAM probes still byte-pinned where the animation
lane already pins them, full suite + build, soaks unchanged.

### Cleanup (2–3 runs, interleaved; one commit per step)
1. Delete step-id one-off scripts in `tools/integration` and `tools/compare`
   plus the fixtures only they read. Keep: census, soak, compare, differential,
   probe runner, extract, preview tools, and anything a kept test imports.
   Verify with typecheck + full suite + build.
2. Root docs → README, AGENTS, ROADMAP (≤ 200 lines), ISSUES (open only),
   PROGRESS (last 3 entries). Everything else to `docs/archive/` unchanged.
3. Remove Codex / DeepSeek / OpenCode paths and the animation / rust lane
   supervisors; one supervisor script, one worker launcher, Claude only.
4. `git subtree split -P core-rs -b core-rs-archive`, then `git rm -r core-rs`
   and its adapter/tests; the user pushes the branch to its own repo.
5. Tests: delete frame-pin tests the census supersedes; `npm run test:gate`
   (≤ 5 min) for workers, full suite nightly; target full suite < 15 min.
6. Prune merged `worker/*` refs on both machines; remove dead worktrees.
7. Evidence JSON stops going into git (R2 via `tools/backup-logs-to-r2.sh` or
   an evidence repo). No history rewrite.

## Estimate

10–13 ten-hour runs ≈ 2–3 weeks of the daily schedule. Phase 2 is the least
certain (it inverts a rule enforced at ~150 sites); its first run shows the
real size.

## Not doing
Git history rewrite. Finishing the Rust port. Website concerns in this repo
(login, streak storage, menus, hosting). Frame residuals below ~10 frames
before everything above is done.
