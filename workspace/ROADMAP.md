# Roadmap — Battle Factory

Reproduce Pokémon Emerald's Battle Factory challenge in native TypeScript,
verified frame-by-frame against the oracle. The canonical start state is the
oracle's bootstrap anchor (see `bin/oracle info`): **the Level-50 single
challenge's rental-draft screen, already open** — the demo has no overworld
at all. In scope: the rental draft (6 candidates, summary views, pick 3),
the 7-battle round with post-win swaps, and the gen-3 single-battle engine
those battles need. Out of scope: the lobby/frontier overworld and every
screen before the draft, Battle Points economy beyond a single round, double
battles, and the open-level rule set (until the single-battle loop is solid).

**Audio marker:** sound effects, cries, fanfares, and music are a separate,
later milestone — stage S11 below (user decision, 2026-07-28). No earlier
stage's acceptance includes audio.

## Current execution priority — 2026-10-31 (finish plan: production + cleanup)

The user approved `docs/finish-plan.md` on 2026-10-26; it stays the mission
until its definition of done is met. **Phases 1 and 2 are met as of
2026-10-31** (user re-aim, 2026-10-31): Scene ON census 0..999 has 0
static-field commands; player back send-out, intro send-outs, the
faint-replacement send-in, Castform forms and the weather side are drawn;
the nightly crash set (browser random play both scenes + Scene ON soaks) has
been clean every night. Do not open new send-out / animation residual steps:
remaining #146 lines, the bso226 "Go!" wait and anything measured in frames
or a few hundred pixels are **timing residuals** (item 4). Order of work:

**Split decided 2026-10-31 (user):** this repo is the **game core**, an
independent library that a separate website repo consumes (`factory-web`:
login, saved streaks, hosting, later leaderboards — not this repo's work).
The core never knows about accounts or servers; it exposes one small
mount / event / save API (finish plan Phase 3, "Core library API"). Title
screen, login, streak storage and the on-screen pad UI are the website's.
**Audio (S11) is back in scope** from 2026-10-31 (user decision); the
2026-08-10 out-of-scope note is superseded.

1. **Core library API** — **DONE 2026-11-01** (`f88653929`; `docs/library-package.md`). (finish plan Phase 3, first): `src/lib.ts` +
   `mountFactoryGame` with the exact contract in `docs/finish-plan.md`, a Vite
   lib build and `package.json` `exports`; `src/main.ts` becomes a thin shell
   over it (the test ABI, `?battleScene=`, `?pokebench=1` and the crash
   overlay unchanged). One step, with full suite + build + browser play.
2. **Audio (S11)**, the main program after step 1 (design ACCEPTED 2026-11-01: `docs/s11-audio-design.md`; its section 7 is the step list; steps 1-3 folded by 2026-11-02, step 4 aud240a / aud240b (draft, swap, dialogs, summary) 2026-11-03, aud240c party menu next): a design step first
   (oracle audio-event log from the ELF symbols for `PlaySE` / `PlayCry*` /
   `PlayBGM` / `PlayFanfare`; our kernel already emits `play-se` /
   `play-fanfare` / `play-faint-cry`), then sound-event parity by census like
   the animations, then playback (mGBA-recorded cries / SFX / music through
   WebAudio, off by default in tools). Acceptance in `docs/finish-plan.md`.
3. **Cleanup** (finish plan Cleanup 1–7), at least one step per run: one-off
   step scripts + their fixtures, ledger archive, provider / lane code, the
   5-minute test gate, `core-rs` to its own branch, stale refs, evidence out
   of git (steps 1 cln237, 2 cln238a/b and 6 DONE by 2026-11-03). One reversible commit per step, verified by typecheck + full suite
   + build.
4. **Bundle hygiene** (the rest of Phase 3): test-only data out of `src/`,
   lazy-loaded sprite sheets and large tables, gamepad input in the library.
5. **Crashes, nightly** (unchanged): `npm run play:random` both scenes and the
   Scene ON soaks on the final src. Every overlay / pageerror / CRASH / HANG
   is a fix step before anything else.
6. **Timing residuals** last, logged in ISSUES, never blocking.

Follow `docs/cax31-session-handoff.md` for the host, the current step and
the gates. The settled exceptions below are unchanged.

## Standing user decisions

Full text for each is in the archive copy (`docs/archive/ROADMAP-pre-cln238.md`, "Superseded ordering" blocks).

- **D3, 2026-10-06 (presentation RNG):** a separate deterministic presentation RNG for Random2 animations, seed kept in
  session exports, live adapters reported as "faithful random", never as exact. Implemented; `docs/presentation-rng.md`.
- **D4, 2026-10-07 (faithful timing):** deterministic dominant measured CPU-load timing is its own "faithful timing"
  class; further evidenced lag-frame / VBlank-phase cases need no new approval. Implemented in
  `src/engine/liveMoveTimingPolicy.ts`; `docs/faithful-timing.md`, `docs/faithful-timing-policy.md`.
- **Struggle scope, 2026-10-11:** Struggle (`MOVE_STRUGGLE`, 165) is a required body in S10A, counted on top of the
  historical 276; forced moves reachable in Factory play are in scope. `docs/struggle-integration-scope.md`,
  `docs/stl109-struggle-live.md`.
- **Finish-up scope, 2026-10-13:** all remaining animation variants, presentation corrections and discussed
  battle-engine accuracy bugs are in scope; gameplay / damage / AI / RNG / event-order fixes are authorized when proved
  against the original source, and presentation work keeps the same rules across scene modes. Settled exceptions and
  unrelated expansion stay parked. `docs/factory-finish-scope.md`.
- **Audio back in scope, 2026-10-31:** S11 is item 2 above; acceptance in `docs/finish-plan.md` "Audio (S11)". The
  2026-08-10 out-of-scope note is superseded.
- **Game-core / website split, 2026-10-31:** this repo is a library; login, saved streaks, menus, the on-screen pad
  and hosting belong to the website repo. `docs/finish-plan.md` "Core library API", `docs/library-package.md`.

## Stage status

Every stage body (acceptance text, receipts, session narrative) is in `docs/archive/ROADMAP-pre-cln238.md`.

| Stage | Status | One line |
|---|---|---|
| S1 | done | comparison loop closed; pixel-exact static anchor frame |
| S2 | done | draft-screen cursor / header / menu / timing parity |
| S3 | done | rental data, RNG core, anchor mons pinned |
| S4 | done | draft SUMMARY view parity |
| S5 | done | rent 3, confirmations, exit sequence |
| S6 | closed by user decision 2026-07-19 | battle bring-up to first action menu; every diff frame attributed (#5, #18) |
| S7 | done | turn resolution; anchor round's first battle exact |
| S8 | done | post-battle swap and the 7-battle round loop |
| S9 | done | deferred interface / breadth workstreams |
| S10 | closed 2026-08-10 | parameterized battle laboratory + complete Level-50 singles engine (six gates checked) |
| S10A | **open** | playable animation integration; scope and plan in `docs/finish-plan.md`, library API in `docs/library-package.md` |
| S11 | **open** (re-opened 2026-10-31) | audio; design `docs/s11-audio-design.md` (section 7 is the step list) |

The 2026-07-24 "Executable-frontier reset" block is also in the archive copy.

## Settled exceptions

Each was investigated to root cause and then parked or accepted by decision. Acceptance lines cite them by number as the
reason specific pixel diffs are tolerated. Do not reopen any without a user decision. Detail: the archive copy
`docs/archive/ISSUES-pre-cln238.md`, section "Settled records".

- **#5** (user-delegated, 2026-07-17): mon-pic close WIN0V jitter is real hardware cycle timing below tick granularity;
  `rent-slot1.json` ships 125/139 with each frame attributed.
- **#18** (user, 2026-07-19): send-out tick 1496, 3 px particle z-order (persistent `sSpriteOrder`); `sendout.json` 255/256,
  `s6-acceptance.json` 224/228 (3 frames are #5, 1 is #18).
- **#38** (supervisor, 2026-07-22): Turn 16 FAINT_ATTACK delayed-control tick 21006 shows `BLDALPHA` one VBlank early;
  canonical window 221/221, the delayed trace is not committed red.
- **#56** (supervisor, 2026-08-03): arbitrary-trainer intro YOSHI 700/751 and MAGNETON 703/751; every residual frame is in
  a settled class (display-tail VBlank phase, idle-menu bounce).
- **#61** (supervisor, 2026-08-01): Scene-OFF turn-3 FIGHT reveal one frame late is controller / VBlank poll order;
  `turn3-endeavor-off.json` 254/255. Do not fit a phase bit or retune `FIGHT_SUBMENU_OPEN_DELAY`.
- **#87** (mechanism record): the first-action-menu ready frame sits 4-7 ticks off the oracle's real menu-open (switch-in
  loop + AI-ack cycle spill); handled by `MEASURED_SILVER_BRAIN_REVEAL_READY_LAG_OFFSET`. Re-open only for a new window
  that crosses the ready transition.
- **#97** (supervisor, 2026-08-19): turn5 / turn6 presentation family closed; ceilings `turn5-resolve-off-c` 195/196
  (tick 6763, 6 px), `-d` 194/196 (6850, 6996), `turn5-confirm-off-b` 131/132 (6184).

## Operational notes

- **Log backup:** Launcher logs (`.codex-logs/`, a historical directory name kept for the cron; gitignored) and Claude's local
  transcripts live only on the machine's disk. At the end of a milestone or long session run
  `tools/backup-logs-to-r2.sh` (additive-only, safe to re-run; needs a local `r2` rclone remote).
- Host, current step and gates: `docs/cax31-session-handoff.md`. Mission and phases: `docs/finish-plan.md`.
- Verification commands: `npm run compare -- tools/compare/traces/<name>.json` (strict frame diff against oracle + app,
  non-zero on any differing capture), `npm test`, `npm run build`, `bin/oracle run <trace> -o <dir>` (oracle-only).
- Stale-line note: older docs and `tools/report/gate6-coverage-manifest.ts` cite `ROADMAP.md:NNNN`; those lines
  now live in the archive copy.

## Domain notes

(Verified during iteration 0 unless cited. Code comments cite this heading.)

- **RNG:** `Random()` advances once per VBlank **except** in frontier battles: `main.c:366` — `if (!gMain.inBattle ||
  !(gBattleTypeFlags & (BATTLE_TYPE_LINK | BATTLE_TYPE_FRONTIER | BATTLE_TYPE_RECORDED))) Random();`. So the draft
  screen consumes 1 RNG/frame (input-independent), while factory battles consume RNG only on demand. Anchor
  `gRngValue = 0xd2ddeec8` (RAM-verified). Rented-ball sprites roll `Random() % 5` on a ~32-frame cooldown
  (`ballAnim.ts`, `docs/rent-flow-notes.md`), so draft RNG is no longer 1/frame after pick 1.
- **Dev-time RAM inspection recipe** (sanctioned ground-truth channel; never at runtime): run a script with
  `/srv/pokebench/vendor/mgba-venv/bin/python`, put `<harness>/oracle/` on `sys.path`, instantiate
  `emerald_core.EmeraldOracle(rom, map, bootstrap/factory.json)` — replay reproduces the canonical anchor byte-exactly
  (sha verified) — then `read_u8/read_u32` at `bin/oracle symbols` addresses; drive further frames with the same
  segment format to inspect later states. Quirks: mGBA spews log lines to stdout (write JSON results to a file, don't
  parse stdout) and the interpreter segfaults at teardown AFTER results are written (exit 139 is benign — check the
  output file, not the exit code). Statics are not in the linker map: resolve via `nm` on the pinned ELF
  (`tools/extract/inspect-anchor.py`). Host helpers: `docs/cax31-session-handoff.md`.
- **Idle fade:** idle screens are pixel-stable only up to ~104 frames — past that `Select_Task_FadeSpeciesName` starts
  a perpetual palette breathe on the species name text (not modeled); keep traces under that or model it explicitly.
- **Oracle limits:** maxFrames 45000 (raised from 20000 by user decision 2026-07-19, harness commit `ccd7554`),
  maxCaptures 256; long traces ~10-30 s; the service serializes runs (parallel workers are safe).
- **Engine contract for successive workers:** pure core in `src/engine/` (`tick(buttons)` / render into a 240×160 RGBA
  `Uint8Array`), assets/data only from `src/assets/gen/` + `src/data/gen/` (committed, regenerable via
  `tools/extract/`); the browser shell and `appTrace.ts` share the core. The production build never touches
  ROM / emulator / oracle / `reference/`.
- **Reference geography:** draft/swap UI `src/battle_factory_screen.c` (4314 lines); challenge logic
  `src/battle_factory.c` (919); rental mons + frontier trainers `src/data/battle_frontier/`; factory screen art
  `graphics/battle_frontier/factory_screen/`; fonts `graphics/fonts/` + `charmap.txt`; battle engine `src/battle_*.c`,
  `data/battle_scripts_1.s`.
- Colour pipeline, draft-screen timings, summary input-ready lag and draft-candidate storage notes: archive copy,
  "Domain notes".
