# Post-terminal span, beyond both recordings' own input boundaries — ground truth (Battle Scene OFF)

SIDE-LANE scout, continuing `docs/post-terminal-return-to-lobby-ground-truth.md`
(hereafter "the prior scout"). That doc mapped both terminal windows up to
their own committed fixtures' recorded-input boundary — a held prompt neither
fixture's `trace.segments` ever presses past. This doc authors ONE new button
press past each boundary (two on the LOSS side, since the first press landed
on another held prompt), in new scratch fixtures, and banks what the real ROM
does next.

**Headline, upfront**: **both spans are dramatically shorter than the step
brief itself speculated.** The brief's own text guessed "the fanfare + heal +
comment + multichoice could be 1000+ ticks" for WIN — the real number is
**~207 ticks** total from the dismiss press to the next held boundary, and
the fanfare+heal window inside it is visually silent (zero pixel change,
same frozen message box) even though the RAM-level heal has already
happened. LOSS is even shorter: **only ~40 ticks** from the decline press to
a second held prompt, then **~35 more ticks** to free-roam Lobby control once
that second prompt is dismissed — free-roam is reached with no further map
warp, still on `BattleFrontier_BattleFactoryLobby`, `mainCallback2` constant
throughout. A second, unanticipated finding: **LOSS's decline branch does
NOT return control immediately.** Choosing NO on the record prompt swaps in
a *second* held `MSGBOX_DEFAULT` ("We look forward to your next visit.")
that itself needs its own explicit `A` dismiss before `releaseall` runs — an
implementation that treats "decline record" as the final step of the LOSS
flow would stop one prompt too early.

## Method

Both new scratch fixtures are copies of the prior scout's own fixture
lineage — ultimately byte-identical to the two *committed*
`win-terminal-explosion-dusclops-off.json` / `loss-terminal-explosion-dusclops-off.json`
fixtures through every already-recorded input — with the trailing idle
segment lengthened, exactly one (WIN) or two (LOSS) new `A`/`DOWN` presses
appended, and `trace.captureFrames` edited per pass. No existing segment
was altered or removed; the new presses are pure appends after the last
segment either fixture already had. `bin/oracle lab`'s own semantic `state`
(`engine.mainCallback2`) plus raw framebuffer sha256 are conclusive for every
transition below — no RAM probe was needed. `bin/oracle lab` replays these
fixtures (6134 / 5254 total frames) in ~2.5–3.6s per call, so iterating
`captureFrames` (coarse 10-tick sweep of the whole extension → 1-tick dense
sweep at each found transition → targeted PNG reads for on-screen text) cost
under a minute of wall-clock per side. The oracle's `maxCaptures: 256` limit
meant each pass's `captureFrames` had to stay under that count; a single
10-tick-step coarse sweep easily covered each ~1500–2500-frame extension
within budget.

