# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-15 — lbw3 (ts lane worker): the Lobby NPC wander port (ISSUES #221 E4)

- **State:** on master, committed (`d57c76a6e` pure module + Tier-1 replay, `fa1ed06de` engine wiring / renderer / traces, `7ee9d8bbc` soak re-pin, docs after). Battle rules untouched.
- **Did:** `lobbyNpcs.ts` (woman WANDER_AROUND + fat man LOOK_AROUND, collision against range / grid / player + static objects), `lobbyNpcDriver.ts` (freeze timeline from ticks since the Lobby entry: unfrozen at +34 / +35 and from the release, frozen otherwise from +11 and during the attendant talk), `core.ts` runs it on the shared `rngValue` on every Lobby path, the renderer draws both NPCs from state (`womanAtTick` retired to a test oracle in `tests/factoryLobbyFreeRoam.test.ts`; fat man gets S / N / W poses). `docs/lbw3-lobby-npc-port.md`.
- **Proof:** Tier-1 replay on 6 traces (tiles, facing, step, delay, anim index, 32-bit cursor every frame); engine route with `appRngRebase`: app cursor == ROM `gRngValue` every frame, max |offset| 0, NPC state identical. compare before -> after: loss-beyond-boundary 183/183, loss-lobby-walk 177/177, lbra-loss 2258/2258, forfeit 1087-1199 0 -> 109/113, retire-off 1315 -> 1476/1554, won-no 0 -> 54/54, won-yes 0 -> 54/54, won-attendant 0 -> 17/17 + 6/6 + 44/44 (residuals: forfeit 4 frames at the player sprite, retire 78 frames of dialog text pacing; none NPC).
- **Re-pins (Lobby new-challenge deals only):** `lbrd.test.ts` WIN_TWO_SEED 35 -> 13; `randomRoundSoak.test.ts` ISSUES #89 Baton Pass seed 1 -> 0. `factoryLobbyTerminal.test.ts` fat man frames 1 -> 3. No other test moved.
- **Gates:** typecheck 0; test:smoke 448 / 448; test:gate 362 files / 2,843; build / build:lib 0; npm test shard 1/6 305 files green (the supervisor runs the full suite).
- **Next:** unproven (docs): the player in the woman's way, retire-after-won / injected / attendant-return entries use the shared rule; free-roam player-vs-NPC collision and depth sort still use the static spawn tiles. Evidence `.integration/evidence/lbw3/`.

---

## 2026-11-15 — CAX31 daily run (supervisor, Opus 5.5): wind-down: held-item effect drawn + timed + sounds, cries in move tasks, Lobby cursor fix

- **State:** master clean, no workers, no worktrees; no push. **No DEFERRED items.** Final engine `5a42c61f5` (after cry1), then lbr-g merged (`620b0607f`, #221 E1-E3) + the iss215 probe-import fix (`ff2d2afec`).
  ENGINE_BUILD `eb-93fedef9241b4242` -> **`eb-0c05d14e04bac704`** (dist-lib of `5a42c61f5`; after lbr-g **`eb-c26961a07ff6b07b`**, the build to ship; tell the website). Evidence `.integration/validation/sv-20261115/`.
- **Website (Mac):** Leftovers / berries / Shell Bell now play the ROM's held-item animation (Scene ON) and its pause (Scene OFF), so those
  battles run longer; the animation's three sounds play; Roar / Howl / Hyper Voice play their cries (the player still uses the NORMAL sample for the
  ROAR / HIGH_PITCH / ECHO modes). After a loss / forfeit / retire / 7-win the Lobby RNG cursor now follows the ROM up to the NPC wander, so an in-game new challenge deals a different (closer to the ROM) draft. No API change.
- **Gameplay (replay, item 0d):** nightly check on `9d0fb2f01`: pool **44 / 44** (1,780 states), staged battles **69 / 69** (`docs/replay-ledger.md`).
  No battle-rule change this run, so no wind-down permanent-list drive.
