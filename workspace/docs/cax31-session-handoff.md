# CAX31 session handoff — 2026-10-26 (finish plan; state updated 2026-11-06)

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

## State at restart (written at the 2026-11-06 wind-down; PROGRESS.md top entry has details)

- Phases 1 and 2 met (finish plan). Core library package folded (`f88653929`, `docs/library-package.md`). The Mac's
  `worker/lib-v2-mac` is folded up to `851ee1f4c`; if the Mac moves that branch again, merge the new tip the same way
  (typecheck, its touched tests, full suite).
- **Audio (S11):** design accepted (`docs/s11-audio-design.md`); steps 1-3 folded; **step 4 (screens) DONE**: aud240a (draft /
  swap / dialogs), aud240b (summary), aud240c (battle party menus, `docs/aud240c-party-menu-sounds.md`), aud240d (Lobby /
  PreBattleRoom / BattleRoom scripts, heal + BP fanfares, `docs/aud240d-script-sounds.md`). Emitters live in
  `src/engine/screenSounds.ts`. Prove windows in probe **step mode** (the hybrid `--fast` mode drops no-op SEs).
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
  and slice plan; residuals and unemitted families ISSUES #198.
- **Cleanup:** steps 1, 2, 3 (cln239), 4 (cln241, 2026-11-06: `core-rs/` removed from master, `docs/cln241-core-rs-removal.md`;
  local branch `core-rs-archive` `26ce8d051` keeps it, the user pushes it to its own repo) and 6 are done. Step 5 first half DONE
  (cln240: `npm run test:gate`, now 362 files, ~218 s here, `docs/cln240-test-gate.md`). No wasm artifact is needed any more.
- **4b(g) DONE (2026-11-06):** frf250a BAG prints "Items can't be used now." and RUN opens the forfeit prompt (NO / B back to the
  menu), ROM-measured both scenes (`tests/frf250aBagRunMenu.test.ts`, traces `frf250a-*`); frf250b YES prints "<PLAYER> forfeited
  the match!" and ends the battle as a loss through the normal lost-battle return (`src/engine/battleForfeit.ts`,
  `tests/frf250bForfeit.test.ts`, trace `frf250b-run-yes-off`). The soak random player answers the prompt (see the driver).
- **User reports:** 4b(b) also covers Quick Attack / Aerial Ace now (qak248 / qak249). 4b(a) fully fixed (vis243a mid-battle send-in; go246 battle-start "Go!" intro waits for both species
  animations in Scene ON, `docs/go246-intro-wait.md`; Kyle's SPOINK was cut short by 137 frames, now exact); 4b(b) Agility
  clip fixed (agi245); 4b(c) rate check permanent (`tests/rng244OutcomeRates.test.ts`).
- Census baseline for the next delta: `.integration/validation/sv-20261104/frs247-evidence/census/{on,off}-87e9366af` (frs247's
  tree; 1000 / 1000 identical to `sv-20261103/go246-evidence/census/`, which stays valid too).
- **4b(d) DONE** (frs247, `docs/frs247-faint-replacement-reshow.md`): the faint-replacement return rises from black, no player bar.

## Next work (in order) — see `docs/finish-plan.md` for acceptance

This repo is the **game core library**; the website repo (Mac) owns login, streaks, menus, the on-screen pad and hosting —
never brief those here. One worker at a time; each run folds the next audio step(s) plus at least one cleanup step.

1. **Audio (S11)** — the main program for several runs: `docs/s11-audio-design.md` section 7. Next: **aud241** battle
   controller family (effectiveness, SE_FAINT, faint / send-out cries with mode + pan, ball / tray / low-HP, battle BGM start /
   fade / victory, the battle-return BGM / SE_EXIT that aud240d measured: fade P+6, BGM 469 P+53, SE_EXIT P+79). Map and
   proposed split: `docs/aud241-scout.md`. **aud241a / b / c DONE 2026-11-05. aud242a DONE 2026-11-06** (generic script-op
   emitter, `docs/aud242-move-anim-sounds.md` section 4 is the slice plan). Next: **aud242b** (a wait resolver for ops after
   `waitforvisualfinish` / `waitbgfade*`, then `jumpret*` / `jumpargeq` runs), **aud242c** (`panse*`, `setpan`, `createsoundtask`
   families, the C-side sites), an alignment audit of the ISSUES #198 per-move offsets; then aud243 (census column + ROM replays). Open aud241 gaps: ISSUES #196 / #197, the canonical battleScene route plays no end sounds.
2. **Cleanup (one commit per step, verified by typecheck + full suite + build), in this order:** (1), (2), (3), (6) DONE;
   (5) `npm run test:gate` <= 5 min for workers and drop frame-pin tests the census supersedes, full suite nightly (the full
   suite is ~75 min here and lost one fork beside a worker twice on 2026-11-03: rerun the unreported file);
   (4) DONE (cln241); (7) evidence stops going into git.
3. **Bundle hygiene** (scout: `docs/bnd-scout.md`): test-only JSON out of `src/`, sprite pixels out of the headless graph
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
     - **(e) NEXT (scouted 2026-11-05, `docs/obr248-scout.md`, unverified: ROM slides in over 20 frames, holds 100 frames to the
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
16 GiB RAM and 8 GiB swap. Full suite ~48 minutes. Serialize typecheck, full
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