**Held-span proof (required by this step's acceptance criteria):** every
authored press's pre-press frame was checked against the *original committed
fixture's own final captured frame* — not just an internal re-derivation —
by re-running the untouched committed fixture with `captureFrames` set to
exactly that one frame:

| side | committed fixture's own final frame | its sha256 | scratch fixture's pre-press frame(s) | their sha256 | match? |
|---|---|---|---|---|---|
| WIN | 5511 (`win-terminal-explosion-dusclops-off.json`) | `5f60693cf16e867cc9b39fb679572a26213082cbf01d58f300c1282ec0c0977e` | 5505, 5511, 5528, 5531, 5532 (first press frame) | same hash, all five | ✅ byte-identical |
| LOSS | 4938 (`loss-terminal-explosion-dusclops-off.json`) | `08fc6ebc4c3da6edd6195789b68c5f591d9c832af040abf35de6bcf6d19e7814` | 4930, 4938, 4985, 4988 (first press frame), 4989 | same hash, all five | ✅ byte-identical |

Both presses are proven to land inside a genuinely-held span, not a guess at
an already-moving frame.

## 1. WIN side: past the held "Let us restore your POKéMON!" message

`tools/battle-lab/scratch-win-beyond-boundary-probe.json`. The prior scout's
own §1 established this message (`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:456-458`)
holds pixel-identical from tick 5202 through at least 5511 (the committed
fixture's own last frame). This session's new press lands at **5532–5533**
(2 frames, appended after 520 idle frames — 20 more than the committed
fixture's own 500 — so the press itself lands well inside the confirmed-held
span, not merely at its literal end).

| tick | span | what's on screen / `mainCallback2` | mechanism |
|---:|---|---|---|
| 5505–5531 | held (28 ticks sampled) | "Thank you for competing!\nLet us restore your POKéMON!" — sha `5f60693c…`, byte-identical to the committed fixture's own frame 5511 | still the same held message the prior scout mapped |
| **5532–5533** | — | this session's own new `A` press | dismiss |
| **5533–5698** | **166 ticks, zero pixel change** — box still shows the *old* message text, unchanged | `playfanfare MUS_HEAL; waitfanfare; special HealPlayerParty` (`scripts.inc:58-60`) — the heal fanfare plays and the party is healed **entirely off-screen from a pixel standpoint**: the old message box is never visibly cleared or closed, it's simply held as leftover rendered content while the field script blocks on `waitfanfare`, then `HealPlayerParty` (no visual effect of its own) | RAM has already advanced past the dismiss (matches the prior doc's "RAM-ahead-of-pixel" framing), but nothing on screen moves for 166 ticks |
| 5699 | 1 tick | first pixel change — message box interior clears | `frontier_getbrainstatus` (61) → not-ready branch → `AskReadyForRegularOpponent` (82) begins; box reused for the next `message` rather than a separate close/reopen animation |
| **5700–~5738** | ~39 ticks, typing | box fills character by character: **"The 2nd match is next!\nAre you ready?"** (exact string, `scripts.inc:460-462`, `Text_ReadyFor2ndOpponent`) | `frontier_get FRONTIER_DATA_BATTLE_NUM` reads 1 (first win increments 0→1) → `call_if_eq VAR_RESULT, 1, …ReadyFor2ndOpponent` (`scripts.inc:83-84`) — printer running |
| 5735–5738 | 4 ticks, static | text fully typed and held, **no menu drawn yet** — PNG-confirmed (`frame-05738.png`) | printer done, `GetCantRecordBattle` evaluating (no visible effect) |
| **5739** | 1 tick | multichoice window **"▶GO ON / RECORD / REST / RETIRE"** pops in fully drawn, cursor on GO ON (first/default option) — PNG-confirmed | `multichoice 19, 4, MULTI_GO_ON_RECORD_REST_RETIRE, TRUE` (`scripts.inc:92`) — `DrawMultichoiceMenu`-class single-tick appearance, same family `factory-terminal-boundaries-off-probe.md` already documented for other multichoice instances |
| **5739–6133 (this fixture's own final captured tick), zero pixel change** | **≥395 ticks sampled, held** | sha `e83628935b…`, constant | genuinely awaiting a player choice — **this is WIN's own new input-ready boundary**. Per the step brief's explicit "STOP at that held multichoice" instruction, no press was authored here. |

No `CommentOnOpponentType`/`CommentOnOpponentStyle` text appears in this
span (unlike the prior scout's speculation) — those calls are only reachable
from `EventScript_EnterRoom`'s *first-ever* rental-generation branch
(`scripts.inc:23-42`, gated on `VAR_0x8006 != 1`), not from
`EventScript_ReturnToRoomFromBattle` (`scripts.inc:24,54`, the branch this
fixture's own battle-0 win actually takes). The on-screen text confirms
this directly: straight from the heal message to "The 2nd match is next!"
with nothing in between.

## 2. LOSS side: past the held YES/▶NO record prompt

`tools/battle-lab/scratch-loss-beyond-boundary-probe.json`. The prior
scout's own §2 established the "record...on your FRONTIER PASS?" YES/▶NO
prompt (default cursor NO) holds pixel-identical from ~4198 through at least
4938 (the committed fixture's own last frame). This session appended **two**
new presses, each individually held-sha-verified before trusting it (per
§0 above), since the first one landed on a second held prompt rather than
free-roam.

### 2a. First new press (4988–4989): decline the record prompt

| tick | span | what's on screen / `mainCallback2` | mechanism |
|---:|---|---|---|
| 4930–4989 | held (sampled) | YES/▶NO menu, cursor on NO — sha `08fc6ebc4c…`, byte-identical to the committed fixture's own frame 4938 | still the same held prompt the prior scout mapped |
| **4988–4989** | — | this session's own new `A` press (accepts the held default, NO) | dismiss — `multichoicedefault 20, 8, MULTI_YESNO, 1, FALSE` (`scripts.inc:81`) resolves `VAR_RESULT = 1` |
| 4990 | 1 tick | first pixel change | `switch VAR_RESULT / case 1, …EndRecordBattle` (`scripts.inc:83`) — decline branch taken |
| **4990–~5027** | ~38 ticks, typing | box fills: **"We look forward to your next visit."** (exact string, `scripts.inc:351-352`, `Text_LookForwardToNextVisit`) | `EventScript_EndRecordBattle`'s `msgbox …, MSGBOX_DEFAULT` (`scripts.inc:90`) — same ~38-40-tick typing cadence as WIN's §1 message, same message-box family |
| **5028–5089 (this pass's own sampled range), zero pixel change** | **≥62 ticks** | sha `8b114c5f2d…`, constant | held — this message needs **its own separate `A` dismiss**; `closemessage`/`releaseall` (`scripts.inc:91,93`) have **not** run yet. **This is the surprise finding**: declining the record prompt does not immediately release the player — a second held prompt intervenes. |

### 2b. Second new press (5090–5091): dismiss "We look forward to your next visit."

| tick | span | what's on screen / `mainCallback2` | mechanism |
|---:|---|---|---|
| 5088–5091 | held (sampled) | "We look forward to your next visit." still on screen | pre-press confirmation |
| **5090–5091** | — | this session's own new `A` press | dismiss |
| **5093** | 1 tick | message box gone entirely — free Lobby overworld view, player sprite standing, no box, no cursor — PNG-confirmed (`frame-05100.png`) | `closemessage` (91) → `setvar VAR_TEMP_CHALLENGE_STATUS, 255` (92) → `releaseall` (93) → `end` (94) — the whole `LostChallenge`/`AskRecordBattle`/`EndRecordBattle` chain (`scripts.inc:65-94`) is now complete |
| **5093–5173, zero pixel change (81 ticks sampled)** | held, but **not an input-gated prompt** — the field's normal idle overworld frame | free-roam player control, per source (`releaseall` unlocks input; there is no further script waiting on a button) — proof of *reachability* needed an actual movement input, next row |

### 2c. Movement proof: this session's own third new press (5172–5173, `DOWN`)

To confirm "free-roam" means *actual player-controllable movement*, not
just an unlocked-but-still-scripted idle frame, this session appended one
`DOWN` press after the held idle frame and watched for a walk animation:

| tick | span | what's on screen | mechanism |
|---:|---|---|---|
| 5170–5173 | held | player standing still, facing down (unchanged since 5093) | pre-press confirmation |
| **5172–5173** | — | this session's own new `DOWN` press | player movement input |
| **5174–5200** | **26 ticks, continuously changing frames** — one distinct sha nearly every tick | walk-cycle animation, player sprite visibly steps down one tile (PNG-compared `frame-05170.png` vs `frame-05220.png`: player position shifted down) | ordinary overworld movement processing — **not** a scripted `applymovement`, this is real player input being read every frame, confirming input is genuinely free |
| **5201–5254 (this fixture's own final captured tick), zero pixel change** | held | player settled at the new tile, still facing down | movement complete; `mainCallback2` was `134766173` — the same "settled overworld callback" value — for the fixture's **entire** extension, 4988 through 5254: **no map warp anywhere in this whole LOSS-side span**, confirming free-roam is reached on the same `BattleFrontier_BattleFactoryLobby` map, not by transitioning to a different one |

This is the free-roam boundary the prior scout's own §3 flagged as
unreached: **the LOSS challenge's full end-to-end path — decline branch
through both held prompts to genuinely player-controllable movement — is now
completely mapped**, with no further un-pinned prompt.

## 3. Implications for a future slice-5 fixture

1. **Both extensions are cheap, not expensive.** The brief's own "1000+
   ticks" estimate for WIN was off by ~5×; a future committed fixture
   extending either recording needs on the order of a few hundred extra
   frames (WIN: ~210 past its current bound; LOSS: ~95 past its current
   bound to reach free-roam, or ~40 to reach the second held prompt), not
   the 1000+ the brief anticipated. `maxFrames: 45000`/`maxCaptures: 256`
   give enormous headroom for either.
2. **The heal-fanfare window is a genuine "nothing visibly happens" gap,
   not a missing-animation bug to chase.** An implementation that holds the
   prior message's rendered content completely static for the fanfare+heal
   duration (166 ticks here) before transitioning straight into the next
   message's typing — with no intermediate blank/close frame — matches the
   real ROM. This is the same "leftover static content" class
   `terminal-seam-loss-path-ground-truth.md` §6 already flagged for a
   different held-cursor case; this session found the same family governs
   ordinary message-to-message transitions across a `waitfanfare`, not just
   cursor freezes.
3. **LOSS's decline branch is two held prompts, not one.** Any
   implementation of "record battle? NO" must present a *second* dismissable
   message ("We look forward to your next visit.") before releasing
   control — modeling "decline → immediately free-roam" would desync from
   the real game by one whole message-and-dismiss cycle.
4. **No map warp gates LOSS's free-roam.** `mainCallback2` never changes
   value across the entire decline-to-movement span; whatever presentation
   state machine models this transition can stay on a single "Lobby,
   overworld-idle" render state through both dismisses and straight into
   accepting movement input — there is no fade/warp seam to build for this
   specific hand-off (unlike the earlier battle-room→destination-map seam
   the prior scout's own §3 already covers).
5. **WIN's new boundary (the `GO ON/RECORD/REST/RETIRE` multichoice) is a
   second, deeper interactive layer** — per this step's own "stop at the
   boundary" contract, choosing an option (and, if `RECORD` or `PAUSE` is
   chosen, whatever follows) is unmapped and needs its own future fixture
   with that choice's dismiss authored in.
6. Neither `src/engine/postwin.ts` nor `src/engine/factoryTerminalPresentation.ts`
   was re-read this session (out of scope: docs+fixtures only) — the prior
   scout's own §4 app-consumer map is unchanged and still the reference for
   wiring; this doc only adds the timing ground truth those modules would
   need calibrated against for the newly-mapped span.

## Verification

```
$ git diff --stat
 docs/post-terminal-beyond-boundary-ground-truth.md         | new
 tools/battle-lab/scratch-win-beyond-boundary-probe.json    | new
 tools/battle-lab/scratch-loss-beyond-boundary-probe.json   | new
```

Zero edits to `src/`, `tests/`, `tools/compare/`, the two committed
fixtures, or the prior scout's own scratch fixtures.

- Every tick/sha cited in §1–§2 was read directly from this session's own
  `bin/oracle lab` manifests (raw framebuffer sha256, `engine.mainCallback2`)
  and cross-checked by reading the actual PNG captures for every claim
  marked "PNG-confirmed" above.
- Both held-span proofs (§0's table) independently re-ran the **untouched
  committed fixtures** at their own final frame and confirmed a byte-exact
  sha256 match against the scratch fixture's pre-press frame — not an
  internal-only comparison.
- Source cites (`scripts.inc` line numbers, exact `.string` text) are from
  `reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`
  and `reference/pokeemerald/data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc`,
  read directly this session.
- `npm run test:smoke` and the full `npm test`/`npm run build` were run
  before the final commit (see this step's own final report for results) —
  docs+fixtures cannot break the suite, but both gates were run per this
  lane's brief.
