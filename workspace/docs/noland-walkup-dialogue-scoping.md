# Noland walk-up dialogue — scoping memo (queue item (iii))

Side-lane deliverable, scoping only — no `src/`, no tests, no fixtures, per
this session's step brief. Ground truth is decomp-read
(`reference/pokeemerald/`) plus one live oracle cross-check (§1.6) where the
source read was ambiguous. Where prior side-lane oracle work already
frame-verified part of this window, this memo cites and reconciles with it
rather than re-deriving it: `docs/noland-brain-intro-ground-truth.md`
(silver) and `docs/noland-brain-intro-gold-ground-truth.md` (gold), both
2026-08-14, both `http://127.0.0.1:8014`.

## 0. What "the walk-up" actually spans

The step brief's starting points (`data/maps/BattleFrontier_BattleFactoryLobby/
scripts.inc`, `src/frontier_util.c`, "`data/scripts/frontier_brain.inc`")
undersell the footprint. Two corrections up front:

1. **The Lobby map itself has no brain-specific walk-up content.** Its
   scripts (`data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc`) only
   cover the *first-ever* entry into a challenge (`EventScript_EnterChallenge`,
   :163–175, "Please step this way.") and the challenge-end return (win/loss
   messages, :40–94). Battles 21 and 42 happen deep inside an *already
   running* challenge, so the player never revisits the Lobby map between
   them — the walk-up lives entirely in the **other two** Factory maps:
   `BattleFrontier_BattleFactoryPreBattleRoom` (the per-battle "ready?" room)
   and `BattleFrontier_BattleFactoryBattleRoom` (where Noland is physically
   present). The app's walkable-Lobby divergence (`src/engine/
   factoryLobbyFreeRoam.ts:13–20`, user decision 2026-08-05) is therefore
   orthogonal to this scoping — silent Lobby NPCs were never going to carry
   Noland's speech either way.
2. **`data/scripts/frontier_brain.inc` does not exist** in this decomp
   checkout. The Noland-specific *text* the brief was likely gesturing at
   (`gText_NolandWonSilver` / `NolandDefeatSilver` / `WonGold` / `DefeatGold`)
   lives in `data/text/frontier_brain.inc:31–43`, referenced from
   `src/frontier_util.c:730–772`. Those four strings are the Frontier's
   shared **in-battle** win/loss commentary tables (`sFrontierBrainPlayer
   {Lost,Won}{Silver,Gold}Texts`) — displayed by the battle engine itself
   after the final KO, not by any overworld script. They are **out of scope**
   for "walk-up" (pre-battle) by definition; noted here only so the citation
   is traceable and not silently dropped.

The real walk-up is three maps deep: **Lobby (uninvolved for 21/42) →
PreBattleRoom (the "call from the boss" scene, shared machinery for every
brain encounter) → BattleRoom (Noland's own entrance + speech, the
silver/gold-divergent part)**, then a handoff into `CB2_InitBattle` that is
already the existing battle-transition/trainer-pic-reveal system's problem,
not new work.

## 1. Ground truth: the ROM flow

### 1.1 PreBattleRoom — the "call from the boss" (shared by every brain encounter)

Fires whenever `frontier_getbrainstatus` is not `FRONTIER_BRAIN_NOT_READY`
(`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:61–62`) —
i.e. identically for battle 21 (first silver), every silver-tier repeat,
battle 42 (first gold), and every gold-tier repeat. This is **not**
silver/gold-specific; it is "about to face the brain" specific.

Mandatory path (`ReturnToRoomFromBattle`, :54–77, then `AskReadyForHead`,
:349–361, then `AskSwapBeforeHead`, :370–376, then the shared
`EnterBattleRoom`, :43–52; assumes the player answers "Go on" and declines
the swap offer, the path every playthrough takes at least once per brain
battle):

| # | Script label : line | Trigger/mechanism | Text (verbatim) |
| - | - | - | - |
| — | `:57` | generic post-battle line, fires after *every* battle, not brain-specific | "Thank you for competing!\nLet us restore your Pokémon!" (`Text_LetUsRestoreMons`) + `playfanfare MUS_HEAL` / `special HealPlayerParty` |
| 1 | `:63,65` | `playse SE_POKENAV_CALL` (phone rings), then msgbox | "Excuse me! Excuse me, please!\nMay I get you to wait a few moments?" (`Text_WaitFewMoments`) |
| — | `:67` | `applymovement LOCALID_FACTORY_PRE_BATTLE_ATTENDANT, ...AttendantMoveToReceiveCall` (:437–441, 3 tiles west) | (movement only) |
| 2 | `:69` | msgbox | "…Uh-huh? What?! …Whoa!\nUnderstood, sir! Will do!" (`Text_UnderstoodSirWillDo`) |
| — | `:71` | `applymovement ...AttendantReturnToPlayer` (:443–448, 3 tiles east, `face_down`) | (movement only) |
| 3 | `:73` | msgbox, 3 pages (`\p`×2) | "Oh, my…\nSorry to keep you waiting!\p I have a message from this facility's\nboss, the FACTORY HEAD.\p He says, "We're going to do it!\nCome here right now!"" (`Text_MessageFromHeadComeRightNow`) |
| — | `:75` | `delay 16` | — |
| 4 | `:350` (`AskReadyForHead`) | `message` + `multichoice 19,4,MULTI_GO_ON_RECORD_REST_RETIRE` | "The FACTORY HEAD is demanding you.\nAre you prepared to face him?" (`Text_PreparedToFaceHead`) |
| 5 | `:371` (`AskSwapBeforeHead`, reached on "Go on") | msgbox | "I'm terribly sorry, but I can't tell you\nanything about the FACTORY HEAD." (`Text_CantTellAnythingAboutHead`) |
| 6 | `:372` | msgbox `MSGBOX_YESNO` | "Before starting the battle, would you\nlike to swap a Pokémon?" (`Text_LikeToSwapMon`) — "No" (or B) falls through to `EnterBattleRoom` |
| 7 | `:44` (shared `EnterBattleRoom`) | msgbox | "Right this way, please!" (`Text_RightThisWay`) |
| — | `:46–49` | `call BattleFrontier_EventScript_GetLvlMode` then `applymovement` guide+player (`WalkToBattleRoomLv50`/`LvOpen`, :421–435/396–410, a short 4–5 tile diagonal walk); guide `set_invisible` at the end | (movement only) |
| — | `:50` | `warp MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM, 6, 11` | map transition |

**7 message-box events** (excluding the generic heal line), all **identical
in wording, order, and count for both silver and gold** — this half of the
walk-up has no silver/gold divergence at all. This whole scene is also why
`AskReadyForHead` differs from the ordinary `AskReadyForOpponent` used
before battles 1–6/8–20/etc. (`:79–90`, "The Nth match is next! Are you
ready?") — the brain check is a hard branch at `:80–81`, not a text swap.

### 1.2 BattleRoom entrance — the room, Noland's placement, the shared "get a move on"

`BattleFrontier_BattleFactoryBattleRoom/scripts.inc` header comment (:1–4)
documents the camera trick: the real `LOCALID_PLAYER` is hidden and a decoy
object (`LOCALID_FACTORY_BATTLE_PLAYER`, local ID 8, gfx keyed off
`checkplayergender` at :14–16) walks in on-screen while the camera itself
stays fixed — this is **already ported** for the ordinary (non-brain) case
in `src/engine/battleRoom.ts` (its own header cites the RAM-probed camera
pan/decoy-walk mechanics), just not yet keyed to the brain branch.

On transition (:12–20): `frontier_getbrainstatus` is copied to `VAR_TEMP_F`
and, if brain-ready, `SetUpFactoryHeadObj` (:22–25) sets
`LOCALID_FACTORY_BATTLE_OPPONENT` (local ID 2) to Noland's graphics via
`frontier_setbrainobj` → `sFrontierBrainObjEventGfx[FRONTIER_FACILITY_
FACTORY] = {OBJ_EVENT_GFX_NOLAND, FALSE}` (`src/frontier_util.c:674`) and
places him at **(7,9)** — this is a structurally different placement/reveal
than an ordinary opponent, who starts hidden and is placed at (7,1) then
walked in only after the player is already inside (`:68–73`, `factory_
setopponentgfx` / `removeobject` / `setobjectxyperm` / `addobject` /
`applymovement ...OpponentEnter`). Noland is visible in the room from the
start; ordinary opponents are not (`OnWarp`'s `HideObjects`, :27–37, only
hides `LOCALID_FACTORY_BATTLE_OPPONENT` when *not* brain-ready).

`EnterRoomFactoryHeadBattle` (:51–60, reached whenever `VAR_TEMP_F != NOT_
READY`, so identically for silver and gold):

| # | Line | Content |
| - | - | - |
| 8 | `:52` | msgbox "Hey, hey!\nGet a move on!" (`Text_GetAMoveOn`) |
| — | `:54–57` | `applymovement` Noland (`Movement_NolandMoveToBattle`, :215–220: `walk_up`×3, `face_left`) simultaneous with the player+decoy (`Movement_PlayerEnterRoom`, :193–200: `walk_up`×5, `face_right`) |
| — | `:58` | `call ...ScientistsFaceBattle` (:234–242): the 6 scientist NPCs (object events at (0,4)/(0,6)/(0,8)/(12,4)/(12,6)/(12,8), ring-flanking the arena) turn in place, no text |
| — | `:59` | `goto ...BattleOpponent` → `BattleNoland` (:113, since `VAR_TEMP_F != NOT_READY`) |

**§1.6 flags an unresolved discrepancy here** — do not treat "Get a move on!"
as confirmed-present for the gold path without reading that section first.

### 1.3 Silver divergence (battle 21, first encounter) — `BattleNoland` switch, :113–126

`VAR_TEMP_F == FRONTIER_BRAIN_SILVER` (`include/constants/frontier_util.h:10`,
value 1) matches **none** of the switch's three cases (`GOLD`=2, `STREAK`=3,
`STREAK_LONG`=4), so control falls through past the switch to the
first-time-only gate:

| # | Line | Content |
| - | - | - |
| 9 | `:120` (gated: `frontier_get FRONTIER_DATA_HEARD_BRAIN_SPEECH` == FALSE, first time only) | msgbox, 8 pages: "Hey, my name's NOLAND!\nI'm basically in charge of this place,\lwhich is why I'm the FACTORY HEAD!\p I had a look at your Battle Swap data.\p You seem to have the right idea,\nbut you're still square in your head!\p Listen up, okay? Knowledge isn't only\nabout reading books or doing desk work.\p Just doing that sort of thing…\nIt may as well be useless!\p You have to experience things with\nyour heart and your body, understand?\p I'll take you on under the same\nconditions as you.\p I'll be using rental Pokémon, too!" (`Text_NolandImFactoryHead`) |
| — | `:121` | `frontier_set FRONTIER_DATA_HEARD_BRAIN_SPEECH` (silver-tier bit, see §1.5) |
| 10 | `:123` (`BattleNolandSilver`, always) | msgbox "Shake out every last bit of your\nknowledge and bring it on!" (`Text_ShakeOutKnowledgeBringItOn`) |
| — | `:124` | `call ...DoNolandBattle` (:169–176): `closemessage`; `frontier_set FRONTIER_DATA_RECORD_DISABLED, FALSE`; `special HealPlayerParty`; `setvar VAR_0x8004, SPECIAL_BATTLE_FACTORY`; `special DoSpecialTrainerBattle` |

### 1.4 Gold divergence (battle 42, first encounter) — `IntroNolandGold`, :143–152

`VAR_TEMP_F == FRONTIER_BRAIN_GOLD` (value 2) matches the switch's first
case directly (no fallthrough needed):

| # | Line | Content |
| - | - | - |
| 9′ | `:146` (gated: gold-tier `HEARD_BRAIN_SPEECH` bit == FALSE, first time only) | msgbox, 4 pages: "NOLAND: Hey, hey! How's it going?\nYou keeping up with your studies?\p …Oh?\p You've taken on a harder look than\nthe last time I saw you.\p Now, this should be fun!\nI'm getting excited, hey!" (`Text_HarderLookThanLastTime`) |
| — | `:147` | `frontier_set FRONTIER_DATA_HEARD_BRAIN_SPEECH` (gold-tier bit) |
| 10′ | `:149` (`BattleNolandGold`, always) | msgbox "All right!\nBring it on!" (`Text_AllRightBringItOn`) |
| — | `:150` | `call ...DoNolandBattle` (same as silver) |

**Structurally identical to silver** (same 2-slot pattern: gated first-time
personality line, then a short always-shown challenge line, then the same
`DoNolandBattle` call) — only the flavor text and page count differ (8 pages
vs. 4). §1.5 explains why the flag that gates line 9/9′ doesn't collide
between silver and gold.

### 1.5 Why silver and gold each get their own "first time" line

`FRONTIER_DATA_HEARD_BRAIN_SPEECH` is not a single flag: `GetFrontierData`/
`SetFrontierData` (`src/frontier_util.c:846–848`, `881–883`) key it off
`gSaveBlock2Ptr->frontier.battledBrainFlags & sBattledBrainBitFlags[facility]
[hasSymbol]`, where `hasSymbol` is the player's current symbol count for
that facility **clamped to {0,1}** (0 = "no symbols yet" bucket, i.e. the
silver approach; 1 = "have silver, going for gold" bucket). So the silver
intro (line 9) and the gold intro (line 9′) each have their own persistent
bit and each fire exactly once ever, independent of the other — confirmed by
`sFrontierBrainStreakAppearances`/`GetFrontierBrainStatus`
(`src/frontier_util.c:1656–1693`): `FRONTIER_BRAIN_GOLD` can only occur once
the silver symbol is already held, so by the time gold's intro is eligible,
silver's own bit is necessarily already set — they never interact.

Repeat encounters (`FRONTIER_BRAIN_STREAK`/`STREAK_LONG`, both symbols
already held, hitting a repeat streak threshold) skip the gated line
entirely (`BattleNoland`'s `STREAK` case jumps straight to `:122`; `STREAK_
LONG` jumps straight to `:148`) — repeat walk-ups are **one box shorter**
than either first encounter (line 8 "Get a move on!" + line 10/10′ only:
"Shake out…"/"All right…").

### 1.6 Text-box count — correcting the brief's "~12 silver / 2 gold" (gold discrepancy resolved)

The brief's numbers are **not a guess** — they trace to this session's own
prior side-lane oracle work, already committed:
`docs/noland-brain-intro-ground-truth.md` (silver, live-verified against
`:8014`, frames ~700–3210) states "Noland's own **~12-box personality
speech**"; `docs/noland-brain-intro-gold-ground-truth.md` (gold, same
session) states gold shows "**two short usher/escort boxes**" reading
"Right this way, please!" and explicitly "**zero** Noland speech before the
transition." Both numbers check out **for the window each doc actually
captured** — but neither doc's capture window includes §1.1's PreBattleRoom
scene (both start their trace *after* the rental-select screen, already
inside/approaching the BattleRoom). So "~12 / 2" describes the BattleRoom-
local portion only, not "the walk-up" as a player experiences it end to end:

- **Silver, BattleRoom-local:** line 8 (1 box) + line 9's 8 `\p`-terminated
  pages + line 10 (1 box) = **10 by page count**, which the oracle doc
  rounds to "~12" (its own coarse ≥20-stride sampling explicitly did not
  re-derive an exact count, deferring to PROGRESS 1256's independently
  measured ack-chunk delta instead — see that doc's §3 closing note).
  Adding §1.1's 7 PreBattleRoom boxes: **~17 total boxes, first silver
  encounter, front door to `DoSpecialTrainerBattle`.**
- **Gold, BattleRoom-local:** the prior gold doc read **zero** Noland speech
  and **two** "Right this way, please!" instances here — **now known wrong**,
  a lab-staging artifact, not the real ROM sequence; see the resolved
  discrepancy immediately below for the corrected reading (line 8 "Get a
  move on!" + gated 4-page first-timer speech + line 10′ "Bring it on!", not
  a second "Right this way").

**Discrepancy resolved this session (was "open," §1.6 prior revision):
verdict (a), LAB ARTIFACT — the second "Right this way, please!" is a
battle-lab overworld-staging bug, not genuine ROM behavior; a faithful gold
walk-up shows line 8 "Get a move on!" exactly as the decomp predicts.**
Fresh evidence: a stride-1 dense re-probe
(`tools/battle-lab/factory-brain-gold-entrance-dense-off.json`, frames
715–970) confirms the PNG content byte-for-byte against the prior doc — the
box at ~frame 861–962 does say "Right this way, please!" again, over
BattleRoom's own hex-arena/6-scientist background, with the player+decoy
walk-in animation completing *before* the box (not after, as
`EnterRoomFactoryHeadBattle`'s script orders it). The tiebreaker is a RAM
probe (`tools/probe/probe-factory-brain-gold-entrance-ram.py`, run via
`tools/run-mgba-probe.py`) reading the exact vars BattleRoom's map scripts
gate on, at every frame 715–970 of this same staged run:
`VAR_TEMP_0 == 0` (the `OnFrame`→`EnterRoom` dispatch gate is open, so the
frame-script *did* fire — ruling out the "stale guard suppresses the
script entirely" half of the original hypothesis (a)) but
`VAR_TEMP_F == FRONTIER_BRAIN_NOT_READY` (0) throughout, not
`FRONTIER_BRAIN_GOLD` (2) as the staged battle number implies — even though
`VAR_FRONTIER_FACILITY`/`VAR_FRONTIER_BATTLE_MODE` read correctly (4/0,
`FACTORY`/`SINGLES`). `EnterRoom` therefore takes its *ordinary*-opponent
branch (walk-in movement first, matching what's observed) and falls through
to the *ordinary* opponent-intro box (`msgbox gStringVar4`, built by
`GetOpponentIntroSpeech`, `src/battle_tower.c:1936`) instead of
`EnterRoomFactoryHeadBattle` — `gStringVar4` reads "Right this way, please!"
at this specific staged frame, explaining both the reversed order and the
duplicated string in one mechanism. Root cause:
`GetFrontierBrainStatus`(`src/frontier_util.c:1651-1672`)'s readiness check
is a **strict equality** against
`sFrontierBrainStreakAppearances[FACTORY][symbolsCount]`, where
`symbolsCount` comes from the player's *actual* saved symbol flag bits
(`GetPlayerSymbolCountForFacility`) — a field `BattleLab.prepare()`'s
`factoryBrain` staging (`oracle/battle_lab.py:565-670`) never writes, only
the win-streak/battle-num SaveBlock2 fields — so on the shared "canonical
rental checkpoint" savestate (0 symbols), the equality targets the *silver*
threshold, which a gold-tier streak value doesn't hit, yielding NOT_READY.
This is a narrow gap in the harness's overworld-side staging (its
battle-side Brain detection, e.g. `FillFactoryBrainParty`, is unaffected —
`opponentParty` in the setup descriptor is still genuinely Noland's roster)
— out of scope for this docs-only step to fix. No natural-play trace was
needed: the RAM evidence on the existing staged run alone is dispositive.

**Bottom line for planning purposes:** budget **silver ≈ 17 boxes / gold ≈
13 boxes (first encounter), 9 boxes (repeat)** end-to-end (front-of-queue
"call from the boss" through `DoSpecialTrainerBattle`) — revised up from
this doc's prior "≈8" now that the discrepancy above is resolved: gold's
BattleRoom-local portion is line 8 (1) + line 9′'s gated 4-page first-timer
speech (first encounter only) + line 10′ (1) = 6 boxes first-time / 2 boxes
repeat, plus §1.1's shared 7 PreBattleRoom boxes. Neither "12 / 2" nor the
prior revision's "17 / 8" were right for gold; this is the source-correct
figure. Silver's 17 is unaffected — its own discrepancy-free BattleRoom
portion (§1.3) was never in question. Both are genuinely asymmetric (silver
has an 8-page personality speech every first encounter vs. gold's 4, and
gold's repeat case is 4 boxes shorter than its first-time case). The
PreBattleRoom half (7 boxes) is shared, symmetric, and not brain-flavor-
specific at all.

### 1.7 Movement, camera, music — brief but complete

- **Movement:** attendant walks away/back in PreBattleRoom (§1.1); guide+
  player walk a short diagonal into the warp point (§1.1); Noland walks
  3 tiles + turns while the player+decoy walk in, in BattleRoom (§1.2); 6
  scientists turn in place (§1.2, no translation). All are `applymovement`
  scripts with small, fully-enumerated step lists (already the same idiom
  `src/engine/battleRoom.ts`'s own baked `ENTRY_STEPS`-style tables use for
  the ordinary case) — bounded, not open-ended animation work.
- **Camera:** identical fixed-camera-with-decoy-object trick for brain and
  ordinary entrances alike (`BattleFactoryBattleRoom/scripts.inc:1–4`) —
  already ground-truthed and partially ported (`src/engine/battleRoom.ts`'s
  header doc, RAM-probed fade/pan/decoy mechanics for the *ordinary* case).
- **Music:** **no music change during the walk-up itself.** All three maps
  (`Lobby`, `PreBattleRoom`, `BattleRoom`) share `MUS_B_FACTORY`
  (`data/maps/.../header.inc`, each map's `.2byte MUS_B_FACTORY` field) — the
  only audio events are `SE_POKENAV_CALL` (§1.1 line 1, the phone ring),
  `SE_SAVE` (unrelated, only on the save-before-challenge/pause paths), and
  `MUS_HEAL` (generic post-battle fanfare, not brain-specific). The real
  music change (into battle BGM) happens *after* the walk-up, inside
  `DoSpecialTrainerBattle`'s `PlayMapChosenOrBattleBGM(0)` call
  (`src/battle_tower.c:2098`) — that's the existing battle-transition
  system's job already, not new walk-up work.

### 1.8 Handoff to `CB2_InitBattle`

`DoNolandBattle`'s `special DoSpecialTrainerBattle` (§1.3/§1.4) enters
`SPECIAL_BATTLE_FACTORY` (`src/battle_tower.c:2092–2100`): sets
`BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY` (`+ BATTLE_TYPE_DOUBLE` iff
doubles, irrelevant here — brain fights are singles-only, `GetFrontierBrain
Status`, `src/frontier_util.c:1665–1666`), calls `FillFactoryTrainerParty`,
starts `Task_StartBattleAfterTransition`, plays the map/battle BGM, and
kicks off `BattleTransition_StartOnField`. `Task_StartBattleAfterTransition`
(`src/battle_tower.c:1997–2005`) waits for `IsBattleTransitionDone()` then
calls `SetMainCallback2(CB2_InitBattle)` — this is the literal handoff, and
it is **generic Factory machinery**, identical for brain and ordinary
matches. Everything from here on (transition swirl, trainer-pic reveal,
send-outs, ready state) is already independently oracle-ground-truthed for
both silver and gold in `docs/noland-brain-intro-ground-truth.md` §2 /
`docs/noland-brain-intro-gold-ground-truth.md` §1, and that doc's own
conclusion stands: **no new visual stage is needed there** beyond the
existing trainer-presentation table gaining a `TRAINER_FRONTIER_BRAIN`
entry (already flagged in that doc, not this memo's concern).

## 2. Options

### FAITHFUL — full walk-up as the ROM does it

**What it needs, mapped to what exists:**

| Mechanism | Exists today? |
| - | - |
| Message-box frame/text rendering (draw box, typewriter reveal, page-advance gating) | **Yes** — `src/engine/prebattleRoomRender.ts` (`drawMessageBoxFrame`/`drawMessageBoxText`/`drawMessageBox`) and the loss/round-won terminal's own page state machine (`factoryTerminalPresentation.ts`) are both general enough to reuse; the "1 char/tick, no pauses" pacing is already pixel-verified (`prebattleRoom.ts`'s own header doc, finding 6). |
| Brain-status branch (silver/gold/streak/streak-long) | **Yes, as pure logic** — `src/engine/frontierBrainStatus.ts` already ports `GetFrontierBrainStatus`; `battleScenario.ts`/`factoryRoundBattleOrchestrator.ts` already carry a `frontierBrain` marker per round (PROGRESS 1269). |
| Per-tier "heard the speech" persistent flag (§1.5) | **No** — not ported anywhere (`grep` for `heardBrainSpeech`/`HEARD_BRAIN_SPEECH` is empty). Small: two booleans, Factory-scoped. |
| PreBattleRoom "ready?" menu (Go on/Record/Rest/Retire) + attendant call-scene (§1.1) | **No** — `src/engine/prebattleRoom.ts` currently covers *only* the post-accept fade-out → room fade-in → "Right this way, please!" hold (its own header: "S5 final slice"). The multichoice menu, the swap-mon offer, and the attendant walk-away/return/phone-SE scene do not exist **for any battle**, brain or ordinary — this is a pre-existing gap the walk-up shares, not a brain-specific add. |
| BattleRoom Noland placement/entrance (start visible at (7,9), walk up + face left, distinct from ordinary opponent placement) | **Partially** — `src/engine/battleRoom.ts` ports the *ordinary* entrance (fade-in, camera pan, decoy walk, frozen scientists) frame-accurately, but has no brain branch (`grep` for `noland`/`brain` in that file is empty); Noland's movement is a different baked table, same idiom, bounded cost. |
| Silver/gold personality-speech text + page timing | **No new mechanism** — just string data through the existing typewriter renderer, gated by the new flag above. |
| Handoff to `CB2_InitBattle` / transition / pic-reveal / send-outs | **Already done and oracle-verified** for both silver and gold (§1.8) — zero new work. |

**Rough size:** the PreBattleRoom menu+call-scene (new NPC movement +
multichoice UI + phone SE, shared infra none of which exists yet) is the
dominant cost — plausibly 2–3 worker-steps on its own since it's genuinely
new UI, not a brain-specific reuse. The BattleRoom Noland branch (placement,
movement table, 2 gated text boxes, flag persistence) is a bounded
extension of already-oracle-verified, partially-ported machinery —
plausibly 1–2 steps. Resolving §1.6's open discrepancy first (or accepting
the risk of writing gold's box 8 wrong) adds a probe step. **Total: roughly
4–6 worker-steps**, and it front-loads a non-brain-specific menu system that
arguably belongs to the *ordinary* battle-2-through-6 pre-battle flow more
than to "Noland walk-up" scoping specifically (every brain encounter reuses
that menu unmodified).

**Also relevant:** PROGRESS 1268 notes battle 21/silver is currently
**unreachable by natural play** (no continuous-play round-chaining yet) —
FAITHFUL walk-up work would need a staged-scenario entry point to be
exercisable at all until that separate gap closes.

### TRIM — minimal dialogue, no movement scripting

One or two boxes (e.g. just line 8 "Hey, hey! Get a move on!" and the
silver/gold challenge line — line 10/10′, "Shake out every last bit…" /
"All right! Bring it on!" — reusing the already-general message-box
renderer with a static two-page script, no PreBattleRoom menu, no attendant/
Noland movement, no phone-call scene, no persistent "heard speech" flag
(always show the short line, never the long first-timer speech since that's
the piece requiring persistent state + the most text volume).

**Preserves:** the "something happens before the brain fight" beat, a
recognizable Noland line, distinguishing brain battles from ordinary ones at
the presentation layer.
**Loses:** the "call from the boss" scene entirely (attendant NPC, phone SE,
the ready/swap/retire choice), Noland's personality intro (both the 8-page
silver speech and the 4-page gold speech — the flavor text that's arguably
the *point* of a "Frontier Brain" encounter), the visible Noland placement/
walk-in, the silver-vs-gold asymmetry (§1.6) collapses to "same 1–2 boxes
either way."
**Cost:** small — reuses the existing renderer verbatim, no new movement or
menu subsystem, no new persistent flag. Roughly a fraction of one
worker-step.

### SKIP — straight into the brain battle, as today

No overworld change; whatever entry point stages a brain battle goes
directly to the existing (already oracle-verified, §1.8) transition/pic-
reveal/send-out sequence.

**What a player would notice:** no phone call, no ready/swap/retire choice,
no Noland walking into frame, no personality speech (either 8-page silver or
4-page gold) — the very first sign it's a brain battle is the trainer-pic-
reveal text itself ("FACTORY HEAD NOLAND would like to battle!", §1.8,
already correct). Silver and gold would present **identically** at this
layer today (no divergence to build), since nothing distinguishes them
before that point.
**Cost:** zero.

## 3. Recommendation

**TRIM.** Reasoning:

- FAITHFUL's dominant cost (the PreBattleRoom ready/swap/retire menu +
  attendant call-scene) is not really "walk-up dialogue" scope — it's a
  general pre-every-battle menu system the project doesn't have for *any*
  Factory match yet (ordinary battles 2–20/22–41/etc. show the same "Nth
  match is next! Are you ready?" menu, per §1.1). Building it here means
  either duplicating it later for ordinary matches or accidentally scope-
  creeping this step into that separate, bigger feature. If/when that menu
  is built, brain reuse is cheap (§1.1's 7 boxes are already symmetric with
  the ordinary flow's own version) — better to let that happen on its own
  schedule.
- SKIP is cheap but throws away the one thing that's genuinely
  brain-specific and cheap to keep: Noland's own voice. "FACTORY HEAD
  NOLAND would like to battle!" (already present, §1.8) reads as generic
  trainer-intro boilerplate without at least one line establishing why this
  fight is different.
- TRIM captures that with a static two-page script against a renderer that
  already exists (`prebattleRoomRender.ts`/`factoryTerminalPresentation.ts`),
  no new persistent state, no new movement/menu subsystem, and no exposure
  to §1.6's unresolved gold discrepancy (TRIM's proposed lines — "Get a move
  on!" / "Shake out…" or "Bring it on!" — are the ones §1.6 flags as
  *solid*, not the disputed one). It's a genuine down-payment that doesn't
  block a later FAITHFUL pass from superseding it.

This is the user's call per the step brief; the above is the case for TRIM,
not a unilateral decision.

## 4. USER DECISION (2026-08-14 eve): FAITHFUL

The user picked FAITHFUL with §2's costs on the table, superseding §3's
TRIM recommendation. Scope notes recorded with the decision (ROADMAP
2026-08-14-eve block): the PreBattleRoom ready/swap/retire menu + attendant
call-scene is built as the GENERAL pre-battle feature ordinary matches
share, not a brain-only fork; the per-tier heard-speech flags are
in-session only (cross-session saving stays out of scope); resolve §1.6's
gold-discrepancy probe before writing gold's disputed box. Estimated 4-6
worker steps; sequenced after #89/#90/#87(c) per the same block.
