# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-12 — lbra / lbr-a (ts lane worker): loss / forfeit / retire end in the walkable Lobby (no new-draft chain); handoff item 0b step 1

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-551744f3a2c9b7ed` -> `eb-8838f1fea2958ffc` (read from dist; tell the website). `docs/lbra-lobby-return.md`.
  Gates so far: typecheck 0, test:gate 362 / 362 (2836 tests), build / build:lib 0. Soak / play:random results are in Notes (updated as they finish).
- **Did:** loss / forfeit / retire warp to the Lobby and play `LostChallenge` (record question YES/NO unless forfeit: `disableRecordBattle` skips it, bug fixed),
  then free-roam; `enterChainedFactoryChallenge` removed for these end types (7-win path untouched); loss carry reset on Lobby entry. Soak driver / goalPlay /
  play:random walk to the attendant and press A after a loss (nch231). Library `challenge-end` frame unchanged (pinned). `tests/lbra.test.ts` (14), 5 old-chain re-pins.
  ROM windows `tools/compare/traces/lbra-*.json`: loss OFF **2258 / 2258**; forfeit OFF 896 / 1050, ON 766 / 1050; retire OFF 1315 / 1554 (all residuals named in the doc).
  SE_SAVE: forfeit OFF 895 (ROM = app); ROM loss OFF 4007 / retire OFF 7503, app emits none there (audio lane).
- **Next:** lbr-b attendant conversation, lbr-c challenge-request event, lbr-d 7-win Lobby return; a closed-loop Scene ON loss / retire lab (unmeasured).
- **Notes:** the next draft after a loss now uses the live Lobby vblank cursor (ROM-faithful), not the old chain's cursor. Evidence `.integration/evidence/lbra/`.

---

## 2026-11-12 — aud244a (ts lane worker): sound recorder + first asset set (cries x 3 modes, SEs) committed; S11 audio design step 8, slice 1

- **State:** committed on master (not pushed). No `src/*.ts` change: ENGINE_BUILD unchanged `eb-551744f3a2c9b7ed`, dist / dist-lib sizes byte-identical. `docs/aud244a-recorder-assets.md`.
- **Did:** `tools/audio/soundRecorder.py` (register-poke `PlaySE*` / `PlayCryInternal` into a silenced oracle state, real mixed mGBA output, trim, exact lengths in frames / samples; deterministic),
  `audioAssetList.py` (183 SE `(id, pan)` tuples from 151 ROM logs + 376 Factory species x NORMAL / WEAK / FAINT), `tools/extract/extract-audio.ts` (`npm run extract:audio`, wasm-media-encoders OGG
  Vorbis q -0.1, byte-reproducible), `validateAudioAssets.py`, `tests/aud244aAudioManifest.test.ts` (8). Assets `src/assets/gen/audio`: **6.14 MB** = SEs 1.59 MB (181 files, 26758 Hz stereo) + cries
  4.55 MB (376 per-species files, 13379 Hz mono; ~1.5 MB over the 3 MB design estimate: flat-spectrum 8-bit noise). Cry length vs ROM log: 120 / 128 pairs within 2 frames; decoded corr 0.95-0.997.
- **Next:** aud244b (BGM / fanfares with ROM-derived loops, plus the two looping SEs SE_LOW_HEALTH 90 and SE_M_GUST 132 excluded here), then aud245 (WebAudio player).
- **Notes:** mGBA `StereoBuffer.read()` returns a dangling slice (use `read_into`); after `load_raw_state` the output keeps a decaying residual (24 warm-up frames). Raw WAVs (88 MB) stay in `.integration/evidence/aud244a/raw`.

---

## 2026-11-12 — CAX31 daily run (supervisor, Opus 5.5): in progress; aiv270 folded

- **State:** master has aiv270 (`746d19464` A, `01ad01f2a` B, `4a19e49fd` classifier, `f396c0f8d` re-pins, `8cf0d8bba` docs). ENGINE_BUILD
  `eb-9d34d28f1b19ef3d` -> `eb-551744f3a2c9b7ed` (read from dist; tell the website). Evidence `.integration/evidence/aiv270/`, supervisor checks
  `.integration/validation/sv-20261111/`. Running: aud244a (recorder + assets, main tree, user decision 2026-11-11 item 0) and aiv271 (#204 C, side lane).
- **Folded: aiv270** (ts lane, killed at its 200-min cap while writing the doc; supervisor wrote `docs/aiv270-ai-effectiveness-paralysis.md` and trimmed
  ISSUES #204 to C + seed 57). A: AI x0 / Wonder Guard gates use the `Cmd_if_type_effectiveness` quirk; B: AI speed checks use the full
  GetWhoStrikesFirst inputs of both battlers (paralysis, Macho Brace, Quick Claw, Swift Swim / Chlorophyll) via the real turn-order builder.
  ROM: seeds 22 / 30 match to battle end in both scenes; the 15-seed regression set still full. Census 0..999: 77 changed seeds per scene, 0 unexplained,
  ON / OFF sets identical. Worker full suite on the final src **1,758 files / 14,499 tests, 0 failed**. Supervisor: build / build:lib 0; vanilla 0:20
  OFF **20 / 20**, ON **20 / 20**; re-drove seed 30 ON 11 / 11; read both src diffs against C (STAB does not change any tested AI value).
- **Census baseline now:** `.integration/evidence/aiv270/census/{on,off}-01ad01f2a`.
- **Next:** fold aud244a and aiv271; then #209 (seed 53), #210 (seed 42); aud245 player after aud244.

---

## 2026-11-10 / 11 — CAX31 daily run (supervisor, Opus 5.5): wind-down: dmg264 / aiv266 / aiv267 / seg268 folded

- **State:** master clean, no active workers; final src == aiv267 `5682cd341` (later commits: tests / fixtures / tools / docs). Evidence `.integration/validation/sv-20261110/`
  (gates in `gates/`). No DEFERRED items. No push. ENGINE_BUILD at the final src `eb-9d34d28f1b19ef3d` (read from dist; moved this run: dmg264, aiv266, aiv267; tell the website).
- **Folded: dmg264 + dmg264b** (ISSUES #206 type effectiveness in ROM row order, #208 defender Reflect / Light Screen in the live damage calc; both removed;
  `docs/dmg264-type-order-screens.md`). Census 0..999 vs `sv-20261109/aip262/census/*-e2e0b17b5`: ON 190 / OFF 181 changed, 0 unexplained; the 9 ON-only seeds
  differ only in the Scene ON `MOVE_ANIMATION` stale-damage argument (evd265, presentation-only, ROM-correct). ROM: seeds 13 / 28 now match to battle end.
  dmg264b (side lane, 70 min) re-staged olnd113 Razor Wind 201 -> 353 (per-class ROM anchor from off108, all three uses start at 42) and sag130 CONFUSION|player
  437 -> 856; both new seeds are changed seeds, the assertions are unchanged and hold on the corrected tree. Worker gates on the same src/tests: typecheck 0,
  full suite (8 shards) **1,754 files / 14,443 tests passed, 0 failed**, build / build:lib 0, soak vanilla 0:20 OFF 20 / 20, ON 20 / 20.
  Supervisor: touched files 4 / 4 (45 tests) on the merged tree; `romDriveSeed.sh 28 off` 19 / 19, divergence null. AI damage-sim screens left to #204 (noted there).
- **Folded: aiv266** (ts lane, 146 min; entry below). Supervisor: touched files 3 / 3 (31 tests); `romDriveSeed.sh` 17 off 16 / 16 and 31 off 34 / 34 (the worker
  drove 31 ON only), divergence null; field semantics spot-read against C (`Cmd_if_status_in_party` exact `==`, target-side screens, user-side Mist).
- **Folded: aiv267** (ts lane, 164 min; entry below). Supervisor: `romDriveSeed.sh 20 off` 15 / 15, divergence null; aiv267 / aiv266 / orchestrator tests
  91 / 91; re-pin diffs read (orchestrator cursors, causally fix B). The aiv266 "Attract female user -10" lead was refuted by the supervisor (ISSUES #204).
- **Census baseline now:** `.integration/evidence/aiv267/census/{on,off}-5682cd341`; src final for this run at `5682cd341`.
- **Folded: seg268** (side lane, 36 min, tests / fixtures / tools only; `docs/seg268-exposure-regen.md`): revived `seg127Exposure.ts` / `seg127ExposureSummary.py`
  from `4f6fa87e4^`, regenerated `fixtures/seg127/exposure.json` on the current kernel (0..999 Scene ON; receipts 8080 -> 8023, gated 72, frames 729 -> 745, 0 unclassified);
  sag130 re-anchored to the first projected carriers: restores hit-secondary|BRN|player, hit-secondary|PSN|opponent, yawn|SLP|player, adds contact-ability|PRZ|player and
  hit-secondary|BRN|opponent; named gap yawn|SLP|opponent (no gated carrier). Worker: consumer tests + test:gate 362 / 362. Supervisor: diff read; covered by the wind-down full suite.

- **Gates** (final tree `576565e44`, src == `5682cd341`): full suite (3 workers, beside the soaks) **1,756 files passed + 44 skipped, 0 failed; 14,479 tests**; build / build:lib 0;
  vanilla 0:20 OFF **20 / 20**, ON **20 / 20** (all `budget`); 0:60 default **60 / 60**, winning **60 / 60**, winning-swap **60 / 60**; varied-RNG first-round winning
  carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; play:random 10 min / scene: ON 36 battles / 15 swaps, OFF 64 / 28, 0 page errors / console errors / overlays.
- **Folded: dia269** (side lane, diagnosis only, 38 min; `docs/dia269-leads.md`): root causes for the remaining ROM-driver divergences. High confidence, each scratch-fixed
  to a full seed match: seed 22 AI "negates type" ignores the C dual-non-immunity glitch, 30 AI speed checks ignore paralysis, 39 AI damage estimate drops species /
  hold-effect terms (all ISSUES #204, rewritten); 53 stale MOVE_EFFECT_BYTE (new #209, high, not re-driven); 42 RNG draw order (new #210, medium-high); 50 / 57 / 60 open.
  Supervisor read C `Cmd_if_type_effectiveness` (`battle_ai_script_commands.c:1515-1557`): the glitch comment confirms lead A.
- **Next:** handoff "Next work" 1: fix #204 A / B / C, #209, #210 as ts steps with the aiv267 proof shape (dia269 has the sites and test ideas), then drive seeds 61..100;
  then the sound segment diff. Bundle bnd257d and Cleanup 7 did not fit this run (the only cleanup-type step was seg268's coverage restore).
