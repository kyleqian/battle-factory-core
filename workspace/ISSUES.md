# Issues — standing backlog

Open bugs and debts only, numbered (numbers are never reused). When you fix one, **delete the entry** in the same docs
commit that records the fix in `PROGRESS.md` — git keeps the forensic history. Per entry: symptom, what is confirmed from
the reference / oracle, and any leads.

Pre-cleanup history (closed addenda, #72, #121 and the long dated narratives of #39 / #55 / #71 / #73) is in
`docs/archive/ISSUES-pre-cln238.md`. The settled exceptions #5, #18, #38, #56, #61, #87 and #97 are **not work**: they are
recorded in `ROADMAP.md` "Settled exceptions" (accepted ceilings; do not reopen without a user decision).

**Current scope, user-approved 2026-10-13:** the remaining Factory animation, presentation and battle-engine accuracy
defects are all authorized in the finish-up mission (`docs/factory-finish-scope.md`). #141 / #140 / #139 may change
gameplay / RNG when proved against source; use main-lane ownership and gameplay gates. Historical presentation-only
exclusions are superseded. Unrelated expansions stay parked.

## #198 — aud242a move-animation SE residuals (2026-11-06)

`docs/aud242-move-anim-sounds.md`, `tests/aud242aMoveAnimSounds.test.ts`: the emitter plays a script op at body age `f + 1 + 7`
(Scene ON lag 7, as battleHitSounds). Constant per-move offsets ROM minus ours remain: Ember / Psybeam / Acid / Bite +2, Twineedle
+10, Double Slap / Fury Swipes +9, Bind +6, Agility / Swords Dance -4, other status moves -2..-5 (`LIVE_MOVE_IDLE_LEAD_ROWS` was
measured as visual onset, not script start; an alignment audit is the lead). Not emitted yet: ops after a data-dependent wait,
`jumpret*` runs, `panse*` / `setpan`, `createsoundtask` (aud242b / c); declined (static) bodies (Tackle, Vine Whip, Seismic Toss)
are silent. The ROM reaches pan +64 on `SE_M_STAT_INCREASE` vs an opponent target (check `BattleAnimAdjustPanning2`).

## #194 — Opponent RATTATA Quick Attack differs above the clip row (qak247, 2026-11-04)

Live Scene ON, opponent RATTATA Quick Attack vs player ONIX (`docs/qak247-clip-sweep.md`): 14,739 px over 25 of the 33 window
frames, rows 41-73, from age 8, identical with the 74 and the 160 clip (so not the clip that qak248 removed). Every other of the
87 measured opponent Quick Attack / Aerial Ace runs is 0 px at 160. Undiagnosed: stage it again and compare the attacker's
position / ellipse rows first (small sprite, corner row unusual?).

## #197 — Battle timing deltas found by the aud241b sound windows (2026-11-05)

`docs/aud241b-battle-sounds.md` (fixtures `tools/audio/fixtures/{super-effective,lowhp,lowhp-faint}*`, pinned as `frameDeltas` in
`tests/aud241bBattleSounds.test.ts`): (a) "It's super effective!" holds 5 ticks short (ON `[0,-5,...]`, OFF `[-1,-6,...]`);
(b) the second attack of a turn plays its low-HP SE 1 tick early; (c) after a red drain to 0 the faint sounds are 16 ticks late
(our `hp` command's 28-tick floor; the ROM drains the last 8 px in 12). The same frames move pixels, so these are presentation
timing residuals (finish plan item 6). A fix re-pins the deltas to 0.

## #196 — aud241a flow mismatches (2026-11-04)

`docs/aud241a-battle-start-sounds.md`: MAGNETON Scene ON player side 1 frame early (go246 hold); battle-BGM-to-tray gap is
348 / 359 / 368 / 374 across labs (engine 359); a WEAK send-out cry gets its duck restore only for ONIX (cry length known);
an opposing switch-in inside the forced-selector prefix gets no sound; a Baton Pass hidden-attacker recall is not
distinguished from a plain recall. Unproven by ROM window: Brain 471, WEAK send-out cry, Scene ON voluntary / opponent mid-battle.

## #195 — aud240c flow gaps on the battle party menus (2026-11-03)

`docs/aud240c-party-menu-sounds.md`: (a) the voluntary menu moves its cursor on keys pressed during the open palette fade
(the ROM ignores input until `!gPaletteFade.active`; only the sound is gated in ours); (b) refusal messages dismiss on the
first A / B even while the text is still printing (the ROM waits for the printer). Source-proven flow fixes; prove on the ON oracle.

## #192 — Summary screen flow gaps vs the ROM (aud240b, 2026-11-03)

Found while proving summary sounds (`docs/aud240b-summary-sounds.md` "Gaps"): (a) after the draft summary closes, our draft
cursor does not move to `gLastViewedMonIndex` (the ROM re-opens on the last viewed mon; ours on the old slot); (b) summary
input is accepted from open+59 in ours, open+63 in the ROM, so a B at open+59..62 closes ours and is ignored by the ROM; (c) the
swap's summary has no mon change (UP/DOWN) in ours. All three are source-proven flow fixes; prove each on the ON oracle.

## #193 — Summary sound scheduler debt (aud240b, 2026-11-03)

`src/engine/screenSounds.ts` keeps its delayed-sound queue (open cry +63, stop +22, mon-change cry +21/+22) in module-level
state, gated on `soundCollecting()`; it should be owned by the session's sound collector so two sessions in one process cannot
share it. WEAK cry length is measured for ONIX only (78 frames; other species emit no BGM restore). BGM ids are constants
(469 draft / swap, 476 battle) until a BGM state exists (aud241). The first draft mon-change cry is 1 frame late vs the ROM
(f149 vs f148; every other change matches +21).

## #191 — Dialog-menu cursors move on held-key repeat (aud240a, 2026-11-02)

`Menu_ProcessInput` / `Menu_ProcessInputNoWrap` (menu.c, used by the postwin question, continuation and swap-offer
multichoices) read D-pad `JOY_NEW` only; our postwin cursor reducers also move on `newAndRepeatedKeys`, so a held UP/DOWN
keeps stepping the cursor (silently since aud240a: SEs are gated on new presses, matching the ROM). Not ROM-probed with a
held key yet. Fix: gate those reducers on new keys only; prove with a held-DOWN window on the ON oracle. The draft and swap
handlers use `JOY_REPEAT` in the ROM, so they are correct. `docs/aud240a-screen-sounds.md` "Divergences".

## #189 — RETIRE-YES Lobby path residuals (ret218, 2026-10-28)

ret218 hands RETIRE-YES to the loss terminal (no more hang). `retire-yes-lobby-freeroam-off` (Scene OFF) 1243 / 1482:
(a) the record prompt starts ~6 ticks later on the retire path than the loss-pinned 169-tick delay (frames 7544-7627, cause
unknown); (b) the wandering lobby NPC's schedule depends on `gRngValue` history keyed to the loss run's ticks (frames 8033-8193).
The terminal-arrival branch of `renderPostwinRetireWarp` (core.ts) is probably dead now. Timing class: long tail.

## #188 — Summary front animation: 137 species approximate-static motion; QUILAVA replacement one render late (finish plan, sfa214 2026-10-27)

sfa214 made the draft Summary screen crash-free for every Factory species. Open, non-crash residuals:
(a) 137 / 376 species (42 `pokemon_animation.c` motion types) play the frame program only, no source motion
(`summaryFrontAnimation.ts` `motionClaim`); (b) `summary-info-quilava-v-stretch` (mon-change replacement sprite)
48 / 91 vs the Scene OFF oracle: the whole replacement animation shows one render later in the ROM; the initial-sprite
trace is 108 / 121 (2-8 px affine-edge residual on 13 frames). Anchor Summary traces stay exact. Timing class: long tail.

## #168 — remainder: FRZ frozen-turn timing phase (S10A; #168 otherwise DONE 2026-10-13)

All nine B_ANIM_STATUS_* animations are timed and drawn (88 + 16 dense ROM windows 0 px; live audit 28 clean), and since inl144
(2026-10-13, merged `d019cd6b4`) a status animation over an INVISIBLE battler draws its sprites while the battler stays hidden (inv142's
banked patch landed; inv142Run.sh ALL SAME). Open (D4 class, aud137): FRZ's frozen-turn active rows are 115 vs production's 116 on 4 / 10
windows (the next message one frame late); cause named, not proven.


## #167 — remainder: Scene OFF no-hit pauses for Wish / Baton Pass / charge-turn EMPTYSTRING3 (S10A, 2026-10-11)

Landed pieces (Rest, stat-stage-change-next class, Wish, the action transition in both scenes, Scene ON tails, faints, Rest /
Bulk Up second stat) are in the archive entry and git. Still open:
- **Scene ON zero-tail live bodies** (tl204, `docs/tl204-zero-tail-rows.md`): next print early by Double Team -5, Rain Dance -5,
  Sunny Day / Hail -6, Leech Seed -39, Light Screen -4, Charm -6, Fake Tears -1, Calm Mind -10, Scary Face -19 (tl205 was to
  implement the script-row tail on a branch). 24 further moves carry a 0-frame tail pending a ROM scenario (ont193).
- **Named residuals:** Toxic's upstream -19 (status body before the message), Snore +10, Toxic -2, Curse +2 / -4 (re-measure after
  the floor drop), msg175's Rest-route Tackle HP anchor -3 ON / +18 OFF, Roar OFF +17, Baton Pass OFF -66.
- **Unmeasured:** switches, end of turn and pre-move prints after the anchor.
- **(b)** sprite-visibility next after Roar / Whirlwind / opponent Baton Pass (141 bodies): the entry says it needs #146's Scene
  OFF forced switch-out first (the ROM removes the sprite in one row).
- **(c)** nothing next (35, player Baton Pass: the party menu opens; unstaged).
- **(d)** charge turn (`docs/chg161-charge-turn-print.md`): Scene ON's live charge animation starts 7 rows late (the box carries the
  post-waitanimation rows; needs a presented post-animation hold); the held print -> next action's "used" edge is -10 .. -14
  (Sand-Attack control -12, same family as the action transition); Razor Wind -1 adapter.
