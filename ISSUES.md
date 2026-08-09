# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

**Two kinds of entry live here — do not confuse them.** `#39`, `#55`, `#70`,
and `#71` are open, actionable debt. `#38`, `#18`, `#56`, `#61`, and `#5` are
**settled records, not work**: each was investigated to root cause and then
parked or accepted by decision. They stay because ROADMAP acceptance lines
cite them by number as the recorded reason specific pixel diffs are accepted
(`#5` at ROADMAP:127, 142, 150, 163, 175; `#18` at :176; `#38` at :503) —
deleting them would orphan those citations and lose the *why* behind a green
tick. Do not reopen one without a user decision, and do not count them as
backlog.

# Open

## #84 — Generated-round playthrough regressions: wrong send-out side and forced-switch jump

**Symptom (user report, 2026-08-08):** during a generated Battle Scene OFF
round with the player's BUTTERFREE against an opponent MURKROW: (1) the
opponent's Poké Ball sprite appears at the lower-left player throw origin; and
(3) WHIRLWIND immediately replaces MURKROW with PIDGEOTTO without a faithful
recall/send-out sequence.

**Confirmed:** both remaining items are generic round/controller presentation
paths, not animation-lane tasks. Diagnose and repair each against staged state
and the Battle Scene OFF oracle. Keep the items split inside this entry as they
close; delete the entry only when both are fixed. Do not add canonical
Battle-2/turn/tick branches.

## #71 — Send-out intro animations: banked front reducers are not wired into the live send-out seam; main-lane share of the dispatcher work

**Symptom:** all 62 Factory-front send-out intro families (**376/376** species
mappings) are ported and accepted in the animation lane
(ANIMATION_PROGRESS.md top entry, 2026-08-03, `ANIM_FRONT_FLIP` closing the
census), but the live battle send-out seam never invokes these reducers
frame-by-frame — playable battles show no per-species intro animation, and
every settled sprite misses its function's terminal `x2`/`y2` rest offset
**for the remainder of the battle**. That residual-offset leak is the defect
class behind the user's 2026-07-31 priority directive; two windows already
hand-paid for it (DRAGON_RAGE's dense window and
`docs/aerial-ace-portable-staging-probe.md`, both settled opponent-front ONIX
at `x2=+1`).

**Confirmed:** rung 1 of `docs/send-out-intro-animation-program.md` §6 is done
(`src/data/gen/send-out-anim-selector-tables.json`); the front family is fully
banked as reducers with byte-identical mGBA receipts (62/62), superseding
rung 2's tier-1 constants for front. Three hand-fit one-offs exist today with
no dispatcher: ONIX front terminal (`src/animation/speciesIdleAnim.ts:44`),
MAGBY back (`src/engine/magbySendOut.ts:18`), ONIX back
(`src/engine/battleMenu.ts:708`). The latter two live in main-lane-owned
`src/engine/` files — retiring them is a coordinated cross-lane change, not an
animation-lane drive-by (program doc §6 rung 3).

**The work — main-lane share:** (1) invoke the rung-3 dispatcher (animation
lane builds it in `src/animation/`, keyed by species for front and
species+nature for back) from the live send-out seam so banked reducers run
frame-by-frame — or at minimum apply their terminal rest offsets so settled
sprites sit at source-exact positions; (2) retire the two `src/engine/`
hand-fits into that dispatcher, coordinated with the animation lane.
Back-family tier-1 constants (68 reachable functions, rung 4) are the
animation lane's next program and are **not** a prerequisite for wiring the
completed front family. Acceptance bar: program doc §7 — RAM probe of the
settled sprite (`gBattlerSpriteIds[n]` `x2`/`y2`/`animNum`/`callback`), dense
oracle window twice fresh, and a sibling-species spot-check per promoted
function.

**Slice A is REFUTED under Battle Scene OFF (2026-08-07, staged + RAM-probed,
supervisor-verified).** The "at minimum apply their terminal rest offsets"
half of item (1) above must **not** be implemented on the OFF profile. A
side-lane worker staged a legal Level-50 RATTATA send-out through
`mechanicLab overrides.parties`
(`tools/battle-lab/send-out-slice-a-rattata-off.json`, two `bin/oracle lab`
runs byte-identical across 2036 files) and probed the settled sprite every
tick (`docs/send-out-slice-a-positive-case.md`,
`tools/probe/dump-sendout-slice-a-rattata.py`, receipt 2640 tick rows):
the sprite is created already at `SpriteCallbackDummy` with `animNum 0` and
**`x2 = y2 = 0`**, and stays there for the whole battle (all 634 post ticks,
zero deviations) — OFF takes the `SKIP_FRONT_ANIM` path (`pokemon.c:6803`)
and never launches the animation task the terminal offset belongs to.
The banked table nonetheless returns `{x2:1, y2:0}` for RATTATA and ONIX
(`speciesFrontIdleRestOffset`), so wiring it at the settle hooks would have
been a **361-px regression** over bbox (164,41)-(190,71), not an inert no-op.
Independently corroborated: `mid-battle-switch-dense-a-off` is byte-exact
with a settled RATTATA opponent front sprite on screen. Consequence: the
front terminal-offset wiring is **ON-profile-only** work, and the main lane
(whose oracle is OFF) has nothing to hook up for it. What remains genuinely
main-lane here is Slice C of `docs/send-out-live-wiring-consumer-map.md` §5 —
guarding the `src/engine/` back hand-fits so an uncovered species/nature
fails loudly instead of silently drawing the wrong table. Per-tick playback
(Slice D) is likewise ON-profile behaviour: OFF skips front and back send-out
animations entirely.

**Sequencing (updated 2026-08-03, mid-session user directive):** the hookup
is the MAIN lane's job ("the animation supervisor works on implementing the
animations... it should be your job to hook those things up"). Ground truth
for scoping: `docs/send-out-live-wiring-consumer-map.md` (2026-08-03 scout,
base `4fe0e206`) — 4-slice plan §5, the 5 settle hooks §4, RAM-probe recipe,
cross-lane dispatcher ask. Supervisor-verified scout finding: of 386
species only ONIX and RATTATA have a nonzero terminal rest offset (both
`{x2:1,y2:0}`). The scout also found a **4th uncatalogued hand-fit**
(KABUTO live per-tick front animation, `src/engine/kabutoSendOut.ts`) and
corrected the ONIX-back citation drift (`battleMenu.ts:708` → `:733-749`).
Resolver side is ready — `battleIntroStrings.ts` + entry 887's
`introBattler`/`introHpScale`/`introOutcome` event fields mean the send-out
strings resolve the moment a live path emits them.

**Progress (2026-08-03, entry 890): Slices A+B DONE.** `speciesFrontIdleRestOffset`
is now wired at all 5 real settle hooks (§4 items 1-5, 6 call sites) in
`battleScene.ts`; the generated-route pair already threaded the real
`fieldView` species (Slice B satisfied as written). RAM-probe-confirmed
against the real ROM for GROVYLE/PIDGEOTTO (sibling pair, both `{0,0}`) and
RATTATA (positive case, `{1,0}`) — see `PROGRESS.md` entry 890 for the
probe/scenario details and the `battle-scene-off`-vs-`battle-scene-on`
mechanicLab fast-forward gotcha it turned up. Dense-window list re-run twice
fresh, zero new diffs; `battle-command-generated-off.json` 128/128
byte-identical vs. parent.

**Progress (2026-08-03, entry 891): Slice C DONE.** The 3 back-side hand-fit
consumers (`drawPlayerMaterializeSettle` ONIX-back-legacy,
`drawKabutoHSlideWobble` KABUTO-front-legacy — the §2 4th hand-fit — and
`drawTurn15ForcedSwitchRelease` MAGBY-back-forced-switch) are documented +
throw-guarded per §5 Slice C, each with a Tier-1 pin.

**Progress (2026-08-03, entry 894/895): entry-891's latent bug FIXED**
(`7e14afae`, merged `cffb7491`): `drawGeneratedPlayerMaterialize` now applies
the ONIX-only `playerMaterializeSettleY2` wobble table only when the generated
player lead is ONIX (species 95 + symbol double-gate,
`generatedPlayerMaterializeSettleY2`); the tint fade stays for every species
(RAM-probe-confirmed species-generic, `Task_FadeMon_ToNormal` 16→0 −1/tick).
Ground truth banked from a real-ROM KADABRA-lead probe
(`docs/probes/kadabra-materialize-settle/`): each species' true settle is its
own back-anim-family motion (KADABRA: y2 descent 14→0 over 13 ticks), so
non-ONIX draws flat y2=0 **until Slice D's dispatcher lands** — the descent
itself is deliberately un-modeled here. 7 red-verified tests
(`tests/generatedPlayerMaterializeSettleSpecies.test.ts`); differential
128/128 byte-identical (supervisor-rerun); full suite green at the commit.
Open remainder from that step: the oracle-pixel compare over a staged
non-ONIX settle window was NOT completed (matched app/oracle fixture-pair
authoring cost + suspected oracle single-frame nondeterminism under
multi-lane load — see PAPERCUTS); fold that check into Slice D's acceptance.

**Slice D — NOT APPLICABLE for the main lane's oracle (found 2026-08-04, R3
worker, before writing any render code, no src edits landed).** The rung-3
dispatcher itself landed (`src/animation/sendOutDispatcher.ts` +
`sendOutSpriteFrame.ts`, folded into master `519b6bf8`), but wiring its
per-tick playback into `drawGeneratedOpponentRelease`/
`renderGeneratedBattleStartPlayerRelease` — the main lane's **Battle Scene
OFF** seam — would be wrong, not a stretch improvement. Four independent,
converging sources all agree the real Scene-OFF game never plays this
animation at all:

1. `bin/oracle info`'s own bootstrap description (battle-scene-off profile):
   *"Move/effect and species front-sprite entrance animations are skipped by
   the real game."* Contrast `--profile battle-scene-on`: *"in-battle,
   move/effect and front-sprite entrance animations play."*
2. Source (`reference/pokeemerald/src/pokemon.c:6803-6852`,
   `DoMonFrontSpriteAnimation`): under `HITMARKER_NO_ANIMATIONS` (set once at
   battle init from `gSaveBlock2Ptr->optionsBattleSceneOff` and never cleared
   mid-battle, `battle_main.c:3081-3090`), the `SKIP_FRONT_ANIM` branch runs —
   `LaunchAnimationTaskForFrontSprite` is never called, `sprite->callback =
   SpriteCallbackDummy`, `x2`/`y2`/`animNum` stay at their pre-callback values
   forever. This is the exact callback (`SpriteCB_OpponentMonFromBall`,
   installed at the same `StartSpriteAffineAnim(..., BATTLER_AFFINE_EMERGE)`
   handoff `drawGeneratedOpponentRelease` already models) `frontSendOutFrameAtTick`
   is meant to feed.
3. `drawGeneratedOpponentRelease`'s own pre-existing doc comment
   (`battleScene.ts`, predates this session) already says so verbatim:
   *"Battle Scene OFF skips the later species front-animation callback."*
4. `ISSUES.md` #56's closure audit (settled 2026-08-03) found **every**
   residual frame in the two committed generated-route dense Scene-OFF
   windows (`factory-arbitrary-intro-yoshi-off` 700/751,
   `-magneton-off` 703/751) accounted for by two unrelated mechanisms
   (display-tail VBlank phase + idle-menu-bounce) — zero residual from
   front-sprite movement, despite YOSHI/COMBUSKEN's real `ANIM_V_JUMPS_H_JUMPS`
   family, which would show visible mid-flight displacement if it played.

