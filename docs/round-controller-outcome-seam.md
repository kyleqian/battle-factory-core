# `roundController.ts` outcome seam: current fixture surface vs the kernel's real boundary

ROADMAP S10 step (iv) PREP, part 2. Answers: exactly how `roundController.ts`
consumes an injected `CompletedBattle` today, what the kernel's
`submitBattleDecision` boundary already produces, the field-by-field gap
between them, and the smallest source-faithful seam to close it. No `src/`
edits — this is a read-only inventory, verified by grep/read against the
committed tree, not assumed. Builds on `docs/faint-outcome-ground-truth.md`
(opcode-level detail for the faint→outcome path) and ISSUES #39/#41/#42/#43.

## 1. `roundController.ts`'s entire input surface for a battle result

**Entry point:** `resolveRoundBattle(state: RoundControllerState, resolution: BattleResolution): RoundControllerState`
(`src/engine/roundController.ts:309-311`). This is the **only** function that
constructs a `CompletedBattle` (`:332-336`) — it is the fixture-injection
point the brief refers to. There is no other way a battle result enters this
module.

**Zero production call sites today.** `grep`-confirmed: only `core.ts`
imports from `roundController.ts`, and it imports only `createRoundController`
and `completeBattlePresentation` (`core.ts:210-214`, used at `:312-314` and
`:374-379`). `resolveRoundBattle`, `advanceRoundController`, and
`chooseRoundSwap` are never called outside `roundController.ts` itself except
from three test files (`tests/roundController.test.ts`,
`tests/roundScenarioMatrix.test.ts`, `tests/factoryTerminalPresentation.test.ts`).
`tick()`'s only production interaction with `roundController` is acknowledging
the `roundLost`/`roundCompleted` **presentation** command once
`factoryTerminalPresentation` completes (`core.ts:351-388`) — it never drives
a battle to resolution. The entire win/loss path is exercised by hand-authored
test fixtures, not by any running battle.

### `BattleResolution` — the actual input type (`roundController.ts:62-68`)

```ts
interface BattleResolution {
  outcome: "win" | "loss";
  playerParty: BattleParty;   // readonly [BattleMon, BattleMon, BattleMon]
  opponentParty: BattleParty;
  rngValue: number;
}
```

`BattleMon` (`battleScenario.ts:19-26`): `{ id: string; species: string; maxHp: number; hp: number; status: BattleStatus }`,
`BattleStatus` one of 7 values (`battleScenario.ts:10-17`).

**Entry validation** (`roundController.ts:313-328`):
- phase must be `"battleActive"` and no presentation may be pending (`:313-315`).
- `resolution.playerParty` must match `state.rules.playerParty` per-slot on
  `id`/`species`/`maxHp` (`assertSamePartyIdentity`, `:292-307`, called `:316-320`)
  — HP/status are free to differ, identity is not.
- `resolution.opponentParty` matched the same way against
  `state.rules.currentOpponent.party` (`:321-325`).
- `resolution.rngValue` must be a non-negative safe integer (`:326-328`).

### `CompletedBattle` construction and consumption (`roundController.ts:29-33`)

```ts
interface CompletedBattle {
  outcome: "win" | "loss";
  playerParty: BattleParty;
  opponentParty: BattleParty;
}
```

Built at `:330-336` by deep-cloning `resolution.playerParty`/`opponentParty`
verbatim (`cloneBattleParty`) — **the fixture supplies post-battle HP/status
directly; `roundController.ts` performs no damage computation of its own.**

Repo-wide grep for `.lastBattle` (the only place a `CompletedBattle` is held,
`RoundRulesState.lastBattle`, `:48`) finds exactly **four** read sites, all in
`roundController.ts`, plus one test assertion:

