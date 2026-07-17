# Roadmap — Battle Factory

Reproduce Pokémon Emerald's Battle Factory challenge in native TypeScript,
verified frame-by-frame against the oracle. The canonical start state is the
oracle's bootstrap anchor (see `bin/oracle info`): **the Level-50 single
challenge's rental-draft screen, already open** — the demo has no overworld
at all. In scope: the rental draft (6 candidates, summary views, pick 3),
the 7-battle round with post-win swaps, and the gen-3 single-battle engine
those battles need. Out of scope: the lobby/frontier overworld and every
screen before the draft, Battle Points economy beyond a single round, double
battles, and the open-level rule set (until the single-battle loop is solid).

## PLAN PENDING — the supervisor authors it

Everything above this heading is the fixed mission brief (a user decision;
changing it is an escalation, not an edit). Everything below is placeholder:
**the run's supervisor replaces this section on iteration 0** with a staged
plan of its own, bootstrapped from probing the oracle and reading the
reference decomp — not inherited from the template. Protocol in
`SUPERVISOR.md` § "Fresh run".

The bar for a plan that's ready to work:

- Ordered, independently shippable stages — each small enough that its first
  worker brief writes itself, tracked `[ ]` open · `[~]` partial · `[x]` done.
- Every stage carries acceptance criteria that name the exact command proving
  them (`npm run compare -- <trace>`, memory anchors via `bin/oracle symbols`,
  Tier-1 tests) — checked runnable today, not aspirational.
- The first stage closes the comparison loop (wire
  `tools/compare/appTrace.ts`, first extractors, exact color pipeline): until
  app frames can be diffed against oracle frames, nothing else is verifiable.

Domain notes (facts for the planner, not stages):

- Expand GBA 15-bit color exactly as the oracle's PNGs do — sample oracle
  output, don't assume a conversion.
- Rental pools and frontier trainers live under
  `reference/pokeemerald/src/data/battle_frontier/`; the anchor pins one
  deterministic six-mon pool (species listed in the oracle's `BOOTSTRAP.md`).
