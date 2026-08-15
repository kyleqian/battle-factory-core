# Battle lab oracle contract

`POST /v1/battle-lab/run` is an additive, versioned staging API over the same
stock-ROM mGBA oracle as `/v1/run`. It stages battle prerequisites; it does not
calculate or inject outcomes.

The service still has one fixed Battle Scene profile. A request's `profile`
must match that running service. Canonical `/v1/run`, its snapshot, and its
pixel hashes are unchanged.

## Modes

- `factoryLegal` accepts a Level-50 challenge number, battle number, trainer
  ID, three player Frontier set IDs, three opponent set IDs, the number of
  prior rental swaps, and an RNG seed. It enforces the source's challenge and
  rental-rank ranges, last-battle trainer ranges, species rules, and held-item
  rules.
- `mechanicLab` starts from the same legal Factory route, then either constructs
  three complete legal Pokémon on each side before battle initialization or
  applies the legacy allowlisted loadout choices to the two active Pokémon.
  The stock ROM executes entry hooks, switching, moves, RNG, damage, status,
  and end-turn processing.
- `factoryBrain` stages Noland, the Factory's Frontier Brain, at one of his
  two real encounters: `challengeNum` 2 (silver) or 5 (gold). The request has
  no `trainerId`, `battleNum`, or `opponentSetIds` fields — the trainer is
  structurally `TRAINER_FRONTIER_BRAIN`, the battle is always the challenge's
  final one, and the opponent party is generated live by the ROM's
  `FillFactoryBrainParty` (which draws with the real rejection rules,
  excluding the staged player rentals, at fixed IV 15/31). The response omits
  `trainerId`/`rangeIndex` and instead echoes `fixedIv` and `opponentParty`
  (the ROM-generated roster read back after battle initialization).
  `overrides.parties` is permitted, to pin a known Brain roster for
  deterministic replays — the AI still thinks with the Brain's real
  aggression mask either way; `overrides.battlers` is rejected.
  For `challengeNum` 5 the lab also sets the Factory silver symbol flag
  before the route runs: gold is unreachable in the real game without it,
  and `GetFrontierBrainStatus` otherwise reads NOT_READY at streak 41, so
  the overworld would present the ordinary-trainer entrance instead of gold
  Noland's (the battle itself was always the Brain's — party generation
  keys on the trainer ID — but the entrance, intro text, and any
  presentation content around the battle were the ordinary trainer's).
  Challenge-5 fixtures captured before this derivation existed carry that
  mis-staged presentation and must be re-run.
- `factoryBrain` with `walkup: true` stages the *approach* to that battle
  instead of the battle itself — the post-battle-20/41 PreBattleRoom
  re-entry: heal line, Noland's phone call, the GO ON/RECORD/REST/RETIRE
  ask-ready menu, and the pre-head swap prompt. See "Frontier-Brain walk-up
  staging" below.

In Emerald's Battle Factory, trainer identity and opponent set generation are
separate selections within the current challenge band. The Factory does not
use the trainer's `monSet` list (that list is used by facilities such as the
Battle Tower), so `factoryLegal` intentionally does not impose a
trainer-specific set list.

Internally, the lab restores the canonical rental checkpoint, replaces the
semantic Factory IDs, re-enters `DoBattleFactorySelectScreen`, selects the
requested three candidates through controller input, and lets
`FillFactoryFrontierTrainerParty` and the normal battle initialization create
the base parties. Complete Mechanics Lab parties replace those base records at
the stable overworld-to-battle handoff, before normal battle initialization.
Addresses and structure offsets are not part of the API.

## Request

```json
{
  "schemaVersion": 1,
  "mode": "factoryLegal",
  "profile": "battle-scene-off",
  "level": 50,
  "challengeNum": 0,
  "battleNum": 0,
  "trainerId": 50,
  "rentalSwapCount": 0,
  "playerSetIds": [156, 149, 180],
  "opponentSetIds": [188, 184, 135],
  "seed": 305419896,
  "trace": {
    "segments": [],
    "captureFrames": [0]
  }
}
```

The nested `trace` uses the ordinary `/v1/run` segment contract. Frame zero is
the first player action menu after source initialization, including any
species- or ability-dependent entrance messages. Each capture adds a semantic
`state` object alongside the normal framebuffer hash and PNG.

