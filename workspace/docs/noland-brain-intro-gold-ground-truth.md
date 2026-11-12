# Noland Brain intro window — visual ground truth (gold, challenge 5)

Side-lane scout deliverable, gold sibling of
`docs/noland-brain-intro-ground-truth.md` (silver, challenge 2, merge
`a156cfa8`). New files only — no `src/`, no `tools/compare/`.

## REFRESH (2026-08-16): everything below §0 pre-2026-08-16 is stale

Top-layer oracle commit `4dac4a35` (2026-08-15) fixed gold Frontier-Brain
staging: `challengeNum 5` now sets `FLAG_SYS_FACTORY_SILVER` (0x8CC) so
`GetFrontierBrainStatus` reads READY instead of NOT_READY. Before the fix,
gold *battles* were genuinely the Brain's (`FillFactoryBrainParty` keys on
`gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN` regardless of overworld
flags) but gold *presentation* silently fell through to the **ordinary**
ROM trainer-intro path (`GetOpponentIntroSpeech`/`EnterRoom`'s non-Brain
branch) — a lab-staging artifact independently root-caused in
`docs/noland-walkup-dialogue-scoping.md` ("Discrepancy resolved this
session") before this fix landed. Every capture in the original §0–§4 below
(captured 2026-08-14, one day before the fix) reflects that broken
presentation. This refresh re-ran the same four committed fixtures against
the fixed oracle (`bin/oracle info` → `capabilities.battleLab.
factoryBrainWalkup: true` confirmed live) and replaces the headline/tick
data with the corrected reading. **The original §0–§4 content is preserved
verbatim, unedited, at the bottom of this file** under "Appendix: pre-fix
(stale) history" — do not delete it; it is now a case study of the bug, not
ground truth.

### 0′. Headline answer (post-fix, current)

**(a) Is the walk-up dialogue TEXT different from silver's, and how many
boxes?** The original doc's "zero Noland speech" answer was **wrong** — a
staging artifact, not real ROM behavior. Gold now shows: an escort box
("Hey, hey! Get a move on!", ~frames 690–960) with the **same wording as
silver's own escort line**, not silver's separate "Right this way, please!"
lobby box, followed immediately by **Noland's real gated first-encounter
speech** — a 4-page block (PNG-confirmed: "NOLAND: Hey, hey! How's it
going? You keeping up with your studies?" at frame ~1200) ending in a
distinct one-box line ("All right! Bring it on!", PNG-confirmed at frame
~2440, hold `f0d9bf0629eb1c8a` spans ≈2400–2528) before the transition —
matching the **4-page gold vs 8-page silver** split already source-pinned
in `factory-brain-walkup-script.json` and asserted by
`tests/factoryBrainWalkupScript.test.ts` ("pins gold's 4-page
first-encounter speech"). Gold is shorter than silver, not silent.

**(b) Are the frame numbers of transition/pic-reveal/send-out/ready shifted
vs silver, and by how much?** Yes, but far less than the stale doc claimed.
**First action-menu-ready frame: 3370** (stride-1 pinned: hold
`a6a74c388a900315` player-send-out text 3329–3363, box-closes hold
`27b3f9a751ac20cb` 3364–3369, ready-cycle sha `f35cc34332dbf907` begins
3370, PNG-confirmed "What will DUGTRIO do?" with opponent BLISSEY Lv50
shown). That is **+1481 frames vs the stale doc's claimed 1889** — entirely
attributable to the newly-revealed personality speech and the escort box's
longer hold — and only **679 frames short of silver's 4049** (not silver's
claimed 2160-frame gap). Once the personality speech is accounted for, gold
tracks silver closely rather than being a radically compressed variant.

**(c) Is anything structurally new, or is gold = silver + text substitution
+ timing shift?** The escort/transition/reveal/send-out/ready machinery is
confirmed **identical shared code** to silver and to the stale pre-fix
capture: the swirl "eye"-pause hold (`3fe5dda8d11c905c`) and the black-flash
hold (`d8b443032200e143`) are **sha-identical** to the values the stale doc
already cited for those same stages, and the pic-reveal cycle
(`c465f0`/`e7694d`/`a4c9ba`) and its wording ("FACTORY HEAD NOLAND would
like to battle!♥") are unchanged too — only their absolute frame position
moved. The one genuinely new element is the personality-speech content
itself, and even that isn't structurally new — it's the same per-box
hold/typewriter mechanism silver's own dossier already documents, just
gold's own (shorter) source-pinned script instead of an absent one.

### Reproduction params for this refresh

Same live fixtures, same params as the original capture (unchanged by the
oracle fix): `playerSetIds [564, 565, 566]`, `seed 305419896`,
`challengeNum 5`, `fixedIv 31`, opponent (Brain) party species `[242
Blissey, 26 Raichu, 126 Magmar]` (read back from `opponentParty`/
`factoryBrainWalkupScript` fixtures' own manifests this session — unchanged
by the fix, since `FillFactoryBrainParty` was never the broken half).
`tools/battle-lab/factory-brain-gold-intro-dense-off.json`'s own
`preCheckpointCaptureFrames` list (hardcoded, max 1990) **no longer reaches
the checkpoint** — the real ready frame moved to 3370, past its capture
list's end — so its committed frame list under-covers the window it was
built to document; it was not rejected (still a valid, accepted request),
just now incomplete for full-window narration. This refresh's extra
boundary frames came from ad hoc `preCheckpointCaptureFrames` probes with
the same `mode`/`challengeNum`/`seed`/`playerSetIds` (not committed as new
fixtures — this step's fixtures are the four listed in the task brief).
`tools/battle-lab/factory-brain-gold-entrance-dense-off.json`'s own
stride-1, 256-frame window (715–970) independently confirms the escort-box
dismiss boundary at frame 961 (hold `7d8066240c8e6514` through 960, unique
frames from 961) with no committed-fixture edits needed.

### 1′. Tick table (post-fix) — frames 0–3370, gold, same coordinate space

Boundary/hold shas below were confirmed via targeted probes at the stated
stride; frames not called out as stride-1 were sampled at anchors only
(same honesty convention the original doc used) — this is not a full
stride-1 re-derivation of the entire window, which was out of scope for
this session's time budget.

| Frames | Len | Content |
| --- | --- | --- |
| 0–417 | (rental-selection screen, three picks) | Not re-verified this session — precedes any Frontier-Brain-status branch, no expected change from the stale capture. |
| 418–431 | 14f hold (`d8b443032200e143`) | Black transition, rental-select → front-desk lobby — **unchanged**, sha-identical to the stale capture. |
| 432–478 | per-frame changing | Walk into lobby — not re-verified. |
| ~479–529 | ~51f hold (`5e8a533380485801`) | **Escort box 1: "Right this way, please!"** — **unchanged wording**, sha-identical to stale capture. |
| 530–628 | per-frame changing | Walking on — not re-verified. |
| 629–639 | hold (`d8b443032200e143`) | Black transition, mid-walk — **unchanged**. |
| 640–689 | per-frame changing (walking into arena) | **Unchanged region shape** — stride-1-confirmed walking, no hold, matches stale capture's characterization for this sub-span. |
| **690–960** | **271f hold (`7d8066240c8e6514`)** | **Escort box 2, NEW TEXT: "Hey, hey! Get a move on!"** (PNG-confirmed at 860) — **wording changed** from the stale capture's "Right this way, please!" repeat, now matching **silver's own escort-line wording** verbatim. Also **starts ~170 frames earlier and holds ~3.3× longer** than the stale capture's box-2 (690–960 vs stale's 880–962). Stride-1-confirmed via the committed `factory-brain-gold-entrance-dense-off.json` fixture (256 frames, 715–970, hold through 960 with no interior change). |
| 961 | dismiss frame | Escort box 2 closes — stride-1-confirmed (committed entrance-dense fixture) begin of unique-frame typewriter into the next box, no intervening hold. |
| **962–~2439** | **~1478f, NEW CONTENT, per-box holds + unique-frame typewriter spans** | **Noland's real first-encounter personality speech** (previously believed absent). PNG-confirmed page: "NOLAND: Hey, hey! How's it going? You keeping up with your studies?" (~frame 1200). Gated 4-page block per `tests/factoryBrainWalkupScript.test.ts` ("pins gold's 4-page first-encounter speech"), ending in a separate box, "All right! Bring it on!" (matches the source-derived line 10′ predicted in `docs/noland-walkup-dialogue-scoping.md`). |
| ~2400–2528 | hold (`f0d9bf0629eb1c8a`) | Final speech box, "All right! Bring it on!", settled — **PNG-verified** at 2440. |
| 2531–~2557 | ≥27f hold (`31aec4d68fe629cb`) | Dialogue box dismissed, brief pause — **sha-identical** to the stale capture's own "963–989" hold; same shared, content-independent engine state, now relocated after the personality speech instead of after escort box 2. |
| ~2558–~2687 | flicker, 8-phase cycle | Pre-transition screen flash — **same sha set** as the stale capture's flicker (e.g. `1173fa84…`). |
| ~2688–~2721 | hold (`3fe5dda8d11c905c`) | Swirl "eye" pause — **sha-identical** to the stale capture's own swirl-pause hold; confirms shared, deterministic transition art independent of dialogue content/length. |
| ~2722–~2739 | unique, expanding | Swirl expanding into black — not individually reconfirmed this session, presumed present (structurally identical). |
| ~2740–~2783 | hold (`d8b443032200e143`) | Full black flash — **sha-identical** to the stale capture's black-flash hold (and to the earlier rental/lobby black-transition holds — same shared solid-black framebuffer, per both docs' own caveat). |
| ~2784–2987 | unique every frame | Battle scene fades in, both send-out pics slide in — content class unchanged from stale capture, absolute position shifted. |
| **2988–~3071** | ~84f, cycling `c465f0`/`e7694d`/`a4c9ba` | **Trainer pic reveal + name/class text**, settled — **PNG-verified** at 3040: "FACTORY HEAD NOLAND would like to battle!♥" — **wording and cycle-member shas unchanged** from stale capture, only shifted later. |
| 3072–~3328 | unique every frame | Opponent transition-out + opponent entrance anim + player entrance anim — **a distinct opponent-send-out text hold was not resolved at sub-stage precision this session** (3-frame-stride sampling through 3260–3326 showed continuously unique content); flagged as open follow-up, not fabricated. |
| 3329–3363 | 35f hold (`a6a74c388a900315`) | Player send-out text window, settled (not independently PNG-checked this session, but structurally consistent with the stale capture's player-send-out-hold class). |
| 3364–3369 | 6f hold (`27b3f9a751ac20cb`) | Box closes into the action menu. |
| **3370+** | cycling `f35cc34332dbf907`/`d9b011b58355cc1d`/`0704ebb0ea65b364`/`257ccd4c4797d6dc`, 4-phase, ≈33f period (stride-1 confirmed 3390–3423) | **First action-menu-ready frame: 3370.** PNG-verified: "What will DUGTRIO do? ▶FIGHT BAG / POKéMON RUN", opponent BLISSEY Lv50 shown. |

**Headline: 3370 frames pre-checkpoint to the first action-menu-ready
frame** (vs the stale doc's claimed 1889, vs silver's 4049) — a
**+1481-frame correction**, all of it the newly-revealed personality speech
plus the escort box's longer hold.

### 2′. Post-checkpoint premise check (post-fix)

Post-checkpoint frame 0's sha (`f35cc34332dbf907`, confirmed via both
`factory-brain-gold-intro-dense-off.json` and
`factory-brain-gold-turn1-off.json`'s own live re-runs this session) matches
the pre-checkpoint ready-cycle sha at frames 3390/3423 exactly — same
premise as the stale doc's own §2: the entire gold battle-start window has
already happened inside the lab's internal `prepare()` route by the time
the caller's own post-checkpoint trace begins. Both `gold-turn1` and
`gold-entrance-dense`'s **post-checkpoint traces needed no edits** — they
are relative to the checkpoint, not to a hardcoded frame count, so the
lab's own relocated ready state is transparent to them; only the
`gold-intro-dense` fixture's own `preCheckpointCaptureFrames` list (a fixed
array baked into the committed file) now under-covers the window, per the
reproduction-params note above.

### 3′. Silver-vs-gold sub-stage duration table (post-fix)

| Stage | Silver (challenge 2) | Gold (challenge 5, post-fix) | Duration match? |
| --- | --- | --- | --- |
| Escort/personality speech block (all boxes, front-desk through last box) | ~700–3210 (~2510f, 8-page speech) | ~690–2528 (~1838f, 4-page speech) | Different — gold's real speech is shorter, not absent |
| Dialogue-dismissed pause | 3201–3228 (28f) | 2531–~2557 (≥27f) | Same (±1f), **sha-identical** |
| Pre-transition flicker | 3229–3279 (51f) | ~2558–~2687 (~130f, not stride-1 pinned) | Not directly comparable at this session's precision |
| Swirl "eye" pause hold | 3334–3367 (34f) | ~2688–~2721 (~34f) | **Same duration, sha-identical** |
| Full black flash hold | 3379–3422 (44f) | ~2740–~2783 (~44f) | **Same duration, sha-identical** |
| Pic reveal + name/class text hold | 3640–3738 (99f) | 2988–~3071 (~84f) | Roughly comparable, not stride-1 pinned this session |
| Player send-out text hold | 4003–4042 (40f) | 3329–3363 (35f) | Roughly comparable |
| Box closes into action menu | 4043–4048 (6f) | 3364–3369 (6f) | **Same duration** |
| Ready-cycle period | 36f, 4-phase | ≈33f, 4-phase | Roughly comparable |
| **First ready frame** | **4049** | **3370** | **679f shorter** (was reported as 2160f shorter under the stale capture) |

The swirl-pause and black-flash holds are **sha-identical** to the stale
capture's own values for those stages — direct proof this shared transition
art was never actually affected by the bug; only the content *before* it
(the walk-up dialogue) was wrong.

### 4′. App divergence measurement (this session, oracle post-fix)

`npm run compare -- factory-round-battle7-noland-gold-reveal-off.json
--summary` now reports **0/701 frames matched** (was 700/701 against the
stale oracle — see `PROGRESS-archive.md`). Frame 0 already mismatches at
88.90% diff (34137px, bbox 1,0-238,159, ssimMean 0.0934) and stays wrong
through frame 700 (final frame: 96.74% diff, 37147px). Root cause: the
compare trace (`tools/compare/traces/factory-round-battle7-noland-gold-
reveal-off.json`) pins `oracleBattleLab.preCheckpointFrameOffset: 1151` — a
frame number calibrated against the **stale** timeline, where 1151 sat
inside the black-flash hold just before the pic-reveal fade-in (see the
Appendix's §1 row `1150–1193`). Post-fix, that same absolute oracle frame
1151 now falls **inside Noland's newly-revealed personality speech**
(within the ~962–2439 span above) — a completely different scene. The
app's own stage (`generatedRoundBattle7NolandGoldRevealStage` →
`generatedGoldRoundRevealProofStage` →
`beginFactoryRoundBattleStartIntro`/`battleIntroSceneAssemblyDisplayLag` in
`tools/compare/factoryRoundIntroGeneralizationStage.ts`) starts its own
presentation directly at the transition/reveal, matching what the *stale*
oracle showed — so app-frame-0 (transition/reveal content) is now being
diffed against oracle-frame-1151 (mid-personality-speech content), and
every one of the 701 frames in the window mismatches because the two sides
are depicting entirely different scenes, not a small pixel-level drift.
This is **not** a regression to fix in this step — it is the expected,
honest consequence of the oracle now telling the truth; the fix belongs to
whichever later step implements gold's real walk-up presentation (recalibrating
`preCheckpointFrameOffset` alone would not be enough — the app doesn't
render the personality-speech scene at all yet).

### 5′. What the gold walk-up program will need (confirmed by these captures)

- **A real, rendered personality-speech scene for gold**, source-pinned as
  4 pages (`factory-brain-walkup-script.json`,
  `tests/factoryBrainWalkupScript.test.ts`) — distinct from silver's 8-page
  speech, not a no-op. The app currently has no presentation stage for it
  (`beginFactoryRoundBattleStartIntro` jumps straight past it).
- **Escort box 2's text is Brain-specific**, not the generic ordinary-
  trainer "Right this way, please!" — it reads "Hey, hey! Get a move on!",
  identical wording to silver's. Escort box 1 (front-desk lobby, "Right
  this way, please!") is unaffected — the divergence is isolated to the
  arena-entrance box.
- **Timing is data, not hardcoded**: the compare harness's
  `preCheckpointFrameOffset: 1151` constant is now provably wrong and will
  need to move once real speech rendering lands (approximately +1481f,
  though the precise post-speech offset should be re-derived from a real
  implementation, not backed into this constant blind).
- **No new engine mechanism is needed** — every downstream stage
  (transition swirl, black flash, pic reveal, both send-outs, ready loop)
  is confirmed byte-identical shared code to both silver and the stale
  gold capture; this is purely a content/timing gap in the walk-up
  dialogue portion, the same mechanism silver's dossier already documents.
- **Open follow-up, not resolved this session**: the opponent-send-out
  text hold's precise boundary (between ~3072 and 3328) was not pinned to
  sub-stage precision — a future step doing exact-frame work on this
  window should re-probe that range at stride 1.

### 6′. Reveal compare-trace recalibration (2026-08-16, side lane)

`tools/compare/traces/factory-round-battle7-noland-gold-reveal-off.json`
pins its own battle-lab scenario
(`tools/battle-lab/factory-round-battle7-noland-gold-reveal-off.json`,
**not** this doc's playerSetIds/seed — it uses `overrides.parties`
(Dugtrio/Tropius/Misdreavus vs Skarmory/Jolteon/Electrode, `seed 2`) to pin
a party matching `generatedGoldRoundRevealProofStage`'s own
`record(564/565/566)` construction, per
`tools/compare/factoryRoundIntroGeneralizationStage.ts`). Recalibration
therefore needed a fresh dense self-diff of *that* scenario, not this doc's
own fixtures — done via a throwaway `preCheckpointCaptureAllFrames: true`
copy of the scenario (`bin/oracle lab`, not committed), confirmed
byte-identical across two independent reruns (all 3467 frames, 0–3466).

**Offset derivation, by content not arithmetic.** The app's own frame 0 for
this trace is a solid-black frame (raw-RGB sha `d8b443032200e143…`, verified
by hashing `app-00000.png`'s decoded pixels the same way the oracle hashes
its framebuffer). That sha is content-ambiguous — five separate black holds
share it in this scenario's timeline (frames 3–6, 8–70, 418–431, 621–639,
2722–2766) — so sha alone can't fix the offset. Resolved by exhaustive
search instead: for every candidate offset in the oracle's full pre-checkpoint
range, count how many of the app's 701 captured frames (`app-00000.png`
through `app-00700.png`, hashed the same way) sha-match the oracle frame at
`offset + k`. **`offset = 2732` is the unique global maximum** (334/701),
anchored inside the final black-flash hold (2722–2766) — confirmed by the
app's own black hold lasting exactly 35 frames (0–34) and 2732+35 = 2767,
the oracle's first post-black-flash frame. This also matches the fixture's
prior history (`382473e9`): the old `preCheckpointFrameOffset: 1151` was
likewise anchored inside that scenario's own final black-flash hold, not
an arbitrary tick.

