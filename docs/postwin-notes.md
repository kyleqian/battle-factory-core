# Post-WIN scene transition: DESTIN's loss-quote dismiss through the swap-offer prompt (S8 worktree scout, oracle + RAM probing only)

**Headline**: the gap between `turn17-notes.md`'s own end (tick 23601, held
"PLEASE I NEED\nSOME WATER") and §17's own start (tick 29601, the settled
swap-offer YES/NO prompt) is now dense ground truth, joined to both
neighbors byte-exact. The single most engine-load-bearing fact this window
turns up: **`gMain.inBattle` clears and the per-VBlank `Random()` advance
resumes at the exact same tick, 23645** — 43 ticks after the dismiss press,
mid-fade-to-black, independently confirmed two ways (the `gMain+0x439` flags
byte and `gRngValue` unfreezing) at the identical tick. The return path is
**not** a single scene: the game briefly flashes the **battle room**
(`BattleFrontier_BattleFactoryBattleRoom`, the exact map S6 already modeled
in `battle-room-notes.md`) during the fade, then fades back to black and
fades in on the **pre-battle counter room** (`BattleFrontier_
BattleFactoryPreBattleRoom`, S5's map) where the attendant dialogue plays.
The free full-party heal is confirmed real (**MAGBY 27→138**, **ONIX
0→117**, **BAYLEEF 153→153 unchanged since already full**) but its RAM write
lands **163 ticks after** the heal-text dismiss press, mid-hold, with the
screen pixel-frozen the whole gap — button presses during this stretch are
swallowed by an apparently-uninterruptible heal routine, not visibly
processed until it completes. The opponent-2 rental-bookkeeping write
(`rentalMons[3..5]` populated with GROVYLE_1/MURKROW_1/PIDGEOTTO,
monId 188/184/135) happens **early**, between ticks 23700-23750 — during the
battle-room-flash/counter-room-fade-in transition, well before the GO ON
menu even appears — while `curChallengeBattleNum` flips 0→1 even earlier,
between 23602-23700, right around the `inBattle` clear. The DESTIN
loss-quote cursor question from `turn17-notes.md` is **not resolved** this
session (still open, see §5). Endpoint: tick **29601**, sha256
`59fbfaa021692be0…` — **byte-identical to `battle1-swapyes-a.json`'s own
frame at the same tick**, replayed independently and confirmed (§1) — this
is the stated joint with §17.

## 1. Committed trace and prefix-consistency verdict

Extends `battle1-turn17-dense.json`'s own committed 134-segment/23601-tick
script (carried verbatim — checked as raw segment-list equality,
`mine[:134] == turn17dense`, **True**) with `battle1-winline-b-swap.json`'s
own `segments[134:146]` (12 segments: `A` dismisses DESTIN's loss quote, a
2199f idle covering the fade-out/scene-teardown/counter-room-entry/heal-text
typing, `A` dismisses the heal text, a 2199f idle covering the delayed heal
write + "2nd match" GO ON/RECORD/REST/RETIRE menu settling, `A` confirms GO
ON, three 399f-idle/`A`-dismiss pairs covering the three opponent-scouting
text pages, ending on a final 399f idle settling the swap-offer YES/NO
prompt) — **146 segments, 29601 ticks total**.

Committed: **`battle1-postwin-dense.json`** (208 captures, under the 256
cap): dense stride 2-4 across the fade-out/battle-room-flash/fade-in/
text-type cluster (23600-23800), sparse stride 250-300 over the two long
holds (heal-text held 23800-25801, "2nd match" menu held 26100-28001), dense
stride 2-15 across the delayed-dismiss/heal-write/box-clear cluster
(25802-26100, the session's own headline finding), dense stride 5-7 at the
start of each of the three scouting-text pages and the final swap-prompt
settle (text typing in, ~100 ticks each), sparse stride 25-70 over their
respective holds, plus 8 sparse anchors over the old prefix (ticks 0, 6970,
19990, 20192, 20745, 21773, 22418, 23601) reusing the same cross-check
points §16/§17 already used.

**Twice-run byte-identical** via `bin/oracle run` (two independent runs,
manifests 208/208 diffed, **0 sha mismatches**).

**Prefix checks** (programmatic, same method as prior turn dossiers):
- `mine.segments[:134] == battle1-turn17-dense.json.segments` — **True**
  (raw segment-list equality).
- `mine.segments == battle1-winline-b-swap.json.segments[:146]` — **True**
  (raw segment-list equality; built directly from this slice).
- Frame 23601's sha (`4e05adab8e97…`) and frame 22418's sha
  (`63600c307d1c…`) both match `turn17-notes.md`'s own cited values,
  independently re-run.

**The §17 joint, stated precisely**: `battle1-swapyes-a.json`'s own
`segments[:146]` cumulative-tick to **29601** matches this trace's own
endpoint exactly; both traces' frame-29601 captures were independently
re-run this session and their sha256 compared directly —
**`59fbfaa021692be01c5218f67e7678015c5ce36c250075bb2f91fbb4ea7ad82`,
byte-for-byte identical** between `battle1-postwin-dense.json` (this
session) and `battle1-swapyes-a.json` (§17, a prior session's own trace) —
not just "same script", the actual rendered frame matches. `turn17-dense ⊂
postwin-dense`, and `postwin-dense`'s full script is a verbatim prefix of
both `winline-b-swap` and `swapyes-a`/`swapyes-b`, both directions checked.

## 2. RNG-consumption ledger — the `inBattle` clear/resume pin (brief's priority 1)

New watch spec `tools/probe/specs/postwin-rng-watch.json` (`gRngValue`,
`gMain+0x439` flags byte, `gBattleTypeFlags`, and `gPlayerParty[0..2]`'s
`hp`/`status` fields — party-format offsets per `dump-switch-decision.py`'s
own docstring: `status@+0x50` u32, `hp@+0x56` u16, `PARTY_MON_SIZE=0x64`),
dense **per-tick**, `startTick=23595`, run via `ram-probe.py` against this
session's own committed trace, 6007 rows. LCG-step counts derived
programmatically (replay `ISO_RANDOMIZE1` — `include/random.h:16`,
`x' = 1103515245*x + 24691 mod 2^32` — forward from each row's value until
it matches the next row's, same method as `battle-turn-notes.md` §12/§16/
§17), not estimated from tick deltas.

**The pin**: `gRngValue` is **completely frozen** (0 steps/tick) from
tick 23596 (first probed tick, still mid-hold on the loss quote) through
tick **23644** inclusive — spanning the held quote, the dismiss press
(23602), and the first ~40 ticks of the fade-to-black. At tick **23645**,
two things happen on the **same tick**, independently observed: (a)
`gRngValue` takes its first step after 49 ticks flat, and (b) `gMain+0x439`
(the flags byte containing `inBattle` at bit 1, `include/main.h:39`) drops
from `2` to `0`. From 23645 onward, `gRngValue` advances at the baseline
1 step/tick (`main.c:366`'s per-VBlank unconditional call) for the rest of
this window, with a handful of small bursts riding on top (below) — never
freezes again through tick 29601, confirming battle 2 has not yet begun
its own RNG-freeze (that starts at tick 33286, per §17 ADDENDUM 2, well
past this window's own end).

**Steps ledger** (window boundaries = this trace's own segment ticks):

| window | ticks | LCG steps | note |
|---|---|---|---|
| held quote → `A` dismiss | 23601-23602 (1) | 0 | still frozen |
| dismiss → fade/teardown/counter-room/heal-text settled | 23602-25801 (2199) | 2166 | −33 net: 43 ticks fully frozen (23602-23644) partly offset by small bursts at 23645(+1 extra), 23647(+1), 23648(+2), 23707(+2), 23708(+3) — see below |
| heal-text settled → `A` dismiss | 25801-25802 (1) | 1 | baseline |
| dismiss → GO ON menu settled (delayed heal write inside) | 25802-28001 (2199) | 2199 | baseline throughout — no freeze, no burst |
| GO ON menu settled → `A` confirm | 28001-28002 (1) | 1 | baseline |
| confirm GO ON → scouting text 1 settled | 28002-28401 (399) | 403 | **+4 extra**, all at tick 28003 (a 5-step burst vs. baseline 1) |
| scouting1 settled → `A` dismiss | 28401-28402 (1) | 1 | baseline |
| dismiss → scouting text 2 settled | 28402-28801 (399) | 399 | baseline |
| scouting2 settled → `A` dismiss | 28801-28802 (1) | 1 | baseline |
| dismiss → scouting text 3 settled | 28802-29201 (399) | 399 | baseline |
| scouting3 settled → `A` dismiss | 29201-29202 (1) | 1 | baseline |
| dismiss → swap-offer prompt settled | 29202-29601 (399) | 399 | baseline |
| **total, 23601→29601** | **6000** | **5970** | |

Two non-baseline bursts, individually attributed by tick:
- **23645(+1 extra vs. baseline), 23647(+1), 23648(+2)**: right at/after the
  `inBattle` clear — plausibly `CB2` teardown / scene-load init calls
  (matches the shape of similar small bursts at scene transitions
  elsewhere in this dossier, e.g. §17's own "+3 extra" popup-open bursts).
- **23707(+2), 23708(+3)**: mid-fade, inside the battle-room-flash/
  fade-back-to-black window (§3) — plausibly the counter-room's own
  `CB2_InitBattleFrontierPreBattleRoom`-equivalent load-init calls.
- **28003, a 5-step burst** (vs. baseline 1, so +4): one tick after the GO
  ON confirm press. **Not** the opponent-2 rental-bookkeeping write (§4
  pins that to 23700-23750, well before this) — left unattributed this
  session; plausibly the scouting-text-page selection or a battle-factory
  challenge-continuation routine, not chased further (open item, §6).

Stat-stages/party-status fields never moved (`p0status`/`p1status`/
`p2status` stayed `0` the entire window — no party member carried a status
condition into this window, so the "status cleanup" half of brief question
2 is **vacuously true**, not evidence of a missed cleanup step).

## 3. Scene/camera inventory for the return (brief question 3)

Dense sha-diffed exploratory captures (uncommitted, stride 2-4,
23600-23800) plus PNG reads pin a **three-scene** sequence, not a single
fade-back:

| ticks (approx) | what's on screen | PNG-confirmed |
|---|---|---|
| 23601-23602 | held loss quote / dismiss press | yes (matches turn17-notes' own cited frame) |
| ~23602-23640 | palette fade-to-black (dithered steps, still the battle scene underneath) | yes |
| 23640-23660 | flat black hold (~20 ticks) | yes |
| **~23660-23698** | **`BattleFrontier_BattleFactoryBattleRoom`** — the hex-tile ring floor + spectator crowd, same map `battle-room-notes.md` (S6) already extracted (`LAYOUT_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM`) — briefly flashed, no visible camera pan in this stride, then fades back | **yes, PNG-confirmed** — frame 23670/23690 show the ring+crowd art directly |
| ~23698-23718 | flat black hold again (~20 ticks) | yes |
| ~23718-23800 | fade-in on `BattleFrontier_BattleFactoryPreBattleRoom` (the counter/attendant room, S5's map) — "Thank you for competing!\nLet us restore your POKéMON." typing in, settled by ~23800 | yes |

**Reuse-map verdict**: both scenes shown here are **already modeled**
(`battle-room-notes.md` §1 for the ring/crowd flash,
`prebattle-room-notes.md` for the counter room the sequence actually lands
on) — no new map/tileset extraction needed. Caveat, stated precisely: this
session only confirmed the **asset identity** (same map, same art) via a
brief, low-density flash; it did **not** re-verify the battle-room's own
camera path (`battle-room-notes.md` §3, ticks 520-838 on the original
entry) applies bit-for-bit to this backward-through appearance — the flash
here shows a static wide shot with no walk-in, so it may not exercise the
same camera-pan code path S6 modeled. Flagged open (§6), not assumed
identical.

## 4. Party-state restoration timing (brief question 2) and rental-swap bookkeeping (brief question 5)

**Heal timing vs. message timing — the session's other headline finding.**
`gPlayerParty[0..2]` (ONIX/MAGBY/BAYLEEF, RAM-confirmed slot order via the
initial hp read: `p0hp=0` matches ONIX fainted, `p1hp=27` matches MAGBY's
end-of-battle HP from `turn17-notes.md`, `p2hp=153` matches BAYLEEF's own
never-fought max) shows **exactly one write**, all three slots simultaneous,
at tick **25965**: `p0hp` 0→117, `p1hp` 27→138, `p2hp` 153→153 (unchanged,
already full). This is **163 ticks after** the heal-text dismiss press
(25802), not immediate. Pixel evidence over the same stretch (exploratory,
stride 2, 25790-25980): the "Thank you for competing!\nLet us restore your
POKéMON." textbox stays **bit-for-bit frozen on screen** from before the
dismiss press through tick 25966 — the dismiss press has **zero visible
effect** for 164 ticks — then the box goes visibly blank at tick 25968 (3
ticks after the RAM write) and "The 2nd match is next!\nAre you ready?"
starts typing in by tick 26000. **Reading order: RAM write (25965) precedes
the visible box-clear (25968) by 3 ticks**, same "RAM-ahead-of-pixel" shape
this dossier has seen at every other HP-write boundary (turn17-notes.md
§4). The 163-tick dead zone between the button press and any visible
response is new: it reads as an uninterruptible heal-and-continue script
step (plausibly `HealPlayerParty` plus adjoining housekeeping) that holds
the old textbox on screen rather than clearing it immediately, only
advancing once that step completes.

**Rental bookkeeping** (`gSaveBlock2Ptr->frontier`, via
`dump-rentalmons.py`, same absolute-offset fix §17 already landed):
`rentalMons[0..2]` (player's own three) never change in this window (156/
149/180 = ONIX/MAGBY/BAYLEEF throughout, matching §16/§17). Two distinct
writes to the **opponent-facing** fields, bisected to tick-level precision
this session:

| field | before | after | write window (bisected) |
|---|---|---|---|
| `curChallengeBattleNum` | 0 (tick 23602) | 1 (tick 23700) | **23602-23700** — right around the `inBattle` clear (23645, §2) |
| `rentalMons[3..5].monId` | `[153, 179, 181]`, personality all `0` — stale draft-pool placeholders, **not** DESTIN's actual battle-1 party (that lived in `gFrontierTempParty`, per `dump-switch-decision.py`'s own docstring) | `[188, 184, 135]` = FRONTIER_MON_GROVYLE_1 / MURKROW_1 / PIDGEOTTO (`include/constants/battle_frontier_mons.h:139,189,193`) — **exact match** to §17's own pre-swap read at the shared tick 29601 | **23700-23750** — during the battle-room-flash/counter-room-fade-in stretch (§3), i.e. opponent-2's identity is fully locked in **before the counter-room's own heal text even finishes typing**, well before the GO ON menu (28001) or the scouting text (28002+) |

`challengeStatus` stays `1` throughout (unchanged); `selectedPartyMons`
stays `[1, 2, 3]` throughout (unchanged) — neither is written in this
window.

**This refines `battle-turn-notes.md` §16 HEADLINE 4**: the opponent-2
generation this session traced to `rentalMons[3..5]` happens far earlier
than the GO ON confirm or the scouting text — inside the very first ~150
ticks after the battle-scene teardown, before the player has seen anything
but a fade and a room flash. Any future session bisecting *which* idle
margin actually perturbs opponent-2's identity (§16's own open item) should
now look inside the **23602-23750** window specifically, not later.

Committed: `src/data/gen/battle1-postwin-rentalmons-dump.json` (the
23601/23602/23700/23750/24000/25802/28002/28010/29601 snapshots this
session read, bisecting both write windows above) and
`tools/probe/specs/postwin-rng-watch.json` (segments baked in, per
`turn17-rng-watch.json`'s own convention) +
`src/data/gen/battle1-postwin-rng-dump.json` (the full 6007-row per-tick
ledger).

## 5. The DESTIN loss-quote cursor question — still open

`turn17-notes.md` §4 flagged that DESTIN's held loss quote never showed the
blinking-heart cursor the two preceding faint/outcome screens both showed
in every sampled frame, and asked whether this is a genuinely different
textbox class or a sampling gap. **Not resolved this session**: this
window's own captures only cover the quote's last held tick (23601,
inherited) and the dismiss press itself (23602) — one tick of "still
showing the quote" before the fade begins — not enough new sampling to
settle a blink-cycle question that turn17-notes' own denser sampling
(23510-23601, several ticks) already came up empty on. A source grep for
the quote's own print path (`grep -rl "PLEASE I NEED"
reference/pokeemerald/` and adjacent trainer-lose-text symbol names) found
no hits in the checked-out reference tree — the string is presumably
data-driven from a table not trivially greppable this way, so a source-level
answer needs a different search strategy (e.g. from
`battle_setup.c`'s trainer end-of-battle message dispatch, not the string
literal). Left explicitly open, not guessed at.

## 6. Open items for a resuming session

1. **§2's 28003 5-step RNG burst is unattributed** — ruled out as the
   opponent-rental write (§4 pins that ~275 ticks earlier), but not
   positively identified.
2. **§3's battle-room flash's own camera state** (static wide shot vs. a
   walk-in pan) not compared against `battle-room-notes.md`'s own
   ticks-520-838 camera path — flagged, not assumed identical.
3. **§5, the loss-quote cursor question, remains open** — needs either a
   source-level trace of the quote's own print/window-init call, or a
   dedicated dense re-probe of `turn17-notes.md`'s own window with a
   different sampling strategy (e.g. checking OAM/palette registers
   directly for the cursor sprite's slot, not just sha-diffing full
   frames).
4. **The 163-tick heal-dismiss dead zone (§4) is not source-attributed** —
   RAM+pixel evidence is solid (write at 25965, box-clear at 25968, press
   at 25802), but *why* it takes 163 ticks specifically wasn't chased into
   `battle_setup.c`/`HealPlayerParty` source this session — an engine
   slice implementing this transition needs to reproduce the delay's
   existence, not necessarily its exact cause.
5. Everything upstream (`turn17-notes.md`, `battle-turn-notes.md` §16/§17)
   still applies unchanged; this session didn't touch the swap-screen
   interior (§17 owns it) or battle 2 (§18 owns it).

## Verification

`npm test` and `npm run build` green — no `src/` changes this session; new
artifacts are `tools/compare/traces-groundtruth/battle1-postwin-dense.json`,
`tools/probe/specs/postwin-rng-watch.json`,
`src/data/gen/battle1-postwin-rng-dump.json`,
`src/data/gen/battle1-postwin-rentalmons-dump.json`, and this doc. New
trace twice-run via `bin/oracle run`, manifests (208/208) diffed
byte-identical across two independent runs, 0 sha mismatches. Prefix
consistency checked programmatically both directions (`turn17-dense ⊂
postwin-dense`, raw segment-list equality; `postwin-dense`'s full 146-segment
script is a verbatim prefix of `winline-b-swap.json`'s own 156-segment
script, raw segment-list equality). The §17 joint checked by independently
re-running both `battle1-postwin-dense.json` (this session) and
`battle1-swapyes-a.json` (§17, prior session) and comparing frame 29601's
sha256 directly — byte-for-byte identical. RAM probes:
`ram-probe.py` with `postwin-rng-watch.json` (6007 rows, `startTick=23595`,
independently re-run against its own first run — not diffed this session
due to the time cap, flagged as a minor gap below); `dump-rentalmons.py` at
9 ticks bisecting both bookkeeping-write windows. Every sha256 and text
string in §1/§3/§4 was read directly from a rendered frame this session.

**PAPERCUT**: `dump-rentalmons.py`/`ram-probe.py` runs in this session were
each executed once, not independently re-run and diffed a second time
(unlike every RNG/RAM probe in `turn17-notes.md`/§17), due to the 40-minute
hard cap leaving no room — the *trace* itself (the part that matters for
downstream engine work) **is** twice-run byte-identical (§1), but the two
supplementary RAM dumps carry slightly weaker verification than this
dossier's own established convention. A resuming session should re-run
both probes once and diff before treating their exact numeric fields as
fully load-bearing (the qualitative findings — freeze/resume tick, heal
write tick, bookkeeping write windows — are corroborated by two independent
signals each, RAM+pixel, so are trusted regardless).

## 7. S8 engine evidence — loss-quote dismiss through heal-message readiness (2026-07-23)

This bounded engine increment closes canonical **23602-23800** inclusively.
`tools/compare/traces/battle1-postwin-heal.json` retains all **146 button
segments verbatim** from this dossier's banked
`traces-groundtruth/battle1-postwin-dense.json`; only `captureFrames` is
focused to every tick in the implemented window. Fresh compare is
**199/199 exact**. The predecessor `turn17-rung8b.json` remains **118/118
exact**.

### Exact relative visual/state schedule

The accepted DESTIN quote A is relative age 0. Fresh every-tick oracle
capture and source inspection pin:

| relative age | ownership |
|---:|---|
| 0-6 | frozen final battle quote; no visible response yet |
| 7-36 | `BeginFastPaletteFade(FAST_FADE_OUT_TO_BLACK)` over the live battle scene |
| 37-56 | black; `gMain.inBattle` clears and RNG resumes at +43 |
| 57-80 | settled Battle Factory battle room fades in, then holds |
| 81-95 | that same room fades back out |
| 96-114 | second black hold |
| 115-129 | prebattle counter room fades in |
| 130-138 | settled counter room with attendant/player |
| 139 | empty `MSGBOX_DEFAULT` appears |
| 140-191 | `"Thank you for competing!"` / `"Let us restore your POKéMON!"`, one character per tick |
| 192-193 | fully rendered but input still rejected |
| 194 onward | fully rendered and input-ready |

The +194 input boundary is behavioral, not inferred from pixels. Fresh
independent traces pressed A at canonical 23792-23796. Edges through 23795
were dropped and left the message held indefinitely; 23796 was accepted,
with the already-banked uninterruptible heal routine producing its first
visible clear 166 ticks later. Tick 23800 is therefore both visually settled
and genuinely input-ready.

### Source and fresh RAM anchors

- `BattleScript_FrontierTrainerBattleWon_End` ends via `end2`;
  `HandleEndTurn_FinishBattle` calls `BeginFastPaletteFade(3)` and
  `FreeResetData_ReturnToOvOrDoEvolutions` waits for it before
  `ReturnFromBattleToOverworld`.
- `ReturnFromBattleToOverworld` clears `gMain.inBattle` and restores the
  saved field callback. The fresh rerun of
  `postwin-rng-watch.json` is byte-identical to the committed 6007-row dump
  (SHA-256 `03eb8a983757df6241d23f920615e82327a57ef4b1d961d7586f1c3b8ff67f50`):
  clear and first resumed RNG occur together at dismiss+43. The already
  banked teardown bursts are state-modeled at +43/+45/+46 and +105/+106.
- The corresponding entry-side ownership is also state-relative rather
  than attached to an input edge. `FillFactoryFrontierTrainerParty`'s
  RAM-pinned rejection loops add 56/32/190 calls at battle-room transition
  ages 0/11/18, and `GetSpecialBattleTransition` adds one at age 26, while
  the ordinary VBlank call continues. `rngMode` changes to
  `frontierBattle` only at battle-scene age 5, matching
  `CB2_InitBattleInternal`/`gMain.inBattle`; Tier-1 rejects the former
  speech-dismiss freeze.
- A new every-tick `rentalMons` audit sharpens §4's old coarse windows:
  `curChallengeBattleNum` changes 0→1 at **dismiss+79** (canonical 23681),
  and `rentalMons[3..5].monId` changes to `[188,184,135]` at
  **dismiss+137** (canonical 23739).
- `BattleFrontier_BattleFactoryPreBattleRoom_EventScript_ReturnToRoomFromBattle`
  calls `factory_setopponentmons`, `factory_resethelditems`, then the exact
  two-line `MSGBOX_DEFAULT` used here. Heal-message dismiss and
  `HealPlayerParty` remain deliberately outside this increment.

Implementation is purely edge-relative (`src/engine/postwin.ts`) and reuses
the live battle composition, source fast-palette arithmetic, existing
battle-room/prebattle-room renderers, attendant/player sprites, field
message box, and font pipeline. No screenshot/framebuffer asset, per-frame
lookup table, excluded capture, trace branch, canonical-tick branch,
coordinate/RGB fitting, or capture thinning was introduced.

The engine's raw `gRngValue` is not claimed byte-exact over the full
anchor-to-battle span: older battle slices intentionally model battle
outcomes visually/statefully without replaying every explicit in-battle
`Random()` call. This increment pins ownership changes and their local call
counts from arbitrary seeds; it does not hide that broader pre-existing
state gap by assigning the canonical seed.

## 8. S8 engine evidence — input-gated heal through next-match readiness (2026-07-23)

This bounded increment extends the implemented canonical endpoint from
23800 through **26009**, the true first input-ready tick of the four-choice
continuation menu. `battle1-postwin-next-prompt.json` keeps all 146 segments
verbatim-equal to `battle1-postwin-heal.json`: it anchors the visually static
heal hold at 23800/24000/24400/24800/25200/25600, then captures **every tick
25800-26009**. Fresh compare is **216/216 exact**; the predecessor remains
**199/199 exact**.

The accepted canonical heal A is tick 25802. All timings below are stored-edge
relative, not canonical-tick branches:

| relative to heal A | canonical | state / pixels |
|---:|---:|---|
| +0..+162 | 25802-25964 | old heal message remains byte-frozen |
| +163 | 25965 | `HealPlayerParty`: HP `[0,27,153]` → `[117,138,153]` atomically |
| +164..+165 | 25966-25967 | healed state, old message still byte-frozen |
| +166 | 25968 | old text clears; empty dialogue box |
| +167..+202 | 25969-26004 | `"The 2nd match is next!" / "Are you ready?"`, one character per tick |
| +203..+205 | 26005-26007 | fully typed prompt, no choice menu yet |
| +206 | 26008 | `GO ON / RECORD / REST / RETIRE` menu first visible |
| +207 | 26009 | menu first accepts input |

The input boundary is behavioral. Fresh isolated DOWN-edge oracle runs over
26002-26010 show all edges through 26008 dropped; 26009 is the first edge
that moves the cursor, visible at 26010. The dynamic canonical window and a
separate accepted-edge control both compare at 0 diff (256/256 and 7/7
respectively). Tier-1 covers an early heal A being swallowed, the first
eligible edge, a much later accepted edge, and every downstream boundary
shifting with that stored edge.

Source identifies the long hold rather than leaving it as an unexplained
delay: `ReturnToRoomFromBattle` runs the heal message, `playfanfare MUS_HEAL`,
then blocks in `waitfanfare`; only after the fanfare ends does it call
`special HealPlayerParty`, obtain the battle number, print the second-match
message, and invoke `multichoice 19, 4, MULTI_GO_ON_RECORD_REST_RETIRE`.
The menu renderer uses the extracted source `text_window/1.png` 3×3 tile
frame plus the live normal-font pipeline; it is not harvested framebuffer
chrome.

A fresh rerun of `postwin-rng-watch.json` is byte-identical to the committed
6007-row ledger (SHA-256
`03eb8a983757df6241d23f920615e82327a57ef4b1d961d7586f1c3b8ff67f50`).
It reconfirms HP unchanged through 25964, the simultaneous ONIX/MAGBY write
at 25965, all three statuses remaining zero, `gMain.inBattle` remaining
clear, and exactly the ordinary outside-battle VBlank RNG ownership through
26009 (no new burst or mode handoff in this increment).

No screenshot/framebuffer asset, per-tick table, absolute-tick/trace branch,
coordinate/RGB fitting, exclusion, or dynamic capture thinning was added.

## 9. S8 engine evidence — GO ON through input-ready swap offer (2026-07-23)

This bounded increment extends the accepted endpoint from canonical 26009
through **29601**, stopping on the held, input-ready
`"Before starting the battle..."` YES/NO prompt before either answer is
selected. Both committed traces carry the existing 146-segment ground-truth
prefix verbatim:

- `battle1-postwin-scout-a.json`: **171/171 exact**, with every tick
  28000-28075 and 28400-28477 captured.
- `battle1-postwin-scout-b.json`: **164/164 exact**, with every tick
  28800-28875 and 29200-29273 captured.

Together they capture every tick of all four live box transitions, every
printed glyph, the swap menu's visible/readiness gap, and sparse anchors over
the byte-static holds. `battle1-postwin-next-prompt.json` was independently
rechecked at **216/216 exact**.

Fresh paired input sweeps and the compact RAM ledger
`battle1-postwin-readiness-dump.json` pin these boundaries:

| accepted edge / page | final glyph | first accepted A | source/RAM ownership |
|---|---:|---:|---|
| continuation menu | menu visible 26008 | **26009** | `Task_HandleMultichoiceInput`; `sProcessInputDelay` 1→0 at 26007→26008, so task ordering first reads a new key at 26009 |
| investigation page | 28071 | **28074** | `Task_DrawFieldMessage` and text printer active through 28070, both inactive at 28071; `MSGBOX_DEFAULT` wait handoff follows |
| type page | 28473 | **28476** | same `MSGBOX_DEFAULT` pipeline |
| style page | 28871 | **28874** | same `MSGBOX_DEFAULT` pipeline |
| swap offer | text final 29265; YES/NO visible 29268 | **29272** | `Task_HandleYesNoInput` appears at 29267; its source `tRight < 5` guard reaches 5 at 29271 and first processes input at 29272 |

Each early tick above was rejected in a separate oracle replay and the
adjacent boundary accepted. The canonical stored edges remain GO ON 28002,
page dismissals 28402/28802/29202, and all implementation clocks derive from
those stored edges. A delayed GO ON edge and every early/delayed page edge are
Tier-1 covered; there is no canonical-tick dispatch.

Every page transition retains the old text for edge+0..+2, clears to a blank
live field message box at +3, and prints its first glyph at +4. The four
strings come verbatim from
`BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc`; the renderer reuses
the existing prebattle-room map, message window, standard-window, and normal
font/charmap pipelines. The source-encoded right apostrophe in `I’ve` is
rendered through `CHAR_SGL_QUOTE_RIGHT`, not approximated with an ASCII glyph.

Outside-battle VBlank RNG ownership remains active throughout. The one new
source/RAM-observed burst is canonical 28003, one tick after the stored GO ON
edge: five total LCG advances (the ordinary VBlank call plus four on-demand
factory-intro draws). The engine models it as `confirmEdge + 1`; Tier-1 pins
five calls from an arbitrary seed and baseline one-call ownership on both
adjacent ticks.

No screenshot/framebuffer asset, per-frame lookup table, absolute canonical
tick or trace branch, fitted coordinate/color, excluded dynamic frame, or
capture thinning was introduced.

## 10. S8 engine evidence — swap declined through held guide message (2026-07-23)

The canonical decline tail extends the accepted endpoint from **29601** to
**30031** without dismissing `"Right this way, please!"` or starting the
walk/warp. `battle1-postwin-decline.json` has 150 segments / 30031 ticks and
its first 146 segments are byte-identical to the accepted scouting prefix.
It is **73/73 exact**: every tick 29601-29660 covers the live cursor,
selection, old-message/blank-box, and 23-glyph transitions; five later
anchors cover the genuinely static held message through 30031.
`battle1-postwin-scout-b.json` was independently rechecked at **164/164**.

Fresh oracle input sweeps pin the adjacent gates. DOWN at 29271 is rejected;
DOWN at **29272** is accepted, with the BG/window cursor copy visible one
VBlank later at 29273. The canonical stored DOWN edge is 29602 and its
visible copy is 29603. Canonical A at **29632** stores NO (`VAR_RESULT=0`);
the old swap prompt remains through edge+2, the box is blank at +3, and the
first guide-message glyph prints at +4. The final glyph settles at
**29658** (edge+26). A at 29659 is rejected and **29660** (edge+28) is the
true first accepted dismiss edge; the committed trace intentionally holds
past it without pressing a button.

The live renderer continues to use the source-backed prebattle-room scene,
message window, normal font/charmap, and standard YES/NO window. State stores
the logical cursor edge, its one-VBlank display handoff, and the decline edge;
all later clocks derive from those values. Tier-1 rejects early DOWN/A,
accepts arbitrary delayed edges, pins the final-glyph/input-ready split, and
keeps healed party HP `[117,138,153]`.

The fresh 434-row RAM probe is compacted in
`battle1-postwin-decline-dump.json`. Across every tick 29598-30031,
`gMain.inBattle` stays clear, party HP stays unchanged, and every adjacent
`gRngValue` pair is exactly one Gen-3 LCG call (0/433 mismatches); there is
no decline-specific draw or ownership handoff. `gSpecialVar_Result` changes
255→0 on the stored 29632 NO edge.

No framebuffer asset, per-frame table, absolute-tick/trace branch,
coordinate/RGB fitting, exclusion, or dynamic capture thinning was added.
