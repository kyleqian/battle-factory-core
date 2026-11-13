# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-13 — CAX31 daily run (supervisor, Opus 5.5): wind-down: parity-mac fold, sound playback, attendant + hand-off event, forced-turn menu, lazy sprites

- **State:** master clean, no workers or worktrees (a read-only lbr-d scout may finish after this entry; it leaves no edits). No push. **No DEFERRED items.**
  ENGINE_BUILD `eb-952d7267a01bd728` -> **`eb-8faf63dbde5168d5`** (read from dist and `engineBuildCheck`; moved by the parity-mac fold, lbr-b, lbr-c, enc276, bnd257d; tell the website).
  Evidence `.integration/validation/sv-20261113/` (gates in `gates/`); worker evidence `.integration/evidence/{aud244b,aud245,enc276,enc276v,bnd257d,cln277,aud247}`.
- **Website (Mac), all additive:** `options.audio` / `setAudio` / `getAudio` (Ogg + AAC in `dist-lib/audio/`, muted by default); event `{ type: "challenge-request", frame }`
  after `challenge-end` when the player confirms the attendant's save (the game then holds until `destroy()`; prefetch a challenge at `challenge-end`); mount option
  `start: "after-save"`; `ready` now waits for the lazy sprite chunk and presses before `ready` are dropped. Docs: `docs/library-package.md`, `lib-types`.
- **Gameplay (replay only, item 0d):** `mac/parity-mac` `344eda36c` folded (28 battle-rule fixes; Mac: 0 engine mismatches on 8,660 ordinary seeds and 407 Brain
  battles). Box: nightly 44 / 44 (40 pool + 4 Brain) on the merge; wind-down permanent list **64 / 64** on the final engine. ISSUES #211 / #212 / #204 closed.