- **(e)** small: Curse's 2nd / 3rd messages +1 frame each; Rest's status icon on G+127 vs ROM G+125.

## #161 — Dive attack: an extra lag frame at age 17 on poisoned player-diver routes (S10A, found 2026-10-10 by st76)

docs/st76-status-gates.md: 5 of 34 PSN player-attacker windows run 94 rows (lags [17, 85, 86] instead of [84, 85]); 0 / 73 unstatused,
0 / 29 BRN opponent-attacker. Every displayed image is correct (with the repeated ROM row skipped, 93 / 93 rows 0 px); production presents
the dominant 93-row phase (29 / 34). Mechanism unknown (RAM at activation identical). Resume: name the age-17 lag source from counters,
then record it as a third Dive D4 parameter (docs/faithful-timing-policy.md) or gate the shape.

## #154 — Staged lab probe trajectories differ between batches run at different times (S10A, found 2026-10-09)

plans51's Outrage jobs (`tools/integration/plans51Probe.py`, BODY200; base scenarios `tools/battle-lab/mechanic-outrage-*.json`,
pinned lab seed 305420201) gave A == B inside every batch, but the worker's 11:40 batch and three supervisor batches at 12:2x
(same worktree, byte-identical scenario files, same tool sha, vendor ROM / ELF / libmgba-py unchanged) differ: the last pre-battle
sprite "clear" frame is 1165 vs 1189 (player-attacker jobs) / 1154 vs 1195 (opponent), the battle starts at the same frame
(Outrage body at n 2082 in both), and the player-side battles then diverge (ou-ply-149-95: 291 vs 193 rows — the worker saw Onix's
Tackle and a second Outrage, the reruns did not). The FOCUS_BAND jobs (explicit "seed" op) reproduced byte-identically across the
same two times. Not the oracle symbols cache, the output-dir path, or the concurrency mix (solo / 8-job / 12-job reruns all agree
with each other). The Outrage plan is EXACT on both sample sets (147/147 worker, 10/10 fresh), so plans51's landing stands; the
hazard is that "two fresh runs identical" inside one batch does not prove cross-session reproducibility for these stagings.
Resume: rerun one ou-ply job at several wall-clock times and diff `lab.prepare`'s staged state (gRngValue, party structs, the
frame count to CB2_InitBattle); check whether the lab seed is applied before or after a frame-dependent step.


