# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-15 — hie3 (ts lane worker): General_HeldItemEffect sound effects (ISSUES #220 step 3)

- **State:** on master, committed (`b8ad30f62` engine + test + 5 fixtures, docs after). Sound only: frame hashes identical (differential vs `5054340cf`: hie1-sitrus-on 1823, hie1-cheri-on 1823, hie2-sitrus-opp-on 1101, hie1-sitrus-off 823 captures);
  census seeds 0..99 Scene ON: only `sound` / `soundDigest` move (82 seeds), `eventsDigest` / `commands` / `soundAnim` identical, 0 errors.
- **Did:** `moveAnimSounds.ts`: Scene ON `HELD_ITEM_EFFECT` plays 152 / 152 / 152 / 228 / 102 (pan attacker -64 / 63) at script frames 8 / 40 / 72 / 104 / 176 (table has only the first op; the rest is the measured spacing
  after `waitforvisualfinish`); **script frame 0 = command start + minimumFrames - 214**, one rule (restart 15, continuation 9, cure berry -22). The cure berry's first SE (14 frames before the command) is emitted from the preceding
  32-frame `status` command's age (it lasts exactly its length; no carry state). Scene OFF: none. Step-mode ROM windows on 5 labs (`tools/audio/fixtures/hie3-*-on.json`): ROM first SE 754 / 754 / 766 / 772 / 737 minus the
  lab drift (9 / 9 / 17 / 17 / 20, hie2b's) = engine frame exactly, all five rows each (`tests/hie3HeldItemSounds.test.ts`, `docs/hie3-held-item-sounds.md`).
- **T2 rescore** (5 Scene ON seeds 2 / 165 / 499 / 830 / 1028, ROM re-driven, before = base `moveAnimSounds.ts` on the same ROM files): ROM-only 152 24 -> 0, 228 8 -> 0, 102 11 -> 3 (the 3 are seed 499's SE_SHINY, not held items); extra 0.
  The 8 events match with all five rows at one delta each (lab drift -18 .. -2, one +48 in seed 2).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; 25 files importing moveAnimSounds / tickSounds + aud24x / aud25x 280 / 280; build / build:lib 0. Full `npm test` not run (the step says the supervisor runs it).
- **Next:** cries in animation tasks; the open #220 residuals (Cheri ages 1-11, Shell Bell / Leftovers +1, post-heal tail). Evidence: `.integration/evidence/hie3/`.

---

## 2026-11-15 — CAX31 daily run (supervisor, Opus 5.5): in progress

- **State:** master green through `3250873e3` (full suite **14,839 / 14,839**); hie2 + hie2b merged (`e9b68fc07`), its full suite pending.
- **Did:** nightly replay (pinned `9d0fb2f01`) **44 / 44** + stages **69 / 69** (`docs/replay-ledger.md`); merged `lbr-f-residual2` (`15777da20`)
  after its gates on the merge (typecheck, test:gate 2,843, full 14,830 / 14,830, soak vanilla 0:20 20 / 20, winning 0:60 60 / 60); hie1 (below);
  lbrd's retire case moved to seed 2 (hie1 moved the deal). hie2 drew the held-item effect but fitted its age 0 to each lab's pre-segment drift
  (app ~9-20 frames ahead of the ROM before the window); hie2b replaced that with age 0 = command frames - 204 and proved every window at the
  lab's own offset (`docs/hie2-held-item-render.md`; typecheck 0, test:gate 2,843, 252 importer files, build / build:lib 0, OFF + icePunch
  differential 2,152 captures identical).
- **Next:** #220 step 3 (SEs, hie3); cries in animation tasks; Lobby NPC wander step 1 (evidence).

---

## 2026-11-14 — hie1 (ts lane worker): the held-item effect is presented in both scenes (ISSUES #220 step 1)

- **State:** on master, committed (`f05283ed0` labs / traces, `2610c0580` engine + re-pins, docs after). ENGINE_BUILD `eb-93fedef9241b4242` -> **`eb-e1bc81a090e2b568`** (read from dist-lib; battles with Leftovers / berries / Shell Bell run longer).
  Presentation only: eventsDigest identical on census seeds 0..199, both scenes (`.integration/evidence/hie1/census`, `censusDiff.mjs`); only `commands` / sound frames moved (sound ids / pans equal).
- **Did:** `battleResolutionPresentation.ts`: Scene ON a `general-animation` HELD_ITEM_EFFECT command at the kernel event (`HELD_ITEM_EFFECT_COMMAND_FRAMES` 214 + lead 15 for a script restart
  (Leftovers, Sitrus) / 9 for a continuation of the move script (Shell Bell, cure berries); skipped behind a Substitute doll; a cure berry's preceding 32-frame `status` command is netted out, +1);
  Scene OFF the Pausex20 as a `move-animation` hold before the print (kernel executions since the previous receipt + the same leads; after a status command, the lead only). Kernel, RNG, sprite-order / allocator pins untouched.
- **Measured** (ROM minus app at the print, `hie1-{leftovers,sitrus,shellbell,cheri}-{on,off}` labs, before -> after): OFF 51 / 50 / 45 / 9 -> 0 at all four sites; ON 237 / 229 / 223 / 203 -> +8 / 0 / +1 / 0
  (Leftovers keeps +8: unmodelled per-site lead, ISSUES #220). The lead spread is per path (restart 15 / continue 9), not constant. Pre-existing, left: Leftovers / Shell Bell post-heal tail ~+18 late (ISSUES #220).
- **Re-pins:** `tests/factoryRoundBattleOrchestrator.test.ts` (Shell Bell: one hold command shifts hp 11 -> 12); `tests/randomRoundSoak.test.ts` seed 21 frames 41_068 -> 41_099 / renderCalls 2_899 -> 2_907, vanilla seeds 0 / 1 frames 9_185 -> 9_212, 9_233 -> 9_271
  (all frames only), winning-carry test seed 16 -> 47 (seed 16 now carries 7; scanned 0..80: 47 / 50 / 61 / 70 chain two wins). New `tests/hie1HeldItemEffect.test.ts` (9). `ice-punch-grovyle-onix` unchanged.
- **Gates:** typecheck 0; test:smoke 448 / 448; test:gate 362 files / 2,843 tests (+ new file); build / build:lib 0; 166 importing files green after the re-pins; soak vanilla 0:20 default scene **20 / 20 OK** (`budget`).
- **Next:** #220 step 2 (renderer: rotation / stars / ring / tint on the battler) and step 3 (SEs 152 / 228 / 102); the Leftovers ON +8 and the ItemHealHP_Ret tail are the open timing residuals.
