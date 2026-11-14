# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-14 — cln279 (ts lane worker): cleanup 1, second sweep: 236 unreferenced step-id scripts / fixtures deleted

- **State:** on master, committed (`dfb2ca8d1`); no src change, ENGINE_BUILD unchanged. One reversible commit: 236 files, 1,182,306 bytes under `tools/integration` and `tools/compare` (fixtures / json only a deleted probe read included).
  List `docs/archive/cln279-deleted.txt`; candidates + reasons `.integration/evidence/cln279/candidates.txt` (ignored). Recover: `git checkout dfb2ca8d1^ -- workspace/<path>`.
- **Method:** `tools/cleanup/keepClosure.ts` (cln237's closure; roots = every tracked non-md file outside the two dirs, incl. src / tests / package.json / configs / test-gate.list / other tools; comments stripped, `${template}` and name-fragment matches).
  Kept by doc despite the scan (now seeds): `soundCensusDelta.py`, `soundCensusExpected.ts` (handoff + aud243a T1 recipe), `pmf240CardProof.ts` (handoff). tools/audio, replay-hunt, parity-mac, oracle and `tools/compare/evidence` untouched.
- **Gates:** typecheck 0; test:gate 362 files / 2,843 tests; full suite as 8 foreground `--shard=i/8` runs at 3 workers: 14,773 tests passed / 44 skipped files / **1 failed**: `tests/compareTraceAppRoute.test.ts`
  (`iss216-same-species-off.json` lacks `appRoute`; added by `ae5db0299`, not touched here); build 0.
- **Next:** set `appRoute` on that one trace (or allowlist it). Notes: one foreground `npm test` exceeds the 10-min cap; shards of 3-7 min each work.

---

## 2026-11-14 — iss216 (ts lane worker): rental select refuses a second Pokemon of one species; trapped switch prints the ROM text (ISSUES #216, #217)

- **State:** on master, committed (engine `ec35a617c`, `ae5db0299`, #217 commits after). ENGINE_BUILD `eb-a781acbda4dff91e` -> **`eb-a68be11111cd7dd3`** (read from dist-lib; the draft and the party menu moved).
- **#216:** `Select_AreSpeciesValid` (`battle_factory_screen.c:2256-2276`) ported: RENT of a second same-species ball prints "Can't select same \uE053\uE054." (the PK MN glyph pair, `{PKMN}`),
  erases the popup, keeps the pic open and the pick count unchanged; only A leaves it (`STATE_CHOOSE_MONS_INVALID`) and restores the select prompt. ROM staging by RAM poke
  (`tools/probe/stage-draft-same-species-off.py`, `tools/compare/draftSameSpecies.ts`, trace `iss216-same-species-off`, appStage `iss216-dup-draft-off`). Measured: text reprints 1 tick
  after the A, popup text 1 tick and its highlight bar 2 ticks after, no ball stall on the refusal, one on the dismiss. The soak driver re-plans a refused pick without drawing RNG.
  The swap screen's `Swap_AlreadyHasSameSpecies` was already ported (`factorySwap.ts` `duplicateSpecies`, `tests/factorySwap.test.ts`, probe doc `docs/factory-swap-duplicate-species-off-probe.md`).
- **#217:** the ROM runs "is already in battle" (active slot) before the trap checks; a bench pick under Wrap / Mean Look / Ingrain / Rooted prints `gText_PkmnCantSwitchOut` with the ACTIVE mon's name,
  under Shadow Tag / Arena Trap / Magnet Pull `gText_PkmnsXPreventsSwitching` ("Foe X's ABILITY\nprevents switching!"). `battleSwitchTrap.ts` is the one trap check (the legal-decision list uses it too);
  `battlePartySelect.ts` prints the text. The forced route (`partySelect.ts`) never has a trapped bench: unchanged.
- **Gates:** typecheck 0; test:smoke 448 / 448; test:gate 362 files / 2,843 tests (after regenerating the ability census and gate-6 manifest); 210 test files importing a changed module 2,276 tests;
  build / build:lib 0; soak vanilla 0:20 OFF **20 / 20** (7 + 13); soak winning vary-rng first-round carry 28 seeds 0:100 **100 / 100** (25 + 75). No soak pin moved.
- **Residuals (ISSUES #218):** `iss216-same-species-off` 391 / 469 (refusal window 169..244 exact; the rented ball is one tick off after the dismiss, plus the known OFF flash-close residuals); #217 has no ROM lab window
  (Tier-1 from source; the `\p` ending of the ability text is unmeasured).
- **Next:** none required. Papercut: soak 0:20 with the default policy and `--parallel 2` runs about 3 min per 7 seeds (vanilla), fine in chunks; `--help` on the soak tool starts a default soak instead of printing usage.

---

## 2026-11-13 — lbr-d1 (ts lane worker): a 7-win returns to the walkable Lobby in the same mount (handoff item 0b, step 4)

- **State:** on master (engine `afa750655`, tests `d811222d8`, docs after). ENGINE_BUILD `eb-8faf63dbde5168d5` -> **`eb-a781acbda4dff91e`** (read from dist and `engineBuildCheck`; tell the website:
  7-win trajectories moved, the next draft is dealt from the Lobby cursor). `docs/lbrd-win-lobby-return.md`.
- **Website contract:** after `round-end` the mount keeps running in the Lobby (no `challenge-end`, no `challenge-request` hold for a won round); the attendant continues the streak in the same mount and trace.
  A later retire or loss still emits `challenge-end` (then the usual `challenge-request` hold).
- **Did:** removed the 7-win -> new-draft chain; carry banked on Lobby entry + `lobbyStreakKept` (attendant hand-off keeps streak / rents); won terminal BP text per round (3 / 4 / 5, 14 for a Brain win);
  won input gates 41 / 74 (ROM, lbr-d2a); `FactorySession` `wonLobbyPending` retire-guard; soak / `play:random` walk to the attendant after a 7-win; re-pins (chaining a / b / c, issue104 YES / cancel,
  randomRoundSoak seven-win pin seed 10 + test b); `tests/lbrd.test.ts` (15, OFF and ON); lbrc / library / session-header wording; handoff 0b ticked.
- **Gates:** typecheck 0; test:smoke 448 / 448; test:gate 362 files / 2,843 tests; brief vitest list 12 files / 178 tests; 47 more importing files 242 tests; build / build:lib 0;
  soak winning 0:20 **20 / 20 OK** (all `budget`; all 20 seeds reached a 7-win and continued in the Lobby, 15 reached carry 14, seed 2 carry 28).
  soak winning-swap 0:20 **20 / 20 OK** (worker); play:random 2 min / scene `--lobby-new-challenge` (supervisor, worker cut at its 120-min cap before it): 0 page / console errors / overlays, a round advance in each scene.
- **Next:** lbr-d2b compare trace (farewell glyph +-1 tick, `recordDisabledFarewellEdgeFromRestore`, won Lobby door walk); full suite at the supervisor's wind-down (not run here).
  Papercut: soak 0:20 --parallel 2 takes ~35 min each (results only print at the end).