## #153 — remainder: Substitute / Transform presentation shared by both scenes (Scene OFF body FIXED 2026-10-13, sub157)

Open, the same in both scenes (ROM OFF == ON):
- **Transform:** body + transformed field are live in both scenes (trf174, `docs/trf174-transform-live.md`). Open: declined
  Transform bodies (shiny DITTO, SPINDA target, CASTFORM, a doll on either side); every OTHER live body declines while a battler
  is shown transformed; Transform is not counted in `LIVE_MOVE_ANIMATION_IDS` / the live-status inventory (accounting only; trs190
  audit 2026-10-16: no production reader; reachable only via Metronome, CHANSEY_1 / CLEFABLE_1; outside the 276). Counting it as a
  *required* body like Struggle needs a user scope call; until then it stays a live body outside the counted catalogue.
- **Not measured:** a dense OFF fade window, and the switch-out SUBSTITUTE_TO_MON / Baton Pass MON_TO_SUBSTITUTE special
  animations (scene-independent in source; neither scene presents them).

## #152 — Species audits 9-14 remainder: idle-rest attacker class, Extrasensory split rows, Confuse Ray CPU phase, TYRANITAR rows (S10A, 2026-10-07)

Evidence `docs/live-species-audit-9.md` .. `-14.md`, receipts `tools/integration/fixtures/species-audit-9/`. Open remainder:
- **Mach Punch (183), opponent-side target with an idle rest:** one row (age 60) unexplained; the live adapter DECLINES such
  targets. Resume: RAM-probe the target x2 at ages 58..61.
