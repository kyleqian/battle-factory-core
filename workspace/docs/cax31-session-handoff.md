# CAX31 session handoff — 2026-10-26 (finish plan; state updated 2026-11-11)

The user approved `docs/finish-plan.md` on 2026-10-26 and restarted the
running CAX31 session on it. Run on CAX31's `master` at
`/srv/pokebench/pokeemerald-factory-core/workspace`, Opus 5.5 supervisor,
Sonnet 5.5 workers, headless in tmux. Commit locally; never push. Keep the
Mac supervisor stopped. Read the plan first, then PROGRESS.md's top entry.

## Standing user authorization (2026-10-26): daily runs

The user asked on 2026-10-26 for a 10-hour run every day. The pokebench
crontab starts `/srv/pokebench/ops/daily-run.sh` at 21:30 UTC, and each run
it starts is authorized. This supersedes the "fresh user authorization" and
"no recurring timers" wording in earlier handoffs, AGENTS.md and
LOCAL_SETUP.md; automatic push stays off. Do not edit or disable the
schedule. Leave this handoff ready for the next day's run and keep this
section when rewriting it. An OPEN entry in DEFERRED.md stops the next runs
from starting until the user resolves it, so use one only for a real user
decision. The run that was killed on 2026-10-26 (`cax31-20261026.jsonl`, exs207
worker on `worker/integration-20261026-213055`) was timing work; its branch is
kept and is long-tail.

## State at restart (written at the 2026-11-12 wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Core library package folded (`f88653929`, `docs/library-package.md`). The Mac's
  `worker/lib-v2-mac` is folded up to `851ee1f4c`; if the Mac moves that branch again, merge the new tip the same way
  (typecheck, its touched tests, full suite).