The `battleLab.player`, `battleLab.opponent`, and `rentalFillers` arrays are
the requested source-catalog set records. Captured `state.battlers` is the
authoritative post-construction battle state. In particular, Emerald's Factory
constructor intentionally replaces a catalog `Return` move with `Frustration`
because rental friendship is zero.

Each capture exposes raw status words plus a named permanent status (including
sleep/toxic counters), the four PP-Up counts, and named timed state:
`weatherTurns`, per-battler confusion/Leech Seed/Perish Song values, and each
side's Reflect, Light Screen, Mist, Safeguard, and Spikes values.

## Pre-checkpoint captures

`preCheckpointCaptureFrames` (optional, defaults to `[]`) requests captures
from the internal route `prepare()` already drives between `new_session()`
and the action-menu checkpoint above — the rental-selection screen and the
battle-start intro cutscene (Pokéball throw, send-out). These frames use a
**separate, absolute coordinate space**: frame 0 here is immediately after
`new_session()`, before any semantic writes, unrelated to the post-checkpoint
frame zero the request's own `trace` is relative to. The internal route never
exceeds 3664 frames end to end (rental selection ranges 1886-1936 frames
depending on which candidates get selected — 1886 only for the specific
`(0, 1, 2)` ordering, brute-force verified across all reachable orderings —
plus a 120-frame lead-in; the intro-acknowledgement loop polls in up to 12
further chunks of up to 134 frames to cover species/ability-dependent
entrance messages).

```json
{
  "preCheckpointCaptureFrames": [0, 1500, 3200]
}
```

Each returned `battleLab.preCheckpointCaptures[]` entry has the same shape as
an ordinary trace capture (`frame`, `sha256`, `pngBase64`, `state`). `state`
is the same semantic snapshot the post-checkpoint captures use; before the
battle proper initializes (checked at the end of `prepare()` as
`gBattlersCount == 2`), `state.battlers`/`state.parties` reflect whatever the
emulator's battle-struct memory happens to hold, not a real battle — treat
early frames' `state` as meaningful only outside the battle-struct fields
(e.g. `state.engine.mainCallback2`) until the battle actually starts.

This is additive and opt-in: omitting the field, as every fixture predating
this addition does, costs one extra `frame in wanted` check per internal
frame and produces no captures — the post-checkpoint contract above is
completely unaffected.

For dense coverage (e.g. building a full animation-acceptance trace), set
`preCheckpointCaptureAllFrames: true` instead of enumerating frames — it
captures every internal frame with no count cap, unlike the 256-capped list
above. This stays a separate, explicit flag rather than the default,
deliberately: the internal route this replays is the same one every
`mechanicLab` ability/item-test fixture already uses (441 of the 444
existing `tools/battle-lab/*.json` fixtures across runs of this harness),
and none of them want ~3600 unrequested PNG frames on every request. The two
fields are mutually exclusive.