- **Meteor Mash (309), player-side FLYGON target:** not a production defect; the derived audit fixture's pinned Random2 activation
  is 4 steps late (0 px only at -4); why the two FLYGON probes record 4 extra steps is unexplained.
- **Extrasensory opponent-side targets FLYGON / GOLBAT / WAILORD:** 18,345 / 8,318 / 162 px on ages 43..117 in the policy phase;
  likely the scanline-split class (prep30 s1.4) but the split line was not measured.
- **TYRANITAR rows:** Dive 4-9 px (ages 63..64; Sand Stream intro?), Ice Ball 16 / 63 px, Memento 2,537 px at age 140, Flatter 2 / 96 px.
- **Doll-free controls (prep38 / dolldef):** Shadow Ball (247) PERSIAN -> SLOWBRO player 304,556 px (also in the doll-free control);
  Psychic opponent HAUNTER -> KADABRA 200 px on the pre-activation row; Quick Attack player (5,601 px in the doll box) and
  Double-Edge player after an earlier Double-Edge (480 px) unresolved (`docs/next-adapters-prep38.md`).
- **Audit 13:** ONIX attacker 1,091 px/row before its first move (Body Slam / Brick Break / Flamethrower / Attract, doll-free too);
  15 candidate renderers from the static attacker-rest scan (`a13fix-live-receipt.json`) unproven.