- **Audio (S11):** design accepted (`docs/s11-audio-design.md`); steps 1-3 folded; **step 4 (screens) DONE**: aud240a (draft /
  swap / dialogs), aud240b (summary), aud240c (battle party menus, `docs/aud240c-party-menu-sounds.md`), aud240d (Lobby /
  PreBattleRoom / BattleRoom scripts, heal + BP fanfares, `docs/aud240d-script-sounds.md`). Emitters live in
  `src/engine/screenSounds.ts`. Prove windows in probe **step mode** (the hybrid `--fast` mode drops no-op SEs); one-command fixture
  recipe in PROGRESS (sep257: `--compact`, trace key, `--rm-log-on-success`); `compare:differential --harness-from-head` (dif256).
  aud240d left unmeasured: MUS_OBTAIN_SYMBOL, PauseChallenge SE_SAVE, the Brain SE_POKENAV_CALL absolute frame.
  **Step 5 (battle controller) DONE (2026-11-05):** aud241c battle end / return (`src/engine/battleEndSounds.ts`,
  `docs/aud241c-battle-end-sounds.md`, ROM fixtures `docs/aud241c-fixtures.md`; generated route only), aud241a battle start / send-outs
  (`src/engine/battleStartSounds.ts`, `docs/aud241a-battle-start-sounds.md`, ISSUES #196) and aud241b effectiveness / SE_FAINT /
  faint cry / low-HP (`src/engine/battleHitSounds.ts`, `docs/aud241b-battle-sounds.md`, timing deltas ISSUES #197). Both emit
  from `tick()` in `src/engine/core.ts` behind `soundCollecting()`. Lab staging for sound windows: `tools/compare/appTrace.ts`
  stages (`midBattleSwitchStage` options bag) + `tools/battle-lab/aud241*`.
- **Audio step 6 (aud242) first slice DONE (2026-11-06):** aud242a `src/engine/moveAnimSounds.ts` plays the decoded script
  `playsewithpan` / `playse` / `waitplaysewithpan` / `loopsewithpan` (Scene ON only) from `src/data/gen/anim-sound-timing.json`
  (`npm run extract:anim-sound-timing`) at body age `f + 1 + 7`; `docs/aud242-move-anim-sounds.md` has the age map, op inventory
  and slice plan; residuals and unemitted families ISSUES #198. **aud242b / aud242c DONE (2026-11-07):** the extractor resolves
  `waitforvisualfinish` (known task / sprite / `simple_palette_blend` lifetimes), `waitbgfade*` (Task_FadeToBg model + measured BG load
  lag for IMPACT / HIGHSPEED / DARK), side branches; `panse*` / `setpan` emit the new `pan` SoundEvent kind; createsoundtask
  LoopSEAdjustPanning / FireBlast and PlaySE1/2WithPanning ported (doc sections 6-7; 739 ops resolved). **aud242d / e / f DONE
  (2026-11-07 / 08, doc sections 8-10):** instant-task table, palette-blend family, fixed-length sprite and mon-task lifetimes; Level-50
  emitted 550 -> 674 (160 still gated), all resolved 868. Per-move offsets ISSUES #198. Remaining: Blizzard (per-species off-screen
  lifetime), Tri Attack / Bubblebeam / Luster Purge / ExtremeSpeed / Psychic / Curse / Spark / Attract, `blend_color_cycle`,
  `HardwarePaletteFade`, cry tasks (Roar 36 sets), the waitsound SE-length table, the #198 alignment audit (most moves sit at +2).
  **aud242g DONE (2026-11-09, doc section 11):** SetPsychicBackground, Tri Attack, Bubblebeam (SwayMon simulated), Thunderbolt orb, Spark;
  Level-50 emitted 692 (142 gated), all resolved 894.
- **Audio step 7 (census parity):** aud243a DONE (`docs/aud243a-sound-census.md`): `emitTickSounds` (`src/engine/tickSounds.ts`) shared by
  `tick()` and the census; census rows carry `sound` / `soundDigest` / `soundAnim`; `soundCensusDelta.py` (arm-vs-arm, `--t1`; T1 is
  self-consistency only). aud243b (gate failed) + aud243c DONE (`docs/aud243c-alignment.md`): the ROM menu RNG is post-AI, the replay
  (`tools/integration/soundCensusRomReplay.ts`) aligns on `gRandomTurnNumber`; turn 1-2 match on 4 runs; frame-timed inputs drift after the
  first faint. It found ISSUES #201 (fixed by sub260, below).
- **sub260 DONE (2026-11-09, `docs/sub260-ignore-substitute.md`):** source-proven gameplay fix, `Cmd_datahpupdate` clears
  HITMARKER_IGNORE_SUBSTITUTE; 13 / 1000 census seeds change, identical in both scenes, all explained.
- **sum259 DONE (2026-11-09, `docs/sum259-summary-flow.md`):** #192 (a) draft return cursor, (b) open+63 summary input gate (ROM-exact),
  (c) swap summary UP / DOWN (residuals in #192).
- **Bundle:** bnd256c DONE (`docs/bnd256c-pixel-provider.md`): headless 22.5 -> 10.7 MB. `lib.ts` must CALL `installBundledMonPicPixels()` (`"sideEffects": false` drops bare imports; fixed at wind-down). **Cleanup 5:** cln244 DONE (Dive reducer
  incremental, full suite 17.1 min at 5 workers; `docs/cln244-dive-incremental.md`). ENGINE_BUILD moved this run (tell the website).
- **Cleanup:** steps 1, 2, 3 (cln239), 4 (cln241, 2026-11-06: `core-rs/` removed from master, `docs/cln241-core-rs-removal.md`;
  local branch `core-rs-archive` `26ce8d051` keeps it, the user pushes it to its own repo) and 6 are done. Step 5 first half DONE
  (cln240: `npm run test:gate`, `docs/cln240-test-gate.md`). **Step 5 second half DONE (cln242, 2026-11-07, `docs/cln242-suite-speed.md`):**
  vitest `json.stringify` in test mode; test:gate ~97 s; the full suite runs at `POKEBENCH_VITEST_MAX_WORKERS=5` in ~21 min when
  nothing else runs (peak <= 11 GB); census-superseded sc106 / sgl138 route pins deleted. Next lever: `src/animation/dive.ts` re-simulates
  from tick 0 per row. No wasm artifact is needed any more.
- **4b(g) DONE (2026-11-06):** frf250a BAG prints "Items can't be used now." and RUN opens the forfeit prompt (NO / B back to the
  menu), ROM-measured both scenes (`tests/frf250aBagRunMenu.test.ts`, traces `frf250a-*`); frf250b YES prints "<PLAYER> forfeited
  the match!" and ends the battle as a loss through the normal lost-battle return (`src/engine/battleForfeit.ts`,
  `tests/frf250bForfeit.test.ts`, trace `frf250b-run-yes-off`). The soak random player answers the prompt (see the driver).
- **User reports:** 4b(b) also covers Quick Attack / Aerial Ace now (qak248 / qak249). 4b(a) fully fixed (vis243a mid-battle send-in; go246 battle-start "Go!" intro waits for both species
  animations in Scene ON, `docs/go246-intro-wait.md`; Kyle's SPOINK was cut short by 137 frames, now exact); 4b(b) Agility
  clip fixed (agi245); 4b(c) rate check permanent (`tests/rng244OutcomeRates.test.ts`).
- **4b(e) DONE (obr251, 2026-11-07, `docs/obr251-opponent-party-summary.md`):** the opponent faint-replacement ball bar slides, holds
  100 frames, fades, mirrors its balls and plays SE_BALL_TRAY_ENTER; residuals ISSUES #200. **#195 / #191 fixed (flw252):** party menu
  input waits for the open fade, refusal text for its printer; postwin multichoices step on new presses only.
- **2026-11-10 run: the census ROM replay became a gameplay-bug finder.** aud243d (`docs/aud243d-rom-driver.md`): closed-loop ROM driver
  (`tools/audio/romDriveSeed.sh SEED on|off DIR`, one JSON line per seed; driver `tools/audio/romDecisionDriver.py`) replays the engine's decision list on the
  ROM by menu state to battle end and compares HP / RNG / last moves per state. Fixes it found and landed: **abl261** (#202, abilities in the damage calc,
  179 / 1000 census seeds change, `docs/abl261-ability-damage.md`), **aip262** (#203, AI usable party count, 97 / 1000, `docs/aip262-usable-party-mons.md`).
  **dia263** (`docs/dia263-leads.md`) fixed the driver's party-slot mapping and root-caused the rest: ISSUES #204 (16 unfilled AI-view fields, `gender`
  first), #206 (type-effectiveness row order), #207 (confusion self-hit hold items), #208 (Reflect / Light Screen). Seeds 0..40: fully matching
  1-10, 12, 14-16, 18-21, 23-25, 29, 34-38, 40, 177, 224, 552; diverging seeds are listed per issue in the dia263 doc.
- **2026-11-11 run: three more ROM-driver gameplay fix steps folded.** dmg264 (#206 type-table row order, #208 Reflect / Light Screen in the live calc,
  `docs/dmg264-type-order-screens.md`), aiv266 (#204: all 16 live AI-view fields filled, `docs/aiv266-ai-view-fields.md`), aiv267 (AI damage sims see the
  target's screens; #207 confusion self-hit hold items, `docs/aiv267-ai-screens-self-hit.md`). Seeds 1..60 ON (0 unchecked) now match the ROM to battle end except
  22, 30, 39 (#204 remainder, AI scoring, not view fields) and 42, 50, 53, 57, 60 (aiv267 doc section 7, first-row classes only, not root-caused); 33 is
  not drivable (Brain trainer id). The aiv266 "Attract female user" lead was refuted (ISSUES #204).
- **2026-11-12 run: five gameplay fixes, the first sound assets, the Lobby return, the PLAYER name.** aiv270 (#204 A type-effectiveness probe quirk, B full
  GetWhoStrikesFirst speed in the AI), aiv271 (#204 C: AI damage sims use the real hit chain's `battleScriptDamageTerms`), fix274 (#209 MOVE_EFFECT_BYTE cleared
  per action, #210 `chosenMovePositions` written at selection); seeds 22 / 30 / 39 / 42 / 50 / 53 / 57 now match (dia272 `docs/dia272-leads.md` proved 42 / 50 / 53
  and leads seed 60: forced-Struggle turn runs the AI chooser, scratch 36 / 82 -> 73 / 82). aud244a recorder + 6.14 MB OGG cries / SEs
  (`docs/aud244a-recorder-assets.md`). lbr-a (`docs/lbra-lobby-return.md`): loss / forfeit / retire end in the walkable Lobby; soak / play:random walk to the
  attendant. pnm273: `PLAYER_NAME` (`docs/pnm273-player-name.md`; compare harness renders MEMORY).
- Census baseline for the next delta: `.integration/evidence/fix274/census/{on,off}-237ee0e5e` (the fix274 fixed arms; src == master's final engine src at the 2026-11-12 wind-down
  except pnm273's name strings, which the pnm273 0..49 census showed digest-neutral).
- **4b(d) DONE** (frs247, `docs/frs247-faint-replacement-reshow.md`): the faint-replacement return rises from black, no player bar.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

**Status at the 2026-11-12 wind-down:** item 0: aud244a DONE (cries + SEs); next aud244b (BGM / fanfares with ROM loops, the looping SE_LOW_HEALTH / SE_M_GUST),
then aud245 player. Item 0b: lbr-a DONE; next lbr-b (attendant conversation), then lbr-c, lbr-d; open from lbr-a: no Scene ON loss / retire ROM lab, the app emits
no SE_SAVE on the loss / retire result script (ROM 4007 / 7503 in the lbra windows). Item 0c DONE (pnm273). Item 0d: #204 C / #209 / #210 DONE; next in the
gameplay queue: audit A2 (switch-in scorer power gate; `docs/dia275-triage.md`: seeds 109 / 107 / 79), A4 (pass-2 base damage 0, = ISSUES #204
remainder; seed 123), seed 60 (dia272 lead), the rest of ISSUES #211 (95 / 114 = AI draw count) and #212 (A3, B1, B2, ...). A1 is mostly covered by aiv271 (status1 / pinch / weather / Flash Fire now come from the real builder); re-check its rows on a seed.

0. **User decision 2026-11-11 (Kyle, "Yes, start sound"): start sound PLAYBACK now, alongside the ROM-driver gameplay
   fixes.**
   - **Pace:** every run folds at least one playback step and one gameplay-fix step from item 1, one worker at a time as usual.
     **Superseded 2026-11-12 (item 0d, "Two machines"): battle-rule fixes moved to the Mac lane (`worker/parity-mac`); the
     box folds that branch at run start and gives its own steps to sound, cleanup and the Lobby work.**
   - **No more waiting:** playback no longer waits for census parity (0 missing / 0 extra, design step 7) or for the remaining
     aud242 lifetimes. A sound we don't emit yet just stays silent and gets filled in as parity improves.
   - **aud244, recorder + assets** (design section 5 / step 8). It may split into cries / SEs / music.
     - A python recorder over mGBA `core.get_audio_channels()`.
     - Asset list: the distinct `(kind, id, pan | species, mode)` tuples in the ROM logs so far, plus every Factory species'
       cry in NORMAL / WEAK / FAINT. The register-poke driver is allowed for recording only.
     - BGM / fanfares get their ROM loop points from `sound/songs/midi/*.s`.
     - Output: OGG plus `manifest.json` under `src/assets/gen/audio/`. Report the sizes. The headless graph stays free of audio.
   - **aud245, player** (design section 6 / step 9).
     - `src/audio/player.ts`: WebAudio, loaded by dynamic import. It models m4a's SE1/2/3 priority, the BGM duck under cries,
       fanfare pause / continue, and fades.
     - API: `FactoryGameOptions.audio`, `setAudio` / `getAudio`, a `?audio=1` dev shell, `lib-types` and
       `docs/library-package.md`. Muted by default.
     - Accept:
       - frame hashes identical with audio on and off;
       - full suite + build + build:lib;
       - browser play with audio audible;
       - Safari decode checked, with an AAC fallback.
   - **Hosting:** the Nintendo-derived audio follows the user's existing decision on the art. `options.audio.baseUrl` lets the
     website serve the files.
   - **Website:** the mute button is the Mac's job. Name the API change and the new ENGINE_BUILD in PROGRESS when aud245 lands.
0b. **User decision 2026-11-12 (Kyle approved the top layer's recommendation): every challenge end returns to the Lobby,
   as in the ROM, and a new challenge starts in-game at the attendant.**
   - **Pace:** one step per run, alongside item 0 and the gameplay fixes.
   - **Why:** the website used to freeze the game at `challenge-end`. It will now let the game run on (the Mac's job), so
     whatever the engine does after the end is now on screen.
   - **ROM flow** (read-only scout 2026-11-12, top layer, verified in the decomp; re-check each line before you build on it).
     Every end type warps to the Lobby (BattleRoom:86-90, 104-111, 222-227) and then runs the Lobby `OnFrame` result script:
     - **Loss / retire / forfeit:** `LostChallenge`, Lobby:65-75, text 370-375. The streak flag is cleared (:71), then
       `factory_save 0` (`SaveGameFrontier`, battle_factory.c:269-275) with SE_SAVE (:72-74).
     - **Record question:** asked if allowed, YES/NO with NO preselected (:76-85). A forfeit sets `disableRecordBattle` and
       skips it (battle_main.c:5058-5062, Lobby:77-78). Then the farewell (:89-94) and free control.
     - **7 wins:** the won script, Lobby:40-59. Congratulations, the BP award, the exchange, save, record, farewell. The
       streak flag is kept, so the next attendant start continues the streak (battle_factory.c:208-212). The Brain
       variants are at Lobby:48-50.
     - **Starting again** (singles attendant at (4,7), Lobby:108-172):
       1. welcome, then CHALLENGE / INFO / EXIT;
       2. "Level 50 or Open Level?";
       3. "I need to save the game. Is that okay?";
       4. YES runs `factory_init`, then the full save dialog (:159);
       5. "Please step this way.", the door walk and warp, then the PreBattleRoom and the draft.
   - **What our engine does today** (`core.ts:1270-1300`, `docs/nch231-new-challenge.md`):
     - After a loss, and after a 7-win, the record answer chains straight into a new draft (`enterChainedFactoryChallenge`).
       Only RETIRE-YES reaches the farewell and the walkable Lobby.
     - In the Lobby, A at the attendant deals a draft at once, with none of the dialogue above (`core.ts:1204-1221`).
     - Probably also a bug: after a forfeit we still ask the record question (`factoryTerminalPresentation.ts:395-417`,
       inferred, not run).
   - **Steps:**
     1. **lbr-a.** Loss, forfeit and retire all play the ROM result script, then the farewell, then the walkable Lobby;
        delete the loss -> new-draft chaining on the production route. Fix the forfeit record-question skip. ROM windows for
        each, both scenes.
     2. **lbr-b.** The attendant conversation (ROM text and menus, ROM-measured):
        - CHALLENGE / INFO / EXIT;
        - the level menu: Open Level shown but unselectable, the same treatment as REST (deliberate divergence; only Lv50
          is modelled; record it in the scope doc);
        - the save prompt, then the save dialog.
     3. **lbr-c, the library contract change (additive):**
        - When the player confirms the save at the attendant after a challenge ended, emit a new event
          `{ type: "challenge-request", frame }` at the moment the ROM's save dialog starts.
        - The game then holds on that screen (no input, keeps drawing) until the host destroys the mount.
        - The host creates the next server challenge (it prefetches one at `challenge-end`) and mounts it. That new mount
          starts at the draft, as today.
        - `challenge-end` stays exactly where it fires now: the trace and the anti-cheat stay one challenge per mount, and
          nothing after the end is uploaded.
        - Also add a mount option `start: "after-save"` that begins at "Please step this way." / the door walk, so the
          cut is short; it is optional, and can follow later.
        - Document it in `docs/library-package.md` and `lib-types`, and name the event plus the new ENGINE_BUILD in
          PROGRESS so the Mac wires the site.
     4. **lbr-d, 7 wins:** return to the Lobby inside the same mount and trace (BP, save, record, farewell), then the
        attendant continues the streak in-game. That is the same server challenge, so no host hand-off and no
        `challenge-request`; `round-end` stays where it is.
0c. **User decision 2026-11-12 (Kyle): the player's name defaults to "PLAYER", not the oracle save's "MEMORY".**
   - **Scope:** one small step, first free slot.
   - **Where MEMORY is baked in today:** `FORFEIT_MESSAGE_PLAYER_NAME` (`battleCommandPresentation.ts:324`), the record
     messages (`factoryTerminalPresentation.ts:207`, `:270`, `postwin.ts:808`), the BP award (`factoryTerminalPresentation.ts:292`),
     and 5 test files. Grep the rest of the tree, the generated data included, before you trust that list.
   - **Shape:** one constant, `PLAYER_NAME = "PLAYER"`, in one module, used by every site.
   - **Timing:** both names are 6 characters and the text prints 1 frame per glyph, so frame timing is unchanged. Prove it:
     a differential over the census traces must show only those message boxes' pixels changing, and the kernel digest must
     not change.
   - **ROM comparisons:** the oracle save stays "MEMORY". Any ROM-pixel comparison over those boxes passes "MEMORY"
     through a harness-only override, or masks the name. Never change the oracle save.
   - **Later, not now:** a per-player name. That would be a `playerName` mount option stored with the server challenge,
     and nothing is needed for it today.
   - **Website:** ENGINE_BUILD moves. Open site challenges finish on the build they started on (the site archives every
     build), so nothing strands.
0d. **User decision 2026-11-12 (Kyle): the real-game replay becomes THE gameplay check, and it must not slow development
   down. He left the schedule to the top layer; the schedule below is that choice.**
   - **Why:** `docs/gameplay-parity-audit-2026-11-12.md`. Soak, census, pins and the coverage docs never compared a live
     battle number with the ROM; only `tools/audio/romDriveSeed.sh` does. Kyle's goal is sound core battle logic with complete
     parity. His constraint: the check must not bog the work down, and it need not be exhaustive, only probabilistically sound.
   - **First batch (top layer, Mac, tree `69241cf85`, seeds 61..160 OFF; audit doc section 6):** 78 full match, **20 diverge**,
     2 not drivable (Brain). 279 s wall at 8 lanes on the Mac.
   - **Second batch (top layer, Mac, seeds 161..1160 OFF; audit doc section 7):** 840 full match, **139 diverge**, 21 Brain.
     34 min wall at 12 lanes. Re-driven on `5750e868c` (with your aiv271 and fix274): **115 seeds are open in total**
     (audit doc section 8). They are sorted by signature in sections 7 / 8.
   - **Division of labour (Kyle, 2026-11-12: "keep the nightly job lean; harvest in bulk on the Mac"):** bulk discovery is the
     Mac top layer's job (1,000 new seeds in about 34 minutes there), and it re-drives the open list after fixes land and
     updates the lists in the audit doc. The box's nightly job stays small (below). The box does not need to hunt for new
     mismatches: there are 115 open seeds waiting.
   - **Claim rule (now):** report gameplay status only from replay results: seeds driven, matched, consecutive clean, and what
     the replay cannot reach yet (audit doc section 5). Do not call battle logic complete or parity-verified from soak, census,
     pins, "engine-referenced" or message-count coverage.
   - **When the replay runs. This is all of it; nothing runs per code change:**
     1. **Once per run, at run start, in the background.** `nohup`, `nice -n 19`, 2 lanes, a hard 60-minute wall cap, on the
        tree as it stands at run start. **The regression list only** (it must stay matching): its job is to catch a fixed
        battle that the box's own work or a merge broke. No new seeds on the box (Kyle, 2026-11-12: discovery is the Mac's
        job) and no open seeds (they are known failures). Scene OFF, and every tenth regression seed ON as well. Do not wait for
        it: dispatch the first worker as usual and read the result when it ends. Use 1 lane if it starves a full suite.
     2. **Gameplay-fix steps, as today:** the worker re-drives the seed(s) it fixes and the permanent list. No new seeds in
        worker steps.
     3. **Wind-down:** the permanent list on the final tree, only if an engine gameplay change landed in the run.
     - Audio, presentation and cleanup steps never run the replay. No existing gate is removed: the soaks still cover deep
       rounds and swaps, which the replay does not reach yet.
   - **Two lists (state on `5750e868c`, your 2026-11-12 wind-down engine, re-driven on the Mac; "the permanent list" in this
     item means the regression list):**
     - **Regression list** = seeds that diverged once and match now; they must keep matching (64):
       2 6 8 11 13 17 20 22 26 27 28 30 31 32 39 42 50 53 57 75 88 110 155 158 190 198 202 235 248 260 279 298 311 366 435 440 459 521 530 543 555 564 591 596 613 619 650 665 698 761 770 841 846 872 894 971 999 1001 1011 1028 1031 1103 1118 1134.
     - **Open list** = seeds that still diverge (115): 60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 and the 99 listed as still open in
       audit doc section 8. A seed moves from open to regression when a fix makes it match to battle end.
     - A new divergence joins the open list with its seed, scene and first diverging row. One ISSUES entry per CAUSE, not per seed.
     - Not drivable until replay upgrade 3: 24 Brain seeds (33, 82, 131 and 21 in section 7's batch).
   - **Ledger:** create and keep `docs/replay-ledger.md`: per run the commit, seed range, matched / driven, new divergent seeds,
     the highest seed driven (1160 now; a Mac session is driving 1161..10000 from 2026-11-12, the box drives no new seeds, and the Mac's results land in `docs/replay-batches/` on branch `worker/replay-batch-mac`) and the consecutive-clean count. A seed is driven as "new" once only.
   - **Two machines (Kyle, 2026-11-12, last decision of the day: "Sure, let's try that"). This replaces the earlier
     "battle-rule fixes are the MAIN program of every box run" pace of the same day.**
     - **The Mac lane owns battle-rule diagnosis and fixes.** It is a separate session on the Mac working on branch
       `worker/parity-mac` (real-ROM replay is about 5x faster there). It turns the open seeds into bug reports and fixes,
       one cause group at a time, in the queue order below. Its records are new files under `docs/parity-mac/`
       (`STATUS.md` first); it does not touch PROGRESS / ISSUES / ROADMAP / this handoff.
     - **It ships its branch to this box as `refs/remotes/mac/parity-mac`** (fetch-only; it never touches your working tree,
       `master` or processes).
     - **Your part, at run start, before the first worker:** if `mac/parity-mac` moved, fold it: `git merge mac/parity-mac`,
       typecheck, its touched tests, full suite, build, re-pin any sound / census anchor the gameplay change moves, then write
       the PROGRESS and ISSUES entries from its `docs/parity-mac/*.md`. Each Mac fix arrives with its own ROM proof (group
       seeds + the regression list); do not redo the census-attribution step for it.
     - **Sound is your main program again** (item 0 / item 1), with cleanup and the Lobby work as before. Do not start
       battle-rule fixes of your own while the Mac lane is active: two lanes on the same rules collide on the engine and
       on the census-anchored pins. If you find a gameplay bug, file it in ISSUES; the Mac lane reads ISSUES.
     - **Fallback:** if `mac/parity-mac` has not moved for two runs in a row, the Mac lane has stalled: resume the queue
       below on the box, battle-rule fixes first, and say so in PROGRESS.
     - Kyle wants both sound and battle parity finished; the split exists so neither waits for the other.
     Order of the gameplay queue (the Mac lane's, and yours under the fallback):
     1. the signature groups of audit doc section 7, largest first. A signature is not a proven cause: open each group with
        a diagnosis step on 2 or 3 of its seeds (dia263 / dia269 shape), then fix, then re-drive the whole group:
        (a) the ROM sends in a different opponent after a faint, 21 seeds (leads A2 / A3 / A4; your #204 remainder
        "switch-into scorer stub"); (b) Struggle, 24 seeds (new, not diagnosed); (c) Encore: the ROM opens the action menu,
        10 seeds (lead B2; this also lets the replay continue past any Encore); (d) confusion self-hit, 5 seeds (lead B6, seed
        218 shows ROM 31 vs engine 16); (e) infatuation, 5 seeds left (new). The recoil-on-a-non-recoil-move group is DONE:
        fix274 cleared all 7;
     2. the older open seeds (60 and 79..159; your dia272 Struggle lead on seed 60 may be group (b)), then the unsigned rest;
     3. the audit doc's section 2 rows that the replay cannot show yet, by reach: the rest of A1 (aiv271 fixed the #204 C
        part; check burn / pinch `maxHp` / Guts / weather / Flash Fire against it), A5-A7, B1 (Toxic counter), B3-B8.
     - Every audit row is source-read only. Confirm it on the ROM with the fix (a seed, or a Mechanic Lab `overrides.parties`
       scenario). File ISSUES entries from the audit doc at your next ISSUES edit; the top layer did not touch `ISSUES.md`.
   - **Replay upgrades (tools only; at most one per run, when the run has room after its audio and gameplay-fix steps; in
     this order):**
     1. **One pass and a batch runner.** Read the state timeline during the drive (`romStateTimeline.py` re-runs the ROM
        today), fewer process starts per seed, and a `--jobs N --minutes M` runner that writes the ledger rows. Mac: 18 s per
        seed alone (audit doc section 5). Report the CAX31 per-seed time before and after.
     2. **A random player.** A seeded random legal action each turn, voluntary switches included (the driver already drives the
        party menu for forced switches). Without it B1 / B2 / Pursuit / trapping / Natural Cure never occur at any seed count.
     3. **Reach.** Later battles of a round, Open Level, the Brain (the lab accepts `trainerId` 0..299 only; seeds 33 / 82 / 131).
     4. **Wider compare.** Per turn also status1 / status2, stat stages, PP, side statuses and timers, weather. The lab `state`
        capture already exposes them.
     5. **Tally and steering.** Count, per move effect / ability / hold effect, how often it took effect in a fully matched
        battle (not "named in source", not "printed a message"). Steer new battles toward the zero rows with Mechanic Lab
        `overrides.parties` teams.
   - **Finish line for "battle logic is done":** 3,000 consecutive clean new seeds with the random player across Level 50,
     Open Level and the Brain, and no zero row in the tally without a source proof that it cannot occur in the Factory.

1. **Audio (S11)** — the main program for several runs: `docs/s11-audio-design.md` section 7. Next: **aud241** battle
   controller family (effectiveness, SE_FAINT, faint / send-out cries with mode + pan, ball / tray / low-HP, battle BGM start /
   fade / victory, the battle-return BGM / SE_EXIT that aud240d measured: fade P+6, BGM 469 P+53, SE_EXIT P+79). Map and
   proposed split: `docs/aud241-scout.md`. **aud241a / b / c DONE 2026-11-05. aud242a DONE 2026-11-06** (generic script-op
   emitter, `docs/aud242-move-anim-sounds.md` section 4 is the slice plan). **aud242b / c DONE 2026-11-07; aud242d / e / f DONE
   2026-11-08; aud242g, aud243a / b / c DONE 2026-11-09.** **aud243d DONE 2026-11-10** (ROM driver). **Next, before more audio event work (playback is item 0 and runs alongside): the ROM-driver gameplay fixes** (dmg264, aiv266, aiv267 DONE 2026-11-11), one ts-lane step each with the
   abl261 / aip262 / aiv267 proof shape (tests, re-drive seeds, census attribution, full suite): the causes are in `docs/dia269-leads.md` (2026-11-11): fix ISSUES #204 A
   (seed 22), B (30), C (39), #209 (53), #210 (42) one step each, then seeds 50 / 57 / 60 (unconfirmed), then drive seeds 61..100 for new leads. After that, the sound segment diff
   (`tools/audio/soundSegmentDiff.py`, aud243d section 5: missing move-animation SE streams and stat-change SEs) over K >= 20 aligned seeds per scene; remaining aud242 lifetimes and the #198 alignment audit (`docs/al198-scout.md`) can interleave; next lifetimes ranked in `docs/aud242g-scout.md`. Open aud241 gaps: ISSUES #196 / #197, the canonical battleScene route plays no end sounds.
2. **Cleanup (one commit per step, verified by typecheck + full suite + build), in this order:** (1), (2), (3), (6) DONE;
   (5) DONE (cln240 + cln242 + cln244 Dive; optional: `summaryAllFactorySpecies` 134 s and `substituteDollDefenderLive` 80 s for < 15 min); (4) DONE (cln241);
   (7) evidence stops going into git (policy line in AGENTS.md DONE 2026-11-07; cln243 DONE 2026-11-07, 11,691 files / 204 MB untracked,
   `docs/cln243-evidence-untrack.md`; the ~593 MB rest of `tools/compare/evidence` is read by tests; remaining per `docs/cln7-scout.md`: ~590 MB of tracked evidence looks write-only;
   first a policy + new-output default to the ignored `.integration/evidence/`, then `git rm --cached` only after a moved-aside full
   suite; no rclone / R2 remote exists on this host, so off-host backup needs the user's setup -- keep evidence local meanwhile).
3. **Bundle hygiene** (scout: `docs/bnd-scout.md`; **bnd-a DONE 2026-11-08** as bnd253a, `docs/bnd253a-test-json.md`; **bnd-b DONE** as bnd254b, `docs/bnd254b-pic-geometry.md`; gamepad DONE as bnd255f (`connectGamepad`, `docs/library-package.md`); bnd-c DONE as bnd256c, `docs/bnd256c-pixel-provider.md`; next bnd-d (scout `docs/bnd-d-scout.md`; move `party-mon-icons` out of the `assets-sprites` manual chunk first): browser chunk split / lazy sprite sheets, `battleScene.ts` / `monPicRender.ts` / `summaryInfoPage.ts` still import the pixel JSON statically): test-only JSON out of `src/`, sprite pixels out of the headless graph
   (`battleCommandFieldArt`, 11.8 MB chunk), lazy-loaded sprite sheets and large tables, gamepad input through `press` / `release`.
4. **Crashes, nightly (unchanged):** `npm run build && npm run play:random -- --minutes 10 --scene both` (plus a
   `--lobby-new-challenge` run); Scene ON soak `--render-every 8` 0:16..0:30 plus a `--render-every 1` sample; varied-RNG sweeps;
   vanilla both scenes. Every overlay / pageerror / CRASH / HANG becomes a fix step before anything else.
4b. **User-reported visuals (Kyle, website, 2026-11-02): one step per run, after that run's audio + cleanup steps.**
   - (a) DONE (vis243a + go246). Named residuals in `docs/go246-intro-wait.md`: ELEKID / ARON frame animation one frame long,
     the long-cry (> 74) 4-frame early message clear (both scenes), bso226 release / ball-open frames.
   - (b) DONE (agi245 Agility; qak248 Quick Attack / Aerial Ace live clip 74 -> 160, `docs/qak247-clip-sweep.md`). Receipts:
     `tests/animation/quickAttackAerialAceOpponentClip.test.ts` (qak249). Open: ISSUES #194 (RATTATA Quick Attack residual, not the clip).
   - Flow gaps: ISSUES #191 (dialog cursors move on held repeat), #192 (summary flow gaps), #195 (party menu: cursor moves during the
     open fade; refusal text dismisses before it finishes printing).
   - **(g) DONE 2026-11-06 (frf250a / frf250b; see State at restart). Next in 4b: (e) below.** Original report:
     not visual (found 2026-11-05 by the top layer's live-site play-test on fb5516bc0): BAG and RUN do
     nothing in battle.** On the action menu, A on BAG or RUN is ignored: `battleCommandPresentation.ts:638-646` handles only
     FIGHT (0) and POKéMON (2), and returns the state unchanged otherwise. No sound, no text, the cursor stays. In a site trace
     (`437157099938d5e9c8cb6da1ee5c0a58`, test player) A on RUN at app 110024 / 110064 / 110092 changes nothing. The ROM:
     - **BAG:** `battle_main.c:4221-4232` (FRONTIER_NO_PYRAMID) -> `BattleScript_ActionSelectionItemsCantBeUsed`
       (`battle_scripts_1.s:4426`: printselectionstring STRINGID_ITEMSCANTBEUSEDNOW, then back to the action menu).
     - **RUN:** `battle_main.c:4322-4330` (TRAINER + FRONTIER) -> `BattleScript_AskIfWantsToForfeitMatch` (`:4547`:
       "Would you like to forfeit the match and quit now?" + forfeityesnobox). NO returns to the action menu.
     - **YES:** `battle_main.c:5058-5067` sets `B_OUTCOME_FORFEITED`, then `BattleScript_PrintPlayerForfeited` (`:4552`):
       "{B_PLAYER_NAME} forfeited the match!" + waitmessage, then the battle ends as a loss.
     - The kernel note at `factoryBattleScriptFullTurnDecision.ts:225-240` already cites this path and leaves the forfeit UI out.
     - **Do it in two steps.** (1) The BAG message plus the forfeit prompt with NO, which are presentation only. (2) YES: the
       forfeit loss through the round controller to the library's battle-end / challenge-end events. A forfeit must end the
       challenge as a loss, exactly like a lost battle, and replay identically (`replayChallenge`).
     - **DONE** (frf250a presentation, frf250b forfeit YES; `docs/frf250b-forfeit.md`). Scene OFF is ROM-exact; Scene ON has a named
       healthbox / fade gap there.
     - **Proofs:** ROM labs for both prompts and the forfeit text window. Measure the SE_SELECT on A and the frames from A to
       the first glyph.
   - **New, Kyle 2026-11-04** (website on 851ee1f4c), reproduced on the Mac from his trace `47192107276c654fbcdc1d038304aa0e`
     (seeds 2513123525 / 2478499883) through `FactorySession.replayStep` + `render()`. Prove each against the ROM, then fix the family:
     - **(d) DONE 2026-11-05 (frs247).** White flash after a faint replacement. After the forced party menu's SEND OUT, the screen is black for about 37 frames
       (app 17400..17437). Then the battle appears fully drawn but washed toward white (mean brightness 246 vs about 200 at rest)
       and fades down to normal over about 15 frames (17438..17453). The same in the second faint (25529). Every other return from
       black in that trace (voluntary switch 12543, battle starts) rises from black. The ROM reshow is one path for both:
       `CB2_SetUpReshowBattleScreenAfterMenu` -> `BeginHardwarePaletteFade(0xFF, 0, 16, 0, 1)` (`reshow_battle_screen.c:162`).
       BLDCNT 0xFF is effect 11 = brightness decrease, so it fades from black. Also, the washed frames draw the PLAYER's 6-ball
       bar (bottom right, unfaded, gone at 17453). The ROM never draws it here: `Cmd_drawpartystatussummary` emits flags 1 =
       "skip player side" (`battle_controllers.c:1509`). Likely class: the faint-replacement path reuses an intro / send-out
       presentation (white fade + player bar) instead of the reshow. ROM lab:
       `tools/battle-lab/playerfaint-slot2-sunnyday.json` (pfr185).
     - **(e) DONE 2026-11-07 (obr251; ISSUES #200 residuals). Original scout (2026-11-05, `docs/obr248-scout.md`, unverified: ROM slides in over 20 frames, holds 100 frames to the
       first glyph, BLDALPHA-fades out over 16, one SE_BALL_TRAY_ENTER; ours is static for 26 frames; balls must be mirrored
       `states[5-index]`; presentation-only but adds ~99 app frames per opponent replacement, so frame-anchored pins move, kernel
       digest unchanged; new code must stay out of `battleScene.ts`, split-eligibility ratchet).** Opponent replacement ball bar pops in and out. After "Foe PARASECT fainted!" the 6-ball bar appears whole in one
       frame (13365..13367), stays about 30 frames, and vanishes in one frame (13394..13397) before "BEAUTY LIZBETH sent out MINUN!"
       starts. In the ROM, `BattleScript_FaintedMonSendOutNew` (`battle_scripts_1.s:2883`) runs
       `drawpartystatussummary > ... > printstring STRINGID_SWITCHINMON > hidepartystatussummary`. The flags are 1, so the
       draw delay is NOT skipped: `OpponentHandleDrawPartyStatusSummary` -> `EndDrawPartyStatusSummary` holds 93 frames
       (`battle_controller_opponent.c:1925-1965`) before the text. The bar slides in (`SpriteCB_StatusSummaryBar_Enter`; balls via
       `SpriteCB_StatusSummaryBalls_Enter` with per-ball delays), stays up while "sent out" prints, then exits after it
       (`hidepartystatussummary`, `..._Exit`). `faint-switch-notes.md` §3 measured bar ~6588 and text 6687 in the ROM (≈ 93 + slide).
       Kyle: "takes slightly longer than what we currently have".
     - **(f) Message holds — check, likely no bug.** Kyle: "X was dragged out!" after Roar shows only briefly, and "a number of
       text" feel the same. In his trace the line prints 32634..32657, the box clears at 32668, and the action prompt shows at
       32674. The ROM has no `waitmessage` after `printstring STRINGID_PKMNWASDRAGGEDOUT` (`battle_scripts_1.s:3339`), so it is
       brief in the ROM too, at the oracle save's FAST text speed (1 frame per glyph). At MID (4 / glyph, the new-save default)
       every message lasts about 4× longer, so he may be comparing against a MID emulator. Asked him. If he wants a text-speed
       option, that is a feature: the print term scales by `sTextSpeedFrameDelays`, the holds do not
       (`docs/battle-message-hold-cadence-ground-truth.md`).
5. **Timing / visible residuals** last, never while items 1–3 have ready work: #146 / #143 remainders (SHEDINJA healthbox =
   compare-harness maxHP bug + `factoryCorpusParty.ts:291`, ISSUES #146 shd234; CASTFORM message region on the faint path,
   ENTEI / KINGDRA glow-lag frame, bso226 ONIX intro window, Castform "at"-role keys, Flamethrower +7 alignment, revert /
   switch-out unmeasured), the party-menu entry one frame early after a switch (pmo239), the forced party card's other 486 px
   vs the ROM (pmf240, `turn15-party-select` f20100; `tools/integration/pmf240CardProof.ts`), #188, #189,
   the Lobby attendant dialogue (nch231 skips it); exs207 refs kept. Note: `battle1-postwin-next-prompt` is not ROM-aligned
   around f25800 (the oracle is already in the Lobby); use `turn15-party-select` for party-menu ROM proofs.

**Host note (2026-10-28, again 2026-11-01):** two full suites at once on 16 GiB OOM-kill forks. Keep ONE worker at a time, and
the supervisor runs no suite / census while a worker may run vitest.

**Test note (2026-11-02):** the suite runs `isolate: false`; a test that mocks an engine module must use `vi.resetModules()` +
`vi.doMock` and undo both in `afterAll` (`tests/audioSinkPlumbing.test.ts`, contain209 / contain213), or it passes alone and
fails depending on file order.

## Gate recipe (unchanged)

Serialize heavy jobs; at most one worker beside them. typecheck;
`lsd194Census.sh` both scenes with `LSD194_CENSUS_JOBS=4 LSD194_SPLIT=4` +
`rst197CensusDelta.py`; `compare:differential` (3 traces); full suite under
`nohup` with an exit file (~47–66 min; diff reported files against
`git ls-files` if a vitest fork dies); build; soaks at wind-down. A supervisor
verification checkout made with `git worktree add` needs the `reference`
symlink and `node_modules` (the launcher does this for worker worktrees; the wasm
artifact is gone with core-rs, cln241). Production changes need full suite + build on
the exact folded code; evidence / tooling-only changes use the affected gates.

## Headless execution discipline

`tools/run-claude-supervisor.py` owns the one original campaign deadline.
Never use Monitor, ScheduleWakeup or end your turn waiting for notifications.
Retain worker PIDs/logs and poll with bounded foreground calls. If a turn
accidentally ends, the controller waits for worker completion and resumes the
same conversation; it does not reset the clock or duplicate the worker.

State lives next to the raw log in `.controller.json`. Before a genuine final
exit, commit a clean handoff and write the JSON file named by
`POKEBENCH_SUPERVISOR_STOP_FILE`, with `session_id` from
`POKEBENCH_SUPERVISOR_SESSION_ID`, `status=complete|blocked|wind_down` and a
nonempty `reason`. This is not a waiting mechanism. A stop cannot leave active
workers or a dirty checkout; wind-down is accepted only in the last 20 minutes.
Usage limits/provider failures stop the controller without automatic retries.
Use one worker at a time on this 16 GiB machine. Budget validation before
launching more production work; do not dispatch a worker whose cap exceeds
remaining campaign time. Leave a truthful committed handoff before the cap:
rewrite "State at restart" and "Next work" above, keep the daily-runs section.

## Host budget

Source `/etc/pokebench-runner.env`: two Vitest workers, four build/Cargo jobs,
16 GiB RAM and 8 GiB swap. Full suite ~21 minutes at 5 workers when run alone (cln242), else ~50 at 2. Serialize typecheck, full
suite, build, census and soak fan-outs; use retained PID/log/status files for
long jobs and keep polling in bounded calls. Do not kill/retry a job just
because its shell tool yielded. Read CAX31 `PAPERCUTS.md`; bound any soak
fan-out to free memory and collect every per-seed result. Use host path
helpers and `/srv/pokebench/vendor/mgba-venv/bin/python`, not Mac-specific
paths. Claude Code 2.1.280 and the Opus/Sonnet model defaults remain pinned.
Disk: each run leaves ~5 GB under `.integration/validation/`, and the daily
launcher refuses to start under 15 GB free. At wind-down delete evidence
folders older than the last three runs (keep the census baselines the next
run's delta needs; the user approved this on 2026-10-31, when the folders
from before 2026-10-28 were removed).
Oracle services stay localhost-only, ON 8012 / OFF 8014. Preserve pinned
ROM/ELF/map, worker refs and evidence. No copied provider credentials or new
infrastructure. The Mac imports results through bundles; never push.