This does not reach the pre-battle attendant scouting-report dialogue itself
— that happens *before* `new_session()`'s canonical anchor. `BattleLab.
preview_report()` (below) reaches it from a separate, earlier anchor, with a
real constraint: it can pick a seed, not a specific opponent.

## Frontier-Brain walk-up staging (`factoryBrain` + `walkup: true`)

The ordinary `factoryBrain` staging cannot reach the walk-up scene: the
canonical checkpoint's parked field script is the *fresh-draft* PreBattleRoom
entry, which resumes after the rental draft directly at `EnterBattleRoom`
("Right this way, please!") and never runs the post-battle re-entry the map's
OnFrame handler gates on `VAR_0x8006 == 1` (the heal line, the phone call,
the ask-ready menu, the pre-head swap prompt).

`walkup: true` closes that gap without inventing any content. While the
rental draft runs, the lab redirects the parked script pointer from its
fresh-draft resume point to the ROM's own post-win fragment (the
BattleRoom's `DefeatedOpponent` label). When the draft confirm returns to
the field, the ROM itself performs the genuine post-win bookkeeping (the
win-streak-swaps stat, the streak increment, the battle-number increment —
the lab stages the *pre-win* values, so the increments land on the same
final values the plain staging writes directly), sets `VAR_0x8006 = 1`, and
warps back into the PreBattleRoom at (8, 8) — from where OnWarp positions
the attendant and OnFrame runs the genuine `ReturnToRoomFromBattle` scene,
byte-for-byte the ROM's own 21st/42nd-battle path.

The route stops at the first input the caller should own: **frame zero is
the open ask-ready multichoice** (GO ON/RECORD/REST/RETIRE, cursor on
GO ON, "The FACTORY HEAD is demanding you." box behind it). Everything
before it — draft, warp-back, heal line, phone call — is reachable through
`preCheckpointCaptureFrames`; everything after it (GO ON, the swap YES/NO,
RECORD, REST, RETIRE, the guided walk into the BattleRoom Brain entrance,
the speech, the battle itself) is driven by the request's own `trace`.

The response omits `opponentParty` (no battle has initialized — Noland's
party generates later, when a GO ON trace actually reaches
`FillFactoryBrainParty`; it stays seed-deterministic) and instead echoes the
staged overworld facts: `walkup: true`, `factoryWinStreak` and
`curChallengeBattleNum` (both read back after the ROM's own increments, so
they double as proof the post-win fragment executed), `factorySymbols` (0
silver / 1 gold), and `askReadyMenuVariant` (`"record"` for the real
four-option menu — the lab clears `disableRecordBattle`, matching the
genuine post-battle-20 state — or `"noRecord"` if a future staging ever
lands on the three-option variant).

Boundaries, stated honestly:

- **No `overrides`.** The party-staging hooks poll for battle
  initialization, which never happens before this checkpoint; rejected at
  validation.
- **The swap pool's per-mon details are not staged.** `ReturnToRoomFromBattle`'s
  own `factory_setopponentmons` copies `gFrontierTempParty` and the beaten
  opponent's `gEnemyParty` records into the swap pool; on this staged path
  no battle 20 happened, so those records hold whatever the checkpoint
  holds (deterministic, but not a genuine beaten-opponent party). Answering
  the swap prompt with YES shows a swap screen whose contents are therefore
  not acceptance-grade; the No path is unaffected.
- **RECORD's save flow is not genuine.** The menu itself and the RECORD
  YES/NO prompt text are the real scripts, but no battle was recorded on
  this route, so what a RECORD-YES actually saves reflects staged
  recording-buffer state, not a genuine battle-20 recording.
- **The pre-warp frames differ from real play.** Genuine play warps back
  from the BattleRoom; this staging warps PreBattleRoom-to-PreBattleRoom
  out of the draft fade, so the frames *before* the warp completes (and the
  music transition into it) are staging artifacts. Everything from the
  warp-in onward is the genuine path.

The walk-up internal route is shorter than the ordinary one (worst case
2706 frames, pinned by test), so `preCheckpointCaptureFrames` keeps its
ordinary bound.

With a Battle Scene OFF service running, verify the walk-up staging live
with:

```sh
POKEBENCH_ORACLE_URL=http://127.0.0.1:8014 \
  python3 oracle/battle-lab-walkup-smoke-test.py