- **Substitute fade (`fade-live-receipt.json`):** the ROM shows a frozen message-box wait cursor on the fade rows after the "took
  damage" message, which production presents as an automatic (cursorless) message — 37 px / row; the fade's claim is scoped outside
  that footprint. Not measured: the ROM wait between that message and the fade, fades on a non-target (recoil), multi-hit or Baton
  Pass / switch fades, Scene OFF within the Substitute's own resolution (#153).
- **Audit 14:** Double-Edge row 33 with an idle-rest opponent attacker (410 / 1,091 px), Attract GOLBAT one full-field row.
- **Light Screen (113):** the PLAYER side also shows the hold phase (5 of 20 windows, 2,473 / 2,571 px on row 59) and a second
  buffered step at row 19 (after PRZ; after CONFUSION + a held-item animation on the opponent side, rows 19 + 59, 5,343 px);
  dominant direct on both sides (15/20, 10/14), so the policy renders the right phase, but the player-side and row-19 alternates
  are not yet documented in the D4 entry.
- **Harness limit:** the verifier passes only the attacker's personality, so shiny TARGET declines are unverified.

## #148 — Battler x2 history: unknown-history remainder (main bug FIXED 2026-10-06)

`src/engine/liveBattlerX2History.ts` tracks per battler idle | zeroed | unknown (`docs/x2-history-148.md`). Open: `unknown` (falls
back to the species rest) after the four `mixed` moves (move-0 status bodies, Razor Wind 13, Return 216, Dive 291), after
unmodelled general / status animations, a party menu or an undrained resolution; the forced switch-in phase does not advance the
host (catches up at the next command). Only opponent ONIX / RATTATA are affected.

## #147 — Elevated opponents in ordinary resolution frames: remainder (main bug FIXED 2026-10-05)

Open remainder: the 16 hit-blink frames per body (sprite + shadow hidden 4 on / 4 off) are not modelled for elevated opponents;
the HP-0 shadow boundary uses the displayed HP (may be one frame early vs the party-HP write); Sky Uppercut with a COMBUSKEN
attacker measured d = 0 vs the table's 1; Dream Eater / Sleep Talk swaps not harness-staged (table from the ROM d values only).

## #146 — Switch-out / send-in presentation remainder (S10A, found 2026-10-05; most tails FIXED 2026-10-13)

Fixed pieces (snd145 .. snd233, bso225 back send-out, bso226 battle-start intro, pfb229 faint-replacement send-in, cff230) are in
the archive entry and git. Still open:
- **Timing (not blocking):** the ROM waits for the opponent's battle-start front animation before "Go!" (39-98 frames later than our
  fixed intro timeline on long animations; bso226).
- **SHEDINJA maxHP (shd234 scout):** the "SHEDINJA genderless healthbox" residual is the comparison harnesses computing maxHP without the
  ROM's SHEDINJA rule (`pokemon.c:2845-2848`, `newMaxHP = 1`): `bso225Dense.ts:42`, `bso225Compare.ts:72`, `pfr192Dense.ts:34`,
  `snd182Compare.ts:66`, `plr162Compare.ts:66`, `pfb228Proto.ts:45`, `snd182Rows.ts:22`. **Check:**
  `src/engine/factoryCorpusParty.ts:291` has the same omission (setId 21 -> maxHP 94); it feeds `postwin.ts` — verify whether any
  visible / logical path reads it before fixing (main lane, source rule).
- **snd233 remainder:** star-particle 3-7 px at e 64.
- **pfb229 remainder:** ENTEI / KINGDRA glow-lag frame at B+69, CASTFORM message region, MEW has no player back pic.
- **Player faint-replacement send-in fidelity for non-MAGBY species** (pfr192 timing fixed): release palette fade, fade-in palette
  rows 56-70, species ball y path, male MAGBY healthbox art (`docs/pfr192-player-faint-replacement-production.md`); shiny send-ins;
  CRY_MODE_WEAK send-ins; PONYTA glow mid-frame palette row (D4 class, 616 px); TYPHLOSION faint-path slide lag frame (D4); the
  faint-path blank row one frame late; the elevated-attacker post-body field difference (1,444 px, untriaged).

