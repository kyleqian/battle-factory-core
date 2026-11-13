# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-13 — enc276 (integration lane worker, 200-min cap): a forced turn goes from FIGHT straight into the turn (ISSUES #213)

- **State:** folded `5b1814cf6` (branch removed; evidence `.integration/evidence/enc276/`). ENGINE_BUILD moves again (merged tree; read at wind-down). `docs/enc276-forced-turn-no-menu.md`.
  **Final-tree verification is running** (enc276v, integration lane): census 0..999 both scenes, 8-seed ROM re-drive, soaks, full suite. #213 stays open until it lands.
- **Did:** Encore: FIGHT submits the Encored move, no move menu. Struggle: FIGHT prints "<mon> has no moves left!" (ROM-tuned glyph / arrow / bounce timing), A submits.
  Decision set unchanged; 30 tool / test route drivers follow the forced turn; `randomRoundSoak` seed 21 re-pinned (frames only).
- **Proof so far (worker, on `093ee66ed`):** census 0..999 ON and OFF vs `17af89768`: 0 digests / command rows / errors moved (29 forced-turn seeds); ROM seeds 60 87 89
  90 119 159 161 193 still match. ROM windows: encore-off 181 / 189, struggle-off 158 / 189, struggle-on 116 / 189, encore-on 46 / 189 (residuals named: bounce stop,
  the staged route's missing Scene ON SPLASH body, Struggle HP drain / recoil timing after the animation). typecheck / test:gate 362 / 362 / build / build:lib 0.

---

## 2026-11-13 — lbr-c (ts lane worker): `challenge-request` library event + hold at the attendant's save dialog (handoff item 0b, step 3)

- **State:** on master (`0d28c22e4`..). ENGINE_BUILD `eb-317927f84c1b839e` -> `eb-94a2067292cf8eb7` (read from dist; tell the website). `docs/lbrc-challenge-request.md`, `docs/library-package.md`.
- **Website (additive, tell the Mac): new `FactoryEvent` `{ type: "challenge-request", frame }`** (`lib-types`). After `challenge-end`, when the player confirms the save at the
  attendant (CHALLENGE, LV. 50, YES) it fires once, on the first frame of the ROM save dialog, and the game HOLDS there (input ignored, picture fixed) until `destroy()`.
  Host: prefetch the next server challenge at `challenge-end`; on `challenge-request` destroy + mount it (starts at the draft). A host that ignores it just leaves a frozen
  save window (the spec). `challenge-end` is where it was; the trace read at it is a prefix of every later read and the event adds no frame (`tests/lbrc.test.ts`, replay equality).
- **Did:** `saveDialogStarted` on the attendant state, `attendantRequestHold` in the engine (set by the session once ended; guard: not ended = lbr-b behaviour), `FactorySession`
  option `challengeRequest: "hold" | "continue"` (default hold, so `replayChallenge` ticks what the mount ticks). The dev shell passes `"continue"` (event reported, no hold), so
  goalPlay / `play:random --lobby-new-challenge` keep starting new challenges in-game; the soak runs the bare engine (no session). `?challengeRequest=hold` in the shell = host behaviour.
- **Gates:** typecheck 0 (the first "0" was a masked `| tail`; the real run caught lib-types parity, fixed), build 0, `lbra` / `lbrc` / library / goalPlay / nch231 / lbrb / frf250b / audio sink files green,
  play:random 2 min / scene `--lobby-new-challenge` seed 13: 0 page / console errors / overlays, ON 2 and OFF 1 new challenge from the Lobby; soak vanilla 0:20 OFF 20 / 20 OK (all `budget`).
- **Next:** `start: "after-save"` mount option (optional, see below), lbr-d (7-win Lobby return).

---

## 2026-11-13 — lbr-b (ts lane worker, 180-min cap reached after its last commit): the singles attendant conversation (handoff item 0b, step 2)

- **State:** on master (`9f8c9aa7d`..`7952dfe02`). ENGINE_BUILD `eb-adfdcfdc91f4247f` -> `eb-317927f84c1b839e` (read from dist; tell the website). `docs/lbrb-attendant-conversation.md`.
- **Did:** A at the attendant runs the ROM conversation (`src/engine/factoryLobbyAttendant.ts` + `...Render.ts`): welcome, CHALLENGE / INFO / EXIT, INFO 9 pages,
  "Level 50 or Open Level?" (Open Level drawn, unselectable: scope note in `docs/factory-finish-scope.md`), save question, save dialog, "Please step this way.",
  door walk, fade, draft. The Lobby vblank RNG keeps running through the conversation, so the deal now comes from the hand-off tick (soak / goalPlay /
  play:random seeds deal differently). Consumers drive it by tapping A (`randomRoundSoakDriver.ts`, `goalPlay.ts`, `tests/helpers/lobbyAttendant.ts`).
- **ROM windows** (`tools/compare/traces/lbrb-*.json`, OFF): happy path a-e and info 1-3 **256 / 256** each; residuals named in the doc: field NPC wander after
  the script releases (exit-type branches), happy-f 16 / 60 (the PreBattleRoom briefing before the draft is not modelled, since nch231).
- **Gates:** worker: touched tests 291 / 291 files, soaks vanilla ON / OFF and winning 0:12 OK (all `budget`). It was stopped at the cap before reporting.
  Supervisor on `7952dfe02`+: typecheck 0, test:gate **362 / 362 (2,843)**, `lbra` + `lbrb` 25 / 25, build 0 (first try OOM-killed beside 2 workers, rerun 0),
  build:lib 0, compares `lbrb-happy-c-off` / `lbrb-info2-off` 256 / 256, play:random 2 min / scene seed 13: 0 page / console errors / overlays,
  ON 11 battles / 9 swaps, OFF 16 / 9 and 1 new challenge from the Lobby through the conversation.
- **Next:** lbr-c (challenge-request event at the save dialog), lbr-d (7-win Lobby return); NPC wander after release (open, presentation).

---

## 2026-11-13 — aud245 (side lane worker, 112 min): WebAudio player, muted by default (S11 design step 9)

- **State:** folded `69bc691dd` (branch `worker/side-20261113-023351`, removed; evidence `.integration/evidence/aud245/`). No `src/engine/` change; ENGINE_BUILD unchanged
  `eb-adfdcfdc91f4247f`; headless bundle byte-identical (3,189,511 B). `docs/aud245-audio-player.md`.
- **Website (additive API, tell the Mac):** `FactoryGameOptions.audio?: { enabled?, volume?, baseUrl? }`, `FactoryGame.setAudio(enabled)` / `getAudio()`
  (`lib-types`, `docs/library-package.md`); dev shell `?audio=1`. `dist-lib/audio/` ships Ogg + an AAC `.m4a` fallback (picked by `canPlayType` / decode failure),
  14.8 MB together; with `baseUrl` the host serves the unhashed files from `src/assets/gen/audio/`. Safari not checked on this box.
- **Did:** `src/audio/player.ts` (lazy chunk 193 kB + manifest chunk 496 kB): SE1 / 2 / 3 priority from the song headers, cry duck 85 / 256, fanfare pause /
  continue, fades, cry pan law, loops (7 ms crossfade at the four non-exact wraps). Limits: BGM silent after a `resume` until the next music event; `pan`
  events and cry volume ignored; all 186 files fetched at enable.
- **Gates:** worker typecheck 0, test:gate 362 / 362, full suite green except `bnd253SrcJsonShipped` (fixed after, file re-run), build / build:lib 0;
  frame-hash identity with the player attached, both scenes. Supervisor: 8 audio / library test files 57 / 57; `tools/browser/audioCheck.mjs --frames 1800`:
  `?audio=1` 1 context running, 38 sources started, peak 0.57, 0 decode failures, 0 errors; no audio option: 0 contexts, 0 audio requests.
- **Next:** aud246 close (soaks, ROADMAP S11 tick by the supervisor); the limits above as small follow-ups.

---

## 2026-11-13 — aud244b (side lane worker, 82 min): BGM / fanfare / looping-SE assets with ROM loop points (S11 design step 8, done)

- **State:** folded `197011863` (branch `worker/side-20261113-010956`, removed; evidence `.integration/evidence/aud244b/`). No `src/*.ts` change: ENGINE_BUILD unchanged.
  `docs/aud244b-bgm-fanfare-loops.md`. Audio assets 6.14 -> 7.45 MB (songs 1.28 MB; 32768 Hz stereo, an integer sample count per 48 ROM frames).
- **Did:** recorder kinds `bgm` / `fanfare` / `seloop` (`tools/audio/{soundRecorder,songTicks,loopCut}.py`), manifest schema `/2` with `loopStartSamples` /
  `loopEndSamples` (ticks from the ROM `GOTO` targets = `songLoops`). BGM 354 / 412 / 469 / 476 loop, fanfares 368 / 459 / 466 one-shot; SE_LOW_HEALTH / SE_M_GUST loop.
  Seams: SE_M_GUST and bgm:354 sample-exact at the wrap; 412 / 469 / 476 / SE_LOW_HEALTH are not periodic in the ROM's own output (pass-vs-pass rms diff
  is the same size as the seam: PSG / noise phase, mGBA per-frame sample jitter), so **aud245 crossfades 5-10 ms at those four wraps**. MUS_VS_FRONTIER_BRAIN (471)
  is in no ROM log yet: not recorded.
