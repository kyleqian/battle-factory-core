# Two discriminating probes: ONIX ready-lag (route vs species) + DESTIN bench ground truth

Side-lane, evidence-only step (ISSUES #56 item 1's quarantined formula and
the rank-2 turn-13 switch-in groundwork). No `src/` changes; both fixtures
below are scratch (not committed) per this step's brief.

## Probe 1 — ONIX ready lag: route-specific or species-specific?

**Question** (`ISSUES.md` #56 item 1): the quarantined formula
`generatedPlayerReadyLagSpeciesFormula` (`src/engine/battleScene.ts:4177-4184`,
retained-not-called) —
`readyLag = generatedPlayerVisualLag(playerLine.length) + GENERATED_PLAYER_READY_LAG_BASELINE(98) + cryDurationTicks(playerSpecies)`
— is exact for GRIMER/KADABRA/DELCATTY (`docs/intro-cry-shadow-evidence.md`
Part 1, X=98/98/99) but predicts **179** for ONIX against the canonical
anchor route (`interactive-generated-intro-off`, sourced from
`tools/compare/traces-groundtruth/battle1-intro.json`), which needs **185**
to hold its committed 715/715 `interactive-generated-intro-off` pin. Is the
+6 ONIX-specific (would reproduce in any context) or specific to that one
canonical route?

**Method.** Built a scratch `factoryLegal` lab fixture with ONIX as the
player lead (mirroring `factory-arbitrary-intro-yoshi-off.json`'s own
construction, itself one of Part 1's three validated data points), ran it
dense (`preCheckpointCaptureAllFrames: true`), and measured the same
landmarks Part 1's method used: numpy dense pixel-diff, frame-by-frame, not
just sha256/bbox presence.

Fixture (scratch, not committed — `/tmp/onix-lab/factory-onix-lead-off.json`,
sha256 `8ed33c40737f56c4046334e77f9445fa96c124ac96e0c0f3f984d41caf1485e7`):

```json
{
  "schemaVersion": 1, "mode": "factoryLegal", "profile": "battle-scene-off",
  "level": 50, "challengeNum": 0, "battleNum": 0, "trainerId": 49,
  "rentalSwapCount": 0,
  "playerSetIds": [156, 143, 150],
  "opponentSetIds": [189, 155, 111],
  "seed": 42, "preCheckpointCaptureAllFrames": true,
  "trace": { "segments": [], "captureFrames": [0] }
}
```

`playerSetIds[0]=156` is `FRONTIER_MON_ONIX` (`include/constants/
battle_frontier_mons.h:160`; range 110-199 per `src/data/gen/
factory-round-policy.json`'s `rentalSelection.ranges.level50[0]`, same range
YOSHI used). `[143,150]` (ELEKID/NOSEPASS) and `opponentSetIds[189,155,111]`
(COMBUSKEN/POLIWHIRL/KRABBY) are filler picks reusing YOSHI's own opponent
lead (COMBUSKEN, `setId 189`) so `dispatchDelay` stays the already-validated
125 — swapped away from YOSHI's own `[110,130,150]`/`[189,155,168]` only
where needed to clear held-item duplication (ONIX and the original
`NUZLEAF`/`PORYGON` fillers all default to `BATTLE_FRONTIER_ITEM_SITRUS_
BERRY`; the oracle rejects duplicate held items across both teams).
`bin/oracle lab` confirms `player[0].species=95` (ONIX). Ran via `bin/oracle
lab /tmp/onix-lab/factory-onix-lead-off.json -o /tmp/onix-lab/ref`; manifest
sha256 `2610a053c1f4f0c3a3413d1de2bc79cabcc5daf0645c6fb5f6d0a9bb8db1b23b`,
**2007 preCheckpointCaptures** (same size class as YOSHI/SHIZUKA/MAGNETON in
`docs/intro-cry-shadow-evidence.md`).

**Landmarks measured** (all oracle-absolute, this fixture's own dense diff):

| Landmark | Frame | Evidence |
| --- | --- | --- |
| Opponent handoff (release start) | **1583** | 796px jump, bbox (157,20)-(207,69) — identical to YOSHI's own handoff (same opponent, COMBUSKEN) |
| Box-clear / "Go! ONIX!" starts (dispatch complete) | **1708** | 1212px jump, bbox (16,124)-(138,149); = handoff(1583) + `dispatchDelay(COMBUSKEN)=125`, reconfirming §D's own 125 |
| Throw becomes visible | **1719** | 1690px jump, bbox (46,60)-(109,111) — same signature class Part 1 used for KADABRA/DELCATTY; = 1708 + `generatedPlayerVisualLag(9)=11` ("Go! ONIX!" is 9 chars, one shorter word than GRIMER's 11-char line) |
| Ready-transition observed (menu box begins to change) | **1887** | 282px change, bbox (16,123)-(61,133) — same UI element as Part 1's three species (x0=16/y0=123/y1=133 identical; x1 tracks name width) |

**Result.** `readyLag' = observed − throwVisible = 1887 − 1719 = 168 = 98 +
cryDurationTicks(ONIX=70)` — **X=98, an exact match to GRIMER/KADABRA's own
98** (DELCATTY was 99), zero residual. Equivalently, from the dispatch-complete
anchor (`ISSUES.md`'s own framing): `1887 − 1708 = 179`, **exactly the
quarantined formula's own predicted value**, not 185.

**Verdict: ROUTE-specific, not species-specific.** ONIX, tested in a fresh
synthetic `factoryLegal` lab battle by the identical method that validated
GRIMER/KADABRA/DELCATTY, obeys the quarantined formula exactly (0-tick
residual) — the same species that supposedly "disagrees by 6 ticks" reproduces
the formula perfectly once it's not the canonical route doing the measuring.
The +6 the canonical `interactive-generated-intro-off` pin needs must
therefore come from something about that specific route, not from ONIX's own
cry data, extraction, or a per-species term (all three were the standing
hypotheses in `ISSUES.md`; this measurement is evidence against all three at
once, since a real species-level cause would have reproduced here too).

**What the canonical route does differently (cheap look only, not chased
further per the brief).** `interactive-generated-intro-off` is not a directly
constructed `factoryLegal` battle — it replays a real button-driven route
(`battle1-intro.json`, 34 segments) plus manually appended wait/press
segments (`98 frames wait, 2 frames A, 400 frames wait`) to reach its capture
window (1048-1762). A `factoryLegal` lab fixture skips straight to
`CB2_InitBattle`; the real route walks through the game's own pacing
(dialogue advances, camera/menu transitions) first. `ISSUES.md` #55 already
documents a related real-vs-staged timing gap for rental construction
(ambient `VBlank`-interleaved `Random()` ticks the synthetic contract can't
represent) — a same-shape "real route has extra frames a synthetic
construction doesn't" effect is the most likely candidate here too, but this
is a named lead, not a confirmed mechanism: no RAM/source inspection of
`battle1-intro.json`'s own pre-handoff frames was done this step to confirm
it. A useful cross-check for Probe 1's own data: Probe 2 (below) independently
found DESTIN's actual Battle 1 opponent lead is **GROVYLE**, not PIDGEOTTO —
which matches `battleScene.ts:4095-4102`'s own comment that
`GENERATED_PLAYER_DISPATCH_BASELINE_DELAY(101)` is "the already-oracle-validated
GROVYLE-opponent value" for exactly this canonical route, corroborating that
the canonical pin's opponent-side timing is GROVYLE-keyed as documented.

## Probe 2 — DESTIN's real bench (turn-13 switch-in ground truth)

**Question:** the rank-2 switch-in half needs DESTIN's full party
order/records beyond PIDGEOTTO/MURKROW, unprobed anywhere in-repo.

**Method.** Reused the canonical committed route
`tools/compare/traces-groundtruth/battle1-winline-b-swap.json` (sha256
`aaf458b1229f586f28b83199523b41d048b82973804c5c87c45aa3697d4516e8` — the same
chain `tools/probe/dump-battle2-party-ground-truth.py` replays in full for its
own, later Battle 2 ground truth), but replayed only a **prefix** (stopping
partway through Battle 1 instead of running to the route's final tick /
Battle 2's settled menu). Struct-decode helpers (`BoxPokemon` secure-substruct
decrypt, `SUBSTRUCT_CASE` order table, trailing plaintext fields) copied
verbatim from `dump-battle2-party-ground-truth.py`. Scratch script
`/tmp/destin-bench/dump-destin-bench.py` (sha256
`ecf758659e767d4b89d340add7fb4c7da0f818b4c8e0a2817830b069a5480230`), run
through `tools/run-mgba-probe.py` per that probe's own documented convention.

Since `battle1-winline-b-swap.json` diverges from the (differently-purposed)
`battle1-turn13-dense-a/b.json` scripts at segment 65 (frame 6562 — a
rental-swap decision point), this step did not assume any tick-numbering
correspondence between files; it instead sampled `gBattlerPartyIndexes` +
`gEnemyParty` slot-0 HP every 200 ticks from frame 0 while replaying
`battle1-winline-b-swap.json`'s own button script to find the real
transitions in this file's own numbering:

| Tick window | `gBattlerPartyIndexes.opponent` | slot-0 HP | Event |
| --- | --- | --- | --- |
| 0 – ~6400 | 0 | 143 → 0 (declining) | DESTIN's slot-0 mon (GROVYLE) takes damage, faints by tick 6400 |
| 6600 – 6800 | 0 → **2** | 0 | First switch: GROVYLE (slot 0, fainted) → **PIDGEOTTO (slot 2)** |
| 16800 – 17000 | 2 → **1** | 0 | Second switch: PIDGEOTTO (slot 2, fainted) → **MURKROW (slot 1)** — this is turn 13's DRAGON_BREATH-faint switch-in |

The second-switch window (~16800-17000) lands within ~200-450 ticks of
`docs/battle-turn-notes.md`'s own turn-13/14 tick numbers from the
differently-diverged `dense-a/b` files (`TURN13_ICONBAR_CREATE_TICK=16847`,
`TURN13_MURKROW_SETTLE_TICK=17070`) — strong corroboration this is the same
event despite the two files' button scripts diverging at frame 6562.

**Full bench read at tick 17250** (just past the second switch, MURKROW
freshly settled — `gBattlerPartyIndexes = {player: 0, opponent: 1}`):

| Slot | Species | Level | HP / Max | Personality | OT ID | Nature | Moves |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | **GROVYLE** | 50 | 0 / 143 (fainted) | 1094072807 | 416049562 | RELAXED | FURY_CUTTER, ENDEAVOR, BRICK_BREAK, DOUBLE_TEAM |
| 1 | **MURKROW** | 50 | 142 / 142 (fresh) | 3475344024 | 416049562 | QUIRKY | FAINT_ATTACK, FLY, TORMENT, TAUNT |
| 2 | **PIDGEOTTO** | 50 | 0 / 156 (just fainted) | 3971699699 | 416049562 | QUIRKY | AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK |
| 3-5 | — | — | — | — | — | — | (empty, `SPECIES_NONE`) |

All three share `otId 416049562` (one trainer, DESTIN), confirming a single
3-mon party, no 4th-6th slot. Player-side party at the same tick, for
reference: slot 0 ONIX (4/117 hp, the active battler), slot 1 MAGBY
(138/138), slot 2 BAYLEEF (153/153).

**Which slot is which:** PIDGEOTTO is **array slot 2**; MURKROW is **array
slot 1**; GROVYLE (previously unrecorded in-repo as part of DESTIN's bench)
is **array slot 0** and was DESTIN's actual Battle-1 opening lead, fainting
well before turn 13 (`dump-turn13-*` and `docs/battle-turn-notes.md`'s own
"turn 2's own DRAGON_BREATH scene" / `grovyleFaintSinkRowsAndY2`'s generalized
name are consistent with this — GROVYLE's own faint predates and originates
the sink/faint dispatcher turn 13 later reuses for PIDGEOTTO).

**AI-replacement-order implication for the switch-in flip:** the real
send-out order was **slot 0 (GROVYLE) → slot 2 (PIDGEOTTO) → slot 1
(MURKROW)** — NOT sequential array-index order (which would have sent slot 1
before slot 2). A rank-2 implementation that assumes "next surviving index"
will send the wrong mon; whatever picks the replacement (Factory AI switch
logic, per the existing `tools/probe/dump-switch-decision.py`/
`factory-ai-switch-receipt-*.py` probes' own territory) must be consulted
directly rather than assumed sequential. This full 3-slot table (species,
personality, moves, HP, OT ID) is now available ground truth for that work;
this step did not implement or wire anything against it.

## Summary

- **Probe 1**: **ROUTE-specific.** A fresh `factoryLegal` lab fixture with
  ONIX as player lead reproduces the quarantined species formula exactly
  (predicted 1887 = observed 1887, 0-tick residual; readyLag 179 matching
  `ISSUES.md`'s own "predicts 179"). The canonical anchor route's own +6
  (needs 185) is not reproduced by ONIX outside that one route, so it is not
  an ONIX/cry/species-level effect. Most likely candidate (named, not
  confirmed): the canonical route replays real pre-battle frames a synthetic
  `factoryLegal` construction skips, a same-shape gap to `ISSUES.md` #55's
  documented real-vs-staged construction-timing difference.
- **Probe 2**: DESTIN's full Battle-1 bench is **GROVYLE (slot 0) / MURKROW
  (slot 1) / PIDGEOTTO (slot 2)**, all one trainer (`otId 416049562`), no 4th
  slot. Real send-out order GROVYLE → PIDGEOTTO → MURKROW confirms turn 13's
  switch-in target is array slot 1, reached out of array order (slot 2 faints
  before slot 1 is used) — the rank-2 switch-in work needs the actual
  AI-driven replacement rule, not a sequential-index assumption.