## #145 — Live-adapter species audit: residual remainder (S10A; 7 defects FIXED 2026-10-05)

- **Rollout (205; `docs/rollout-curl-diagnosis.md`):** the hit-splat centre is hard-coded to ONIX's (`src/animation/rollout.ts:175-177`,
  y 42; BLISSEY 46) — a few px for 10 ages against targets with a different pic y; the shake amplitude is keyed by counter (`:209`)
  while the ROM uses `gAnimMovePower / 12` clamped 1..16 (`battle_anim_mon_movement.c:973-984`), so Defense Curl bodies decline.
  Fix shape in the doc (centre from the target anchors, shake from request power, drop the two declines, regenerate the Scene-ON Curl fixtures).
- **Open remainder:** Aerial Ace with a player-side GOLEM 1 px at ages 10-11; Spider Web ARIADOS back sprite 1 px; Sky Uppercut COMBUSKEN
  script one frame longer; Blizzard / Icy Wind fall back for the elevated pair by design (OAM-order proof only for non-elevated
  pairs); Dragon Rage with non-CHARMELEON player attackers formula-derived, unmeasured; Quick Attack / Mud Slap `+1` literal not
  swap-checked; GOLEM swaps exist only for Rock Throw and Foresight among the audit-2 fixes.

## #143 — CASTFORM non-normal forms (weather) are not modelled (S10A; normal-form residual FIXED 2026-10-05)

Per-form art, the CASTFORM_CHANGE morph (cff230 / cff232) and 32 proven (move, role, form) keys are live (`docs/cff230-castform-forms.md`).
Open: every live body declines while a CASTFORM is shown in a weather form, except the ROM-proven keys; unmeasured keys keep
declining (census 0..999: ~15 commands — Ember / Rain Dance / Fly / Ice Ball / Scary Face / Rest in other forms); Flamethrower by
WATER needs a +7 alignment explanation; the "at"-role keys (Fly / Ice Ball / Rest / Hail / Rain Dance / Scary Face) and revert /
switch-out are unmeasured; rain Icy Wind is a timing phase (lag ages [241, 242] vs [261], also without Castform: a D4 candidate);
the Substitute-swap composite still declines with a form shown; the latent front-coords width (source 32 vs app 24,
`battle_anim_mons.c:2253-2255`) for width-dependent moves is unexercised.

## #139 — remainder: Focus Punch pre-pass presentation edge routes (kernel + both scenes FIXED 2026-10-13, fpp150; edges fpc180)