```

## Report preview (attendant scouting-report dialogue)

`BattleLab.preview_report(seed=None, capture_frames=None,
capture_all_frames=False)` replays the attendant's dialogue — including the
two-line scouting report ("apparently skilled in the handling of the X
type", "favorite battle style appears to be...") — from a second, earlier
canonical anchor, `bootstrap/factory-pre-report.json` (documented in
`BOOTSTRAP.md`). It does not stage a battle; there is no `trace`/`mode`/
party-override schema here, just the dialogue.

This is a Python method, not an HTTP endpoint. Its oracle must be
constructed against `factory-pre-report.json` specifically — the shared
server processes are anchored past this dialogue and cannot run it
meaningfully, and a single oracle process serves one fixed canonical
snapshot by design (`emerald_core.py`'s `new_session()` docstring), so
adding a second anchor to the shared HTTP contract was out of scope here.
Call it in-process, the same way this run's `tools/probe/*.py` scripts
already call `BattleLab` directly; see `report-preview-smoke-test.py` for
the pattern.

**`seed`, if given, cannot choose a specific opponent — only influence
which real one gets picked.** The source generates the trainer, their
Pokémon, and your rental candidates from the RNG state, then computes the
report from that result, with no blocking script command (no animation,
no player input) in between — both run inside the same emulated video
frame. This codebase's frame-level control (`advance()`, the only thing
`preview_report()` uses) cannot land between "opponent decided" and
"report computed": a live probe confirmed that poking `gFrontierTempParty`
the instant a frame-level check showed its new value left the computed
report unchanged from an unpoked baseline. That is a real, verified limit
of this tooling — but not, as an earlier version of this note claimed,
because the write and the read happen with zero time between them.
Instruction-level stepping (available in the vendored emulator library,
not used anywhere in this codebase's `advance()`-based API) shows they're
actually thousands of CPU instructions apart within that one frame, and a
poke held continuously across the frame at that finer granularity does
change the computed report — see `BOOTSTRAP.md`'s "Why a new anchor and
not a mid-script poke" section for the full correction. `seed`
sidesteps the problem entirely by changing an input the whole sequence
reads at its start — written immediately after `new_session()`, thousands
of frames before generation runs, not racing it — rather than trying to
intercept its
result. Different seeds reliably produce different real opponents and
different real report content; the same seed reproduces the same result.

`capture_frames`/`capture_all_frames` behave like `preCheckpointCaptureFrames`/
`preCheckpointCaptureAllFrames` above, in this method's own frame-numbering
(0 immediately after `new_session()`); captures omit `state` (there is no
battle yet) and instead the response carries a top-level `report` object:
`opponentSetIds` (the three `gFrontierTempParty` set IDs actually used —
real, existing Factory-catalog entries, not arbitrary) and the raw
`typeVar`/`styleVar` the source computed. The dialogue route is ~2916
frames; requesting all of them returns that many captures with no cap,
same tradeoff as `preCheckpointCaptureAllFrames`.

## Mechanic Lab complete-party builder

`overrides.parties` is the preferred Mechanics Lab contract. Both sides are
required and contain exactly three Pokémon:

```json
{
  "mode": "mechanicLab",
  "overrides": {
    "parties": {
      "player": [
        {
          "species": 25,
          "level": 50,
          "nature": 10,
          "ivs": {
            "hp": 31,
            "attack": 31,
            "defense": 31,
            "speed": 31,
            "spAttack": 31,
            "spDefense": 31
          },
          "evs": {
            "hp": 4,
            "attack": 252,
            "defense": 0,
            "speed": 252,
            "spAttack": 0,
            "spDefense": 0
          },
          "moves": [33, 73, 92, 150],
          "ppUps": [3, 2, 1, 0],
          "item": 186,
          "abilitySlot": 0,
          "friendship": 200,
          "gender": "male",
          "shiny": false
        },
        {"species": 303, "moves": [150, 150, 150, 150]},
        {"species": 6, "moves": [150, 150, 150, 150]}
      ],
      "opponent": [
        {"species": 248, "moves": [150, 150, 150, 150]},
        {"species": 202, "moves": [150, 150, 150, 150]},
        {"species": 94, "moves": [150, 150, 150, 150]}
      ]
    }
  }
}
```

`species` and the four-slot `moves` array are required. Defaults are the
request level (50), Hardy nature, 31 in every IV, zero in every EV and PP-Up
slot, no held item, ability slot zero, the species' source friendship,
non-shiny, and an otherwise deterministic personality. IVs are `0..31`; EVs
are `0..255` per stat with a total no greater than 510. `abilitySlot` is zero
or one and must name an ability slot the species actually has.

`gender` may be `male`, `female`, or `genderless` and must be possible for the
species. `shiny` selects the corresponding personality property. An exact
`personality` (`0..4294967295`) may be supplied for tests that need a form or
personality-specific edge case; when combined with nature, gender, or shiny
constraints it must satisfy all of them.

The builder writes valid encrypted and checksummed Gen-3 `struct Pokemon`
records after the normal Factory constructors finish but before
`CB2_InitBattle`. Species types, ability ID, experience, stats, max/current HP,
and current PP are derived from the pinned ROM tables and Emerald formulas.
The ROM then performs its ordinary battle initialization and entry scripts.
Consequently Drought, Sand Stream, Intimidate, Trace, and similar lead hooks
run at their real time, all three bench records survive, and an ordinary
party-menu switch reconstructs the chosen battler from the custom party.

Captured `state.parties.player` and `.opponent` expose all three persistent
records, including IVs, EVs, current PP/HP/status, personality properties,
derived types/ability, and `checksumValid`. Active battlers include
`partyIndex`, so switch tests can relate `gBattleMons` to the persistent bench.
To force a controlled opponent action without injecting an AI result, give all
four opponent slots the same move; the Factory AI still executes normally but
has only that legal move choice.

`overrides.parties` and the legacy `overrides.battlers` form are mutually
exclusive.

## Legacy active-battler loadouts

```json
{
  "mode": "mechanicLab",
  "overrides": {
    "battlers": {
      "player": {
        "moves": [73, 33, 33, 33],
        "ppUps": [0, 0, 0, 0],
        "item": 234,
        "ability": 65,
        "types": [12, 12],
        "friendship": 255
      }
    }
  }
}
```

This compatibility form remains useful for old traces. Item and ability
overrides are source IDs (`0..376` and `0..77`
respectively). Move, item, ability, type, friendship, and PP-Up fields
describe the starting loadout, not a battle outcome. `moves` and `ppUps` must
be supplied together. Each PP-Up count is `0..3`; the lab reads the move's
source base PP and applies Emerald's PP-Up formula. Current PP starts at that
derived maximum and can only decrease through ROM-executed move use. Emerald
does not permit PP Ups on moves whose base PP is four or less, so those slots
must use zero.

Mechanic Lab intentionally rejects direct battle-state injection. HP and
damage, permanent status, volatile status, stat stages, weather and its
duration, side conditions, delayed effects, and battle outcome must be created
by normal controller input through the stock ROM. For example, stage Rain
Dance as a move and select it; do not request that rain already be active.
Those states remain available read-only in semantic captures so a worker can
assert what the move actually did.

The legacy form applies active-battler substitutions after the initial send-out
sequence but before either side's first action choice. The opponent's normal
Factory AI therefore chooses from the staged first-turn loadout. Persistent
checks consulted during subsequent move execution work: the live smoke suite
proves Own Tempo blocking Confuse Ray and Choice Band increasing Tackle
damage. A substituted Drought or Intimidate does not retroactively replay its
missed entry hook, however, and switching reconstructs a battler from the
underlying unmodified party Pokémon. Use `overrides.parties` for switch-in
hooks and switching tests.

To select a move normally from frame zero, send `A`, wait for the Fight menu,
then send the directional input and `A`. The lab does not write damage,
secondary-effect results, battle outcomes, or post-action RNG.

## Version-1 boundaries

- Level-50 singles and challenge indices 0 through 7 only.
- Ordinary modes stage regular Factory trainers; staging Noland through an
  ordinary `trainerId` stays rejected explicitly. His challenge-2 and
  challenge-5 final battles are staged through the dedicated `factoryBrain`
  mode, which represents the Frontier Brain structurally instead of
  pretending he is an ordinary trainer ID.
- The source route still needs a legal Factory base battle, represented by
  `playerSetIds` and `opponentSetIds`. In Mechanics Lab, `overrides.parties`
  replaces the resulting three persistent Pokémon on each side before battle
  initialization; custom party members are individually legal but are not
  restricted to the Factory rental catalog or its species/item clauses.
- `rentalSwapCount` follows Emerald's source thresholds (15, 22, 29, 36, and
  43) and only unlocks higher-band candidates in the positions the game would.
  The stock function truncates the saved `u16` count to `u8` before ranking;
  the lab preserves that behavior, including wraparound above 255.
- This mode's own checkpoint (`prepare()`, `DoBattleFactorySelectScreen`) is
  after the scouting dialogue, so `playerSetIds`/`opponentSetIds` staging
  controls the battle but does not regenerate the attendant's earlier
  favorite-type/style text for the staged trainer/set. `preview_report()`
  (above) reaches that dialogue from a separate, earlier anchor, but can
  only pick a seed, not the specific trainer/set this mode stages.

Run pure contract tests with:

```sh
python3 oracle/test_battle_lab.py -v
```

With a Battle Scene OFF service running, verify canonical compatibility,
arbitrary set staging, and a real Leech Seed turn with:

```sh
POKEBENCH_ORACLE_URL=http://127.0.0.1:8014 \
  python3 oracle/battle-lab-smoke-test.py
```

Run one scenario and write its PNGs plus a semantic `manifest.json` with:

```sh
bin/oracle lab scenario.json -o /tmp/battle-lab-output
```
