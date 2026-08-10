# Gate-2 Noland scope note — 2026-08-10

Explicit Gate-2 disposition record for close-out assembly. Per the ROADMAP
S10 **"Gate-6 evidence granularity + sequencing" (user decision
2026-08-09)** block, close-out assembly must "Record Gate 2's checkbox
disposition explicitly: its only remainder is the two Noland items, which
stay out of scope by the 2026-07-28 ruling" — this note is that record. HEAD
at time of writing: `6508fbf07a8ab511a3d30c34e85ed739c856a09a`.

## The exact remainder (two items)

Quoted verbatim from `ROADMAP.md` (read-only), the Gate 2 entry's own
remainder statement:

> **Gate 2 remainder (exactly two items):** Noland's challenge-2/challenge-5
> final battles are explicitly rejected until the schema can represent
> Frontier Brains without pretending they are ordinary trainer IDs; and the
> lab's first checkpoint sits *after* the scouting dialogue, so trainer/set
> staging controls the battle but cannot yet regenerate the attendant's
> favorite-type/style commentary (needs an earlier semantic checkpoint).
> Version 1 is otherwise bounded to Level-50 singles, challenge indices 0--7,
> and one fixed Battle Scene profile per running service. **No other Gate-2
> capability blocks Gates 3--6:** abilities, switching, entry hooks, held
> items, statuses, and trainer-AI decisions are all directly verifiable
> against the stock ROM today.

And the standing scope ruling that puts Noland itself out of scope, from the
"Clarified standing scope" block:

> **Noland / Frontier Brain battles are OUT of scope for now** (Gate 2's
> explicit schema rejection stands; not a blocker for Gates 3–6).

And the S10-closure ordering decision that names this exact disposition as
the close-out requirement:

> Record Gate 2's checkbox disposition explicitly: its only remainder is the
> two Noland items, which stay out of scope by the 2026-07-28 ruling.

## Item 1 — Noland challenge-2/challenge-5 Frontier Brain battles

**Status: OUT OF SCOPE (2026-07-28 ruling, standing).**

Noland is the Battle Factory's Frontier Brain, faced as the final battle of
challenge indices 2 and 5. He is explicitly rejected by the mechanic-lab
schema's trainer/set staging: **Frontier Brains must not be pretended to be
ordinary trainer IDs.** Noland is not one of the 300 ordinary rows in
`gBattleFrontierTrainers` (ROADMAP line 1463 cites this directly — he sits
outside that table's ID space entirely, with his own distinct data shape,
dialogue set, and battle composition rules), so staging him through the same
`overrides.parties`/trainer-ID contract used for the other 300 trainers
would misrepresent his identity and data source rather than legitimately
exercise it. The schema rejection is a correctness stance, not a gap: it
would take a materially different representation (a Frontier-Brain-specific
staging path, distinct from the ordinary trainer-ID contract) to admit him,
and that representation has not been designed. This item does not block
Gates 3–6.

## Item 2 — favorite-type/style commentary checkpoint after scouting dialogue

**Status: OUT OF SCOPE for Version 1 (same 2026-07-28-era Gate-2 remainder
statement), tracked as a known lab-checkpoint gap, not a blocker.**

The mechanic lab's first checkpoint sits *after* the scouting dialogue, so
trainer/set staging controls the battle itself but cannot yet regenerate the
attendant's favorite-type/style commentary that precedes it — that would
need an earlier semantic checkpoint than the lab currently exposes. Note
this is distinct from the *facility integration* gate (Gate 2 entry 5, which
is `[x]` closed): the round controller's production path does compute and
render the attendant's favorite-type/style commentary correctly from the
generated party during real play. The remainder here is narrowly about the
**mechanic lab's own staging checkpoint** for standalone semantic-trace
authoring, not about whether the commentary is implemented or correct in
the game itself. It does not block Gates 3–6.

## Why this note exists

Gate 6 close-out assembly (ROADMAP "Gate-6 evidence granularity +
sequencing", 2026-08-09) requires this disposition to be recorded
explicitly as one of the three close-out artifacts (manifest, seeded-rounds
soak, this Noland scope note) before gates 2/3/4/6 are ticked. This file is
that record for the supervisor to cite when ticking Gate 2.
