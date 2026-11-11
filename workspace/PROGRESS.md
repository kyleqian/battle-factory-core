# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
- **Next:** handoff "Next work" 1: a read-only diagnosis of the remaining ROM-driver divergences (seeds 22 / 30 / 39, ISSUES #204; 42 / 50 / 53 / 57 / 60, aiv267 doc
  section 7), then fixes by rank, then drive seeds 61..100; then the sound segment diff. Bundle bnd257d and Cleanup 7 did not fit this run (no cleanup step besides seg268's coverage restore).

---

## 2026-11-11 — aiv267 (ts lane worker): AI damage sims see the target's screens; confusion self-hit sees the hold item; ISSUES #207 deleted, #204 trimmed

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-6e0938c0ec978db5` -> `eb-9d34d28f1b19ef3d` (tell the website). `docs/aiv267-ai-screens-self-hit.md`.
- **Did:** (A) `factoryAiTryToFaint.ts` passes the target side's Reflect / Light Screen into `calculateBaseDamage` (C `AI_CalcDmg`, `battle_script_commands.c:1306-1309`); new view field
  `targetSideLightScreenUp` from `sideStatuses[0]`. (B) the confusion self-hit (`battle_util.c:2157-2175`) gets the live battler's `holdEffect` / `holdEffectParam` / species in BOTH roles
  (+ Frontier flag for Soul Dew). `tests/aiv267AiScreensSelfHit.test.ts` 13 tests, 9 fail unfixed. ROM: seed 20 ON / OFF now 15/15 (was the self-hit divergence 35 vs 18); 22 / 30 / 39 ON
  unchanged (8/20, 6/11, 9/11); the 14-seed regression set (1 3 4 5 6 8 11 13 17 26 28 31 224 552) still matches fully. Census 0..999: 8 changed seeds per scene (245 379 682 743 816 829 911 946),
  all fix B (Silk Scarf / Thick Club / Choice Band self-hits), identical sets and command-list changes ON / OFF, 0 unexplained (`aiv267Instrument.py` / `aiv267Classify.py`); fix A touches
  46 seeds' decisions but changes one score (377) and no pick. Re-pins: `factoryRoundBattleOrchestrator` seeds 4 / 17 / 26 / 29 + challenge-2 chain (fix B only), parity-census lines, gate6
  manifest. Gates: typecheck / build / build:lib 0; 8-shard suite 14,479 passed, 0 failed (1,756 files); soak vanilla 0:20 OFF 20/20, ON 20/20.
- **Next:** ISSUES #204 item (seeds 22 / 30 / 39 ON), then seeds 41..80 ROM drives.
- **Notes:** new census baseline `.integration/evidence/aiv267/census/{on,off}-5682cd341` (src identical to HEAD). No coverage loss.

---

## 2026-11-11 — aiv266 (ts lane worker): live AI view fills all 16 declared fields; ISSUES #204 trimmed

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-16ee24851bfb26a3` -> `eb-6e0938c0ec978db5` (tell the website). `docs/aiv266-ai-view-fields.md`.
- **Did:** `createFactoryAiViewFromLiveRules` fills `gender`, `anyMoveDisabled` / `anyMoveEncored`, target `isParalyzed` / `isPoisoned` / `isBurned`, `holdEffect` (user live item, target
  via battle history as in C), `targetSideReflectUp`, `mistUp`, `stockpileCount`, `speciesAbilities`, `targetPartyStatusEqualsAny` (exact `==` STATUS1_ANY), `usedHeldItemId`,
  `imprisonedOthers`, `mudSportUp`, `waterSportUp`, each with a C cite. `tests/aiv266AiViewFields.test.ts` (22; 20 fail unfixed, incl. all 3 gender tests). ROM: seeds 11 / 17 / 26 now
  18/18, 16/16, 16/16 in both scenes (were 10/20, 0/19, 8/16); bonus 31 ON 34/34 (1/34), 27 ON 20/20 (3/20), 32 ON 23/23 (22/23); 22 / 30 / 39 unchanged; the 10-seed regression set still full.
  Census 0..999: 57 changed seeds per scene, identical sets and command lists ON / OFF, 0 unexplained (`aiv266Instrument.py` / `aiv266Classify.py`). 4 re-pins (land75 533 count 64 -> 68,
  sag130 drops `yawn|SLP|player`, parity-census lines +7, gate6 manifest regenerated). Gates: typecheck / build / build:lib 0; 8-shard suite 14,466 passed, 0 failed; soak vanilla 0:20 OFF 20/20, ON 20/20.
- **Next:** ISSUES #204 residuals (AI damage sims ignore Reflect / Light Screen; unclassified seeds 22 / 30 / 39), #207, then seeds 41..80.
- **Notes:** new census baseline `.integration/evidence/aiv266/census/{on,off}-40447d9de` (src identical to HEAD). Coverage loss: sag130 `yawn|SLP|player` (regenerate seg127 `exposure.json`).


---

## 2026-11-09 / 10 — CAX31 daily run (supervisor, Opus 5.5): wind-down: aud243d / abl261 / aip262 / dia263 folded

- **State:** master clean; final engine src == aip262 (`344dbf234`; later commits are docs / tools only). Evidence `.integration/validation/sv-20261109/`
  (gates in `gates/`). No DEFERRED items. No push. ENGINE_BUILD at the final src `eb-16ee24851bfb26a3` (moved this run: abl261, aip262; tell the website).
- **Folded:** aud243d (integration, ~50 min; `docs/aud243d-rom-driver.md`): closed-loop ROM driver (`tools/audio/romDecisionDriver.py`, `soundEventProbe.py lab
  --drive`, `romDriveSeed.sh`) replays the engine's decision list on the ROM by menu state to battle end; first sound segment diff (`soundSegmentDiff.py`).
  Supervisor reran seed 8 ON (6 / 9, same divergence frame) and read the ability map (4 ids). Found #202 / #203.
- **Folded:** abl261 and aip262 (entries below; supervisor full suites on each final tree, `gates/suite1.log` 1,752 passed and `gates/suite2.log` **1,753 files passed
  + 44 skipped, 0 failed, 14,433 tests**).
- **Folded:** dia263 (integration, diagnosis only, 65 min; `docs/dia263-leads.md`): #205 was a driver bug (party-menu slot through `gBattlePartyCurrentOrder`, fixed in
  tools); #206 root cause (type table row order); #204 ranked (`gender` first); new #208 (Reflect / Light Screen not passed to the live damage calc). Supervisor read
  both src sites (`applyTypeEffectiveness` loops defender types; screens only on the Future Sight path). Seeds 21..40: 11 full match, 8 diverge (per issue in the doc).
