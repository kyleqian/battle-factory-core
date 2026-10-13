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
start another session while any such heading remains by default. A bounded
unattended schedule may explicitly preserve the entry and continue only
independent reversible work. Each entry should state:

- the decision needed and why it matters;
- the evidence checked and why it was insufficient;
- the supervisor's recommendation or bounded options;
- what safe work continued meanwhile.

At wind-down, summarize every question added or still blocking work in the top
`PROGRESS.md` entry and final session report.

No unresolved user-level decisions.

The 2026-10-13 user direction includes all remaining Factory animation,
presentation and discussed battle-engine accuracy fixes in the current
finish-up mission (`docs/factory-finish-scope.md`). #165 / #141 / #140 / #139
are authorized main-lane work and must not be deferred for gameplay/RNG scope
approval. Audio and existing settled exceptions retain their prior decisions.

(D4, the CPU-load animation timing decision, was ANSWERED by the user on
2026-10-07: option (b) — ship the dominant measured timing in a separately
counted "faithful timing" category. The user authorized unblocking and finishing
the remaining S10A work. Apply the same policy to further evidenced lag-frame
or VBlank-phase cases without asking again. Source algorithms, dense proofs,
gameplay/RNG parity and Factory acceptance retain their existing requirements;
only the evidenced CPU-phase difference is permitted. The implementation and
accounting are next-run work, not completed by this decision checkpoint.
See `docs/faithful-timing.md`, ROADMAP S10A and ANIMATION_VERIFICATION.md;
git retains the original question and evidence.)

(D3, the Random2 animation decision, was ANSWERED by the user on 2026-10-06:
option (a) — implement a separate deterministic presentation RNG using the
ROM's animation algorithms and draw rules; persist its seed in session exports
for reproducible replay; count live adapters separately as "faithful random".
Gameplay RNG and outcomes remain unchanged. Implementation is authorized for
the next run under ROADMAP S10A and ANIMATION_VERIFICATION.md. No Random2
adapter or surrogate module has been implemented by this decision checkpoint;
git retains the original question and evidence.)

(D2, the post-M-A scope question, was ANSWERED by the user on 2026-08-19:
option (b) — make deep play reachable. Recorded as ROADMAP milestone M-B;
git retains the entry text.)

(D1, the user-communication contract, was adopted verbatim
into SUPERVISOR.md "Communicating with the user" by user decision on
2026-08-02 — git retains the entry text.)
