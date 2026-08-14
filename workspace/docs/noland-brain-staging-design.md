# Noland / Frontier-Brain staging representation — design

Side-lane design deliverable per the 2026-08-10/2026-08-13 ROADMAP user
decisions (`ROADMAP.md` S10-close "User decisions" blocks) and
`docs/gate2-noland-scope-note.md`'s addendum: Noland is back in scope, and
the sanctioned cure for the mechanic lab's correct schema rejection of
non-ordinary trainer IDs is "a designed Frontier-Brain staging
representation for the mechanic lab" — not pretending Noland is one of the
300 ordinary `gFacilityTrainers` rows. This document is that design. It is
**docs-only**: no code, no schema, no oracle-side files are edited by this
step. Every load-bearing claim below cites a `file:line` verified this
session (2026-08-14).

## 1. Problem statement and the standing rejection

`oracle/battle_lab.py:390-395` (read-only citation; oracle-side, above the
workspace) is the exact rejection:

```python
if battle_num == 6 and challenge_num in (2, 5):
    raise ValueError(
        "challenge 2/5 battle 6 is a Noland battle; battle-lab schema v1 "
        "supports regular Factory trainers only"
    )
trainer_id = _integer(value.get("trainerId"), "trainerId", 0, FACTORY_TRAINERS_COUNT - 1)
```

Two independent layers currently reject Noland: an explicit
challenge/battle-number check, and a general bound
(`FACTORY_TRAINERS_COUNT = 300`, `oracle/battle_lab.py:26`) on the `trainerId`
field that `factoryLegal`/`mechanicLab` share. `TRAINER_FRONTIER_BRAIN` is
`1022` (`include/constants/trainers.h:12`), far outside that space — and
correctly so: Noland is not a row of `gBattleFrontierTrainers`/
`gFacilityTrainers` (the 300-row Factory catalog `factoryLegal` stages
through). He is a real, distinct game entity: `TRAINER_NOLAND = 809`
(`reference/pokeemerald/include/constants/opponents.h:813`) is an ordinary
row of the much larger overworld `gTrainers[]` table (`TRAINERS_COUNT = 855`,
`opponents.h:864`), used only for his identity strings/pic/class
(§2.3), carrying a dummy fixed party (`.party =
NO_ITEM_DEFAULT_MOVES(sParty_Noland)`,
`reference/pokeemerald/src/data/trainers.h:9712-9722`) that the Factory
battle path **never reads** — his real battle party comes from
`FillFactoryBrainParty` (§2.1), not `gTrainers[TRAINER_NOLAND].party`.

**Why staging him as an ordinary trainer id must stay rejected:** the
`trainerId` field in `factoryLegal`/`mechanicLab` selects a row of
`gFacilityTrainers` — a table Noland does not belong to. There is no row of
that table whose semantics equal his (see §2 for the enumerated list of
things that differ). Widening the existing `trainerId` bound to admit `1022`
would silently misrepresent his identity and data source: callers building
"legal Factory trainer" traces would have no way to know a `trainerId` of
`1022` names a completely different code path (`GetFactoryMonId`-driven live
generation, not a `monSet` row; a hardcoded AI-flag branch, not a
`gTrainers[].aiFlags` table lookup; a different party-fill dispatch
function). The correct cure, per the user decision this doc implements, is a
representation that is structurally distinct — its own request shape, not an
extra legal value on the ordinary field — so a caller can never accidentally
stage a Brain by picking a large trainer id, and the schema can enforce
Brain-specific validation (e.g. rejecting `overrides.parties`-only staging
without the accompanying context, §3.4) that would not make sense for
ordinary trainers.

## 2. Ground-truth survey: everything `TRAINER_FRONTIER_BRAIN` changes

