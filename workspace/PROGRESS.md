# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-10 / 11 — CAX31 daily run (supervisor, Opus 5.5): in progress

- **State:** master has dmg264 folded (merge `32c671d17`); evidence `.integration/validation/sv-20261110/`. No DEFERRED items. No push. ENGINE_BUILD moved
  (src changed: dmg264; value recorded at wind-down; tell the website).
- **Folded: dmg264 + dmg264b** (ISSUES #206 type effectiveness in ROM row order, #208 defender Reflect / Light Screen in the live damage calc; both removed;
  `docs/dmg264-type-order-screens.md`). Census 0..999 vs `sv-20261109/aip262/census/*-e2e0b17b5`: ON 190 / OFF 181 changed, 0 unexplained; the 9 ON-only seeds
  differ only in the Scene ON `MOVE_ANIMATION` stale-damage argument (evd265, presentation-only, ROM-correct). ROM: seeds 13 / 28 now match to battle end.
  dmg264b (side lane, 70 min) re-staged olnd113 Razor Wind 201 -> 353 (per-class ROM anchor from off108, all three uses start at 42) and sag130 CONFUSION|player
  437 -> 856; both new seeds are changed seeds, the assertions are unchanged and hold on the corrected tree. Worker gates on the same src/tests: typecheck 0,
  full suite (8 shards) **1,754 files / 14,443 tests passed, 0 failed**, build / build:lib 0, soak vanilla 0:20 OFF 20 / 20, ON 20 / 20.
  Supervisor: touched files 4 / 4 (45 tests) on the merged tree; `romDriveSeed.sh 28 off` 19 / 19, divergence null. AI damage-sim screens left to #204 (noted there).
- **New census baseline:** `sv-20261109/dmg264/census/{on,off}-9dddc1aa2` (src identical to master after this fold).
- **Next:** #204 AI view fields (aiv266, gender first), then #207, then drive seeds 41..80.

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

---

## 2026-11-10 — aip262 (ts lane worker): live AI view fills `usablePartyMons`; ISSUES #203 fixed (removed)

- **State:** committed on master (not pushed). ENGINE_BUILD `eb-43a8872b3b6234fe` -> `eb-16ee24851bfb26a3` (tell the website). `docs/aip262-usable-party-mons.md`.
- **Did:** `countUsablePartyMons` (`factoryAiLiveDriver.ts`, C `battle_ai_script_commands.c:1292-1334`) fills both AI views, so Baton Pass / Explosion / Memento / Roar score on real counts.
  `tests/aip262UsablePartyMons.test.ts` (6; fail unfixed). ROM: seed 2 ON 23/23, aligned set still full, fresh seeds 9..20: 8 match fully, 4 lead divergences (not this bug). Census 0..999: 97 changed seeds,
  identical ON / OFF, 0 unexplained (`aip262Instrument.py` / `aip262Classify.py`). 9 re-pins (coverage loss: apx222 Peck 64 row). Gates: typecheck / build / build:lib 0, soak vanilla 0:20 OFF 20/20; full suite in 6 shards on the final tree 14,433 passed, 0 failed.
- **Next:** ISSUES #204 (unfilled AI view fields, gender), #205 (Roar `SwitchPartyOrder`), #206 (Fire Punch 46 vs 45), #207 (confusion self-hit hold items).
- **Notes:** the worker's scene-ON soak timed out; the supervisor ran it on this tree: vanilla 0:20 ON 20 / 20 (session entry above).