- **Unmerged, kept for the next run: dmg264** (#206 type-table row order + #208 Reflect / Light Screen; branch `worker/side-20261110-045211` `aba497135`, base
  `336e03b3b`; `docs/dmg264-type-order-screens.md` on the branch; evidence `sv-20261109/dmg264/`). Killed at its 95-min cap: ROM seeds 13 / 28 now match to battle
  end and the aligned set still matches; census 0 unexplained, BUT changed sets differ by scene (ON 190 vs OFF 181; earlier fixes were identical) -- explain this
  first: the 9 ON-only seeds (61, 182, 189, 190, 434, 477, 756, 821, 899) are flagged in both scenes; supervisor check: their census `commands`
  lists are byte-identical base vs dmg264 (HP rows too); only `eventsDigest` differs in Scene ON. **Explained by read-only scout evd265:** the only differing
  field is `MOVE_ANIMATION` `arguments[3]` (the stale `gBattleMoveDamage`, floored to 1 per typecalc row) on Thunder Wave / Stun Spore; Scene OFF emits the
  attack pause with no arguments; presentation-only and ROM-correct (`Cmd_typecalc` `:1386-1406`, `ModulateDmgByType` `:1321-1325`). Its last full suite had a Razor Wind census-seed test with no unchanged re-stage seed found (reverted, unresolved); build / build:lib / soak not run.
  Next run: rebase or merge onto master, resolve the scene difference and that test, full suite + build, then fold.
- **Gates** (on aip262's src): build / build:lib 0; play:random 2 min / scene: ON 8 battles / 6 swaps, OFF 15 / 6, 0 page errors / console errors / overlays;
  vanilla 0:20 OFF **20 / 20**, ON **20 / 20** (all `budget`); 0:60 default **60 / 60**, winning **60 / 60**, winning-swap **60 / 60**; varied-RNG first-round winning
  carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**.
- **Next:** handoff "Next work" 1: the ROM-driver gameplay fixes (finish dmg264 #206 + #208 from its branch, then #204 `gender`, #207), then seeds 41..80, then the sound segment diff.
  Bundle bnd257d (lazy sprite chunk; brief ready in the handoff's bnd-d line, scout `docs/bnd-d-scout.md`) and Cleanup 7 did not fit this run.
- **Coverage notes:** abl261 dropped 3 sag130 classes and aip262 the apx222 Peck 64 row (no unchanged census seed carries them; regenerate seg127 `exposure.json`
  from the new census to restore). One Castform body in battle 950 now declines (cf78 comment).
