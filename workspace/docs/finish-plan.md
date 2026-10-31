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

### Phase 3 — Production (2 runs + user decisions)
- Move test-only JSON out of `src/` (tests import from `tests/fixtures/data/`);
  lazy-load sprite sheets and large tables; `base`, title, favicon; CI build +
  smoke; static host (GitHub Pages / Cloudflare Pages) — the user deploys.
- Title screen with Scene ON/OFF; on-screen pad for touch; gamepad; streak +
  current round saved in `localStorage`; "copy trace" kept behind a key.
- User decisions, not blocking: public vs unlisted; audio (S11) stays deferred.

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
Git history rewrite. Finishing the Rust port. Audio. Frame residuals below
~10 frames before everything above is done.
