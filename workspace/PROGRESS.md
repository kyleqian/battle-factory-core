# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-14 — CAX31 daily run (supervisor, Opus 5.5): wind-down: last Mac fold, rare-rule hunt 50 / 110, General_* sounds, Lobby up to the draft

- **State:** master clean, no workers; worktrees removed (evidence copied to `.integration/evidence/` first, except rrh1-3 / aud248 / lbr-d2b
  scratch, lost with their worktrees before I caught it; their committed stages / docs / traces re-run). Branch **`lbr-f-residual2`** kept
  (unmerged, see Next). No push. **No DEFERRED items.** Oracles restarted at run start (both predated the harness's battle-lab fix).
  ENGINE_BUILD `eb-8faf63dbde5168d5` -> **`eb-93fedef9241b4242`** (dist-lib of the final engine; tell the website). Evidence
  `.integration/validation/sv-20261114/` (`gates/` = fold, `final/` = wind-down).
- **Website (Mac):** after a 7-win the mount keeps running in the Lobby (no `challenge-end` / `challenge-request` for a won round; the
  attendant continues the streak). An in-game new challenge now walks through the PreBattleRoom briefing before the draft, so its deal moved
  (toward the ROM). The rental draft refuses a second Pokemon of one species. More battle sounds play (stat changes, status conditions, weather,
  Focus Punch, Leech Seed, Castform). No API change.
- **Gameplay (replay, item 0d):** `mac/parity-mac` `165548c4b` (fixes 29 to 43) folded at run start: sandTomb sha re-pinned, typecheck 0, full
  suite 14,750 / 14,750. Nightly (pinned worktree): pool 40 + 4 Brain **44 / 44**, staged battles **32 / 32**. Wind-down permanent list
  **64 / 64** (1,148 states) on the final engine. Rare-rule hunt rrh1 / rrh2 / rrh3: **50 of 110** (c) rules covered by ROM-matched stages
  (`docs/parity-mac/stages/coverage/`, 50 files), R019 / R029 / R031 / R033 class (b), **no differences**; `docs/parity-mac/STATUS.md` box sections.
- **Folded:** iss216 (#216 / #217), lbr-d1 (7-win Lobby return), lbr-d2b (won traces), lbr-e (PreBattleRoom, 3 traces 255 / 255), lbr-f
  (won record prompt 1 tick earlier), aud248 (S11 scoreboard, `docs/aud248-s11-scoreboard.md`: **acceptance not met**; stat-change SE), aud249 /
  aud250 (General_* SEs; census 0..199 gameplay fields equal both scenes), cln279 (236 step-id scripts deleted). Filed #219 (sound gaps), #220
  (held-item effect animation not presented: ~214-235 frames short per Leftovers / berry segment in Scene ON; plan `docs/hie-scout.md`).
- **Gates (final engine `da0272fb4`; `010ef7abe` after it fixes 3 ratchets, src import-path only):** full suite 14,829 passed / 3 failed -> the 3
  (animation boundary, dif256 harness, iss215 tools; from this run's merges) fixed in `010ef7abe`, those files + touched 8 / 8; typecheck 0;
  build / build:lib 0; test:gate on `010ef7abe` 362 files / 2,843 tests. Soaks: vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default **60 / 60**, winning **60 / 60**, winning-swap **60 / 60** (all `budget`); varied-RNG first-round winning carry 0 / 14 / 28
  **100 / 100** each, winning-swap carry 0 **100 / 100**. play:random 10 min / scene `--lobby-new-challenge` on the final build (`010ef7abe`): ON 33 battles / 13 swaps / 11 new challenges from the Lobby, OFF 57 / 13 / 24; **0 page / console errors / overlays**.
- **Next:** #220 (held-item effect presentation + its SEs) is the biggest sound / timing gap; then the aud242 move-body lifetimes, cries in
  animation tasks, the second `Status_*` play (+14). Lobby: merge branch `lbr-f-residual2` (`f58db4171`: the fix + lbr-f2's re-pins, lbrd `WIN_TWO_SEED` 35 -> 2 (the only
  seed of 1-7 passing the full file: fragile), lbre same-timeline exact at cursor `0x4ea349da`; lb* + randomRoundSoak 129 / 129, attendant
  trace 1349 / 1416) after typecheck, test:gate, full suite and soaks; then NPC wander. Hunt: the remaining 56 rules need new team ideas (rrh3) — one step per run at most.
  Nightly replay from the pool at run start; no Mac fold (the branch no longer moves).

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