- **Gates:** worker typecheck 0, test:gate 362 / 362, full suite 1,773 passed / 44 skipped (14,618 tests), build / build:lib 0, validator 0.
  Supervisor: `aud244a` / `aud244b` / `bnd253SrcJsonShipped` tests 17 / 17, validator 0 (worktree, `--raw` main checkout).
- **Next:** aud245 (WebAudio player, design section 6).

---

## 2026-11-13 — CAX31 daily run (supervisor, Opus 5.5): run start, `mac/parity-mac` 344eda36c folded

- **State:** master `5a2fe1d83` = merge of `mac/parity-mac` `344eda36c` (52 commits, 28 battle-rule fixes + Brain replay seam; docs `docs/parity-mac/`).
  ENGINE_BUILD `eb-952d7267a01bd728` -> `eb-adfdcfdc91f4247f` (read from dist; tell the website). Evidence `.integration/validation/sv-20261113/gates/`.
- **Gates on the merge:** typecheck 0; full suite (5 workers) **1,772 files passed / 44 skipped, 14,613 tests passed**; build / build:lib 0.
- **Gameplay status (replay only, per item 0d):** the Mac lane reports the open list empty on `344eda36c`: 8,660 ordinary seeds 1161..10000 with 0 engine
  mismatches, silver Brain 204 / 204, gold 203 / 203, regression 64 / 64 (`docs/parity-mac/STATUS.md`). Box nightly check on the merge is in the
  replay ledger. ISSUES #211 / #212 / #204 removed (all rows fixed with ROM proof by the Mac lane; #204 seed 50 ON was never driven); new #213
  (Encore / Struggle skip the move menu, presentation, left on purpose by the Mac lane) and #214 (source-read leads).

