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

## D1 — OPEN: adopt the user-communication contract below (edit freely, then move into SUPERVISOR.md and delete this entry)

**What happened:** on 2026-08-02 the user directed the supervisor to stop
communicating in the project's internal ontology ("slice 9", ranks, folds,
differentials mean nothing to them) and instead speak at their level: how
close the project is to S10, and progress legible to them as the user and
as a player of the game. The user asked for this to be captured for their
review before the next supervisor session.

**Proposed standing text (for SUPERVISOR.md, "Communicating with the
user" — edit as you like):**

> All user-facing communication — mid-session updates, answers, wind-down
> summaries — leads with user-level language: what works in the game,
> what is broken, distance to the current milestone (S10). Terse over
> verbose: numbers and bullets, not prose; prose only where a point is
> genuinely nuanced. No time estimates (not accurate enough to be
> useful). Milestone status uses this format (user-approved 2026-08-02),
> plus optional one-line commentary per item:
>
> **S10: ~80% overall**
> - ✅ <done item>: **100%**
> - 🔄 <in-flight item>: **~N%** (one-line commentary optional)
>
> Every sub-item carries a numeric (% ideally, else a fraction like 9/10
> steps). Internal terms (slice/rank/fold/differential/lane) appear only
> with an inline plain-language translation, or not at all. The internal
> ledgers (PROGRESS.md, ISSUES.md, briefs, design docs) keep their
> precise technical voice — this contract governs communication with the
> user only. Wind-down reports open with the milestone status block;
> technical detail follows for the record.

**This session already switched to that voice** (from the 2026-08-02
afternoon onward) — this entry exists so the user can adjust the wording
and make it durable. Deleting this entry (after optionally moving the text
into SUPERVISOR.md) unblocks the next supervised session; the launcher
refuses to start while any `## D<number> — OPEN:` heading remains here.