| Field | Read at | Drives |
| --- | --- | --- |
| `.outcome` | `:235` (`advanceRoundController`, `"presentingBattleWin"` case) | guard: must be `"win"` before issuing the `swapOffer` command |
| `.outcome` | `:393` (`chooseRoundSwap`) | guard: must be `"win"` before a swap can be chosen |
| `.opponentParty` | `:247` | payload of the `swapOffer` presentation command (the party the player picks a swap-in from) |
| `.opponentParty` | `:408` | swap replacement source: `lastBattle.opponentParty[opponentPartyIndex]` |
| `.opponentParty` | `tests/roundController.test.ts:207` | test-only assertion |
| `.playerParty` | *(none)* | **write-only.** Constructed at `:334`, never read back from `lastBattle` anywhere in `src/` or `tests/`. The live post-battle player party used everywhere downstream is `state.rules.playerParty`, set directly from `resolution.playerParty` at `:339` — independent of `lastBattle.playerParty`. |

The round-completion/loss branch (`:345-374`, `roundLost` / `roundCompleted`
/ `battleWon`) reads `resolution.outcome` and `state.rules.battleIndex`
directly in the same call, not `lastBattle.outcome` a second time — `lastBattle`
is a same-call mirror of `resolution`, not an independent read path for that
branch.

### What each round/facility mechanism actually depends on (verified, not assumed)

- **Win counting across the 7-battle round** is `state.rules.battleIndex`
  (0–6), incremented at `:253` — **not** derived from any `CompletedBattle`
  field. The cross-round Factory win streak (`factoryWinStreak`,
  `battleScenario.ts:68/177/225/245`) is a fixed constant set at
  scenario-creation time and is never mutated by `resolveRoundBattle`.
- **Next-opponent selection** (`selectNextOpponent`, `:169-215`) is driven by
  `state.rules.rngValue` and `opponentSelection`, **not** by any
  `CompletedBattle` field — `resolution.rngValue` (a `BattleResolution`
  sibling field, not part of `CompletedBattle`) is what seeds it, via `:340`
  → `:190-195`/`selectFactoryTrainer`.
- **Swap flow** is the only mechanism actually driven by `CompletedBattle`
  content: `.opponentParty` (offer list + replacement source) gated by
  `.outcome === "win"`.
- **Round completion** (`roundComplete` vs `battleWon` vs `roundLost`) is
  `resolution.outcome` branching on `state.rules.battleIndex === 6`
  (`:345-374`), evaluated once, same call.

### Other hidden inputs

- `resolution.rngValue` is stored as `rules.rngValue` (`:340`, `>>> 0`
  coerced) and becomes the RNG seed for the **next** battle's opponent draw.
  A real kernel does not yet produce this value at all (see §3).
- `factoryTrainerSchedule.ts:1` imports `../data/gen/factory-round-policy.json`
  — a source-extracted static table, not a `-dump`/`-probe`/`-watch`/`-boundaries`
  recording, so it is unrelated to ISSUES #41's debt.
- No RAM dumps, no turn-keyed constants, no singletons: `roundController.ts`'s
  own import list (`:1-18`) is `battleScenario.ts`, `factoryTrainerSchedule.ts`,
  and `battlePresentation.ts` types only.

## 2. The kernel's terminal boundary as it exists today

**Two unrelated concepts share the word "terminal"** — disambiguating this is
load-bearing for whoever wires the seam:

**(a) Battle Script VM halt** (`battleScriptMachine.ts`). `BattleScriptHaltReason`
(`:15-70`) has 7 kinds; `kind: "terminal"` (`:16-21`) fires only when the
`B_SCR_OP_END`/`B_SCR_OP_END2` handlers run (`:552-555`, via the `terminal()`
helper `:489-501`) — this means "the Battle Script VM's current script/call
reached `end`/`end2`," nothing about `gBattleOutcome`. `stepBattleScriptMachine`
returns one of `"advanced" | "scheduler-progressed" | "blocked" | "halted" | "unsupported"`
per step (`:172-177`); `"halted"` is what wraps this VM-local terminal reason
(also wraps `unsupported-opcode`/`unsupported-branch`/budget/invalid-* halts —
`"halted"` is not synonymous with "reached end/end2" either).