Open: the voluntary-switch Go! -> used tail (-31, a send-in tail item, see #146); `5 + u` has no ROM card for Substitute / weather /
Protect / multi-stage prologues; a pre-move print after the focus print keeps 11. (Scene ON pre-pass print rows: fpo187 / ont193
explain and land the rest; `docs/fpc180-focus-punch-live.md`.)

## #109 — `battleAiSwitchInto.ts` omits the `i != monToSwitchIntoId[battlerIn1/2]` exclusion in both passes

**Found 2026-08-22** (side worker, #102 fix). Source `GetMostSuitableMonToSwitchInto`
(`battle_ai_switch_items.c`) skips a party slot already chosen for the other
active battler in both its scoring passes; the port (`:702-703`, `:757-760`)
does not. Unobservable in singles today because that slot is PARTY_SIZE at
the only call site (one opponent battler), so this is an unmodelled source
condition rather than a live bug — port it when doubles or a second consumer
arrive, with a Tier-1 pin.

## #114 — `runFutureAttacksAfterFaints` fires a delayed hit inline and keeps looping where source returns per effect (doubles-era divergence)

**Found 2026-08-22** (side worker, #102 end-turn cursor fix `a6deb814`). Source
`HandleWishPerishSongOnTurnEnd` (`battle_util.c:1785-1888`) `return TRUE`s after
each Future Sight/Perish Song script and re-enters via `BattleTurnPassed`,
so a second delayed KO in the same turn takes its own `HandleFaintedMonActions`
round-trip; the port runs the remaining battlers inline. Equivalent now that
the `wishPerishSongState`/`wishPerishSongBattlerId` cursor persists
(`tests/endTurnResumeCursorIssue102.test.ts`), and unreachable in singles
(one delayed hit per side per turn) — pin it when doubles arrive.


## #71 — Send-out intro animations: banked front reducers are not wired into the live send-out seam; main-lane share of the dispatcher work

History, slices A-D and all probe receipts: `docs/archive/ISSUES-pre-cln238.md` #71.
- **User decision 2026-08-10:** the playable path stays FAITHFUL (no browser-only intro divergence). Battle Scene OFF genuinely skips
  send-out intros (`pokemon.c:6803-6852`, `HITMARKER_NO_ANIMATIONS` takes the `SKIP_FRONT_ANIM` branch; OFF sprites stay `x2 = y2 = 0`;
  RAM receipts `docs/send-out-slice-a-positive-case.md`, `docs/rattata-off-seam-flat-settle-probe.md`). Do not wire per-tick playback
  or terminal offsets into any OFF-profile seam.
- **Done:** all 62 front send-out families (376/376 species) are banked as reducers; the rung-3 dispatcher exists
  (`src/animation/sendOutDispatcher.ts`, `sendOutSpriteFrame.ts`); the 5 settle hooks and the 3 back-side hand-fit consumers are
  documented and throw-guarded (Tier-1 pinned). Scene ON now draws send-outs (see #146).
- **Still open, filler priority (internal code health):** the section 1e 56/58 move-window patch-site retirement
  (`docs/send-out-live-wiring-consumer-map.md` 1e; a pair-guard refactor) and the KABUTO / MAGBY / ONIX hand-fit retirements
  (`src/animation/speciesIdleAnim.ts:44` ONIX front terminal, `src/engine/magbySendOut.ts:18`, `src/engine/battleMenu.ts` ONIX back,
  `src/engine/kabutoSendOut.ts`) into the dispatcher, coordinated cross-lane. Acceptance bar: `docs/send-out-intro-animation-program.md`
  section 7 (RAM probe of the settled sprite, dense oracle window twice fresh, sibling-species spot-check).

## #73 — Terminal-seam remainder: the win/loss window's oracle-coverage gap (rung B)

History (increments i-iii, ~40 dated receipts, fixture names and frame counts): `docs/archive/ISSUES-pre-cln238.md` #73.
- **Landed:** WIN and LOSS/DREW terminal scripts run as real second VM passes with resolved message / trainer-slide events;
  `TRAINER_SLIDE_TIMING` is 38 (pixel-fit); the covered boundary runs from the DESTIN slide through GO ON scouting pages, type /
  style commentary, swap offer (NO and YES), guide dismissal, walk, warp and the Battle Room handoff, and the LOSS decline
  continuation, each pinned by a committed dense trace and `docs/post-terminal-*-evidence.md`.
- **Open:** (1) WIN far side: at frame 10638 the ROM's next trainer is LILIANA (id 9) while the synthetic terminal stage generates
  ABBIE (id 73) from its modeled RNG seed; the scaffold adopts the ROM cursors (`adoptedNextOpponent`), the generic fix is #55's
  ambient-VBlank construction stream. (2) Swap-screen ball-rocking after the first anim-end: per-ball `Random()%5` ambient RNG
  (#55-adjacent); the committed YES endpoint stays 248/248 at 10177, the dense extension is 277/285 (eight residual frames on ball 2).
  (3) Unexercised continuation choices by user decision 2026-08-05: RECORD is stub-only (no real recording / playback), REST is
  deliberately unselectable (real game saves + soft-resets; no save system in scope), RETIRE is implemented (YES = loss ending, see #189).
  (4) LOSS: record playback and free-roam lobby movement remain the open boundaries beyond the decline continuation.

## #55 — Rental-construction RNG stream contract cannot represent ambient VBlank interleaving

Full evidence (77 `docs/issue55-*` docs, CGB4 cycle-pricing receipts through v44, probe ledgers): `docs/archive/ISSUES-pre-cln238.md` #55.
- **User decision 2026-08-13: PARKED — distribution parity is the product bar.** Hardware-stream personality-exactness is not
  observable in normal play. The cycle-pricing program is parked at its clean CGB4 v44 checkpoint (6,258-cycle prefix; every receipt
  stands, nothing half-wired). Consequences: live generation may wire the engine's clean back-to-back stream, documented as
  distribution-accurate (same pools, rejection rules, odds), NOT hardware-stream-exact; byte-exact verification continues only
  against captured / adopted seeds (the `anchor-state.json` class); the no-fitted-constants rule still protects the parked
  clock's evidence (`serviceCostMasterCycles` stays null; no fitted clock may pose as the real one).
- **Symptom (still true):** `generateInitialFactoryRentals`'s single `constructionRngValue` consumes draws back-to-back, but on
  hardware `CreateFrontierFactorySelectableMons` spans 53 video frames for the anchor draft and `VBlankIntr`'s ambient `Random()`
  (`main.c:366`) interleaves into the same `gRngValue` stream. Two-cursor replay of the probed anchor cursors reproduces slots 0/2
  but diverges on slots 1/3/4/5 (first: MAGBY expected `1534575931`, got `431990256`). The terminal scaffold sidesteps this by
  adoption, not by fixing the contract (`docs/anchor-draft-cursor-receipt.md`).
- **Resume only on a user decision:** the construction clock needs live phase / workload composition and complete VBlank / IRQ /
  audio arbitration (`runFactoryConstructionClock` is unwired).

## #39 — `battleScene.ts` is a state machine over one canonical battle

History (canonical-split batches, dispatcher ladder slices 1-10, cache hardening receipts): `docs/archive/ISSUES-pre-cln238.md` #39.
- **Symptom:** production battle presentation is still partly keyed to which turn of the recorded Battle 1/2 we are in rather than to
  what happened. The turn-keyed *dispatcher* is gone (ladder closed, supervisor-verified 2026-08-08: 0 `BattleSceneState`
  handoff fields); the per-species *render entry points* remain (at the last count `battleScene.ts` was 36,897 lines with 848
  `turn<N>` textual references, none state fields; broad inventory 1,949 matching lines).
- **Open work:** the successor program `docs/species-render-entry-point-retirement-design.md` (45 census'd entry points, 7 slices;
  slices 3-4 ungated) and `docs/battle-scene-retirement-inventory.md`. Both dossiers are partly stale: check each slice's premise before briefing.
- **Canonical split stopped** at its natural boundary (199 symbols depend on battleScene-local shared symbols). Decision (a)
  AUTHORIZED 2026-08-19: canonical -> `battleScene.ts` value imports via re-export, reading the binding only inside function bodies
  (eval-time reads TDZ-crash), each batch proven by `npm run compare:differential` + full `npm test` / build. Decision (b)
  (widening `tests/animation/animationBoundaryRatchet.test.ts` `allowedConsumers`) NOT taken. The ONIX-Sitrus cluster (blocked on
  `sitrus*AtAge` from `../animation/heldItemHeal.ts`) and two `let` caches stay in `battleScene.ts`.
- **Next bounded owner:** `turn10OnixDarkPalette` (module-global palette cache keyed to one source; rename, `WeakMap` by source
  palette array, two-palette both-orders red pin beside `doubleTeamClonePalette`; use the three turn-10 OFF traces as 592-capture
  canaries; never add a staged darken field). Filler priority (user, 2026-08-08).