`PAPERCUTS.md`'s "mechanicLab send-out fast-forward silently inert under
battle-scene-off" entry asserts the opposite ("Real OFF-profile battles DO
play send-out anims") — that claim is **incorrect**, contradicted by all four
sources above; a solo session should correct/retract it (supervised workers
don't edit `PAPERCUTS.md`). The already-landed Slice A (applying
`speciesFrontIdleRestOffset`'s static terminal offset at `coeff===0`) is a
separate, already-merged decision outside this step's scope to re-litigate,
but the same source facts arguably bear on it too (`SKIP_FRONT_ANIM` never
runs the animation task at all, so a real Scene-OFF sprite's `x2`/`y2` may
never leave `{0,0}` even for ONIX/RATTATA at this exact seam) — flagged here
for whoever next touches this code, not fixed in this entry.

**Conclusion:** the cross-lane ask (`frontSendOutFrameAtTick` +
`frontSendOutSpriteFrameAtTick`) is fully delivered and correct on the
animation lane's own terms, but has **no valid consumer in the main lane's
Battle-Scene-OFF-compared render seams** — every seam Slice D would touch is
gated off by the same real-game mechanism. Nothing to wire; Slice D is
closed as not-applicable rather than done or blocked. The §1e 56/58
move-window patch-site retirement (separate, larger pair-guard-refactor
effort, `docs/send-out-live-wiring-consumer-map.md` §1e) remains the only
open main-lane share of this issue, alongside the KABUTO/MAGBY/ONIX one-off
hand-fit retirements (coordinated follow-up, not a solo drive-by).

**Addendum (2026-08-04, R4 MAIN worker): the flagged Slice-A landmine above
is REMOVED.** This entry's own §-above paragraph flagged that Slice A's
`speciesFrontIdleRestOffset` application at the two generated-route settle
hooks (`drawGeneratedOpponentRelease`'s `coeff===0` branch +
`renderGeneratedBattleStartPlayerRelease`'s duplicate) rests on the same
`SKIP_FRONT_ANIM` mechanism this Slice-D record just proved never runs
under Scene OFF — meaning those two hooks were baking a nonzero ONIX/RATTATA
`{+1,0}` the real OFF game never shows. Removed at both call sites
(`54979bf3`); replaced with a one-line comment citing this record. The
staged RATTATA positive pin in `tests/battleScene.test.ts` (ISSUES #71
Slice A/B describe block) is flipped to pin `{0,0}` at the generated
settle, red-verified (the old `+1` behavior fails the new pin with the src
edit stashed). Positive oracle evidence: a `battle-scene-off` mechanicLab
clone of `send-out-front-idle-rattata.json` (RATTATA lead, the census's
only non-ONIX nonzero species), RAM-probed across the full 634-tick trace —
flat `x2=0`/`y2=0`/`animNum=0`/`SpriteCallbackDummy` for all 635 sampled
ticks, receipt in `docs/rattata-off-seam-flat-settle-probe.md`. Insurance:
`compare:differential -- battle-command-generated-off.json --base 1a12ce9c`
stays 128/128 (ONIX/RATTATA appear in no committed generated window, so the
removal is pixel-inert there); the entry-890 §4 dense-window list was
re-run once — 4 of 6 match their documented baseline exactly
(`battle2-kabuto-sendout-dense` 151/151, `battle2-player-sendout-dense`
170/170, `sendout` 255/256, `battle2-jenson-sendout-text` 39/39); the
remaining 2 (`factory-arbitrary-intro-yoshi-off`,
`factory-arbitrary-intro-magneton-off`) show a 1-frame drift from their
documented baseline that **pre-dates this step** (reproduced identically at
the pre-edit commit `1a12ce9c` in a scratch worktree, and
`compare:differential` shows this step's commit is 751/751 byte-identical
to base for both traces at every frame) — filed separately as **ISSUES
#74**, not this entry's concern.

The four canonical hooks (`drawGrovyleSettled`, `drawKabutoHSlideWobble`'s
settle branch, `drawTurn5PidgeottoSettled`, `drawTurn13MurkrowSettled`) and
`speciesIdleAnim.ts`'s ONIX front terminal hand-fit were **not** touched —
their windows derive from ON-profile-legacy traces where the animation
genuinely played, and their species are all `{0,0}` regardless, so nothing
about them was ever wrong. Entry 894's deferred "staged non-ONIX settle
window" oracle-pixel check (folded into Slice D's acceptance bar per entry
891/894) is now **moot at this seam**: there is no species-varying
per-tick playback left to check here at all — Battle Scene OFF settles
every species flat, unconditionally, which this RAM receipt plus the
inert-insurance evidence above already cover in full. Disposition: no
further check needed; the deferred item has nothing left to verify at the
generated-route settle hooks.

## #72 — [CLOSED 2026-08-04; retained as settled record] battleStringResolver completeness guard — FATAL-guard user decision + selection-dismiss timing facts for future option-(a) work

**Original symptom** (2026-08-03, opponent MURKROW's TAUNT crash) and the
full reachability triage (`docs/issue72-reachability-triage.md`: 66
REACHABLE / 41 DEAD / 0 MANUAL of 107 UNRESOLVED `printstring` operands
found by `tools/report/printstring-literal-census.ts`) are in git history.
**All 66 REACHABLE ids are now landed**, batches 1-9
(`tests/presentationStringIssue72Batch{1..9}.test.ts`, each red-verified via
`git stash -- src/engine/battleResolutionPresentation.ts
src/engine/factoryBattleScriptFullTurnDecision.ts` plus whichever other
engine file that batch touched) — see each batch commit and the prior
revision of this entry for the per-id mechanism notes. Final batch (9):
`STRINGID_MAGNITUDESTRENGTH` (Magnitude's damage-tier name) — the kernel
already captured the roll (`magnitudeHandler`,
`battleScriptRankedBatch1Opcode.ts:130`, matching real source's
`PREPARE_BYTE_NUMBER_BUFFER(gBattleTextBuff1, 2, magnitude)` in
`Cmd_magnitudedamagecalculation`, `battle_script_commands.c:8670-8710`), so
this was presentation-only wiring following the STOCKPILE/PERISHCOUNTFELL
`battleTextBuff1ByteNumber` idiom. Census: 39→38 UNRESOLVED (final).

**USER DECISION 2026-08-03 — the completeness guard stays FATAL everywhere,
including the playable build. Do not re-raise.** The user declined
softening it to a non-fatal/best-effort path: "nah, just crash." Do not add
a fallback, `try`/`catch`, or env-gated non-fatal mode around
`battleStringResolver`/`battleResolutionPresentation`'s placeholder and
unknown-id throws — this decision outlives the now-closed REACHABLE backlog
above and still applies to any future id.

**Selection-rejection advisory slice landed 2026-08-04 (scout option (b),
adopted verbatim).** `describeIllegalMoveSelection`
(`battleScriptActionAdmission.ts`) is a pure, side-effect-free mirror of
`TrySetCantSelectMoveBattleScript` (`battle_util.c:976-1080`)'s six causes
(Disabled/Torment/Taunt/Imprison/Choice-lock/no-PP), sharing its per-cause
predicates with the existing `checkBattleScriptMoveLimitations` bitmask
rather than duplicating them, and reproducing source's own
last-true-wins-on-overwrite winner selection when more than one cause
applies to a slot (Tier-1-pinned). Wired alongside `legalMoveDecisions` as
`legalMoveSelectionRejections` (`factoryBattleScriptFullTurnDecision.ts`) and
surfaced as `rejectionReasonBySlot`, parallel to `legalMoveBySlot`
(`battleCommandPresentation.ts`). The 4 STRINGID resolvers
(`NOPPLEFT`/`PKMNCANTUSEMOVETORMENT`/`ITEMALLOWSONLYYMOVE`/`PKMNHASNOMOVESLEFT`)
are landed in `battleResolutionPresentation.ts`
(`resolveMoveSelectionRejectionMessageLines`/`resolveNoMovesLeftMessageLines`);
`PKMNCANTUSEMOVESEALED`/Imprison stays unresolved on purpose (DEAD carrier,
RALTS-below-floor gate) so the completeness guard stays fatal for it.
`submitBattleDecision`/`legalDecisions`/`battleDecisionBoundary.ts`'s public
contract is untouched, exactly as the scout's option (b) specified — options
(a) (reject-at-submit with a new event kind) and (c) (a full selection
battle-script mini-VM) remain unbuilt, clearly-scoped follow-ups if source-
exact event/requestId fidelity is ever wanted. Tests:
`tests/battleScriptSelectionRejection.test.ts` (20 cases: all six causes,
two multi-cause last-true-wins pins, the per-slot projection, the
`rejectionReasonBySlot` presentation wiring, and all 4 STRINGID resolutions
including the fatal-guard case), red-verified via `git stash`.

**Oracle-verified (2026-08-04):** a `mechanicLab overrides.parties` trace
(BUTTERFREE TACKLE/GUST vs. MURKROW-family TORMENT, `battle-scene-off`,
turn 1 torments the player's just-used TACKLE, turn 2 reselects it) confirms
the real ROM prints exactly "BUTTERFREE can't use the same / move in a row
due to the TORMENT!" byte-for-byte matching this resolver's output.
**Scout-doc correction found in the same probe:** contrary to
`selection-rejection-subsystem-scout.md` §1.2's claim that the selection
scripts' lack of `waitmessage` means "no button-press dismissal and no extra
hold," the real ROM in fact holds the message on screen indefinitely (tested
100+ frames) until a button is pressed, then reopens the move menu ~10-14
frames later — `Cmd_printselectionstring`'s controller-side completion must
gate on more than raw text-printer inactivity. This doesn't affect anything
landed this step (no live dismiss-timing UI was built, per option (b)'s
scope), but whoever builds option (a) or any live text-box wiring for this
family needs the real button-gated timing, not the scout's auto-advance
assumption. (That first Torment probe's trace/PNGs were never banked to
disk — a gap the follow-up below both repeats-not and fixes for its own two
causes.)

**Oracle-verified, remaining two feasible causes (2026-08-04,
`docs/probes/selection-rejection-oracle-verification/`):**
`STRINGID_ITEMALLOWSONLYYMOVE` (`mechanic-selection-reject-choice-band-off.json`:
CHANSEY holds Choice Band, turn 1 uses TACKLE, turn 2 attempts GROWL) prints
exactly "CHOICE BAND allows the / use of only TACKLE!" byte-for-byte
matching the resolver. `STRINGID_NOPPLEFT`
(`mechanic-selection-reject-no-pp-off.json`: CHANSEY's SUNNY DAY genuinely
depleted 5→0 PP over 5 real turns — `overrides.parties` cannot inject PP
directly, only derive it from base PP × PP Ups — then reselected with
TACKLE still legal so the menu stays open) prints exactly "There's no PP
left for / this move!" byte-for-byte matching the resolver. Both traces and
PNGs are checked in this time (`tools/battle-lab/mechanic-selection-reject-
{choice-band,no-pp}-off.json`, receipts under the probe doc above) — no src
mismatch found, no fix needed. **`STRINGID_PKMNHASNOMOVESLEFT` was not
attempted**: it needs all four move slots at 0 PP simultaneously, and every
slot's PP is independently ROM-derived with no injection path; the cheapest
depletion vehicle would cost 4×5=20 real turns (or a riskier 4-turn Sketch
path gated on an unverified speed-ordering argument — see the probe doc's
closing section for the full reasoning). All three causes' resolver text
was already Tier-1-pinned before this step
(`tests/battleScriptSelectionRejection.test.ts`); this step only added the
oracle-side confirmation for two of the three untested causes.

**Leads:** rerun `node --experimental-strip-types tools/report/
printstring-literal-census.ts` after any `messageLines`/battle-script-program
change (deterministic, re-derives from the tree; stays 38 UNRESOLVED after
this step — structurally blind to the `printselectionstring` family just
landed, per the tool's own known limitation, not re-fixed here). DEAD ids
(facility gates, no-EXP rentals, zero-carrier moves, the sub-110 draft-floor
class, unimplemented mechanics) are not reopened here; full 107-id list incl.
all 37 DEAD gates + emitting script label(s) + trigger/carrier evidence in
`docs/issue72-reachability-triage.md`.

## #73 — Terminal-seam remainder: the win/loss window's oracle-coverage gap (rung B)

**Context:** increments (i)+(ii) landed 2026-08-03/04 (PROGRESS 901/906) for
both outcomes: WIN runs `BattleScript_FrontierTrainerBattleWon`, LOSS/DREW run
`BattleScript_LocalBattleLost`, each as a real second VM pass emitting
resolved message/trainer-slide events. Increment (iii) — the presentation
phase itself — landed 2026-08-04 (PROGRESS 909): `projectBattleResolutionCommands`
(`battleResolutionPresentation.ts`) now has a generic `"trainer-slide"`
command case (keyed off `trainer-slide-in`/`-out` events and the already-
threaded `opponentTrainer`, not DESTIN-hardcoded), the three terminal
STRINGIDs are real dismissible message boxes (`TERMINAL_SEAM_BUTTON_MESSAGE_IDS`,
reusing the same button-advance/dismiss machinery `STRINGID_TARGETFAINTED`
already uses), and `battleResolutionPresentationRender.ts`/`battleScene.ts`'s
generic `renderBattleResolutionSceneOffView` draw the trainer sliding in
(ported `SpriteCB_TrainerSlideIn` settle math, `TRAINER_SLIDE_TIMING`)
before the existing `terminal-handoff` lifecycle phase hands off to
`finishBattle`/`postwin`/`factoryTerminal` exactly as before. Tier-1-pinned
(`tests/presentationTerminalSeamTrainerSlide.test.ts`, DESTIN WIN + JENSON
LOSS, full command/phase sequence including the settle/dismiss timings) and
`compare:differential` stayed 128/128 byte-identical.

**2026-08-04 rung-B session: `TRAINER_SLIDE_TIMING` corrected 53→38,
pixel-verified; `npm run compare` wiring for either outcome NOT completed.**
Direct pixel evidence (dense per-tick re-probe of the committed LOSS fixture,
`tools/battle-lab/loss-terminal-explosion-dusclops-off.json`, frames
2994-3059, via `bin/oracle lab`) finds the trainer sprite's on-screen
bounding box first move at tick 3009 and stop moving at tick 3034 — **38**
ticks after the slide dispatches (opponent-controller command 6→8 at 2996),
not 53 (the old constant) and not the 61-tick span this issue's prior text
guessed at (that 61 was the *empty-field-to-text-start* span, which also
includes an unrelated ~10-tick dispatch/ack gap before the sprite becomes
visible plus the message's own per-character typing time — not the slide
alone). The fit is exact, not approximate: `offscreenX2 = 2*(38-age)`
reproduces the measured leading edge at all 8 sampled ticks from first
visibility (age 13, x=239) through settle (age 38, x=189). The old 53 was
independently wrong twice over — never pixel-fit-verified, and its own
source arithmetic was off (`OpponentHandleTrainerSlide` in
`reference/pokeemerald/src/battle_controller_opponent.c:1385-1390` creates
the sprite at `x2=96` stepping `sSpeedX=-2`/callback, i.e. 96/2=48 callbacks
by that math alone, still not 53). Landed in `src/engine/
battleResolutionPresentation.ts` (`TRAINER_SLIDE_TIMING`,
`BattleTrainerSlideTiming`) with the corrected citation in place; Tier-1 pins
in `tests/presentationTerminalSeamTrainerSlide.test.ts` red-verified against
the old values (53, `offscreenX2: 106`) before updating to the new ones (38,
76). Full `npm test` (702 files/6,792 passed/1 skipped) and `npm run build`
green at this fix; `compare:differential -- battle-command-generated-off.json
--base a7bbed0b --summary` stayed 128/128.

**2026-08-04 LOSS-half: all three diagnosed classes fixed; small residual
classes remain (1/236 frames fully match — the original entry inverted this
as "235/236"; supervisor-corrected).** The compare
wiring landed that morning (`29e5cb3d`, `tools/compare/appTrace.ts`'s
`loss-terminal-window-off` stage) at a reproducible 0/236 baseline with
three diagnosed mismatch classes. This session fixed all three:
- **(A) genuine render gap, fixed in `src`:** `VARIOUS_RETURN_OPPONENT_MON1/2`'s
  real controller receipt is `CONTROLLER_RETURNMONTOBALL`
  (`BtlController_EmitReturnMonToBall`), not `CONTROLLER_SPRITEINVISIBILITY`
  — `battle_controller_opponent.c`'s `OpponentHandleReturnMonToBall`/
  `FreeMonSpriteAfterSwitchOutAnim` both call `SetHealthboxSpriteInvisible`
  alongside destroying the sprite, unlike `OpponentHandleSpriteInvisibility`
  (`Cmd_moveend`'s Dig/Fly semi-invisible toggle, `Cmd_makevisible`), which
  never touches the healthbox. Both real ROM commands were modeled as the
  same kernel event kind (`set-battler-sprite-visibility`); the
  `"sprite-visibility"` presentation command now carries a `recall` flag
  distinguishing them, sourced generically from the emitting instruction's
  own interpreter provenance (`opcodeName === "B_SCR_OP_VARIOUS"`), not any
  window-specific special case. `battleResolutionPresentationRender.ts` gates
  `visibility.{player,opponent}.healthbox` on a new `healthboxVisibility` map
  that only recall transitions touch. Red-verified via
  `tests/presentationTerminalSeamTrainerSlide.test.ts`'s LOSS case (asserts
  `{sprite: false, healthbox: false}`; `git stash -- src/engine/
  battleResolutionPresentation.ts src/engine/battleResolutionPresentationRender.ts`
  flips it to `{sprite: false, healthbox: true}`, the bug). Existing Dig/Fly
  pins (`turn15FlyResolutionAdapter.test.ts`) and every other
  `sprite-visibility` pin (`toMatchObject`/`objectContaining`, plus two
  `toEqual` arrays updated to `recall: false` in `battleTurnPortability.test.ts`)
  are unaffected — landed `c8cc6cd4`.
- **(B)+(C) scaffold artifacts, fixed in `tools/compare/appTrace.ts` only:**
  the antecedent "MURKROW fainted!" box and the player's all-fainted empty
  field are the *same* real event — MURKROW's own Explosion self-KO
  (`setatkhptozero`) — now replayed through the real
  `health-bar-update -> hp-change -> faint-animation -> STRINGID_ATTACKERFAINTED`
  chain (not `STRINGID_TARGETFAINTED`: the move's *user* is the one who
  faints here) ahead of the existing recall/slide/win-text events, all
  hand-set to `commandIndex: 4` (outside real ticks, same idiom as the prior
  single-command skip) rather than replayed from true frame 0.
  `TERMINAL_SEAM_SCAFFOLD_PLAYER`'s species changed to MURKROW (198) so the
  real name resolver — not a hardcoded string — reproduces the oracle's
  literal text. The real `"faint"` command's existing `fainted`-gated
  visibility hides the player sprite+healthbox as a side effect, so no
  separate synthetic event was needed for (C).
- **Result:** `npm run compare -- loss-terminal-window-off --summary`:
  **1/236 frames fully matched** (frame 3231, both times), the other 235
  reduced from the ~7,700-8,300px baseline to the residual classes below,
  byte-identical across two independent runs plus a third supervisor rerun
  post-animation-fold (run-2026-08-04-17-32-22Z-58459).

**2026-08-04 cursor-gating landed (`5e7457b1`): 175/236 frames fully
matched** (twice-run byte-identical + independent supervisor rerun). The
wait-cursor mechanism is source-confirmed and gated
(`TERMINAL_SEAM_QUOTE_MESSAGE_IDS`: the two quote ids' wait is
`BufferStringBattle`'s appended `EXT_CTRL_CODE_PAUSE_UNTIL_PRESS` →
`TextPrinterWait`, no down-arrow ever; `STRINGID_PLAYERDEFEATEDTRAINER1`
ends in a literal `\p` → `TextPrinterWaitWithDownArrow` and **keeps** its
cursor — load-bearing for the WIN-side wiring). Full mechanism + citations:
`docs/terminal-seam-loss-path-ground-truth.md` §6.

**LOSS window CLOSED at 236/236 (`40b75dc6`, supervisor re-verified
independently).** Both residual classes fixed scaffold-only in
`tools/compare/appTrace.ts`'s `lossTerminalWindowStage`, per
`docs/terminal-seam-antecedent-boundary-probe.md`.

**WIN window wired 2026-08-04 (`af036937`): 65/65 byte-identical twice-run
on the covered span** (trainer slide + swap edge + most of the quote's
typing), with WIN's own probe constants banked
(`docs/terminal-seam-win-window-probe.md`: antecedent `readyTick=4262`,
`dismissTick=4608`, `frozenCursorAge=346`; +3 swap-edge shape RAM-confirmed
identical to LOSS). Bounded short of the full 241-frame window by a
GENUINE src bug (DESTIN's 23-char speechLose skips its own dismiss wait).
Two scaffold-side bugs found and fixed during wiring are documented in the
probe doc (held-cursor last-match lookup; frame0 from ack−38, since
`TRAINER_SLIDE_TIMING=38` is calibrated against coarse dispatch, not
RAM-precise dispatch).

**Button-message dismiss-skip race FIXED 2026-08-04 (`e88fb4a5`, was filed
as ISSUES #75).** `isBattleResolutionCommandComplete` now defers to
`isBattleResolutionButtonMessageReady` for any `message`+`advance:"button"`
command, so the length-derived duration formula can never substitute for
the real dismiss wait regardless of printable length vs `minimumFrames`.
Red-verified on DESTIN's exact 23-char `speechLose` lines (doubles as the
`minimumFrames-1` boundary case,
`tests/presentationTerminalSeamTrainerSlide.test.ts`). Regression sweep:
`loss-terminal-window-off` 236/236, `win-terminal-window-off` 65/65,
`compare:differential -- battle-command-generated-off.json` 128/128,
full `npm test` 721/721 files (6,926 passed/1 skipped, no existing pin
depended on the old skip timing).

**WIN window extended 2026-08-04 (`9b0a04dc`, merged `bba958a3`): 65/65 →
389/389** (frames 4623–5011: slide + swap edge + fully-typed quote + the
323-frame settled hold + the real dismiss press's first tick), twice-run
byte-identical + supervisor rerun post-merge; LOSS re-held 236/236. Pure
data change — `winTerminalWindowStage` needed zero code edits; the trace's
segments are a literal prefix of the committed fixture's own recorded
schedule. Pinned: quote settled span 4688–5010, real dismiss tick 5010
(2-tick press at 5011–5012). The scaffold party-identity gap this paragraph
used to flag here (`docs/terminal-seam-win-window-probe.md` §5, frame 5012's
`assertSamePartyIdentity` throw) was fixed generically in a later session
(`hp: 0` on both terminal-seam scaffold configs, §6 of that same doc,
PROGRESS entry 931) — frame 5012/3232 no longer crash on either window.

**Post-`finishBattle` presentation timing (§6's real blocker) closed for
slice 1 of the 5-slice plan in `docs/post-terminal-return-to-lobby-ground-truth.md`:
WIN 389/389 → 503/503, LOSS 236/236 → 350/350, both twice-run
byte-identical.** The shared 108-tick return-to-field span (dismiss+8
fade-to-black → dismiss+37, black hold, `BeginFastPaletteFade(3)`'s
battle-room fade-in-with-brightness-pulse dismiss+58→+96, second black hold
through dismiss+115) is now one outcome-agnostic mechanism, reusing the
existing (previously Turn17-canonical-only) `postwin.ts` phase machine
(`postwinPhase`, `POSTWIN_BATTLE_FADE_FIRST_AGE`/etc., unchanged) for BOTH
outcomes: `createPostwinStateFromRound` (WIN) and the new
`createBattleReturnHoldState` (LOSS/roundCompleted) both start `elapsed` at
the same value (1, one tick later than Turn17's own convention — this
route's real dismiss press is 2 ticks vs. Turn17's 1). Battle Scene OFF's
`renderPostwinState` gained a `frozenSceneView`-driven fallback (a snapshot
of `createBattleResolutionPresentationRenderView` taken the instant
`finishBattle` fires) for the `battleHold`/`battleFade` phases, since
`state.battleScene` (Turn17's own equivalent) is always null on this route;
the fade math reuses `BeginFastPaletteFade`'s real BG/OBJ-alternating-update
schedule (`applyFastFadeToBlack`/`fastFadeUpdatesForLocalTick`, new exports
in `battleScene.ts`, factored out of the existing Turn17 fade function) over
a mask built from `renderBattleResolutionSceneOffView`'s own draw calls plus
the settled trainer-slide sprite (`drawBattleResolutionSceneOffFadeMask`,
new). `render()` now checks `state.postwin` (while its phase isn't yet
`counterRoom`) ahead of `factoryTerminal`, so LOSS's shared span renders
before its own (out-of-scope, still-uncalibrated) Lobby content takes over;
`factoryTerminal`'s own per-tick branch in `tick()` now also advances
`postwin` underneath itself, fixing a found-along-the-way bug where it
otherwise froze the shared clock at its initial tick forever. Tier-1 pin:
`tests/factoryBattleReturnPresentation.test.ts` (4 tests: shared elapsed
start, every doc-cited phase boundary, a full 114-tick lockstep WIN/LOSS
phase-sequence walk, the fade BG/OBJ update schedule) — the elapsed-start
and fade-schedule pins were red-verified this session (flipped
`GENERATED_ROUTE_INITIAL_ELAPSED`/`objUpdates`' formula, watched two tests
fail, reverted). Full `npm test`/`npm run build` green at this session's
final commit (see PROGRESS for exact counts). **Out of scope, next pickup:**
slices 2–4 — LOSS's Lobby arrival + first message + held-cursor dismiss,
LOSS's restore/save wait + record prompt, WIN's PreBattleRoom arrival + heal
message (all past dismiss+115, where the two destinations genuinely
diverge) — see that doc's §5 for the bounded plan.

**2026-08-04 slice-2 groundwork: the Lobby arrival's real schedule mapped
dense and the shared field renderer corrected to the real warp camera —
committed as an exact-foundation checkpoint (LOSS 350/350, WIN 503/503
both still twice-stable), exactness past frame 3345 NOT yet reached.** A
bounded MAIN-lane worker probed frames 3346-3834 of the committed LOSS
fixture 1-tick dense (per-slice `bin/oracle lab` passes, receipts at the
end of this paragraph) and corrected two things in
`src/engine/factoryTerminalRender.ts` that the prior probe-side staged
seam had masked:
- **Camera.** The real post-terminal Lobby warp (4,8) centers the field at
  the layout's own `cameraOriginPx` ({x:-48, y:56}) — the renderer was
  hardcoding a `bgOriginX=16` left over from the staged (8,8) probe camera.
  `renderFactoryTerminalField` now renders the field at `cameraOriginPx.x`
  by default; the extracted 19×12 Lobby tileset is pixel-exact against the
  oracle at that origin (measured 0 diff outside the object sprites at
  frame 3361). Both committed terminal windows stop exactly at dismiss+115
  (WIN 5125, LOSS 3345), so neither ever rendered the lobby field — the
  change is inert there, confirmed by re-running both at 503/503 and
  350/350.
- **Object OAM anchors.** The old per-object formula hardcoded a -16px x
  anchor (staged-camera artifact). All object-event sprites anchor through
  the same camera with `centerToCornerVec` = -(width/2) and the standard
  16×32 `sprite->y += 16 + centerToCornerVecY` feet-anchor
  (`event_object_movement.c:1850-1854`, `sprite.c:349-355`); the player's
  own sprite additionally carries the standard +1px x2 sub-pixel. Object
  screen positions are now `tile.x*16 - cameraOriginPx.x` (+1 for player)
  and `tile.y*16 - cameraOriginPx.y - 21`. Verified: player at (113,51),
  fatMan (6,10) and woman (3,11) at their oracle blobs (their upper halves
  correctly hidden behind the counter's NORMAL top layer); singles
  attendant (4,7) hidden behind the counter; doubles attendant/camper/
  picnicker off-screen right. Frame 3361 residual dropped 26014 → 1095 px
  (all in the three sprite silhouettes, still pose/anchor pixels to fit).
  *[2026-08-04 correction: the "+1px x2 sub-pixel" / (113,51) player anchor
  was the erroneous offset this step removed — see the closing paragraph of
  this entry; the player now anchors at (112,56) with 0 diff.]*
- **Real schedule (banked for the timing calibration, dense 1-tick):**
  Lobby fade-in age 114-128 (terminal age = frame − 3232), map settle (no
  box) 129-140, box open 141-142, page 0 "Thank you for participating!"
  typing 143-170 + cursor 171-302, fixture's real A at 300 dismisses it,
  box clear 303-305, page 1 "I will return your POKéMON in exchange /
  for our rental POKéMON." typing 306-365 + cursor ~366-601, fixture's real
  A at 602 dismisses it (frame 3834 = slice 2's end). The prior scout
  doc's "repeating 3-frame walk-cycle" (3350-3510) is actually the page-0
  held-cursor blink only — `lockall` freezes every NPC, so no walk
  animation is needed.
- **Timing recalibrated + object anchors corrected (this session's second
  commit): `FACTORY_LOSS_TERMINAL_PROFILE` now models the real
  post-terminal schedule** (fieldFirstAge 114 / messageFrameAge 141 /
  page-0 text 143 / page-0 input-ready 171 / nextPageVisualDelay 2, i.e.
  page-1 text at page0release+2; all ages = frame − 3232), and the object
  OAM anchors use the source 16x32 feet-anchor (`box top = tile*16 −
  cameraOrigin − 16`, `event_object_movement.c:1850-1854`), which makes the
  fatMan/woman/scientist sprites pixel-exact (0 diff vs the oracle at frame
  3361). The four LOSS state-machine pins in
  `tests/factoryTerminalPresentation.test.ts` and the one in
  `tests/interactiveRouting.test.ts` were re-based to the real route's
  release edges (+171/+238 pages, +524 B-release, +288 completion, +547/+549
  record menu). Measured on a dense 3346-3834 scratch window: fade-in 37-133
  px, page-0 typing 133-175, page-0 cursor 133-170, page-1 typing 182-898,
  page-1 cursor 133-229 — down from 26014 px before the camera fix.
- **Page-transition residual class RESOLVED (2026-08-04, R5 MAIN worker):
  `nextPageVisualDelay` is 2, not 6 — and the whole page-1 window is now
  exact.** The earlier "page-1 typing 182-898 px" measurement and the
  "RenderText printer pause cadence" attribution were both artefacts of the
  wrong `nextPageVisualDelay`: a dense 1-tick re-probe of the committed
  LOSS fixture (frames 3534-3600) shows the real printer types page-1
  **1 glyph/tick with no pauses** — the "no-change" frames are exactly the
  two invisible space glyphs, and the "3-tick box clear/reopen" at
  3535-3537 is page-1's opening "I " of "I will return your POKéMON in
  exchange" printing onto the box frame itself (the serif-I's pixels are
  the frame's own border pixels, so the box reads empty at 3535-3536 and
  the first visible glyph "w" lands at 3537). With `nextPageVisualDelay=2`
  the generic `factoryTerminalActivePage`/`factoryTerminalPageTextFirstAge`
  flip happens at the real edge (release+2), and the existing 1-char/tick
  `factoryTerminalVisibleChars` model reproduces every frame 3535-4053
  (page-1 typing + cursor + dismiss + page-2 typing + cursor) **0 diff
  outside the out-of-scope player sprite** (twice-run byte-identical on the
  scratch windows below). The mechanism is expressed as a first-class
  source-relative phase — `FactoryTerminalPageVisualPhase`
  (`idle`/`typing`/`held`/`cleared`, `factoryTerminalPageVisualPhase` in
  `factoryTerminalPresentation.ts`), documented against the real
  CHAR_PROMPT_CLEAR handoff (text.c RENDER_STATE_CLEAR: the released page
  stays drawn `nextPageVisualDelay` ticks, then FillWindowPixelBuffer wipes
  and the next page prints the same tick), with the render's page cursor
  gated on it. Two red-verified Tier-1 tests
  (`tests/factoryTerminalPresentation.test.ts` "holds the released page…"
  + "renders the box-clear/reopen phase…"; both fail with the old value 6
  stashed). The record-prompt transition at frame 4054+ (the next box
  clear, ~1,350 px) is slice 3's own territory, untouched here.
- **Residual classes (documented, honest checkpoint):** (1) the **player
  sprite** (~133 px, constant across every frame) — the oracle renders the
  bootstrapped save's actual player character (red-brown hat + red shirt,
  ~36 px tall), which is NOT the source-derived Brendan walking frame 1 the
  layout asset carries (blue hat, 20 px); the game substitutes the player's
  object graphic from the save at runtime, so the extracted Brendan asset
  cannot match — needs the oracle's real player graphic extracted (probe:
  `bin/oracle` RAM/save read, or a source player-pic family check). The
  page-1 printer-pause and page-1 box-open classes above are **closed**;
  the remaining page-2/record-prompt transition (frame 4054+, ~1,350 px)
  belongs to slice 3. **Honest contiguous exact checkpoint therefore
  remains frame 3345 (350/350) in the committed trace — which was NOT
  extended** (the capture window ends before the page-0 dismiss, so a
  red window would misrepresent it) — while the dense scratch windows prove
  the page-1 span exact: `loss-s2-page1-window` (3534-3660) and
  `loss-s2-page1-tail` (3590-3845) are 0-diff outside the player sprite,
  twice-run byte-identical. Receipts: dense `bin/oracle lab` passes over
  the committed fixture (`/tmp/loss-s2-{coarse,c1,c2,c3}.json`, 62+194+38+75
  captures), reproduced twice; the scratch compare traces used for the
  numbers above are not committed.
- **2026-08-04 LOSS slice-2 player-sprite residual CLOSED + window extended:
  `loss-terminal-window-off` is 839/839 exact through frame 3834, twice-run
  byte-identical.** Two source-side corrections, both pure logic in the
  terminal presentation (no generated asset/extractor edit; the supervisor's
  evidence that `factory-lobby-terminal-npcs.json` already carries the exact
  north-facing Brendan frame 1 + palette was confirmed — no new player
  graphic was ever needed, and the earlier "different player asset" claim
  below is **retracted** as the stale mis-attribution this paragraph records):
  1. **Player OAM anchor** (`factoryTerminalRender.ts`): the generic Lobby
     object anchor's player-only `+1px x2` sub-pixel offset was wrong — it
     placed the sprite at (113,56), reproducing the ~133px residual exactly.
     Removed; all object events now anchor at `tile*16 - cameraOriginPx`
     (player tile (4,8), cameraOriginPx {x:-48,y:56} → (112,56)). The
     source-derived field + player at (112,56) match the oracle's frame 3365
     with 0 differing pixels. Tier-1 pin (red-verified by stashing): player-
     unique pixels at the source-derived screen positions (hat blue-grey
     (117,66), hat white (116,69), shirt red (113,80), navy (115,73)/(125,82),
     right-edge (126,81)).
  2. **Page-0 first-glyph age** (`FACTORY_LOSS_TERMINAL_PROFILE.
     firstPageTextAge`): corrected **143 → 142**. The prior worker's dense
     scratch windows only covered page-1's span (3534+); a fresh oracle
     re-probe of the committed fixture's frames 3373-3375 shows the box
     opens at terminal age 141 and page-0's first glyph "T" lands at age 142
     (frame 3374), so 143 delayed every page-0 typing + cursor frame by one
     tick (frames 3374-3403 typing, 3412-3529 cursor phase). Tier-1 pin
     (red-verified by stashing): `firstPageTextAge === 142` with
     `factoryTerminalVisibleChars` 0/1/2 at ages 141/142/143.
  The committed trace's segments were restored to the fixture's own real
  schedule through cumulative 3834 (segments 0..41, unchanged buttons; the
  committed window's tail had truncated the fixture at segment 39/3345) and
  `captureFrames` extended contiguously 2996..3834 (839 frames). WIN remains
  **503/503**. Slice 2 is therefore exact end-to-end; the only remaining LOSS
  slice-2 boundary is slice 3's own record-prompt transition (frame 4054+,
  ~1,350 px).
- **2026-08-05 LOSS slice 3 CLOSED end-to-end: `loss-terminal-window-off` is
  1943/1943 exact through the fixture's honest endpoint frame 4938, twice-run
  byte-identical (PNG-hash equal).** One generic source-relative correction
  closes the entire 3835-4938 span (the record question + multichoice):
  `FACTORY_LOSS_TERMINAL_PROFILE.recordPromptDelayFromRestore` is **169, not
  172** — the same value the roundWon profile already carried, so both
  outcomes now share one restore-to-question gap. Dense 1-tick scratch
  compare over the whole extension plus per-frame pixel decoding pinned the
  real schedule: the record box clears at frame 4054 (terminal age 822), the
  "W" of "Would you like to record your last" lands at 4055 (age 823), line-2
  continues "BATTLE FACTORY match on your FRONTIER PASS?" on the same row,
  the first red wait-cursor appears at 4118 (age 886, exactly
  `promptFirst + recordPromptInputDelay + 1`), the fixture's own A at
  4136-4138 dismisses it, and the box scrolls to the held
  "BATTLE FACTORY match on your / FRONTIER PASS?" + YES/▶NO multichoice
  (160,8) hold that is byte-identical to the fixture's own final captured
  frame 4938. The app's release ages are the tick after the fixture's dismiss
  A (page-1 A at age 602 → `secondPageReleaseAge` 603, restore 653), so
  653 + 169 = 822 lands exactly on the real box-clear; the old 172 cleared
  two ticks late and typed two chars behind every frame 4054-4126 (the
  measured ~1,350px box-clear residual). No new input, no absolute-frame/
  battle-number/fixture branch, no generated asset/extractor change, no WIN
  route touch (the fix is LOSS-profile-only and inert in the WIN window).
  The committed trace's segments are now the fixture's full 46-segment prefix
  byte-for-byte (the last A at 4136-4138 and the 800-tick idle tail are the
  fixture's own recorded schedule) and `captureFrames` extend contiguously
  2996..4938 (1943 frames). Two red-verified Tier-1 pins
  (`tests/factoryTerminalPresentation.test.ts`: delay 169 + derived
  promptFirst 822/textFirst 823/inputReady 885, and the render's empty
  box-clear frame at 822 vs. the first "W" at 823; both fail with 172
  stashed). WIN re-held **503/503**; full `npm test` 727 files / 6,970
  passed / 1 skipped and `npm run build` green. Slice 3 is exact end-to-end;
  the only remaining LOSS-terminal work is out of this fixture's own recorded
  reach (the record-accept/decline branch through to free-roam, which needs a
  new fixture per `docs/post-terminal-return-to-lobby-ground-truth.md` §5
  slice 5).
- **2026-08-05 WIN slice 4 CLOSED end-to-end: `win-terminal-window-off` is
  890/890 exact through the fixture's honest endpoint frame 5512, twice-run
  byte-identical (PNG-hash equal), LOSS re-held 1943/1943.** The generic
  postwin PreBattleRoom return/heal span (dismiss+116..+502, frames
  5126-5512) is promoted from the side-lane evidence packet
  (`docs/win-prebattleroom-return-evidence.md`, whose spec windows
  win-prebattleroom-return-off-a/b reproduced at 256/256 + 131/131) into the
  canonical committed compare trace: last segment 113→500 so the 22-segment
  schedule is byte-for-byte the fixture's own full 5512-frame
  `trace.segments` (no invented input, no presses past the fixture's own
  last A at 5010-5011), and `captureFrames` dense 4623..5512 (890 captures).
  **No src edit** — `createPostwinStateFromRound`/`renderPostwinState`'s
  `counterRoom` phase (postwin age = frame − 5011) already reproduces every
  measured boundary with no clock adjustment: PreBattleRoom fade-in
  5126-5140, settled player+attendant hold 5141-5149, message box fully
  formed in one tick at 5150, 1-glyph/tick typing 5151-5202 (52 glyph
  positions incl. the 7 space pairs), byte-identical held "Thank you for
  competing! / Let us restore your POKéMON!" 5202-5512. The canonical
  503/503 baseline was re-run before the extension. Both outcomes' remaining
  terminal work is now out of this fixture's own recorded reach (the
  record-accept/decline branch through to free-roam, which needs a new
  fixture per `docs/post-terminal-return-to-lobby-ground-truth.md` §5 slice
  5, same as LOSS slice 5).
- **2026-08-05 LOSS decline continuation CLOSED end-to-end: `recordChoice`
  is no longer a dead-end — the generic NO branch drives the source
  `EndRecordBattle` farewell through the free-roam Lobby field, and a new
  canonical trace `loss-terminal-decline-continuation-off` is exact
  **155/155** twice fresh (PNG-byte-identical), LOSS/WIN/win-beyond
  re-held 1943/1943 + 890/890 + 228/228.** The shared
  `advanceFactoryTerminalRecordPrompt` now stores the decline edge (the
  tick the record menu's NO is stored; age 1757 = frame 4989 under the
  app's release-age convention) plus the farewell's own second-A dismiss,
  and `factoryTerminalRender` draws the span edge-relative per
  `BattleFrontier_BattleFactoryLobby/scripts.inc:81-94`: YES/NO window
  clears edge+1 (frame 4990), box wipes edge+3 (4992), the 35-glyph
  "We look forward to your next visit." types 1 glyph/tick from edge+4
  (4993), holds from edge+39 with **no wait-cursor** (measured zero red
  down-arrow pixels across the whole hold), the second real A registers at
  edge+102 (5091), and the box closes into the bare Lobby field at
  dismiss+2 (5093) — the field-only frame `toEqual(renderFactoryTerminalField())`,
  and every later static frame is byte-exact with no work. Focused 1-tick
  scratch compares pinned the boundaries first (4988-5030 **43/43**,
  5088-5094 **7/7**); the canonical trace's segments are byte-for-byte the
  committed scratch-loss-beyond-boundary-probe schedule with `captureFrames`
  dense 4939..5093 (155). The evidence trace `loss-beyond-boundary-off` is
  unchanged (162/183 — every residual is the fixture's own post-5174 walk
  samples, out of scope). NO only; the YES and B/cancel branches stay
  unconsumed (record playback + free-roam movement remain the open LOSS
  boundaries). Two red-verified Tier-1 pins
  (decline state machine + decline render; both fail with the old source
  stashed); full `npm test` 727 files / 6,972 passed / 1 skipped and
  `npm run build` green.
- **2026-08-05 WIN GO ON → first scouting message promoted into the
  canonical window: `win-terminal-window-off` is **2082/2082** exact through
  the genuine held first scouting boundary at frame 6704, twice fresh
  (PNG-byte-identical), regressions re-held LOSS 1943/1943, LOSS decline
  155/155, win-beyond 228/228, win-go-on-scout 143/143.** The supervisor-
  rerun GO ON evidence (`tools/compare/traces-groundtruth/win-go-on-scout-off.json`,
  143/143, `docs/post-terminal-beyond-boundary-win-go-on-scout-evidence.md`)
  is promoted into the canonical acceptance window as a **pure data change
  (zero src edits)**: the trace's scenario switches to
  `scratch-win-go-on-scout-probe.json`, its 27 segments are byte-for-byte
  the fixture's own full input prefix (verified before writing; no invented
  presses, nothing past the fixture's single GO ON A at 6634-6635), and
  `captureFrames` extend contiguously 4623..6704 (2082 captures). The
  existing `postwin` continuation machinery
  (`acceptPostwinContinuation` → `dialoguePage 1` →
  `POSTWIN_SCOUTING_LINES[0]`) reproduced every boundary with no
  calibration: GO ON menu hold through 6633, multichoice dismiss/box-clear
  6636-6638, the 65-frame first-scouting-message typing 6639-6703, and the
  wait-cursor hold from 6704. **Canonical covered boundary:** the WIN
  terminal window now runs from the DESTIN slide (4623) through the held
  first scouting page unpressed. **Remaining WIN work (unchanged):** the
  pages past the held first scouting message — the type/style commentary
  (`CommentOnOpponentType`'s `TrainerSkilledIn…` lines) and the swap offer —
  each need their own new fixture A press; the GO ON/RECORD/REST/RETIRE
  selection is now partially canonical (GO ON consumed), with RECORD/REST/
  RETIRE still unpressable on a committed fixture. LOSS's remaining boundary
  stays the record playback + free-roam movement.
- **2026-08-05 WIN opponent-type commentary bound at the next held page:
  `win-go-on-type-commentary-off` is **93/93** exact twice fresh through
  frame 7308, with no production change.** A file-disjoint fixture preserves
  the prior 27 segments byte-for-byte, presses the held first scouting page
  once at 7237-7238, observes box clear 7240 and the 67-frame no-favorite-
  type line at 7241-7307, then stops on the wait-cursor hold from 7308.
  Existing `acceptPostwinDialoguePage` / `dialoguePage 2` rendering is the
  whole mechanism. Remaining WIN work narrows to the battle-style page, swap
  offer/decision, and the unexercised RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN opponent-type commentary promoted into the canonical
  window: `win-terminal-window-off` is **2686/2686** exact twice fresh
  through the held boundary at frame 7308, pure data change (zero src
  edits).** The trace's scenario switches to
  `scratch-win-go-on-type-commentary-probe.json` with segments byte-for-byte
  the newer fixture's own full 29-segment/8138-frame schedule (prefix-proven
  before switching: old canonical 27 == prior fixture's full 27 == newer
  fixture's first 27) and `captureFrames` contiguous 4623..7308 (2686).
  Existing `acceptPostwinDialoguePage` / `dialoguePage 2` /
  `POSTWIN_SCOUTING_LINES[1]` reproduced every frame with no calibration.
  Regressions re-held: LOSS 1943/1943, LOSS decline 155/155, WIN beyond
  228/228, GO ON scout 143/143, type-page 93/93. Remaining WIN work narrows
  to the battle-style page, swap offer/decision, and the unexercised
  RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN battle-style commentary promoted into the canonical
  window: `win-terminal-window-off` is **3590/3590** exact twice fresh
  through the held boundary at frame 8212, pure data change (zero src
  edits).** The trace's scenario switches to
  `scratch-win-go-on-style-commentary-probe.json` with segments byte-for-byte
  the newer fixture's own full 31-segment/9040-frame schedule (prefix-proven
  before switching: old canonical 29 == prior fixture's full 29 == newer
  fixture's first 29; no invented input, nothing past the fixture's single
  style-page A at 8138-8139, no press into the swap offer) and
  `captureFrames` contiguous 4623..8212 (3590). Existing
  `acceptPostwinDialoguePage` / `dialoguePage 3` /
  `POSTWIN_SCOUTING_LINES[2]` reproduced every frame with no calibration.
  Regressions re-held: LOSS 1943/1943, LOSS decline 155/155, WIN beyond
  228/228, GO ON scout 143/143, type-page 93/93, style-page 92/92. Remaining
  WIN work narrows to the swap offer/decision and the unexercised
  RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN swap offer bound at the real YES/NO hold:
  `win-go-on-swap-offer-off` is **115/115** exact twice fresh through the
  input-ready boundary at frame 9111, with no production change.** The
  recovered evidence fixture preserves the prior 31 segments byte-for-byte,
  presses the held style page once at 9040-9041, observes box clear 9044,
  60-character offer typing 9045-9104, YES/NO window copy at 9107, and input
   readiness at 9111. Temporary side-lane debug instrumentation was discarded;
   the folded commit contains only the fixture/spec/note. Remaining WIN work
   is a real NO or YES decision plus the unexercised RECORD/REST/RETIRE paths.
- **2026-08-05 WIN swap-offer NO decision bound end-to-end through the
  guide: `win-go-on-swap-offer-no-off` is **213/213** exact twice fresh
  (frames 9930-10406), canonical WIN/LOSS/decline/commentary all re-held
  (3590/3590 + 1943/1943 + 155/155 + 228/228 + 143/143 + 93/93 + 92/92 +
  115/115 + 128/128).** The new scratch fixture preserves the swap-offer
  fixture's 33 segments byte-for-byte, appends a safely-held DOWN
  (9943-9944, cursor display → NO at 9944), a bounded idle, an A accepting
  NO at 10005-10006, and a bounded idle tail. Dense oracle captures bind the
  NO decision, YES/NO-window dismissal (edge+1), box clear (edge+3), and the
  generic `EnterBattleRoom` "Right this way, please!" guide typing 1
  glyph/tick from edge+4 through its final glyph at edge+26 (frame 10031),
  held **with no wait-cursor** through the endpoint 10406 (the genuine
  held/dismiss-ready boundary — no press into walk/warp, per the bounded
  contract). One generic source-relative fix was required and landed:
  `overlayTerminalKernelParty` (`factoryRoundBattleOrchestrator.ts`) now
  overlays only the four battle-mutable fields (HP/status1/item/PP) onto the
  rental identity instead of spreading the whole terminal party — the WIN
  scaffold's placeholder terminal party (DUSCLOPS, personality `0xff`, IV 3)
  was corrupting the kernel party so `healFactoryKernelParty`'s identity
  guard threw on the NO advance. Red-verified Tier-1 pin
  (`tests/factoryRoundBattleOrchestrator.test.ts`); the existing
  `movePostwinSwapCursor`/`acceptPostwinSwapDecline`/`postwinRightThisWay*`
  machinery reproduced every boundary with zero calibration. Evidence:
  `docs/post-terminal-beyond-boundary-win-go-on-swap-offer-no-decision-evidence.md`.
  Remaining WIN work is the YES branch into the swap UI plus the unexercised
  RECORD/REST/RETIRE continuation choices.
- **2026-08-05 WIN guide dismissal, walk, warp, and Battle Room handoff are
  exact through the first next-opponent content pixel:**
  `win-go-on-swap-offer-no-guide-dismiss-off` is **232/232** exact across
  frames 10406-10637. The 39-segment fixture preserves the prior 37 segments
  byte-for-byte, dismisses the held guide once, and binds the full generic
  `messageClosing -> walking -> warpFade -> battleRoom` seam. The first
  divergence at 10638 is content, not timing: the ROM's next trainer is
  LILIANA (id 9, RAM-probed) while the synthetic terminal stage generates
  ABBIE (id 73) from its modeled terminal RNG seed. The generic round owner
  is already at battleIndex 1; aligning the synthetic stage's opponent/RNG
  provenance, without fixture branching, is the remaining far-side task.
  Evidence: `docs/post-terminal-beyond-boundary-win-go-on-guide-dismiss-evidence.md`.
- **2026-08-05 source-order ownership fixed generically (`7708808c`):**
  accepting GO ON now calls `preGenerateFactoryRoundNextOpponent` while the
  defeated opponent remains current, before type/style commentary and the
  swap offer, matching `AskSwapMon`'s `factory_generateopponentmons` order.
  The pending generation owns its RNG receipt immediately and is published
  after either swap result without rerolling; accept still draws its offered
  party from the defeated opponent. Tier-1 pins cover timing, idempotence,
  accept/decline publication, and live routing. This removes the controller-
  sequencing ambiguity but does not synthesize the ROM's ambient VBlank draws,
  so LILIANA-vs-ABBIE at frame 10638 remains #55 rather than a #73 timing fix.
- **2026-08-05 WIN swap-YES bound into the swap screen (`5489a9f7`):**
  `win-go-on-swap-offer-yes-off` is **248/248** exact twice fresh (frames
  9930-10177; supervisor re-ran twice post-salvage): YES accept at
  10005-10006, YES/NO dismissal, box teardown, swap-screen fade/init, and
  the settled input-ready player picker at elapsed 99 (frame 10105). Two
  generic red-verified src fixes: `FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED`
  59→63 (`softwareFadeFinishing` holds `gPaletteFade.active` 5 ticks past
  the visual settle) and swap-picker category text derived from
  `draft-pool-header.json` (all 376 species; was a six-species hand-cast).
  Honest boundary: the ball-rocking restart after the first anim-end is
  per-ball `Random()%5` ambient RNG (#55-adjacent), so the window stops one
  frame short of it. **User decisions 2026-08-05 narrow the remainder:**
  RECORD is stub-only (dialogue-exact, in-session flag for the 4→3-choice
  menu variant, no real recording/playback ever), REST is deliberately
  unselectable (real game saves + soft-resets to title —
  `EventScript_PauseChallenge`; no save system in scope; comparison
  fixtures must never press it), RETIRE is implemented fully (its YES jumps
  to `WarpToLobbyLost`, the same script as the loss ending, already exact).
  The walkable lobby (free movement, inert exit door, no PC — the real map
  has none — silent NPCs including the doubles attendant, wandering
  optional) is a user-directed feature sequenced behind the play-test fixes
  #76-#81.

## #55 — Rental-construction RNG stream contract cannot represent ambient VBlank interleaving

**Wiring landed (2026-08-05, `67211ca2`):** the win-terminal scaffold
(`tools/compare/appTrace.ts` `winTerminalWindowStage`) now carries the ROM's
probed battle-2 schedule per receipt §7 — `playerTrainerId 0x18CC699A`, real
six saved rental set ids, the synthetic terminal battle rngSeed transplanted
to the probed pre-call cursor `0x7399E3AE`, and a new
`FactoryRoundBattleOrchestratorConfig.adoptedNextOpponent` that
`preGenerateFactoryRoundNextOpponent` reads at the GO ON seam, adopting the
per-mon construction cursors so LILIANA (trainer 9) and her exact
personalities (`0x801D2ED7/0x0FFC69A4/0x1AE16FDA`) reproduce byte-for-byte.
Tier-1-pinned; all five committed win/loss terminal traces remain
byte-identical (3590/3590, 248/248, 213/213, 232/232, 1943/1943).
**Remainder (still-open stream-model boundary):** live generation with a
single `constructionRngValue` still cannot express interleaved ambient ticks;
the scaffold sidesteps it via adoption, it does not fix the contract. The
former LILIANA presentation remainder is closed: the generic next-trainer room
route is exact across the broad **903/903** window and a dedicated **115/115**
walk-in/quote receipt (PROGRESS 1015).

**Symptom:** `generateInitialFactoryRentals`'s `constructionRngValue`
contract consumes construction draws back-to-back from one cursor, but on
real hardware `CreateFrontierFactorySelectableMons` spans **53 video frames**
for the anchor draft, and `VBlankIntr`'s ambient `Random()` tick
(`main.c:366`) interleaves into the same `gRngValue` stream mid-loop. Direct
two-cursor replay of the probed anchor cursors reproduces slots 0/2 but
diverges on personalities for slots 1/3/4/5 (first: MAGBY expected
`1534575931`, got `431990256`).

**Confirmed** (2026-07-30, `docs/anchor-draft-cursor-receipt.md` §§3-6):
probe ledger attributes 242 construction draws + 53 ambient ticks in the
6696–6748 window with a gapless LCG chain; **filtering to construction-only
calls reproduces all six anchor personalities byte-for-byte**, so the ported
nature-rejection algorithm is correct — only the stream model is wrong.
Blast radius: setId, species, nature, EVs, moves, item, fixed IVs are
setId/challenge-derived and unaffected; ability slot unaffected for this
anchor (the four wrong slots are single-ability species); personality-derived
gender and shininess are the real exposure. The production anchor route loads
`anchor-state.json` directly and never calls this function today, so nothing
user-visible is wrong now; the boundary bites any future live-generation or
personality-exact receipt (e.g. Gate-6 seeded end-to-end rounds).

**Three-case construction-clock receipt (2026-08-08, `1ee8518f`,
supervisor rerun 11/11):** `docs/issue55-construction-rng-schedule-receipt.md`
records gapless instruction-attributed chains for the six-rental anchor and
two materially different three-mon `FillFactoryFrontierTrainerParty` calls.
Inside the exact function-entry/return epochs the counts are anchor
**242 construction + 52 ambient / 53 frames**, LILIANA **112 + 31 / 32**,
and legal varied trainer 222 **202 + 30 / 31**; the two three-mon rejection
vectors are `[13,7,36]` and `[59,12,30]`, with different inter-burst gaps.
The first anchor-window ambient draw cited above occurs immediately before the
selected function-entry cursor, explaining 53 versus the epoch's 52.
Fixed-frame, fixed-mon-boundary, and draw-count-only insertion schedules are
therefore refuted. The smallest source-general exact contract is an explicit
deterministic construction clock: initial VBlank phase, source-operation cycle
budget (including species/stat work), and an ambient callback at each crossed
period. Until that clock exists, personality-exact live construction remains
honestly out of model; do not promote this test-only receipt or per-fixture
cursors into production.

**New exposure (2026-08-05, #73):** after the WIN swap-decline route, room
movement/warp timing remains pixel-exact, but the synthetic terminal stage
generates battle 2's ABBIE (id 73) while the ROM has already generated LILIANA
(id 9) from the ambiently advanced `gRngValue`. This is the same unresolved
stream/provenance class at a round boundary; it is not evidence for a
trainer-specific presentation branch.

**Ownership correction (2026-08-05, `7708808c`):** the generic round now
pre-generates battleIndex+1 at the accepted GO ON/scouting boundary and
publishes it after swap resolution, matching source `AskSwapMon`. This makes
the modeled RNG spend occur at the right logical seam, but the synthetic
terminal stage's input cursor still omits prior ambient VBlank interleaving;
therefore it still selects ABBIE rather than the ROM's LILIANA.

**Receipt (2026-08-05, `docs/win-battle2-opponent-provenance-receipt.md`,
supervisor re-ran the driver: ALL CHECKS PASSED):** selection is
**single-frame** (frame 6636): pre-call cursor `0x7399E3AE` → 4 gapless
draws (trainer 25209%100 = 9 LILIANA; sets 169/170/130), zero ambient
interleaving inside the span; the app generator reproduces trainer, sets,
species, items, and the end cursor `0x50F04E72` byte-for-byte. Party
*construction* spans 32 frames with interleaved ambient ticks (anchor-draft
class); the per-mon cursors `[0x2F959DF4, 0xBD6F8138, 0xDE320F3A]`
reproduce all three personalities exactly via `adoptFactoryOpponentSchedule`.
Receipt §7 names the scaffold wiring fields (`winTerminalWindowStage`
`rngValue`/`playerTrainerId`/`savedRentalRecords` + the per-mon schedule);
the wiring step is queued.

**Lead:** implement the deterministic construction-clock contract above only
as a deliberate source/cycle-model slice. Per-mon cursors and per-frame fixture
schedules are now evidence-refuted as production designs. Until then, keep the
clean-stream contract and document personality-exactness as out of model when
construction spans more than one frame. Supervisor decision 2026-07-30 (entry 758):
Gate-5 clause (a) is receipt-linked at the rules level (selection byte-exact
from the probed cursor; construction proven via filtered ledger); this entry
tracks the remaining stream-model boundary, not a Gate-5 blocker.

## #39 — `battleScene.ts` is a state machine over one canonical battle

**Symptom:** most production battle presentation is still keyed to *which turn
of the recorded Battle 1/2 we are in*, not to what happened. Individual exact
windows now consume kernel semantic events, but the surrounding dispatcher and
most content remain turn-keyed.

**Canonical-split program STOPPED at its natural boundary (2026-08-08,
supervisor).** Five slice batches moved ~240 canonical-only symbols out of
`battleScene.ts` into `battleSceneCanonical.ts`, every one verified as a pure move
by `npm run compare:differential` at **1369/1369 byte-identical**. Batch 5 then
found **no eligible tranche left**: all **199** remaining canonical symbols depend
on a battleScene-local SHARED/LIVE symbol (`TURN5_SWITCHIN`, `PIDGEOTTO_MAX_HP`,
`TURN8_MENU_REDRAW_DELAY`, `drawSpriteSheet`, `battleWindow`,
`drawMessageTextLines`, `TICK0`, `TURN13_RESOLUTION`, …), so moving them would pull
a runtime value import from `battleScene.ts` back into the canonical file. Slice 1
already proved empirically that such an import forms an ESM cycle whose module-eval
read throws TDZ.

Going further needs one of two **deliberate structural decisions**, neither of which
a slice worker may take: (a) allow canonical→`battleScene.ts` value imports via
re-export (`docs/battlescene-canonical-split-design.md` §7 hazard 1's recommended
option) and evaluate the TDZ risk per symbol — eval-time reads are unsafe, function-
body reads are not; or (b) widen `tests/animation/animationBoundaryRatchet.test.ts`'s
`allowedConsumers`, which is a cross-program decision. Four named obstacles also
remain: the `MenuIdleFrameAsset`/`SendOutHealthboxContentAsset` type-only export
widening, `drawTurn16PostSwitchField`'s `src/animation` import, the ONIX-Sitrus
cluster plus its module-eval guard, and the two `let` caches.

**Also worth knowing:** the selection scan's `FORBIDDEN` set was **dead code** until
2026-08-08 (`70caf397`) — pass 1 marked forbidden roots clean, so pass 2 treated
them as satisfied deps and falsely certified every ONIX-cluster consumer as
SELF-CONTAINED. Fixed. Two earlier batches had already caught false positives by
hand, which is why no bad move landed. **A `CLEAN` label from that scan is not proof
of movability** — check each candidate's actual declaration form.

**Honest scope, restated:** this was a move within one module graph. The canonical
code still ships, and the canonical bucket is only ~5.3k lines, so the split is a
modest reduction — not the retirement of turn-keyed presentation that this issue is
actually about. That retirement remains the presentation-seam program's job.

**Confirmed** (2026-07-24, `856b3b4`): 17,056 lines — **30% of all
`src/engine`**. 74 `BattleSceneState` declaration lines name a specific turn
(`turn13KoDismissElapsed`, `turn13Resolved`, `turn15PartySelect`,
`turn17MenuRedrawElapsed`, `turn17KoDismissElapsed`,
`turn17OutcomeDismissElapsed`, `turn17LossDismissElapsed`); 969 lines reference
a turn number; per-species render entry points are hardcoded
(`onixSitrusRotateMatrix`, `turn5GrantingStarPlacement`). Sibling files
`battle2Turn1.ts`, `battle2ActionMenu.ts`, `battle2OffScenario.ts`,
`turn17.ts` share the shape.

**Retirement progress:** the inventory's **rank-1 window is retired**
(2026-07-31, `289fe2c7`): the Battle-2 command turn now sources
request/field/HP facts from the real kernel via `battle2CommandAdapter.ts`
with RAM-probed personalities and bench; `battle2Turn1.ts`,
`battle2ActionMenu.ts`, and `battle2OffScenario.ts` are deleted, all dense
pins held (191/191, 209/209, 16/16, plus generated-route 128/128 and
715/715). Rank 2 is **fully retired** (2026-07-31): the
DRAGON_BREATH/faint half (`bd1d6beb`) and the Murkrow switch-in half
(round 11 — `stagePlayerHitChainToTerminalMachineState` exposure, the
real `openpartyscreen`/`switchindataupdate` opcodes materializing MURKROW
from DESTIN's probed bench via the 0-draw proven replacement decision,
and the MURKROW level/healthbox/sent-out literals now adapter-derived)
onto `turn13ResolutionAdapter.ts`. Pins held: 141/141 + 242/242 +
dense-b 223/223 (dense-a 205/256 is the A/B-proved pre-existing parked
#23 exclusion). Rank 3 is **fully retired** (2026-07-31): KO/switch-in half
`5db34996` (preview promoted to `turn5ResolutionAdapter.ts`, faint-sink
geometry from the generic formula at Grovyle's yOffset, PIDGEOTTO
level/healthbox/sent-out adapter-derived), Sitrus heal half `54278249`
(heal HP endpoints + STRINGID_PKMNSITEMRESTOREDHEALTH lines
adapter-derived, timing curves kept, `TURN5_PRESENTATION_TIMING_NOT_
STAGED` deleted), and the adapter swapped onto the #57-fixed shared
staging helper (`14c4295b`, ~120-line local workaround deleted). All
nine turn5 pins + five insurance pins held at every step. The dead
`turn5KoDismissElapsed` mirror is retired (`88fd05f6`): its sole reader was
its own one-shot guard, while render/continuation already consumed the staged
lifecycle. The typed completed-turn-5/next-command handoff retired
`turn5Resolved` (`73cb7455` + `891a44d7` + `97de11a4`): it owns canonical PP
**[6,20,19,10]**, persisted slot 0, and settled/ready facts for turn-6
dispatch, PP reconstruction, and the turn-7 reopen guard. The existing adapter
continues to own switch/Sitrus content.
The matching typed completed-turn-6/next-command handoff retired
`turn6Resolved` (`80b2767a` + `c6f3cdd4`): it publishes canonical PP
**[5,20,19,10]**, persisted slot 0, and settled/ready facts directly rather
than treating either FEATHER_DANCE/ROCK_SLIDE stage as combined completion.
It now owns turn-7 dispatch, PP reconstruction, and the turn-8 reopen guard.
Clean-`80b2767a` app replays held all required primary, boundary, reader, and
upstream windows byte-identical (**1,461/1,461 raw RGBA captures**).
The matching typed completed-turn-7/next-command handoff retired
`turn7Resolved` (`74f4a0d5` + `8a73efc3`): it publishes canonical PP
**[4,20,19,10]**, persisted slot 0, and settled/ready facts directly rather
than composing either FEATHER_DANCE/ROCK_SLIDE stage. It now owns turn-8
dispatch, PP reconstruction, and the turn-9 reopen guard. Clean-`74f4a0d5`
app replays held every required primary, boundary, reader, and upstream window
byte-identical (**1,413/1,413 raw RGBA captures**).
The matching typed completed-turn-8/next-command handoff retired
`turn8Resolved` (`8f83bb4e` + `56d48b80`): it publishes canonical PP
**[4,19,19,10]**, persisted slot 1, and settled/ready facts directly rather
than composing either FEATHER_DANCE/BIND stage. It now owns turn-9 dispatch,
PP reconstruction, and the following reopen guard. Clean-`8f83bb4e` app
replays held every required primary, boundary, reader, and upstream window
byte-identical (**1,385/1,385 raw RGBA captures**).
The matching typed completed-turn-9/next-command handoff retired
`turn9Resolved` (`8e0fbc80` + `6f9ef899`): it publishes canonical PP
**[3,19,19,10]**, persisted slot 0, and settled/ready facts directly rather
than gating on a turn-9 move staging module. It now owns turn-10 dispatch,
slot-0 PP reconstruction, and the following reopen guard. Clean-parent
`00f79944` (`8e0fbc80^`) app replays held every required primary, reader, and
upstream window byte-identical (**1,483/1,483 raw RGBA captures**).
The matching typed completed-turn-10/next-command handoff retired
`turn10Resolved` (`f8e6bcc7` + `f702a404`): it publishes canonical PP
**[2,19,19,10]**, persisted slot 0, and settled/ready facts directly rather
than gating on a turn-10 move staging module. It now owns turn-11 dispatch,
slot-0 PP reconstruction, and the following reopen guard. Clean-parent
`1056b153` (`f8e6bcc7^`) app replays held every required primary, reader, and
upstream window byte-identical (**1,842/1,842 raw RGBA captures**).
The matching typed completed-turn-11/next-command handoff retired
`turn11Resolved` (`c96ce5b3` + `0499bc30`): it publishes canonical PP
**[1,19,19,10]**, persisted slot 0, and settled/ready facts directly rather
than gating on `turn11FeatherDancePresentationStaging.ts`, which continues to
own only opponent move content. It now owns turn-12 dispatch, slot-0 PP
reconstruction, and the following reopen guard. Clean-parent `5b46d038`
(`c96ce5b3^`) app replays held every required primary, reader, and upstream
window byte-identical (**1,033/1,033 raw RGBA captures**).
The matching typed completed-turn-12/next-command handoff retired
`turn12Resolved` (`ad34442f` + `271d7c03`): it publishes canonical PP
**[0,19,19,10]**, persisted slot 0, and settled/ready facts directly; the
turn-12 ROCK_SLIDE miss still consumes its tenth PP, and this owner deliberately
does not reuse the later post-DRAGON_BREATH turn-13 handoff. It now owns
turn-13 dispatch, slot-0 PP reconstruction, and the following reopen guard.
Clean-parent `fbd575a9` (`ad34442f^`) app replays held all requested turn-12,
OFF turn-13 reopen/reader, and legacy turn-13 insurance windows byte-identical
(**1,141/1,141 raw RGBA captures**). Turns 9–12 are now all retired; #39
remains open for turns 1–4 and dispatcher debt.
The matching typed completed-turn-1/next-command handoff retired
`turn1Resolved` (`b34e6279` + `13389b9c`): it publishes canonical PP
**[9,20,20,10]**, persisted slot 0, HP **117/101**, settled/ready facts, and
the runtime-relative `HandleInputChooseAction` → `DoBounceEffect` epoch
(elapsed **1308**). It now owns turn-2 dispatch, opponent-HP selection,
slot-0 PP reconstruction, and the following submenu/kickoff bounce clock;
the 2901 reopen activates a new command lifecycle without replacing the
epoch. Clean-parent `76af5060` (`b34e6279^`) app replays held all four
turn-1 primary OFF windows and the two turn-2 reader windows byte-identical
(**1,162/1,162 raw RGBA captures**). Turns 1 and 5–13 are now retired.
The matching typed completed-turn-2/next-command handoff retired
`turn2Resolved` (`c16386d6` + `7a3fca06`): it publishes canonical PP
**[9,20,19,10]**, persisted slot 2, HP **101/88**, settled/ready facts, and
the runtime-relative `HandleInputChooseAction` → `DoBounceEffect` epoch
(elapsed **2197**, source seeds **192/128**, delta **7**, amplitude **1**).
It now owns turn-3 dispatch, opponent/player-HP selection, slot-2 PP
reconstruction, ENDEAVOR-family routing, and the following submenu/kickoff
bounce clock; later turn-3 menu reopens consume the same immutable epoch.
Clean-parent `ace2b44c` (`c16386d6^`) app replays held turn-2 primary,
turn-3 reader, and upstream insurance windows byte-identical
(**990/990 raw RGBA captures**).
The matching typed completed-turn-3/next-command handoff retired
`turn3Resolved` (`3487117c` + `0e7fd346`): it publishes canonical PP
**[8,20,19,10]**, persisted slot 0, HP **88/41**, settled/ready facts, and
the runtime-relative `HandleInputChooseAction` → `DoBounceEffect` epoch
(elapsed **3172**, source seeds **192/128**, delta **7**, amplitude **1**).
It now owns turn-4 dispatch, shared HP/content, slot-0 PP reconstruction,
the DOUBLE_TEAM/ROCK_SLIDE routing, and the turn-4 submenu/kickoff bounce
clock; the turn-4 B-close/A-reopen consumes the same immutable epoch.
Clean-parent `354ebc89` (`3487117c^`) app replays held the turn-3 primary,
turn-4 reader, and upstream turn-2 window byte-identical
(**1,165/1,165 raw RGBA captures**). The matching typed completed-turn-4/
next-command handoff retired `turn4Resolved` (`75d9c1d3` + `350d5aa0`): it
publishes canonical PP **[7,20,19,10]**, persisted slot 0, HP **88/1**,
settled/ready facts, and the runtime-relative `HandleInputChooseAction` →
`DoBounceEffect` epoch (elapsed **4312**, source seeds **192/128**, delta
**7**, amplitude **1**). It now owns turn-5 dispatch, shared HP/content,
ENDEAVOR routing, slot-0 PP reconstruction, and the turn-5 clock while
preserving the current legacy presentation continuation from that immutable
epoch. Clean-parent `b7cdbe46` (`75d9c1d3^`) app replays held the turn-4
primary, all turn-5/6 readers, and upstream turn-3 window byte-identical
(**1,841/1,841 raw RGBA captures**). Turns 1–4 and 5–13 are now retired; #39
remains open only for dispatcher debt. Dispatcher ladder status (2026-08-02): design dossier `docs/next-command-handoff-dispatcher-design.md` slices 1-7 are landed (generic guard chain drives turns 5-13; turn-1 and turn-2 epoch folds done; handoff state fields 13→2, only turn3/turn4 remain); slices 8-10 (turn-3/turn-4 folds, final 13-parameter/type cut) are the remaining #39 dispatcher work, then the species/episode render entry points inventoried in `docs/battle-scene-retirement-inventory.md`.
**Species render-entry-point program CLOSED (2026-08-03):** all 7 slices of
`docs/species-render-entry-point-retirement-design.md` landed — capstone
slice 4 (`90e5a2b2`) threads `SceneOffTurnView` species/asset identity as
data (differential 144/144 byte-identical, base `46190382`). Remaining #39
debt: the dispatcher-ladder remainder above. **The turnN-typeref retirement
program is CLOSED (2026-08-04, supervisor-verified):** all 8 slices of
`docs/battlescene-turnN-typeref-retirement-design.md` §4.1 are landed —
slice 1 `7ca03a17` (152→80), slice 2 chrome retirement + slice 3 idle-content
shim (80→68, pin test `a76bb338` extended), slice 4 closed-at-1/8 after the
re-scope recorded under §4.1's dependency chain (68→67), slice 5 `504070d2`
(67→62), slice 6 `723d8fa5` (62→47), slice 7a `f67b69e2` (47→41, Family R
34/34 done), slice 7b `88ddf84e` (41→**0**, Family P + Q idle trio + entry
point + all 7 bounce-tick helpers, −272 net lines). Slice 8's audit ran
supervisor-side 2026-08-04: census 0/0 in battleScene.ts/battleMenu.ts; every
remaining `Turn[N]CompletedResolutionNextCommandHandoff` mention lives in the
`turnNResolutionAdapter.ts` files (their own exported types, explicitly
in-scope-for-them per §4.1 row 8) and live tests pinning those adapters — no
dead fixtures to delete. Differential evidence across the program: every
slice byte-identical on its full window list (slice 7b alone: 8,199/8,199
captures across the §2.5 turn-1-13 list + insurance).
Rank 4 is **fully retired** (2026-07-31,
all 5 slices): `174cc388` ROCK_SLIDE tails; `441ddf83`+`6aba6662`
turn-7/8 FEATHER_DANCE staged+flipped; `0769ccc6` stat-fall banner
reads each turn's own staged stat; `40c969e5`+`ef971686` BIND
kickoff/miss onto staged facts (on-hit trap-start staged as kernel-only
receipt — the canonical line always misses; `{message,missMessage}`
bridge + additive entryLabel param landed). Rank 9 is **fully
retired** (2026-07-31, `3f850e37`): postwin fade + WIN-flip census
moved onto `terminalResolution`, four legacy Turn-17 clock mirrors +
dead `turn17.ts` deleted (`turn17MenuRedrawElapsed`'s live redraw
anchor was rehomed as `FightSubmenuState.menuRedrawElapsed`, then retired by
rank 8 in favor of the following-resolution owner's relative redraw edge). Rank-5
policy ADOPTED (user decision 2026-07-31; evidence
`docs/rank5-effect-visibility-scout.md`, plan in inventory row 5):
delete class-(c) move bodies on the OFF route, re-time class-(b)
choreography against fresh explicit-`oracleProfile` OFF pins, retiring
the legacy ON-profile turn9-12 pins as rank 5 executes. **Executed
2026-07-31 evening — all four move windows flipped** (`8802fcb6` turn
9, `329f8320` turn 10, `59a3fa7d` turns 11-12): OFF pins
231+256+206+255+131+83+256+256 all EXACT; residuals 177/233 (turn-9
pre-move), 189/191, 246/247 all attributed to ONE mechanism —
idle-bounce PHASE misalignment, fully root-caused in
`docs/idle-bounce-phase-attribution.md` (app seeds turn-9's bounce
reset 141 ticks late because upstream `TURN8_MENU_REDRAW_DELAY` is
still ON-fit 572 vs real OFF ≈434; verdict (b): closes as turns 1-8
get their own OFF re-timing under ranks 6-8, predicted constant
banked, not a rank-5 blocker). Eleven legacy ON turn9-12 pins retired
(turn9-menu.json 111/111 + turn12-menu.json 46/46 remain until the
phase family closes and their OFF pins can be banked — S9's landmark
data for them is in `docs/rank5-off-ground-truth.md`). **Rank-6 policy
ADOPTED (user decision 2026-07-31 evening, recorded in PROGRESS 799
addendum):** same shape for turns 1-4 — acceptance moves to the 10
banked OFF pins (`docs/rank6-off-ground-truth.md`), legacy ON turns
1-4 pins retire as rank 6 executes; turns 5-8 pins deliberately NOT
covered by this decision. **Slice 1 (turn 1) executed 2026-07-31
evening:** DOUBLE_TEAM's clone-blend and ROCK_SLIDE's rock-prop/camera-
shake/target-shake (class c, `Cmd_playanimation`'s `HITMARKER_NO_
ANIMATIONS` branch) deleted from turn 1's own window; the generic
stat-change banner and the generic hit-flash pair (class b) re-timed
against a fresh RAM probe (`tools/probe/dump-turn1-rockslide-off.py`).
OFF pins all EXACT: 81/81 + 230/230 + 256/256 + 102/102; four legacy ON
turn-1 pins retired (`git rm`). Turn-2 boundary insurance traces
(`turn2-endeavor.json`/`turn2-dragonbreath.json`) were found ALREADY
red on master pre-change (a pre-existing, unrelated generated-route
crash — confirmed byte-identical via `git stash`, not a regression
from this slice). **Slice 2 (turn 2) executed 2026-07-31 night (`4c793748`,
third attempt after two reverted investigations):** ENDEAVOR's attacker
squish/blend/droplets/hitsplat/target-shake and DRAGON_BREATH's own
target-shake/red-fade-blend/fire-projectile stream (all class c) deleted
from turn 2's own window; the cross-turn bounce bug (`turn2SubmenuBounceTick`/
`turn2KickoffBounceTick` hardcoding ON's `ROCK_SLIDE_MENU_REDRAW_DELAY`=664
instead of slice 1's OFF 429) fixed via a defaulted `redrawDelay` param
threaded through both functions plus their six turn-2-only call sites; every
surviving class-(b) ENDEAVOR/DRAGON_BREATH OFF timing constant pinned exactly
against a fresh RAM probe (`tools/probe/dump-turn2-dragonbreath-off.py`,
pressTick=2945): ENDEAVOR HP-drain start 116, healthbox-wobble anchor 81,
ENDEAVOR-to-DRAGON_BREATH text handoff 155/155 (a same-frame swap, NOT a
blank tick — the two prior attempts' own "156"/"single blank tick" claim was
an off-by-one in their own pixel scout, corrected here via direct oracle
comparison), DRAGON_BREATH hit-flash anchor 219, HP-drain start 254,
text-clear 285, menu-redraw 292. The blocker that stalled both prior
attempts (a ~1767px corruption on `wobbleY2`=-1 frames) root-caused as TWO
separate bugs, not one: (1) Onix's own hit-flash **flicker**
(`endeavorOnixInvisible`, class b, paired with the wobble via the identical
hit-flash anchor +1 — RAM-confirmed both signals first flip on RAM tick
3026/3027, the exact 118/119 relationship the ON fit already shows) was
missing entirely — the prior attempts' own analysis never considered it,
and the corruption was never actually about the wobble's sign, just
coincidentally correlated with it (both start the same RAM tick); fixed via
`eraseSpriteFootprint` (an existing shared primitive) whenever the flicker
is active. (2) `drawMenuHealthboxPlayer(fb, 0, dy)`'s translated-content
blit never erases the nominal (dy=0) position first — safe at every
existing call site (always composited over a fresh plain background) but
wrong here, the first caller compositing on top of `menuIdleBase`'s flat
harvest (which bakes the healthbox in at dy=0 already) — a real negative-dy
blit bug (the 103px even-parity residual both prior attempts flagged but
didn't isolate), fixed with a new `drawMenuHealthboxPlayerWobble` primitive
using the same erase-then-redraw two-pass shape `drawOpponentHealthboxWobble`
already established for the opposite side. Both fixes are pinned by a
Tier-1 test (re-timed "S7 slice E1 tail" block, AGENTS.md's negative-dy-blit
rule). Acceptance: `turn2-endeavor-off.json` 256/256, `turn2-dragonbreath-
off.json` 237/237, both EXACT; insurance `turn5-rockslide.json`/`turn8-
bind-a.json` 256/256 each, zero regression on `drawEndeavorSquish`'s/
`drawMenuHealthboxPlayer`'s still-ON callers. `turn2-{endeavor,endeavor-
drain,dragonbreath}.json` retired (`git rm`); `turn2-dragonbreath-
projectiles.json` kept (ISSUES #60 domain, untouched). **Slice 3 (turn 3)
executed 2026-07-31 night:** ENDEAVOR's attacker squish/blend/droplets/
hitsplat/target-shake and ROCK_SLIDE's camera-shake/target-shake/falling-
rock props (all class c) deleted from turn 3's own window, same treatment
slices 1-2 established; the generic ENDEAVOR healthbox-wobble+Onix-flicker
pair and the generic ROCK_SLIDE hit-flash pair (class b) survive, re-timed
against a fresh combined RAM probe (`tools/probe/dump-turn2-dragonbreath-
off.py`, reused verbatim - its fields are move-agnostic) plus a dense
`bin/oracle run`/PIL pixel scout for the two text-handoff/menu-redraw
boundaries: both landed EXACTLY at `docs/rank6-off-ground-truth.md` §5's
own estimates (`TURN3_OFF_ROCKSLIDE_MENU_REDRAW_DELAY`=525 vs the ~525
estimate). §20's own asymmetric-target-shake caution was moot as predicted
(class c, deleted). A genuine cross-turn bounce bug (turn 3's own reopened-
submenu/confirm-wait bounce chain, `turn3SubmenuBounceTick`/
`turn3KickoffBounceTick`, still hardcoding turn 2's ON-fit
`DRAGONBREATH_MENU_REDRAW_DELAY`=391 instead of slice 2's OFF value 292)
fixed via the same defaulted-param idiom slice 2 established, at the three
call sites in `battleScene.ts`'s generic dispatcher; the FROZEN plateau
constant (previously a `TURN3_KICKOFF_FROZEN_BOUNCE_TICK` module constant
that only coincidentally equaled the live formula's own freeze-moment
reading under ON) needed re-deriving as a live per-call computation, and
oracle-pixel grid search found the real hardware freezes at `pressTick+9`
(matching the ON-era doc's own "byte-identical through pressTick+9"
citation), not `pressTick+FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`(+3) as the
generic formula's own naive continuation would suggest. Acceptance:
`turn3-endeavor-off.json` 254/255 (the sole residual is ISSUES #61, a
pre-existing action-menu/submenu reveal-boundary bug confirmed present -
worse, even - on unmodified master, unrelated to this window's own
ENDEAVOR/ROCK_SLIDE content), `turn3-rockslide-off.json` 161/161 EXACT;
insurance `turn5-rockslide.json`/`turn8-bind-a.json` 256/256 each, zero
regression. `turn3-{menu,endeavor,rockslide}.json` retired (`git rm`).
**Slice 4 (turn 4, FINAL) executed 2026-07-31 night:** DOUBLE_TEAM's
clone-blend (`drawDoubleTeamClones`) and ROCK_SLIDE's camera-shake/target-
shake/falling-rock props (all class c) deleted from turn 4's own window,
same treatment slices 1-3 established; the generic stat-change banner and
the generic ROCK_SLIDE hit-flash pair (class b) survive, re-timed against a
fresh combined RAM probe (`tools/probe/dump-turn4-doubleteam-off.py`,
pressTick=4925) plus a dense `bin/oracle run`/sha scout for the text-
handoff/menu-redraw boundaries. Every one of turn 4's own OFF timing
constants (stat-banner start/end/BG1-Y-anchor, stat-rose-text delay,
ROCK_SLIDE hit-flash anchor age, HP-drain start) landed EXACTLY the SAME
numeric value as turn 1's own OFF window (80/146/83/156/327/362) - a second
independent confirmation this whole DOUBLE_TEAM+ROCK_SLIDE choreography is
fixed post-kickoff overhead, not turn-specific; only the two post-drain
tail boundaries (text-clear 420, menu-redraw 427) differ from turn 1's own
(422/429), tracking this turn's own smaller HP-drain diff (40 vs 42) per
the ON-era doc's own already-established "smaller diff drains faster"
finding. `drawDoubleTeamClones` itself, along with its now-solely-used
helpers (`getDoubleTeamClonePalette`, `eraseGrovyleFootprint`), is fully
DELETED (DOUBLE_TEAM never recurs after turn 4 in this canonical battle,
so it has zero remaining callers) - a genuine class-(c) mechanism removal,
not just a call-site edit. The four shared functions slice 1 gave optional-
override params to exclusively for turn 4's own sake
(`statsBannerEva`/`statsBannerBg1Y`/`statRoseTextStartTick`/
`statRoseTextVisibleChars`) had those defaults removed (now required
params) once turn 4 also flipped, since no caller anywhere in the program
still needs the ON-fit default; their now-dead ON-fit module constants
(`STATS_BANNER_START_DELAY`/`STATS_BANNER_END_DELAY`/`STAT_ROSE_TEXT_
DELAY`) were deleted outright. The SAME cross-turn bounce-chain bug slices
2-3 each found one epoch upstream recurred one epoch further: turn 4's own
reopened-submenu/confirm-wait bounce chain
(`turn4SubmenuBounceTick`/`turn4KickoffBounceTick`) still hardcoded turn
3's ON-fit `TURN3_ROCKSLIDE_MENU_REDRAW_DELAY`(669) with no override
parameter at all - fixed via the same defaulted-param idiom, threaded
through the three generic-dispatcher call sites, now passing slice 3's own
OFF value (525) explicitly. The FROZEN plateau needed its own fresh grid
search (this session's own lesson (b): turn 4's case does NOT match slice
3's own `pressTick+9` finding, tried first and rejected - real hardware
freezes turn 4's own confirm-wait bounce at `pressTick-11`, a 9-tick-wide
plateau `[pressTick-15..pressTick-7]`, oracle-pixel grid-search-confirmed).
Acceptance: `turn4-doubleteam-off.json` **256/256 EXACT**, `turn4-rockslide-
off.json` **256/256 EXACT** (both fully exact, no residual); insurance
`turn5-rockslide.json`/`turn8-bind-a.json` 256/256 each, zero regression;
turns 1-3's own OFF traces re-verified zero regression too (turn3's own
ISSUES #61 residual unchanged, confirmed pre-existing not touched by this
slice). `turn4-{menu,doubleteam,rockslide}.json` retired (`git rm`).
Re-pinned `tests/fightSubmenu.test.ts`'s two turn-4-reopen tests at the
fresh OFF trace (`turn4-doubleteam-off.json` replacing the retired
`turn4-menu.json`, byte-identical segments) and `tests/battleScene.test.ts`'s
own turn-4 describe block (the turn-4-only clone-z-order pin tested content
that no longer renders under OFF - removed rather than re-pinned, since
there is nothing left to pin; the stat-rose-text-phase pin re-timed at the
fresh OFF boundary).

**Rank 6 is FULLY EXECUTED** (2026-07-31, all four slices): turn 1
`01eac159`, turn 2 `4c793748`, turn 3 `2e567316`, turn 4 this landing
commit. Every one of the ten `docs/rank6-off-ground-truth.md`-banked OFF
traces across all four turns now renders EXACT or with only the one
pre-existing, unrelated #61 residual (turn 3); every insurance trace held
zero regression at every slice. The idle-bounce phase family's turn-1-4
share (`docs/idle-bounce-phase-attribution.md` verdict (b), predicted
2026-07-31 evening) is now CLOSED: all four turns' own
`TURNn_..._MENU_REDRAW_DELAY`-shaped overcounts are re-timed against fresh
OFF ground truth, matching that doc's own predicted ~22-35% reduction
shape at every rung (turn 1: 429/664≈65% of ON, turn 2: 292/391≈75%, turn
3: 525/669≈78%, turn 4: 427/661≈65%). The remaining phase-family share is
turns 5-8 (their own future rank/policy, not started here).

Earlier
progress:
`turn13-sandattack.json`'s complete captured
SAND_ATTACK content now resolves its kickoff and opponent-target accuracy-fall
text from the staged real kernel event stream through the generic stat-down
bridge (`e50bf210`, **190/190**); all four raw turn-13 text literals were
deleted. Its later DRAGON_BREATH half is a separate, still-unwired window.
Resolution Slice 6 (`985ec1fa`, `ae94cc4c`) also retires the Turn-17
KO/result/trainer-loss render dispatch: the exact adapter consumes an immutable
typed terminal boundary, frozen result/loss strings, and presentation-relative
dismiss clocks without inspecting a turn flag (**255/255, 147/147, 255/255,
118/118**). The old post-win fields are still mirrored for the downstream
canonical post-win owner, so this entry remains open.

**Worklist:** `docs/battle-scene-retirement-inventory.md` (folded 2026-07-30)
carries the reproducible census, the remaining owner chain with line ranges,
and the per-slice ordering. Cite it — and re-run its commands to record both
the ref count and LOC — when opening the next retirement slice.

**Not a request to rewrite it.** The windows it renders are individually
oracle-exact and that evidence is worth keeping. The debt is the *keying*.
ROADMAP S10 §3 requires one already-exact window to be re-driven from semantic
events as a proof of the seam; that conversion, window by window, is the
retirement path. AGENTS.md already forbids adding new turn-keyed branches.

**Rank-7 locked-action grouping landed (2026-08-01, `b464a6e7`,
`72546da6`):** Factory fresh start now owns the source option boundary:
`battleScene: "off"` initializes `HITMARKER_NO_ANIMATIONS` exactly once while
standalone callers choose explicitly. The generated round route selects OFF.
Full-turn message receipts freeze Cmd_printstring's attacker/current move/move
position, so `STRINGID_USEDMOVE` never needs to discover a same-action PP
receipt; snapshot-less staged fixtures retain their old compatibility bridge.
The driver stops at a real follow-up trainer command and appends that untouched
AI/reducer receipt as a second immutable resolution segment. Fixed generated
Taillow FLY proves charge text, hide through the opponent action, locked no-PP
FLY text, restoration, and request 4; fresh seam coverage also pins
Assist-called FLY and opponent ownership. Thus rank 7's typed two-turn group
is closed. The later owner handoff below also retires its exact renderer
mirrors.

**Rank-7 opponent-owner bridge landed (2026-08-01, `30b61236`, `fea91d54`):** a new
source-driven adapter stages the exact Onix/Murkrow boundary under Scene OFF
through the production full-turn reducer. It publishes the charge/hide/
airborne-miss receipt, then preserves the real intervening player request and
publishes the locked strike/restoration/4→0/faint/forced-request receipt. The
legacy exact renderer now consumes the charge, strike, and faint lines from
those typed commands, and core constructs its forced selector from genuine
request **4** (legal slots **1/2**) rather than `CANONICAL_FORCED_SWITCH_REQUEST`
request 0. The live round presenter now retains that charge resolution under
the generic locked battler/current-move/PP-slot identity while the genuine
player request owns its own command UI. Submission reclaims the owner and
appends the untouched strike receipt; no second PP write occurs, visibility
restores from the immutable first segment, and a typed forced request advances
the existing generic `PartySelectState` directly. The old one-segment selector
guard is gone. Scene ON/OFF logical outcomes and the seven-battle cursor
regression are pinned. `8caad013` additionally hardens recharge and Bide
action snapshots, and merged OFF evidence `adfb746c`/`49e18075` records the
124-capture inverse lifecycle.

**Rank-7 exact owner mirrors retired (2026-08-01, `1f276c95`, `c0821a65`):**
the canonical adapter now appends the strike to the same immutable charge
resolution identity. A typed compatibility owner carries that resolution and
only its published forced selector; segment ownership selects charge versus
strike presentation, and the source receipt supplies PP. `turn14Resolved` and
`turn15PartySelect` are deleted from production and tests. Differential app
replay against clean `8caad013` preserved every ordinary and +30 delayed
historical capture byte-for-byte: charge **213**, strike **256**, selector
**200/200**, five send-out rungs **43/46/16/144/195** and their delayed twins,
**1,496 captures** total. The reproducible census falls **2,526→2,506 refs**
and **33,135→33,125 LOC**. No mechanics/RNG/AI/outcome, animation, trace or
capture list, ratchet/barrier, recording import, or prohibited selector was
added. Rank 7 is closed; #39 remains open at rank 8 and earlier mirror debt.

**Rank-7 generated-route addendum (2026-08-02):** regression bisected to `b464a6e7` and root-caused in `docs/generated-route-canary-regression.md`; `ecd00a9c` restores the missing source-owned Scene-OFF attack-pause receipt and the **128/128** canary while the canonical rank-7 differential remains byte-identical.

**Rank-8 Scene-OFF status-icon receipt landed (2026-08-01, `80c5d6af`):**
the generic resolution presenter now keeps `set-battler-status-data` as the
logical raw write and projects the existing `status-icon-update` as an
immutable one-callback `status-icon` command (`battler`, `status1`, `status2`,
and event sequence). The displayed healthbox status and the round controller's
`displayedStatus1` commit only when that receipt completes. The text resolver
gets `B_EFF_NAME_WITH_PREFIX` from the immediately pending raw status target,
not a move/species inference. A legal generated Factory route proves the
nonterminal burn order through the real command/presentation seam and next
request; the Scene-OFF event list deliberately contains no status-animation
receipt. The authoritative oracle evidence remains the already-verified
**42 captures / 42 capture-states** in
`docs/fire-punch-burn-lifecycle-off-evidence.md`, not a new pixel claim.
**Rank-8 exact owner mirrors retired (2026-08-01, `d410cfe5`):** the exact
post-switch MAGBY/MURKROW boundary now runs through the production full-turn
reducer at the documented eight-call RNG cursor. Its immutable resolution
owns FAINT ATTACK damage, FIRE PUNCH damage/PP, raw burn, burn text, the
one-callback status-icon receipt, residual damage, and genuine next command.
The compatibility owner retains that following resolution and its relative
redraw edge until the already-typed terminal owner begins. Deleted
`turn16Resolved` and `FightSubmenuState.menuRedrawElapsed`; no replacement
episode selector was added. Clean-`60acda9c` differential app replay held the
requested Turn-16/Turn-17 rungs byte-for-byte (**2,041 captures**), plus the
delayed Turn-16 rung and Turn-17 rung 6b (**2,163 total**). Census falls
**2,506→2,496 refs / 33,125→33,124 LOC**. Rank 8 is closed.

**Opponent-faint presentation owner retired (2026-08-01, `ef1aa50f`):** the
nonterminal PIDGEOTTO-faint/MURKROW-switch-in lifecycle now owns its accepted
A edge, frozen cursor, and edge-relative continuation as one immutable typed
receipt. The old loose clock and every alias/thread are gone; the four legacy
app replays remain byte-identical (**141 + 242 + 256 + 223 = 862** captures).
#39 remains open only for the next-command dispatcher debt inventoried in
`docs/battle-scene-retirement-inventory.md`. **Dispatcher migration update
(2026-08-02): slices 1–6 are complete.** The generic receipt/content bridge
and reopen guard own production turns 5–13, including the retained FLY owner;
it now also owns turn 1's immutable HandleInputChooseAction/DoBounceEffect
epoch and field content. The first early state field is cut (four handoff
fields to three).

**Dispatcher ladder CLOSED — all ten slices (supervisor-verified 2026-08-08).**
The paragraph above used to say slices 7–10 remained; that text was six days
stale. A worker briefed on "slice 7" correctly reported the step was already
landed, and the supervisor confirmed it independently:
`3a3a168a` (bridge turn-2 epoch content) + `8518520b` (fold turn-2 state) are
both ancestors of master, `tools/census-next-command-handoffs.sh` reports
**0** `BattleSceneState` handoff fields, **0** `drawFightSubmenuWindow` handoff
parameters and **0** `currentPPForActiveMon` parameters, `grep` finds **0**
`turn<N>Resolved` fields and **0** `Turn<N>CompletedResolutionNextCommandHandoff`
imports in `battleScene.ts`/`battleMenu.ts` — that is slice 10's own final-cut
acceptance, met. `docs/battle-scene-retirement-inventory.md`'s state-field
table still lists `turn1Resolved…turn4Resolved`/`turn9Resolved…turn13Resolved`
as live; those rows are stale, not open work.

**What is actually still open in #39.** The turn-keyed *dispatcher* is gone;
the per-species *render entry points* are not. `battleScene.ts` is now
**36,897 lines** (it was 17,056 at the 2026-07-24 census — it more than doubled
while the ladder ran) with **848** remaining `turn<N>` textual references, none
of them state fields. The bounded successor program is
`docs/species-render-entry-point-retirement-design.md` (45 census'd entry
points, 7 slices); its slices 3 and 4 were GATED on ladder slice 10 and are now
ungated. **Check each slice's premise before briefing it — that dossier is also
partly stale:** slice 1's `PIDGEOTTO_MAX_HP` literal is already
`TURN5_SWITCHIN.replacementHp.max` (only `murkrowHealthboxContentForHp`'s
`hp === 142` cache-miss literal remains), and slice 5's entire `turn15Onix*`
symbol cluster no longer exists. Slice 2's six healthbox factories are
confirmed still present and unparameterized.

**Two staged bare fact sources retired (2026-08-08, `5de9c142`).** Turn 5's
ENDEAVOR squish/field path now consumes `TURN4_ROCKSLIDE_HP.to`, the typed
41→1 endpoint from `resolveTurn4RockSlideHpEndpoints()`. Turn 11's ATK-floor
renderer and visible-character total now share the lines produced by
`resolveTurn11AtkFloorLines()`. The old HP scalar plus both bare string
exports, their compatibility imports/re-exports, and literal-only tests are
gone: exact old-symbol executable production refs **12→0**; the reproducible
broad #39 inventory moves **1,950→1,949** matching lines and
`battleScene.ts` **36,344→36,343 LOC**. Differential replay against the clean
parent is **2,529/2,529 byte-identical** across the affected turn-4, turn-5,
turn-11 and upstream-reader OFF windows. The remaining #39 render-entry debt
above is unchanged.

**Family-C cache-key ownership hardened (2026-08-08, `660c769f`).** The six
healthbox factories parameterized by species-render-entry-point slice 2 had
kept their older partial memoization keys, so equal HP/status/gender could
return pixels composed for a different name, level, or max HP. Their keys now
include every variable compositor input (HP, name, level, max HP, gender, and
status where exposed), and the KABUTO, ONIX, and MAGBY canonical preseeds use
those same complete keys. Six Tier-1 collision pins call each factory with two
identities/max-HP values under the same partial state in both orders and compare
every result directly to `composeOpponentHealthbox`/`composePlayerHealthbox`;
all six pins failed before the production edit and pass after it. Incomplete
Family-C cache owners move **6→0**. This hardening does not retire a turn-keyed
renderer, so the reproducible broad #39 inventory honestly stays
**1,949→1,949** matching lines while `battleScene.ts` grows
**36,343→36,361 LOC**. Clean-parent OFF differential replay is
**3,055/3,055 byte-identical** across all 16 slice-2 windows plus
`battle-command-generated-off`; no canonical Battle-2 window was run. The
remaining #39 render-entry debt above is unchanged.

**Faint-sink geometry helper renamed generically (2026-08-08).** The remaining
species-agnostic pure helper is now `faintSinkRowsAndY2` in its existing
`battleSceneCanonical.ts` owner and public `battleScene.ts` re-export. Its
signature, Grovyle defaults, formula, and explicit Pidgeotto re-anchoring are
unchanged; focused Tier-1 pins cover both distinct `startTick`/`steps`
parameterizations without identity input. Exact old-name references across
`src`/`tests`/`tools` move **22→0** (production **10→0**); no computed/string
consumer was found. This ownership-only rename leaves the reproducible broad
#39 inventory **1,949→1,949** and `battleScene.ts` **36,361→36,361 LOC**.
The remaining #39 render-entry debt above is unchanged.

**DOUBLE_TEAM clone-palette cache made identity-honest (2026-08-08,
`ba08db85`).** `getOnixDoubleTeamClonePalette` is now the species-neutral
`doubleTeamClonePalette`; its `WeakMap` memoizes by the actual source-palette
array rather than returning the first palette for every later asset. A
red-verified Tier-1 collision pin feeds two distinct synthetic palettes in both
orders and compares each result with the direct coefficient-11 blend. Exact old
helper/cache executable refs move **3+4→0**; Family-F species-named factories
move **2→1**, source-accepting singleton caches **2→1**, and incomplete
DOUBLE_TEAM cache owners **1→0**. `turn10OnixDarkPalette` and its cache are
unchanged. `battleScene.ts` moves **36,361→36,363 LOC**; clean-parent OFF
differential replay is **640/640 byte-identical** across turn-4 DOUBLE_TEAM,
adjacent ROCK_SLIDE, and generated-command insurance. The remaining #39
render-entry debt above is otherwise unchanged.

**Next Family-F owner audited read-only (2026-08-08).** The remaining
`turn10OnixDarkPalette` accepts a source sprite but memoizes one module-global
palette, so it has the same latent cross-identity collision. It is not currently
reachable from `renderSceneOffTurnView`; both canonical OFF AERIAL_ACE callers
explicitly pass `darken=false`, while the pure coefficient-10 transform remains
live separately in the Scene-ON renderer. The next bounded cleanup should rename
only this wrapper, use a `WeakMap` keyed by the source palette array, and add the
same two-palette/both-orders red pin beside `doubleTeamClonePalette`. Use the
three turn-10 OFF traces as **592-capture canaries**, not as a claim that OFF
currently exercises the cache; never add a staged darken field or revive the
absent OFF palette pulse merely to manufacture dynamic acceptance. Leave the BG
cache, pure transform, and Scene-ON callers untouched.

**Deferred behind S10 closure (2026-08-08, user decision).** #39 is demoted to
filler until ROADMAP S10's six gates are checked — see the 2026-08-08 user
ordering decision in ROADMAP.md (barrier burn-down A3–A12, then the bucket-B
item, then the Gate-6 close-out artifacts). The audited `turn10OnixDarkPalette`
slice above remains the next #39 owner whenever a filler slot opens; nothing
here is canceled.

# Settled records (not open work — see the note at the top of this file)

## #56 — [SETTLED 2026-08-03, supervisor decision] Arbitrary-trainer intro: YOSHI 700/751 + MAGNETON 703/751, every residual frame in a settled class

**Symptom:** the public dense arbitrary-trainer intro comparison
(`factory-arbitrary-intro-yoshi-off`, YOSHI/COMBUSKEN) now stands at
**700/751** (up from 650/751; frame 536 fixed 2026-07-31 evening) with every divergent frame
characterized in `docs/trainer-pic-off-window-scout.md` §D. Remainder:

1. **RESOLVED non-universal; route term retained (2026-08-01).** The
   species formula remains proven on GRIMER/KADABRA/DELCATTY/lab-ONIX.
   Reusable Scene-OFF RAM evidence now names the complete controller tail:
   canonical ONIX is completion **1738** → both `CHOOSEACTION` bits **1741**
   → player-only **1744** (+3/+3); staged YOSHI is **1847→1850→1853**
   (+3/+3), but the committed same-player-species staged ONIX fixture is
   **1885→1888→1890** (+3/+2). Thus the dispatch/AI-resolution mechanism is
   shared, while its duration is decision-dependent—not one universal six-
   tick constant. `isCanonicalAnchorIntro`'s existing calibrated route term
   stays; no species/trainer/tick selector or speculative production change
   was added. Reproducer and interpretation:
   `docs/issue56-plus6-route-term.md` main-lane follow-up and
   `tools/probe/dump-canonical-anchor-readylag-ram.py`.
2. **Frame 536 RESOLVED** (2026-07-31, `7467636e`: call-site bug —
   pre-player-release `drawBallIcons` used the raw opponent-handoff clock;
   YOSHI 700/751, ablation-verified Tier-1 pin). **Frame 444's bar/icon
   display tail is SETTLED — same #5/#61 sub-tick class** (2026-08-01,
   supervisor decision; `docs/issue56-display-latch-event-design.md`): the
   source destroys the summary bar and every icon inside ONE foreground
   callback (`battle_interface.c:1740-1768`), so MAGNETON's observed
   two-tick bar/icon split can only be VBlank interposing mid-callback — a
   CPU/VBlank phase fact, not a source-owned tick-granular lifecycle. Raw
   elapsed, terminal task state, destroy order, and pending OAM are all
   falsified discriminators (Round 4 evidence + the design doc §2; YOSHI
   and intro-off share equivalent terminal state yet need opposite bar
   tail clocks). Do not fit a phase bit or per-widget clock unless the
   design doc's §4 falsification gate succeeds; §3 then has the bounded
   plan. **Frame 444's separate materialize-column-shift lead is RESOLVED**
   (2026-08-02, `1aa13ebb`; `docs/issue56-residual-probe.md` Q1 RAM
   follow-up): live sprite + hardware OAM/matrix exonerated the opponent
   affine path and attributed the defect to the generated Scene-OFF
   ball-open particles sampling one step early at logical tick 13. The
   arbitrary generated route now publishes the logical-13 stall directly;
   the audited canonical-anchor route retains lag 1 through its existing
   route fact. Dense 440:450 changes only frame 444, whose diff shrank
   **219px → 18px** as exactly **201** app pixels changed; the remaining 18
   are the settled display-tail class above. The idle-menu-bounce family
   stays closed as no-app-bug (2026-07-31, `432e16aa`; narrower follow-up
   lead banked in the probe doc's Q2 addendum).
3. **RESOLVED (2026-07-31, `7cfef2d7`).** `gEnemyMonElevation` extracted
   (61 species sparse, absent = 0, isolated extractor test) and the
   solved rule `origin.y = 8 + yOffset − elevation` applied at all three
   settled-opponent draw sites (release, player-release view, command
   view); the elevated shadow now persists into the command phase
   (previously intro-only — MAGNETON's shadow was missing entirely at
   the menu). **MAGNETON 424 → 703/751; shadow branch verified**; YOSHI
   699/751, 715/715, 128/128 all held. Remaining MAGNETON tail (~48
   frames) is a pre-existing species-independent periodic idle-menu
   bounce family also present inside YOSHI's accepted tail — folded into
   item 2's isolated-residual class (444/536 + idle-bounce family).

**Closure audit (2026-08-02, `d87b5e92`,
`docs/issue56-closure-audit.md`):** YOSHI holds **700/751** and all 51 red
frames sum into the two settled classes (1 display-tail + 50 idle-bounce) —
no remainder. But **MAGNETON regressed 703→702**: frame 437 (201px, bbox
163,40-196,85) is NEW, root-caused (code-cited) to `1aa13ebb` (2026-08-02)
keying the ball-open particle `stallLag` on `isCanonicalAnchorIntro`, which
gives YOSHI and MAGNETON the same `stallLag: 0` although the 2026-07-31 OAM
probe (`docs/issue56-frames-444-536-oam-probe.md` Round 2) proved MAGNETON
wants the opposite value at the analogous tick — and `1aa13ebb`'s landing
never re-ran the MAGNETON comparison.

**MAGNETON regression FIXED (2026-08-03, main lane).** `isCanonicalAnchorIntro`
can't discriminate COMBUSKEN (wants `stallLag` 0) from MAGNETON (wants 1) —
both are non-canonical generated routes. Neither evidence doc ever produced a
species/cry-duration formula for this specific mechanism (the closure audit's
own "Not fixed" section calls it "whatever real per-fixture fact actually
separates COMBUSKEN...from MAGNETON", and Round 2 Part A explicitly parked the
RAM probe needed to find one as "not attempted this round"); since
`generatedBattleStartOpponentHandoffTick` already normalizes out the only
species-dependent delay this subsystem knows about, the remaining split is an
honest per-route real-clock phase-alignment fact, the same class ISSUES #56
item 2's own design doc already named for its sibling display-tail mechanism.
`generatedParticleStallLag` (`src/engine/battleScene.ts`) now keys the
generated-route branch on the opponent's own species (a small, explicitly-
scoped, evidence-extendable set — currently just MAGNETON — mirroring the
existing `elevatedEnemyShadowSpecies`/cry-duration-map pattern already in this
file) instead of collapsing to one boolean. Re-verified fresh:
`factory-arbitrary-intro-magneton-off` **702→703/751** (frame 437 green),
`factory-arbitrary-intro-yoshi-off` **700/751 held** (frame 444 unchanged at
its settled 18px display-tail residual), `interactive-generated-intro-off`
**715/715** and `battle-command-generated-off` **128/128** both held. Tier-1
pin: `tests/issue56ParticleStall.test.ts`. Both fixtures now match their
documented, audited baselines exactly — #56 is a clean candidate for
settled-record closure; nothing else in this entry is open.

**Not blocking:** Gate 5 ticked with these named (ROADMAP S10 gate 5
completion note); this is the worklist to finish the window honestly.


## #61 — [PARKED 2026-08-01, supervisor decision] Scene-OFF turn-3 FIGHT
  reveal one-frame residual: controller/VBlank poll order is sub-tick CPU
  phase — same settled class as #5/#38

The turn-3 FIGHT opening reveals one frame later in the oracle because the
real player controller's DMA-busy poll lands before the final VBlank drain on
that opening only, while all four openings enqueue identical `9/11/6` BG-copy
batches. `docs/issue61-fight-submenu-reveal-boundary.md` (RAM/source
evidence + queue-slot follow-up) and `docs/issue61-vblank-phase-event-design.md`
(2026-08-01 design evaluation) establish that no tick-level, source-owned
state predicts the poll/drain order — it is CPU instruction/cycle phase
relative to `VBlankIntr`, the same architectural class as #5's settled
`SetGpuReg` race. Three candidate designs were evaluated; any producer fed
from turn/tick/cursor/queue-size/payload facts would be a fitted exception
(rejected). Affected acceptance: `turn3-endeavor-off.json` ships **254/255**
(sole residual, reveal frame); `turn3-rockslide-off.json` **161/161** and
every turn-1/2/4 OFF window remain exact. Do not fit a phase bit and do not
retune `FIGHT_SUBMENU_OPEN_DELAY`. Reopen only if the design doc's §4.1
instruction-ordered VBlank watch finds a stable tick-granular source-owned
phase proxy, or the engine gains a general cycle/register-queue model; §3 of
that doc then gives the bounded five-slice implementation plan.

## #38 — [PARKED 2026-07-22, supervisor decision] Turn 16 FAINT_ATTACK
  delayed-control tick 21006 exposes `BLDALPHA` one VBlank early

The canonical animation window is committed at **221/221 exact**
(`turn16-rung2a.json`, 20826-21046). A +30-frame pre-SEND-OUT delay is
**220/221**: delayed tick 21006 alone shows the next attacker-alpha
coefficient one frame early.

Direct task/RAM probes show identical active callbacks and task data at the
relative boundary (`data[1]=0x0d03`, `data[2]=0`), while the hardware register
differs: canonical `BLDALPHA=0x0e02`, delayed `0x0d03`. A fresh delay sweep
over `+0..+8,+15,+16,+30,+31,+32` reproduces the early exposure only at
`+30`; adjacent delays return to the normal cadence. This is therefore a
sub-tick `SetGpuReg`/VBlank visibility race below the engine's tick-state
abstraction, analogous in mechanism to the already-settled cycle-timing
family in #5, not a move-task reducer defect.

The delayed trace is not committed red. Do not add an absolute-tick,
delay-specific, or baked-frame patch. Reopen only if the engine gains a
general cycle/register-queue model; this extra delayed-control frame does not
block the roadmap's canonical S7 acceptance.

## #18 — [POLICY SETTLED 2026-07-19, user decision] sendout tick 1496
  (particle z-order, 3px): accepted/parked permanently; S6 ticked [x] with
  every diff frame individually attributed (3× #5, 1× this entry). The
  persistent-`sSpriteOrder` architecture build was declined as out of
  proportion. No further fix attempts unless the user re-opens it.
  Mechanism record below is kept for attribution evidence.

Parked 2026-07-19 (supervisor); trimmed 2026-07-19 (§7.31, closed tick
1493); trimmed again 2026-07-19 (§7.32, closed 1494/1495 - a one-tick
`drawOpponentSummaryExit` clock stall, same family as §7.18's particle
stall). What remains is exactly one tick:
- **1496** (3px): particle z-order gap named in §7.25 — the ONE
  non-ISSUES-#5 frame keeping `s6-acceptance.json` at 224/228. §7.31
  RAM-confirmed the pixel-exact winner (spawn index 14, not 13) and ruled
  out sprite-slot reuse scrambling (real array positions: idx6 for particle
  13, idx23 for particle 14 — NOT scrambled). §7.32 read the actual source
  this residual depends on (`reference/pokeemerald/src/sprite.c`'s
  `CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`) and found: (1) the
  particles are created via plain `CreateSprite`, not `CreateSpriteAtEnd` as
  previously assumed (`CreateSpriteAtEnd` is real in this scene but only for
  the summary bar's icons and the healthbox, `battle_interface.c`); (2) the
  real tie-break mechanism is `sSpriteOrder` — a PERSISTENT 64-slot
  permutation reset to identity only once (`ResetAllSprites`, battle start)
  and continuously insertion-sorted in place every frame thereafter, where
  an exact tie preserves whatever relative order two slots inherited from
  the *entire prior history* of every sprite (of any kind) that has ever
  occupied those two slot numbers — not a function of raw spawn/slot index
  at all. Determining the real winner for slots 6 vs. 23 at this one tick
  would require simulating that entire scene-wide history as persistent
  engine state, a materially different architecture (whole-scene OAM-order
  simulation) than this engine's current per-burst, stateless
  `sortAliveParticlesByScreenY` — out of proportion to a 3px fix and exactly
  the kind of change that risks regressing every other window sharing that
  sort. No fix shipped (a special-cased index swap would be undocumented
  curve-fitting, the same mistake §7.25 already made and reverted). Full
  derivation: `docs/battle-scene-notes.md` §7.32.
Affects: `sendout.json` 255/256, `s6-acceptance.json` 224/228 (3 frames are
ISSUES #5's settled pattern, x88-151-confirmed; 1 frame is #18's own 1496).

## #5 — [POLICY SETTLED 2026-07-17, user-delegated] mon-pic close WIN0V
  jitter: 0-diff stays the bar; re-time trace interactions into clean
  windows where feasible; otherwise ship with each non-matching frame
  individually attributed to this entry's pattern (x88-151 close-window
  confinement). No further fix attempts. rent-slot1.json: RESOLVED to the
  attribution fallback (supervisor, 2026-07-17 ~16:20) — a worktree worker
  swept 8 re-time candidates around the archived "~31" window (confirm
  press-ticks 29-35, incl. DOWN-tick variations; ~47+ stays excluded, it
  blows the species-name-breathe budget): EVERY candidate was worse than
  the committed baseline (15-27 diffs vs baseline's 14), no exploitable
  pattern — consistent with the chaotic cycle-cost root cause below.
  rent-slot1.json ships at 125/139 permanently, all 14 frames attributed
  to this entry's pattern; no further re-time attempts unless a future
  session sweeps the untried ~40-60 tick range with a breathe-budget
  workaround. Mechanism summary below is kept for attribution evidence;
  this is no longer an open work item.

## (mechanism record) mon-pic close animation: WIN0V catch-up jitter is real hardware
  cycle-timing, not a modelable game-state bug (root-caused, NOT fixable at
  this engine's tick/state granularity - see "why this can't be fixed" below)

**Symptom:** the mon-pic close animation (`monPic.ts` CLOSE_TABLE_B, driving
`monPicRender.ts`'s WIN0 window blend) renders the wrong pixels inside the
window (`x88-151`) for several ticks of *some* closes but not others -
confirmed independent of RENT/DESELECT (a bare `A` open then `B` close with
nothing else touched reproduces it too).

**Root cause, confirmed via direct RAM/IO-register inspection** (dev-time
recipe, `EmeraldOracle.core.memory.u16[...]`, scratch scripts not committed -
methodology below so this is reproducible):

1. `Task_CloseMonPic` (`reference/pokeemerald/src/battle_factory_screen.c:4250-4292`)
   is a completely clean, deterministic state machine: `data[5]`/`data[8]`
   (`tWinTop`/`tWinBottom`) step by exactly ±4 every single tick with **zero**
   periodicity or absolute-tick dependence - confirmed by dumping
   `gTasks[2]`'s raw `data[]` words tick-by-tick for both a clean close
   (press-tick 30) and a bad one (press-tick 36): the *internal* state is
   bit-for-bit identical between the two runs, just time-shifted by 6 ticks.
   `RunTasks`'s priority-linked-list shape (`gTasks[]` `prev`/`next`/`priority`
   fields, `reference/pokeemerald/src/task.c`) is also identical between the
   two runs, ruling out task-scheduling/insertion-order as a factor.
2. The *visible* WIN0V register is NOT the task's raw state - GBA's
   `SetGpuReg` (`reference/pokeemerald/src/gpu_regs.c:66-98`) always writes
   the new value into a shadow buffer (`sGpuRegBuffer`) immediately, but only
   copies it to the real hardware register **now** if `REG_VCOUNT` is
   currently inside vblank (161-225); otherwise it's queued
   (`sGpuRegWaitingList`) and only reaches hardware on the *next* vblank
   flush. This is a genuine, permanent 1-tick render lag, and
   `monPic.ts`'s existing `CLOSE_TABLE_B`/`CLOSE_TABLE_A` already correctly
   encode it (each table index N holds the task's internal value from tick
   N-1) - **this part was never the bug**.
3. The actual jitter: on some ticks, `Task_CloseMonPic`'s `SetGpuReg(WIN0V,
   ...)` call happens to execute *after* `REG_VCOUNT` has already crossed
   into vblank that frame (instead of before, which is the normal case),
   so the write lands on hardware immediately instead of being queued -
   collapsing the usual 1-tick lag and producing a "catch-up" (a skipped
   window-growth step, or a duplicated one on the next tick to resync).
   `REG_VCOUNT`'s value at the moment this one `SetGpuReg` call executes
   depends on the **total CPU cycle cost of everything else that ran earlier
   in the same frame** (`AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/
   `UpdatePaletteFade`/all of `RunTasks`, per `CB2_SelectScreen`) - a
   cycle-accurate hardware race, not game *state*.

**Confirmed NOT reducible to any state this engine tracks** (the decisive
test): replaying `tools/compare/traces/rent-slot1.json`'s exact button
sequence with 0/3/7/10/17 idle frames prepended (shifting every absolute
tick but preserving every *relative* offset - ticks-since-open,
ticks-since-RENT-confirm, close-table variant, all unchanged) produces a
**different** WIN0V catch-up pattern each time. So the jitter is a function
of absolute session tick (ultimately: total emulated CPU cycles since boot,
via `RunTextPrinters`/sprite-processing/etc. cost on nearby ticks) with no
proxy available in this engine's tick-level `EngineState` - only a
cycle-accurate CPU emulation would reproduce it exactly, which is out of
scope for a tick/state-machine reimplementation.

**Ruled out along the way** (leads from the previous investigation,
superseded by the above): `monPicBg`'s tileset/palette is genuinely static
across the close (RAM-dumped, no change) - the earlier "un-modeled
shimmer/palette-cycle" suspicion was wrong. It's also not about the DOWN
press, not about `hasActed`/close-table variant (clean and broken closes use
the identical variant), and not a fixed function of ticks-since-close-started.

**Confirmed scope of the visible damage:** for `rent-slot1.json` specifically,
`npm run compare` shows `DIFF` on frames 37-47 (the window-growth phase,
up to 3343px/8.71%) tapering down through frames 49-57 (1-64px, halving
roughly in step with the post-window flash-bar's own width table) - i.e. the
same one jitter event also perturbs the flash-shrink phase that immediately
follows, since it's driven by the same task's tick sequence. Frames 58-138
(fully past the close) are unaffected and independently RAM-verified exact
(RNG stream, state machine - see PROGRESS #17).

**Why this can't be fixed at this engine's level:** a correct fix would
require modeling per-frame CPU cycle cost across unrelated subsystems
(text printer drain state, sprite count, palette fade activity) precisely
enough to predict which side of the vblank boundary `REG_VCOUNT` lands on
for one specific `SetGpuReg` call - i.e. cycle-accurate CPU emulation. That
is a different order of engineering than this codebase's tick/state-machine
architecture and is not proposed here.

**Remaining work / options for a future slice (none attempted - would each
need explicit sign-off since they lean away from "model the real mechanism"):**
- Re-time `rent-slot1.json`'s RENT-confirm press so its close lands in a
  tick range empirically confirmed clean for *that exact* trace (not a
  general rule - the shift-test above proves no general rule exists). This
  is the "dodge" option the current brief explicitly ruled out, but may be
  the only practical unblock short of cycle-accurate emulation.
- Accept `rent-slot1.json` at 125/139 permanently and document the gap
  inline (its RENT/DESELECT-specific behavior is already independently
  RAM-verified via `tests/rentSelect.test.ts`/`tests/ballAnim.test.ts`, so
  the uncovered pixels are 100% attributable to this pre-existing,
  RENT-independent close-animation jitter, not to unverified S5 logic).
