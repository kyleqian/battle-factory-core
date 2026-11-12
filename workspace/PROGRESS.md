# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 2026-11-12 — lbra / lbr-a (ts lane worker): loss / forfeit / retire end in the walkable Lobby (no new-draft chain); handoff item 0b step 1

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-551744f3a2c9b7ed` -> `eb-8838f1fea2958ffc` (read from dist; tell the website). `docs/lbra-lobby-return.md`.
  Gates so far: typecheck 0, test:gate 362 / 362 (2836 tests), build / build:lib 0. Soaks: vanilla 0:20 OFF **20 / 20**, ON **20 / 20** (all `budget`), winning 0:12 **12 / 12** (run in slices / `--parallel` to fit the 10-min command limit).
- **Did:** loss / forfeit / retire warp to the Lobby and play `LostChallenge` (record question YES/NO unless forfeit: `disableRecordBattle` skips it, bug fixed),
  then free-roam; `enterChainedFactoryChallenge` removed for these end types (7-win path untouched); loss carry reset on Lobby entry. Soak driver / goalPlay /
  play:random walk to the attendant and press A after a loss (nch231). Library `challenge-end` frame unchanged (pinned). `tests/lbra.test.ts` (14), 5 old-chain re-pins.
  ROM windows `tools/compare/traces/lbra-*.json`: loss OFF **2258 / 2258**; forfeit OFF 896 / 1050, ON 766 / 1050; retire OFF 1315 / 1554 (all residuals named in the doc).
  SE_SAVE: forfeit OFF 895 (ROM = app); ROM loss OFF 4007 / retire OFF 7503, app emits none there (audio lane).
- **Next:** lbr-b attendant conversation, lbr-c challenge-request event, lbr-d 7-win Lobby return; a closed-loop Scene ON loss / retire lab (unmeasured).
- **Notes:** play:random 2 min / scene both: 0 page errors / console errors / overlays (ON 7 battles, OFF 16, new challenges from the Lobby 1 / 3). The next draft after a loss now uses the live Lobby vblank cursor (ROM-faithful), not the old chain's cursor. Evidence `.integration/evidence/lbra/`.