**Result: 334/701, not ~700/701 — a genuine, honestly-characterized
residual, not a forcing failure.** Frames 0–333 (the black flash tail plus
the entire "unique every frame" battle-scene fade-in/send-out-pic-slide-in
span) match **byte-for-byte**. The mismatch begins sharply at app frame 334
(oracle frame 3066): the app is still holding "FACTORY HEAD NOLAND would
like to battle!♥" (PNG-identical to app frame 333) while the fresh oracle
has already moved on to the box-clearing transition. Root cause, pinned by
direct frame-content inspection of the fresh self-diff: the **pic-reveal
hold's own duration changed** as a side effect of the `4dac4a35` fix, not
just its absolute position. For this scenario the fresh oracle's hold
(`c465f0`/`e7694d`/`a4c9ba` cycling) runs **82 frames** (2984–3065, 9
sub-phases) before the transition-out begins at 3066; the app renders **142
frames** (252–393 relative, i.e. 16 sub-phases) before it starts its own
transition. This is not an artifact of this session's recalibration — it
corroborates the doc's own §3′ table, which independently shows gold's
pic-reveal hold at **134f pre-fix** (Appendix §1, a *different*
non-overridden-party fixture) shrinking to **~84f post-fix** (§3′) — the
same roughly-134→84 shrink this reveal-compare scenario shows (142→82,
close given the differing party/text). So the §0′(c) headline claim that
downstream presentation is "sha-identical shared code, unaffected by the
fix" holds for the pic-reveal's *content* (same three cycling shas, same
wording) but **not for this one hold's duration** — a real, reproducible
(2 independent fresh reruns, byte-identical) behavior change, not a
calibration error. Fixing the app to match requires an app-side (`src/`)
change to `battleIntroSceneAssemblyDisplayLag` or wherever the gold
pic-reveal hold length is derived — out of scope for this side-lane step
(no `src/` edits) and left for a follow-up. The offset itself
(`preCheckpointFrameOffset: 2732`) is correct and committed; the residual
below it is a real app bug newly exposed by the oracle fix, not a
mis-calibration.

Reproduce: `npm run compare -- factory-round-battle7-noland-gold-reveal-off.json --summary`
→ `334/701 frames matched`.

### 7′. Gold 4-page speech dense ground truth (2026-08-16, side lane)

Three new battle-lab fixtures, same reproduction params as this doc's §1′
table (`playerSetIds [564, 565, 566]`, `seed 305419896`, `challengeNum 5`),
each run twice fresh via `bin/oracle lab tools/battle-lab/<name>.json -o
<dir> --quiet` and diffed frame-by-frame for byte-identity (0 diffs, all
three) before being committed. Frame numbers are this doc's own
pre-checkpoint coordinate space (§1′), stride-1 confirmed for every frame
listed below (no `~` approximation in this section).

**`factory-brain-gold-speech-open-off.json`** (256 frames, stride-1,
950–1205) — escort box 2's hold tail through page 1 settling:

| Frames | Len | Content |
| --- | --- | --- |
| 950–960 | 11f hold (`7d8066240c8e6514`) | Escort box 2 tail, "Hey, hey! Get a move on!" — same sha §1′ already cites for the full 690–960 hold. |
| 961–1040 | 80f, unique every frame | Escort box dismissed, page 1 typewriter printing "NOLAND: Hey, hey! How's it going? You keeping up with your studies?". |
| 1041–1045 | 5f, two short holds (`f316e3b9…` 3f, `d50c7abb…` 2f) | Brief pause mid-typewriter (name-box beat) — not individually explained this session, flagged as an observed sub-event. |
| 1046–1050 | 5f hold (`31aec4d68fe629cb`) | Same sha as the post-speech dialogue-dismissed pause (§1′'s 2531–2557) — a content-independent "no box" frame recurring mid-print, not a second dismiss. |
| 1051–1118 | 68f, unique every frame | Typewriter resumes, page 1 finishes printing. |
| **1119–1205** | cycling `a25a760854eb915c`/`3647b6ae68b9631b`/`c1cddebfb075adfa`/`3647b6ae68b9631b`, 4-phase, 36f period | **Page 1 settled, held** (PNG-verified at 1200: "NOLAND: Hey, hey! How's it going? You keeping up with your studies?"). Window ends mid-hold (page 1's hold continues past 1205; full extent captured is 1119–1541, see below). |

**`factory-brain-gold-speech-pages-off.json`** (177 frames, sparse +
stride-1 edges, 1535–2390) — page 1→2→3→4 transitions and each page's hold:

| Frames | Len | Content |
| --- | --- | --- |
| 1535–1541 | 7f (tail of page 1's hold) | Page 1 still held (same 4-phase cycle as above). |
| 1542–1547 | 6f, unique every frame | **Page-advance edge 1→2** (box wipe). |
| 1548+ (anchors 1548, 1600, 1700, 1800, 1900, 2000, 2100) | cycling `bdc11865141713ee`/`320337365e0525de`/`13a6bc29459a4c8f`/`320337365e0525de`, 4-phase, 36f period | **Page 2 settled, held** (PNG-verified at 1800: "...Oh?♥"). |
| 2120–2128 | 9f (tail of page 2's hold) | Page 2 still held. |
| 2129–2187 | 59f, unique every frame | **Page-advance edge 2→3** — longer than edge 1→2 (59f vs 6f), not explained further this session. |
| 2188–2195, 2220, 2250–2259 | cycling `e12727286abcf09c`/`1947fc456729f02c`/`b8f4c2dea3e13f99`/`1947fc456729f02c`, 4-phase, 36f period | **Page 3 settled, held** (PNG-verified at 2220: "You've taken on a harder look than the last time I saw you.♥"). |
| 2260–2262 | 3f (tail of page 3's hold) | Page 3 still held. |
| 2263–2310 | 48f, unique every frame | **Page-advance edge 3→4**. |
| **2311–2320, 2350, 2390** | static, single sha (`ab880d96dcf4c641`), no cycling | **Page 4 settled, held** (PNG-verified at 2350: "Now, this should be fun! I'm getting excited, hey!♥") — notably **does not blink/cycle** like pages 1–3 (one constant framebuffer the entire hold), an asymmetry not explained further this session. |

No distinct "battle-cry" box exists between pages — the 4-page block
(confirmed 4 pages: "Hey hey/how's it going", "...Oh?", "harder
look/last time I saw you", "should be fun/getting excited") is immediately
followed by the separate "All right! Bring it on!" line (§7′'s third
fixture below), matching `factoryBrainWalkupScript.test.ts`'s "4-page"
pin — there is no fifth pre-transition box.

**`factory-brain-gold-speech-close-off.json`** (126 frames, stride-1,
2495–2620) — final box settle → dismiss → pause → flicker onset (the
close/handoff edge):

| Frames | Len | Content |
| --- | --- | --- |
| 2495–2530 | 36f (tail of a longer hold; full extent 2420–2530 per this session's earlier all-frames probe) | **Final box settled**, "All right! Bring it on!" (sha `f0d9bf0629eb1c8a`, PNG-verified at 2450) — the distinct one-box line following the 4-page block, matching §1′'s citation exactly. |
| **2531–2556** | 26f hold (`31aec4d68fe629cb`) | Dialogue box dismissed, empty-arena pause — exact stride-1 match to §1′'s "2531–~2557" estimate. |
| 2557–2611 | 55f, 8-phase flicker (`ce3e94fa`/`1173fa84`/`0c9105c5`/`b27ee11b`/`322a51e5`/`ed2e01a0`/`9ea9d972`/`ec073b9c`, period 16f, with the same `31aec4d68fe629cb` "empty" sha recurring once per loop at the cycle's low point — coincidental reuse, not a second dismiss) | Pre-transition screen flicker; ends in a genuine 8-frame hold (2604–2611) at the same sha, then breaks into unique frames. |
| 2612–2620 | 9f, unique every frame | Swirl transition building up (handoff out of the speech scene). |

Re-run commands (twice each, byte-identical both times):
```sh
bin/oracle lab tools/battle-lab/factory-brain-gold-speech-open-off.json -o /tmp/a --quiet
bin/oracle lab tools/battle-lab/factory-brain-gold-speech-pages-off.json -o /tmp/b --quiet
bin/oracle lab tools/battle-lab/factory-brain-gold-speech-close-off.json -o /tmp/c --quiet
```

### 8′. CLOSE WIPE model (2026-08-16, side lane) — generic msgbox close + flicker overlay

Two things were previously missing/wrong, both now fixed in `src/`:

1. **The msgbox's own on-screen clear was coupled to its owning phase's
   elapsed-based STATE transition** (`MSGBOX_CLOSE_TICKS`), when the real
   game decouples the two. Two probe-derived, per-phase corrections (see
   `src/engine/battleRoom.ts`'s `BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS`
   doc for the full citations):
   - `brainMsgboxClosing`→`brainMoving` (the entrance escort box): the box
     lingers through `brainMoving`'s own first two (still RAM-flat) elapsed
     ticks, clearing exactly when the room starts visibly panning — fixed
     `factory-brain-silver-walkup-entrance-03-off.json` 242→**244/256**
     (frames 319-320 closed).
   - `brainSpeechClosing`→`brainSpeechSettled` (the close/cry box, both
     tiers): clears immediately, matching `DoNolandBattle`'s `closemessage`
     running as the very next script command with no intervening
     `waitmessage`/`applymovement` (unlike the escort box's own script
     shape) — fixed the first 4 frames of this section's own
     `factory-brain-gold-walkup-speech-close-off.json` residual.
2. **The screen-flicker + circle-transition overlay (§7′'s row
   2557–2611/2612–2620) was never wired into the brain walk-up's render
   path at all** — `renderBattleRoomState`'s `frontierBrainWalkup` branch
   (`src/engine/core.ts`) only ever drew the flat post-fade-in scene, never
   the shared `battleTransition.ts` overlay the ordinary (non-brain)
   `"settled"` phase already plays for every other Frontier encounter. Now
   wired: `brainSpeechSettled` layers the same `frontierTransitionBgFadeY`/
   `ObjFadeY`/`applyBattleTransitionOverlay` calls, `te` re-based to 0 at
   `brainSpeechSceneHandoffElapsed` (the tick the empty-arena pause ends);
   `battleRoom` also now stays alive through the transition's own full run
   (`BATTLE_2_SCENE_HANDOFF_ELAPSED` past that point, the same constant the
   ordinary path already waits out for this shared transition) instead of
   nulling out the instant the pause ends, which previously cut the
   transition off before it could render at all.

**Result:** `factory-brain-gold-walkup-speech-close-off.json` 58→**80/126**
(reproduce: `npm run compare -- factory-brain-gold-walkup-speech-close-off
.json --capture-range 0:125`, stride-1). Frames 0–61 (idle hold through the
empty-arena pause) are exact. From frame 62 (flicker onset) the picture is
a clean, periodic near-miss, not noise: frames 62–76 and 78–92 mismatch at
100% (a full-frame gray-blend-level difference) except frame 77, which
matches exactly; frames 93–109 (17 consecutive frames) match exactly, then
110–124 mismatch the same way 62–92 did, and 125 is close but not exact
(4.28% diff). This shape (mismatch, one clean hit, mismatch, a longer
clean run, mismatch again) is consistent with our own `grayFlickerY`
16-tick-period oscillation running slightly OUT OF PHASE with oracle's -
periodically crossing into alignment rather than being wrong in kind. Two
explicit realignments were tried this session to close the phase gap and
BOTH scored worse than the untouched version (`te = b.elapsed -
brainSpeechSceneHandoffElapsed(b)`, no further correction, 80/126):
- `te = b.elapsed` (no pause offset at all, relying on `battleTransition
  .ts`'s own `FLICKER_START_TE=28` to gate the pause): 69/126.
- `te = b.elapsed + 2` (28-vs-26 gold/silver pause-length correction,
  aligning gold's shorter empty-arena pause to the shared `FLICKER_START_TE`
  constant): 71/126.

Since guessing further offsets is exactly the failure mode this step's own
brief warned against (a prior attempt regressed gold-close to 37/126 this
way), the best-scoring, simplest form (no `FLICKER_START_TE` realignment)
is what's committed, and the remaining phase gap is left for a follow-up
that dense-probes `factory-brain-gold-speech-close-off.json`'s oracle
frames 2557–2620 at stride 1 against `grayFlickerY`'s own tick-by-tick
gray-blend coefficient (not just sha-compare) to find the true phase
origin, rather than bisecting compare-tool match counts blind.

Both residuals are left honest rather than fitted further — per this
step's own brief, a prior attempt at this exact model regressed gold-close
to 37/126 by guessing the wipe's shape instead of deriving it; the
improvements above (58→80/126, entrance-03 242→244/256) are the portion
that is fully probe/source-grounded, and every cited bar (gold open
58/256, gold pages 53/177, entrance-02 256/256, all four B2 speech
windows, speech-close-pause 28/28, callscene-01 131/131, both reveal
fixtures 690/701) was reverified unmoved after this change (full `npm
test` + `npm run build` + `executableFrontierRatchet` also green). A
follow-up step should dense-probe `factory-brain-gold-speech-close-off
.json`'s own oracle frames 2557–2620 at stride 1 against the app's
`grayFlickerY`/circle-sprite math tick-by-tick (not just sha-compare) to
isolate the two remaining mechanisms precisely.

### 8″. Gold-close flicker phase gap CLOSED (gray component): 80→113/126, true `te` origin derived from the oracle's own per-frame blend coefficient, not bisected (2026-08-17, main worker)

Per §8′'s own explicit follow-up instruction: dense-probed the oracle's real
per-frame gray-flicker coefficient (not sha-compare, not compare-count
bisection) to find the true `te` origin.

**Extraction.** `tools/battle-lab/factory-brain-gold-speech-close-off.json`
already bakes a stride-1 `preCheckpointCaptureFrames` list for abs frames
2495–2620 (matches the compare trace's own `preCheckpointFrameOffset:
2495`), so one fresh `bin/oracle lab` run produces every PNG needed:
```sh
bin/oracle lab tools/battle-lab/factory-brain-gold-speech-close-off.json -o /tmp/gold-close-probe --quiet
```
Sampled pixel (2,2) - a pure-black corner background pixel, always outside
the circle sprites' slide path for this whole window - from every PNG.
`grayFlickerY`'s blend target is `blendComponentToGray`'s own formula
(`faded5 = c5 + ((11-c5)*y)>>4`, GRAY_TARGET5=11) and `grayFlickerY` itself
only ever emits **even** `y` (0-16), so for a pure-black pixel (`c5=0`) the
map `y -> faded5` (`{0:0, 2:1, 4:2, 6:4, 8:5, 10:6, 12:8, 14:9, 16:11}`) is
injective - the observed 8-bit red channel inverts to an *exact*, unambiguous
`y` every frame, no interpolation needed. Cross-checked against a
peak-brightness frame (abs 2564/2580/2596, all sampled `(90,90,90)` at
several unrelated background/foreground points) confirming `y=16` drives
every pixel to the identical target color regardless of original content -
independent proof the formula/target used to invert is right.

**Banked sequence** (abs frame → `y`, trace-relative = abs − 2495):
| Abs range | Trace-relative | `y` |
| --- | --- | --- |
| 2495–2556 | 0–61 | flat 0 |
| 2557–2572 | 62–77 | 2,4,6,8,10,12,14,16,14,12,10,8,6,4,2,0 (cycle 1) |
| 2573–2588 | 78–93 | same 16-tick triangle (cycle 2) |
| 2589–2604 | 94–109 | same 16-tick triangle (cycle 3) |
| 2605–2620 | 110–125 | flat 0 (flicker over, stays off) |

This is `grayFlickerY`'s own triangle shape exactly (3 full 16-tick cycles,
`FLICKER_END_TE − FLICKER_START_TE = 48 = 3×16`), just starting at
trace-relative frame 62, not wherever the committed `te` re-basing put it.

**True origin.** A second probe
(`tools/compare/scratch/gold-close-phase-probe.ts`, committed) replays this
exact compare trace through the *real* engine
(`createInitialState`/`tick`/`render`, the same path `tools/compare/
appTrace.ts` uses) and confirms two things a doc-only read can't: (1)
`brainSpeechSettled`'s own `elapsed=0` lands at trace-relative frame **40**,
not 36 as a naive read of §7′'s "2531–2556 pause" table would suggest -
`brainSpeechClosing` (whose box-clear is visually immediate, `msgboxVisual`'s
existing `MSGBOX_HIDDEN` case) still holds the *phase transition* itself for
`MSGBOX_CLOSE_TICKS=4` ticks (trace-relative 36–39) before handing off; (2)
the previously-committed `transitionElapsed = b.elapsed −
brainSpeechSceneHandoffElapsed(b)` therefore put `te=0` at trace-relative 66
and `te=28` (`FLICKER_START_TE`, where `grayFlickerY` first goes nonzero) at
trace-relative **94** - 32 frames later than the oracle's real onset (62).

Reproducing "ticks since the box's real visual dismiss" (`b.elapsed +
MSGBOX_CLOSE_TICKS`) and re-basing so gold's own shorter pause lines up with
the shared overlay's flicker-start constant (`− handoff_gold(26) +
FLICKER_START_TE(28)`, net **+32**, i.e. `te = b.elapsed + 6`) reproduces
the ENTIRE banked sequence above with **0/126 mismatches** end-to-end
through the real render path (probe script output: `checked 126 frames, 0
mismatches`). Implemented as `goldRebaseTe = MSGBOX_CLOSE_TICKS +
frontierTransitionFlickerStartTe(transitionKind)` in
`renderBattleRoomState` (`src/engine/core.ts`), added only to gold's own
`transitionElapsed`; `frontierTransitionFlickerStartTe` is a new small
`battleTransition.ts` export mirroring `grayFlickerY`'s own per-family start
constant (28 circlesMeet / 25 asymmetricSpiralInSeq / 34 logoWave) instead of
hardcoding 28 in `core.ts`.

**Result:** `factory-brain-gold-walkup-speech-close-off.json` **80→113/126**
(frames 0–112 now exact; reproduce: `npm run compare -- factory-brain-gold-
walkup-speech-close-off.json --summary`).

**Tried, reverted (decisive negative, not blind):** applying the identical
correction tier-generally (silver's `handoff` already equals
`FLICKER_START_TE`, so the "clean" reduction is `te = b.elapsed +
MSGBOX_CLOSE_TICKS` for silver too) regressed the one committed silver guard
that reaches this codepath, `factory-brain-silver-walkup-speech-close-pause
-off.json`, **28→24/28** (frames 26-27 started flickering while the real
oracle is still flat) - silver's real onset does **not** track the same
"pause exactly equals FLICKER_START_TE ⇒ zero extra correction beyond the
closing lag" reduction the algebra suggested, even though the reduction's
premise (pause=28=FLICKER_START_TE) is true. Silver has no dense fixture
past its own pause boundary to derive its *own* correction (its one window
ends exactly at frame 27), so the fix stays **gold-only**
(`b.brainSpeechTier === "gold" ? goldRebaseTe : 0`) rather than fitted blind
- a follow-up with its own dense post-pause silver capture (mirroring
`factory-brain-gold-speech-close-off.json`) is the honest next step for
silver's own flicker window, not attempted this session.

**Residual (113–125, 13 frames): a second, distinct onset, not this
session's mechanism.** The flicker component is now proven exact on the
corrected `te` clock, and `applyBattleTransitionOverlay` uses that SAME `te`
for the circle sprites (`CIRCLE_ANCHOR_TE=78`), so the circle slide should
already be correctly timed by construction - it isn't. A raw PNG diff of
consecutive oracle frames (abs 2611→2620, i.e. trace-relative 116-125) shows
the real top-circle sprite's first pixel appearing at **row 0** around
trace-relative **117** (12px at x=114-125, growing to a 660px, y=0-32 wedge
by frame 125) - while the app, using `te = trace-relative_frame + 6 − 40
+ ...` = `CIRCLE_ANCHOR_TE`-relative math, already draws a sliver from
trace-relative ~113. A companion check of oracle row 159 (the bottom row,
where the faster-converging left/right circle sprites should appear first
per `CIRCLE_SPECS`) found **zero** circle-sprite pixels through frame 125 -
the real circle-transition onset in this brain-close context is later than
`CIRCLE_ANCHOR_TE=78` on the very `te` clock that made the flicker exact,
i.e. a genuine second mechanism (the circle overlay's own onset,
independent of the flicker's), not another instance of this session's
re-basing bug. Left honestly unfixed - the acceptance bar for this step was
"strictly improved, remaining mismatch set listed," not full closure, and
guessing a second offset here without its own dense per-frame derivation is
exactly the failure mode both this step's brief and §8′ warned against.

**Control (step 4 of the method): shared machinery reverified untouched.**
The ordinary (non-brain) Frontier "settled" path plays the identical
`battleTransition.ts` overlay with no re-basing (`b.elapsed` fed directly).
Reran both its own exact committed windows after this change:
`factory-round-battle7-noland-reveal-off.json` and `factory-round-battle7-
noland-gold-reveal-off.json`, both **690/701 unmoved** (same bar §8′ cited) -
confirms the shared machinery itself needed no change; only the brain-path
re-basing layer did, as the step's own priors (two prior blind realignments
both scoring worse) already pointed to.

**Guard matrix, all reverified fresh via `npm run compare -- <trace>
--summary` after this change:** gold-pages 177/177, silver box-2 100/100,
gold-open 254/256 (unmoved, out of scope - frames 58/95, a side probe's
own item), entrance-02 256/256, entrance-03 254/256 (unmoved, out of scope),
callscene-01 131/131, callscene-02 199/199, B2 speech box0-held 39/39 /
cry-held 74/74 / page8-held 39/39 / close-pause 28/28, both reveal control
windows 690/701. Full `npm test` (1065 files / 10010 passed / 223 skipped,
unmoved), `npm run build`, `npm run typecheck` green;
`executableFrontierRatchet` barrier counts unmoved.

### 8‴. Silver's own `te` origin landed: 32→79/100, confirms "no re-basing" is not a scaled-down gold shape (2026-08-17, main worker)

§8″'s own "Tried, reverted" paragraph left silver's flicker window unfixed
pending its own dense post-pause capture. `docs/silver-flicker-evidence.md`
(banked this session) supplies that capture
(`factory-brain-silver-walkup-speech-flicker-off.json`, 100 stride-1 frames,
abs 3201–3300) and derives silver's true `te` origin the same way §8″ derived
gold's: per-frame gray-flicker coefficient inversion, not bisection. Verdict:
`y = grayFlickerY(te)` matches exactly with `te = b.elapsed` **directly** —
no re-basing at all, the SAME rule the ordinary non-brain "settled" path
already uses (§8′'s own control step). This is a genuinely different shape
from gold's `+6` correction, not a `+0`-coefficient instance of it: silver's
own pause (28) happens to equal `FLICKER_START_TE` (28), so the closing-lag
term gold needs (`MSGBOX_CLOSE_TICKS`) has nothing left to compensate for at
this measurement — confirmed, not assumed, by the dense capture (silver-
flicker-evidence.md's own Verdict (b) shows applying gold's structural form
to silver instead regresses the close-pause guard 28→24/28).

**Implemented:** `renderBattleRoomState` (`src/engine/core.ts`) now branches
`transitionElapsed` on `b.brainSpeechTier`: gold keeps §8″'s `b.elapsed −
brainSpeechSceneHandoffElapsed(b) + goldRebaseTe`; silver takes `b.elapsed`
directly (no term at all, matching the ordinary path's own rule) rather than
the previous `(tier === "gold" ? goldRebaseTe : 0)` single-ternary shape.

**Result:** `factory-brain-silver-walkup-speech-flicker-off.json`
**32→79/100** — frames 0–78 now exact, covering the ENTIRE gray-flicker span
(elapsed 28–75 per silver-flicker-evidence.md's banked table) with zero
mismatches. Mismatches resume at frame 79 onward (21 frames, 79–99) — past
the flicker, in the circle-sprite build region (te 79+, one tick past
`CIRCLE_ANCHOR_TE=78`) — the SAME distinct second mechanism §8″'s own
Residual paragraph identified for gold (113–125), not a bug in this fix; left
for rung 2 (see silver-flicker-evidence.md's own update for the cross-tier
check).

**Guard matrix, reverified fresh:** gold-pages 177/177, silver box-2
100/100, gold-open 256/256, entrance-03 256/256, entrance-02 256/256,
callscene-01 131/131, callscene-02 199/199, gold close-edge 54/54, silver
cry-edge 75/75, B2 box0-held 39/39 / cry-held 74/74 / page8-held 39/39 /
close-pause 28/28, askready 21/21, gold-close 113/126 (unmoved). Full `npm
test` (1065 files / 10011 passed / 223 skipped, unmoved), `npm run build`,
`npm run typecheck` green; `executableFrontierRatchet` barrier counts
unmoved.

### Rung 2 attempt (2026-08-17, main worker): circle-sprite onset residual NOT safely unifiable — documented, not fixed

Attempted the circle-sprite onset residual (gold 113–125, silver's own
79–99 from §8‴) per this step's brief: derive the true onset per tier from
the already-banked oracle PNG sets and check whether both tiers show the
SAME onset delta on their verified `te` clocks.

**Method.** Full-frame scan (`tools/compare/scratch/circle-onset-probe.mjs`,
then widened to `circle-onset-probe2.mjs`, both committed) of every banked
PNG in gold's own §8″ span (`/tmp` re-run of `factory-brain-gold-speech-
close-off.json`, abs 2495–2620) and silver's flicker fixture (`factory-
brain-silver-walkup-speech-flicker-off.json`, abs 3195–3300) for pixels
matching the circle sprite's own distinctive palette colors
(`battle-transition-frontier-circles.json`), excluding black/white/gray
(those three also occur in the baseline scene, so they're not
discriminating). Cross-checked the exact `te` at each hit via a fresh direct
engine probe (`tools/compare/scratch/gold-te-verify.ts`, committed) rather
than trusting hand-converted numbers from §8″'s prose.

**Findings — the two tiers' divergences are not the same shape, only
coincidentally the same tick.**

- **Gold:** first circle-palette pixel at abs 2613 (trace-relative 118).
  Direct engine probe confirms `brainSpeechSettled` elapsed=78 at that
  frame, so `te = elapsed + 6 = 84` (6 ticks past `CIRCLE_ANCHOR_TE=78`).
  The hit is a **small 28-pixel sliver**, bbox `x=111–128, y=0–1` — exactly
  the shape a slowly-arriving top sprite predicts (the circle's bottom tip
  just poking onto row 0), consistent with the existing slide-in model
  needing only a small `te` offset.
- **Silver:** first circle-palette pixel at abs 3280 (elapsed/te 79
  directly, this step's own verified silver clock). But the hit is **2568
  pixels**, bbox spanning the **entire screen width** (`x=0–239, y=30–87`)
  — not a sliver, a large block appearing between one frame and the next
  (abs 3279 has zero circle-palette pixels; abs 3280 already has 2568).
  This is not explainable by the same "sprite slides in from off-screen,
  `te` just needs a constant shift" model gold's residual fits — no single
  `CIRCLE_ANCHOR_TE` offset turns a sliver-onset model into an abrupt
  full-width block.
- **Coincidence, not evidence of a shared mechanism:** the render-level
  compare tool's own full-frame mismatch (any pixel wrong, not just
  circle-palette pixels) begins at **exactly `te=79` for both tiers** (gold:
  compare-frame 113, elapsed 73, `te=79`; silver: compare-frame 79, `te=79`
  directly) — one tick past `CIRCLE_ANCHOR_TE=78`. This looked at first like
  the tier-general signal the brief asked for, but the underlying oracle
  content at that tick has a different character per tier (gold: nothing
  yet, matches the sliver's own slightly-later true onset; silver: already
  a large block), so the shared tick number is not trustworthy as "the same
  mechanism, fix once."

**Conclusion: split documented, no numeric fix landed.** Per the rung's own
decision tree ("if they differ ... document the split precisely and stop"),
no `CIRCLE_ANCHOR_TE` or per-tier constant change was made this session —
guessing a shift here without understanding silver's abrupt-block shape
would repeat exactly the failure mode `MSGBOX_CLOSE_TICKS`/blind-realignment
history (§8′/§8″) already warns against, and silver's own newly-landed
flicker fixture (§8‴, `factory-brain-silver-walkup-speech-flicker-off.json`)
is the regression canary any such attempt would need to clear. **Next
session's honest starting point:** silver's abrupt full-width jump between
abs 3279→3280 needs cross-referencing against
`reference/pokeemerald/src/battle_transition_frontier.c`'s real sprite
creation/movement code to identify what's actually different about silver's
path (a genuinely distinct, not-yet-identified mechanism, not simply "the
same slide-in circles a few ticks later") before any offset is tried;
gold's own sliver-shaped residual (113–125) remains the better-understood,
lower-risk piece if a future session wants to isolate and fix only gold's
own small `+6`-relative correction without touching silver.

**Guard reruns (fresh, this step, docs/scratch-only — no `src/` edit):**
`factory-brain-silver-walkup-speech-flicker-off.json` unmoved at 79/100 (the
rung-1 result), `factory-brain-gold-walkup-speech-close-off.json` unmoved at
113/126.

### Rung 3 (2026-08-17, main worker): SOURCE identification — the walk-up path never draws the real per-encounter transition selection; root cause found, fix is genuinely multi-piece, not attempted

Per this step's brief, method steps 2-3: found how the real ROM selects the
Battle Factory's battle-start transition for an ordinary opponent vs. the
Frontier Brain, and reconciled that against what this engine currently does.
**Conclusion: this is category (a)/(b) hybrid — the SELECTION is unwired
for brain battles (a confirmed, citable engine bug, independent of either
tier's specific pixel shape), but wiring the correct fix touches enough
surface area (a cross-cutting RNG-architecture reconciliation, plus possibly
a new renderer) that it does not fit "≤2 bounded pieces reusing existing
machinery" — documented and stopped per the brief's own (b) branch, not
implemented.**

**Source: brain battles and ordinary Factory battles draw from the
identical random table, no brain-specific override.**
`DoSpecialTrainerBattle`'s `SPECIAL_BATTLE_FACTORY` case
(`reference/pokeemerald/src/battle_tower.c:2093-2100`) calls
`FillFactoryTrainerParty()` then unconditionally
`BattleTransition_StartOnField(GetSpecialBattleTransition(B_TRANSITION_GROUP_B_FACTORY))`
— no `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN` check at this call
site (contrast `SPECIAL_BATTLE_DOME`'s own case three lines above, which
*does* branch on `TRAINER_FRONTIER_BRAIN`, but only to resize the party fill,
never to change the transition call). `GetSpecialBattleTransition`
(`battle_setup.c:864-908`) for any non-Pyramid/Dome/TrainerHill/SecretBase/
EReader group (which `B_TRANSITION_GROUP_B_FACTORY` is) returns
`RANDOM_TRANSITION(sBattleTransitionTable_BattleFrontier)` =
`table[Random() % 12]` — one `Random()` call against the same 12-entry table
(`battle_setup.c:131-145`: LOGO_WIGGLE, LOGO_WAVE, SQUARES, SQUARES_SCROLL,
CIRCLES_MEET, CIRCLES_CROSS, CIRCLES_ASYMMETRIC_SPIRAL,
CIRCLES_SYMMETRIC_SPIRAL, CIRCLES_MEET_IN_SEQ, CIRCLES_CROSS_IN_SEQ,
CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ, CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ) —
regardless of whether the opponent is an ordinary trainer or the Brain. So
per source, there is no tier- or brain-specific transition table; both
gold's and silver's brain fights are single independent random draws from
the exact same 12-entry pool any other Factory battle uses, and the app's
own `selectFrontierTransition`/`pickFrontierTransition`
(`src/engine/battleTransition.ts`/`opponentGen.ts`) already model that draw
correctly — this table/RNG derivation is not the bug.

**Engine bug: the walk-up path never fires that draw at all.**
`renderBattleRoomState`'s brain branch (`src/engine/core.ts:2528`) reads
`frontierTransitionRenderKind(b.transitionPresentation, "circlesMeet")` —
correct in shape (reads the real presentation if set, else falls back), but
`b.transitionPresentation` is set exactly once in the whole tick loop's
brain-reachable code path, gated by `opponentSetupExtraRngSteps(battleRoom)
=== 1` (`core.ts:1101-1109`, shared by both brain and non-brain rooms).
`opponentSetupExtraRngSteps` (`src/engine/battleRoom.ts:261`) opens with
`if (state.phase !== "settled") return 0;` — and the brain walk-up room's
own settled-equivalent phase is named `"brainSpeechSettled"`, never
`"settled"` (confirmed by this file's own comment at `core.ts:1163`, "the
brain branch settles into 'brainSpeechSettled', never 'settled'"). So for
every brain encounter, `opponentSetupExtraRngSteps` always returns 0,
`transitionPresentation` is never assigned, and
`renderBattleRoomState`'s brain branch always takes the hardcoded
`"circlesMeet"` fallback — **regardless of what that encounter's real RNG
stream actually drew.** Gold's own residual (a small 28px sliver, rung 2)
being *close* to the circlesMeet model is therefore most parsimoniously
explained as this fixture's real draw happening to land on circlesMeet (or
a close relative) by chance, not as evidence the renderer/anchor is
"almost right" — and silver's abrupt full-width block is exactly what a
*wrong* transition family rendered through the *circlesMeet* sprite-slide
model would produce: nonsense, because the model doesn't apply to whatever
the real draw actually was.

**Why the fix is not a small patch: two separately-derived RNG streams,
one of which already has the party-generation machinery, neither of which
currently draws or carries the transition pick for a brain room.**
`FillFactoryTrainerParty` (`battle_tower.c:1815-1821`) routes
`TRAINER_FRONTIER_BRAIN` to `FillFactoryBrainParty`
(`battle_factory.c:759-826`), a *different* generator than ordinary
trainers' `FillFactoryFrontierTrainerParty` — a `while` rejection loop over
`GetFactoryMonId` (`battle_factory.c:829-865`, one `Random()` call per
candidate) with five data-dependent rejection rules (species-is-Unown,
Level-50 high-tier, saved-rental set-id, duplicate species, duplicate held
item), so the RNG-call count before the post-party `GetSpecialBattleTransition`
draw is not a fixed constant the way `opponentSetupExtraRngSteps`'s
hardcoded `case 26: return 1` shape assumes for the ordinary path. **This
generator already exists, fully source-derived, in this codebase**:
`src/engine/factoryBrainOpponentGeneration.ts`'s `generateFactoryBrainOpponent`
(invoked from `factoryRoundBattleOrchestrator.ts:605`'s `generateOpponentFor`,
both the ordinary and brain branches), and its return value already exposes
the correct post-party RNG cursor (`generation.rngValue`) — so the hard
"how many Random() calls" derivation is *not* missing work. What's missing:
`factoryRoundBattleOrchestrator.ts` never calls `pickFrontierTransition` on
that cursor at all (grepped: zero hits), and `BattleOpponent`
(`src/engine/battleScenario.ts:55-67`) has no field to carry a pre-computed
presentation from the orchestrator's precomputed round data through to
`battleRoomStateForOpponent` (`battleRoom.ts`), which is what actually
constructs the room `core.ts` renders. Meanwhile `core.ts`'s *own*,
separate, tick-level `rngValue` cursor (the one `opponentSetupExtraRngSteps`
currently feeds for the *ordinary* walk-up room) has no visibility into the
orchestrator's precomputed stream at all — these are two independently
threaded RNG views over the same conceptual game RNG, and the existing
ordinary-path guards (gold-open 256/256, entrance-02/03 256/256, etc.)
already depend on the tick-level cursor's current draw *not* being touched.

**Enumeration of what a real fix needs (why this isn't ≤2 bounded pieces):**
1. Thread a `pickFrontierTransition` draw through `generateOpponentFor`
   (`factoryRoundBattleOrchestrator.ts:589`) on `generation.rngValue`,
   for both the ordinary and brain branches, and give `BattleOpponent` (or
   its Factory-specific extension) a field to carry the resulting
   presentation.
2. Wire `battleRoomStateForOpponent` to consume that pre-computed
   presentation for brain rooms, without double-drawing or desyncing the
   *already-correct* ordinary walk-up room's own tick-level draw (the two
   RNG-cursor systems above need reconciling, not just one extended) —
   this is exactly the two-clock-desync failure shape this doc's own
   §8′/§8″ blind-realignment history warns about, so it needs its own
   dense verification, not a guessed wire-up.
3. Once each fixture's real `tableIndex`/`transitionId` is knowable this
   way, cross-check against the 3 render kinds this engine currently
   implements (`circlesMeet` id 34, `logoWave` id 30,
   `asymmetricSpiralInSeq` id 40, i.e. `CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ` —
   `battleTransition.ts`'s `frontierTransitionRenderKind`). If either
   fixture's real draw lands on one of the other 9 table entries
   (LOGO_WIGGLE, SQUARES, SQUARES_SCROLL, CIRCLES_CROSS,
   CIRCLES_ASYMMETRIC_SPIRAL, CIRCLES_SYMMETRIC_SPIRAL, CIRCLES_MEET_IN_SEQ,
   CIRCLES_CROSS_IN_SEQ, CIRCLES_SYMMETRIC_SPIRAL_IN_SEQ), that family's
   renderer needs its own asset extraction + `battle_transition.c`/
   `battle_transition_frontier.c` task-function port — a separate, bounded
   subsystem in its own right, not free once (1)/(2) land.

**One candidate checked and ruled out for silver's shape.** Read
`FrontierSquares_Draw` (`battle_transition.c:987-1004`, the
`B_TRANSITION_FRONTIER_SQUARES` task function) end-to-end: it draws exactly
one `SQUARE_SIZE`×`SQUARE_SIZE` (4×4 tile) block per task tick, raster order
left-to-right/top-to-bottom, i.e. a gradual sweep over ~35 ticks — not an
instant full-width reveal. This does **not** match silver's observed
"zero circle-palette pixels at abs 3279, 2568 pixels spanning the full
screen width at abs 3280" (rung 2) shape, so SQUARES is ruled out as
silver's real transition. The other 8 not-yet-implemented table entries
were not individually checked against source this session (out of time) —
that per-candidate shape check is itself part of the follow-up enumerated
above, once (1)/(2) make the real `tableIndex` for silver's own fixture
computable rather than guessed.

**No code changed.** Per the brief's own decision tree ("if implementing
[the correct renderer] needs more [than ~2 bounded pieces], STOP after
committing the identification + enumeration as docs — that stop is a
successful outcome"), this session stops here: full identification with
citations is committed, no offset or renderer was guessed.
`factory-brain-gold-walkup-speech-close-off.json` and
`factory-brain-silver-walkup-speech-flicker-off.json` remain unmoved at
113/126 and 79/100 respectively (docs-only change, no `src/` edit).

### 9′. Gold-open window closed: two shared-clock mechanisms, not a park-phase constant (2026-08-16, main worker)

The 58/256 gold-open residual this step inherited was **not** the box-corner/
cursor artifact the step brief flagged as the "known sample" — that artifact
was real but was only 22/256 frames of the total gap. The other 176 frames
were a **compare-trace calibration bug**, not a `src/` defect, discovered by
cross-referencing dense pixel diffs against a live `state.elapsed` instrumentation
trace (stepping `createInitialState`/`tick` through the same trace and logging
`battleRoom.phase`/`elapsed` per frame — the same technique used for B1c's own
"render clock" finding, PROGRESS 1296).

**Mechanism 1 — accept-timing miscalibration in the compare trace itself.**
`factory-brain-gold-walkup-speech-open-off.json` parks `battleRoom` directly
in `brainMsgboxIdle` (escort box 2, "Get a move on!", already fully printed —
`generatedRoundBattle7NolandGoldSpeechOpenStage`) and presses A after only 10
wait frames. But the app's own (already-correct, shared) CLOSE WIPE model
(§8′) holds the box visible for exactly 7 ticks after accept (`state.elapsed`
0 through `MSGBOX_CLOSE_TICKS`(4)+`BRAIN_MSGBOX_CLOSE_WIPE_MOVING_HOLD_TICKS`
(2) = 6 more, i.e. accept-tick + 6) before hiding — confirmed algebraically
against `factory-brain-silver-walkup-entrance-03-off.json`'s own already-
committed press/clear pair (press at trace frame 314, clears at 321 = press+7,
sha-cited in §8′'s own doc). Oracle's real gold recording dismisses the box
at absolute frame 961 (this fixture's own `preCheckpointFrameOffset`-relative
frame 11 — stride-1 confirmed, §1′/§7′), independent of when *our* trace
presses A (oracle's pre-checkpoint captures are driven entirely by the
battle-lab scenario's own internal walkthrough, not by the compare trace's
`segments` — `tools/compare/oracleClient.ts`'s `runOracleBattleLab`). Solving
`press + 7 = 11` gives `press = 4`, not 10. **Fix: reduced the trace's own
first wait segment from 10 to 4 frames** (`10,1,245` → `4,1,251`, same total
256) — a trace recalibration, not an engine change, same class of fix §8′'s
own module doc already documents for `entrance-03`'s own A-press timing.
Result: **58 → 234/256** on its own.

**Mechanism 2 — the wait cursor's own onset delay (tier-general, was never
measured).** The remaining 22/256 (the step brief's "known sample") is
`brainSpeechCursorVisible`/`brainSpeechCursorYOffset` — MEASURED this step:
oracle draws **zero** cursor pixels (not offset-0 — fully absent) for the
first 2 ticks of every fresh `brainSpeechIdle` entry, and every later 9-tick
bob-phase boundary is shifted exactly 2 ticks later than a raw
`elapsed`-indexed table lookup predicts. Confirmed independently in **two**
fixtures (ruling out a gold-only artifact): `factory-brain-gold-walkup-
speech-open-off.json` (frames 167/168, 176/177, 185/186, ... every 9 frames)
and `factory-brain-silver-walkup-entrance-03-off.json` (frames 471/472,
480/481, 489/490, ... the identical shape, byte-for-byte pixel readout: rows
142–148 all background in oracle where offset-0 rendering draws a full
glyph). Fix: `CURSOR_APPEAR_DELAY_TICKS = 2`, gating `brainSpeechCursorVisible`
and re-basing `brainSpeechCursorYOffset`'s table lookup onto `elapsed - 2`
(`src/engine/battleRoom.ts`). Tier-general, no gold-only branch — the same
constant closes both fixtures.

**Fixing mechanism 2 exposed a THIRD, adjacent calibration bug**: the B2
speech guard fixture `factory-brain-silver-walkup-speech-box0-held-off.json`
parks `battleRoom` in `brainSpeechIdle` at `elapsed: 0` and pins
`preCheckpointFrameOffset: 1113`, chosen (pre-fix) only to visually match a
"settled" pose — but the true onset (`elapsed 0`, matching this trace's own
park semantics) is oracle frame **1111**, not 1113 (cross-derived from
`entrance-03`'s own now-254/256-confirmed clock: `brainSpeechIdle` begins at
that trace's local tick 471, `preCheckpointFrameOffset` 640, so true onset =
640+471 = 1111). Before mechanism 2's fix, the old (buggy) cursor formula
coincidentally matched oracle's real state 2 ticks into the hold well enough
to pass 39/39; after the fix, it needed the same 2-frame recalibration
`entrance-03` itself already established as legitimate. Fixed: **1113 → 1111**,
restoring 39/39.

**Verified results (fresh `npm run compare -- <trace> --summary` reruns):**

| Window | Before this step | After |
| --- | --- | --- |
| gold-open (`factory-brain-gold-walkup-speech-open-off.json`) | 58/256 | **254/256** |
| entrance-03 (`factory-brain-silver-walkup-entrance-03-off.json`, guard) | 244/256 | **254/256** (bonus — shared fix) |
| entrance-02 (guard) | 256/256 | 256/256 |
| B2 speech box0-held (guard, offset recalibrated) | 39/39 | 39/39 |
| B2 speech cry-held / page8-held / close-pause (guards) | 74/74 · 39/39 · 28/28 | unchanged |
| gold-pages (`factory-brain-gold-walkup-speech-pages-off.json`) | 53/177 | **55/177** |
| gold-close (`factory-brain-gold-walkup-speech-close-off.json`) | 80/126 | 80/126 (unchanged — different mechanism, §8′) |
| callscene-01 (guard) | 131/131 | 131/131 |
| swapask-no (guard) | 194/194 | 194/194 |
| both reveal fixtures (guard) | 690/701 · 690/701 | unchanged |

**Gold-open's remaining 2/256** (frames 58, 95): isolated single-tick
walk-cycle animation-frame boundaries during the Noland/scientist movement
(diff confined to one sprite's pose at one frame each — Noland's own walk
frame at 58, a scientist's turn frame at 95) — the same "single-tick
frame-index boundary" family already named as a parked residual for
entrance-03 frame 368 (PROGRESS 1296), not a new class. Not chased further
this step.

**Gold-pages (53→55/177) does NOT close with mechanism 1 or 2 alone.**
Classified, not fixed: nearly every one of its 177 frames carries a small
(<1%) diff at the wait-cursor's own glyph position (confirmed by direct pixel
inspection — e.g. frame 13's diff isolates exactly the "♥" cursor glyph after
"…Oh?"), i.e. the SAME mechanism 2 defect, but this fixture's own multi-page
`preCheckpointFrameOffset`/hold anchors (1535 for page 1's tail, plus the
page-2/3/4 anchors in §7′) were themselves picked as arbitrary mid-hold
points in one long natural recording, not onset-aligned the way `entrance-03`
and `speech-open`/`speech-box0-held` are — so the cursor's bob phase at each
of those arbitrary oracle frames doesn't line up with the app's own
freshly-parked `elapsed`. Closing this needs per-page onset re-derivation
(the same `true-onset = other-trace's-confirmed-local-tick + its-own-offset`
technique used above for `speech-box0-held`, repeated for pages 2–4's own
anchors) — left for a follow-up, not attempted here to avoid guessing offsets
per the step brief's own caution.

Full `npm test` (9984 passed, 223 skipped, 0 failed — 2 pre-existing
`tests/battleRoomBrainSpeech.test.ts` assertions updated to expect the new,
oracle-correct 2-tick cursor delay), `npm run build`, `npm run typecheck`, and
`tests/executableFrontierRatchet.test.ts` all green; no barrier widened.

### 9″. Gold-pages window: page-1 onset re-derivation + single-line cursor placement (2026-08-16, main worker)

Picked up §9′'s own "needs per-page onset re-derivation" pointer. Two
distinct defects, both tier-general, both MEASURED (not fitted):

**Fix A — page 1's park `elapsed` was not onset-aligned.**
`generatedRoundBattle7NolandGoldSpeechBoxHeldStage` (the stage
`factory-brain-gold-walkup-speech-pages-off.json` parks into) hardcoded
`elapsed: 0` for every `speechStep`, i.e. "just entered this hold." But this
trace's own `preCheckpointFrameOffset` (1535) is deep in page 1's hold tail,
not its onset (§7′: onset is where the typewriter finishes and the box
settles). Derived the true onset the same way §9′'s own `speech-box0-held`
fix did — instrumented the already-verified (254/256)
`factory-brain-gold-walkup-speech-open-off.json` trace
(`createInitialState`/`tick` stepped through its own segments, logging
`battleRoom.phase`/`elapsed` per tick): `battleRoomIdle` first reaches
`elapsed 0` for `speechStep 0` at that trace's own local tick 167 (matches
this doc's own already-committed `CURSOR_APPEAR_DELAY_TICKS` doc comment,
which independently cites "frames 167-168" for the same event). True onset
= 950 (`speech-open`'s own offset) + 167 = abs frame 1117. So the pages
trace's local frame 0 is `elapsed` 1535 − 1117 = **418** ticks into that
hold, not 0. Since `elapsed` in `brainSpeechIdle` only ever drives the
cursor (every later phase transition resets it fresh — confirmed by
reading `advanceBattleRoom`'s own reducer), this is a self-contained,
citable constant with no knock-on effect on timing elsewhere. Added an
`elapsed` parameter to the shared stage helper (default 0, preserving every
other caller — `page4-held`/`close-held` are untouched, still park at true
onset) and passed 418 from the `box0-held` wrapper only, with the full
derivation cited inline.

**Fix B — the wait-cursor always anchored to line 2, even when line 2 was
empty.** `drawBrainSpeechCursor` (`battleRoomRender.ts`) unconditionally
measured and positioned against `MSGBOX_LINE2_ORIGIN` + line 2's printed
text. Every previously-dense-checked cursor-visible box (`entrance-03`,
`speech-open`, B2's `box0-held`/`cry-held`) happens to fill both lines, so
this never showed up. Gold's own page 2 (`GOLD_FIRST_ENCOUNTER_SPEECH_BOXES[1]`
= `["…Oh?", ""]`) is the first dense fixture with a cursor-visible box whose
second line is empty, and direct pixel inspection
(`app-00013.png`/`oracle-00013.png`) showed the oracle drawing the cursor
inline right after "…Oh?" on line 1, while the app drew it at line 2's
fixed (empty) position — a full line low and flush left. Fixed
`drawOpponentMsgbox` to pick whichever line actually holds the last printed
glyph (`line2` if non-empty, else `line1`) and pass that line's own text and
origin to the cursor draw call. Tier-general: silver's own
`SILVER_FIRST_ENCOUNTER_SPEECH_BOXES[2]` (`"I had a look at your Battle Swap
data."`, `""`) is the same shape and was never guarded before either — this
fix covers it too, though no dense silver fixture exists yet to confirm it
pixel-for-pixel.

**Verified results (fresh `npm run compare -- <trace> --summary` reruns):**

| Window | Before this step | After |
| --- | --- | --- |
| gold-pages (`factory-brain-gold-walkup-speech-pages-off.json`) | 55/177 | **85/177** |
| gold-open (guard) | 254/256 | 254/256 |
| entrance-03 (guard) | 254/256 | 254/256 |
| gold-close (guard, untouched mechanism) | 80/126 | 80/126 |
| B2 speech box0-held / cry-held / page8-held / close-pause (guards) | 39/39 · 74/74 · 39/39 · 28/28 | unchanged |
| callscene-01 (guard) | 131/131 | 131/131 |
| entrance-02 (guard) | 256/256 | 256/256 |

Pages 1 and 2 (local frames 0–593, i.e. every captured frame through page
2's own hold tail) now match byte-for-byte. The remaining 92/177 residual is
confined to the page 2→3 and 3→4 **typewriter edges** (local ~594–653 and
~728–776) plus two isolated single-tick frames inside page 3's hold (716,
725) — a *different* mechanism than either fix above: direct pixel check at
local frame 594 (abs 2129, the edge's first captured frame) shows the app's
box still empty while the oracle already shows "Y" (page 3's first
character) printed — the app's typewriter is a tick or so behind oracle's
through these two edges specifically, even though the page 1→2 edge (local
7–12, a short single-line page) matches exactly. This looks like the same
class of press/wipe-timing miscalibration §9′'s mechanism 1 fixed for
gold-open (a trace-side wait recalibration, not an engine defect), but
re-deriving it needs its own oracle-frame cross-reference and was not
attempted this step — left honest per the brief rather than guessed. The
716/725 pair matches the already-named "single-tick frame-index boundary"
residual family (gold-open frames 58/95, entrance-03 frame 368) — not
chased.

Full `npm test` (1056 files, 9984 passed, 223 skipped, 0 failed), `npm run
build`, `npm run typecheck` all green; `tests/executableFrontierRatchet.test.ts`
barrier counts unmoved.

### 9‴. Gold-pages typewriter edges closed 85→175/177: trace recalibration (mechanism a), plus a newly-proven, unfixed engine residual (2026-08-17, main worker)

Picked up §9″'s own "needs its own oracle-frame cross-reference" pointer for
the page 2→3 and 3→4 typewriter edges. Cross-referenced by pulling the
app/oracle PNG pairs the compare tool already writes to
`tools/compare/out/<run>/` for the residual frames and diffing them directly
(not just sha/bbox) — this is what actually proved the mechanism, rather than
assuming it.

**Diagnosis.** Direct pixel inspection of frames 592–601 (`oracle-00592.png`…
`oracle-00601.png` vs the matching `app-*.png`) showed the app trailing
oracle by **exactly one tick, uniformly, for the entire page-3 print** — not
a growing drift: oracle frame 594 already reads "Y" while the app is still
blank; oracle 595 reads "Yo" while the app reads "Y"; this exact one-frame
lag persists through frame 653 (confirmed identically for the page 3→4 edge
at frames 724–733: oracle 728 reads "N", app is blank). Because the diff is a
constant, non-compounding one-tick offset rather than a drift, it self-heals
once printing catches up to the full page text, which is exactly why page 3's
*hold* (apart from the already-parked, out-of-scope 716/725 pair) was already
byte-exact before this fix — only the print itself lagged.

**Mechanism classification, proven not assumed.** `tools/compare/oracleClient.ts`'s
`runOracleBattleLab` (read directly, not inferred) confirms that whenever a
trace sets `oracleBattleLab.preCheckpointFrameOffset`, the oracle request body
is `trace: { segments: [], captureFrames: [0] }` — the oracle's post-checkpoint
frames come **entirely** from the battle-lab scenario's own pre-baked
`preCheckpointCaptureFrames` walkthrough, never from this compare trace's own
`segments`. So oracle's content at local frame N is a **fixed** recording,
completely independent of when this trace's own segments choose to press A;
only the **app's** frame-by-frame content depends on the trace's press
timing. This is mechanically identical to §9′'s mechanism 1 (gold-open) — a
pure trace-side press/wait miscalibration, not an engine defect — and the
one-tick, non-compounding, self-healing shape (rather than a formula-level
print-speed difference) confirms it: a text-*content* or print-speed bug
would still show up throughout the held page, not just its print span.

**Fix.** `factory-brain-gold-walkup-speech-pages-off.json`'s middle wait
segment (before the page 2→3 press) was one tick too long: `586` frames
where `585` lands the press exactly where oracle's fixed recording needs it.
Reduced `586→585`; to keep the total segment-frame sum at 855 (so
`captureWindow.end: 855` and the local-frame↔abs-frame mapping the rest of
the trace already depends on stay unperturbed) the same one tick was added
back onto the final (trailing, page-4-hold) wait segment: `127→128` — page
4's hold is a static, non-cycling single sha (§7′), so padding it by one tick
is inert. The page 2→3 press did not need its own separate correction: since
oracle's post-checkpoint content is a pure fixed recording independent of
absolute wall-clock, shifting the whole tail by one tick via the single
upstream edit carried the identical one-tick fix through to the page 3→4
edge automatically — confirmed by testing the single-segment edit alone
before touching anything else, which already fixed both edges. Segment 4
(`133`, the wait before the page 3→4 press) was left untouched.

**Result:** `factory-brain-gold-walkup-speech-pages-off.json` **85→175/177**,
hitting the exact numeric target the parent step set. As a bonus, the two
previously out-of-scope "single-tick frame-index boundary" frames (716, 725)
are now also exact — they were downstream artifacts of the same one-tick
tail-wide offset, not an unrelated defect family as previously assumed.

**The new residual (frames 593 and 727) is a different, newly-surfaced, and
provably unavoidable-by-trace-edit defect — left honest, not chased.** Both
are the transition tick immediately *before* each edge (last-still-held tick
in the app's own timeline). Direct pixel check: oracle frame 593 still shows
"…Oh?" fully held (identical to 592); the app shows a fully **cleared**
(0-char) box. Same shape at frame 727 (oracle still shows page 3 held; app
cleared). This is `battleRoomAcceptedState`'s existing, already-shared
`brainSpeechIdle`→`brainSpeech` transition (`src/engine/battleRoom.ts`):
on accept it sets `elapsed: 0` immediately, which `msgboxVisual`'s
`"brainSpeech"` case renders as `chars: min(elapsed, printTicks)` = 0 (an
explicitly cleared box) for exactly one tick before the first character
appears the tick after. This same 2-tick (clear-tick, then first-char-tick)
model is **oracle-confirmed correct** for the page 1→2 edge (frames 6–12,
still exact, unperturbed by this step's fix, sha-verified via
`npm run compare -- factory-brain-gold-walkup-speech-pages-off.json --summary`
having zero mismatches before frame 593) — but is proven, by the same direct
pixel method, to be **one tick too slow** for the page 2→3 and 3→4 edges:
oracle's real recording shows the first new character exactly one tick after
the last-held frame, with **no cleared frame ever visible** at 1-tick
resolution. Algebraically this is unreachable by any trace edit alone: making
frame 594/728 show the first character (pressing one tick earlier) requires
frame 593/727 to already be the accept tick, which the app's own uniform
2-tick model renders as cleared — but oracle's fixed recording still shows
the *previous* page's held content there. No single press tick can satisfy
both frames simultaneously under the current, uniform 2-tick model; this was
verified empirically (this exact -1 trace edit) before being written up, not
assumed. Since page 1→2's own 2-tick model is independently oracle-confirmed
exact, the two edge classes are genuinely asymmetric — despite using
byte-identical `\p` markers in the source script (`data/maps/BattleFrontier_
BattleFactoryBattleRoom/scripts.inc`'s `..._Text_HarderLookThanLastTime`, one
single string with three `\p` breaks, no script-level distinction between
them). Closing this needs a real, tier-general characterization of *why* the
first `\p` transition into an already-open, first-encounter personality
speech takes 2 ticks while later `\p` transitions within the same open
window take only 1 — not a `speechStep`-indexed branch, which the brief's own
"no per-page special case" rule forbids, and not attempted this step to avoid
exactly that kind of fitted-guess trap.

**Verified results (fresh `npm run compare -- <trace> --summary` reruns):**

| Window | Before this step | After |
| --- | --- | --- |
| gold-pages (`factory-brain-gold-walkup-speech-pages-off.json`) | 85/177 | **175/177** |
| gold-open (guard) | 254/256 | 254/256 |
| entrance-03 (guard) | 254/256 | 254/256 |
| gold-close (guard, untouched mechanism) | 80/126 | 80/126 |
| callscene-01 (guard) | 131/131 | 131/131 |
| entrance-02 (guard) | 256/256 | 256/256 |
| B2 speech box0-held / cry-held / page8-held / close-pause (guards) | 39/39 · 74/74 · 39/39 · 28/28 | unchanged |

The task brief anticipated a 175/177 target "with only frames 716/725
remaining" — the actual landed residual set is **593 and 727 instead**, a
numerically identical count but a different (and, per the algebraic proof
above, better-understood) pair of frames; 716/725 turned out to be
downstream artifacts of the very offset this step fixed, not a separate
family. This discrepancy from the brief's anticipated frame set is called out
explicitly rather than silently substituted.

Full `npm test` (1065 files, 10010 passed, 223 skipped, 0 failed), `npm run
build`, `npm run typecheck` all green; `tests/executableFrontierRatchet.test.ts`
barrier counts unmoved (only `tools/compare/traces/factory-brain-gold-walkup-
speech-pages-off.json` changed — no `src/` edit this step).

### 9⁗. §9‴'s residual (frames 593/727) CLOSED: the window's 2nd+ accept-driven transition is one tick faster than the 1st (2026-08-17, main worker)

Closed the "real, tier-general characterization" §9‴ asked for, cross-
checked against a second, independent dense window
(`docs/silver-speech-box2-evidence.md`, silver's box 1→2 edge) landed the
same session. **Derived rule:** the window's FIRST accept-driven box
transition (leaving box 0, the box the window opened directly into) shows
the box CLEARED for one tick before the first new character — the existing
uniform 2-tick model, unchanged. Every LATER accept-driven transition
(leaving box ≥ 1) skips that cleared tick entirely — the accept tick itself
already shows the first new character, no cleared frame ever visible at
1-tick resolution. This refines §9‴'s own "first `\p` vs. later `\p`"
framing (that framing was under-specified — it never named what a "later"
`\p` compares against, or whether a `\l` scroll counts): the true
discriminator is transition ORDER since the window opened, not the `\p`
marker specifically — silver's box 0→1 edge uses `\l` (not `\p`) and is
structurally the window's first transition, exactly parallel to gold's
`\p`-driven page 1→2; both stay on the slow model. `splitSpeechBoxes`
already treats `\l`/`\p` identically (module doc, `battleRoom.ts`), so
nothing new needed to unify them here — only the ORDER within the flattened
box queue needed to be added.

**Fix.** New `BattleRoomState` field `speechAcceptedFast` (`battleRoom.ts`),
set `true` only by `battleRoomAcceptedState`'s direct-continuation branch
when the box being left has `speechStep >= 1`; explicitly `false` at the
window-open entry (`brainSettled` → `brainSpeech`, box 0) and at every real
close+reopen (`brainSpeechClosing`'s own re-entry into `brainSpeech`, e.g.
the last personality page → close/cry box) — a structurally different
transition, confirmed unaffected by the already-green `factory-brain-gold-
walkup-speech-close-off.json` guard (80/126, unmoved). `msgboxVisual`/
`advanceBattleRoom`'s `"brainSpeech"` case shift the chars-shown/exit-elapsed
formula by exactly one tick when the flag is set — no other constant
changed. The **trace-level compensation §9‴'s own fix added is now
redundant and was reverted**: `factory-brain-gold-walkup-speech-pages-off.json`'s
middle wait segment goes back `585→586` (and the trailing hold `128→127` to
preserve the total), since the engine itself now supplies the one-tick
correction natively — keeping both the trace shift and the engine fix would
have double-shifted (verified empirically: applying the engine fix without
reverting the trace regressed gold-pages to 85/177 before the revert was
made).

**Result:** `factory-brain-gold-walkup-speech-pages-off.json` **175/177 →
177/177** (frames 593 and 727 both closed) with the reverted trace timing;
`factory-brain-silver-walkup-speech-box2-off.json` (`docs/silver-speech-
box2-evidence.md`) **63/100 → 100/100** (the 31-frame print-span residual
AND all 6 period-9 cursor-bob blips both closed by the same one-tick model
fix, confirming the bob-phase shift needed no separate mechanism, exactly as
that doc's own §4 Group B predicted). Guard matrix unmoved (fresh
`--summary` reruns): gold-open 254/256, gold-close 80/126, entrance-02
256/256, entrance-03 254/256, callscene-01 131/131, callscene-02 199/199, B2
speech box0-held 39/39 / cry-held 74/74 / page8-held 39/39 / close-pause
28/28, askready 21/21, swapask-no 194/194, record 178/178, retire 174/174.
`src/engine/postwin.ts` (call-scene) untouched, per PROGRESS 1303's guard.
Full `npm test` (1065 files, 10010 passed, 223 skipped), `npm run build`,
`npm run typecheck` green; `executableFrontierRatchet` barrier counts
unmoved. One Tier-1 test updated (`tests/battleRoomBrainSpeech.test.ts`'s
gold `\p` page-turn test pinned `chars: 0` for every internal page turn —
now only the first turn keeps that; every later turn asserts `chars: 1`).

## Appendix: pre-fix (stale, oracle bug: missing gold Frontier-Brain symbol flag) history — captured 2026-08-14

Everything below this line is the **original, unedited** capture from one
day before the `4dac4a35` fix landed. It is preserved for forensic/history
purposes and as a case study of the staging bug — **do not treat any
frame number, sha, or wording claim below as current ground truth**; see
the refresh above for the corrected reading. Original framing note (now
inaccurate, kept verbatim): "Live-verified against `http://127.0.0.1:8014`
(Battle Scene OFF) this session (2026-08-14) with
`tools/battle-lab/factory-brain-gold-intro-dense-off.json` (`playerSetIds
[564, 565, 566]`, `seed 305419896`, gold = `challengeNum 5`, `fixedIv 31`,
matching `tools/battle-lab/factory-brain-gold-turn1-off.json`). All frame
numbers below are **pre-checkpoint** numbers (`preCheckpointCaptureFrames`,
see `../oracle/BATTLE_LAB.md` "Pre-checkpoint captures") unless marked
"post-checkpoint".

### 0. Headline answer (the three questions this doc exists to settle)

**(a) Is the walk-up dialogue TEXT different from silver's, and how many
boxes?** Yes, radically. Silver's window contains **Noland's own ~12-box
personality speech** ("Hey, my name's NOLAND!...", frames ~700–3210). Gold's
window contains **zero** Noland speech before the transition — instead there
are **two short usher/escort boxes reading the same line, "Right this way,
please!"** (§2, frames ~479–529 and ~860–962), spoken by the attendant
walking the player from the front desk into the arena, not by Noland at all.
Noland's own "would like to battle!" line does not appear until the
pic-reveal window (§2), identical in wording to silver's.

**(b) Are the frame numbers of transition/pic-reveal/send-out/ready shifted
vs silver, and by how much?** Yes, hugely — the whole window is compressed
because the long personality speech is simply absent. Ready frame: **1889**
(vs silver's 4049, a shift of −2160 frames). But the shift is *not* uniform:
several individual cutscene sub-stage **durations are frame-identical** to
silver even though their absolute position moved (§3 table) — most notably
the fade-in/send-out-pic-slide-in stage is **217 frames in both** cases,
exactly. Others differ in duration, not just position (pic-reveal hold is
134f in gold vs 99f in silver; opponent send-out text hold is 72f vs 31f).

**(c) Is anything structurally new, or is gold = silver + text substitution
+ timing shift?** Mostly the latter, **with one structural addition**: gold
has an escort/walk-in phase (front desk → arena, ~frames 418–962, including
a mid-walk room-transition black fade at ~629–639) carrying the "Right this
way, please!" line, entirely separate from — and in place of — silver's long
walk-up personality dialogue. This escort phase is very likely present in
silver too (silver's own frame-700 anchor, "Hey, hey! Get a move on!", reads
as the same usher-hurry-you-along archetype, not Noland's own voice) — so
this is *not* a new window class, just one silver's dossier didn't isolate
because its coarse ≥20-stride sampling never resolved the escort walk from
Noland's own dialogue. From the escort's end onward (dismiss → flicker →
swirl → eye-pause → black-flash → fade-in → pic-reveal → opponent send-out →
player send-out → ready), gold exercises **exactly the same stage sequence**
as silver, same shared transition art (identical shas for the eye-pause and
black-flash holds), no new stage.

### 1. Tick table — the compressed battle-start cutscene (frames 0–1990, gold)

Boundary frames are stride-1 exact (every span end is a directly-observed
sha change, not an interpolation) for the **load-bearing sub-windows**
(dismiss → ready, frames 963–1990); the rental-select and escort-walk region
(frames 0–962) is sampled at the same coarseness silver used for its
walk-up dialogue (anchors + a few dense checks around each hold), flagged
per-row below.

| Frames | Len | Content (label-bearing rows PNG-verified) |
| --- | --- | --- |
| 0 | (rental-selection screen) "RENTAL POKéMON — Select the first POKéMON." (Ductrio, Medicham, Misdreavus shown as this run's rental options) — **PNG-verified**. |
| 3–7, 8–69 | two short black holds (`d8b44303`) | Pre-rental-screen fade-in; occurs before any Pokémon pick, shared black-frame sha with the later transition art (coincidental — a solid-black framebuffer hashes the same regardless of context, per silver's own §2 caveat). |
| ~70–417 | per-frame changing, not stride-1 verified | Three rental picks ("select first/second/third POKéMON", RENT confirmation) — **PNG-verified** at 100 ("select first"), 200 ("select second"), 300 ("select third", RENT/SUMMARY/OTHERS menu open). Not part of the battle-start window proper (same pre-battle setup silver's frame-0 anchor also sits in). |
| 418–431 | 14f hold (`d8b44303`) | Black transition, rental-select screen → front-desk lobby. |
| 432–478 | per-frame changing, not stride-1 verified | Player walks into the front-desk/shop lobby (guard NPCs, item shelves) — **PNG-verified** at 460 (lobby interior, no text box yet). |
| **479–529** | ~51f hold (`5e8a5333`) | **Escort box, instance 1: "Right this way, please!"** — **PNG-verified** at 500 (player in lobby, text box present). Not stride-1 verified at both edges (anchors only). |
| 530–628 | per-frame changing (walking), not stride-1 verified | Player walks on, box dismissed, no text box — **PNG-verified** at 530, 610 (no box). |
| ~629–639 | ~11f hold (`d8b44303`) | Second black transition, mid-walk (shop/corridor → arena room) — **PNG-verified** at 630 (solid black). Same shared sha as the other black holds. |
| 640–859 | per-frame changing (walking into arena), not stride-1 verified | Player walks across the arena floor toward the battle position — **PNG-verified** at 650, 800, 830 (arena hex floor, ring of spectator NPCs, no text box). |
| 860 | 1f (fade-in of box) | Text box begins appearing — **PNG-verified** (box art visible, still animating in). |
| **880–962** | 83f hold (`5c99a4d66e`) | **Escort box, instance 2: "Right this way, please!"**, fully settled — **PNG-verified** at 915 (player now centered in the arena, same line repeated as a checkpoint). |
| 963–989 | 27f hold (`31aec4d6`) | Dialogue box dismissed; empty arena view, brief pause. Same sha as silver's own post-dialogue-dismiss hold. |
| 990–1040 | 51f, low-period flicker (`ce3e94`/`9ea9d9` alternating at this fixture's sample spacing; full 8-phase cycle `ce3e94`/`1173fa`/`0c9105`/`b27ee1`/`322a51`/`ed2e01`/`9ea9d9`/`ec073b`, period 16f, confirmed stride-1) | Pre-transition screen flash/shake — **identical shas to silver's own flicker set**, same shared art. |
| 1041–1104 | 64f, unique every frame | Battle-transition swirl animation (shrinking iris). |
| 1105–1138 | 34f hold (`3fe5dda8`) | Swirl fully converged, held ("eye" pause) — **PNG-verified** at 1120 (converging-circle transition art); **identical sha and identical 34-frame duration to silver**. |
| 1139–1149 | 11f, unique every frame | Swirl continuing / expanding into black — **identical 11-frame duration to silver**. |
| 1150–1193 | 44f hold (`d8b44303`) | Full black flash — **PNG-verified** at 1170 (pure black); **identical sha and identical 44-frame duration to silver**. |
| 1194–1410 | 217f, unique every frame (no holds) | Battle scene fades in; both trainers' send-out pics slide/bounce in while "FACTORY HEAD NOLAND would like to battle!" typewriters in — **identical 217-frame duration to silver's own fade-in span**. |
| **1411–1544** | 134f, cycling `c465f0`/`e7694d`/`a4c9ba`, period 27f (9f each) | **Trainer pic reveal + name/class text window**, fully settled — **PNG-verified** at 1480: player's ball indicators (top-left), Noland's trainer sprite (top-right), text "FACTORY HEAD NOLAND would like to battle!♥" — **wording and start/end shas identical to silver**, but the hold itself is 35 frames longer (134f vs silver's 99f). |
| 1545–1643 | 99f, unique every frame | Trainer-vs-trainer transition out + opponent send-out entrance animation (Blaziken jumping in) + "sent out BLAZIKEN!" text typing in — comparable to silver's combined 100f for the same two stages. |
| **1644–1715** | 72f hold (`9503cf76`) | **Opponent send-out text window, settled** — **PNG-verified** at 1680: "BLAZIKEN Lv50" HP bar, "FACTORY HEAD NOLAND sent out BLAZIKEN!" — **different opponent species from silver's Azumarill** (Frontier Brain's lead varies by challenge/roll); hold is more than double silver's 31f. |
| 1716–1847 | 132f, unique every frame | Opponent send-out box closes; player's Pokéball throws in; Dugtrio entrance animation + "Go! DUGTRIO!" text typing in — comparable to silver's combined 133f for the same two stages. |
| **1848–1882** | 35f hold (`b2bd1f35`) | **Player send-out text window, settled** — **PNG-verified** at 1870 (both mons shown, "Go! DUGTRIO!") — **different rental Pokémon from silver's Delcatty** (`playerSetIds` differ by design). |
| 1883–1888 | 6f, unique every frame | "Go! DUGTRIO!" box closes into the action menu — **identical 6-frame duration to silver**. |
| **1889–1990(+)** | cycling `995c66ff`(9f)/`6bfde72b`(9f)/`08a32dfc`(9f)/`d8275aa2`(9f), period 36f, with two reproducible single-frame "settling" blips at 1892-ish and 1956 before/within the loop | **First action-menu-ready frame: 1889.** **PNG-verified** at 1900 and 1950 (both show "What will DUGTRIO do? ▶FIGHT BAG / POKéMON RUN", identical menu text) — **identical 4-phase/36-frame cycle structure to silver**, just different literal shas (different Pokémon on screen). |

**Headline: 1889 frames pre-checkpoint to the first action-menu-ready
frame** (vs silver's 4049) — a **2160-frame reduction**, entirely from the
absent Noland personality monologue. The visually load-bearing span
963→1889 (dismiss → ready, 926 frames) is close in length to silver's
equivalent 3201→4049 span (848 frames) — the cutscene machinery itself
(transition, reveal, both send-outs, ready) is not meaningfully shorter in
gold, only shifted; only the walk-up content in front of it shrank
drastically.

### 2. Post-checkpoint premise check (same as silver's §0)

Post-checkpoint frame 0's sha (`995c66ff0a4578418a8c6ecc387c06a966a55fd`,
full hash in the fixture's live response) matches the pre-checkpoint
ready-cycle sha above exactly (frames 1889, 1893, 1900, 1929, 1974) —
confirming, same as silver, that the entire gold battle-start window
(escort walk, transition, pic reveal, both send-outs, ready bounce) has
**already happened inside the lab's internal `prepare()` route** by the time
the caller's own post-checkpoint trace begins at frame 0. Nothing in this
step required editing `factory-brain-gold-turn1-off.json`; its post-checkpoint
trace (2 A / 30 wait / 2 A / 700 wait) opens/confirms the FIGHT menu for
turn 1, same as silver's.

### 3. Silver-vs-gold sub-stage duration table (same-mechanism spans only)

| Stage | Silver (challenge 2) | Gold (challenge 5) | Duration match? |
| --- | --- | --- | --- |
| Dialogue-dismissed pause | 3201–3228 (28f) | 963–989 (27f) | Same (±1f) |
| Pre-transition flicker | 3229–3279 (51f) | 990–1040 (51f) | **Identical** |
| Transition swirl (unique frames) | 3280–3333 (54f) | 1041–1104 (64f) | Different (+10f) |
| Swirl "eye" pause hold | 3334–3367 (34f) | 1105–1138 (34f) | **Identical** |
| Swirl expanding into black | 3368–3378 (11f) | 1139–1149 (11f) | **Identical** |
| Full black flash hold | 3379–3422 (44f) | 1150–1193 (44f) | **Identical**, identical sha too |
| Fade-in / send-out-pic slide-in | 3423–3639 (217f) | 1194–1410 (217f) | **Identical** |
| Pic reveal + name/class text hold | 3640–3738 (99f) | 1411–1544 (134f) | Different (+35f) |
| Transition-out + opponent entrance anim | 3739–3838 (100f combined) | 1545–1643 (99f) | Same (±1f) |
| Opponent send-out text hold | 3839–3869 (31f) | 1644–1715 (72f) | Different (+41f) |
| Sendout-closes + player entrance anim | 3870–4002 (133f combined) | 1716–1847 (132f) | Same (±1f) |
| Player send-out text hold | 4003–4042 (40f) | 1848–1882 (35f) | Different (−5f) |
| Box closes into action menu | 4043–4048 (6f) | 1883–1888 (6f) | **Identical** |
| Ready-cycle period | 36f, 4-phase | 36f, 4-phase | **Identical structure** |

Six of fourteen comparable spans are frame-identical, including the two
longest (the 217-frame fade-in and the 44-frame black flash, both also
sha-identical) — strong evidence this is genuinely shared, timed animation
code, not something that varies with dialogue length or species. The spans
that *do* differ (swirl length, pic-reveal hold, opponent send-out hold,
player send-out hold) are plausibly typewriter-text-length-dependent
("FACTORY HEAD NOLAND sent out BLAZIKEN!" vs "...AZUMARILL!", etc.), but
this doc does not claim that causal link as proven — only the measured
durations, which is what the pixel-closure step needs.

### 4. Verification

`tools/probe/verify-noland-brain-intro-gold-window.ts` reruns
`tools/battle-lab/factory-brain-gold-intro-dense-off.json` live and checks
every frame/sha256 pair cited by name above, printing PASS/FAIL per check,
plus the post-checkpoint frame-0 premise check from §2. Run twice for
determinism (`node --experimental-strip-types
tools/probe/verify-noland-brain-intro-gold-window.ts`); both runs must be
byte-identical (same seed, same deterministic mGBA replay).