- **Folded:** `lbr-f-residual2` (saving -> saved +2 ticks; gates on the merge: full 14,830 / 14,830, soaks 20 / 20 + 60 / 60); hie1 (held-item command
  + OFF Pausex20 hold), hie2 + hie2b (Scene ON drawing; hie2's age-0 fit absorbed each lab's pre-segment drift, hie2b replaced it with one rule,
  age 0 = command frames - 204, every window exact at the lab's own offset), hie3 (SEs 152 / 228 / 102: ROM-only 24 / 8 / 11 -> 0 / 0 / 3 on 5 seeds),
  cry1 (T1 `missing-cry-task` 371 -> 0), lbw1 + lbw2 (Lobby NPC wander simulator matches the ROM on 6 traces; ISSUES #221 filed), lbr-g (#221 E1-E3: VBlank draws held until ReturnFromBattleToOverworld, Pokerus + save-block draws, Lobby map-load draws; offset 0 on 6 traces from the battle exit to entry + 33; re-pins lbrd WIN_TWO_SEED 2 -> 35, randomRoundSoak Baton Pass 12 -> 1 / vanilla swap-offer 0 -> 1 / winning chain 47 -> 13).
- **Gates (final engine `5a42c61f5`):** full suite **14,935 / 14,935**; build / build:lib 0 (typecheck by every worker + test:gate 2,843). Soaks
  (`029d0943b` = hie3 tree; cry1 is sound-events only): vanilla 0:20 OFF **20 / 20**, ON **20 / 20**; 0:60 default **60 / 60**, winning **60 / 60**;
  varied-RNG first-round winning carry 0 / 14 / 28 **100 / 100** each, winning-swap carry 0 **100 / 100**; on `5a42c61f5`: winning-swap 0:60
  **60 / 60**, vanilla 0:20 ON **20 / 20**. play:random 10 min / scene `--lobby-new-challenge` on `5a42c61f5`: ON 33 battles / 13 swaps / 8 new
  challenges, OFF 53 / 16 / 15; **0 page / console errors / overlays**. **lbr-g** (on its branch): typecheck 0, build / build:lib 0, test:gate 2,843, full suite 14,937 passed / 1 failed (iss215 tools ratchet, the lbw probes, fixed in `ff2d2afec`), soak vanilla 0:20 **20 / 20**; merged tree: lb* / ratchet / soak-pin tests 142 / 142, build:lib 0, soak winning 0:20 **20 / 20**. The 0:60 and varied-RNG gates did not re-run after lbr-g (next run).
- **Next:** Run start: the 0:60 / varied-RNG soaks on master (lbr-g landed after them). #221 E4 = the Lobby NPC wander port (lbw1 simulator is the test oracle; `docs/lbw1-lobby-wander-evidence.md`); cry-task
  audio modes (cry-task-scout step 2); #220 residuals (cure berry ages 1-11, +1 Shell Bell / Leftovers, post-heal tail ~18); the second
  `Status_*` play +14; move-body SE lifetimes (aud242 family); then aud246 (S11 close). Nightly replay at run start as usual.

---

## 2026-11-15 — cry1 (ts lane worker): cries inside move-animation tasks (ISSUES #219 family 3, step 1)

- **State:** on master, committed (`28272f3f8` first cries + fixtures, `6bcc6705a` second cries / stops / restore + length model, docs after). Sound only: frame hashes identical (differential vs `029d0943b`, `--harness-from-head`: cry1-roar-jynx-player-on, cry1-hypervoice-jynx-player-on,
  cry1-howl-jynx-player-on 1823 captures each); census seeds 0..99 Scene ON: only `sound` / `soundDigest` move (9 seeds, 12 Roars = 48 rows), `eventsDigest` / `commands` / `soundAnim` identical, 0 errors.
- **Did:** `moveAnimSounds.ts` plays the cry tasks in Scene ON: Roar ROAR_1 at script frame 6 (ducks), ROAR_2 +11, restore ROAR_2 + D_R2; Howl HIGH_PITCH at 34, restore + D_HP; Hyper Voice ES at 5 (DuckNoRestore), stop at D_ES, EE +1, round-2 stop at +53 (species independent), ES2 +55, stop, EE2, restore at the earlier of
  EE2 + D_EE and first ES + 98 (scheduled from the first cry: it falls after the engine's presented animation). Lengths: `cryTaskLengths.ts`, D = min(cap, ceil(K t) + 1), t = native cry frames (`genCryNativeFrames.py` -> `cryNativeFrames.ts`), one K per mode (ES .94996 cap 26, EE .970325 cap 141, R2 .944111 cap 61, HP .919943 cap 51):
  zero residual on 41 / 41 / 32 / 35 ROM species, and 32 / 32 pre-registered held-out edge species exact. 6 step-mode ROM windows (`tools/audio/fixtures/cry1-*-on.json`) pin every effective row (`tests/cry1CryTasks.test.ts`, 23 tests); engine = ROM + lab drift (+13 / +13 / +1 Roar, +4 Howl, 0 / 0 Hyper Voice).
- **Rescore:** T1 `missing-cry-task` 371 -> 0 (ROAR 336, HYPER VOICE 27, HOWL 8 sites; `soundCensusDelta.py` now counts a site emitted when its window holds a cry-task cry); T2 (seed 2: two Roars, ROM 4 cry rows + duck / restore all matched, missing 0 / extra 0; seeds 165 / 499 / 830 / 1028 use none).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; 29 importer / aud24x / aud25x / hie3 / cry1 files green; build / build:lib 0. Full `npm test` not run (the supervisor runs it).
- **Next:** the cry-task audio modes (ROAR / HIGH_PITCH / ECHO fall back to NORMAL; scout step 2); Howl +4 / Roar +13 lab drifts unexplained. Evidence: `.integration/evidence/cry1/`.

---
