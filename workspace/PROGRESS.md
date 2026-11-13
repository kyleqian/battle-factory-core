# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
