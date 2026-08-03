# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

**Two kinds of entry live here — do not confuse them.** `#39`, `#55`, `#56`,
and `#62` are open, actionable debt. `#38`, `#18`, `#61`, and `#5` are
**settled records, not work**: each was investigated to root cause and then
parked or accepted by decision. They stay because ROADMAP acceptance lines
cite them by number as the recorded reason specific pixel diffs are accepted
(`#5` at ROADMAP:127, 142, 150, 163, 175; `#18` at :176; `#38` at :503) —
deleting them would orphan those citations and lose the *why* behind a green
tick. Do not reopen one without a user decision, and do not count them as
backlog.

# Open

## #70 — Presentation-string completeness: 47 STRINGID refs would hit the resolver guard if reached; 4 ids missing from the extracted table

**Found by #68's insurance sweep (2026-08-02, worker log
`/tmp/emerald-factory-subagent-20260802-233149.jsonl`; summary in PROGRESS
entry 879):** of 122 distinct `STRINGID_*` referenced in `src/engine/*.ts`,
47 name a placeholder `battleResolutionPresentation.ts`'s `messageLines`
fallback cannot supply (mostly `B_DEF_NAME_WITH_PREFIX`/`B_SCR_ACTIVE_
ABILITY`/`B_BUFF1/2`/`B_CURRENT_MOVE`/`B_ATK_PREFIX2`) and would throw the
#65/#68-class completeness-guard crash IF actually reachable — reachability
NOT yet verified (many are doc-comment citations, not wired-opcode
emissions). The 47:
AVOIDEDDAMAGE, HITXTIMES, PKMNAVOIDEDATTACK, PKMNBURNEDBY,
PKMNCANTSLEEPINUPROAR2, PKMNCHOSEXASDESTINY, PKMNCLAMPED,
PKMNCOVEREDBYVEIL, PKMNENDUREDHIT, PKMNENERGYDRAINED, PKMNEVADEDATTACK,
PKMNFROZENBY, PKMNHPFULL, PKMNMADESLEEP, PKMNMAKESGROUNDMISS,
PKMNOBTAINEDX, PKMNOBTAINEDX2, PKMNOBTAINEDXYOBTAINEDZ, PKMNPOISONEDBY,
PKMNPREVENTSPARALYSISWITH, PKMNPREVENTSPOISONINGWITH,
PKMNPROTECTEDITSELF, PKMNRAISEDDEF, PKMNRAISEDDEFALITTLE,
PKMNRAISEDFIREPOWERWITH, PKMNRAISEDSPDEF, PKMNRAISEDSPDEFALITTLE,
PKMNSEEDED, PKMNSHROUDEDINMIST, PKMNSITEMCUREDPROBLEM,
PKMNSQUEEZEDBYBIND, PKMNSTAYEDAWAKEUSING, PKMNSTOCKPILED,
PKMNSXCUREDITSYPROBLEM, PKMNSXHADNOEFFECTONY, PKMNSXMADEYINEFFECTIVE,
PKMNSXPREVENTSBURNS, PKMNSXPREVENTSYSZ, PKMNTRANSFORMEDINTO,
PKMNTRAPPEDBYSANDTOMB, PKMNTRAPPEDINVORTEX, PKMNUNAFFECTED,
PKMNWASPARALYZEDBY, PKMNWRAPPEDBY, SUBSTITUTEDAMAGED,
UPROARKEPTPKMNAWAKE, USINGITEMSTATOFPKMNROSE (all `STRINGID_` prefixed).
Plus 4 referenced but ABSENT from the extracted string table:
STRINGID_FAINTED, STRINGID_INTROSENDOUT, STRINGID_ITEMHEALHP_BERRY,
STRINGID_USEDMOVE_OPERAND (table-extraction gap, separate fix shape).

**Next:** a reachability pass FIRST (which of the 47 can a currently-wired
opcode actually emit in Factory L50 singles — cross-reference the emitting
opcode set, not doc comments), then fix the reachable ones in ranked
batches with #65/#68's established resolver shape + a repro test each. The
4 missing-table ids need the extractor gap closed before any mapping.

