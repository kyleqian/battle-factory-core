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

## State at restart (written at the 2026-11-13 wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Core library package folded (`062a82a3f`, `docs/library-package.md`). The Mac's
  `worker/lib-v2-mac` is folded up to `90c6684d5`; if the Mac moves that branch again, merge the new tip the same way
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
  local branch `core-rs-archive` `4b2a07d67` keeps it, the user pushes it to its own repo) and 6 are done. Step 5 first half DONE
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
- **2026-11-13 run: the Mac lane's 28 battle-rule fixes folded, sound playback, the attendant conversation and the host hand-off event.** `mac/parity-mac`
  `344eda36c` merged at run start (suite 14,613 / 14,613; ISSUES #211 / #212 / #204 closed); nightly replay 44 / 44 (`docs/replay-ledger.md`). aud244b (BGM / fanfare /
  looping-SE assets, `docs/aud244b-bgm-fanfare-loops.md`), aud245 + aud245b (WebAudio player, `docs/aud245-audio-player.md`; additive `options.audio` / `setAudio` /
  `getAudio`; Ogg + AAC fallback), lbr-b (attendant conversation, `docs/lbrb-attendant-conversation.md`), lbr-c (`challenge-request` event + hold, `start: "after-save"`,
  `docs/lbrc-challenge-request.md`), enc276 (#213: Encore / Struggle skip the move menu, census-neutral, `docs/enc276-forced-turn-no-menu.md`), bnd257d (lazy browser
  sprite chunk; `ready` waits for it; presses before `ready` dropped; `docs/bnd257d-lazy-sprites.md`), cln277 (suite wall measured: < 15 min not reachable test-side,
  `docs/cln277-suite-wall.md`). Census baseline for enc276-style deltas: `.integration/evidence/enc276/census/{on,off}-17af89768` (pre-enc276; enc276 moved no digest).