**(b) Kernel decision-boundary terminal** (`battleDecisionBoundary.ts`).
`BattleTerminalBoundary` (`:75-78`): `{ kind: "terminal"; outcome: BattleOutcome }`,
`BattleOutcome = "player-win" | "trainer-win" | "draw"` (`:68`). Validated at
`boundaryAt` (`:487-515`, the brief's "line 497 area" — `:496-501` is the
terminal arm specifically). This is what `gBattleOutcome` becoming nonzero
would eventually map to.

**The decision-to-boundary cycle** — `submitBattleDecision` (`:690-804`):
given a `BattleState`, a `BattleDecisionSubmission`, and a `BattleDecisionReducer`,
it validates the submission against the current `boundary.request` (`:711-712`),
runs the reducer exactly once (`:733-738`), validates the reducer's
`{rules, events, boundary}` output (`:739-751`), and returns a
`BattleDecisionTransitionResult` mirroring the new boundary:
`decision-required` (`:782-789`), `machine-barrier` (`:790-797`), or
`terminal` (`:798-803`, carrying `outcome`). It throws rather than returning
if called again once already `terminal` (`:698-702`) or while parked at a
`machine-barrier` (`:703-707`) — both are hard stops for that `BattleState`.

**What implements a `BattleDecisionReducer` today: exactly one.**
`reduceFactoryAsleepMoveDecision` (`factoryBattleScriptDecision.ts:522-666`,
wrapped by `submitFactoryAsleepMoveDecision` at `:668-677`). It runs the
Battle Script machine from a move's entry script and **deliberately throws**
unless it stops exactly at the still-unregistered `moveend`/opcode-73 barrier
(`:620-629`), then always returns `boundary: { kind: "machine-barrier" }`
(`:653-664`). It can never return `terminal` or `decision-required` — nothing
downstream of `moveend` is registered (matches ROADMAP step (iii)'s own
boundary and the six-opcode gap in `docs/faint-outcome-ground-truth.md`).

**The only place a `terminal` boundary is ever actually produced end-to-end**
is a synthetic, hand-authored reducer in `tests/battleDecisionBoundary.test.ts:401-420`
that fabricates `{ kind: "terminal", outcome: "player-win" }` directly, to
prove `submitBattleDecision`'s plumbing threads a terminal boundary correctly.
It exercises the mechanism, not the real Battle Script kernel.

**Net:** the `submitBattleDecision`/`BattleTerminalBoundary` plumbing is fully
built and proven at the mechanism level — a decision-to-boundary cycle already
returns a typed, validated terminal result *if* a reducer supplies one — but
no reducer wired to the real Battle Script program can reach it yet.

## 3. Gap table: `BattleResolution`/`CompletedBattle` fields vs what the kernel can produce today