- **Folded:** aud244b (BGM / fanfare / loop SE assets), aud245 + aud245b + aud247 (WebAudio player; draft music at mount from the ROM clock), lbr-b (attendant conversation),
  lbr-c (hand-off event), enc276 + enc276v (#213: Encore / Struggle skip the move menu, census 0..999 both scenes digest-identical), bnd257d (browser static graph
  40.5 -> 28.7 MB), cln277 (suite wall measured; < 15 min not reachable test-side), rps278 (soak re-pins after lbr-b), iss215 (tools install the pixel provider; #215 found by the final suite).
- **Gates (final tree; suite on `e83b18c0e`, later commits tools / tests / docs only):** full suite 1,780 passed / 3 failed (the #215 tools, fixed in `9f7290038`, the 3 files
  then 3 / 3) / 44 skipped; test:smoke 448 / 448; build / build:lib 0. Soaks (tree `a21ec4148`, engine == final): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default
  **60 / 60**, winning **60 / 60**, winning-swap **60 / 60** (all `budget`); varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**.
  play:random 4.5 min / scene `--lobby-new-challenge`: ON 20 battles / 7 swaps, OFF 27 / 12, 7 new challenges from the Lobby each, 0 page / console errors / overlays.
- **lbr-d prep (no src):** scout `docs/lbr-d-scout.md` (two-step plan, change list, re-pin list); lbr-d2a ROM tail evidence (`docs/lbrd2a-won-tail-rom.md`,
  fixture `tests/fixtures/data/factory-seventh-win-tail-off.json`): the won profile's `declineInputDelay` 39 vs ROM 41 and `recordSavedInputDelay` 70 vs ROM 74; farewell glyph +-1 tick to settle with a compare trace.
- **Next:** lbr-d1 (engine + session change per the scout), aud246 (S11 close), Lobby NPC wander after the script releases, the PreBattleRoom
  briefing; fold `mac/parity-mac` at run start if it moved; nightly replay from the pool. Papercut: typecheck / build OOM beside two other workers (use 2 lanes when one runs a suite).

---

## 2026-11-13 — bnd257d (integration lane worker, 53 min): the browser sprite chunk is a dynamic import (bundle hygiene, finish plan Phase 3)

- **State:** folded (branch removed; `docs/bnd257d-lazy-sprites.md`). ENGINE_BUILD moves (a dead 1-byte `assets-sprites` stub left the headless graph; every real
  headless chunk is byte-identical; tell the website). Supervisor sign-off of the scout's "reverses bnd256c" point: recorded in the brief, reversible.
- **Website:** `mountFactoryGame` still returns at once, but the first draw / `ready` wait for the sprite chunk; **presses before `ready` are dropped**; a failed
  import calls `onError` (`docs/library-package.md`). Dev ABI `__POKEBENCH__` appears after the pixels load (tools poll on a timer; AGENTS.md note).
- **Sizes (`build:lib`):** static graph 40.47 -> 28.70 MB; `assets-sprites` 11.77 MB dynamic; largest file 11.77 MB; total unchanged.
- **Gates:** worker typecheck 0, test:gate 362 / 362, differential 5 traces 821 / 821 byte-identical, play:random 2 min / scene 0 errors / overlays.
  Supervisor on the merge with lbr-c / aud245b: build:lib 0; 6 lib / boundary files green after a rebuild; fixed a 5 s-timeout cascade in `bnd257dLazySprites` (120077475).

---

## 2026-11-13 — lbr-c (ts lane worker): `challenge-request` library event + hold at the attendant's save dialog (handoff item 0b, step 3)

- **State:** on master (`0d28c22e4`..). ENGINE_BUILD `eb-317927f84c1b839e` -> `eb-93bc6e7a6b44c19b` (read from dist and `engineBuildCheck`; tell the website). `docs/lbrc-challenge-request.md`, `docs/library-package.md`.
- **Website (additive, tell the Mac): new `FactoryEvent` `{ type: "challenge-request", frame }`** (`lib-types`). After `challenge-end`, when the player confirms the save at the
  attendant (CHALLENGE, LV. 50, YES) it fires once, on the first frame of the ROM save dialog, and the game HOLDS there (input ignored, picture fixed) until `destroy()`.
  Host: prefetch the next server challenge at `challenge-end`; on `challenge-request` destroy + mount it (starts at the draft). A host that ignores it just leaves a frozen
  save window (the spec). `challenge-end` is where it was; the trace read at it is a prefix of every later read and the event adds no frame (`tests/lbrc.test.ts`, replay equality).
- **Also additive: `FactoryGameOptions.start?: "draft" | "after-save"`** (also `ReplayOptions.start`): the mount begins in the Lobby at "Please step this way." (door walk, fade, fresh draft: streak 0).
  `gameplaySeed` = the Lobby RNG cursor on the first frame, so the deal is deterministic from the seed but is NOT the deal a plain seed mount makes; pass the same `start` to `resume` and `replayChallenge`
  (`docs/lbrc-challenge-request.md`).
- **Did:** `saveDialogStarted` on the attendant state, `attendantRequestHold` in the engine (set by the session once ended; guard: not ended = lbr-b behaviour), `FactorySession`
  option `challengeRequest: "hold" | "continue"` (default hold, so `replayChallenge` ticks what the mount ticks). The dev shell passes `"continue"` (event reported, no hold), so
  goalPlay / `play:random --lobby-new-challenge` keep starting new challenges in-game; the soak runs the bare engine (no session). `?challengeRequest=hold` in the shell = host behaviour.
- **Gates:** typecheck 0 (the first "0" was a masked `| tail`; the real run caught lib-types parity, fixed), build 0 (`tsc -b` 0 + `vite build`; the `npm run build` one-liner was OOM-killed twice
  beside two other workers' suites, so `vite build` ran with `--max-old-space-size=4096`, 0), build:lib 0 (same way), `lbra` / `lbrc` / library / goalPlay / nch231 / lbrb / frf250b / audio sink files green,
  play:random 2 min / scene `--lobby-new-challenge` seed 13: 0 page / console errors / overlays, ON 2 and OFF 1 new challenge from the Lobby; soak vanilla 0:20 OFF 20 / 20 OK (all `budget`).
- **Full `npm test`** (still running at the cap, 1,630 files in, 3 failures, all in `tests/randomRoundSoak.test.ts`: ISSUES #89 seed 32, max-depth tracking, ISSUES #99 vanilla swap offer).
  **Those 3 fail identically on lbr-b's tip `435515cbd`** (checked in a throwaway worktree), so they come from lbr-b's changed soak deals, not lbr-c; the supervisor should re-pin them. `test:gate` 362 / 362 is green.
- **Next:** lbr-d (7-win Lobby return); re-pin the 3 `randomRoundSoak.test.ts` seed pins.