- Census baseline for the next delta: `.integration/evidence/fix274/census/{on,off}-237ee0e5e` (the fix274 fixed arms; src == master's final engine src at the 2026-11-12 wind-down
  except pnm273's name strings, which the pnm273 0..49 census showed digest-neutral).
- **4b(d) DONE** (frs247, `docs/frs247-faint-replacement-reshow.md`): the faint-replacement return rises from black, no player bar.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

**Status at the 2026-11-13 wind-down:** item 0: aud244b, aud245, aud245b DONE (playback works, muted by default; Safari not checked on the box); next: aud246
close (S11 step 10: soaks unchanged, audio RAM receipts, ROADMAP S11 tick), the initial-music gap if aud247 did not land (see PROGRESS), then the residual audio
lists (ISSUES #198 etc.). Item 0b: lbr-a / lbr-b / lbr-c DONE; next lbr-d (7-win Lobby return in the same mount): brief lbr-d1 from `docs/lbr-d-scout.md` section 5, using the
lbr-d2a ROM ticks (`docs/lbrd2a-won-tail-rom.md`) for the won farewell constants; open: field NPC wander after the script releases
(lbr-b doc), the PreBattleRoom briefing before the draft (nch231 divergence), no Scene ON loss / retire ROM lab, no app SE_SAVE on the loss / retire result script.
Item 0c DONE. Item 0d: the Mac lane owns battle rules; fold `mac/parity-mac` at run start if it moved; nightly replay from the pool; ISSUES #214 holds its
source-read leads. **Top layer, 2026-11-13 after your run:** the Mac lane also owns the replay tools and every replay upgrade now, and the finish line has no
battle count (item 0d, "Top layer, 2026-11-13"); the lab staging failures are fixed (`oracle/battle_lab.py`, same item).
**Later that evening the Mac lane stopped (Kyle winds down the Mac for a day or two): battle rules, the replay tools and the
rare-rule hunt (as a side job next to sound) are yours now** (item 0d, "Mac lane stopped").
**Delivered 2026-11-13 20:17 UTC for your next fold, the Mac lane's last: `mac/parity-mac` = `165548c4b`, battle-rule fixes 29 to 43** (`165548c4b`
adds only `docs/parity-mac/on-hold/` to the gated `85ee1361e`; the branch is also on GitHub as `worker/parity-mac`). It replaces
the 14:05 UTC (`ba58f0ec6`, fixes 29 to 40) and 19:11 UTC (`42e1f4f91`, 29 to 41) deliveries, which it contains. Fixes 29 to 40 were found by the new
players, the wide compare and staged battles (`docs/parity-mac/STATUS.md`, "Fourth pass"); fix 41 (`4f90eaf6c`: the AI's Foresight score for a Ghost-type
user makes two random rolls, the engine made one), fix 42 (`55a89a0ad`: the foe's Follow Me redirects the player's self-aimed Curse, so the Follow Me
user's Pressure costs a second PP) and fix 43 (`72eea3053`: the Pursuit user's Synchronize ends Pursuit's move-end steps; the engine ran on and crashed
in the switch) by the finer tally ("Fifth pass", `docs/parity-mac/rule-coverage.md`). One commit per fix, each with a failing-without test and ROM proof;
for 42 and 43 the proof is a Mechanic Lab run (custom teams, ROM side only; `docs/parity-mac/stages/mechanic-lab/`), not a whole matched battle. Your
master `cef8376e9` merges with it without conflict (checked with `git merge-tree`). Its gate ran on `85ee1361e` itself: typecheck ok, build ok,
14,749 tests pass, 1 fails. **That one is yours and fails on your master too:** `tests/animation/sandTombEvidenceCheckpoint`
pins the sha256 of `tools/compare/sandTombSourceAudit.ts`, which your `11e1a66b4` (iss215 pixel-provider installs) changed; re-pin it (the top layer re-ran
it on `0b80af10e`: same failure). Top-layer checks: for `ba58f0ec6`, 54 sampled battles and the 13 staged battles re-driven on a clean checkout match and
equal the lane's rows, and fixes 36, 38, 39, 40 each taken out alone make their staged battle differ from the ROM; for `42e1f4f91` (the only engine change
since is `src/engine/factoryAiCheckViability.ts`, fix 41), 36 sampled battles of the lane's final run re-driven on a clean checkout match and equal its rows,
and fix 41's staged battle (`stages/noland-foresight-ghost.json`) matches 20 / 20 states with the fix and differs at state 6 of 21 with the old file;
for `85ee1361e`, fix 42's and fix 43's tests fail with their old engine file and pass with the fix, and the same 36 battles plus all 32 staged battles
(`stages/*.json`, `stages/coverage/*.json`) re-driven on a clean checkout match.
The lane's final run on the fix 41 engine: 3,546 battles, 3,541 match, 5 endless Struggle stalls (no difference up to the frame cap); every tally row is
covered by a ROM-matched or staged battle or proven unable to occur. Of the finer tally's 110 reachable never-run rules, 12 are now covered by staged
battles; the other 98 are your side job now (item 0d, "Mac lane stopped").
**Two findings for you from that lane (file them in ISSUES; not battle rules, not fixed there):** (1) the rental select screen lets the player take two
Pokemon of one species; the game refuses the second ("Can't select same POKeMON.", `Select_AreSpeciesValid`, `battle_factory_screen.c:2256-2276`; the
swap screen has `Swap_AlreadyHasSameSpecies`, `:4162`); the engine's `MENU_OPTION_RENT` branch in `src/engine/core.ts` has no such check; about 3 teams in
100 from the eighth challenge on offer such a pair; (2) when the player is trapped, the engine's party menu says the Pokemon "is already in battle"; the
game says it "can't be switched out" (seen in code only).
**Website:** the live site runs `eb-adfdcfdc91f4247f` (your `5a2fe1d83`, the 28 fixes; deployed 2026-11-13 04:03 UTC on Kyle's word). Your later builds
(`eb-8faf63dbde5168d5`: audio, `challenge-request`, `start: "after-save"`, lazy sprites) are not on the site; the site repo adopts them when Kyle asks. Cleanup 5's "< 15 min" suite target: measured non-goal on this box (cln277); the 670 s render lever in
`tools/integration/generatedCommandAnimationReplay.ts` would trade render-crash coverage (not taken).

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
   - **First batch (top layer, Mac, tree `389a7985a`, seeds 61..160 OFF; audit doc section 6):** 78 full match, **20 diverge**,
     2 not drivable (Brain). 279 s wall at 8 lanes on the Mac.
   - **Second batch (top layer, Mac, seeds 161..1160 OFF; audit doc section 7):** 840 full match, **139 diverge**, 21 Brain.
     34 min wall at 12 lanes. Re-driven on `46b01b7ce` (with your aiv271 and fix274): **115 seeds are open in total**
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
   - **Two lists (state on `46b01b7ce`, your 2026-11-12 wind-down engine, re-driven on the Mac; "the permanent list" in this
     item means the regression list):**
     - **Regression list** = seeds that diverged once and match now; they must keep matching (64):
       2 6 8 11 13 17 20 22 26 27 28 30 31 32 39 42 50 53 57 75 88 110 155 158 190 198 202 235 248 260 279 298 311 366 435 440 459 521 530 543 555 564 591 596 613 619 650 665 698 761 770 841 846 872 894 971 999 1001 1011 1028 1031 1103 1118 1134.
     - **Open list** = seeds that still diverge (115): 60 79 87 89 90 94 95 107 109 114 119 123 137 138 152 159 and the 99 listed as still open in
       audit doc section 8. A seed moves from open to regression when a fix makes it match to battle end.
     - A new divergence joins the open list with its seed, scene and first diverging row. One ISSUES entry per CAUSE, not per seed.
     - Not drivable until replay upgrade 3: 24 Brain seeds (33, 82, 131 and 21 in section 7's batch).
   - **Top layer, 2026-11-12 evening (the Mac bulk run is finished). This bullet applies from the fold of `mac/parity-mac`
     `344eda36c` on. From then it replaces the "Two lists" bullet above, the "24 Brain seeds" line and rule 1 of "When the
     replay runs".**
     - **Result:** seeds 1161..10000 OFF, 8,840 battles: `docs/replay-batches/2026-11-12-seeds-1161-10000.md` (and `.json`).
       Old engine: 7,828 match, 830 diverge, 182 not staged (180 silver Brain, 6048, 9073). On the Mac lane's engine
       `680b907f3`, all 8,660 ordinary seeds: 8,612 match to battle end with the stock chain, 25 more with the long caps,
       16 are endless stalls with every state matching up to the 600,000-frame ROM cap, 7 are refused by the lab, **0 diverge**.
       The top layer then drove 460 of them from scratch on `344eda36c` (all 310 seeds whose opponent runs the full AI and
       has one of the seven moves of fixes 27 / 28, plus 150 random others): 460 match.
     - **The open list is empty.** No seed is known to diverge on `344eda36c`. These are not rule bugs; do not chase them
       on the box:
       1. long battles and endless Struggle / Leftovers stalls (`docs/parity-mac/STATUS.md`; long caps = `replay
          --frame-budget=2000000` and drive `--frames 600000`). Top layer's additions above seed 7056: 7503 7651 7878 7985
          8773 9045 9336 9425 9553 9562 9563 match to the end; 7267 matches to the end with drive `--frames 1500000`
          (1,017,274 ROM frames, 1,446 states); 7130 7816 7834 7944 9579 are endless (813 to 946 states match, no mismatch);
       2. lab failures: **FIXED by the top layer 2026-11-13 (`oracle: battle lab never taps A once the first action menu is
          issued`, `oracle/battle_lab.py` + 4 tests in `oracle/test_battle_lab.py`).** One cause for all: a check frame
          could land where the player's choose-action command was issued but the exec flags still carried the opponent's
          bit, so the next blind A tap picked FIGHT and the one after it move 1 (in 6048 / gold 1447 the player's Pokemon
          then fainted and the taps sat in the party menu). Now 3623 5633 5736 8075 9188 6048, silver Brain 10127, gold
          Brain 1447 and 10022 all match to battle end; 98 seeds that already worked (300..399) stage byte-identical
          `setup.json`. 9073 was a one-time failure of the bulk run (matches when driven again). So for seeds 1..10000 on
          the fold engine: no lab failure is left; gold 1447 is a normal gold Brain seed again.
     - **Regression pool** = `docs/replay-batches/regression-pool.txt`: 962 ordinary seeds that diverged on an older engine
       and match to battle end with the stock chain now (the 64 above, 113 of the old open list, 785 of the bulk batch).
       Brain seeds, 1..10000: silver = seed % 49 == 33 (not 9098, a long battle); gold = seed % 49 == 26 driven with
       `ROM_REPLAY_SYMBOLS=1` (not 1447, 6347). The Brain part of replay upgrade 3 is done by the Mac lane
       (`docs/parity-mac/brain-replay-seam.md`).
     - **Nightly check from the fold on.** Same budget as rule 1 (background, `nice -n 19`, 2 lanes, hard 60-minute wall
       cap, do not wait for it). The seeds change every night: draw them at random from the pool file, seeded with the run
       date, as many as the cap allows (start with 40), plus 2 silver and 2 gold Brain seeds. Do not drive the fixed 64
       every night. Write the drawn seeds and the result in `docs/replay-ledger.md`. "The permanent list" in rules 2 and 3
       stays the fixed 64.
     - **Re-drive once before a failure counts.** In the bulk run 9 seeds in a row (4777..4812) matched 0 states once and
       matched fully when driven again: the ROM side started from another `gRngValue` on the same request
       (`frozenTimelineEqualsDrive` false). Cause not found. A seed with `matched` 0 or `frozenTimelineEqualsDrive` false is
       driven a second time; only a repeated mismatch is a regression.
     - **The whole pool is the Mac's job:** the top layer re-drives all of it after each fold that changes gameplay (about
       25 minutes there) and edits this bullet and the pool file. **Last re-drive: 2026-11-13 on `937c7caee` (your
       2026-11-13 wind-down engine + the lab fix), old player, stock chain: 962 / 962 match to battle end.**
   - **Ledger:** create and keep `docs/replay-ledger.md`: per run the commit, seed range, matched / driven, new divergent seeds,
     the highest seed driven (10000 now: the Mac bulk run of 2026-11-12, results in `docs/replay-batches/`; the box drives no new seeds) and the consecutive-clean count. A seed is driven as "new" once only.
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
   - **Mac lane stopped, 2026-11-13 evening (Kyle is winding down the Mac: "can we offload fixes to hcloud?"). This
     replaces "Two machines" above and the Mac-lane ownership in the next bullet; the finish line there still stands.**
     - **Battle rules and the replay tools are yours again.** The do-not-edit list in the next bullet no longer applies.
       Fold `mac/parity-mac` once more (the status paragraph near the top names the tip); after that the branch does not
       move, so the two-runs fallback does not apply either.
     - **The rare-rule hunt is yours, as a side job next to sound (Kyle, 2026-11-13 ~20:30 UTC: "Yeah, let the box do
       it. ... the Mac is going to be offline for ... a day or two. So any work that needs to ... get done needs to be in
       the box").** The list: `docs/parity-mac/rule-coverage-c-rules.json`, R001..R110, the reachable battle rules whose
       code no ROM-matched battle has run (`docs/parity-mac/rule-coverage.md`, class (c)); 12 are covered
       (`stages/coverage/`), 98 are left. Why it matters: of the first 15 rules checked, 3 were wrong (fixes 41, 42, 43).
       - **Pace:** one or two worker steps per run, after the fold and the nightly check; sound and the Lobby keep the
         rest. A difference the hunt finds is that run's main program: one commit per fix, a test that fails without it,
         a ROM battle (or a Mechanic Lab run when no Factory set-up reaches it, as for 42 and 43).
       - **Order:** first the 31 designs in `docs/parity-mac/on-hold/designs/` (README there: check one, rename it to
         `.json`, drive it over several lab seeds; one that matches moves to `stages/coverage/`). Then design stages for
         the rest in list order (the uncommon rules first). The scratch hunter (`on-hold/hunter/`) has Mac paths: copy it
         under `tools/` with box paths if you use it. A rule no stage can reach gets its reason in `rule-coverage.md`
         (class (a) or (b)); check the designers' unchecked "cannot occur" notes (R029, R031, R033, R035, R040) at source
         before you accept them.
       - **Record** per run in a box section of `docs/parity-mac/STATUS.md` and in PROGRESS: rules covered, left,
         differences found.
     - **Still on hold:** the discovery batches (1,793 battles found nothing new after fix 41; record in
       `on-hold/discovery2-793.json`) and the swap between battles / Open Level (plan only, `STATUS.md`, "Stopped
       2026-11-13"). Do not start them unless Kyle asks.
     - **Also fix, not only file:** the two findings in the status paragraph near the top (duplicate species at the rental
       select; the trapped party-menu text). Small steps; any run.
     - **What you keep:** the nightly check from the pool, and now also every staged battle
       (`docs/parity-mac/stages/*.json` and `stages/coverage/*.json`, 32 on 2026-11-13;
       `REPLAY_OUT=/abs tools/audio/romReplayWide.sh --stage FILE`, cwd `workspace/`; the hunt adds to `stages/coverage/`):
       they guard the rare-rule fixes. If either shows a difference, fixing it is the main program of that run: one commit
       per fix, a test that fails without it, a ROM battle. Otherwise sound stays the main program.
     - **The new tools run on this box:** on 2026-11-13 the top layer ran `romReplayWide.sh` from `42e1f4f91` here, a
       staged battle (`stages/noland-foresight-ghost.json`, 20 / 20) and an `ai-v1` battle (seed 20126, 11 / 11); both
       match and equal the Mac's rows, under a minute each. How to re-drive any recorded battle: `howToReDrive` in
       `docs/replay-batches/2026-11-13-fifth-pass.json`.
   - **Top layer, 2026-11-13 (Kyle's decisions of that night). The Mac lane owns every replay upgrade below and the replay
     tools. This replaces "at most one per run" and the old finish line.** (Ownership superseded the same evening by
     "Mac lane stopped" above.)
     - **Do not edit on the box:** `tools/audio/romDrive*`, `tools/audio/romReplay*`, `tools/audio/soundEventProbe.py`,
       `tools/integration/soundCensusRomReplay.ts`, `tools/integration/romReplayPlayers.ts`, top-level `tools/replay-batch/`
       and `oracle/battle_lab.py`. The Mac lane is changing them (fourth pass, `docs/parity-mac/STATUS.md`); a box edit
       collides at the next fold. If a box change breaks one of them, say so in PROGRESS and leave the fix to the Mac.
     - **Your replay work stays as it is:** the nightly check from the pool (40 seeds + 4 Brain, old player, stock chain)
       and the fold of `mac/parity-mac` at run start. Nothing else.
     - **What the Mac lane built (arrives with the next fold):** three test players (`census` = the old one, `ai-v1` =
       the game's own trainer AI on the player's side, `random-v1` = random legal actions with voluntary switches; Kyle:
       AI against AI is the main share, random is a subset only), a wide compare at every decision (status, volatiles,
       stat stages, PP, item, ability, types, bench, side statuses and timers, weather, the winner), a tally of what
       really took effect per move effect / ability / hold effect / situation, and staged battles
       (`docs/parity-mac/stages/`). So upgrades 2, 4, 5 and the Brain part of 3 are done there; 1 and the rest of 3 are
       its to schedule.
     - **Finish line for "battle logic is done" (Kyle: a battle count "doesn't itself mean any quality"):** the tally is
       full (every row is covered by a battle that matches the ROM, by a staged battle, or by a source proof that it cannot
       occur in the Factory), no difference is open, the old lists still match, the gates are green. No number of battles
       is part of it. Do not report a battle count as a measure of quality.
   - **Replay upgrades (tools only; the Mac lane's from 2026-11-13, see the bullet above; kept here as the record of what
     each one is):**
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
   - **Finish line for "battle logic is done":** superseded 2026-11-13 by the top-layer bullet above (the full tally, no
     battle count). The old text was: 3,000 consecutive clean new seeds with the random player across Level 50, Open Level
     and the Brain, and no zero row in the tally without a source proof that it cannot occur in the Factory.

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
     not visual (found 2026-11-05 by the top layer's live-site play-test on 6bdb3c6c1): BAG and RUN do
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
   - **New, Kyle 2026-11-04** (website on 90c6684d5), reproduced on the Mac from his trace `47192107276c654fbcdc1d038304aa0e`
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
   - **New, Kyle 2026-11-12** (website, game build `eb-9d34d28f1b19ef3d`), reproduced on the Mac from his trace
     `b476b7edd9fd8260b28760d96abd8ffe` (seeds 4025223145 / 3542704685, Scene ON, 22,641 frames) through
     `FactorySession.replayStep` + `render()`. The trace is in the repo: `tests/fixtures/user-sessions/2026-11-12-b476b7ed.trace.json`
     (app frame N below = the session frame after N steps). Kyle: not the highest priority, but queued, fixed and VERIFIED.
     One step per run each, after that run's audio step. Prove each against the ROM, then fix the family:
     - **(h) Pursuit on a switching target draws no animation. LOW priority: the switch in this trace was itself an engine
       error, already fixed on `worker/parity-mac` (see the last bullet).** App 17134: the opponent LOMBRE (6 / 153 HP) chose to switch,
       BEEDRILL's Pursuit caught it (`BattleScript_PursuitDmgOnSwitchOut`, `battle_scripts_1.s:3123`) and it fainted. The
       `move-animation` command (moveId 228, `turn: 1`, `multihit: 1`) holds 32 frames (17164..17195) and draws nothing. The
       ordinary Pursuit one turn later (app 17840, `turn: 0`) plays 106 frames (17870..17975). Cause, known and left on
       purpose: `liveMoveAnimation.ts:1589` declines the switch-interception body (`request.turn & 1`). ROM:
       `Cmd_jumpifnopursuitswitchdmg` sets `gBattleScripting.animTurn = 1` (`battle_script_commands.c:8758`), and `Move_PURSUIT`
       runs `choosetwoturnanim PursuitNormal, PursuitOnSwitchout` (`battle_anim_scripts.s:1273-1280`). Needed: the
       `PursuitOnSwitchout` body, live.
       - **Check in the same step (lead, not ROM-proven):** the ROM prints the withdraw line first (`BattleScript_ActionSwitch`,
         `battle_scripts_1.s:3088-3090`: `printstring STRINGID_RETURNMON`) and only then runs the Pursuit loop. In the trace the
         turn's first event is the Pursuit `STRINGID_USEDMOVE` (sequence 42, straight after 41): no RETURNMON event and no
         command for it. If the ROM lab confirms it, a message is missing in both scenes.
       - **Verified when:** a ROM capture of a genuine Pursuit interception matches the engine like the other live bodies.
       - **Top layer, later the same day (Kyle doubted the switch, and he was right):** on the fixed engine (`worker/parity-mac`
         960f65235) the same trace has the same RNG up to this turn (1808560935 after 26 calls), but the opponent does NOT
         switch: Pursuit is an ordinary hit (`BattleScript_HitFromAtkString`, `turn: 0`, the normal animation), LOMBRE faints
         (`BattleScript_FaintedMonSendOutNew`), and the recording diverges from there. Cause: fix 8 of that lane
         (`docs/parity-mac/ai-resist-switch-battlerin1.md`): the ROM's bench scan skips the opponent's slot 2 (DELIBIRD)
         because the player's active BEEDRILL is in the player's slot 2, after slot 1 (LEDIAN) resisted Twineedle. So what
         Kyle saw goes away with the fold of `mac/parity-mac` and a site redeploy. What stays open here is only the genuine
         interception (rare) and the withdraw-line lead.
     - **(i) The player's HP box disappears during the locked turns of Ice Ball.** App 18609: Kyle switched BEEDRILL ->
       WARTORTLE and DELIBIRD used Ice Ball on that turn. In the next two turns (DELIBIRD is locked into Ice Ball; the player
       chose Water Pulse) the player's HP box is not drawn in app 19364..19389, 19469..19662, 19826..19948, 19987..20012,
       20092..20308 and 20472..21017 (through "Foe DELIBIRD fainted!" and LEDIAN's send-out). It is drawn during Water Pulse's
       own animation and on the action menu, and it is back for good at 21018. The opponent's box is not affected.
       - **Lead:** the two locked turns are appended as segments 2 and 3 to the SAME resolution presentation
         (`retainedLockedActionPresentationOwner`, `factoryRoundBattleOrchestrator.ts:1833` / `:3059`). Its `sourceDecision`
         is still the earlier `{kind: "switch", partyIndex: 0}`, and a player switch hides the player's box between the recall
         and the send-in. Check whether the box-visibility pass treats every retained segment as part of that switch. If it
         does, the family is every locked multi-turn move (Ice Ball, Rollout, Outrage, Petal Dance, Thrash, Uproar) that
         starts on a turn where the player switched.
       - **Verified when:** a test replays the trace and finds the player's box in every frame of app 19364..21017 where the
         ROM draws it (ROM lab: a player switch into Ice Ball, then two more turns), plus one other locked move.
       - **Repro note:** the frames above were measured on master `e2cd1f1cd` (before the fold of `mac/parity-mac`). The
         website itself ran an older build (`worker/lib-v2-mac` 18329ff0f, stamp `eb-9d34d28f1b19ef3d`, 63 commits behind
         that master); the trace plays the battle Kyle described on both, with different kernel digests (the fixture lists
         both). After the fold the trace diverges at app 17134 (see (h)), and its Ice Ball then starts on a turn with no
         player switch. Reproduce at `e2cd1f1cd`, or stage it: the player switches on the turn the opponent starts a
         locked move.
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