| Field | roundController reads it for | Kernel today | Missing |
| --- | --- | --- | --- |
| `outcome: "win" \| "loss"` | branch gate: `swapOffer` vs `roundLost` vs `roundCompleted` (`:235`, `:345-374`, `:393`) | `BattleTerminalBoundary.outcome` shape exists and validates (`battleDecisionBoundary.ts:68`, `:496-501`) | Nothing produces a real one — needs `checkteamslost` (ISSUES #42) + the `HandleFaintedMonActions`-equivalent orchestration loop (`docs/faint-outcome-ground-truth.md` §3.1). Also a **vocabulary gap**: kernel is 3-valued (`player-win`/`trainer-win`/`draw`), roundController is 2-valued (`win`/`loss`) — `draw` has no roundController equivalent at all. |
| `playerParty: BattleParty` (`id`, `species`, `maxHp`, `hp`, `status`, 3 slots) | swap identity checks; currently write-only past that | `BattleScriptRulesContext.battlers` (`battleScriptRulesContext.ts:280`) tracks real `hp`/`species`/`status1` per **active** battler (4-tuple, `datahpupdate` registered and writing real HP, `battleScriptHitChainOpcode.ts:1717`) | No party/bench concept at all (ISSUES #42) — only 4 active battlers, no 3-slot roster. No `id` (stable string identity) or `maxHp` anywhere in the kernel — `maxHP` is explicitly flagged "unmodeled anywhere in this engine" (`battleScriptHitChainOpcode.ts:1251/1313`, the negative-damage/HP-gain barrier). |
| `opponentParty: BattleParty` | `swapOffer` payload (`:247`) + swap replacement source (`:408`) — the only fields with real production-shaped reads | same as `playerParty` row | same as `playerParty` row; higher priority since it's actually read, not just stored |
| `rngValue: number` (on `BattleResolution`, not `CompletedBattle`) | seeds next battle's Factory trainer draw (`:190-195`, `:340`) | `BattleRngState { value; calls }` (`battleDecisionBoundary.ts:100-103`) is a live, exact LCG cursor already threaded through every decision cycle (`:714-731`) | **None — already real and available now.** A terminal `BattleState.rng.value` is already the right shape for `resolveRoundBattle`'s `rngValue` argument. |

Ground-truth doc §3.2's own recommended party slice — `{ species, isEgg, hp }`
× `PARTY_SIZE` (6) per side — is deliberately narrower than what
`assertSamePartyIdentity`/`BattleMon` need (`id`, `maxHp`, `status`). That
narrower slice is sufficient for `checkteamslost` itself; it is **not**
sufficient to build a `roundController.BattleResolution` without also sourcing
`id`/`maxHp`/`status` from somewhere. See §4 for how to close that without new
kernel modeling.

## 4. Recommended smallest step (iv) seam

Everything below is a **named, unimplemented** design — no code changes are
part of this doc.

### Pieces, in dependency order

1. **Party-HP slice inside `BattleScriptRulesContext`** — new type
   (e.g. `BattleScriptPartyMemberState = { species: number; isEgg: boolean; hp: number }`,
   `BattleScriptPartyState` a 6-length array per side), per
   `docs/faint-outcome-ground-truth.md` §3.2. **Pure plumbing, available now**
   — no unregistered opcode required — except that `datahpupdate`'s existing
   active-battler HP write (`battleScriptHitChainOpcode.ts:1717`) needs a
   second write into the matching party slot at the active battler's
   `partyIndex` (ground truth doc's own sync-point note, §3.2). That's a
   change to an already-registered handler, not a new registration.
2. **Six opcode registrations** — `JUMPIFBYTE`, `DOFAINTANIMATION`,
   `CLEAREFFECTSONFAINT`, `CHECKTEAMSLOST`, `GETEXP`, `MOVEEND`, cheapest-first
   order already banked in `docs/faint-outcome-ground-truth.md` §3.
   **Depends on the six unregistered opcodes** (by definition) and, for
   `DOFAINTANIMATION`/`CLEAREFFECTSONFAINT`, on ISSUES #43's `BS_TARGET` fix
   first. `MOVEEND` is ROADMAP step (iii)'s own scope, already planned
   separately — not new work invented by this doc.
3. **`HandleFaintedMonActions`-equivalent orchestration** — new
   scheduling logic (ground truth doc §3.1) that, once a hit chain's own
   `moveend` reaches its terminal state, drives `BattleScript_GiveExp` then
   `BattleScript_HandleFaintedMon` per fainted battler. This is what actually
   lets a `BattleDecisionReducer` reach `checkteamslost` and return a
   `BattleTerminalBoundary` — explicitly "new scheduling logic, not a 7th
   opcode" per the ground-truth doc. **Depends on (1) and (2).**
4. **`BS_FAINTED` selector role** in `resolveRulesBattlerForBattleScript` —
   distinct from ISSUES #43's `BS_TARGET` fix (ground truth doc §4); needed
   once the orchestration loop reassigns "currently-processing fainted
   battler" across more than one faint per action. **Depends on (3).**
5. **A pure adapter function**, e.g.
   `deriveBattleResolutionFromTerminalBoundary(pending: BattleParty, pending: BattleOpponent, terminal: { outcome: BattleOutcome; rngValue: number; partyHp: BattleScriptPartyState })  -> BattleResolution`,
   that maps a real terminal boundary into `roundController.BattleResolution`.
   **Pure plumbing, type-designable and testable today** against synthetic
   terminal states (exactly as `tests/battleDecisionBoundary.test.ts:401-420`
   already does for the mechanism) even before (1)–(4) land, since its input
   is just a `BattleState`/`BattleOutcome` shape, not a live kernel run.
   - **Outcome mapping:** `"player-win" -> "win"`, `"trainer-win" -> "loss"`.
     `"draw"` has no roundController case — recommend asserting/throwing on
     `draw` for now rather than inventing a third `CompletedBattle.outcome`
     value; whether a Level-50 Factory 3v3 singles battle can actually draw
     is unverified from source in this doc and should be checked before
     relying on that assumption.
   - **`id`/`maxHp`/`status` do not need new kernel modeling.** The adapter
     already has the pre-battle `BattleParty` in hand (it's
     `state.rules.playerParty`/`currentOpponent.party`, the exact snapshot
     `assertSamePartyIdentity` already matches against) — it can carry `id`
     and `maxHp` forward unchanged from that snapshot and overlay only the
     kernel's real post-battle `hp` per slot. `status` for any 0-HP slot can
     default to `"none"` (matches the real game: fainted mons carry no
     status); the single surviving active battler's real status comes from
     `BattleScriptRulesContext.battlers[activeIndex].status1`
     (`battleScriptRulesContext.ts:88/1201`) — **this inference is not
     confirmed against source/oracle in this doc and should be verified
     before implementation**, since non-active bench members that never
     fainted (swapped away undamaged) have no kernel status source either.

### Open design decision for the supervisor: where does the party-HP slice live?

Piece (1) can be built two ways with real tradeoffs; the evidence here
doesn't settle which is right, so both are presented rather than picked:

- **Option A — extend `BattleScriptRulesContext` in place.** Add the party
  slice as a new field alongside the existing `battlers` 4-tuple (same
  pattern every prior rung has used to grow this type — its own doc comment
  already frames it as "the first durable source-shaped Battle Script rules
  slice," `battleScriptRulesContext.ts:270`, not an append-once shape).
  *Pro:* single source of truth; any future opcode automatically has access;
  matches the ground-truth doc's own recommended shape with no new
  architecture invented. *Con:* touches a widely-shared, heavily-tested type
  — every hand-built `BattleScriptRulesContext` construction site (dozens of
  Tier-1 tests, every opcode-handler factory parameterized over it) sees the
  new field, even though only `checkteamslost`/the orchestration loop
  actually needs it today.
- **Option B — a narrower wrapper context used only by the
  orchestration path**, e.g. extending `BattleScriptRulesContext` only at the
  point the new orchestration loop runs, leaving the base type and every
  hit-chain opcode handler untouched. *Pro:* minimal blast radius on
  already-shipped, ratchet-pinned modules. *Con:* introduces a second
  `RulesContext` shape for `checkteamslost`'s opcode-handler dispatch to run
  under, which is itself new, undesigned architecture — the ground truth doc
  confirms `HandleFaintedMonActions` really is "a wholly separate state
  machine" from the hit chain's action-func cycle (§1, `battle_util.c:1894`),
  so a separate dispatch table is source-faithful, but nothing in this
  engine's registered opcode topology establishes that pattern yet, so it
  isn't actually the *smaller* change in practice.

**Recommendation: Option A.** It reuses an established, already-growing type
instead of inventing a second one, and matches what
`docs/faint-outcome-ground-truth.md` §3.2 already specified. The blast radius
is mechanical (every construction site gains one more field with a default),
not conceptual.

### Summary: what stays intact

None of pieces (1)–(5) touch `roundController.ts`'s public API
(`RoundControllerState`, `CompletedBattle`, `BattleResolution`,
`resolveRoundBattle`, `advanceRoundController`, `chooseRoundSwap`) — the
seam is additive on the kernel side, with a new adapter function as the only
new surface reaching into `roundController.ts`, and only by calling
`resolveRoundBattle` with a normal `BattleResolution` value. Every existing
fixture-driven test (`roundController.test.ts`, `roundScenarioMatrix.test.ts`,
`factoryTerminalPresentation.test.ts`) keeps working unchanged, since they
construct `BattleResolution` values directly and never go through the new
adapter.
