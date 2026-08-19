# Deferred supervisor questions

Unresolved user-level decisions discovered during autonomous supervisor
sessions. This is not the bug/debt backlog: confirmed implementation problems
belong in `ISSUES.md`.

Supervisors add an entry only when the choice is material, cannot be resolved
safely from the mission, roadmap, oracle, or existing evidence, and guessing
would change scope or create hard-to-reverse work. A deferred question never
pauses the session: continue with independent in-scope work or gather evidence
that may resolve it.

Keep entries short and remove them after the user decides (git retains the
history). Number entries without reuse and use the exact machine-readable
heading `## D<number> — OPEN: <short title>`; `run-supervisor.sh` refuses to
start another session while any such heading remains. Each entry should state:

- the decision needed and why it matters;
- the evidence checked and why it was insufficient;
- the supervisor's recommendation or bounded options;
- what safe work continued meanwhile.

At wind-down, summarize every question added or still blocking work in the top
`PROGRESS.md` entry and final session report.

## D2 — OPEN: next milestone after M-A — accept measured play depth, or scope "make deep play reachable"?

- **Decision needed:** M-A's measurement is done (ROADMAP M-A block,
  `docs/soak-depth-measure-2026-08-19.md`). Play regularly gets past
  challenge 1 (27-36% of seeds under the two chaining policies) and ~5%
  enter challenge 3, but in 300 seeds nothing ever reached carry 21
  (challenge 4+), and everything past ladder battle 21 — the escalated
  rental/IV rows, the full `CHECK_BAD_MOVE`+triad AI tier, the gold
  Brain — is reached only by the scripted chaining test, never by play.
  Whether that is acceptable, or the next milestone is making deep play
  reachable (and what "reachable" means: stronger soak policies, player
  aids, or something else), is a scope decision the user reserved for
  themselves ("that scope decision returns to the user with the
  measurement in hand, not before" — ROADMAP, 2026-08-19 user decision).
- **Evidence checked:** the full re-measure (winning 0:180, vanilla 0:60,
  full 0:60, all-OK, per-seed lines committed); the M-A block's own
  falsifiability clause — the result lands between its two recorded
  outcomes ("routinely reaches challengeNum ≥ 2" is arguably false at
  5.6%, "depth is shallow" is arguably false at 35.6% past challenge 1),
  so neither pre-authorized branch cleanly applies.
- **Recommendation (bounded):** (a) accept and close — the crash-freedom
  bar is met at every depth play reaches, and deeper tiers stay covered
  by the scripted test; or (b) one bounded milestone to raise soak-policy
  win-rate until carry ≥ 21 is observed in a sweep, making the deepest
  tiers play-reachable evidence rather than scripted-only. Supervisor
  leans (b) *if* the deepest tiers matter for the mission's "indefinite
  play" bar, but this is exactly the scope call reserved to the user.
- **Safe work continued:** none blocked on this; the session continued
  with sanctioned filler and wind-down.

(D1, the user-communication contract, was adopted verbatim
into SUPERVISOR.md "Communicating with the user" by user decision on
2026-08-02 — git retains the entry text.)