## #69 — [USER REPORT 2026-08-02] Scene-OFF stat-banner cadence runs ~21% fast: missing 64-frame post-print hold

**Ground truth pinned (2026-08-02, `0b8c0537`,
`docs/issue69-omniboost-off-ground-truth.md`):** the ROM's Scene-OFF
omniboost is **5 separate banners** (box-clear flash + text + the source's
64-frame `waitmessage(B_WAIT_TIME_LONG)` hold), ~92 frames/banner, 473
total (dense fixture `issue69-omniboost-dense-seed8.json`). The app's five
banners are structurally CORRECT (user's "one gray flash" memory is the
Scene-ON animation, skipped in OFF); the defect is timing: ~74.6
frames/banner, 373 total — **zero post-print hold modeled**, generic to
every stat-change move (cross-ref: the open flag in
`docs/stat-change-confusion-ground-truth.md`). RNG exonerated: 25/25
seed-for-seed proc agreement; draw attribution exact (double proc = luck).

**Fix (bounded, prescribed):** `battleResolutionCommandDuration`'s
`"stat"`/`"message"` cases + `STAT_TIMING`/`MESSAGE_TIMING`
(`battleResolutionPresentation.ts`): add the missing 64-frame post-print
hold, target ~92 frames/banner against the dense fixture. CAUTION: this
moves timing on a SHARED constant — every standing window containing a
kernel-route stat/message banner must be re-run against the ORACLE (not
differential); windows that were implicitly fitted around the missing hold
may move. If any standing pin regresses vs the oracle, stop and report
rather than refit.

## #56 — Arbitrary-trainer intro: residuals, ONIX ready-lag regression, MAGNETON shadow coverage

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
never re-ran the MAGNETON comparison. **Next actionable:** fix the
stallLag keying per-route (bounded; both prior evidence docs give the
values), re-run BOTH standing intro comparisons, expect MAGNETON ≥703 with
YOSHI's 700 intact. Keep #56 open until then.

**Not blocking:** Gate 5 ticked with these named (ROADMAP S10 gate 5
completion note); this is the worklist to finish the window honestly.

## #55 — Rental-construction RNG stream contract cannot represent ambient VBlank interleaving

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

**Leads:** either extend the construction contract with an explicit
interleaving representation (per-mon start cursors or a per-frame tick
schedule — recording-flavored, decide deliberately), or keep the clean-stream
contract and document personality-exactness as out of model whenever
construction spans >1 frame. Supervisor decision 2026-07-30 (entry 758):
Gate-5 clause (a) is receipt-linked at the rules level (selection byte-exact
from the probed cursor; construction proven via filtered ledger); this entry
tracks the remaining stream-model boundary, not a Gate-5 blocker.

## #39 — `battleScene.ts` is a state machine over one canonical battle

**Symptom:** most production battle presentation is still keyed to *which turn
of the recorded Battle 1/2 we are in*, not to what happened. Individual exact
windows now consume kernel semantic events, but the surrounding dispatcher and
most content remain turn-keyed.

**Confirmed** (2026-07-24, `856b3b4`): 17,056 lines — **30% of all
`src/engine`**. 74 `BattleSceneState` declaration lines name a specific turn
(`turn13KoDismissElapsed`, `turn13Resolved`, `turn15PartySelect`,
`turn17MenuRedrawElapsed`, `turn17KoDismissElapsed`,
`turn17OutcomeDismissElapsed`, `turn17LossDismissElapsed`); 969 lines reference
a turn number; per-species render entry points are hardcoded
(`grovyleFaintSinkRowsAndY2`, `onixSitrusRotateMatrix`,
`turn5GrantingStarPlacement`, `dragonBreathGrovyleHp`). Sibling files
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
fields to three). Remaining work is turn-2–4 epoch/content folds (slices 7–9)
and final positional parameter/type cleanup (slice 10).

# Settled records (not open work — see the note at the top of this file)

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