Grep census of all `TRAINER_FRONTIER_BRAIN`/`gTrainerBattleOpponent_A ==
TRAINER_FRONTIER_BRAIN` sites reachable from a Factory singles battle
(`reference/pokeemerald/src/{battle_factory,battle_tower,frontier_util,
battle_ai_script_commands,battle_controller_opponent,battle_main,
battle_message}.c`; `battle_dome.c` sites are Battle Dome-only and out of
scope — the Factory never sets `BATTLE_TYPE_DOME`). Grouped by whether it
changes the semantic battle state a `mechanicLab` capture exposes
(`state.battlers`/`state.parties`/decisions) versus presentation only
(pixels, text, music — outside `state`'s scope per
`tools/battle-lab/README.md:17-19`'s field list).

### 2.1 Party generation — SEMANTIC, already ported

`battle_tower.c:1855-1859` (`FillFactoryFrontierTrainerParty`):

```c
else if (trainerId == TRAINER_FRONTIER_BRAIN)
{
    FillFactoryBrainParty();
    return;
}
```

routed from `FillFactoryTrainerParty` (`battle_tower.c:1815-1822`), which is
the Factory's own battle-init party-fill entry point (distinct from the
generic `FillTrainerParty`/`CreateFrontierBrainPokemon`,
`battle_tower.c:1633-1660` and `frontier_util.c:2497-2547`, used by the
*other six* Frontier facilities' Brains — Anabel/Tucker/Spenser/Greta/
Lucy/Brandon draw from a hardcoded `sFrontierBrainsMons[facility][symbol][i]`
roster and a fixed fake OT id 61226,
`frontier_util.c:2495,2504-2532`; the Factory's Brain does **not** use that
generic path at all). `FillFactoryBrainParty` itself
(`battle_factory.c:759-826`) is documented exhaustively in
`docs/noland-brain-ground-truth.md` and already ported at
`src/engine/factoryBrainOpponentGeneration.ts` (commit history: this
worktree's base). Two receipts (silver/gold) prove it byte-exact against
live ROM RNG.

### 2.2 AI aggression flags — SEMANTIC, load-bearing, already ported, currently unreachable via the lab

`battle_ai_script_commands.c:369-370` dispatches Factory battles to
`GetAiScriptsInBattleFactory()` (`battle_factory.c:889-911`):

```c
if (gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN)
    return AI_SCRIPT_CHECK_BAD_MOVE | AI_SCRIPT_TRY_TO_FAINT | AI_SCRIPT_CHECK_VIABILITY;
else if (challengeNum < 2)
    return 0;
else if (challengeNum < 4)
    return AI_SCRIPT_CHECK_BAD_MOVE;
else
    return AI_SCRIPT_CHECK_BAD_MOVE | AI_SCRIPT_TRY_TO_FAINT | AI_SCRIPT_CHECK_VIABILITY;
```

This reads `gTrainerBattleOpponent_A` **directly** — it is not derived from
party contents, species, or any field `overrides.parties` can set. It is
already ported and pinned: `src/data/gen/factory-ai-policy.json`'s
`frontierBrain` branch (`order:1`, `condition:"gTrainerBattleOpponent_A ==
TRAINER_FRONTIER_BRAIN"`, `mask:7`) and
`src/engine/factoryAiMaskSelection.ts:126-143`'s `branchMatches` switch,
tested at `tests/factoryAiMaskSelection.test.ts` and
`tests/factoryAiMaskParity.test.ts:87-158` (RAM-pinned regression cases
including `trainerOpponentId: TRAINER_FRONTIER_BRAIN` at every streak). This
is the single most important fact for §4: **the engine already models this
correctly; only the oracle-side staging path cannot reach it**, because
nothing in the current `mechanicLab` schema can set
`gTrainerBattleOpponent_A` to a Brain-class value without the validator
rejecting the request first.

Concretely, at challenge index 2 (Noland's silver battle,
`challengeNum == 2`), an ordinary trainer at that same challenge index gets
`AI_SCRIPT_CHECK_BAD_MOVE` only (mask 1); the real Noland battle gets all
three flags (mask 7) — a materially more aggressive AI (faint-seeking,
viability-checking) that a same-challengeNum ordinary-trainer trace cannot
exercise. At challenge index 5 (gold), an ordinary trainer already gets mask
7 (`challengeNum >= 4`), so the two masks happen to coincide there — but the
representation must be correct in general, not merely for these two specific
battles, since `trainerOpponentId` is a first-class input to the ported
selector.

### 2.3 Trainer identity: pic, class, name, gender — PRESENTATION ONLY

- Sprite/pic index: `GetFrontierBrainTrainerPicIndex()`
  (`frontier_util.c:2443-2453`), consulted at
  `battle_controller_opponent.c:1249,1333` (`OpponentHandleDrawTrainerPic`/
  `OpponentHandleTrainerSlide`) and `battle_tower.c:1412-1415`
  (`GetFrontierTrainerFrontSpriteId`). Returns
  `gTrainers[sFrontierBrainTrainerIds[FRONTIER_FACILITY_FACTORY]].trainerPic`
  = `gTrainers[TRAINER_NOLAND].trainerPic`
  (`sFrontierBrainTrainerIds[FRONTIER_FACILITY_FACTORY] = TRAINER_NOLAND`,
  `frontier_util.c:719-728`).
- Trainer class: `GetFrontierBrainTrainerClass()`
  (`frontier_util.c:2455-2465`), consulted at `battle_tower.c:1445-1448`
  (`GetFrontierOpponentClass`) and `battle_message.c:2530-2531`
  (`B_TXT_TRAINER1_CLASS`). Returns `gTrainers[TRAINER_NOLAND].trainerClass`
  = `TRAINER_CLASS_FACTORY_HEAD`
  (`reference/pokeemerald/src/data/trainers.h:9712-9722`).
- Name: `CopyFrontierBrainTrainerName()` (`frontier_util.c:2467-2481`),
  consulted at `battle_tower.c:1524-1528` (`GetFrontierTrainerName`) and
  `battle_message.c:2554-2558` (`B_TXT_TRAINER1_NAME`). Copies
  `gTrainers[TRAINER_NOLAND].trainerName` = `"NOLAND"`.
- Gender (for message pronoun text): `IsFrontierBrainFemale()`
  (`frontier_util.c:2483-2487`), consulted at `battle_tower.c:1585-1588`.
  Reads `sFrontierBrainObjEventGfx[FRONTIER_FACILITY_FACTORY][1]`
  (overworld object-event table, not a battle field).
- Overworld sprite for the pre-battle walk-up:
  `SetFrontierBrainObjEventGfx_2()` (`frontier_util.c:2489-2493`), consulted
  at `battle_tower.c:1172-1176` (`SetBattleFacilityTrainerGfxId`) —
  irrelevant to the lab, which starts past the overworld.

None of these touch `state.battlers`/`state.parties`/the AI decision. They
select which sprite sheet, class string, and name string get rendered/read
into text buffers — a `mechanicLab` semantic capture does not expose trainer
sprite pixels or dialogue text today (`tools/battle-lab/README.md:17-19`
enumerates the capture surface: battlers, stats, moves, PP, abilities,
types, items, statuses, weather, side conditions, RNG, controller state —
no sprite/dialogue fields). **Presentation-only for this design's purposes.**

### 2.4 Victory music — PRESENTATION ONLY, post-battle

`battle_main.c:4978-4981` (`HandleEndTurn_BattleWon`):

```c
if (gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN)
    PlayBGM(MUS_VICTORY_GYM_LEADER);
else
    PlayBGM(MUS_VICTORY_TRAINER);
```

Audio only; S11 audio is out of scope (`ROADMAP.md:950-952`). Also
post-battle, outside any `mechanicLab` capture's mid-battle window.

### 2.5 Battle Points reward — SEMANTIC but outside the lab's window, deferred

`frontier_util.c:1892-1906` (`GiveBattlePoints`): a flat `+10` BP bonus (and
`+10` daily BP) when `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`,
on top of the normal `sBattlePointAwards[challengeNum][facility][battleMode]`
table lookup. This is real save-state mutation, but it fires from the
facility's post-battle round-loop script, not from anything a
`mechanicLab` pre-battle-to-in-battle capture window reaches (the lab's
checkpoint is the first action menu through in-battle trace segments;
`GiveBattlePoints` runs after the battle's outcome resolves, in
`frontier_util.c`'s facility-wrapup call chain, which the lab does not
drive). Symbol/BP bookkeeping is explicitly out of this program's scope per
`ROADMAP.md:971-972` ("symbol/BP/reward bookkeeping keeps its existing
scope"). Noted for completeness; not part of this design's staging surface.

### 2.6 `IsTrainerFrontierBrain` script special — PRESENTATION/SCRIPT ROUTING ONLY

`frontier_util.c:1839-1845`: sets `gSpecialVar_Result` for map-script
dialogue branching (used by the pre/post-battle event scripts to choose
Brain-specific dialogue trees). Not consulted by any code under
`battle_*.c`'s in-battle path; irrelevant to a semantic capture.

### 2.7 Summary table

| Site | Kind | Matters for a Battle-Scene-OFF semantic trace? |
| --- | --- | --- |
| `FillFactoryBrainParty` dispatch (`battle_tower.c:1855-1859`) | Party generation | **Yes** — already ported |
| `GetAiScriptsInBattleFactory` (`battle_factory.c:889-911`) | AI aggression mask | **Yes** — already ported, currently unreachable via the lab |
| `GetFrontierBrainTrainerPicIndex`/`…Class`/`…Name`/`IsFrontierBrainFemale` | Sprite/class/name/gender text | No — presentation only, outside capture surface |
| `HandleEndTurn_BattleWon` BGM select | Victory music | No — presentation only, post-battle |
| `GiveBattlePoints` +10 BP | Reward bookkeeping | Real but outside the lab's capture window; out of program scope |
| `IsTrainerFrontierBrain` special var | Dialogue script routing | No — map-script only |

**Conclusion for §3/§4:** exactly two things about `TRAINER_FRONTIER_BRAIN`
matter to a `mechanicLab` semantic trace: which function fills the party,
and which AI mask the opponent thinks with. Both are gated on the literal
runtime value of `gTrainerBattleOpponent_A`, not on party contents,
species, or anything else `overrides.parties` can express.

## 3. Proposed representation

### 3.1 Shape: a new `factoryBrain` mode, not a widened `trainerId`

Add `"factoryBrain"` as a third value of the existing `mode` field
(alongside `"factoryLegal"`/`"mechanicLab"`,
`oracle/battle_lab.py:379-381`), rather than raising `trainerId`'s upper
bound. This satisfies §1's "must never be staged as an ordinary trainer id"
requirement structurally: a `factoryBrain` request has no `trainerId` field
at all (the value is implied — always `TRAINER_FRONTIER_BRAIN`), so there is
no numeric field a caller could set to `1022` by mistake, and the harness's
per-mode validation branch can apply Brain-specific rules that would be
nonsensical for `factoryLegal`/`mechanicLab` (§3.4).

### 3.2 Request fields

Mirrors `factoryLegal`'s existing shape minus the fields that do not apply,
plus the fields the probe proved load-bearing
(`docs/noland-brain-ground-truth.md`'s method section, restated here as the
schema):

```json
{
  "schemaVersion": 1,
  "mode": "factoryBrain",
  "profile": "battle-scene-off",
  "level": 50,
  "challengeNum": 2,
  "playerSetIds": [156, 149, 180],
  "rentalSwapCount": 0,
  "seed": 305419896,
  "trace": { "segments": [], "captureFrames": [0] }
}
```

| Field | Type | Validation | Source justification |
| --- | --- | --- | --- |
| `mode` | literal `"factoryBrain"` | fixed | New discriminant; §3.1 |
| `level` | integer | `50` only (matches `factoryLegal`'s current v1 bound, `oracle/battle_lab.py:387`) | `FillFactoryBrainParty` is reachable at any `lvlMode`, but v1 stays Level-50-only like the rest of the lab; Open-level is out of scope per `tools/battle-lab/README.md:72` |
| `challengeNum` | integer | `0..7`, but **only `2` and `5` are meaningful** (Noland is the final battle of challenge indices 2 and 5, `docs/gate2-noland-scope-note.md:39-46`); reject the rest with a structured error naming the two legal values | `GetFrontierBrainStatus`'s `sFrontierBrainStreakAppearances` table drives *when* the game presents Noland (`frontier_util.c:1656-1693`), but `FillFactoryBrainParty` itself has no such gate — it derives `challengeNum` from whatever `factoryWinStreaks` value is staged (`battle_factory.c:771`) and will happily generate a "Brain" party at any streak. The harness should still bound the request to the two real in-game encounters so the representation cannot stage nonsense (e.g. "Noland at challenge 0") that never happens on real hardware — an explicit, named restriction, not a silent one |
| `playerSetIds` | 3 integers | same bound/legality as `factoryLegal`'s `playerSetIds` (`oracle/battle_lab.py:396-397`) | drives the real rental draft the same way; produces the full 6-slot `frontier.rentalMons[]` context `FillFactoryBrainParty`'s saved-rental rejection reads (`battle_factory.c:786-792`) |
| `rentalSwapCount` | integer | same as today (`oracle/battle_lab.py:399-404`) | unlocks rental-rank bands identically; Noland's own generation does not depend on it, but the player's draft pool does |
| `seed` | integer | same as today | drives `gRngValue` at the point `FillFactoryBrainParty` starts drawing, matching the probe's proven RNG-cursor handoff |
| `trace` | object | same nested contract as every other mode | unchanged; §3.5 |

Deliberately **absent** fields, each because the corresponding source
routine reads it directly rather than accepting it as a parameter:

- `trainerId` — always `TRAINER_FRONTIER_BRAIN` (1022); not caller-settable
  (§3.1).
- `battleNum` — Noland is always the 7th (`battleNum == 6`) battle of his
  challenge; not a free choice.
- `opponentSetIds` — ordinary trainers' opponent party comes from
  caller-chosen `gFrontierTempParty` set ids consumed by
  `FillFactoryFrontierTrainerParty`'s non-Brain branch
  (`battle_tower.c:1867-1884`); Noland's does not — `FillFactoryBrainParty`
  draws live via `GetFactoryMonId` (`battle_factory.c:779`), reading only
  `challengeNum` and `gRngValue`. There is no "opponent set id" input to
  supply.

### 3.3 Harness mechanism — already exists, needs no new RAM-poke plumbing

The write the probe proved sufficient
(`gTrainerBattleOpponent_A = TRAINER_FRONTIER_BRAIN`, plus
`factoryWinStreaks[SINGLES][LVL_50] = streak`) is **already the exact code
path the harness runs for every mode today**:

```python
# oracle/battle_lab.py:560-565, 583 (read-only citation)
current_streak = request["challengeNum"] * 7 + request["battleNum"]
self.oracle.write_u16(save2 + SB2_FACTORY_WIN_STREAK_SINGLES_50, current_streak)
...
self.oracle.write_u16(self.oracle.symbols["gTrainerBattleOpponent_A"], request["trainerId"])
```

Nothing here is bounded to the ordinary trainer-id range at the RAM-write
layer — the only place `1022` is currently refused is the *validator*
(`oracle/battle_lab.py:390-395`). A `factoryBrain` handler therefore needs
no new low-level mechanism: it computes `current_streak = challengeNum * 7 +
6` (always the last battle of the challenge) and calls the same
`write_u16(gTrainerBattleOpponent_A, TRAINER_FRONTIER_BRAIN)` the existing
code already has, using the harness's existing symbol table. The full 6-slot
`frontier.rentalMons[]` write (`oracle/battle_lab.py:576-580`, from
`rental_plan.candidates`, a 6-element list built by the existing rental-draft
planner, `oracle/battle_lab.py:1420`) is likewise unchanged machinery — a
`factoryBrain` request runs the identical real rental draft from
`playerSetIds` that `factoryLegal` runs today, which is exactly what
populates the 6-slot context `FillFactoryBrainParty`'s saved-rental
exclusion reads. The only genuinely new code is: (1) the `factoryBrain`
validator branch (§3.2's table), (2) skipping the `opponentSetIds`/
`gFrontierTempParty` write (there is nothing to write — §3.2), and (3)
routing to the same `DoBattleFactorySelectScreen` re-entry and rental
selection replay the other modes already use (`oracle/battle_lab.py:589-623`
— entirely mode-agnostic today).

### 3.4 Rejection rules — what stays illegal

- `mode: "factoryLegal"` or `"mechanicLab"` with `trainerId >= 300` (or any
  attempt to reach `1022` through that field): **stays rejected**, unchanged
  — this is the standing correctness stance from §1, and `factoryBrain`'s
  existence does not loosen it.
- `mode: "factoryBrain"` with `challengeNum` outside `{2, 5}`: rejected
  (§3.2) — these are the only two real in-game Noland encounters.
  `battleNum` is not a field, so there is no way to request a non-final
  Brain battle either.
- `mode: "factoryBrain"` combined with `overrides.battlers` (the legacy
  active-loadout form): reject outright. That form substitutes loadouts
  *after* initial send-out (`tools/battle-lab/README.md:47-54`) and would
  require the Brain's live-RNG-generated party to already exist and be
  known before the override applies — defeating the entire point of staging
  the real generation. If a caller wants a specific known party instead of
  the live-generated one, §3.4's next bullet is the sanctioned path, not
  this legacy form.
- `mode: "factoryBrain"` combined with `overrides.parties`: **allowed**, not
  rejected — this is how a caller pins a specific, previously-observed
  Brain roster (e.g. replaying the silver/gold receipts' exact mons) for a
  deterministic mechanic test, exactly like `overrides.parties` already
  works for `mechanicLab`. Critically, `trainerId`/`gTrainerBattleOpponent_A`
  stays `TRAINER_FRONTIER_BRAIN` regardless — `overrides.parties` only
  replaces the *resulting* persistent party records after the Factory
  constructors run (`tools/battle-lab/README.md:39` "before `CB2_InitBattle`"),
  it never touches `gTrainerBattleOpponent_A`, so the AI-mask selector
  (§2.2) still reads the real Brain identity and computes mask 7 correctly
  even when the party itself is caller-specified. This composition is what
  makes `factoryBrain` + `overrides.parties` semantically sufficient in a
  way bare `overrides.parties` under `mechanicLab` (with an ordinary
  `trainerId`) is not — see §4.
- Anything already illegal for `factoryLegal`/`mechanicLab` (schema version,
  unknown fields, out-of-range seeds, malformed trace) stays illegal
  identically; `factoryBrain` reuses the same shared validator helpers
  (`_integer` at `oracle/battle_lab.py:193-196`, `_set_ids` at
  `:199-202`, `_pre_checkpoint_capture_frames` at `:205-211`) inside the
  same `validate_request` body (`:361-444`).

### 3.5 Interaction with the checkpoint/trace flow — unchanged

`factoryBrain` reaches the **same** post-checkpoint anchor as every other
mode: frame zero is the first player action menu after
`CB2_InitBattle`-adjacent initialization (`tools/battle-lab/README.md`'s
description of the `trace` contract; `oracle/battle_lab.py:642-644`, "user
trace frames are relative to the completed lab setup"). The nested `trace`
is ordinary controller input exactly as documented for `factoryLegal`/
`mechanicLab` — "the nested trace is normal controller input and the stock
ROM—not the staging API—calculates every outcome"
(`workspace/AGENTS.md:198-201` restates the umbrella contract). No new
capture fields, no new frame-numbering space, no changes to
`preCheckpointCaptureFrames`/`preCheckpointCaptureAllFrames` — those are
already mode-agnostic (`oracle/battle_lab.py:416-427`). `factoryBrain`
simply reaches the checkpoint through
`FillFactoryBrainParty`/`GetAiScriptsInBattleFactory` instead of the
ordinary trainer path; everything downstream of "battle has started, two
battlers exist" is identical machinery.

## 4. Why NOT `overrides.parties` alone — the verdict

**`overrides.parties` alone, under ordinary `mechanicLab` with an in-range
`trainerId`, is semantically DEFICIENT for staging Noland — not
sufficient.** One concrete, source-cited deficiency, not a hypothetical:

- **AI aggression mask is wrong at challenge index 2.** §2.2 shows
  `GetAiScriptsInBattleFactory` reads `gTrainerBattleOpponent_A` directly,
  independent of party contents. `overrides.parties` writes persistent
  `struct Pokemon` records; it has no way to set `gTrainerBattleOpponent_A`
  to `TRAINER_FRONTIER_BRAIN` (the field driving that read is bound to
  `trainerId`, itself bound `0..299` at validation,
  `oracle/battle_lab.py:395`). Staging "Noland's silver-battle roster" via
  `overrides.parties` + an ordinary `trainerId` therefore produces a battle
  where the opponent's real party appears correct but its AI thinks with
  mask 1 (`AI_SCRIPT_CHECK_BAD_MOVE` only) instead of the real mask 7
  (`+TRY_TO_FAINT +CHECK_VIABILITY`) — a directly observable, already-ported,
  already-tested divergence (`src/engine/factoryAiMaskSelection.ts:134-135`;
  `tests/factoryAiMaskParity.test.ts:107-112`). This is exactly the kind of
  "trainer-id-dependent branch mid-battle" the step brief asked to check
  for, and it is real.
- At challenge index 5, the same ordinary-trainer branch (`challengeNum >=
  4`) happens to compute the identical mask 7 (`battle_factory.c:906-909`),
  so this specific deficiency is not observable in the gold case — but a
  design cannot rely on that coincidence; the representation must be
  correct for the general mechanism, and challenge 2 already proves it
  matters.
- **Party generation itself is not a deficiency of `overrides.parties`** —
  it is moot. `overrides.parties` *replaces* whatever party the Factory
  constructors built, regardless of which constructor ran
  (`tools/battle-lab/README.md:39` "after the normal Factory constructors
  finish"). So if the goal is "stage a specific, already-known Noland
  roster" (e.g. replaying `docs/noland-brain-ground-truth.md`'s exact
  silver/gold mons for a downstream mechanic test), `overrides.parties`
  reproduces that roster correctly regardless of which code filled the
  party first. The deficiency is narrowly the AI mask, not the mons.
- **No other mid-battle `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`
  branch is reachable from a `mechanicLab` capture window.** §2's full
  census found exactly two semantic sites (§2.1 party fill, §2.2 AI mask)
  and four presentation/reward sites outside the capture surface (§2.3-2.6).
  Reward/BP bookkeeping (§2.5) is explicitly out of this program's scope.
  So the AI mask is not just *a* deficiency — enumerated exhaustively, it is
  **the only** in-battle semantic deficiency of `overrides.parties` alone.

**What this implies for the design:** the cheapest sound design is not
"`overrides.parties` + a bare trainer-id field" (that reintroduces exactly
the schema-rejection problem §1 forbids, by making `trainerId` a plain
integer a caller could set to `1022`) — it is §3's `factoryBrain` mode,
whose entire job is to guarantee `gTrainerBattleOpponent_A ==
TRAINER_FRONTIER_BRAIN` structurally (not via a caller-suppliable numeric
field) while still **permitting** `overrides.parties` as an optional
composition for callers who want a pinned roster instead of the live
RNG-drawn one (§3.4). That composition is strictly more capable than
`overrides.parties` alone: it gets the correct AI mask *and* an optional
pinned party, at no extra staging cost beyond §3.3's already-existing
mechanism.

## 5. Layering — harness edits vs workspace consumers

### 5.1 Harness-side edits — **user-level: harness changes go through the user**

These live in `oracle/` (`oracle/battle_lab.py`, `oracle/BATTLE_LAB.md`),
above the workspace boundary this session may not cross
(`CLAUDE.md`: "Do not edit files under `workspace/` here unless the user
asks for it" — symmetrically, this workspace-level session may not edit
`oracle/`). Enumerated as a handoff list for a future harness-side session:

1. `oracle/battle_lab.py:379-381` — add `"factoryBrain"` to the accepted
   `mode` enum.
2. `oracle/battle_lab.py:361-444` (`validate_request`) — add a
   `factoryBrain`-specific branch: no `trainerId`/`battleNum`/
   `opponentSetIds` fields accepted; `challengeNum` restricted to `{2, 5}`
   (§3.2/§3.4); `overrides.battlers` rejected when combined with
   `factoryBrain` (§3.4); `overrides.parties` permitted.
3. `oracle/battle_lab.py:560-583` (the pre-rental RAM-write block) —
   for `factoryBrain` requests, compute `current_streak = challengeNum * 7 +
   6` and write `gTrainerBattleOpponent_A = TRAINER_FRONTIER_BRAIN`
   (constant, not `request["trainerId"]`); skip the `gFrontierTempParty`
   write entirely (§3.2's "deliberately absent" `opponentSetIds`).
4. `oracle/battle_lab.py`'s response-shape construction (~line 645-665) —
   add whatever `factoryBrain`-specific echo fields are useful for the
   caller (e.g. `challengeNum`, omit `trainerId`/`opponentSetIds`/
   `rangeIndex` since they don't apply the same way); exact shape is a
   harness-side judgment call, not specified further here.
5. `oracle/test_battle_lab.py` — pure contract tests for the new mode's
   validation branch (mirroring the existing `factoryLegal`/`mechanicLab`
   coverage pattern).
6. `oracle/BATTLE_LAB.md` — document the new mode: request shape, the
   `challengeNum ∈ {2, 5}` restriction, the `overrides.parties`-permitted/
   `overrides.battlers`-rejected asymmetry, and update the "Version-1
   boundaries" section (`oracle/BATTLE_LAB.md`'s existing "Noland's
   challenge-2 and challenge-5 final battles are rejected explicitly"
   sentence needs updating; the same fact is restated in workspace-side
   `tools/battle-lab/README.md:72-75` ("It stages regular trainers rather
   than Noland") — that file is workspace-owned and can be updated in a
   normal workspace step once §5.1 lands, no harness access required).
7. A live smoke proof analogous to
   `oracle/battle-lab-smoke-test.py` — stage a real `factoryBrain` request
   against a running Battle Scene OFF service and confirm the resulting
   `state.battlers`/opponent party matches an independent `FillFactoryBrainParty`
   reconstruction (mirroring `tools/probe/verify-noland-brain-receipts.ts`'s
   check, but through the lab endpoint instead of a raw probe).

### 5.2 Workspace-side consumers — can land independently once §5.1 exists

These are ordinary workspace (`src/`, `tools/compare/`, `tests/`) changes,
in scope for a future side- or main-lane worker once the harness half is
live:

- **`tools/battle-lab/README.md:72-75`** — once §5.1 lands, update "It
  stages regular trainers rather than Noland" to describe the new
  `factoryBrain` mode; this file is workspace-owned (unlike
  `oracle/BATTLE_LAB.md`) and needs no harness access to edit.
- **`tools/compare/appTrace.ts` staging support** — teach the compare
  harness to recognize a `factoryBrain`-mode battle-lab trace the same way
  it already special-cases `factoryLegal`/`mechanicLab` output, so a staged
  Noland battle can be replayed through the app engine and diffed
  frame-by-frame like any other compare trace.
- **Compare traces / new fixtures under `tools/battle-lab/`** — checked-in
  `factoryBrain` scenario JSON (e.g.
  `tools/battle-lab/factory-brain-silver-turn1.json`) once the harness
  accepts the mode, following the existing fixture-authoring pattern
  documented in `tools/battle-lab/README.md`.
- **Tier-1 fixtures / tests** — the *algorithmic* pieces
  (`factoryBrainOpponentGeneration.ts`, `factoryAiMaskSelection.ts`) are
  already ported and pinned by pure Tier-1 tests today
  (`tests/factoryBrainOpponentGeneration.test.ts`,
  `tests/factoryAiMaskSelection.test.ts`,
  `tests/factoryAiMaskParity.test.ts`) and need **no** change for this
  design — they already accept `TRAINER_FRONTIER_BRAIN` as an ordinary
  input value. What's new once §5.1 lands is an *oracle-integration* proof
  (§6) that both algorithms combine correctly inside one live ROM battle,
  which is a Tier-2 (`tools/compare/`) concern, not Tier-1.
- **Round-loop / battle-number branch** — main lane's parallel
  `FillFactoryBrainParty` port and "battles-21/42 round-loop branch"
  (`ROADMAP.md:965-970`) is explicitly the concurrently-landing scheduling
  rung this step is scoped away from (step brief "Out of scope"); this
  design's `factoryBrain` staging mode is orthogonal to it — the lab stages
  a single Brain *battle* directly, bypassing the round loop entirely, the
  same way `factoryLegal` already bypasses it for ordinary trainers.

## 6. Verification plan

**Bar already established** (per the step brief and
`docs/noland-brain-ground-truth.md`): pool/rules/odds receipts plus
captured-cursor byte-exactness — i.e. `GetFactoryMonId`'s candidate range,
the five rejection rules in their real source order, and the RNG cursor
before/after each draw, matching real hardware/mGBA exactly for at least one
silver and one gold case. This bar is **already met** for party generation
(`tools/probe/receipts/noland-brain-party-{silver,gold}.json`,
`tools/probe/verify-noland-brain-receipts.ts`, 48 passing checks) and for AI
mask selection (`tests/factoryAiMaskParity.test.ts`'s RAM-pinned regression
cases, sourced from the same generated policy the probe's caller-symbol
attribution cross-checked).

**What a staged end-to-end brain-battle semantic trace through
`factoryBrain` would newly prove**, beyond what's already proven at the
algorithm level:

1. The harness's RAM-write sequence (§3.3) — streak, trainer-opponent
   global, rental-draft plumbing — composes correctly when driven through
   the actual `/v1/battle-lab/run` HTTP contract rather than a bespoke probe
   script, i.e. that the *integration* is correct, not just each algorithm
   in isolation.
2. That `state.battlers`'s AI-visible opponent, once staged, actually
   *acts* with mask-7 aggression during a real in-battle turn (e.g. picks a
   viability-checked move rather than whatever a mask-1 opponent would've
   picked at the same challenge index) — a live behavioral proof that the
   ported `factoryAiMaskSelection` branch is wired to the live AI decision
   path for a Brain opponent specifically, not just unit-tested in
   isolation.
3. That `overrides.parties` composed with `factoryBrain` (§3.4) produces a
   deterministic, replayable Brain battle with a caller-chosen roster and
   the correct AI mask simultaneously — proving the §4 composition claim
   empirically, not just by source-reading.

**Which existing test family this extends:** the receipts/differential
family under `tools/probe/` + `tests/factoryAiMaskParity.test.ts`
(RAM-pinned "ts vs wasm vs real hardware" style regression cases) gains a
sibling: a `tools/battle-lab/factory-brain-*.json` fixture run through
`bin/oracle lab` and cross-checked against
`generateFactoryBrainOpponent`/`selectFactoryAiMask`'s pure-engine output,
the same "stage it live, reconstruct it from source-ported logic, diff"
pattern `tools/probe/verify-noland-brain-receipts.ts` already established
for the party-generation half alone.

## 7. Open questions

Each item names its own evidence gap; none are silently decided.

1. **Does `factoryBrain`'s `challengeNum` restriction to `{2, 5}` belong in
   the harness validator, or should the harness accept any `0..7` and let
   the *workspace* fixture author choose only 2/5?** Recommendation: harness
   validator (§3.2/5.1#2) — matches the existing pattern where
   `factoryLegal` itself enforces source-real bounds rather than trusting
   callers, and prevents a fixture from silently drifting into a
   nonexistent in-game encounter. Evidence gap: no probe has confirmed
   whether `FillFactoryBrainParty` behaves identically (no crash, no OOB
   read) for a fabricated `challengeNum` outside `{2, 5}` at the streak
   level — plausible from source (§3.2's row already notes the function has
   no such gate itself) but unverified live. If a future harness session
   wants "arbitrary streak, Brain-flavored AI" for stress-testing rather
   than "the real Noland encounter," that's a legitimate, different use
   case that should be a *separate*, explicitly-named lab affordance, not a
   loosened `factoryBrain`.
2. **Should `factoryBrain` expose the derived `challengeNum + 2` fixed-IV
   value and the `sInitialRentalMonRanges` draw range in its response**,
   the way `factoryLegal`'s response echoes `rangeIndex`? Recommendation:
   yes, mirroring the ground-truth doc's "derived fixed IV" / "derived monId
   draw range" fields — cheap to compute (already exposed via
   `generateFactoryBrainOpponent`'s `challengeNum`/`fixedIv` return fields,
   `src/engine/factoryBrainOpponentGeneration.ts:124-140`) and useful for a
   caller cross-checking against the workspace port without re-deriving it.
   Evidence gap: none — this is a response-shape convenience decision, not
   a correctness question; flagged as open only because it changes the
   harness-side response schema and this doc must not decide harness-side
   schema unilaterally (§5.1).
3. **Is a `preview_report()`-style earlier-checkpoint extension ever needed
   for Noland specifically** — e.g. does the attendant's scouting dialogue
   say anything Brain-specific before a Noland battle that ordinary-trainer
   `preview_report()` (`oracle/BATTLE_LAB.md`'s "Report preview" section)
   wouldn't cover? Recommendation: out of scope for this design — Gate-2's
   *other* remainder item (the post-scouting-dialogue checkpoint gap,
   `docs/gate2-noland-scope-note.md` item 2) is a separate, already-recorded
   limitation that applies to all trainers uniformly, not something this
   Brain-specific design should fold in. Evidence gap: no source citation
   surveyed here confirms or denies Brain-specific scouting text; not
   investigated this session because it is out of this step's assigned
   scope (Noland program item 3 only).
4. **Where should the `factoryBrain` + `overrides.parties` rejection-vs-
   acceptance line sit for a party that doesn't match any of
   `FillFactoryBrainParty`'s own legality rules** (e.g. a caller-specified
   roster containing a species outside the Level-50 high-tier band, or
   duplicate items)? Recommendation: apply the same validation
   `overrides.parties` already applies to ordinary `mechanicLab` parties
   (`tools/battle-lab/README.md:36-38`'s "three complete legal Pokémon"
   bounds) — i.e., `overrides.parties` under `factoryBrain` should follow
   ordinary Pokémon-record legality (species/move/IV/EV bounds), NOT
   `FillFactoryBrainParty`'s own additional rejection rules (unown,
   high-tier, saved-rental, dup-species, dup-item), since those rules exist
   to constrain the *live-generation* candidate search, not to define what
   a Pokémon record may contain. A caller overriding the party has
   deliberately opted out of live generation; the override should be
   validated as an ordinary custom party, exactly as `overrides.parties`
   already is for every other mode. Evidence gap: none identified against
   this recommendation, but it is called out because §3.4 states the
   composition is "permitted" without previously specifying which
   legality rules apply to the override itself.