---

## 2026-11-12 — CAX31 daily run (supervisor, Opus 5.5): wind-down: aiv270 / aiv271 / fix274 / aud244a / lbr-a / pnm273 folded

- **State:** master clean, no active workers, no worktrees. Final src == `f55e68f8e` (pnm273) plus test-only `bbcc41497`; later commits docs only. ENGINE_BUILD
  `eb-9d34d28f1b19ef3d` -> `eb-952d7267a01bd728` (read from dist; moved by aiv270, aiv271, fix274, lbr-a, pnm273; tell the website). No push. No DEFERRED items.
  Evidence `.integration/validation/sv-20261111/` (gates in `gates/`); worker evidence `.integration/evidence/{aiv270,aiv271,dia272,fix274,aud244a,lbra,pnm273}`.
- **Gameplay (user item 0d: first priority).** aiv270 (#204 A / B; supervisor wrote its doc after the 200-min cap), aiv271 (#204 C, AI damage sims use the real
  hit chain's terms; side lane), fix274 (#209 effect byte cleared per action, #210 move slot written at selection; side lane, proof from dia272 scratch fixes).
  Census 0..999 per scene: 77 / 35 / 21 changed seeds, 0 unexplained, ON / OFF sets identical. ROM: 22 30 39 42 50 53 57 now match to battle end.
  Supervisor re-drives: 30 ON 11 / 11, 39 OFF 11 / 11, 53 ON 8 / 8; C read for each fix (`Cmd_if_type_effectiveness`, `GetWhoStrikesFirst`, `AI_CalcDmg`,
  `battle_main.c:4398`). ISSUES #209 / #210 removed, #204 trimmed (switch-into scorer stub, seed 60 lead).
- **Sound (item 0):** aud244a recorder + 6.14 MB OGG (1,128 cries, 181 SEs; `docs/aud244a-recorder-assets.md`); no src change. Next aud244b, then aud245.
- **Lobby (item 0b):** lbr-a: loss / forfeit / retire end in the walkable Lobby, forfeit skips the record question; soak / play:random walk to the attendant.
  Supervisor reran `lbra-loss-off` 2258 / 2258. Open: no Scene ON loss / retire lab; no app SE_SAVE on the loss / retire result script.
- **Name (item 0c):** pnm273 `PLAYER_NAME` = "PLAYER"; compare harness keeps MEMORY; only name pixels move; census 0..49 digest-identical.
- **Gates** (tree `f55e68f8e`): full suite (3 workers, beside the soaks) **1 failed / 14,553 passed, 1,763 files + 44 skipped**: the only failure was
  `bnd253SrcJsonShipped` (aud244a's manifest has no src importer yet); fixed in `bbcc41497` (pending-runtime-import list, shrink-only list untouched), file 4 / 4.
  build / build:lib 0. Vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default **60 / 60**, winning **60 / 60**, winning-swap **60 / 60** (all `budget`); varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each,
  winning-swap carry 0 **100 / 100**; play:random 5 min / scene: ON 22 battles / 9 swaps, OFF 36 / 17, 0 page errors / console errors / overlays.
- **ROM replay (item 0d wind-down):** the 40-seed permanent list on `f55e68f8e`, Scene OFF: **24 / 40 match** to battle end; newly matching 22 30 39 42 50 53 57 (this run) and 75 88 110 155 158;
  still diverging 60 + 15 seeds from 79 up (ISSUES #211). New ISSUES #212 lists the audit rows. Created `docs/replay-ledger.md` (`docs/replay-ledger.md`).
- **Folded: dia275** (side lane, diagnosis only, 14 min; `docs/dia275-triage.md`): #211 seeds 109 / 107 / 79 share audit row A2 (switch-in scorer counts
  power-0 moves as super-effective; one-line fix, isolated check flips all three); 123 = A4 (pass-2 base damage 0); 95 / 114 = AI draw count (not located).
- **Next:** gameplay queue first: A2 fix (re-drive 109 / 107 / 79), A4 (123), seed 60 (dia272 forced-Struggle lead), then the rest of #211 / #212;
  then aud244b, lbr-b. The replay runs once at run start (item 0d).

---

## 2026-11-12 — pnm273 (ts lane worker): the player's name defaults to "PLAYER" (handoff item 0c)

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-8838f1fea2958ffc` -> `eb-952d7267a01bd728` (read from dist, includes the fix274 merge that landed meanwhile; tell the website). `docs/pnm273-player-name.md`.
  typecheck 0; test:gate 362 / 362 (2836 tests; it ran before the last merge); touched tests (103 files importing the three modules + the appTrace importers) green; build / build:lib 0. Full suite not run (supervisor).
- **Did:** `PLAYER_NAME` in `src/engine/playerName.ts`, used by the forfeit, both record and the BP messages; harness `tools/compare/harnessPlayerName.ts` renders "MEMORY" for compare traces (no-op under vitest: `isolate:false` leaked it).
  Production differential: only x17-51 y124-133 changes (123 / 250 frf250b, 73 / 133 record-yes); with the override 6 traces / 4412 captures byte-identical; ROM compares 250 / 250, 133 / 133, 178 / 178; census seeds 0..49 both scenes 100 / 100 lines identical (kernel digest unchanged).
  Tests: `tests/pnm273PlayerName.test.ts` (8), 3 files re-pinned; `factoryTerminalMessages.test.ts` keeps MEMORY (it pins the oracle-save extractor).
- **Next:** per-player name (`playerName` mount option) when wanted; no compare trace reaches the BP award box (app-side render checked only).
